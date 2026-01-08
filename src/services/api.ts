
import { Contact, Product, Task, UserRole, CurrentUser, LeadStatus, Source, TeamMember, Appointment, Message, Note } from '../../types';

const API_BASE = (import.meta as any).env?.VITE_API_BASE || '/api';

console.log(`[API] Initializing. API_BASE=${API_BASE} (REAL DATA ONLY)`);

// --- HELPER ---
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

const getHeaders = () => authHeader();

// --- API IMPLEMENTATION ---

export const api = {
    auth: {
        login: async (email: string, pass: string): Promise<{ success: boolean, user: CurrentUser }> => {
            const res = await fetch(`${API_BASE}/auth.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: pass })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Login failed');
            }

            const data = await res.json();
            return { success: true, user: { ...data.user, token: data.token } };
        },
        register: async (name: string, email: string, pass: string) => {
            const res = await fetch(`${API_BASE}/auth.php?action=register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password: pass })
            });
            if (!res.ok) throw new Error('Registration failed');
            return res.json();
        },
        forgotPassword: async (email: string) => {
            const res = await fetch(`${API_BASE}/forgot_password.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Request failed');
            }
            return res.json();
        },
        resetPassword: async (token: string, pass: string) => {
            const res = await fetch(`${API_BASE}/reset_password.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password: pass })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Reset failed');
            }
            return res.json();
        },
        updateProfile: async (id: number, data: Partial<CurrentUser>) => {
            const res = await fetch(`${API_BASE}/users.php?id=${id}`, {
                method: 'PUT',
                headers: authHeader(),
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to update profile');
            return res.json();
        }
    },
    contacts: {
        list: async (): Promise<Contact[]> => {
            const res = await fetch(`${API_BASE}/contacts.php`, { headers: authHeader() });
            if (!res.ok) throw new Error(`Failed to fetch contacts: ${res.status} ${res.statusText}`);
            return res.json();
        },
        create: async (contact: Partial<Contact>) => {
            const res = await fetch(`${API_BASE}/contacts.php`, {
                method: 'POST',
                headers: authHeader(),
                body: JSON.stringify(contact)
            });
            if (!res.ok) throw new Error('Failed to create contact');
            return res.json();
        },
        update: async (id: string, updates: Partial<Contact>) => {
            const res = await fetch(`${API_BASE}/contacts.php?id=${id}`, {
                method: 'PUT',
                headers: authHeader(),
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error('Failed to update contact');
            return res.json();
        },
        delete: async (id: string) => {
            const res = await fetch(`${API_BASE}/contacts.php?id=${id}`, {
                method: 'DELETE',
                headers: authHeader()
            });
            if (!res.ok) throw new Error('Failed to delete contact');
            return res.json();
        },
        search: async (query: string) => {
            const res = await fetch(`${API_BASE}/search_contacts.php?q=${encodeURIComponent(query)}`, {
                headers: authHeader()
            });
            if (!res.ok) throw new Error('Failed to search contacts');
            return res.json();
        }
    },
    tasks: {
        list: async (filters?: any): Promise<Task[]> => {
            const params = new URLSearchParams(filters).toString();
            const res = await fetch(`${API_BASE}/tasks.php?${params}`, { headers: authHeader() });
            if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status} ${res.statusText}`);
            return res.json();
        },
        create: async (task: Partial<Task>) => {
            const res = await fetch(`${API_BASE}/tasks.php`, {
                method: 'POST',
                headers: authHeader(),
                body: JSON.stringify(task)
            });
            if (!res.ok) throw new Error('Failed to create task');
            return res.json();
        },
        update: async (id: string, updates: Partial<Task>) => {
            const res = await fetch(`${API_BASE}/tasks.php?id=${id}`, {
                method: 'PUT',
                headers: authHeader(),
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error('Failed to update task');
            return res.json();
        },
        delete: async (id: string) => {
            const res = await fetch(`${API_BASE}/tasks.php?id=${id}`, {
                method: 'DELETE',
                headers: authHeader()
            });
            if (!res.ok) throw new Error('Failed to delete task');
            return res.json();
        }
    },
    products: {
        list: async (): Promise<Product[]> => {
            const res = await fetch(`${API_BASE}/products.php`, { headers: authHeader() });
            if (!res.ok) throw new Error(`Failed to fetch products: ${res.status} ${res.statusText}`);
            return res.json();
        },
        create: async (product: Omit<Product, 'id'>) => {
            const res = await fetch(`${API_BASE}/products.php`, {
                method: 'POST',
                headers: authHeader(),
                body: JSON.stringify(product)
            });
            if (!res.ok) throw new Error('Failed to create product');
            return res.json();
        },
        update: async (id: string, updates: Partial<Product>) => {
            const res = await fetch(`${API_BASE}/products.php?id=${id}`, {
                method: 'PUT',
                headers: authHeader(),
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error('Failed to update product');
            return res.json();
        },
        delete: async (id: string) => {
            const res = await fetch(`${API_BASE}/products.php?id=${id}`, {
                method: 'DELETE',
                headers: authHeader()
            });
            if (!res.ok) throw new Error('Failed to delete product');
            return res.json();
        }
    },
    team: {
        list: async (): Promise<TeamMember[]> => {
            const res = await fetch(`${API_BASE}/users.php`, { headers: authHeader() });
            if (!res.ok) throw new Error(`Failed to list users: ${res.status} ${res.statusText}`);
            return res.json();
        },
        create: async (user: any) => {
            const res = await fetch(`${API_BASE}/users.php`, {
                method: 'POST',
                headers: authHeader(),
                body: JSON.stringify(user)
            });
            if (!res.ok) throw new Error('Failed to create user');
            return res.json();
        },
        delete: async (id: string) => {
            const res = await fetch(`${API_BASE}/users.php?id=${id}`, {
                method: 'DELETE',
                headers: authHeader()
            });
            if (!res.ok) throw new Error('Failed to delete user');
            return res.json();
        },
        invite: async (email: string, role: UserRole) => {
            // Real implementation could be a new endpoint or users.php action
            return { success: true };
        }
    },
    settings: {
        getPublicConfig: async () => {
            try {
                const res = await fetch(`${API_BASE}/public_config.php`);
                if (!res.ok) return null;
                return res.json();
            } catch (e) { return null; }
        },
        list: async () => {
            const res = await fetch(`${API_BASE}/settings.php`, { headers: authHeader() });
            if (!res.ok) throw new Error(`Failed to load settings: ${res.status} ${res.statusText}`);
            return res.json();
        },
        update: async (key: string, value: any) => {
            const res = await fetch(`${API_BASE}/settings.php`, {
                method: 'POST',
                headers: { ...authHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, value })
            });
            if (!res.ok) throw new Error('Failed to save settings');
            return res.json();
        },
        getEmailConfig: async (userId: string) => {
            const res = await fetch(`${API_BASE}/mail_config.php?user_id=${userId}`, { headers: authHeader() });
            return res.json();
        },
        saveEmailConfig: async (userId: string, config: any) => {
            const res = await fetch(`${API_BASE}/mail_config.php?user_id=${userId}`, {
                method: 'POST',
                headers: { ...authHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            return res.json();
        },
        testEmailConfig: async (userId: string, config: any) => {
            const res = await fetch(`${API_BASE}/mail_config.php?user_id=${userId}`, {
                method: 'PUT',
                headers: { ...authHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            return res.json();
        }
    },
    appointments: {
        list: async (filters?: any): Promise<Appointment[]> => {
            const params = new URLSearchParams(filters).toString();
            const res = await fetch(`${API_BASE}/appointments.php?${params}`, { headers: authHeader() });
            if (!res.ok) throw new Error('Failed to fetch appointments');
            return res.json();
        },
        create: async (apt: Partial<Appointment>) => {
            const res = await fetch(`${API_BASE}/appointments.php`, {
                method: 'POST',
                headers: authHeader(),
                body: JSON.stringify(apt)
            });
            if (!res.ok) throw new Error('Failed to create appointment');
            return res.json();
        },
        update: async (id: string, updates: Partial<Appointment>) => {
            const res = await fetch(`${API_BASE}/appointments.php?id=${id}`, {
                method: 'PUT',
                headers: authHeader(),
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error('Failed to update appointment');
            return res.json();
        },
        delete: async (id: string) => {
            const res = await fetch(`${API_BASE}/appointments.php?id=${id}`, {
                method: 'DELETE',
                headers: authHeader()
            });
            if (!res.ok) throw new Error('Failed to delete appointment');
            return res.json();
        }
    },
    emails: {
        list: async (folder: string, userId: string) => {
            const res = await fetch(`${API_BASE}/emails.php?folder=${folder}&user_id=${userId}`, { headers: authHeader() });
            if (!res.ok) throw new Error('Failed to fetch emails');
            return res.json();
        },
        send: async (data: FormData) => {
            const res = await fetch(`${API_BASE}/send_mail.php`, {
                method: 'POST',
                headers: { 'Authorization': authHeader().Authorization }, // Omit Content-Type for FormData
                body: data
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to send email');
            }
            return res.json();
        },
        sync: async (userId: string) => {
            const res = await fetch(`${API_BASE}/fetch_mail.php?user_id=${userId}`, { headers: authHeader() });
            if (!res.ok) {
                try { return await res.json(); } catch { throw new Error('Failed to sync emails'); }
            }
            return res.json();
        },
        markRead: async (emailId: string, userId: string) => {
            const res = await fetch(`${API_BASE}/email_actions.php`, {
                method: 'POST',
                headers: authHeader(),
                body: JSON.stringify({ action: 'mark_read', email_id: emailId, user_id: userId })
            });
            if (!res.ok) throw new Error('Failed to mark email as read');
            return res.json();
        },
        delete: async (id: string, userId: string) => {
            const res = await fetch(`${API_BASE}/email_actions.php`, {
                method: 'POST',
                headers: authHeader(),
                body: JSON.stringify({ action: 'trash', email_id: id, user_id: userId })
            });
            if (!res.ok) throw new Error('Failed to delete email');
            return res.json();
        },
        saveDraft: async (draft: any) => {
            const res = await fetch(`${API_BASE}/email_actions.php`, {
                method: 'POST',
                headers: authHeader(),
                body: JSON.stringify({ action: 'save_draft', ...draft })
            });
            if (!res.ok) throw new Error('Failed to save draft');
            return res.json();
        },
        // Generic post for flexible actions if needed
        post: async (endpoint: string, data: any) => {
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: authHeader(),
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Action failed');
            return res.json();
        }
    },
    notes: {
        create: async (note: any) => {
            const res = await fetch(`${API_BASE}/notes.php`, {
                method: 'POST',
                headers: { ...authHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify(note)
            });
            if (!res.ok) throw new Error('Failed to create note');
            return res.json();
        }
    },
    files: {
        upload: async (file: File, contactId: string) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('contact_id', contactId);

            const res = await fetch(`${API_BASE}/upload.php`, {
                method: 'POST',
                headers: { 'Authorization': authHeader().Authorization }, // Need to omit Content-Type for FormData
                body: formData
            });
            if (!res.ok) throw new Error('Upload failed');
            return res.json();
        }
    },
    pipeline: {
        list: async () => {
            const res = await fetch(`${API_BASE}/pipeline.php`, { headers: authHeader() });
            if (!res.ok) throw new Error(`Error fetching pipeline stages: ${res.status} ${res.statusText}`);
            return res.json();
        },
        create: async (name: string, color: string, probability: number = 0) => {
            const res = await fetch(`${API_BASE}/pipeline.php`, {
                method: 'POST',
                headers: authHeader(),
                body: JSON.stringify({ name, color, probability })
            });
            if (!res.ok) throw new Error('Failed to create stage');
            return res.json();
        },
        update: async (id: string, updates: Partial<{ name: string; color: string; probability: number; isActive: boolean }>) => {
            const res = await fetch(`${API_BASE}/pipeline.php?id=${id}`, {
                method: 'PUT',
                headers: authHeader(),
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error('Failed to update stage');
            return res.json();
        },
        delete: async (id: string) => {
            const res = await fetch(`${API_BASE}/pipeline.php?id=${id}`, {
                method: 'DELETE',
                headers: authHeader()
            });
            if (!res.ok) {
                try { return await res.json(); } catch { throw new Error('Failed to delete stage'); }
            }
            return res.json();
        },
        reorder: async (orderedIds: string[]) => {
            const res = await fetch(`${API_BASE}/pipeline.php`, {
                method: 'PUT',
                headers: authHeader(),
                body: JSON.stringify({ order: orderedIds })
            });
            if (!res.ok) throw new Error('Failed to reorder stages');
            return res.json();
        }
    },
    // Meta/WhatsApp Integration
    meta: {
        getConfig: async () => {
            try {
                const res = await fetch(`${API_BASE}/meta.php?action=config`, { headers: authHeader() });
                if (!res.ok) return null;
                const data = await res.json();
                return data.config;
            } catch (e) { return null; }
        },
        saveConfig: async (config: any) => {
            const res = await fetch(`${API_BASE}/meta.php?action=config`, {
                method: 'POST',
                headers: authHeader(),
                body: JSON.stringify(config)
            });
            if (!res.ok) throw new Error('Failed to save Meta config');
            return res.json();
        },
        getTemplates: async () => {
            const res = await fetch(`${API_BASE}/meta.php?action=templates`, { headers: authHeader() });
            if (!res.ok) throw new Error('Failed to load templates');
            return res.json();
        },
        sendTemplate: async (to: string, template: string, language: string) => {
            const res = await fetch(`${API_BASE}/meta.php?action=send_template`, {
                method: 'POST',
                headers: authHeader(),
                body: JSON.stringify({ to, template, language })
            });
            if (!res.ok) throw new Error('Failed to send template');
            return res.json();
        },
        sendMessage: async (to: string, text: string) => {
            const res = await fetch(`${API_BASE}/meta.php?action=send_message`, {
                method: 'POST',
                headers: authHeader(),
                body: JSON.stringify({ to, text })
            });
            // Don't throw immediately, return result to handle 24h window error gracefully
            return res.json();
        }
    },
    history: {
        list: async (filters?: any) => {
            const params = new URLSearchParams(filters).toString();
            const res = await fetch(`${API_BASE}/history.php?${params}`, { headers: authHeader() });
            if (!res.ok) throw new Error('Failed to fetch history');
            return res.json();
        },
        create: async (historyEntry: any) => {
            const res = await fetch(`${API_BASE}/history.php`, {
                method: 'POST',
                headers: { ...authHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify(historyEntry)
            });
            if (!res.ok) throw new Error('Failed to create history entry');
            return res.json();
        }
    }
};
