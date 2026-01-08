
import { Contact, LeadStatus, Source, PipelineColumn, AutomationLog, Ticket, TicketPriority, TicketStatus, TeamMember, IntegrationStatus, Task, AutomationRule, Product, EmailTemplate } from './types';

export const PIPELINE_COLUMNS: PipelineColumn[] = [
  { id: LeadStatus.NEW, title: 'Nuevos', color: 'border-blue-500' },
  { id: LeadStatus.CONTACTED, title: 'Contactados', color: 'border-teal-500' },
  { id: LeadStatus.QUALIFIED, title: 'Calificados', color: 'border-cyan-500' },
  { id: LeadStatus.NEGOTIATION, title: 'Negociación', color: 'border-orange-500' },
  { id: LeadStatus.WON, title: 'Ganados', color: 'border-green-500' },
];

export const AUTOMATION_LOGS: AutomationLog[] = [];

export const INTEGRATIONS: IntegrationStatus[] = [
  { name: 'WhatsApp Business API', status: 'Connected', lastSync: 'Hace 1 min', icon: 'MessageSquare' },
  { name: 'Meta Ads Manager', status: 'Connected', lastSync: 'Hace 15 min', icon: 'Facebook' },
  { name: 'n8n Automatización', status: 'Connected', lastSync: 'Tiempo Real', icon: 'Workflow' },
  { name: 'Make (Integromat)', status: 'Disconnected', lastSync: 'Nunca', icon: 'Zap' },
  { name: 'Formularios del Sitio (Webhook)', status: 'Connected', lastSync: 'Tiempo Real', icon: 'Globe' },
  { name: 'AI Assistant', status: 'Disconnected', lastSync: 'Nunca', icon: 'Bot' },
];

// --- DEFAULT AUTOMATION RULES ---
export const DEFAULT_AUTOMATIONS: AutomationRule[] = [
  // CORE
  { id: 'core_1', name: 'Captura y Normalización', description: 'Normaliza el formato de nombres (Capitalize) y teléfonos.', category: 'CORE', trigger: 'ON_LEAD_CREATE', isActive: true },
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
