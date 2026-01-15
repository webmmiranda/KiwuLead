<?php
require_once 'db.php';

header('Content-Type: application/json');

try {
    $pdo = getDB();

    $sql = "
    CREATE TABLE IF NOT EXISTS `appointments` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `title` varchar(200) NOT NULL,
      `contact_id` int(11) DEFAULT NULL,
      `user_id` int(11) DEFAULT NULL,
      `start_time` datetime NOT NULL,
      `end_time` datetime NOT NULL,
      `location` varchar(255) DEFAULT NULL,
      `description` text,
      `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      KEY `contact_id` (`contact_id`),
      KEY `user_id` (`user_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $pdo->exec($sql);
    echo json_encode(['success' => true, 'message' => 'Appointments table created successfully']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
