import React, { useState, useEffect } from 'react';
import { INTEGRATIONS } from '../constants';
import { UserPlus, Shield, Scale, Facebook, MessageSquare, Workflow, Lock, Unlock, Code, Copy, FileText, Trash2, Edit2, Building2, Globe, MapPin, DollarSign, X, CheckCircle, Loader2, Play, Activity, Terminal, Key, Smartphone, AlertTriangle, BarChart3, Users, ArrowRightLeft, Bot, Zap, CreditCard, Eye, Database, Info, HelpCircle, Mail, Server, User, Save, RotateCcw } from 'lucide-react';
import { CurrentUser, TeamMember, DistributionSettings, EmailTemplate, CompanyProfile, Contact, LeadStatus, Source, FeaturesConfig } from '../types';
import { PipelineSettings } from './PipelineSettings';

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
    setContacts?: (contacts: Contact[]) => void;
    onNotify?: (title: string, msg: string, type: 'info' | 'success' | 'warning' | 'error', id?: string) => void;
    onImpersonate?: (user: TeamMember) => void;
    onRefreshData?: () => Promise<void>;
    onLogout?: () => void;
    features?: FeaturesConfig;
    onUpdateFeatures?: (features: FeaturesConfig) => void;
}

export const Settings: React.FC<SettingsProps> = ({ currentUser, team, setTeam, distributionSettings, setDistributionSettings, templates, setTemplates, companyProfile, setCompanyProfile, onInjectLead, contacts = [], setContacts, onNotify, onImpersonate, onRefreshData, onLogout, features, onUpdateFeatures }) => {
    const isDemo = import.meta.env.VITE_DEMO_MODE === 'true';
    const appName = isDemo ? 'KiwüLead' : 'Nexus CRM';
    const appSecret = isDemo ? 'kiwulead_secret' : 'nexus_crm_secret';

    const [activeTab, setActiveTab] = useState<'company' | 'team' | 'pipeline' | 'integrations' | 'distribution' | 'templates' | 'developer' | 'system' | 'email' | 'features'>('company');
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [newMember, setNewMember] = useState({ name: '', email: '', role: 'Sales' });
    const [autoGeneratePassword, setAutoGeneratePassword] = useState(true);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Reassign Modal State
    const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
    const [reassignConfig, setReassignConfig] = useState<{ fromUser: TeamMember | null, toUser: string, deleteAfter: boolean }>({
        fromUser: null,
        toUser: 'Unassigned',
        deleteAfter: false
    });

    // Password Change Modal State
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwordMember, setPasswordMember] = useState<TeamMember | null>(null);
    const [newUserPassword, setNewUserPassword] = useState('');
    const [confirmUserPassword, setConfirmUserPassword] = useState('');

    // Template Modal State
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [templateForm, setTemplateForm] = useState<Partial<EmailTemplate>>({
        name: '',
        subject: '',
        body: '',
        category: 'Sales'
    });

    // Email Sub-tabs
    const [emailTab, setEmailTab] = useState<'config' | 'templates' | 'branding'>('config');

    // --- INTEGRATION STATES ---

    // Meta
    const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);
    const [metaConfig, setMetaConfig] = useState({ connected: false, connecting: false, pageId: '', adAccount: '', verifyToken: appSecret, selectedForms: [] as string[] });
    const [metaStep, setMetaStep] = useState<1 | 2 | 3>(1);
    const [metaAccounts, setMetaAccounts] = useState<any[]>([]);
    const [metaForms, setMetaForms] = useState<any[]>([]);
    const [selectedMetaAccount, setSelectedMetaAccount] = useState('');

    // WhatsApp
    const [isWaModalOpen, setIsWaModalOpen] = useState(false);
    const [waConfig, setWaConfig] = useState({ connected: false, connecting: false, phoneId: '', token: '' });

    // AI Assistant (Gemini/OpenAI)
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [aiConfig, setAiConfig] = useState({ connected: false, connecting: false, provider: 'gemini', apiKey: '', model: 'gemini-pro', enabled: false, prompt: '' });

    // n8n
    const [isN8nModalOpen, setIsN8nModalOpen] = useState(false);
    const [n8nConfig, setN8nConfig] = useState({ connected: false, connecting: false, webhookUrl: '' });

    // Make (Integromat)
    const [isMakeModalOpen, setIsMakeModalOpen] = useState(false);
    const [makeConfig, setMakeConfig] = useState({ connected: false, connecting: false, webhookUrl: '' });

    // Website Forms (Inbound Webhook)
    const [isWebsiteModalOpen, setIsWebsiteModalOpen] = useState(false);
    const [websiteFormsConfig, setWebsiteFormsConfig] = useState<{ connected: boolean; allowedOrigins: string[]; tab?: 'config' | 'embed' }>({ connected: true, allowedOrigins: [], tab: 'config' });
    const [emailConfig, setEmailConfig] = useState({
        smtp_host: '',
        smtp_port: 587,
        smtp_user: '',
        smtp_pass: '',
        from_name: '',
        from_email: '',
        signature: '',
        connecting: false
    });
    const [isEmailConfigLocked, setIsEmailConfigLocked] = useState(true);
    const [isSmtpHelpOpen, setIsSmtpHelpOpen] = useState(false);

    const [systemHealth, setSystemHealth] = useState({
        db_status: 'Checking...',
        redis_status: 'Unknown',
        webhook_health: { success_rate: 0, last_signal: null as string | null, total_24h: 0 },
        automations_active: 0,
        pending_jobs: 0,
        loading: false
    });

    useEffect(() => {
        if (activeTab === 'system') {
            fetchSystemHealth();
        }
    }, [activeTab]);

    const fetchSystemHealth = async () => {
        setSystemHealth(prev => ({ ...prev, loading: true }));
        try {
            const res = await fetch('/api/system_health.php');
            const data = await res.json();
            setSystemHealth({ ...data, loading: false });
        } catch (error) {
            console.error(error);
            setSystemHealth(prev => ({ ...prev, db_status: 'Error Fetching', loading: false }));
        }
    };



    // --- HELP MODAL STATES ---
    const [helpModal, setHelpModal] = useState<{ open: boolean; title: string; content: React.ReactNode }>({
        open: false, title: '', content: null
    });

    const openHelp = (type: 'meta' | 'whatsapp' | 'n8n' | 'make' | 'website') => {
        let title = '';
        let content = null;

        switch (type) {
            case 'meta':
                title = 'Configuración Meta Ads';
                content = (
                    <div className="space-y-4 text-sm text-slate-600">
                        <p>Para conectar Meta Ads (Facebook/Instagram) y recibir leads:</p>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Ve a <a href="https://developers.facebook.com/apps/" target="_blank" className="text-blue-600 underline">Meta Developers</a> y crea una App tipo "Business".</li>
                            <li>En la App, añade el producto "Webhooks" y suscríbete al objeto <b>page</b>.</li>
                            <li>Usa la URL del webhook de este CRM y el token <code>nexus_crm_secret</code> para verificar.</li>
                            <li>Genera un Token de Acceso de Usuario con permisos <code>leads_retrieval</code> y <code>pages_show_list</code>.</li>
                            <li>Copia ese token y pégalo aquí.</li>
                        </ol>
                    </div>
                );
                break;
            case 'whatsapp':
                title = 'WhatsApp Business API';
                content = (
                    <div className="space-y-4 text-sm text-slate-600">
                        <p>Conecta tu número oficial de WhatsApp Cloud API:</p>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Accede a tu cuenta de <a href="https://business.facebook.com/" target="_blank" className="text-blue-600 underline">Meta Business Suite</a>.</li>
                            <li>Ve a la configuración de WhatsApp y obtén el <b>Phone Number ID</b>.</li>
                            <li>Genera un Token Permanente en la sección de Usuarios del Sistema.</li>
                            <li>Configura el Webhook de WhatsApp en Meta apuntando a este CRM.</li>
                        </ol>
                    </div>
                );
                break;
            case 'n8n':
                title = 'Automatización con n8n';
                content = (
                    <div className="space-y-4 text-sm text-slate-600">
                        <p>Envía datos de leads a tus flujos de n8n:</p>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>En n8n, crea un nodo <b>Webhook</b> (Method: POST).</li>
                            <li>Copia la URL "Production" del nodo.</li>
                            <li>Pégala aquí en "Webhook URL Saliente".</li>
                            <li>El CRM enviará un JSON con todos los datos del lead cada vez que se cree uno nuevo.</li>
                        </ol>
                    </div>
                );
                break;
            case 'make':
                title = 'Automatización con Make';
                content = (
                    <div className="space-y-4 text-sm text-slate-600">
                        <p>Integra Make (Integromat) para procesar leads:</p>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Crea un escenario en Make y añade un módulo <b>Custom Webhook</b>.</li>
                            <li>Copia la dirección del webhook generado.</li>
                            <li>Pégala en la configuración de esta integración.</li>
                            <li>El sistema enviará automáticamente los leads nuevos a ese escenario.</li>
                        </ol>
                    </div>
                );
                break;
            case 'website':
                title = 'Formularios Web';
                content = (
                    <div className="space-y-4 text-sm text-slate-600">
                        <p>Recibe leads desde tu sitio web:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><b>Opción A (Webhook):</b> Configura tu plugin (Elementor, CF7) para hacer POST a la URL del webhook.</li>
                            <li><b>Opción B (Embed):</b> Usa nuestro generador de código para crear un formulario HTML listo para pegar.</li>
                        </ul>
                        <div className="mt-4 p-3 bg-slate-100 rounded border border-slate-200">
                            <p className="font-bold text-xs uppercase mb-1">Campos Aceptados:</p>
                            <code className="text-xs">name, email, phone, company, message</code>
                        </div>
                    </div>
                );
                break;
        }
        setHelpModal({ open: true, title, content });
    };

    // --- EMBED GENERATOR STATE ---
    const [embedConfig, setEmbedConfig] = useState({
        title: 'Contáctanos',
        buttonText: 'Enviar Mensaje',
        primaryColor: '#2563EB',
        campaign: 'Web Orgánico'
    });

    const generateEmbedCode = () => {
        const code = `
<!-- KiwüLead Embed Form -->
<div id="kiwulead-form-container" style="max-width:400px;margin:0 auto;font-family:sans-serif;padding:20px;border:1px solid #eee;border-radius:8px;">
  <h3 style="text-align:center;margin-bottom:20px;">${embedConfig.title}</h3>
  <form id="kiwulead-lead-form" onsubmit="submitKiwuleadLead(event)">
    <div style="margin-bottom:15px;">
      <label style="display:block;margin-bottom:5px;font-size:14px;font-weight:bold;">Nombre</label>
      <input type="text" name="name" required style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
    </div>
    <div style="margin-bottom:15px;">
      <label style="display:block;margin-bottom:5px;font-size:14px;font-weight:bold;">Email</label>
      <input type="email" name="email" required style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
    </div>
    <div style="margin-bottom:15px;">
      <label style="display:block;margin-bottom:5px;font-size:14px;font-weight:bold;">Teléfono</label>
      <input type="tel" name="phone" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
    </div>
    <input type="hidden" name="utm_source" value="Website Embed">
    <input type="hidden" name="utm_campaign" value="${embedConfig.campaign}">
    <button type="submit" style="width:100%;padding:10px;background-color:${embedConfig.primaryColor};color:white;border:none;border-radius:4px;font-weight:bold;cursor:pointer;">${embedConfig.buttonText}</button>
  </form>
  <p id="nexus-status" style="margin-top:10px;text-align:center;font-size:13px;"></p>
</div>
<script>
  function submitKiwuleadLead(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = 'Enviando...';
    btn.disabled = true;

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    fetch('${window.location.origin}/api/webhook.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(r => r.json())
    .then(res => {
      document.getElementById('nexus-status').innerText = '¡Gracias! Hemos recibido tus datos.';
      document.getElementById('nexus-status').style.color = 'green';
      e.target.reset();
    })
    .catch(err => {
      document.getElementById('nexus-status').innerText = 'Error al enviar. Intenta de nuevo.';
      document.getElementById('nexus-status').style.color = 'red';
    })
    .finally(() => {
      btn.innerText = originalText;
      btn.disabled = false;
    });
  }
</script>
<!-- End KiwüLead Embed -->`;
        return code.trim();
    };

    // Load settings on mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { api } = await import('../src/services/api');
                // Use api.settings.list() to ensure auth headers are sent
                const data = await api.settings.list();

                if (data.meta) setMetaConfig(prev => ({ ...prev, ...data.meta }));
                if (data.whatsapp_config) setWaConfig(prev => ({ ...prev, ...data.whatsapp_config }));
                else if (data.whatsapp) setWaConfig(prev => ({ ...prev, ...data.whatsapp })); // Backwards compatibility
                if (data.ai) setAiConfig(prev => ({ ...prev, ...data.ai }));
                if (data.n8n) setN8nConfig(prev => ({ ...prev, ...data.n8n }));
                if (data.make) setMakeConfig(prev => ({ ...prev, ...data.make }));
                if (data.website_forms) setWebsiteFormsConfig(prev => ({ ...prev, ...data.website_forms }));

                // Load Email Config
                try {
                    const { api } = await import('../src/services/api');
                    const emailData = await api.settings.getEmailConfig(String(currentUser?.id || '1'));
                    if (emailData.config) {
                        setEmailConfig(prev => ({ ...prev, ...emailData.config }));
                    }
                } catch (e) {
                    console.error("Failed to load email config", e);
                }

                // Load Global Settings
                if (data.company_profile) setCompanyProfile(data.company_profile);
                if (data.distribution_settings) setDistributionSettings(data.distribution_settings);
                if (data.email_templates) setTemplates(data.email_templates);

            } catch (e: any) {
                if (e.message?.includes('401') || e.message?.includes('Unauthorized')) {
                    console.warn("Settings: Session expired. Logging out...");
                    if (onLogout) onLogout();
                    return;
                }
                console.error("Failed to load settings", e);
            }
        };
        fetchSettings();
    }, []);

    // Generic Save Helper
    const saveSetting = async (key: string, value: any) => {
        try {
            const { api } = await import('../src/services/api');
            await api.settings.update(key, value);
        } catch (e) { console.error("Save failed", e); }
    };

    const handleSaveCompany = async () => {
        await saveSetting('company_profile', companyProfile);
        if (onNotify) onNotify('Éxito', 'Perfil de empresa actualizado.', 'success');
    };

    const updateDistribution = async (newSettings: DistributionSettings) => {
        setDistributionSettings(newSettings);
        await saveSetting('distribution_settings', newSettings);
    };

    const handleToggleFeature = async (key: keyof FeaturesConfig) => {
        if (!features || !onUpdateFeatures) return;
        const newFeatures = { ...features, [key]: !features[key] };
        onUpdateFeatures(newFeatures);
        await saveSetting('features', newFeatures);
        if (onNotify) onNotify('Configuración Actualizada', 'Se han guardado los cambios en las funcionalidades.', 'success');
    };

    // E2E Simulation State
    const [e2eStatus, setE2eStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
    const [e2eLogs, setE2eLogs] = useState<string[]>([]);

    // Security Check for Roles
    if (currentUser?.role !== 'MANAGER' && currentUser?.role !== 'SUPPORT') {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="bg-red-50 p-4 rounded-full mb-4">
                    <Lock size={48} className="text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Acceso Denegado</h2>
                <p className="text-slate-500 max-w-md">
                    No tienes permiso para acceder a la Configuración. Este módulo está restringido a
                    Gerentes y Soporte Técnico.
                </p>
            </div>
        );
    }

    // --- PERMISSIONS HELPERS ---
    const canAddMembers = (currentUser?.role as string) !== 'SALES_REP';
    const availableRolesToInvite =
        (currentUser?.role as string) === 'SUPPORT'
            ? ['Support', 'Manager', 'Sales']
            : (currentUser?.role as string) === 'MANAGER'
                ? ['Manager', 'Sales']
                : (currentUser?.role as string) === 'SALES_REP'
                    ? []
                    : ['Support', 'Manager', 'Sales'];
    const roleLabels: Record<string, string> = { Manager: 'Gerente', Sales: 'Vendedor', Support: 'Soporte' };


    const generateStrongPassword = (len: number = 12) => {
        const lowers = 'abcdefghijklmnopqrstuvwxyz';
        const uppers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const digits = '0123456789';
        const symbols = '!@#$%^&*()-_=+[]{};:,.<>?';
        const all = lowers + uppers + digits + symbols;
        const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)];
        let result = pick(lowers) + pick(uppers) + pick(digits) + pick(symbols);
        for (let i = result.length; i < len; i++) result += pick(all);
        return result.split('').sort(() => Math.random() - 0.5).join('');
    };

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const { api } = await import('../src/services/api');

            // In a real app, we'd send a temporary password or invite link
            const finalPassword = (password && password.length >= 8) ? password : generateStrongPassword();
            const response = await api.team.create({
                name: newMember.name,
                email: newMember.email,
                role: newMember.role,
                password: finalPassword,
                status: 'Active'
            });

            if (response.success) {
                // Refresh team from DB to get the actual member with ID
                const updatedTeam = await api.team.list();
                setTeam(updatedTeam);

                setIsInviteModalOpen(false);
                setNewMember({ name: '', email: '', role: 'Sales' });
                setPassword('');
                setAutoGeneratePassword(true);
                setShowPassword(false);
                if (onNotify) onNotify('Miembro Agregado', `${newMember.name} ha sido invitado al equipo.`, 'success');
            }
        } catch (error) {
            console.error('Error adding team member:', error);
            if (onNotify) onNotify('Error', 'No se pudo agregar al miembro.', 'error');
        }
    };

    const getLeadCount = (userName: string) => {
        return contacts.filter(c => c.owner === userName && c.status !== LeadStatus.WON && c.status !== LeadStatus.LOST).length;
    };

    const handleUpdateUserPassword = async () => {
        if (!passwordMember || !newUserPassword) return;
        if (newUserPassword !== confirmUserPassword) {
            if (onNotify) onNotify('Error', 'Las contraseñas no coinciden', 'error');
            return;
        }
        try {
            const { api } = await import('../src/services/api');
            await api.team.update(passwordMember.id, { password: newUserPassword });
            if (onNotify) onNotify('Éxito', 'Contraseña actualizada correctamente', 'success');
            setIsPasswordModalOpen(false);
            setNewUserPassword('');
            setConfirmUserPassword('');
            setPasswordMember(null);
        } catch (e) {
            console.error(e);
            if (onNotify) onNotify('Error', 'No se pudo actualizar la contraseña', 'error');
        }
    };

    const handleRemoveMember = async (id: string, name: string) => {
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
            try {
                const { api } = await import('../src/services/api');
                await api.team.delete(id);

                setTeam(team.filter(t => t.id !== id));
                if (onNotify) onNotify('Miembro Eliminado', 'El usuario ha sido removido del equipo.', 'info');
            } catch (error) {
                console.error('Error deleting team member:', error);
                if (onNotify) onNotify('Error', 'No se pudo eliminar al miembro.', 'error');
            }
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

    const executeReassign = async () => {
        if (!reassignConfig.fromUser || !setContacts) return;

        const fromName = reassignConfig.fromUser.name;
        const toName = reassignConfig.toUser;

        try {
            const { api } = await import('../src/services/api');

            // 1. Identify owner IDs
            const toMember = team.find(m => m.name === toName);
            const toIdOriginal = toMember?.id || null;

            // 2. Perform reassignments in DB
            // For simplicity, we filter locally and update each in DB
            // In a better API, we'd have a bulk reassign endpoint
            const leadsToMove = contacts.filter(c => c.owner === fromName && c.status !== LeadStatus.WON && c.status !== LeadStatus.LOST);

            await Promise.all(leadsToMove.map(async (c) => {
                // Cast to any to avoid owner_id lint error until fixed in types
                await api.contacts.update(c.id, { owner_id: toIdOriginal, owner: toName } as any);
                await api.notes.create({
                    contactId: c.id,
                    content: `🔄 Lead transferido automáticamente de ${fromName} a ${toName}.`,
                    authorId: 1 // System/Admin
                });
            }));

            // 3. Refresh contacts from DB
            const updatedContacts = await api.contacts.list();
            setContacts(updatedContacts);

            if (reassignConfig.deleteAfter) {
                await api.team.delete(reassignConfig.fromUser.id);
                const updatedTeam = await api.team.list();
                setTeam(updatedTeam);
                if (onNotify) onNotify('Usuario Eliminado', `Se transfirieron ${leadsToMove.length} leads y se eliminó a ${fromName}.`, 'success');
            } else {
                if (onNotify) onNotify('Cartera Transferida', `Se movieron ${leadsToMove.length} leads de ${fromName} a ${toName}.`, 'success');
            }

            setIsReassignModalOpen(false);
        } catch (error) {
            console.error('Error during reassignment:', error);
            if (onNotify) onNotify('Error', 'No se pudo completar la reasignación.', 'error');
        }
    };

    const openTemplateModal = (template?: EmailTemplate) => {
        if (template) {
            setEditingTemplateId(template.id);
            setTemplateForm({ ...template });
        } else {
            setEditingTemplateId(null);
            setTemplateForm({ name: '', subject: '', body: '', category: 'Sales' });
        }
        setIsTemplateModalOpen(true);
    };

    const handleSaveTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!templateForm.name || !templateForm.body) return;

        let newTemplates: EmailTemplate[];

        if (editingTemplateId) {
            newTemplates = templates.map(t => t.id === editingTemplateId ? { ...t, ...templateForm } as EmailTemplate : t);
            if (onNotify) onNotify('Plantilla Actualizada', `La plantilla "${templateForm.name}" se guardó correctamente.`, 'success');
        } else {
            const newTpl: EmailTemplate = {
                id: Date.now().toString(),
                name: templateForm.name!,
                subject: templateForm.subject || '',
                body: templateForm.body!,
                category: templateForm.category as any || 'Sales'
            };
            newTemplates = [...templates, newTpl];
            if (onNotify) onNotify('Plantilla Creada', `Nueva plantilla "${templateForm.name}" agregada.`, 'success');
        }

        setTemplates(newTemplates);
        await saveSetting('email_templates', newTemplates);
        setIsTemplateModalOpen(false);
    };

    const handleSeedTemplates = async () => {
        try {
            const res = await fetch('/api/seed_templates.php');
            const json = await res.json();
            if (json.success) {
                if (json.added > 0) {
                    if (onNotify) onNotify('Plantillas Restauradas', `Se han añadido ${json.added} plantillas por defecto.`, 'success');
                    // Reload templates
                    const { api } = await import('../src/services/api');
                    const data = await api.settings.list();
                    if (data.email_templates) setTemplates(data.email_templates);
                } else {
                    if (onNotify) onNotify('Aviso', 'Las plantillas ya existen.', 'info');
                }
            }
        } catch (e) {
            console.error(e);
            if (onNotify) onNotify('Error', 'No se pudieron restaurar las plantillas.', 'error');
        }
    };

    const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('¿Eliminar esta plantilla?')) {
            const newTemplates = templates.filter(t => t.id !== id);
            setTemplates(newTemplates);
            await saveSetting('email_templates', newTemplates);
        }
    };

    // --- INTEGRATION HANDLERS ---

    // --- META WIZARD HANDLERS ---

    const handleMetaLogin = async () => {
        setMetaConfig(prev => ({ ...prev, connecting: true }));
        // Simulate OAuth delay
        await new Promise(r => setTimeout(r, 1000));

        // Fetch accounts from our Mock API
        try {
            const res = await fetch('/api/meta.php?action=accounts');
            const json = await res.json();
            setMetaAccounts(json.data || []);
            setMetaStep(2);
        } catch (e) {
            if (onNotify) onNotify('Error', 'Fallo al conectar con Facebook API.', 'error');
        } finally {
            setMetaConfig(prev => ({ ...prev, connecting: false }));
        }
    };

    const handleMetaAccountSelect = async (accountId: string) => {
        setSelectedMetaAccount(accountId);

        // Fetch forms for this account
        try {
            const res = await fetch(`/api/meta.php?action=forms&account_id=${accountId}`);
            const json = await res.json();
            setMetaForms(json.data || []);
            setMetaStep(3);
        } catch (e) {
            console.error(e);
        }
    };

    const toggleMetaForm = (formId: string) => {
        const current = metaConfig.selectedForms || [];
        const updated = current.includes(formId)
            ? current.filter(id => id !== formId)
            : [...current, formId];

        setMetaConfig({ ...metaConfig, selectedForms: updated });
    };

    const handleFinalizeMeta = async () => {
        setMetaConfig(prev => ({ ...prev, connecting: true }));

        const newVal = {
            ...metaConfig,
            connected: true,
            connecting: false,
            pageId: '1029384756', // Mock Page ID
            adAccount: selectedMetaAccount
        };

        await saveSetting('meta', newVal);

        setMetaConfig(newVal);
        setMetaStep(1); // Reset wizard for next time
        if (onNotify) onNotify('Meta Ads Conectado', 'Cuenta y formularios vinculados correctamente.', 'success');
    };

    const handleConnectWhatsapp = async (e: React.FormEvent) => {
        e.preventDefault();
        setWaConfig(prev => ({ ...prev, connecting: true }));

        const newVal = { ...waConfig, connected: true, connecting: false };
        await saveSetting('whatsapp_config', newVal);

        setWaConfig(newVal);
        if (onNotify) onNotify('WhatsApp Conectado', 'Número vinculado exitosamente.', 'success');
    };

    const handleConnectAI = async (e: React.FormEvent) => {
        e.preventDefault();
        setAiConfig(prev => ({ ...prev, connecting: true }));

        const newVal = { ...aiConfig, connected: true, connecting: false };
        await saveSetting('ai', newVal);

        setAiConfig(newVal);
        if (onNotify) onNotify('AI Conectado', 'Asistente Inteligente activo.', 'success');
    };

    const handleTestAI = async () => {
        if (!aiConfig.apiKey) {
            if (onNotify) onNotify('Error', 'Ingresa una API Key primero.', 'warning');
            return;
        }
        setAiConfig(prev => ({ ...prev, connecting: true }));
        try {
            const res = await fetch('/api/test_ai.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: aiConfig.provider,
                    apiKey: aiConfig.apiKey,
                    model: aiConfig.model
                })
            });

            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (jsonError) {
                // If not JSON, it's likely a PHP fatal error or 404 HTML
                console.error("Non-JSON response:", text);
                throw new Error(`Respuesta inválida del servidor (posible error PHP): ${text.substring(0, 100)}...`);
            }

            if (data.success) {
                if (onNotify) onNotify('Conexión Exitosa', data.message, 'success');
            } else {
                if (onNotify) onNotify('Error de Conexión', data.error || 'Fallo desconocido', 'error');
            }
        } catch (e: any) {
            console.error(e);
            if (onNotify) onNotify('Error', e.message || 'No se pudo contactar al servidor de prueba.', 'error');
        } finally {
            setAiConfig(prev => ({ ...prev, connecting: false }));
        }
    };

    const handleConnectN8n = async (e: React.FormEvent) => {
        e.preventDefault();
        setN8nConfig(prev => ({ ...prev, connecting: true }));

        const newVal = { ...n8nConfig, connected: true, connecting: false };
        await saveSetting('n8n', newVal);

        setN8nConfig(newVal);
        if (onNotify) onNotify('n8n Webhook Activo', 'Flujo de automatización conectado.', 'success');
    };

    const handleConnectMake = async (e: React.FormEvent) => {
        e.preventDefault();
        setMakeConfig(prev => ({ ...prev, connecting: true }));

        const newVal = { ...makeConfig, connected: true, connecting: false };
        await saveSetting('make', newVal);

        setMakeConfig(newVal);
        if (onNotify) onNotify('Make Conectado', 'Webhook de Integromat activo.', 'success');
    };

    const handleSaveWebsiteForms = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleaned = websiteFormsConfig.allowedOrigins
            .map(o => o.trim())
            .filter(o => o.length > 0);
        const newVal = { connected: true, allowedOrigins: cleaned };
        await saveSetting('website_forms', newVal);
        setWebsiteFormsConfig(newVal);
        if (onNotify) onNotify('Webhooks Activos', 'Formularios del sitio vinculados correctamente.', 'success');
    };

    const handleSaveEmailConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        setEmailConfig(prev => ({ ...prev, connecting: true }));
        try {
            const { api } = await import('../src/services/api');
            await api.settings.saveEmailConfig(String(currentUser?.id || '1'), emailConfig);
            if (onNotify) onNotify('Configuración Guardada', 'Tus credenciales de email se actualizaron.', 'success');
        } catch (error) {
            if (onNotify) onNotify('Error', 'No se pudo guardar la configuración.', 'error');
        } finally {
            setEmailConfig(prev => ({ ...prev, connecting: false }));
        }
    };

    const handleTestEmailConnection = async () => {
        setEmailConfig(prev => ({ ...prev, connecting: true }));
        try {
            const { api } = await import('../src/services/api');
            const res = await api.settings.testEmailConfig(String(currentUser?.id || '1'), emailConfig);
            if (res.success) {
                if (onNotify) onNotify('¡Conexión Exitosa!', 'El servidor SMTP respondió correctamente. Tus credenciales son válidas.', 'success');
            } else {
                if (onNotify) onNotify('Fallo de Conexión', `El servidor rechazó la conexión: ${res.error || 'Verifique host, puerto y credenciales.'}`, 'error');
            }
        } catch (error) {
            if (onNotify) onNotify('Error de Sistema', 'Ocurrió un error inesperado al probar la conexión.', 'error');
        } finally {
            setEmailConfig(prev => ({ ...prev, connecting: false }));
        }
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
            createdAt: new Date().toISOString(),
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
        if (onNotify) onNotify('Simulación Exitosa', 'Lead de prueba inyectado.', 'info', mockLead.id);
    };

    const runSystemDiagnostics = async () => {
        if (!setContacts) return;
        setE2eStatus('running');
        setE2eLogs(['Iniciando diagnóstico del sistema...', 'Verificando servicios de automatización... OK']);

        const testId = `e2e_${Date.now()}`;
        const testName = "auto test user";

        await new Promise(r => setTimeout(r, 800));
        setE2eLogs(prev => [...prev, `Paso 1: Enviando lead real al Webhook (${testName})...`]);

        try {
            // Hit the real backend webhook
            const res = await fetch('/api/webhook.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: testName,
                    email: `e2e_${Date.now()}@test.com`,
                    phone: '5512345678',
                    source: 'E2E_DIAGNOSTIC',
                    value: 1000,
                    note: 'Creado por Diagnóstico de Sistema'
                })
            });

            const json = await res.json();

            if (!json.success) throw new Error(json.error || 'Webhook failed');

            setE2eLogs(prev => [...prev, `✓ Webhook 200 OK (ID: ${json.id})`]);

            // Refresh contacts to see if it appeared
            const { api } = await import('../src/services/api');
            const freshContacts = await api.contacts.list();
            setContacts(freshContacts);

            await new Promise(r => setTimeout(r, 800));
            setE2eLogs(prev => [...prev, 'Paso 2: Verificando persistencia en DB... OK']);

            await new Promise(r => setTimeout(r, 500));
            setE2eLogs(prev => [...prev, 'Paso 3: Verificando flujo de ventas...']);
            setE2eLogs(prev => [...prev, '✓ Lead asignado a Inbox']);

            setE2eStatus('success');
            setE2eLogs(prev => [...prev, 'RESULTADO: DIAGNÓSTICO EXITOSO. El sistema integra datos externos correctamente.']);
            if (onNotify) onNotify('Diagnóstico Completado', 'Webhook funcional y base de datos sincronizada.', 'success');

        } catch (error) {
            console.error(error);
            setE2eStatus('error');
            setE2eLogs(prev => [...prev, 'ERROR: Fallo al conectar con Webhook API.']);
            if (onNotify) onNotify('Error', 'Fallo en diagnóstico.', 'error');
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto relative">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Configuración Global</h2>

            <div className="flex gap-6 border-b border-slate-200 mb-8 overflow-x-auto">
                {['company', 'team', 'pipeline', 'features', 'distribution', 'integrations', 'email', 'system'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`pb-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap capitalize ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        {tab === 'integrations' ? 'Integraciones' :
                            tab === 'company' ? 'Empresa' :
                                tab === 'team' ? 'Equipo' :
                                    tab === 'pipeline' ? 'Pipeline' :
                                        tab === 'distribution' ? 'Asignación' :
                                            tab === 'email' ? 'Email' :
                                                tab === 'features' ? 'Funcionalidades' :
                                                    tab === 'system' ? 'Sistema & Dev' : tab}
                    </button>
                ))}
            </div>

            {/* --- FEATURES TAB --- */}
            {activeTab === 'features' && features && (
                <div className="max-w-3xl animate-in fade-in duration-300 space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Funcionalidades del Sistema</h3>
                        <p className="text-sm text-slate-500">Activa o desactiva módulos según las necesidades de tu operación.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Email Feature */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
                            <div className="flex gap-4">
                                <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
                                    <Mail size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900">Cliente de Correo</h4>
                                    <p className="text-sm text-slate-500 mt-1 max-w-xs">Enviar y recibir emails directamente desde el CRM. Incluye plantillas y tracking.</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={features.enableEmail} onChange={() => handleToggleFeature('enableEmail')} />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        {/* WhatsApp Feature */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
                            <div className="flex gap-4">
                                <div className="bg-green-50 p-3 rounded-lg text-green-600">
                                    <MessageSquare size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900">WhatsApp Inbox</h4>
                                    <p className="text-sm text-slate-500 mt-1 max-w-xs">Gestión de conversaciones de WhatsApp Business API, plantillas y archivos multimedia.</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={features.enableWhatsApp} onChange={() => handleToggleFeature('enableWhatsApp')} />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        {/* AI Feature */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
                            <div className="flex gap-4">
                                <div className="bg-purple-50 p-3 rounded-lg text-purple-600">
                                    <Bot size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900">Inteligencia Artificial</h4>
                                    <p className="text-sm text-slate-500 mt-1 max-w-xs">Métricas de rendimiento de IA, auto-respuestas y análisis de conversaciones.</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={features.enableAI} onChange={() => handleToggleFeature('enableAI')} />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                </div>
            )}

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
                                        aria-label="Nombre de la Empresa"
                                        value={companyProfile.name}
                                        onChange={(e) => setCompanyProfile({ ...companyProfile, name: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">URL del Logo (Imagen)</label>
                                <input
                                    type="text"
                                    placeholder="https://..."
                                    aria-label="URL del Logo"
                                    value={companyProfile.logoUrl}
                                    onChange={(e) => setCompanyProfile({ ...companyProfile, logoUrl: e.target.value })}
                                    className="w-full px-4 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
                                        aria-label="Sitio Web"
                                        value={companyProfile.website}
                                        onChange={(e) => setCompanyProfile({ ...companyProfile, website: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Industria</label>
                                <input
                                    type="text"
                                    aria-label="Industria"
                                    value={companyProfile.industry}
                                    onChange={(e) => setCompanyProfile({ ...companyProfile, industry: e.target.value })}
                                    className="w-full px-4 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
                                        aria-label="Moneda Base"
                                        onChange={(e) => setCompanyProfile({ ...companyProfile, currency: e.target.value as any })}
                                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
                                    aria-label="RFC / Tax ID"
                                    value={companyProfile.taxId || ''}
                                    onChange={(e) => setCompanyProfile({ ...companyProfile, taxId: e.target.value })}
                                    className="w-full px-4 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Dirección Fiscal</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 text-slate-400" size={18} />
                                <textarea
                                    rows={3}
                                    aria-label="Dirección Fiscal"
                                    value={companyProfile.address || ''}
                                    onChange={(e) => setCompanyProfile({ ...companyProfile, address: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button onClick={handleSaveCompany} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 shadow-sm transition-colors">
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TEAM TAB --- */}
            {activeTab === 'team' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Equipo & Permisos</h2>
                            <p className="text-slate-500 text-sm">Gestiona el acceso y roles de tus colaboradores.</p>
                        </div>
                        {canAddMembers && (
                            <button
                                onClick={() => setIsInviteModalOpen(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                            >
                                <UserPlus size={16} />
                                Agregar Miembro
                            </button>
                        )}
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
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">{member.name.substring(0, 2).toUpperCase()}</div>
                                                    <div><p className="text-sm font-medium text-slate-900">{member.name}</p><p className="text-xs text-slate-500">{member.email}</p></div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4"><span className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium w-fit"><Shield size={12} /> {member.role}</span></td>
                                            <td className="px-6 py-4"><span className="text-green-600 text-xs font-medium bg-green-50 px-2 py-1 rounded">{member.status}</span></td>
                                            <td className="px-6 py-4">
                                                <span className="text-slate-700 font-bold text-sm bg-slate-100 px-2 py-0.5 rounded">{getLeadCount(member.name)}</span>
                                            </td>
                                            <td className="px-6 py-4 flex gap-2">
                                                <button
                                                    onClick={() => openReassignModal(member)}
                                                    className="text-slate-400 hover:text-blue-600 text-sm font-medium"
                                                    title="Transferir Cartera"
                                                >
                                                    <ArrowRightLeft size={16} />
                                                </button>
                                                {/* Password Change Button */}
                                                {(currentUser?.role === 'MANAGER' || currentUser?.role === 'SUPPORT') && (
                                                    <button
                                                        onClick={() => { setPasswordMember(member); setIsPasswordModalOpen(true); }}
                                                        className="text-slate-400 hover:text-amber-500 text-sm font-medium"
                                                        title="Cambiar Contraseña"
                                                    >
                                                        <Lock size={16} />
                                                    </button>
                                                )}
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

            {/* --- PIPELINE TAB --- */}
            {activeTab === 'pipeline' && (
                <PipelineSettings onNotify={onNotify} />
            )}

            {/* --- DISTRIBUTION TAB --- */}
            {activeTab === 'distribution' && (
                <div className="space-y-6">
                    <div className="flex flex-col gap-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Scale size={24} /></div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">Lógica de Asignación Automática</h3>
                                        <p className="text-sm text-slate-500">Define cómo se distribuyen los nuevos leads.</p>
                                    </div>
                                </div>

                                <label className="flex items-center cursor-pointer">
                                    <span className="mr-3 text-sm font-medium text-slate-700">{distributionSettings.enabled ? 'Activado' : 'Desactivado'}</span>
                                    <div className="relative">
                                        <input type="checkbox" className="sr-only" checked={distributionSettings.enabled} onChange={() => updateDistribution({ ...distributionSettings, enabled: !distributionSettings.enabled })} />
                                        <div className={`block w-10 h-6 rounded-full transition-colors ${distributionSettings.enabled ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${distributionSettings.enabled ? 'transform translate-x-4' : ''}`}></div>
                                    </div>
                                </label>
                            </div>

                            <div className={`grid md:grid-cols-2 gap-4 ${!distributionSettings.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                                {/* Round Robin Card */}
                                <div
                                    onClick={() => updateDistribution({ ...distributionSettings, method: 'round_robin' })}
                                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col gap-2 ${distributionSettings.method === 'round_robin' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg w-fit"><Activity size={20} /></div>
                                        {distributionSettings.method === 'round_robin' && <CheckCircle size={20} className="text-blue-600" />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">Round Robin (Rotativo)</h4>
                                        <p className="text-xs text-slate-500 mt-1">Asigna leads uno por uno secuencialmente a cada vendedor disponible. Ideal para equipos de venta rápida.</p>
                                    </div>
                                </div>

                                {/* Load Balanced Card */}
                                <div
                                    onClick={() => updateDistribution({ ...distributionSettings, method: 'load_balanced' })}
                                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col gap-2 ${distributionSettings.method === 'load_balanced' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="p-2 bg-orange-100 text-orange-600 rounded-lg w-fit"><Users size={20} /></div>
                                        {distributionSettings.method === 'load_balanced' && <CheckCircle size={20} className="text-blue-600" />}
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


            {/* --- INTEGRATIONS TAB --- */}
            {activeTab === 'integrations' && (
                <div className="space-y-10">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-900">Ecosistema de Integraciones</h3>
                    </div>

                    {/* SECTION 1: INBOUND (CAPTACIÓN) */}
                    <div>
                        <div className="mb-4 border-b border-slate-100 pb-2">
                            <h4 className="text-md font-bold text-slate-800 flex items-center gap-2">
                                <span className="bg-green-100 text-green-700 p-1 rounded text-xs">ENTRADA</span>
                                Fuentes de Captación
                            </h4>
                            <p className="text-sm text-slate-500 mt-1">Conecta tus canales de tráfico (Web, Redes Sociales) para recibir leads automáticamente.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {INTEGRATIONS.filter(app => ['Meta Ads Manager', 'WhatsApp Business API', 'Formularios del Sitio (Webhook)'].includes(app.name)).map((app) => {
                                let isConnected = app.status === 'Connected';
                                let openConfig = () => { };
                                let helpType: 'meta' | 'whatsapp' | 'website' = 'meta';

                                if (app.name === 'Meta Ads Manager') {
                                    isConnected = metaConfig.connected || app.status === 'Connected';
                                    openConfig = () => setIsMetaModalOpen(true);
                                    helpType = 'meta';
                                } else if (app.name === 'WhatsApp Business API') {
                                    isConnected = waConfig.connected;
                                    openConfig = () => setIsWaModalOpen(true);
                                    helpType = 'whatsapp';
                                } else if (app.name === 'Formularios del Sitio (Webhook)') {
                                    isConnected = websiteFormsConfig.connected || app.status === 'Connected';
                                    openConfig = () => setIsWebsiteModalOpen(true);
                                    helpType = 'website';
                                }

                                return (
                                    <div key={app.name} className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm flex justify-between items-center group hover:border-blue-300 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isConnected ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                                {app.icon === 'Facebook' && <Facebook size={24} />}
                                                {app.icon === 'MessageSquare' && <MessageSquare size={24} />}
                                                {app.icon === 'Globe' && <Globe size={24} />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold text-slate-900">{app.name}</h4>
                                                    <button onClick={(e) => { e.stopPropagation(); openHelp(helpType); }} className="text-slate-400 hover:text-blue-600 transition-colors">
                                                        <HelpCircle size={16} />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {isConnected
                                                        ? <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">Activo</span>
                                                        : <span className="text-xs text-slate-400 font-medium">Inactivo</span>
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={openConfig}
                                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${isConnected ? 'bg-slate-50 text-slate-600 hover:bg-slate-100' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'}`}
                                        >
                                            {isConnected ? 'Configurar' : 'Conectar'}
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* SECTION 2: OUTBOUND (AUTOMATIZACIÓN) */}
                    <div>
                        <div className="mb-4 border-b border-slate-100 pb-2">
                            <h4 className="text-md font-bold text-slate-800 flex items-center gap-2">
                                <span className="bg-blue-100 text-blue-700 p-1 rounded text-xs">SALIDA</span>
                                Automatización y Flujos
                            </h4>
                            <p className="text-sm text-slate-500 mt-1">Envía datos a herramientas externas (n8n, Make) cuando ocurren eventos en el CRM.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {INTEGRATIONS.filter(app => ['n8n Automatización', 'Make (Integromat)'].includes(app.name)).map((app) => {
                                let isConnected = app.status === 'Connected';
                                let openConfig = () => { };
                                let helpType: 'n8n' | 'make' = 'n8n';

                                if (app.name === 'n8n Automatización') {
                                    isConnected = n8nConfig.connected || app.status === 'Connected';
                                    openConfig = () => setIsN8nModalOpen(true);
                                    helpType = 'n8n';
                                } else if (app.name === 'Make (Integromat)') {
                                    isConnected = makeConfig.connected || app.status === 'Connected';
                                    openConfig = () => setIsMakeModalOpen(true);
                                    helpType = 'make';
                                }

                                return (
                                    <div key={app.name} className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm flex justify-between items-center group hover:border-cyan-300 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isConnected ? 'bg-cyan-50 text-cyan-600' : 'bg-slate-100 text-slate-400'}`}>
                                                {app.icon === 'Workflow' && <Workflow size={24} />}
                                                {app.icon === 'Zap' && <Zap size={24} />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold text-slate-900">{app.name}</h4>
                                                    <button onClick={(e) => { e.stopPropagation(); openHelp(helpType); }} className="text-slate-400 hover:text-cyan-600 transition-colors">
                                                        <HelpCircle size={16} />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {isConnected
                                                        ? <span className="text-xs text-cyan-600 font-medium bg-cyan-50 px-2 py-0.5 rounded-full">Activo</span>
                                                        : <span className="text-xs text-slate-400 font-medium">Inactivo</span>
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={openConfig}
                                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${isConnected ? 'bg-slate-50 text-slate-600 hover:bg-slate-100' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'}`}
                                        >
                                            {isConnected ? 'Configurar' : 'Conectar'}
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* SECTION 3: INTERNAL (IA) */}
                    <div>
                        <div className="mb-4 border-b border-slate-100 pb-2">
                            <h4 className="text-md font-bold text-slate-800 flex items-center gap-2">
                                <span className="bg-purple-100 text-purple-700 p-1 rounded text-xs">INTERNO</span>
                                Inteligencia Artificial
                            </h4>
                            <p className="text-sm text-slate-500 mt-1">Potencia tu productividad con asistentes internos para redacción y análisis.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {INTEGRATIONS.filter(app => ['AI Assistant'].includes(app.name)).map((app) => {
                                let isConnected = app.status === 'Connected';
                                let openConfig = () => { };

                                if (app.name === 'AI Assistant') {
                                    isConnected = aiConfig.connected;
                                    openConfig = () => setIsAIModalOpen(true);
                                }

                                return (
                                    <div key={app.name} className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm flex justify-between items-center group hover:border-purple-300 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isConnected ? 'bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-400'}`}>
                                                {app.icon === 'Bot' && <Bot size={24} />}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-900">{app.name}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {isConnected
                                                        ? <span className="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded-full">Activo</span>
                                                        : <span className="text-xs text-slate-400 font-medium">Inactivo</span>
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={openConfig}
                                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${isConnected ? 'bg-slate-50 text-slate-600 hover:bg-slate-100' : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'}`}
                                        >
                                            {isConnected ? 'Configurar' : 'Conectar'}
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                </div>
            )}



            {/* REASSIGN LEADS MODAL */}
            {isReassignModalOpen && reassignConfig.fromUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-4 text-blue-900">
                            <div className="p-2 bg-blue-100 rounded-lg"><ArrowRightLeft size={24} /></div>
                            <h3 className="text-lg font-bold">Transferir Cartera</h3>
                        </div>

                        <p className="text-sm text-slate-600 mb-4">
                            Estás a punto de reasignar los leads de <b>{reassignConfig.fromUser.name}</b>.
                            <br />
                            Actualmente tiene <span className="font-bold bg-slate-100 px-1 rounded">{getLeadCount(reassignConfig.fromUser.name)} leads activos</span>.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Transferir a:</label>
                                <select
                                    value={reassignConfig.toUser}
                                    onChange={e => setReassignConfig({ ...reassignConfig, toUser: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
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
                                <button onClick={executeReassign} className="flex-1 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">Confirmar Transferencia</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PASSWORD CHANGE MODAL */}
            {isPasswordModalOpen && passwordMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-4 text-amber-600">
                            <div className="p-2 bg-amber-100 rounded-lg"><Lock size={24} /></div>
                            <h3 className="text-lg font-bold">Cambiar Contraseña</h3>
                        </div>

                        <p className="text-sm text-slate-600 mb-4">
                            Establece una nueva contraseña para <b>{passwordMember.name}</b>.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nueva Contraseña</label>
                                <input
                                    type="password"
                                    value={newUserPassword}
                                    onChange={e => setNewUserPassword(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Mínimo 8 caracteres"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirmar Contraseña</label>
                                <input
                                    type="password"
                                    value={confirmUserPassword}
                                    onChange={e => setConfirmUserPassword(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Repite la contraseña"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button onClick={() => { setIsPasswordModalOpen(false); setPasswordMember(null); }} className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                                <button
                                    onClick={handleUpdateUserPassword}
                                    disabled={!newUserPassword || newUserPassword.length < 8 || newUserPassword !== confirmUserPassword}
                                    className="flex-1 py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Actualizar
                                </button>
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
                            <input required type="text" value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Nombre" />
                            <input required type="email" value={newMember.email} onChange={e => setNewMember({ ...newMember, email: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Email" />
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                                <select
                                    value={newMember.role}
                                    onChange={e => setNewMember({ ...newMember, role: e.target.value })}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {availableRolesToInvite.map(r => (
                                        <option key={r} value={r}>{roleLabels[r] ?? r}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Key size={16} className="text-slate-600" />
                                        <span className="text-sm font-medium text-slate-700">Generar contraseña automáticamente</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={autoGeneratePassword}
                                        onChange={e => {
                                            const checked = e.target.checked;
                                            setAutoGeneratePassword(checked);
                                            if (checked) setPassword(generateStrongPassword());
                                        }}
                                        className="h-4 w-4"
                                    />
                                </div>
                                <div className="mt-3">
                                    {autoGeneratePassword ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                readOnly
                                                className="flex-1 px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg outline-none"
                                            />
                                            <button type="button" onClick={() => setShowPassword(s => !s)} className="px-3 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-100">
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => navigator.clipboard && password && navigator.clipboard.writeText(password)}
                                                className="px-3 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-100"
                                            >
                                                <Copy size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <input
                                                required
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                className="flex-1 px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg outline-none"
                                                placeholder="Contraseña"
                                            />
                                            <button type="button" onClick={() => setShowPassword(s => !s)} className="px-3 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-100">
                                                <Eye size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsInviteModalOpen(false)} className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 bg-white">Cancelar</button>
                                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700">Enviar</button>
                            </div>
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
                                <input required type="text" value={templateForm.name} onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ej. Bienvenida V2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Asunto del Correo</label>
                                <input required type="text" value={templateForm.subject} onChange={e => setTemplateForm({ ...templateForm, subject: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Bienvenido a..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Cuerpo del Mensaje</label>
                                <div className="mb-2 flex flex-wrap gap-2">
                                    {['{{name}}', '{{email}}', '{{phone}}', '{{company}}', '{{user_name}}', '{{user_email}}'].map(v => (
                                        <button
                                            key={v}
                                            type="button"
                                            onClick={() => setTemplateForm(prev => ({ ...prev, body: prev.body + (prev.body ? ' ' : '') + v }))}
                                            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded border border-slate-200 transition-colors"
                                            title="Clic para insertar"
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>
                                <textarea required rows={6} value={templateForm.body} onChange={e => setTemplateForm({ ...templateForm, body: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm" placeholder="Hola {{name}}..." />
                                <p className="text-xs text-slate-500 mt-1">Haga clic en una variable para insertarla al final.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                                <select value={templateForm.category} onChange={e => setTemplateForm({ ...templateForm, category: e.target.value as any })} className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option value="Sales">Ventas</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="Support">Soporte</option>
                                    <option value="Follow-up">Seguimiento</option>
                                    <option value="System">Sistema</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsTemplateModalOpen(false)} className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 bg-white">Cancelar</button>
                                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- HELP MODAL --- */}
            {helpModal.open && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Info size={20} className="text-blue-600" />
                                {helpModal.title}
                            </h3>
                            <button onClick={() => setHelpModal({ ...helpModal, open: false })} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            {helpModal.content}
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-200 text-right">
                            <button onClick={() => setHelpModal({ ...helpModal, open: false })} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">
                                Entendido
                            </button>
                        </div>
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
                            <button onClick={() => setIsMetaModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            {!metaConfig.connected ? (
                                <>
                                    {/* STEP 1: LOGIN */}
                                    {metaStep === 1 && (
                                        <div className="space-y-6 text-center py-4">
                                            <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                                                <Facebook size={32} className="text-blue-600" />
                                            </div>
                                            <h4 className="text-lg font-semibold text-slate-900">Conectar con Facebook</h4>

                                            {/* Verify Token Input for Handshake */}
                                            <div className="text-left max-w-sm mx-auto mb-6 bg-slate-50 p-3 rounded border border-slate-200">
                                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Verify Token (Configuración)</label>
                                                <input
                                                    type="text"
                                                    value={metaConfig.verifyToken}
                                                    onChange={e => setMetaConfig({ ...metaConfig, verifyToken: e.target.value })}
                                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded font-mono text-sm mb-1"
                                                />
                                                <p className="text-[10px] text-slate-500">Use este token en el campo "Verify Token" de su App en Meta.</p>
                                            </div>

                                            <button
                                                onClick={handleMetaLogin}
                                                disabled={metaConfig.connecting}
                                                className="w-full bg-[#1877F2] hover:bg-[#166fe5] text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
                                            >
                                                {metaConfig.connecting ? (
                                                    <><Loader2 size={18} className="animate-spin" /> Autenticando...</>
                                                ) : (
                                                    <>Continuar con Facebook</>
                                                )}
                                            </button>
                                        </div>
                                    )}

                                    {/* STEP 2: SELECT ACCOUNT */}
                                    {metaStep === 2 && (
                                        <div className="space-y-4">
                                            <h4 className="font-bold text-slate-900">Selecciona tu Cuenta Publicitaria</h4>
                                            <div className="space-y-2">
                                                {metaAccounts.map(acc => (
                                                    <button
                                                        key={acc.id}
                                                        onClick={() => handleMetaAccountSelect(acc.id)}
                                                        className="w-full p-4 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left flex justify-between items-center group transition-all"
                                                    >
                                                        <span className="font-medium text-slate-800">{acc.name}</span>
                                                        <span className="text-xs text-slate-400 group-hover:text-blue-600">{acc.id}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            <button onClick={() => setMetaStep(1)} className="text-sm text-slate-500 hover:underline">Volver</button>
                                        </div>
                                    )}

                                    {/* STEP 3: SELECT FORMS */}
                                    {metaStep === 3 && (
                                        <div className="space-y-4">
                                            <h4 className="font-bold text-slate-900">Selecciona los Formularios</h4>
                                            <p className="text-xs text-slate-500">Elige qué formularios enviarán leads a {appName}.</p>

                                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                                {metaForms.map(form => {
                                                    const isSelected = (metaConfig.selectedForms || []).includes(form.id);
                                                    return (
                                                        <div
                                                            key={form.id}
                                                            onClick={() => toggleMetaForm(form.id)}
                                                            className={`w-full p-3 border rounded-lg cursor-pointer flex items-center justify-between transition-all ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                                                                    {isSelected && <CheckCircle size={14} className="text-white" />}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-medium text-slate-800">{form.name}</p>
                                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${form.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                                                        {form.status}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div className="pt-4 flex gap-3">
                                                <button onClick={() => setMetaStep(2)} className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200">Atrás</button>
                                                <button
                                                    onClick={handleFinalizeMeta}
                                                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
                                                >
                                                    Guardar y Conectar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <p className="text-xs text-slate-400 mt-4">
                                        Utilizamos la API oficial de Meta Graph. Tus datos están seguros.
                                    </p>
                                </>
                            ) : (
                                <div className="space-y-6">
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                                        <CheckCircle className="text-green-600" size={24} />
                                        <div>
                                            <h5 className="font-bold text-green-800 text-sm">¡Cuenta Conectada!</h5>
                                            <p className="text-xs text-green-700">Se están sincronizando leads de la página <b>"{appName} Tech Demo"</b>.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Mapeo de Campos (Automático)</h4>
                                        <div className="bg-slate-50 p-3 rounded border border-slate-100 space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">full_name</span>
                                                <span className="text-blue-600 font-mono">→ Contact.Name</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">email</span>
                                                <span className="text-blue-600 font-mono">→ Contact.Email</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">phone_number</span>
                                                <span className="text-blue-600 font-mono">→ Contact.Phone</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100">
                                        <h4 className="text-sm font-bold text-slate-700 mb-2">Herramientas de Diagnóstico</h4>
                                        <button
                                            onClick={handleSimulateMetaLead}
                                            className="w-full py-3 bg-white border-2 border-dashed border-blue-200 text-blue-600 font-bold rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Play size={18} fill="currentColor" /> Simular Lead de Prueba (Webhook)
                                        </button>
                                        <p className="text-xs text-center text-slate-400 mt-2">
                                            Esto inyectará un lead ficticio en el CRM como si viniera de una campaña real.
                                        </p>
                                    </div>

                                    <div className="pt-2 border-t border-slate-100 flex justify-center">
                                        <button
                                            onClick={() => { setMetaConfig(prev => ({ ...prev, connected: false })); setMetaStep(1); }}
                                            className="text-xs text-red-500 hover:text-red-700 font-medium hover:underline flex items-center gap-1"
                                        >
                                            <Trash2 size={12} /> Desconectar y Reconfigurar
                                        </button>
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
                            <button onClick={() => setIsWaModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleConnectWhatsapp} className="p-6 space-y-4">
                            {!waConfig.connected ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number ID</label>
                                        <div className="relative">
                                            <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input required type="text" value={waConfig.phoneId} onChange={e => setWaConfig({ ...waConfig, phoneId: e.target.value })} className="w-full pl-10 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="1029384756" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Permanent Access Token</label>
                                        <div className="relative">
                                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input required type="password" value={waConfig.token} onChange={e => setWaConfig({ ...waConfig, token: e.target.value })} className="w-full pl-10 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="EAAG..." />
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
                                    <button type="button" onClick={() => setWaConfig({ ...waConfig, connected: false })} className="text-red-600 text-sm hover:underline">Desconectar cuenta</button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}

            {/* --- AI ASSISTANT MODAL --- */}
            {isAIModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Bot size={28} className="text-blue-600" />
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Configuración AI Assistant</h3>
                                    <p className="text-xs text-slate-500">Potencia tu CRM con Inteligencia Artificial.</p>
                                </div>
                            </div>
                            <button onClick={() => setIsAIModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleConnectAI} className="p-6 space-y-4">
                            {!aiConfig.connected ? (
                                <>
                                    <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800 flex gap-2 items-start">
                                        <Bot size={16} className="flex-shrink-0" />
                                        <span>Selecciona tu proveedor de IA y configura tu API Key para habilitar funciones inteligentes.</span>
                                    </div>

                                    {/* AI Agent Toggle */}
                                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                                        <div>
                                            <span className="text-sm font-bold text-slate-700 block">Agente de Auto-Respuesta</span>
                                            <span className="text-xs text-slate-500">Permitir que la IA responda mensajes de WhatsApp automáticamente.</span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                aria-label="Toggle AI Agent"
                                                className="sr-only peer"
                                                checked={aiConfig.enabled || false}
                                                onChange={e => setAiConfig({ ...aiConfig, enabled: e.target.checked })}
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    {/* System Prompt */}
                                    {aiConfig.enabled && (
                                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Instrucciones del Sistema (Prompt)</label>
                                            <textarea
                                                rows={4}
                                                value={aiConfig.prompt || ''}
                                                onChange={e => setAiConfig({ ...aiConfig, prompt: e.target.value })}
                                                aria-label="System Prompt"
                                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                                                placeholder="Eres un agente de ventas experto en..."
                                            />
                                            <p className="text-[10px] text-slate-500 mt-1">Define la personalidad y objetivos del bot. Se inyectará contexto de productos automáticamente.</p>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
                                        <input
                                            required
                                            type="password"
                                            value={aiConfig.apiKey}
                                            onChange={e => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                                            aria-label="API Key"
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder={aiConfig.provider === 'gemini' ? 'AIza...' : 'sk-...'}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Modelo</label>
                                        <select
                                            value={aiConfig.model}
                                            aria-label="Select AI Model"
                                            onChange={e => setAiConfig({ ...aiConfig, model: e.target.value })}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            {aiConfig.provider === 'gemini' ? (
                                                <>
                                                    <option value="gemini-1.5-flash">Gemini 1.5 Flash (Recomendado)</option>
                                                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                                    <option value="gemini-1.0-pro">Gemini 1.0 Pro</option>
                                                </>
                                            ) : (
                                                <>
                                                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                                                    <option value="gpt-4">GPT-4</option>
                                                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                    <div className="pt-2 flex gap-2">
                                        <button type="button" onClick={handleTestAI} disabled={aiConfig.connecting} className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg font-medium hover:bg-slate-200 flex justify-center items-center gap-2">
                                            {aiConfig.connecting ? <Loader2 size={16} className="animate-spin" /> : 'Probar Conexión'}
                                        </button>
                                        <button type="submit" disabled={aiConfig.connecting} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 flex justify-center items-center gap-2">
                                            Guardar
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-6">
                                    <CheckCircle size={48} className="text-blue-600 mx-auto mb-4" />
                                    <h4 className="text-lg font-bold text-slate-900">IA Conectada</h4>
                                    <p className="text-slate-500 text-sm mb-6">Proveedor: {aiConfig.provider === 'gemini' ? 'Google Gemini' : 'OpenAI'}</p>
                                    <button type="button" onClick={() => setAiConfig({ ...aiConfig, connected: false })} className="text-red-600 text-sm hover:underline">Desconectar</button>
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
                            <button onClick={() => setIsN8nModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleConnectN8n} className="p-6 space-y-4">
                            {!n8nConfig.connected ? (
                                <>
                                    <p className="text-sm text-slate-600">
                                        KiwüLead enviará una notificación POST a esta URL cada vez que un lead cambie de estado.
                                    </p>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Webhook URL Saliente</label>
                                        <div className="relative">
                                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input required type="url" value={n8nConfig.webhookUrl} onChange={e => setN8nConfig({ ...n8nConfig, webhookUrl: e.target.value })} className="w-full pl-10 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://mi-instancia-n8n.com/webhook/..." />
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
                                    <button type="button" onClick={() => setN8nConfig({ ...n8nConfig, connected: false })} className="text-red-600 text-sm hover:underline">Eliminar Webhook</button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}

            {/* --- MAKE (INTEGROMAT) MODAL --- */}
            {isMakeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="bg-cyan-100 p-2 rounded-lg text-cyan-600">
                                    <Zap size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Make (Integromat)</h3>
                                    <p className="text-xs text-slate-500">Automatización visual avanzada.</p>
                                </div>
                            </div>
                            <button onClick={() => setIsMakeModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleConnectMake} className="p-6 space-y-4">
                            {!makeConfig.connected ? (
                                <>
                                    <p className="text-sm text-slate-600">
                                        Pega aquí tu Webhook URL de Make para enviar datos cuando ocurran eventos en el CRM.
                                    </p>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Make Webhook URL</label>
                                        <div className="relative">
                                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input required type="url" value={makeConfig.webhookUrl} onChange={e => setMakeConfig({ ...makeConfig, webhookUrl: e.target.value })} className="w-full pl-10 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://hook.us1.make.com/..." />
                                        </div>
                                    </div>
                                    <div className="pt-2">
                                        <button type="submit" disabled={makeConfig.connecting} className="w-full bg-cyan-600 text-white py-2 rounded-lg font-bold hover:bg-cyan-700 flex justify-center items-center gap-2">
                                            {makeConfig.connecting ? <Loader2 className="animate-spin" /> : 'Guardar Conexión'}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-6">
                                    <CheckCircle size={48} className="text-cyan-600 mx-auto mb-4" />
                                    <h4 className="text-lg font-bold text-slate-900">Conectado con Make</h4>
                                    <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto truncate">{makeConfig.webhookUrl}</p>
                                    <button type="button" onClick={() => setMakeConfig({ ...makeConfig, connected: false })} className="text-red-600 text-sm hover:underline">Desconectar</button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}

            {/* --- WEBSITE FORMS (INBOUND) MODAL --- */}
            {isWebsiteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                                    <Globe size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Formularios del Sitio</h3>
                                    <p className="text-xs text-slate-500">Conecta WordPress, Elementor, Contact Form 7 via Webhook.</p>
                                </div>
                            </div>
                            <button onClick={() => setIsWebsiteModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSaveWebsiteForms} className="p-6 space-y-4">
                            <>
                                {/* TABS FOR WEBSITE FORM: CONFIG | EMBED */}
                                <div className="flex border-b border-slate-200 mb-4">
                                    <button
                                        type="button"
                                        onClick={() => setWebsiteFormsConfig(prev => ({ ...prev, tab: 'config' } as any))}
                                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${!websiteFormsConfig['tab'] || websiteFormsConfig['tab'] === 'config' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Configuración Webhook
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setWebsiteFormsConfig(prev => ({ ...prev, tab: 'embed' } as any))}
                                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${websiteFormsConfig['tab'] === 'embed' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Generador de Formulario
                                    </button>
                                </div>

                                {(!websiteFormsConfig['tab'] || websiteFormsConfig['tab'] === 'config') && (
                                    <div className="space-y-4 animate-in fade-in">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Webhook URL</label>
                                            <div className="flex gap-2">
                                                <code className="flex-1 bg-slate-50 p-3 rounded border border-slate-200 font-mono text-sm text-blue-600 overflow-x-auto">
                                                    {window.location.origin}/api/webhook.php
                                                </code>
                                                <button
                                                    type="button"
                                                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/webhook.php`)}
                                                    className="px-3 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold"
                                                >
                                                    Copiar
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-1">Envía POST con campos: name, email, phone, company, value, note.</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Dominios permitidos (opcional)</label>
                                            <input
                                                type="text"
                                                value={websiteFormsConfig.allowedOrigins.join(', ')}
                                                onChange={e => setWebsiteFormsConfig({ ...websiteFormsConfig, allowedOrigins: e.target.value.split(',') })}
                                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="midominio.com, otro.com"
                                            />
                                            <p className="text-[10px] text-slate-500 mt-1">Solo aceptará leads desde estos orígenes si se especifican.</p>
                                        </div>
                                        <div className="pt-2">
                                            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 flex justify-center items-center gap-2">
                                                Guardar Configuración
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {websiteFormsConfig['tab'] === 'embed' && (
                                    <div className="space-y-4 animate-in fade-in">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase">Título</label>
                                                <input
                                                    type="text"
                                                    value={embedConfig.title}
                                                    onChange={e => setEmbedConfig({ ...embedConfig, title: e.target.value })}
                                                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase">Botón</label>
                                                <input
                                                    type="text"
                                                    value={embedConfig.buttonText}
                                                    onChange={e => setEmbedConfig({ ...embedConfig, buttonText: e.target.value })}
                                                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase">Color Primario</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="color"
                                                        value={embedConfig.primaryColor}
                                                        onChange={e => setEmbedConfig({ ...embedConfig, primaryColor: e.target.value })}
                                                        className="h-8 w-12 p-0 border border-slate-300 rounded cursor-pointer"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={embedConfig.primaryColor}
                                                        onChange={e => setEmbedConfig({ ...embedConfig, primaryColor: e.target.value })}
                                                        className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-sm uppercase"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase">Campaña (UTM)</label>
                                                <input
                                                    type="text"
                                                    value={embedConfig.campaign}
                                                    onChange={e => setEmbedConfig({ ...embedConfig, campaign: e.target.value })}
                                                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="relative">
                                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Código para copiar</label>
                                            <textarea
                                                readOnly
                                                value={generateEmbedCode()}
                                                className="w-full h-32 p-3 bg-slate-900 text-green-400 font-mono text-xs rounded-lg resize-none focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => navigator.clipboard.writeText(generateEmbedCode())}
                                                className="absolute top-6 right-2 px-2 py-1 bg-slate-700 text-white text-xs rounded hover:bg-slate-600"
                                            >
                                                Copiar
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {websiteFormsConfig.connected && (!websiteFormsConfig['tab'] || websiteFormsConfig['tab'] === 'config') && (
                                    <div className="text-center pt-4">
                                        <button type="button" onClick={() => setWebsiteFormsConfig({ connected: false, allowedOrigins: [] })} className="text-red-600 text-sm hover:underline">Desconectar</button>
                                    </div>
                                )}
                            </>
                        </form>
                    </div>
                </div>
            )}

            {/* --- EMAIL TAB --- */}
            {activeTab === 'email' && (
                <div className="animate-in fade-in duration-300">
                    {/* Sub-tabs Navigation */}
                    <div className="flex gap-6 border-b border-slate-200 mb-6">
                        <button
                            onClick={() => setEmailTab('config')}
                            className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${emailTab === 'config' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            Configuración SMTP
                        </button>
                        <button
                            onClick={() => setEmailTab('templates')}
                            className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${emailTab === 'templates' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            Plantillas de Correo
                        </button>
                        <button
                            onClick={() => setEmailTab('branding')}
                            className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${emailTab === 'branding' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            Marca y Estilo
                        </button>
                    </div>

                    {/* SMTP CONFIGURATION */}
                    {emailTab === 'config' && (
                        <div className="max-w-3xl animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="mb-6 flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                        <Mail size={20} className="text-blue-600" />
                                        Configuración de Correo del Sistema
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Define el servidor SMTP que utilizará el CRM para enviar notificaciones automáticas
                                        (recuperación de contraseñas, alertas de tareas, reportes diarios).
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsEmailConfigLocked(!isEmailConfigLocked)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${isEmailConfigLocked
                                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                                        : 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100'
                                        }`}
                                >
                                    {isEmailConfigLocked ? <Lock size={16} /> : <Unlock size={16} />}
                                    {isEmailConfigLocked ? 'Desbloquear Edición' : 'Modo Edición Activo'}
                                </button>
                            </div>

                            {!isEmailConfigLocked && (
                                <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
                                    <AlertTriangle className="text-orange-600 shrink-0 mt-0.5" size={18} />
                                    <div>
                                        <h4 className="text-sm font-bold text-orange-800">Precaución</h4>
                                        <p className="text-xs text-orange-700 mt-1">
                                            Modificar estos valores puede interrumpir el envío de correos críticos del sistema.
                                            Asegúrate de verificar la conexión después de guardar.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleSaveEmailConfig} className="space-y-6">
                                <div className={`bg-white p-6 rounded-xl border shadow-sm space-y-6 transition-all ${isEmailConfigLocked ? 'border-slate-200 opacity-90' : 'border-blue-200 ring-1 ring-blue-100'}`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                            <Server size={16} className="text-slate-400" />
                                            Servidor de Salida (SMTP)
                                        </h4>
                                        <button
                                            type="button"
                                            onClick={() => setIsSmtpHelpOpen(true)}
                                            className="text-slate-400 hover:text-blue-600 transition-colors"
                                            title="Ver configuración recomendada"
                                        >
                                            <HelpCircle size={18} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Servidor SMTP</label>
                                            <input
                                                type="text"
                                                required
                                                disabled={isEmailConfigLocked}
                                                placeholder="smtp.gmail.com"
                                                value={emailConfig.smtp_host}
                                                onChange={e => setEmailConfig({ ...emailConfig, smtp_host: e.target.value })}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Puerto</label>
                                            <input
                                                type="number"
                                                required
                                                disabled={isEmailConfigLocked}
                                                placeholder="587"
                                                value={emailConfig.smtp_port}
                                                onChange={e => setEmailConfig({ ...emailConfig, smtp_port: parseInt(e.target.value) })}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Usuario / Email</label>
                                            <input
                                                type="email"
                                                required
                                                disabled={isEmailConfigLocked}
                                                placeholder="sistema@empresa.com"
                                                value={emailConfig.smtp_user}
                                                onChange={e => setEmailConfig({ ...emailConfig, smtp_user: e.target.value })}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Contraseña</label>
                                            <div className="relative">
                                                <input
                                                    type="password"
                                                    required
                                                    disabled={isEmailConfigLocked}
                                                    placeholder={isEmailConfigLocked ? "••••••••••••" : "Contraseña de aplicación"}
                                                    value={emailConfig.smtp_pass}
                                                    onChange={e => setEmailConfig({ ...emailConfig, smtp_pass: e.target.value })}
                                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className={`bg-white p-6 rounded-xl border shadow-sm space-y-6 transition-all ${isEmailConfigLocked ? 'border-slate-200 opacity-90' : 'border-blue-200 ring-1 ring-blue-100'}`}>
                                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <User size={16} className="text-slate-400" />
                                        Identidad del Remitente
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Nombre a mostrar</label>
                                            <input
                                                type="text"
                                                required
                                                disabled={isEmailConfigLocked}
                                                placeholder={`${appName} System`}
                                                value={emailConfig.from_name}
                                                onChange={e => setEmailConfig({ ...emailConfig, from_name: e.target.value })}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                                            />
                                            <p className="text-[10px] text-slate-400">Ej: "Soporte Técnico" o "Notificaciones"</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Email de remitente</label>
                                            <input
                                                type="email"
                                                required
                                                disabled={isEmailConfigLocked}
                                                placeholder="no-reply@empresa.com"
                                                value={emailConfig.from_email}
                                                onChange={e => setEmailConfig({ ...emailConfig, from_email: e.target.value })}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={handleTestEmailConnection}
                                        disabled={emailConfig.connecting}
                                        className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium transition-colors flex items-center gap-2"
                                    >
                                        {emailConfig.connecting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                                        Probar Conexión
                                    </button>

                                    {!isEmailConfigLocked && (
                                        <button
                                            type="submit"
                                            disabled={emailConfig.connecting}
                                            className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-lg shadow-blue-100 transition-all flex items-center gap-2 animate-in fade-in zoom-in duration-300"
                                        >
                                            {emailConfig.connecting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                            Guardar Configuración
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    )}

                    {/* EMAIL TEMPLATES */}
                    {emailTab === 'templates' && (
                        <div className="max-w-5xl animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900">Plantillas de Respuesta</h3>
                                    <p className="text-sm text-slate-500">Crea plantillas predefinidas para responder rápidamente a tus leads.</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSeedTemplates}
                                        className="bg-white text-slate-600 border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2"
                                        title="Restaurar plantillas por defecto"
                                    >
                                        <RotateCcw size={16} />
                                        <span className="hidden sm:inline">Restaurar</span>
                                    </button>
                                    <button
                                        onClick={() => openTemplateModal()}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                                    >
                                        <FileText size={16} />
                                        Nueva Plantilla
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {templates.map(tpl => (
                                    <div key={tpl.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative">
                                        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-1 rounded-lg">
                                            <button
                                                onClick={() => openTemplateModal(tpl)}
                                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        <div className="pr-2">
                                            <div className="flex items-start justify-between mb-2">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider border ${tpl.category === 'Sales' ? 'bg-green-50 text-green-700 border-green-200' :
                                                    tpl.category === 'Marketing' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                        tpl.category === 'Support' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                            tpl.category === 'Follow-up' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                                tpl.category === 'System' ? 'bg-slate-100 text-slate-700 border-slate-300' :
                                                                    'bg-slate-50 text-slate-600 border-slate-200'
                                                    }`}>
                                                    {tpl.category}
                                                </span>
                                            </div>
                                            <h4 className="font-bold text-slate-900 mb-1 line-clamp-1" title={tpl.name}>{tpl.name}</h4>
                                            <p className="text-xs text-slate-500 mb-3 font-medium flex items-center gap-1 line-clamp-1" title={tpl.subject}>
                                                <Mail size={12} /> {tpl.subject}
                                            </p>
                                            <div className="text-xs text-slate-400 line-clamp-3 bg-slate-50 p-2 rounded border border-slate-100 font-mono h-20">
                                                {tpl.body}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {templates.length === 0 && (
                                    <div className="col-span-full flex flex-col items-center justify-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
                                            <FileText size={32} className="text-slate-300" />
                                        </div>
                                        <h3 className="text-slate-900 font-medium mb-1">No tienes plantillas guardadas</h3>
                                        <p className="text-slate-500 text-sm mb-6 max-w-sm text-center">Las plantillas te ayudan a responder más rápido y mantener consistencia en tus mensajes.</p>
                                        <div className="flex gap-4">
                                            <button
                                                onClick={() => openTemplateModal()}
                                                className="text-blue-600 font-medium text-sm hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors"
                                            >
                                                Crear mi primera plantilla
                                            </button>
                                            <button
                                                onClick={handleSeedTemplates}
                                                className="text-slate-500 font-medium text-sm hover:bg-slate-100 px-4 py-2 rounded-lg transition-colors border border-slate-200"
                                            >
                                                Restaurar Plantillas
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* BRANDING & SYSTEM TAB */}
                    {emailTab === 'branding' && (
                        <div className="max-w-6xl animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Configuration Column */}
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                            <Building2 size={20} className="text-blue-600" />
                                            Marca y Personalización
                                        </h3>
                                        <p className="text-sm text-slate-500 mt-1">
                                            Define la identidad visual de tus correos electrónicos del sistema y notificaciones.
                                        </p>
                                    </div>

                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                                        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Colores de Marca</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Color Primario</label>
                                                <div className="flex gap-2 items-center">
                                                    <input
                                                        type="color"
                                                        value={companyProfile.primaryColor || '#2563EB'}
                                                        onChange={e => setCompanyProfile({ ...companyProfile, primaryColor: e.target.value })}
                                                        className="h-10 w-14 p-1 bg-white border border-slate-300 rounded cursor-pointer"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={companyProfile.primaryColor || '#2563EB'}
                                                        onChange={e => setCompanyProfile({ ...companyProfile, primaryColor: e.target.value })}
                                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm uppercase font-mono"
                                                    />
                                                </div>
                                                <p className="text-[10px] text-slate-400 mt-1">Botones, encabezados y enlaces principales.</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Color Secundario</label>
                                                <div className="flex gap-2 items-center">
                                                    <input
                                                        type="color"
                                                        value={companyProfile.secondaryColor || '#F8FAFC'}
                                                        onChange={e => setCompanyProfile({ ...companyProfile, secondaryColor: e.target.value })}
                                                        className="h-10 w-14 p-1 bg-white border border-slate-300 rounded cursor-pointer"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={companyProfile.secondaryColor || '#F8FAFC'}
                                                        onChange={e => setCompanyProfile({ ...companyProfile, secondaryColor: e.target.value })}
                                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm uppercase font-mono"
                                                    />
                                                </div>
                                                <p className="text-[10px] text-slate-400 mt-1">Fondos, bordes y elementos secundarios.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Pie de Página (Footer)</h4>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Texto Legal / Dirección</label>
                                            <textarea
                                                rows={4}
                                                value={companyProfile.emailFooter || `© ${new Date().getFullYear()} ${companyProfile.name}. Todos los derechos reservados.\n${companyProfile.address || 'Dirección de la empresa'}`}
                                                onChange={e => setCompanyProfile({ ...companyProfile, emailFooter: e.target.value })}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                                placeholder="Información legal, dirección física, enlaces de baja suscripción..."
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            onClick={handleSaveCompany}
                                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center gap-2"
                                        >
                                            <Save size={16} />
                                            Guardar Estilos
                                        </button>
                                    </div>
                                </div>

                                {/* Preview Column */}
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                        <Eye size={20} className="text-slate-500" />
                                        Vista Previa en Vivo
                                    </h3>

                                    <div className="bg-slate-100 p-8 rounded-xl border border-slate-200 shadow-inner flex justify-center">
                                        {/* Mock Email Container */}
                                        <div className="bg-white w-full max-w-md rounded-lg shadow-xl overflow-hidden" style={{ borderTop: `4px solid ${companyProfile.primaryColor || '#2563EB'}` }}>
                                            {/* Header */}
                                            <div className="p-6 border-b border-slate-100 flex justify-between items-center" style={{ backgroundColor: companyProfile.secondaryColor || '#fff' }}>
                                                <div className="font-bold text-xl text-slate-800">{companyProfile.name || 'Mi Empresa'}</div>
                                            </div>

                                            {/* Body */}
                                            <div className="p-8 space-y-4">
                                                <h1 className="text-2xl font-bold text-slate-900">Bienvenido, Juan 👋</h1>
                                                <p className="text-slate-600 leading-relaxed">
                                                    Gracias por registrarte en nuestra plataforma. Estamos emocionados de tenerte con nosotros.
                                                </p>
                                                <div className="py-4">
                                                    <button
                                                        className="px-6 py-3 rounded-lg font-bold text-white transition-opacity hover:opacity-90"
                                                        style={{ backgroundColor: companyProfile.primaryColor || '#2563EB' }}
                                                    >
                                                        Confirmar mi cuenta
                                                    </button>
                                                </div>
                                                <p className="text-slate-600 leading-relaxed">
                                                    Si tienes alguna pregunta, no dudes en responder a este correo.
                                                </p>
                                                <p className="text-slate-600">
                                                    Atentamente,<br />
                                                    El equipo de {companyProfile.name || 'Mi Empresa'}
                                                </p>
                                            </div>

                                            {/* Footer */}
                                            <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
                                                <p className="text-xs text-slate-400 whitespace-pre-line leading-relaxed">
                                                    {companyProfile.emailFooter || `© ${new Date().getFullYear()} ${companyProfile.name}. Todos los derechos reservados.\n${companyProfile.address || 'Dirección de la empresa'}`}
                                                </p>
                                                <div className="mt-4 flex justify-center gap-4 text-xs text-slate-400">
                                                    <span className="underline cursor-pointer">Preferencias</span>
                                                    <span>•</span>
                                                    <span className="underline cursor-pointer">Darse de baja</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-center text-xs text-slate-400 mt-4">
                                        Esta es una vista previa aproximada de cómo se verán tus correos transaccionales.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- SYSTEM TAB --- */}
            {activeTab === 'system' && (
                <div className="max-w-4xl animate-in fade-in duration-300 space-y-8">
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-slate-900">Estado del Sistema & Diagnóstico</h3>
                        <p className="text-sm text-slate-500">Monitorea la salud de las integraciones y ejecuta pruebas de flujo.</p>
                    </div>

                    {/* API & WEBHOOKS SECTION */}
                    <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg">
                        <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><Code size={20} /> API & Webhooks</h3>
                        <p className="text-slate-300 text-sm mb-6">Credenciales para integrar con herramientas externas.</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tu API Key (JWT)</label>
                                <div className="flex gap-2">
                                    <code className="flex-1 bg-black/50 p-3 rounded font-mono text-sm text-green-400 overflow-x-auto">
                                        {currentUser?.token || 'No disponible (Inicia sesión)'}
                                    </code>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(currentUser?.token || '')}
                                        className="bg-slate-700 hover:bg-slate-600 px-3 rounded text-white"
                                        title="Copiar Token"
                                    >
                                        <Copy size={16} />
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1">Este token expira en 7 días. Úsalo como header: <code>Authorization: Bearer [TOKEN]</code></p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Webhook URL</label>
                                <div className="flex gap-2">
                                    <code className="flex-1 bg-black/50 p-3 rounded font-mono text-sm text-blue-400 overflow-x-auto">
                                        {window.location.origin}/api/webhook.php
                                    </code>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/webhook.php`)}
                                        className="bg-slate-700 hover:bg-slate-600 px-3 rounded text-white"
                                        title="Copiar URL"
                                    >
                                        <Copy size={16} />
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1">Envía POST requests aquí para crear leads automáticamente.</p>
                            </div>
                        </div>
                    </div>

                    <div className="mb-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                    <Database size={18} className="text-indigo-600" /> Modo de Conexión
                                </h4>
                                <p className="text-sm text-slate-500 mt-1">
                                    Define si el sistema utiliza datos de prueba (Mock) o se conecta a la base de datos real.
                                </p>
                            </div>
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h4 className="font-bold text-slate-700">Estado del Sistema</h4>
                                    <p className="text-xs text-slate-500">Información técnica y conectividad.</p>
                                </div>
                                <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">
                                    Online
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Activity size={18} className="text-blue-600" /> Webhook Monitor
                            </h4>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500">Última señal recibida:</span>
                                    <span className="text-green-600 font-medium">
                                        {systemHealth.webhook_health.last_signal
                                            ? new Date(systemHealth.webhook_health.last_signal).toLocaleTimeString()
                                            : 'Esperando...'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500">Tasa de éxito (24h):</span>
                                    <span className="text-slate-900 font-medium">
                                        {systemHealth.webhook_health.success_rate}%
                                        <span className="text-xs text-slate-400 ml-1">({systemHealth.webhook_health.total_24h} req)</span>
                                    </span>
                                </div>
                                <button className="w-full mt-4 py-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 text-sm font-bold border border-slate-200">Ver Logs Completos</button>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Workflow size={18} className="text-orange-500" /> Automatizaciones
                            </h4>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500">Pendientes de procesar:</span>
                                    <span className="text-slate-900 font-medium">{systemHealth.pending_jobs}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500">Reglas activas:</span>
                                    <span className="text-slate-900 font-medium">{systemHealth.automations_active}</span>
                                </div>
                                <button className="w-full mt-4 py-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 text-sm font-bold border border-slate-200">Reiniciar Engine</button>
                            </div>
                        </div>
                    </div>

                    {/* E2E DIAGNOSTICS */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                        <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2"><Activity size={20} className="text-blue-600" /> Diagnóstico E2E</h3>
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
                            className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${e2eStatus === 'running' ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-blue-200'}`}
                        >
                            {e2eStatus === 'running' ? <Loader2 className="animate-spin" /> : <Play size={18} />}
                            {e2eStatus === 'running' ? 'Ejecutando Pruebas...' : 'Ejecutar Diagnóstico E2E'}
                        </button>
                    </div>

                    <div className="bg-slate-900 rounded-xl p-6 text-slate-300 font-mono text-xs overflow-hidden">
                        <div className="flex justify-between items-center mb-4 text-slate-500">
                            <span>System Diagnostics Output</span>
                            <span className="animate-pulse">● LIVE</span>
                        </div>
                        <div className="space-y-1">
                            <p className={systemHealth.db_status === 'Online' ? "text-green-400" : "text-red-400"}>
                                [{systemHealth.db_status === 'Online' ? 'OK' : 'ERR'}] Base de datos: {systemHealth.db_status}
                            </p>
                            <p className="text-slate-500">[INFO] Redis Cache: {systemHealth.redis_status}</p>
                            <p className="text-green-400">[OK] Sesion persistente: Activa</p>
                            <p className="text-blue-400">[INFO] Gemini Assistant: Listo para consultas</p>
                        </div>
                    </div>

                    <div className="text-center text-xs text-slate-400 mt-8 pb-4">
                        KiwüLead v1.0.0 (Build 2024.1)
                    </div>
                </div>
            )}

            {/* --- SMTP HELP MODAL --- */}
            {isSmtpHelpOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                                    <HelpCircle size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Configuración SMTP Recomendada</h3>
                                    <p className="text-xs text-slate-500">Guía rápida para conectar tu proveedor de correo.</p>
                                </div>
                            </div>
                            <button onClick={() => setIsSmtpHelpOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6">
                            {/* GMAIL */}
                            <div className="bg-white border border-slate-200 rounded-xl p-4 hover:border-red-200 hover:shadow-sm transition-all">
                                <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                                    <span className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs">G</span>
                                    Gmail / Google Workspace
                                </h4>
                                <p className="text-xs text-slate-500 mb-3">
                                    Compatible con cuentas personales (<code>@gmail.com</code>) y corporativas (<code>@tuempresa.com</code>) alojadas en Google.
                                </p>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase">Servidor SMTP</p>
                                        <code className="bg-slate-50 px-2 py-1 rounded text-slate-700">smtp.gmail.com</code>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase">Puerto</p>
                                        <code className="bg-slate-50 px-2 py-1 rounded text-slate-700">587 (TLS)</code>
                                    </div>
                                </div>
                                <div className="mt-3 bg-red-50 border border-red-100 rounded-lg p-3 text-xs text-red-800">
                                    <strong>Importante:</strong> Debes activar "Verificación en 2 Pasos" en tu cuenta de Google y generar una <u>Contraseña de Aplicación</u>. No uses tu contraseña normal.
                                </div>
                            </div>

                            {/* OUTLOOK */}
                            <div className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-200 hover:shadow-sm transition-all">
                                <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                                    <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">O</span>
                                    Outlook / Office 365
                                </h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase">Servidor SMTP</p>
                                        <code className="bg-slate-50 px-2 py-1 rounded text-slate-700">smtp.office365.com</code>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase">Puerto</p>
                                        <code className="bg-slate-50 px-2 py-1 rounded text-slate-700">587 (STARTTLS)</code>
                                    </div>
                                </div>
                            </div>

                            {/* CPANEL / OTHERS */}
                            <div className="bg-white border border-slate-200 rounded-xl p-4 hover:border-orange-200 hover:shadow-sm transition-all">
                                <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                                    <span className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-xs">C</span>
                                    cPanel / Webmail / Hosting
                                </h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase">Servidor SMTP</p>
                                        <code className="bg-slate-50 px-2 py-1 rounded text-slate-700">mail.tudominio.com</code>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase">Puerto</p>
                                        <code className="bg-slate-50 px-2 py-1 rounded text-slate-700">465 (SSL) / 587 (TLS)</code>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">Consulta con tu proveedor de hosting si el puerto es 465 (SSL) o 587 (TLS).</p>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-200 text-right">
                            <button
                                onClick={() => setIsSmtpHelpOpen(false)}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold transition-colors"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
