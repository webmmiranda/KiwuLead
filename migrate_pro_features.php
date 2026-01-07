<?php
// migrate_pro_features.php
require_once 'public/api/db.php';

$pdo = getDB();

try {
    echo "Iniciando migración...\n";

    // 1. Check and Add bant_json
    $check = $pdo->query("SHOW COLUMNS FROM contacts LIKE 'bant_json'");
    if (!$check->fetch()) {
        $pdo->exec("ALTER TABLE contacts ADD COLUMN bant_json TEXT DEFAULT NULL AFTER tags");
        echo "✅ Columna bant_json añadida.\n";
    } else {
        echo "ℹ️ Columna bant_json ya existe.\n";
    }

    // 2. Check and Add documents_json
    $check = $pdo->query("SHOW COLUMNS FROM contacts LIKE 'documents_json'");
    if (!$check->fetch()) {
        $pdo->exec("ALTER TABLE contacts ADD COLUMN documents_json TEXT DEFAULT NULL AFTER bant_json");
        echo "✅ Columna documents_json añadida.\n";
    } else {
        echo "ℹ️ Columna documents_json ya existe.\n";
    }

    echo "Migración completada con éxito.\n";
} catch (Exception $e) {
    echo "❌ Error durante la migración: " . $e->getMessage() . "\n";
}
?>