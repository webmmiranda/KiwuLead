<?php
require_once 'db.php';

try {
    $pdo = getDB();
    echo json_encode([
        'status' => 'success',
        'message' => 'Database connection successful',
        'database' => DB_NAME
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
