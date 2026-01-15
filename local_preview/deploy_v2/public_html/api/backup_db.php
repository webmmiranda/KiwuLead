<?php
// Script de Backup Automatizado
// Puede ser llamado por un cron job o manualmente desde la administración

require_once __DIR__ . '/../../api_config.php';
header('Content-Type: application/json');

// Verificar permisos (simple check por ahora, idealmente verificar JWT o API Key)
// if (!isset($_GET['key']) || $_GET['key'] !== 'YOUR_SECRET_KEY') {
//     http_response_code(403);
//     echo json_encode(['error' => 'Unauthorized']);
//     exit;
// }

$backupDir = __DIR__ . '/../../backups/';
if (!file_exists($backupDir)) {
    mkdir($backupDir, 0755, true);
}

$date = date('Y-m-d_H-i-s');
$filename = "backup_{$date}.sql";
$filepath = $backupDir . $filename;

// Comando mysqldump
// Nota: En algunos entornos puede requerir la ruta completa al binario mysqldump
$command = sprintf(
    'mysqldump --host=%s --user=%s --password=%s %s > %s 2>&1',
    escapeshellarg(DB_HOST),
    escapeshellarg(DB_USER),
    escapeshellarg(DB_PASS),
    escapeshellarg(DB_NAME),
    escapeshellarg($filepath)
);

// Ejecutar backup
exec($command, $output, $returnVar);

if ($returnVar !== 0) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error creando backup',
        'details' => $output
    ]);
    exit;
}

// Rotación de backups (mantener los últimos 5)
$files = glob($backupDir . '*.sql');
usort($files, function($a, $b) {
    return filemtime($b) - filemtime($a); // Más recientes primero
});

$deleted = [];
if (count($files) > 5) {
    for ($i = 5; $i < count($files); $i++) {
        if (unlink($files[$i])) {
            $deleted[] = basename($files[$i]);
        }
    }
}

echo json_encode([
    'success' => true,
    'message' => 'Backup creado exitosamente',
    'file' => $filename,
    'size' => filesize($filepath),
    'rotated_files' => $deleted
]);
