# NexusCRM

CRM omnicanal con IA integrada (Gemini) y modo offline. Gestiona contactos, pipeline de ventas, productos y automatizaciones.

## 🚀 Inicio Rápido

### 1. Instalar Dependencias
```bash
npm install
```

### 2. Configurar Base de Datos
El proyecto incluye un auto-instalador. Simplemente ejecuta:

```bash
bash dev.sh
```

Luego abre tu navegador en `http://localhost:5173/install` y completa el formulario con:
- **Servidor BD**: localhost
- **Usuario BD**: root
- **Contraseña BD**: (dejar vacío si no tienes contraseña)
- **Nombre BD**: nexus_crm_local

El instalador creará automáticamente la base de datos y las tablas necesarias.

### 3. Credenciales de Acceso
Después de la instalación, usa estas credenciales para iniciar sesión:
- **Email**: admin@nexus.com
- **Password**: password

### 4. Configurar IA (Opcional)
Para habilitar las funciones de IA con Gemini, crea un archivo `.env` en la raíz del proyecto:

```bash
API_KEY=tu_gemini_api_key_aqui
```

Puedes obtener una API key en [Google AI Studio](https://makersuite.google.com/app/apikey).

## 📦 Estructura del Proyecto

```
NexusCRM/
├── public/
│   ├── api/              # Backend PHP
│   │   ├── auth.php      # Autenticación
│   │   ├── contacts.php  # CRUD de contactos
│   │   └── db.php        # Configuración BD (generado por instalador)
│   ├── install/          # Auto-instalador
│   └── database.sql      # Schema de la BD
├── src/
│   ├── components/       # Componentes React
│   ├── services/         # API client
│   └── types.ts          # TypeScript types
└── App.tsx               # Componente principal
```

## 🛠️ Desarrollo

### Iniciar Servidores
```bash
bash dev.sh
```

Esto iniciará:
- **Backend PHP**: http://localhost:8080
- **Frontend Vite**: http://localhost:5173

### Comandos Disponibles
```bash
npm run dev      # Iniciar solo frontend
npm run build    # Compilar para producción
npm run preview  # Preview de producción
```

## 🗄️ Base de Datos

El proyecto usa MySQL con las siguientes tablas:
- `users` - Usuarios y autenticación
- `contacts` - Contactos/leads
- `contact_notes` - Notas de contactos
- `contact_history` - Historial de mensajes
- `tasks` - Tareas y seguimientos
- `products` - Catálogo de productos
- `automations` - Reglas de automatización
- `email_templates` - Plantillas de email
- `company_settings` - Configuración de empresa

## ✨ Características

- 📊 Dashboard con métricas en tiempo real
- 💬 Inbox omnicanal (WhatsApp, Email)
- 🎯 Pipeline visual con drag & drop
- 🤖 Asistente IA para borradores y análisis
- 📦 Gestión de productos
- ✅ Sistema de tareas
- 🔄 Automatizaciones
- 📱 PWA con modo offline

## 🔧 Solución de Problemas

### Puerto 8080 ocupado
```bash
lsof -ti:8080 | xargs kill -9
```

### Reinstalar base de datos
```bash
mysql -u root -e "DROP DATABASE IF EXISTS nexus_crm_local;"
# Luego visita http://localhost:5173/install
```

### Limpiar caché de npm
```bash
rm -rf node_modules package-lock.json
npm install
```
