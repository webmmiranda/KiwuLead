<?php
// public/track/open.php
require_once '../api/db.php';

// 1. Get Params
$emailId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($emailId > 0) {
    try {
        $pdo = getDB();
        
        // 2. Log Event
        // Check if we should log (maybe avoid duplicate opens from same IP in short time?)
        // For simplicity, just log everything for now.
        
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
        
        $stmt = $pdo->prepare("INSERT INTO email_events (email_id, type, ip_address, user_agent) VALUES (:eid, 'open', :ip, :ua)");
        $stmt->execute([
            ':eid' => $emailId,
            ':ip' => $ip,
            ':ua' => $ua // Limit length? TEXT is fine.
        ]);
        
        // Update emails table read_at time and increment event count if needed
        $pdo->prepare("UPDATE emails SET read_at = NOW(), is_read_by_recipient = 1 WHERE id = ?")->execute([$emailId]);

    } catch (Exception $e) {
        // Silent fail, don't break the image
        error_log("Tracking Error: " . $e->getMessage());
    }
}

// 3. Serve Image
header('Content-Type: image/png');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// 1x1 Transparent PNG
echo base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
?>
