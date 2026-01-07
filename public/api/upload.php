<?php
// public/api/upload.php
require_once 'db.php';
require_once 'middleware.php';
requireAuth();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

if (!isset($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No file uploaded']);
    exit;
}

$file = $_FILES['file'];
$contactId = $_POST['contactId'] ?? null;

// Validate file type
$allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
if (!in_array($file['type'], $allowedTypes)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid file type']);
    exit;
}

// Create uploads directory
$uploadDir = __DIR__ . '/../uploads/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Generate unique filename
$ext = pathinfo($file['name'], PATHINFO_EXTENSION);
$filename = uniqid() . '_' . time() . '.' . $ext;
$targetPath = $uploadDir . $filename;

if (move_uploaded_file($file['tmp_name'], $targetPath)) {
    $publicUrl = '/uploads/' . $filename; // Relative URL for frontend

    // If linked to a contact, update the contact's document list in DB
    if ($contactId) {
        $pdo = getDB();
        
        // Fetch current documents
        $stmt = $pdo->prepare("SELECT documents_json FROM contacts WHERE id = :id");
        $stmt->execute([':id' => $contactId]);
        $currentJson = $stmt->fetchColumn();
        $documents = $currentJson ? json_decode($currentJson, true) : [];

        // Add new document
        $newDoc = [
            'id' => uniqid(),
            'name' => $file['name'],
            'type' => $file['type'],
            'url' => $publicUrl,
            'createdAt' => date('c')
        ];
        $documents[] = $newDoc;

        // Save back
        $update = $pdo->prepare("UPDATE contacts SET documents_json = :docs WHERE id = :id");
        $update->execute([
            ':docs' => json_encode($documents),
            ':id' => $contactId
        ]);

        echo json_encode(['success' => true, 'file' => $newDoc]);
    } else {
        echo json_encode(['success' => true, 'url' => $publicUrl]);
    }
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to move uploaded file']);
}
?>
