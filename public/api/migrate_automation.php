<?php
require_once 'db.php';
$pdo = getDB();

$sql = "CREATE TABLE IF NOT EXISTS automation_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description VARCHAR(255),
    category VARCHAR(50) DEFAULT 'CORE',
    trigger_event VARCHAR(50) NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    config_json TEXT
)";

$pdo->exec($sql);
echo "Table automation_rules created successfully.";
?>