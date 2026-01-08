<?php
require_once 'db.php';
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

$response = [
    'db_status' => 'Error',
    'redis_status' => 'Not Configured',
    'webhook_health' => [
        'success_rate' => 100, // Default to 100 if no traffic
        'last_signal' => null,
        'total_24h' => 0
    ],
    'automations_active' => 0,
    'pending_jobs' => 0
];

try {
    $pdo = getDB();
    $response['db_status'] = 'Online';
    
    // Webhooks 24h
    $stmt = $pdo->query("
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success
        FROM webhook_logs 
        WHERE created_at >= NOW() - INTERVAL 24 HOUR
    ");
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);
    $total = $stats['total'] ?? 0;
    $success = $stats['success'] ?? 0;
    
    $response['webhook_health']['total_24h'] = $total;
    if ($total > 0) {
        $response['webhook_health']['success_rate'] = round(($success / $total) * 100, 1);
    }

    // Last Signal
    $stmt = $pdo->query("SELECT created_at FROM webhook_logs ORDER BY created_at DESC LIMIT 1");
    $last = $stmt->fetchColumn();
    $response['webhook_health']['last_signal'] = $last ?: null;

    // Automations
    $stmt = $pdo->query("SELECT COUNT(*) FROM automations WHERE is_active = 1");
    $response['automations_active'] = $stmt->fetchColumn();

} catch (Exception $e) {
    $response['db_status'] = 'Error: ' . $e->getMessage();
}

echo json_encode($response);
?>