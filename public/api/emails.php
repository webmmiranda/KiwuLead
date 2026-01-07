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
        $stmt = $pdo->prepare("SELECT * FROM emails WHERE user_id = :uid AND is_archived = 1 ORDER BY created_at DESC");
    } else {
        // For Sent folder, we want items where folder='sent' and not archived
        // For Inbox, we might not have real data yet unless mapped, but logic holds
        $stmt = $pdo->prepare("SELECT * FROM emails WHERE user_id = :uid AND folder = :folder AND is_archived = 0 ORDER BY created_at DESC");
        $stmt->bindValue(':folder', $folder);
    }

    $stmt->bindValue(':uid', $userId);
    $stmt->execute();
    $emails = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format for frontend
    $formatted = array_map(function ($e) {
        $from = $e['from_email'] ?: 'Desconocido';
        $to = $e['to_email'];
        // Preview logic
        $preview = $e['preview'] ?: substr(strip_tags($e['body']), 0, 50) . '...';

        return [
            'id' => $e['id'],
            'from' => $from,
            'to' => $to,
            'subject' => $e['subject'],
            'preview' => $preview,
            'body' => $e['body'],
            'date' => date('d M H:i', strtotime($e['created_at'])),
            'folder' => $e['folder'],
            'read' => (bool) $e['is_read'],
            'archived' => (bool) $e['is_archived'],
            'attachments' => $e['attachments'] ? json_decode($e['attachments']) : []
        ];
    }, $emails);

    echo json_encode(['success' => true, 'emails' => $formatted]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>