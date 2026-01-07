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

$input = file_get_contents('php://input');
$data = json_decode($input, true);

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

    // Extract first entry/change for simplicity
    $entry = $data['entry'][0] ?? [];
    $changes = $entry['changes'][0] ?? [];
    $value = $changes['value'] ?? [];

    $formId = $value['form_id'] ?? 'Unknown Form';
    $leadGenId = $value['leadgen_id'] ?? '';

    // --- FILTER BY SELECTED FORMS ---
    // Fetch settings
    $stmt = $pdo->prepare("SELECT setting_value FROM company_settings WHERE setting_key = 'meta'");
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    $metaSettings = $row ? json_decode($row['setting_value'], true) : [];
    $allowedForms = $metaSettings['selectedForms'] ?? [];

    // If specific forms are selected, ONLY allow those
    if (!empty($allowedForms) && !in_array($formId, $allowedForms)) {
        http_response_code(200); // Return 200 to Meta so they stop retrying
        echo json_encode(['status' => 'ignored', 'message' => "Form ID $formId skipped per settings."]);
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
    $contact['name'] = $data['name'] ?? 'Unknown Lead';
    $contact['email'] = $data['email'] ?? '';
    $contact['phone'] = $data['phone'] ?? '';
    $contact['company'] = $data['company'] ?? '';
    $contact['source'] = $data['source'] ?? 'Webhook';
    $contact['note'] = $data['note'] ?? '';
    $contact['value'] = $data['value'] ?? 0;
}

// Validation
if (empty($contact['name']) && empty($contact['email'])) {
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
    $sql = "INSERT INTO contacts (name, company, email, phone, status, source, value) VALUES (:name, :company, :email, :phone, :status, :source, :value)";
    $stmt = $pdo->prepare($sql);

    $stmt->execute([
        ':name' => $contact['name'],
        ':company' => $contact['company'],
        ':email' => $contact['email'],
        ':phone' => $contact['phone'],
        ':status' => 'New',
        ':source' => $contact['source'],
        ':value' => $contact['value'] ?? 0
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

    echo json_encode(['success' => true, 'id' => $id, 'message' => 'Lead created via webhook']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>