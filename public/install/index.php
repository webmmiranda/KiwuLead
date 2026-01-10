<?php
/**
 * KiwüLead Auto-Installer
 * 
 * Enhanced Installer with:
 * - Robust Error Handling
 * - DB Structure Verification
 * - Support User Creation Verification
 * - Logging
 */

session_start();
$step = isset($_GET['step']) ? (int) $_GET['step'] : 1;
$error = '';
$success = '';
$log = [];

// Path definitions
$configFile = __DIR__ . '/../api/db.php';
$sqlFile = __DIR__ . '/../database.sql';
$lockFile = __DIR__ . '/../installed.lock';

function logMsg($msg) {
    global $log;
    $log[] = "[" . date('H:i:s') . "] " . $msg;
}

// Handle Form Submission
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'install') {
    $dbHost = trim($_POST['db_host'] ?? '');
    $dbName = trim($_POST['db_name'] ?? '');
    $dbUser = trim($_POST['db_user'] ?? '');
    $dbPass = trim($_POST['db_pass'] ?? '');
    
    // User Data
    $adminName = trim($_POST['admin_name'] ?? 'Soporte');
    $adminEmail = trim($_POST['admin_email'] ?? '');
    $adminPass = trim($_POST['admin_pass'] ?? '');
    $adminRole = 'Support'; // Enforced per requirements

    logMsg("Iniciando instalación...");

    try {
        // 1. Validar conexión
        logMsg("Conectando a la base de datos...");
        $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName", $dbUser, $dbPass);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        logMsg("Conexión exitosa.");

        // 2. Leer SQL e importar
        if (file_exists($sqlFile)) {
            logMsg("Importando esquema de base de datos...");
            $lines = file($sqlFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            
            // Remove BOM
            if (isset($lines[0])) $lines[0] = preg_replace('/^\xEF\xBB\xBF/', '', $lines[0]);

            $buffer = "";
            $pdo->beginTransaction();

            try {
                foreach ($lines as $line) {
                    $line = trim($line);
                    if (empty($line) || str_starts_with($line, '--') || str_starts_with($line, '#') || str_starts_with($line, '/*')) continue;

                    $buffer .= $line . " ";
                    
                    if (substr($line, -1) === ';') {
                        if (trim($buffer) !== '' && trim($buffer) !== ';') {
                            try {
                                $pdo->exec($buffer);
                            } catch (PDOException $e) {
                                // Ignore "table exists"
                                if ($e->getCode() !== '42S01' && $e->getCode() !== 1050 && !strpos($e->getMessage(), 'already exists')) {
                                    throw $e;
                                }
                            }
                        }
                        $buffer = "";
                    }
                }
                $pdo->commit();
                logMsg("Esquema importado correctamente.");
            } catch (Exception $e) {
                $pdo->rollBack();
                throw new Exception("Error fatal en la importación SQL: " . $e->getMessage());
            }

            // 3. Verificaciones de Estructura
            logMsg("Verificando tablas críticas...");
            $requiredTables = ['users', 'contacts', 'tasks', 'products', 'company_settings'];
            foreach ($requiredTables as $table) {
                $check = $pdo->query("SHOW TABLES LIKE '$table'");
                if ($check->rowCount() == 0) {
                    throw new Exception("La tabla '$table' no se creó correctamente.");
                }
            }
            logMsg("Tablas verificadas.");

            // 4. Crear Usuario Inicial (Soporte)
            if ($adminEmail && $adminPass) {
                logMsg("Creando usuario de Soporte...");
                $hashedPass = password_hash($adminPass, PASSWORD_DEFAULT);
                
                // Check if user exists
                $checkUser = $pdo->prepare("SELECT id FROM users WHERE email = ?");
                $checkUser->execute([$adminEmail]);
                
                if ($checkUser->rowCount() > 0) {
                    $stmt = $pdo->prepare("UPDATE users SET name = ?, password_hash = ?, role = ?, status = 'Active' WHERE email = ?");
                    $stmt->execute([$adminName, $hashedPass, $adminRole, $adminEmail]);
                    logMsg("Usuario existente actualizado.");
                } else {
                    $stmt = $pdo->prepare("INSERT INTO users (name, email, password_hash, role, status, created_at) VALUES (?, ?, ?, ?, 'Active', NOW())");
                    $stmt->execute([$adminName, $adminEmail, $hashedPass, $adminRole]);
                    logMsg("Nuevo usuario creado.");
                }
            } else {
                throw new Exception("Debe proporcionar email y contraseña.");
            }

        } else {
            throw new Exception("No se encontró el archivo database.sql");
        }

        // 5. Escribir archivo de configuración
        logMsg("Escribiendo configuración...");
        $configContent = "<?php\n";
        $configContent .= "// KiwüLead Database Configuration\n";
        $configContent .= "define('DB_HOST', '" . addslashes($dbHost) . "');\n";
        $configContent .= "define('DB_NAME', '" . addslashes($dbName) . "');\n";
        $configContent .= "define('DB_USER', '" . addslashes($dbUser) . "');\n";
        $configContent .= "define('DB_PASS', '" . addslashes($dbPass) . "');\n\n";
        $configContent .= "header('Access-Control-Allow-Origin: *');\n";
        $configContent .= "header('Access-Control-Allow-Headers: Content-Type, Authorization');\n";
        $configContent .= "header('Content-Type: application/json');\n\n";
        $configContent .= "function getDB() {\n";
        $configContent .= "    try {\n";
        $configContent .= "        \$conn = new PDO(\"mysql:host=\" . DB_HOST . \";dbname=\" . DB_NAME, DB_USER, DB_PASS);\n";
        $configContent .= "        \$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);\n";
        $configContent .= "        return \$conn;\n";
        $configContent .= "    } catch(PDOException \$e) {\n";
        $configContent .= "        http_response_code(500);\n";
        $configContent .= "        echo json_encode(['error' => 'Connection failed: ' . \$e->getMessage()]);\n";
        $configContent .= "        exit;\n";
        $configContent .= "    }\n";
        $configContent .= "}\n";

        if (!is_dir(dirname($configFile))) mkdir(dirname($configFile), 0755, true);
        
        if (file_put_contents($configFile, $configContent)) {
            $step = 3;
            file_put_contents($lockFile, 'Installed on ' . date('Y-m-d H:i:s') . "\nLogs:\n" . implode("\n", $log));
            
            // Intentar limpieza
            $deletionWarning = '';
            // (Opcional) Borrar instalador. Por seguridad a veces es mejor dejar que el usuario lo haga o renombrarlo.
            // Mantenemos la lógica de warning si no se puede borrar.
        } else {
            throw new Exception("No se pudo escribir el archivo de configuración.");
        }

    } catch (Exception $e) {
        $error = $e->getMessage();
        logMsg("Error: " . $error);
    }
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Instalador KiwüLead</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>body { font-family: 'Inter', sans-serif; }</style>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen flex items-center justify-center p-4">

    <div class="max-w-xl w-full bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
        <div class="text-center mb-8">
            <h1 class="text-3xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                KiwüLead</h1>
            <p class="text-slate-400 mt-2">Configuración del Sistema</p>
        </div>

        <?php if ($error): ?>
            <div class="bg-red-500/10 border border-red-500 text-red-200 p-4 rounded-xl mb-6 text-sm">
                <strong>Error:</strong> <?php echo htmlspecialchars($error); ?>
            </div>
            <div class="bg-slate-900 p-4 rounded mb-6 text-xs font-mono text-slate-400 overflow-auto max-h-32">
                <?php foreach($log as $l): ?>
                    <div><?php echo htmlspecialchars($l); ?></div>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>

        <?php if ($step === 1): ?>
            <div class="space-y-4">
                <div class="bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/30">
                    <h3 class="font-bold text-indigo-300 mb-2">Requisitos Previos</h3>
                    <ul class="list-disc list-inside text-sm text-slate-400 mt-2 space-y-1">
                        <li>Servidor Web (Apache/Nginx/PHP)</li>
                        <li>MySQL / MariaDB</li>
                        <li>Permisos de escritura en <code>/public/api</code></li>
                    </ul>
                </div>
                <a href="?step=2" class="block w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors">
                    Iniciar Instalación
                </a>
            </div>

        <?php elseif ($step === 2): ?>
            <form method="POST" class="space-y-5">
                <input type="hidden" name="action" value="install">
                
                <div class="space-y-4">
                    <h3 class="font-bold text-slate-200 border-b border-slate-700 pb-2">Base de Datos</h3>
                    <div>
                        <label class="block text-xs font-medium text-slate-400 mb-1">Host</label>
                        <input type="text" name="db_host" value="localhost" class="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-slate-400 mb-1">Nombre BD</label>
                        <input type="text" name="db_name" required placeholder="kiwulead_db" class="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-medium text-slate-400 mb-1">Usuario</label>
                            <input type="text" name="db_user" required class="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-slate-400 mb-1">Contraseña</label>
                            <input type="password" name="db_pass" class="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2">
                        </div>
                    </div>
                </div>

                <div class="space-y-4 pt-4">
                    <h3 class="font-bold text-slate-200 border-b border-slate-700 pb-2">Usuario de Soporte (Admin)</h3>
                    <div>
                        <label class="block text-xs font-medium text-slate-400 mb-1">Nombre</label>
                        <input type="text" name="admin_name" value="Soporte Técnico" class="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-slate-400 mb-1">Email</label>
                        <input type="email" name="admin_email" required class="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-slate-400 mb-1">Contraseña</label>
                        <input type="password" name="admin_pass" required class="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2">
                    </div>
                </div>

                <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl mt-6">
                    Instalar Sistema
                </button>
            </form>

        <?php elseif ($step === 3): ?>
            <div class="text-center space-y-6 py-6">
                <div class="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-500 text-2xl">✓</div>
                <h2 class="text-2xl font-bold text-white">¡Instalación Completada!</h2>
                <div class="text-left bg-slate-900 p-4 rounded text-sm space-y-2">
                    <p class="text-slate-400">Usuario: <span class="text-white"><?php echo htmlspecialchars($_POST['admin_email']); ?></span></p>
                    <p class="text-slate-400">Rol: <span class="text-emerald-400">Support (Admin Privileges)</span></p>
                </div>
                <a href="/" class="block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl">
                    Ir al Dashboard
                </a>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>
