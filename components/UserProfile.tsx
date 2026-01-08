import React, { useState } from 'react';
import { CurrentUser } from '../types';
import { Mail, Lock, CheckCircle, AlertCircle, User, Server, FileText, Save, Play, Loader2 } from 'lucide-react';

interface UserProfileProps {
    currentUser: CurrentUser;
    onUpdateUser?: (user: Partial<CurrentUser>) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ currentUser, onUpdateUser }) => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Email Config State
    const [emailConfig, setEmailConfig] = useState({
        smtp_host: '',
        smtp_port: 587,
        smtp_user: '',
        smtp_pass: '',
        imap_host: '',
        imap_port: 993,
        from_name: '',
        signature: '',
        connecting: false
    });
    const [isEmailConfigLocked, setIsEmailConfigLocked] = useState(true);

    // Load Config on Mount
    React.useEffect(() => {
        const loadConfig = async () => {
            if (!currentUser?.id) return;
            try {
                const { api } = await import('../src/services/api');
                const res = await api.settings.getEmailConfig(String(currentUser.id));
                if (res.config) {
                    setEmailConfig(prev => ({ ...prev, ...res.config }));
                }
            } catch (error) {
                console.error("Error loading email config:", error);
            }
        };
        loadConfig();
    }, [currentUser]);

    const handleTestEmailConnection = async () => {
        if (!currentUser?.id) return;
        setEmailConfig(prev => ({ ...prev, connecting: true }));
        try {
            const { api } = await import('../src/services/api');
            const res = await api.settings.testEmailConfig(String(currentUser.id), emailConfig);
            if (res.success) {
                setMessage({ type: 'success', text: 'Conexión exitosa con el servidor de correo.' });
            } else {
                setMessage({ type: 'error', text: 'Fallo la conexión: ' + (res.error || 'Unknown error') });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Hubo un problema al probar la conexión.' });
        } finally {
            setEmailConfig(prev => ({ ...prev, connecting: false }));
            setTimeout(() => setMessage(null), 5000);
        }
    };

    const handleSaveEmailConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser?.id) return;
        setEmailConfig(prev => ({ ...prev, connecting: true }));
        try {
            const { api } = await import('../src/services/api');
            const res = await api.settings.saveEmailConfig(String(currentUser.id), emailConfig);
            if (res.success) {
                setMessage({ type: 'success', text: 'Configuración de correo guardada correctamente.' });
                setIsEmailConfigLocked(true);
            } else {
                setMessage({ type: 'error', text: 'Error al guardar configuración: ' + (res.error || 'Unknown error') });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Hubo un problema al guardar la configuración.' });
        } finally {
            setEmailConfig(prev => ({ ...prev, connecting: false }));
            setTimeout(() => setMessage(null), 5000);
        }
    };

    const handleChangePassword = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
            return;
        }
        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' });
            return;
        }

        // In a real app, we would verify oldPassword via API.
        // Here we simulate success.
        setMessage({ type: 'success', text: 'Contraseña actualizada correctamente.' });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');

        // Clear message after 3s
        setTimeout(() => setMessage(null), 3000);
    };

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto animate-in fade-in duration-300">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Perfil de Usuario</h2>
            <p className="text-slate-500 mb-8">Administra tu información personal y seguridad.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Profile Card */}
                <div className="md:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center">
                        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-3xl mb-4 overflow-hidden ring-4 ring-blue-50">
                            {currentUser.avatar && currentUser.avatar.startsWith('http') ? (
                                <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                            ) : (
                                <span>{currentUser.name.charAt(0)}</span>
                            )}
                        </div>
                        <h3 className="font-bold text-lg text-slate-900">{currentUser.name}</h3>
                        <p className="text-sm text-slate-500 capitalize">{currentUser.role.toLowerCase().replace('_', ' ')}</p>

                        <div className="mt-6 w-full space-y-3">
                            <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <Mail size={16} className="text-slate-400" />
                                <span className="truncate flex-1 text-left font-medium">{currentUser.email || 'usuario@nexus.com'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Password Form */}
                <div className="md:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2 pb-4 border-b border-slate-100">
                            <Lock size={20} className="text-blue-600" /> Cambio de Contraseña
                        </h3>

                        {message && (
                            <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                {message.text}
                            </div>
                        )}

                        <form onSubmit={handleChangePassword} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña Actual</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        required
                                        value={oldPassword}
                                        onChange={e => setOldPassword(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pl-10 transition-all"
                                        placeholder="••••••••"
                                    />
                                    <Lock size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nueva Contraseña</label>
                                    <div className="relative">
                                        <input
                                            type="password"
                                            required
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pl-10 transition-all"
                                            placeholder="••••••••"
                                        />
                                        <Lock size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar Contraseña</label>
                                    <div className="relative">
                                        <input
                                            type="password"
                                            required
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pl-10 transition-all"
                                            placeholder="••••••••"
                                        />
                                        <Lock size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                    </div>
                                </div>
                            </div>
                            <div className="pt-2 flex justify-end">
                                <button type="submit" className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md">
                                    Actualizar Contraseña
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Email Configuration Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-6">
                        <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100">
                            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                <Mail size={20} className="text-blue-600" /> Configuración de Email Personal
                            </h3>
                            <button
                                onClick={() => setIsEmailConfigLocked(!isEmailConfigLocked)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${isEmailConfigLocked
                                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                                    : 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100'
                                    }`}
                            >
                                {isEmailConfigLocked ? <Lock size={16} /> : <Server size={16} />}
                                {isEmailConfigLocked ? 'Editar' : 'Editando'}
                            </button>
                        </div>

                        <p className="text-sm text-slate-500 mb-6">
                            Configura tu cuenta de email personal para enviar y recibir correos desde el CRM.
                        </p>

                        <form onSubmit={handleSaveEmailConfig} className="space-y-6">
                            {/* SMTP Config */}
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                    <Server size={16} className="text-slate-500" />
                                    Servidor SMTP (Envío)
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Host SMTP</label>
                                        <input
                                            type="text"
                                            disabled={isEmailConfigLocked}
                                            placeholder="smtp.gmail.com"
                                            value={emailConfig.smtp_host}
                                            onChange={e => setEmailConfig({ ...emailConfig, smtp_host: e.target.value })}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Puerto</label>
                                        <input
                                            type="number"
                                            disabled={isEmailConfigLocked}
                                            placeholder="587"
                                            value={emailConfig.smtp_port}
                                            onChange={e => setEmailConfig({ ...emailConfig, smtp_port: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Usuario</label>
                                        <input
                                            type="email"
                                            disabled={isEmailConfigLocked}
                                            placeholder="tu@email.com"
                                            value={emailConfig.smtp_user}
                                            onChange={e => setEmailConfig({ ...emailConfig, smtp_user: e.target.value })}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Contraseña</label>
                                        <input
                                            type="password"
                                            disabled={isEmailConfigLocked}
                                            placeholder="••••••••"
                                            value={emailConfig.smtp_pass}
                                            onChange={e => setEmailConfig({ ...emailConfig, smtp_pass: e.target.value })}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* IMAP Config */}
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                    <Mail size={16} className="text-slate-500" />
                                    Servidor IMAP (Recepción)
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Host IMAP</label>
                                        <input
                                            type="text"
                                            disabled={isEmailConfigLocked}
                                            placeholder="imap.gmail.com"
                                            value={emailConfig.imap_host}
                                            onChange={e => setEmailConfig({ ...emailConfig, imap_host: e.target.value })}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Puerto</label>
                                        <input
                                            type="number"
                                            disabled={isEmailConfigLocked}
                                            placeholder="993"
                                            value={emailConfig.imap_port}
                                            onChange={e => setEmailConfig({ ...emailConfig, imap_port: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Signature */}
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                    <FileText size={16} className="text-slate-500" />
                                    Firma y Remitente
                                </h4>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Nombre del Remitente</label>
                                    <input
                                        type="text"
                                        disabled={isEmailConfigLocked}
                                        placeholder="Tu Nombre"
                                        value={emailConfig.from_name}
                                        onChange={e => setEmailConfig({ ...emailConfig, from_name: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Firma Automática</label>
                                    <textarea
                                        disabled={isEmailConfigLocked}
                                        placeholder="Saludos,&#10;Tu Nombre&#10;Empresa&#10;Tel: +52 55 1234 5678"
                                        value={emailConfig.signature}
                                        onChange={e => setEmailConfig({ ...emailConfig, signature: e.target.value })}
                                        rows={4}
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500 font-mono text-sm"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">Esta firma se agregará automáticamente al final de tus correos.</p>
                                </div>
                            </div>

                            {!isEmailConfigLocked && (
                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={handleTestEmailConnection}
                                        disabled={emailConfig.connecting}
                                        className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium transition-colors flex items-center gap-2 text-sm"
                                    >
                                        {emailConfig.connecting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                                        Probar Conexión
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={emailConfig.connecting}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-sm transition-all flex items-center gap-2 text-sm"
                                    >
                                        {emailConfig.connecting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        Guardar Configuración
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
