<?php
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$token = $data['token'] ?? '';
$password = $data['password'] ?? '';

if (empty($token) || empty($password)) {
    http_response_code(400);
    echo json_encode(['error' => 'Token and password are required']);
    exit;
}

try {
    $conn = getDB();
    
    // Validate token
    $stmt = $conn->prepare("SELECT email FROM password_resets WHERE token = ? AND expires_at > NOW()");
    $stmt->execute([$token]);
    $resetRequest = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$resetRequest) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid or expired token']);
        exit;
    }
    
    $email = $resetRequest['email'];
    
    // Hash new password
    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    
    // Update user password
    $stmt = $conn->prepare("UPDATE users SET password_hash = ? WHERE email = ?");
    $stmt->execute([$passwordHash, $email]);
    
    // Delete token (and any other tokens for this email to be safe)
    $stmt = $conn->prepare("DELETE FROM password_resets WHERE email = ?");
    $stmt->execute([$email]);
    
    echo json_encode(['success' => true, 'message' => 'Password has been reset successfully']);

} catch(Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
