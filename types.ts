
export enum LeadStatus {
  NEW = 'New',
  CONTACTED = 'Contacted',
  QUALIFIED = 'Qualified',
  NEGOTIATION = 'Negotiation',
  WON = 'Won',
  LOST = 'Lost'
}

export enum Source {
  META_ADS = 'Meta Ads',
  WEBSITE = 'Website',
  REFERRAL = 'Referral',
  WHATSAPP = 'WhatsApp'
}

export interface Note {
  id: string;
  content: string;
  createdAt: string;
  author: string;
}

export interface Message {
  id: string;
  sender: 'agent' | 'customer' | 'system'; // Added system for automated logs
  type?: 'message' | 'note'; // New field: distinguishes public msg from internal note
  content: string;
  timestamp: string;
  channel: 'whatsapp' | 'email' | 'internal'; // Added internal
  subject?: string; // For emails
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'urgent';
  timestamp: string;
  read: boolean;
  linkTo?: string; // Contact ID to navigate
}

export interface Contact {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: string; // Changed from LeadStatus to string to support dynamic stages
  source: Source;
  owner: string;
  createdAt: string; // ISO String or similar
  lastActivity: string; // ISO String or relative description
  lastActivityTimestamp?: number; // For calculations
  tags: string[];
  value: number;
  probability: number; // 0-100
  // Attribution Fields
  utm_campaign?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_term?: string;
  utm_content?: string;
  
  lostReason?: string; // New field for reporting
  npsScore?: number;
  bant?: {
    budget?: number;
    authority?: boolean;
    need?: string;
    timeline?: string;
  };
  documents?: {
    id: string;
    name: string;
    type: string;
    url: string;
    createdAt: string;
  }[];
  productInterests?: string[]; // Added: alignment between customer and products
  wonData?: {
    products: string[];
    finalPrice: number;
    closingNotes?: string;
    closedAt: string;
  };
  notes: Note[];
  history: Message[];
  appointments?: Appointment[];
}
export interface PipelineColumn {
  id: string;
  title: string;
  color: string;
  probability?: number;
}

export interface Metric {
  label: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down';
}

export interface AutomationLog {
  id: string;
  workflow: string;
  status: 'success' | 'error' | 'running';
  timestamp: string;
  trigger: string;
}

export enum TicketPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  URGENT = 'Urgent'
}

export enum TicketStatus {
  OPEN = 'Open',
  IN_PROGRESS = 'In Progress',
  RESOLVED = 'Resolved'
}

export interface Ticket {
  id: string;
  subject: string;
  customerName: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo: string;
  createdAt: string;
  category: 'Billing' | 'Technical' | 'Feature Request';
}

export type UserRole = 'MANAGER' | 'SALES_REP' | 'SUPPORT';

export interface CurrentUser {
  id?: number;
  name: string;
  email?: string;
  role: UserRole;
  avatar: string;
  token?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: 'Admin' | 'Sales' | 'Support' | 'Manager';
  email: string;
  status: 'Active' | 'Inactive';
  lastLogin: string;
}

export interface IntegrationStatus {
  name: string;
  status: 'Connected' | 'Disconnected' | 'Error';
  lastSync: string;
  icon: string;
}

export interface Task {
  id: string;
  title: string;
  type: 'Call' | 'Email' | 'Meeting' | 'Task';
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  description?: string;
  status: 'Pending' | 'Done' | 'Overdue';
  priority: 'High' | 'Normal' | 'Low';
  assignedTo: string;
  relatedContactName?: string;
  relatedContactId?: string; // Linked ID for navigation
  reminder?: {
    enabled: boolean;
    timeValue: number;
    timeUnit: 'minutes' | 'hours' | 'days';
  };
}

export interface Appointment {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location: string;
  description: string;
  contactId?: string;
  contactName?: string;
  contactCompany?: string;
  userId?: string;
  userName?: string;
  assignedTo?: string; // For backward compatibility or specific assignment
  productId?: string;
  productName?: string;
}

export interface DistributionSettings {
  enabled: boolean;
  method: 'round_robin' | 'load_balanced';
  capLimit: number;
}

// --- AUTOMATION TYPES ---

export type AutomationTrigger =
  | 'ON_LEAD_CREATE'
  | 'ON_STATUS_CHANGE'
  | 'ON_MESSAGE_RECEIVED'
  | 'ON_MESSAGE_SENT'
  | 'ON_DEAL_LOST'
  | 'ON_DEAL_WON'
  | 'SCHEDULED_CHECK'; // For SLA, Stale leads

export type AutomationCategory = 'CORE' | 'SALES' | 'QUALITY' | 'REPORTING' | 'LIFECYCLE';

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  category: AutomationCategory;
  trigger: AutomationTrigger;
  isActive: boolean;
  config?: any; // For custom params like "3 days" or "Template ID"
}

// --- NEW TYPES FOR PRODUCTS & EMAIL ---

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'USD' | 'MXN' | 'CRC' | 'COP';
  category: string;
  image?: string; // New field for image URL
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string; // Supports simple text placeholders like {{name}}
  category: 'Sales' | 'Marketing' | 'Support' | 'Follow-up' | 'System';
}

// --- COMPANY SETTINGS ---
export interface CompanyProfile {
  name: string;
  logoUrl?: string; // Optional URL for custom branding
  industry: string;
  website: string;
  taxId?: string; // RFC/VAT
  address?: string;
  currency: 'USD' | 'MXN' | 'CRC' | 'COP';
  primaryColor?: string;
  secondaryColor?: string;
  emailFooter?: string;
}

export interface AiConfig {
  connected: boolean;
  connecting: boolean;
  provider: 'gemini' | 'openai';
  apiKey: string;
  model: string;
}
