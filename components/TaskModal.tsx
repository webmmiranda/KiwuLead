import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar as CalendarIcon, Briefcase, CheckSquare } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Task, TeamMember, CurrentUser, Contact } from '../types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: Partial<Task>) => Promise<void>;
  contact?: { id: string; name: string };
  contacts?: Contact[];
  currentUser?: CurrentUser;
  team?: TeamMember[];
  initialTask?: Task;
}

const TASK_CATEGORIES = [
  {
    name: "Contacto inicial",
    options: [
      "Llamar a cliente",
      "Primer contacto con lead",
      "Contactar lead nuevo",
      "Intento de llamada",
      "Enviar mensaje de bienvenida",
      "Escribir por WhatsApp",
      "Enviar correo inicial",
      "Responder consulta del lead"
    ]
  },
  {
    name: "Seguimiento",
    options: [
      "Seguimiento por llamada",
      "Seguimiento por WhatsApp",
      "Seguimiento por email",
      "Reintentar contacto",
      "Dar seguimiento a cotización",
      "Confirmar interés del cliente",
      "Validar necesidades del cliente",
      "Resolver dudas del cliente"
    ]
  },
  {
    name: "Reuniones y citas",
    options: [
      "Agendar cita",
      "Confirmar cita",
      "Reunión inicial",
      "Reunión de seguimiento",
      "Reunión de presentación",
      "Reunión de propuesta",
      "Llamada de descubrimiento",
      "Demo del producto/servicio",
      "Presentación comercial"
    ]
  },
  {
    name: "Propuesta y negociación",
    options: [
      "Enviar propuesta",
      "Preparar propuesta comercial",
      "Ajustar propuesta",
      "Negociar condiciones",
      "Revisar feedback del cliente",
      "Enviar cotización",
      "Explicar propuesta al cliente"
    ]
  },
  {
    name: "Cierre",
    options: [
      "Cerrar venta",
      "Cerrar trato",
      "Solicitar confirmación final",
      "Enviar contrato",
      "Firmar contrato",
      "Coordinar pago",
      "Confirmar cierre",
      "Venta ganada 🎉",
      "Venta perdida ❌"
    ]
  },
  {
    name: "Postventa",
    options: [
      "Onboarding del cliente",
      "Entrega de servicio",
      "Seguimiento postventa",
      "Solicitar feedback",
      "Solicitar testimonio",
      "Upsell / Cross-sell",
      "Renovación de servicio",
      "Soporte al cliente"
    ]
  },
  {
    name: "Administrativas / internas",
    options: [
      "Actualizar información del lead",
      "Registrar llamada",
      "Registrar nota de reunión",
      "Revisar historial del cliente",
      "Calificar lead",
      "Asignar lead",
      "Cerrar tarea pendiente"
    ]
  }
];

const inferTaskType = (title: string): 'Call' | 'Email' | 'Meeting' | 'Task' => {
  const lower = title.toLowerCase();
  if (lower.includes('llamar') || lower.includes('llamada') || lower.includes('teléfono')) return 'Call';
  if (lower.includes('correo') || lower.includes('email') || lower.includes('mensaje') || lower.includes('whatsapp')) return 'Email'; // Mapping msg to Email/Communication generic if needed, or stick to Task. User asked for specific tracking. Existing types are limited.
  // Actually, 'Email' usually implies specifically email. But 'Message' isn't a type.
  // Let's map WhatsApp/Message to 'Task' or maybe we should add 'Message' type?
  // For now, I'll stick to existing types.
  // 'Escribir por WhatsApp' -> maybe 'Task' or 'Email' (as in "Communication").
  // Let's map 'Reunión', 'Cita', 'Demo', 'Presentación' to 'Meeting'.
  if (lower.includes('reunión') || lower.includes('cita') || lower.includes('demo') || lower.includes('presentación') || lower.includes('discovery')) return 'Meeting';
  
  return 'Task';
};

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSubmit, contact, contacts, currentUser, team = [], initialTask }) => {
  const [selectedCategory, setSelectedCategory] = useState(TASK_CATEGORIES[0].name);
  const [newTask, setNewTask] = useState({
    title: '',
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: '10:00',
    description: '',
    priority: 'Normal' as 'High' | 'Normal' | 'Low',
    assignedTo: currentUser?.name || 'Me',
    contactId: contact?.id || '',
    reminder: {
      enabled: true,
      timeValue: 30,
      timeUnit: 'minutes' as 'minutes' | 'hours' | 'days'
    }
  });

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
        if (initialTask) {
             // Edit Mode
             setNewTask({
                 title: initialTask.title,
                 dueDate: initialTask.dueDate,
                 dueTime: initialTask.dueTime || '10:00',
                 description: initialTask.description || '',
                 priority: initialTask.priority,
                 assignedTo: initialTask.assignedTo,
                 contactId: initialTask.relatedContactId || '',
                 reminder: {
                     enabled: true,
                     timeValue: 30,
                     timeUnit: 'minutes'
                 }
             });
             // Try to match category
             const cat = TASK_CATEGORIES.find(c => c.options.includes(initialTask.title));
             if (cat) setSelectedCategory(cat.name);
        } else {
             // New Mode
             setNewTask({
                title: '',
                dueDate: new Date().toISOString().split('T')[0],
                dueTime: '10:00',
                description: '',
                priority: 'Normal',
                assignedTo: currentUser?.name || 'Me',
                contactId: contact?.id || '',
                reminder: {
                    enabled: true,
                    timeValue: 30,
                    timeUnit: 'minutes'
                }
             });
             setSelectedCategory(TASK_CATEGORIES[0].name);
        }
    }
  }, [isOpen, currentUser, contact, initialTask]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title) return;

    const inferredType = inferTaskType(newTask.title);
    
    const selectedContact = contact || (contacts?.find(c => c.id === newTask.contactId));

    const taskData: any = {
      title: newTask.title,
      type: inferredType,
      dueDate: newTask.dueDate,
      dueTime: newTask.dueTime,
      description: newTask.description,
      status: 'Pending',
      priority: newTask.priority,
      assignedTo: newTask.assignedTo,
      relatedContactName: selectedContact?.name,
      relatedContactId: selectedContact?.id,
      reminder: newTask.reminder
    };

    await onSubmit(taskData);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                <CheckSquare size={20} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">{initialTask ? 'Editar Tarea' : 'Nueva Tarea'}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Contact Selection (if no specific contact is passed) */}
          {!contact && contacts && contacts.length > 0 && (
             <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contacto Relacionado</label>
                <select 
                    value={newTask.contactId} 
                    onChange={e => setNewTask({...newTask, contactId: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                >
                    <option value="">-- Sin contacto específico --</option>
                    {contacts.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.company})</option>
                    ))}
                </select>
             </div>
          )}

          {/* Category & Title Selection */}
          <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">¿Qué quieres hacer?</label>
                <select 
                    value={selectedCategory}
                    onChange={(e) => {
                        setSelectedCategory(e.target.value);
                        setNewTask(prev => ({ ...prev, title: '' })); // Reset title when category changes
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                >
                    {TASK_CATEGORIES.map(cat => (
                        <option key={cat.name} value={cat.name}>{cat.name}</option>
                    ))}
                </select>
            </div>
            
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Acción Específica</label>
                <select 
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                    required
                >
                    <option value="">Seleccionar acción...</option>
                    {TASK_CATEGORIES.find(c => c.name === selectedCategory)?.options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
              <div className="relative">
                  <input
                      type="text"
                      readOnly
                      value={newTask.dueDate ? format(parseISO(newTask.dueDate), 'dd/MM/yyyy') : ''}
                      className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
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
                className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prioridad</label>
              <select
                value={newTask.priority}
                onChange={e => setNewTask({...newTask, priority: e.target.value as any})}
                className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
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
                className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              >
                <option value={currentUser?.name || 'Me'}>Mí (Actual)</option>
                {team.filter(m => m.role !== 'Support').map(member => (
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
              className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none text-sm"
              placeholder="Detalles adicionales..."
            />
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Clock size={16} className="text-blue-600" /> Recordatorio
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
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2">
              <CheckSquare size={18} />
              Guardar Tarea
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
