<?php
// Script de migración Fase 3: Optimización y Seguridad
// Agrega índices faltantes a las tablas principales

require_once 'db.php';

header('Content-Type: application/json');

try {
    $pdo = getDB();
    $results = [];
    
    $indexes = [
        'contacts' => ['email', 'phone', 'status', 'owner_id', 'created_at'],
        'tasks' => ['status', 'priority', 'assigned_to', 'due_date', 'related_contact_id'],
        'users' => ['email', 'role']
    ];

    foreach ($indexes as $table => $cols) {
        foreach ($cols as $col) {
            $indexName = "idx_{$table}_{$col}";
            try {
                // Check if index exists (MySQL specific)
                $check = $pdo->query("SHOW INDEX FROM $table WHERE Key_name = '$indexName'");
                if ($check->rowCount() == 0) {
                    $pdo->exec("CREATE INDEX $indexName ON $table ($col)");
                    $results[] = "Created index $indexName on $table($col)";
                } else {
                    $results[] = "Index $indexName already exists";
                }
            } catch (PDOException $e) {
                $results[] = "Error creating index $indexName: " . $e->getMessage();
            }
        }
    }

    echo json_encode([
        'success' => true,
        'message' => 'Migración Fase 3 (Índices) completada.',
        'details' => $results
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error en migración: ' . $e->getMessage()
    ]);
}
