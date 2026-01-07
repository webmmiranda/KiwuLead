He realizado una auditoría forense completa comparando el Frontend (React), la API (PHP) y la Base de Datos (MySQL). Aquí están los hallazgos críticos y el plan de acción para tener todo listo esta semana.

### 🕵️‍♂️ Hallazgos de la Auditoría (Missing Links)

1.  **Datos de Ventas ("Won Data") 🔴 CRÍTICO**
    *   **Frontend:** `Reports.tsx` intenta calcular ingresos basados en ventas cerradas (`wonData`), pero...
    *   **Base de Datos:** No existen las columnas `won_data_json` ni `product_interests_json` en la tabla `contacts`.
    *   **Consecuencia:** Si recargas la página, pierdes el detalle de qué productos se vendieron y a qué precio real, rompiendo los reportes financieros.

2.  **Probabilidad del Pipeline ⚠️ IMPORTANTE**
    *   **Base de Datos:** La tabla `pipeline_stages` TIENE la columna `probability`.
    *   **API (`pipeline.php`):** NO está guardando este dato cuando creas o editas una etapa.
    *   **Consecuencia:** El "Forecast Ponderado" siempre da 0 o datos incorrectos porque el backend ignora la probabilidad configurada.

3.  **Automatización "Fantasma" 👻**
    *   **Frontend:** Tienes un panel de Automatización increíble (`Automation.tsx`).
    *   **Backend:** No existe lógica de ejecución. Las reglas se guardan en la configuración, pero nada las dispara.
    *   **Consecuencia:** Si activas "Enviar correo de bienvenida al crear Lead", no pasa nada.

4.  **Sincronización de Tareas y Citas ✅**
    *   Están bien conectadas (`tasks.php`, `appointments.php`), pero aseguraremos que los vínculos con contactos sean robustos.

---

### 🚀 Plan de Acción: "Conexión Total"

Ejecutaré este plan secuencial para conectar todos los cables sueltos:

#### **Fase 1: Infraestructura de Datos (Base de Datos)**
1.  **Migración de Contactos:** Crear script para añadir columnas `won_data_json` y `product_interests_json` a la tabla `contacts`.
2.  **Verificación de Índices:** Asegurar que las búsquedas sean rápidas.

#### **Fase 2: Actualización del Núcleo (API Backend)**
3.  **Parchear `contacts.php`:**
    *   Permitir guardar y leer `wonData` y `productInterests`.
    *   Asegurar que `last_activity` se actualice automáticamente.
4.  **Parchear `pipeline.php`:**
    *   Incluir el campo `probability` en `handleCreate` y `handleUpdate`.

#### **Fase 3: Motor de Automatización (Backend)**
5.  **Implementar "Hooks" en `contacts.php`:**
    *   Cuando se crea un Lead -> Verificar reglas activas -> Ejecutar acción (ej. enviar email).
    *   Esto dará vida real al módulo de automatización.

#### **Fase 4: Verificación Final**
6.  **Prueba E2E (End-to-End):**
    *   Crear Lead -> Verificar Automatización -> Mover a "Ganada" -> Verificar Reporte.

¿Me das luz verde para comenzar con la **Fase 1** y arreglar la base de datos inmediatamente?
