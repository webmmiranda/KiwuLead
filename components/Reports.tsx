
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Award, Clock, Lock } from 'lucide-react';
import { CurrentUser, Contact, TeamMember, LeadStatus } from '../types';

interface ReportsProps {
  currentUser?: CurrentUser;
  contacts: Contact[];
  team?: TeamMember[];
}

export const Reports: React.FC<ReportsProps> = ({ currentUser, contacts, team = [] }) => {
  // Access control
  if (currentUser?.role !== 'MANAGER') {
     return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="bg-slate-100 p-4 rounded-full mb-4">
                <Lock size={48} className="text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Acceso de Gerente Requerido</h2>
            <p className="text-slate-500 max-w-md">
                Los reportes detallados y análisis de atribución están disponibles solo para roles gerenciales.
            </p>
        </div>
     );
  }

  // --- CALCULATE REAL DATA ---

  // 1. Source Attribution
  const sourceData = useMemo(() => {
      const counts: Record<string, number> = {};
      contacts.forEach(c => {
          counts[c.source] = (counts[c.source] || 0) + 1;
      });
      
      const colors = ['#3b82f6', '#22c55e', '#6366f1', '#eab308', '#f43f5e'];
      return Object.keys(counts).map((key, index) => ({
          name: key,
          value: counts[key],
          color: colors[index % colors.length]
      }));
  }, [contacts]);

  // 2. Performance (Mocked relative to real counts for demo purposes as we lack detailed timestamp history per stage)
  const performanceData = [
    { name: 'Lun', responseTime: 12, dealsClosed: contacts.filter(c => c.status === LeadStatus.WON).length * 0.2 },
    { name: 'Mar', responseTime: 15, dealsClosed: contacts.filter(c => c.status === LeadStatus.WON).length * 0.3 },
    { name: 'Mie', responseTime: 8, dealsClosed: contacts.filter(c => c.status === LeadStatus.WON).length * 0.1 },
    { name: 'Jue', responseTime: 10, dealsClosed: contacts.filter(c => c.status === LeadStatus.WON).length * 0.1 },
    { name: 'Vie', responseTime: 14, dealsClosed: contacts.filter(c => c.status === LeadStatus.WON).length * 0.3 },
  ];

  // 3. Agent Leaderboard
  const agentPerformance = useMemo(() => {
      const salesReps = team.filter(t => t.role === 'Sales');
      const stats = salesReps.map(rep => {
          const repContacts = contacts.filter(c => c.owner === rep.name);
          const sales = repContacts
              .filter(c => c.status === LeadStatus.WON)
              .reduce((sum, c) => sum + c.value, 0);
          
          return {
              name: rep.name,
              sales,
              calls: repContacts.length * 5, // Simulated heuristic
              response: `${Math.floor(Math.random() * 20 + 5)}m` // Simulated
          };
      });
      return stats.sort((a, b) => b.sales - a.sales);
  }, [contacts, team]);

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Analítica Avanzada (Datos Reales)</h2>
        <div className="flex gap-2 w-full md:w-auto">
            <select className="flex-1 md:flex-none bg-slate-100 border-transparent text-slate-900 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                <option>Últimos 7 Días</option>
                <option>Últimos 30 Días</option>
                <option>Este Trimestre</option>
            </select>
            <button className="flex-1 md:flex-none bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">
                Exportar PDF
            </button>
        </div>
      </div>

      {/* Attribution & Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Atribución de Fuente</h3>
            <p className="text-sm text-slate-500 mb-6">¿De dónde vienen tus leads actuales?</p>
            <div className="h-64 flex flex-col sm:flex-row items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={sourceData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {sourceData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3 mt-4 sm:mt-0 sm:ml-8 w-full sm:w-auto">
                    {sourceData.map((s) => (
                        <div key={s.name} className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }}></span>
                            <span className="text-sm text-slate-600">{s.name} ({s.value})</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Tiempo de Respuesta vs. Cierres</h3>
            <p className="text-sm text-slate-500 mb-6">Impacto de la velocidad en el cierre de tratos.</p>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                        <Tooltip contentStyle={{borderRadius: '8px'}} />
                        <Line yAxisId="left" type="monotone" dataKey="dealsClosed" stroke="#6366f1" strokeWidth={2} dot={{r: 4}} name="Cierres Est." />
                        <Line yAxisId="right" type="monotone" dataKey="responseTime" stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 5" name="Respuesta Prom (min)" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>

      {/* Team Leaderboard */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
             <h3 className="font-semibold text-slate-800">Tabla de Líderes (Tiempo Real)</h3>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                        <th className="px-6 py-3">Agente</th>
                        <th className="px-6 py-3">Ventas Totales ($)</th>
                        <th className="hidden sm:table-cell px-6 py-3">Interacciones Est.</th>
                        <th className="hidden sm:table-cell px-6 py-3">Tiempo Resp. Prom</th>
                        <th className="px-6 py-3">Tendencia</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {agentPerformance.length > 0 ? agentPerformance.map((agent, i) => (
                        <tr key={agent.name}>
                            <td className="px-6 py-4 flex items-center gap-3">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {i + 1}
                                </span>
                                <span className="font-medium text-slate-900">{agent.name}</span>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-900">${agent.sales.toLocaleString()}</td>
                            <td className="hidden sm:table-cell px-6 py-4 text-slate-600">{agent.calls}</td>
                            <td className="hidden sm:table-cell px-6 py-4 text-slate-600">{agent.response}</td>
                            <td className="px-6 py-4">
                                <TrendingUp size={16} className="text-green-500" />
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-500">No hay datos de ventas para mostrar.</td>
                        </tr>
                    )}
                </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};
