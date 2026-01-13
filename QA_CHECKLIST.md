# Checklist de Pruebas de Calidad (QA) - KiwüLead CRM

Este documento sirve como guía paso a paso para validar que todas las funcionalidades críticas del CRM operan correctamente antes del lanzamiento a producción.

## 1. Configuración Inicial y Acceso
- [ ] **Login**: Iniciar sesión correctamente con las credenciales de administrador.
- [ ] **Dashboard**: Verificar que el panel principal cargue sin errores (gráficos, contadores).
- [ ] **Perfil de Empresa**: Ir a *Configuración > General* y asegurar que el nombre y logo de la empresa se guarden.

## 2. Gestión de Contactos (CRM Core)
- [ ] **Crear Contacto**: Añadir un contacto manualmente con Nombre, Email y Teléfono.
- [ ] **Ficha de Contacto**: Abrir el contacto creado y verificar que se ven sus datos.
- [ ] **Notas**: Escribir una nota interna en el historial del contacto y guardarla.
- [ ] **Tareas**: Asignar una tarea al contacto (ej. "Llamar mañana") y verificar que aparece en la lista.
- [ ] **Edición**: Modificar el teléfono del contacto y guardar cambios.

## 3. Pipeline de Ventas (Kanban)
- [ ] **Visualización**: Entrar a la vista de Pipeline y ver las columnas (Etapas).
- [ ] **Movimiento**: Arrastrar una tarjeta de contacto de una etapa a otra (ej. de "Nuevo" a "Contactado").
- [ ] **Probabilidad**: Verificar que al mover el trato, el valor/probabilidad se actualice (si aplica).
- [ ] **Ganado/Perdido**: Marcar un trato como "Ganado" y verificar el feedback visual.

## 4. Email Marketing y Bandeja de Entrada
- [ ] **Conexión SMTP/IMAP**: Ir a *Configuración > Email* y conectar una cuenta real (Gmail/Outlook).
- [ ] **Enviar Correo**: Redactar y enviar un email desde la ficha de un contacto.
- [ ] **Recepción (Sync)**: Enviarse un correo a esa cuenta desde fuera y verificar que aparezca en el *Inbox* del CRM.
- [ ] **Tracking**: Verificar si el sistema marca "Leído" cuando el destinatario abre el correo (usar otro dispositivo).

## 5. Automatizaciones
- [ ] **Crear Regla**: Ir a *Automatizaciones* y crear: "Si se crea un contacto -> Enviar email de bienvenida".
- [ ] **Prueba de Fuego**: Crear un contacto nuevo y esperar a ver si el correo se envía automáticamente.

## 6. Integraciones (Webhooks)
- [ ] **Generar URL**: Copiar la URL del Webhook desde *Configuración > Integraciones*.
- [ ] **Prueba de Datos**: Simular un envío (usando Postman o `curl`) y ver si entra como Lead nuevo.

## 7. Experiencia Móvil (PWA)
- [ ] **Responsividad**: Abrir el CRM en modo móvil (o reducir ventana del navegador). Verificar que el menú y Kanban se adapten.
- [ ] **Instalación**: Verificar si aparece el icono de "Instalar App" en la barra del navegador.

---

### Notas de Errores Encontrados
*Utiliza este espacio para anotar cualquier bug que encuentres durante las pruebas.*

1. 
2. 
3. 
