<?php
// public/api/notes.php
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
    case 'DELETE':
        handleDelete($pdo);
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
                SELECT n.*, u.name as author_name 
                FROM contact_notes n 
                LEFT JOIN users u ON n.author_id = u.id 
                WHERE n.contact_id = :contact_id 
                ORDER BY n.created_at DESC
            ");
            $stmt->execute([':contact_id' => $contactId]);
        } else {
            $stmt = $pdo->query("
                SELECT n.*, u.name as author_name 
                FROM contact_notes n 
                LEFT JOIN users u ON n.author_id = u.id 
                ORDER BY n.created_at DESC
            ");
        }

        $notes = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $mappedNotes = array_map(function ($n) {
            return [
                'id' => (string) $n['id'],
                'content' => $n['content'],
                'author' => $n['author_name'] ?? 'Unknown',
                'createdAt' => $n['created_at']
            ];
        }, $notes);

        echo json_encode($mappedNotes);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function handleCreate($pdo)
{
    $data = json_decode(file_get_contents('php://input'), true);

    try {
        $sql = "INSERT INTO contact_notes (contact_id, author_id, content) 
                VALUES (:contact_id, :author_id, :content)";
        $stmt = $pdo->prepare($sql);

        $stmt->execute([
            ':contact_id' => $data['contactId'],
            ':author_id' => $data['authorId'] ?? 1, // Default to admin
            ':content' => $data['content']
        ]);

        $id = $pdo->lastInsertId();
        echo json_encode(['success' => true, 'id' => $id, 'message' => 'Note created']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function handleDelete($pdo)
{
    $id = $_GET['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID required']);
        return;
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM contact_notes WHERE id = :id");
        $stmt->execute([':id' => $id]);
        echo json_encode(['success' => true, 'message' => 'Note deleted']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>