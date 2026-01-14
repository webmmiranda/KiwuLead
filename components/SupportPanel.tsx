import React, { useState, useEffect } from 'react';
import { Terminal, CloudLightning, Upload, FileText, AlertTriangle, CheckCircle, Github, Play, RefreshCw, Shield, Database, Users, Search, Eye, Settings as SettingsIcon, Lock } from 'lucide-react';
import { CurrentUser, TeamMember } from '../types';

interface SupportPanelProps {
    currentUser: CurrentUser;
    onNotify: (title: string, msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
    onImpersonate?: (user: TeamMember) => void;
}

export const SupportPanel: React.FC<SupportPanelProps> = ({ currentUser, onNotify, onImpersonate }) => {
    const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'updates'>('users');
    
    // User Management State
    const [users, setUsers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingUsers, setLoadingUsers] = useState(false);

    // Update State
    const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'updating' | 'success' | 'error'>('idle');
    const [githubInfo, setGithubInfo] = useState<any>(null);
    const [logs, setLogs] = useState<string[]>([]);
    
    // Zip Upload State
    const [uploading, setUploading] = useState(false);

    // Mock System Logs
    const [systemLogs, setSystemLogs] = useState([
        "[INFO] System init at " + new Date().toISOString(),
        "[INFO] DB Connection: OK",
        "[INFO] Auth Service: Running",
        "[WARN] Memory usage at 45%"
    ]);

    useEffect(() => {
        if (activeTab === 'users') {
            fetchUsers();
        }
    }, [activeTab]);

    const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
            const res = await fetch('/api/users.php', {
                headers: { 'Authorization': `Bearer ${currentUser.token}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setUsers(data);
            }
        } catch (e) {
            onNotify('Error', 'No se pudieron cargar los usuarios.', 'error');
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleAccessUser = (targetUser: any) => {
        if (!onImpersonate) return;

        // Permission Check
        if (currentUser.role === 'MANAGER' && targetUser.role !== 'Sales') {
            onNotify('Acceso Denegado', 'Los gerentes solo pueden acceder a cuentas de vendedores.', 'error');
            return;
        }

        // Log action
        console.log(`[AUDIT] User ${currentUser.name} (${currentUser.role}) accessed profile of ${targetUser.name} (${targetUser.role}) at ${new Date().toISOString()}`);
        
        // Trigger Impersonation
        onImpersonate({
            id: targetUser.id,
            name: targetUser.name,
            email: targetUser.email,
            role: targetUser.role === 'Sales' ? 'Sales' : (targetUser.role === 'Support' ? 'Support' : 'Manager'), // Normalize role
            status: targetUser.status,
            lastLogin: targetUser.lastLogin || 'Never'
        });
    };

    const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const checkUpdates = async () => {
        setUpdateStatus('checking');
        setLogs(prev => [...prev, "Conectando con GitHub API..."]);
        
        try {
            // Check GitHub API via PHP proxy
            const res = await fetch('/api/system_update.php?action=check_github', {
                headers: { 'Authorization': `Bearer ${currentUser.token}` }
            });
            const data = await res.json();
            
            if (data.success) {
                setGithubInfo(data);
                setLogs(prev => [...prev, `Versión Actual: ${data.current_version || 'Desconocida'}`]);
                setLogs(prev => [...prev, `Última Versión: ${data.latest_version || 'Desconocida'}`]);
                setUpdateStatus('idle');
            } else {
                setLogs(prev => [...prev, `Error: ${data.message || data.error || 'Desconocido'}`]);
                setUpdateStatus('error');
            }
        } catch (e) {
            setLogs(prev => [...prev, "Error de conexión con el servidor."]);
            setUpdateStatus('error');
        }
    };

    const runGithubUpdate = async () => {
        setUpdateStatus('updating');
        setLogs(prev => [...prev, "Iniciando proceso de actualización..."]);
        
        try {
            const res = await fetch('/api/system_update.php?action=update_github', {
                headers: { 'Authorization': `Bearer ${currentUser.token}` }
            });
            const data = await res.json();
            
            if (data.success) {
                setLogs(prev => [...prev, ...data.logs]);
                setLogs(prev => [...prev, "¡Actualización Completada!"]);
                setUpdateStatus('success');
                onNotify('Sistema Actualizado', 'Los archivos se han sincronizado correctamente.', 'success');
            } else {
                setLogs(prev => [...prev, ...data.logs]);
                setLogs(prev => [...prev, `Error Crítico: ${data.error}`]);
                setUpdateStatus('error');
            }
        } catch (e) {
            setUpdateStatus('error');
            setLogs(prev => [...prev, "Fallo en la petición HTTP."]);
        }
    };

    const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        
        const file = e.target.files[0];
        setUploading(true);
        setLogs(prev => [...prev, `Subiendo archivo: ${file.name}...`]);

        const formData = new FormData();
        formData.append('update_zip', file);
        formData.append('token', currentUser.token || ''); // Fallback for stripped headers

        try {
            const res = await fetch('/api/system_update.php?action=upload_zip', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${currentUser.token}` },
                body: formData
            });
            const data = await res.json();

            if (data.success) {
                setLogs(prev => [...prev, "Archivo descomprimido y aplicado."]);
                onNotify('Actualización ZIP', 'El parche se aplicó correctamente.', 'success');
            } else {
                setLogs(prev => [...prev, `Error ZIP: ${data.error}`]);
                onNotify('Error', data.error, 'error');
            }
        } catch (e) {
            setLogs(prev => [...prev, "Error al subir el archivo."]);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <div className="bg-blue-600 p-3 rounded-lg text-white shadow-lg shadow-blue-200">
                    <Shield size={32} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Panel de Soporte Técnico</h2>
                    <p className="text-slate-500">Administración de perfiles y mantenimiento del sistema.</p>
                </div>
            </div>

            <div className="flex gap-6 border-b border-slate-200 mb-8 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`pb-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Gestión de Perfiles
                </button>
                <button
                    onClick={() => setActiveTab('updates')}
                    className={`pb-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'updates' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Actualizaciones de Sistema
                </button>
                <button
                    onClick={() => setActiveTab('logs')}
                    className={`pb-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'logs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Logs & Debugging
                </button>
            </div>

            {activeTab === 'users' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex justify-between items-center">
                        <div className="relative w-full max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar usuario por nombre o email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                {filteredUsers.length} Usuarios
                            </span>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase">Usuario</th>
                                    <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase">Rol</th>
                                    <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase">Estado</th>
                                    <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loadingUsers ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                            <RefreshCw className="animate-spin mx-auto mb-2" />
                                            Cargando perfiles...
                                        </td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No se encontraron usuarios.</td>
                                    </tr>
                                ) : (
                                    filteredUsers.map(user => {
                                        const isMe = user.id === currentUser.id?.toString();
                                        const isManager = currentUser.role === 'MANAGER';
                                        const canAccess = !isMe && (!isManager || user.role === 'Sales');
                                        
                                        return (
                                            <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                                            {user.avatar || user.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-900">{user.name}</p>
                                                            <p className="text-xs text-slate-500">{user.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border ${
                                                        user.role === 'Support' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                        user.role === 'Manager' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                        'bg-blue-50 text-blue-700 border-blue-100'
                                                    }`}>
                                                        {user.role === 'Support' && <Shield size={12} />}
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                                                        user.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                        {user.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {isMe ? (
                                                        <span className="text-xs text-slate-400 italic">Sesión Actual</span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleAccessUser(user)}
                                                            disabled={!canAccess}
                                                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                                                canAccess 
                                                                    ? 'bg-slate-900 text-white hover:bg-blue-600 shadow-sm' 
                                                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                            }`}
                                                        >
                                                            {currentUser.role === 'SUPPORT' ? (
                                                                <>
                                                                    <SettingsIcon size={14} />
                                                                    Configurar
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Eye size={14} />
                                                                    Observar
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'updates' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-300">
                    {/* GITHUB SECTION */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Github size={24} className="text-slate-900" />
                                <h3 className="font-bold text-slate-900">Repositorio Oficial</h3>
                            </div>
                            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full font-mono">webmmiranda/KiwuLead</span>
                        </div>
                        <div className="p-6 space-y-6">
                            <p className="text-sm text-slate-600">
                                Sincroniza tu instalación con la última versión disponible en GitHub. 
                                Esto ejecutará un <code className="bg-slate-100 px-1 rounded">git pull</code> en el servidor.
                            </p>

                            <div className="flex gap-3">
                                <button 
                                    onClick={checkUpdates}
                                    disabled={updateStatus === 'checking' || updateStatus === 'updating'}
                                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2"
                                >
                                    {updateStatus === 'checking' ? <RefreshCw className="animate-spin" size={18} /> : <CloudLightning size={18} />}
                                    Verificar
                                </button>
                                
                                {githubInfo && (
                                    <button 
                                        onClick={runGithubUpdate}
                                        disabled={updateStatus === 'updating'}
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        {updateStatus === 'updating' ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} />}
                                        Actualizar Ahora
                                    </button>
                                )}
                            </div>

                            {githubInfo && (
                                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-blue-700">Versión Local:</span>
                                        <span className="font-mono font-bold">{githubInfo.current_version}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-blue-700">Versión Remota:</span>
                                        <span className="font-mono font-bold">{githubInfo.latest_version}</span>
                                    </div>
                                    {githubInfo.update_available && (
                                        <div className="mt-3 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded text-center font-bold">
                                            ¡Nueva actualización disponible!
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* MANUAL ZIP SECTION */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Upload size={24} className="text-orange-500" />
                                <h3 className="font-bold text-slate-900">Carga Manual (ZIP)</h3>
                            </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            <p className="text-sm text-slate-600 mb-6">
                                Si el servidor no tiene acceso a Git, sube un archivo <b>.zip</b> con el código fuente. 
                                Se descomprimirá en la raíz del proyecto.
                            </p>
                            
                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-blue-400 transition-colors cursor-pointer relative bg-slate-50">
                                <input 
                                    type="file" 
                                    accept=".zip" 
                                    onChange={handleZipUpload}
                                    disabled={uploading}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                />
                                {uploading ? (
                                    <RefreshCw className="animate-spin text-blue-500 mb-2" size={32} />
                                ) : (
                                    <FileText className="text-slate-400 mb-2" size={32} />
                                )}
                                <span className="font-bold text-slate-700">{uploading ? 'Procesando...' : 'Arrastra un ZIP o haz clic'}</span>
                                <span className="text-xs text-slate-400 mt-1">Máximo 25MB</span>
                            </div>
                        </div>
                    </div>

                    {/* LOGS OUTPUT */}
                    <div className="lg:col-span-2 bg-slate-900 rounded-xl p-6 font-mono text-xs shadow-lg">
                        <div className="flex justify-between items-center mb-4 text-slate-400 border-b border-slate-800 pb-2">
                            <span className="flex items-center gap-2"><Terminal size={14} /> Consola de Actualización</span>
                            <button onClick={() => setLogs([])} className="hover:text-white">Limpiar</button>
                        </div>
                        <div className="h-48 overflow-y-auto space-y-1">
                            {logs.length === 0 && <span className="text-slate-600 italic">Esperando comandos...</span>}
                            {logs.map((log, i) => (
                                <div key={i} className="text-green-400 border-l-2 border-slate-700 pl-2">{log}</div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'logs' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                    <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Logs del Sistema (Últimas 24h)</h3>
                        <div className="flex gap-2">
                            <button className="text-xs bg-white border border-slate-300 px-3 py-1 rounded hover:bg-slate-50">Descargar Todo</button>
                            <button className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded font-bold hover:bg-blue-100">Refrescar</button>
                        </div>
                    </div>
                    <div className="p-0">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-3 font-medium text-slate-500">Timestamp</th>
                                    <th className="px-6 py-3 font-medium text-slate-500">Nivel</th>
                                    <th className="px-6 py-3 font-medium text-slate-500">Mensaje</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-mono text-xs">
                                {systemLogs.map((log, i) => {
                                    const isError = log.includes('[ERROR]');
                                    const isWarn = log.includes('[WARN]');
                                    return (
                                        <tr key={i} className="hover:bg-slate-50">
                                            <td className="px-6 py-3 text-slate-500">{new Date().toLocaleTimeString()}</td>
                                            <td className="px-6 py-3">
                                                {isError ? <span className="text-red-600 font-bold">ERROR</span> : 
                                                 isWarn ? <span className="text-orange-500 font-bold">WARN</span> : 
                                                 <span className="text-blue-500">INFO</span>}
                                            </td>
                                            <td className="px-6 py-3 text-slate-700">{log}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};