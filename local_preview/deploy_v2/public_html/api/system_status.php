<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');

$installedLock = __DIR__ . '/../installed.lock';
$dbConfig = __DIR__ . '/db.php';

$isInstalled = file_exists($installedLock) && file_exists($dbConfig);

echo json_encode(['installed' => $isInstalled]);
?>
