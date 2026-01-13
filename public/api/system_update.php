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
if (empty($authHeader) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
}

$token = str_replace('Bearer ', '', $authHeader);

// Fallback: Check GET/POST if header is missing
if (empty($token)) {
    $token = $_REQUEST['token'] ?? '';
}

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

// --- HELPER FUNCTIONS ---
function backupSensitiveFiles() {
    $files = [
        'db.php',
        '../.env' // Just in case
    ];
    $backups = [];
    foreach ($files as $file) {
        $path = __DIR__ . '/' . $file;
        if (file_exists($path)) {
            $backupPath = $path . '.update_bak';
            if (copy($path, $backupPath)) {
                $backups[$file] = $backupPath;
            }
        }
    }
    return $backups;
}

function restoreSensitiveFiles($backups) {
    $restored = [];
    foreach ($backups as $file => $backupPath) {
        $destPath = __DIR__ . '/' . $file;
        // Restore only if backup exists
        if (file_exists($backupPath)) {
            // Overwrite whatever was put there by update
            if (copy($backupPath, $destPath)) {
                $restored[] = $file;
                unlink($backupPath); // Delete backup after restore
            }
        }
    }
    return $restored;
}

function cleanupInstallFiles() {
    $installDir = realpath(__DIR__ . '/../install');
    if ($installDir && is_dir($installDir)) {
        // Recursive delete
        $it = new RecursiveDirectoryIterator($installDir, RecursiveDirectoryIterator::SKIP_DOTS);
        $files = new RecursiveIteratorIterator($it, RecursiveIteratorIterator::CHILD_FIRST);
        foreach($files as $file) {
            if ($file->isDir()){
                rmdir($file->getRealPath());
            } else {
                unlink($file->getRealPath());
            }
        }
        rmdir($installDir);
    }
}

// --- GITHUB UPDATE LOGIC ---
if ($action === 'check_github') {
    $localVersion = '1.0.0';
    $localCommit = '';
    $isGitRepo = is_dir(__DIR__ . '/../../.git');

    // 1. Try to get local version
    if ($isGitRepo) {
        $gitCmd = 'git -C ' . escapeshellarg(realpath(__DIR__ . '/../../'));
        $localCommit = trim(shell_exec("$gitCmd rev-parse --short HEAD 2>&1"));
        $localVersion = $localCommit;
    } elseif (file_exists(__DIR__ . '/../version.json')) {
        $verData = json_decode(file_get_contents(__DIR__ . '/../version.json'), true);
        $localVersion = $verData['version'] ?? '1.0.0';
        $localCommit = $verData['commit'] ?? '';
    }

    // 2. Try to get remote version
    $remoteCommit = '';
    $errorMsg = '';

    if ($isGitRepo) {
        // Use Git CLI
        $gitCmd = 'git -C ' . escapeshellarg(realpath(__DIR__ . '/../../'));
        shell_exec("$gitCmd fetch origin main 2>&1");
        $remoteCommit = trim(shell_exec("$gitCmd rev-parse --short origin/main 2>&1"));
    }
    
    // If Git failed or not a repo, try GitHub API (Public only without token)
    if (empty($remoteCommit) || strpos($remoteCommit, 'fatal') !== false) {
        $opts = [
            'http' => [
                'method' => 'GET',
                'header' => [
                    'User-Agent: NexusCRM-Updater'
                ]
            ]
        ];
        $context = stream_context_create($opts);
        // Using NexusCRM repo
        $apiUrl = 'https://api.github.com/repos/webmmiranda/NexusCRM/commits/main';
        $apiResponse = @file_get_contents($apiUrl, false, $context);
        
        if ($apiResponse) {
            $data = json_decode($apiResponse, true);
            $remoteCommit = substr($data['sha'], 0, 7);
        } else {
            $errorMsg = 'No se pudo conectar con GitHub API ni Git CLI.';
        }
    }

    $updateAvailable = ($localCommit !== $remoteCommit && !empty($remoteCommit) && !empty($localCommit));

    echo json_encode([
        'success' => true,
        'current_version' => $localVersion . ($localCommit ? " ($localCommit)" : ""),
        'latest_version' => $remoteCommit ?: 'Desconocida',
        'update_available' => $updateAvailable,
        'repo' => 'https://github.com/webmmiranda/NexusCRM',
        'message' => $errorMsg
    ]);
    exit;
}

if ($action === 'update_github') {
    if (!is_dir(__DIR__ . '/../../.git')) {
        echo json_encode(['success' => false, 'error' => 'No es un repositorio Git. Por favor use la actualización manual por ZIP.']);
        exit;
    }

    // 1. Backup Sensitive Files
    $backups = backupSensitiveFiles();

    $gitCmd = 'git -C ' . escapeshellarg(realpath(__DIR__ . '/../../'));

    // Execute Pull
    $output = [];
    $returnVar = 0;
    
    // Force pull from origin main
    $command = "$gitCmd pull origin main 2>&1";
    
    exec($command, $output, $returnVar);

    // 2. Restore Sensitive Files
    restoreSensitiveFiles($backups);
    
    // 3. Cleanup Install Files
    cleanupInstallFiles();

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
        
        // 1. Backup Sensitive Files
        $backups = backupSensitiveFiles();

        try {
            $zip->extractTo($extractPath);
            $zip->close();
            
            // 2. Restore Sensitive Files
            restoreSensitiveFiles($backups);

            // 3. Cleanup Install Files
            cleanupInstallFiles();

            echo json_encode(['success' => true, 'message' => 'Archivos extraídos y actualizados correctamente.']);
        } catch (Exception $e) {
            // Try to restore even on error
            restoreSensitiveFiles($backups);
            
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
