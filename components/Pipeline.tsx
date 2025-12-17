
import React, { useState } from 'react';
import { PIPELINE_COLUMNS } from '../constants';
import { Contact, LeadStatus, CurrentUser, Product, Source, TeamMember } from '../types';
import { MoreHorizontal, Phone, Mail, AlertCircle, UserPlus, X, Filter, Trash2, StickyNote, ArrowLeft, Clock, User, MessageSquare, BrainCircuit, Sparkles, Loader2, ChevronRight, Plus } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface DealCardProps {
  contact: Contact;
  onDragStart: (e: React.DragEvent, id: string) => void;
  currentUser: CurrentUser;
  onClaim: (id: string) => void;
  onClick: (contact: Contact) => void;
}

const DealCard: React.FC<DealCardProps> = ({ contact, onDragStart, currentUser, onClaim, onClick }) => {
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
      {/* Stale Warning */}
      {isStale && (
        <div className="absolute top-2 right-2 text-red-400" title="Sin actividad reciente (> 3 días)">
          <AlertCircle size={14} />
        </div>
      )}

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
      <p className="text-slate-500 text-sm mt-1 mb-3">${contact.value.toLocaleString()}</p>
      
      {/* Action Area */}
      {isUnassigned ? (
         <button 
           onClick={(e) => { e.stopPropagation(); onClaim(contact.id); }}
           className="w-full mt-2 mb-2 bg-indigo-50 text-indigo-700 text-xs py-1.5 rounded border border-indigo-100 font-bold hover:bg-indigo-100 flex items-center justify-center gap-1 transition-colors"
         >
           <UserPlus size={12} /> Asignarme
         </button>
      ) : (
        <div className="flex justify-between items-center text-slate-400 text-xs mt-3 border-t border-slate-100 pt-3">
          <div className="flex space-x-2">
            <Phone size={14} className="hover:text-indigo-600 cursor-pointer" />
            <Mail size={14} className="hover:text-indigo-600 cursor-pointer" />
          </div>
          <span className={`${contact.probability > 80 ? 'text-green-600 font-bold' : ''}`}>{contact.probability}% prob.</span>
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
  onStatusChange: (contactId: string, newStatus: LeadStatus, lostReason?: string) => void;
  onNavigateToChat: (contactId: string) => void;
  products?: Product[];
  onNotify?: (title: string, msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  onAddDeal?: (contact: Contact) => void;
  onAssign?: (contactId: string, newOwner: string) => void;
  team?: TeamMember[];
}

export const Pipeline: React.FC<PipelineProps> = ({ currentUser, contacts, onStatusChange, onNavigateToChat, products = [], onNotify, onAddDeal, onAssign, team = [] }) => {
  const [selectedAgent, setSelectedAgent] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'info' | 'ai'>('info');
  
  // Detailed View State
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // New Deal Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDeal, setNewDeal] = useState({
      name: '',
      company: '',
      email: '',
      phone: '',
      value: 0
  });

  // AI Analysis State
  const [aiAnalysis, setAiAnalysis] = useState<{score: number; advice: string; nextStep: string} | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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

  // State for Lost Reason Modal
  const [isLostModalOpen, setIsLostModalOpen] = useState(false);
  const [pendingLostContactId, setPendingLostContactId] = useState<string | null>(null);
  const [lostReason, setLostReason] = useState('Precio demasiado alto');

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('contactId', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault();
    const contactId = e.dataTransfer.getData('contactId');

    // If moving to LOST, trigger modal instead of immediate update
    if (status === LeadStatus.LOST) {
        setPendingLostContactId(contactId);
        setIsLostModalOpen(true);
        return;
    }
    
    // Delegate validation and update to parent
    onStatusChange(contactId, status);
  };

  const confirmLostDeal = () => {
      if (pendingLostContactId) {
          onStatusChange(pendingLostContactId, LeadStatus.LOST, lostReason);
          setIsLostModalOpen(false);
          setPendingLostContactId(null);
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
      setActiveTab('info');
      setAiAnalysis(null);
  };

  const handleCreateDeal = (e: React.FormEvent) => {
      e.preventDefault();
      if (!onAddDeal) return;

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
          lastActivity: 'Ahora',
          tags: [],
          probability: 20, // Default start probability
          notes: [],
          history: []
      };

      onAddDeal(contact);
      setIsModalOpen(false);
      setNewDeal({ name: '', company: '', email: '', phone: '', value: 0 });
  };

  const runAiAnalysis = async () => {
      if (!selectedContact || !process.env.API_KEY) {
          if(onNotify) onNotify('Error de AI', 'Falta la API Key o no hay contacto seleccionado.', 'error');
          return;
      }
      setIsAnalyzing(true);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          
          const historyText = selectedContact.history.map(m => `${m.sender}: ${m.content}`).join('\n');
          const productContext = products.map(p => `${p.name} ($${p.price})`).join(', ');

          const prompt = `
            Actúa como un Experto Senior en Ventas (Sales Coach). Analiza esta oportunidad de venta.
            
            Contexto:
            - Cliente: ${selectedContact.name} (${selectedContact.company})
            - Valor del Trato: $${selectedContact.value}
            - Etapa Actual: ${selectedContact.status}
            - Productos Disponibles: ${productContext}
            
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

          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt
          });
          
          const text = response.text || '';
          const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
          const result = JSON.parse(jsonStr);
          setAiAnalysis(result);
          if(onNotify) onNotify('Análisis Completado', 'Tu Sales Coach ha generado nuevas recomendaciones.', 'success');

      } catch (error) {
          console.error("AI Analysis Failed", error);
          setAiAnalysis({ score: 50, advice: "No se pudo conectar con la IA. Revisa tu conexión.", nextStep: "Intentar manualmente." });
          if(onNotify) onNotify('Error de Análisis', 'Hubo un problema al consultar la IA.', 'error');
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
                  className="w-full pl-8 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
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
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 flex-1 md:flex-none"
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
        <div className="flex flex-col md:flex-row h-auto md:h-full md:min-w-max gap-4 md:space-x-4">
          {PIPELINE_COLUMNS.map((col) => {
            const deals = displayedContacts.filter((c) => c.status === col.id);
            const totalValue = deals.reduce((sum, c) => sum + c.value, 0);

            return (
              <div 
                key={col.id} 
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                className="w-full md:w-80 flex flex-col rounded-xl bg-slate-50/50 transition-colors hover:bg-slate-100/50 min-h-[300px] md:h-full"
              >
                <div className={`p-4 border-t-4 ${col.color} bg-slate-100 rounded-t-xl sticky top-0 z-10 md:static shadow-sm md:shadow-none`}>
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-semibold text-slate-700">{col.title}</h3>
                    <span className="bg-white text-slate-500 px-2 py-0.5 rounded-md text-xs font-bold border border-slate-200">
                      {deals.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    ${totalValue.toLocaleString()} estimado
                  </p>
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
                onDrop={(e) => handleDrop(e, LeadStatus.LOST)}
                className="w-full md:w-24 flex flex-row md:flex-col h-24 md:h-full rounded-xl bg-red-50 border border-dashed border-red-200 opacity-80 hover:opacity-100 transition-all hover:bg-red-100 items-center justify-center group flex-shrink-0"
                title="Arrastra aquí para marcar como Perdido"
              >
                 <div className="flex flex-row md:flex-col items-center justify-center text-red-400 font-medium group-hover:text-red-600 transition-colors gap-2">
                    <Trash2 size={24} className="md:mb-4" />
                    <span className="text-xs font-bold uppercase tracking-wide md:vertical-text md:writing-mode-vertical">Marcar Perdido</span>
                 </div>
           </div>
        </div>
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
               <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-lg font-bold shadow-sm">
                 {selectedContact.name.substring(0,2).toUpperCase()}
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
                <button 
                  onClick={() => setActiveTab('ai')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${activeTab === 'ai' ? 'bg-indigo-600 text-white shadow' : 'text-indigo-600 hover:bg-indigo-50'}`}
                >
                    <Sparkles size={12} /> AI Coach
                </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {activeTab === 'info' && (
                <>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => onNavigateToChat(selectedContact.id)}
                            className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 shadow-sm flex items-center justify-center gap-2"
                        >
                            <MessageSquare size={18} /> Ir al Chat
                        </button>
                        <button className="flex-1 bg-white border border-slate-300 text-slate-700 py-2 rounded-lg font-medium hover:bg-slate-50 flex items-center justify-center gap-2">
                            <Phone size={18} /> Llamar
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                            <p className="text-xs text-slate-500 uppercase font-semibold">Valor</p>
                            <p className="text-lg font-bold text-slate-900">${selectedContact.value.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                            <p className="text-xs text-slate-500 uppercase font-semibold">Probabilidad</p>
                            <p className="text-lg font-bold text-slate-900">{selectedContact.probability}%</p>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                            <User size={16} className="text-indigo-600"/> Info Contacto
                        </h4>
                        <ul className="space-y-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <li className="flex justify-between border-b border-slate-200 pb-1"><span>Email:</span> <span className="text-slate-900 font-medium truncate max-w-[180px]">{selectedContact.email}</span></li>
                            <li className="flex justify-between border-b border-slate-200 pb-1"><span>Tel:</span> <span className="text-slate-900 font-medium">{selectedContact.phone}</span></li>
                            <li className="flex justify-between"><span>Dueño:</span> <span className="text-indigo-600 font-medium">{selectedContact.owner}</span></li>
                        </ul>
                    </div>
                    
                    <div className="border-t border-slate-100 pt-4">
                    <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Clock size={16} className="text-indigo-600"/> Historial & Notas
                    </h4>
                    <div className="relative pl-4 border-l-2 border-slate-200 space-y-6">
                        {selectedContact.notes && selectedContact.notes.map(note => (
                            <div key={note.id} className="relative bg-amber-50 p-3 rounded-lg border border-amber-100 shadow-sm">
                                <span className="absolute -left-[23px] top-3 w-3 h-3 rounded-full bg-amber-400 border-2 border-white ring-2 ring-amber-100"></span>
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-xs font-bold text-amber-800 uppercase flex items-center gap-1"><StickyNote size={10}/> Nota Interna</p>
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
                                    <span className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white ${h.sender === 'agent' ? 'bg-indigo-500' : 'bg-green-500'}`}></span>
                                    <div className="flex justify-between mb-0.5">
                                        <span className={`text-xs font-bold ${h.sender === 'agent' ? 'text-indigo-600' : 'text-green-600'}`}>
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

            {activeTab === 'ai' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-xl p-6 text-white text-center">
                        <BrainCircuit size={48} className="mx-auto mb-3 text-indigo-400 opacity-80" />
                        <h4 className="text-lg font-bold">Nexus AI Sales Coach</h4>
                        <p className="text-sm text-indigo-200 mt-1">
                            Analizo el historial de conversaciones y el perfil del cliente para aumentar tus cierres.
                        </p>
                    </div>

                    {!aiAnalysis ? (
                        <div className="text-center py-6">
                            <p className="text-sm text-slate-500 mb-4">Haz clic para generar un reporte predictivo en tiempo real.</p>
                            <button 
                                onClick={runAiAnalysis}
                                disabled={isAnalyzing}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-indigo-200 transition-all transform active:scale-95 flex items-center gap-2 mx-auto"
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

                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                                <h5 className="text-xs font-bold text-indigo-800 uppercase mb-2 flex items-center gap-1"><BrainCircuit size={14}/> Consejo Estratégico</h5>
                                <p className="text-sm text-indigo-900 leading-relaxed italic">
                                    "{aiAnalysis.advice}"
                                </p>
                            </div>

                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                                <h5 className="text-xs font-bold text-emerald-800 uppercase mb-2 flex items-center gap-1"><ChevronRight size={14}/> Próximo Paso Recomendado</h5>
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
                  onChange={e => setNewDeal({...newDeal, name: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ej. Roberto Gomez"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Empresa</label>
                <input 
                  required
                  type="text" 
                  value={newDeal.company}
                  onChange={e => setNewDeal({...newDeal, company: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ej. Tech Corp"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input 
                    type="email" 
                    value={newDeal.email}
                    onChange={e => setNewDeal({...newDeal, email: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="email@..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                  <input 
                    type="tel" 
                    value={newDeal.phone}
                    onChange={e => setNewDeal({...newDeal, phone: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="+52..."
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valor Estimado ($)</label>
                <input 
                    type="number" 
                    value={newDeal.value}
                    onChange={e => setNewDeal({...newDeal, value: Number(e.target.value)})}
                    className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 flex items-center justify-center gap-2">
                  <Plus size={18} /> Crear Oportunidad
                </button>
              </div>
            </form>
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
    </div>
  );
};
