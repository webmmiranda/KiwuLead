
import React, { useState, useEffect } from 'react';
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
    List
} from 'lucide-react';
import { CurrentUser, Notification } from '../types';

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
    folder: 'inbox' | 'sent' | 'drafts' | 'trash';
    attachments?: { name: string; size: string; type: string }[];
}

interface EmailClientProps {
    currentUser?: CurrentUser;
    onNotify?: (title: string, msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export const EmailClient: React.FC<EmailClientProps> = ({ currentUser, onNotify }) => {
    const [activeFolder, setActiveFolder] = useState<'inbox' | 'sent' | 'drafts' | 'trash'>('inbox');
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [emailConfig, setEmailConfig] = useState({
        connected: false,
        smtp_host: '',
        smtp_port: 587,
        smtp_user: '',
        smtp_pass: '',
        smtp_secure: 'tls' as 'tls' | 'ssl',
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

    const editorRef = React.useRef<HTMLDivElement>(null);

    const [emails, setEmails] = useState<Email[]>([
        {
            id: '1',
            sender: 'sofia@client.com',
            senderName: 'Sofia Lopez',
            subject: 'Propuesta de Servicio - Proyecto Alpha',
            preview: 'Hola equipo, les escribo para dar seguimiento a la propuesta...',
            content: 'Hola equipo,\n\nLes escribo para dar seguimiento a la propuesta enviada la semana pasada para el Proyecto Alpha.\n\nEstamos muy interesados en proceder, pero nos gustaría revisar algunos detalles sobre el cronograma de implementación.\n\n¿Tienen disponibilidad para una breve llamada mañana?\n\nSaludos,\nSofia',
            timestamp: '10:30 AM',
            isRead: false,
            isStarred: true,
            folder: 'inbox'
        },
        {
            id: '2',
            sender: 'marketing@partners.com',
            senderName: 'Partners Marketing',
            subject: 'Nuevas Oportunidades Q1',
            preview: 'Hemos identificado algunas oportunidades interesantes para...',
            content: 'Hola Admin,\n\nHemos identificado algunas oportunidades interesantes para el primer trimestre que nos gustaría compartir con ustedes.\n\nAdjunto el reporte detallado.\n\nSaludos.',
            timestamp: 'Ayer',
            isRead: true,
            isStarred: false,
            folder: 'inbox',
            attachments: [{ name: 'reporte_q1.pdf', size: '1.2 MB', type: 'PDF' }]
        }
    ]);

    const [composeData, setComposeData] = useState({
        to: '',
        subject: '',
        content: ''
    });

    const filteredEmails = emails.filter(e =>
        e.folder === activeFolder &&
        (e.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.senderName.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleSendEmail = (e: React.FormEvent) => {
        e.preventDefault();
        const content = editorRef.current?.innerHTML || '';
        if (onNotify) onNotify('Email Enviado', `Para: ${composeData.to}`, 'success');

        const newEmail: Email = {
            id: Date.now().toString(),
            sender: currentUser?.name || 'Me',
            senderName: currentUser?.name || 'Me',
            subject: composeData.subject,
            preview: composeData.content.substring(0, 50) + '...',
            content: composeData.content,
            timestamp: 'Ahora',
            isRead: true,
            isStarred: false,
            folder: 'sent'
        };

        setEmails([newEmail, ...emails]);
        setIsComposeOpen(false);
        setComposeData({ to: '', subject: '', content: '' });
    };

    const handleFormat = (command: string) => {
        document.execCommand(command, false);
        editorRef.current?.focus();
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

    const handleSaveConfig = (e: React.FormEvent) => {
        e.preventDefault();
        setEmailConfig({ ...emailConfig, connected: true });
        if (onNotify) onNotify('Configuración Guardada', 'Conexión SMTP exitosa.', 'success');
        setIsConfigOpen(false);
    };

    return (
        <div className="flex h-full bg-slate-50 overflow-hidden font-sans">
            {/* SIDEBAR FOLDERS */}
            <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
                <div className="p-6">
                    <button
                        onClick={openCompose}
                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 group"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                        Redactar
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    <button
                        onClick={() => setActiveFolder('inbox')}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${activeFolder === 'inbox' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <div className="flex items-center gap-3">
                            <Inbox size={18} />
                            <span className="font-medium">Recibidos</span>
                        </div>
                        {emails.filter(e => e.folder === 'inbox' && !e.isRead).length > 0 && (
                            <span className="bg-blue-200 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {emails.filter(e => e.folder === 'inbox' && !e.isRead).length}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveFolder('sent')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeFolder === 'sent' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Send size={18} />
                        <span className="font-medium">Enviados</span>
                    </button>

                    <button
                        onClick={() => setActiveFolder('drafts')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeFolder === 'drafts' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <FileText size={18} />
                        <span className="font-medium">Borradores</span>
                    </button>

                    <button
                        onClick={() => setActiveFolder('trash')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeFolder === 'trash' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Trash2 size={18} />
                        <span className="font-medium">Papelera</span>
                    </button>
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <button
                        onClick={() => setIsConfigOpen(true)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                        <SettingsIcon size={18} />
                        <span className="font-medium">Configuración</span>
                    </button>
                </div>
            </div>

            {/* EMAIL LIST */}
            <div className={`flex-1 flex flex-col bg-white border-r border-slate-200 min-w-0 ${selectedEmail ? 'hidden lg:flex md:w-1/3' : 'w-full'}`}>
                <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar correos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                    </div>
                    <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors">
                        <RefreshCcw size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                    {filteredEmails.length > 0 ? filteredEmails.map(email => (
                        <div
                            key={email.id}
                            onClick={() => setSelectedEmail(email)}
                            className={`p-4 cursor-pointer transition-all duration-200 hover:bg-blue-50/30 relative flex gap-3 ${email.isRead ? 'bg-white' : 'bg-slate-50/50'} ${selectedEmail?.id === email.id ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : ''}`}
                        >
                            {!email.isRead && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600"></div>}

                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                    <h4 className={`text-sm truncate ${email.isRead ? 'text-slate-600' : 'font-bold text-slate-900'}`}>
                                        {email.senderName}
                                    </h4>
                                    <span className="text-[10px] text-slate-400 font-medium">{email.timestamp}</span>
                                </div>
                                <h5 className={`text-xs truncate mb-1 ${email.isRead ? 'text-slate-500' : 'font-bold text-slate-800'}`}>
                                    {email.subject}
                                </h5>
                                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                                    {email.preview}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                    {email.isStarred && <Star size={12} className="text-amber-400 fill-amber-400" />}
                                    {email.attachments && <Paperclip size={12} className="text-slate-400" />}
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
            </div>

            {/* EMAIL DETAIL */}
            <div className={`flex-[2] flex flex-col bg-white overflow-hidden transition-all duration-300 ${selectedEmail ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
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
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                                    {selectedEmail.senderName.substring(0, 1)}
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">{selectedEmail.senderName}</h3>
                                    <p className="text-xs text-slate-500">{selectedEmail.sender}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button className="p-2 text-slate-400 hover:bg-yellow-50 hover:text-yellow-600 rounded-lg transition-colors">
                                    <Star size={18} className={selectedEmail.isStarred ? 'fill-amber-400 text-amber-400' : ''} />
                                </button>
                                <button className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
                                    <Trash2 size={18} />
                                </button>
                                <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors">
                                    <MoreVertical size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
                            <h1 className="text-2xl font-bold text-slate-900 mb-8 leading-tight">
                                {selectedEmail.subject}
                            </h1>

                            <div className="flex items-center gap-4 mb-8 text-sm">
                                <div className="flex items-center gap-2 text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                                    <Clock size={14} />
                                    <span>Enviado el {selectedEmail.timestamp}</span>
                                </div>
                            </div>

                            <div className="prose prose-slate max-w-none">
                                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-base">
                                    {selectedEmail.content}
                                </p>
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

                            <div className="mt-12 pt-8 border-t border-slate-100 flex gap-4">
                                <button className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all">
                                    Responder
                                </button>
                                <button className="px-6 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50 transition-all">
                                    Reenviar
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700">
                                    <Send size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Nuevo Mensaje</h3>
                                    <p className="text-xs text-slate-500">Enviar email directo desde el CRM</p>
                                </div>
                            </div>
                            <button onClick={() => setIsComposeOpen(false)} className="p-2 text-slate-400 hover:bg-white hover:text-slate-600 rounded-lg transition-all"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSendEmail} className="p-8 space-y-4">
                            <div className="space-y-4">
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        required
                                        type="email"
                                        placeholder="Para:"
                                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-900"
                                        value={composeData.to}
                                        onChange={e => setComposeData({ ...composeData, to: e.target.value })}
                                    />
                                </div>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        required
                                        type="text"
                                        placeholder="Asunto:"
                                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-900"
                                        value={composeData.subject}
                                        onChange={e => setComposeData({ ...composeData, subject: e.target.value })}
                                    />
                                </div>

                                {/* RTE TOOLBAR */}
                                <div className="flex items-center gap-1 p-2 bg-slate-50 border border-slate-200 rounded-t-xl -mb-4 relative z-10">
                                    <button type="button" onClick={() => handleFormat('bold')} className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors" title="Negrita">
                                        <Bold size={16} />
                                    </button>
                                    <button type="button" onClick={() => handleFormat('italic')} className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors" title="Cursiva">
                                        <Italic size={16} />
                                    </button>
                                    <div className="w-px h-6 bg-slate-300 mx-1"></div>
                                    <button type="button" onClick={() => handleFormat('insertUnorderedList')} className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors" title="Lista">
                                        <List size={16} />
                                    </button>
                                </div>

                                {/* RICH TEXT AREA */}
                                <div
                                    ref={editorRef}
                                    contentEditable
                                    className="w-full p-4 pt-6 bg-white border border-slate-200 rounded-b-xl rounded-t-none focus:ring-2 focus:ring-blue-500 outline-none h-64 overflow-y-auto transition-all text-slate-900 leading-relaxed prose prose-sm max-w-none"
                                    onInput={(e) => setComposeData({ ...composeData, content: (e.target as HTMLDivElement).innerHTML })}
                                ></div>
                            </div>
                            <div className="flex justify-between items-center bg-slate-50 -mx-8 -mb-8 p-6 mt-6">
                                <button type="button" className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-sm transition-colors">
                                    <Paperclip size={18} />
                                    Adjuntar
                                </button>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setIsComposeOpen(false)} className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-all">Cancelar</button>
                                    <button type="submit" className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 hover:shadow-blue-200 transition-all flex items-center gap-2">
                                        Enviar Email
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
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
                            <button onClick={() => setIsConfigOpen(false)} className="p-2 text-slate-400 hover:bg-white hover:text-slate-600 rounded-lg transition-all"><X size={20} /></button>
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
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Contraseña</label>
                                    <input
                                        required
                                        type="password"
                                        placeholder="••••••••••••"
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900"
                                        value={emailConfig.smtp_pass}
                                        onChange={e => setEmailConfig({ ...emailConfig, smtp_pass: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-3 pt-4">
                                <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 hover:shadow-blue-200 transition-all flex items-center justify-center gap-2">
                                    <Check size={18} />
                                    Guardar y Probar Conexión
                                </button>
                                <p className="text-[10px] text-center text-slate-400 px-4">
                                    Al conectar tu email,NexusCRM podrá enviar y recibir correos directamente. Tus credenciales se guardan de forma segura y cifrada.
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
