
import React, { useState } from 'react';
import { Contact, LeadStatus, CurrentUser, Source, TeamMember } from '../types';
import { Filter, Search, User, X, CheckCircle, Tag, Clock, ArrowLeft, Plus, Users, CheckSquare, Square, ChevronDown } from 'lucide-react';

const StatusBadge: React.FC<{ status: LeadStatus }> = ({ status }) => {
  const colors = {
    [LeadStatus.NEW]: 'bg-blue-100 text-blue-700',
    [LeadStatus.CONTACTED]: 'bg-indigo-100 text-indigo-700',
    [LeadStatus.QUALIFIED]: 'bg-purple-100 text-purple-700',
    [LeadStatus.NEGOTIATION]: 'bg-orange-100 text-orange-700',
    [LeadStatus.WON]: 'bg-green-100 text-green-700',
    [LeadStatus.LOST]: 'bg-red-100 text-red-700',
  };
  
  const labels = {
    [LeadStatus.NEW]: 'Nuevo',
    [LeadStatus.CONTACTED]: 'Contactado',
    [LeadStatus.QUALIFIED]: 'Calificado',
    [LeadStatus.NEGOTIATION]: 'Negociación',
    [LeadStatus.WON]: 'Ganado',
    [LeadStatus.LOST]: 'Perdido',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[status]} whitespace-nowrap`}>
      {labels[status] || status}
    </span>
  );
};

interface ContactsProps {
  currentUser?: CurrentUser;
  contacts: Contact[];
  setContacts: (contacts: Contact[]) => void;
  onAddContact?: (contact: Contact) => void;
  onNotify?: (title: string, msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  team?: TeamMember[];
}

export const Contacts: React.FC<ContactsProps> = ({ currentUser, contacts, setContacts, onAddContact, onNotify, team = [] }) => {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
      status: 'All',
      source: 'All',
      owner: 'All'
  });
  
  const [newContact, setNewContact] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    value: 0
  });

  const isManager = currentUser?.role === 'MANAGER';

  // 1. Base Permission Filter
  const baseContacts = isManager 
    ? contacts 
    : contacts.filter(c => c.owner === currentUser?.name);

  // 2. Advanced Filtering Logic
  const displayedContacts = baseContacts.filter(c => {
      // Search
      const matchesSearch = 
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          c.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status Filter
      const matchesStatus = activeFilters.status === 'All' || c.status === activeFilters.status;
      
      // Source Filter
      const matchesSource = activeFilters.source === 'All' || c.source === activeFilters.source;
      
      // Owner Filter (Only relevant for Managers viewing all)
      let matchesOwner = true;
      if (activeFilters.owner !== 'All') {
          if (activeFilters.owner === 'Unassigned') {
              matchesOwner = c.owner === 'Unassigned' || c.owner === 'Sin asignar';
          } else {
              matchesOwner = c.owner === activeFilters.owner;
          }
      }

      return matchesSearch && matchesStatus && matchesSource && matchesOwner;
  });

  const getAgentWorkload = (agentName: string) => {
    return contacts.filter(c => c.owner === agentName && c.status !== LeadStatus.WON && c.status !== LeadStatus.LOST).length;
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const contact: Contact = {
      id: Date.now().toString(),
      name: newContact.name,
      company: newContact.company,
      email: newContact.email,
      phone: newContact.phone,
      value: Number(newContact.value),
      status: LeadStatus.NEW,
      source: Source.REFERRAL,
      owner: currentUser?.name || 'Unassigned',
      lastActivity: 'Ahora',
      tags: [],
      probability: 10,
      notes: [],
      history: []
    };

    if (onAddContact) {
        onAddContact(contact); 
    } else {
        setContacts([contact, ...contacts]);
    }
    
    setIsModalOpen(false);
    setNewContact({ name: '', company: '', email: '', phone: '', value: 0 });
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
        newSelection.delete(id);
    } else {
        newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const toggleAll = () => {
      if (selectedIds.size === displayedContacts.length && displayedContacts.length > 0) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(displayedContacts.map(c => c.id)));
      }
  };

  const handleBulkAssign = (agentName: string) => {
      const count = selectedIds.size;
      if (count === 0) return;

      const actionName = agentName === 'Unassigned' ? 'Desasignar' : `Asignar a ${agentName}`;

      if (confirm(`¿${actionName} ${count} leads seleccionados?`)) {
          setContacts(contacts.map(c => 
              selectedIds.has(c.id) ? { ...c, owner: agentName } : c
          ));
          
          if (onNotify) {
              const msg = agentName === 'Unassigned' 
                ? `${count} leads han sido liberados (Sin Asignar).`
                : `${count} leads transferidos a ${agentName}.`;
              onNotify('Operación Exitosa', msg, 'success');
          }
          
          setSelectedIds(new Set());
      }
  };

  const clearFilters = () => {
      setActiveFilters({ status: 'All', source: 'All', owner: 'All' });
      setSearchTerm('');
  };

  const hasActiveFilters = activeFilters.status !== 'All' || activeFilters.source !== 'All' || activeFilters.owner !== 'All' || searchTerm !== '';

  return (
    <div className="flex h-full overflow-hidden relative bg-slate-50">
      <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {isManager ? 'Gestión de Contactos' : 'Mis Contactos'}
            </h2>
            <p className="text-slate-500 text-sm">
              Mostrando {displayedContacts.length} de {baseContacts.length} registros
            </p>
          </div>
          <div className="flex gap-2 w-full md:w-auto relative">
            <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 border rounded-lg transition-colors ${showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <Filter size={18} /> Filtros {showFilters ? <ChevronDown size={14} className="rotate-180 transition-transform"/> : <ChevronDown size={14} className="transition-transform"/>}
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex-1 md:flex-none bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 whitespace-nowrap flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Agregar
            </button>
          </div>
        </div>

        {/* BULK ACTIONS BAR */}
        {isManager && selectedIds.size > 0 && (
            <div className="mb-4 bg-indigo-900 text-white p-3 rounded-xl flex flex-col md:flex-row items-center justify-between shadow-lg animate-in slide-in-from-top-2 gap-3">
                <div className="flex items-center gap-3">
                    <span className="font-bold bg-white text-indigo-900 px-2 py-0.5 rounded text-sm">{selectedIds.size}</span>
                    <span className="text-sm font-medium">Leads seleccionados</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 justify-center">
                    <span className="text-xs text-indigo-300 uppercase tracking-wider font-semibold mr-1 hidden md:inline">Reasignar:</span>
                    {team.filter(m => m.role === 'Sales').map(agent => (
                        <button 
                            key={agent.id}
                            onClick={() => handleBulkAssign(agent.name)}
                            className="text-xs bg-indigo-800 hover:bg-indigo-700 border border-indigo-700 px-3 py-1.5 rounded transition-colors flex flex-col items-center min-w-[80px]"
                        >
                            <span className="font-medium">{agent.name.split(' ')[0]}</span>
                            <span className="text-[10px] text-indigo-300">({getAgentWorkload(agent.name)} activos)</span>
                        </button>
                    ))}
                    <div className="w-px h-8 bg-indigo-700 mx-2 hidden md:block"></div>
                    <button 
                        onClick={() => handleBulkAssign('Unassigned')}
                        className="text-xs bg-red-900/50 hover:bg-red-800 border border-red-800 px-3 py-1.5 rounded transition-colors flex items-center gap-1"
                    >
                        <X size={12} /> Desasignar (Liberar)
                    </button>
                </div>
            </div>
        )}

        {/* FILTERS PANEL */}
        {showFilters && (
            <div className="mb-6 p-4 bg-white border border-slate-200 rounded-xl shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Buscar</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Nombre, empresa..." 
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Etapa / Estado</label>
                    <select 
                        value={activeFilters.status}
                        onChange={(e) => setActiveFilters({...activeFilters, status: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option value="All">Todas las etapas</option>
                        {Object.values(LeadStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fuente</label>
                    <select 
                        value={activeFilters.source}
                        onChange={(e) => setActiveFilters({...activeFilters, source: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option value="All">Todos los orígenes</option>
                        {Object.values(Source).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                {isManager && (
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vendedor</label>
                        <select 
                            value={activeFilters.owner}
                            onChange={(e) => setActiveFilters({...activeFilters, owner: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="All">Todos</option>
                            <option value="Unassigned">Sin Asignar</option>
                            {team.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                        </select>
                    </div>
                )}
                {hasActiveFilters && (
                    <div className="md:col-span-4 flex justify-end">
                        <button onClick={clearFilters} className="text-xs text-red-600 hover:underline flex items-center gap-1">
                            <X size={12} /> Limpiar todos los filtros
                        </button>
                    </div>
                )}
            </div>
        )}

        {/* TABLE */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr className="text-xs uppercase text-slate-500 font-semibold tracking-wider">
                  {isManager && (
                      <th className="px-6 py-4 w-10">
                          <button onClick={toggleAll} className="text-slate-400 hover:text-indigo-600">
                              {selectedIds.size === displayedContacts.length && displayedContacts.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                          </button>
                      </th>
                  )}
                  <th className="px-6 py-4">Nombre</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="hidden md:table-cell px-6 py-4">Fuente</th>
                  <th className="hidden md:table-cell px-6 py-4">Dueño</th>
                  <th className="hidden lg:table-cell px-6 py-4">Valor</th>
                  <th className="hidden lg:table-cell px-6 py-4">Última Actividad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedContacts.length > 0 ? displayedContacts.map((contact) => (
                  <tr 
                    key={contact.id} 
                    className={`hover:bg-indigo-50/50 transition-colors ${selectedIds.has(contact.id) ? 'bg-indigo-50' : ''}`}
                  >
                    {isManager && (
                        <td className="px-6 py-4">
                            <button onClick={() => toggleSelection(contact.id)} className={`${selectedIds.has(contact.id) ? 'text-indigo-600' : 'text-slate-300 hover:text-slate-500'}`}>
                                {selectedIds.has(contact.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                            </button>
                        </td>
                    )}
                    <td className="px-6 py-4 cursor-pointer" onClick={() => setSelectedContact(contact)}>
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold mr-3 text-xs flex-shrink-0">
                          {contact.name.substring(0,2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{contact.name}</p>
                          <p className="text-xs text-slate-500">{contact.company}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 cursor-pointer" onClick={() => setSelectedContact(contact)}><StatusBadge status={contact.status} /></td>
                    <td className="hidden md:table-cell px-6 py-4 text-sm text-slate-600 cursor-pointer" onClick={() => setSelectedContact(contact)}>{contact.source}</td>
                    <td className="hidden md:table-cell px-6 py-4 text-sm text-slate-600">
                        {contact.owner === 'Sin asignar' || contact.owner === 'Unassigned' ? (
                            <span className="text-amber-600 font-medium text-xs bg-amber-50 px-2 py-1 rounded">Sin asignar</span>
                        ) : (
                            contact.owner
                        )}
                    </td>
                    <td className="hidden lg:table-cell px-6 py-4 text-sm font-medium text-slate-900 cursor-pointer" onClick={() => setSelectedContact(contact)}>${contact.value.toLocaleString()}</td>
                    <td className="hidden lg:table-cell px-6 py-4 text-sm text-slate-500 cursor-pointer" onClick={() => setSelectedContact(contact)}>{contact.lastActivity}</td>
                  </tr>
                )) : (
                    <tr>
                        <td colSpan={isManager ? 7 : 6} className="p-12 text-center">
                            <div className="flex flex-col items-center justify-center text-slate-400">
                                <Search size={48} className="mb-4 opacity-20" />
                                <p className="text-lg font-medium text-slate-600">No se encontraron resultados</p>
                                <p className="text-sm">Intenta ajustar los filtros de búsqueda.</p>
                                <button onClick={clearFilters} className="mt-4 text-indigo-600 hover:underline">Limpiar filtros</button>
                            </div>
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-900">Agregar Nuevo Lead</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                <input 
                  required
                  type="text" 
                  value={newContact.name}
                  onChange={e => setNewContact({...newContact, name: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ej. Maria Perez"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Empresa</label>
                <input 
                  required
                  type="text" 
                  value={newContact.company}
                  onChange={e => setNewContact({...newContact, company: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ej. Acme Corp"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input 
                    type="email" 
                    value={newContact.email}
                    onChange={e => setNewContact({...newContact, email: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="email@ejemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                  <input 
                    type="tel" 
                    value={newContact.phone}
                    onChange={e => setNewContact({...newContact, phone: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="+1 555..." // Generic placeholder
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valor Estimado</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
                  <input 
                    type="number" 
                    value={newContact.value}
                    onChange={e => setNewContact({...newContact, value: Number(e.target.value)})}
                    className="w-full pl-8 px-3 py-2 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700">
                  Crear Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedContact && (
        <div className="absolute inset-y-0 right-0 w-full md:w-96 bg-white shadow-2xl border-l border-slate-200 transform transition-transform duration-300 ease-in-out z-[60] flex flex-col">
          <div className="p-6 border-b border-slate-100 flex justify-between items-start">
            <div className="flex items-center gap-3">
               <button onClick={() => setSelectedContact(null)} className="md:hidden text-slate-600 mr-2">
                 <ArrowLeft />
               </button>
               <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-lg font-bold">
                 {selectedContact.name.substring(0,2).toUpperCase()}
               </div>
               <div>
                 <h3 className="text-xl font-bold text-slate-900">{selectedContact.name}</h3>
                 <p className="text-sm text-slate-500">{selectedContact.company}</p>
                 {selectedContact.tags.map(tag => (
                     <span key={tag} className="inline-block bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full mr-1 mt-1">{tag}</span>
                 ))}
               </div>
            </div>
            <button onClick={() => setSelectedContact(null)} className="hidden md:block text-slate-400 hover:text-slate-600">
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 uppercase font-semibold">Valor</p>
                <p className="text-lg font-bold text-slate-900">${selectedContact.value.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 uppercase font-semibold">Probabilidad</p>
                <p className="text-lg font-bold text-slate-900">{selectedContact.probability}%</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <User size={16} className="text-indigo-600"/> Info Contacto
              </h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex justify-between border-b border-slate-50 pb-1"><span>Email:</span> <span className="text-slate-900 truncate max-w-[200px]">{selectedContact.email}</span></li>
                <li className="flex justify-between border-b border-slate-50 pb-1"><span>Tel:</span> <span className="text-slate-900">{selectedContact.phone}</span></li>
                <li className="flex justify-between border-b border-slate-50 pb-1"><span>Dueño:</span> <span className="text-slate-900">{selectedContact.owner === 'Unassigned' ? 'Sin asignar' : selectedContact.owner}</span></li>
              </ul>
            </div>
            
             <div className="border-t border-slate-100 pt-4">
               <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Clock size={16} className="text-indigo-600"/> Actividad
              </h4>
              <div className="relative pl-4 border-l-2 border-slate-200 space-y-4">
                {selectedContact.notes && selectedContact.notes.length > 0 && selectedContact.notes.map(note => (
                    <div key={note.id} className="relative bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                        <span className="absolute -left-[23px] top-3 w-3 h-3 rounded-full bg-yellow-400 border-2 border-white"></span>
                        <p className="text-xs text-yellow-800 mb-1">{note.author} • {note.createdAt}</p>
                        <p className="text-sm text-slate-800 italic">"{note.content}"</p>
                    </div>
                ))}

                {selectedContact.history.length > 0 ? selectedContact.history.map((h) => (
                   <div key={h.id} className="relative">
                     <span className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white ${h.sender === 'agent' ? 'bg-indigo-500' : 'bg-green-500'}`}></span>
                     <p className="text-xs text-slate-500 mb-0.5">{h.timestamp} • {h.channel}</p>
                     <p className="text-sm text-slate-800 truncate">{h.content}</p>
                   </div>
                )) : <p className="text-xs text-slate-400">Sin historial.</p>}
              </div>
            </div>
          </div>
          
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <button className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700">
              Crear Tarea
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
