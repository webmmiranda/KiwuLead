<?php
// public/api/emails.php
require_once 'db.php';
header('Content-Type: application/json');

$userId = $_GET['user_id'] ?? $_POST['user_id'] ?? null;
$folder = $_GET['folder'] ?? 'inbox'; // inbox, sent, drafts, archived

if (!$userId) {
    http_response_code(400);
    echo json_encode(['error' => 'User ID required']);
    exit;
}

$pdo = getDB();

try {
    // If folder is archived, we look for is_archived = 1, otherwise 0 and specific folder
    if ($folder === 'archived') {
        $sql = "SELECT e.*, c.name as contact_name 
                FROM emails e 
                LEFT JOIN contacts c ON e.contact_id = c.id 
                WHERE e.user_id = :uid AND e.is_archived = 1 
                ORDER BY e.created_at DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':uid', $userId);
    } else {
        $sql = "SELECT e.*, c.name as contact_name 
                FROM emails e 
                LEFT JOIN contacts c ON e.contact_id = c.id 
                WHERE e.user_id = :uid AND e.folder = :folder AND e.is_archived = 0 
                ORDER BY e.created_at DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':uid', $userId);
        $stmt->bindValue(':folder', $folder);
    }

    $stmt->execute();
    $emails = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format for frontend
    $formatted = array_map(function ($e) {
        $fromEmail = $e['from_email'];
        // Priority: Contact Name > Persisted Sender Name > Extracted from Header > Email
        $senderName = $e['contact_name'] 
            ? $e['contact_name'] 
            : ($e['sender_name'] ?: trim(explode('<', $fromEmail)[0] ?: $fromEmail));

        return [
            'id' => $e['id'],
            'from' => $fromEmail,
            'sender_name' => $senderName,
            'to' => $e['to_email'],
            'subject' => $e['subject'],
            'preview' => $e['preview'] ?: substr(strip_tags($e['body']), 0, 50) . '...',
            'body' => $e['body'],
            'date' => date('d M H:i', strtotime($e['created_at'])),
            'folder' => $e['folder'],
            'read' => (bool) $e['is_read'],
            'archived' => (bool) $e['is_archived'],
            'attachments' => $e['attachments'] ? json_decode($e['attachments']) : [],
            'readAt' => $e['read_at'],
            'isReadByRecipient' => (bool) $e['is_read_by_recipient'],
            'clickCount' => (int) $e['click_count']
        ];
    }, $emails);

    echo json_encode(['success' => true, 'emails' => $formatted]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>