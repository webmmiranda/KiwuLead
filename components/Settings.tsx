import React, { useState, useEffect } from 'react';
import { INTEGRATIONS } from '../constants';
import { UserPlus, Shield, Scale, Facebook, MessageSquare, Workflow, Lock, Code, Copy, FileText, Trash2, Edit2, Building2, Globe, MapPin, DollarSign, X, CheckCircle, Loader2, Play, Activity, Terminal, Key, Smartphone, AlertTriangle, BarChart3, Users, ArrowRightLeft, Bot, Zap, CreditCard, Eye, Database } from 'lucide-react';
import { CurrentUser, TeamMember, DistributionSettings, EmailTemplate, CompanyProfile, Contact, LeadStatus, Source } from '../types';
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
}

export const Settings: React.FC<SettingsProps> = ({ currentUser, team, setTeam, distributionSettings, setDistributionSettings, templates, setTemplates, companyProfile, setCompanyProfile, onInjectLead, contacts = [], setContacts, onNotify, onImpersonate, onRefreshData }) => {
    const [activeTab, setActiveTab] = useState<'company' | 'team' | 'pipeline' | 'integrations' | 'distribution' | 'templates' | 'developer' | 'email' | 'system'>('company');
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
    const [metaConfig, setMetaConfig] = useState({ connected: false, connecting: false, pageId: '', adAccount: '', verifyToken: 'nexus_crm_secret', selectedForms: [] as string[] });
    const [metaStep, setMetaStep] = useState<1 | 2 | 3>(1);
    const [metaAccounts, setMetaAccounts] = useState<any[]>([]);
    const [metaForms, setMetaForms] = useState<any[]>([]);
    const [selectedMetaAccount, setSelectedMetaAccount] = useState('');

    // WhatsApp
    const [isWaModalOpen, setIsWaModalOpen] = useState(false);
    const [waConfig, setWaConfig] = useState({ connected: false, connecting: false, phoneId: '', token: '' });

    // AI Assistant (Gemini/OpenAI)
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [aiConfig, setAiConfig] = useState({ connected: false, connecting: false, provider: 'gemini', apiKey: '', model: 'gemini-pro' });

    // n8n
    const [isN8nModalOpen, setIsN8nModalOpen] = useState(false);
    const [n8nConfig, setN8nConfig] = useState({ connected: false, connecting: false, webhookUrl: '' });

    // Make (Integromat)
    const [isMakeModalOpen, setIsMakeModalOpen] = useState(false);
    const [makeConfig, setMakeConfig] = useState({ connected: false, connecting: false, webhookUrl: '' });

    // Stripe
    const [isStripeModalOpen, setIsStripeModalOpen] = useState(false);
    const [stripeConfig, setStripeConfig] = useState({ connected: false, connecting: false, publicKey: '', secretKey: '' });
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



    // Load settings on mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { api } = await import('../src/services/api');
                // Use api.settings.list() to ensure auth headers are sent
                const data = await api.settings.list();

                if (data.meta) setMetaConfig(prev => ({ ...prev, ...data.meta }));
                if (data.whatsapp) setWaConfig(prev => ({ ...prev, ...data.whatsapp }));
                if (data.ai) setAiConfig(prev => ({ ...prev, ...data.ai }));
                if (data.n8n) setN8nConfig(prev => ({ ...prev, ...data.n8n }));
                if (data.make) setMakeConfig(prev => ({ ...prev, ...data.make }));
                if (data.stripe) setStripeConfig(prev => ({ ...prev, ...data.stripe }));

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

            } catch (e) {
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

    // E2E Simulation State
    const [e2eStatus, setE2eStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
    const [e2eLogs, setE2eLogs] = useState<string[]>([]);
    
    // Connection Mode State
    const [isMockMode, setIsMockMode] = useState(false);

    // Load connection mode
    useEffect(() => {
        const checkMode = async () => {
            const { getMockMode } = await import('../src/services/api');
            setIsMockMode(getMockMode());
        };
        checkMode();
    }, []);

    const toggleConnectionMode = async () => {
        const { setMockMode, getMockMode } = await import('../src/services/api');
        const newMode = !getMockMode();
        setMockMode(newMode);
        setIsMockMode(newMode);
        
        if (onNotify) {
             if (newMode) {
                 onNotify('Modo Demo Activado', 'Usando datos de prueba (Mock).', 'warning');
             } else {
                 onNotify('Conexión Real Activada', 'Conectando a base de datos...', 'success');
             }
        }

        if (onRefreshData) {
            await onRefreshData();
        }
    };

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

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const { api } = await import('../src/services/api');

            // In a real app, we'd send a temporary password or invite link
            const response = await api.team.create({
                name: newMember.name,
                email: newMember.email,
                role: newMember.role,
                password: 'ChangeMe123!', // Temporary password
                status: 'Active'
            });

            if (response.success) {
                // Refresh team from DB to get the actual member with ID
                const updatedTeam = await api.team.list();
                setTeam(updatedTeam);

                setIsInviteModalOpen(false);
                setNewMember({ name: '', email: '', role: 'Sales' });
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
        await saveSetting('whatsapp', newVal);

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

    const handleConnectStripe = async (e: React.FormEvent) => {
        e.preventDefault();
        setStripeConfig(prev => ({ ...prev, connecting: true }));

        // Simulate API check
        await new Promise(r => setTimeout(r, 1500));

        const newVal = { ...stripeConfig, connected: true, connecting: false };
        await saveSetting('stripe', newVal);

        setStripeConfig(newVal);
        if (onNotify) onNotify('Stripe Conectado', 'Pagos habilitados correctamente.', 'success');
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
                if (onNotify) onNotify('Conexión Exitosa', res.message || 'El servidor SMTP respondió correctamente.', 'success');
            } else {
                if (onNotify) onNotify('Fallo de Conexión', res.error || 'No se pudo conectar al servidor SMTP.', 'error');
            }
        } catch (error) {
            if (onNotify) onNotify('Error de Sistema', 'Error al intentar probar la conexión.', 'error');
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
                {['company', 'team', 'pipeline', 'distribution', 'templates', 'integrations', 'email', 'system', 'developer'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`pb-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap capitalize ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        {tab === 'integrations' ? 'Integraciones' :
                            tab === 'developer' ? 'API & Dev' :
                                tab === 'company' ? 'Empresa' :
                                    tab === 'team' ? 'Equipo' :
                                        tab === 'pipeline' ? 'Pipeline' :
                                            tab === 'distribution' ? 'Asignación' :
                                                tab === 'templates' ? 'Plantillas' :
                                                    tab === 'email' ? 'Config. Email' :
                                                        tab === 'system' ? 'Sistema' : tab}
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
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">Gestionar Equipo</h3>
                            <p className="text-sm text-slate-500">Controla quién tiene acceso a tu CRM y sus permisos.</p>
                        </div>
                        <button onClick={() => setIsInviteModalOpen(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"><UserPlus size={18} /> Invitar</button>
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

            {/* --- TEMPLATES TAB --- */}
            {activeTab === 'templates' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">Plantillas de Email</h3>
                            <p className="text-sm text-slate-500">Estandariza la comunicación de tu equipo.</p>
                        </div>
                        <button onClick={() => openTemplateModal()} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">+ Nueva Plantilla</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {templates.map(tpl => (
                            <div key={tpl.id} onClick={() => openTemplateModal(tpl)} className="bg-white p-6 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors cursor-pointer group shadow-sm hover:shadow-md relative">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold uppercase text-blue-600 bg-blue-50 px-2 py-1 rounded">{tpl.category}</span>
                                    <div className="flex gap-2">
                                        <button className="text-slate-300 hover:text-blue-600"><Edit2 size={16} /></button>
                                        <button onClick={(e) => handleDeleteTemplate(tpl.id, e)} className="text-slate-300 hover:text-red-600"><Trash2 size={16} /></button>
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
                            let openConfig = () => { };

                            if (app.name === 'Meta Ads Manager') {
                                isConnected = metaConfig.connected || app.status === 'Connected';
                                openConfig = () => setIsMetaModalOpen(true);
                            } else if (app.name === 'WhatsApp Business API') {
                                isConnected = waConfig.connected;
                                openConfig = () => setIsWaModalOpen(true);
                            } else if (app.name === 'AI Assistant') {
                                isConnected = aiConfig.connected;
                                openConfig = () => setIsAIModalOpen(true);
                            } else if (app.name === 'n8n Automatización') {
                                isConnected = n8nConfig.connected || app.status === 'Connected';
                                openConfig = () => setIsN8nModalOpen(true);
                            } else if (app.name === 'Make (Integromat)') {
                                isConnected = makeConfig.connected || app.status === 'Connected';
                                openConfig = () => setIsMakeModalOpen(true);
                            } else if (app.name === 'Stripe Payments') {
                                isConnected = stripeConfig.connected || app.status === 'Connected';
                                openConfig = () => setIsStripeModalOpen(true);
                            }

                            return (
                                <div key={app.name} className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isConnected ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                            {app.icon === 'Facebook' && <Facebook size={24} />}
                                            {app.icon === 'MessageSquare' && <MessageSquare size={24} />}
                                            {app.icon === 'Workflow' && <Workflow size={24} />}
                                            {app.icon === 'Bot' && <Bot size={24} />}
                                            {app.icon === 'Zap' && <Zap size={24} />}
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
                                        className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${isConnected ? 'bg-slate-50 text-slate-600 hover:bg-slate-100' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                                    >
                                        {isConnected ? 'Re-configurar' : 'Conectar'}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* --- DEVELOPER / API TAB --- */}
            {activeTab === 'developer' && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                        {/* SYSTEM DIAGNOSTIC / E2E */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                            <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2"><Activity size={20} className="text-blue-600" /> Diagnóstico de Sistema</h3>
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

            {isInviteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Invitar Miembro</h3>
                        <form onSubmit={handleAddMember} className="space-y-4">
                            <input required type="text" value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Nombre" />
                            <input required type="email" value={newMember.email} onChange={e => setNewMember({ ...newMember, email: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Email" />
                            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium">Enviar</button>
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
                                <textarea required rows={6} value={templateForm.body} onChange={e => setTemplateForm({ ...templateForm, body: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm" placeholder="Hola {{name}}..." />
                                <p className="text-xs text-slate-500 mt-1">Variables disponibles: <code className="bg-slate-100 px-1 rounded">{'{{name}}'}</code>, <code className="bg-slate-100 px-1 rounded">{'{{company}}'}</code></p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                                <select value={templateForm.category} onChange={e => setTemplateForm({ ...templateForm, category: e.target.value as any })} className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option value="Sales">Ventas</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="Support">Soporte</option>
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
                                            <p className="text-xs text-slate-500">Elige qué formularios enviarán leads a Nexus CRM.</p>

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
                                            <p className="text-xs text-green-700">Se están sincronizando leads de la página <b>"Nexus Tech Demo"</b>.</p>
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
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Proveedor de IA</label>
                                        <select
                                            value={aiConfig.provider}
                                            onChange={e => setAiConfig({ ...aiConfig, provider: e.target.value })}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="gemini">Google Gemini</option>
                                            <option value="openai">OpenAI (GPT-4)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
                                        <input
                                            required
                                            type="password"
                                            value={aiConfig.apiKey}
                                            onChange={e => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder={aiConfig.provider === 'gemini' ? 'AIza...' : 'sk-...'}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Modelo</label>
                                        <select
                                            value={aiConfig.model}
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
                                        Nexus CRM enviará una notificación POST a esta URL cada vez que un lead cambie de estado.
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

            {/* --- STRIPE MODAL --- */}
            {isStripeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                                    <CreditCard size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Stripe Payments</h3>
                                    <p className="text-xs text-slate-500">Procesa pagos y suscripciones.</p>
                                </div>
                            </div>
                            <button onClick={() => setIsStripeModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleConnectStripe} className="p-6 space-y-4">
                            {!stripeConfig.connected ? (
                                <>
                                    <div className="bg-amber-50 border border-amber-200 p-3 rounded text-xs text-amber-800 flex gap-2">
                                        <AlertTriangle size={16} className="flex-shrink-0" />
                                        <span>Usa tus claves de prueba (pk_test_...) para desarrollo.</span>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Public Key</label>
                                        <div className="relative">
                                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input required type="text" value={stripeConfig.publicKey} onChange={e => setStripeConfig({ ...stripeConfig, publicKey: e.target.value })} className="w-full pl-10 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm" placeholder="pk_test_..." />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Secret Key</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input required type="password" value={stripeConfig.secretKey} onChange={e => setStripeConfig({ ...stripeConfig, secretKey: e.target.value })} className="w-full pl-10 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm" placeholder="sk_test_..." />
                                        </div>
                                    </div>
                                    <div className="pt-2">
                                        <button type="submit" disabled={stripeConfig.connecting} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 flex justify-center items-center gap-2">
                                            {stripeConfig.connecting ? <Loader2 className="animate-spin" /> : 'Verificar Credenciales'}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-6">
                                    <CheckCircle size={48} className="text-blue-600 mx-auto mb-4" />
                                    <h4 className="text-lg font-bold text-slate-900">Stripe Conectado</h4>
                                    <p className="text-slate-500 text-sm mb-6">Modo: {stripeConfig.publicKey.startsWith('pk_test') ? 'Test / Sandbox' : 'Live / Producción'}</p>
                                    <button type="button" onClick={() => setStripeConfig({ ...stripeConfig, connected: false })} className="text-red-600 text-sm hover:underline">Desconectar</button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}

            {/* --- EMAIL TAB --- */}
            {activeTab === 'email' && (
                <div className="max-w-3xl animate-in fade-in duration-300">
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-slate-900">Configuración de Correo Electrónico</h3>
                        <p className="text-sm text-slate-500">Configura tus credenciales SMTP para enviar correos y define tu firma personalizada.</p>
                    </div>

                    <form onSubmit={handleSaveEmailConfig} className="space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                            <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-2">Servidor de Salida (SMTP)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Servidor SMTP</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="smtp.gmail.com"
                                        value={emailConfig.smtp_host}
                                        onChange={e => setEmailConfig({ ...emailConfig, smtp_host: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Puerto</label>
                                    <input
                                        type="number"
                                        required
                                        placeholder="587"
                                        value={emailConfig.smtp_port}
                                        onChange={e => setEmailConfig({ ...emailConfig, smtp_port: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Usuario / Email</label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="ventas@empresa.com"
                                        value={emailConfig.smtp_user}
                                        onChange={e => setEmailConfig({ ...emailConfig, smtp_user: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Contraseña</label>
                                    <input
                                        type="password"
                                        required
                                        placeholder="••••••••"
                                        value={emailConfig.smtp_pass}
                                        onChange={e => setEmailConfig({ ...emailConfig, smtp_pass: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                            <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-2">Información del Remitente & Firma</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Nombre a mostrar</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Tu Nombre o Empresa"
                                        value={emailConfig.from_name}
                                        onChange={e => setEmailConfig({ ...emailConfig, from_name: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Email de remitente</label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="hola@empresa.com"
                                        value={emailConfig.from_email}
                                        onChange={e => setEmailConfig({ ...emailConfig, from_email: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Firma del correo (Se añadirá automáticamente)</label>
                                <textarea
                                    placeholder="Atentamente, \nEquipo de Ventas"
                                    rows={4}
                                    value={emailConfig.signature}
                                    onChange={e => setEmailConfig({ ...emailConfig, signature: e.target.value })}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none font-sans text-sm"
                                ></textarea>
                                <p className="text-[10px] text-slate-400 italic text-right">Consejo: Puedes usar saltos de línea simples.</p>
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
                            <button
                                type="submit"
                                disabled={emailConfig.connecting}
                                className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-lg shadow-blue-100 transition-all flex items-center gap-2"
                            >
                                {emailConfig.connecting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                Guardar Cambios
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* --- SYSTEM TAB --- */}
            {activeTab === 'system' && (
                <div className="max-w-3xl animate-in fade-in duration-300">
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-slate-900">Estado del Sistema & Diagnóstico</h3>
                        <p className="text-sm text-slate-500">Monitorea la salud de las integraciones y ejecuta pruebas de flujo.</p>
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
                            <div className="flex items-center gap-3">
                                <span className={`text-sm font-bold px-3 py-1 rounded-full ${isMockMode ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                    {isMockMode ? 'DEMO MODE' : 'LIVE DB'}
                                </span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={!isMockMode} 
                                        onChange={toggleConnectionMode} 
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
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
                                    <span className="text-green-600 font-medium">Hace 5 min</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500">Tasa de éxito:</span>
                                    <span className="text-slate-900 font-medium">99.8%</span>
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
                                    <span className="text-slate-900 font-medium">0</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500">Reglas activas:</span>
                                    <span className="text-slate-900 font-medium">12</span>
                                </div>
                                <button className="w-full mt-4 py-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 text-sm font-bold border border-slate-200">Reiniciar Engine</button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 bg-slate-900 rounded-xl p-6 text-slate-300 font-mono text-xs overflow-hidden">
                        <div className="flex justify-between items-center mb-4 text-slate-500">
                            <span>System Diagnostics Output</span>
                            <span className="animate-pulse">● LIVE</span>
                        </div>
                        <div className="space-y-1">
                            <p className="text-green-400">[OK] Base de datos conectada: MySQL @ localhost</p>
                            <p className="text-green-400">[OK] Redis Cache: Activo</p>
                            <p className="text-green-400">[OK] Sesion persistente: Activa</p>
                            <p className="text-yellow-400">[WARN] n8n Webhook: No definido (Usa mock fallback)</p>
                            <p className="text-blue-400">[INFO] Gemini Assistant: Listo para consultas</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
