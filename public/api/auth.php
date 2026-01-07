<?php
// public/api/auth.php
require_once 'db.php';
require_once 'jwt_helper.php';

// Enable CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';

    if (!$email || !$password) {
        http_response_code(400);
        echo json_encode(['error' => 'Email and Password required']);
        exit;
    }

    try {
        $pdo = getDB();
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = :email LIMIT 1");
        $stmt->execute([':email' => $email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($password, $user['password_hash'])) {
            // Update Last Login
            $update = $pdo->prepare("UPDATE users SET last_login = NOW() WHERE id = :id");
            $update->execute([':id' => $user['id']]);

            // Remove password from response
            unset($user['password_hash']);

            echo json_encode([
                'success' => true,
                'user' => [
                    'name' => $user['name'],
                    'role' => strtoupper($user['role'] == 'Sales' ? 'SALES_REP' : ($user['role'] == 'Support' ? 'SUPPORT' : 'MANAGER')), // Map to React Types
                    'avatar' => $user['avatar_initials'] ?? substr($user['name'], 0, 2),
                    'id' => $user['id']
                ],
                'token' => generateJWT($user['id'], $user['role'])
            ]);
        } else {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid credentials']);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
}
?>