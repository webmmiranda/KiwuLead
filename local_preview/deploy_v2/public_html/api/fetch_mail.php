<?php
// public/api/fetch_mail.php
require_once 'db.php';
require_once 'imap_helper.php';

header('Content-Type: application/json');

$userId = $_GET['user_id'] ?? $_POST['user_id'] ?? null;

if (!$userId) {
    http_response_code(400);
    echo json_encode(['error' => 'User ID required']);
    exit;
}

$pdo = getDB();

try {
    // 1. Get User Config
    $stmt = $pdo->prepare("SELECT * FROM user_email_configs WHERE user_id = :uid");
    $stmt->execute([':uid' => $userId]);
    $config = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$config || empty($config['imap_host'])) {
        throw new Exception("Configuración IMAP no encontrada.");
    }

    // 2. Connect to IMAP
    $inbox = new IMAPClient(
        $config['imap_host'],
        $config['imap_port'] ?: 993,
        $config['smtp_user'], // Usually same as SMTP user
        $config['smtp_pass']  // Usually same as SMTP pass
    );

    if (!$inbox->connect()) {
        throw new Exception("No se pudo conectar al servidor IMAP: " . $inbox->getLastError());
    }

    // 3. Fetch recent emails (last 10)
    $emails = $inbox->fetchRecent(10);
    $count = 0;
    $errors = [];

    foreach ($emails as $email) {
        // Check if exists
        $msgId = $email['message_id'];
        $check = $pdo->prepare("SELECT id FROM emails WHERE message_id = :mid AND user_id = :uid");
        $check->execute([':mid' => $msgId, ':uid' => $userId]);
        
        if ($check->rowCount() == 0) {
            // New Email!
            // Link to Contact
            $fromEmail = extractEmail($email['from']);
            $contactId = null;
            
            // Try enabling contact search
            if (!empty($fromEmail)) {
                 $cStmt = $pdo->prepare("SELECT id FROM contacts WHERE email = :email LIMIT 1");
                 $cStmt->execute([':email' => $fromEmail]);
                 $contactId = $cStmt->fetchColumn();
            }

            // Parse Sender Name
            // Logic: If "Name <email>", extract Name. Else use email.
            $senderName = $email['from'];
            if (preg_match('/^(.*?)\s*</', $email['from'], $m)) {
                $senderName = trim($m[1], " \"'");
            } elseif (preg_match('/^"?(.*?)"?$/', $email['from'], $m)) {
                $senderName = $m[1];
            }

            if (empty($senderName) || $senderName == $fromEmail) {
                $senderName = $fromEmail;
            }

            // Insert
            $stmt = $pdo->prepare("INSERT INTO emails (user_id, contact_id, message_id, to_email, from_email, sender_name, subject, body, preview, folder, is_read, created_at) VALUES (:uid, :cid, :mid, :to, :from, :sname, :sub, :body, :prev, 'inbox', 0, :date)");
            
            try {
                $stmt->execute([
                    ':uid' => $userId,
                    ':cid' => $contactId ?: null,
                    ':mid' => $msgId,
                    ':to' => $config['smtp_user'],
                    ':from' => $fromEmail,
                    ':sname' => $senderName,
                    ':sub' => $email['subject'],
                    ':body' => $email['body'], 
                    ':prev' => substr(strip_tags($email['body']), 0, 100),
                    ':date' => date('Y-m-d H:i:s', $email['timestamp'])
                ]);
                
                // Add Note if Linked
                if ($contactId) {
                    $noteStmt = $pdo->prepare("INSERT INTO contact_history (contact_id, type, channel, content, sender, subject) VALUES (:cid, 'interaction', 'email', :body, :sender, :subj)");
                    $noteStmt->execute([
                        ':cid' => $contactId,
                        ':body' => "Recibido de " . $senderName . " (" . $fromEmail . ")",
                        ':sender' => 'customer',
                        ':subj' => $email['subject']
                    ]);
                }
                $count++;
            } catch (PDOException $e) {
                $errors[] = "DB Error for msg " . $msgId . ": " . $e->getMessage();
            }
        }
    }
    
    $inbox->close();

    echo json_encode(['success' => true, 'synced' => $count, 'total_found' => count($emails), 'errors' => $errors]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
