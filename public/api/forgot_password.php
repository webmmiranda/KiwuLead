<?php
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$email = $data['email'] ?? '';

if (empty($email)) {
    http_response_code(400);
    echo json_encode(['error' => 'Email is required']);
    exit;
}

try {
    $conn = getDB();
    
    // Check if user exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if (!$stmt->fetch()) {
        // Return success even if email doesn't exist for security (avoid enumeration)
        // But for this dev env, maybe we can be explicit or just log it.
        // Let's stick to standard practice but maybe add a debug field.
        echo json_encode(['success' => true, 'message' => 'If your email exists, you will receive instructions.']);
        exit;
    }
    
    // Generate token
    $token = bin2hex(random_bytes(32));
    $expires_at = date('Y-m-d H:i:s', strtotime('+1 hour'));
    
    // Store token
    $stmt = $conn->prepare("INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)");
    $stmt->execute([$email, $token, $expires_at]);
    
    // --- SEND EMAIL VIA TEMPLATE HELPER ---
    require_once 'template_helper.php';
    require_once 'mail_helper.php';

    $frontendUrl = (isset($_SERVER['HTTPS']) ? "https" : "http") . "://$_SERVER[HTTP_HOST]";
    $resetLink = "$frontendUrl/reset-password?token=" . $token;

    // 1. Render Template
    $tplHelper = new TemplateHelper($conn);
    $emailData = [
        'link' => $resetLink,
        'email' => $email
    ];
    $renderResult = $tplHelper->render('Password Reset', $emailData);

    // 2. Get System Email Config (Try User ID 1 - Admin)
    $stmtConfig = $conn->prepare("SELECT * FROM user_email_configs WHERE user_id = 1");
    $stmtConfig->execute();
    $config = $stmtConfig->fetch(PDO::FETCH_ASSOC);

    if ($config) {
        // 3. Send via SMTP
        $sendResult = sendSMTPMultipart(
            $config, 
            $email, 
            $renderResult['subject'], 
            $renderResult['html'], 
            [] // No attachments
        );

        if ($sendResult === true) {
            echo json_encode(['success' => true, 'message' => 'Recovery email sent.']);
        } else {
            // Log error but don't expose SMTP details to user
            error_log("Password Reset SMTP Error: " . $sendResult);
            echo json_encode(['success' => true, 'message' => 'Recovery email initiated (check logs if not received).']);
        }
    } else {
        // Fallback or Simulation if no config
        echo json_encode([
            'success' => true, 
            'message' => 'Recovery email simulated (No System Email Config found).',
            'debug_link' => $resetLink
        ]);
    }

} catch(Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
