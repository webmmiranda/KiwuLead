He integrado la funcionalidad de **Auto-Actualización (GitHub/ZIP)** al plan.

### 1. Sistema de Actualizaciones (Nuevo Módulo Backend/Frontend)
Implementaré un gestor de actualizaciones en la sección de Soporte:

*   **Vía GitHub (`webmmiranda/NexusCRM`)**:
    *   Crearé un endpoint en PHP (`api/system_update.php`) capaz de ejecutar comandos `git`.
    *   **Botón "Verificar"**: Consultará si hay cambios nuevos en el repositorio remoto.
    *   **Botón "Actualizar"**: Ejecutará `git pull` para descargar y reemplazar los archivos automáticamente.
*   **Vía Archivo ZIP**:
    *   Opción para subir un `.zip` manualmente.
    *   El sistema lo descomprimirá y sobreescribirá los archivos del sistema (útil si el servidor no tiene acceso a Git).

### 2. Base de Datos y Roles (Super-Admin)
*   **Primer Usuario = Soporte**: Ajuste en `database.sql` para que la instalación por defecto sea rol Soporte.
*   **Autenticación**: Habilitar rol `SUPPORT` en todo el sistema.

### 3. Herramientas de Soporte (Frontend)
*   **Modo "Entrar Como"**:
    *   Permitirá a Soporte tomar la identidad de cualquier Gerente/Vendedor desde la lista de usuarios.
    *   Banner de "Modo Impersonación" en la parte superior para salir fácilmente.
*   **Panel de Logs y Bugs**:
    *   Visualizador de archivos de log (ej. `php_errors.log` o logs personalizados de la DB) para diagnóstico.

### 4. Estructura de Navegación
*   **Soporte**: Ve TODO (Menú Principal + Gerencia + Sección Soporte).
*   **Gerencia**: Ve Menú Principal + Gerencia.
*   **Ventas**: Ve Menú Principal.

### Archivos a Crear/Modificar:
1.  `public/api/system_update.php` (Nuevo: Lógica Git/Zip)
2.  `components/SupportPanel.tsx` (Nuevo: UI de Updates y Logs)
3.  `App.tsx` (Lógica de Impersonación y Rutas)
4.  `components/Sidebar.tsx` & `Settings.tsx` (UI de acceso)
5.  `public/database.sql` & `api/auth.php` (Configuración base)
