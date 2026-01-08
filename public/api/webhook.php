<?php
// public/api/webhook.php
require_once 'db.php';

// Enable CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header('Content-Type: application/json');

$pdo = getDB();

// --- 1. HANDLE META VERIFICATION HANDSHAKE (GET) ---
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $mode = $_GET['hub_mode'] ?? null;
    $token = $_GET['hub_verify_token'] ?? null;
    $challenge = $_GET['hub_challenge'] ?? null;

    if ($mode && $token) {
        // Fetch saved token from DB
        $stmt = $pdo->prepare("SELECT setting_value FROM company_settings WHERE setting_key = 'meta'");
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        $savedConfig = $row ? json_decode($row['setting_value'], true) : [];
        $verifyToken = $savedConfig['verifyToken'] ?? 'nexus_crm_secret'; // Default fallback

        if ($mode === 'subscribe' && $token === $verifyToken) {
            http_response_code(200);
            echo $challenge; // Return ONLY the challenge
            exit;
        } else {
            http_response_code(403);
            echo json_encode(['error' => 'Verification failed']);
            exit;
        }
    }

    // Normal GET not allowed
    http_response_code(400);
    echo json_encode(['error' => 'Bad Request']);
    exit;
}

// --- 2. HANDLE LEAD RECEPTION (POST) ---
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
try {
    $stmtCfg = $pdo->prepare("SELECT setting_value FROM company_settings WHERE setting_key = 'website_forms'");
    $stmtCfg->execute();
    $rowCfg = $stmtCfg->fetch(PDO::FETCH_ASSOC);
    $wf = $rowCfg ? json_decode($rowCfg['setting_value'], true) : [];
    $allowed = isset($wf['allowedOrigins']) && is_array($wf['allowedOrigins']) ? $wf['allowedOrigins'] : [];
    if (!empty($allowed) && !empty($origin)) {
        $host = parse_url($origin, PHP_URL_HOST);
        $host = $host ?: $origin;
        $cleanAllowed = array_map(function($d) { return trim($d); }, $allowed);
        if (!in_array($host, $cleanAllowed)) {
            http_response_code(403);
            echo json_encode(['error' => 'Origin not allowed', 'origin' => $host]);
            exit;
        }
    }
} catch (Exception $e) {
    // Ignore origin checks on error, proceed
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);
if (!is_array($data) || empty($data)) {
    $data = $_POST; // Fallback for application/x-www-form-urlencoded (WordPress/CF7/Elementor)
}

// Unified Contact Object
$contact = [
    'name' => 'Unknown Lead',
    'email' => '',
    'phone' => '',
    'company' => '',
    'source' => 'Webhook',
    'note' => ''
];

// A. Parse Meta Ads Payload (Nested Structure)
// Structure: entry[0].changes[0].value.form_id ...
if (isset($data['object']) && $data['object'] === 'page') {
    $contact['source'] = 'Meta Ads';
    $contact['utm_source'] = 'Facebook';
    $contact['utm_medium'] = 'cpc'; // Default for ads

    // Extract first entry/change for simplicity
    $entry = $data['entry'][0] ?? [];
    $changes = $entry['changes'][0] ?? [];
    $value = $changes['value'] ?? [];

    $formId = $value['form_id'] ?? 'Unknown Form';
    $adId = $value['ad_id'] ?? '';
    $adName = $value['ad_name'] ?? '';
    $formName = $value['form_name'] ?? "Form $formId";
    
    // Map Meta Fields to UTM
    $contact['utm_term'] = $formName; // Form Name as Term
    $contact['utm_content'] = $adId;  // Ad ID as Content
    $contact['utm_campaign'] = $adName; // Ad Name as Campaign (if available)

    // --- FILTER BY SELECTED FORMS ---
    // Fetch settings
    $stmt = $pdo->prepare("SELECT setting_value FROM company_settings WHERE setting_key = 'meta'");
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    $metaSettings = $row ? json_decode($row['setting_value'], true) : [];
    $allowedForms = $metaSettings['selectedForms'] ?? [];

    // If specific forms are selected, ONLY allow those
    if (!empty($allowedForms) && !in_array($formId, $allowedForms)) {
        $msg = "Form ID $formId skipped per settings.";
        logWebhook($pdo, $input, 'Meta', 'ignored', $msg);
        http_response_code(200); // Return 200 to Meta so they stop retrying
        echo json_encode(['status' => 'ignored', 'message' => $msg]);
        exit;
    }
    // --------------------------------

    // Note: In real Meta API, you usually get a lead_id and have to fetch details 
    // from Graph API. For this "Simulation/Demo", we assume we might get raw field_data 
    // OR we just log the ID if fields aren't there.

    // If simulated payload has 'field_data' (Mock)
    if (isset($value['field_data'])) {
        foreach ($value['field_data'] as $field) {
            $name = $field['name'];
            $val = $field['values'][0] ?? '';

            if (in_array($name, ['full_name', 'name', 'fname']))
                $contact['name'] = $val;
            if (in_array($name, ['email', 'email_address']))
                $contact['email'] = $val;
            if (in_array($name, ['phone_number', 'phone']))
                $contact['phone'] = $val;
            if (in_array($name, ['company_name', 'company']))
                $contact['company'] = $val;
        }
    } else {
        $contact['note'] = "Lead ID: $leadGenId (Form: $formId). Details pending Graph API fetch.";
        // Fallback for demo if name is missing
        if ($contact['name'] === 'Unknown Lead')
            $contact['name'] = "Meta Lead #$leadGenId";
    }

}
// B. Parse Generic/n8n/Zapier Payload (Flat)
else {
    // Map common field names from various form builders
    $nameKeys = ['name', 'full_name', 'your-name', 'firstname', 'first_name'];
    $emailKeys = ['email', 'email_address', 'your-email', 'e-mail'];
    $phoneKeys = ['phone', 'phone_number', 'your-phone', 'tel', 'tel-123', 'telefono'];
    $companyKeys = ['company', 'company_name', 'your-company', 'empresa'];
    $noteKeys = ['note', 'message', 'your-message', 'mensaje'];
    $valueKeys = ['value', 'amount', 'monto'];

    $findFirst = function($arr, $keys) {
        foreach ($keys as $k) {
            if (isset($arr[$k]) && $arr[$k] !== '') return $arr[$k];
        }
        return '';
    };

    $contact['name'] = $findFirst($data, $nameKeys) ?: 'Unknown Lead';
    $contact['email'] = $findFirst($data, $emailKeys) ?: '';
    $contact['phone'] = $findFirst($data, $phoneKeys) ?: '';
    $contact['company'] = $findFirst($data, $companyKeys) ?: '';
    $contact['note'] = $findFirst($data, $noteKeys) ?: '';
    $contact['value'] = is_numeric($findFirst($data, $valueKeys)) ? (float)$findFirst($data, $valueKeys) : ($data['value'] ?? 0);
    $contact['source'] = $data['source'] ?? 'Website';
    
    // Parse UTMs from flat payload (Website/Zapier)
    $contact['utm_campaign'] = $data['utm_campaign'] ?? $data['campaign'] ?? '';
    $contact['utm_source'] = $data['utm_source'] ?? $data['source_param'] ?? 'web';
    $contact['utm_medium'] = $data['utm_medium'] ?? $data['medium'] ?? '';
    $contact['utm_term'] = $data['utm_term'] ?? $data['term'] ?? '';
    $contact['utm_content'] = $data['utm_content'] ?? $data['content'] ?? '';
}

// Validation
if (empty($contact['name']) && empty($contact['email'])) {
    logWebhook($pdo, $input, 'Unknown', 'error', 'Invalid Payload: Name or Email required');
    http_response_code(400);
    echo json_encode(['error' => 'Invalid Payload: Name or Email required']);
    exit;
}

try {
    // Check duplicates
    $check = $pdo->prepare("SELECT id FROM contacts WHERE email = :email AND email != ''");
    $check->execute([':email' => $contact['email']]);
    if ($check->rowCount() > 0) {
        echo json_encode(['success' => false, 'message' => 'Contact already exists']);
        exit;
    }

    // Insert
    $sql = "INSERT INTO contacts (name, company, email, phone, status, source, value, utm_campaign, utm_source, utm_medium, utm_term, utm_content) VALUES (:name, :company, :email, :phone, :status, :source, :value, :utm_campaign, :utm_source, :utm_medium, :utm_term, :utm_content)";
    $stmt = $pdo->prepare($sql);

    $stmt->execute([
        ':name' => $contact['name'],
        ':company' => $contact['company'],
        ':email' => $contact['email'],
        ':phone' => $contact['phone'],
        ':status' => 'New',
        ':source' => $contact['source'],
        ':value' => $contact['value'] ?? 0,
        ':utm_campaign' => $contact['utm_campaign'] ?? null,
        ':utm_source' => $contact['utm_source'] ?? null,
        ':utm_medium' => $contact['utm_medium'] ?? null,
        ':utm_term' => $contact['utm_term'] ?? null,
        ':utm_content' => $contact['utm_content'] ?? null
    ]);

    $id = $pdo->lastInsertId();

    // Add note
    if (!empty($contact['note'])) {
        $noteStmt = $pdo->prepare("INSERT INTO contact_notes (contact_id, content, author_id) VALUES (:id, :content, 1)");
        $noteStmt->execute([
            ':id' => $id,
            ':content' => $contact['note']
        ]);
    }

    // --- TRIGGER OUTGOING WEBHOOKS (n8n/Make) ---
    // This allows automation workflows to start immediately after lead capture
    try {
        $triggerStmt = $pdo->prepare("SELECT setting_key, setting_value FROM company_settings WHERE setting_key IN ('n8n', 'make')");
        $triggerStmt->execute();
        $integrations = $triggerStmt->fetchAll(PDO::FETCH_ASSOC);

        $payload = array_merge($contact, ['id' => $id, 'created_at' => date('Y-m-d H:i:s')]);

        foreach ($integrations as $integ) {
            $cfg = json_decode($integ['setting_value'], true);
            if (!empty($cfg['connected']) && !empty($cfg['webhookUrl'])) {
                // Fire and forget (timeout 1s) to not block response
                $ch = curl_init($cfg['webhookUrl']);
                curl_setopt($ch, CURLOPT_POST, 1);
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
                curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
                curl_setopt($ch, CURLOPT_TIMEOUT_MS, 500); // 500ms timeout
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_exec($ch);
                curl_close($ch);
            }
        }
    } catch (Exception $e) {
        // Silently fail outgoing webhooks to not disrupt lead creation
    }
    // --------------------------------------------

    logWebhook($pdo, $input, $contact['source'], 'success', "Lead created via webhook (ID: $id)");
    echo json_encode(['success' => true, 'id' => $id, 'message' => 'Lead created via webhook']);

} catch (Exception $e) {
    logWebhook($pdo, $input, 'Unknown', 'error', $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

function logWebhook($pdo, $payload, $source, $status, $response) {
    try {
        $stmt = $pdo->prepare("INSERT INTO webhook_logs (payload, source, status, response) VALUES (:p, :s, :st, :r)");
        $stmt->execute([
            ':p' => $payload,
            ':s' => $source,
            ':st' => $status,
            ':r' => $response
        ]);
    } catch (Exception $e) {
        // Silent fail for logs
    }
}
?>
