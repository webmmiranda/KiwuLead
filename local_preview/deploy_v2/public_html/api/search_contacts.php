<?php
// public/api/search_contacts.php
require_once 'db.php';
require_once 'middleware.php';

// Verify authentication and get user ID
$user = requireAuth();
$userId = $user->sub;

$query = $_GET['q'] ?? '';

if (strlen($query) < 2) {
    echo json_encode(['success' => true, 'contacts' => []]);
    exit;
}

$pdo = getDB();

try {
    $stmt = $pdo->prepare("
        SELECT id, name, email, company 
        FROM contacts 
        WHERE (name LIKE :q OR email LIKE :q OR company LIKE :q)
        LIMIT 10
    ");
    
    $searchTerm = "%$query%";
    $stmt->execute([
        ':q' => $searchTerm
    ]);
    
    $contacts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'contacts' => $contacts]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
