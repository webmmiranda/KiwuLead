<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

try {
    $conn = getDB();
    $stmt = $conn->query("SELECT count(*) as count FROM users");
    $count = $stmt->fetchColumn();

    // Get list of tables
    $tables = [];
    $stmt = $conn->query("SHOW TABLES");
    while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
        $tables[] = $row[0];
    }

    echo json_encode([
        'status' => 'success',
        'message' => 'Connected to Database successfully',
        'user_count' => $count,
        'database' => DB_NAME,
        'tables' => $tables
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error', 
        'message' => $e->getMessage()
    ]);
}
