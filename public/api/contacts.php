<?php
// public/api/contacts.php
require_once 'db.php';
require_once 'middleware.php';
requireAuth();

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDB();

switch ($method) {
    case 'GET':
        handleGet($pdo);
        break;
    case 'POST':
        handleCreate($pdo);
        break;
    case 'PUT':
        handleUpdate($pdo);
        break;
    case 'DELETE':
        handleDelete($pdo);
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method Not Allowed']);
        break;
}

function handleGet($pdo)
{
    try {
        // 1. Fetch all contacts with owner info in ONE query
        $stmt = $pdo->query("SELECT c.*, u.name as owner_name FROM contacts c LEFT JOIN users u ON c.owner_id = u.id ORDER BY c.last_activity_at DESC");
        $contacts = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($contacts)) {
            echo json_encode([]);
            return;
        }

        // 2. Extract IDs for batch fetching
        $contactIds = array_column($contacts, 'id');
        $inQuery = implode(',', array_fill(0, count($contactIds), '?'));

        // 3. Batch fetch Notes
        $notesSql = "
            SELECT n.*, u.name as author_name 
            FROM contact_notes n 
            LEFT JOIN users u ON n.author_id = u.id 
            WHERE n.contact_id IN ($inQuery) 
            ORDER BY n.created_at DESC
        ";
        $notesStmt = $pdo->prepare($notesSql);
        $notesStmt->execute($contactIds);
        $allNotes = $notesStmt->fetchAll(PDO::FETCH_ASSOC);

        // Group notes by contact_id
        $notesByContact = [];
        foreach ($allNotes as $note) {
            $notesByContact[$note['contact_id']][] = [
                'id' => (string) $note['id'],
                'content' => $note['content'],
                'author' => $note['author_name'] ?? 'Unknown',
                'createdAt' => $note['created_at']
            ];
        }

        // 4. Batch fetch History
        $historySql = "
            SELECT * FROM contact_history 
            WHERE contact_id IN ($inQuery) 
            ORDER BY created_at ASC
        ";
        $historyStmt = $pdo->prepare($historySql);
        $historyStmt->execute($contactIds);
        $allHistory = $historyStmt->fetchAll(PDO::FETCH_ASSOC);

        // Group history by contact_id
        $historyByContact = [];
        foreach ($allHistory as $h) {
            $historyByContact[$h['contact_id']][] = [
                'id' => (string) $h['id'],
                'sender' => $h['sender'],
                'type' => $h['type'],
                'channel' => $h['channel'],
                'content' => $h['content'],
                'subject' => $h['subject'],
                'timestamp' => $h['created_at']
            ];
        }

        // 5. Map data efficiently in memory
        $mappedContacts = array_map(function ($c) use ($notesByContact, $historyByContact) {
            return [
                'id' => (string) $c['id'],
                'name' => $c['name'],
                'company' => $c['company'],
                'email' => $c['email'],
                'phone' => $c['phone'],
                'status' => $c['status'],
                'source' => $c['source'],
                'owner' => $c['owner_name'] ?? 'Unassigned',
                'value' => (float) $c['value'],
                'probability' => (int) $c['probability'],
                'tags' => json_decode($c['tags'] ?? '[]') ?? [],
                'bant' => json_decode($c['bant_json'] ?? 'null', true),
                'documents' => json_decode($c['documents_json'] ?? '[]', true) ?? [],
                'wonData' => json_decode($c['won_data_json'] ?? 'null', true),
                'productInterests' => json_decode($c['product_interests_json'] ?? '[]', true) ?? [],
                'lastActivity' => $c['last_activity_at'],
                'notes' => $notesByContact[$c['id']] ?? [],
                'history' => $historyByContact[$c['id']] ?? []
            ];
        }, $contacts);

        echo json_encode($mappedContacts);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function handleCreate($pdo)
{
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['name'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Name is required']);
        return;
    }

    try {
        // Validate Status Enum
        $validStatuses = ['New', 'Contacted', 'Qualified', 'Negotiation', 'Won', 'Lost'];
        $status = in_array($data['status'] ?? '', $validStatuses) ? $data['status'] : 'New';

        // Set owner_id (default to current user if not provided)
        global $currentUser;
        $ownerId = $data['owner_id'] ?? $currentUser->id ?? null;

        $stmt = $pdo->prepare("INSERT INTO contacts (name, company, email, phone, status, source, value, currency, tags, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        $stmt->execute([
            $data['name'],
            $data['company'] ?? '',
            $data['email'] ?? '',
            $data['phone'] ?? '',
            $status,
            $data['source'] ?? 'Website',
            $data['value'] ?? 0.00,
            $data['currency'] ?? 'USD',
            json_encode($data['tags'] ?? []),
            $ownerId
        ]);

        $id = $pdo->lastInsertId();
        
        // Return full contact object
        echo json_encode([
            'success' => true,
            'contact' => [
                'id' => (string)$id,
                'name' => $data['name'],
                'company' => $data['company'] ?? '',
                'email' => $data['email'] ?? '',
                'phone' => $data['phone'] ?? '',
                'status' => $status,
                'source' => $data['source'] ?? 'Website',
                'value' => (float)($data['value'] ?? 0),
                'currency' => $data['currency'] ?? 'USD',
                'tags' => $data['tags'] ?? [],
                'ownerId' => $ownerId,
                'lastActivity' => date('Y-m-d H:i:s'),
                'notes' => [],
                'history' => []
            ]
        ]);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create contact: ' . $e->getMessage()]);
    }
}

function handleUpdate($pdo)
{
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $_GET['id'] ?? null;

    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID required']);
        return;
    }

    // Check old status for trigger
    $oldStatus = null;
    try {
        $stmt = $pdo->prepare("SELECT status FROM contacts WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $oldStatus = $stmt->fetchColumn();
    } catch (Exception $e) { }

    // Dynamic Update Query
    $fields = [];
    $params = [':id' => $id];

    $allowed = ['name', 'company', 'email', 'phone', 'status', 'owner_id', 'value', 'probability', 'lost_reason', 'tags', 'bant', 'documents', 'wonData', 'productInterests'];

    foreach ($data as $key => $val) {
        if (in_array($key, $allowed)) {
            $dbKey = $key;
            if ($key === 'bant') $dbKey = 'bant_json';
            if ($key === 'documents') $dbKey = 'documents_json';
            if ($key === 'wonData') $dbKey = 'won_data_json';
            if ($key === 'productInterests') $dbKey = 'product_interests_json';

            $fields[] = "$dbKey = :$key";
            
            if (in_array($key, ['tags', 'bant', 'documents', 'wonData', 'productInterests']))
                $val = json_encode($val);
            
            $params[":$key"] = $val;
        }
    }

    if (empty($fields)) {
        echo json_encode(['success' => true, 'message' => 'Nothing to update']);
        return;
    }

    try {
        $sql = "UPDATE contacts SET " . implode(', ', $fields) . ", last_activity_at = NOW() WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        // --- AUTOMATION HOOKS ---
        if (isset($data['status']) && $data['status'] !== $oldStatus) {
            checkAutomationRules($pdo, 'ON_STATUS_CHANGE', $id, $data);
            
            if ($data['status'] === 'Won') {
                checkAutomationRules($pdo, 'ON_DEAL_WON', $id, $data);
            }
            if ($data['status'] === 'Lost') {
                checkAutomationRules($pdo, 'ON_DEAL_LOST', $id, $data);
            }
        }

        // Audit Log
        global $currentUser;
        Logger::audit($currentUser->sub ?? null, 'UPDATE_CONTACT', 'contact', $id, $fields);

        echo json_encode(['success' => true, 'message' => 'Contact updated']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function handleDelete($pdo)
{
    $id = $_GET['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID required']);
        return;
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM contacts WHERE id = :id");
        $stmt->execute([':id' => $id]);

        // Audit Log
        global $currentUser;
        Logger::audit($currentUser->sub ?? null, 'DELETE_CONTACT', 'contact', $id, 'Contact deleted');

        echo json_encode(['success' => true, 'message' => 'Contact deleted']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

// --- AUTOMATION ENGINE (SIMPLE VERSION) ---
function checkAutomationRules($pdo, $trigger, $contactId, $data) {
    try {
        // 1. Fetch active rules for this trigger
        $stmt = $pdo->prepare("SELECT * FROM automation_rules WHERE trigger_event = :trigger AND is_active = 1");
        $stmt->execute([':trigger' => $trigger]);
        $rules = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($rules)) return;

        foreach ($rules as $rule) {
            // Log the execution
            $logMsg = "Automation Rule Triggered: " . $rule['name'];
            $noteStmt = $pdo->prepare("INSERT INTO contact_notes (contact_id, content, author_id) VALUES (:id, :content, 1)");
            $noteStmt->execute([':id' => $contactId, ':content' => "⚡ System: $logMsg"]);

            // Execute Logic (Placeholder for now)
            // In a real system, we would parse $rule['config_json'] and do things like:
            // - Send Email
            // - Create Task
            // - Update Field
            
            // Example: If rule name contains "Email", try to send welcome email
            if (stripos($rule['name'], 'Email') !== false && !empty($data['email'])) {
                // Mock sending email by creating a task
                $taskSql = "INSERT INTO tasks (title, type, status, priority, related_contact_id) 
                            VALUES (:title, 'Email', 'Pending', 'High', :cid)";
                $taskStmt = $pdo->prepare($taskSql);
                $taskStmt->execute([
                    ':title' => "Auto-Email: " . $rule['name'],
                    ':cid' => $contactId
                ]);
            }
        }

    } catch (Exception $e) {
        // Silently fail or log to error log, don't stop main flow
        error_log("Automation Error: " . $e->getMessage());
    }
}
?>