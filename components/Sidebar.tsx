
import React from 'react';
import { LayoutDashboard, Users, MessageSquare, Kanban, Workflow, Settings, PieChart, LifeBuoy, RefreshCcw, Package, Building2 } from 'lucide-react';
import { CurrentUser, UserRole, CompanyProfile } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: CurrentUser;
  setCurrentUser: (user: CurrentUser) => void;
  companyProfile: CompanyProfile;
}

const MenuItem = ({ id, label, icon: Icon, active, onClick }: any) => (
  <button
    onClick={() => onClick(id)}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
      active 
        ? 'bg-indigo-600 text-white shadow-md' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    <Icon size={20} className={active ? 'text-white' : 'text-slate-500 group-hover:text-white'} />
    <span className="font-medium text-sm">{label}</span>
  </button>
);

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, currentUser, setCurrentUser, companyProfile }) => {
  
  const toggleRole = () => {
    if (currentUser.role === 'MANAGER') {
      setCurrentUser({ name: 'Carlos Ruiz', role: 'SALES_REP', avatar: 'CR' });
      // Redirect to dashboard if on a restricted page when switching
      if (activeTab === 'automation' || activeTab === 'settings' || activeTab === 'reports') {
        setActiveTab('dashboard');
      }
    } else {
      setCurrentUser({ name: 'John Doe', role: 'MANAGER', avatar: 'JD' });
    }
  };

  return (
    <div className="w-64 bg-slate-900 h-full flex flex-col flex-shrink-0 shadow-xl border-r border-slate-800">
      <div className="p-6 border-b border-slate-800 flex items-center gap-3 hidden lg:flex">
        {companyProfile.logoUrl ? (
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center">
                <img src={companyProfile.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            </div>
        ) : (
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                <Building2 size={16} className="text-white" />
            </div>
        )}
        <span className="text-xl font-bold text-white tracking-tight truncate">{companyProfile.name}</span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">Menú Principal</div>
        
        {/* OPTIMIZED ORDER: Dashboard -> Inbox -> Pipeline -> Contacts */}
        <MenuItem id="dashboard" label="Tablero" icon={LayoutDashboard} active={activeTab === 'dashboard'} onClick={setActiveTab} />
        <MenuItem id="inbox" label="Bandeja de Entrada" icon={MessageSquare} active={activeTab === 'inbox'} onClick={setActiveTab} />
        <MenuItem id="pipeline" label="Embudo de Ventas" icon={Kanban} active={activeTab === 'pipeline'} onClick={setActiveTab} />
        <MenuItem id="contacts" label="Contactos" icon={Users} active={activeTab === 'contacts'} onClick={setActiveTab} />
        <MenuItem id="products" label="Productos / Servicios" icon={Package} active={activeTab === 'products'} onClick={setActiveTab} />
        <MenuItem id="support" label="Tutoriales & Soporte" icon={LifeBuoy} active={activeTab === 'support'} onClick={setActiveTab} />
        
        {currentUser.role === 'MANAGER' && (
           <>
             <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-8 mb-4 px-2">Gerencia & Sistema</div>
             <MenuItem id="reports" label="Reportes de Equipo" icon={PieChart} active={activeTab === 'reports'} onClick={setActiveTab} />
             <MenuItem id="automation" label="Automatización" icon={Workflow} active={activeTab === 'automation'} onClick={setActiveTab} />
             <MenuItem id="settings" label="Configuración" icon={Settings} active={activeTab === 'settings'} onClick={setActiveTab} />
           </>
        )}
      </nav>

      {/* Role Switcher for Demo Purposes */}
      <div className="px-4 mb-2">
         <button 
           onClick={toggleRole}
           className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 flex items-center justify-center gap-2 border border-slate-700"
         >
           <RefreshCcw size={12} />
           Cambiar a vista {currentUser.role === 'MANAGER' ? 'Vendedor' : 'Gerente'}
         </button>
      </div>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
            {currentUser.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{currentUser.name}</p>
            <p className="text-xs text-slate-400 truncate capitalize">{currentUser.role === 'SALES_REP' ? 'Vendedor' : 'Gerente'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
