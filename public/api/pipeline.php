<?php
// public/api/pipeline.php
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
        // Fetch all stages, ordered by index
        $stmt = $pdo->query("SELECT * FROM pipeline_stages ORDER BY order_index ASC");
        $stages = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $mapped = array_map(function ($s) {
            return [
                'id' => (string) $s['id'],
                'name' => $s['name'],
                'keyName' => $s['key_name'],
                'color' => $s['color'],
                'orderIndex' => (int) $s['order_index'],
                'probability' => (int) $s['probability'], // Added probability
                'isActive' => (bool) $s['is_active']
            ];
        }, $stages);

        echo json_encode($mapped);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function handleCreate($pdo)
{
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['name'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Name is required']);
        return;
    }

    try {
        // Generate key_name from name if not provided (slugify)
        $keyName = $data['keyName'] ?? preg_replace('/[^a-zA-Z0-9]/', '', ucwords($data['name']));
        
        // Get max order index
        $stmt = $pdo->query("SELECT MAX(order_index) FROM pipeline_stages");
        $maxOrder = $stmt->fetchColumn();
        $orderIndex = $maxOrder !== false ? $maxOrder + 1 : 0;

        $sql = "INSERT INTO pipeline_stages (name, key_name, color, order_index, probability, is_active) 
                VALUES (:name, :key_name, :color, :order_index, :probability, 1)";
        $stmt = $pdo->prepare($sql);
        
        $stmt->execute([
            ':name' => $data['name'],
            ':key_name' => $keyName . '_' . time(), // Ensure uniqueness if duplicate name
            ':color' => $data['color'] ?? 'border-gray-500',
            ':order_index' => $orderIndex,
            ':probability' => $data['probability'] ?? 0 // Added probability
        ]);

        echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function handleUpdate($pdo)
{
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Check if it's a reorder operation (array of IDs)
    if (isset($data['order'])) {
        try {
            $pdo->beginTransaction();
            $sql = "UPDATE pipeline_stages SET order_index = :index WHERE id = :id";
            $stmt = $pdo->prepare($sql);
            
            foreach ($data['order'] as $index => $id) {
                $stmt->execute([':index' => $index, ':id' => $id]);
            }
            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'Reordered successfully']);
            return;
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
            return;
        }
    }

    // Normal update
    $id = $_GET['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID required']);
        return;
    }

    try {
        $fields = [];
        $params = [':id' => $id];

        if (isset($data['name'])) {
            $fields[] = "name = :name";
            $params[':name'] = $data['name'];
        }
        if (isset($data['color'])) {
            $fields[] = "color = :color";
            $params[':color'] = $data['color'];
        }
        if (isset($data['probability'])) { // Added probability
            $fields[] = "probability = :probability";
            $params[':probability'] = $data['probability'];
        }
        if (isset($data['isActive'])) {
            $fields[] = "is_active = :is_active";
            $params[':is_active'] = $data['isActive'] ? 1 : 0;
        }

        if (empty($fields)) {
            echo json_encode(['success' => true, 'message' => 'Nothing to update']);
            return;
        }

        $sql = "UPDATE pipeline_stages SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        echo json_encode(['success' => true, 'message' => 'Stage updated']);
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
        // Check for contacts
        // We need to know the key_name to check contacts.status
        $stmt = $pdo->prepare("SELECT key_name FROM pipeline_stages WHERE id = ?");
        $stmt->execute([$id]);
        $keyName = $stmt->fetchColumn();

        if ($keyName) {
            $check = $pdo->prepare("SELECT COUNT(*) FROM contacts WHERE status = ?");
            $check->execute([$keyName]);
            if ($check->fetchColumn() > 0) {
                http_response_code(400);
                echo json_encode(['error' => 'Cannot delete stage with active contacts. Move them first.']);
                return;
            }
        }

        $stmt = $pdo->prepare("DELETE FROM pipeline_stages WHERE id = :id");
        $stmt->execute([':id' => $id]);
        echo json_encode(['success' => true, 'message' => 'Stage deleted']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>