<?php
require_once 'db.php';
header('Content-Type: application/json');

try {
    $pdo = getDB();

    // Check if column exists
    $stmt = $pdo->query("SHOW COLUMNS FROM user_email_configs LIKE 'signature'");
    $exists = $stmt->fetch();

    if (!$exists) {
        $pdo->exec("ALTER TABLE user_email_configs ADD COLUMN signature TEXT DEFAULT NULL AFTER from_email");
        echo json_encode(['success' => true, 'message' => 'Column signature added successfully']);
    } else {
        echo json_encode(['success' => true, 'message' => 'Column signature already exists']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>