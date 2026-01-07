# Plan de Verificación y Puesta a Punto para Producción

Para garantizar que NexusCRM sea **100% operativo y seguro** para tu empresa, debemos abordar dos brechas críticas que he identificado: la seguridad del inicio de sesión y la carga real de archivos (documentos).

Actualmente, el sistema funciona lógicamente (los datos se guardan), pero **no es seguro** para exponerlo a Internet y le falta la capacidad de adjuntar archivos reales a los clientes.

## 1. Auditoría de Estado Actual
| Característica | Estado | Diagnóstico |
| :--- | :--- | :--- |
| **Contactos y Pipeline** | ✅ Operativo | Usa base de datos real (MySQL). |
| **Analítica** | ✅ Operativo | Reportes con datos reales y filtros funcionales. |
| **Autenticación** | ⚠️ **Inseguro** | El sistema acepta cualquier contraseña en algunos puntos y no valida sesiones reales (Token Simulado). |
| **Archivos/Documentos** | ❌ **No Implementado** | No se pueden subir PDFs o imágenes. Solo acepta enlaces de texto. |
| **Seguridad API** | ⚠️ **Crítico** | Los endpoints (API) están públicos sin protección real. |

## 2. Plan de Acción Inmediato (Puesta a Punto)

### Paso 1: Blindar la Seguridad (Autenticación Real)
Implementaremos un sistema de seguridad estándar de industria (JWT) para que nadie pueda acceder a tus datos sin iniciar sesión.
1.  Modificar `auth.php` para generar tokens reales y seguros.
2.  Crear un "guardián" (`auth_middleware.php`) que proteja todos los archivos PHP.
3.  Actualizar el frontend para enviar este token en cada petición.

### Paso 2: Activar Carga de Archivos
Habilitaremos la subida de documentos (contratos, cotizaciones) y fotos de perfil.
1.  Crear script `upload.php` en el servidor para recibir archivos.
2.  Crear carpeta segura `public/uploads/` con permisos correctos.
3.  Añadir botón "Subir Archivo" en la ficha del Contacto.

### Paso 3: Lista de Verificación Final (UAT)
Una vez aplicados los cambios, realizaremos esta prueba juntos:
1.  **Login**: Intentar entrar con contraseña incorrecta (debe fallar).
2.  **Persistencia**: Cerrar sesión, recargar página (debe pedir login de nuevo o mantener sesión válida).
3.  **Ciclo de Vida**: Crear Lead -> Subir PDF (Cotización) -> Mover a Ganado -> Verificar que el PDF sigue ahí.
4.  **Seguridad**: Intentar acceder a la API directamente sin permiso (debe bloquearse).

## ¿Procedemos?
Si das luz verde, comenzaré inmediatamente con el **Paso 1 (Seguridad)** y **Paso 2 (Archivos)** para dejarlo listo hoy mismo.