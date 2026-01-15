
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../src/services/api';
import {
    Inbox,
    Send,
    FileText,
    Trash2,
    Archive,
    RefreshCcw,
    Plus,
    Search,
    Filter,
    MoreVertical,
    ChevronLeft,
    Star,
    Paperclip,
    Clock,
    User,
    Settings as SettingsIcon,
    X,
    Mail,
    Check,
    Bold,
    Italic,
    List,
    Reply,
    Forward,
    AlertOctagon,
    MousePointer2,
    ChevronDown,
    UserPlus
} from 'lucide-react';
import { CurrentUser, Notification } from '../types';
import { useIsMobile } from '../src/hooks/useMediaQuery';

interface Email {
    id: string;
    sender: string;
    senderName: string;
    subject: string;
    preview: string;
    content: string;
    timestamp: string;
    isRead: boolean;
    isStarred: boolean;
    folder: 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam';
    attachments?: { name: string; size: string; type: string }[];
    to?: string;
    readAt?: string;
    isReadByRecipient?: boolean;
    clickCount: number;
}



interface EmailClientProps {
    currentUser?: CurrentUser;
    onNotify?: (title: string, msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
    contacts?: any[];
}

export const EmailClient: React.FC<EmailClientProps> = ({ currentUser, onNotify, contacts = [] }) => {
    const isMobile = useIsMobile();
    const [activeFolder, setActiveFolder] = useState<'inbox' | 'sent' | 'drafts' | 'trash' | 'spam'>('inbox');
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; emailId: string | null }>({ isOpen: false, emailId: null });
    const [showScheduleInput, setShowScheduleInput] = useState(false);
    const [contactSuggestions, setContactSuggestions] = useState<any[]>([]);
    const [showContactDropdown, setShowContactDropdown] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const [emailConfig, setEmailConfig] = useState({
        connected: false,
        smtp_host: '',
        smtp_port: 587,
        smtp_user: '',
        smtp_pass: '',
        smtp_secure: 'tls' as 'tls' | 'ssl',
        imap_host: '',
        imap_port: 993,
        imap_secure: 'ssl' as 'tls' | 'ssl',
        from_name: '',
        from_email: '',
        signature: ''
    });

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const { api } = await import('../src/services/api');
                const res = await api.settings.getEmailConfig(String(currentUser?.id || '1'));
                if (res.config) {
                    setEmailConfig(prev => ({ ...prev, ...res.config, connected: true }));
                }
            } catch (error) {
                console.error("Error fetching email config:", error);
            }
        };
        fetchConfig();
    }, [currentUser]);

    const editorRef = useRef<HTMLDivElement>(null);

    // Force hide scrollbars for horizontal menus to ensure premium look
    useEffect(() => {
        const style = document.createElement('style');
        style.id = 'hide-scrollbar-style';
        style.innerHTML = `
            .no-scrollbar::-webkit-scrollbar { display: none !important; }
            .no-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }
        `;
        document.head.appendChild(style);
        return () => {
            const existing = document.getElementById('hide-scrollbar-style');
            if (existing) document.head.removeChild(existing);
        };
    }, []);

    const [emails, setEmails] = useState<Email[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchEmails = async () => {
        if (!currentUser?.id) return;
        setIsLoading(true);
        try {
            const res = await api.emails.list(activeFolder, String(currentUser.id));
            if (res.success && res.emails) {
                const mapped: Email[] = res.emails.map((e: any) => ({
                    id: String(e.id),
                    sender: e.from,
                    senderName: e.sender_name || (e.from ? e.from.split('<')[0].trim() : 'Desconocido'),
                    to: e.to,
                    subject: e.subject,
                    preview: e.preview,
                    content: e.body,
                    timestamp: e.date,
                    isRead: e.read,
                    isStarred: false, // Not in DB yet
                    folder: e.folder,
                    attachments: e.attachments,
                    readAt: e.readAt,
                    isReadByRecipient: e.isReadByRecipient,
                    clickCount: e.clickCount
                }));
                setEmails(mapped);
            }
        } catch (error) {
            console.error('Error fetching emails:', error);
            if (onNotify) onNotify('Error', 'No se pudieron cargar los correos', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEmails();
    }, [activeFolder, currentUser]);

    const [isContact, setIsContact] = useState<any>(null);

    useEffect(() => {
        if (selectedEmail && contacts) {
            const senderEmail = selectedEmail.sender.toLowerCase();
            const contact = contacts.find((c: any) =>
                c.email?.toLowerCase() === senderEmail ||
                selectedEmail.sender.toLowerCase().includes(c.email?.toLowerCase())
            );
            setIsContact(contact || null);
        } else {
            setIsContact(null);
        }
    }, [selectedEmail, contacts]);

    const handleSync = async () => {
        if (!currentUser?.id) return;
        setIsLoading(true);
        try {
            const res = await api.emails.sync(String(currentUser.id));
            if (res.success) {
                if (onNotify) onNotify('Sincronización Completa', `Se encontraron ${res.synced} correos nuevos.`, 'success');
                fetchEmails();
            } else {
                if (onNotify) onNotify('Error', res.error || 'Error al sincronizar', 'error');
            }
        } catch (err: any) {
            console.error('Sync error:', err);
            if (onNotify) onNotify('Error', 'No se pudo conectar al servidor IMAP', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const [composeData, setComposeData] = useState({
        to: '',
        subject: '',
        content: '',
        scheduledAt: ''
    });

    const filteredEmails = emails.filter(e =>
    ((e.subject?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (e.senderName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (e.sender?.toLowerCase() || '').includes(searchQuery.toLowerCase()))
    );

    const handleSendEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        const content = editorRef.current?.innerHTML || '';
        if (!currentUser?.id) return;

        try {
            // Create FormData for attachments (if any) - currently we just have text fields in UI logic
            // But let's verify if we need to support attachments in the future.
            // For now, standard POST based on the current UI which only has text/html.
            // BUT api.emails.send expects FormData according to my change, or at least handling multipart.
            // Let's create FormData to be safe and future proof.
            const formData = new FormData();
            formData.append('user_id', String(currentUser.id));
            formData.append('to', composeData.to);
            formData.append('subject', composeData.subject);
            formData.append('body', content);
            if (composeData.scheduledAt) {
                formData.append('scheduled_at', composeData.scheduledAt);
            }
            // Note: Attachments file input not yet in UI form, so skipping for now.

            const res = await api.emails.send(formData);

            if (res.success) {
                if (onNotify) onNotify('Email Enviado', `Para: ${composeData.to}`, 'success');
                setIsComposeOpen(false);
                setShowScheduleInput(false);
                setComposeData({ to: '', subject: '', content: '', scheduledAt: '' });
                // Refresh sent folder if we are there
                if (activeFolder === 'sent') fetchEmails();
            } else {
                if (onNotify) onNotify('Error', res.error || 'Error al enviar', 'error');
            }

        } catch (err: any) {
            console.error('Send error:', err);
            if (onNotify) onNotify('Error', err.message, 'error');
        }
    };

    const handleAction = async (id: string, action: string) => {
        try {
            const { api } = await import('../src/services/api');
            
            if (action === 'save_draft') {
                const content = editorRef.current?.innerHTML || '';
                if (!composeData.to && !composeData.subject && !content) return; // Don't save empty drafts

                await api.emails.post('/email_actions.php', {
                    action: 'save_draft',
                    user_id: currentUser?.id,
                    to: composeData.to,
                    subject: composeData.subject,
                    body: content
                });
                if (onNotify) onNotify('Borrador', 'Guardado automáticamente', 'info');
                return;
            }

            await api.emails.post('/email_actions.php', {
                action: action,
                user_id: currentUser?.id,
                email_id: id
            });

            // Update local state
            setEmails(emails.filter(e => e.id !== id));
            setSelectedEmail(null);
            
            if (onNotify) {
                const messages: Record<string, string> = {
                    'trash': 'Movido a papelera',
                    'spam': 'Movido a Spam',
                    'archive': 'Archivado',
                    'delete_forever': 'Eliminado definitivamente'
                };
                onNotify('Acción Exitosa', messages[action] || 'Acción completada', 'success');
            }
        } catch (e) {
            console.error(e);
            if (onNotify) onNotify('Error', 'No se pudo realizar la acción', 'error');
        }
    };

    const handleFormat = (command: string) => {
        document.execCommand(command, false);
        editorRef.current?.focus();
    };

    const handleRecipientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setComposeData({ ...composeData, to: value });
        if (value.length >= 2 && currentUser?.id) {
            (async () => {
                try {
                    const res = await api.contacts.search(value);
                    if (res.success && res.contacts) {
                        setContactSuggestions(res.contacts);
                        setShowContactDropdown(true);
                    }
                } catch (err) {
                    console.error('Contact search error:', err);
                }
            })();
        } else {
            setShowContactDropdown(false);
        }
    };

    const selectContact = (contact: any) => {
        setComposeData({ ...composeData, to: contact.email });
        setShowContactDropdown(false);
    };

    const openCompose = () => {
        setIsComposeOpen(true);
        // Small delay to ensure DOM is ready if needed, but signature injection usually works on next tick
        setTimeout(() => {
            if (editorRef.current && emailConfig.signature) {
                const signatureHtml = `<br><br>--<br>${emailConfig.signature.replace(/\n/g, '<br>')}`;
                editorRef.current.innerHTML = signatureHtml;
                // Place cursor at beginning
                const range = document.createRange();
                const sel = window.getSelection();
                range.setStart(editorRef.current, 0);
                range.collapse(true);
                sel?.removeAllRanges();
                sel?.addRange(range);
                editorRef.current.focus();
            }
        }, 50);
    };

    const [isSaving, setIsSaving] = useState(false);

    const folderList = [
        { id: 'inbox', icon: Inbox, label: 'Recibidos', count: emails.filter(e => e.folder === 'inbox' && !e.isRead).length },
        { id: 'sent', icon: Send, label: 'Enviados' },
        { id: 'drafts', icon: FileText, label: 'Borradores' },
        { id: 'spam', icon: AlertOctagon, label: 'Spam' },
        { id: 'trash', icon: Trash2, label: 'Papelera' }
    ];

    const handleSaveConfig = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentUser?.id) {
            console.error("Missing currentUser.id");
            return;
        }

        setIsSaving(true);
        try {
            // First save
            const saveRes = await api.settings.saveEmailConfig(String(currentUser.id), emailConfig);

            if (saveRes.success) {
                // Then test
                const testRes = await api.settings.testEmailConfig(String(currentUser.id), emailConfig);

                if (testRes.success) {
                    setEmailConfig({ ...emailConfig, connected: true });
                    // Provide native feedback
                    alert("✅ Conexión Exitosa\nConfiguración guardada y verificada correctamente.");
                    if (onNotify) onNotify('Conexión Exitosa', 'Configuración guardada y verificada.', 'success');
                    setIsConfigOpen(false);
                    // Auto sync
                    handleSync();
                } else {
                    alert("⚠️ Guardado Parcial\nLa configuración se guardó pero la conexión falló: " + testRes.error);
                    if (onNotify) onNotify('Guardado parcial', 'Configuración guardada pero la conexión falló: ' + testRes.error, 'warning');
                }
            } else {
                alert("❌ Error\nNo se pudo guardar la configuración.");
                if (onNotify) onNotify('Error', 'No se pudo guardar la configuración', 'error');
            }
        } catch (err: any) {
            console.error('Config error:', err);
            alert("❌ Error Crítico\n" + (err.message || "Error desconocido"));
            if (onNotify) onNotify('Error', err.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex h-full bg-slate-50 overflow-hidden font-sans relative">
            {/* SIDEBAR FOLDERS - Hidden on Mobile */}
            {!isMobile && (
                <div className="w-20 lg:w-52 bg-white border-r border-slate-200 flex flex-col transition-all duration-300 group shadow-sm z-30">
                    <div className="p-4 flex justify-center lg:block">
                        <button
                            onClick={openCompose}
                            className="w-12 h-12 lg:w-full lg:h-auto lg:py-3.5 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 group/btn"
                            title="Redactar nuevo correo"
                        >
                            <Plus size={22} className="group-hover/btn:rotate-90 transition-transform" />
                            <span className="hidden lg:inline">Redactar</span>
                        </button>
                    </div>

                    <nav className="flex-1 px-3 space-y-1.5 mt-2">
                        {folderList.map((folder) => (
                            <button
                                key={folder.id}
                                onClick={() => {
                                    setActiveFolder(folder.id as any);
                                    if (folder.id === 'trash' || folder.id === 'spam') setSelectedEmail(null);
                                }}
                                className={`w-full flex items-center justify-center lg:justify-between px-3 py-3 rounded-xl transition-all ${activeFolder === folder.id
                                    ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                    }`}
                                title={folder.label}
                            >
                                <div className="flex items-center gap-3">
                                    <folder.icon size={20} className={activeFolder === folder.id ? 'text-blue-600' : 'text-slate-400'} />
                                    <span className="hidden lg:inline font-bold text-xs tracking-tight">{folder.label}</span>
                                </div>
                                {folder.count !== undefined && folder.count > 0 && (
                                    <span className={`hidden lg:flex bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm`}>
                                        {folder.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>
            )}





            {/* EMAIL LIST */}
            <div className={`transition-all duration-500 ease-in-out flex flex-col bg-white border-r border-slate-200 overflow-hidden relative ${selectedEmail ? 'w-full lg:w-[380px] xl:w-[450px] shadow-2xl z-10' : 'flex-1'} ${isMobile && selectedEmail ? 'hidden' : 'flex'}`}>
                <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 sticky top-0 bg-white/80 backdrop-blur-md z-20">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar en bandeja..."
                            title="Buscar correos"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-100/50 border border-transparent rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-200 transition-all placeholder:text-slate-400"
                        />
                    </div>
                    <button
                        onClick={handleSync}
                        className={`p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors ${isLoading ? 'animate-spin' : ''}`}
                        title="Sincronizar ahora"
                    >
                        <RefreshCcw size={18} />
                    </button>
                </div>

                <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-3 space-y-3 bg-slate-50' : 'divide-y divide-slate-100 bg-white'}`}>
                    {filteredEmails.length > 0 ? filteredEmails.map(email => (
                        <div
                            key={email.id}
                            onClick={async () => {
                                setSelectedEmail(email);
                                if (!email.isRead) {
                                    // Optimistic update
                                    setEmails(prev => prev.map(e => e.id === email.id ? { ...e, isRead: true } : e));
                                    try {
                                        const { api } = await import('../src/services/api');
                                        if (currentUser?.id) await api.emails.markRead(email.id, String(currentUser.id));
                                    } catch (e) {
                                        console.error("Failed to mark as read", e);
                                    }
                                }
                            }}
                            className={`cursor-pointer transition-all duration-200 relative flex gap-3 
                                ${isMobile
                                    ? `bg-white rounded-2xl p-4 shadow-md border ${email.isRead ? 'border-slate-100' : 'border-blue-100 ring-1 ring-blue-50'} active:scale-[0.98] mb-3`
                                    : `p-5 border-b border-slate-50 hover:bg-blue-50/40 ${email.isRead ? 'bg-white' : 'bg-slate-50/30'} ${selectedEmail?.id === email.id ? 'bg-blue-50/80 ring-2 ring-inset ring-blue-500/20' : ''}`
                                }`}
                        >
                            {isMobile && !email.isRead && <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-blue-600 rounded-r-full shadow-[2px_0_8px_rgba(37,99,235,0.4)]"></div>}
                            {!email.isRead && !isMobile && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600"></div>}

                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                    <h4 className={`text-sm truncate ${email.isRead ? 'text-slate-600' : 'font-bold text-slate-900'} ${isMobile && !email.isRead ? 'ml-4' : ''}`}>
                                        {email.senderName}
                                    </h4>
                                    <span className="text-[10px] text-slate-400 font-medium">{email.timestamp}</span>
                                </div>
                                <h5 className={`text-xs truncate mb-1 ${email.isRead ? 'text-slate-500' : 'font-bold text-slate-800'} flex items-center gap-2`}>
                                    {email.subject}
                                    {activeFolder === 'sent' && (
                                        email.isReadByRecipient ? (
                                            <span className="flex items-center text-blue-500 text-[10px] gap-1" title={`Leído el ${email.readAt}`}>
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                                                <Check size={12} />
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 text-[10px] italic">Enviado</span>
                                        )
                                    )}
                                </h5>
                                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                                    {email.preview}
                                </p>
                                <div className="flex items-center gap-3 mt-2">
                                    {email.isStarred && <Star size={12} className="text-amber-400 fill-amber-400" />}
                                    {email.attachments && (
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-[9px] text-slate-500">
                                            <Paperclip size={10} />
                                            <span>{email.attachments.length}</span>
                                        </div>
                                    )}
                                    {email.clickCount > 0 && (
                                        <div className="flex items-center gap-1 text-[9px] text-blue-500 font-medium">
                                            <MousePointer2 size={10} />
                                            <span>{email.clickCount} clicks</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )) : (

                        <div className="flex flex-col items-center justify-center p-12 text-slate-400 opacity-50">
                            <Mail size={48} className="mb-4" />
                            <p className="text-sm font-medium">Bandeja vacía</p>
                        </div>
                    )}
                </div>

                {/* FAB (MOBILE FOLDERS) */}
                {isMobile && !selectedEmail && (
                    <div className="fixed bottom-28 left-6 z-40">
                        <div className="relative">
                            {isMobileMenuOpen && (
                                <>
                                    <div className="fixed inset-0 bg-black/20 z-10" onClick={() => setIsMobileMenuOpen(false)} />
                                    <div className="absolute bottom-full left-0 mb-4 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200 z-20">
                                        {folderList.map(folder => (
                                            <button
                                                key={folder.id}
                                                onClick={() => {
                                                    setActiveFolder(folder.id as any);
                                                    setIsMobileMenuOpen(false);
                                                }}
                                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${activeFolder === folder.id ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                                            >
                                                <folder.icon size={18} />
                                                {folder.label}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="w-12 h-12 bg-white text-slate-700 rounded-full shadow-lg border border-slate-200 flex items-center justify-center active:scale-95 transition-all relative z-20"
                            >
                                {(() => {
                                    const current = folderList.find(f => f.id === activeFolder);
                                    return current ? <current.icon size={20} /> : <Inbox size={20} />;
                                })()}
                            </button>
                        </div>
                    </div>
                )}

                {/* FAB (MOBILE COMPOSE) */}
                {isMobile && !selectedEmail && (
                    <button
                        onClick={() => setIsComposeOpen(true)}
                        className="fixed bottom-28 right-6 w-12 h-12 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-95 transition-all border-4 border-white ring-4 ring-blue-50/50"
                        aria-label="Redactar"
                        title="Redactar nuevo correo"
                    >
                        <Plus size={24} />
                    </button>
                )}
            </div>

            {/* EMAIL DETAIL */}
            <div className={`flex-1 flex flex-col bg-white overflow-hidden transition-all duration-500 ease-in-out ${selectedEmail ? 'fixed inset-0 z-40 lg:relative translate-x-0 opacity-100' : 'hidden lg:flex lg:translate-x-4 lg:opacity-0'}`}>
                {selectedEmail ? (
                    <>
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setSelectedEmail(null)}
                                    className="p-2 -ml-2 text-slate-400 hover:bg-slate-50 rounded-lg lg:hidden"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <div className="w-10 h-10 rounded-full bg-blue-100 hidden lg:flex items-center justify-center text-blue-700 font-bold text-sm">
                                    {selectedEmail.senderName.substring(0, 1)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-bold text-slate-900">{selectedEmail.senderName}</h3>
                                        {isContact ? (
                                            <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-green-200">
                                                <Check size={10} />
                                                <span>CLIENTE</span>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    if (onNotify) onNotify('Crear Contacto', `Próximamente: Crear contacto para ${selectedEmail.senderName}`, 'info');
                                                }}
                                                className="p-1 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                                                title="Añadir a contactos"
                                            >
                                                <UserPlus size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500">{selectedEmail.sender}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 bg-slate-100/50 p-1.5 rounded-2xl">
                                <button
                                    className="p-2.5 text-slate-500 hover:bg-white hover:text-yellow-600 hover:shadow-sm rounded-xl transition-all"
                                    title={selectedEmail.isStarred ? "Quitar de destacados" : "Destacar"}
                                >
                                    <Star size={20} className={selectedEmail.isStarred ? 'fill-amber-400 text-amber-400' : ''} />
                                </button>
                                {/* Spam Button */}
                                <button
                                    onClick={() => handleAction(selectedEmail.id, 'spam')}
                                    className="p-2.5 text-slate-500 hover:bg-white hover:text-orange-600 hover:shadow-sm rounded-xl transition-all"
                                    title="Marcar como Spam"
                                >
                                    <AlertOctagon size={20} />
                                </button>
                                {activeFolder === 'trash' ? (
                                    <button
                                        onClick={() => handleAction(selectedEmail.id, 'delete_forever')}
                                        className="p-2.5 text-slate-500 hover:bg-white hover:text-red-700 hover:shadow-sm rounded-xl transition-all"
                                        title="Eliminar definitivamente"
                                    >
                                        <X size={20} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            if (selectedEmail) {
                                                setDeleteModal({ isOpen: true, emailId: selectedEmail.id });
                                            }
                                        }}
                                        className="p-2.5 text-slate-500 hover:bg-white hover:text-red-600 hover:shadow-sm rounded-xl transition-all"
                                        title="Mover a papelera"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                )}
                                <div className="w-px h-6 bg-slate-200 mx-1"></div>
                                <button
                                    className="p-2.5 text-slate-500 hover:bg-white hover:text-blue-600 hover:shadow-sm rounded-xl transition-all"
                                    title="Más opciones"
                                >
                                    <MoreVertical size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 pb-24 lg:p-10 max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-right-4 duration-500">
                            <h1 className="text-xl font-bold text-slate-900 mb-6 leading-snug">
                                {selectedEmail.subject}
                            </h1>

                            <div className="flex items-center gap-4 mb-8 text-sm">
                                <div className="flex items-center gap-2 text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                                    <Clock size={14} />
                                    <span>{activeFolder === 'sent' ? 'Enviado el' : 'Recibido el'} {selectedEmail.timestamp}</span>
                                </div>
                                {activeFolder === 'sent' && (
                                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${selectedEmail.isReadByRecipient ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                                        {selectedEmail.isReadByRecipient ? (
                                            <>
                                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                                                <span className="font-bold">Leído: {selectedEmail.readAt}</span>
                                                {selectedEmail.clickCount && selectedEmail.clickCount > 0 && (
                                                    <span className="ml-2 flex items-center gap-1 bg-blue-100 px-2 rounded-lg text-xs">
                                                        <span className="font-black">{selectedEmail.clickCount}</span> Clics
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                                                <span>Aún no leído</span>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="prose prose-slate max-w-none">
                                <div
                                    className="text-slate-700 leading-relaxed text-base email-content"
                                    dangerouslySetInnerHTML={{ __html: selectedEmail.content }}
                                />
                            </div>

                            {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                                <div className="mt-12 pt-8 border-t border-slate-100">
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-4">
                                        <Paperclip size={16} className="text-blue-600" />
                                        Adjuntos ({selectedEmail.attachments.length})
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {selectedEmail.attachments.map((file, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors group cursor-pointer">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-xs font-bold text-blue-600">
                                                        {file.type}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors">{file.name}</p>
                                                        <p className="text-xs text-slate-500">{file.size}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* DESKTOP ACTIONS */}
                            <div className="hidden lg:flex mt-12 pt-8 border-t border-slate-100 gap-4">
                                <button
                                    onClick={() => {
                                        setComposeData({
                                            to: selectedEmail.sender,
                                            subject: `Re: ${selectedEmail.subject}`,
                                            content: `<br><br>--- En ${new Date(selectedEmail.timestamp).toLocaleString()}, ${selectedEmail.senderName} &lt;${selectedEmail.sender}&gt; escribió: ---<br>${selectedEmail.content}`,
                                            scheduledAt: ''
                                        });
                                        setIsComposeOpen(true);
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-blue-200/50 shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
                                >
                                    <Reply size={20} /> Responder
                                </button>
                                <button
                                    onClick={() => {
                                        setComposeData({
                                            to: '',
                                            subject: `Fwd: ${selectedEmail.subject}`,
                                            content: `<br><br>--- Mensaje Reenviado ---<br>De: ${selectedEmail.senderName} &lt;${selectedEmail.sender}&gt;<br>Fecha: ${new Date(selectedEmail.timestamp).toLocaleString()}<br>Asunto: ${selectedEmail.subject}<br><br>${selectedEmail.content}`,
                                            scheduledAt: ''
                                        });
                                        setIsComposeOpen(true);
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold shadow-sm hover:bg-slate-50 active:scale-95 transition-all"
                                >
                                    <Forward size={20} /> Reenviar
                                </button>
                            </div>

                            {/* MOBILE FIXED ACTIONS */}
                            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] z-50 flex gap-3">
                                <button
                                    onClick={() => {
                                        setComposeData({
                                            to: '',
                                            subject: `Fwd: ${selectedEmail.subject}`,
                                            content: `<br><br>--- Mensaje Reenviado ---<br>De: ${selectedEmail.senderName} &lt;${selectedEmail.sender}&gt;<br>Fecha: ${new Date(selectedEmail.timestamp).toLocaleString()}<br>Asunto: ${selectedEmail.subject}<br><br>${selectedEmail.content}`,
                                            scheduledAt: ''
                                        });
                                        setIsComposeOpen(true);
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold shadow-sm active:scale-95 transition-all"
                                >
                                    <Forward size={18} /> Reenviar
                                </button>
                                <button
                                    onClick={() => {
                                        setComposeData({
                                            to: selectedEmail.sender,
                                            subject: `Re: ${selectedEmail.subject}`,
                                            content: `<br><br>--- En ${new Date(selectedEmail.timestamp).toLocaleString()}, ${selectedEmail.senderName} &lt;${selectedEmail.sender}&gt; escribió: ---<br>${selectedEmail.content}`,
                                            scheduledAt: ''
                                        });
                                        setIsComposeOpen(true);
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-blue-200/50 shadow-lg active:scale-95 transition-all"
                                >
                                    <Reply size={18} /> Responder
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/30">
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                            <Mail size={40} className="text-slate-200" />
                        </div>
                        <p className="text-lg font-bold text-slate-500">Selecciona un correo</p>
                        <p className="text-sm">Para ver su contenido y opciones avanzadas</p>
                    </div>
                )}
            </div>

            {/* COMPOSE MODAL */}
            {isComposeOpen && (
                <div className={`fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300`}>
                    <form
                        onSubmit={handleSendEmail}
                        className={`bg-white shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col ${isMobile ? 'h-[90vh] rounded-t-3xl transition-transform duration-500 translate-y-0 shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.3)]' : 'max-h-[90vh] rounded-3xl animate-in zoom-in-95'}`}
                    >
                        {/* MODAL HEADER */}
                        <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
                                    <Send size={24} className="-rotate-45" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Nuevo Mensaje</h3>
                                    <p className="text-xs font-bold text-slate-500">Redacta y envía correos al instante</p>
                                </div>
                            </div>
                            <button type="button" onClick={() => setIsComposeOpen(false)} className="p-2 text-slate-400 hover:bg-white hover:text-slate-600 rounded-xl transition-all hover:shadow-sm"><X size={24} /></button>
                        </div>

                        {/* SCROLLABLE CONTENT */}
                        <div className="flex-1 overflow-y-auto p-2 lg:p-10 space-y-6 no-scrollbar">
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                <input
                                    required
                                    type="text"
                                    placeholder="Para: (busca contactos...)"
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-400 font-medium text-slate-900 shadow-sm"
                                    value={composeData.to}
                                    onChange={handleRecipientChange}
                                    onFocus={() => composeData.to.length >= 2 && setShowContactDropdown(true)}
                                />
                                {showContactDropdown && contactSuggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                        {contactSuggestions.map((contact) => (
                                            <button
                                                key={contact.id}
                                                type="button"
                                                onClick={() => selectContact(contact)}
                                                className="w-full px-5 py-3 hover:bg-blue-50 flex items-center gap-3 transition-colors text-left border-b border-slate-50 last:border-0"
                                            >
                                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl flex items-center justify-center font-bold shadow-sm">
                                                    {contact.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900">{contact.name}</p>
                                                    <p className="text-xs font-medium text-slate-500">{contact.email}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="relative group">
                                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                <input
                                    required
                                    type="text"
                                    placeholder="Asunto del correo"
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-400 font-medium text-slate-900 shadow-sm"
                                    value={composeData.subject}
                                    onChange={e => setComposeData({ ...composeData, subject: e.target.value })}
                                />
                            </div>

                            <div className="space-y-0 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                <div className="flex items-center gap-1 p-2 bg-slate-50 border-b border-slate-200">
                                    <button type="button" onClick={() => handleFormat('bold')} className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl text-slate-600 transition-all active:scale-90" title="Negrita">
                                        <Bold size={18} />
                                    </button>
                                    <button type="button" onClick={() => handleFormat('italic')} className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl text-slate-600 transition-all active:scale-90" title="Cursiva">
                                        <Italic size={18} />
                                    </button>
                                    <div className="w-px h-6 bg-slate-300 mx-1"></div>
                                    <button type="button" onClick={() => handleFormat('insertUnorderedList')} className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl text-slate-600 transition-all active:scale-90" title="Lista">
                                        <List size={18} />
                                    </button>
                                </div>
                                <div
                                    ref={editorRef}
                                    contentEditable
                                    title="Contenido del correo"
                                    className="w-full p-6 bg-white focus:outline-none min-h-[250px] max-h-[400px] overflow-y-auto transition-all text-slate-900 leading-relaxed prose prose-sm max-w-none"
                                    onInput={(e) => setComposeData({ ...composeData, content: (e.target as HTMLDivElement).innerHTML })}
                                ></div>
                            </div>
                        </div>

                        {/* FIXED FOOTER */}
                        <div className="p-6 bg-slate-100/50 border-t border-slate-200 mt-auto">
                            {showScheduleInput && (
                                <div className="mb-4 bg-white p-5 rounded-2xl border-2 border-blue-500 shadow-2xl animate-in slide-in-from-bottom-4 flex flex-col gap-4 ring-8 ring-blue-50">
                                    <div className="flex justify-between items-center bg-blue-50/50 p-2 rounded-xl">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-blue-600 rounded-lg text-white">
                                                <Clock size={16} />
                                            </div>
                                            <span className="text-xs font-black text-blue-700 uppercase tracking-widest px-1">Programar Envío</span>
                                        </div>
                                        <button type="button" onClick={() => setShowScheduleInput(false)} className="p-1.5 hover:bg-red-50 hover:text-red-500 text-slate-400 rounded-lg transition-all" title="Cerrar"><X size={18} /></button>
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-bold px-1">Selecciona la fecha y hora exacta para el envío automático:</p>
                                    <input
                                        type="datetime-local"
                                        required={showScheduleInput}
                                        title="Fecha y hora de programación"
                                        className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all font-black text-sm shadow-inner"
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                setComposeData({ ...composeData, scheduledAt: e.target.value });
                                                setShowScheduleInput(false);
                                            }
                                        }}
                                    />
                                    <div className="flex gap-2">
                                        {[
                                            { label: '+1h', value: 60 },
                                            { label: '+4h', value: 240 },
                                            { label: 'Mañana', value: 1440 }
                                        ].map(opt => (
                                            <button
                                                key={opt.label}
                                                type="button"
                                                className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black hover:bg-blue-600 hover:text-white transition-all border border-blue-100"
                                                onClick={() => {
                                                    const d = new Date();
                                                    d.setMinutes(d.getMinutes() + opt.value);
                                                    setComposeData({ ...composeData, scheduledAt: d.toISOString().slice(0, 16) });
                                                    setShowScheduleInput(false);
                                                }}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between items-center gap-4">
                                <div className="flex gap-2 items-center">
                                    <button
                                        type="button"
                                        className="group p-3.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-2xl transition-all active:scale-90 relative"
                                        title="Adjuntar archivos"
                                    >
                                        <Paperclip size={22} className="group-hover:rotate-12 transition-transform" />
                                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-slate-200 rounded-full border-2 border-white"></div>
                                    </button>
                                    {!composeData.scheduledAt && !showScheduleInput && (
                                        <button
                                            type="button"
                                            onClick={() => setShowScheduleInput(true)}
                                            className="p-3.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-2xl transition-all active:scale-90"
                                            title="Programar envío"
                                        >
                                            <Clock size={22} />
                                        </button>
                                    )}
                                    {composeData.scheduledAt && (
                                        <div className="text-[10px] text-blue-700 font-black bg-blue-50 px-4 py-2.5 rounded-2xl border-2 border-blue-100 flex items-center gap-3 shadow-lg shadow-blue-100 animate-in zoom-in-95 group">
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className="text-blue-600 group-hover:rotate-12 transition-transform" />
                                                <span className="uppercase tracking-tighter">{new Date(composeData.scheduledAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                            </div>
                                            <button type="button" onClick={() => setComposeData({ ...composeData, scheduledAt: '' })} className="p-1 hover:bg-blue-100 rounded-lg text-blue-400 hover:text-red-500 transition-all" title="Eliminar programación">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 items-center">
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            await handleAction('', 'save_draft');
                                            setIsComposeOpen(false);
                                        }}
                                        className="w-12 h-12 flex items-center justify-center text-slate-400 hover:bg-slate-200/50 hover:text-red-500 rounded-full transition-all active:scale-90"
                                        title="Cancelar"
                                    >
                                        <X size={24} />
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={isLoading || (!composeData.to && !composeData.scheduledAt)}
                                        className={`w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all active:scale-95 group/send ${composeData.scheduledAt
                                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200/50'
                                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200/50'
                                            } disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed`}
                                        title={composeData.scheduledAt ? 'Programar este correo' : 'Enviar correo ahora'}
                                    >
                                        <Send size={20} className={`transition-transform duration-300 ${composeData.scheduledAt ? 'rotate-0' : '-rotate-45 group-hover/send:translate-x-0.5 group-hover/send:-translate-y-0.5'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* CONFIG MODAL */}
            {isConfigOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-600">
                                    <SettingsIcon size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Configuración Email</h3>
                                    <p className="text-xs text-slate-500">Conecta tu servidor SMTP/IMAP</p>
                                </div>
                            </div>
                            <button onClick={() => setIsConfigOpen(false)} className="p-2 text-slate-400 hover:bg-white hover:text-slate-600 rounded-lg transition-all" title="Cerrar"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSaveConfig} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 gap-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Servidor SMTP</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="smtp.ejemplo.com"
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900"
                                        value={emailConfig.smtp_host}
                                        onChange={e => setEmailConfig({ ...emailConfig, smtp_host: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Puerto</label>
                                        <input
                                            required
                                            type="number"
                                            placeholder="587"
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900"
                                            value={emailConfig.smtp_port}
                                            onChange={e => setEmailConfig({ ...emailConfig, smtp_port: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Seguridad</label>
                                        <select
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900"
                                            value={emailConfig.smtp_secure}
                                            onChange={e => setEmailConfig({ ...emailConfig, smtp_secure: e.target.value as any })}
                                            title="Tipo de seguridad SMTP"
                                        >
                                            <option value="tls">STARTTLS (Recomendado)</option>
                                            <option value="ssl">SSL/TLS</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Usuario / Email</label>
                                    <input
                                        required
                                        type="email"
                                        placeholder="usuario@dominio.com"
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900"
                                        value={emailConfig.smtp_user}
                                        onChange={e => setEmailConfig({ ...emailConfig, smtp_user: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <input
                                        required
                                        type="password"
                                        title="Contraseña SMTP"
                                        placeholder="••••••••••••"
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900"
                                        value={emailConfig.smtp_pass}
                                        onChange={e => setEmailConfig({ ...emailConfig, smtp_pass: e.target.value })}
                                    />
                                </div>

                                {/* IMAP SECTION */}
                                <div className="pt-4 border-t border-slate-100">
                                    <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                                        <Inbox size={16} className="text-blue-500" />
                                        Configuración de Recepción (IMAP)
                                    </h4>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Host IMAP</label>
                                            <input
                                                type="text"
                                                placeholder="imap.ejemplo.com"
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900"
                                                value={emailConfig.imap_host}
                                                onChange={e => setEmailConfig({ ...emailConfig, imap_host: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Puerto</label>
                                                <input
                                                    type="number"
                                                    placeholder="993"
                                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900"
                                                    value={emailConfig.imap_port}
                                                    onChange={e => setEmailConfig({ ...emailConfig, imap_port: Number(e.target.value) })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Seguridad</label>
                                                <select
                                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900"
                                                    value={emailConfig.imap_secure}
                                                    onChange={e => setEmailConfig({ ...emailConfig, imap_secure: e.target.value as any })}
                                                    title="Tipo de seguridad IMAP"
                                                >
                                                    <option value="ssl">SSL/TLS</option>
                                                    <option value="tls">STARTTLS</option>
                                                    <option value="none">Ninguno</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-3 pt-4">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className={`w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 hover:shadow-blue-200 transition-all flex items-center justify-center gap-2 ${isSaving ? 'opacity-75 cursor-wait' : ''}`}
                                    title="Guardar y Probar Conexión"
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Verificando...
                                        </>
                                    ) : (
                                        <>
                                            <Check size={18} />
                                            Guardar y Probar Conexión
                                        </>
                                    )}
                                </button>
                                <p className="text-[10px] text-center text-slate-400 px-4">
                                    Al conectar tu email, KiwüLead podrá enviar y recibir correos directamente. Tus credenciales se guardan de forma segura y cifrada.
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
