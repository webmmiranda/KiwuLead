
import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { DollarSign, Users, TrendingUp, Activity, Lock, CheckSquare, Calendar, Phone, Mail, X } from 'lucide-react';
import { CurrentUser, Task, Contact, LeadStatus } from '../types';

const StatCard = ({ title, value, change, icon: Icon, color }: any) => (
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
    <div className="mt-4 flex items-center text-sm">
      <span className={change > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
        {change > 0 ? '+' : ''}{change}%
      </span>
      <span className="text-slate-400 ml-2">vs mes anterior</span>
    </div>
  </div>
);

interface DashboardProps {
  currentUser?: CurrentUser;
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  contacts: Contact[];
}

export const Dashboard: React.FC<DashboardProps> = ({ currentUser, tasks, setTasks, contacts }) => {
  const isManager = currentUser?.role === 'MANAGER';
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  
  // New Task Form State
  const [newTask, setNewTask] = useState({
      title: '',
      type: 'Call',
      dueDate: '',
      priority: 'Normal',
      contactId: ''
  });

  // Filter tasks
  const myTasks = tasks.filter(t => t.assignedTo === currentUser?.name && t.status === 'Pending');

  // Dynamic Metrics
  const relevantContacts = isManager ? contacts : contacts.filter(c => c.owner === currentUser?.name);
  const totalValue = relevantContacts.reduce((sum, c) => sum + c.value, 0);
  const totalLeads = relevantContacts.length;
  
  // Dynamic Funnel Calculation
  const funnelData = [
      { name: 'Nuevos', value: relevantContacts.filter(c => c.status === LeadStatus.NEW).length },
      { name: 'Contactados', value: relevantContacts.filter(c => c.status === LeadStatus.CONTACTED).length },
      { name: 'Calificados', value: relevantContacts.filter(c => c.status === LeadStatus.QUALIFIED).length },
      { name: 'Ganados', value: relevantContacts.filter(c => c.status === LeadStatus.WON).length },
  ];

  const handleCompleteTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status: 'Done' } : t));
  };

  const handleAddTask = (e: React.FormEvent) => {
      e.preventDefault();
      
      const linkedContact = contacts.find(c => c.id === newTask.contactId);

      const task: Task = {
          id: Date.now().toString(),
          title: newTask.title,
          type: newTask.type as any,
          dueDate: newTask.dueDate || 'Hoy',
          status: 'Pending',
          priority: newTask.priority as any,
          assignedTo: currentUser?.name || 'Me',
          relatedContactName: linkedContact ? linkedContact.name : undefined,
          relatedContactId: linkedContact ? linkedContact.id : undefined
      };
      setTasks([task, ...tasks]);
      setIsTaskModalOpen(false);
      setNewTask({ title: '', type: 'Call', dueDate: '', priority: 'Normal', contactId: '' });
  };

  // Mock Graph Data based on value (Dynamic scaling)
  const graphData = [
    { name: 'Lun', sales: totalValue * 0.1 },
    { name: 'Mar', sales: totalValue * 0.15 },
    { name: 'Mie', sales: totalValue * 0.3 },
    { name: 'Jue', sales: totalValue * 0.2 },
    { name: 'Vie', sales: totalValue * 0.25 },
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
        <StatCard title={isManager ? "Valor Total Pipeline" : "Mi Valor de Pipeline"} value={`$${totalValue.toLocaleString()}`} change={12.5} icon={DollarSign} color="bg-indigo-500" />
        <StatCard title={isManager ? "Total Leads" : "Mis Leads Activos"} value={totalLeads} change={-2.4} icon={Users} color="bg-blue-500" />
        <StatCard title="Tasa de Conversión" value="24.8%" change={4.1} icon={TrendingUp} color="bg-emerald-500" />
        <StatCard title="Tareas Pendientes" value={myTasks.length} change={0} icon={CheckSquare} color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Pronóstico de Ingresos</h3>
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={graphData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} prefix="$" />
                <Tooltip 
                  contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  itemStyle={{color: '#1e293b'}}
                />
                <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Funnel Widget (Replaced Tasks for better dashboard view, or keep tasks and add funnel) */}
        {/* Let's keep Tasks as they are interactive, maybe add Funnel below or replace graph? Let's stick to requested cleanup: Tasks is good. */}
        
        {/* Tasks Widget */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Mis Próximas Tareas</h3>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold">{myTasks.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar" style={{maxHeight: '320px'}}>
             {myTasks.length > 0 ? myTasks.map(task => (
               <div key={task.id} className="p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors group">
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${task.priority === 'High' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                      {task.priority === 'High' ? 'Alta' : task.priority === 'Normal' ? 'Normal' : 'Baja'}
                    </span>
                    <span className="text-xs text-slate-400">{task.dueDate}</span>
                  </div>
                  <h4 className="text-sm font-medium text-slate-800">{task.title}</h4>
                  {task.relatedContactName && (
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Users size={10} /> {task.relatedContactName}
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
                       <button className="px-2 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100"><Phone size={12}/></button>
                    )}
                    {task.type === 'Email' && (
                       <button className="px-2 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100"><Mail size={12}/></button>
                    )}
                  </div>
               </div>
             )) : (
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
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Estado del Embudo (Tiempo Real)</h3>
          <div className="h-48 flex justify-around items-end px-4">
              {funnelData.map((data, index) => {
                  const maxVal = Math.max(...funnelData.map(d => d.value));
                  const height = data.value > 0 ? (data.value / maxVal) * 100 : 5;
                  const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-green-500'];
                  
                  return (
                      <div key={data.name} className="flex flex-col items-center gap-2 w-full">
                          <div className="text-xs font-bold text-slate-900">{data.value}</div>
                          <div 
                            className={`w-full max-w-[80px] rounded-t-lg transition-all duration-500 ${colors[index]}`} 
                            style={{ height: `${height}%`, opacity: 0.8 }}
                          ></div>
                          <div className="text-xs text-slate-500">{data.name}</div>
                      </div>
                  )
              })}
          </div>
      </div>

      {/* New Task Modal */}
      {isTaskModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-900">Nueva Tarea</h3>
                    <button onClick={() => setIsTaskModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                </div>
                <form onSubmit={handleAddTask} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
                        <input required type="text" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Llamar a cliente..." />
                    </div>
                    
                    {/* Improved Contact Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Relacionado con (Lead)</label>
                        <select 
                            value={newTask.contactId} 
                            onChange={e => setNewTask({...newTask, contactId: e.target.value})}
                            className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="">-- Seleccionar Contacto --</option>
                            {relevantContacts.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.company})</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                            <select value={newTask.type} onChange={e => setNewTask({...newTask, type: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                                <option value="Call">Llamada</option>
                                <option value="Email">Email</option>
                                <option value="Meeting">Reunión</option>
                                <option value="Task">General</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Prioridad</label>
                            <select value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                                <option value="Low">Baja</option>
                                <option value="Normal">Normal</option>
                                <option value="High">Alta</option>
                            </select>
                        </div>
                    </div>

                    <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Límite</label>
                         <input type="date" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>

                    <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 mt-2">Crear Tarea</button>
                </form>
            </div>
          </div>
      )}
    </div>
  );
};
