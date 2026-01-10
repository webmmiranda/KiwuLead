import React, { useState, useEffect } from 'react';
import { 
  X, ArrowLeft, Filter, FileText, Sparkles, MessageSquare, Send, Phone, Clock, 
  User, Calendar as CalendarIcon, Paperclip, StickyNote, Pencil, Check, BrainCircuit, Loader2, ChevronRight, Info, Download, AlertTriangle
} from 'lucide-react';
import { Contact, Product, PipelineColumn, AiConfig } from '../types';
import { formatCurrency, CurrencyCode } from '../src/utils/currency';
import { QuoteGenerator } from './QuoteGenerator';
import { GoogleGenerativeAI } from "@google/generative-ai";

interface ContactDetailsPanelProps {
  contact: Contact;
  onClose: () => void;
  onUpdateContact?: (id: string, updates: Partial<Contact>) => void;
  onNavigateToChat?: (contactId: string) => void;
  onOpenWhatsApp?: () => void;
  onCreateTask?: () => void;
  products: Product[];
  companyCurrency: string;
  hasAiAccess?: boolean;
  contactAppointments?: any[];
  aiConfig?: AiConfig;
  onNotify?: (title: string, msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export const ContactDetailsPanel: React.FC<ContactDetailsPanelProps> = ({
  contact,
  onClose,
  onUpdateContact,
  onNavigateToChat,
  onOpenWhatsApp,
  onCreateTask,
  products,
  companyCurrency,
  hasAiAccess = false,
  contactAppointments = [],
  aiConfig,
  onNotify
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'ai' | 'qual' | 'docs'>('info');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // AI State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{ score: number; advice: string; nextStep: string } | null>(null);

  // BANT State
  const [bantForm, setBantForm] = useState<Contact['bant']>(contact.bant || {});
  const [isBantInfoOpen, setIsBantInfoOpen] = useState(false);

  useEffect(() => {
    setBantForm(contact.bant || {});
    setAiAnalysis(null);
    setActiveTab('info');
  }, [contact.id]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Mock upload functionality matching existing logic
    if (e.target.files && e.target.files[0] && onUpdateContact) {
      setIsUploading(true);
      setTimeout(() => {
        const file = e.target.files![0];
        const newDoc = {
          id: Date.now().toString(),
          name: file.name,
          type: file.type,
          url: '#',
          createdAt: new Date().toISOString()
        };
        const updatedDocs = [...(contact.documents || []), newDoc];
        onUpdateContact(contact.id, { documents: updatedDocs });
        setIsUploading(false);
      }, 1500);
    }
  };

  const handleSaveNote = () => {
    if (onUpdateContact && contact && newNoteContent.trim()) {
      const newNote = {
        id: Date.now().toString(),
        content: newNoteContent,
        createdAt: new Date().toLocaleString(),
        author: 'Usuario' // Should ideally come from current user context
      };
      const updatedNotes = [newNote, ...(contact.notes || [])];
      onUpdateContact(contact.id, { notes: updatedNotes });
      setNewNoteContent('');
      if (onNotify) onNotify('Nota Agregada', 'La nota se ha guardado correctamente.', 'success');
    }
  };

  const handleUpdateBant = () => {
    if (onUpdateContact) {
      onUpdateContact(contact.id, { bant: bantForm });
      if (onNotify) onNotify('BANT Actualizado', 'La calificación se ha guardado.', 'success');
    }
  };

  const handleSaveQuote = (quote: { id: string; name: string; type: string; url: string; createdAt: string }) => {
    if (onUpdateContact) {
      const currentDocs = contact.documents || [];
      onUpdateContact(contact.id, { documents: [quote, ...currentDocs] });
    }
  };

  const runAiAnalysis = async () => {
    if (!aiConfig?.apiKey && !process.env.API_KEY) return;
    setIsAnalyzing(true);
    
    try {
      const apiKey = aiConfig?.apiKey || process.env.API_KEY || '';
      const systemInstruction = `
            Actúa como un Experto Senior en Ventas (Sales Coach). Analiza esta oportunidad de venta.
            
            Contexto:
            - Cliente: ${contact.name} (${contact.company})
            - Valor del Trato: ${contact.value}
            - Etapa Actual: ${contact.status}
            - Productos Disponibles: ${products.map(p => `${p.name} ($${p.price})`).join(', ')}
            - Calificación BANT: ${contact.bant ? JSON.stringify(contact.bant) : 'No calificado aún'}
            
            Historial de Conversación:
            ${contact.history.map((m: any) => `${m.sender}: ${m.content}`).join('\n')}

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
        const validModelName = modelName.includes('gemini-pro') ? 'gemini-1.5-flash' : modelName;
        const model = ai.getGenerativeModel({ model: validModelName });
        const response = await model.generateContent(systemInstruction);
        const result = response.response;
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
    <div className="absolute inset-y-0 right-0 w-full md:w-96 bg-white shadow-2xl border-l border-slate-200 transform transition-transform duration-300 ease-in-out z-[60] flex flex-col slide-in-from-right">
      <div className="p-6 border-b border-slate-100 bg-slate-50">
        <div className="flex justify-between items-start mb-4">
          <button onClick={onClose} className="md:hidden text-slate-600">
            <ArrowLeft />
          </button>
          <button onClick={onClose} className="hidden md:block text-slate-400 hover:text-slate-600 ml-auto">
            <X size={24} />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900 leading-tight flex items-center gap-2">
              {contact.name}
            </h3>
            <p className="text-sm text-slate-500">{contact.company}</p>
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
                onClick={() => onNavigateToChat && onNavigateToChat(contact.id)}
                className="flex-1 min-w-[120px] bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 shadow-sm flex items-center justify-center gap-2"
              >
                <MessageSquare size={18} /> Ir al Chat
              </button>
              <button
                onClick={onOpenWhatsApp}
                className="flex-1 min-w-[120px] bg-[#25D366] text-white py-2 rounded-lg font-medium hover:bg-[#128C7E] shadow-sm flex items-center justify-center gap-2"
              >
                <Send size={18} /> WhatsApp
              </button>
              <button className="flex-1 min-w-[120px] bg-white border border-slate-300 text-slate-700 py-2 rounded-lg font-medium hover:bg-slate-50 flex items-center justify-center gap-2">
                <Phone size={18} /> Llamar
              </button>
              <button onClick={onCreateTask} className="flex-1 min-w-[120px] bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 shadow-sm flex items-center justify-center gap-2">
                <Clock size={18} /> Tarea
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-semibold">Valor</p>
                <p className="text-lg font-bold text-slate-900">{formatCurrency(contact.value, companyCurrency as CurrencyCode)}</p>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-semibold">Probabilidad</p>
                <p className="text-lg font-bold text-slate-900">{contact.probability}%</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <User size={16} className="text-blue-600" /> Info Contacto
              </h4>
              <ul className="space-y-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <li className="flex justify-between border-b border-slate-200 pb-1"><span>Email:</span> <span className="text-slate-900 font-medium truncate max-w-[180px]">{contact.email}</span></li>
                <li className="flex justify-between border-b border-slate-200 pb-1"><span>Tel:</span> <span className="text-slate-900 font-medium">{contact.phone}</span></li>
                <li className="flex justify-between border-b border-slate-200 pb-1"><span>Fuente:</span> <span className="text-slate-900 font-medium">{contact.source}</span></li>
                <li className="flex justify-between"><span>Dueño:</span> <span className="text-blue-600 font-medium">{contact.owner}</span></li>
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
                      const current = contact.productInterests || [];
                      const updated = current.includes(p.name)
                        ? current.filter(i => i !== p.name)
                        : [...current, p.name];
                      onUpdateContact?.(contact.id, { productInterests: updated });
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${(contact.productInterests || []).includes(p.name)
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
                    onClick={handleSaveNote}
                    disabled={!newNoteContent.trim()}
                    className="bg-blue-600 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    <StickyNote size={14} /> Guardar Nota
                  </button>
                </div>
              </div>

              <div className="relative pl-4 border-l-2 border-slate-200 space-y-6">
                
                {/* Appointments Integration */}
                {contactAppointments.length > 0 && contactAppointments.map(apt => (
                  <div key={`apt-${apt.id}`} className="relative bg-white p-3 rounded-lg border border-blue-200 shadow-sm">
                    <span className="absolute -left-[23px] top-3 w-3 h-3 rounded-full bg-blue-500 border-2 border-white"></span>
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-xs text-blue-700 font-bold flex items-center gap-1">
                        <CalendarIcon size={10} /> Cita Programada
                      </p>
                      <span className="text-xs text-slate-400">
                        {new Date(apt.start).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-900">{apt.title}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {new Date(apt.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                      {new Date(apt.end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                    {apt.location && <p className="text-xs text-slate-500 mt-1 italic">📍 {apt.location}</p>}
                  </div>
                ))}

                {contact.notes && contact.notes.length > 0 && contact.notes.map((note: any) => (
                  <div key={`note-${note.id}`} className="relative bg-amber-50 p-3 rounded-lg border border-amber-100 shadow-sm">
                    <span className="absolute -left-[23px] top-3 w-3 h-3 rounded-full bg-amber-400 border-2 border-white ring-2 ring-amber-100"></span>
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs font-bold text-amber-800 uppercase flex items-center gap-1">
                        <StickyNote size={10} /> Nota Interna
                      </p>
                      <span className="text-[10px] text-amber-600">{note.createdAt}</span>
                    </div>
                    <p className="text-sm text-slate-800 italic">"{note.content}"</p>
                    <p className="text-xs text-amber-700 mt-2 text-right">- {note.author}</p>
                  </div>
                ))}

                {contact.history.map((h: any) => (
                  <div key={`hist-${h.id}`} className="relative">
                    <span className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white ${h.sender === 'agent' ? 'bg-blue-500' : 'bg-green-500'}`}></span>
                    <div className="flex justify-between mb-0.5">
                      <span className={`text-xs font-bold ${h.sender === 'agent' ? 'text-blue-600' : 'text-green-600'}`}>
                        {h.sender === 'agent' ? 'Nosotros' : 'Cliente'} ({h.channel})
                      </span>
                      <span className="text-[10px] text-slate-400">{h.timestamp}</span>
                    </div>
                    <p className="text-sm text-slate-700 bg-white p-2 rounded border border-slate-100 shadow-sm">{h.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'ai' && hasAiAccess && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-gradient-to-br from-blue-900 to-slate-900 rounded-xl p-6 text-white text-center">
              <BrainCircuit size={48} className="mx-auto mb-3 text-blue-400 opacity-80" />
              <h4 className="text-lg font-bold">KiwüLead AI Sales Coach</h4>
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
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl relative">
              <div className="flex justify-between items-start mb-1">
                <h4 className="text-sm font-bold text-amber-800">Calificación BANT</h4>
                <button 
                    onClick={() => setIsBantInfoOpen(true)}
                    className="text-amber-600 hover:text-amber-800 p-1 hover:bg-amber-100 rounded transition-colors"
                    title="¿Qué es BANT?"
                >
                    <Info size={16} />
                </button>
              </div>
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

        {activeTab === 'docs' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Quote Generator */}
            <QuoteGenerator
              contact={contact}
              products={products}
              onSaveQuote={handleSaveQuote}
            />

            {/* Documents List */}
            <div className="border-t border-slate-100 pt-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <FileText size={16} className="text-green-600" /> Historial de Documentos
                </h4>
                <label className={`cursor-pointer text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 flex items-center gap-1 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    {isUploading ? 'Subiendo...' : '+ Subir'}
                    <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" />
                </label>
              </div>

              <div className="space-y-3">
                {contact.documents && contact.documents.length > 0 ? (
                  contact.documents.map(doc => (
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
                      <div className="flex gap-2">
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                            <Download size={18} />
                          </a>
                      </div>
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
      
      {/* BANT Info Modal */}
      {isBantInfoOpen && (
        <div 
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
            onClick={() => setIsBantInfoOpen(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-900">¿Qué es BANT?</h3>
              <button onClick={() => setIsBantInfoOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4 text-slate-600 text-sm">
                <p><strong>B (Budget):</strong> ¿El cliente tiene el presupuesto necesario?</p>
                <p><strong>A (Authority):</strong> ¿La persona con la que hablas puede tomar la decisión final?</p>
                <p><strong>N (Need):</strong> ¿Tiene una necesidad o problema que tu producto resuelve?</p>
                <p><strong>T (Timeline):</strong> ¿Cuándo planean comprar o implementar la solución?</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
