
import React, { useState } from 'react';
import { Product, Contact } from '../types';
import { ShoppingCart, Plus, Trash2, FileText, Download, CheckCircle, Loader2 } from 'lucide-react';

interface QuoteGeneratorProps {
    contact: Contact;
    products: Product[];
    onSaveQuote: (quote: { id: string; name: string; type: string; url: string; createdAt: string }) => void;
}

export const QuoteGenerator: React.FC<QuoteGeneratorProps> = ({ contact, products, onSaveQuote }) => {
    const [selectedItems, setSelectedItems] = useState<{ product: Product; quantity: number }[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const subtotal = selectedItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const tax = subtotal * 0.16; // 16% IVA example
    const total = subtotal + tax;

    const addItem = (productId: string) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const existing = selectedItems.find(item => item.product.id === productId);
        if (existing) {
            setSelectedItems(selectedItems.map(item =>
                item.product.id === productId ? { ...item, quantity: item.quantity + 1 } : item
            ));
        } else {
            setSelectedItems([...selectedItems, { product, quantity: 1 }]);
        }
    };

    const removeItem = (productId: string) => {
        setSelectedItems(selectedItems.filter(item => item.product.id !== productId));
    };

    const handleGenerate = () => {
        if (selectedItems.length === 0) return;

        setIsGenerating(true);

        // Simulate generation delay
        setTimeout(() => {
            const quoteId = `QT-${Date.now()}`;
            const newDoc = {
                id: quoteId,
                name: `Cotización - ${contact.company || contact.name}`,
                type: 'PDF / Quote',
                url: '#', // Simulación de URL
                createdAt: new Date().toLocaleString()
            };

            onSaveQuote(newDoc);
            setIsGenerating(false);
            setShowSuccess(true);
            setSelectedItems([]);

            setTimeout(() => setShowSuccess(false), 3000);
        }, 1500);
    };

    return (
        <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg text-white">
                    <FileText size={20} />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-blue-900">Generador de Cotizaciones (CPQ)</h4>
                    <p className="text-[11px] text-blue-700">Selecciona productos para generar una propuesta formal.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {/* Product Selector */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Agregar Producto</label>
                    <div className="flex gap-2">
                        <select
                            className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            onChange={(e) => {
                                if (e.target.value) {
                                    addItem(e.target.value);
                                    e.target.value = '';
                                }
                            }}
                        >
                            <option value="">Seleccionar producto...</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name} (${p.price})</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Selected Items List */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr>
                                <th className="px-4 py-2 font-semibold">Producto</th>
                                <th className="px-4 py-2 font-semibold text-center">Cant.</th>
                                <th className="px-4 py-2 font-semibold text-right">Subtotal</th>
                                <th className="px-4 py-2"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {selectedItems.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">
                                        No hay productos seleccionados.
                                    </td>
                                </tr>
                            ) : (
                                selectedItems.map(item => (
                                    <tr key={item.product.id}>
                                        <td className="px-4 py-3 font-medium text-slate-900">{item.product.name}</td>
                                        <td className="px-4 py-3 text-center">{item.quantity}</td>
                                        <td className="px-4 py-3 text-right text-slate-600">${(item.product.price * item.quantity).toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => removeItem(item.product.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {selectedItems.length > 0 && (
                        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-1">
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>Subtotal</span>
                                <span>${subtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>Impuestos (16%)</span>
                                <span>${tax.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm font-bold text-slate-900 pt-1">
                                <span>Total Estimado</span>
                                <span>${total.toLocaleString()}</span>
                            </div>
                        </div>
                    )}
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={selectedItems.length === 0 || isGenerating}
                    className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${selectedItems.length === 0 || isGenerating
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                            : 'bg-green-600 text-white hover:bg-green-700 shadow-green-100'
                        }`}
                >
                    {isGenerating ? <Loader2 className="animate-spin" /> : <Download size={18} />}
                    {isGenerating ? 'Generando PDF...' : 'Generar y Registrar Propuesta'}
                </button>

                {showSuccess && (
                    <div className="flex items-center gap-2 text-green-600 text-xs font-bold justify-center animate-bounce">
                        <CheckCircle size={14} /> ¡Propuesta registrada en Documentos!
                    </div>
                )}
            </div>
        </div>
    );
};
