
import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Pipeline } from './components/Pipeline';
import { Contacts } from './components/Contacts';
import { Inbox } from './components/Inbox';
import { Automation } from './components/Automation';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { Products } from './components/Products';
import { Calendar } from './components/Calendar';
import { Auth } from './components/Auth';
import { InstallPWA } from './components/InstallPWA';
import { EmailClient } from './components/EmailClient';
import { SupportPanel } from './components/SupportPanel';
import { UserProfile } from './components/UserProfile';
import { NotificationCenter } from './components/NotificationCenter';
import { ToastContainer, ToastMessage } from './components/Toast';
import { api } from './src/services/api';
import { CurrentUser, Contact, TeamMember, Task, DistributionSettings, AutomationRule, LeadStatus, Source, Product, EmailTemplate, CompanyProfile, Notification, AiConfig } from './types';
import { DEFAULT_AUTOMATIONS } from './constants';
import { Menu, Loader2, Bell, X, Check, LayoutDashboard, MessageSquare, Kanban, Users, Package, Mail } from 'lucide-react';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Navigation State (Deep linking within app)
  const [targetContactId, setTargetContactId] = useState<string | null>(null);

  // Global State
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [automations, setAutomations] = useState<AutomationRule[]>(DEFAULT_AUTOMATIONS);
  const [products, setProducts] = useState<Product[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [originalUser, setOriginalUser] = useState<CurrentUser | null>(null);

  // AI Config State
  const [aiConfig, setAiConfig] = useState<AiConfig>({
    connected: false,
    connecting: false,
    provider: 'gemini',
    apiKey: '',
    model: 'gemini-1.5-flash'
  });

  // Notification State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Fetch notifications periodically
  useEffect(() => {
    if (isAuthenticated) {
      const fetchNotifications = async () => {
        try {
          const { api } = await import('./src/services/api');
          const data = await api.notifications.list();
          // Debugging log
          console.log('[App] Notifications fetched:', data);

          const mapped: Notification[] = data.map((n: any) => ({
            id: n.id.toString(),
            title: n.title,
            message: n.message,
            type: n.type,
            timestamp: new Date(n.created_at).toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }),
            read: n.is_read == 1,
            linkTo: n.link_to
          }));
          setNotifications(mapped);
        } catch (e) {
          console.error("Failed to fetch notifications", e);
        }
      };
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000); // Poll every 10s
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // New Company Profile State
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>({
    name: 'KiwüLead',
    industry: 'Tecnología',
    website: 'www.kiwulead.com',
    currency: 'USD',
    logoUrl: '' // Empty by default, uses icon
  });

  const [distributionSettings, setDistributionSettings] = useState<DistributionSettings>({
    enabled: true,
    method: 'round_robin',
    capLimit: 20
  });

  // Mobile Bottom Nav Items configuration
  const bottomNavItems = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'pipeline', label: 'Leads', icon: Kanban },
    { id: 'mail', label: 'Email', icon: Mail },
    { id: 'inbox', label: 'Inbox', icon: MessageSquare },
  ];

  useEffect(() => {
    const initSystem = async () => {
      // 1. Check System Installation Status
      try {
        const statusRes = await fetch('/api/system_status.php');
        if (statusRes.ok) {
            const status = await statusRes.json();
            if (!status.installed) {
                window.location.href = '/install/';
                return;
            }
        }
      } catch (e) {
        console.error("System check failed", e);
      }

      // Check for saved session in localStorage
      const savedToken = localStorage.getItem('nexus_auth_token');
      const savedUser = localStorage.getItem('nexus_user');

      if (savedToken && savedUser) {
        try {
          const user = JSON.parse(savedUser);
          setIsAuthenticated(true);
          setCurrentUser(user);
          await loadData();
        } catch (error) {
          console.error('Error restoring session:', error);
          localStorage.removeItem('nexus_auth_token');
          localStorage.removeItem('nexus_user');
        }
      }
      setIsLoading(false);
    };
    initSystem();

    // Click outside to close notifications
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);

  }, []);

  const addNotification = async (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' | 'urgent', linkTo?: string) => {
    // Add Toast
    const newToast: ToastMessage = {
      id: Date.now().toString(),
      title,
      message,
      type
    };
    setToasts(prev => [...prev, newToast]);

    const newNotif: Notification = {
      id: Date.now().toString(),
      title,
      message,
      type,
      timestamp: 'Ahora',
      read: false,
      linkTo
    };
    setNotifications(prev => [newNotif, ...prev]);

    if (isAuthenticated) {
        try {
            await api.notifications.create({ title, message, type, linkTo });
        } catch (e) { console.error("Error saving notification", e); }
    }
  };
  
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };
  
  const handleMarkRead = async (id: string) => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      try { await api.notifications.markRead(id); } catch(e) {}
  };

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try { await api.notifications.markAllRead(); } catch(e) {}
  };

  const handleDeleteNotification = async (id: string) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
      try { await api.notifications.delete(id); } catch(e) {}
  };

  const handleLogout = () => {
    localStorage.removeItem('nexus_auth_token');
    localStorage.removeItem('nexus_user');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setContacts([]);
    setTasks([]);
    setTeam([]);
    setNotifications([]); // Clear notifications for privacy
    addNotification('Sesión Cerrada', 'Has cerrado sesión correctamente.', 'info');
  };

  const loadData = async () => {
    try {
      // Dynamic Import to avoid top-level failures if API is missing during dev
      const { api } = await import('./src/services/api');

      // Load all data from database
      const [fetchedContacts, fetchedProducts, fetchedTasks, fetchedTeam, fetchedSettings] = await Promise.all([
        api.contacts.list(),
        api.products.list(),
        api.tasks.list(),
        api.team.list(),
        api.settings.list()
      ]);

      setContacts(fetchedContacts);
      setProducts(fetchedProducts);
      setTasks(fetchedTasks);
      setTeam(fetchedTeam);

      // Load Settings
      if (fetchedSettings.company_profile) setCompanyProfile(fetchedSettings.company_profile);
      if (fetchedSettings.distribution_settings) setDistributionSettings(fetchedSettings.distribution_settings);
      if (fetchedSettings.email_templates) setTemplates(fetchedSettings.email_templates);
      if (fetchedSettings.ai) setAiConfig(fetchedSettings.ai);

      // Load Automations
      if (fetchedSettings.automation_status) {
        const statusMap = fetchedSettings.automation_status;
        setAutomations(prev => prev.map(rule => ({
          ...rule,
          isActive: statusMap[rule.id] !== undefined ? statusMap[rule.id] : rule.isActive
        })));
      }

      addNotification('Bienvenido a KiwüLead', 'Datos cargados desde la base de datos.', 'success');
      setIsDemoMode(false);
    } catch (e: any) {
      // Handle Auth Errors specifically
      if (e.message && (e.message.includes('401') || e.message.includes('Unauthorized'))) {
        console.warn("Session expired or unauthorized. Logging out...");
        handleLogout();
        return;
      }

      console.error("API Error", e);
      addNotification('Error de Conexión', 'No se pudieron cargar los datos del servidor.', 'error');
    }
  };

  const handleLogin = async (user: any) => {
    setIsAuthenticated(true);
    setCurrentUser(user);

    // Save user session to localStorage for persistence
    if (user.token) {
      localStorage.setItem('nexus_auth_token', user.token);
      localStorage.setItem('nexus_user', JSON.stringify(user));
    }

    await loadData();
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // --- NAVIGATION HELPER ---
  const handleNavigateToChat = (contactId: string) => {
    setTargetContactId(contactId);
    setActiveTab('inbox');
  };

  const handleNotificationClick = (n: Notification) => {
    if (n.linkTo) {
      // If in pipeline or contacts, we might need to select it, but for inbox deep link works best
      setTargetContactId(n.linkTo);
      setActiveTab('inbox');
    }
    setIsNotifOpen(false);
  };
  
  const handleNotificationLinkClick = (linkTo: string) => {
      setTargetContactId(linkTo);
      setActiveTab('inbox');
      setIsNotifOpen(false);
  };

  const handleUpdateContact = async (contactId: string, updates: Partial<Contact>) => {
    try {
      const { api } = await import('./src/services/api');
      await api.contacts.update(contactId, updates);

      setContacts(prev => prev.map(c =>
        c.id === contactId ? { ...c, ...updates } : c
      ));

      if (updates.history && updates.history.length > 0) {
        addNotification('Contacto Actualizado', 'Se ha registrado una nueva actividad.', 'info', contactId);
      }
    } catch (error) {
      console.error('Error updating contact:', error);
      addNotification('Error', 'No se pudo actualizar el contacto.', 'error');
    }
  };

  // --- AUTOMATION ENGINE ---
  const executeAutomations = async (trigger: string, payload: any) => {
    const activeRules = automations.filter(r => r.isActive && r.trigger === trigger);
    if (activeRules.length === 0) return;

    console.log(`⚡ Ejecutando Trigger: ${trigger}`, activeRules.map(r => r.name));
    const { api } = await import('./src/services/api');

    for (const rule of activeRules) {
      // Rule: Normalization (Applied post-creation to ensure consistency in DB)
      if (rule.id === 'core_1' && trigger === 'ON_LEAD_CREATE') {
        const contact = payload as Contact;
        const normalizedName = contact.name.replace(/\b\w/g, l => l.toUpperCase());

        if (contact.name !== normalizedName) {
          await api.contacts.update(contact.id, { name: normalizedName });
          // Update local state immediately for UI responsiveness
          setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, name: normalizedName } : c));
        }
      }

      // Rule: Lead Assignment Strategy (Round Robin vs Load Balanced)
      if (rule.id === 'core_3' && trigger === 'ON_LEAD_CREATE' && distributionSettings.enabled) {
        const contact = payload as Contact;

        // Check against internal 'Unassigned' constant or UI display value
        if (contact.owner === 'Unassigned' || contact.owner === 'Sin asignar') {
          const salesReps = team.filter(m => m.role === 'Sales' && m.status === 'Active');

          if (salesReps.length > 0) {
            let assignedRepName = '';
            let methodLabel = '';

            if (distributionSettings.method === 'load_balanced') {
              // LOAD BALANCING STRATEGY
              const repLoads = salesReps.map(rep => {
                const load = contacts.filter(c => c.owner === rep.name && c.status !== LeadStatus.WON && c.status !== LeadStatus.LOST).length;
                return { name: rep.name, load };
              });
              repLoads.sort((a, b) => a.load - b.load);
              assignedRepName = repLoads[0].name;
              methodLabel = `Balanceo de Carga`;
            } else {
              // ROUND ROBIN
              const randomRep = salesReps[Math.floor(Math.random() * salesReps.length)];
              assignedRepName = randomRep.name;
              methodLabel = 'Round Robin';
            }

            // Apply assignment in DB
            const ownerMember = team.find(t => t.name === assignedRepName);
            await api.contacts.update(contact.id, { owner_id: ownerMember?.id } as any);

            // Create Note
            await api.notes.create({
              contactId: contact.id,
              content: `🤖 Asignado automáticamente a ${assignedRepName} [Estrategia: ${methodLabel}]`,
              authorId: 1
            });

            setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, owner: assignedRepName } : c));
            addNotification('Lead Asignado', `Lead asignado a ${assignedRepName} por ${methodLabel}.`, 'info', contact.id);
          }
        }
      }

      // Rule: Speed to Lead (Welcome Message & Task)
      if (rule.id === 'core_4' && trigger === 'ON_LEAD_CREATE') {
        const contact = payload as Contact;

        // 1. Log "Sent" Message in History (DB)
        await api.history.create({
          contactId: contact.id,
          content: 'Hola! 👋 Gracias por tu interés. ¿En qué podemos ayudarte hoy?',
          sender: 'agent',
          channel: 'whatsapp'
        });

        // 2. Create High Priority Task in DB
        const taskData = {
          title: `⚡ Primer contacto con ${contact.name}`,
          type: 'Call' as const,
          dueDate: new Date().toISOString().split('T')[0],
          status: 'Pending',
          priority: 'High',
          assignedTo: contact.owner === 'Unassigned' ? (currentUser?.name || 'Admin') : contact.owner,
          relatedContactName: contact.name,
          relatedContactId: contact.id
        };
        const res = await api.tasks.create(taskData as any);

        // Update local state
        const newTask: Task = { ...taskData, id: res.id || 'temp_' + Date.now() } as Task;
        setTasks(prev => [newTask, ...prev]);

        // Reload contacts to get history
        const updatedHistory = await api.history.list(contact.id);
        setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, history: updatedHistory.data || [] } : c));
      }

      // Rule: Automatic Tagging (Qual 2)
      if (rule.id === 'qual_2' && trigger === 'ON_LEAD_CREATE') {
        const contact = payload as Contact;
        const newTags = [...(contact.tags || [])];
        let updated = false;

        if (contact.value > 5000 && !newTags.includes('High Value')) {
          newTags.push('High Value');
          updated = true;
        }
        const sourceStr = contact.source as string;
        if (sourceStr === 'Instagram' || sourceStr === 'Facebook' || sourceStr === 'Meta Ads') {
          if (!newTags.includes('Social Media')) {
            newTags.push('Social Media');
            updated = true;
          }
        }

        if (updated) {
          await api.contacts.update(contact.id, { tags: newTags });
          setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, tags: newTags } : c));
        }
      }

      // Rule: Sequential Follow-up (Sales 2)
      if (rule.id === 'sales_2' && trigger === 'ON_LEAD_CREATE') {
        const contact = payload as Contact;
        const owner = contact.owner === 'Unassigned' ? (currentUser?.name || 'Admin') : contact.owner;

        const followUps = [1, 3, 7];
        for (const days of followUps) {
          const date = new Date();
          date.setDate(date.getDate() + days);

          const taskData = {
            title: `📅 Seguimiento Día ${days}: ${contact.name}`,
            type: 'Email' as const,
            dueDate: date.toISOString().split('T')[0],
            status: 'Pending',
            priority: 'Normal',
            assignedTo: owner,
            relatedContactName: contact.name,
            relatedContactId: contact.id
          };
          await api.tasks.create(taskData as any);
        }
        // Refresh tasks
        const freshTasks = await api.tasks.list();
        setTasks(freshTasks);
      }

      // Rule: Move pipeline on message (Sales 1)
      if (rule.id === 'sales_1' && trigger === 'ON_MESSAGE_SENT') {
        const { contactId } = payload;
        const contact = contacts.find(c => c.id === contactId);

        if (contact && contact.status === LeadStatus.NEW) {
          await api.contacts.update(contactId, { status: LeadStatus.CONTACTED });

          setContacts(prev => prev.map(c => {
            if (c.id === contactId) return { ...c, status: LeadStatus.CONTACTED };
            return c;
          }));
          addNotification('Pipeline Actualizado', 'Lead movido a "Contactado" automáticamente.', 'success', contactId);
        }
      }

      // Rule: On Deal Won (Life 1)
      if (rule.id === 'life_1' && trigger === 'ON_DEAL_WON') {
        const { contactId } = payload;

        const taskData = {
          title: `🚀 Onboarding para cliente ganado`,
          type: 'Meeting' as const,
          dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
          status: 'Pending',
          priority: 'High',
          assignedTo: currentUser?.name || 'Admin',
          relatedContactId: contactId
        };

        const res = await api.tasks.create(taskData as any);
        const newTask: Task = { ...taskData, id: res.id || 'temp_' + Date.now() } as Task;
        setTasks(prev => [newTask, ...prev]);

        addNotification('¡Trato Ganado!', 'Se ha creado la tarea de Onboarding.', 'success', contactId);
      }
    }
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      // 1. SLA Alert (Core 5)
      const slaRule = automations.find(r => r.id === 'core_5' && r.isActive);
      if (slaRule) {
        const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
        const overdueLeads = contacts.filter(c =>
          c.status === LeadStatus.NEW &&
          new Date(c.createdAt).getTime() < tenMinutesAgo
        );

        if (overdueLeads.length > 0) {
          addNotification(
            '⚠️ Alerta SLA',
            `Atención: Tienes ${overdueLeads.length} leads nuevos sin atender por más de 10 min.`,
            'warning',
            overdueLeads[0].id
          );
        }
      }

      // 2. Inactivity Reassignment (Sales 4)
      const reassignRule = automations.find(r => r.id === 'sales_4' && r.isActive);
      if (reassignRule) {
        const { api } = await import('./src/services/api');
        const twoDaysAgo = Date.now() - 48 * 60 * 60 * 1000;

        // Find leads that are assigned, not won/lost, and inactive > 48h
        const staleLeads = contacts.filter(c =>
          c.owner !== 'Unassigned' && c.owner !== 'Sin asignar' &&
          c.status !== LeadStatus.WON && c.status !== LeadStatus.LOST &&
          // Parse 'lastActivityTimestamp' if available, otherwise check creation or lastActivity text (simplified here)
          (c.lastActivityTimestamp ? c.lastActivityTimestamp < twoDaysAgo : false)
        );

        for (const lead of staleLeads) {
          await api.contacts.update(lead.id, { owner_id: null } as any); // Unassign
          await api.notes.create({
            contactId: lead.id,
            content: '🤖 Reasignado al pool por inactividad (48h sin acción).',
            authorId: 1
          });
        }

        if (staleLeads.length > 0) {
          const freshContacts = await api.contacts.list();
          setContacts(freshContacts);
          addNotification('Limpieza de Pipeline', `${staleLeads.length} leads inactivos fueron desasignados.`, 'info');
        }
      }

      // 3. Lost Reactivation (Life 2)
      const reactivateRule = automations.find(r => r.id === 'life_2' && r.isActive);
      if (reactivateRule) {
        const { api } = await import('./src/services/api');
        const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;

        // Find lost leads older than 90 days that don't have a recent reactivation task
        const lostLeads = contacts.filter(c =>
          c.status === LeadStatus.LOST &&
          new Date(c.createdAt).getTime() < ninetyDaysAgo
        );

        for (const lead of lostLeads) {
          // Check if we already created a task (avoid duplicate loop)
          const hasTask = tasks.some(t => t.relatedContactId === lead.id && t.title.includes('Reactivación'));
          if (!hasTask) {
            await api.tasks.create({
              title: `♻️ Reactivación: ${lead.name}`,
              type: 'Call',
              status: 'Pending',
              dueDate: new Date().toISOString().split('T')[0],
              priority: 'Normal',
              assignedTo: currentUser?.name || 'Admin',
              relatedContactId: lead.id,
              description: 'Este lead se perdió hace 90 días. Intenta contactarlo de nuevo.'
            });
          }
        }
        if (lostLeads.length > 0) {
          const freshTasks = await api.tasks.list();
          setTasks(freshTasks);
        }
      }

      // 4. Task Reminders (Sales Rep Alert)
      const now = new Date();
      tasks.forEach(task => {
        if (task.reminder && task.reminder.enabled && task.status !== 'Done') {
          const dueDate = new Date(`${task.dueDate}T${task.dueTime || '09:00'}`);
          // Calculate reminder time
          const reminderTime = new Date(dueDate);
          if (task.reminder.timeUnit === 'minutes') reminderTime.setMinutes(reminderTime.getMinutes() - task.reminder.timeValue);
          if (task.reminder.timeUnit === 'hours') reminderTime.setHours(reminderTime.getHours() - task.reminder.timeValue);
          if (task.reminder.timeUnit === 'days') reminderTime.setDate(reminderTime.getDate() - task.reminder.timeValue);

          // Check if it's time to notify (within last 2 minutes to avoid double fire, or use local storage state)
          const diff = now.getTime() - reminderTime.getTime();
          if (diff >= 0 && diff < 60000) { // If within the minute after reminder time
            addNotification(
              '⏰ Recordatorio de Tarea',
              `Es hora de: ${task.title} (${task.relatedContactName || 'Sin contacto'})`,
              'info',
              task.relatedContactId
            );
          }
        }
      });

    }, 60000);
    return () => clearInterval(interval);
  }, [contacts, automations, tasks, distributionSettings]);

  const handleAddContact = async (newContact: Contact) => {
    // 1. Check Duplicates Rule
    const dedupeRule = automations.find(r => r.id === 'core_2' && r.isActive);
    if (dedupeRule) {
      const exists = contacts.find(c => c.email === newContact.email || c.phone === newContact.phone);
      if (exists) {
        addNotification('Duplicado Detectado', `${exists.name} ya existe. No se creó el lead.`, 'error', exists.id);
        return;
      }
    }

    try {
      // 2. Call API to create contact in database FIRST
      const { api } = await import('./src/services/api');
      const response = await api.contacts.create({
        name: newContact.name,
        email: newContact.email,
        phone: newContact.phone,
        company: newContact.company,
        status: newContact.status,
        source: newContact.source,
        value: newContact.value,
        tags: newContact.tags
      });

      if (response.success) {
        const createdId = response.id;

        // 3. Construct the full contact object with ID to pass to automations
        const createdContact = { ...newContact, id: createdId, owner: 'Unassigned' }; // Default unassigned until automation runs

        // 4. Run Automations (Now Async and with real ID)
        await executeAutomations('ON_LEAD_CREATE', createdContact);

        // 5. Reload contacts to reflect all automation changes (Tags, Assignments, etc)
        const updatedContacts = await api.contacts.list();
        setContacts(updatedContacts);

        addNotification('Lead Creado', `${newContact.name} agregado y procesado.`, 'success', createdId);
      }
    } catch (error) {
      console.error('Error creating contact:', error);
      addNotification('Error', 'No se pudo crear el contacto. Verifica la conexión con la base de datos.', 'error');
    }
  };

  const handlePipelineUpdate = async (contactId: string, newStatus: string, lostReason?: string, newProbability?: number) => {
    const taskRule = automations.find(r => r.id === 'sales_3' && r.isActive);
    if (taskRule && newStatus !== LeadStatus.LOST && newStatus !== LeadStatus.NEW) {
      const pendingTasks = tasks.filter(t => t.relatedContactId === contactId && t.status === 'Pending');
      if (pendingTasks.length > 0) {
        addNotification('Bloqueo de Automatización', `Completa las ${pendingTasks.length} tareas pendientes antes de avanzar.`, 'warning', contactId);
        return;
      }
    }

    const qualityRule = automations.find(r => r.id === 'qual_1' && r.isActive);
    if (qualityRule) {
      const contact = contacts.find(c => c.id === contactId);
      if (contact) {
        if (newStatus === LeadStatus.QUALIFIED && (!contact.email || !contact.email.includes('@'))) {
          addNotification('Datos Incompletos', 'Se requiere Email válido para calificar.', 'error', contactId);
          return;
        }
        if (newStatus === LeadStatus.WON && contact.value <= 0) {
          addNotification('Datos Incompletos', 'El valor del trato debe ser mayor a 0.', 'error', contactId);
          return;
        }
      }
    }

    try {
      // Optimistic Update: Update local state immediately
      const prevContacts = [...contacts]; // Backup for rollback

      setContacts(prev => prev.map(c => {
        if (c.id === contactId) {
          return { 
            ...c, 
            status: newStatus, 
            lostReason: lostReason || c.lostReason,
            probability: newProbability !== undefined ? newProbability : c.probability
          };
        }
        return c;
      }));

      // Call API to update contact status in database
      const { api } = await import('./src/services/api');
      const updateData: any = { status: newStatus };
      if (lostReason) {
        updateData.lost_reason = lostReason;
      }
      if (newProbability !== undefined) {
        updateData.probability = newProbability;
      }

      await api.contacts.update(contactId, updateData);

      // Trigger automations
      if (newStatus === LeadStatus.WON) executeAutomations('ON_DEAL_WON', { contactId });
      if (newStatus === LeadStatus.LOST) executeAutomations('ON_DEAL_LOST', { contactId });

      addNotification('Pipeline Actualizado', `Estado cambiado a ${newStatus}`, 'success', contactId);
    } catch (error) {
      console.error('Error updating pipeline:', error);
      // Revert or Reload on error
      const { api } = await import('./src/services/api');
      const freshContacts = await api.contacts.list();
      setContacts(freshContacts);
      addNotification('Error', 'No se pudo actualizar el pipeline. Cambios revertidos.', 'error');
    }
  };

  const handleAssign = async (contactId: string, newOwner: string) => {
    try {
      const { api } = await import('./src/services/api');

      // Find the owner ID from team members
      const ownerMember = team.find(t => t.name === newOwner);
      const ownerId = ownerMember?.id || null;

      // Update contact in database
      await api.contacts.update(contactId, {
        owner_id: ownerId
      } as any);

      // Create a note in the database to track assignment
      await api.notes.create({
        contactId: contactId,
        content: `Lead asignado manualmente a ${newOwner}`,
        authorId: currentUser?.id || 1
      });

      // Update local state
      setContacts(prev => prev.map(c => {
        if (c.id === contactId) {
          const updatedContact = { ...c, owner: newOwner };
          // Add note to local state as well
          updatedContact.notes = [
            {
              id: `note_${Date.now()}`,
              content: `Lead asignado manualmente a ${newOwner}`,
              createdAt: new Date().toISOString().split('T')[0],
              author: currentUser?.name || 'Sistema'
            },
            ...c.notes
          ];
          return updatedContact;
        }
        return c;
      }));

      addNotification('Asignación Actualizada', `El lead ahora pertenece a ${newOwner}.`, 'success', contactId);
    } catch (error) {
      console.error('Error assigning contact:', error);
      addNotification('Error', 'No se pudo asignar el contacto.', 'error');
    }
  };

  const handleSendMessage = async (contactId: string, message: any) => {
    await executeAutomations('ON_MESSAGE_SENT', { contactId });
  };

  const handleImpersonate = (targetUser: TeamMember) => {
    if (!currentUser) return;
    setOriginalUser(currentUser);

    // Map TeamMember to CurrentUser
    const impersonatedUser: CurrentUser = {
      id: parseInt(targetUser.id),
      name: targetUser.name,
      role: targetUser.role === 'Sales' ? 'SALES_REP' : (targetUser.role === 'Support' ? 'SUPPORT' : 'MANAGER'),
      avatar: targetUser.name.substring(0, 2).toUpperCase(),
      token: currentUser.token // Keep original token to maintain API access
    };

    setCurrentUser(impersonatedUser);
    setActiveTab('dashboard');
    addNotification('Modo Impersonación', `Ahora estás viendo como ${targetUser.name}`, 'warning');
  };

  const handleExitImpersonation = () => {
    if (originalUser) {
      setCurrentUser(originalUser);
      setOriginalUser(null);
      addNotification('Modo Original', 'Has vuelto a tu sesión de Soporte.', 'success');
    }
  };

  const renderContent = () => {
    if (!currentUser) return null;

    if (currentUser.role === 'SALES_REP' && ['automation', 'reports', 'settings', 'support'].includes(activeTab)) {
      return <Dashboard currentUser={currentUser} tasks={tasks} setTasks={setTasks} contacts={contacts} companyCurrency={companyProfile.currency} />;
    }

    if (currentUser.role === 'MANAGER' && ['support'].includes(activeTab)) {
      return <Dashboard currentUser={currentUser} tasks={tasks} setTasks={setTasks} contacts={contacts} companyCurrency={companyProfile.currency} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard currentUser={currentUser} tasks={tasks} setTasks={setTasks} contacts={contacts} companyCurrency={companyProfile.currency} />;
      case 'pipeline':
        return (
          <Pipeline
            currentUser={currentUser}
            contacts={contacts}
            setContacts={setContacts}
            onStatusChange={handlePipelineUpdate}
            onNavigateToChat={handleNavigateToChat}
            products={products}
            onNotify={addNotification}
            onAddDeal={handleAddContact}
            onAssign={handleAssign}
            team={team}
            aiConfig={aiConfig}
            companyCurrency={companyProfile.currency}
          />
        );
      case 'calendar':
        return <Calendar currentUser={currentUser} contacts={contacts} team={team} onNotify={addNotification} products={products} />;
      // Contacts tab removed (merged into Pipeline)
      case 'products':
        return <Products products={products} setProducts={setProducts} currentUser={currentUser} onNotify={addNotification} />;
      case 'inbox':
        return (
          <Inbox
            currentUser={currentUser}
            contacts={contacts}
            setContacts={setContacts}
            tasks={tasks}
            setTasks={setTasks}
            onMessageSent={handleSendMessage}
            products={products}
            templates={templates}
            initialContactId={targetContactId}
            onNotify={addNotification}
            aiConfig={aiConfig}
          />
        );
      case 'automation':
        return <Automation rules={automations} setRules={setAutomations} />;
      case 'reports':
          return <Reports currentUser={currentUser} contacts={contacts} team={team} tasks={tasks} companyCurrency={companyProfile.currency} />;
      case 'support':
        return <SupportPanel currentUser={currentUser} onNotify={addNotification} />;
      case 'settings':
        return (
          <Settings
            currentUser={currentUser}
            team={team}
            setTeam={setTeam}
            distributionSettings={distributionSettings}
            setDistributionSettings={setDistributionSettings}
            templates={templates}
            setTemplates={setTemplates}
            companyProfile={companyProfile}
            setCompanyProfile={setCompanyProfile}
            onInjectLead={handleAddContact}
            contacts={contacts}
            setContacts={setContacts}
            onNotify={addNotification}
            onRefreshData={loadData}
            onLogout={handleLogout}
          />
        );
      case 'mail':
        return <EmailClient currentUser={currentUser} onNotify={addNotification} contacts={contacts} />;
      case 'user-profile':
        return <UserProfile currentUser={currentUser} />;
      default:
        return <Dashboard currentUser={currentUser} tasks={tasks} setTasks={setTasks} contacts={contacts} companyCurrency={companyProfile.currency} />;
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white">
        <Loader2 size={48} className="animate-spin mb-4 text-blue-500" />
        <h2 className="text-xl font-bold tracking-tight">KiwüLead</h2>
      </div>
    );
  }

  return (
    <>
      <InstallPWA />
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      {!isAuthenticated ? (
        <Auth onLogin={handleLogin} />
      ) : (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
          {/* DEMO MODE BANNER */}
          {isDemoMode && (
            <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-xs font-bold text-center py-1 z-[100] shadow-md">
              MODO SIN CONEXIÓN: Los cambios no se guardarán en la base de datos.
            </div>
          )}

          {/* MOBILE HEADER - Z-30 to stay below Modals (Z-50) */}
          <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-slate-900 flex items-center px-4 justify-between shadow-md pt-safe h-[calc(4rem+env(safe-area-inset-top))]">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-white p-1">
                <Menu size={24} />
              </button>
              <span className="text-lg font-bold text-white tracking-tight">{companyProfile.name}</span>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="relative text-slate-300">
                <Bell size={24} />
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">{unreadCount}</span>}
              </button>
            </div>
          </div>

          {/* MOBILE NOTIFICATIONS DROPDOWN - High Z to float above all */}
          {isNotifOpen && (
            <>
              <div className="fixed inset-0 bg-black/20 z-[75] lg:hidden backdrop-blur-sm" onClick={() => setIsNotifOpen(false)} />
              <div className="fixed top-20 right-4 left-4 z-[80] lg:hidden">
                  <NotificationCenter 
                    notifications={notifications}
                    onMarkRead={handleMarkRead}
                    onMarkAllRead={handleMarkAllRead}
                    onDelete={handleDeleteNotification}
                    onClose={() => setIsNotifOpen(false)}
                    onNavigate={handleNotificationLinkClick}
                  />
              </div>
            </>
          )}

          {isSidebarOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] lg:hidden" onClick={() => setIsSidebarOpen(false)} />
          )}

          <div className={`fixed lg:static inset-y-0 left-0 z-[70] transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-200 ease-in-out`}>
            <Sidebar
              activeTab={activeTab}
              setActiveTab={(tab) => {
                setActiveTab(tab);
                setIsSidebarOpen(false);
              }}
              currentUser={currentUser!}
              setCurrentUser={setCurrentUser}
              companyProfile={companyProfile}
              onLogout={handleLogout}
            />
          </div>

          <main className="flex-1 overflow-auto relative pt-[calc(4rem+env(safe-area-inset-top))] lg:pt-0 w-full flex flex-col pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0">
            {originalUser && (
              <div className="bg-amber-500 text-white px-4 py-2 text-sm font-bold flex justify-between items-center shadow-md z-40 sticky top-0">
                <div className="flex items-center gap-2">
                  <Users size={16} />
                  <span>VIENDO COMO: {currentUser?.name} ({currentUser?.role})</span>
                </div>
                <button onClick={handleExitImpersonation} className="bg-white text-amber-600 px-3 py-1 rounded text-xs hover:bg-amber-50 uppercase font-bold shadow-sm">
                  Salir de la vista
                </button>
              </div>
            )}
            {/* DESKTOP TOP BAR */}
            <div className="hidden lg:flex h-16 bg-white border-b border-slate-200 px-6 justify-between items-center sticky top-0 z-30 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 tracking-tight capitalize">{activeTab === 'inbox' ? 'Bandeja de Entrada' : activeTab}</h2>

              <div className="flex items-center gap-5">
                {/* Notification Bell */}
                <div className="relative" ref={notifRef}>
                  <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="relative text-slate-500 hover:text-blue-600 transition-colors p-2 rounded-full hover:bg-slate-100 outline-none">
                    <Bell size={20} />
                    {unreadCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
                  </button>

                  {/* Notification Dropdown */}
                  {isNotifOpen && (
                      <NotificationCenter 
                        notifications={notifications}
                        onMarkRead={handleMarkRead}
                        onMarkAllRead={handleMarkAllRead}
                        onDelete={handleDeleteNotification}
                        onClose={() => setIsNotifOpen(false)}
                        onNavigate={handleNotificationLinkClick}
                      />
                  )}
                </div>

                <div className="flex items-center gap-3 pl-5 border-l border-slate-200">
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900 leading-none">{currentUser?.name}</p>
                    <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">{currentUser?.role}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {renderContent()}
            </div>

            {/* MOBILE BOTTOM NAVIGATION (APP MODE) - Z-30 to stay below Modals */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 flex justify-around items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-safe select-none h-auto min-h-[4rem]">
              {bottomNavItems.map(item => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex flex-col items-center justify-center w-full h-16 space-y-1 active:scale-95 transition-transform duration-100 ${isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'} relative`}
                  >
                    {isActive && <div className="absolute top-0 w-12 h-0.5 bg-blue-600 rounded-b-full"></div>}
                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'drop-shadow-sm' : ''} />
                    <span className={`text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </main>
        </div>
      )}
    </>
  );
};

const ContactsWrapper: React.FC<any> = ({ currentUser, contacts, onAddContact, setContacts, onNotify, team, products }) => {
  return <Contacts currentUser={currentUser} contacts={contacts} setContacts={setContacts} onAddContact={onAddContact} onNotify={onNotify} team={team} products={products} />;
}

export default App;
