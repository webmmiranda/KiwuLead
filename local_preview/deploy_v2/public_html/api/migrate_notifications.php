<?php
// Script de migración: Tabla de Notificaciones
// Crea la tabla 'notifications' si no existe

require_once 'db.php';

header('Content-Type: application/json');

try {
    $pdo = getDB();
    
    // Tabla notifications
    // is_read: 0 = No, 1 = Sí
    // type: info, success, warning, error, urgent
    // category: system, message, task, lead (para iconos y agrupación)
    $sql = "CREATE TABLE IF NOT EXISTS `notifications` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `user_id` int(11) NOT NULL,
        `type` enum('info', 'success', 'warning', 'error', 'urgent') DEFAULT 'info',
        `category` varchar(50) DEFAULT 'system', 
        `title` varchar(255) NOT NULL,
        `message` text,
        `is_read` tinyint(1) DEFAULT '0',
        `link_to` varchar(255) DEFAULT NULL,
        `metadata_json` text DEFAULT NULL,
        `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        KEY `user_id` (`user_id`),
        KEY `is_read` (`is_read`),
        KEY `created_at` (`created_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    
    $pdo->exec($sql);

    // Tabla notification_preferences
    // Almacena preferencias de usuario para notificaciones (email, push, in-app)
    $sql_prefs = "CREATE TABLE IF NOT EXISTS `notification_preferences` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `user_id` int(11) NOT NULL,
        `email_enabled` tinyint(1) DEFAULT '1',
        `browser_enabled` tinyint(1) DEFAULT '1',
        `urgent_only` tinyint(1) DEFAULT '0',
        `categories_muted` text DEFAULT NULL, -- JSON array of muted categories
        `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        UNIQUE KEY `user_id` (`user_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    
    $pdo->exec($sql_prefs);
    
    echo json_encode([
        'success' => true,
        'message' => 'Tablas notifications y preferences creadas correctamente.'
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error: ' . $e->getMessage()
    ]);
}
