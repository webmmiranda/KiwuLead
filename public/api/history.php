<?php
// public/api/history.php
require_once 'db.php';
require_once 'middleware.php';
requireAuth();

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDB();

switch ($method) {
    case 'GET':
        handleGet($pdo);
        break;
    case 'POST':
        handleCreate($pdo);
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method Not Allowed']);
        break;
}

function handleGet($pdo)
{
    $contactId = $_GET['contact_id'] ?? null;

    try {
        if ($contactId) {
            $stmt = $pdo->prepare("
                SELECT * FROM contact_history 
                WHERE contact_id = :contact_id 
                ORDER BY created_at ASC
            ");
            $stmt->execute([':contact_id' => $contactId]);
        } else {
            $stmt = $pdo->query("SELECT * FROM contact_history ORDER BY created_at DESC LIMIT 100");
        }

        $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $mappedHistory = array_map(function ($h) {
            return [
                'id' => (string) $h['id'],
                'sender' => $h['sender'],
                'type' => $h['type'],
                'channel' => $h['channel'],
                'content' => $h['content'],
                'subject' => $h['subject'],
                'timestamp' => $h['created_at']
            ];
        }, $history);

        echo json_encode($mappedHistory);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function handleCreate($pdo)
{
    $data = json_decode(file_get_contents('php://input'), true);

    try {
        $sql = "INSERT INTO contact_history (contact_id, sender, type, channel, content, subject) 
                VALUES (:contact_id, :sender, :type, :channel, :content, :subject)";
        $stmt = $pdo->prepare($sql);

        $stmt->execute([
            ':contact_id' => $data['contactId'],
            ':sender' => $data['sender'] ?? 'agent',
            ':type' => $data['type'] ?? 'message',
            ':channel' => $data['channel'] ?? 'internal',
            ':content' => $data['content'],
            ':subject' => $data['subject'] ?? null
        ]);

        $id = $pdo->lastInsertId();
        echo json_encode(['success' => true, 'id' => $id, 'message' => 'History entry created']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>