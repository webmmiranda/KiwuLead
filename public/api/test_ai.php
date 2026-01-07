<?php
// public/api/test_ai.php
error_reporting(0); // Suppress warnings/notices breaking JSON
ini_set('display_errors', 0);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

try {
    if (!extension_loaded('curl')) {
        throw new Exception('PHP cURL extension is not enabled on the server.');
    }

    $inputJSON = file_get_contents('php://input');
    $input = json_decode($inputJSON, true);

    if (!$input) {
        throw new Exception('No JSON input provided or invalid JSON.');
    }

    $provider = $input['provider'] ?? 'gemini';
    $apiKey = $input['apiKey'] ?? '';
    $model = $input['model'] ?? 'gemini-1.5-flash';

    if (empty($apiKey)) {
        throw new Exception('API Key is required.');
    }

    $responseBot = '';

    if ($provider === 'gemini') {
        // Test Gemini API
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";
        
        $data = [
            "contents" => [
                [
                    "parts" => [
                        ["text" => "Hello, reply with 'OK' only."]
                    ]
                ]
            ]
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // For local dev compatibility
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            throw new Exception("Curl Error: $curlError");
        }

        $json = json_decode($response, true);

        if ($httpCode === 200 && isset($json['candidates'])) {
            $responseBot = $json['candidates'][0]['content']['parts'][0]['text'] ?? 'OK';
        } else {
            $msg = $json['error']['message'] ?? "Unknown Gemini Error ($httpCode)";
            throw new Exception($msg);
        }

    } elseif ($provider === 'openai') {
        // Test OpenAI API
        $url = "https://api.openai.com/v1/chat/completions";
        
        $data = [
            "model" => $model,
            "messages" => [
                ["role" => "user", "content" => "Hello, reply with 'OK' only."]
            ],
            "max_tokens" => 5
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            "Authorization: Bearer $apiKey"
        ]);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // For local dev compatibility
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            throw new Exception("Curl Error: $curlError");
        }

        $json = json_decode($response, true);

        if ($httpCode === 200 && isset($json['choices'])) {
            $responseBot = $json['choices'][0]['message']['content'] ?? 'OK';
        } else {
            $msg = $json['error']['message'] ?? "Unknown OpenAI Error ($httpCode)";
            throw new Exception($msg);
        }
    } else {
        throw new Exception("Provider '$provider' not supported");
    }

    echo json_encode([
        'success' => true, 
        'message' => "Connection successful! Model ($model) replied: $responseBot",
        'model' => $model
    ]);

} catch (Exception $e) {
    http_response_code(400); // Bad Request / Error
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>