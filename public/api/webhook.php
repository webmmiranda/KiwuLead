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

// A. Parse Meta Payloads (Ads & WhatsApp)
if (isset($data['object'])) {
    
    // --- 1. WhatsApp Incoming Message ---
    if ($data['object'] === 'whatsapp_business_account') {
        $entry = $data['entry'][0] ?? [];
        $changes = $entry['changes'][0] ?? [];
        $value = $changes['value'] ?? [];

        if (isset($value['messages'][0])) {
            $msg = $value['messages'][0];
            $from = $msg['from']; 
            $text = $msg['text']['body'] ?? '[Media/Other]';
            $name = $value['contacts'][0]['profile']['name'] ?? 'WhatsApp User';

            // Find Contact
            $stmt = $pdo->prepare("SELECT id, owner, status FROM contacts WHERE phone LIKE :phone LIMIT 1");
            $stmt->execute([':phone' => "%" . substr($from, -10)]); 
            $contactRow = $stmt->fetch(PDO::FETCH_ASSOC);
            $id = $contactRow['id'] ?? null;

            if (!$id) {
                $stmt = $pdo->prepare("INSERT INTO contacts (name, phone, source, status, created_at) VALUES (:name, :phone, 'WhatsApp', 'New', NOW())");
                $stmt->execute([':name' => $name, ':phone' => $from]);
                $id = $pdo->lastInsertId();
            }

            // Save Message
            $stmt = $pdo->prepare("INSERT INTO contact_history (contact_id, sender, type, channel, content, created_at) VALUES (:id, 'customer', 'message', 'whatsapp', :content, NOW())");
            $stmt->execute([':id' => $id, ':content' => $text]);

            // --- TRIGGER AI AGENT ---
            // Check if AI is enabled in settings
            $stmtSettings = $pdo->prepare("SELECT setting_value FROM company_settings WHERE setting_key = 'ai'");
            $stmtSettings->execute();
            $aiRow = $stmtSettings->fetch(PDO::FETCH_ASSOC);
            $aiSettings = $aiRow ? json_decode($aiRow['setting_value'], true) : [];

            if (!empty($aiSettings['enabled'])) {
                 // Fire and forget AI processing
                 // We use a helper script `process_ai_reply.php` to not block webhook response
                 $cmd = "php " . __DIR__ . "/process_ai_reply.php $id > /dev/null 2>&1 &";
                 exec($cmd);
            }
            // ------------------------
            
            echo json_encode(['status' => 'processed']);
            exit;
        }
    }

    // --- 2. Meta Ads (Page Object) ---
    if ($data['object'] === 'page') {
        $contact['source'] = 'Meta Ads';
        $contact['utm_source'] = 'Facebook';
        $contact['utm_medium'] = 'cpc';

        $entry = $data['entry'][0] ?? [];
        $changes = $entry['changes'][0] ?? [];
        $value = $changes['value'] ?? [];

        $formId = $value['form_id'] ?? 'Unknown Form';
        $leadGenId = $value['leadgen_id'] ?? null;
        $formName = $value['form_name'] ?? "Form $formId";

        // Filter / Validation logic...
        $stmt = $pdo->prepare("SELECT setting_value FROM company_settings WHERE setting_key = 'meta'");
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $metaSettings = $row ? json_decode($row['setting_value'], true) : [];
        $allowedForms = $metaSettings['selectedForms'] ?? [];

        if (!empty($allowedForms) && !in_array($formId, $allowedForms)) {
            logWebhook($pdo, $input, 'Meta', 'ignored', "Form ID $formId skipped.");
            echo json_encode(['status' => 'ignored']);
            exit;
        }

        // Fetch Real Data if needed
        if ($leadGenId && empty($value['field_data'])) {
             $accessToken = $metaSettings['accessToken'] ?? null;
             if ($accessToken) {
                // ... (Graph API Call logic as before) ...
                $url = "https://graph.facebook.com/v19.0/$leadGenId?access_token=$accessToken";
                $ch = curl_init($url);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                $resp = curl_exec($ch);
                curl_close($ch);
                $details = json_decode($resp, true);
                if (isset($details['field_data'])) $value['field_data'] = $details['field_data'];
             }
        }

        // --- CAPTURE CUSTOM FIELDS ---
        $customQuestions = [];
        if (isset($value['field_data'])) {
            foreach ($value['field_data'] as $field) {
                $name = $field['name'];
                $val = $field['values'][0] ?? '';

                // Standard Mapping
                if (in_array($name, ['full_name', 'name', 'fname'])) { $contact['name'] = $val; continue; }
                if (in_array($name, ['email', 'email_address'])) { $contact['email'] = $val; continue; }
                if (in_array($name, ['phone_number', 'phone'])) { $contact['phone'] = $val; continue; }
                if (in_array($name, ['company_name', 'company'])) { $contact['company'] = $val; continue; }

                // Custom Question Handling
                $customQuestions[] = "• $name: $val";
            }
        }

        // If generic fallback needed
        if ($contact['name'] === 'Unknown Lead') $contact['name'] = "Meta Lead #$leadGenId";

        // Append Custom Questions to Note
        if (!empty($customQuestions)) {
            $existingNote = $contact['note'] ?? '';
            $qaBlock = "\n\n📝 Respuestas Formulario ($formName):\n" . implode("\n", $customQuestions);
            $contact['note'] = $existingNote . $qaBlock;
        }
        
        // Auto-Tag with Form Name (Sanitized)
        $contact['utm_term'] = $formName; 
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
