Voy a realizar una auditoría y refactorización completa del motor de automatización para pasar de un modo "Demo/Visual" a un modo "Producción/Funcional".

### 1. Refactorización del Motor (`App.tsx`)
Actualmente, las automatizaciones se ejecutan *antes* de guardar el contacto en la base de datos (DB) o solo actualizan el estado local (React state), perdiéndose al recargar.
*   **Cambio Crítico**: Moveré la ejecución de `executeAutomations('ON_LEAD_CREATE')` para que ocurra **después** de que la API confirme que el contacto se creó y nos devuelva su ID real.
*   **Asincronía**: Convertiré `executeAutomations` en una función `async` para que pueda llamar a la API (`api.tasks.create`, `api.history.create`, `api.contacts.update`) y persistir los cambios realmente.

### 2. Reparación de Reglas Existentes ("Speed to Lead", "Onboarding")
*   **Speed to Lead (`core_4`)**: Actualmente crea una tarea "falsa" en memoria.
    *   *Solución*: Insertará una tarea real en la DB (`api.tasks.create`) vinculada al nuevo contacto.
    *   *WhatsApp*: Registrará el mensaje de bienvenida en el historial de la DB (`api.history.create`).
*   **Onboarding (`life_1`)**: Igual que el anterior, creará la tarea de onboarding en la DB.
*   **Avance Pipeline (`sales_1`)**: Al enviar un mensaje, actualizará el estatus en la DB, no solo en la pantalla.

### 3. Implementación de Reglas Faltantes
Programaré la lógica real para las reglas que hoy son solo texto:
*   **`sales_2` (Follow-up Secuencial)**: Al entrar un lead, creará automáticamente 3 tareas de seguimiento en la DB (Día +1, +3, +7).
*   **`qual_2` (Etiquetado Automático)**: Analizará el `value` y `source` del lead recién creado. Si `value > 5000` -> Tag "High Value". Si `source === 'Instagram'` -> Tag "Social". Actualizará el contacto en la DB.
*   **`sales_4` (Reasignación por Inactividad)**: En el chequeo periódico (cada minuto), buscará leads sin actividad > 48h y los devolverá al pool ("Sin asignar") en la DB.
*   **`life_2` (Reactivación)**: Buscará leads "Perdidos" hace > 90 días y creará una tarea de "Re-intentar contacto".

### 4. Limpieza de "Humo" (Fake Features)
*   Eliminaré notificaciones que dicen "Email enviado" si no hay servidor de correo. En su lugar, el sistema creará una **Tarea** para el agente: "Enviar Email Manualmente" (Flujo real de producción sin SMTP).
*   Aseguraré que todas las notificaciones "Éxito" provengan de una respuesta `200 OK` de la API.

### Resumen Técnico
Modificaré `App.tsx` para integrar `api` dentro de `executeAutomations` y reordenar el flujo de creación de contactos. No se requieren cambios en backend por ahora, usaremos los endpoints existentes de `tasks`, `history` y `contacts`.