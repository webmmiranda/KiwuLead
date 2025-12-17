
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
  type: 'info' | 'success' | 'warning' | 'error';
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
  status: LeadStatus;
  source: Source;
  owner: string;
  lastActivity: string; // ISO String or relative description
  lastActivityTimestamp?: number; // For calculations
  tags: string[];
  value: number;
  probability: number; // 0-100
  lostReason?: string; // New field for reporting
  npsScore?: number;
  notes: Note[];
  history: Message[];
}

export interface PipelineColumn {
  id: LeadStatus;
  title: string;
  color: string;
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

export type UserRole = 'MANAGER' | 'SALES_REP';

export interface CurrentUser {
  name: string;
  role: UserRole;
  avatar: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: 'Admin' | 'Sales' | 'Support';
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
  status: 'Pending' | 'Done';
  priority: 'High' | 'Normal' | 'Low';
  assignedTo: string;
  relatedContactName?: string;
  relatedContactId?: string; // Linked ID for navigation
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
  category: 'Sales' | 'Marketing' | 'Support';
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
}
