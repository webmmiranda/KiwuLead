
import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone, ShieldCheck } from 'lucide-react';

export const InstallPWA: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if user is on iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    // Check if already in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;

    if (isIosDevice && !isStandalone) {
        setIsIOS(true);
        // Show prompt for iOS after a small delay if not installed
        setTimeout(() => setIsVisible(true), 3000);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:bottom-8 md:w-96 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-500">
      <div className="bg-white/95 backdrop-blur-md p-5 rounded-2xl shadow-2xl border border-indigo-100 ring-1 ring-black/5">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                <Smartphone size={20} />
            </div>
            <div>
                <h4 className="font-bold text-slate-900 leading-tight">Instalar App</h4>
                <p className="text-xs text-slate-500">Nexus CRM</p>
            </div>
          </div>
          <button 
            onClick={() => setIsVisible(false)} 
            className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          {isIOS 
            ? "Para instalar en iOS: Pulsa el botón 'Compartir' de tu navegador y selecciona 'Agregar a Inicio'." 
            : "Obtén acceso más rápido, notificaciones y modo offline instalando la aplicación en tu dispositivo."}
        </p>

        {!isIOS && (
            <div className="flex gap-3">
            <button 
                onClick={() => setIsVisible(false)}
                className="flex-1 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors"
            >
                Ahora no
            </button>
            <button 
                onClick={handleInstallClick}
                className="flex-1 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-100 flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
                <Download size={16} /> Instalar
            </button>
            </div>
        )}
        
        {isIOS && (
             <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 p-2 rounded border border-slate-100">
                 <ShieldCheck size={14} /> Aplicación Segura y Verificada
             </div>
        )}
      </div>
    </div>
  );
};
