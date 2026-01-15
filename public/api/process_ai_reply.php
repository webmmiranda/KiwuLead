<?php
// public/api/process_ai_reply.php
// Background script to process AI Auto-Reply

require_once __DIR__ . '/db.php';

// Check args
if ($argc < 2) {
    exit('No contact ID provided.');
}
$contactId = $argv[1];

$pdo = getDB();

// 1. Load Settings
$stmt = $pdo->prepare("SELECT setting_value FROM company_settings WHERE setting_key = 'ai'");
$stmt->execute();
$aiSettings = json_decode($stmt->fetchColumn() ?: '{}', true);

if (empty($aiSettings['enabled'])) exit('AI Agent disabled.');

// 2. Load Contact & History
$stmt = $pdo->prepare("SELECT * FROM contacts WHERE id = :id");
$stmt->execute([':id' => $contactId]);
$contact = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$contact) exit('Contact not found.');

// Anti-Loop / Human Takeover Check
// If the last message was from 'agent' (human) and happened recently, maybe we pause?
// For now, we just reply to 'customer' messages.
// This script is triggered BY a customer message, so we are safe-ish.

// Load last N messages for context
$stmt = $pdo->prepare("SELECT sender, content, created_at FROM contact_history WHERE contact_id = :id ORDER BY created_at DESC LIMIT 10");
$stmt->execute([':id' => $contactId]);
$history = array_reverse($stmt->fetchAll(PDO::FETCH_ASSOC));

// 3. Load Knowledge Base (Products for now)
$stmt = $pdo->query("SELECT name, price, description FROM products WHERE status = 'active'");
$products = $stmt->fetchAll(PDO::FETCH_ASSOC);
$productContext = "CATÁLOGO DE PRODUCTOS:\n";
foreach ($products as $p) {
    $productContext .= "- {$p['name']} ($ {$p['price']}): {$p['description']}\n";
}

// 4. Construct Prompt
$systemPrompt = $aiSettings['prompt'] ?? "Eres un asistente de ventas amable y profesional. Tu objetivo es ayudar al cliente, responder preguntas sobre los productos y agendar citas si muestran interés. Sé conciso.";
$systemPrompt .= "\n\n" . $productContext;

$messages = [];
$messages[] = ['role' => 'system', 'content' => $systemPrompt];

foreach ($history as $h) {
    $role = ($h['sender'] === 'customer') ? 'user' : 'model';
    $messages[] = ['role' => $role, 'content' => $h['content']];
}

// 5. Call LLM (Gemini or OpenAI)
$provider = $aiSettings['provider'] ?? 'gemini';
$apiKey = $aiSettings['apiKey'] ?? '';
$model = $aiSettings['model'] ?? 'gemini-pro';

$replyText = '';

if ($provider === 'gemini') {
    $replyText = callGemini($apiKey, $messages);
} else {
    $replyText = callOpenAI($apiKey, $model, $messages);
}

// 6. Send Reply via WhatsApp
if (!empty($replyText)) {
    // Get WhatsApp Config
    $stmt = $pdo->prepare("SELECT setting_value FROM company_settings WHERE setting_key = 'whatsapp_config'");
    $stmt->execute();
    $waConfig = json_decode($stmt->fetchColumn() ?: '{}', true);
    
    if (!empty($waConfig['phoneId']) && !empty($waConfig['token'])) {
        $url = "https://graph.facebook.com/v19.0/{$waConfig['phoneId']}/messages";
        $payload = [
            'messaging_product' => 'whatsapp',
            'to' => $contact['phone'],
            'type' => 'text',
            'text' => ['body' => $replyText]
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $waConfig['token']
        ]);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        $res = curl_exec($ch);
        curl_close($ch);
        
        // Log AI Reply
        $stmt = $pdo->prepare("INSERT INTO contact_history (contact_id, sender, type, channel, content, created_at) VALUES (:id, 'agent', 'message', 'whatsapp', :content, NOW())");
        $stmt->execute([':id' => $contactId, ':content' => $replyText . " (🤖 AI)"]);
    }
}

// --- HELPERS ---

function callGemini($key, $msgs) {
    $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$key";
    
    // Map format
    $contents = [];
    // Combine system prompt into first user message for Gemini (System instructions support varies)
    // Recent Gemini supports system directly, but simple approach:
    $systemPart = "";
    if ($msgs[0]['role'] === 'system') {
        $systemPart = $msgs[0]['content'] . "\n\n---\n\n";
        array_shift($msgs);
    }
    
    // Process history
    foreach ($msgs as $i => $m) {
        $text = ($i === 0) ? $systemPart . $m['content'] : $m['content'];
        $role = ($m['role'] === 'user') ? 'user' : 'model';
        $contents[] = ['role' => $role, 'parts' => [['text' => $text]]];
    }
    
    $payload = ['contents' => $contents];
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    $response = curl_exec($ch);
    curl_close($ch);
    
    $json = json_decode($response, true);
    return $json['candidates'][0]['content']['parts'][0]['text'] ?? '';
}

function callOpenAI($key, $model, $msgs) {
    $url = "https://api.openai.com/v1/chat/completions";
    $payload = [
        'model' => $model,
        'messages' => $msgs
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        "Authorization: Bearer $key"
    ]);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    $response = curl_exec($ch);
    curl_close($ch);

    $json = json_decode($response, true);
    return $json['choices'][0]['message']['content'] ?? '';
}
