
import { Contact, LeadStatus, Source, PipelineColumn, AutomationLog, Ticket, TicketPriority, TicketStatus, TeamMember, IntegrationStatus, Task, AutomationRule, Product, EmailTemplate } from './types';

export const MOCK_CONTACTS: Contact[] = [
  {
    id: '1',
    name: 'Ana García',
    company: 'TechFlow Solutions',
    email: 'ana.g@techflow.com',
    phone: '+52 55 1234 5678',
    status: LeadStatus.NEGOTIATION,
    source: Source.META_ADS,
    owner: 'Carlos Ruiz',
    lastActivity: 'Hace 10 min',
    lastActivityTimestamp: Date.now() - 600000,
    tags: ['Hot Lead', 'Enterprise'],
    value: 12500,
    probability: 75,
    notes: [
      { id: 'n1', content: 'Interesada en el plan premium. Necesita aprobación del CTO.', createdAt: '2023-10-25', author: 'Carlos Ruiz' }
    ],
    history: [
      { id: 'm1', sender: 'customer', content: 'Hola, vi su anuncio en Instagram. ¿Tienen API?', timestamp: 'Ayer', channel: 'whatsapp' },
      { id: 'm2', sender: 'agent', content: 'Hola Ana, sí, tenemos una API completa. ¿Te gustaría una demo?', timestamp: 'Ayer', channel: 'whatsapp' },
      { id: 'm3', sender: 'customer', content: 'Sí, por favor. ¿Mañana a las 10am?', timestamp: 'Hoy', channel: 'whatsapp' }
    ]
  },
  {
    id: '2',
    name: 'Luis Méndez',
    company: 'Constructora Norte',
    email: 'lmendez@norte.com',
    phone: '+57 300 987 6543',
    status: LeadStatus.NEW,
    source: Source.WEBSITE,
    owner: 'Sin asignar',
    lastActivity: 'Hace 2 horas',
    lastActivityTimestamp: Date.now() - 7200000,
    tags: ['Seguimiento'],
    value: 5000,
    probability: 20,
    notes: [],
    history: []
  },
  {
    id: '3',
    name: 'Sofia Lopez',
    company: 'Design Studio X',
    email: 'sofia@dsx.studio',
    phone: '+34 600 111 222',
    status: LeadStatus.QUALIFIED,
    source: Source.REFERRAL,
    owner: 'Maria Jose',
    lastActivity: 'Hace 1 día',
    lastActivityTimestamp: Date.now() - 86400000,
    tags: ['SaaS', 'Q4'],
    value: 8200,
    probability: 60,
    notes: [],
    history: [
      { id: 'm4', sender: 'agent', content: 'Enviada la cotización #4021', timestamp: 'Ayer', channel: 'email', subject: 'Cotización Propuesta' }
    ]
  },
  {
    id: '4',
    name: 'Jorge Torres',
    company: 'Retail King',
    email: 'jorge@retailking.com',
    phone: '+52 55 9876 5432',
    status: LeadStatus.WON,
    source: Source.META_ADS,
    owner: 'Carlos Ruiz',
    lastActivity: 'Hace 3 días',
    lastActivityTimestamp: Date.now() - 259200000,
    tags: ['VIP'],
    value: 25000,
    probability: 100,
    notes: [],
    history: []
  },
  {
    id: '5',
    name: 'Elena White',
    company: 'Global Exports',
    email: 'elena@gexports.com',
    phone: '+1 305 555 0101',
    status: LeadStatus.CONTACTED,
    source: Source.WHATSAPP,
    owner: 'Carlos Ruiz',
    lastActivity: 'Hace 5 min',
    lastActivityTimestamp: Date.now() - 300000,
    tags: [],
    value: 3000,
    probability: 30,
    notes: [],
    history: [
      { id: 'm5', sender: 'customer', content: '¿Lista de precios?', timestamp: 'Hace 1 hora', channel: 'whatsapp' }
    ]
  }
];

export const PIPELINE_COLUMNS: PipelineColumn[] = [
  { id: LeadStatus.NEW, title: 'Nuevos', color: 'border-blue-500' },
  { id: LeadStatus.CONTACTED, title: 'Contactados', color: 'border-indigo-500' },
  { id: LeadStatus.QUALIFIED, title: 'Calificados', color: 'border-purple-500' },
  { id: LeadStatus.NEGOTIATION, title: 'Negociación', color: 'border-orange-500' },
  { id: LeadStatus.WON, title: 'Ganados', color: 'border-green-500' },
];

export const AUTOMATION_LOGS: AutomationLog[] = [
  { id: 'a1', workflow: 'Captura de Leads (Meta)', status: 'success', timestamp: '10:42 AM', trigger: 'Webhook' },
  { id: 'a2', workflow: 'Bienvenida WhatsApp', status: 'success', timestamp: '10:43 AM', trigger: 'Nuevo Lead' },
  { id: 'a3', workflow: 'Sincronizar Factura (ERP)', status: 'error', timestamp: '09:15 AM', trigger: 'Trato Ganado' },
  { id: 'a4', workflow: 'Verificar Duplicados', status: 'success', timestamp: '08:00 AM', trigger: 'Programado' },
];

export const MOCK_TICKETS: Ticket[] = [
  { id: 'T-101', subject: 'Problemas de acceso al dashboard', customerName: 'TechFlow Solutions', priority: TicketPriority.HIGH, status: TicketStatus.OPEN, assignedTo: 'Maria Jose', createdAt: '2023-10-26', category: 'Technical' },
  { id: 'T-102', subject: 'Actualizar dirección de facturación', customerName: 'Retail King', priority: TicketPriority.LOW, status: TicketStatus.RESOLVED, assignedTo: 'Carlos Ruiz', createdAt: '2023-10-24', category: 'Billing' },
  { id: 'T-103', subject: 'Solicitud de documentación API', customerName: 'Constructora Norte', priority: TicketPriority.MEDIUM, status: TicketStatus.IN_PROGRESS, assignedTo: 'Carlos Ruiz', createdAt: '2023-10-25', category: 'Feature Request' },
];

export const TEAM_MEMBERS: TeamMember[] = [
  { id: 'u1', name: 'John Doe', role: 'Admin', email: 'john@nexus.com', status: 'Active', lastLogin: 'Ahora' },
  { id: 'u2', name: 'Carlos Ruiz', role: 'Sales', email: 'carlos@nexus.com', status: 'Active', lastLogin: 'Hace 2 horas' },
  { id: 'u3', name: 'Maria Jose', role: 'Support', email: 'maria@nexus.com', status: 'Active', lastLogin: 'Hace 1 día' },
];

export const INTEGRATIONS: IntegrationStatus[] = [
  { name: 'WhatsApp Business API', status: 'Connected', lastSync: 'Hace 1 min', icon: 'MessageSquare' },
  { name: 'Meta Ads Manager', status: 'Connected', lastSync: 'Hace 15 min', icon: 'Facebook' },
  { name: 'n8n Automatización', status: 'Connected', lastSync: 'Tiempo Real', icon: 'Workflow' },
  { name: 'Stripe Pagos', status: 'Disconnected', lastSync: 'Nunca', icon: 'CreditCard' },
];

export const MOCK_TASKS: Task[] = [
  { id: 't1', title: 'Seguimiento de propuesta', type: 'Call', dueDate: 'Hoy', status: 'Pending', priority: 'High', assignedTo: 'Carlos Ruiz', relatedContactName: 'Ana García' },
  { id: 't2', title: 'Enviar borrador de contrato', type: 'Email', dueDate: 'Hoy', status: 'Pending', priority: 'Normal', assignedTo: 'Carlos Ruiz', relatedContactName: 'Jorge Torres' },
  { id: 't3', title: 'Preparar reporte Q4', type: 'Task', dueDate: 'Mañana', status: 'Pending', priority: 'Normal', assignedTo: 'John Doe' },
  { id: 't4', title: 'Resolver ticket de facturación', type: 'Task', dueDate: 'Hoy', status: 'Done', priority: 'High', assignedTo: 'Maria Jose' },
];

// --- DEFAULT AUTOMATION RULES ---
export const DEFAULT_AUTOMATIONS: AutomationRule[] = [
  // CORE
  { id: 'core_1', name: 'Captura y Normalización', description: 'Normaliza nombres (Capitalize) y teléfonos (+52) automáticamente.', category: 'CORE', trigger: 'ON_LEAD_CREATE', isActive: true },
  { id: 'core_2', name: 'Detección de Duplicados', description: 'Impide crear leads con mismo email o teléfono. Fusiona historial.', category: 'CORE', trigger: 'ON_LEAD_CREATE', isActive: true },
  { id: 'core_3', name: 'Asignación Round Robin', description: 'Distribuye leads equitativamente entre vendedores activos.', category: 'CORE', trigger: 'ON_LEAD_CREATE', isActive: true },
  { id: 'core_4', name: 'Speed to Lead (Bienvenida)', description: 'Envía WhatsApp de bienvenida y crea tarea inmediata.', category: 'CORE', trigger: 'ON_LEAD_CREATE', isActive: true },
  { id: 'core_5', name: 'Alerta SLA Respuesta', description: 'Alerta si un lead nuevo no es contactado en 10 min.', category: 'CORE', trigger: 'SCHEDULED_CHECK', isActive: true },

  // SALES
  { id: 'sales_1', name: 'Avance Automático Pipeline', description: 'Si envías mensaje, mueve a "Contactado". Si paga, a "Ganado".', category: 'SALES', trigger: 'ON_MESSAGE_SENT', isActive: true },
  { id: 'sales_2', name: 'Follow-up Secuencial', description: 'Crea tareas de seguimiento (Día 1, 3, 7) automáticamente.', category: 'SALES', trigger: 'ON_STATUS_CHANGE', isActive: false },
  { id: 'sales_3', name: 'Gestión de Tareas', description: 'No permite mover etapa si hay tareas vencidas.', category: 'SALES', trigger: 'ON_STATUS_CHANGE', isActive: false },
  { id: 'sales_4', name: 'Reasignación por Inactividad', description: 'Si el lead no se toca en 48h, se reasigna al pool.', category: 'SALES', trigger: 'SCHEDULED_CHECK', isActive: true },

  // QUALITY
  { id: 'qual_1', name: 'Control Calidad Datos', description: 'Exige campos obligatorios según la etapa del pipeline.', category: 'QUALITY', trigger: 'ON_STATUS_CHANGE', isActive: true },
  { id: 'qual_2', name: 'Etiquetado Automático', description: 'Asigna tags (Hot, Cold, Canal) basado en comportamiento.', category: 'QUALITY', trigger: 'ON_LEAD_CREATE', isActive: true },
  { id: 'qual_3', name: 'Motivo Pérdida Obligatorio', description: 'Exige seleccionar razón al marcar como Perdido.', category: 'QUALITY', trigger: 'ON_DEAL_LOST', isActive: true },

  // REPORTING
  { id: 'rep_1', name: 'Reporte Diario (Digest)', description: 'Envía resumen de leads nuevos y cierres por email.', category: 'REPORTING', trigger: 'SCHEDULED_CHECK', isActive: false },
  { id: 'rep_2', name: 'Alertas Inteligentes', description: 'Notifica picos anormales de leads o baja conversión.', category: 'REPORTING', trigger: 'SCHEDULED_CHECK', isActive: true },

  // LIFECYCLE
  { id: 'life_1', name: 'Onboarding Automático', description: 'Envía kit de bienvenida al marcar como Ganado.', category: 'LIFECYCLE', trigger: 'ON_DEAL_WON', isActive: true },
  { id: 'life_2', name: 'Reactivación Leads Perdidos', description: 'Crea tarea de "Hola de nuevo" a los 90 días.', category: 'LIFECYCLE', trigger: 'SCHEDULED_CHECK', isActive: false },
  { id: 'life_3', name: 'Encuesta NPS', description: 'Envía encuesta de satisfacción 3 días después de la venta.', category: 'LIFECYCLE', trigger: 'ON_DEAL_WON', isActive: true },
];

export const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Nexus CRM - Plan Starter', description: 'Ideal para pymes. Hasta 3 usuarios. Sin automatización avanzada.', price: 29, currency: 'USD', category: 'Software', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=200' },
  { id: 'p2', name: 'Nexus CRM - Plan Pro', description: 'Usuarios ilimitados. Automatización completa. Reportes avanzados.', price: 99, currency: 'USD', category: 'Software', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=200' },
  { id: 'p3', name: 'Implementación Onboarding', description: 'Servicio de configuración inicial y capacitación de equipo (4 horas).', price: 500, currency: 'USD', category: 'Service', image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b955?auto=format&fit=crop&q=80&w=200' },
  { id: 'p4', name: 'Consultoría Mensual', description: 'Revisión de estrategia de ventas y optimización de pipeline.', price: 200, currency: 'USD', category: 'Service', image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=200' },
];

export const MOCK_TEMPLATES: EmailTemplate[] = [
  { id: 't1', name: 'Bienvenida Estándar', subject: 'Bienvenido a Nexus - Primeros pasos', body: 'Hola {{name}},\n\nGracias por tu interés en Nexus. Me gustaría agendar una llamada rápida para entender tus necesidades.\n\nSaludos,\nEl Equipo', category: 'Sales' },
  { id: 't2', name: 'Seguimiento Propuesta', subject: '¿Pudiste revisar nuestra propuesta?', body: 'Hola {{name}},\n\nTe escribo para saber si tuviste oportunidad de revisar la propuesta que enviamos anteriormente.\n\nQuedo atento,\nEl Equipo', category: 'Sales' },
  { id: 't3', name: 'Reactiva Cliente Frío', subject: 'Te extrañamos en Nexus', body: 'Hola {{name}},\n\nHace tiempo que no hablamos. Hemos lanzado nuevas funciones que podrían interesarte.\n\nSaludos.', category: 'Marketing' },
];
