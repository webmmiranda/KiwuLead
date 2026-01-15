<?php
// public/api/tasks.php
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
    case 'PUT':
        handleUpdate($pdo);
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
    try {
        $stmt = $pdo->query("
            SELECT t.*, u.name as assigned_name, c.name as contact_name 
            FROM tasks t 
            LEFT JOIN users u ON t.assigned_to = u.id 
            LEFT JOIN contacts c ON t.related_contact_id = c.id 
            ORDER BY t.due_date ASC, t.created_at DESC
        ");
        $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $mappedTasks = array_map(function ($t) {
            return [
                'id' => (string) $t['id'],
                'title' => $t['title'],
                'type' => $t['type'],
                'dueDate' => $t['due_date'],
                'status' => $t['status'],
                'priority' => $t['priority'],
                'assignedTo' => $t['assigned_name'] ?? 'Unassigned',
                'relatedContactName' => $t['contact_name'] ?? null,
                'relatedContactId' => (string) ($t['related_contact_id'] ?? '')
            ];
        }, $tasks);

        echo json_encode($mappedTasks);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function handleCreate($pdo)
{
    $data = json_decode(file_get_contents('php://input'), true);

    try {
        // Resolve assigned_to (Name -> ID)
        $assignedToId = null;
        if (!empty($data['assignedTo'])) {
            // Try to find by name
            $stmt = $pdo->prepare("SELECT id FROM users WHERE name = :name LIMIT 1");
            $stmt->execute([':name' => $data['assignedTo']]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            $assignedToId = $user ? $user['id'] : null;
            
            // If not found by name, check if it is numeric (direct ID)
            if (!$assignedToId && is_numeric($data['assignedTo'])) {
                 $assignedToId = $data['assignedTo'];
            }
            // If still null, default to first admin or null (optional logic, keeping null for now)
        }

        $sql = "INSERT INTO tasks (title, type, due_date, status, priority, assigned_to, related_contact_id) 
                VALUES (:title, :type, :due_date, :status, :priority, :assigned_to, :related_contact_id)";
        $stmt = $pdo->prepare($sql);

        $stmt->execute([
            ':title' => $data['title'],
            ':type' => $data['type'] ?? 'Task',
            ':due_date' => $data['dueDate'] ?? null,
            ':status' => $data['status'] ?? 'Pending',
            ':priority' => $data['priority'] ?? 'Normal',
            ':assigned_to' => $assignedToId,
            ':related_contact_id' => $data['relatedContactId'] ?? null
        ]);

        $id = $pdo->lastInsertId();
        echo json_encode(['success' => true, 'id' => $id, 'message' => 'Task created']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function handleUpdate($pdo)
{
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $_GET['id'] ?? null;

    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID required']);
        return;
    }

    $fields = [];
    $params = [':id' => $id];
    
    // Map Frontend keys to DB keys
    $mapping = [
        'title' => 'title',
        'type' => 'type',
        'dueDate' => 'due_date',
        'status' => 'status',
        'priority' => 'priority',
        'assignedTo' => 'assigned_to',
        'relatedContactId' => 'related_contact_id'
    ];

    foreach ($data as $key => $val) {
        if (!array_key_exists($key, $mapping)) continue;
        
        $dbKey = $mapping[$key];
        
        // Special handling for assigned_to (Name -> ID)
        if ($dbKey === 'assigned_to') {
            $assignedToId = null;
            if (!empty($val)) {
                $stmt = $pdo->prepare("SELECT id FROM users WHERE name = :name LIMIT 1");
                $stmt->execute([':name' => $val]);
                $user = $stmt->fetch(PDO::FETCH_ASSOC);
                $assignedToId = $user ? $user['id'] : null;
                if (!$assignedToId && is_numeric($val)) $assignedToId = $val;
            }
            $val = $assignedToId;
        }

        $fields[] = "$dbKey = :$dbKey";
        $params[":$dbKey"] = $val;
    }

    if (empty($fields)) {
        echo json_encode(['success' => true, 'message' => 'Nothing to update']);
        return;
    }

    try {
        $sql = "UPDATE tasks SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        echo json_encode(['success' => true, 'message' => 'Task updated']);
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
        $stmt = $pdo->prepare("DELETE FROM tasks WHERE id = :id");
        $stmt->execute([':id' => $id]);
        echo json_encode(['success' => true, 'message' => 'Task deleted']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>