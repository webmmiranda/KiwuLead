<?php
// public/api/process_scheduler.php
// This script should be run by a Cron Job every minute.
// * * * * * php /path/to/public/api/process_scheduler.php

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/mail_helper.php';

header('Content-Type: application/json');

try {
    $pdo = getDB();
    
    // 1. Find scheduled emails that are due
    $stmt = $pdo->prepare("
        SELECT * FROM emails 
        WHERE status = 'scheduled' 
        AND scheduled_at <= NOW() 
        LIMIT 20
    ");
    $stmt->execute();
    $emails = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $processed = 0;
    $errors = 0;
    
    foreach ($emails as $email) {
        // Get User Config (SMTP credentials)
        $uStmt = $pdo->prepare("SELECT * FROM user_email_configs WHERE user_id = ?");
        $uStmt->execute([$email['user_id']]);
        $config = $uStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$config) {
            // No config, fail it
            $pdo->prepare("UPDATE emails SET status = 'failed' WHERE id = ?")->execute([$email['id']]);
            $errors++;
            continue;
        }
        
        // Decode attachments
        $attachments = $email['attachments'] ? json_decode($email['attachments'], true) : [];
        if (!is_array($attachments)) $attachments = [];
        
        // Send
        $result = sendSMTPMultipart(
            $config, 
            $email['to_email'], 
            $email['subject'], 
            $email['body'], 
            $attachments
        );
        
        if ($result === true) {
            // Success
            $pdo->prepare("UPDATE emails SET status = 'sent', folder = 'sent' WHERE id = ?")->execute([$email['id']]);
            
            // Also ensure it is in Contact History
            if ($email['contact_id']) {
                 // Check if already exists (it shouldn't if we didn't insert it at scheduling time, or maybe we wait until sent)
                 // send_mail.php does NOT insert into contact_history for scheduled emails yet.
                 // So we do it here.
                 $noteStmt = $pdo->prepare("INSERT INTO contact_history (contact_id, type, channel, content, sender, subject, created_at) VALUES (:cid, 'interaction', 'email', :body, :sender, :subj, NOW())");
                 $noteStmt->execute([
                     ':cid' => $email['contact_id'],
                     ':body' => "Enviado a " . $email['to_email'],
                     ':sender' => 'Me',
                     ':subj' => $email['subject']
                 ]);
            }
            
            // Sync to IMAP Sentinel (Optional but recommended)
            try {
                // If we had the IMAP helper available here we would use it.
                // For now, we skip IMAP sync to avoid complexity/timeouts in cron.
            } catch(Exception $e) {}
            
            $processed++;
        } else {
            // Fail
            $pdo->prepare("UPDATE emails SET status = 'failed' WHERE id = ?")->execute([$email['id']]);
            error_log("Scheduler Error for Email {$email['id']}: $result");
            $errors++;
        }
    }
    
    echo json_encode(['success' => true, 'processed' => $processed, 'errors' => $errors]);
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
