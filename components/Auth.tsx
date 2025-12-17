import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, User, Loader2, Sparkles } from 'lucide-react';
import { UserRole } from '../types';

interface AuthProps {
  onLogin: (user: any) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // SIMULATION logic for roles
    // In production, Supabase handles this check.
    setTimeout(() => {
      setIsLoading(false);
      
      let role: UserRole = 'MANAGER';
      let displayAvatar = 'CR';
      let displayName = isLogin ? 'Carlos Ruiz' : name;

      // Simple logic to simulate role switching based on email
      if (email.toLowerCase().includes('ventas') || email.toLowerCase().includes('sales')) {
          role = 'SALES_REP';
          displayName = 'Ana García'; // Simulating a sales rep
          displayAvatar = 'AG';
      }

      const mockUser = {
        name: displayName,
        role: role,
        avatar: isLogin ? displayAvatar : name.substring(0, 2).toUpperCase()
      };
      onLogin(mockUser);
    }, 1000);
  };

  const fillDemoData = () => {
      setEmail('admin@nexus.com');
      setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative z-10">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
             <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
             </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Nexus CRM</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isLogin ? 'Bienvenido de nuevo, líder.' : 'Comienza a potenciar tus ventas.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  required={!isLogin}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="Juan Perez"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Corporativo</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="nombre@empresa.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200 transition-all flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
               <Loader2 size={18} className="animate-spin" />
            ) : (
               <>
                 {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'} <ArrowRight size={18} />
               </>
            )}
          </button>
        </form>
        
        {/* Demo Helper Button */}
        {isLogin && (
            <button 
                onClick={fillDemoData}
                type="button"
                className="w-full mt-3 py-2 bg-slate-50 text-slate-500 rounded-xl text-xs font-medium hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
            >
                <Sparkles size={14} className="text-amber-500" /> Auto-completar Demo (Admin)
            </button>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="ml-1 text-indigo-600 font-semibold hover:text-indigo-800 transition-colors"
            >
              {isLogin ? 'Solicitar acceso' : 'Inicia sesión aquí'}
            </button>
          </p>
        </div>
        
        {/* Footer info */}
        <div className="mt-8 pt-4 border-t border-slate-100 text-center">
           <p className="text-xs text-slate-400">Para vista Vendedor usa: ventas@nexus.com</p>
        </div>
      </div>
    </div>
  );
};