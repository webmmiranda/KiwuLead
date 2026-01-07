<?php
// public/api/send_mail.php
require_once 'db.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

$userId = $_GET['user_id'] ?? $_POST['user_id'] ?? null;
// Support multipart/form-data for attachments or json
$isMultipart = strpos($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data') !== false;

if ($isMultipart) {
    $to = $_POST['to'] ?? '';
    $subject = $_POST['subject'] ?? '';
    $body = $_POST['body'] ?? '';
    // Attachments will be in $_FILES['attachments']
} else {
    $data = json_decode(file_get_contents('php://input'), true);
    $to = $data['to'] ?? '';
    $subject = $data['subject'] ?? '';
    $body = $data['body'] ?? '';
}

if (!$userId || !$to || !$subject) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields (to, subject)']);
    exit;
}

$pdo = getDB();

try {
    // 1. Get User Config
    $stmt = $pdo->prepare("SELECT * FROM user_email_configs WHERE user_id = :uid");
    $stmt->execute([':uid' => $userId]);
    $config = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$config)
        throw new Exception("Configuración de correo no encontrada.");

    // 2. Process Attachments
    $uploadedAttachments = [];
    if (!empty($_FILES['attachments']['name'][0])) {
        $uploadDir = __DIR__ . '/../../uploads/mail_attachments/';
        if (!is_dir($uploadDir))
            mkdir($uploadDir, 0755, true);

        foreach ($_FILES['attachments']['name'] as $key => $name) {
            if ($_FILES['attachments']['error'][$key] === UPLOAD_ERR_OK) {
                $tmpName = $_FILES['attachments']['tmp_name'][$key];
                $filename = time() . '_' . basename($name);
                if (move_uploaded_file($tmpName, $uploadDir . $filename)) {
                    $uploadedAttachments[] = [
                        'name' => $name,
                        'path' => $uploadDir . $filename,
                        'url' => '/uploads/mail_attachments/' . $filename // For frontend view if needed
                    ];
                }
            }
        }
    }

    // 3. Append Signature if exists
    $finalBody = $body;
    if (!empty($config['signature'])) {
        $finalBody .= "<br><br>--<br>" . $config['signature'];
    }

    // 4. Send Email via SMTP
    // Note: We need a smarter sendSMTP function that handles multipart/mixed if there are attachments
    $result = sendSMTPMultipart($config, $to, $subject, $finalBody, $uploadedAttachments);

    if ($result === true) {
        // 5. Save to Database (Sent Folder)
        $stmt = $pdo->prepare("INSERT INTO emails (user_id, to_email, from_email, subject, body, preview, attachments, folder, is_read, is_archived) VALUES (:uid, :to, :from, :sub, :body, :prev, :att, 'sent', 1, 0)");
        $stmt->execute([
            ':uid' => $userId,
            ':to' => $to,
            ':from' => $config['from_email'],
            ':sub' => $subject,
            ':body' => $finalBody,
            ':prev' => substr(strip_tags($finalBody), 0, 100),
            ':att' => json_encode($uploadedAttachments)
        ]);

        echo json_encode(['success' => true, 'message' => 'Correo enviado exitosamente']);
    } else {
        echo json_encode(['success' => false, 'error' => $result]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

// --- SMTP Helper with Multipart support ---
function sendSMTPMultipart($config, $to, $subject, $htmlBody, $attachments)
{
    $host = $config['smtp_host'];
    $port = $config['smtp_port'];
    $username = $config['smtp_user'];
    $password = $config['smtp_pass'];
    $secure = $config['smtp_secure'];

    $transport = $secure === 'ssl' ? 'ssl://' : '';
    $boundary = md5(time());

    try {
        $socket = fsockopen($transport . $host, $port, $errno, $errstr, 30);
        if (!$socket)
            return "Connection failed: $errstr ($errno)";

        serverCmd($socket, "220");
        fputs($socket, "EHLO " . $_SERVER['SERVER_NAME'] . "\r\n");
        serverCmd($socket, "250");

        if ($secure === 'tls') {
            fputs($socket, "STARTTLS\r\n");
            serverCmd($socket, "220");
            stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
            fputs($socket, "EHLO " . $_SERVER['SERVER_NAME'] . "\r\n");
            serverCmd($socket, "250");
        }

        fputs($socket, "AUTH LOGIN\r\n");
        serverCmd($socket, "334");
        fputs($socket, base64_encode($username) . "\r\n");
        serverCmd($socket, "334");
        fputs($socket, base64_encode($password) . "\r\n");
        serverCmd($socket, "235");

        fputs($socket, "MAIL FROM: <$username>\r\n");
        serverCmd($socket, "250");
        fputs($socket, "RCPT TO: <$to>\r\n");
        serverCmd($socket, "250");

        fputs($socket, "DATA\r\n");
        serverCmd($socket, "354");

        // Headers
        $headers = "MIME-Version: 1.0\r\n";
        $headers .= "From: " . ($config['from_name'] ?: $username) . " <" . ($config['from_email'] ?: $username) . ">\r\n";
        $headers .= "To: $to\r\n";
        $headers .= "Subject: $subject\r\n";
        $headers .= "Content-Type: multipart/mixed; boundary=\"$boundary\"\r\n";

        $body = "--$boundary\r\n";
        $body .= "Content-Type: text/html; charset=utf-8\r\n";
        $body .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
        $body .= "$htmlBody\r\n\r\n";

        // Attachments
        foreach ($attachments as $att) {
            if (file_exists($att['path'])) {
                $fileContent = chunk_split(base64_encode(file_get_contents($att['path'])));
                $body .= "--$boundary\r\n";
                $body .= "Content-Type: application/octet-stream; name=\"{$att['name']}\"\r\n";
                $body .= "Content-Transfer-Encoding: base64\r\n";
                $body .= "Content-Disposition: attachment; filename=\"{$att['name']}\"\r\n\r\n";
                $body .= "$fileContent\r\n\r\n";
            }
        }

        $body .= "--$boundary--";

        fputs($socket, "$headers\r\n$body\r\n.\r\n");
        serverCmd($socket, "250");

        fputs($socket, "QUIT\r\n");
        fclose($socket);

        return true;
    } catch (Exception $e) {
        return "SMTP Error: " . $e->getMessage();
    }
}

function serverCmd($socket, $expected)
{
    $response = "";
    while (substr($response, 3, 1) != " ") {
        $response = fgets($socket, 256);
    }
    if (substr($response, 0, 3) != $expected) {
        throw new Exception("Server response error: $response");
    }
}
?>