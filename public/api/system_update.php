<?php
require_once 'db.php';
require_once 'jwt_helper.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// 1. Verify Authentication & Role
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';
$token = str_replace('Bearer ', '', $authHeader);

try {
    $payload = verifyJWT($token);
    if (!$payload || ($payload['role'] !== 'Support' && $payload['role'] !== 'Admin')) {
        throw new Exception('Unauthorized access');
    }
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(['error' => 'Acceso denegado. Solo Soporte puede actualizar el sistema.']);
    exit;
}

$action = $_GET['action'] ?? '';

// --- GITHUB UPDATE LOGIC ---
if ($action === 'check_github') {
    // Check if .git exists
    if (!is_dir(__DIR__ . '/../../.git')) {
        echo json_encode(['success' => false, 'message' => 'No se detectó un repositorio Git activo.']);
        exit;
    }

    // Fix for "safe.directory" issues in some shared hosting envs
    $gitCmd = 'git -C ' . escapeshellarg(realpath(__DIR__ . '/../../'));
    
    // Get current hash
    $currentHash = trim(shell_exec("$gitCmd rev-parse --short HEAD 2>&1"));
    
    // Fetch remote (requires internet and permissions)
    // We append 2>&1 to capture errors
    shell_exec("$gitCmd fetch origin main 2>&1");
    
    // Get remote hash
    $remoteHash = trim(shell_exec("$gitCmd rev-parse --short origin/main 2>&1"));

    // Check if hashes are valid (not error messages)
    if (strlen($currentHash) > 40 || strpos($currentHash, 'fatal') !== false) {
         echo json_encode(['success' => false, 'message' => 'Error Git: ' . $currentHash]);
         exit;
    }

    echo json_encode([
        'success' => true,
        'current_version' => $currentHash,
        'latest_version' => $remoteHash,
        'update_available' => $currentHash !== $remoteHash && !empty($remoteHash),
        'repo' => 'https://github.com/webmmiranda/NexusCRM'
    ]);
    exit;
}

if ($action === 'update_github') {
    if (!is_dir(__DIR__ . '/../../.git')) {
        echo json_encode(['success' => false, 'error' => 'No es un repositorio Git.']);
        exit;
    }

    $gitCmd = 'git -C ' . escapeshellarg(realpath(__DIR__ . '/../../'));

    // Execute Pull
    $output = [];
    $returnVar = 0;
    
    // Force pull from origin main
    $command = "$gitCmd pull origin main 2>&1";
    
    exec($command, $output, $returnVar);

    if ($returnVar === 0) {
        echo json_encode(['success' => true, 'message' => 'Sistema actualizado correctamente.', 'logs' => $output]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Fallo al ejecutar git pull.', 'logs' => $output]);
    }
    exit;
}

// --- ZIP UPDATE LOGIC ---
if ($action === 'upload_zip' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_FILES['update_zip']) || $_FILES['update_zip']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No se recibió el archivo ZIP correctamente.']);
        exit;
    }

    $zipFile = $_FILES['update_zip']['tmp_name'];
    $zip = new ZipArchive;
    $res = $zip->open($zipFile);

    if ($res === TRUE) {
        // Extract to root directory (../../)
        $extractPath = realpath(__DIR__ . '/../../');
        
        try {
            $zip->extractTo($extractPath);
            $zip->close();
            echo json_encode(['success' => true, 'message' => 'Archivos extraídos y actualizados correctamente.']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Error al descomprimir: ' . $e->getMessage()]);
        }
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'No se pudo abrir el archivo ZIP.']);
    }
    exit;
}

echo json_encode(['error' => 'Invalid action']);
