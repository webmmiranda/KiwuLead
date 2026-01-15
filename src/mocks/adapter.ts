import { mockContacts, mockPipeline, mockProducts, mockTasks, mockTeam, mockUsers, mockAppointments, mockEmails, mockNotifications } from './data';
import { Contact, CurrentUser, Product, Task, TeamMember, Appointment, UserRole } from '../../types';

const SIMULATED_DELAY = 300; // ms

const delay = <T>(data: T): Promise<T> => {
  return new Promise(resolve => setTimeout(() => resolve(data), SIMULATED_DELAY));
};

export const mockApi = {
  notifications: {
    list: () => delay(mockNotifications),
    create: (data: any) => delay({ success: true, id: 'n-new' }),
    markRead: (id: string) => delay({ success: true }),
    markAllRead: () => delay({ success: true }),
    delete: (id: string) => delay({ success: true }),
    getPreferences: () => delay({}),
    savePreferences: (prefs: any) => delay({ success: true })
  },
  auth: {
    login: async (email: string, pass: string): Promise<{ success: boolean, user: CurrentUser }> => {
      await delay(null);
      const user = Object.values(mockUsers).find(u => u.email === email);
      if (user) {
        return { success: true, user };
      }
      throw new Error('Invalid credentials (try gerente@nexus.demo)');
    },
    register: () => delay({ success: true }),
    forgotPassword: () => delay({ success: true }),
    resetPassword: () => delay({ success: true }),
    updateProfile: (id: number, data: Partial<CurrentUser>) => delay({ success: true })
  },
  contacts: {
    list: () => delay(mockContacts),
    create: (contact: Partial<Contact>) => delay({ success: true, id: `c-${Date.now()}` }),
    update: (id: string, updates: Partial<Contact>) => delay({ success: true }),
    delete: (id: string) => delay({ success: true }),
    search: (query: string) => {
        const lower = query.toLowerCase();
        return delay(mockContacts.filter(c => 
            c.name.toLowerCase().includes(lower) || 
            c.company.toLowerCase().includes(lower)
        ));
    }
  },
  tasks: {
    list: () => delay(mockTasks),
    create: (task: Partial<Task>) => delay({ success: true, id: `t-${Date.now()}` }),
    update: (id: string, updates: Partial<Task>) => delay({ success: true }),
    delete: (id: string) => delay({ success: true })
  },
  products: {
    list: () => delay(mockProducts),
    create: (product: any) => delay({ success: true, id: `p-${Date.now()}` }),
    update: (id: string, updates: any) => delay({ success: true }),
    delete: (id: string) => delay({ success: true })
  },
  team: {
    list: () => delay(mockTeam),
    create: (user: any) => delay({ success: true }),
    update: (id: string, updates: any) => delay({ success: true }),
    delete: (id: string) => delay({ success: true }),
    invite: (email: string, role: UserRole) => delay({ success: true })
  },
  settings: {
    getPublicConfig: () => delay({ companyName: 'KiwüLead Demo', logo: '' }),
    list: () => delay({ theme: 'light', language: 'es' }),
    update: (key: string, value: any) => delay({ success: true }),
    getEmailConfig: (userId: string) => delay({ smtp_host: 'smtp.kiwulead.demo' }),
    saveEmailConfig: () => delay({ success: true }),
    testEmailConfig: () => delay({ success: true })
  },
  appointments: {
    list: () => delay(mockAppointments),
    create: (apt: any) => delay({ success: true, id: `a-${Date.now()}` }),
    update: (id: string, updates: any) => delay({ success: true }),
    delete: (id: string) => delay({ success: true })
  },
  emails: {
    list: (folder: string, userId: string) => delay(mockEmails),
    send: (data: FormData) => delay({ success: true }),
    sync: (userId: string) => delay({ success: true, count: 0 }),
    markRead: (emailId: string) => delay({ success: true }),
    delete: (id: string) => delay({ success: true }),
    saveDraft: (draft: any) => delay({ success: true }),
    post: (endpoint: string, data: any) => delay({ success: true })
  },
  notes: {
    create: (note: any) => delay({ success: true, id: `note-${Date.now()}` })
  },
  files: {
    upload: (file: File) => delay({ success: true, url: 'https://via.placeholder.com/150' })
  },
  pipeline: {
    list: () => delay(mockPipeline),
    create: (name: string, color: string) => delay({ success: true, id: `col-${Date.now()}` }),
    update: (id: string, updates: any) => delay({ success: true }),
    delete: (id: string) => delay({ success: true }),
    reorder: (ids: string[]) => delay({ success: true })
  },
  meta: {
    getConfig: () => delay({ connected: true, phoneNumber: '+1234567890' }),
    saveConfig: () => delay({ success: true }),
    getTemplates: () => delay({ templates: [] }),
    sendTemplate: () => delay({ success: true }),
    sendMessage: () => delay({ success: true })
  },
  history: {
    list: () => delay([]),
    create: () => delay({ success: true })
  },
  system: {
    status: () => delay({ status: 'ok', version: '1.0.0-demo', installed: true })
  }
};
