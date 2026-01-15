<?php
// public/api/middleware.php
require_once 'jwt_helper.php';
require_once 'Logger.php';

// Ensure we don't output HTML errors in JSON endpoints
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Rate Limiting Config
const RATE_LIMIT_WINDOW = 60; // seconds
const RATE_LIMIT_MAX_REQUESTS = 100; // requests per window

function checkRateLimit() {
    // Simple file-based rate limiting for local dev / MVP
    // In production, use Redis or Memcached
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $file = sys_get_temp_dir() . '/rate_limit_' . md5($ip) . '.json';
    
    $data = ['count' => 0, 'start_time' => time()];
    if (file_exists($file)) {
        $data = json_decode(file_get_contents($file), true);
    }

    if (time() - $data['start_time'] > RATE_LIMIT_WINDOW) {
        $data = ['count' => 1, 'start_time' => time()];
    } else {
        $data['count']++;
    }

    // Suppress errors during rate limit write to avoid JSON corruption
    @file_put_contents($file, json_encode($data));

    if ($data['count'] > RATE_LIMIT_MAX_REQUESTS) {
        http_response_code(429);
        echo json_encode(['error' => 'Too Many Requests']);
        exit;
    }
}

// Start Performance Timer
$start_time = microtime(true);

// Register Shutdown Function to Log Stats
register_shutdown_function(function() use ($start_time) {
    $duration = (microtime(true) - $start_time) * 1000;
    $endpoint = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $method = $_SERVER['REQUEST_METHOD'];
    $status = http_response_code();
    
    // Attempt to get User ID if available (needs to be set globally or passed)
    // For now, we rely on the token check inside requireAuth() setting a global or similar
    // Or we can just log null for public endpoints
    global $currentUser; 
    
    // Check if $currentUser is an array or object
    $userId = null;
    if (is_array($currentUser)) {
        $userId = $currentUser['id'] ?? $currentUser['sub'] ?? null;
    } elseif (is_object($currentUser)) {
        $userId = $currentUser->id ?? $currentUser->sub ?? null;
    }

    Logger::stat($endpoint, $method, $status, $duration, $userId);
});

checkRateLimit();

// CORS handled globally via db.php -> cors.php, but ensure we don't duplicate if included separately
function getBearerToken() {
    $headers = null;
    if (isset($_SERVER['Authorization'])) {
        $headers = trim($_SERVER["Authorization"]);
    }
    else if (isset($_SERVER['HTTP_AUTHORIZATION'])) { //Nginx or fast CGI
        $headers = trim($_SERVER["HTTP_AUTHORIZATION"]);
    } elseif (function_exists('apache_request_headers')) {
        $requestHeaders = apache_request_headers();
        // Server-side fix for bug in some setups
        $requestHeaders = array_combine(array_map('ucwords', array_keys($requestHeaders)), array_values($requestHeaders));
        if (isset($requestHeaders['Authorization'])) {
            $headers = trim($requestHeaders['Authorization']);
        }
    }
    
    if (!empty($headers)) {
        if (preg_match('/Bearer\s(\S+)/', $headers, $matches)) {
            return $matches[1];
        }
    }
    return null;
}

function requireAuth() {
    // OPTIONS handled globally above

    $token = getBearerToken();
    if (!$token) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized: No token provided']);
        exit;
    }

    $payload = verifyJWT($token);
    if (!$payload) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized: Invalid token']);
        exit;
    }

    // Set global current user for logging
    global $currentUser;
    $currentUser = $payload;

    return $payload;
}
