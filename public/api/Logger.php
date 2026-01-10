<?php
// Logger Helper Class
// Facilita la escritura en audit_logs y api_stats

require_once 'db.php';

class Logger {
    private static $pdo;

    private static function getPDO() {
        if (!self::$pdo) {
            // Use a new connection for logging to avoid interfering with main transaction or fetch state
            // But reuse logic from db.php
            try {
                self::$pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
                self::$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_SILENT); // Silent to avoid polluting output
            } catch(PDOException $e) {
                // If logging DB fails, we can't do much, but we MUST NOT output anything
                return null;
            }
        }
        return self::$pdo;
    }

    /**
     * Registra una acción de auditoría
     * @param int|null $userId ID del usuario (null si es sistema/anónimo)
     * @param string $action Acción realizada (ej. 'LOGIN', 'CREATE_CONTACT')
     * @param string $entityType Tipo de entidad (ej. 'contact', 'deal')
     * @param string|int|null $entityId ID de la entidad
     * @param mixed $details Array o string con detalles adicionales
     */
    public static function audit($userId, $action, $entityType, $entityId = null, $details = null) {
        try {
            $pdo = self::getPDO();
            if (!$pdo) return;

            $stmt = $pdo->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)");
            
            $detailsStr = is_array($details) || is_object($details) ? json_encode($details) : $details;
            $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

            $stmt->execute([$userId, $action, $entityType, $entityId, $detailsStr, $ip]);
        } catch (Exception $e) {
            // Silenciar errores de log para no interrumpir el flujo principal
            // error_log("Error logging audit: " . $e->getMessage()); // Commented out to prevent pollution
        }
    }

    /**
     * Registra estadísticas de la API
     * @param string $endpoint Endpoint llamado
     * @param string $method Método HTTP
     * @param int $statusCode Código de respuesta
     * @param float $durationMs Duración en milisegundos
     * @param int|null $userId ID del usuario
     */
    public static function stat($endpoint, $method, $statusCode, $durationMs, $userId = null) {
        try {
            $pdo = self::getPDO();
            if (!$pdo) return;

            $stmt = $pdo->prepare("INSERT INTO api_stats (endpoint, method, status_code, duration_ms, user_id, ip_address) VALUES (?, ?, ?, ?, ?, ?)");
            
            $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

            $stmt->execute([$endpoint, $method, $statusCode, $durationMs, $userId, $ip]);
        } catch (Exception $e) {
            // error_log("Error logging stat: " . $e->getMessage());
        }
    }
}
