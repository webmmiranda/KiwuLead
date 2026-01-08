<?php
// public/api/settings.php
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
        handlePost($pdo); // Create or Update
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method Not Allowed']);
        break;
}

function handleGet($pdo)
{
    try {
        $stmt = $pdo->query("SELECT setting_key, setting_value FROM company_settings");
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $settings = [];
        foreach ($results as $row) {
            $settings[$row['setting_key']] = json_decode($row['setting_value'], true) ?? $row['setting_value'];
        }

        // Seed default email templates if missing
        if (!isset($settings['email_templates']) || empty($settings['email_templates'])) {
            $defaults = [
                [
                    'id' => uniqid('tpl_'),
                    'name' => 'Bienvenida General',
                    'subject' => 'Bienvenido a {{company}}',
                    'body' => "Hola {{name}},\n\nGracias por tu interés en nuestros servicios. Soy {{user_name}} y seré tu contacto principal.\n\nMe gustaría agendar una breve llamada para entender mejor tus necesidades.\n\nSaludos,\n{{user_name}}\n{{user_email}}",
                    'category' => 'Sales'
                ],
                [
                    'id' => uniqid('tpl_'),
                    'name' => 'Seguimiento de Propuesta',
                    'subject' => 'Seguimiento: Propuesta para {{company}}',
                    'body' => "Hola {{name}},\n\nTe escribo para saber si tuviste oportunidad de revisar la propuesta que te envié anteriormente.\n\n¿Tienes alguna duda o comentario?\n\nQuedo atento,\n{{user_name}}",
                    'category' => 'Follow-up'
                ],
                [
                    'id' => uniqid('tpl_'),
                    'name' => 'Solicitud de Reunión',
                    'subject' => 'Reunión rápida esta semana',
                    'body' => "Hola {{name}},\n\nEspero que estés bien.\n\nMe gustaría robarte 15 minutos esta semana para mostrarte cómo podemos ayudar a tu empresa.\n\n¿Qué tal te viene el martes o jueves por la mañana?\n\nSaludos,\n{{user_name}}",
                    'category' => 'Sales'
                ],
                [
                    'id' => uniqid('tpl_'),
                    'name' => 'Soporte Recibido',
                    'subject' => 'Hemos recibido tu solicitud',
                    'body' => "Hola {{name}},\n\nHemos recibido tu solicitud de soporte y un agente la revisará pronto.\n\nTe mantendremos informado.\n\nEquipo de Soporte\n{{company}}",
                    'category' => 'Support'
                ],
                [
                    'id' => uniqid('tpl_'),
                    'name' => 'Cierre de Trato',
                    'subject' => 'Pasos siguientes para tu cuenta',
                    'body' => "Hola {{name}},\n\n¡Es un placer darte la bienvenida oficial!\n\nAdjunto encontrarás los detalles para comenzar.\n\nEstamos emocionados de trabajar contigo.\n\nSaludos,\n{{user_name}}",
                    'category' => 'Sales'
                ],
                // System Templates
                [
                    'id' => uniqid('tpl_'),
                    'name' => 'Password Reset',
                    'subject' => 'Recuperación de Contraseña',
                    'body' => "Hola,\n\nHemos recibido una solicitud para restablecer tu contraseña.\n\n<a href='{{link}}' style='display:inline-block; padding:10px 20px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 5px;'>Restablecer Contraseña</a>\n\nO copia este enlace en tu navegador:\n{{link}}\n\nSi no realizaste esta solicitud, puedes ignorar este mensaje.",
                    'category' => 'System'
                ],
                [
                    'id' => uniqid('tpl_'),
                    'name' => 'Welcome User',
                    'subject' => 'Bienvenido a Nexus CRM',
                    'body' => "Hola {{name}},\n\nBienvenido al equipo. Tu cuenta ha sido creada exitosamente.\n\n<b>Tus credenciales de acceso:</b>\nEmail: {{email}}\nContraseña: {{password}}\n\nPuedes ingresar al sistema aquí: <a href='{{url}}'>{{url}}</a>",
                    'category' => 'System'
                ]
            ];

            // Persist defaults
            $insert = $pdo->prepare("INSERT INTO company_settings (setting_key, setting_value) VALUES ('email_templates', :value)
                ON DUPLICATE KEY UPDATE setting_value = :value");
            $insert->execute([':value' => json_encode($defaults)]);
            $settings['email_templates'] = $defaults;
        }

        echo json_encode($settings);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function handlePost($pdo)
{
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['key'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Key is required']);
        return;
    }

    $key = $data['key'];
    $value = json_encode($data['value']); // Store everything as JSON string

    try {
        // Check if key exists
        $check = $pdo->prepare("SELECT setting_key FROM company_settings WHERE setting_key = :key");
        $check->execute([':key' => $key]);
        $exists = $check->fetch();

        if ($exists) {
            // Update
            $sql = "UPDATE company_settings SET setting_value = :value WHERE setting_key = :key";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':key' => $key, ':value' => $value]);
        } else {
            // Insert
            $sql = "INSERT INTO company_settings (setting_key, setting_value) VALUES (:key, :value)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':key' => $key, ':value' => $value]);
        }

        echo json_encode(['success' => true, 'message' => 'Setting saved']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>
