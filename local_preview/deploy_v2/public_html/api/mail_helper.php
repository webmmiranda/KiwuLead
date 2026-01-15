<?php
// public/api/mail_helper.php

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
