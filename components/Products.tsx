
import React, { useState } from 'react';
import { Product, CurrentUser, AiConfig } from '../types';
import { Package, Plus, Search, Trash2, Edit2, Tag, Lock, Image as ImageIcon, Globe, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { formatCurrency } from '../src/utils/currency';
import { api } from '../src/services/api';
import { RichTextEditor } from './RichTextEditor';
import { GoogleGenerativeAI } from "@google/generative-ai";

interface ProductsProps {
  products: Product[];
  setProducts: (products: Product[]) => void;
  currentUser: CurrentUser;
  onNotify?: (title: string, msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  aiConfig?: AiConfig;
}

export const Products: React.FC<ProductsProps> = ({ products, setProducts, currentUser, onNotify, aiConfig }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Import State
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isImproving, setIsImproving] = useState(false);

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 0,
    currency: 'USD',
    category: 'Software',
    image: ''
  });

  const isPrivileged = currentUser?.role === 'MANAGER' || currentUser?.role === 'SUPPORT';

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = (product?: Product) => {
    if (product) {
      setEditingId(product.id);
      setFormData({ ...product });
    } else {
      setEditingId(null);
      setFormData({ name: '', description: '', price: 0, currency: 'USD', category: 'Software', image: '' });
    }
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return;

    try {
      const { api } = await import('../src/services/api');

      if (editingId) {
        // Update existing
        await api.products.update(editingId, {
          name: formData.name,
          description: formData.description,
          price: formData.price,
          currency: formData.currency,
          category: formData.category,
          image: formData.image
        });

        // Update local state
        setProducts(products.map(p => p.id === editingId ? { ...p, ...formData } as Product : p));
        if (onNotify) onNotify('Producto Actualizado', 'Los cambios han sido guardados.', 'success');
      } else {
        // Create new
        const response = await api.products.create({
          name: formData.name!,
          description: formData.description || '',
          price: Number(formData.price),
          currency: formData.currency as 'USD' | 'MXN' | 'CRC' | 'COP' || 'USD',
          category: formData.category || 'General',
          image: formData.image
        });

        if (response.success) {
          // Reload products from database
          const updatedProducts = await api.products.list();
          setProducts(updatedProducts);
          if (onNotify) onNotify('Producto Creado', `Se agregó "${formData.name}" al catálogo.`, 'success');
        }
      }

      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving product:', error);
      if (onNotify) onNotify('Error', 'No se pudo guardar el producto.', 'error');
    }
  };

  const handleImproveIA = async () => {
    const apiKey = aiConfig?.apiKey;
    if (!apiKey) {
      if (onNotify) onNotify('IA no configurada', 'Configura tu API Key de Gemini en Ajustes > Integraciones.', 'warning');
      return;
    }

    if (!formData.description && !formData.name) return;

    setIsImproving(true);
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: aiConfig?.model || "gemini-1.5-flash" });
      const prompt = `Mejora la siguiente descripción de producto para que sea más profesional y atractiva para la venta en español. 
      Nombre: ${formData.name}
      Descripción actual: ${formData.description || 'Sin descripción'}
      Responde SOLO con el nuevo texto de la descripción, sin introducciones ni markdown extra.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const improvedText = response.text().trim();

      setFormData(prev => ({ ...prev, description: improvedText }));
      if (onNotify) onNotify('IA: Descripción Mejorada', 'Se ha optimizado el texto del producto.', 'success');
    } catch (error) {
      console.error('Error improving with IA:', error);
      if (onNotify) onNotify('Error de IA', 'No se pudo mejorar la descripción.', 'error');
    } finally {
      setIsImproving(false);
    }
  };

  const handleImportFromWeb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importUrl) return;

    setIsImporting(true);

    try {
      const { api } = await import('../src/services/api');

      // 1. CALL BACKEND SCRAPER
      const scrapeResponse = await fetch(`${(import.meta as any).env.VITE_API_BASE_URL || '/api'}/scrape.php?url=${encodeURIComponent(importUrl)}`);
      const scrapeData = await scrapeResponse.json();

      if (!scrapeData.success) {
        throw new Error(scrapeData.error || 'Failed to scrape website');
      }

      const webContent = scrapeData.content;

      // 2. CALL BACKEND AI EXTRACTION
      const aiResponseRaw = await fetch(`${(import.meta as any).env.VITE_API_BASE_URL || '/api'}/ai_extract.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: webContent })
      });

      const aiData = await aiResponseRaw.json();
      if (!aiData.success) {
        throw new Error(aiData.error || 'Failed to analyze website content');
      }

      const aiResponse = aiData.data;
      const newItems = aiResponse.products || [];
      const summary = aiResponse.businessSummary;

      // 3. PERSIST TO DATABASE IN BATCH
      const savedProducts = [];
      for (const item of newItems) {
        const res = await api.products.create({
          name: item.name,
          description: item.description,
          price: Number(item.price),
          currency: item.currency || 'USD',
          category: item.category || 'General',
          image: ''
        });
        if (res.success) {
          // If the API returns the item, we add it, otherwise we'll reload
          if (res.product) savedProducts.push(res.product);
        }
      }

      // 4. UPDATE LOCAL STATE (Reload from DB for reliability)
      const updatedProducts = await api.products.list();
      setProducts(updatedProducts);

      setIsImportModalOpen(false);
      setImportUrl('');

      if (onNotify) {
        onNotify(
          'Importación Exitosa',
          `He analizado el negocio: "${summary}". Se han importado ${newItems.length} productos reales a tu catálogo.`,
          'success'
        );
      }

    } catch (error) {
      console.error("Import error", error);
      if (onNotify) onNotify('Error de Importación', 'No se pudo procesar la web. Verifica la URL o intenta de nuevo.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar este producto?')) {
      try {
        const { api } = await import('../src/services/api');
        await api.products.delete(id);

        // Update local state
        setProducts(products.filter(p => p.id !== id));
        if (onNotify) onNotify('Producto Eliminado', 'El producto ha sido removido.', 'info');
      } catch (error) {
        console.error('Error deleting product:', error);
        if (onNotify) onNotify('Error', 'No se pudo eliminar el producto.', 'error');
      }
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Package className="text-blue-600" /> Catálogo de Productos y Servicios
          </h2>
          <p className="text-slate-500 mt-1">
            Catálogo centralizado de productos y servicios.
          </p>
        </div>

        {isPrivileged && (
          <div className="flex gap-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-colors"
            >
              <Globe size={18} className="text-blue-500" /> Importar Web
            </button>
            <button
              onClick={() => openModal()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-colors"
            >
              <Plus size={18} /> Nuevo Producto
            </button>
          </div>
        )}
      </div>

      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map(product => (
          <div key={product.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-4">
              <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">
                {product.category}
              </span>
              {isPrivileged && (
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openModal(product)} className="text-slate-400 hover:text-blue-600" title="Editar"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(product.id)} className="text-slate-400 hover:text-red-600" title="Eliminar"><Trash2 size={16} /></button>
                </div>
              )}
            </div>

            {product.image && (
              <div className="mb-4 h-32 w-full rounded-lg overflow-hidden bg-slate-50">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              </div>
            )}

            <h3 className="text-lg font-bold text-slate-900 mb-2">{product.name}</h3>
            <p className="text-slate-500 text-sm mb-4 line-clamp-3">{product.description}</p>
            <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
              <Tag size={16} className="text-slate-400" />
              <span className="font-bold text-slate-900 text-lg">
                {formatCurrency(product.price, product.currency)} <span className="text-xs font-normal text-slate-500">{product.currency}</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Manual Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">{editingId ? 'Editar Producto' : 'Agregar Producto'}</h3>
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700">Descripción (para la IA)</label>
                  <button
                    type="button"
                    onClick={handleImproveIA}
                    disabled={isImproving || (!formData.name && !formData.description)}
                    className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full border border-purple-100 hover:bg-purple-100 transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <Wand2 size={10} className={isImproving ? 'animate-spin' : ''} />
                    {isImproving ? 'Mejorando...' : 'Mejorar con IA'}
                  </button>
                </div>
                <RichTextEditor
                  content={formData.description || ''}
                  onChange={(html) => setFormData({ ...formData, description: html })}
                  placeholder="Describe el producto o servicio..."
                  minHeight="80px"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">URL de Imagen</label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="url" value={formData.image} onChange={e => setFormData({ ...formData, image: e.target.value })} title="URL de Imagen" aria-label="URL de Imagen" className="w-full pl-10 pr-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Precio</label>
                  <input required type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Moneda</label>
                  <select value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value as any })} className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="USD">USD</option>
                    <option value="MXN">MXN</option>
                    <option value="CRC">CRC</option>
                    <option value="COP">COP</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                <input type="text" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ej. Software, Servicios..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 bg-white">Cancelar</button>
                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editingId ? 'Guardar Cambios' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Website Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative overflow-hidden">
            {isImporting && (
              <div className="absolute inset-0 bg-white/90 z-10 flex flex-col items-center justify-center text-center p-6">
                <Loader2 size={48} className="text-blue-600 animate-spin mb-4" />
                <h4 className="text-lg font-bold text-slate-900">Analizando sitio web...</h4>
                <p className="text-sm text-slate-500 max-w-xs mt-2">La IA está leyendo la estructura de la web para extraer productos y servicios potenciales.</p>
              </div>
            )}

            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <Sparkles size={20} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Importar con IA</h3>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600" title="Cerrar">
                <Trash2 size={20} className="rotate-45" /> {/* Close Icon simulated */}
              </button>
            </div>

            <form onSubmit={handleImportFromWeb} className="space-y-4">
              <p className="text-sm text-slate-500">
                Introduce la URL de tu sitio web o tienda. La IA intentará detectar tus productos principales automáticamente.
              </p>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">URL del Sitio Web</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    required
                    type="url"
                    value={importUrl}
                    onChange={e => setImportUrl(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="https://mi-negocio.com"
                  />
                </div>
              </div>
              <div className="pt-2">
                <button type="submit" disabled={isImporting} className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-bold hover:shadow-lg transition-all transform hover:-translate-y-0.5">
                  {isImporting ? 'Procesando...' : 'Escanear y Entrenar IA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
