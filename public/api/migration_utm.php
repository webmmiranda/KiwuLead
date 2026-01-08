<?php
require_once 'db.php';

header('Content-Type: text/plain');

try {
    $pdo = getDB();
    
    // Add columns if they don't exist
    $columns = [
        'utm_campaign' => 'VARCHAR(255) DEFAULT NULL',
        'utm_source' => 'VARCHAR(255) DEFAULT NULL',
        'utm_medium' => 'VARCHAR(255) DEFAULT NULL',
        'utm_term' => 'VARCHAR(255) DEFAULT NULL',
        'utm_content' => 'VARCHAR(255) DEFAULT NULL'
    ];

    foreach ($columns as $col => $def) {
        try {
            $pdo->exec("ALTER TABLE contacts ADD COLUMN $col $def");
            echo "Columna $col agregada.\n";
        } catch (PDOException $e) {
            // Ignore if exists (error 42S21 usually)
            if (strpos($e->getMessage(), 'Duplicate column') !== false) {
                echo "Columna $col ya existe.\n";
            } else {
                echo "Nota sobre $col: " . $e->getMessage() . "\n";
            }
        }
    }
    
    echo "Migración de estructura UTM completada.";
    
} catch (Exception $e) {
    echo "Error fatal: " . $e->getMessage();
}
?>