<?php
require_once 'db.php';
try {
    $pdo = getDB();

    // Create user_email_configs table
    $pdo->exec("CREATE TABLE IF NOT EXISTS user_email_configs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        smtp_host VARCHAR(255),
        smtp_port INT,
        smtp_user VARCHAR(255),
        smtp_pass VARCHAR(255),
        smtp_secure VARCHAR(10) DEFAULT 'tls',
        from_name VARCHAR(255),
        from_email VARCHAR(255),
        signature TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY(user_id)
    )");

    // Create emails table (redundant but safe)
    $pdo->exec("CREATE TABLE IF NOT EXISTS emails (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        to_email VARCHAR(255) NOT NULL,
        from_email VARCHAR(255) DEFAULT NULL,
        subject VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        preview VARCHAR(255) DEFAULT '',
        attachments VARCHAR(1000) DEFAULT NULL,
        folder VARCHAR(50) DEFAULT 'sent',
        is_read BOOLEAN DEFAULT 1,
        is_archived BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX(user_id),
        INDEX(folder)
    )");

    echo "Database schema updated successfully.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>