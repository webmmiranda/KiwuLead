<?php
require_once 'db.php';
$pdo = getDB();

$indexes = [
    "ALTER TABLE contacts ADD INDEX idx_email (email)",
    "ALTER TABLE contacts ADD INDEX idx_phone (phone)",
    "ALTER TABLE contacts ADD INDEX idx_last_activity (last_activity_at)",
    "ALTER TABLE tasks ADD INDEX idx_due_date (due_date)",
    "ALTER TABLE tasks ADD INDEX idx_status (status)",
    "ALTER TABLE tasks ADD INDEX idx_type (type)"
];

echo "<h2>Applying Database Indexes...</h2>";

foreach ($indexes as $sql) {
    try {
        $pdo->exec($sql);
        echo "<div style='color: green'>✓ Executed: $sql</div>";
    } catch (PDOException $e) {
        // Ignorar error de duplicado "Duplicate key name" (Código 1061 o similar)
        if (strpos($e->getMessage(), "Duplicate key name") !== false || strpos($e->getMessage(), "already exists") !== false) {
             echo "<div style='color: orange'>⚠ Index already exists: $sql</div>";
        } else {
             echo "<div style='color: red'>✗ Error: " . $e->getMessage() . "</div>";
        }
    }
}
echo "<h3>Optimization Complete.</h3>";
?>