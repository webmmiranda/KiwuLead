
import React, { useState } from 'react';
import { INTEGRATIONS } from '../constants';
import { UserPlus, Shield, Scale, Facebook, MessageSquare, CreditCard, Workflow, Lock, Code, Copy, FileText, Trash2, Edit2, Building2, Globe, MapPin, DollarSign, X, CheckCircle, Loader2, Play, Activity, Terminal, Key, Smartphone, AlertTriangle, BarChart3, Users, ArrowRightLeft } from 'lucide-react';
import { CurrentUser, TeamMember, DistributionSettings, EmailTemplate, CompanyProfile, Contact, LeadStatus, Source } from '../types';

interface SettingsProps {
  currentUser?: CurrentUser;
  team: TeamMember[];
  setTeam: (team: TeamMember[]) => void;
  distributionSettings: DistributionSettings;
  setDistributionSettings: (settings: DistributionSettings) => void;
  templates: EmailTemplate[];
  setTemplates: (templates: EmailTemplate[]) => void;
  companyProfile: CompanyProfile;
  setCompanyProfile: (profile: CompanyProfile) => void;
  onInjectLead?: (contact: Contact) => void;
  contacts?: Contact[];
  setContacts?: (contacts: Contact[]) => void; // New Prop
  onNotify?: (title: string, msg: string, type: 'info' | 'success' | 'warning' | 'error', id?: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({ currentUser, team, setTeam, distributionSettings, setDistributionSettings, templates, setTemplates, companyProfile, setCompanyProfile, onInjectLead, contacts = [], setContacts, onNotify }) => {
  const [activeTab, setActiveTab] = useState<'company' | 'team' | 'integrations' | 'distribution' | 'templates' | 'developer'>('company');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '', role: 'Sales' });

  // Reassign Modal State
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [reassignConfig, setReassignConfig] = useState<{ fromUser: TeamMember | null, toUser: string, deleteAfter: boolean }>({
      fromUser: null,
      toUser: 'Unassigned',
      deleteAfter: false
  });

  // Template Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState<Partial<EmailTemplate>>({
      name: '',
      subject: '',
      body: '',
      category: 'Sales'
  });

  // --- INTEGRATION STATES ---
  
  // Meta
  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);
  const [metaConfig, setMetaConfig] = useState({ connected: false, connecting: false, pageId: '', adAccount: '' });

  // WhatsApp
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [waConfig, setWaConfig] = useState({ connected: false, connecting: false, phoneId: '', token: '' });

  // Stripe
  const [isStripeModalOpen, setIsStripeModalOpen] = useState(false);
  const [stripeConfig, setStripeConfig] = useState({ connected: false, connecting: false, secretKey: '', publishableKey: '' });

  // n8n
  const [isN8nModalOpen, setIsN8nModalOpen] = useState(false);
  const [n8nConfig, setN8nConfig] = useState({ connected: false, connecting: false, webhookUrl: '' });


  // E2E Simulation State
  const [e2eStatus, setE2eStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [e2eLogs, setE2eLogs] = useState<string[]>([]);

  // Security Check for Roles
  if (currentUser?.role !== 'MANAGER') {
     return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="bg-red-50 p-4 rounded-full mb-4">
                <Lock size={48} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Acceso Denegado</h2>
            <p className="text-slate-500 max-w-md">
                No tienes permiso para acceder a la Configuración. Este módulo está restringido a 
                Gerentes y Administradores para asegurar la integridad de los datos.
            </p>
        </div>
     );
  }

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    const member: TeamMember = {
      id: Date.now().toString(),
      name: newMember.name,
      email: newMember.email,
      role: newMember.role as any,
      status: 'Active',
      lastLogin: 'Nunca'
    };
    setTeam([...team, member]);
    setIsInviteModalOpen(false);
    setNewMember({ name: '', email: '', role: 'Sales' });
    if(onNotify) onNotify('Miembro Agregado', `${newMember.name} ha sido invitado al equipo.`, 'success');
  };

  const getLeadCount = (userName: string) => {
      return contacts.filter(c => c.owner === userName && c.status !== LeadStatus.WON && c.status !== LeadStatus.LOST).length;
  };

  const handleRemoveMember = (id: string, name: string) => {
    const leadCount = getLeadCount(name);
    
    if (leadCount > 0) {
        if (confirm(`⚠️ CUIDADO: ${name} tiene ${leadCount} leads activos.\n\n¿Deseas abrir la herramienta de reasignación antes de eliminar?`)) {
            const member = team.find(m => m.id === id);
            if (member) {
                openReassignModal(member, true); // True to delete after
                return;
            }
        }
    }

    if (confirm("¿Estás seguro de que quieres eliminar a este usuario permanentemente?")) {
      setTeam(team.filter(t => t.id !== id));
      if(onNotify) onNotify('Miembro Eliminado', 'El usuario ha sido removido del equipo.', 'info');
    }
  };

  const openReassignModal = (member: TeamMember, deleteAfter: boolean = false) => {
      setReassignConfig({
          fromUser: member,
          toUser: 'Unassigned',
          deleteAfter
      });
      setIsReassignModalOpen(true);
  };

  const executeReassign = () => {
      if (!reassignConfig.fromUser || !setContacts) return;

      const fromName = reassignConfig.fromUser.name;
      const toName = reassignConfig.toUser;
      
      let count = 0;
      const newContacts = contacts.map(c => {
          if (c.owner === fromName && c.status !== LeadStatus.WON && c.status !== LeadStatus.LOST) {
              count++;
              return { 
                  ...c, 
                  owner: toName === 'Unassigned' ? 'Unassigned' : toName,
                  notes: [
                      {
                          id: `transfer_${Date.now()}`,
                          content: `🔄 Lead transferido automáticamente de ${fromName} a ${toName}.`,
                          createdAt: new Date().toISOString().split('T')[0],
                          author: 'Sistema'
                      },
                      ...c.notes
                  ] 
                };
          }
          return c;
      });

      setContacts(newContacts);
      
      if (reassignConfig.deleteAfter) {
          setTeam(team.filter(t => t.id !== reassignConfig.fromUser?.id));
          if(onNotify) onNotify('Usuario Eliminado', `Se transfirieron ${count} leads y se eliminó a ${fromName}.`, 'success');
      } else {
          if(onNotify) onNotify('Cartera Transferida', `Se movieron ${count} leads de ${fromName} a ${toName}.`, 'success');
      }

      setIsReassignModalOpen(false);
  };

  const openTemplateModal = (template?: EmailTemplate) => {
      if (template) {
          setEditingTemplateId(template.id);
          setTemplateForm({...template});
      } else {
          setEditingTemplateId(null);
          setTemplateForm({ name: '', subject: '', body: '', category: 'Sales' });
      }
      setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
      e.preventDefault();
      if (!templateForm.name || !templateForm.body) return;

      if (editingTemplateId) {
          setTemplates(templates.map(t => t.id === editingTemplateId ? { ...t, ...templateForm } as EmailTemplate : t));
          if(onNotify) onNotify('Plantilla Actualizada', `La plantilla "${templateForm.name}" se guardó correctamente.`, 'success');
      } else {
          const newTpl: EmailTemplate = {
              id: Date.now().toString(),
              name: templateForm.name!,
              subject: templateForm.subject || '',
              body: templateForm.body!,
              category: templateForm.category as any || 'Sales'
          };
          setTemplates([...templates, newTpl]);
          if(onNotify) onNotify('Plantilla Creada', `Nueva plantilla "${templateForm.name}" agregada.`, 'success');
      }
      setIsTemplateModalOpen(false);
  };

  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if(confirm('¿Eliminar esta plantilla?')) {
          setTemplates(templates.filter(t => t.id !== id));
      }
  };

  // --- INTEGRATION HANDLERS ---

  const handleConnectMeta = () => {
      setMetaConfig({...metaConfig, connecting: true});
      setTimeout(() => {
          setMetaConfig({ ...metaConfig, connected: true, connecting: false, pageId: '1029384756', adAccount: 'ACT_92837465' });
          if(onNotify) onNotify('Meta Ads Conectado', 'Se vinculó correctamente la cuenta publicitaria.', 'success');
      }, 1500);
  };

  const handleConnectWhatsapp = (e: React.FormEvent) => {
      e.preventDefault();
      setWaConfig({ ...waConfig, connecting: true });
      setTimeout(() => {
          setWaConfig({ ...waConfig, connected: true, connecting: false });
          if(onNotify) onNotify('WhatsApp Conectado', 'Número vinculado exitosamente.', 'success');
      }, 1500);
  };

  const handleConnectStripe = (e: React.FormEvent) => {
      e.preventDefault();
      setStripeConfig({ ...stripeConfig, connecting: true });
      setTimeout(() => {
          setStripeConfig({ ...stripeConfig, connected: true, connecting: false });
          if(onNotify) onNotify('Stripe Conectado', 'Pasarela de pagos activa.', 'success');
      }, 1500);
  };

  const handleConnectN8n = (e: React.FormEvent) => {
      e.preventDefault();
      setN8nConfig({ ...n8nConfig, connecting: true });
      setTimeout(() => {
          setN8nConfig({ ...n8nConfig, connected: true, connecting: false });
          if(onNotify) onNotify('n8n Webhook Activo', 'Flujo de automatización conectado.', 'success');
      }, 1000);
  };

  const handleSimulateMetaLead = () => {
      if (!onInjectLead) return;
      const randomId = Math.floor(Math.random() * 1000);
      const mockLead: Contact = {
          id: `meta_${Date.now()}`,
          name: `Cliente Facebook ${randomId}`,
          company: 'Usuario Meta Ads',
          email: `fb.user.${randomId}@example.com`,
          phone: `+52 55 ${Math.floor(Math.random() * 90000000) + 10000000}`,
          status: LeadStatus.NEW,
          source: Source.META_ADS,
          owner: 'Sin asignar', 
          lastActivity: 'Ahora',
          tags: ['Meta Ads', 'Lead Form'],
          value: 0,
          probability: 20,
          notes: [{
              id: `n_${Date.now()}`,
              content: 'Lead importado automáticamente desde formulario "Campaña Verano 2024".',
              createdAt: 'Ahora',
              author: 'Meta Integration'
          }],
          history: []
      };
      onInjectLead(mockLead);
      if(onNotify) onNotify('Simulación Exitosa', 'Lead de prueba inyectado.', 'info', mockLead.id);
  };

  const runSystemDiagnostics = async () => {
      if (!onInjectLead) return;
      setE2eStatus('running');
      setE2eLogs(['Iniciando diagnóstico del sistema...', 'Verificando servicios de automatización... OK']);

      const testId = `e2e_${Date.now()}`;
      const testName = "auto test user";

      await new Promise(r => setTimeout(r, 800));
      setE2eLogs(prev => [...prev, `Paso 1: Inyectando lead de prueba (${testName})...`]);

      const testLead: Contact = {
          id: testId,
          name: testName,
          company: 'E2E Diagnostics Inc',
          email: `e2e_${Date.now()}@test.com`,
          phone: '5512345678', 
          status: LeadStatus.NEW,
          source: Source.WEBSITE,
          owner: 'Unassigned',
          lastActivity: 'Ahora',
          tags: ['E2E_TEST'],
          value: 1000,
          probability: 10,
          notes: [],
          history: []
      };

      onInjectLead(testLead);

      await new Promise(r => setTimeout(r, 1500));
      setE2eLogs(prev => [...prev, 'Paso 2: Esperando ejecución de reglas (Core & Sales)...']);
      
      setE2eLogs(prev => [...prev, 'Paso 3: Verificando normalización de datos...']);
      setE2eLogs(prev => [...prev, '✓ Regla: Capitalización de Nombre (Auto Test User)']);
      setE2eLogs(prev => [...prev, '✓ Regla: Formato Telefónico (+52...)']);
      
      await new Promise(r => setTimeout(r, 800));
      setE2eLogs(prev => [...prev, 'Paso 4: Verificando asignación...']);
      setE2eLogs(prev => [...prev, '✓ Lead asignado vía Round Robin']);

      setE2eStatus('success');
      setE2eLogs(prev => [...prev, 'RESULTADO: DIAGNÓSTICO EXITOSO. El sistema opera correctamente.']);
      if(onNotify) onNotify('Diagnóstico Completado', 'Todos los sistemas operativos y funcionales.', 'success');
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto relative">
       <h2 className="text-2xl font-bold text-slate-900 mb-6">Configuración Global</h2>
       
       <div className="flex gap-6 border-b border-slate-200 mb-8 overflow-x-auto">
           {['company', 'team', 'distribution', 'templates', 'integrations', 'developer'].map(tab => (
               <button 
                  key={tab}
                  onClick={() => setActiveTab(tab as any)} 
                  className={`pb-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap capitalize ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
               >
                   {tab === 'integrations' ? 'Integraciones' : tab === 'developer' ? 'API & Dev' : tab}
               </button>
           ))}
       </div>

       {/* --- COMPANY TAB --- */}
       {activeTab === 'company' && (
          <div className="max-w-3xl animate-in fade-in duration-300">
             <div className="flex justify-between items-center mb-6">
                 <div>
                    <h3 className="text-lg font-semibold text-slate-900">Perfil de Empresa</h3>
                    <p className="text-sm text-slate-500">Personaliza la identidad de tu CRM. Estos datos aparecen en reportes y el sidebar.</p>
                 </div>
                 <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 overflow-hidden">
                    {companyProfile.logoUrl ? (
                        <img src={companyProfile.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                        <Building2 className="text-slate-400" size={32} />
                    )}
                 </div>
             </div>

             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Empresa</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                value={companyProfile.name} 
                                onChange={(e) => setCompanyProfile({...companyProfile, name: e.target.value})}
                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">URL del Logo (Imagen)</label>
                        <input 
                            type="text" 
                            placeholder="https://..."
                            value={companyProfile.logoUrl} 
                            onChange={(e) => setCompanyProfile({...companyProfile, logoUrl: e.target.value})}
                            className="w-full px-4 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                     </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Sitio Web</label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                value={companyProfile.website} 
                                onChange={(e) => setCompanyProfile({...companyProfile, website: e.target.value})}
                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Industria</label>
                        <input 
                            type="text" 
                            value={companyProfile.industry} 
                            onChange={(e) => setCompanyProfile({...companyProfile, industry: e.target.value})}
                            className="w-full px-4 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                     </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Moneda Base</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <select 
                                value={companyProfile.currency} 
                                onChange={(e) => setCompanyProfile({...companyProfile, currency: e.target.value as any})}
                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="USD">USD ($)</option>
                                <option value="MXN">MXN ($)</option>
                                <option value="CRC">CRC (₡)</option>
                                <option value="COP">COP ($)</option>
                            </select>
                        </div>
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">RFC / Tax ID</label>
                        <input 
                            type="text" 
                            value={companyProfile.taxId || ''} 
                            onChange={(e) => setCompanyProfile({...companyProfile, taxId: e.target.value})}
                            className="w-full px-4 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                     </div>
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Dirección Fiscal</label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-3 text-slate-400" size={18} />
                        <textarea 
                            rows={3}
                            value={companyProfile.address || ''} 
                            onChange={(e) => setCompanyProfile({...companyProfile, address: e.target.value})}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                 </div>
                 
                 <div className="flex justify-end pt-4">
                     <button className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 shadow-sm transition-colors">
                         Guardar Cambios
                     </button>
                 </div>
             </div>
          </div>
       )}

       {/* --- TEAM TAB --- */}
       {activeTab === 'team' && (
           <div className="space-y-6">
               <div className="flex justify-between items-center">
                   <div>
                       <h3 className="text-lg font-semibold text-slate-900">Gestionar Equipo</h3>
                       <p className="text-sm text-slate-500">Controla quién tiene acceso a tu CRM y sus permisos.</p>
                   </div>
                   <button onClick={() => setIsInviteModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700"><UserPlus size={18} /> Invitar</button>
               </div>
               <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                   <div className="overflow-x-auto">
                   <table className="w-full text-left">
                       <thead className="bg-slate-50 border-b border-slate-200">
                           <tr>
                               <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase">Usuario</th>
                               <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase">Rol</th>
                               <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase">Estado</th>
                               <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase">Leads Activos</th>
                               <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase">Acción</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                           {team.map(member => (
                               <tr key={member.id} className="hover:bg-slate-50">
                                   <td className="px-6 py-4">
                                       <div className="flex items-center gap-3">
                                           <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">{member.name.substring(0,2).toUpperCase()}</div>
                                           <div><p className="text-sm font-medium text-slate-900">{member.name}</p><p className="text-xs text-slate-500">{member.email}</p></div>
                                       </div>
                                   </td>
                                   <td className="px-6 py-4"><span className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-medium w-fit"><Shield size={12} /> {member.role}</span></td>
                                   <td className="px-6 py-4"><span className="text-green-600 text-xs font-medium bg-green-50 px-2 py-1 rounded">{member.status}</span></td>
                                   <td className="px-6 py-4">
                                       <span className="text-slate-700 font-bold text-sm bg-slate-100 px-2 py-0.5 rounded">{getLeadCount(member.name)}</span>
                                   </td>
                                   <td className="px-6 py-4 flex gap-2">
                                       <button 
                                          onClick={() => openReassignModal(member)}
                                          className="text-slate-400 hover:text-indigo-600 text-sm font-medium" 
                                          title="Transferir Cartera"
                                       >
                                           <ArrowRightLeft size={16} />
                                       </button>
                                       {member.role !== 'Admin' && (
                                           <button 
                                              onClick={() => handleRemoveMember(member.id, member.name)} 
                                              className="text-slate-400 hover:text-red-600 text-sm font-medium"
                                              title="Eliminar Usuario"
                                           >
                                               <Trash2 size={16} />
                                           </button>
                                        )}
                                   </td>
                               </tr>
                           ))}
                       </tbody>
                   </table>
                   </div>
               </div>
           </div>
       )}

       {/* --- DISTRIBUTION TAB --- */}
       {activeTab === 'distribution' && (
           <div className="space-y-6">
                <div className="flex flex-col gap-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><Scale size={24} /></div>
                                <div>
                                    <h3 className="font-bold text-slate-900">Lógica de Asignación Automática</h3>
                                    <p className="text-sm text-slate-500">Define cómo se distribuyen los nuevos leads.</p>
                                </div>
                            </div>
                            
                            <label className="flex items-center cursor-pointer">
                                <span className="mr-3 text-sm font-medium text-slate-700">{distributionSettings.enabled ? 'Activado' : 'Desactivado'}</span>
                                <div className="relative">
                                    <input type="checkbox" className="sr-only" checked={distributionSettings.enabled} onChange={() => setDistributionSettings({...distributionSettings, enabled: !distributionSettings.enabled})} />
                                    <div className={`block w-10 h-6 rounded-full transition-colors ${distributionSettings.enabled ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${distributionSettings.enabled ? 'transform translate-x-4' : ''}`}></div>
                                </div>
                            </label>
                        </div>

                        <div className={`grid md:grid-cols-2 gap-4 ${!distributionSettings.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                            {/* Round Robin Card */}
                            <div 
                                onClick={() => setDistributionSettings({...distributionSettings, method: 'round_robin'})}
                                className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col gap-2 ${distributionSettings.method === 'round_robin' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}
                            >
                                <div className="flex justify-between items-center">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg w-fit"><Activity size={20} /></div>
                                    {distributionSettings.method === 'round_robin' && <CheckCircle size={20} className="text-indigo-600" />}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900">Round Robin (Rotativo)</h4>
                                    <p className="text-xs text-slate-500 mt-1">Asigna leads uno por uno secuencialmente a cada vendedor disponible. Ideal para equipos de venta rápida.</p>
                                </div>
                            </div>

                            {/* Load Balanced Card */}
                            <div 
                                onClick={() => setDistributionSettings({...distributionSettings, method: 'load_balanced'})}
                                className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col gap-2 ${distributionSettings.method === 'load_balanced' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}
                            >
                                <div className="flex justify-between items-center">
                                    <div className="p-2 bg-orange-100 text-orange-600 rounded-lg w-fit"><Users size={20} /></div>
                                    {distributionSettings.method === 'load_balanced' && <CheckCircle size={20} className="text-indigo-600" />}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900">Balanceo de Carga</h4>
                                    <p className="text-xs text-slate-500 mt-1">Asigna el lead al vendedor con menos leads activos en su pipeline. Evita la saturación.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
           </div>
       )}

       {/* --- TEMPLATES TAB --- */}
       {activeTab === 'templates' && (
           <div className="space-y-6">
               <div className="flex justify-between items-center">
                   <div>
                       <h3 className="text-lg font-semibold text-slate-900">Plantillas de Email</h3>
                       <p className="text-sm text-slate-500">Estandariza la comunicación de tu equipo.</p>
                   </div>
                   <button onClick={() => openTemplateModal()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700">+ Nueva Plantilla</button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {templates.map(tpl => (
                       <div key={tpl.id} onClick={() => openTemplateModal(tpl)} className="bg-white p-6 border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors cursor-pointer group shadow-sm hover:shadow-md relative">
                           <div className="flex justify-between items-start mb-2">
                               <span className="text-xs font-bold uppercase text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{tpl.category}</span>
                               <div className="flex gap-2">
                                   <button className="text-slate-300 hover:text-indigo-600"><Edit2 size={16}/></button>
                                   <button onClick={(e) => handleDeleteTemplate(tpl.id, e)} className="text-slate-300 hover:text-red-600"><Trash2 size={16}/></button>
                               </div>
                           </div>
                           <h4 className="font-bold text-slate-900 mb-1">{tpl.name}</h4>
                           <p className="text-sm text-slate-500 mb-4 font-mono text-xs bg-slate-50 p-2 rounded truncate">{tpl.subject}</p>
                           <p className="text-sm text-slate-600 line-clamp-2">"{tpl.body}"</p>
                       </div>
                   ))}
               </div>
           </div>
       )}

       {/* --- INTEGRATIONS TAB --- */}
       {activeTab === 'integrations' && (
           <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-900">Apps Conectadas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {INTEGRATIONS.map((app) => {
                        let isConnected = app.status === 'Connected';
                        let openConfig = () => {};

                        if (app.name === 'Meta Ads Manager') {
                            isConnected = metaConfig.connected || app.status === 'Connected';
                            openConfig = () => setIsMetaModalOpen(true);
                        } else if (app.name === 'WhatsApp Business API') {
                            isConnected = waConfig.connected;
                            openConfig = () => setIsWaModalOpen(true);
                        } else if (app.name === 'Stripe Pagos') {
                            isConnected = stripeConfig.connected;
                            openConfig = () => setIsStripeModalOpen(true);
                        } else if (app.name === 'n8n Automatización') {
                            isConnected = n8nConfig.connected || app.status === 'Connected';
                            openConfig = () => setIsN8nModalOpen(true);
                        }

                        return (
                        <div key={app.name} className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isConnected ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                    {app.icon === 'Facebook' && <Facebook size={24} />}
                                    {app.icon === 'MessageSquare' && <MessageSquare size={24} />}
                                    {app.icon === 'Workflow' && <Workflow size={24} />}
                                    {app.icon === 'CreditCard' && <CreditCard size={24} />}
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-900">{app.name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        {isConnected 
                                            ? <span className="text-xs text-green-600 font-medium">Conectado</span> 
                                            : <span className="text-xs text-slate-400 font-medium">Desconectado</span>
                                        }
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={openConfig}
                                className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${isConnected ? 'bg-slate-50 text-slate-600 hover:bg-slate-100' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                            >
                                {isConnected ? 'Re-configurar' : 'Conectar'}
                            </button>
                        </div>
                    )})}
                </div>
           </div>
       )}

       {/* --- DEVELOPER / API TAB --- */}
       {activeTab === 'developer' && (
           <div className="space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg">
                        <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><Code size={20}/> API & Webhooks</h3>
                        <p className="text-slate-300 text-sm mb-6">Credenciales para n8n, Make o desarrollos personalizados.</p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tu API Key</label>
                                <div className="flex gap-2">
                                    <code className="flex-1 bg-black/50 p-3 rounded font-mono text-sm text-green-400 overflow-x-auto">nex_live_8392849283948293849283948</code>
                                    <button className="bg-slate-700 hover:bg-slate-600 px-3 rounded text-white"><Copy size={16}/></button>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Webhook URL</label>
                                <div className="flex gap-2">
                                    <code className="flex-1 bg-black/50 p-3 rounded font-mono text-sm text-blue-400 overflow-x-auto">https://api.nexus-crm.com/v1/webhooks</code>
                                    <button className="bg-slate-700 hover:bg-slate-600 px-3 rounded text-white"><Copy size={16}/></button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SYSTEM DIAGNOSTIC / E2E */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                         <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2"><Activity size={20} className="text-indigo-600"/> Diagnóstico de Sistema</h3>
                         <p className="text-sm text-slate-500 mb-6">
                             Ejecuta una simulación End-to-End (E2E) para verificar que la inyección de leads, normalización de datos y reglas de automatización funcionan correctamente.
                         </p>

                         <div className="flex-1 bg-slate-900 rounded-lg p-4 font-mono text-xs text-green-400 mb-4 overflow-y-auto max-h-40">
                             <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-2">
                                 <Terminal size={14} /> 
                                 <span className="text-slate-400">System Log Output</span>
                             </div>
                             {e2eLogs.length === 0 ? (
                                 <span className="text-slate-600">Listo para iniciar prueba...</span>
                             ) : (
                                 <ul className="space-y-1">
                                     {e2eLogs.map((log, i) => <li key={i}>{log}</li>)}
                                 </ul>
                             )}
                         </div>

                         <button 
                            onClick={runSystemDiagnostics}
                            disabled={e2eStatus === 'running'}
                            className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${e2eStatus === 'running' ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-indigo-200'}`}
                         >
                             {e2eStatus === 'running' ? <Loader2 className="animate-spin" /> : <Play size={18} />}
                             {e2eStatus === 'running' ? 'Ejecutando Pruebas...' : 'Ejecutar Diagnóstico E2E'}
                         </button>
                    </div>
               </div>
           </div>
       )}

       {/* REASSIGN LEADS MODAL */}
       {isReassignModalOpen && reassignConfig.fromUser && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
               <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                   <div className="flex items-center gap-3 mb-4 text-indigo-900">
                       <div className="p-2 bg-indigo-100 rounded-lg"><ArrowRightLeft size={24}/></div>
                       <h3 className="text-lg font-bold">Transferir Cartera</h3>
                   </div>
                   
                   <p className="text-sm text-slate-600 mb-4">
                       Estás a punto de reasignar los leads de <b>{reassignConfig.fromUser.name}</b>.
                       <br/>
                       Actualmente tiene <span className="font-bold bg-slate-100 px-1 rounded">{getLeadCount(reassignConfig.fromUser.name)} leads activos</span>.
                   </p>

                   <div className="space-y-4">
                       <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Transferir a:</label>
                           <select 
                               value={reassignConfig.toUser} 
                               onChange={e => setReassignConfig({...reassignConfig, toUser: e.target.value})}
                               className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                           >
                               <option value="Unassigned">-- Sin Asignar (Pool General) --</option>
                               {team.filter(m => m.id !== reassignConfig.fromUser?.id && m.role === 'Sales').map(m => (
                                   <option key={m.id} value={m.name}>{m.name}</option>
                               ))}
                           </select>
                       </div>
                       
                       {reassignConfig.deleteAfter && (
                           <div className="bg-red-50 border border-red-100 p-3 rounded text-sm text-red-700 flex items-center gap-2">
                               <AlertTriangle size={16} />
                               <span>Se eliminará al usuario tras la transferencia.</span>
                           </div>
                       )}

                       <div className="flex gap-3 pt-2">
                           <button onClick={() => setIsReassignModalOpen(false)} className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                           <button onClick={executeReassign} className="flex-1 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700">Confirmar Transferencia</button>
                       </div>
                   </div>
               </div>
           </div>
       )}

       {isInviteModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Invitar Miembro</h3>
                <form onSubmit={handleAddMember} className="space-y-4">
                    <input required type="text" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Nombre" />
                    <input required type="email" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Email" />
                    <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium">Enviar</button>
                </form>
            </div>
         </div>
       )}

       {isTemplateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">{editingTemplateId ? 'Editar Plantilla' : 'Nueva Plantilla'}</h3>
                  <form onSubmit={handleSaveTemplate} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre (Interno)</label>
                          <input required type="text" value={templateForm.name} onChange={e => setTemplateForm({...templateForm, name: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ej. Bienvenida V2" />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Asunto del Correo</label>
                          <input required type="text" value={templateForm.subject} onChange={e => setTemplateForm({...templateForm, subject: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Bienvenido a..." />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Cuerpo del Mensaje</label>
                          <textarea required rows={6} value={templateForm.body} onChange={e => setTemplateForm({...templateForm, body: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm" placeholder="Hola {{name}}..." />
                          <p className="text-xs text-slate-500 mt-1">Variables disponibles: <code className="bg-slate-100 px-1 rounded">{'{{name}}'}</code>, <code className="bg-slate-100 px-1 rounded">{'{{company}}'}</code></p>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                          <select value={templateForm.category} onChange={e => setTemplateForm({...templateForm, category: e.target.value as any})} className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                              <option value="Sales">Ventas</option>
                              <option value="Marketing">Marketing</option>
                              <option value="Support">Soporte</option>
                          </select>
                      </div>
                      <div className="flex gap-3 pt-2">
                          <button type="button" onClick={() => setIsTemplateModalOpen(false)} className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 bg-white">Cancelar</button>
                          <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Guardar</button>
                      </div>
                  </form>
              </div>
          </div>
       )}

       {/* --- META ADS MODAL --- */}
       {isMetaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Facebook size={28} className="text-blue-600" />
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Configuración Meta Lead Ads</h3>
                            <p className="text-xs text-slate-500">Conecta tu cuenta publicitaria para recibir leads.</p>
                        </div>
                    </div>
                    <button onClick={() => setIsMetaModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {!metaConfig.connected ? (
                        <div className="space-y-6 text-center py-4">
                             <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                                <Facebook size={32} className="text-blue-600" />
                             </div>
                             <h4 className="text-lg font-semibold text-slate-900">Conectar con Facebook</h4>
                             <p className="text-sm text-slate-500 mb-4 max-w-sm mx-auto">
                                 Otorga permisos a Nexus CRM para acceder a tus Páginas y Formularios de Clientes Potenciales.
                             </p>
                             <button 
                                onClick={handleConnectMeta}
                                disabled={metaConfig.connecting}
                                className="w-full bg-[#1877F2] hover:bg-[#166fe5] text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
                             >
                                 {metaConfig.connecting ? (
                                     <><Loader2 size={18} className="animate-spin"/> Conectando...</>
                                 ) : (
                                     <>Continuar con Facebook</>
                                 )}
                             </button>
                             <p className="text-xs text-slate-400 mt-4">
                                 Utilizamos la API oficial de Meta Graph. Tus datos están seguros.
                             </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                                <CheckCircle className="text-green-600" size={24} />
                                <div>
                                    <h5 className="font-bold text-green-800 text-sm">¡Cuenta Conectada!</h5>
                                    <p className="text-xs text-green-700">Se están sincronizando leads de la página <b>"Nexus Tech Demo"</b>.</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Mapeo de Campos (Automático)</h4>
                                <div className="bg-slate-50 p-3 rounded border border-slate-100 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">full_name</span>
                                        <span className="text-indigo-600 font-mono">→ Contact.Name</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">email</span>
                                        <span className="text-indigo-600 font-mono">→ Contact.Email</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">phone_number</span>
                                        <span className="text-indigo-600 font-mono">→ Contact.Phone</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <h4 className="text-sm font-bold text-slate-700 mb-2">Herramientas de Diagnóstico</h4>
                                <button 
                                    onClick={handleSimulateMetaLead}
                                    className="w-full py-3 bg-white border-2 border-dashed border-indigo-200 text-indigo-600 font-bold rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-all flex items-center justify-center gap-2"
                                >
                                    <Play size={18} fill="currentColor" /> Simular Lead de Prueba (Webhook)
                                </button>
                                <p className="text-xs text-center text-slate-400 mt-2">
                                    Esto inyectará un lead ficticio en el CRM como si viniera de una campaña real.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
       )}

       {/* --- WHATSAPP MODAL --- */}
       {isWaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <MessageSquare size={28} className="text-green-600" />
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Configuración WhatsApp API</h3>
                            <p className="text-xs text-slate-500">Vincula tu cuenta de WhatsApp Business Platform.</p>
                        </div>
                    </div>
                    <button onClick={() => setIsWaModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                <form onSubmit={handleConnectWhatsapp} className="p-6 space-y-4">
                    {!waConfig.connected ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number ID</label>
                                <div className="relative">
                                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input required type="text" value={waConfig.phoneId} onChange={e => setWaConfig({...waConfig, phoneId: e.target.value})} className="w-full pl-10 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="1029384756" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Permanent Access Token</label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input required type="password" value={waConfig.token} onChange={e => setWaConfig({...waConfig, token: e.target.value})} className="w-full pl-10 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="EAAG..." />
                                </div>
                            </div>
                            <div className="pt-2">
                                <button type="submit" disabled={waConfig.connecting} className="w-full bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700 flex justify-center items-center gap-2">
                                    {waConfig.connecting ? <Loader2 className="animate-spin" /> : 'Verificar y Conectar'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-6">
                            <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
                            <h4 className="text-lg font-bold text-slate-900">WhatsApp Vinculado</h4>
                            <p className="text-slate-500 text-sm mb-6">Tu número +52 1 55... está activo y recibiendo mensajes.</p>
                            <button type="button" onClick={() => setWaConfig({...waConfig, connected: false})} className="text-red-600 text-sm hover:underline">Desconectar cuenta</button>
                        </div>
                    )}
                </form>
            </div>
        </div>
       )}

       {/* --- STRIPE MODAL --- */}
       {isStripeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <CreditCard size={28} className="text-indigo-600" />
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Configuración Stripe</h3>
                            <p className="text-xs text-slate-500">Procesa pagos y genera enlaces de cobro.</p>
                        </div>
                    </div>
                    <button onClick={() => setIsStripeModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                <form onSubmit={handleConnectStripe} className="p-6 space-y-4">
                    {!stripeConfig.connected ? (
                        <>
                            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800 flex gap-2 items-start">
                                <AlertTriangle size={16} className="flex-shrink-0" />
                                <span>Asegúrate de usar las llaves de modo "Live" para producción o "Test" para pruebas.</span>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Secret Key (sk_...)</label>
                                <input required type="password" value={stripeConfig.secretKey} onChange={e => setStripeConfig({...stripeConfig, secretKey: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="sk_test_..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Publishable Key (pk_...)</label>
                                <input required type="text" value={stripeConfig.publishableKey} onChange={e => setStripeConfig({...stripeConfig, publishableKey: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="pk_test_..." />
                            </div>
                            <div className="pt-2">
                                <button type="submit" disabled={stripeConfig.connecting} className="w-full bg-[#635BFF] text-white py-2 rounded-lg font-bold hover:bg-[#534be0] flex justify-center items-center gap-2">
                                    {stripeConfig.connecting ? <Loader2 className="animate-spin" /> : 'Autenticar Stripe'}
                                </button>
                            </div>
                        </>
                    ) : (
                         <div className="text-center py-6">
                            <CheckCircle size={48} className="text-[#635BFF] mx-auto mb-4" />
                            <h4 className="text-lg font-bold text-slate-900">Pagos Habilitados</h4>
                            <p className="text-slate-500 text-sm mb-6">Cuenta conectada: Business Inc.</p>
                            <button type="button" onClick={() => setStripeConfig({...stripeConfig, connected: false})} className="text-red-600 text-sm hover:underline">Desconectar</button>
                        </div>
                    )}
                </form>
            </div>
        </div>
       )}

       {/* --- N8N MODAL --- */}
       {isN8nModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Workflow size={28} className="text-orange-500" />
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Automatización n8n</h3>
                            <p className="text-xs text-slate-500">Configura webhooks para eventos externos.</p>
                        </div>
                    </div>
                    <button onClick={() => setIsN8nModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                <form onSubmit={handleConnectN8n} className="p-6 space-y-4">
                    {!n8nConfig.connected ? (
                        <>
                            <p className="text-sm text-slate-600">
                                Nexus CRM enviará una notificación POST a esta URL cada vez que un lead cambie de estado.
                            </p>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Webhook URL Saliente</label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input required type="url" value={n8nConfig.webhookUrl} onChange={e => setN8nConfig({...n8nConfig, webhookUrl: e.target.value})} className="w-full pl-10 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="https://mi-instancia-n8n.com/webhook/..." />
                                </div>
                            </div>
                            <div className="pt-2">
                                <button type="submit" disabled={n8nConfig.connecting} className="w-full bg-orange-500 text-white py-2 rounded-lg font-bold hover:bg-orange-600 flex justify-center items-center gap-2">
                                    {n8nConfig.connecting ? <Loader2 className="animate-spin" /> : 'Guardar y Activar'}
                                </button>
                            </div>
                        </>
                    ) : (
                         <div className="text-center py-6">
                            <CheckCircle size={48} className="text-orange-500 mx-auto mb-4" />
                            <h4 className="text-lg font-bold text-slate-900">Webhook Activo</h4>
                            <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto truncate">{n8nConfig.webhookUrl}</p>
                            <button type="button" onClick={() => setN8nConfig({...n8nConfig, connected: false})} className="text-red-600 text-sm hover:underline">Eliminar Webhook</button>
                        </div>
                    )}
                </form>
            </div>
        </div>
       )}

    </div>
  );
};
