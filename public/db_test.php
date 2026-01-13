<?php
/**
 * Standalone Database Connection Tester
 * Upload this file to your server and access it directly to test credentials.
 * e.g. yourdomain.com/db_test.php
 */
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Prueba de Conexión BD</title>
    <style>
        body { font-family: sans-serif; padding: 20px; background: #f0f2f5; }
        .container { max-width: 500px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        input { width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
        button { width: 100%; padding: 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #0056b3; }
        .result { margin-top: 20px; padding: 10px; border-radius: 4px; }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Prueba de Conexión MySQL</h2>
        <form method="POST">
            <label>Host (Servidor)</label>
            <input type="text" name="host" value="<?php echo $_POST['host'] ?? 'localhost'; ?>">
            
            <label>Nombre de Base de Datos</label>
            <input type="text" name="name" value="<?php echo $_POST['name'] ?? ''; ?>" placeholder="ej. mi_usuario_crm">
            
            <label>Usuario</label>
            <input type="text" name="user" value="<?php echo $_POST['user'] ?? ''; ?>">
            
            <label>Contraseña</label>
            <input type="password" name="pass" value="<?php echo $_POST['pass'] ?? ''; ?>">
            
            <button type="submit">Probar Conexión</button>
        </form>

        <?php
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $host = $_POST['host'];
            $name = $_POST['name'];
            $user = $_POST['user'];
            $pass = $_POST['pass'];

            echo '<div class="result">';
            try {
                $dsn = "mysql:host=$host;dbname=$name;charset=utf8mb4";
                $options = [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ];
                
                $pdo = new PDO($dsn, $user, $pass, $options);
                
                echo '<div class="success">';
                echo "✅ <strong>¡Conexión Exitosa!</strong><br>";
                echo "Se ha conectado correctamente a la base de datos '$name'.<br><br>";
                
                $stmt = $pdo->query("SHOW TABLES");
                $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
                echo "Tablas encontradas: " . count($tables) . "<br>";
                if (count($tables) > 0) {
                    echo "<small>" . implode(", ", array_slice($tables, 0, 5)) . (count($tables) > 5 ? "..." : "") . "</small>";
                } else {
                    echo "<small>La base de datos está vacía.</small>";
                }
                echo '</div>';
                
            } catch (PDOException $e) {
                echo '<div class="error">';
                echo "❌ <strong>Error de Conexión:</strong><br>";
                echo htmlspecialchars($e->getMessage()) . "<br><br>";
                
                if ($e->getCode() == 1045) {
                    echo "<strong>Diagnóstico:</strong> Usuario o contraseña incorrectos. Verifica también si el usuario tiene permisos para acceder desde este servidor.";
                } elseif ($e->getCode() == 1049) {
                    echo "<strong>Diagnóstico:</strong> La base de datos '$name' no existe.";
                } elseif ($e->getCode() == 2002) {
                    echo "<strong>Diagnóstico:</strong> No se encuentra el servidor '$host'. Intenta con '127.0.0.1' o verifica el nombre del host.";
                }
                echo '</div>';
            }
            echo '</div>';
        }
        ?>
    </div>
</body>
</html>
