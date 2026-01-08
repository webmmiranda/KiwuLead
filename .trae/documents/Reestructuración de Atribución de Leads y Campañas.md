# Plan de Ejecución: Reestructuración de Integraciones y Atribución

## 1. Backend: Lógica de Flujo de Datos
- **Base de Datos:** Añadir columnas `utm_campaign`, `utm_source`, `utm_medium` a la tabla `contacts`.
- **Webhook de Entrada (Captación):**
  - Actualizar `webhook.php` para detectar parámetros UTM y mapear formularios de Meta a campañas.
- **Webhook de Salida (Automatización):**
  - Crear lógica en `api/leads/create` (o donde se inserten leads) para disparar el evento a n8n/Make si están configurados.

## 2. Frontend: Rediseño de Pestaña "Integraciones"
- **Organización Visual:** Dividir el Grid actual en 3 secciones horizontales:
  1.  **Captación de Leads:** (Meta Ads, WhatsApp, Formularios Web).
      - *Descripción:* "Conecta tus fuentes de tráfico para centralizar la entrada de leads."
  2.  **Automatización (Salida):** (n8n, Make).
      - *Descripción:* "Envía notificaciones y datos a apps externas automáticamente."
  3.  **Inteligencia Artificial:** (AI Assistant).
      - *Descripción:* "Asistente interno para redacción y análisis."
- **Estilo:** Usar encabezados claros con tipografía limpia y descripciones en gris para mantenerlo "no intrusivo".

## 3. Conexión de Datos (El "Pegamento")
- Asegurar que el **AI Assistant** tenga acceso a los nuevos campos de campaña (paso 1) para mejorar sus respuestas.
