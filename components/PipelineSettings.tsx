import React, { useState, useEffect } from 'react';
import { Loader2, Plus, ArrowUp, ArrowDown, Trash2, Edit2, Check, X, AlertTriangle } from 'lucide-react';
import { PipelineColumn } from '../types';

interface PipelineSettingsProps {
    onNotify?: (title: string, msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export const PipelineSettings: React.FC<PipelineSettingsProps> = ({ onNotify }) => {
    const [stages, setStages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: '', color: '' });
    const [isAdding, setIsAdding] = useState(false);
    const [newStage, setNewStage] = useState({ name: '', color: 'border-gray-500' });

    const COLORS = [
        { label: 'Azul', value: 'border-blue-500' },
        { label: 'Indigo', value: 'border-indigo-500' },
        { label: 'Morado', value: 'border-purple-500' },
        { label: 'Cian', value: 'border-cyan-500' },
        { label: 'Naranja', value: 'border-orange-500' },
        { label: 'Verde', value: 'border-green-500' },
        { label: 'Rojo', value: 'border-red-500' },
        { label: 'Gris', value: 'border-gray-500' },
        { label: 'Rosa', value: 'border-pink-500' },
        { label: 'Amarillo', value: 'border-yellow-500' },
    ];

    // Safelist to ensure Tailwind generates these background classes
    const BG_SAFELIST = [
        'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-cyan-500', 'bg-orange-500',
        'bg-green-500', 'bg-red-500', 'bg-gray-500', 'bg-pink-500', 'bg-yellow-500'
    ];

    const fetchStages = async () => {
        setLoading(true);
        try {
            const { api } = await import('../src/services/api');
            const data = await api.pipeline.list();
            setStages(data);
        } catch (error: any) {
            console.error(error);
            if (error.message && error.message.includes('401')) {
                 if (onNotify) onNotify('Sesión Expirada', 'Por favor, inicia sesión nuevamente.', 'error');
                 // Optional: redirect to login or clear session
            } else if (onNotify) {
                 onNotify('Error', 'No se pudieron cargar las etapas', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStages();
    }, []);

    const handleAdd = async () => {
        if (!newStage.name) return;
        try {
            const { api } = await import('../src/services/api');
            await api.pipeline.create(newStage.name, newStage.color);
            await fetchStages();
            setIsAdding(false);
            setNewStage({ name: '', color: 'border-gray-500' });
            if (onNotify) onNotify('Éxito', 'Etapa creada', 'success');
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpdate = async (id: string) => {
        try {
            const { api } = await import('../src/services/api');
            await api.pipeline.update(id, editForm);
            await fetchStages();
            setEditingId(null);
            if (onNotify) onNotify('Éxito', 'Etapa actualizada', 'success');
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Seguro que deseas eliminar esta etapa? Si tiene leads asociados, no se podrá eliminar.')) return;
        try {
            const { api } = await import('../src/services/api');
            const res = await api.pipeline.delete(id);
            if (res.error) {
                if (onNotify) onNotify('Error', res.error, 'error');
            } else {
                await fetchStages();
                if (onNotify) onNotify('Éxito', 'Etapa eliminada', 'success');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const moveStage = async (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === stages.length - 1) return;

        const newStages = [...stages];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        
        // Swap locally first for UI feedback
        [newStages[index], newStages[swapIndex]] = [newStages[swapIndex], newStages[index]];
        setStages(newStages);

        // Update API
        try {
            const { api } = await import('../src/services/api');
            const orderedIds = newStages.map(s => s.id);
            await api.pipeline.reorder(orderedIds);
        } catch (error) {
            console.error(error);
            fetchStages(); // Revert on error
        }
    };

    const startEditing = (stage: any) => {
        setEditingId(stage.id);
        setEditForm({ name: stage.name, color: stage.color });
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

    return (
        <div className="max-w-4xl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900">Etapas de Leads</h3>
                    <p className="text-sm text-slate-500">Personaliza las columnas de tu tablero Kanban.</p>
                </div>
                <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">
                    <Plus size={18} /> Nueva Etapa
                </button>
            </div>

            <div className="space-y-3">
                {stages.map((stage, index) => (
                    <div key={stage.id} className={`bg-white border p-4 rounded-xl flex items-center gap-4 shadow-sm transition-all ${editingId === stage.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200'}`}>
                        {/* Drag Handle / Order Buttons */}
                        <div className="flex flex-col gap-1">
                            <button 
                                onClick={() => moveStage(index, 'up')} 
                                disabled={index === 0}
                                className="text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ArrowUp size={16} />
                            </button>
                            <button 
                                onClick={() => moveStage(index, 'down')} 
                                disabled={index === stages.length - 1}
                                className="text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ArrowDown size={16} />
                            </button>
                        </div>

                        {/* Color Indicator */}
                        <div className={`w-3 h-12 rounded-full ${stage.color.replace('border-', 'bg-')}`}></div>

                        {/* Content */}
                        <div className="flex-1">
                            {editingId === stage.id ? (
                                <div className="flex gap-4 items-center">
                                    <input 
                                        autoFocus
                                        type="text" 
                                        value={editForm.name} 
                                        onChange={e => setEditForm({...editForm, name: e.target.value})}
                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <select 
                                        value={editForm.color}
                                        onChange={e => setEditForm({...editForm, color: e.target.value})}
                                        className="px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                    <button onClick={() => handleUpdate(stage.id)} className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200"><Check size={18} /></button>
                                    <button onClick={() => setEditingId(null)} className="p-2 bg-slate-100 text-slate-600 rounded hover:bg-slate-200"><X size={18} /></button>
                                </div>
                            ) : (
                                <div>
                                    <h4 className="font-bold text-slate-900 text-lg">{stage.name}</h4>
                                    <p className="text-xs text-slate-400 font-mono">ID: {stage.keyName}</p>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        {editingId !== stage.id && (
                            <div className="flex gap-2">
                                <button onClick={() => startEditing(stage)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={18} /></button>
                                <button onClick={() => handleDelete(stage.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={18} /></button>
                            </div>
                        )}
                    </div>
                ))}

                {/* Add New Row */}
                {isAdding && (
                     <div className="bg-slate-50 border-2 border-dashed border-blue-300 p-4 rounded-xl flex items-center gap-4 animate-in fade-in">
                        <div className="w-8"></div>
                        <div className={`w-3 h-12 rounded-full ${newStage.color.replace('border-', 'bg-')}`}></div>
                        <div className="flex-1 flex gap-4 items-center">
                            <input 
                                autoFocus
                                type="text" 
                                placeholder="Nombre de la etapa (ej. Propuesta Enviada)"
                                value={newStage.name} 
                                onChange={e => setNewStage({...newStage, name: e.target.value})}
                                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <select 
                                value={newStage.color}
                                onChange={e => setNewStage({...newStage, color: e.target.value})}
                                className="px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                            <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Guardar</button>
                            <button onClick={() => setIsAdding(false)} className="px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 font-medium">Cancelar</button>
                        </div>
                     </div>
                )}
            </div>
        </div>
    );
};
