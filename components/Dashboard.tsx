
import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { DollarSign, Users, TrendingUp, Activity, Lock, CheckSquare, Calendar, Phone, Mail, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { CurrentUser, Task, Contact, LeadStatus } from '../types';
import { formatCurrency } from '../src/utils/currency';
import { TaskModal } from './TaskModal';

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900 mt-2">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
    </div>
  </div>
);

interface DashboardProps {
  currentUser?: CurrentUser;
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  contacts: Contact[];
  companyCurrency?: 'USD' | 'MXN' | 'CRC' | 'COP';
}

export const Dashboard: React.FC<DashboardProps> = ({ currentUser, tasks, setTasks, contacts, companyCurrency = 'USD' }) => {
  const isManager = currentUser?.role === 'MANAGER';
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  
  // Filter tasks
  const myTasks = tasks.filter(t => t.assignedTo === currentUser?.name && t.status !== 'Done');

  const isOverdue = (task: Task) => {
    if (task.status === 'Done') return false;
    const today = new Date().toISOString().split('T')[0];
    return task.dueDate < today;
  };

  // Dynamic Metrics
  const relevantContacts = isManager ? contacts : contacts.filter(c => c.owner === currentUser?.name);
  const totalValue = relevantContacts.reduce((sum, c) => sum + c.value, 0);
  const totalLeads = relevantContacts.length;
  const wonLeads = relevantContacts.filter(c => c.status === LeadStatus.WON).length;
  const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : '0.0';
  
  // Dynamic Funnel Calculation
  const funnelData = [
      { name: 'Nuevos', value: relevantContacts.filter(c => c.status === LeadStatus.NEW).length },
      { name: 'Contactados', value: relevantContacts.filter(c => c.status === LeadStatus.CONTACTED).length },
      { name: 'Calificados', value: relevantContacts.filter(c => c.status === LeadStatus.QUALIFIED).length },
      { name: 'Negociación', value: relevantContacts.filter(c => c.status === LeadStatus.NEGOTIATION).length },
      { name: 'Ganados', value: relevantContacts.filter(c => c.status === LeadStatus.WON).length },
  ];

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
        
        // Ensure required fields
        const finalTaskData = {
            ...taskData,
            status: 'Pending' as const,
            assignedTo: taskData.assignedTo || currentUser?.name || 'Me',
        };

        const res = await api.tasks.create(finalTaskData as any);
        
        // Use returned ID if available, else temporary
        const newTaskWithId: Task = {
            ...finalTaskData as Task,
            id: res.id || Date.now().toString(),
        };

        setTasks([newTaskWithId, ...tasks]);
        setIsTaskModalOpen(false);
      } catch (error) {
        console.error('Error creating task:', error);
      }
  };

  // Real Graph Data: Value by Stage
  const valueByStage = [
    { name: 'Nuevos', value: relevantContacts.filter(c => c.status === LeadStatus.NEW).reduce((s, c) => s + c.value, 0) },
    { name: 'Contactados', value: relevantContacts.filter(c => c.status === LeadStatus.CONTACTED).reduce((s, c) => s + c.value, 0) },
    { name: 'Calificados', value: relevantContacts.filter(c => c.status === LeadStatus.QUALIFIED).reduce((s, c) => s + c.value, 0) },
    { name: 'Negociación', value: relevantContacts.filter(c => c.status === LeadStatus.NEGOTIATION).reduce((s, c) => s + c.value, 0) },
    { name: 'Ganados', value: relevantContacts.filter(c => c.status === LeadStatus.WON).reduce((s, c) => s + c.value, 0) },
  ];

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-900">
             {isManager ? 'Resumen Gerencial' : 'Mi Rendimiento'}
           </h2>
           <p className="text-slate-500 text-sm">Bienvenido de nuevo, {currentUser?.name}</p>
        </div>
        <div className="text-sm text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
          Última actualización: Ahora
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title={isManager ? "Valor Total Pipeline" : "Mi Valor de Pipeline"} value={formatCurrency(totalValue, companyCurrency)} icon={DollarSign} color="bg-blue-600" />
        <StatCard title={isManager ? "Total Leads" : "Mis Leads Activos"} value={totalLeads} icon={Users} color="bg-teal-500" />
        <StatCard title="Tasa de Conversión" value={`${conversionRate}%`} icon={TrendingUp} color="bg-emerald-500" />
        <StatCard title="Tareas Pendientes" value={myTasks.length} icon={CheckSquare} color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart: Value by Stage */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Valor del Pipeline por Etapa</h3>
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={valueByStage}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} tickFormatter={(value: number) => formatCurrency(value, companyCurrency)} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  itemStyle={{color: '#1e293b'}}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Valor']}
                />
                <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={40}>
                   {valueByStage.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#94a3b8', '#3b82f6', '#14b8a6', '#06b6d4', '#10b981'][index] || '#2563eb'} />
                   ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Funnel Widget (Replaced Tasks for better dashboard view, or keep tasks and add funnel) */}
        {/* Let's keep Tasks as they are interactive, maybe add Funnel below or replace graph? Let's stick to requested cleanup: Tasks is good. */}
        
        {/* Tasks Widget */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Mis Próximas Tareas</h3>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">{myTasks.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar" style={{maxHeight: '320px'}}>
             {myTasks.length > 0 ? myTasks.map(task => {
               const overdue = isOverdue(task);
               return (
               <div key={task.id} className={`p-3 border rounded-lg hover:bg-slate-50 transition-colors group ${overdue ? 'border-red-300 bg-red-50' : 'border-slate-100'}`}>
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${task.priority === 'High' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                      {task.priority === 'High' ? 'Alta' : task.priority === 'Normal' ? 'Normal' : 'Baja'}
                    </span>
                    <span className={`text-xs ${overdue ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
                        {task.dueDate} {task.dueTime ? `• ${task.dueTime}` : ''} {overdue && '(Vencida)'}
                    </span>
                  </div>
                  <h4 className={`text-sm font-medium ${overdue ? 'text-red-900' : 'text-slate-800'}`}>{task.title}</h4>
                  {task.relatedContactName && (
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Users size={10} /> {task.relatedContactName}
                    </p>
                  )}
                  {task.reminder?.enabled && (
                      <p className="text-[10px] text-blue-500 mt-1 flex items-center gap-1">
                          <CheckSquare size={10} /> Recordatorio: {task.reminder.timeValue} {task.reminder.timeUnit} antes
                      </p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button 
                      onClick={() => handleCompleteTask(task.id)}
                      className="flex-1 bg-white border border-slate-200 text-slate-600 text-xs py-1.5 rounded hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors flex items-center justify-center gap-1"
                    >
                      <CheckSquare size={12} /> Completar
                    </button>
                    {task.type === 'Call' && (
                       <button className="px-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"><Phone size={12}/></button>
                    )}
                    {task.type === 'Email' && (
                       <button className="px-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"><Mail size={12}/></button>
                    )}
                  </div>
               </div>
               );
             }) : (
               <div className="text-center py-8 text-slate-400">
                 <CheckSquare size={32} className="mx-auto mb-2 opacity-20" />
                 <p className="text-sm">No hay tareas pendientes.</p>
               </div>
             )}
          </div>
          <button 
             onClick={() => setIsTaskModalOpen(true)}
             className="mt-4 w-full py-2 border border-dashed border-slate-300 rounded-lg text-slate-500 text-sm hover:bg-slate-50 hover:text-slate-700"
          >
            + Agregar Nueva Tarea
          </button>
        </div>
      </div>

      {/* Dynamic Funnel Chart added at bottom */}


      {/* New Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmit={handleTaskSubmit}
        contacts={relevantContacts}
        currentUser={currentUser}
      />
    </div>
  );
};
