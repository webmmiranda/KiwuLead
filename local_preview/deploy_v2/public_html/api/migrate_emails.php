<?php
require_once 'db.php';
try {
    $pdo = getDB();
    $sql = "CREATE TABLE IF NOT EXISTS emails (
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
    );";
    $pdo->exec($sql);

    // Add signature column to user_email_configs if not exists
    $cols = $pdo->query("SHOW COLUMNS FROM user_email_configs LIKE 'signature'");
    if ($cols->rowCount() == 0) {
        $pdo->exec("ALTER TABLE user_email_configs ADD COLUMN signature TEXT DEFAULT NULL");
    }

    echo "Table 'emails' created/checked and schema updated.";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>