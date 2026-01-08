<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

try {
    $conn = getDB();
    $stmt = $conn->query("SELECT count(*) as count FROM users");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'status' => 'success', 
        'message' => 'Connected to Database successfully', 
        'user_count' => $result['count'],
        'database' => DB_NAME
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error', 
        'message' => $e->getMessage()
    ]);
}
