<?php
require_once 'db.php';

header('Content-Type: application/json');

try {
    $pdo = getDB();

    // Create table if not exists
    $sql = "CREATE TABLE IF NOT EXISTS `pipeline_stages` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `name` varchar(100) NOT NULL,
      `key_name` varchar(50) NOT NULL,
      `color` varchar(50) DEFAULT 'border-gray-500',
      `order_index` int(11) DEFAULT 0,
      `probability` int(11) DEFAULT 0,
      `is_active` tinyint(1) DEFAULT 1,
      PRIMARY KEY (`id`),
      UNIQUE KEY `key_name` (`key_name`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    $pdo->exec($sql);

    // Check if 'probability' column exists in pipeline_stages
    $colCheck = $pdo->query("SHOW COLUMNS FROM pipeline_stages LIKE 'probability'");
    if ($colCheck->rowCount() == 0) {
        $pdo->exec("ALTER TABLE pipeline_stages ADD COLUMN probability INT(11) DEFAULT 0 AFTER order_index");
    }

    // Check if table is empty
    $stmt = $pdo->query("SELECT COUNT(*) FROM pipeline_stages");
    if ($stmt->fetchColumn() == 0) {
        // Insert defaults with probabilities
        $defaults = [
            ['Nuevos', 'New', 'border-blue-500', 0, 5],
            ['Contactados', 'Contacted', 'border-indigo-500', 1, 10],
            ['Calificados', 'Qualified', 'border-purple-500', 2, 40],
            ['Negociación', 'Negotiation', 'border-orange-500', 3, 70],
            ['Ganados', 'Won', 'border-green-500', 4, 100],
            ['Perdidos', 'Lost', 'border-red-500', 5, 0]
        ];

        $insert = $pdo->prepare("INSERT INTO pipeline_stages (name, key_name, color, order_index, probability) VALUES (?, ?, ?, ?, ?)");
        
        foreach ($defaults as $stage) {
            $insert->execute($stage);
        }
        $message = 'Table created and seeded';
    } else {
        // Update existing stages with new probabilities
        $updates = [
            'New' => 5,
            'Contacted' => 10,
            'Qualified' => 40,
            'Negotiation' => 70,
            'Won' => 100,
            'Lost' => 0
        ];
        
        $updateStmt = $pdo->prepare("UPDATE pipeline_stages SET probability = ? WHERE key_name = ?");
        foreach ($updates as $key => $prob) {
            $updateStmt->execute([$prob, $key]);
        }
        $message = 'Table updated with probabilities';
    }

    // 2. MIGRATE EXISTING CONTACTS
    // Update contacts probability based on their current status
    $contactUpdates = [
        'New' => 5,
        'Contacted' => 10,
        'Qualified' => 40,
        'Negotiation' => 70,
        'Won' => 100,
        'Lost' => 0
    ];

    $count = 0;
    $updateContact = $pdo->prepare("UPDATE contacts SET probability = ? WHERE status = ? AND (probability IS NULL OR probability = 0)");
    
    foreach ($contactUpdates as $status => $prob) {
        $updateContact->execute([$prob, $status]);
        $count += $updateContact->rowCount();
    }

    echo json_encode([
        'success' => true, 
        'message' => $message,
        'contacts_updated' => $count
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
