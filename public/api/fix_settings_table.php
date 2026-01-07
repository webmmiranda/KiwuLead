<?php
require_once 'db.php';

header('Content-Type: text/plain');

try {
    $pdo = getDB();
    
    // Check if table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'company_settings'");
    if ($stmt->rowCount() === 0) {
        // Create table if not exists
        $sql = "CREATE TABLE `company_settings` (
          `setting_key` varchar(50) NOT NULL,
          `setting_value` text,
          PRIMARY KEY (`setting_key`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
        $pdo->exec($sql);
        echo "Tabla company_settings creada exitosamente.\n";
    } else {
        // Modify existing table
        // Drop Primary Key
        try {
            $pdo->exec("ALTER TABLE company_settings DROP PRIMARY KEY");
        } catch (Exception $e) {
            // Ignore if PK doesn't exist or is different
        }
        
        // Drop ID column if exists
        try {
            $pdo->exec("ALTER TABLE company_settings DROP COLUMN id");
        } catch (Exception $e) {
            // Ignore if column doesn't exist
        }
        
        // Add Primary Key on setting_key
        $pdo->exec("ALTER TABLE company_settings ADD PRIMARY KEY (setting_key)");
        
        echo "Tabla company_settings actualizada exitosamente.\n";
    }
    
    echo "Corrección aplicada. Ahora la configuración debería guardarse correctamente.";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>