<?php
// Centralized CORS Handling
// Allowed in Dev/Preview. In Prod, restrict this.

// Check if headers already sent to avoid errors
if (!headers_sent()) {
    
    // Define allowed origins
    $allowed_origins = [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000'
    ];

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    
    // Allow localhost and specific domains, fallback to * only if strictly necessary (better to be explicit)
    // For development convenience in this environment, we check if it's a local or preview environment
    if (in_array($origin, $allowed_origins) || preg_match('/localhost/', $origin) || empty($origin)) {
        header("Access-Control-Allow-Origin: " . ($origin ?: '*'));
    } else {
        // Optional: In strict production, return 403. For now, allow with warning or just default to * for unknown dev tools
        header("Access-Control-Allow-Origin: *"); 
    }

    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header('Content-Type: application/json');

    // Handle Preflight Options globally
    if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}
?>