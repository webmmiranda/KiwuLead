import React from 'react';
import { ArrowLeft, Info } from 'lucide-react';

export const DemoBanner: React.FC = () => {
  return (
    <div className="bg-indigo-600 text-white text-sm py-2 px-4 flex items-center justify-between shadow-md relative z-50">
      <div className="flex items-center gap-2">
        <Info size={16} className="text-indigo-200" />
        <span className="font-medium hidden md:inline">
          Estás viendo una versión Demo de KiwüLead. Los datos son simulados y no se guardarán permanentemente.
        </span>
        <span className="font-medium md:hidden">
          Versión Demo de KiwüLead
        </span>
      </div>
      <a 
        href="../index.html" 
        className="flex items-center gap-1 bg-white/10 hover:bg-white/20 px-3 py-1 rounded transition-colors text-xs font-semibold uppercase tracking-wide"
      >
        <ArrowLeft size={14} />
        Volver al Sitio
      </a>
    </div>
  );
};
