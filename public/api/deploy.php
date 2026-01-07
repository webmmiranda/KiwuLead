<?php
header('Content-Type: application/json');
require_once 'db.php';
require_once 'middleware.php';
$user = requireAuth();

if ($user->role !== 'MANAGER' && $user->role !== 'ADMIN') {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden: Managers only']);
    exit;
}

// Check for upload
if (!isset($_FILES['update_package'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No se recibió ningún archivo']);
    exit;
}

$file = $_FILES['update_package'];
$ext = pathinfo($file['name'], PATHINFO_EXTENSION);

if (!in_array($ext, ['zip', 'json'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Formato no permitido (.zip o .json solamente)']);
    exit;
}

// Create updates directory if not exists
$targetDir = __DIR__ . '/updates/';
if (!file_exists($targetDir)) {
    mkdir($targetDir, 0755, true);
}

$targetFile = $targetDir . time() . '_' . basename($file['name']);

if (move_uploaded_file($file['tmp_name'], $targetFile)) {
    // Basic Simulation: If it's JSON, we try to read the version
    $version = '1.2.1-stable';
    if ($ext === 'json') {
        $data = json_decode(file_get_contents($targetFile), true);
        if (isset($data['version'])) {
            $version = $data['version'];
        }
    }

    // Optional: Log update in DB
    /*
    $stmt = $pdo->prepare("INSERT INTO system_logs (event, details, created_at) VALUES (?, ?, NOW())");
    $stmt->execute(['SYSTEM_UPDATE', "Actualización subida: " . $file['name'] . " (Versión: $version)"]);
    */

    echo json_encode([
        'success' => true,
        'version' => $version,
        'message' => 'Paquete recibido y validado correctamente.'
    ]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error al mover el archivo al servidor']);
}
