
import React from 'react';
import { AutomationRule, AutomationCategory } from '../types';
import { Zap, Settings, Shield, BarChart3, Repeat, ToggleLeft, ToggleRight, Check, Play } from 'lucide-react';

interface AutomationProps {
  rules: AutomationRule[];
  setRules: (rules: AutomationRule[]) => void;
}

export const Automation: React.FC<AutomationProps> = ({ rules, setRules }) => {
  
  const toggleRule = (id: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
  };

  const categories: { id: AutomationCategory; label: string; icon: any; color: string }[] = [
    { id: 'CORE', label: 'Esenciales (Core)', icon: Zap, color: 'text-amber-500' },
    { id: 'SALES', label: 'Flujos de Venta', icon: Settings, color: 'text-indigo-500' },
    { id: 'QUALITY', label: 'Control y Calidad', icon: Shield, color: 'text-emerald-500' },
    { id: 'REPORTING', label: 'Reportes y Alertas', icon: BarChart3, color: 'text-blue-500' },
    { id: 'LIFECYCLE', label: 'Ciclo de Vida / Post-Venta', icon: Repeat, color: 'text-purple-500' },
  ];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <Zap className="text-amber-500 fill-amber-500" /> Centro de Automatización
        </h2>
        <p className="text-slate-500 mt-1">
          Gestiona las reglas de negocio que operan en segundo plano. <span className="text-indigo-600 font-bold">Estas reglas están vivas y afectan el comportamiento del CRM.</span>
        </p>
      </div>

      <div className="space-y-8">
        {categories.map((cat) => (
          <div key={cat.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <cat.icon size={20} className={cat.color} />
              <h3 className="font-bold text-slate-800">{cat.label}</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {rules.filter(r => r.category === cat.id).map((rule) => (
                <div key={rule.id} className="p-6 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`font-semibold text-base ${rule.isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                        {rule.name}
                      </h4>
                      {rule.isActive && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Activo</span>}
                    </div>
                    <p className="text-sm text-slate-500">{rule.description}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-400 font-mono">
                       <Play size={10} /> Trigger: {rule.trigger}
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => toggleRule(rule.id)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${rule.isActive ? 'bg-indigo-600' : 'bg-slate-200'}`}
                  >
                    <span
                      className={`${
                        rule.isActive ? 'translate-x-6' : 'translate-x-1'
                      } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
