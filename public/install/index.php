<?php
/**
 * NexusCRM Auto-Installer
 * 
 * This script handles:
 * 1. Checks system requirements
 * 2. Form for Database Credentials
 * 3. Writes public/api/db.php
 * 4. Imports public/database.sql
 */

session_start();
$step = isset($_GET['step']) ? (int) $_GET['step'] : 1;
$error = '';
$success = '';

// Path definitions
$configFile = __DIR__ . '/../api/db.php';
$sqlFile = __DIR__ . '/../database.sql';

// Handle Form Submission
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'install') {
    $dbHost = trim($_POST['db_host'] ?? '');
    $dbName = trim($_POST['db_name'] ?? '');
    $dbUser = trim($_POST['db_user'] ?? '');
    $dbPass = trim($_POST['db_pass'] ?? '');
    $appUrl = trim($_POST['app_url'] ?? '');

    // 1. Validar conexión
    try {
        $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName", $dbUser, $dbPass);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        // 2. Leer SQL e importar de manera robusta
        if (file_exists($sqlFile)) {
            // Read file into array to process line by line
            $lines = file($sqlFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            $buffer = "";
            $importErrors = [];

            $pdo->beginTransaction();

            try {
                foreach ($lines as $line) {
                    $line = trim($line);
                    // Skip comments
                    if (empty($line) || str_starts_with($line, '--') || str_starts_with($line, '#') || str_starts_with($line, '/*')) {
                        continue;
                    }

                    $buffer .= $line . " ";
                    
                    // If line ends with semicolon, execute buffer
                    if (substr($line, -1) === ';') {
                        try {
                            $pdo->exec($buffer);
                        } catch (PDOException $e) {
                            // Ignore "table exists" (Code 42S01 or 1050)
                            if ($e->getCode() !== '42S01' && $e->getCode() !== 1050 && !strpos($e->getMessage(), 'already exists')) {
                                throw $e; // Re-throw fatal errors to catch block below
                            }
                        }
                        $buffer = ""; // Reset buffer
                    }
                }
                $pdo->commit();
            } catch (Exception $e) {
                $pdo->rollBack();
                throw new Exception("Error fatal en la importación SQL: " . $e->getMessage());
            }

            // Verify tables exist
            try {
                $check = $pdo->query("SHOW TABLES LIKE 'users'");
                if ($check->rowCount() == 0) {
                    throw new Exception("La tabla 'users' no se creó. Revise los permisos de la base de datos.");
                }
            } catch (Exception $e) {
                throw new Exception("Error verificando tablas: " . $e->getMessage());
            }

        } else {
            throw new Exception("No se encontró el archivo database.sql");
        }

        // 3. Escribir archivo de configuración (API)
        $configContent = "<?php\n";
        $configContent .= "// NexusCRM Database Configuration\n";
        $configContent .= "define('DB_HOST', '" . addslashes($dbHost) . "');\n";
        $configContent .= "define('DB_NAME', '" . addslashes($dbName) . "');\n";
        $configContent .= "define('DB_USER', '" . addslashes($dbUser) . "');\n";
        $configContent .= "define('DB_PASS', '" . addslashes($dbPass) . "');\n\n";

        // CORS & Headers helper
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

        // Create directory if not exists
        if (!is_dir(dirname($configFile))) {
            mkdir(dirname($configFile), 0755, true);
        }

        if (file_put_contents($configFile, $configContent)) {
            $step = 3; // Success
        } else {
            throw new Exception("No se pudo escribir el archivo de configuración en $configFile.");
        }

    } catch (PDOException $e) {
        $error = "Error de Conexión a Base de Datos: " . $e->getMessage();
    } catch (Exception $e) {
        $error = "Error: " . $e->getMessage();
    }
}

?>
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <title>Instalador NexusCRM</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Inter', sans-serif;
        }
    </style>
</head>

<body class="bg-slate-900 text-slate-100 min-h-screen flex items-center justify-center p-4">

    <div class="max-w-xl w-full bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
        <div class="text-center mb-8">
            <h1 class="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
                NexusCRM</h1>
            <p class="text-slate-400 mt-2">Asistente de Instalación</p>
        </div>

        <?php if ($error): ?>
            <div class="bg-red-500/10 border border-red-500 text-red-200 p-4 rounded-xl mb-6 text-sm">
                <strong>Error:</strong> <?php echo htmlspecialchars($error); ?>
            </div>
        <?php endif; ?>

        <?php if ($step === 1): ?>
            <div class="space-y-4">
                <div class="bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/30">
                    <h3 class="font-bold text-indigo-300 mb-2">👋 Bienvenido</h3>
                    <p class="text-sm text-slate-300">Este asistente configurará tu CRM. Necesitas:</p>
                    <ul class="list-disc list-inside text-sm text-slate-400 mt-2 space-y-1">
                        <li>Una base de datos MySQL vacía.</li>
                        <li>Usuario y contraseña de la base de datos.</li>
                        <li>Permisos de escritura en la carpeta del servidor.</li>
                    </ul>
                </div>
                <a href="?step=2"
                    class="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors">
                    Comenzar Instalación →
                </a>
            </div>

        <?php elseif ($step === 2): ?>
            <form method="POST" class="space-y-5">
                <input type="hidden" name="action" value="install">

                <div>
                    <label class="block text-sm font-medium text-slate-400 mb-1">Servidor de Base de Datos</label>
                    <input type="text" name="db_host" value="localhost"
                        class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-400 mb-1">Usuario BD</label>
                        <input type="text" name="db_user" required
                            class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="root">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-400 mb-1">Contraseña BD</label>
                        <input type="password" name="db_pass"
                            class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="">
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium text-slate-400 mb-1">Nombre Base de Datos</label>
                    <input type="text" name="db_name" required
                        class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="nexuscrm_db">
                </div>

                <div class="border-t border-slate-700 my-6"></div>

                <h3 class="font-bold text-indigo-300 mb-4">👤 Cuenta de Usuario Inicial</h3>
                
                <div>
                    <label class="block text-sm font-medium text-slate-400 mb-1">Nombre Completo</label>
                    <input type="text" name="admin_name" required
                        class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Soporte Técnico">
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-400 mb-1">Email (Usuario)</label>
                        <input type="email" name="admin_email" required
                            class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="soporte@empresa.com">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-400 mb-1">Contraseña</label>
                        <input type="password" name="admin_pass" required
                            class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="******">
                    </div>
                </div>
                
                <!-- Hidden field to force Support role as requested -->
                <input type="hidden" name="admin_role" value="Support">

                <div class="pt-4">
                    <button type="submit"
                        class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                        Instalar Ahora
                    </button>
                    <a href="?step=1" class="block text-center text-slate-500 text-sm mt-4 hover:underline">Volver</a>
                </div>
            </form>

        <?php elseif ($step === 3): ?>
            <div class="text-center space-y-6 py-6">
                <div class="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                    <svg class="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                </div>
                <div>
                    <h2 class="text-2xl font-bold text-white">¡Instalación Exitosa!</h2>
                    <p class="text-slate-400 mt-2">La base de datos se ha importado y la configuración guardada.</p>
                </div>

                <div class="bg-slate-900/50 p-4 rounded-xl text-left text-sm border border-slate-700">
                    <p class="text-slate-300 font-bold mb-1">Tus credenciales:</p>
                    <p class="text-slate-400">Usuario: <span class="text-white font-mono"><?php echo htmlspecialchars($_POST['admin_email']); ?></span></p>
                    <p class="text-slate-400">Rol: <span class="text-emerald-400 font-mono"><?php echo htmlspecialchars($_POST['admin_role']); ?></span></p>
                </div>

                <div class="pt-4">
                    <a href="/"
                        class="block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors">
                        Ir al CRM
                    </a>
                    <p class="text-xs text-slate-500 mt-4">Nota: Por seguridad, elimina la carpeta /install después de
                        verificar.</p>
                </div>
            </div>
        <?php endif; ?>

    </div>
</body>

</html>