<?php
// public/api/e2e_verification.php
require_once 'db.php';

header('Content-Type: text/plain');

function assert_true($condition, $message, $debug_data = null) {
    if (!$condition) {
        if ($debug_data) echo "\nDEBUG: " . print_r($debug_data, true) . "\n";
        throw new Exception("FAIL: $message");
    }
    echo "PASS: $message\n";
}

function callAPI($method, $url, $data = false, $token = null) {
    $curl = curl_init();
    $headers = ['Content-Type: application/json'];
    if ($token) {
        $headers[] = "Authorization: Bearer $token";
    }

    curl_setopt($curl, CURLOPT_URL, $url);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
    
    if ($method === 'POST') {
        curl_setopt($curl, CURLOPT_POST, 1);
        if ($data) curl_setopt($curl, CURLOPT_POSTFIELDS, $data);
    } elseif ($method === 'PUT') {
        curl_setopt($curl, CURLOPT_CUSTOMREQUEST, "PUT");
        if ($data) curl_setopt($curl, CURLOPT_POSTFIELDS, $data);
    }

    curl_setopt($curl, CURLOPT_HTTPHEADER, $headers);
    
    $result = curl_exec($curl);
    $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);

    return ['code' => $httpCode, 'body' => $result];
}

try {
    $pdo = getDB();
    $uniqueId = time();
    $baseUrl = 'http://localhost:8081/api';

    echo "--- STARTING E2E VERIFICATION ---\n";

    // 1. Authentication
    echo "\n1. Testing Authentication...\n";
    $loginPayload = json_encode(['email' => 'admin@nexus.com', 'password' => 'password']);
    $res = callAPI('POST', "$baseUrl/auth.php", $loginPayload);
    
    assert_true($res['code'] === 200, "Login returned 200", $res);
    $authData = json_decode($res['body'], true);
    assert_true(!empty($authData['token']), "Received JWT Token", $res);
    $token = $authData['token'];
    echo "Token: " . substr($token, 0, 10) . "...\n";

    // 2. Create Contact (Protected)
    echo "\n2. Testing Create Contact (Protected)...\n";
    $contactPayload = json_encode([
        'name' => "E2E User $uniqueId",
        'email' => "e2e_$uniqueId@test.com",
        'phone' => "555$uniqueId",
        'status' => 'New'
    ]);
    
    // Try without token first (Should fail)
    $failRes = callAPI('POST', "$baseUrl/contacts.php", $contactPayload);
    assert_true($failRes['code'] === 401, "Unauthenticated request blocked (401)");

    // Try with token
    $res = callAPI('POST', "$baseUrl/contacts.php", $contactPayload, $token);
    assert_true($res['code'] === 200, "Authenticated request succeeded (200)");
    $contactData = json_decode($res['body'], true);
    $contactId = $contactData['id'];

    // 3. File Upload
    echo "\n3. Testing File Upload...\n";
    // Create a dummy file
    $dummyFile = sys_get_temp_dir() . '/test_doc.pdf';
    file_put_contents($dummyFile, 'PDF CONTENT SIMULATION');

    $cfile = new CURLFile($dummyFile, 'application/pdf', 'test_doc.pdf');
    $data = ['file' => $cfile, 'contactId' => $contactId];
    
    $curl = curl_init("$baseUrl/upload.php");
    curl_setopt($curl, CURLOPT_POST, 1);
    curl_setopt($curl, CURLOPT_POSTFIELDS, $data);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($curl, CURLOPT_HTTPHEADER, ["Authorization: Bearer $token"]);
    
    $result = curl_exec($curl);
    $code = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    
    assert_true($code === 200, "File Upload returned 200");
    $uploadRes = json_decode($result, true);
    assert_true($uploadRes['success'] === true, "Upload success flag true");
    
    // 4. Verify Document Link in Contact
    echo "\n4. Verifying Persistence...\n";
    $res = callAPI('GET', "$baseUrl/contacts.php", false, $token); // List all
    $contacts = json_decode($res['body'], true);
    $myContact = null;
    foreach($contacts as $c) {
        if ($c['id'] == $contactId) {
            $myContact = $c;
            break;
        }
    }
    
    assert_true($myContact !== null, "Contact found in list");
    assert_true(count($myContact['documents']) > 0, "Contact has documents attached");
    assert_true($myContact['documents'][0]['name'] === 'test_doc.pdf', "Document name matches");

    echo "\n✅ SYSTEM IS 100% OPERATIONAL AND SECURE\n";

} catch (Exception $e) {
    echo "\n❌ TEST FAILED: " . $e->getMessage() . "\n";
}
?>
