<?php
// public/api/meta.php
// Simulates Meta Graph API for Demo/Dev purposes
// In production, this would make real cURL requests to https://graph.facebook.com/v19.0/

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$action = $_GET['action'] ?? '';

$accessToken = $_GET['access_token'] ?? '';

// --- HELPER: Make Real Graph API Request ---
function callGraphApi($url)
{
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    // curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Uncomment if local SSL issues
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $json = json_decode($response, true);
    if ($httpCode !== 200) {
        return ['error' => 'Graph API Error', 'details' => $json];
    }
    return $json;
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
    case 'accounts':
        if (!empty($accessToken)) {
            // REAL API CALL
            // Fetch accounts with name, currency, account_id
            $url = "https://graph.facebook.com/v19.0/me/adaccounts?fields=name,account_id,currency&access_token=" . urlencode($accessToken);
            $res = callGraphApi($url);

            if (isset($res['data'])) {
                // Normalize to expected format
                $accounts = array_map(function ($acc) {
                    return [
                        'id' => 'act_' . $acc['account_id'],
                        'name' => ($acc['name'] ?? 'Unnamed') . ' (' . ($acc['currency'] ?? 'UNK') . ')'
                    ];
                }, $res['data']);
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

        if (!empty($accessToken)) {
            // REAL API CALL
            // Fetch forms for the ad account
            $url = "https://graph.facebook.com/v19.0/{$accountId}/leadgen_forms?fields=name,status,id&access_token=" . urlencode($accessToken);
            $res = callGraphApi($url);

            if (isset($res['data'])) {
                echo json_encode(['data' => $res['data']]);
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