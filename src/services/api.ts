import { Contact, Product, Task, UserRole, CurrentUser, LeadStatus, Source, TeamMember, Appointment } from '../../types';

const API_BASE = (import.meta as any).env?.VITE_API_BASE || '/api';

// Dynamic Mock Mode State
let USE_MOCK = false;

export const setMockMode = (enable: boolean) => {
    USE_MOCK = enable;
    console.log(`[API] Mock Mode set to: ${USE_MOCK}`);
};

export const getMockMode = () => USE_MOCK;

const authHeader = (): Record<string, string> => {
    const userStr = localStorage.getItem('nexus_user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            if (user.token) {
                return {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                };
            }
        } catch (e) { }
    }
    return { 'Content-Type': 'application/json' };
};

console.log(`[API] Initializing. USE_MOCK=${USE_MOCK}, API_BASE=${API_BASE}`);

// --- MOCK DATA ---

const MOCK_USER: CurrentUser = {
    id: 1,
    name: 'Admin User',
    role: 'MANAGER',
    avatar: 'https://ui-avatars.com/api/?name=Admin+User&background=random',
    token: 'mock-jwt-token'
};

const MOCK_CONTACTS: Contact[] = [
    {
        id: '1',
        name: 'Carlos Rodriguez',
        company: 'Tech Solutions Ltd',
        email: 'carlos@techsolutions.com',
        phone: '+52 55 1234 5678',
        status: LeadStatus.NEW,
        source: Source.WEBSITE,
        owner: 'Juan Perez',
        createdAt: new Date().toISOString(),
        lastActivity: 'Hace 2 horas',
        value: 5000,
        probability: 60,
        tags: ['Interesado', 'Tech'],
        notes: [],
        history: [],
        bant: { budget: 10000, need: 'CRM Upgrade', timeline: 'Q1' }
    },
    {
        id: '2',
        name: 'Ana Martinez',
        company: 'Design Studio',
        email: 'ana@designstudio.com',
        phone: '+52 55 8765 4321',
        status: LeadStatus.QUALIFIED,
        source: Source.REFERRAL,
        owner: 'Maria Gonzalez',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        lastActivity: 'Ayer',
        value: 12000,
        probability: 80,
        tags: ['Diseño', 'Urgente'],
        notes: [],
        history: [],
        bant: { budget: 15000, authority: true }
    }
];

const MOCK_TEAM: TeamMember[] = [
    { id: '1', name: 'Juan Perez', role: 'Sales', email: 'juan@nexus.com', status: 'Active', lastLogin: 'Hoy' },
    { id: '2', name: 'Maria Gonzalez', role: 'Support', email: 'maria@nexus.com', status: 'Active', lastLogin: 'Ayer' }
];

const MOCK_PRODUCTS: Product[] = [
    { id: 'p1', name: 'Licencia CRM Pro', description: 'Acceso completo anual', price: 999, currency: 'USD', category: 'Software' },
    { id: 'p2', name: 'Consultoría Implementación', description: '20 horas de soporte', price: 1500, currency: 'USD', category: 'Servicios' }
];

const MOCK_TASKS: Task[] = [
    { id: 't1', title: 'Llamar a Carlos', type: 'Call', dueDate: '2025-01-15', status: 'Pending', priority: 'High', assignedTo: 'Juan Perez', relatedContactName: 'Carlos Rodriguez' }
];

// --- MOCK SETTINGS PERSISTENCE ---
const DEFAULT_MOCK_SETTINGS = {
    company_profile: {
        name: 'Nexus CRM',
        industry: 'Tecnología',
        website: 'www.nexus-crm.com',
        currency: 'USD',
        logoUrl: ''
    },
    distribution_settings: {
        enabled: true,
        method: 'round_robin',
        capLimit: 20
    },
    email_templates: [],
    n8n: { connected: false, connecting: false, webhookUrl: '' },
    whatsapp: { provider: 'none', apiKey: '' },
    ai: { provider: 'gemini', apiKey: '' },
    email_config: {
        smtp_host: '',
        smtp_port: 587,
        smtp_user: '',
        smtp_pass: '',
        smtp_secure: 'tls',
        from_name: '',
        from_email: ''
    }
};

const getMockSettings = () => {
    try {
        const saved = localStorage.getItem('nexus_mock_settings');
        if (saved) {
            console.log('[MOCK] Loaded settings from localStorage');
            return { ...DEFAULT_MOCK_SETTINGS, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.error('[MOCK] Failed to load settings', e);
    }
    return DEFAULT_MOCK_SETTINGS;
};

const saveMockSettings = (settings: any) => {
    try {
        localStorage.setItem('nexus_mock_settings', JSON.stringify(settings));
        console.log('[MOCK] Saved settings to localStorage');
    } catch (e) {
        console.error('[MOCK] Failed to save settings', e);
    }
};

// --- HELPER ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getHeaders = () => authHeader();

export const api = {
    auth: {
        login: async (email: string, password: string) => {
            if (USE_MOCK) {
                await delay(800);
                // Allow any login, or specific ones. For now, strict on "fail" email
                if (email === 'fail@test.com') throw new Error('Credenciales inválidas');
                return { success: true, user: { ...MOCK_USER, email } };
            }
            const res = await fetch(`${API_BASE}/auth.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            if (!res.ok) throw new Error('Credenciales inválidas');
            return res.json();
        }
    },
    contacts: {
        list: async (): Promise<Contact[]> => {
            if (USE_MOCK) {
                await delay(500);
                return MOCK_CONTACTS;
            }
            const res = await fetch(`${API_BASE}/contacts.php`, { headers: getHeaders() });
            if (!res.ok) throw new Error('Error buscando contactos');
            return res.json();
        },
        create: async (data: Partial<Contact>) => {
            if (USE_MOCK) {
                await delay(800);

                // Duplicate Check Mock
                const existing = MOCK_CONTACTS.find(c => (data.email && c.email === data.email) || (data.phone && c.phone === data.phone));
                if (existing) {
                    return {
                        error: 'Duplicate Contact',
                        message: 'El cliente ya existe (Mock Check).',
                        owner: existing.owner,
                        existing_id: existing.id,
                        existing_name: existing.name
                    };
                }

                const newContact = { ...data, id: Date.now().toString(), createdAt: new Date().toISOString() } as Contact;
                MOCK_CONTACTS.unshift(newContact);
                return { success: true, id: newContact.id, contact: newContact };
            }
            const res = await fetch(`${API_BASE}/contacts.php`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Error creando contacto');
            return res.json();
        },
        update: async (id: string, data: Partial<Contact>) => {
            if (USE_MOCK) {
                await delay(500);
                const index = MOCK_CONTACTS.findIndex(c => c.id === id);
                if (index !== -1) {
                    MOCK_CONTACTS[index] = { ...MOCK_CONTACTS[index], ...data };
                    return MOCK_CONTACTS[index];
                }
                throw new Error('Contacto no encontrado');
            }
            const res = await fetch(`${API_BASE}/contacts.php?id=${id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Error actualizando contacto');
            return res.json();
        }
    },
    settings: {
        list: async () => {
            if (USE_MOCK) {
                await delay(300);
                return getMockSettings();
            }
            const res = await fetch(`${API_BASE}/settings.php`, { headers: authHeader() });
            if (!res.ok) throw new Error(`Failed to load settings: ${res.status} ${res.statusText}`);
            return res.json();
        },
        update: async (key: string, value: any) => {
            if (USE_MOCK) {
                await delay(500);
                const current = getMockSettings();
                const updated = { ...current, [key]: value };
                saveMockSettings(updated);
                console.log(`[MOCK] Setting updated: ${key}`, value);
                return { success: true };
            }
            const res = await fetch(`${API_BASE}/settings.php`, {
                method: 'POST',
                headers: authHeader(),
                body: JSON.stringify({ key, value })
            });
            if (!res.ok) throw new Error('Failed to save settings');
            return res.json();
        },
        getEmailConfig: async (userId: string) => {
            if (USE_MOCK) {
                await delay(300);
                const settings = getMockSettings();
                return { success: true, config: settings.email_config };
            }
            const res = await fetch(`${API_BASE}/mail_config.php?user_id=${userId}`, { headers: getHeaders() });
            return res.json();
        },
        saveEmailConfig: async (userId: string, config: any) => {
            if (USE_MOCK) {
                await delay(500);
                const settings = getMockSettings();
                saveMockSettings({ ...settings, email_config: config });
                return { success: true };
            }
            const res = await fetch(`${API_BASE}/mail_config.php?user_id=${userId}`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(config)
            });
            return res.json();
        },
        testEmailConfig: async (userId: string, config: any) => {
            if (USE_MOCK) {
                await delay(1000);
                return { success: true, message: 'Conexión SMTP exitosa [MOCK]' };
            }
            const res = await fetch(`${API_BASE}/mail_config.php?user_id=${userId}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(config)
            });
            return res.json();
        }
    },
    products: {
        list: async (): Promise<Product[]> => {
            if (USE_MOCK) {
                await delay(300);
                return MOCK_PRODUCTS;
            }
            const res = await fetch(`${API_BASE}/products.php`, { headers: getHeaders() });
            if (!res.ok) throw new Error('Error buscando productos');
            return res.json();
        },
        create: async (data: Partial<Product>) => {
            if (USE_MOCK) {
                await delay(400);
                return { success: true, id: 'mock-prod-' + Date.now() };
            }
            const res = await fetch(`${API_BASE}/products.php`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            return res.json();
        },
        update: async (id: string, data: Partial<Product>) => {
            if (USE_MOCK) return { success: true };
            const res = await fetch(`${API_BASE}/products.php?id=${id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            return res.json();
        },
        delete: async (id: string) => {
            if (USE_MOCK) return { success: true };
            const res = await fetch(`${API_BASE}/products.php?id=${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            return res.json();
        }
    },
    tasks: {
        list: async (): Promise<Task[]> => {
            if (USE_MOCK) {
                await delay(300);
                return MOCK_TASKS;
            }
            const res = await fetch(`${API_BASE}/tasks.php`, { headers: getHeaders() });
            if (!res.ok) throw new Error('Error buscando tareas');
            return res.json();
        },
        create: async (data: Partial<Task>) => {
            if (USE_MOCK) return { success: true, id: 'mock-task-' + Date.now() };
            const res = await fetch(`${API_BASE}/tasks.php`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            return res.json();
        },
        update: async (id: string, data: Partial<Task>) => {
            if (USE_MOCK) return { success: true };
            const res = await fetch(`${API_BASE}/tasks.php?id=${id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            return res.json();
        },
        delete: async (id: string) => {
            if (USE_MOCK) return { success: true };
            const res = await fetch(`${API_BASE}/tasks.php?id=${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            return res.json();
        }
    },
    appointments: {
        list: async (filters?: { contactId?: string; userId?: string }): Promise<Appointment[]> => {
            if (USE_MOCK) return [];
            const params = new URLSearchParams();
            if (filters?.contactId) params.append('contact_id', filters.contactId);
            if (filters?.userId) params.append('user_id', filters.userId);

            const res = await fetch(`${API_BASE}/appointments.php?${params.toString()}`, { headers: getHeaders() });
            if (!res.ok) throw new Error('Error fetching appointments');
            return res.json();
        },
        create: async (data: Partial<Appointment>) => {
            if (USE_MOCK) return { success: true, id: 'mock-appt-' + Date.now() };
            const res = await fetch(`${API_BASE}/appointments.php`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                const errorText = await res.text();
                console.error('API Error:', res.status, errorText);
                throw new Error(`Error creating appointment: ${res.status} ${errorText}`);
            }
            return res.json();
        },
        update: async (id: string, data: Partial<Appointment>) => {
            if (USE_MOCK) return { success: true };
            const res = await fetch(`${API_BASE}/appointments.php?id=${id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Error updating appointment');
            return res.json();
        },
        delete: async (id: string) => {
            if (USE_MOCK) return { success: true };
            const res = await fetch(`${API_BASE}/appointments.php?id=${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Error deleting appointment');
            return res.json();
        }
    },
    notes: {
        list: async (contactId?: string) => {
            if (USE_MOCK) return { success: true, data: [] };
            const url = contactId
                ? `${API_BASE}/notes.php?contact_id=${contactId}`
                : `${API_BASE}/notes.php`;
            const res = await fetch(url, { headers: getHeaders() });
            if (!res.ok) throw new Error('Error buscando notas');
            return res.json();
        },
        create: async (data: { contactId: string; content: string; authorId?: number }) => {
            if (USE_MOCK) return { success: true, id: 'mock-note-' + Date.now() };
            const res = await fetch(`${API_BASE}/notes.php`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            return res.json();
        },
        delete: async (id: string) => {
            if (USE_MOCK) return { success: true };
            const res = await fetch(`${API_BASE}/notes.php?id=${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            return res.json();
        }
    },
    history: {
        list: async (contactId?: string) => {
            if (USE_MOCK) return { success: true, data: [] };
            const url = contactId
                ? `${API_BASE}/history.php?contact_id=${contactId}`
                : `${API_BASE}/history.php`;
            const res = await fetch(url, { headers: getHeaders() });
            if (!res.ok) throw new Error('Error buscando historial');
            return res.json();
        },
        create: async (data: { contactId: string; content: string; sender?: string; type?: string; channel?: string; subject?: string }) => {
            if (USE_MOCK) return { success: true };
            const res = await fetch(`${API_BASE}/history.php`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            return res.json();
        }
    },
    team: {
        list: async () => {
            if (USE_MOCK) return MOCK_TEAM;
            const res = await fetch(`${API_BASE}/users.php`, { headers: getHeaders() });
            if (!res.ok) throw new Error('Error buscando equipo');
            return res.json();
        },
        create: async (data: any) => {
            if (USE_MOCK) return { success: true, id: 'mock-user-' + Date.now() };
            const res = await fetch(`${API_BASE}/users.php`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            return res.json();
        },
        update: async (id: string, data: any) => {
            if (USE_MOCK) return { success: true };
            const res = await fetch(`${API_BASE}/users.php?id=${id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            return res.json();
        },
        delete: async (id: string) => {
            if (USE_MOCK) return { success: true };
            const res = await fetch(`${API_BASE}/users.php?id=${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            return res.json();
        }
    },
    files: {
        upload: async (file: File, contactId?: string) => {
            const formData = new FormData();
            formData.append('file', file);
            if (contactId) formData.append('contactId', contactId);
            
            const res = await fetch(`${API_BASE}/upload.php`, {
                method: 'POST',
                headers: authHeader(),
                body: formData
            });
            if (!res.ok) throw new Error('Error uploading file');
            return res.json();
        }
    },
    system: {
        uploadUpdate: async (file: File) => {
            const formData = new FormData();
            formData.append('update_package', file);
            // File upload needs special handling for headers, usually no Content-Type so browser sets boundary
            // But we need Authorization.
            const headers: any = {};
            const token = localStorage.getItem('nexus_auth_token');
            if (token) headers['Authorization'] = `Bearer ${token}`;
            
            const res = await fetch(`${API_BASE}/deploy.php`, {
                method: 'POST',
                headers: headers,
                body: formData
            });
            if (!res.ok) throw new Error('Error al subir el paquete de actualización');
            return res.json();
        }
    },
    pipeline: {
        list: async () => {
            const res = await fetch(`${API_BASE}/pipeline.php`, { headers: authHeader() });
            if (!res.ok) throw new Error(`Error fetching pipeline stages: ${res.status} ${res.statusText}`);
            return res.json();
        },
        create: async (name: string, color: string) => {
            const res = await fetch(`${API_BASE}/pipeline.php`, {
                method: 'POST',
                headers: authHeader(),
                body: JSON.stringify({ name, color })
            });
            return res.json();
        },
        update: async (id: string, data: any) => {
            const res = await fetch(`${API_BASE}/pipeline.php?id=${id}`, {
                method: 'PUT',
                headers: authHeader(),
                body: JSON.stringify(data)
            });
            return res.json();
        },
        reorder: async (ids: string[]) => {
            const res = await fetch(`${API_BASE}/pipeline.php`, {
                method: 'PUT',
                headers: authHeader(),
                body: JSON.stringify({ order: ids })
            });
            return res.json();
        },
        delete: async (id: string) => {
            const res = await fetch(`${API_BASE}/pipeline.php?id=${id}`, {
                method: 'DELETE',
                headers: authHeader()
            });
            return res.json();
        }
    }
};
