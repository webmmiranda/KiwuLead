<?php
// public/api/users.php
require_once 'db.php';
require_once 'middleware.php';
requireAuth();

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDB();

switch ($method) {
    case 'GET':
        handleList($pdo);
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

function handleList($pdo)
{
    try {
        $stmt = $pdo->query("SELECT id, name, email, role, status, avatar_initials, last_login FROM users ORDER BY name ASC");
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Map to frontend types
        $mappedUsers = array_map(function ($u) {
            return [
                'id' => (string) $u['id'],
                'name' => $u['name'],
                'email' => $u['email'],
                'role' => $u['role'],
                'status' => $u['status'],
                'lastLogin' => $u['last_login'] ?? 'Nunca',
                'avatar' => $u['avatar_initials'] ?? substr($u['name'], 0, 2)
            ];
        }, $users);

        echo json_encode($mappedUsers);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function handleCreate($pdo)
{
    // Get current user from token
    $currentUser = requireAuth();
    $currentRole = $currentUser->role ?? '';

    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['email']) || empty($data['name']) || empty($data['password'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Name, email and password are required']);
        return;
    }

    $newRole = $data['role'] ?? 'Sales';

    // 1. Sales cannot create users
    if ($currentRole === 'Sales') {
        http_response_code(403);
        echo json_encode(['error' => 'Acceso Denegado: Los vendedores no pueden crear usuarios.']);
        return;
    }

    // 2. Managers can only create Sales reps
    if ($currentRole === 'Manager' && $newRole !== 'Sales') {
        http_response_code(403);
        echo json_encode(['error' => 'Acceso Denegado: Los gerentes solo pueden crear Vendedores.']);
        return;
    }

    try {
        $passwordHash = password_hash($data['password'], PASSWORD_BCRYPT);
        $avatarInitials = $data['avatar'] ?? substr($data['name'], 0, 2);

        $sql = "INSERT INTO users (name, email, password_hash, role, status, avatar_initials, created_at) VALUES (:name, :email, :password, :role, :status, :avatar, NOW())";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':name' => $data['name'],
            ':email' => $data['email'],
            ':password' => $passwordHash,
            ':role' => $newRole,
            ':status' => $data['status'] ?? 'Active',
            ':avatar' => $avatarInitials
        ]);

        $newUserId = $pdo->lastInsertId();

        // --- SEND WELCOME EMAIL ---
        try {
            require_once 'template_helper.php';
            require_once 'mail_helper.php';

            $frontendUrl = (isset($_SERVER['HTTPS']) ? "https" : "http") . "://$_SERVER[HTTP_HOST]";
            
            $tplHelper = new TemplateHelper($pdo);
            $emailData = [
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'], // We have the raw password here
                'url' => $frontendUrl . '/login'
            ];

            $renderResult = $tplHelper->render('Welcome User', $emailData);

            // Get System Email Config (User ID 1)
            $stmtConfig = $pdo->prepare("SELECT * FROM user_email_configs WHERE user_id = 1");
            $stmtConfig->execute();
            $config = $stmtConfig->fetch(PDO::FETCH_ASSOC);

            if ($config) {
                sendSMTPMultipart(
                    $config,
                    $data['email'],
                    $renderResult['subject'],
                    $renderResult['html'],
                    []
                );
            }
        } catch (Exception $mailError) {
            error_log("Welcome Email Error: " . $mailError->getMessage());
        }
        // --------------------------

        echo json_encode(['success' => true, 'id' => $newUserId, 'message' => 'User created']);
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
    $allowed = ['name', 'email', 'role', 'status', 'avatar_initials'];

    foreach ($data as $key => $val) {
        if ($key === 'avatar')
            $key = 'avatar_initials'; // Mapping frontend 'avatar' to DB 'avatar_initials'

        if (in_array($key, $allowed)) {
            $fields[] = "$key = :$key";
            $params[":$key"] = $val;
        }
    }

    // Handle password update separately if provided
    if (!empty($data['password'])) {
        $fields[] = "password_hash = :password";
        $params[':password'] = password_hash($data['password'], PASSWORD_BCRYPT);
    }

    if (empty($fields)) {
        echo json_encode(['success' => true, 'message' => 'Nothing to update']);
        return;
    }

    try {
        $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        echo json_encode(['success' => true, 'message' => 'User updated']);
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

    // Prevent deleting the main admin for safety
    if ($id == 1) {
        http_response_code(403);
        echo json_encode(['error' => 'Cannot delete the primary administrator']);
        return;
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM users WHERE id = :id");
        $stmt->execute([':id' => $id]);
        echo json_encode(['success' => true, 'message' => 'User deleted']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>