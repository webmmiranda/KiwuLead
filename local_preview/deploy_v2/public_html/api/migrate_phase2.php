<?php
// Script de migración Fase 2: Tablas de Monitoreo y Auditoría
// Se ejecuta manualmente o vía navegador para crear las tablas necesarias

require_once 'db.php';

header('Content-Type: application/json');

try {
    $pdo = getDB();
    
    // 1. Crear tabla audit_logs
    $sqlAudit = "CREATE TABLE IF NOT EXISTS `audit_logs` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `user_id` int(11) DEFAULT NULL,
        `action` varchar(50) NOT NULL,
        `entity_type` varchar(50) NOT NULL,
        `entity_id` varchar(50) DEFAULT NULL,
        `details` text,
        `ip_address` varchar(45) DEFAULT NULL,
        `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        KEY `user_id` (`user_id`),
        KEY `action` (`action`),
        KEY `entity` (`entity_type`, `entity_id`),
        KEY `created_at` (`created_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    
    $pdo->exec($sqlAudit);
    $auditStatus = "Tabla 'audit_logs' verificada/creada correctamente.";

    // 2. Crear tabla api_stats
    $sqlStats = "CREATE TABLE IF NOT EXISTS `api_stats` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `endpoint` varchar(255) NOT NULL,
        `method` varchar(10) NOT NULL,
        `status_code` int(3) NOT NULL,
        `duration_ms` float NOT NULL,
        `user_id` int(11) DEFAULT NULL,
        `ip_address` varchar(45) DEFAULT NULL,
        `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        KEY `endpoint` (`endpoint`),
        KEY `created_at` (`created_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    
    $pdo->exec($sqlStats);
    $statsStatus = "Tabla 'api_stats' verificada/creada correctamente.";

    echo json_encode([
        'success' => true,
        'message' => 'Migración Fase 2 completada.',
        'details' => [
            'audit_logs' => $auditStatus,
            'api_stats' => $statsStatus
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error en migración: ' . $e->getMessage()
    ]);
}
