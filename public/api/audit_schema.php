<?php
require_once 'db.php';
$pdo = getDB();

$tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
$schema = [];

foreach ($tables as $table) {
    $columns = $pdo->query("DESCRIBE $table")->fetchAll(PDO::FETCH_ASSOC);
    $schema[$table] = $columns;
}

echo json_encode($schema, JSON_PRETTY_PRINT);
?>