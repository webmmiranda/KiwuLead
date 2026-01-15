import React, { useState, useEffect, useRef } from 'react';
import {
    Inbox, Send, FileEdit, Archive, Trash2, AlertTriangle, RefreshCw, Plus,
    Search, Star, Paperclip, ChevronLeft, Eye, MousePointerClick, X, Wand2,
    MailOpen, Mail as MailIcon, Sparkles, Briefcase
} from 'lucide-react';
import { CurrentUser, AiConfig } from '../types';
import { api } from '../src/services/api';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { RichTextEditor } from './RichTextEditor';

interface Email {
    id: string;
    from: string;
    sender_name: string;
    to: string;
    subject: string;
    preview: string;
    body: string;
    date: string;
    folder: string;
    read: boolean;
    archived: boolean;
    attachments: any[];
    readAt?: string;
    isReadByRecipient?: boolean;
    clickCount?: number;
}

interface MailClientProps {
    currentUser: CurrentUser;
    onNotify?: (title: string, msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
    aiConfig?: AiConfig;
}

const FOLDERS = [
    { id: 'inbox', label: 'Bandeja de Entrada', icon: Inbox },
    { id: 'sent', label: 'Enviados', icon: Send },
    { id: 'drafts', label: 'Borradores', icon: FileEdit },
    { id: 'archived', label: 'Archivados', icon: Archive },
    { id: 'trash', label: 'Papelera', icon: Trash2 },
    { id: 'spam', label: 'Spam', icon: AlertTriangle },
];

export const MailClient: React.FC<MailClientProps> = ({ currentUser, onNotify, aiConfig }) => {
    const [activeFolder, setActiveFolder] = useState('inbox');
    const [emails, setEmails] = useState<Email[]>([]);
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCompose, setShowCompose] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Compose State
    const [composeTo, setComposeTo] = useState('');
    const [composeSubject, setComposeSubject] = useState('');
    const [composeBody, setComposeBody] = useState('');
    const [composeAttachments, setComposeAttachments] = useState<File[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [isDraftingAI, setIsDraftingAI] = useState(false);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [emailSummary, setEmailSummary] = useState<string | null>(null);
    const [isGeneratingReply, setIsGeneratingReply] = useState(false);
    const [isExtractingTask, setIsExtractingTask] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Responsive
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // Fetch Emails on folder change
    useEffect(() => {
        fetchEmails();
    }, [activeFolder, currentUser.id]);

    const fetchEmails = async () => {
        setIsLoading(true);
        try {
            const res = await api.emails.list(activeFolder, String(currentUser.id));
            if (res.success) {
                setEmails(res.emails || []);
            } else {
                setEmails([]);
            }
        } catch (e) {
            console.error('Failed to fetch emails', e);
            setEmails([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const res = await api.emails.sync(String(currentUser.id));
            if (res.success) {
                if (onNotify) onNotify('Sincronización', `Se sincronizaron ${res.synced} correos nuevos.`, 'success');
                fetchEmails();
            } else {
                if (onNotify) onNotify('Error', res.error || 'No se pudo sincronizar.', 'error');
            }
        } catch (e: any) {
            if (onNotify) onNotify('Error', e.message || 'Error de red al sincronizar.', 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSelectEmail = async (email: Email) => {
        setSelectedEmail(email);
        setEmailSummary(null); // Reset summary
        if (!email.read) {
            try {
                await api.emails.markRead(email.id, String(currentUser.id));
                setEmails(prev => prev.map(e => e.id === email.id ? { ...e, read: true } : e));
            } catch (e) { /* ignore */ }
        }
    };

    const handleEmailAction = async (action: 'trash' | 'spam' | 'archive' | 'restore' | 'delete_forever') => {
        if (!selectedEmail) return;
        try {
            await api.emails.post('/email_actions.php', {
                action,
                email_id: selectedEmail.id,
                user_id: currentUser.id
            });
            if (onNotify) onNotify('Éxito', `Correo movido a ${action === 'trash' ? 'papelera' : action}.`, 'success');
            setSelectedEmail(null);
            fetchEmails();
        } catch (e) {
            if (onNotify) onNotify('Error', 'No se pudo realizar la acción.', 'error');
        }
    };

    const handleSendEmail = async () => {
        if (!composeTo || !composeSubject) {
            if (onNotify) onNotify('Error', 'Destinatario y Asunto son requeridos.', 'warning');
            return;
        }
        setIsSending(true);
        try {
            const formData = new FormData();
            formData.append('user_id', String(currentUser.id));
            formData.append('to', composeTo);
            formData.append('subject', composeSubject);
            formData.append('body', composeBody);
            composeAttachments.forEach(f => formData.append('attachments[]', f));

            const res = await api.emails.send(formData);
            if (res.success) {
                if (onNotify) onNotify('Enviado', 'Correo enviado exitosamente.', 'success');
                setShowCompose(false);
                resetCompose();
                if (activeFolder === 'sent') fetchEmails();
            } else {
                if (onNotify) onNotify('Error', res.error || 'No se pudo enviar.', 'error');
            }
        } catch (e: any) {
            if (onNotify) onNotify('Error', e.message || 'Error al enviar correo.', 'error');
        } finally {
            setIsSending(false);
        }
    };

    const resetCompose = () => {
        setComposeTo('');
        setComposeSubject('');
        setComposeBody('');
        setComposeAttachments([]);
    };

    const handleAIDraft = async () => {
        const apiKey = aiConfig?.apiKey;
        if (!apiKey) {
            if (onNotify) onNotify('IA no configurada', 'Configura tu API Key en Ajustes.', 'warning');
            return;
        }
        setIsDraftingAI(true);
        try {
            const ai = new GoogleGenerativeAI(apiKey);
            const model = ai.getGenerativeModel({ model: aiConfig?.model || 'gemini-1.5-flash' });
            const prompt = `Genera un borrador de correo profesional en español para: "${composeSubject || 'Seguimiento comercial'}". Destinatario: ${composeTo || 'cliente'}. Sé conciso (máximo 100 palabras).`;
            const response = await model.generateContent(prompt);
            const result = await response.response;
            setComposeBody(result.text().trim());
        } catch (e) {
            if (onNotify) onNotify('Error de IA', 'No se pudo generar el borrador.', 'error');
        } finally {
            setIsDraftingAI(false);
        }
    };

    const handleSummarize = async () => {
        if (!selectedEmail || !aiConfig?.apiKey) return;
        setIsSummarizing(true);
        try {
            const ai = new GoogleGenerativeAI(aiConfig.apiKey);
            const model = ai.getGenerativeModel({ model: aiConfig.model || 'gemini-1.5-flash' });
            const prompt = `Resume el siguiente correo electrónico en 3-4 puntos clave en español. Sé conciso y directo:\n\nAsunto: ${selectedEmail.subject}\nCuerpo: ${selectedEmail.body.replace(/<[^>]*>?/gm, '')}`;
            const response = await model.generateContent(prompt);
            const result = await response.response;
            setEmailSummary(result.text());
        } catch (e) {
            if (onNotify) onNotify('Error', 'No se pudo resumir el correo.', 'error');
        } finally {
            setIsSummarizing(false);
        }
    };

    const handleSuggestReply = async () => {
        if (!selectedEmail || !aiConfig?.apiKey) return;
        setIsGeneratingReply(true);
        try {
            const ai = new GoogleGenerativeAI(aiConfig.apiKey);
            const model = ai.getGenerativeModel({ model: aiConfig.model || 'gemini-1.5-flash' });
            const prompt = `Genera una respuesta profesional y amable en español para el siguiente correo. El tono debe ser servicial:\n\nAsunto: ${selectedEmail.subject}\nRemitente: ${selectedEmail.sender_name}\nCuerpo recibido: ${selectedEmail.body.replace(/<[^>]*>?/gm, '')}`;
            const response = await model.generateContent(prompt);
            const result = await response.response;

            setComposeTo(selectedEmail.from);
            setComposeSubject(`Re: ${selectedEmail.subject}`);
            setComposeBody(result.text());
            setShowCompose(true);
        } catch (e) {
            if (onNotify) onNotify('Error', 'No se pudo generar la sugerencia.', 'error');
        } finally {
            setIsGeneratingReply(false);
        }
    };
    const handleExtractTask = async () => {
        if (!selectedEmail || !aiConfig?.apiKey) return;
        setIsExtractingTask(true);
        try {
            const ai = new GoogleGenerativeAI(aiConfig.apiKey);
            const model = ai.getGenerativeModel({ model: aiConfig.model || 'gemini-1.5-flash' });
            const prompt = `Analiza este correo y extrae la tarea principal que debo realizar. Responde ÚNICAMENTE con un objeto JSON (sin markdown) con estos campos: title (max 50 chars), description (detalles clave en español), priority (High, Normal, Low).
            Email Subject: ${selectedEmail.subject}
            Email Body: ${selectedEmail.body.replace(/<[^>]*>?/gm, '')}`;

            const response = await model.generateContent(prompt);
            const result = await response.response;
            const text = result.text().replace(/```json/g, '').replace(/```/g, '').trim();
            const taskData = JSON.parse(text);

            if (onNotify) onNotify('IA: Tarea Detectada', `Se sugiere crear la tarea: "${taskData.title}".`, 'info');
            console.log('Extracted Task:', taskData);
        } catch (e) {
            if (onNotify) onNotify('Error', 'No se pudo extraer la tarea.', 'error');
        } finally {
            setIsExtractingTask(false);
        }
    };

    const analyzeSentiment = (subject: string, preview: string) => {
        const text = (subject + ' ' + preview).toLowerCase();
        if (text.includes('urgente') || text.includes('asap') || text.includes('importante')) return { label: 'Urgente', color: 'bg-red-100 text-red-700' };
        if (text.includes('gracias') || text.includes('genial') || text.includes('excelente')) return { label: 'Positivo', color: 'bg-green-100 text-green-700' };
        if (text.includes('queja') || text.includes('problema') || text.includes('error')) return { label: 'Crítico', color: 'bg-orange-100 text-orange-700' };
        return { label: 'Neutral', color: 'bg-slate-100 text-slate-600' };
    };

    const filteredEmails = emails.filter(e =>
        e.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.sender_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.from.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- RENDER ---
    return (
        <div className="flex h-full bg-white overflow-hidden">
            {/* Sidebar Folders */}
            <div className={`w-56 bg-slate-50 border-r border-slate-200 flex-shrink-0 flex-col ${isMobile && selectedEmail ? 'hidden' : 'flex'}`}>
                <div className="p-4">
                    <button
                        onClick={() => setShowCompose(true)}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md transition-all"
                    >
                        <Plus size={18} /> Redactar
                    </button>
                </div>
                <nav className="flex-1 px-2 space-y-1">
                    {FOLDERS.map(folder => (
                        <button
                            key={folder.id}
                            onClick={() => { setActiveFolder(folder.id); setSelectedEmail(null); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeFolder === folder.id ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                            <folder.icon size={18} />
                            {folder.label}
                        </button>
                    ))}
                </nav>
                <div className="p-3 border-t border-slate-200">
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="w-full flex items-center justify-center gap-2 text-sm text-slate-600 hover:text-blue-600 py-2 rounded-lg hover:bg-slate-100 transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                        {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                    </button>
                </div>
            </div>

            {/* Email List */}
            <div className={`w-80 border-r border-slate-200 flex flex-col flex-shrink-0 ${isMobile && selectedEmail ? 'hidden' : 'flex'} ${isMobile ? 'w-full' : ''}`}>
                <div className="p-3 border-b border-slate-200">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Buscar correos..."
                            title="Buscar correos"
                            aria-label="Buscar correos"
                            className="w-full pl-9 pr-3 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-32 text-slate-400">Cargando...</div>
                    ) : filteredEmails.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-sm">
                            <MailIcon size={32} className="mb-2 opacity-50" />
                            No hay correos en esta carpeta.
                        </div>
                    ) : (
                        filteredEmails.map(email => (
                            <div
                                key={email.id}
                                onClick={() => handleSelectEmail(email)}
                                className={`p-3 border-b border-slate-100 cursor-pointer transition-colors ${selectedEmail?.id === email.id ? 'bg-blue-50' : 'hover:bg-slate-50'} ${!email.read ? 'bg-blue-50/50' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-sm truncate max-w-[180px] ${!email.read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                                        {activeFolder === 'sent' ? email.to : email.sender_name}
                                    </span>
                                    <span className="text-xs text-slate-400 flex-shrink-0">{email.date}</span>
                                </div>
                                <p className={`text-sm truncate ${!email.read ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{email.subject}</p>
                                <p className="text-xs text-slate-400 truncate mt-0.5">{email.preview}</p>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    {/* Sentiment Badge */}
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${analyzeSentiment(email.subject, email.preview).color}`}>
                                        {analyzeSentiment(email.subject, email.preview).label}
                                    </span>
                                    {/* Tracking Badge for Sent */}
                                    {activeFolder === 'sent' && (email.isReadByRecipient || (email.clickCount ?? 0) > 0) && (
                                        <div className="flex items-center gap-2 text-[10px]">
                                            {email.isReadByRecipient && <span className="flex items-center gap-0.5 text-green-600"><Eye size={10} /> Abierto</span>}
                                            {(email.clickCount ?? 0) > 0 && <span className="flex items-center gap-0.5 text-blue-600"><MousePointerClick size={10} /> {email.clickCount} clics</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Email Detail / HTML Viewer */}
            <div className={`flex-1 flex flex-col bg-white ${isMobile && !selectedEmail ? 'hidden' : 'flex'}`}>
                {selectedEmail ? (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {isMobile && (
                                    <button onClick={() => setSelectedEmail(null)} className="p-2 -ml-2 text-slate-500 hover:text-slate-700 rounded-full hover:bg-slate-100" title="Volver a la lista">
                                        <ChevronLeft size={20} />
                                    </button>
                                )}
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="font-bold text-slate-800">{selectedEmail.subject}</h2>
                                        {aiConfig?.apiKey && (
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={handleSummarize}
                                                    disabled={isSummarizing}
                                                    className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full border border-purple-100 hover:bg-purple-100 transition-colors flex items-center gap-1"
                                                >
                                                    <Wand2 size={10} className={isSummarizing ? 'animate-spin' : ''} />
                                                    {isSummarizing ? 'Resumiendo...' : 'Resumir'}
                                                </button>
                                                <button
                                                    onClick={handleSuggestReply}
                                                    disabled={isGeneratingReply}
                                                    title="Sugerir Respuesta con IA"
                                                    className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100 hover:bg-blue-100 transition-colors flex items-center gap-1"
                                                >
                                                    <MailIcon size={10} />
                                                    Sugerir Respuesta
                                                </button>
                                                <button
                                                    onClick={handleExtractTask}
                                                    disabled={isExtractingTask}
                                                    title="Extraer Tarea de este email"
                                                    className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full border border-green-100 hover:bg-green-100 transition-colors flex items-center gap-1"
                                                >
                                                    <Briefcase size={10} className={isExtractingTask ? 'animate-spin' : ''} />
                                                    {isExtractingTask ? 'Analizando...' : 'Extraer Tarea'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500">De: {selectedEmail.sender_name} &lt;{selectedEmail.from}&gt; • {selectedEmail.date}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {activeFolder !== 'trash' && (
                                    <button onClick={() => handleEmailAction('trash')} className="p-2 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-50" title="Mover a Papelera" aria-label="Mover a Papelera"><Trash2 size={18} /></button>
                                )}
                                {activeFolder !== 'archived' && activeFolder !== 'trash' && (
                                    <button onClick={() => handleEmailAction('archive')} className="p-2 text-slate-400 hover:text-amber-600 rounded-full hover:bg-amber-50" title="Archivar" aria-label="Archivar"><Archive size={18} /></button>
                                )}
                                {activeFolder === 'trash' && (
                                    <>
                                        <button onClick={() => handleEmailAction('restore')} className="p-2 text-slate-400 hover:text-green-600 rounded-full hover:bg-green-50" title="Restaurar" aria-label="Restaurar"><RefreshCw size={18} /></button>
                                        <button onClick={() => handleEmailAction('delete_forever')} className="p-2 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-50" title="Eliminar Permanentemente" aria-label="Eliminar Permanentemente"><Trash2 size={18} /></button>
                                    </>
                                )}
                            </div>
                        </div>
                        {/* AI Summary Box */}
                        {emailSummary && (
                            <div className="mx-4 mt-2 p-3 bg-purple-50 border border-purple-100 rounded-lg animate-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-2 mb-1 text-purple-700 font-bold text-xs">
                                    <Sparkles size={14} /> Resumen de IA
                                    <button onClick={() => setEmailSummary(null)} className="ml-auto text-purple-400 hover:text-purple-600"><X size={14} /></button>
                                </div>
                                <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                                    {emailSummary}
                                </div>
                            </div>
                        )}

                        {/* Body - Sandboxed iFrame */}
                        <div className="flex-1 overflow-hidden p-4">
                            <iframe
                                srcDoc={`<!DOCTYPE html><html><head><style>body{font-family:sans-serif;line-height:1.6;color:#333;padding:10px;}</style></head><body>${selectedEmail.body}</body></html>`}
                                sandbox="allow-same-origin"
                                className="w-full h-full border-none rounded-lg bg-slate-50"
                                title="Email Content"
                            />
                        </div>
                        {/* Attachments */}
                        {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                            <div className="p-3 border-t border-slate-200 flex items-center gap-2 flex-wrap">
                                <Paperclip size={14} className="text-slate-400" />
                                {selectedEmail.attachments.map((att: any, i: number) => (
                                    <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded">{att.name}</a>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <MailOpen size={48} className="mb-3 opacity-50" />
                        <p className="text-lg font-medium">Selecciona un correo para ver</p>
                    </div>
                )}
            </div>

            {/* Compose Modal */}
            {showCompose && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4 md:slide-in-from-bottom-0 duration-300">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-200">
                            <h3 className="font-bold text-lg text-slate-800">Nuevo Correo</h3>
                            <button onClick={() => { setShowCompose(false); resetCompose(); }} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100" title="Cerrar"><X size={20} /></button>
                        </div>
                        {/* Modal Body */}
                        <div className="p-4 flex-1 overflow-y-auto space-y-3">
                            <input
                                type="email"
                                value={composeTo}
                                onChange={e => setComposeTo(e.target.value)}
                                placeholder="Para: email@ejemplo.com"
                                title="Destinatario"
                                aria-label="Destinatario"
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <input
                                type="text"
                                value={composeSubject}
                                onChange={e => setComposeSubject(e.target.value)}
                                placeholder="Asunto"
                                title="Asunto"
                                aria-label="Asunto"
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <RichTextEditor
                                content={composeBody}
                                onChange={setComposeBody}
                                placeholder="Escribe tu mensaje..."
                                minHeight="200px"
                            />
                            {/* Attachments Preview */}
                            {composeAttachments.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {composeAttachments.map((f, i) => (
                                        <span key={i} className="text-xs bg-slate-100 px-2 py-1 rounded flex items-center gap-1">
                                            <Paperclip size={12} /> {f.name}
                                            <button onClick={() => setComposeAttachments(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700" title="Quitar adjunto"><X size={12} /></button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* Modal Footer */}
                        <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                            <div className="flex items-center gap-2">
                                <input type="file" multiple ref={fileInputRef} className="hidden" aria-label="Adjuntar archivos" onChange={e => { if (e.target.files) setComposeAttachments(prev => [...prev, ...Array.from(e.target.files!)]); }} />
                                <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-500 hover:text-blue-600 rounded-full hover:bg-blue-50" title="Adjuntar Archivo"><Paperclip size={20} /></button>
                                <button onClick={handleAIDraft} disabled={isDraftingAI} className="p-2 text-slate-500 hover:text-purple-600 rounded-full hover:bg-purple-50" title="Generar Borrador con IA"><Wand2 size={20} className={isDraftingAI ? 'animate-spin' : ''} /></button>
                            </div>
                            <button
                                onClick={handleSendEmail}
                                disabled={isSending}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-5 rounded-xl shadow transition-all disabled:opacity-50"
                            >
                                <Send size={16} />
                                {isSending ? 'Enviando...' : 'Enviar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
