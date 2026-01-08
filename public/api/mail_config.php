<?php
// public/api/mail_config.php
require_once 'db.php';
require_once 'middleware.php';
$user = requireAuth();

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDB();

// Simple auth check - In prod, use real session/token validation
// For now, we expect a user_id param or header
$userId = $_GET['user_id'] ?? $_POST['user_id'] ?? null;

if (!$userId) {
    http_response_code(400);
    echo json_encode(['error' => 'User ID required']);
    exit;
}

if ($method === 'GET') {
    try {
        $stmt = $pdo->prepare("SELECT * FROM user_email_configs WHERE user_id = :uid");
        $stmt->execute([':uid' => $userId]);
        $config = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($config) {
            // Don't return the password for security, only confirm it is set
            $config['smtp_pass'] = '********';
            echo json_encode(['success' => true, 'config' => $config]);
        } else {
            echo json_encode(['success' => true, 'config' => null]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    // If user didn't change password (********), keep existing
    $pass = $data['smtp_pass'] ?? '';

    try {
        // Check if exists
        $check = $pdo->prepare("SELECT id, smtp_pass FROM user_email_configs WHERE user_id = :uid");
        $check->execute([':uid' => $userId]);
        $existing = $check->fetch(PDO::FETCH_ASSOC);

        if ($pass === '********' && $existing) {
            $pass = $existing['smtp_pass'];
        }

        if ($existing) {
            $sql = "UPDATE user_email_configs SET 
                    smtp_host = :host, smtp_port = :port, smtp_user = :user, smtp_pass = :pass, 
                    smtp_secure = :secure, 
                    imap_host = :ihost, imap_port = :iport, imap_secure = :isecure,
                    from_name = :fname, from_email = :femail, signature = :sig
                    WHERE user_id = :uid";
        } else {
            $sql = "INSERT INTO user_email_configs 
                    (user_id, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, imap_host, imap_port, imap_secure, from_name, from_email, signature) 
                    VALUES (:uid, :host, :port, :user, :pass, :secure, :ihost, :iport, :isecure, :fname, :femail, :sig)";
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':uid' => $userId,
            ':host' => $data['smtp_host'],
            ':port' => $data['smtp_port'],
            ':user' => $data['smtp_user'],
            ':pass' => $pass,
            ':secure' => $data['smtp_secure'] ?? 'tls',
            ':ihost' => $data['imap_host'] ?? '',
            ':iport' => $data['imap_port'] ?? 993,
            ':isecure' => $data['imap_secure'] ?? 'ssl',
            ':fname' => $data['from_name'] ?? '',
            ':femail' => $data['from_email'] ?? '',
            ':sig' => $data['signature'] ?? ''
        ]);

        echo json_encode(['success' => true, 'message' => 'Configuración guardada']);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
} elseif ($method === 'PUT') {
    // Action: Test Connection
    $data = json_decode(file_get_contents('php://input'), true);
    $data['user_id'] = $userId;

    // Attempt to test SMTP connection (similar logic to send_mail but without sending body)
    // Attempt to test SMTP connection
    try {
        // Do not require send_mail.php as it exits on non-POST
        // We need a way to just test connection
        // Let's implement a test function or use sendSMTP with a Dummy
        $result = testSMTPConnection($data);

        if ($result === true) {
            echo json_encode(['success' => true, 'message' => 'Conexión SMTP exitosa']);
        } else {
            echo json_encode(['success' => false, 'error' => $result]);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

// --- SMTP Test Helper ---
function testSMTPConnection($config)
{
    $host = $config['smtp_host'] ?? '';
    $port = $config['smtp_port'] ?? 587;
    $username = $config['smtp_user'] ?? '';
    $password = $config['smtp_pass'] ?? '';
    $secure = $config['smtp_secure'] ?? 'tls';

    // Password handling if it's the mask
    if ($password === '********') {
        global $pdo; // Use global connection or pass it in
        if (isset($config['user_id'])) { // We need user_id to fetch
             $stmt = $pdo->prepare("SELECT smtp_pass FROM user_email_configs WHERE user_id = :uid");
             $stmt->execute([':uid' => $config['user_id']]);
             $row = $stmt->fetch(PDO::FETCH_ASSOC);
             if ($row) {
                 $password = $row['smtp_pass'];
             }
        }
    }

    $transport = $secure === 'ssl' ? 'ssl://' : '';

    try {
        $socket = fsockopen($transport . $host, $port, $errno, $errstr, 10);
        if (!$socket)
            return "Error de conexión: $errstr ($errno)";

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

        fputs($socket, "QUIT\r\n");
        fclose($socket);
        return true;
    } catch (Exception $e) {
        return $e->getMessage();
    }
}

function serverCmd($socket, $expected)
{
    $response = "";
    while (substr($response, 3, 1) != " ") {
        $response = fgets($socket, 256);
        if ($response === false)
            break;
    }
    if (substr($response, 0, 3) != $expected) {
        throw new Exception("Server response error: $response");
    }
}
?>