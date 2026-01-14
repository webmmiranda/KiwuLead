<?php
// public/api/notifications.php
require_once 'db.php';
require_once 'middleware.php';

// Ensure Auth
requireAuth();

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDB();

// Get Current User ID from Auth (set in middleware)
global $currentUser;
$userId = $currentUser->id ?? 0;

if (!$userId) {
    // Fallback: Try to get ID from 'sub' if 'id' is missing
    $userId = $currentUser->sub ?? 0;
}

if (!$userId) {
    http_response_code(401);
    echo json_encode(['error' => 'User ID not found in session']);
    exit;
}

switch ($method) {
    case 'GET':
        $action = $_GET['action'] ?? 'list';
        if ($action === 'preferences') {
            handleGetPreferences($pdo, $userId);
        } else {
            handleGet($pdo, $userId);
        }
        break;
    case 'POST':
        // Usually system creates notifications internally, but this endpoint allows client-side creation if needed
        // Or for testing.
        handleCreate($pdo, $userId);
        break;
    case 'PUT':
        $action = isset($_GET['action']) ? $_GET['action'] : ''; // read, read_all
        // Check for JSON body action if query param missing
        if (empty($action)) {
             $input = json_decode(file_get_contents('php://input'), true);
             if (isset($input['action'])) $action = $input['action'];
        }

        if ($action === 'preferences') {
            handleUpdatePreferences($pdo, $userId);
        } else {
            handleUpdate($pdo, $userId);
        }
        break;
    case 'DELETE':
        handleDelete($pdo, $userId);
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method Not Allowed']);
        break;
}

function handleGet($pdo, $userId) {
    // Optional: ?unread_only=true
    $unreadOnly = isset($_GET['unread_only']) && $_GET['unread_only'] === 'true';
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;

    try {
        $sql = "SELECT * FROM notifications WHERE user_id = :uid";
        if ($unreadOnly) {
            $sql .= " AND is_read = 0";
        }
        $sql .= " ORDER BY created_at DESC LIMIT :limit";

        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Map types if necessary or return as is
        echo json_encode($notifications);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function handleCreate($pdo, $userId) {
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['title'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Title is required']);
        return;
    }

    try {
        $sql = "INSERT INTO notifications (user_id, type, category, title, message, link_to, metadata_json, created_at) 
                VALUES (:uid, :type, :category, :title, :message, :link, :meta, NOW())";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':uid' => $userId, // Usually creating for self, or pass target_user_id if admin? 
                               // For now, assume client creates for self OR system usage.
                               // If this is an admin endpoint, we might want target_user_id in body.
            ':type' => $data['type'] ?? 'info',
            ':category' => $data['category'] ?? 'system',
            ':title' => $data['title'],
            ':message' => $data['message'] ?? '',
            ':link' => $data['linkTo'] ?? null,
            ':meta' => isset($data['metadata']) ? json_encode($data['metadata']) : null
        ]);

        echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function handleUpdate($pdo, $userId) {
    $data = json_decode(file_get_contents('php://input'), true) ?? [];
    
    // Allow overrides from GET for simple actions
    $action = $data['action'] ?? $_GET['action'] ?? 'mark_read';
    $id = $data['id'] ?? $_GET['id'] ?? null;

    try {
        if ($action === 'mark_all_read' || $action === 'read_all') {
            $stmt = $pdo->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = :uid AND is_read = 0");
            $stmt->execute([':uid' => $userId]);
            echo json_encode(['success' => true, 'message' => 'All marked as read']);
        } elseif ($action === 'mark_read' || $action === 'read') { // 'read' matches api.ts query param
            if (empty($id)) {
                http_response_code(400);
                echo json_encode(['error' => 'ID missing for mark_read']);
                return;
            }
            $stmt = $pdo->prepare("UPDATE notifications SET is_read = 1 WHERE id = :id AND user_id = :uid");
            $stmt->execute([':id' => $id, ':uid' => $userId]);
            echo json_encode(['success' => true, 'message' => 'Marked as read']);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid action']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function handleDelete($pdo, $userId) {
    $id = $_GET['id'] ?? 0;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing ID']);
        return;
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM notifications WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $userId]);
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function handleGetPreferences($pdo, $userId) {
    try {
        $stmt = $pdo->prepare("SELECT * FROM notification_preferences WHERE user_id = ?");
        $stmt->execute([$userId]);
        $prefs = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$prefs) {
            // Return defaults
            $prefs = [
                'user_id' => $userId,
                'email_enabled' => 1,
                'browser_enabled' => 1,
                'urgent_only' => 0,
                'categories_muted' => '[]'
            ];
        }

        echo json_encode($prefs);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function handleUpdatePreferences($pdo, $userId) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate fields exist in data
    $email = isset($data['email_enabled']) ? (int)$data['email_enabled'] : 1;
    $browser = isset($data['browser_enabled']) ? (int)$data['browser_enabled'] : 1;
    $urgent = isset($data['urgent_only']) ? (int)$data['urgent_only'] : 0;
    $muted = isset($data['categories_muted']) ? json_encode($data['categories_muted']) : '[]';

    try {
        $sql = "INSERT INTO notification_preferences (user_id, email_enabled, browser_enabled, urgent_only, categories_muted)
                VALUES (:uid, :email, :browser, :urgent, :muted)
                ON DUPLICATE KEY UPDATE 
                email_enabled = VALUES(email_enabled),
                browser_enabled = VALUES(browser_enabled),
                urgent_only = VALUES(urgent_only),
                categories_muted = VALUES(categories_muted)";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':uid' => $userId,
            ':email' => $email,
            ':browser' => $browser,
            ':urgent' => $urgent,
            ':muted' => $muted
        ]);

        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>
