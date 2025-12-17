
import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Pipeline } from './components/Pipeline';
import { Contacts } from './components/Contacts';
import { Inbox } from './components/Inbox';
import { Automation } from './components/Automation';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { Support } from './components/Support';
import { Products } from './components/Products';
import { Auth } from './components/Auth';
import { InstallPWA } from './components/InstallPWA';
import { CurrentUser, Contact, TeamMember, Task, DistributionSettings, AutomationRule, LeadStatus, Source, Product, EmailTemplate, CompanyProfile, Notification } from './types';
import { MOCK_CONTACTS, TEAM_MEMBERS, MOCK_TASKS, DEFAULT_AUTOMATIONS, MOCK_PRODUCTS, MOCK_TEMPLATES } from './constants';
import { Menu, Loader2, Bell, X, Check, LayoutDashboard, MessageSquare, Kanban, Users, Package } from 'lucide-react';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Navigation State (Deep linking within app)
  const [targetContactId, setTargetContactId] = useState<string | null>(null);
  
  // Global State
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [automations, setAutomations] = useState<AutomationRule[]>(DEFAULT_AUTOMATIONS);
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [templates, setTemplates] = useState<EmailTemplate[]>(MOCK_TEMPLATES);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // Notification State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // New Company Profile State
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>({
      name: 'Nexus CRM',
      industry: 'Tecnología',
      website: 'www.nexus-crm.com',
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
    { id: 'inbox', label: 'Inbox', icon: MessageSquare },
    { id: 'pipeline', label: 'Ventas', icon: Kanban },
    { id: 'contacts', label: 'Contactos', icon: Users },
    { id: 'products', label: 'Items', icon: Package },
  ];

  useEffect(() => {
    const initSystem = async () => {
      // Simulate auth check
      const hasSession = false; 
      if (hasSession) {
         setIsAuthenticated(true);
         setCurrentUser({ name: 'John Doe', role: 'MANAGER', avatar: 'JD' });
         await loadData();
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

  const loadData = async () => {
      await new Promise(resolve => setTimeout(resolve, 800));
      setContacts(MOCK_CONTACTS);
      setTeam(TEAM_MEMBERS);
      setTasks(MOCK_TASKS);
      // Initial Welcome Notification
      addNotification('Bienvenido a Nexus CRM', 'El sistema está listo y operando.', 'success');
  };

  const handleLogin = async (user: any) => {
      setIsAuthenticated(true);
      setCurrentUser(user);
      await loadData();
  };

  const addNotification = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error', linkTo?: string) => {
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
  };

  const markAllRead = () => {
      setNotifications(prev => prev.map(n => ({...n, read: true})));
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

  // --- AUTOMATION ENGINE ---
  const executeAutomations = (trigger: string, payload: any) => {
      const activeRules = automations.filter(r => r.isActive && r.trigger === trigger);
      
      console.log(`⚡ Ejecutando Trigger: ${trigger}`, activeRules.map(r => r.name));

      activeRules.forEach(rule => {
          // Rule: Normalization (Corrected: Removed forced +52 prefix)
          if (rule.id === 'core_1' && trigger === 'ON_LEAD_CREATE') {
              const contact = payload as Contact;
              contact.name = contact.name.replace(/\b\w/g, l => l.toUpperCase());
              // Removed the forced phone prefix logic here to support international numbers.
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
                         // Calculate active load for each rep (Excluding Won/Lost)
                         const repLoads = salesReps.map(rep => {
                             const load = contacts.filter(c => c.owner === rep.name && c.status !== LeadStatus.WON && c.status !== LeadStatus.LOST).length;
                             return { name: rep.name, load };
                         });
                         
                         // Sort by load ascending
                         repLoads.sort((a, b) => a.load - b.load);
                         
                         assignedRepName = repLoads[0].name;
                         methodLabel = `Balanceo de Carga (Carga actual: ${repLoads[0].load})`;
                     } else {
                         // ROUND ROBIN (Random for demo simplicity, stateful sequential in prod)
                         const randomRep = salesReps[Math.floor(Math.random() * salesReps.length)];
                         assignedRepName = randomRep.name;
                         methodLabel = 'Round Robin';
                     }

                     // Apply assignment
                     contact.owner = assignedRepName;
                     
                     contact.notes.push({
                         id: Date.now().toString(),
                         content: `🤖 Asignado automáticamente a ${assignedRepName} [Estrategia: ${methodLabel}]`,
                         createdAt: new Date().toISOString(),
                         author: 'Sistema'
                     });
                     
                     addNotification('Lead Asignado', `Lead asignado a ${assignedRepName} por ${methodLabel}.`, 'info', contact.id);
                 } else {
                     addNotification('Alerta de Asignación', 'No hay vendedores activos para asignar el lead.', 'warning', contact.id);
                 }
             }
          }

          // Rule: Speed to Lead (Welcome Message)
          if (rule.id === 'core_4' && trigger === 'ON_LEAD_CREATE') {
              const contact = payload as Contact;
              contact.history.push({
                  id: 'auto_' + Date.now(),
                  sender: 'agent',
                  content: 'Hola! 👋 Gracias por tu interés. ¿En qué podemos ayudarte hoy?',
                  timestamp: 'Ahora (Auto)',
                  channel: 'whatsapp'
              });
              const newTask: Task = {
                  id: 'auto_task_' + Date.now(),
                  title: `⚡ Primer contacto con ${contact.name}`,
                  type: 'Call',
                  dueDate: 'Hoy',
                  status: 'Pending',
                  priority: 'High',
                  assignedTo: contact.owner === 'Unassigned' ? (currentUser?.name || 'Admin') : contact.owner,
                  relatedContactName: contact.name,
                  relatedContactId: contact.id
              };
              setTasks(prev => [newTask, ...prev]);
          }

          // Rule: Move pipeline on message
          if (rule.id === 'sales_1' && trigger === 'ON_MESSAGE_SENT') {
             const { contactId } = payload;
             setContacts(prev => prev.map(c => {
                 if (c.id === contactId && c.status === LeadStatus.NEW) {
                     addNotification('Pipeline Actualizado', 'Lead movido a "Contactado" automáticamente.', 'success', contactId);
                     return { ...c, status: LeadStatus.CONTACTED };
                 }
                 return c;
             }));
          }

          // Rule: On Deal Won
          if (rule.id === 'life_1' && trigger === 'ON_DEAL_WON') {
              const { contactId } = payload;
              const newTask: Task = {
                id: 'onboard_' + Date.now(),
                title: `🚀 Onboarding para cliente ganado`,
                type: 'Meeting',
                dueDate: 'Mañana',
                status: 'Pending',
                priority: 'High',
                assignedTo: currentUser?.name || 'Admin',
                relatedContactId: contactId
            };
            setTasks(prev => [newTask, ...prev]);
            addNotification('¡Trato Ganado!', 'Se ha iniciado el protocolo de Onboarding.', 'success', contactId);
          }
      });
  };

  useEffect(() => {
      const interval = setInterval(() => {
          const slaRule = automations.find(r => r.id === 'core_5' && r.isActive);
          if (slaRule) {
             // SLA Logic Check placeholder
          }
      }, 30000);
      return () => clearInterval(interval);
  }, [automations]);

  const handleAddContact = (newContact: Contact) => {
      // 1. Check Duplicates Rule
      const dedupeRule = automations.find(r => r.id === 'core_2' && r.isActive);
      if (dedupeRule) {
          const exists = contacts.find(c => c.email === newContact.email || c.phone === newContact.phone);
          if (exists) {
              addNotification('Duplicado Detectado', `${exists.name} ya existe. No se creó el lead.`, 'error', exists.id);
              return; 
          }
      }

      // 2. Clone to avoid mutation before state
      const contactToCreate = { ...newContact };
      
      // 3. Run Automation (This modifies contactToCreate by reference for things like Name Normalization and Owner Assignment)
      executeAutomations('ON_LEAD_CREATE', contactToCreate);
      
      // 4. Update State
      setContacts(prev => [contactToCreate, ...prev]);
      
      // 5. User Feedback
      // If Owner was assigned by automation vs manual
      if (contactToCreate.owner !== 'Sin asignar' && contactToCreate.owner !== 'Unassigned') {
          // Notification handled inside automation for specific details, or generic here
      } else {
          addNotification('Lead Creado', `${newContact.name} agregado a la base de datos.`, 'success', contactToCreate.id);
      }
  };

  const handlePipelineUpdate = (contactId: string, newStatus: LeadStatus, lostReason?: string) => {
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

      setContacts(prev => prev.map(c => {
          if (c.id === contactId) {
              return { ...c, status: newStatus, lostReason: lostReason || c.lostReason };
          }
          return c;
      }));

      if (newStatus === LeadStatus.WON) executeAutomations('ON_DEAL_WON', { contactId });
      if (newStatus === LeadStatus.LOST) executeAutomations('ON_DEAL_LOST', { contactId });
  };

  const handleAssign = (contactId: string, newOwner: string) => {
      setContacts(prev => prev.map(c => {
          if (c.id === contactId) {
              const updatedContact = { ...c, owner: newOwner };
              // Add history entry to track assignment
              updatedContact.notes = [
                  {
                      id: `note_${Date.now()}`,
                      content: `Lead asignado manualmente a ${newOwner}`,
                      createdAt: new Date().toISOString().split('T')[0],
                      author: 'Sistema'
                  },
                  ...c.notes
              ];
              return updatedContact;
          }
          return c;
      }));
      addNotification('Asignación Actualizada', `El lead ahora pertenece a ${newOwner}.`, 'success', contactId);
  };

  const handleSendMessage = (contactId: string, message: any) => {
     executeAutomations('ON_MESSAGE_SENT', { contactId });
  };

  const renderContent = () => {
    if (!currentUser) return null;

    if (currentUser.role === 'SALES_REP' && ['automation', 'reports', 'settings'].includes(activeTab)) {
       return <Dashboard currentUser={currentUser} tasks={tasks} setTasks={setTasks} contacts={contacts} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard currentUser={currentUser} tasks={tasks} setTasks={setTasks} contacts={contacts} />;
      case 'pipeline':
        return (
          <Pipeline 
            currentUser={currentUser} 
            contacts={contacts} 
            onStatusChange={handlePipelineUpdate} 
            onNavigateToChat={handleNavigateToChat}
            products={products}
            onNotify={addNotification}
            onAddDeal={handleAddContact}
            onAssign={handleAssign}
            team={team} 
          />
        );
      case 'contacts':
        return <ContactsWrapper currentUser={currentUser} contacts={contacts} onAddContact={handleAddContact} setContacts={setContacts} onNotify={addNotification} team={team} />;
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
          />
        );
      case 'automation':
        return <Automation rules={automations} setRules={setAutomations} />;
      case 'reports':
        return <Reports currentUser={currentUser} contacts={contacts} team={team} />;
      case 'support':
        return <Support />;
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
          />
        );
      default:
        return <Dashboard currentUser={currentUser} tasks={tasks} setTasks={setTasks} contacts={contacts} />;
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white">
        <Loader2 size={48} className="animate-spin mb-4 text-indigo-500" />
        <h2 className="text-xl font-bold tracking-tight">Nexus CRM</h2>
      </div>
    );
  }

  return (
    <>
      <InstallPWA />
      {!isAuthenticated ? (
        <Auth onLogin={handleLogin} />
      ) : (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
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
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white">
                    {currentUser?.avatar}
                </div>
            </div>
          </div>

          {/* MOBILE NOTIFICATIONS DROPDOWN - High Z to float above all */}
          {isNotifOpen && (
            <>
                <div className="fixed inset-0 bg-black/20 z-[75] lg:hidden backdrop-blur-sm" onClick={() => setIsNotifOpen(false)} />
                <div className="fixed top-20 right-4 left-4 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-[80] lg:hidden animate-in zoom-in-95 duration-200">
                    <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h4 className="font-bold text-slate-800 text-sm">Notificaciones</h4>
                        <button onClick={markAllRead} className="text-xs text-indigo-600 font-medium hover:underline">Marcar leídas</button>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">Sin notificaciones nuevas.</div>
                        ) : (
                            notifications.map(n => (
                                <div 
                                    key={n.id} 
                                    onClick={() => handleNotificationClick(n)}
                                    className={`p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors ${!n.read ? 'bg-indigo-50/50' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h5 className={`text-sm ${!n.read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>{n.title}</h5>
                                        <span className="text-[10px] text-slate-400">{n.timestamp}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 line-clamp-2">{n.message}</p>
                                </div>
                            ))
                        )}
                    </div>
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
            />
          </div>

          <main className="flex-1 overflow-auto relative pt-[calc(4rem+env(safe-area-inset-top))] lg:pt-0 w-full flex flex-col pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0">
            {/* DESKTOP TOP BAR */}
            <div className="hidden lg:flex h-16 bg-white border-b border-slate-200 px-6 justify-between items-center sticky top-0 z-30 shadow-sm">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight capitalize">{activeTab === 'inbox' ? 'Bandeja de Entrada' : activeTab}</h2>
                
                <div className="flex items-center gap-5">
                    {/* Notification Bell */}
                    <div className="relative" ref={notifRef}>
                        <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="relative text-slate-500 hover:text-indigo-600 transition-colors p-2 rounded-full hover:bg-slate-100 outline-none">
                            <Bell size={20} />
                            {unreadCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
                        </button>

                        {/* Notification Dropdown */}
                        {isNotifOpen && (
                            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                    <h4 className="font-bold text-slate-800 text-sm">Notificaciones</h4>
                                    <button onClick={markAllRead} className="text-xs text-indigo-600 font-medium hover:underline">Marcar leídas</button>
                                </div>
                                <div className="max-h-[300px] overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400 text-sm">Sin notificaciones nuevas.</div>
                                    ) : (
                                        notifications.map(n => (
                                            <div 
                                                key={n.id} 
                                                onClick={() => handleNotificationClick(n)}
                                                className={`p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors ${!n.read ? 'bg-indigo-50/50' : ''}`}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <h5 className={`text-sm ${!n.read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>{n.title}</h5>
                                                    <span className="text-[10px] text-slate-400">{n.timestamp}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 line-clamp-2">{n.message}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 pl-5 border-l border-slate-200">
                        <div className="text-right">
                            <p className="text-sm font-bold text-slate-900 leading-none">{currentUser?.name}</p>
                            <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">{currentUser?.role}</p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-200">
                            {currentUser?.avatar}
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
                     className={`flex flex-col items-center justify-center w-full h-16 space-y-1 active:scale-95 transition-transform duration-100 ${isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'} relative`}
                   >
                     {isActive && <div className="absolute top-0 w-12 h-0.5 bg-indigo-600 rounded-b-full"></div>}
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

const ContactsWrapper: React.FC<any> = ({ currentUser, contacts, onAddContact, setContacts, onNotify, team }) => {
    return <Contacts currentUser={currentUser} contacts={contacts} setContacts={setContacts} onAddContact={onAddContact} onNotify={onNotify} team={team} />;
}

export default App;
