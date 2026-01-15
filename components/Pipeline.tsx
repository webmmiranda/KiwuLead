
import React, { useState, useEffect } from 'react';
import { Contacts } from './Contacts';
import { Contact, LeadStatus, CurrentUser, Product, Source, TeamMember, AiConfig, PipelineColumn, Task } from '../types';
import { Phone, Mail, AlertCircle, UserPlus, X, Filter, Trash2, StickyNote, Loader2, ChevronRight, Plus, ArrowRight, LayoutList, Kanban, ChevronDown, Search, CheckCircle, AlertTriangle } from 'lucide-react';
import { ContactDetailsPanel } from './ContactDetailsPanel';
import { TaskModal } from './TaskModal';
import { formatCurrency } from '../src/utils/currency';

interface DealCardProps {
  contact: Contact;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onClaim: (id: string) => void;
  onClick: (contact: Contact) => void;
  companyCurrency: 'USD' | 'MXN' | 'CRC' | 'COP';
  onOpenMoveMenu: (contactId: string) => void;
}

const DealCard: React.FC<DealCardProps> = ({ contact, onDragStart, onClaim, onClick, companyCurrency, onOpenMoveMenu }) => {
  // Logic to determine if a deal is "stale" (inactive for too long)
  const isStale = contact.lastActivity.includes('días') && parseInt(contact.lastActivity) > 3;
  const isUnassigned = contact.owner === 'Sin asignar' || contact.owner === 'Unassigned';

  // Calculate internal notes count
  const internalNotesCount = contact.notes.length + contact.history.filter(h => h.type === 'note' || h.channel === 'internal').length;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, contact.id)}
      onClick={() => onClick(contact)}
      className={`bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-all cursor-grab active:cursor-grabbing mb-3 group relative ${isStale ? 'border-l-4 border-l-red-400' : 'border-slate-200'} active:scale-95`}
    >
      {/* Health Indicator & Stale Warning */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5">
        {!contact.bant && (
          <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" title="BANT pendiente" />
        )}
        {isStale && (
          <div className="text-red-400" title="Sin actividad reciente (> 3 días)">
            <AlertCircle size={14} />
          </div>
        )}
      </div>

      <div className="flex justify-between items-start mb-2 pr-4">
        <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full font-medium truncate max-w-[120px]">
          {contact.company}
        </span>
        {internalNotesCount > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100" title={`${internalNotesCount} Notas internas`}>
            <StickyNote size={10} /> {internalNotesCount}
          </div>
        )}
      </div>

      <h4 className="font-semibold text-slate-800 truncate">{contact.name}</h4>
      <p className="text-slate-500 text-sm mt-1 mb-3">{formatCurrency(contact.value, companyCurrency || 'USD')}</p>

      {/* Action Area */}
      {isUnassigned ? (
        <button
          onClick={(e) => { e.stopPropagation(); onClaim(contact.id); }}
          className="w-full mt-2 mb-2 bg-blue-50 text-blue-700 text-xs py-1.5 rounded border border-blue-100 font-bold hover:bg-blue-100 flex items-center justify-center gap-1 transition-colors"
        >
          <UserPlus size={12} /> Asignarme
        </button>
      ) : (
        <div className="flex justify-between items-center text-slate-400 text-xs mt-3 border-t border-slate-100 pt-3 relative">
          <div className="flex space-x-2">
            <Phone size={14} className="hover:text-blue-600 cursor-pointer" />
            <Mail size={14} className="hover:text-blue-600 cursor-pointer" />
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`${contact.probability > 80 ? 'text-green-600 font-bold' : ''}`}>{contact.probability}% prob.</span>
            
            {/* Mobile/Quick Move Button */}
            <div className="relative">
                <button 
                    onClick={(e) => { e.stopPropagation(); onOpenMoveMenu(contact.id); }}
                    className="p-4 hover:bg-slate-100 rounded-full text-slate-500 hover:text-blue-600 transition-colors"
                    title="Mover etapa"
                >
                    <ArrowRight size={24} />
                </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-2 text-[10px] text-slate-400 flex justify-between">
        <span>{contact.owner === 'Unassigned' || contact.owner === 'Sin asignar' ? 'Libre' : contact.owner.split(' ')[0]}</span>
        <span>{contact.lastActivity}</span>
      </div>
    </div>
  );
};

interface PipelineProps {
  currentUser?: CurrentUser;
  contacts: Contact[];
  setContacts?: (contacts: Contact[]) => void;
  onStatusChange: (contactId: string, newStatus: string, lostReason?: string) => void;
  onNavigateToChat: (contactId: string) => void;
  products?: Product[];
  onNotify?: (title: string, msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  onAddDeal?: (contact: Contact) => void;
  onAssign?: (contactId: string, newOwner: string) => void;
  onUpdateContact?: (contactId: string, updates: Partial<Contact>) => void;
  onAddTask?: (task: Task) => void;
  team?: TeamMember[];
  aiConfig?: AiConfig;
  companyCurrency?: 'USD' | 'MXN' | 'CRC' | 'COP';
}

export const Pipeline: React.FC<PipelineProps> = ({ currentUser, contacts, setContacts, onStatusChange, onNavigateToChat, products = [], onNotify, onAddDeal, onAssign, onUpdateContact, onAddTask, team = [], aiConfig, companyCurrency = 'USD' }) => {
  const [pipelineColumns, setPipelineColumns] = useState<PipelineColumn[]>([]);
  const [loadingPipeline, setLoadingPipeline] = useState(true);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  
  // Mobile View State
  const [selectedMobileStage, setSelectedMobileStage] = useState<string>('ALL');

  useEffect(() => {
    const fetchPipeline = async () => {
      try {
        const { api } = await import('../src/services/api');
        const data = await api.pipeline.list();
        // Map API data to PipelineColumn format
        let cols: PipelineColumn[] = data.map((s: any) => ({
            id: s.keyName, // Use keyName as ID for compatibility with Contact.status
            title: s.name,
            color: s.color,
            probability: Math.max(0, Math.min(100, Number(s.probability ?? 0)))
        }));

        // Enforce "Nuevo" column (mapped to 'lead' status for compatibility)
        const leadColIndex = cols.findIndex(c => c.id === 'lead');
        
        if (leadColIndex >= 0) {
            // If exists, rename it to 'Nuevo' to ensure UI consistency
            cols[leadColIndex].title = 'Nuevo';
        } else {
            // If not exists, prepend it
            const newCol: PipelineColumn = {
                id: 'lead', // Matches LeadStatus.NEW
                title: 'Nuevo',
                color: 'border-blue-500',
                probability: 5
            };
            cols = [newCol, ...cols];
        }
        
        // Also handle the 'New' ID if it was created by my previous edit and saved? 
        // No, 'New' was only client-side hardcoded in previous turn, not persisted to DB stages.
        // But if I created a contact with 'New' status in the last few minutes, it might be orphaned.
        // I should probably map 'New' status to 'lead' column too, just in case?
        // Or just let it be. The user likely hasn't created many contacts in 5 mins.
        
        setPipelineColumns(cols);
        
        // Default to first stage on mobile if not set
        if (cols.length > 0) {
            setSelectedMobileStage(cols[0].id);
        }
      } catch (error) {
        console.error("Failed to load pipeline stages", error);
        if (onNotify) onNotify('Error', 'No se pudieron cargar las etapas del pipeline.', 'error');
      } finally {
        setLoadingPipeline(false);
      }
    };
    fetchPipeline();
  }, []);

  // Check if AI is configured (either via settings or env)
  // const hasAiAccess = !!(aiConfig?.apiKey || process.env.API_KEY);

  // Detailed View State
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactAppointments, setContactAppointments] = useState<any[]>([]);

  useEffect(() => {
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

  // New Deal Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newDeal, setNewDeal] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    value: 0,
    owner: currentUser?.name || 'Unassigned',
    productInterest: ''
  });

  // Conflict Resolution State
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [conflictContact, setConflictContact] = useState<Contact | null>(null);
  const [conflictNote, setConflictNote] = useState('');

  // AI Analysis State
  const [leadMatches, setLeadMatches] = useState<Contact[]>([]);

  // Search and Filter State
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    status: 'All',
    source: 'All',
    owner: 'All'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});

  // Reset visible counts when search changes to show all matches
  useEffect(() => {
    setVisibleCounts({});
  }, [searchTerm, activeFilters]);

  const handleLoadMore = (columnId: string) => {
    setVisibleCounts(prev => ({
      ...prev,
      [columnId]: (prev[columnId] || 10) + 10
    }));
  };

  const clearFilters = () => {
    setActiveFilters({ status: 'All', source: 'All', owner: 'All' });
    setSearchTerm('');
  };

  const hasActiveFilters = activeFilters.status !== 'All' || activeFilters.source !== 'All' || activeFilters.owner !== 'All' || searchTerm !== '';

  // Logic: 
  // 1. If Manager: Show All OR filter by selected Agent.
  // 2. If Sales Rep: Show ONLY their deals AND unassigned (to claim).
  const displayedContacts = contacts.filter(c => {
    // Global Search Filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        c.name.toLowerCase().includes(term) || 
        c.company.toLowerCase().includes(term) ||
        (c.email && c.email.toLowerCase().includes(term));
      
      if (!matchesSearch) return false;
    }

    // Status Filter
    if (activeFilters.status !== 'All' && c.status !== activeFilters.status) return false;

    // Source Filter
    if (activeFilters.source !== 'All' && c.source !== activeFilters.source) return false;

    // Owner Filter
    const effectiveOwnerFilter = activeFilters.owner;

    if (currentUser?.role === 'MANAGER') {
      if (effectiveOwnerFilter === 'All') return true;
      if (effectiveOwnerFilter === 'Unassigned') return c.owner === 'Sin asignar' || c.owner === 'Unassigned';
      return c.owner === effectiveOwnerFilter;
    } else {
      // Sales Rep View
      const isMine = c.owner === currentUser?.name;
      const isUnassigned = c.owner === 'Sin asignar' || c.owner === 'Unassigned';
      
      if (!isMine && !isUnassigned) return false;
      
      if (effectiveOwnerFilter !== 'All') {
         if (effectiveOwnerFilter === 'Unassigned') return isUnassigned;
         if (effectiveOwnerFilter === currentUser?.name) return isMine;
         return false;
      }
      return true;
    }
  });

  useEffect(() => {
    const qName = newDeal.name.trim().toLowerCase();
    const qEmail = newDeal.email.trim().toLowerCase();
    if (!qName && !qEmail) {
      setLeadMatches([]);
      return;
    }
    const matches = contacts.filter(c =>
      (qEmail && c.email && c.email.toLowerCase() === qEmail) ||
      (qName && c.name.toLowerCase().includes(qName))
    ).slice(0, 5);
    setLeadMatches(matches);
  }, [newDeal.name, newDeal.email, contacts]);

  // State for Move Stage Modal (Mobile/Desktop)
  const [moveMenuContactId, setMoveMenuContactId] = useState<string | null>(null);
  
  const handleOpenMoveMenu = (contactId: string) => {
    setMoveMenuContactId(contactId);
  };

  // State for Lost Reason Modal
  const [isLostModalOpen, setIsLostModalOpen] = useState(false);
  const [pendingLostContactId, setPendingLostContactId] = useState<string | null>(null);
  const [lostReason, setLostReason] = useState('Precio demasiado alto');

  // State for Won Deal Modal
  const [isWonModalOpen, setIsWonModalOpen] = useState(false);
  const [pendingWonContactId, setPendingWonContactId] = useState<string | null>(null);
  const [wonForm, setWonForm] = useState({
    products: [] as string[],
    finalPrice: 0,
    closingNotes: ''
  });

  const handleMoveDeal = (contactId: string, status: string) => {
    // Re-use logic for special statuses
    if (status === 'Lost') {
      setPendingLostContactId(contactId);
      setIsLostModalOpen(true);
      return;
    }
    if (status === 'Won') {
      const contact = contacts.find(c => c.id === contactId);
      if (contact) {
        setPendingWonContactId(contactId);
        setWonForm({
          products: contact.productInterests || [],
          finalPrice: contact.value,
          closingNotes: ''
        });
        setIsWonModalOpen(true);
      }
      return;
    }
    onStatusChange(contactId, status);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('contactId', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const contactId = e.dataTransfer.getData('contactId');

    // If moving to LOST, trigger modal instead of immediate update
    if (status === 'Lost') {
      setPendingLostContactId(contactId);
      setIsLostModalOpen(true);
      return;
    }

    // If moving to WON, trigger modal to capture final details
    if (status === 'Won') {
      const contact = contacts.find(c => c.id === contactId);
      if (contact) {
        setPendingWonContactId(contactId);
        setWonForm({
          products: contact.productInterests || [],
          finalPrice: contact.value,
          closingNotes: ''
        });
        setIsWonModalOpen(true);
      }
      return;
    }

    // Delegate validation and update to parent
    onStatusChange(contactId, status);
  };

  const confirmLostDeal = () => {
    if (pendingLostContactId) {
      onStatusChange(pendingLostContactId, 'Lost', lostReason);
      setIsLostModalOpen(false);
      setPendingLostContactId(null);
    }
  };

  const confirmWonDeal = () => {
    if (pendingWonContactId) {
      const closingData = {
        wonData: {
          ...wonForm,
          closedAt: new Date().toLocaleDateString()
        }
      };

      // Update contact with closing data and change status
      onUpdateContact?.(pendingWonContactId, closingData);
      onStatusChange(pendingWonContactId, 'Won');

      setIsWonModalOpen(false);
      setPendingWonContactId(null);

      if (onNotify) onNotify('¡Felicidades!', 'Trato cerrado con éxito.', 'success');
    }
  };

  const handleClaimDeal = (id: string) => {
    if (!currentUser) return;
    if (confirm(`¿Asignarte este lead a ti (${currentUser.name})?`)) {
      // Previously this only showed a notification. Now it updates state.
      if (onAssign) {
        onAssign(id, currentUser.name);
      }
    }
  };

  const handleOpenContact = (c: Contact) => {
    setSelectedContact(c);
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
        setNewDeal({ 
            name: '', 
            company: '', 
            email: '', 
            phone: '', 
            value: 0, 
            owner: currentUser?.name || 'Unassigned', 
            productInterest: '' 
        });
    } catch (error) {
        console.error(error);
        if (onNotify) onNotify('Error', 'No se pudo registrar el conflicto.', 'error');
    }
  };

  const handleCreateDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddDeal) return;

    const duplicate =
      contacts.find(c => !!newDeal.email && c.email?.toLowerCase() === newDeal.email.toLowerCase()) ||
      contacts.find(c => c.name.toLowerCase() === newDeal.name.toLowerCase() && (!!newDeal.phone ? c.phone === newDeal.phone : true));
    
    if (duplicate) {
      if (duplicate.owner === currentUser?.name || duplicate.owner === 'Unassigned' || duplicate.owner === 'Sin asignar') {
          if (onNotify) onNotify('Ya Gestionas este Lead', 'Abriendo ficha existente...', 'info');
          setSelectedContact(duplicate);
          setIsModalOpen(false);
          return;
      } else {
          // Conflict found with another user
          setConflictContact(duplicate);
          setIsConflictModalOpen(true);
          setIsModalOpen(false);
          return;
      }
    }

    const contact: Contact = {
      id: Date.now().toString(),
      name: newDeal.name,
      company: newDeal.company,
      email: newDeal.email,
      phone: newDeal.phone,
       value: Number(newDeal.value),
       status: LeadStatus.NEW, // 'lead', matches the fixed column ID
       source: Source.REFERRAL, // Default for manual creation
      owner: newDeal.owner,
      productInterests: newDeal.productInterest ? [newDeal.productInterest] : [],
      createdAt: new Date().toISOString(),
      lastActivity: 'Ahora',
      tags: [],
      probability: pipelineColumns.find(c => c.id === LeadStatus.NEW)?.probability || 5, // Default start probability
      notes: [],
      history: []
    };

    onAddDeal(contact);
    setIsModalOpen(false);
    setNewDeal({ 
      name: '', 
      company: '', 
      email: '', 
      phone: '', 
      value: 0, 
      owner: currentUser?.name || 'Unassigned', 
      productInterest: '' 
    });
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
    <div className="h-full flex flex-col p-4 md:p-6 overflow-hidden relative">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Leads</h2>
          <p className="text-slate-500 text-sm">
            Mostrando {displayedContacts.length} de {contacts.length} registros
          </p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto relative">
            {/* View Mode Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-lg mr-2">
              <button onClick={() => setViewMode('board')} className={`p-2 rounded-md transition-colors ${viewMode === 'board' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                <Kanban size={18} />
              </button>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                <LayoutList size={18} />
              </button>
          </div>

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
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Etapa</label>
            <select
              value={activeFilters.status}
              onChange={(e) => setActiveFilters({ ...activeFilters, status: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="All">Todas las etapas</option>
              {pipelineColumns.map(col => <option key={col.id} value={col.id}>{col.title}</option>)}
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
          {currentUser?.role === 'MANAGER' && (
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

      {/* Mobile Stage Selector (Only for Board View) */}
      {viewMode === 'board' && (
        <div className="md:hidden w-full overflow-x-auto pb-2 -mx-1 px-1 mb-4">
            <div className="flex gap-2">
              {pipelineColumns.map(col => (
                  <button
                      key={col.id}
                      onClick={() => setSelectedMobileStage(col.id)}
                      className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                          selectedMobileStage === col.id 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                  >
                      {col.title}
                  </button>
              ))}
            </div>
        </div>
      )}

      {/* 
        Responsive Change: 
        - Mobile: Show only selected stage (filtered)
        - Desktop: Show all stages horizontally
      */}
      {viewMode === 'list' ? (
        <Contacts 
            contacts={displayedContacts}
            setContacts={setContacts || (() => {})}
            onAddContact={onAddDeal}
            currentUser={currentUser}
            onNotify={onNotify}
            team={team}
            products={products}
            onAddTask={onAddTask}
            onNavigateToChat={onNavigateToChat}
            enableHeader={false}
            pipelineColumns={pipelineColumns}
            onMoveContact={handleMoveDeal}
        />
      ) : (
      <div className="flex-1 overflow-y-auto md:overflow-y-hidden md:overflow-x-auto pb-4">
        {loadingPipeline ? (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
        ) : (
        <div className="flex flex-col md:flex-row h-full md:min-w-max gap-4 md:space-x-4">
          {pipelineColumns
            .map((col) => {
            const deals = displayedContacts.filter((c) => c.status === col.id || (col.id === 'lead' && c.status === 'New'));
            const totalValue = deals.reduce((sum, c) => sum + c.value, 0);
            const weightedValue = deals.reduce((sum, c) => sum + (c.value * (c.probability / 100)), 0);
            
            // Mobile visibility logic
            const isVisibleOnMobile = selectedMobileStage === col.id;
            const mobileHiddenClass = !isVisibleOnMobile ? 'hidden md:flex' : 'flex';

            // Pagination Logic
            const limit = visibleCounts[col.id] || 10;
            const visibleDeals = deals.slice(0, limit);
            const remaining = deals.length - visibleDeals.length;

            return (
              <div
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`w-full md:w-80 flex-col rounded-xl bg-slate-50/50 transition-colors hover:bg-slate-100/50 h-full ${mobileHiddenClass}`}
              >
                <div className={`p-4 border-t-4 ${col.color} bg-slate-100 rounded-t-xl sticky top-0 z-10 md:static shadow-sm md:shadow-none`}>
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                      {col.title} 
                      <span className="text-xs font-normal text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full">{col.probability || 0}%</span>
                    </h3>
                    <span className="bg-white text-slate-500 px-2 py-0.5 rounded-md text-xs font-bold border border-slate-200" title={`Mostrando ${visibleDeals.length} de ${deals.length}`}>
                      {visibleDeals.length} / {deals.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-xs text-slate-500 font-medium">
                      Total: <span className="text-slate-700">{formatCurrency(totalValue, companyCurrency)}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Ponderado: <span className="text-slate-600">{formatCurrency(Math.round(weightedValue), companyCurrency)}</span>
                    </p>
                  </div>
                </div>

                {/* On mobile we want height to grow, on desktop we want scroll */}
                <div className="p-3 flex-1 overflow-y-auto custom-scrollbar min-h-[200px]">
                  {deals.length > 0 ? (
                    <>
                      {visibleDeals.map((contact) => (
                        <DealCard
                          key={contact.id}
                          contact={contact}
                          onDragStart={handleDragStart}
                          onClaim={handleClaimDeal}
                          onClick={handleOpenContact}
                          companyCurrency={companyCurrency}
                          onOpenMoveMenu={handleOpenMoveMenu}
                        />
                      ))}
                      
                      {remaining > 0 && (
                        <button 
                          onClick={() => handleLoadMore(col.id)}
                          className="w-full py-2 bg-white border border-slate-200 text-slate-500 text-xs font-bold rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm mb-2"
                        >
                          Ver {remaining} más...
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-sm">
                      Vacío
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* LOST DROP ZONE - Modified for mobile visibility */}
          <div
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'Lost')}
            className="hidden md:flex w-full md:w-24 flex-row md:flex-col h-24 md:h-full rounded-xl bg-red-50 border border-dashed border-red-200 opacity-80 hover:opacity-100 transition-all hover:bg-red-100 items-center justify-center group flex-shrink-0"
            title="Arrastra aquí para marcar como Perdido"
          >
            <div className="flex flex-row md:flex-col items-center justify-center text-red-400 font-medium group-hover:text-red-600 transition-colors gap-2">
              <Trash2 size={24} className="md:mb-4" />
              <span className="text-xs font-bold uppercase tracking-wide md:vertical-text md:writing-mode-vertical">Marcar Perdido</span>
            </div>
          </div>
        </div>
        )}
      </div>
      )}

      {/* --- DEAL DETAILS SLIDE-OVER --- */}
      {selectedContact && (
        <ContactDetailsPanel
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
          onUpdateContact={onUpdateContact}
          onNavigateToChat={onNavigateToChat}
          onOpenWhatsApp={() => {
            if (!selectedContact?.phone) return;
            const phone = selectedContact.phone.replace(/\D/g, '');
            window.open(`https://wa.me/${phone}`, '_blank');
          }}
          onCreateTask={() => setIsTaskModalOpen(true)}
          products={products}
          companyCurrency={companyCurrency}
          hasAiAccess={!!aiConfig}
                    aiConfig={aiConfig}
                    onNotify={onNotify}
                    contactAppointments={contactAppointments}
                />
            )}

      {/* NEW DEAL MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-900">Crear Nuevo Lead</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateDeal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Lead</label>
                <input
                  required
                  type="text"
                  value={newDeal.name}
                  onChange={e => setNewDeal({ ...newDeal, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ej. Roberto Gomez"
                />
                {leadMatches.length > 0 && (
                  <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-2">
                    <p className="text-xs text-slate-500 mb-1">Coincidencias existentes</p>
                    <ul className="space-y-1">
                      {leadMatches.map(m => (
                        <li key={m.id} className="flex items-center justify-between text-sm">
                          <span className="text-slate-700 truncate max-w-[60%]">{m.name} · {m.email}</span>
                          <button
                            type="button"
                            onClick={() => { setSelectedContact(m); setIsModalOpen(false); }}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            Abrir
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Empresa</label>
                <input
                  required
                  type="text"
                  value={newDeal.company}
                  onChange={e => setNewDeal({ ...newDeal, company: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ej. Tech Corp"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newDeal.email}
                    onChange={e => setNewDeal({ ...newDeal, email: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="email@..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={newDeal.phone}
                    onChange={e => setNewDeal({ ...newDeal, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="+52..."
                  />
                </div>
              </div>

              {/* Product Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Producto de Interés</label>
                <div className="relative">
                  <select
                    className="w-full pl-3 pr-10 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                    onChange={(e) => {
                      const prodId = e.target.value;
                      const prod = products.find(p => p.id === prodId);
                      if (prod) {
                         setNewDeal(prev => ({ ...prev, value: prod.price, productInterest: prod.name }));
                      } else {
                         setNewDeal(prev => ({ ...prev, productInterest: '' }));
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="">Seleccionar producto...</option>
                    {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} - ${p.price} {p.currency}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-2.5 text-slate-400 pointer-events-none">
                    <ChevronRight size={16} className="rotate-90" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valor Estimado ($)</label>
                <input
                  type="number"
                  value={newDeal.value}
                  onChange={e => setNewDeal({ ...newDeal, value: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Assign To (Manager Only) */}
              {currentUser?.role === 'MANAGER' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Asignar a</label>
                  <select
                    value={newDeal.owner}
                    onChange={e => setNewDeal({ ...newDeal, owner: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Unassigned">Sin Asignar</option>
                    {team.filter(m => m.role !== 'Support').map(m => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="pt-2">
                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
                  <Plus size={18} /> Crear Oportunidad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* CONFLICT MODAL */}
      {isConflictModalOpen && conflictContact && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200 border-2 border-red-100">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-full">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Conflicto de Lead Detectado</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Este lead ya existe y pertenece a <span className="font-bold text-slate-800">{conflictContact.owner}</span>.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg mb-4 border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-slate-700">{conflictContact.name}</span>
                <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{conflictContact.status}</span>
              </div>
              <p className="text-xs text-slate-500">{conflictContact.company}</p>
              <p className="text-xs text-slate-500">{conflictContact.email}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                ¿Por qué estás registrando este lead?
              </label>
              <textarea
                value={conflictNote}
                onChange={e => setConflictNote(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none h-24 resize-none"
                placeholder="Ej. El cliente me llamó directamente hoy..."
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Se enviará una notificación y tarea a {conflictContact.owner} para resolver la propiedad.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsConflictModalOpen(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConflictSubmit}
                disabled={!conflictNote.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reportar Conflicto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BANT Info Modal */}


      {/* Move Stage Modal */}
      {moveMenuContactId && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
          onClick={() => setMoveMenuContactId(null)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">Mover a Etapa</h3>
              <button onClick={() => setMoveMenuContactId(null)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {pipelineColumns.map((col) => (
                <button
                  key={col.id}
                  onClick={() => {
                    if (moveMenuContactId) {
                      handleMoveDeal(moveMenuContactId, col.id);
                      setMoveMenuContactId(null);
                    }
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: col.color }}
                    />
                    <span className="font-medium text-slate-700 group-hover:text-slate-900">{col.title}</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Won Deal Modal */}
      {isWonModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200">
            <div className="mb-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3 mx-auto text-green-600">
                <CheckCircle size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">¡Cerrar Venta con Éxito!</h3>
              <p className="text-slate-500 text-sm">Confirma los detalles finales de la transacción.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Productos / Servicios Adquiridos</label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  {products.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        const current = wonForm.products;
                        const updated = current.includes(p.name)
                          ? current.filter(i => i !== p.name)
                          : [...current, p.name];
                        setWonForm({ ...wonForm, products: updated });
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${wonForm.products.includes(p.name)
                        ? 'bg-green-600 text-white border-green-700 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-green-300'
                        }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
                {wonForm.products.length === 0 && (
                  <p className="text-[10px] text-red-500 mt-1">Debes seleccionar al menos un producto.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Precio Final de Venta</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      value={wonForm.finalPrice}
                      onChange={e => setWonForm({ ...wonForm, finalPrice: Number(e.target.value) })}
                      className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Incluye descuentos o cashback aquí.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Fecha de Cierre</label>
                  <input
                    type="text"
                    disabled
                    value={new Date().toLocaleDateString()}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Notas de Cierre / Cross-Sell</label>
                <textarea
                  value={wonForm.closingNotes}
                  onChange={e => setWonForm({ ...wonForm, closingNotes: e.target.value })}
                  rows={3}
                  placeholder="Detalla cualquier acuerdo especial, cashback otorgado o interés en futuros productos..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setIsWonModalOpen(false)}
                className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmWonDeal}
                disabled={wonForm.products.length === 0}
                className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-100 disabled:opacity-50 transition-all transform active:scale-95"
              >
                Confirmar Venta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lost Reason Modal */}
      {isLostModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
            <div className="mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3 mx-auto text-red-600">
                <X size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 text-center">Marcar como Perdido</h3>
              <p className="text-center text-slate-500 text-sm mt-1">¿Por qué no se cerró este trato?</p>
            </div>

            <div className="space-y-3 mb-6">
              {['Precio demasiado alto', 'Se fue con la competencia', 'Perdió interés / Ghosting', 'No calificado / Spam', 'Otro'].map((reason) => (
                <label key={reason} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${lostReason === reason ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input
                    type="radio"
                    name="lostReason"
                    value={reason}
                    checked={lostReason === reason}
                    onChange={(e) => setLostReason(e.target.value)}
                    className="w-4 h-4 text-red-600 border-slate-300 focus:ring-red-500"
                  />
                  <span className="ml-3 text-sm font-medium">{reason}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsLostModalOpen(false)}
                className="flex-1 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={confirmLostDeal}
                className="flex-1 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 shadow-sm"
              >
                Confirmar Pérdida
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
        contacts={contacts}
        currentUser={currentUser}
        team={team}
      />
    </div>
  );
};
