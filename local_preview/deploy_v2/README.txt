INSTRUCCIONES DE DESPLIEGUE

1. Archivos Web:
   - Sube todo el contenido de la carpeta 'public_html' a la carpeta 'public_html' (o 'www') de tu servidor.

2. Configuración:
   - Sube el archivo 'api_config.php' a la carpeta ANTERIOR a 'public_html' (la raíz de tu usuario, fuera del acceso web).
   - Edita 'api_config.php' con los datos reales de tu base de datos de producción.
   - NOTA: Si no puedes subir archivos fuera de public_html, sube 'api_config.php' dentro de 'public_html' y edita 'api/db.php' para cambiar la ruta de:
     require_once __DIR__ . '/../../api_config.php';
     a:
     require_once __DIR__ . '/../api_config.php';

3. Base de Datos:
   - Crea una nueva base de datos en tu servidor.
   - Importa el archivo 'database.sql' usando phpMyAdmin o CLI.

4. Permisos:
   - Asegúrate de que las carpetas 'uploads' y 'track' tengan permisos de escritura (755 o 777 según tu hosting).

