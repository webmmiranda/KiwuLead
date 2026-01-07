<?php
// public/api/appointments.php
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
        $contactId = $_GET['contact_id'] ?? null;
        $userId = $_GET['user_id'] ?? null;
        
        $sql = "
            SELECT a.*, u.name as user_name, c.name as contact_name, c.company as contact_company
            FROM appointments a 
            LEFT JOIN users u ON a.user_id = u.id 
            LEFT JOIN contacts c ON a.contact_id = c.id 
            WHERE 1=1
        ";
        
        $params = [];
        
        if ($contactId) {
            $sql .= " AND a.contact_id = :contact_id";
            $params[':contact_id'] = $contactId;
        }
        
        if ($userId) {
            $sql .= " AND a.user_id = :user_id";
            $params[':user_id'] = $userId;
        }
        
        $sql .= " ORDER BY a.start_time ASC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $mapped = array_map(function ($a) {
            return [
                'id' => (string) $a['id'],
                'title' => $a['title'],
                'start' => $a['start_time'],
                'end' => $a['end_time'],
                'location' => $a['location'],
                'description' => $a['description'],
                'contactId' => $a['contact_id'],
                'contactName' => $a['contact_name'],
                'contactCompany' => $a['contact_company'],
                'userId' => (string) $a['user_id'],
                'userName' => $a['user_name']
            ];
        }, $appointments);

        echo json_encode($mapped);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function handleCreate($pdo)
{
    $data = json_decode(file_get_contents('php://input'), true);

    try {
        // Resolve user_id if name provided
        $userId = null;
        if (!empty($data['assignedTo'])) {
             // If passing ID directly
             if (is_numeric($data['assignedTo'])) {
                 $userId = $data['assignedTo'];
             } else {
                 // If passing Name
                 $stmt = $pdo->prepare("SELECT id FROM users WHERE name = :name LIMIT 1");
                 $stmt->execute([':name' => $data['assignedTo']]);
                 $user = $stmt->fetch(PDO::FETCH_ASSOC);
                 $userId = $user ? $user['id'] : null;
             }
        }

        $sql = "INSERT INTO appointments (title, contact_id, user_id, start_time, end_time, location, description) 
                VALUES (:title, :contact_id, :user_id, :start_time, :end_time, :location, :description)";
        $stmt = $pdo->prepare($sql);

        $stmt->execute([
            ':title' => $data['title'],
            ':contact_id' => $data['contactId'] ?? null,
            ':user_id' => $userId,
            ':start_time' => date('Y-m-d H:i:s', strtotime($data['start'])),
            ':end_time' => date('Y-m-d H:i:s', strtotime($data['end'])),
            ':location' => $data['location'] ?? '',
            ':description' => $data['description'] ?? ''
        ]);

        $id = $pdo->lastInsertId();

        // 2. Create Notification for the assigned user
        if ($userId) {
            $stmt = $pdo->prepare("INSERT INTO notifications (user_id, title, message, type, link_to, is_read, created_at) VALUES (:uid, :title, :msg, 'info', :link, 0, NOW())");
            $stmt->execute([
                ':uid' => $userId,
                ':title' => '📅 Nueva Cita Asignada',
                ':msg' => "Se te ha asignado: " . $data['title'] . " para el " . date('d/m H:i', strtotime($data['start'])),
                ':link' => $data['contactId'] ?? ''
            ]);
        }

        echo json_encode(['success' => true, 'id' => $id, 'message' => 'Appointment created']);
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
    
    $mapping = [
        'title' => 'title',
        'contactId' => 'contact_id',
        'start' => 'start_time',
        'end' => 'end_time',
        'location' => 'location',
        'description' => 'description'
    ];

    foreach ($data as $key => $val) {
        if (!array_key_exists($key, $mapping)) continue;
        
        $dbKey = $mapping[$key];
        $fields[] = "$dbKey = :$dbKey";
        
        if ($key === 'start' || $key === 'end') {
            $params[":$dbKey"] = date('Y-m-d H:i:s', strtotime($val));
        } else {
            $params[":$dbKey"] = $val;
        }
    }

    // Handle assignedTo special case
    if (isset($data['assignedTo'])) {
        $userId = null;
        if (is_numeric($data['assignedTo'])) {
            $userId = $data['assignedTo'];
        } else {
            $stmt = $pdo->prepare("SELECT id FROM users WHERE name = :name LIMIT 1");
            $stmt->execute([':name' => $data['assignedTo']]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            $userId = $user ? $user['id'] : null;
        }
        $fields[] = "user_id = :user_id";
        $params[':user_id'] = $userId;
    }

    if (empty($fields)) {
        echo json_encode(['success' => true, 'message' => 'Nothing to update']);
        return;
    }

    try {
        $sql = "UPDATE appointments SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        echo json_encode(['success' => true, 'message' => 'Appointment updated']);
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
        $stmt = $pdo->prepare("DELETE FROM appointments WHERE id = :id");
        $stmt->execute([':id' => $id]);
        echo json_encode(['success' => true, 'message' => 'Appointment deleted']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>