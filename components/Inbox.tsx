
import React, { useState, useEffect, useRef } from 'react';
import { Contact, Message, Product, EmailTemplate, CurrentUser, Task, AiConfig } from '../types';
import { Send, Phone, Video, Search, Bot, Wand2, Mail, MessageCircle, FileText, Lock, StickyNote, CheckSquare, Plus, ChevronLeft, LayoutTemplate } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";

interface InboxProps {
  currentUser?: CurrentUser;
  contacts: Contact[];
  setContacts: (contacts: Contact[]) => void;
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  onMessageSent?: (contactId: string, message: Message) => void;
  products: Product[]; // Receives knowledge base
  templates: EmailTemplate[]; // Receives email templates
  initialContactId?: string | null; // Deep linking prop
  onNotify?: (title: string, msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  aiConfig?: AiConfig;
}

const WHATSAPP_TEMPLATES = [
  { id: 'intro', label: 'Bienvenida', text: 'Hola {name}, gracias por tu interés en nuestros productos. ¿Tienes unos minutos para conversar?' },
  { id: 'followup', label: 'Seguimiento', text: 'Hola {name}, te escribo para dar seguimiento a nuestra conversación anterior. ¿Has podido revisar la información?' },
  { id: 'meeting', label: 'Agendar Reunión', text: 'Hola {name}, me gustaría agendar una breve llamada para mostrarte cómo podemos ayudarte. ¿Qué horario te queda bien?' },
  { id: 'promo', label: 'Promoción', text: 'Hola {name}, tenemos una oferta especial esta semana que podría interesarte. ¿Te envío los detalles?' },
];

export const Inbox: React.FC<InboxProps> = ({ currentUser, contacts, setContacts, tasks, setTasks, onMessageSent, products, templates, initialContactId, onNotify, aiConfig }) => {
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [inputText, setInputText] = useState('');
  const [emailSubject, setEmailSubject] = useState(''); // State for email subject
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp'); // Channel selector
  const [inputMode, setInputMode] = useState<'message' | 'note'>('message'); // Toggle between public message and internal note
  const [createTaskFromNote, setCreateTaskFromNote] = useState(false); // Checkbox state
  const [isTyping, setIsTyping] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Detect Mobile View
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Filter contacts based on Role AND Search Term
  const baseContacts = contacts.filter(c => {
    if (currentUser?.role === 'MANAGER') return true;
    return c.owner === currentUser?.name || c.owner === 'Sin asignar' || c.owner === 'Unassigned';
  });

  const displayedContacts = baseContacts.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle Initial Selection (Deep Link) or Default
  useEffect(() => {
    if (initialContactId) {
      setSelectedContactId(initialContactId);
    } else if (!isMobile && !selectedContactId && displayedContacts.length > 0) {
      setSelectedContactId(displayedContacts[0].id);
    }
  }, [displayedContacts, selectedContactId, initialContactId, isMobile]);

  useEffect(() => {
    const contact = contacts.find(c => c.id === selectedContactId);
    if (contact) {
      setActiveContact(contact);
    }
  }, [selectedContactId, contacts]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeContact?.history]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeContact) return;

    // 1. Construct Message/Note Object
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'agent',
      type: inputMode, // 'message' or 'note'
      content: inputText,
      timestamp: 'Ahora',
      channel: inputMode === 'note' ? 'internal' : channel,
      subject: channel === 'email' ? emailSubject : undefined
    };

    try {
      const { api } = await import('../src/services/api');

      // WHATSAPP INTEGRATION: Try API First, Fallback to Web
      if (channel === 'whatsapp' && inputMode === 'message') {
        const phone = activeContact.phone.replace(/\D/g, '');
        let apiSuccess = false;

        try {
          const res = await api.meta.sendMessage(phone, inputText);
          if (res.success) {
            apiSuccess = true;
            if (onNotify) onNotify('WhatsApp Enviado', 'Mensaje enviado vía API Cloud.', 'success');
          } else {
            // API Failed (Not configured or 24h window closed)
            console.warn('WhatsApp API Error:', res.error);
            const isConfigError = res.error === 'WhatsApp not configured';
            
            if (onNotify) {
              onNotify(
                isConfigError ? 'Modo Manual' : 'Alerta de API', 
                isConfigError ? 'Abriendo WhatsApp Web...' : 'Fallo envío API (posible ventana 24h cerrada). Abriendo Web...', 
                'warning'
              );
            }
          }
        } catch (e) {
          console.error('WhatsApp API Exception', e);
        }

        // If API failed, open WhatsApp Web/Desktop
        if (!apiSuccess) {
          const encodedMessage = encodeURIComponent(inputText);
          const url = `https://wa.me/${phone}?text=${encodedMessage}`;
          window.open(url, '_blank');
        }
      }

      // SAVE TO DB
      if (inputMode === 'note') {
        await api.notes.create({
          contactId: activeContact.id,
          content: inputText,
          authorId: currentUser?.id
        });
      } else {
        await api.history.create({
          contactId: activeContact.id,
          content: inputText,
          sender: 'agent',
          type: 'message',
          channel: channel,
          subject: channel === 'email' ? emailSubject : undefined
        });
      }

      // 4. Reset UI
      setInputText('');
      setEmailSubject('');
      setCreateTaskFromNote(false);
      if (inputMode === 'note') setInputMode('message');

      // 5. Notify the user to refresh or use a global refresh if available
      // Ideally we would trigger a re-fetch of contacts from App.tsx
      if (onNotify) onNotify('Éxito', 'Información guardada en la base de datos.', 'success');


      // 5. Trigger Automation Hooks (only for actual messages)
      if (inputMode === 'message' && onMessageSent) {
        onMessageSent(activeContact.id, newMessage);
      }

      // 6. Reset UI
      setInputText('');
      setEmailSubject('');
      setCreateTaskFromNote(false);
      // Keep mode or reset? Usually reset to message to avoid accidents
      if (inputMode === 'note') setInputMode('message');

    } catch (e) {
      console.error("Failed to send message", e);
      if (onNotify) onNotify('Error', 'No se pudo guardar el mensaje en la base de datos.', 'error');
    }
  };

  const applyTemplate = (template: any) => {
    if (!activeContact) return;
    const name = activeContact.name.split(' ')[0];

    if (template.subject) {
      // Email Template
      let body = template.body.replace('{{name}}', name).replace('{name}', name);
      setEmailSubject(template.subject);
      setInputText(body);
      setChannel('email');
    } else {
      // WhatsApp Template
      let text = template.text.replace('{name}', name);
      setInputText(text);
      setChannel('whatsapp');
    }
    setInputMode('message');
  };

  const handleGeminiDraft = async () => {
    // 1. Check Configuration
    const apiKey = aiConfig?.apiKey || process.env.API_KEY;
    if (!apiKey) {
      if (onNotify) onNotify('Configuración Faltante', 'API Key no configurada para usar IA.', 'warning');
      return;
    }

    if (!activeContact) return;

    setIsTyping(true);
    try {
      let draft = '';

      // 2. Build Context
      const productContext = products.map(p =>
        `- ${p.name} (${p.category}): $${p.price} ${p.currency}. ${p.description}`
      ).join('\n');

      const attributionInfo = `
        Source: ${activeContact.source}
        Campaign: ${activeContact.utm_campaign || 'N/A'}
        Term/Form: ${activeContact.utm_term || 'N/A'}
      `;

      const context = activeContact.history.map(m => `${m.sender}: ${m.content}`).join('\n');
      const systemInstruction = `
        You are a professional sales agent using a CRM.
        Knowledge Base: ${productContext}
        Lead Context: ${attributionInfo}
        History: ${context}
        Instruction: Draft a concise response IN SPANISH (under 60 words).
        If the lead came from a specific campaign (e.g., 'Promo Verano'), mention it subtly.
        Last message: ${activeContact.history[activeContact.history.length - 1]?.content}
      `;

      // 3. Call Provider
      if (aiConfig?.provider === 'openai') {
        // OpenAI Implementation
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: aiConfig.model || 'gpt-4',
            messages: [
              { role: 'system', content: "You are a helpful sales assistant." },
              { role: 'user', content: systemInstruction }
            ],
            max_tokens: 150
          })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        draft = data.choices[0]?.message?.content || '';

      } else {
        // Gemini Implementation (Default)
        const ai = new GoogleGenerativeAI(apiKey);
        const modelName = aiConfig?.model || 'gemini-1.5-flash';
        const model = ai.getGenerativeModel({ model: modelName });

        const response = await model.generateContent(systemInstruction);
        const result = await response.response;
        draft = result.text();
      }

      if (draft) setInputText(draft.trim());

    } catch (error) {
      console.error("AI Error:", error);
      if (onNotify) onNotify('Error de IA', 'No se pudo generar el borrador. Verifica tu API Key.', 'error');
    } finally {
      setIsTyping(false);
    }
  };

  if (!activeContact && displayedContacts.length === 0) return <div className="p-8 text-center text-slate-500">No hay contactos encontrados.</div>;

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden">
      {/* Sidebar List */}
      <div className={`w-full md:w-80 border-r border-slate-200 bg-white flex flex-col ${activeContact ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar chats..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {displayedContacts.map(contact => {
            const lastMessage = contact.history[contact.history.length - 1];
            const needsReply = lastMessage?.sender === 'customer';

            return (
              <div
                key={contact.id}
                onClick={() => setSelectedContactId(contact.id)}
                className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${selectedContactId === contact.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}
              >
                <div className="flex justify-between mb-1">
                  <h4 className={`text-sm ${needsReply ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>{contact.name}</h4>
                  <span className={`text-xs ${needsReply ? 'text-blue-600 font-bold' : 'text-slate-400'}`}>
                    {lastMessage ? lastMessage.timestamp : ''}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <p className={`text-xs truncate max-w-[180px] ${needsReply ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                    {lastMessage ? (
                      lastMessage.type === 'note' ? <span className="text-amber-600 flex items-center gap-1"><Lock size={10} /> Nota Interna</span> :
                        (needsReply ? `↩️ ${lastMessage.content}` : `✓ ${lastMessage.content}`)
                    ) : contact.company}
                  </p>
                  {contact.owner === currentUser?.name && <span className="w-2 h-2 rounded-full bg-green-500"></span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-slate-100 ${!activeContact ? 'hidden md:flex' : 'flex'}`}>
        {activeContact ? (
          <>
            {/* Header */}
            <div className="bg-white px-4 py-3 border-b border-slate-200 flex justify-between items-center shadow-sm z-10">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    setSelectedContactId('');
                    setActiveContact(null);
                  }}
                  className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 rounded-full hover:bg-slate-100"
                >
                  <ChevronLeft size={20} />
                </button>
                <div>
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    {activeContact.name}
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200 hidden sm:inline-block">
                      {activeContact.owner === currentUser?.name ? 'Mis Leads' : activeContact.owner}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">{activeContact.company} • {activeContact.phone}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-colors"><Phone size={20} /></button>
                <button className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-colors"><Video size={20} /></button>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4"
              ref={scrollRef}
              style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}
            >
              {activeContact.history.map((msg) => {
                const isNote = msg.type === 'note' || msg.channel === 'internal';

                if (isNote) {
                  return (
                    <div key={msg.id} className="flex justify-center my-4">
                      <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-4 py-2 shadow-sm max-w-[90%] lg:max-w-[80%] text-sm flex flex-col items-center">
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-1">
                          <Lock size={10} /> Nota Interna • {msg.timestamp}
                        </div>
                        <p className="text-center italic">{msg.content}</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className={`flex ${msg.sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] lg:max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${msg.sender === 'agent'
                      ? (msg.channel === 'email' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-[#005c4b] text-white rounded-br-none')
                      : 'bg-white text-slate-800 rounded-bl-none border border-slate-200'
                      }`}>
                      {msg.channel === 'email' && <div className="text-xs opacity-70 mb-1 flex items-center gap-1"><Mail size={10} /> Email: {msg.subject}</div>}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      <p className={`text-[10px] mt-1 text-right ${msg.sender === 'agent' ? 'text-white/70' : 'text-slate-400'}`}>
                        {msg.timestamp}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input Area */}
            <div className={`p-3 lg:p-4 border-t border-slate-200 transition-colors duration-300 ${inputMode === 'note' ? 'bg-amber-50' : 'bg-white'}`}>

              {/* Mode Selector */}
              <div className="flex justify-between items-center mb-3">
                <div className="flex bg-slate-200/50 p-1 rounded-lg overflow-x-auto max-w-full">
                  <button onClick={() => { setInputMode('message'); setChannel('whatsapp'); }} className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all whitespace-nowrap ${inputMode === 'message' && channel === 'whatsapp' ? 'bg-[#25D366] text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>
                    <MessageCircle size={14} /> WhatsApp
                  </button>
                  <button onClick={() => { setInputMode('message'); setChannel('email'); }} className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all whitespace-nowrap ${inputMode === 'message' && channel === 'email' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Mail size={14} /> Email
                  </button>
                  <button onClick={() => setInputMode('note')} className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all whitespace-nowrap ${inputMode === 'note' ? 'bg-amber-500 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Lock size={14} /> Nota Interna
                  </button>
                </div>

                {/* Templates Dropdown */}
                {inputMode === 'message' && (channel === 'email' || channel === 'whatsapp') && (
                  <div className="relative ml-2">
                    <button 
                      onClick={() => setShowTemplates(!showTemplates)}
                      className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-all"
                    >
                      <LayoutTemplate size={14} /> 
                      <span className="hidden sm:inline">Plantillas</span>
                    </button>
                    
                    {showTemplates && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowTemplates(false)} />
                        <div className="absolute bottom-full right-0 mb-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-20 overflow-hidden animate-in zoom-in-95 duration-100">
                          <div className="p-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            {channel === 'email' ? 'Plantillas de Email' : 'Respuestas Rápidas'}
                          </div>
                          <div className="max-h-60 overflow-y-auto p-1">
                            {channel === 'email' ? (
                              templates.map(tpl => (
                                <button 
                                  key={tpl.id} 
                                  onClick={() => {
                                    applyTemplate(tpl);
                                    setShowTemplates(false);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors truncate"
                                >
                                  {tpl.name}
                                </button>
                              ))
                            ) : (
                              WHATSAPP_TEMPLATES.map(tpl => (
                                <button 
                                  key={tpl.id} 
                                  onClick={() => {
                                    applyTemplate(tpl);
                                    setShowTemplates(false);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-green-50 hover:text-green-700 rounded-lg transition-colors truncate"
                                >
                                  {tpl.label}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Note Extras */}
                {inputMode === 'note' && (
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-amber-800 bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 hover:bg-amber-200 transition-colors ml-auto">
                    <input
                      type="checkbox"
                      checked={createTaskFromNote}
                      onChange={e => setCreateTaskFromNote(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <CheckSquare size={14} /> <span className="hidden sm:inline">Crear Tarea</span>
                  </label>
                )}
              </div>

              {channel === 'email' && inputMode === 'message' && (
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Asunto del correo..."
                  className="w-full mb-2 px-3 py-2 bg-white border border-slate-300 rounded text-slate-900 text-sm focus:outline-none focus:border-blue-500"
                />
              )}

              <div className="relative flex items-end gap-2">
                {inputMode === 'message' && (
                  <button
                    onClick={handleGeminiDraft}
                    disabled={isTyping}
                    className="p-3 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    title="Generar respuesta con IA (usa Productos)"
                  >
                    <Wand2 size={20} className={isTyping ? "animate-spin" : ""} />
                  </button>
                )}

                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={inputMode === 'note' ? "Escribe una nota privada..." : (channel === 'whatsapp' ? "Escribe mensaje WhatsApp..." : "Redacta el correo...")}
                  className={`flex-1 border text-slate-900 placeholder-slate-500 rounded-lg focus:ring-2 focus:border-transparent resize-none p-3 text-sm max-h-32 min-h-[80px] ${
                    inputMode === 'note' ? 'bg-white border-amber-300 focus:ring-amber-500' : 
                    (channel === 'whatsapp' ? 'bg-white border-green-200 focus:ring-green-500' : 'bg-white border-slate-300 focus:ring-blue-500')
                  }`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />

                <button
                  onClick={handleSendMessage}
                  className={`p-3 text-white rounded-lg transition-all shadow-md active:scale-95 ${
                    inputMode === 'note' ? 'bg-amber-500 hover:bg-amber-600' : 
                    (channel === 'whatsapp' ? 'bg-[#25D366] hover:bg-[#128C7E]' : 'bg-blue-600 hover:bg-blue-700')
                  }`}
                >
                  {inputMode === 'note' ? <StickyNote size={20} /> : <Send size={20} />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
            <MessageCircle size={48} className="mb-4 text-slate-300" />
            <p className="text-lg font-medium text-slate-500">Selecciona un chat para comenzar</p>
            <p className="text-sm">Elige un contacto de la lista para ver el historial.</p>
          </div>
        )}
      </div>
    </div>
  );
};
