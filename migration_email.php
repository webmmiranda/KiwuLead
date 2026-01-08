<?php
require_once 'public/api/db.php';

try {
    $pdo = getDB();
    echo "Connected to DB\n";

    // 1. Update user_email_configs
    $columns = $pdo->query("SHOW COLUMNS FROM user_email_configs")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('imap_host', $columns)) {
        $pdo->exec("ALTER TABLE user_email_configs ADD COLUMN imap_host VARCHAR(255) NULL AFTER smtp_secure");
        $pdo->exec("ALTER TABLE user_email_configs ADD COLUMN imap_port INT NULL AFTER imap_host");
        $pdo->exec("ALTER TABLE user_email_configs ADD COLUMN imap_secure VARCHAR(10) DEFAULT 'ssl' AFTER imap_port");
        echo "Added IMAP columns to user_email_configs\n";
    }

    // 2. Update emails
    $columnsEmails = $pdo->query("SHOW COLUMNS FROM emails")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('contact_id', $columnsEmails)) {
        $pdo->exec("ALTER TABLE emails ADD COLUMN contact_id INT NULL AFTER user_id");
        $pdo->exec("ALTER TABLE emails ADD COLUMN message_id VARCHAR(255) NULL AFTER subject"); // Unique ID from headers
        echo "Added contact_id and message_id to emails\n";
    }

    echo "Migration Complete\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
