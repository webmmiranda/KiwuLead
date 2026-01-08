<?php
// public/api/meta.php
// Handles WhatsApp Cloud API & Meta Graph API Integration

require_once 'db.php';
// require_once 'middleware.php'; // Uncomment if auth is needed

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$action = $_GET['action'] ?? '';
$pdo = getDB();

// --- HELPER: Database Config ---
function getWaConfig($pdo) {
    try {
        $stmt = $pdo->prepare("SELECT setting_value FROM company_settings WHERE setting_key = 'whatsapp_config'");
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        // Default structure
        $default = ['connected' => false, 'phoneId' => '', 'token' => ''];
        if ($row) {
            $stored = json_decode($row['setting_value'], true);
            return array_merge($default, $stored ?? []);
        }
        return $default;
    } catch (Exception $e) {
        return ['connected' => false, 'error' => $e->getMessage()];
    }
}

function saveWaConfig($pdo, $config) {
    $stmt = $pdo->prepare("INSERT INTO company_settings (setting_key, setting_value) VALUES ('whatsapp_config', :value)
        ON DUPLICATE KEY UPDATE setting_value = :value");
    return $stmt->execute([':value' => json_encode($config)]);
}

// --- HELPER: Make Real Graph API Request ---
function callGraphApi($url, $method = 'GET', $data = null, $token = null)
{
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $headers = ['Content-Type: application/json'];
    if ($token) {
        $headers[] = 'Authorization: Bearer ' . $token;
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if ($data) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $json = json_decode($response, true);
    
    // Normalize error response
    if ($httpCode >= 400) {
        return ['success' => false, 'code' => $httpCode, 'error' => $json['error'] ?? $json];
    }
    return ['success' => true, 'data' => $json];
}

// --- MOCK DATA (Fallback) ---
$mockAccounts = [
    ['id' => 'act_101', 'name' => 'Nexus Main Account (USD) [MOCK]'],
    ['id' => 'act_102', 'name' => 'Agency Client A (MXN) [MOCK]'],
    ['id' => 'act_103', 'name' => 'Test Sandbox [MOCK]']
];

$mockForms = [
    'act_101' => [
        ['id' => 'form_5501', 'name' => 'Lead Gen - Real Estate v1', 'status' => 'ACTIVE'],
        ['id' => 'form_5502', 'name' => 'Newsletter Signup', 'status' => 'ACTIVE']
    ]
];

switch ($action) {
    case 'config':
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            echo json_encode(['config' => getWaConfig($pdo)]);
        } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $data = json_decode(file_get_contents('php://input'), true);
            if (saveWaConfig($pdo, $data)) {
                echo json_encode(['success' => true]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to save config']);
            }
        }
        break;

    case 'send_message':
        $input = json_decode(file_get_contents('php://input'), true);
        $config = getWaConfig($pdo);
        
        if (empty($config['phoneId']) || empty($config['token'])) {
             http_response_code(400);
             echo json_encode(['success' => false, 'error' => 'WhatsApp not configured']);
             exit;
        }

        $url = "https://graph.facebook.com/v19.0/{$config['phoneId']}/messages";
        $payload = [
            'messaging_product' => 'whatsapp',
            'to' => $input['to'],
            'type' => 'text',
            'text' => ['body' => $input['text']]
        ];

        $res = callGraphApi($url, 'POST', $payload, $config['token']);
        echo json_encode($res);
        break;

    case 'send_template':
        $input = json_decode(file_get_contents('php://input'), true);
        $config = getWaConfig($pdo);
        
        if (empty($config['phoneId']) || empty($config['token'])) {
             http_response_code(400);
             echo json_encode(['success' => false, 'error' => 'WhatsApp not configured']);
             exit;
        }

        $url = "https://graph.facebook.com/v19.0/{$config['phoneId']}/messages";
        $payload = [
            'messaging_product' => 'whatsapp',
            'to' => $input['to'],
            'type' => 'template',
            'template' => [
                'name' => $input['template'],
                'language' => ['code' => $input['language'] ?? 'es']
            ]
        ];

        $res = callGraphApi($url, 'POST', $payload, $config['token']);
        echo json_encode($res);
        break;

    case 'accounts':
        $accessToken = $_GET['access_token'] ?? '';
        if (!empty($accessToken)) {
            // REAL API CALL
            $url = "https://graph.facebook.com/v19.0/me/adaccounts?fields=name,account_id,currency";
            $res = callGraphApi($url, 'GET', null, $accessToken);

            if ($res['success'] && isset($res['data']['data'])) {
                $accounts = array_map(function ($acc) {
                    return [
                        'id' => 'act_' . $acc['account_id'],
                        'name' => ($acc['name'] ?? 'Unnamed') . ' (' . ($acc['currency'] ?? 'UNK') . ')'
                    ];
                }, $res['data']['data']);
                echo json_encode(['data' => $accounts]);
            } else {
                echo json_encode(['data' => [], 'error' => $res]);
            }
        } else {
            // MOCK MODE
            usleep(300000);
            echo json_encode(['data' => $mockAccounts]);
        }
        break;

    case 'forms':
        $accountId = $_GET['account_id'] ?? '';
        $accessToken = $_GET['access_token'] ?? '';

        if (!empty($accessToken)) {
            $url = "https://graph.facebook.com/v19.0/{$accountId}/leadgen_forms?fields=name,status,id";
            $res = callGraphApi($url, 'GET', null, $accessToken);
            
            if ($res['success'] && isset($res['data']['data'])) {
                echo json_encode(['data' => $res['data']['data']]);
            } else {
                echo json_encode(['data' => [], 'error' => $res]);
            }
        } else {
            // MOCK MODE
            $forms = $mockForms[$accountId] ?? [];
            if (empty($forms)) {
                $forms = [['id' => 'form_mock_999', 'name' => 'Demo Form (Generic)', 'status' => 'ACTIVE']];
            }
            usleep(300000);
            echo json_encode(['data' => $forms]);
        }
        break;

    default:
        echo json_encode(['error' => 'Invalid action']);
        break;
}
?>