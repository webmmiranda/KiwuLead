<?php
// public/api/jwt_helper.php

if (!defined('JWT_SECRET')) {
    // In production, this should be in a secure config file
    define('JWT_SECRET', 'nexus_crm_secret_key_change_this_in_prod_' . md5(__FILE__));
}

function base64UrlEncode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64UrlDecode($data) {
    return base64_decode(strtr($data, '-_', '+/'));
}

function generateJWT($userId, $role) {
    $header = json_encode(['alg' => 'HS256', 'typ' => 'JWT']);
    $payload = json_encode([
        'sub' => $userId,
        'role' => $role,
        'iat' => time(),
        'exp' => time() + (60 * 60 * 24 * 7) // 7 Days
    ]);

    $base64UrlHeader = base64UrlEncode($header);
    $base64UrlPayload = base64UrlEncode($payload);

    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, JWT_SECRET, true);
    $base64UrlSignature = base64UrlEncode($signature);

    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

function verifyJWT($jwt) {
    $tokenParts = explode('.', $jwt);
    
    if (count($tokenParts) != 3) {
        return false;
    }

    $header = base64UrlDecode($tokenParts[0]);
    $payload = base64UrlDecode($tokenParts[1]);
    $signature_provided = $tokenParts[2];

    // Check expiration
    $payloadObj = json_decode($payload, true); // Return as associative array
    if ($payloadObj['exp'] < time()) {
        return false;
    }

    // Check signature
    $base64UrlHeader = $tokenParts[0];
    $base64UrlPayload = $tokenParts[1];
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, JWT_SECRET, true);
    $base64UrlSignature = base64UrlEncode($signature);

    if ($base64UrlSignature === $signature_provided) {
        // Map 'sub' to 'id' for compatibility
        if (isset($payloadObj['sub']) && !isset($payloadObj['id'])) {
            $payloadObj['id'] = $payloadObj['sub'];
        }
        return $payloadObj;
    }

    return false;
}
?>
