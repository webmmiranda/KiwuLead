
import React, { useState } from 'react';
import { Contact, LeadStatus, CurrentUser, Source, TeamMember, Task, Product, PipelineColumn } from '../types';
import { Filter, Search, X, Plus, Users, CheckSquare, Square, ChevronDown, Package, AlertTriangle } from 'lucide-react';
import { ContactDetailsPanel } from './ContactDetailsPanel';
import { TaskModal } from './TaskModal';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, string> = {
    [LeadStatus.NEW]: 'bg-blue-100 text-blue-700',
    [LeadStatus.CONTACTED]: 'bg-blue-100 text-blue-700',
    [LeadStatus.QUALIFIED]: 'bg-cyan-100 text-cyan-700',
    [LeadStatus.NEGOTIATION]: 'bg-orange-100 text-orange-700',
    [LeadStatus.WON]: 'bg-green-100 text-green-700',
    [LeadStatus.LOST]: 'bg-red-100 text-red-700',
  };

  const labels: Record<string, string> = {
    [LeadStatus.NEW]: 'Nuevo',
    [LeadStatus.CONTACTED]: 'Contactado',
    [LeadStatus.QUALIFIED]: 'Calificado',
    [LeadStatus.NEGOTIATION]: 'Negociación',
    [LeadStatus.WON]: 'Ganado',
    [LeadStatus.LOST]: 'Perdido',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-700'} whitespace-nowrap`}>
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
  onAddTask?: (task: Task) => void;
  onNavigateToChat?: (contactId: string) => void;
  products?: Product[];
  pipelineColumns?: PipelineColumn[];
  onMoveContact?: (contactId: string, newStatus: string) => void;
  onUpdateContact?: (id: string, updates: Partial<Contact>) => void;
  enableHeader?: boolean;
}

export const Contacts: React.FC<ContactsProps> = ({ 
  currentUser, 
  contacts = [], 
  setContacts, 
  onAddContact, 
  onNotify, 
  team = [], 
  onAddTask, 
  onNavigateToChat, 
  products = [],
  pipelineColumns,
  onMoveContact,
  onUpdateContact,
  enableHeader = true
}) => {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [conflictContact, setConflictContact] = useState<Contact | null>(null);
  const [conflictNote, setConflictNote] = useState('');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [isBulkUnassignModalOpen, setIsBulkUnassignModalOpen] = useState(false);
  const [contactAppointments, setContactAppointments] = useState<any[]>([]);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  React.useEffect(() => {
    if (selectedContact) {
      const fetchAppointments = async () => {
        try {
          const { api } = await import('../src/services/api');
          const data = await api.appointments.list({ contactId: selectedContact.id });
          setContactAppointments(data);
        } catch (err) {
          console.error("Failed to fetch appointments", err);
        }
      };
      fetchAppointments();
    } else {
      setContactAppointments([]);
    }
  }, [selectedContact]);

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
    value: 0,
    owner: 'Unassigned'
  });

  const isManager = ['MANAGER', 'Manager', 'Admin'].includes(currentUser?.role || '');

  // 1. Base Permission Filter
  const baseContacts = isManager
    ? contacts
    : contacts.filter(c => c.owner === currentUser?.name);

  // 2. Advanced Filtering Logic
  const displayedContacts = enableHeader ? baseContacts.filter(c => {
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
  }) : contacts;

  const getAgentWorkload = (agentName: string) => {
    return contacts.filter(c => c.owner === agentName && c.status !== LeadStatus.WON && c.status !== LeadStatus.LOST).length;
  };

  const handleConflictSubmit = async () => {
    if (!conflictContact || !currentUser) return;

    try {
        const { api } = await import('../src/services/api');
        
        // 1. Create Note
        const noteContent = `⚠️ [Intento de Duplicado] ${currentUser.name} intentó registrar este lead.\nNota: ${conflictNote}`;
        await api.notes.create({
            contactId: conflictContact.id,
            content: noteContent,
            authorId: currentUser.id
        });

        // 2. Create Task for Owner
        await api.tasks.create({
            title: `⚠️ Conflicto de Lead: ${conflictContact.name}`,
            type: 'ToDo',
            dueDate: new Date().toISOString().split('T')[0],
            priority: 'High',
            assignedTo: conflictContact.owner,
            relatedContactId: conflictContact.id,
            description: `El vendedor ${currentUser.name} intentó registrar este lead. Nota: ${conflictNote}`
        });

        if (onNotify) onNotify('Dueño Notificado', `Se ha enviado una alerta a ${conflictContact.owner}.`, 'success');
        
        setIsConflictModalOpen(false);
        setConflictContact(null);
        setConflictNote('');
        setNewContact({ name: '', company: '', email: '', phone: '', value: 0, owner: 'Unassigned' });
    } catch (error) {
        console.error(error);
        if (onNotify) onNotify('Error', 'No se pudo registrar el conflicto.', 'error');
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingContactId) {
      // Edit Mode
      const existingContact = contacts.find(c => c.id === editingContactId);
      if (!existingContact) return;

      const updatedContact: Contact = {
        ...existingContact,
        name: newContact.name,
        company: newContact.company,
        email: newContact.email,
        phone: newContact.phone,
        value: Number(newContact.value),
        owner: newContact.owner
      };

      // Update local state directly since we have setContacts
      // Note: In a real app with onAddContact being an async API call, we might want an onUpdateContact prop.
      // But here setContacts is passed for local state management in the wrapper.
      setContacts(contacts.map(c => c.id === editingContactId ? updatedContact : c));

      // Persist to DB
      (async () => {
        try {
          const { api } = await import('../src/services/api');
          await api.contacts.update(editingContactId, {
            name: newContact.name,
            company: newContact.company,
            email: newContact.email,
            phone: newContact.phone,
            value: Number(newContact.value),
            owner: newContact.owner
          });
        } catch (error) {
          console.error('Error persisting contact edit:', error);
        }
      })();

      // Also update selectedContact if it's the one being edited
      if (selectedContact && selectedContact.id === editingContactId) {
        setSelectedContact(updatedContact);
      }

      if (onNotify) onNotify('Contacto Actualizado', 'Los datos del contacto han sido guardados.', 'success');
    } else {
      // Check for duplicates
      const duplicate = contacts.find(c => 
          (c.email && newContact.email && c.email.toLowerCase() === newContact.email.toLowerCase()) || 
          (c.phone && newContact.phone && c.phone === newContact.phone)
      );

      if (duplicate) {
          if (duplicate.owner === currentUser?.name) {
              if (onNotify) onNotify('Ya Gestionas este Lead', 'Abriendo ficha existente...', 'info');
              setSelectedContact(duplicate);
              setIsModalOpen(false);
              setNewContact({ name: '', company: '', email: '', phone: '', value: 0, owner: 'Unassigned' });
              return;
          } else {
              setConflictContact(duplicate);
              setIsConflictModalOpen(true);
              setIsModalOpen(false);
              return;
          }
      }

      // Create Mode
      const contact: Contact = {
        id: Date.now().toString(),
        name: newContact.name,
        company: newContact.company,
        email: newContact.email,
        phone: newContact.phone,
        value: Number(newContact.value),
        status: LeadStatus.NEW,
        source: Source.REFERRAL,
        owner: newContact.owner, // Allow selecting owner (or Unassigned for automation)
        createdAt: new Date().toISOString(),
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
    }

    setIsModalOpen(false);
    setNewContact({ name: '', company: '', email: '', phone: '', value: 0, owner: 'Unassigned' });
    setEditingContactId(null);
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

  const executeBulkAssign = async (agentName: string) => {
    const count = selectedIds.size;
    if (count === 0) return;

    try {
      const { api } = await import('../src/services/api');

      // Find owner ID (API expects ID, not Name, though current mock/hybrid might accept either, let's be safe)
      // Note: The types say owner_id is number or null.
      const agentMember = team.find(t => t.name === agentName);
      const agentId = agentMember ? agentMember.id : null;

      // Parallel API calls
      await Promise.all(Array.from(selectedIds).map(id =>
        api.contacts.update(id, { owner_id: agentId } as any)
      ));

      // Update local state
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
    } catch (error) {
      console.error('Bulk assign error', error);
      if (onNotify) onNotify('Error', 'No se pudieron asignar los leads.', 'error');
    }
  };

  const clearFilters = () => {
    setActiveFilters({ status: 'All', source: 'All', owner: 'All' });
    setSearchTerm('');
  };

  const hasActiveFilters = activeFilters.status !== 'All' || activeFilters.source !== 'All' || activeFilters.owner !== 'All' || searchTerm !== '';

  const handleCreateTaskClick = () => {
    if (!selectedContact) return;
    setIsTaskModalOpen(true);
  };

  const handleTaskSubmit = async (taskData: Partial<Task>) => {
    if (!selectedContact) return;

    try {
      const { api } = await import('../src/services/api');
      
      const finalTaskData = {
        ...taskData,
        relatedContactName: selectedContact.name,
        relatedContactId: selectedContact.id,
      };

      const res = await api.tasks.create(finalTaskData as any);

      if (onAddTask) {
        const createdTask: Task = {
          ...finalTaskData,
          id: res.id || Date.now().toString(),
        } as Task;
        onAddTask(createdTask);
      }

      if (onNotify) onNotify('Tarea Creada', 'Tarea guardada correctamente.', 'success');
      setIsTaskModalOpen(false);
    } catch (e) {
      console.error(e);
      if (onNotify) onNotify('Error', 'No se pudo crear la tarea.', 'error');
    }
  };

  return (
    <div className="flex h-full overflow-hidden relative bg-slate-50">
      <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">

        {/* HEADER */}
        {enableHeader && (
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
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 border rounded-lg transition-colors ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <Filter size={18} /> Filtros {showFilters ? <ChevronDown size={14} className="rotate-180 transition-transform" /> : <ChevronDown size={14} className="transition-transform" />}
            </button>
            <button
              onClick={() => {
                setNewContact({ 
                  name: '', company: '', email: '', phone: '', value: 0, 
                  owner: currentUser?.name || 'Unassigned' 
                });
                setIsModalOpen(true);
              }}
              className="flex-1 md:flex-none bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 whitespace-nowrap flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Agregar
            </button>
          </div>
        </div>
        )}

        {/* BULK ACTIONS BAR */}
        {isManager && selectedIds.size > 0 && (
          <div className="mb-4 bg-blue-900 text-white p-3 rounded-xl flex flex-col md:flex-row items-center justify-between shadow-lg animate-in slide-in-from-top-2 gap-3">
            <div className="flex items-center gap-3">
              <span className="font-bold bg-white text-blue-900 px-2 py-0.5 rounded text-sm">{selectedIds.size}</span>
              <span className="text-sm font-medium">Leads seleccionados</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-center">
              <button
                onClick={() => setIsBulkAssignModalOpen(true)}
                className="text-xs bg-blue-800 hover:bg-blue-700 border border-blue-700 px-4 py-2 rounded transition-colors flex items-center gap-2"
              >
                <Users size={14} />
                <span className="font-medium">Reasignar ({selectedIds.size})</span>
              </button>
              <div className="w-px h-8 bg-blue-700 mx-2 hidden md:block"></div>
              <button
                onClick={() => setIsBulkUnassignModalOpen(true)}
                className="text-xs bg-red-900/50 hover:bg-red-800 border border-red-800 px-4 py-2 rounded transition-colors flex items-center gap-2"
              >
                <X size={14} />
                <span className="font-medium">Desasignar</span>
              </button>
            </div>
          </div>
        )}

        {/* FILTERS PANEL */}
        {enableHeader && showFilters && (
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
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Etapa / Estado</label>
              <select
                value={activeFilters.status}
                onChange={(e) => setActiveFilters({ ...activeFilters, status: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="All">Todas las etapas</option>
                {Object.values(LeadStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fuente</label>
              <select
                value={activeFilters.source}
                onChange={(e) => setActiveFilters({ ...activeFilters, source: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
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
                  onChange={(e) => setActiveFilters({ ...activeFilters, owner: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
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
                      <button onClick={toggleAll} className="text-slate-400 hover:text-blue-600">
                        {selectedIds.size === displayedContacts.length && displayedContacts.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>
                    </th>
                  )}
                  <th className="px-6 py-4">Nombre</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Fuente</th>
                  <th className="px-6 py-4">Dueño</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4">Última Actividad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedContacts.length > 0 ? displayedContacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className={`hover:bg-blue-50/50 transition-colors ${selectedIds.has(contact.id) ? 'bg-blue-50' : ''}`}
                  >
                    {isManager && (
                      <td className="px-6 py-4">
                        <button onClick={() => toggleSelection(contact.id)} className={`${selectedIds.has(contact.id) ? 'text-blue-600' : 'text-slate-300 hover:text-slate-500'}`}>
                          {selectedIds.has(contact.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                        </button>
                      </td>
                    )}
                    <td className="px-6 py-4 cursor-pointer" onClick={() => setSelectedContact(contact)}>
                      <div className="flex items-center">
                        <div>
                          <p className="font-medium text-slate-900">{contact.name}</p>
                          <p className="text-xs text-slate-500">{contact.company}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 cursor-pointer" onClick={(e) => {
                      // Prevent modal open if clicking dropdown
                      if ((e.target as HTMLElement).closest('.status-dropdown')) return;
                      setSelectedContact(contact);
                    }}>
                      {pipelineColumns && onMoveContact ? (
                        <div className="relative status-dropdown">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdownId(openDropdownId === contact.id ? null : contact.id);
                            }}
                            className="flex items-center gap-1 focus:outline-none hover:opacity-80"
                          >
                            <StatusBadge status={contact.status} />
                            <ChevronDown size={12} className="text-slate-400" />
                          </button>
                          {openDropdownId === contact.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-10 cursor-default" 
                                onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); }} 
                              />
                              <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-100 z-20">
                                {pipelineColumns.map(col => (
                                  <button
                                    key={col.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onMoveContact(contact.id, col.id);
                                      setOpenDropdownId(null);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 ${contact.status === col.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600'}`}
                                  >
                                    <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: col.color }} />
                                    {col.title}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <StatusBadge status={contact.status} />
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 cursor-pointer" onClick={() => setSelectedContact(contact)}>{contact.source}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {contact.owner === 'Sin asignar' || contact.owner === 'Unassigned' ? (
                        <span className="text-amber-600 font-medium text-xs bg-amber-50 px-2 py-1 rounded">Sin asignar</span>
                      ) : (
                        contact.owner
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900 cursor-pointer" onClick={() => setSelectedContact(contact)}>${contact.value.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 cursor-pointer" onClick={() => setSelectedContact(contact)}>{contact.lastActivity}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={isManager ? 7 : 6} className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Search size={48} className="mb-4 opacity-20" />
                        <p className="text-lg font-medium text-slate-600">No se encontraron resultados</p>
                        <p className="text-sm">Intenta ajustar los filtros de búsqueda.</p>
                        <button onClick={clearFilters} className="mt-4 text-blue-600 hover:underline">Limpiar filtros</button>
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
              <h3 className="text-xl font-bold text-slate-900">{editingContactId ? 'Editar Contacto' : 'Agregar Nuevo Lead'}</h3>
              <button onClick={() => { setIsModalOpen(false); setEditingContactId(null); setNewContact({ name: '', company: '', email: '', phone: '', value: 0, owner: 'Unassigned' }); }} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                <input
                  required
                  type="text"
                  value={newContact.name}
                  onChange={e => setNewContact({ ...newContact, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ej. Maria Perez"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Empresa</label>
                <input
                  required
                  type="text"
                  value={newContact.company}
                  onChange={e => setNewContact({ ...newContact, company: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ej. Acme Corp"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newContact.email}
                    onChange={e => setNewContact({ ...newContact, email: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="email@ejemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={newContact.phone}
                    onChange={e => setNewContact({ ...newContact, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="+1 555..." // Generic placeholder
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Producto de Interés</label>
                <div className="relative">
                  <select
                    className="w-full pl-9 px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                    onChange={(e) => {
                      const prodId = e.target.value;
                      const prod = products.find(p => p.id === prodId);
                      if (prod) {
                         setNewContact(prev => ({ ...prev, value: prod.price }));
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="">Seleccionar producto...</option>
                    {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} - ${p.price} {p.currency}</option>
                    ))}
                  </select>
                  <Package size={16} className="absolute left-3 top-2.5 text-slate-400" />
                  <ChevronDown size={16} className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valor Estimado</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    value={newContact.value}
                    onChange={e => setNewContact({ ...newContact, value: Number(e.target.value) })}
                    className="w-full pl-8 px-3 py-2 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              
              {isManager && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Asignar a</label>
                  <select
                    value={newContact.owner}
                    onChange={e => setNewContact({ ...newContact, owner: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Unassigned">Sin Asignar</option>
                    {team.map(m => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-2">
                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700">
                  {editingContactId ? 'Guardar Cambios' : 'Crear Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {selectedContact && (
        <ContactDetailsPanel
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
          onUpdateContact={(id, updates) => {
            // Update local state
            setContacts(contacts.map(c => c.id === id ? { ...c, ...updates } : c));
            if (selectedContact && selectedContact.id === id) {
                setSelectedContact({ ...selectedContact, ...updates });
            }
            // Call prop if exists (for persistence)
            if (onUpdateContact) {
                onUpdateContact(id, updates);
            }
          }}
          onNavigateToChat={onNavigateToChat}
          onOpenWhatsApp={() => {
            if (!selectedContact?.phone) return;
            const phone = selectedContact.phone.replace(/\D/g, '');
            window.open(`https://wa.me/${phone}`, '_blank');
          }}
          onCreateTask={handleCreateTaskClick}
          products={products}
          companyCurrency="USD"
          contactAppointments={contactAppointments}
        />
      )}

      {/* Conflict Resolution Modal */}
      {isConflictModalOpen && conflictContact && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black bg-opacity-50 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border-l-4 border-amber-500">
            <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-amber-100 rounded-full">
                    <AlertTriangle className="text-amber-600" size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-900">Lead Existente</h3>
                    <p className="text-sm text-slate-600 mt-1">
                        Este contacto ya está registrado en el sistema.
                    </p>
                </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg mb-4 border border-slate-200">
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-slate-500">Nombre:</span>
                    <span className="font-medium text-slate-900">{conflictContact.name}</span>
                    
                    <span className="text-slate-500">Empresa:</span>
                    <span className="font-medium text-slate-900">{conflictContact.company}</span>
                    
                    <span className="text-slate-500">Dueño Actual:</span>
                    <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded w-fit">
                        {conflictContact.owner}
                    </span>
                    
                    <span className="text-slate-500">Estado:</span>
                    <StatusBadge status={conflictContact.status} />
                </div>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Deja una nota para el dueño actual:
                </label>
                <textarea
                    value={conflictNote}
                    onChange={(e) => setConflictNote(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none h-24 resize-none"
                    placeholder="Ej. El cliente me contactó para una nueva cotización..."
                />
                <p className="text-xs text-slate-500 mt-1">
                    Se creará una tarea de alta prioridad para {conflictContact.owner}.
                </p>
            </div>

            <div className="flex gap-3 justify-end">
                <button 
                    onClick={() => {
                        setIsConflictModalOpen(false);
                        setConflictContact(null);
                        setConflictNote('');
                    }}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                >
                    Cancelar
                </button>
                <button 
                    onClick={handleConflictSubmit}
                    disabled={!conflictNote.trim()}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    <AlertTriangle size={16} />
                    Notificar Conflicto
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Creation Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmit={handleTaskSubmit}
        contact={selectedContact || undefined}
        currentUser={currentUser}
        team={team}
      />
      {/* Bulk Assign Modal */}
      {isBulkAssignModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-900">Reasignar Leads</h3>
              <button onClick={() => setIsBulkAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">Selecciona un agente para asignar los {selectedIds.size} leads seleccionados.</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {team.filter(m => m.role === 'Sales').map(agent => (
                <button
                  key={agent.id}
                  onClick={() => {
                    executeBulkAssign(agent.name);
                    setIsBulkAssignModalOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-blue-50 hover:border-blue-200 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                      {agent.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-slate-900">{agent.name}</p>
                      <p className="text-xs text-slate-500">{getAgentWorkload(agent.name)} leads activos</p>
                    </div>
                  </div>
                  <ChevronDown className="text-slate-300 group-hover:text-blue-600 -rotate-90" size={16} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Unassign Confirm Modal */}
      {isBulkUnassignModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <div className="p-2 bg-red-100 rounded-full">
                <X size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">¿Desasignar Leads?</h3>
            </div>

            <p className="text-sm text-slate-600 mb-6">
              Estás a punto de liberar <strong>{selectedIds.size} leads</strong>. Pasarán a estado "Sin asignar" y cualquiera podrá tomarlos.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setIsBulkUnassignModalOpen(false)}
                className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  executeBulkAssign('Unassigned');
                  setIsBulkUnassignModalOpen(false);
                }}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
