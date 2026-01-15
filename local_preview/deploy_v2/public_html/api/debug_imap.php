<?php
// public/api/debug_imap.php
require_once 'db.php';
header('Content-Type: text/plain');

$userId = $_GET['user_id'] ?? 1;
$pdo = getDB();

echo "1. Fetching Config for User $userId...\n";
$stmt = $pdo->prepare("SELECT * FROM user_email_configs WHERE user_id = :uid");
$stmt->execute([':uid' => $userId]);
$config = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$config) {
    die("ERROR: No configuration found.\n");
}

echo "Config Found:\n";
echo "Host: " . $config['imap_host'] . "\n";
echo "Port: " . $config['imap_port'] . "\n";
echo "User: " . $config['smtp_user'] . "\n";
echo "Secure: " . $config['imap_secure'] . "\n";

echo "\n2. Connecting to IMAP...\n";

$host = $config['imap_host'];
$port = $config['imap_port'];
$user = $config['smtp_user'];
$pass = $config['smtp_pass']; // This is decrypted? Or stored plain? (Assuming plain based on context)

$transport = $config['imap_secure'] === 'ssl' ? 'ssl://' : '';
$socket = fsockopen($transport . $host, $port, $errno, $errstr, 10);

if (!$socket) {
    die("ERROR: Connection failed: $errstr ($errno)\n");
}
echo "SUCCESS: Socket Connected.\n";

$banner = fgets($socket);
echo "Banner: $banner";

// Login
echo "3. Logging in...\n";
fputs($socket, "A001 LOGIN \"$user\" \"$pass\"\r\n");
$resp = "";
while(true) {
    $line = fgets($socket);
    $resp .= $line;
    if (preg_match('/^A001 (OK|NO|BAD)/', $line)) break;
}
echo $resp;

if (strpos($resp, 'A001 OK') === false) {
    die("ERROR: Login Failed.\n");
}

// Select Inbox
echo "4. Selecting Inbox...\n";
fputs($socket, "A002 SELECT INBOX\r\n");
$resp = "";
while(true) {
    $line = fgets($socket);
    $resp .= $line;
    if (preg_match('/^A002 (OK|NO|BAD)/', $line)) break;
}
echo $resp;

// Fetch Recent
echo "5. Fetching last email headers...\n";
fputs($socket, "A003 FETCH * (RFC822.HEADER)\r\n");
$resp = "";
$count = 0;
while(true) {
    $line = fgets($socket);
    $resp .= $line;
    if (preg_match('/^A003 (OK|NO|BAD)/', $line)) break;
    if ($count++ > 50) { echo "... (truncated) ...\n"; break; } // prevent massive output
}
echo "Fetch Response Length: " . strlen($resp) . " chars\n";

fputs($socket, "A004 LOGOUT\r\n");
fclose($socket);
echo "\nTest Complete.\n";
?>
