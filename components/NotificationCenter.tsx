import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, X, Info, AlertTriangle, AlertCircle, CheckCircle, Settings, Mail, Monitor } from 'lucide-react';
import { Notification } from '../types';
import { api } from '../src/services/api';

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onNavigate: (linkTo: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onClose,
  onNavigate
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [prefs, setPrefs] = useState({ email_enabled: true, browser_enabled: true, urgent_only: false });

  useEffect(() => {
    if (showSettings) {
        api.notifications.getPreferences().then(setPrefs).catch(console.error);
    }
  }, [showSettings]);

  const togglePref = async (key: keyof typeof prefs) => {
      const newPrefs = { ...prefs, [key]: !prefs[key] };
      setPrefs(newPrefs);
      try {
          await api.notifications.savePreferences(newPrefs);
      } catch (e) {
          console.error("Failed to save prefs", e);
      }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'urgent') return n.type === 'urgent' || n.type === 'error';
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="text-green-500" size={18} />;
      case 'warning': return <AlertTriangle className="text-amber-500" size={18} />;
      case 'error': return <AlertCircle className="text-red-500" size={18} />;
      case 'urgent': return <Bell className="text-red-600 animate-pulse" size={18} />;
      default: return <Info className="text-blue-500" size={18} />;
    }
  };

  return (
    <div className="absolute right-0 top-12 w-80 md:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-slate-800">{showSettings ? 'Configuración' : 'Notificaciones'}</h3>
          {!showSettings && <p className="text-xs text-slate-500">{notifications.filter(n => !n.read).length} sin leer</p>}
        </div>
        <div className="flex gap-2">
          {!showSettings && (
            <button 
                onClick={onMarkAllRead}
                title="Marcar todas como leídas"
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
                <Check size={16} />
            </button>
          )}
          <button 
            onClick={() => setShowSettings(!showSettings)}
            title="Configuración"
            className={`p-1.5 rounded-lg transition-colors ${showSettings ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'}`}
          >
            <Settings size={16} />
          </button>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {showSettings ? (
        <div className="p-4 flex flex-col gap-4 bg-white flex-1">
            <p className="text-sm text-slate-600 mb-2">Personaliza cómo quieres recibir tus alertas.</p>
            
            <div className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => togglePref('email_enabled')}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${prefs.email_enabled ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                        <Mail size={18} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-800">Email</p>
                        <p className="text-xs text-slate-500">Recibir resúmenes por correo</p>
                    </div>
                </div>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${prefs.email_enabled ? 'bg-blue-600' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${prefs.email_enabled ? 'left-6' : 'left-1'}`} />
                </div>
            </div>

            <div className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => togglePref('browser_enabled')}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${prefs.browser_enabled ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                        <Monitor size={18} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-800">Navegador</p>
                        <p className="text-xs text-slate-500">Alertas visuales en pantalla</p>
                    </div>
                </div>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${prefs.browser_enabled ? 'bg-blue-600' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${prefs.browser_enabled ? 'left-6' : 'left-1'}`} />
                </div>
            </div>

            <div className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => togglePref('urgent_only')}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${prefs.urgent_only ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
                        <AlertTriangle size={18} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-800">Solo Urgentes</p>
                        <p className="text-xs text-slate-500">Ignorar informativas</p>
                    </div>
                </div>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${prefs.urgent_only ? 'bg-blue-600' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${prefs.urgent_only ? 'left-6' : 'left-1'}`} />
                </div>
            </div>

        </div>
      ) : (
        <>
      {/* Tabs */}
      <div className="flex border-b border-slate-100">
        <button 
          onClick={() => setFilter('all')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${filter === 'all' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          Todas
        </button>
        <button 
          onClick={() => setFilter('unread')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${filter === 'unread' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          Sin Leer
        </button>
        <button 
          onClick={() => setFilter('urgent')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${filter === 'urgent' ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          Urgentes
        </button>
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1 p-0 scrollbar-thin scrollbar-thumb-slate-200">
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Bell size={32} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm">No hay notificaciones</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filteredNotifications.map(n => (
              <div 
                key={n.id} 
                className={`p-4 hover:bg-slate-50 transition-colors group relative ${!n.read ? 'bg-blue-50/30' : ''}`}
              >
                <div className="flex gap-3 items-start">
                  <div className="mt-1 flex-shrink-0">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0" onClick={() => {
                      if (!n.read) onMarkRead(n.id);
                      if (n.linkTo) onNavigate(n.linkTo);
                  }}>
                    <div className="flex justify-between items-start mb-0.5">
                      <p className={`text-sm ${!n.read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                        {n.timestamp}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                    {n.linkTo && (
                        <p className="text-[10px] text-blue-600 mt-1 font-medium cursor-pointer hover:underline">Ver detalles &rarr;</p>
                    )}
                  </div>
                  
                  {/* Actions (Hover) */}
                  <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 bg-white/80 backdrop-blur-sm p-1 rounded shadow-sm">
                    {!n.read && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onMarkRead(n.id); }}
                        className="p-1 text-blue-400 hover:text-blue-600 rounded hover:bg-blue-50"
                        title="Marcar como leída"
                      >
                        <Check size={12} />
                      </button>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete(n.id); }}
                      className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                      title="Eliminar"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
        {!showSettings ? (
            <button className="text-[10px] text-slate-500 hover:text-blue-600 font-medium transition-colors" onClick={() => setShowSettings(true)}>
                Configurar Preferencias
            </button>
        ) : (
            <button className="text-[10px] text-slate-500 hover:text-blue-600 font-medium transition-colors" onClick={() => setShowSettings(false)}>
                Volver a Notificaciones
            </button>
        )}
      </div>
      </>
      )}
    </div>
  );
};
