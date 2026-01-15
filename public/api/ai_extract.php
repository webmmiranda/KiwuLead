<?php
// public/api/ai_extract.php
require_once 'db.php';
require_once 'middleware.php';
requireAuth();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (empty($input['content'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Content is required']);
    exit;
}

$webContent = $input['content'];
$pdo = getDB();

// 1. Load AI Settings
$stmt = $pdo->prepare("SELECT setting_value FROM company_settings WHERE setting_key = 'ai'");
$stmt->execute();
$aiSettings = json_decode($stmt->fetchColumn() ?: '{}', true);

if (empty($aiSettings['apiKey'])) {
    http_response_code(400);
    echo json_encode(['error' => 'API Key not configured in Settings']);
    exit;
}

$apiKey = $aiSettings['apiKey'];
$model = $aiSettings['model'] ?? 'gemini-1.5-flash';

// 2. Prepare Gemini Prompt
$prompt = "Actúa como un experto en negocios e inteligencia de ventas. 
Has analizado el siguiente contenido extraído de un sitio web:

--- CONTENIDO DE LA WEB ---
$webContent
--- FIN DEL CONTENIDO ---

TU TAREA:
1. Genera un breve resumen de qué hace esta empresa (máximo 2 frases).
2. Extrae o deduce 5 productos o servicios REALES que esta empresa ofrece.
3. Si no encuentras precios reales, estima unos precios de mercado realistas en USD.

Devuelve ÚNICAMENTE un objeto JSON válido con este formato:
{
  \"businessSummary\": \"Resumen aquí...\",
  \"products\": [
    {
      \"name\": \"Nombre\",
      \"description\": \"Descripción para un vendedor (máximo 150 caracteres)\",
      \"price\": 100,
      \"currency\": \"USD\",
      \"category\": \"Software/Servicios/etc\"
    }
  ]
}";

// 3. Call Gemini
$url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key=$apiKey";

$data = [
    "contents" => [
        [
            "parts" => [
                ["text" => $prompt]
            ]
        ]
    ]
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(500);
    echo json_encode(['error' => "Gemini API Error: $curlError"]);
    exit;
}

$json = json_decode($response, true);

if ($httpCode === 200 && isset($json['candidates'][0]['content']['parts'][0]['text'])) {
    $text = $json['candidates'][0]['content']['parts'][0]['text'];
    // Clean markdown if present
    $jsonStr = preg_replace('/```json|```/', '', $text);
    $jsonStr = trim($jsonStr);
    
    echo json_encode([
        'success' => true,
        'data' => json_decode($jsonStr, true)
    ]);
} else {
    $msg = $json['error']['message'] ?? "Unknown Gemini Error ($httpCode)";
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $msg]);
}
?>
