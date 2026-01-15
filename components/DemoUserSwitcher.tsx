import React, { useState } from 'react';
import { Users, Check } from 'lucide-react';
import { mockUsers } from '../src/mocks/data';
import { CurrentUser } from '../types';

export const DemoUserSwitcher: React.FC = () => {
  const isDemo = import.meta.env.VITE_DEMO_MODE === 'true';
  const [isOpen, setIsOpen] = useState(false);

  if (!isDemo) return null;

  const currentUserStr = localStorage.getItem('nexus_user');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

  const handleSwitch = (user: CurrentUser) => {
    localStorage.setItem('nexus_user', JSON.stringify(user));
    localStorage.setItem('nexus_auth_token', user.token || 'mock-token');
    window.location.reload();
  };

  return (
    <div className="fixed bottom-24 right-4 z-[200] flex flex-col items-end">
      {isOpen && (
        <div className="bg-white rounded-lg shadow-xl border border-slate-200 mb-4 p-2 w-64 animate-in slide-in-from-bottom-2">
          <div className="text-xs font-bold text-slate-500 uppercase px-2 py-1 mb-2">Cambiar Usuario Demo</div>
          <div className="space-y-1">
            {Object.values(mockUsers).map((user) => (
              <button
                key={user.id}
                onClick={() => handleSwitch(user)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                  currentUser?.email === user.email 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <img src={user.avatar} alt={user.name} className="w-6 h-6 rounded-full" />
                <div className="text-left flex-1">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-[10px] text-slate-400">{user.role}</div>
                </div>
                {currentUser?.email === user.email && <Check size={14} />}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-full shadow-lg transition-transform active:scale-95 flex items-center gap-2"
        title="Cambiar Usuario Demo"
      >
        <Users size={20} />
        {isOpen && <span className="text-sm font-medium pr-1">Cerrar</span>}
      </button>
    </div>
  );
};
