<?php
// public/api/email_actions.php
require_once 'db.php';

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$data = json_decode(file_get_contents('php://input'), true);
$action = $data['action'] ?? '';
$userId = $data['user_id'] ?? null;
$emailId = $data['email_id'] ?? null;

if (!$userId) {
    echo json_encode(['success' => false, 'error' => 'User ID required']);
    exit;
}

$pdo = getDB();

try {
    switch ($action) {
        case 'trash':
            // Move to Trash
            if (!$emailId) throw new Exception("Email ID required");
            $stmt = $pdo->prepare("UPDATE emails SET folder = 'trash' WHERE id = :id AND user_id = :uid");
            $stmt->execute([':id' => $emailId, ':uid' => $userId]);
            echo json_encode(['success' => true, 'message' => 'Moved to trash']);
            break;

        case 'spam':
            // Move to Spam
            if (!$emailId) throw new Exception("Email ID required");
            $stmt = $pdo->prepare("UPDATE emails SET folder = 'spam' WHERE id = :id AND user_id = :uid");
            $stmt->execute([':id' => $emailId, ':uid' => $userId]);
            echo json_encode(['success' => true, 'message' => 'Moved to spam']);
            break;

        case 'delete_forever':
            // Hard Delete
            if (!$emailId) throw new Exception("Email ID required");
            $stmt = $pdo->prepare("DELETE FROM emails WHERE id = :id AND user_id = :uid");
            $stmt->execute([':id' => $emailId, ':uid' => $userId]);
            echo json_encode(['success' => true, 'message' => 'Deleted permanently']);
            break;

        case 'restore':
            // Move back to Inbox
            if (!$emailId) throw new Exception("Email ID required");
            $stmt = $pdo->prepare("UPDATE emails SET folder = 'inbox' WHERE id = :id AND user_id = :uid");
            $stmt->execute([':id' => $emailId, ':uid' => $userId]);
            echo json_encode(['success' => true, 'message' => 'Restored to inbox']);
            break;

        case 'archive':
            // Move to Archived
            if (!$emailId) throw new Exception("Email ID required");
            $stmt = $pdo->prepare("UPDATE emails SET is_archived = 1 WHERE id = :id AND user_id = :uid");
            $stmt->execute([':id' => $emailId, ':uid' => $userId]);
            echo json_encode(['success' => true, 'message' => 'Archived']);
            break;

        case 'unread':
            // Mark as Unread
            if (!$emailId) throw new Exception("Email ID required");
            $stmt = $pdo->prepare("UPDATE emails SET is_read = 0 WHERE id = :id AND user_id = :uid");
            $stmt->execute([':id' => $emailId, ':uid' => $userId]);
            echo json_encode(['success' => true, 'message' => 'Marked as unread']);
            break;

        case 'mark_read':
            // Mark as Read
            if (!$emailId) throw new Exception("Email ID required");
            $stmt = $pdo->prepare("UPDATE emails SET is_read = 1 WHERE id = :id AND user_id = :uid");
            $stmt->execute([':id' => $emailId, ':uid' => $userId]);
            echo json_encode(['success' => true, 'message' => 'Marked as read']);
            break;

        case 'save_draft':
            // Save Draft
            $to = $data['to'] ?? '';
            $subject = $data['subject'] ?? '';
            $body = $data['body'] ?? '';
            
            // If emailId exists, update it. Else create new.
            if ($emailId) {
                $stmt = $pdo->prepare("UPDATE emails SET to_email = :to, subject = :sub, body = :body, preview = :prev, updated_at = NOW() WHERE id = :id AND user_id = :uid");
                $stmt->execute([
                    ':to' => $to,
                    ':sub' => $subject,
                    ':body' => $body,
                    ':prev' => substr(strip_tags($body), 0, 100),
                    ':id' => $emailId,
                    ':uid' => $userId
                ]);
                $newId = $emailId;
            } else {
                $stmt = $pdo->prepare("INSERT INTO emails (user_id, to_email, from_email, sender_name, subject, body, preview, folder, is_read, created_at) VALUES (:uid, :to, :from, :sname, :sub, :body, :prev, 'drafts', 1, NOW())");
                // Get user email
                $uStmt = $pdo->prepare("SELECT smtp_user, from_name FROM user_email_configs WHERE user_id = :uid");
                $uStmt->execute([':uid' => $userId]);
                $uConfig = $uStmt->fetch(PDO::FETCH_ASSOC);
                $fromEmail = $uConfig['smtp_user'] ?? '';
                $senderName = $uConfig['from_name'] ?? 'Me';
                
                $stmt->execute([
                    ':uid' => $userId,
                    ':to' => $to,
                    ':from' => $fromEmail,
                    ':sname' => $senderName,
                    ':sub' => $subject,
                    ':body' => $body,
                    ':prev' => substr(strip_tags($body), 0, 100)
                ]);
                $newId = $pdo->lastInsertId();
            }
            echo json_encode(['success' => true, 'id' => $newId, 'message' => 'Draft saved']);
            break;

        default:
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
