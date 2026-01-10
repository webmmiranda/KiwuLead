<?php
require_once 'db.php';

header('Content-Type: application/json');

try {
    $pdo = getDB();

    // Default Templates
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
            'subject' => 'Bienvenido a KiwüLead',
            'body' => "Hola {{name}},\n\nBienvenido al equipo. Tu cuenta ha sido creada exitosamente.\n\n<b>Tus credenciales de acceso:</b>\nEmail: {{email}}\nContraseña: {{password}}\n\nPuedes ingresar al sistema aquí: <a href='{{url}}'>{{url}}</a>",
            'category' => 'System'
        ]
    ];

    // Get existing settings
    $stmt = $pdo->prepare("SELECT setting_value FROM company_settings WHERE setting_key = 'email_templates'");
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    $existing = [];
    if ($row && $row['setting_value']) {
        $existing = json_decode($row['setting_value'], true) ?? [];
    }

    // Merge defaults (avoid duplicates by name if possible, or just append)
    // Here we will just append if name doesn't exist
    $added = 0;
    foreach ($defaults as $def) {
        $exists = false;
        foreach ($existing as $ex) {
            if ($ex['name'] === $def['name']) {
                $exists = true;
                break;
            }
        }
        if (!$exists) {
            $existing[] = $def;
            $added++;
        }
    }

    if ($added > 0) {
        $update = $pdo->prepare("INSERT INTO company_settings (setting_key, setting_value) VALUES ('email_templates', :value) ON DUPLICATE KEY UPDATE setting_value = :value");
        $update->execute([':value' => json_encode($existing)]);
        echo json_encode(['success' => true, 'message' => 'Templates seeded', 'added' => $added, 'templates' => $existing]);
    } else {
        echo json_encode(['success' => true, 'message' => 'No new templates added', 'added' => 0, 'templates' => $existing]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>