import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, Copy, CheckCircle, FileText } from 'lucide-react';
import { Contact } from '../types';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact | null;
  onLogNote: (content: string) => void;
}

const TEMPLATES = [
  { id: 'intro', label: 'Bienvenida', text: 'Hola {name}, gracias por tu interés en nuestros productos. ¿Tienes unos minutos para conversar?' },
  { id: 'followup', label: 'Seguimiento', text: 'Hola {name}, te escribo para dar seguimiento a nuestra conversación anterior. ¿Has podido revisar la información?' },
  { id: 'meeting', label: 'Agendar Reunión', text: 'Hola {name}, me gustaría agendar una breve llamada para mostrarte cómo podemos ayudarte. ¿Qué horario te queda bien?' },
  { id: 'promo', label: 'Promoción', text: 'Hola {name}, tenemos una oferta especial esta semana que podría interesarte. ¿Te envío los detalles?' },
  { id: 'custom', label: 'Personalizado', text: '' }
];

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({ isOpen, onClose, contact, onLogNote }) => {
  const [message, setMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('custom');
  const [showLogPrompt, setShowLogPrompt] = useState(false);

  // Reset state when opening for a new contact
  useEffect(() => {
    if (isOpen) {
      setMessage('');
      setSelectedTemplate('custom');
      setShowLogPrompt(false);
    }
  }, [isOpen, contact?.id]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = TEMPLATES.find(t => t.id === templateId);
    if (template) {
      // Replace variables
      const name = contact?.name.split(' ')[0] || '';
      const text = template.text.replace(/{name}/g, name);
      setMessage(text);
    }
  };

  const handleSend = () => {
    if (!contact) return;
    
    // 1. Construct WhatsApp URL
    // Clean phone number (remove spaces, dashes, parentheses)
    const cleanPhone = contact.phone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    
    // 2. Open in new tab
    window.open(url, '_blank');
    
    // 3. Show log prompt
    setShowLogPrompt(true);
  };

  const handleLog = () => {
    onLogNote(`Mensaje de WhatsApp enviado: "${message}"`);
    onClose();
  };

  if (!isOpen || !contact) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-[#25D366] p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <MessageSquare size={20} />
            <h3 className="font-bold">Enviar WhatsApp</h3>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {!showLogPrompt ? (
            <>
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Plantilla</label>
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                  {TEMPLATES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleTemplateChange(t.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                        selectedTemplate === t.id 
                          ? 'bg-[#25D366] text-white border-[#25D366]' 
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Mensaje</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#25D366] outline-none resize-none"
                  placeholder="Escribe tu mensaje aquí..."
                ></textarea>
                <p className="text-xs text-slate-400 mt-1 text-right">{message.length} caracteres</p>
              </div>

              <button
                onClick={handleSend}
                disabled={!message.trim()}
                className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3 rounded-xl shadow-lg shadow-green-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} /> Abrir WhatsApp
              </button>
              <p className="text-[10px] text-slate-400 text-center mt-3">
                Esto abrirá WhatsApp Web o la App de escritorio con el mensaje pre-cargado.
              </p>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto mb-4">
                <CheckCircle size={32} />
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-2">¿Mensaje Enviado?</h4>
              <p className="text-sm text-slate-500 mb-6">
                Si enviaste el mensaje exitosamente, podemos guardarlo como una nota en el historial del cliente.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={handleLog}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2"
                >
                  <FileText size={18} /> Sí, guardar como nota
                </button>
                <button
                  onClick={onClose}
                  className="w-full bg-white border border-slate-200 text-slate-600 font-bold py-2.5 rounded-lg hover:bg-slate-50"
                >
                  No guardar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
