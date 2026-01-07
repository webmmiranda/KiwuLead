<?php
// public/api/settings.php
require_once 'db.php';
require_once 'middleware.php';
requireAuth();

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDB();

switch ($method) {
    case 'GET':
        handleGet($pdo);
        break;
    case 'POST':
        handlePost($pdo); // Create or Update
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method Not Allowed']);
        break;
}

function handleGet($pdo)
{
    try {
        $stmt = $pdo->query("SELECT setting_key, setting_value FROM company_settings");
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $settings = [];
        foreach ($results as $row) {
            $settings[$row['setting_key']] = json_decode($row['setting_value'], true) ?? $row['setting_value'];
        }

        echo json_encode($settings);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function handlePost($pdo)
{
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['key'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Key is required']);
        return;
    }

    $key = $data['key'];
    $value = json_encode($data['value']); // Store everything as JSON string

    try {
        // Check if key exists
        $check = $pdo->prepare("SELECT setting_key FROM company_settings WHERE setting_key = :key");
        $check->execute([':key' => $key]);
        $exists = $check->fetch();

        if ($exists) {
            // Update
            $sql = "UPDATE company_settings SET setting_value = :value WHERE setting_key = :key";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':key' => $key, ':value' => $value]);
        } else {
            // Insert
            $sql = "INSERT INTO company_settings (setting_key, setting_value) VALUES (:key, :value)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':key' => $key, ':value' => $value]);
        }

        echo json_encode(['success' => true, 'message' => 'Setting saved']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>