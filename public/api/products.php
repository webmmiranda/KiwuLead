<?php
// public/api/products.php
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
        $stmt = $pdo->query("SELECT * FROM products WHERE status = 'Active' ORDER BY name ASC");
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $mappedProducts = array_map(function ($p) {
            return [
                'id' => (string) $p['id'],
                'name' => $p['name'],
                'description' => $p['description'],
                'price' => (float) $p['price'],
                'currency' => $p['currency'],
                'category' => $p['category'],
                'imageUrl' => $p['image_url'],
                'status' => $p['status']
            ];
        }, $products);

        echo json_encode($mappedProducts);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function handleCreate($pdo)
{
    $data = json_decode(file_get_contents('php://input'), true);

    try {
        $sql = "INSERT INTO products (name, description, price, currency, category, image_url, status) 
                VALUES (:name, :description, :price, :currency, :category, :image_url, :status)";
        $stmt = $pdo->prepare($sql);

        $stmt->execute([
            ':name' => $data['name'],
            ':description' => $data['description'] ?? '',
            ':price' => $data['price'] ?? 0,
            ':currency' => $data['currency'] ?? 'USD',
            ':category' => $data['category'] ?? 'General',
            ':image_url' => $data['imageUrl'] ?? null,
            ':status' => $data['status'] ?? 'Active'
        ]);

        $id = $pdo->lastInsertId();
        echo json_encode(['success' => true, 'id' => $id, 'message' => 'Product created']);
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
    $allowed = ['name', 'description', 'price', 'currency', 'category', 'image_url', 'status'];

    foreach ($data as $key => $val) {
        $dbKey = $key === 'imageUrl' ? 'image_url' : $key;
        if (in_array($dbKey, $allowed)) {
            $fields[] = "$dbKey = :$dbKey";
            $params[":$dbKey"] = $val;
        }
    }

    if (empty($fields)) {
        echo json_encode(['success' => true, 'message' => 'Nothing to update']);
        return;
    }

    try {
        $sql = "UPDATE products SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        echo json_encode(['success' => true, 'message' => 'Product updated']);
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
        // Soft delete
        $stmt = $pdo->prepare("UPDATE products SET status = 'Archived' WHERE id = :id");
        $stmt->execute([':id' => $id]);
        echo json_encode(['success' => true, 'message' => 'Product archived']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>