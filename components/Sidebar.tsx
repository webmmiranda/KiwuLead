
import React from 'react';
import { LayoutDashboard, Users, MessageSquare, Kanban, Workflow, Settings, PieChart, RefreshCcw, Package, Building2, Calendar, Mail, Terminal, Shield, LogOut, CheckSquare } from 'lucide-react';
import { CurrentUser, UserRole, CompanyProfile } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: CurrentUser;
  setCurrentUser: (user: CurrentUser) => void;
  companyProfile: CompanyProfile;
  onLogout: () => void;
  isSupportMode?: boolean;
}

const MenuItem = ({ id, label, icon: Icon, active, onClick }: any) => (
  <button
    onClick={() => onClick(id)}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${active
        ? 'bg-blue-600 text-white shadow-md'
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
  >
    <Icon size={20} className={active ? 'text-white' : 'text-slate-500 group-hover:text-white'} />
    <span className="font-medium text-sm">{label}</span>
  </button>
);

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, currentUser, setCurrentUser, companyProfile, onLogout, isSupportMode }) => {

  const getNextRoleName = () => {
    if (currentUser.role === 'SALES_REP') return 'Gerente';
    if (currentUser.role === 'MANAGER') return 'Soporte';
    return 'Vendedor';
  };

  const getCurrentRoleLabel = () => {
    if (currentUser.role === 'SALES_REP') return 'Vendedor';
    if (currentUser.role === 'MANAGER') return 'Gerente';
    return 'Soporte';
  };

  return (
    <div className="w-64 bg-slate-900 h-full flex flex-col flex-shrink-0 shadow-xl border-r border-slate-800">
      <div className="p-6 border-b border-slate-800 flex items-center gap-3 hidden lg:flex">
        {companyProfile.logoUrl ? (
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center">
            <img src={companyProfile.logoUrl} alt="Logo" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <Building2 size={16} className="text-white" />
          </div>
        )}
        <span className="text-xl font-bold text-white tracking-tight truncate">{companyProfile.name}</span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">Menú Principal</div>

        {/* OPTIMIZED ORDER: Dashboard -> Leads -> Email -> Inbox -> Calendar -> Catalog */}
        <MenuItem id="dashboard" label="Tablero" icon={LayoutDashboard} active={activeTab === 'dashboard'} onClick={setActiveTab} />
        <MenuItem id="pipeline" label="Leads" icon={Kanban} active={activeTab === 'pipeline'} onClick={setActiveTab} />
        <MenuItem id="tasks" label="Tareas" icon={CheckSquare} active={activeTab === 'tasks'} onClick={setActiveTab} />
        <MenuItem id="mail" label="Email" icon={Mail} active={activeTab === 'mail'} onClick={setActiveTab} />
        <MenuItem id="inbox" label="Inbox" icon={MessageSquare} active={activeTab === 'inbox'} onClick={setActiveTab} />
        <MenuItem id="calendar" label="Calendario" icon={Calendar} active={activeTab === 'calendar'} onClick={setActiveTab} />
        <MenuItem id="products" label="Catálogo" icon={Package} active={activeTab === 'products'} onClick={setActiveTab} />
        
        {/* Support Mode (via Impersonation) or Manager/Support Role */}
        {(currentUser.role === 'MANAGER' || currentUser.role === 'SUPPORT' || isSupportMode) && (
          <>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-8 mb-4 px-2">Gerencia & Sistema</div>
            <MenuItem id="reports" label="Reportes de Equipo" icon={PieChart} active={activeTab === 'reports'} onClick={setActiveTab} />
            <MenuItem id="automation" label="Automatización" icon={Workflow} active={activeTab === 'automation'} onClick={setActiveTab} />
            <MenuItem id="settings" label="Configuración" icon={Settings} active={activeTab === 'settings'} onClick={setActiveTab} />
          </>
        )}

        {(currentUser.role === 'SUPPORT' || isSupportMode) && (
          <>
            <div className="text-xs font-semibold text-teal-500 uppercase tracking-wider mt-8 mb-4 px-2">Soporte Técnico</div>
            <MenuItem id="support" label="Panel de Control" icon={Terminal} active={activeTab === 'support'} onClick={setActiveTab} />
          </>
        )}
      </nav>

      {/* Role Switcher Removed as per requirements */}


      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-2">
            <button 
                onClick={() => setActiveTab('user-profile')}
                className="flex-1 flex items-center gap-3 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors text-left group"
                title="Ver Perfil"
            >
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate group-hover:text-blue-400 transition-colors">{currentUser.name}</p>
                    <p className="text-xs text-slate-400 truncate capitalize">{getCurrentRoleLabel()}</p>
                </div>
            </button>
            <button 
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-white hover:bg-red-900/50 rounded-lg transition-colors"
                title="Cerrar Sesión"
            >
                <LogOut size={20} />
            </button>
        </div>
      </div>
    </div>
  );
};
