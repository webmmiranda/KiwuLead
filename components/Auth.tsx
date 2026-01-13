import React, { useState, useEffect } from 'react';
import { Mail, Lock, ArrowRight, Loader2, CheckCircle, Key } from 'lucide-react';
import { api } from '../src/services/api';

interface AuthProps {
  onLogin: (user: any) => void;
}

type AuthView = 'login' | 'forgot' | 'reset';

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [view, setView] = useState<AuthView>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [branding, setBranding] = useState<{ companyName: string; logoUrl: string }>({
    companyName: 'KiwüLead',
    logoUrl: ''
  });

  useEffect(() => {
    // Check for reset token in URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setResetToken(token);
      setView('reset');
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const loadBranding = async () => {
      try {
        const config = await api.settings.getPublicConfig();
        if (config) {
          setBranding({
            companyName: config.companyName || 'KiwüLead',
            logoUrl: config.logoUrl || ''
          });
        }
      } catch (e) {
        console.error('Failed to load branding', e);
      }
    };
    loadBranding();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      if (view === 'login') {
        const response = await api.auth.login(email, password);
        if (response && response.success) {
          onLogin(response.user);
        }
      } else if (view === 'forgot') {
        const response = await api.auth.forgotPassword(email);
        setMessage({ type: 'success', text: 'Si el correo existe, recibirás instrucciones.' });
        if (response.debug_link) {
            console.log("DEBUG: Reset Link", response.debug_link); // For dev
        }
      } else if (view === 'reset') {
        if (password !== confirmPassword) {
            throw new Error('Las contraseñas no coinciden');
        }
        await api.auth.resetPassword(resetToken, password);
        setMessage({ type: 'success', text: 'Contraseña actualizada. Por favor inicia sesión.' });
        setTimeout(() => setView('login'), 2000);
      }

    } catch (err: any) {
      console.error('Auth error:', err);
      setMessage({ type: 'error', text: err.message || 'Ocurrió un error' });
    } finally {
      setIsLoading(false);
    }
  };



  const handleQuickLogin = async (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    // Auto submit
    try {
        setIsLoading(true);
        const response = await api.auth.login(e, p);
        if (response && response.success) {
            onLogin(response.user);
        }
    } catch (err: any) {
        console.error('Quick login error:', err);
        setMessage({ type: 'error', text: err.message || 'Error en inicio rápido' });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor - Original Dark Blue with Movement */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-[420px] p-8 md:p-10 relative z-10 border border-white/20">

        <div className="text-center mb-8">
          {branding.logoUrl ? (
            <div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
              <img src={branding.logoUrl} alt="Company Logo" className="max-w-full max-h-full object-contain" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30 transform rotate-3">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          )}
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{branding.companyName}</h1>
          {view !== 'login' && (
            <p className="text-slate-500 mt-3 text-sm font-medium">
              {view === 'forgot' && 'Recuperación de cuenta'}
              {view === 'reset' && 'Establecer nueva contraseña'}
            </p>
          )}
        </div>

        {/* Quick Access Buttons - Only on Login */}
        {view === 'login' && (
            <div className="mb-8 grid grid-cols-3 gap-3">
            <button
                type="button"
                onClick={() => handleQuickLogin('manager@kiwulead.com', 'Nexus123!')}
                className="group p-3 bg-slate-50 hover:bg-white border border-slate-200 hover:border-purple-200 rounded-xl transition-all duration-200 flex flex-col items-center gap-2 hover:shadow-md"
            >
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs group-hover:scale-110 transition-transform">G</div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-600 group-hover:text-purple-600">Gerente</span>
            </button>
            <button
                type="button"
                onClick={() => handleQuickLogin('sales@nexus.com', 'Nexus123!')}
                className="group p-3 bg-slate-50 hover:bg-white border border-slate-200 hover:border-blue-200 rounded-xl transition-all duration-200 flex flex-col items-center gap-2 hover:shadow-md"
            >
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs group-hover:scale-110 transition-transform">V</div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-600 group-hover:text-blue-600">Vendedor</span>
            </button>
            <button
                type="button"
                onClick={() => handleQuickLogin('support@kiwulead.com', 'Nexus123!')}
                className="group p-3 bg-slate-50 hover:bg-white border border-slate-200 hover:border-green-200 rounded-xl transition-all duration-200 flex flex-col items-center gap-2 hover:shadow-md"
            >
                <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-xs group-hover:scale-110 transition-transform">S</div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-600 group-hover:text-green-600">Soporte</span>
            </button>
            </div>
        )}

        {message && (
            <div className={`mb-6 p-4 rounded-xl text-sm flex items-start gap-3 border ${message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                {message.type === 'success' ? <CheckCircle size={18} className="mt-0.5 flex-shrink-0" /> : <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs mt-0.5 flex-shrink-0 font-bold">!</div>}
                <span className="leading-snug">{message.text}</span>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {(view === 'login' || view === 'forgot') && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Email Corporativo</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <Mail size={20} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all placeholder:text-slate-400 font-medium"
                    placeholder="nombre@empresa.com"
                  />
                </div>
              </div>
          )}

          {(view === 'login' || view === 'reset') && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                    {view === 'reset' ? 'Nueva Contraseña' : 'Contraseña'}
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <Lock size={20} />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all placeholder:text-slate-400 font-medium"
                    placeholder="••••••••"
                  />
                </div>
              </div>
          )}

          {view === 'reset' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Confirmar Contraseña</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <Key size={20} />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all placeholder:text-slate-400 font-medium"
                    placeholder="••••••••"
                  />
                </div>
              </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-600/20 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <span className="flex items-center">
                {view === 'login' && <>Iniciar Sesión <ArrowRight size={18} className="ml-2" /></>}
                {view === 'forgot' && 'Enviar enlace de recuperación'}
                {view === 'reset' && 'Cambiar Contraseña'}
              </span>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
            {view === 'login' ? (
                <p className="text-sm text-slate-500">
                    <button
                        onClick={() => { setView('forgot'); setMessage(null); }}
                        className="text-slate-500 hover:text-blue-600 font-medium transition-colors text-sm hover:underline underline-offset-4"
                    >
                        ¿Olvidaste tu contraseña?
                    </button>
                </p>
            ) : (
                <p className="text-sm text-slate-500">
                    <button
                        onClick={() => { setView('login'); setMessage(null); }}
                        className="text-slate-500 hover:text-blue-600 font-medium transition-colors flex items-center justify-center gap-2 mx-auto"
                    >
                        <ArrowRight size={14} className="rotate-180" />
                        Volver al inicio de sesión
                    </button>
                </p>
            )}
        </div>
      </div>
    </div>
  );
};
