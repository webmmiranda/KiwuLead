<?php
require_once 'db.php';
try {
    $pdo = getDB();
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "Tables in database:\n";
    foreach ($tables as $table) {
        echo "- $table\n";
        if ($table === 'user_email_configs') {
            $cols = $pdo->query("DESCRIBE user_email_configs");
            while ($col = $cols->fetch(PDO::FETCH_ASSOC)) {
                echo "  -> " . $col['Field'] . " (" . $col['Type'] . ")\n";
            }
        }
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>