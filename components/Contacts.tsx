
import React, { useState } from 'react';
import { Contact, LeadStatus, CurrentUser, Source, TeamMember, Task } from '../types';
import { Filter, Search, User, X, CheckCircle, Tag, Clock, ArrowLeft, Plus, Users, CheckSquare, Square, ChevronDown, Pencil, MessageSquare, Phone, Calendar as CalendarIcon, Paperclip, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';

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
}

export const Contacts: React.FC<ContactsProps> = ({ currentUser, contacts, setContacts, onAddContact, onNotify, team = [], onAddTask, onNavigateToChat }) => {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: '10:00',
    description: '',
    priority: 'Normal' as 'High' | 'Normal' | 'Low',
    assignedTo: currentUser?.name || 'Me',
    reminder: {
      enabled: true,
      timeValue: 30,
      timeUnit: 'minutes' as 'minutes' | 'hours' | 'days'
    }
  });
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [isBulkUnassignModalOpen, setIsBulkUnassignModalOpen] = useState(false);
  const [contactAppointments, setContactAppointments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !selectedContact) return;
    const file = e.target.files[0];
    setIsUploading(true);

    try {
      const { api } = await import('../src/services/api');
      const res = await api.files.upload(file, selectedContact.id);
      
      if (res.success && res.file) {
        // Update local state
        const updatedContact = {
            ...selectedContact,
            documents: [...(selectedContact.documents || []), res.file]
        };
        setSelectedContact(updatedContact);
        setContacts(contacts.map(c => c.id === selectedContact.id ? updatedContact : c));
        if (onNotify) onNotify('Archivo Subido', 'El documento se ha guardado correctamente.', 'success');
      }
    } catch (error) {
      console.error('Upload failed', error);
      if (onNotify) onNotify('Error', 'No se pudo subir el archivo.', 'error');
    } finally {
        setIsUploading(false);
    }
  };

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

  const isManager = (currentUser?.role as string) === 'MANAGER' || (currentUser?.role as string) === 'Admin';

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

  const handleEditClick = (contact: Contact) => {
    setNewContact({
      name: contact.name,
      company: contact.company,
      email: contact.email,
      phone: contact.phone,
      value: contact.value,
      owner: contact.owner || 'Unassigned'
    });
    setEditingContactId(contact.id);
    setIsModalOpen(true);
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
    setNewTask({
      title: '',
      dueDate: new Date().toISOString().split('T')[0],
      dueTime: '10:00',
      description: '',
      priority: 'Normal',
      assignedTo: currentUser?.name || 'Me',
      reminder: {
        enabled: true,
        timeValue: 30,
        timeUnit: 'minutes'
      }
    });
    setIsTaskModalOpen(true);
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact || !newTask.title) return;

    try {
      const { api } = await import('../src/services/api');
      const taskData: any = {
        title: newTask.title,
        type: 'Task',
        dueDate: newTask.dueDate,
        dueTime: newTask.dueTime,
        description: newTask.description,
        status: 'Pending',
        priority: newTask.priority,
        assignedTo: newTask.assignedTo,
        relatedContactName: selectedContact.name,
        relatedContactId: selectedContact.id,
        reminder: newTask.reminder
      };

      const res = await api.tasks.create(taskData);

      if (onAddTask) {
        const createdTask: Task = {
          ...taskData,
          id: res.id || Date.now().toString(),
        };
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
              onClick={() => setIsModalOpen(true)}
              className="flex-1 md:flex-none bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 whitespace-nowrap flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Agregar
            </button>
          </div>
        </div>

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
        <div className="absolute inset-y-0 right-0 w-full md:w-96 bg-white shadow-2xl border-l border-slate-200 transform transition-transform duration-300 ease-in-out z-[60] flex flex-col">
          <div className="p-6 border-b border-slate-100 flex justify-between items-start">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedContact(null)} className="md:hidden text-slate-600 mr-2">
                <ArrowLeft />
              </button>
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  {selectedContact.name}
                  <button onClick={() => handleEditClick(selectedContact)} className="text-slate-400 hover:text-blue-600 transition-colors p-1 rounded-full hover:bg-slate-100" title="Editar Contacto">
                    <Pencil size={16} />
                  </button>
                </h3>
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
            <div className="flex gap-2">
              <button
                onClick={() => onNavigateToChat && onNavigateToChat(selectedContact.id)}
                className={`flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 shadow-sm flex items-center justify-center gap-2 ${!onNavigateToChat ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!onNavigateToChat}
              >
                <MessageSquare size={18} /> Ir al Chat
              </button>
              <button className="flex-1 bg-white border border-slate-300 text-slate-700 py-2 rounded-lg font-medium hover:bg-slate-50 flex items-center justify-center gap-2">
                <Phone size={18} /> Llamar
              </button>
            </div>

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
                <User size={16} className="text-blue-600" /> Info Contacto
              </h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex justify-between border-b border-slate-50 pb-1"><span>Email:</span> <span className="text-slate-900 truncate max-w-[200px]">{selectedContact.email}</span></li>
                <li className="flex justify-between border-b border-slate-50 pb-1"><span>Tel:</span> <span className="text-slate-900">{selectedContact.phone}</span></li>
                <li className="flex justify-between border-b border-slate-50 pb-1"><span>Dueño:</span> <span className="text-slate-900">{selectedContact.owner === 'Unassigned' ? 'Sin asignar' : selectedContact.owner}</span></li>
              </ul>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Paperclip size={16} className="text-blue-600" /> Documentos
                </h4>
                <label className={`cursor-pointer text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 flex items-center gap-1 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  {isUploading ? 'Subiendo...' : '+ Subir'}
                  <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" />
                </label>
              </div>
              
              {selectedContact.documents && selectedContact.documents.length > 0 ? (
                <ul className="space-y-2">
                  {selectedContact.documents.map((doc, idx) => (
                    <li key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText size={14} className="text-slate-400 flex-shrink-0" />
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate">
                          {doc.name}
                        </a>
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 italic pl-6">No hay documentos adjuntos.</p>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Clock size={16} className="text-blue-600" /> Actividad
              </h4>
              <div className="relative pl-4 border-l-2 border-slate-200 space-y-4">

                {/* Appointments Integration */}
                {contactAppointments.length > 0 && contactAppointments.map(apt => (
                  <div key={`apt-${apt.id}`} className="relative bg-white p-3 rounded-lg border border-blue-200 shadow-sm">
                    <span className="absolute -left-[23px] top-3 w-3 h-3 rounded-full bg-blue-500 border-2 border-white"></span>
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-xs text-blue-700 font-bold flex items-center gap-1">
                        <CalendarIcon size={10} /> Cita Programada
                      </p>
                      <span className="text-xs text-slate-400">
                        {new Date(apt.start).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-900">{apt.title}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {new Date(apt.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                      {new Date(apt.end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                    {apt.location && <p className="text-xs text-slate-500 mt-1 italic">📍 {apt.location}</p>}
                  </div>
                ))}

                {selectedContact.notes && selectedContact.notes.length > 0 && selectedContact.notes.map(note => (
                  <div key={note.id} className="relative bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                    <span className="absolute -left-[23px] top-3 w-3 h-3 rounded-full bg-yellow-400 border-2 border-white"></span>
                    <p className="text-xs text-yellow-800 mb-1">{note.author} • {note.createdAt}</p>
                    <p className="text-sm text-slate-800 italic">"{note.content}"</p>
                  </div>
                ))}

                {selectedContact.history.length > 0 ? selectedContact.history.map((h) => (
                  <div key={h.id} className="relative">
                    <span className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white ${h.sender === 'agent' ? 'bg-blue-500' : 'bg-green-500'}`}></span>
                    <p className="text-xs text-slate-500 mb-0.5">{h.timestamp} • {h.channel}</p>
                    <p className="text-sm text-slate-800 truncate">{h.content}</p>
                  </div>
                )) : <p className="text-xs text-slate-400">Sin historial.</p>}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <button onClick={handleCreateTaskClick} className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700">
              Crear Tarea
            </button>
          </div>
        </div>
      )}

      {/* Task Creation Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-900">Nueva Tarea de Seguimiento</h3>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleTaskSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
                <input
                  required
                  autoFocus
                  type="text"
                  value={newTask.title}
                  onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ej. Llamar para seguimiento"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                  <div className="relative">
                      <input
                          type="text"
                          readOnly
                          value={newTask.dueDate ? format(parseISO(newTask.dueDate), 'dd/MM/yyyy') : ''}
                          className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <input
                          required
                          type="date"
                          value={newTask.dueDate}
                          onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}
                          onClick={(e) => (e.target as any).showPicker && (e.target as any).showPicker()}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <CalendarIcon size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hora</label>
                  <input
                    required
                    type="time"
                    value={newTask.dueTime}
                    onChange={e => setNewTask({ ...newTask, dueTime: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prioridad</label>
                  <select
                    value={newTask.priority}
                    onChange={e => setNewTask({ ...newTask, priority: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Low">Baja</option>
                    <option value="Normal">Normal</option>
                    <option value="High">Alta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Asignar a</label>
                  <select
                    value={newTask.assignedTo}
                    onChange={e => setNewTask({ ...newTask, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value={currentUser?.name || 'Me'}>Mí (Actual)</option>
                    {team.map(member => (
                      <option key={member.id} value={member.name}>{member.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción (Opcional)</label>
                <textarea
                  value={newTask.description}
                  onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
                  placeholder="Detalles adicionales..."
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Clock size={16} className="text-blue-600" /> Recordatorio
                  </label>
                  <input
                    type="checkbox"
                    checked={newTask.reminder.enabled}
                    onChange={e => setNewTask({ ...newTask, reminder: { ...newTask.reminder, enabled: e.target.checked } })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </div>
                {newTask.reminder.enabled && (
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-slate-600">Avisar</span>
                    <input
                      type="number"
                      min="1"
                      value={newTask.reminder.timeValue}
                      onChange={e => setNewTask({ ...newTask, reminder: { ...newTask.reminder, timeValue: Number(e.target.value) } })}
                      className="w-16 px-2 py-1 bg-white border border-slate-300 rounded text-sm text-center"
                    />
                    <select
                      value={newTask.reminder.timeUnit}
                      onChange={e => setNewTask({ ...newTask, reminder: { ...newTask.reminder, timeUnit: e.target.value as any } })}
                      className="px-2 py-1 bg-white border border-slate-300 rounded text-sm"
                    >
                      <option value="minutes">Minutos antes</option>
                      <option value="hours">Horas antes</option>
                      <option value="days">Días antes</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700">
                  Guardar Tarea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
