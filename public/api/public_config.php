<?php
// public/api/public_config.php
require_once 'db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Allow public access

try {
    $pdo = getDB();
    
    // Fetch only safe public settings
    $stmt = $pdo->prepare("SELECT setting_value FROM company_settings WHERE setting_key = 'company_profile'");
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    $config = [
        'companyName' => 'Nexus CRM', // Default
        'logoUrl' => '',
        'industry' => '',
        'currency' => 'USD'
    ];

    if ($row && $row['setting_value']) {
        $savedConfig = json_decode($row['setting_value'], true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $config['companyName'] = $savedConfig['name'] ?? 'Nexus CRM';
            $config['logoUrl'] = $savedConfig['logoUrl'] ?? '';
            $config['industry'] = $savedConfig['industry'] ?? '';
            $config['currency'] = $savedConfig['currency'] ?? 'USD';
        }
    }

    echo json_encode($config);

} catch (Exception $e) {
    // Return defaults on error
    echo json_encode([
        'companyName' => 'Nexus CRM',
        'logoUrl' => '',
        'error' => $e->getMessage()
    ]);
}
?>