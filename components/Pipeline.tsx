
import React, { useState, useEffect } from 'react';
import { Contact, LeadStatus, CurrentUser, Product, Source, TeamMember, AiConfig, PipelineColumn, Task } from '../types';
import { MoreHorizontal, Phone, Mail, AlertCircle, UserPlus, X, Filter, Trash2, StickyNote, ArrowLeft, Clock, User, MessageSquare, BrainCircuit, Sparkles, Loader2, ChevronRight, Plus, FileText, Download, Send, CheckCircle, Calendar as CalendarIcon, ArrowRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { QuoteGenerator } from './QuoteGenerator';
import { WhatsAppModal } from './WhatsAppModal';
import { formatCurrency } from '../src/utils/currency';

interface DealCardProps {
  contact: Contact;
  onDragStart: (e: React.DragEvent, id: string) => void;
  currentUser: CurrentUser;
  onClaim: (id: string) => void;
  onClick: (contact: Contact) => void;
  companyCurrency: 'USD' | 'MXN' | 'CRC' | 'COP';
  pipelineColumns: PipelineColumn[];
  onMoveToStage: (id: string, stageId: string) => void;
}

const DealCard: React.FC<DealCardProps> = ({ contact, onDragStart, currentUser, onClaim, onClick, companyCurrency, pipelineColumns, onMoveToStage }) => {
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  // Logic to determine if a deal is "stale" (inactive for too long)
  const isStale = contact.lastActivity.includes('días') && parseInt(contact.lastActivity) > 3;
  const isUnassigned = contact.owner === 'Sin asignar' || contact.owner === 'Unassigned';

  // Calculate internal notes count
  const internalNotesCount = contact.notes.length + contact.history.filter(h => h.type === 'note' || h.channel === 'internal').length;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, contact.id)}
      onClick={() => onClick(contact)}
      className={`bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-all cursor-grab active:cursor-grabbing mb-3 group relative ${isStale ? 'border-l-4 border-l-red-400' : 'border-slate-200'} active:scale-95`}
    >
      {/* Health Indicator & Stale Warning */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5">
        {!contact.bant && (
          <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" title="BANT pendiente" />
        )}
        {isStale && (
          <div className="text-red-400" title="Sin actividad reciente (> 3 días)">
            <AlertCircle size={14} />
          </div>
        )}
      </div>

      <div className="flex justify-between items-start mb-2 pr-4">
        <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full font-medium truncate max-w-[120px]">
          {contact.company}
        </span>
        {internalNotesCount > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100" title={`${internalNotesCount} Notas internas`}>
            <StickyNote size={10} /> {internalNotesCount}
          </div>
        )}
      </div>

      <h4 className="font-semibold text-slate-800 truncate">{contact.name}</h4>
      <p className="text-slate-500 text-sm mt-1 mb-3">{formatCurrency(contact.value, companyCurrency || 'USD')}</p>

      {/* Action Area */}
      {isUnassigned ? (
        <button
          onClick={(e) => { e.stopPropagation(); onClaim(contact.id); }}
          className="w-full mt-2 mb-2 bg-blue-50 text-blue-700 text-xs py-1.5 rounded border border-blue-100 font-bold hover:bg-blue-100 flex items-center justify-center gap-1 transition-colors"
        >
          <UserPlus size={12} /> Asignarme
        </button>
      ) : (
        <div className="flex justify-between items-center text-slate-400 text-xs mt-3 border-t border-slate-100 pt-3 relative">
          <div className="flex space-x-2">
            <Phone size={14} className="hover:text-blue-600 cursor-pointer" />
            <Mail size={14} className="hover:text-blue-600 cursor-pointer" />
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`${contact.probability > 80 ? 'text-green-600 font-bold' : ''}`}>{contact.probability}% prob.</span>
            
            {/* Mobile/Quick Move Button */}
            <div className="relative">
                <button 
                    onClick={(e) => { e.stopPropagation(); setShowMoveMenu(!showMoveMenu); }}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600"
                    title="Mover etapa"
                >
                    <ArrowRight size={14} />
                </button>
                
                {showMoveMenu && (
                    <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden">
                        <div className="p-2 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500">
                            Mover a etapa:
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                            {pipelineColumns.map(col => (
                                <button
                                    key={col.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onMoveToStage(contact.id, col.id);
                                        setShowMoveMenu(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 ${contact.status === col.id ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700'}`}
                                >
                                    <div className={`w-2 h-2 rounded-full ${col.color.replace('border-', 'bg-').replace('-500', '-400')}`}></div>
                                    {col.title}
                                </button>
                            ))}
                            <div className="border-t border-slate-100 my-1"></div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onMoveToStage(contact.id, 'Won');
                                    setShowMoveMenu(false);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-green-50 hover:text-green-700 flex items-center gap-2 text-green-600 font-medium"
                            >
                                <CheckCircle size={12} /> Ganado
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onMoveToStage(contact.id, 'Lost');
                                    setShowMoveMenu(false);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 hover:text-red-700 flex items-center gap-2 text-red-600 font-medium"
                            >
                                <X size={12} /> Perdido
                            </button>
                        </div>
                    </div>
                )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-2 text-[10px] text-slate-400 flex justify-between">
        <span>{contact.owner === 'Unassigned' || contact.owner === 'Sin asignar' ? 'Libre' : contact.owner.split(' ')[0]}</span>
        <span>{contact.lastActivity}</span>
      </div>
    </div>
  );
};

interface PipelineProps {
  currentUser?: CurrentUser;
  contacts: Contact[];
  onStatusChange: (contactId: string, newStatus: string, lostReason?: string) => void;
  onNavigateToChat: (contactId: string) => void;
  products?: Product[];
  onNotify?: (title: string, msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  onAddDeal?: (contact: Contact) => void;
  onAssign?: (contactId: string, newOwner: string) => void;
  onUpdateContact?: (contactId: string, updates: Partial<Contact>) => void;
  onAddTask?: (task: Task) => void;
  team?: TeamMember[];
  aiConfig?: AiConfig;
  companyCurrency?: 'USD' | 'MXN' | 'CRC' | 'COP';
}

export const Pipeline: React.FC<PipelineProps> = ({ currentUser, contacts, onStatusChange, onNavigateToChat, products = [], onNotify, onAddDeal, onAssign, onUpdateContact, onAddTask, team = [], aiConfig, companyCurrency = 'USD' }) => {
  const [pipelineColumns, setPipelineColumns] = useState<PipelineColumn[]>([]);
  const [loadingPipeline, setLoadingPipeline] = useState(true);

  useEffect(() => {
    const fetchPipeline = async () => {
      try {
        const { api } = await import('../src/services/api');
        const data = await api.pipeline.list();
        // Map API data to PipelineColumn format
        const cols: PipelineColumn[] = data.map((s: any) => ({
            id: s.keyName, // Use keyName as ID for compatibility with Contact.status
            title: s.name,
            color: s.color,
            probability: Math.max(0, Math.min(100, Number(s.probability ?? 0)))
        }));
        setPipelineColumns(cols);
      } catch (error) {
        console.error("Failed to load pipeline stages", error);
        if (onNotify) onNotify('Error', 'No se pudieron cargar las etapas del pipeline.', 'error');
      } finally {
        setLoadingPipeline(false);
      }
    };
    fetchPipeline();
  }, []);

  // Check if AI is configured (either via settings or env)
  const hasAiAccess = !!(aiConfig?.apiKey || process.env.API_KEY);

  const [selectedAgent, setSelectedAgent] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'info' | 'ai' | 'qual' | 'docs'>('info');

  // Detailed View State
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [bantForm, setBantForm] = useState<Contact['bant']>({});

  // New Deal Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: '10:00',
    description: '',
    priority: 'Normal' as 'High' | 'Normal' | 'Low',
    assignedTo: currentUser?.name || 'Me',
    reminder: {
        enabled: true,
        timeValue: 30,
        timeUnit: 'minutes' as 'minutes' | 'hours' | 'days'
    }
  });
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [newDeal, setNewDeal] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    value: 0
  });

  // AI Analysis State
  const [aiAnalysis, setAiAnalysis] = useState<{ score: number; advice: string; nextStep: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [leadMatches, setLeadMatches] = useState<Contact[]>([]);

  // Logic: 
  // 1. If Manager: Show All OR filter by selected Agent.
  // 2. If Sales Rep: Show ONLY their deals AND unassigned (to claim).
  const displayedContacts = contacts.filter(c => {
    if (currentUser?.role === 'MANAGER') {
      if (selectedAgent === 'ALL') return true;
      if (selectedAgent === 'Unassigned') return c.owner === 'Sin asignar' || c.owner === 'Unassigned';
      return c.owner === selectedAgent;
    } else {
      // Sales Rep View
      return c.owner === currentUser?.name || c.owner === 'Sin asignar' || c.owner === 'Unassigned';
    }
  });

  useEffect(() => {
    const qName = newDeal.name.trim().toLowerCase();
    const qEmail = newDeal.email.trim().toLowerCase();
    if (!qName && !qEmail) {
      setLeadMatches([]);
      return;
    }
    const matches = contacts.filter(c =>
      (qEmail && c.email && c.email.toLowerCase() === qEmail) ||
      (qName && c.name.toLowerCase().includes(qName))
    ).slice(0, 5);
    setLeadMatches(matches);
  }, [newDeal.name, newDeal.email, contacts]);

  // State for Lost Reason Modal
  const [isLostModalOpen, setIsLostModalOpen] = useState(false);
  const [pendingLostContactId, setPendingLostContactId] = useState<string | null>(null);
  const [lostReason, setLostReason] = useState('Precio demasiado alto');

  // State for Won Deal Modal
  const [isWonModalOpen, setIsWonModalOpen] = useState(false);
  const [pendingWonContactId, setPendingWonContactId] = useState<string | null>(null);
  const [wonForm, setWonForm] = useState({
    products: [] as string[],
    finalPrice: 0,
    closingNotes: ''
  });

  const handleMoveDeal = (contactId: string, status: string) => {
    // Re-use logic for special statuses
    if (status === 'Lost') {
      setPendingLostContactId(contactId);
      setIsLostModalOpen(true);
      return;
    }
    if (status === 'Won') {
      const contact = contacts.find(c => c.id === contactId);
      if (contact) {
        setPendingWonContactId(contactId);
        setWonForm({
          products: contact.productInterests || [],
          finalPrice: contact.value,
          closingNotes: ''
        });
        setIsWonModalOpen(true);
      }
      return;
    }
    onStatusChange(contactId, status);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('contactId', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const contactId = e.dataTransfer.getData('contactId');

    // If moving to LOST, trigger modal instead of immediate update
    if (status === 'Lost') {
      setPendingLostContactId(contactId);
      setIsLostModalOpen(true);
      return;
    }

    // If moving to WON, trigger modal to capture final details
    if (status === 'Won') {
      const contact = contacts.find(c => c.id === contactId);
      if (contact) {
        setPendingWonContactId(contactId);
        setWonForm({
          products: contact.productInterests || [],
          finalPrice: contact.value,
          closingNotes: ''
        });
        setIsWonModalOpen(true);
      }
      return;
    }

    // Delegate validation and update to parent
    onStatusChange(contactId, status);
  };

  const confirmLostDeal = () => {
    if (pendingLostContactId) {
      onStatusChange(pendingLostContactId, 'Lost', lostReason);
      setIsLostModalOpen(false);
      setPendingLostContactId(null);
    }
  };

  const confirmWonDeal = () => {
    if (pendingWonContactId) {
      const closingData = {
        wonData: {
          ...wonForm,
          closedAt: new Date().toLocaleDateString()
        }
      };

      // Update contact with closing data and change status
      onUpdateContact?.(pendingWonContactId, closingData);
      onStatusChange(pendingWonContactId, 'Won');

      setIsWonModalOpen(false);
      setPendingWonContactId(null);

      if (onNotify) onNotify('¡Felicidades!', 'Trato cerrado con éxito.', 'success');
    }
  };

  const handleClaimDeal = (id: string) => {
    if (!currentUser) return;
    if (confirm(`¿Asignarte este lead a ti (${currentUser.name})?`)) {
      // Previously this only showed a notification. Now it updates state.
      if (onAssign) {
        onAssign(id, currentUser.name);
      }
    }
  };

  const handleOpenContact = (c: Contact) => {
    setSelectedContact(c);
    setBantForm(c.bant || {});
    setActiveTab('info');
    setAiAnalysis(null);
  };

  const handleUpdateBant = () => {
    if (selectedContact && onUpdateContact) {
      onUpdateContact(selectedContact.id, { bant: bantForm });
    }
  };

  const handleSaveQuote = (quote: { id: string; name: string; type: string; url: string; createdAt: string }) => {
    if (selectedContact && onUpdateContact) {
      const currentDocs = selectedContact.documents || [];
      onUpdateContact(selectedContact.id, { documents: [quote, ...currentDocs] });
    }
  };

  const handleCreateDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddDeal) return;

    const duplicate =
      contacts.find(c => !!newDeal.email && c.email?.toLowerCase() === newDeal.email.toLowerCase()) ||
      contacts.find(c => c.name.toLowerCase() === newDeal.name.toLowerCase() && (!!newDeal.phone ? c.phone === newDeal.phone : true));
    if (duplicate) {
      if (onNotify) onNotify('Duplicado', 'Ya existe un lead con esos datos. Abriendo el existente.', 'warning');
      setSelectedContact(duplicate);
      setIsModalOpen(false);
      return;
    }

    const contact: Contact = {
      id: Date.now().toString(),
      name: newDeal.name,
      company: newDeal.company,
      email: newDeal.email,
      phone: newDeal.phone,
      value: Number(newDeal.value),
      status: LeadStatus.NEW,
      source: Source.REFERRAL, // Default for manual creation
      owner: currentUser?.name || 'Unassigned',
      createdAt: new Date().toISOString(),
      lastActivity: 'Ahora',
      tags: [],
      probability: pipelineColumns.find(c => c.id === 'New')?.probability || 5, // Default start probability
      notes: [],
      history: []
    };

    onAddDeal(contact);
    setIsModalOpen(false);
    setNewDeal({ name: '', company: '', email: '', phone: '', value: 0 });
  };

  const handleCreateTaskClick = () => {
    if (!selectedContact) return;
    setNewTask({
        title: '',
        dueDate: new Date().toISOString().split('T')[0],
        dueTime: '10:00',
        description: '',
        priority: 'Normal',
        assignedTo: currentUser?.name || 'Me',
        reminder: {
            enabled: true,
            timeValue: 30,
            timeUnit: 'minutes'
        }
    });
    setIsTaskModalOpen(true);
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact || !newTask.title) return;

    try {
      const { api } = await import('../src/services/api');
      const taskData: any = {
        title: newTask.title,
        type: 'Task',
        dueDate: newTask.dueDate,
        dueTime: newTask.dueTime,
        description: newTask.description,
        status: 'Pending',
        priority: newTask.priority,
        assignedTo: newTask.assignedTo,
        relatedContactName: selectedContact.name,
        relatedContactId: selectedContact.id,
        reminder: newTask.reminder
      };

      const res = await api.tasks.create(taskData);

      if (onAddTask) {
        const createdTask: Task = {
          ...taskData,
          id: res.id || Date.now().toString(),
        };
        onAddTask(createdTask);
      }

      if (onNotify) onNotify('Tarea Creada', 'Tarea guardada correctamente.', 'success');
      setIsTaskModalOpen(false);
    } catch (e) {
      console.error(e);
      if (onNotify) onNotify('Error', 'No se pudo crear la tarea.', 'error');
    }
  };

  const runAiAnalysis = async () => {
    const apiKey = aiConfig?.apiKey || process.env.API_KEY;
    if (!selectedContact || !apiKey) {
      if (onNotify) onNotify('Error de AI', 'Falta la API Key o no hay contacto seleccionado.', 'error');
      return;
    }
    setIsAnalyzing(true);
    try {
      const historyText = selectedContact.history.map(m => `${m.sender}: ${m.content}`).join('\n');
      const productContext = products.map(p => `${p.name} ($${p.price})`).join(', ');

      const systemInstruction = `
            Actúa como un Experto Senior en Ventas (Sales Coach). Analiza esta oportunidad de venta.
            
            Contexto:
            - Cliente: ${selectedContact.name} (${selectedContact.company})
            - Valor del Trato: $${selectedContact.value}
            - Etapa Actual: ${selectedContact.status}
            - Productos Disponibles: ${productContext}
            - Calificación BANT: ${selectedContact.bant ? JSON.stringify(selectedContact.bant) : 'No calificado aún'}
            
            Historial de Conversación:
            ${historyText}

            Instrucciones:
            Analiza la probabilidad de cierre basándote en el interés mostrado y el historial.
            Proporciona consejos tácticos para mover el trato a la siguiente etapa.
            
            Devuelve ÚNICAMENTE un objeto JSON válido (sin bloques de código ni markdown):
            {
                "score": (entero 0-100 representando la probabilidad de cierre),
                "advice": (cadena, 1-2 oraciones de consejo estratégico EN ESPAÑOL),
                "nextStep": (cadena, una acción específica a tomar ahora mismo EN ESPAÑOL)
            }
          `;

      let jsonStr = '';

      if (aiConfig?.provider === 'openai') {
        // OpenAI Logic
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: aiConfig.model || 'gpt-4',
            messages: [
              { role: 'system', content: "You are a helpful JSON response generator." },
              { role: 'user', content: systemInstruction }
            ],
            max_tokens: 300,
            response_format: { type: "json_object" }
          })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        jsonStr = data.choices[0]?.message?.content || '{}';
      } else {
        // Gemini Logic
        const ai = new GoogleGenerativeAI(apiKey);
        const modelName = aiConfig?.model || 'gemini-1.5-flash';

        // Ensure we are using a supported model
        const validModelName = modelName.includes('gemini-pro') ? 'gemini-1.5-flash' : modelName;

        const model = ai.getGenerativeModel({ model: validModelName });

        const response = await model.generateContent(systemInstruction);
        const result = await response.response;
        const text = result.text();
        jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      }

      const aiResult = JSON.parse(jsonStr);
      setAiAnalysis(aiResult);
      if (onNotify) onNotify('Análisis Completado', 'Tu Sales Coach ha generado nuevas recomendaciones.', 'success');

    } catch (error) {
      console.error("AI Analysis Failed", error);
      setAiAnalysis({ score: 50, advice: "No se pudo conectar con la IA. Revisa tu conexión.", nextStep: "Intentar manualmente." });
      if (onNotify) onNotify('Error de Análisis', 'Hubo un problema al consultar la IA.', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-6 overflow-hidden relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Embudo de Ventas</h2>
          <p className="text-slate-500 text-sm">Arrastra tarjetas para actualizar etapas.</p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          {currentUser?.role === 'MANAGER' && (
            <div className="relative flex-1 md:flex-none">
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="w-full pl-8 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
              >
                <option value="ALL">Todos los Agentes</option>
                <option value="Unassigned">Sin Asignar</option>
                {team.filter(m => m.role === 'Sales').map(m => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            </div>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 flex-1 md:flex-none"
          >
            <Plus size={16} /> <span className="hidden md:inline">Nuevo Trato</span><span className="md:hidden">Nuevo</span>
          </button>
        </div>
      </div>

      {/* 
        Responsive Change: 
        - Mobile: flex-col (Vertical Stack), overflow-y-auto (Scroll down)
        - Desktop (md): flex-row (Horizontal Stack), overflow-x-auto (Scroll sideways), overflow-y-hidden
      */}
      <div className="flex-1 overflow-y-auto md:overflow-y-hidden md:overflow-x-auto pb-4">
        {loadingPipeline ? (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
        ) : (
        <div className="flex flex-col md:flex-row h-auto md:h-full md:min-w-max gap-4 md:space-x-4">
          {pipelineColumns.map((col) => {
            const deals = displayedContacts.filter((c) => c.status === col.id);
            const totalValue = deals.reduce((sum, c) => sum + c.value, 0);
            const weightedValue = deals.reduce((sum, c) => sum + (c.value * (c.probability / 100)), 0);

            return (
              <div
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                className="w-full md:w-80 flex flex-col rounded-xl bg-slate-50/50 transition-colors hover:bg-slate-100/50 min-h-[300px] md:h-full"
              >
                <div className={`p-4 border-t-4 ${col.color} bg-slate-100 rounded-t-xl sticky top-0 z-10 md:static shadow-sm md:shadow-none`}>
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                      {col.title} 
                      <span className="text-xs font-normal text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full">{col.probability || 0}%</span>
                    </h3>
                    <span className="bg-white text-slate-500 px-2 py-0.5 rounded-md text-xs font-bold border border-slate-200">
                      {deals.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-xs text-slate-500 font-medium">
                      Total: <span className="text-slate-700">{formatCurrency(totalValue, companyCurrency)}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Ponderado: <span className="text-slate-600">{formatCurrency(Math.round(weightedValue), companyCurrency)}</span>
                    </p>
                  </div>
                </div>

                {/* On mobile we want height to grow, on desktop we want scroll */}
                <div className="p-3 flex-1 overflow-y-auto custom-scrollbar">
                  {deals.length > 0 ? (
                    deals.map((contact) => (
                      <DealCard
                        key={contact.id}
                        contact={contact}
                        onDragStart={handleDragStart}
                        currentUser={currentUser!}
                        onClaim={handleClaimDeal}
                        onClick={handleOpenContact}
                        companyCurrency={companyCurrency}
                        pipelineColumns={pipelineColumns}
                        onMoveToStage={handleMoveDeal}
                      />
                    ))
                  ) : (
                    <div className="h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-sm">
                      Vacío
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* LOST DROP ZONE - Modified for mobile visibility */}
          <div
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'Lost')}
            className="w-full md:w-24 flex flex-row md:flex-col h-24 md:h-full rounded-xl bg-red-50 border border-dashed border-red-200 opacity-80 hover:opacity-100 transition-all hover:bg-red-100 items-center justify-center group flex-shrink-0"
            title="Arrastra aquí para marcar como Perdido"
          >
            <div className="flex flex-row md:flex-col items-center justify-center text-red-400 font-medium group-hover:text-red-600 transition-colors gap-2">
              <Trash2 size={24} className="md:mb-4" />
              <span className="text-xs font-bold uppercase tracking-wide md:vertical-text md:writing-mode-vertical">Marcar Perdido</span>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* --- DEAL DETAILS SLIDE-OVER --- */}
      {selectedContact && (
        <div className="absolute inset-y-0 right-0 w-full md:w-96 bg-white shadow-2xl border-l border-slate-200 transform transition-transform duration-300 ease-in-out z-[60] flex flex-col slide-in-from-right">
          <div className="p-6 border-b border-slate-100 bg-slate-50">
            <div className="flex justify-between items-start mb-4">
              <button onClick={() => setSelectedContact(null)} className="md:hidden text-slate-600">
                <ArrowLeft />
              </button>
              <button onClick={() => setSelectedContact(null)} className="hidden md:block text-slate-400 hover:text-slate-600 ml-auto">
                <X size={24} />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-lg font-bold shadow-sm">
                {selectedContact.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 leading-tight">{selectedContact.name}</h3>
                <p className="text-sm text-slate-500">{selectedContact.company}</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-slate-200/50 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('info')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'info' ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Información
              </button>
              {hasAiAccess && (
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${activeTab === 'ai' ? 'bg-blue-600 text-white shadow' : 'text-blue-600 hover:bg-blue-50'}`}
                >
                  <Sparkles size={12} /> AI Coach
                </button>
              )}
              <button
                onClick={() => setActiveTab('qual')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${activeTab === 'qual' ? 'bg-amber-500 text-white shadow' : 'text-amber-600 hover:bg-amber-50'}`}
              >
                <Filter size={12} /> BANT
              </button>
              <button
                onClick={() => setActiveTab('docs')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${activeTab === 'docs' ? 'bg-green-600 text-white shadow' : 'text-green-600 hover:bg-green-50'}`}
              >
                <FileText size={12} /> Docs
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {activeTab === 'info' && (
              <>
                <div className="flex flex-wrap gap-2 mb-6">
                  <button
                    onClick={() => onNavigateToChat(selectedContact.id)}
                    className="flex-1 min-w-[120px] bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 shadow-sm flex items-center justify-center gap-2"
                  >
                    <MessageSquare size={18} /> Ir al Chat
                  </button>
                  <button
                    onClick={() => setIsWhatsAppModalOpen(true)}
                    className="flex-1 min-w-[120px] bg-[#25D366] text-white py-2 rounded-lg font-medium hover:bg-[#128C7E] shadow-sm flex items-center justify-center gap-2"
                  >
                    <Send size={18} /> WhatsApp
                  </button>
                  <button className="flex-1 min-w-[120px] bg-white border border-slate-300 text-slate-700 py-2 rounded-lg font-medium hover:bg-slate-50 flex items-center justify-center gap-2">
                    <Phone size={18} /> Llamar
                  </button>
                  <button onClick={handleCreateTaskClick} className="flex-1 min-w-[120px] bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 shadow-sm flex items-center justify-center gap-2">
                    <Clock size={18} /> Tarea
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                    <p className="text-xs text-slate-500 uppercase font-semibold">Valor</p>
                    <p className="text-lg font-bold text-slate-900">{formatCurrency(selectedContact.value, companyCurrency)}</p>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                    <p className="text-xs text-slate-500 uppercase font-semibold">Probabilidad</p>
                    <p className="text-lg font-bold text-slate-900">{selectedContact.probability}%</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <User size={16} className="text-blue-600" /> Info Contacto
                  </h4>
                  <ul className="space-y-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <li className="flex justify-between border-b border-slate-200 pb-1"><span>Email:</span> <span className="text-slate-900 font-medium truncate max-w-[180px]">{selectedContact.email}</span></li>
                    <li className="flex justify-between border-b border-slate-200 pb-1"><span>Tel:</span> <span className="text-slate-900 font-medium">{selectedContact.phone}</span></li>
                    <li className="flex justify-between border-b border-slate-200 pb-1"><span>Fuente:</span> <span className="text-slate-900 font-medium">{selectedContact.source}</span></li>
                    <li className="flex justify-between"><span>Dueño:</span> <span className="text-blue-600 font-medium">{selectedContact.owner}</span></li>
                  </ul>
                </div>

                {/* Product Interests Alignment */}
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 shadow-inner">
                  <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Sparkles size={16} className="text-blue-600" /> Concordancia de Producto
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {products.map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          const current = selectedContact.productInterests || [];
                          const updated = current.includes(p.name)
                            ? current.filter(i => i !== p.name)
                            : [...current, p.name];
                          onUpdateContact?.(selectedContact.id, { productInterests: updated });
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${(selectedContact.productInterests || []).includes(p.name)
                          ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                          }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-3 italic text-center">Selecciona productos para calibrar la atribución en reportes.</p>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Clock size={16} className="text-blue-600" /> Historial & Notas
                  </h4>

                  {/* Manual Note Input */}
                  <div className="mb-6 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <textarea
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      placeholder="Escribe una nota sobre la conversación, detalles importantes, etc..."
                      className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white mb-2"
                      rows={3}
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          if (onUpdateContact && selectedContact && newNoteContent.trim()) {
                            const newNote = {
                              id: Date.now().toString(),
                              content: newNoteContent,
                              author: currentUser?.name || 'Agente',
                              createdAt: new Date().toLocaleString()
                            };
                            const updatedNotes = [...(selectedContact.notes || []), newNote];
                            onUpdateContact(selectedContact.id, { notes: updatedNotes });
                            setNewNoteContent('');
                            if (onNotify) onNotify('Nota Agregada', 'La nota se ha guardado correctamente.', 'success');
                          }
                        }}
                        disabled={!newNoteContent.trim()}
                        className="bg-blue-600 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                      >
                        <StickyNote size={14} /> Guardar Nota
                      </button>
                    </div>
                  </div>

                  <div className="relative pl-4 border-l-2 border-slate-200 space-y-6">
                    {selectedContact.notes && selectedContact.notes.map(note => (
                      <div key={note.id} className="relative bg-amber-50 p-3 rounded-lg border border-amber-100 shadow-sm">
                        <span className="absolute -left-[23px] top-3 w-3 h-3 rounded-full bg-amber-400 border-2 border-white ring-2 ring-amber-100"></span>
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-xs font-bold text-amber-800 uppercase flex items-center gap-1"><StickyNote size={10} /> Nota Interna</p>
                          <span className="text-[10px] text-amber-600">{note.createdAt}</span>
                        </div>
                        <p className="text-sm text-slate-800 italic">"{note.content}"</p>
                        <p className="text-xs text-amber-700 mt-2 text-right">- {note.author}</p>
                      </div>
                    ))}

                    {selectedContact.history.length > 0 ? selectedContact.history.map((h) => {
                      const isInternal = h.type === 'note' || h.channel === 'internal';
                      if (isInternal) return null; // Already handled above in notes

                      return (
                        <div key={h.id} className="relative">
                          <span className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white ${h.sender === 'agent' ? 'bg-blue-500' : 'bg-green-500'}`}></span>
                          <div className="flex justify-between mb-0.5">
                            <span className={`text-xs font-bold ${h.sender === 'agent' ? 'text-blue-600' : 'text-green-600'}`}>
                              {h.sender === 'agent' ? 'Nosotros' : 'Cliente'} ({h.channel})
                            </span>
                            <span className="text-[10px] text-slate-400">{h.timestamp}</span>
                          </div>
                          <p className="text-sm text-slate-700 bg-white p-2 rounded border border-slate-100 shadow-sm">{h.content}</p>
                        </div>
                      );
                    }) : <p className="text-xs text-slate-400">Sin historial de mensajes.</p>}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'ai' && hasAiAccess && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-gradient-to-br from-blue-900 to-slate-900 rounded-xl p-6 text-white text-center">
                  <BrainCircuit size={48} className="mx-auto mb-3 text-blue-400 opacity-80" />
                  <h4 className="text-lg font-bold">Nexus AI Sales Coach</h4>
                  <p className="text-sm text-blue-200 mt-1">
                    Analizo el historial de conversaciones y el perfil del cliente para aumentar tus cierres.
                  </p>
                </div>

                {!aiAnalysis ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-slate-500 mb-4">Haz clic para generar un reporte predictivo en tiempo real.</p>
                    <button
                      onClick={runAiAnalysis}
                      disabled={isAnalyzing}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-200 transition-all transform active:scale-95 flex items-center gap-2 mx-auto"
                    >
                      {isAnalyzing ? <Loader2 className="animate-spin" /> : <Sparkles />}
                      {isAnalyzing ? 'Analizando...' : 'Analizar Trato con IA'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-slate-700">Probabilidad de Cierre</span>
                        <span className={`text-xl font-bold ${aiAnalysis.score >= 70 ? 'text-green-600' : aiAnalysis.score >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                          {aiAnalysis.score}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5">
                        <div className={`h-2.5 rounded-full ${aiAnalysis.score >= 70 ? 'bg-green-500' : aiAnalysis.score >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${aiAnalysis.score}%` }}></div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                      <h5 className="text-xs font-bold text-blue-800 uppercase mb-2 flex items-center gap-1"><BrainCircuit size={14} /> Consejo Estratégico</h5>
                      <p className="text-sm text-blue-900 leading-relaxed italic">
                        "{aiAnalysis.advice}"
                      </p>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                      <h5 className="text-xs font-bold text-emerald-800 uppercase mb-2 flex items-center gap-1"><ChevronRight size={14} /> Próximo Paso Recomendado</h5>
                      <p className="text-sm text-emerald-900 font-medium">
                        {aiAnalysis.nextStep}
                      </p>
                    </div>

                    <button onClick={() => setAiAnalysis(null)} className="text-xs text-slate-400 hover:text-slate-600 w-full text-center mt-2">
                      Regenerar análisis
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'qual' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
                  <h4 className="text-sm font-bold text-amber-800 mb-1">Calificación BANT</h4>
                  <p className="text-xs text-amber-700">Budget, Authority, Need, Timeline. Evalúa la calidad de esta oportunidad.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Presupuesto ({companyCurrency})</label>
                    <input
                      type="number"
                      value={bantForm?.budget || ''}
                      onChange={e => setBantForm({ ...bantForm, budget: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Ej. 5000"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="text-sm font-medium text-slate-700">¿Tiene Autoridad?</label>
                    <input
                      type="checkbox"
                      checked={bantForm?.authority || false}
                      onChange={e => setBantForm({ ...bantForm, authority: e.target.checked })}
                      className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Necesidad Detectada</label>
                    <textarea
                      value={bantForm?.need || ''}
                      onChange={e => setBantForm({ ...bantForm, need: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="¿Qué problema resolvemos?"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Línea de Tiempo (Timeline)</label>
                    <select
                      value={bantForm?.timeline || ''}
                      onChange={e => setBantForm({ ...bantForm, timeline: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="Inmediato">Inmediato (1 mes)</option>
                      <option value="Corto Plazo">Corto Plazo (1-3 meses)</option>
                      <option value="Medio Plazo">Medio Plazo (3-6 meses)</option>
                      <option value="Largo Plazo">Largo Plazo ({'>'} 6 meses)</option>
                    </select>
                  </div>

                  <button
                    onClick={handleUpdateBant}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded-lg shadow-md transition-all"
                  >
                    Guardar Calificación
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'docs' && selectedContact && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* Quote Generator */}
                <QuoteGenerator
                  contact={selectedContact}
                  products={products}
                  onSaveQuote={handleSaveQuote}
                />

                {/* Documents List */}
                <div className="border-t border-slate-100 pt-6">
                  <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <FileText size={16} className="text-green-600" /> Historial de Documentos
                  </h4>
                  <div className="space-y-3">
                    {selectedContact.documents && selectedContact.documents.length > 0 ? (
                      selectedContact.documents.map(doc => (
                        <div key={doc.id} className="p-3 bg-white border border-slate-200 rounded-lg flex justify-between items-center group hover:border-green-300 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-50 rounded group-hover:bg-green-50">
                              <FileText size={18} className="text-slate-400 group-hover:text-green-600" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900 leading-none">{doc.name}</p>
                              <p className="text-[10px] text-slate-500 mt-1">{doc.type} • {doc.createdAt}</p>
                            </div>
                          </div>
                          <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                            <Download size={18} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                        <FileText size={24} className="mx-auto mb-2 text-slate-300" />
                        <p className="text-xs text-slate-500">No hay documentos registrados para este trato.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* NEW DEAL MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-900">Crear Nuevo Trato</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateDeal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Lead</label>
                <input
                  required
                  type="text"
                  value={newDeal.name}
                  onChange={e => setNewDeal({ ...newDeal, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ej. Roberto Gomez"
                />
                {leadMatches.length > 0 && (
                  <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-2">
                    <p className="text-xs text-slate-500 mb-1">Coincidencias existentes</p>
                    <ul className="space-y-1">
                      {leadMatches.map(m => (
                        <li key={m.id} className="flex items-center justify-between text-sm">
                          <span className="text-slate-700 truncate max-w-[60%]">{m.name} · {m.email}</span>
                          <button
                            type="button"
                            onClick={() => { setSelectedContact(m); setIsModalOpen(false); }}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            Abrir
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Empresa</label>
                <input
                  required
                  type="text"
                  value={newDeal.company}
                  onChange={e => setNewDeal({ ...newDeal, company: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ej. Tech Corp"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newDeal.email}
                    onChange={e => setNewDeal({ ...newDeal, email: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="email@..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={newDeal.phone}
                    onChange={e => setNewDeal({ ...newDeal, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="+52..."
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valor Estimado ($)</label>
                <input
                  type="number"
                  value={newDeal.value}
                  onChange={e => setNewDeal({ ...newDeal, value: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
                  <Plus size={18} /> Crear Oportunidad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Won Deal Modal */}
      {isWonModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200">
            <div className="mb-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3 mx-auto text-green-600">
                <CheckCircle size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">¡Cerrar Venta con Éxito!</h3>
              <p className="text-slate-500 text-sm">Confirma los detalles finales de la transacción.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Productos / Servicios Adquiridos</label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  {products.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        const current = wonForm.products;
                        const updated = current.includes(p.name)
                          ? current.filter(i => i !== p.name)
                          : [...current, p.name];
                        setWonForm({ ...wonForm, products: updated });
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${wonForm.products.includes(p.name)
                        ? 'bg-green-600 text-white border-green-700 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-green-300'
                        }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
                {wonForm.products.length === 0 && (
                  <p className="text-[10px] text-red-500 mt-1">Debes seleccionar al menos un producto.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Precio Final de Venta</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      value={wonForm.finalPrice}
                      onChange={e => setWonForm({ ...wonForm, finalPrice: Number(e.target.value) })}
                      className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Incluye descuentos o cashback aquí.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Fecha de Cierre</label>
                  <input
                    type="text"
                    disabled
                    value={new Date().toLocaleDateString()}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Notas de Cierre / Cross-Sell</label>
                <textarea
                  value={wonForm.closingNotes}
                  onChange={e => setWonForm({ ...wonForm, closingNotes: e.target.value })}
                  rows={3}
                  placeholder="Detalla cualquier acuerdo especial, cashback otorgado o interés en futuros productos..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setIsWonModalOpen(false)}
                className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmWonDeal}
                disabled={wonForm.products.length === 0}
                className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-100 disabled:opacity-50 transition-all transform active:scale-95"
              >
                Confirmar Venta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lost Reason Modal */}
      {isLostModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
            <div className="mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3 mx-auto text-red-600">
                <X size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 text-center">Marcar como Perdido</h3>
              <p className="text-center text-slate-500 text-sm mt-1">¿Por qué no se cerró este trato?</p>
            </div>

            <div className="space-y-3 mb-6">
              {['Precio demasiado alto', 'Se fue con la competencia', 'Perdió interés / Ghosting', 'No calificado / Spam', 'Otro'].map((reason) => (
                <label key={reason} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${lostReason === reason ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input
                    type="radio"
                    name="lostReason"
                    value={reason}
                    checked={lostReason === reason}
                    onChange={(e) => setLostReason(e.target.value)}
                    className="w-4 h-4 text-red-600 border-slate-300 focus:ring-red-500"
                  />
                  <span className="ml-3 text-sm font-medium">{reason}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsLostModalOpen(false)}
                className="flex-1 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={confirmLostDeal}
                className="flex-1 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 shadow-sm"
              >
                Confirmar Pérdida
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal integration */}
      <WhatsAppModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        contact={selectedContact}
        onLogNote={(content) => {
          if (onUpdateContact && selectedContact) {
            const newNote = {
              id: Date.now().toString(),
              content,
              author: currentUser?.name || 'Agente',
              createdAt: new Date().toLocaleString()
            };
            const updatedNotes = [...(selectedContact.notes || []), newNote];
            onUpdateContact(selectedContact.id, { notes: updatedNotes });
            if (onNotify) onNotify('Nota Guardada', 'Interacción de WhatsApp registrada.', 'success');
          }
        }}
      />

      {/* Task Creation Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-900">Nueva Tarea de Seguimiento</h3>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleTaskSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
                <input
                  required
                  autoFocus
                  type="text"
                  value={newTask.title}
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ej. Llamar para seguimiento"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                    <div className="relative">
                        <input
                            type="text"
                            readOnly
                            value={newTask.dueDate ? format(parseISO(newTask.dueDate), 'dd/MM/yyyy') : ''}
                            className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <input
                            required
                            type="date"
                            value={newTask.dueDate}
                            onChange={e => setNewTask({...newTask, dueDate: e.target.value})}
                            onClick={(e) => (e.target as any).showPicker && (e.target as any).showPicker()}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <CalendarIcon size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Hora</label>
                    <input
                      required
                      type="time"
                      value={newTask.dueTime}
                      onChange={e => setNewTask({...newTask, dueTime: e.target.value})}
                      className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Prioridad</label>
                    <select
                      value={newTask.priority}
                      onChange={e => setNewTask({...newTask, priority: e.target.value as any})}
                      className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="Low">Baja</option>
                        <option value="Normal">Normal</option>
                        <option value="High">Alta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Asignar a</label>
                    <select
                      value={newTask.assignedTo}
                      onChange={e => setNewTask({...newTask, assignedTo: e.target.value})}
                      className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value={currentUser?.name || 'Me'}>Mí (Actual)</option>
                        {team.map(member => (
                            <option key={member.id} value={member.name}>{member.name}</option>
                        ))}
                    </select>
                  </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción (Opcional)</label>
                <textarea
                  value={newTask.description}
                  onChange={e => setNewTask({...newTask, description: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
                  placeholder="Detalles adicionales..."
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                          <Clock size={16} className="text-blue-600"/> Recordatorio
                      </label>
                      <input
                        type="checkbox"
                        checked={newTask.reminder.enabled}
                        onChange={e => setNewTask({...newTask, reminder: {...newTask.reminder, enabled: e.target.checked}})}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                  </div>
                  {newTask.reminder.enabled && (
                      <div className="flex gap-2 items-center">
                          <span className="text-sm text-slate-600">Avisar</span>
                          <input
                            type="number"
                            min="1"
                            value={newTask.reminder.timeValue}
                            onChange={e => setNewTask({...newTask, reminder: {...newTask.reminder, timeValue: Number(e.target.value)}})}
                            className="w-16 px-2 py-1 bg-white border border-slate-300 rounded text-sm text-center"
                          />
                          <select
                            value={newTask.reminder.timeUnit}
                            onChange={e => setNewTask({...newTask, reminder: {...newTask.reminder, timeUnit: e.target.value as any}})}
                            className="px-2 py-1 bg-white border border-slate-300 rounded text-sm"
                          >
                              <option value="minutes">Minutos antes</option>
                              <option value="hours">Horas antes</option>
                              <option value="days">Días antes</option>
                          </select>
                      </div>
                  )}
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700">
                  Guardar Tarea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
