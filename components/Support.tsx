
import React, { useState } from 'react';
import { Search, PlayCircle, BookOpen, Zap, Database, MessageSquare, X, Play, Code, Layout } from 'lucide-react';

interface Tutorial {
  id: string;
  title: string;
  description: string;
  category: 'General' | 'Ventas' | 'Automatización' | 'Integraciones';
  duration: string;
  thumbnailColor: string;
  icon: any;
}

const TUTORIALS: Tutorial[] = [
  // General
  { 
    id: '1', 
    title: 'Tour Inicial de Nexus CRM', 
    description: 'Aprende a navegar por el tablero, configurar tu perfil y entender los conceptos básicos.', 
    category: 'General', 
    duration: '5:20', 
    thumbnailColor: 'bg-indigo-500',
    icon: Layout
  },
  // Ventas (Leads)
  { 
    id: '2', 
    title: 'Gestión de Leads y Pipeline', 
    description: 'Cómo crear leads, moverlos por el embudo y agendar tareas de seguimiento efectivas.', 
    category: 'Ventas', 
    duration: '8:15',
    thumbnailColor: 'bg-green-500',
    icon: BookOpen
  },
  { 
    id: '3', 
    title: 'Cierre de Ventas y Reportes', 
    description: 'Marca tratos como ganados, registra motivos de pérdida y analiza tu rendimiento.', 
    category: 'Ventas', 
    duration: '6:30',
    thumbnailColor: 'bg-emerald-600',
    icon: BookOpen
  },
  // Automatización
  { 
    id: '4', 
    title: 'Creando tu primera Automatización', 
    description: 'Configura reglas "Si ocurre esto, entonces haz aquello" para ahorrar tiempo.', 
    category: 'Automatización', 
    duration: '12:00',
    thumbnailColor: 'bg-amber-500',
    icon: Zap
  },
  { 
    id: '5', 
    title: 'Distribución de Leads (Round Robin)', 
    description: 'Aprende a repartir leads equitativamente entre tu equipo de forma automática.', 
    category: 'Automatización', 
    duration: '4:45',
    thumbnailColor: 'bg-orange-500',
    icon: Zap
  },
  // Integraciones / API
  { 
    id: '6', 
    title: 'Conectar WhatsApp Business API', 
    description: 'Guía paso a paso para vincular tu número y recibir mensajes en el CRM.', 
    category: 'Integraciones', 
    duration: '10:10',
    thumbnailColor: 'bg-blue-600',
    icon: MessageSquare
  },
  { 
    id: '7', 
    title: 'Instalación de API y Webhooks', 
    description: 'Para desarrolladores: Cómo usar las credenciales API y conectar con n8n o Make.', 
    category: 'Integraciones', 
    duration: '15:30',
    thumbnailColor: 'bg-slate-800',
    icon: Code
  },
  { 
    id: '8', 
    title: 'Importar Productos con IA', 
    description: 'Utiliza Gemini para escanear tu sitio web y poblar tu catálogo automáticamente.', 
    category: 'Integraciones', 
    duration: '3:20',
    thumbnailColor: 'bg-purple-600',
    icon: Database
  },
];

export const Support: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [activeVideo, setActiveVideo] = useState<Tutorial | null>(null);

  const categories = ['Todos', 'General', 'Ventas', 'Automatización', 'Integraciones'];

  const filteredTutorials = TUTORIALS.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex h-full flex-col p-4 md:p-8 overflow-y-auto">
       <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900">Academia Nexus</h2>
        <p className="text-slate-500 mt-2 text-lg">Tutoriales, guías y documentación técnica para dominar tu CRM.</p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-6 mb-8 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="¿Qué quieres aprender hoy?" 
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-base"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
              {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                      {cat}
                  </button>
              ))}
          </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTutorials.map(tutorial => (
              <div 
                key={tutorial.id} 
                onClick={() => setActiveVideo(tutorial)}
                className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col"
              >
                  {/* Thumbnail */}
                  <div className={`h-48 ${tutorial.thumbnailColor} relative flex items-center justify-center overflow-hidden`}>
                      <div className="absolute inset-0 bg-black opacity-10 group-hover:opacity-20 transition-opacity"></div>
                      <tutorial.icon size={64} className="text-white opacity-50 transform group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-full border border-white/50">
                             <Play size={32} className="text-white fill-white" />
                          </div>
                      </div>
                      <span className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded backdrop-blur-md">
                          {tutorial.duration}
                      </span>
                  </div>
                  
                  {/* Content */}
                  <div className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{tutorial.category}</span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">{tutorial.title}</h3>
                      <p className="text-slate-500 text-sm leading-relaxed mb-4 flex-1">
                          {tutorial.description}
                      </p>
                      <div className="pt-4 border-t border-slate-100 flex items-center text-indigo-600 font-medium text-sm">
                          <PlayCircle size={16} className="mr-2" /> Ver Tutorial
                      </div>
                  </div>
              </div>
          ))}
      </div>

      {filteredTutorials.length === 0 && (
          <div className="text-center py-20">
              <div className="bg-slate-100 p-6 rounded-full inline-flex mb-4">
                  <Search size={48} className="text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">No encontramos tutoriales</h3>
              <p className="text-slate-500">Intenta buscar con otras palabras clave.</p>
          </div>
      )}

      {/* Video Modal Simulator */}
      {activeVideo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="w-full max-w-5xl bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                  <div className="p-4 flex justify-between items-center border-b border-slate-800">
                      <h3 className="text-white font-bold flex items-center gap-2">
                          <PlayCircle size={20} className="text-indigo-500" /> {activeVideo.title}
                      </h3>
                      <button onClick={() => setActiveVideo(null)} className="text-slate-400 hover:text-white transition-colors">
                          <X size={24} />
                      </button>
                  </div>
                  
                  {/* Video Player Placeholder */}
                  <div className="aspect-video bg-black relative group cursor-pointer flex items-center justify-center">
                      <div className="text-center">
                          <Play size={64} className="text-white mx-auto mb-4 opacity-80" />
                          <p className="text-slate-400 text-sm">Simulación de Reproductor de Video</p>
                          <p className="text-slate-500 text-xs mt-1">(Aquí se cargaría el iframe de YouTube/Vimeo)</p>
                      </div>
                      
                      {/* Controls Bar Simulation */}
                      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/80 to-transparent flex items-end px-4 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-full">
                             <div className="h-1 bg-slate-600 rounded-full mb-2 overflow-hidden">
                                 <div className="h-full w-1/3 bg-indigo-500"></div>
                             </div>
                             <div className="flex justify-between text-white text-xs">
                                 <span>01:23 / {activeVideo.duration}</span>
                                 <span>HD</span>
                             </div>
                          </div>
                      </div>
                  </div>

                  <div className="p-6 bg-slate-900 text-slate-300">
                      <h4 className="text-lg font-bold text-white mb-2">Sobre este tutorial</h4>
                      <p>{activeVideo.description}</p>
                      
                      <div className="mt-6 flex gap-4">
                          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                              Descargar Materiales (PDF)
                          </button>
                          <button className="border border-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                              Compartir
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
