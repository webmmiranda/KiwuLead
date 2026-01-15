<?php
// public/track/click.php
require_once '../api/db.php';

// 1. Get Params
$emailId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$url = isset($_GET['url']) ? $_GET['url'] : '';

if (empty($url)) {
    // Fallback if no URL
    die('Invalid Link');
}

// Decode URL if it was encoded (it should be)
// The URL in query param might be urlencoded.
// $_GET automatically decodes one layer. 
// If we encoded it via urlencode() in PHP, it should be fine.

if ($emailId > 0) {
    try {
        $pdo = getDB();
        
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
        
        // 2. Log "click" Event
        $stmt = $pdo->prepare("INSERT INTO email_events (email_id, type, ip_address, user_agent, created_at) VALUES (:eid, 'click', :ip, :ua, NOW())");
        $stmt->execute([
            ':eid' => $emailId,
            ':ip' => $ip,
            ':ua' => $ua
        ]);
        
        // Also mark as read if not already (clicking implies opening)
        $pdo->prepare("UPDATE emails SET click_count = click_count + 1, read_at = NOW(), is_read_by_recipient = 1 WHERE id = ?")->execute([$emailId]);

    } catch (Exception $e) {
        error_log("Click Tracking Error: " . $e->getMessage());
    }
}

// 3. Redirect User
header("Location: " . $url);
exit;
?>
