
import React, { useState } from 'react';
import { Task, Contact, CurrentUser, Appointment } from '../types';
import { Search, Filter, CheckSquare, Clock, AlertCircle, Plus, Calendar, MapPin, Users, Phone, Mail, Edit, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { TaskModal } from './TaskModal';

interface TasksProps {
  currentUser: CurrentUser;
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  appointments: Appointment[];
  contacts: Contact[];
}

export const Tasks: React.FC<TasksProps> = ({ currentUser, tasks, setTasks, appointments, contacts }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Done'>('Pending');
  const [filterPriority, setFilterPriority] = useState<'All' | 'High' | 'Normal' | 'Low'>('All');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);

  // Transform appointments to match Task structure
  const appointmentTasks = appointments
    .filter(a => (a.assignedTo === currentUser?.name || a.userName === currentUser?.name))
    .map(a => ({
        id: a.id,
        title: a.title,
        status: (new Date(a.end) < new Date() ? 'Done' : 'Pending') as 'Pending' | 'Done',
        dueDate: format(new Date(a.start), 'yyyy-MM-dd'),
        dueTime: format(new Date(a.start), 'HH:mm'),
        priority: 'Normal' as const,
        assignedTo: a.assignedTo || a.userName,
        relatedContactName: a.contactName,
        type: 'Meeting' as const,
        isAppointment: true,
        description: a.description,
        location: a.location
    }));

  // Merge and Filter
  const allItems = [...tasks, ...appointmentTasks].filter(item => {
    // 1. User Filter (Show my tasks)
    if (item.assignedTo !== currentUser.name) return false;

    // 2. Status Filter
    if (filterStatus !== 'All' && item.status !== filterStatus) return false;

    // 3. Priority Filter
    if (filterPriority !== 'All' && item.priority !== filterPriority) return false;

    // 4. Search
    if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
            item.title.toLowerCase().includes(searchLower) ||
            (item.relatedContactName && item.relatedContactName.toLowerCase().includes(searchLower))
        );
    }

    return true;
  });

  // Sort: Overdue first, then by Date
  const sortedItems = allItems.sort((a: any, b: any) => {
      const dateA = new Date(`${a.dueDate}T${a.dueTime || '00:00'}`);
      const dateB = new Date(`${b.dueDate}T${b.dueTime || '00:00'}`);
      return dateA.getTime() - dateB.getTime();
  });

  const isOverdue = (task: any) => {
    if (task.status === 'Done') return false;
    if (task.isAppointment) {
         const now = new Date();
         const aptDate = new Date(`${task.dueDate}T${task.dueTime}`);
         return aptDate < now;
    }
    const today = new Date().toISOString().split('T')[0];
    return task.dueDate < today;
  };

  const handleCompleteTask = async (id: string) => {
    try {
      const { api } = await import('../src/services/api');
      await api.tasks.update(id, { status: 'Done' });
      setTasks(tasks.map(t => t.id === id ? { ...t, status: 'Done' } : t));
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const handleTaskSubmit = async (taskData: Partial<Task>) => {
      try {
        const { api } = await import('../src/services/api');
        
        if (editingTask) {
             // Update existing
             const updatedData = { ...taskData };
             // Assuming API update supports Partial<Task>
             await api.tasks.update(editingTask.id, updatedData as any);
             setTasks(tasks.map(t => t.id === editingTask.id ? { ...t, ...updatedData } : t));
        } else {
            // Create new
            const finalTaskData = {
              ...taskData,
              status: 'Pending' as const,
              assignedTo: taskData.assignedTo || currentUser?.name || 'Me',
            };
            const res = await api.tasks.create(finalTaskData as any);
            const newTaskWithId: Task = {
              ...finalTaskData as Task,
              id: res.id || Date.now().toString(),
            };
            setTasks([newTaskWithId, ...tasks]);
        }
        setIsTaskModalOpen(false);
        setEditingTask(undefined);
      } catch (error) {
        console.error('Error saving task:', error);
      }
    };

    const handleEditClick = (task: Task) => {
        setEditingTask(task);
        setIsTaskModalOpen(true);
    };

    const handleCancelTask = async (task: Task) => {
        if (!confirm('¿Estás seguro de que deseas cancelar esta tarea?')) return;
        try {
            const { api } = await import('../src/services/api');
            await api.tasks.update(task.id, { status: 'Cancelled' });
            setTasks(tasks.map(t => t.id === task.id ? { ...t, status: 'Cancelled' } : t));
        } catch (error) {
            console.error('Error cancelling task:', error);
        }
    };

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <CheckSquare className="text-blue-600" /> Mis Tareas
                </h1>
                <p className="text-slate-500 text-sm">Gestiona tus actividades y recordatorios.</p>
            </div>
            <button 
                onClick={() => {
                    setEditingTask(undefined);
                    setIsTaskModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
            >
                <Plus size={18} /> Nueva Tarea
            </button>
        </div>

        {/* Filters & Search */}
        <div className="p-4 md:p-6 pb-0">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Buscar tarea o contacto..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                    <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                        <button onClick={() => setFilterStatus('All')} className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${filterStatus === 'All' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Todas</button>
                        <button onClick={() => setFilterStatus('Pending')} className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${filterStatus === 'Pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Pendientes</button>
                        <button onClick={() => setFilterStatus('Done')} className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${filterStatus === 'Done' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Completadas</button>
                    </div>

                    <select 
                        value={filterPriority} 
                        onChange={(e) => setFilterPriority(e.target.value as any)}
                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="All">Prioridad: Todas</option>
                        <option value="High">Alta</option>
                        <option value="Normal">Normal</option>
                        <option value="Low">Baja</option>
                    </select>
                </div>
            </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
            {sortedItems.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                    {sortedItems.map((task: any) => {
                        const overdue = isOverdue(task);
                        return (
                            <div key={task.id} className={`group bg-white p-4 rounded-xl border hover:shadow-md transition-all ${overdue ? 'border-red-200 bg-red-50/30' : 'border-slate-200'} ${task.status === 'Done' ? 'opacity-60 bg-slate-50' : ''}`}>
                                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                                    {/* Left: Check & Info */}
                                    <div className="flex items-start gap-4">
                                        {!task.isAppointment && task.status !== 'Done' && (
                                            <button 
                                                onClick={() => handleCompleteTask(task.id)}
                                                className="mt-1 w-6 h-6 rounded border-2 border-slate-300 text-transparent hover:border-blue-500 hover:text-blue-500 flex items-center justify-center transition-all"
                                            >
                                                <CheckSquare size={16} fill="currentColor" />
                                            </button>
                                        )}
                                        {task.status === 'Done' && (
                                            <div className="mt-1 w-6 h-6 rounded bg-green-500 text-white flex items-center justify-center">
                                                <CheckSquare size={16} />
                                            </div>
                                        )}
                                        {task.isAppointment && (
                                             <div className="mt-1 w-6 h-6 rounded bg-purple-100 text-purple-600 flex items-center justify-center">
                                                <Calendar size={16} />
                                             </div>
                                        )}

                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className={`font-semibold text-slate-900 ${task.status === 'Done' ? 'line-through text-slate-500' : ''}`}>{task.title}</h3>
                                                {task.priority === 'High' && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold uppercase rounded-full">Alta</span>}
                                                {task.isAppointment && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold uppercase rounded-full">Cita</span>}
                                            </div>
                                            
                                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                                                <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-bold' : ''}`}>
                                                    <Clock size={14} /> {task.dueDate} • {task.dueTime} {overdue && '(Vencida)'}
                                                </span>
                                                
                                                {task.relatedContactName && (
                                                    <span className="flex items-center gap-1">
                                                        <Users size={14} /> {task.relatedContactName}
                                                    </span>
                                                )}

                                                {task.location && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin size={14} /> {task.location}
                                                    </span>
                                                )}
                                            </div>
                                            {task.description && (
                                                <p className="text-slate-600 text-sm mt-2 line-clamp-2">{task.description}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {!task.isAppointment && task.status !== 'Done' && task.status !== 'Cancelled' && (
                                            <>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditClick(task);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCancelTask(task);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Cancelar"
                                                >
                                                    <XCircle size={16} />
                                                </button>
                                            </>
                                        )}
                                        {task.type === 'Call' && (
                                            <button className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Llamar">
                                                <Phone size={16} />
                                            </button>
                                        )}
                                        {(task.type === 'Email' || task.type === 'Meeting') && (
                                            <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Enviar Email">
                                                <Mail size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <CheckSquare size={64} className="mb-4 opacity-20" />
                    <h3 className="text-lg font-medium text-slate-600">Todo listo</h3>
                    <p>No hay tareas que coincidan con los filtros.</p>
                </div>
            )}
        </div>

        <TaskModal
            isOpen={isTaskModalOpen}
            onClose={() => {
                setIsTaskModalOpen(false);
                setEditingTask(undefined);
            }}
            onSubmit={handleTaskSubmit}
            contacts={contacts}
            currentUser={currentUser}
            initialTask={editingTask}
        />
    </div>
  );
};
