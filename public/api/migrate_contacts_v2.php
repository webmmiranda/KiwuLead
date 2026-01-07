<?php
require_once 'db.php';

header('Content-Type: application/json');

$pdo = getDB();

try {
    // Check if columns exist
    $stmt = $pdo->query("SHOW COLUMNS FROM contacts LIKE 'won_data_json'");
    $wonDataExists = $stmt->fetch();

    $stmt = $pdo->query("SHOW COLUMNS FROM contacts LIKE 'product_interests_json'");
    $productInterestsExists = $stmt->fetch();

    $alterQueries = [];

    if (!$wonDataExists) {
        $alterQueries[] = "ADD COLUMN won_data_json TEXT DEFAULT NULL";
    }

    if (!$productInterestsExists) {
        $alterQueries[] = "ADD COLUMN product_interests_json TEXT DEFAULT NULL";
    }

    if (!empty($alterQueries)) {
        $sql = "ALTER TABLE contacts " . implode(', ', $alterQueries);
        $pdo->exec($sql);
        echo json_encode(['success' => true, 'message' => 'Columns added successfully']);
    } else {
        echo json_encode(['success' => true, 'message' => 'Columns already exist']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>