<?php
require_once 'db.php';

class TemplateHelper {
    private $pdo;
    private $branding;

    public function __construct($pdo) {
        $this->pdo = $pdo;
        $this->loadBranding();
    }

    private function loadBranding() {
        $stmt = $this->pdo->prepare("SELECT setting_value FROM company_settings WHERE setting_key = 'company_profile'");
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $this->branding = $row ? json_decode($row['setting_value'], true) : [];
    }

    public function getBranding() {
        return $this->branding;
    }

    public function render($templateName, $data) {
        // 1. Fetch Templates
        $stmt = $this->pdo->prepare("SELECT setting_value FROM company_settings WHERE setting_key = 'email_templates'");
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $templates = $row ? json_decode($row['setting_value'], true) : [];

        $template = null;
        if (is_array($templates)) {
            foreach ($templates as $t) {
                if (isset($t['name']) && $t['name'] === $templateName && isset($t['category']) && $t['category'] === 'System') {
                    $template = $t;
                    break;
                }
            }
        }

        // Fallback defaults if not found in DB
        if (!$template) {
            $template = $this->getDefaultTemplate($templateName);
        }

        if (!$template) {
            // Last resort generic
            $template = [
                'subject' => 'Notificación del Sistema',
                'body' => implode("\n", array_map(function($k, $v) { return "$k: $v"; }, array_keys($data), $data))
            ];
        }

        // 2. Replace variables in Body and Subject
        $subject = $this->replaceVars($template['subject'], $data);
        
        // Convert newlines to <br> if it's plain text, but if it looks like HTML, leave it?
        // Simple heuristic: if it contains <br> or <p>, assume HTML.
        $bodyRaw = $this->replaceVars($template['body'], $data);
        $bodyContent = (strpos($bodyRaw, '<') !== false) ? $bodyRaw : nl2br($bodyRaw);

        // 3. Wrap in Branding HTML
        $html = $this->applyBranding($bodyContent, $subject);

        return ['subject' => $subject, 'html' => $html];
    }

    private function replaceVars($text, $data) {
        foreach ($data as $key => $value) {
            $text = str_replace("{{" . $key . "}}", $value, $text);
        }
        return $text;
    }

    private function getDefaultTemplate($name) {
        if ($name === 'Welcome User') {
            return [
                'subject' => 'Bienvenido a Nexus CRM',
                'body' => "Hola {{name}},<br><br>Bienvenido al equipo. Tu cuenta ha sido creada exitosamente.<br><br><b>Tus credenciales de acceso:</b><br>Email: {{email}}<br>Contraseña: {{password}}<br><br>Puedes ingresar al sistema aquí: <a href='{{url}}'>{{url}}</a>"
            ];
        }
        if ($name === 'Password Reset') {
            return [
                'subject' => 'Recuperación de Contraseña',
                'body' => "Hola,<br><br>Hemos recibido una solicitud para restablecer tu contraseña.<br><br><a href='{{link}}' style='display:inline-block; padding:10px 20px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 5px;'>Restablecer Contraseña</a><br><br>O copia este enlace en tu navegador:<br>{{link}}<br><br>Si no realizaste esta solicitud, puedes ignorar este mensaje."
            ];
        }
        return null;
    }

    private function applyBranding($content, $title) {
        $primary = $this->branding['primaryColor'] ?? '#2563EB';
        $secondary = $this->branding['secondaryColor'] ?? '#F8FAFC';
        $footer = $this->branding['emailFooter'] ?? ("© " . date('Y') . " " . ($this->branding['name'] ?? 'Nexus CRM') . ". Todos los derechos reservados.");
        $companyName = $this->branding['name'] ?? 'Nexus CRM';

        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <style>
                body { font-family: sans-serif; margin: 0; padding: 0; background-color: #f1f5f9; }
                .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
                .header { background-color: $secondary; padding: 20px; border-bottom: 1px solid #e2e8f0; border-top: 5px solid $primary; }
                .company-name { font-size: 20px; font-weight: bold; color: #1e293b; }
                .content { padding: 40px; color: #334155; line-height: 1.6; }
                .footer { padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; background-color: #f8fafc; border-top: 1px solid #e2e8f0; }
                a { color: $primary; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <div class='company-name'>$companyName</div>
                </div>
                <div class='content'>
                    <h2 style='margin-top:0; color: #1e293b;'>$title</h2>
                    $content
                </div>
                <div class='footer'>
                    " . nl2br($footer) . "
                </div>
            </div>
        </body>
        </html>
        ";
    }
}
?>
