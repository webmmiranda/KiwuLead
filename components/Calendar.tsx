import React, { useState, useEffect } from 'react';
import {
    format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    addDays, isSameMonth, isSameDay, parseISO, startOfDay, addHours, subWeeks, addWeeks,
    eachDayOfInterval, isToday, getHours, setHours, setMinutes, isSameHour
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Appointment, Contact, TeamMember, CurrentUser, Product, Task } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, User, Plus, X, Filter, ExternalLink, RefreshCw, Trash2, AlertTriangle, Package, CheckSquare, Globe } from 'lucide-react';
import { TaskModal } from './TaskModal';
import { useIsMobile } from '../src/hooks/useMediaQuery';

interface CalendarProps {
    currentUser: CurrentUser;
    contacts: Contact[];
    team: TeamMember[];
    products: Product[];
    onNotify?: (title: string, msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
    onRefresh?: () => void;
    tasks: Task[];
}

export const Calendar: React.FC<CalendarProps> = ({ currentUser, contacts, team, onNotify, products, onRefresh, tasks = [] }) => {
    const isMobile = useIsMobile();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showHours, setShowHours] = useState(true);
    const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const [view, setView] = useState<'month' | 'week' | 'day'>('month');
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Task Modal State
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);

    // Filter State
    const [selectedUserId, setSelectedUserId] = useState<string>('ALL');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newAppointment, setNewAppointment] = useState<{
        title: string;
        contactId: string;
        date: string;
        startTime: string;
        endTime: string;
        location: string;
        description: string;
        assignedTo: string;
        productId: string;
    }>({
        title: '',
        contactId: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        startTime: '09:00',
        endTime: '10:00',
        location: '',
        description: '',
        assignedTo: currentUser.name,
        productId: ''
    });

    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isRescheduleMode, setIsRescheduleMode] = useState(false);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

    const [rescheduleForm, setRescheduleForm] = useState({
        date: '',
        startTime: '',
        endTime: ''
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [showContactDropdown, setShowContactDropdown] = useState(false);

    const filteredContacts = contacts.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.company.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isManager = currentUser.role === 'MANAGER';

    // Merge Appointments and Tasks
    const calendarEvents = [
        ...appointments.map(a => ({ ...a, eventType: 'appointment' as const })),
        ...tasks.filter(t => t.status !== 'Cancelled').map(t => {
            const dateStr = t.dueDate;
            const timeStr = t.dueTime || '09:00';
            const start = new Date(`${dateStr}T${timeStr}`);
            const end = addHours(start, 1);
            return {
                id: t.id,
                title: t.title,
                start,
                end,
                eventType: 'task' as const,
                originalTask: t,
                contactName: t.relatedContactName,
                location: '',
                description: t.description || '',
                contactId: t.relatedContactId || '',
                contactCompany: '',
                assignedTo: t.assignedTo,
                userName: t.assignedTo, // For compatibility
                productId: '',
                productName: ''
            };
        })
    ];

    useEffect(() => {
        fetchAppointments();
    }, [selectedUserId]); // Refetch when filter changes

    const fetchAppointments = async () => {
        setIsLoading(true);
        try {
            const { api } = await import('../src/services/api');

            const filters: any = {};
            if (selectedUserId !== 'ALL') {
                // If selectedUserId is a name (from frontend state init), we might need to handle that, 
                // but API expects ID. Let's try to map name to ID if needed or rely on ID.
                // For now assume selectedUserId is ID.
                // Exception: If 'ALL', we send nothing.

                // However, my previous logic in App.tsx used Names for assignment often.
                // Let's try to find the ID from the team array if it's a name, or pass as is if numeric.
                const user = team.find(t => t.id === selectedUserId || t.name === selectedUserId);
                if (user) {
                    filters.userId = user.id;
                } else if (isManager && selectedUserId === 'ALL') {
                    // No filter
                } else {
                    // Fallback to current user if not manager
                    if (!isManager) {
                        // Try to find current user ID
                        const me = team.find(t => t.name === currentUser.name);
                        if (me) filters.userId = me.id;
                    }
                }
            }

            const data = await api.appointments.list(filters);
            // Parse dates
            const parsed = data.map(a => ({
                ...a,
                start: new Date(a.start),
                end: new Date(a.end)
            }));
            setAppointments(parsed);
        } catch (error) {
            console.error(error);
            if (onNotify) onNotify('Error', 'No se pudieron cargar las citas', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrev = () => {
        if (view === 'month') setCurrentDate(subMonths(currentDate, 1));
        else if (view === 'week') {
            if (isMobile) setCurrentDate(addDays(currentDate, -3));
            else setCurrentDate(subWeeks(currentDate, 1));
        }
        else setCurrentDate(addDays(currentDate, -1));
    };

    const handleNext = () => {
        if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
        else if (view === 'week') {
            if (isMobile) setCurrentDate(addDays(currentDate, 3));
            else setCurrentDate(addWeeks(currentDate, 1));
        }
        else setCurrentDate(addDays(currentDate, 1));
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > 50;
        const isRightSwipe = distance < -50;
        if (isLeftSwipe) handleNext();
        if (isRightSwipe) handlePrev();
        setTouchStart(null);
        setTouchEnd(null);
    };

    const handleToday = () => setCurrentDate(new Date());

    const handleSaveAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { api } = await import('../src/services/api');

            // Parse start and end times
            const startDateTime = new Date(`${newAppointment.date}T${newAppointment.startTime}:00`);
            const endDateTime = new Date(`${newAppointment.date}T${newAppointment.endTime}:00`);

            // Validation: Prevent past scheduling
            if (startDateTime < new Date()) {
                if (onNotify) onNotify('Aviso', 'No se pueden agendar citas en el pasado', 'warning');
                return;
            }

            const selectedProduct = products.find(p => p.id === newAppointment.productId);
            const selectedContact = contacts.find(c => c.id === newAppointment.contactId);

            const payload = {
                title: newAppointment.title,
                contactId: newAppointment.contactId,
                contactName: selectedContact?.name,
                contactCompany: selectedContact?.company,
                start: startDateTime, // Fixed: Pass Date object as expected by create() type
                end: endDateTime,
                location: newAppointment.location,
                description: newAppointment.description,
                assignedTo: newAppointment.assignedTo,
                productId: newAppointment.productId,
                productName: selectedProduct?.name
            };

            // The API create function expects Partial<Appointment> where start/end are Date objects
            // But internally it converts to string for JSON. Let's ensure types match.
            await api.appointments.create({
                ...payload,
                // Force cast if needed or ensure api.ts handles Date -> ISO string
            } as any);

            if (onNotify) onNotify('Éxito', 'Cita agendada correctamente', 'success');
            setIsModalOpen(false);
            fetchAppointments();
            if (onRefresh) onRefresh();

            // Reset form
            setNewAppointment({
                title: '',
                contactId: '',
                date: format(new Date(), 'yyyy-MM-dd'),
                startTime: '09:00',
                endTime: '10:00',
                location: '',
                description: '',
                assignedTo: currentUser.name,
                productId: ''
            });

        } catch (error) {
            console.error(error);
            if (onNotify) onNotify('Error', 'No se pudo agendar la cita', 'error');
        }
    };

    const handleAppointmentClick = (apt: Appointment) => {
        // Enrich with contact info if missing
        let enhancedApt = { ...apt };
        if (!enhancedApt.contactName && enhancedApt.contactId) {
            const contact = contacts.find(c => c.id === enhancedApt.contactId);
            if (contact) {
                enhancedApt.contactName = contact.name;
                enhancedApt.contactCompany = contact.company;
            }
        }

        setSelectedAppointment(enhancedApt);
        setRescheduleForm({
            date: format(apt.start, 'yyyy-MM-dd'),
            startTime: format(apt.start, 'HH:mm'),
            endTime: format(apt.end, 'HH:mm')
        });
        setIsDetailModalOpen(true);
        setIsRescheduleMode(false);
    };

    const handleReschedule = async () => {
        if (!selectedAppointment) return;
        try {
            const { api } = await import('../src/services/api');

            const startDateTime = new Date(`${rescheduleForm.date}T${rescheduleForm.startTime}:00`);
            const endDateTime = new Date(`${rescheduleForm.date}T${rescheduleForm.endTime}:00`);

            await api.appointments.update(selectedAppointment.id, {
                start: startDateTime, // Using Date object as partial
                end: endDateTime
            } as any);

            if (onNotify) onNotify('Cita Reagendada', `Nueva fecha: ${format(startDateTime, 'dd/MM/yyyy HH:mm')}`, 'success');
            setIsDetailModalOpen(false);
            fetchAppointments();
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error(error);
            if (onNotify) onNotify('Error', 'No se pudo reagendar.', 'error');
        }
    };

    const handleDeleteAppointment = async () => {
        if (!selectedAppointment) return;

        // Logic moved to confirmation modal, this is the final action
        try {
            const { api } = await import('../src/services/api');
            await api.appointments.delete(selectedAppointment.id);

            // Notify
            if (onNotify) onNotify('Cita Cancelada', 'La cita ha sido eliminada.', 'info');

            setIsCancelModalOpen(false);
            setIsDetailModalOpen(false);
            fetchAppointments();
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error(error);
            if (onNotify) onNotify('Error', 'No se pudo cancelar la cita.', 'error');
        }
    };

    const handleTaskSubmit = async (taskData: Partial<Task>) => {
        try {
            const { api } = await import('../src/services/api');

            if (selectedTask) {
                await api.tasks.update(selectedTask.id, taskData);
                if (onNotify) onNotify('Éxito', 'Tarea actualizada', 'success');
            } else {
                await api.tasks.create({
                    ...taskData,
                    status: 'Pending',
                    createdAt: new Date().toISOString()
                } as any);
                if (onNotify) onNotify('Éxito', 'Tarea creada', 'success');
            }

            setIsTaskModalOpen(false);
            setSelectedTask(undefined);
            if (onRefresh) onRefresh();

        } catch (error) {
            console.error(error);
            if (onNotify) onNotify('Error', 'No se pudo guardar la tarea', 'error');
        }
    };

    const generateGoogleCalendarLink = (apt: Appointment) => {
        const start = apt.start.toISOString().replace(/-|:|\.\d\d\d/g, "");
        const end = apt.end.toISOString().replace(/-|:|\.\d\d\d/g, "");

        const title = encodeURIComponent(apt.title);
        const details = encodeURIComponent(apt.description || "");
        const location = encodeURIComponent(apt.location || "");

        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
    };

    // --- RENDER HELPERS ---

    const renderHeader = () => {
        return (
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center justify-between w-full md:w-auto gap-2 md:gap-4 bg-white/50 backdrop-blur-sm p-1 rounded-xl border border-slate-200/50">
                    <div className="flex items-center gap-2 md:gap-4 pl-2">
                        <h2 className="text-lg md:text-2xl font-extrabold text-slate-900 capitalize tracking-tight">
                            {format(currentDate, isMobile ? "MMM yy" : "MMMM 'de' yyyy", { locale: es })}
                        </h2>
                        <div className="flex items-center bg-slate-100/80 rounded-lg p-0.5 ml-1">
                            <button onClick={handlePrev} title="Anterior" className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600"><ChevronLeft size={18} /></button>
                            <button onClick={handleToday} title="Ir a hoy" className="px-3 py-1 text-xs font-bold hover:bg-white hover:shadow-sm rounded-md transition-all text-blue-600">HOY</button>
                            <button onClick={handleNext} title="Siguiente" className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600"><ChevronRight size={18} /></button>
                        </div>
                    </div>

                    {isMobile && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-blue-600 text-white p-2.5 rounded-xl flex items-center justify-center hover:bg-blue-700 transition-all shadow-lg active:scale-95 mr-1"
                            title="Nueva Cita"
                        >
                            <Plus size={22} strokeWidth={3} />
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-center md:justify-end">
                    <div className="relative group">
                        <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            title="Seleccionar calendario"
                            className="pl-9 pr-6 py-2 bg-white/80 border border-slate-200 rounded-xl text-xs font-medium appearance-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-full md:w-48 shadow-sm transition-all hover:border-slate-300"
                        >
                            <option value="ALL">Agenda General</option>
                            <option value={currentUser.id?.toString() || currentUser.name}>Mi Agenda</option>
                            {isManager && team.filter(m => m.id !== currentUser.id?.toString() && m.role !== 'Support' && m.role !== 'SUPPORT' as any).map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors" />
                        <ChevronRight size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" />
                    </div>

                    <div className="flex bg-slate-200/50 p-1 rounded-xl border border-slate-200/20 shadow-inner">
                        <button onClick={() => setView('month')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${view === 'month' ? 'bg-white shadow-md text-blue-600 translate-y-[0px]' : 'text-slate-500 hover:text-slate-700'}`}>MES</button>
                        <button onClick={() => setView('week')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${view === 'week' ? 'bg-white shadow-md text-blue-600 translate-y-[0px]' : 'text-slate-500 hover:text-slate-700'}`}>{isMobile ? '3 DÍAS' : 'SEMANA'}</button>
                        <button onClick={() => setView('day')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${view === 'day' ? 'bg-white shadow-md text-blue-600 translate-y-[0px]' : 'text-slate-500 hover:text-slate-700'}`}>DÍA</button>
                    </div>

                    {(view === 'week' || view === 'day') && (
                        <button
                            onClick={() => setShowHours(!showHours)}
                            title={showHours ? "Ocultar horas" : "Mostrar horas"}
                            className={`p-2 rounded-xl border transition-all ${showHours ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm'}`}
                        >
                            <Clock size={16} />
                        </button>
                    )}

                    {!isMobile && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-blue-600 text-white px-5 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md hover:shadow-lg active:scale-95 font-bold text-sm"
                        >
                            <Plus size={18} strokeWidth={2.5} /> <span>Nueva Cita</span>
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const renderMonthView = () => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const dateFormat = "d";
        const rows = [];
        let days = [];
        let day = startDate;
        let formattedDate = "";

        // Headers
        const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                formattedDate = format(day, dateFormat);
                const cloneDay = day;

                const dayEvents = calendarEvents.filter(a => isSameDay(a.start, cloneDay));

                days.push(
                    <div
                        key={day.toString()}
                        className={`min-h-[100px] border border-slate-100 p-2 relative ${!isSameMonth(day, monthStart) ? 'bg-slate-50 text-slate-400' : 'bg-white'} ${isToday(day) ? 'bg-blue-50/30' : ''}`}
                        onClick={() => {
                            setCurrentDate(cloneDay);
                            if (isMobile) setView('day');
                        }}
                    >
                        <span className={`text-sm font-medium ${isToday(day) ? 'text-blue-600 bg-blue-100 w-6 h-6 flex items-center justify-center rounded-full' : 'text-slate-700'}`}>
                            {formattedDate}
                        </span>
                        <div className="mt-1 flex flex-wrap gap-1 md:block md:space-y-1">
                            {dayEvents.map((evt: any) => (
                                isMobile ? (
                                    <div
                                        key={evt.id}
                                        className={`w-2 h-2 rounded-full cursor-pointer hover:scale-125 transition-transform ${evt.eventType === 'task' ? 'bg-green-500' : 'bg-blue-500'}`}
                                        title={`${format(evt.start, 'HH:mm')} - ${evt.title}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (evt.eventType === 'appointment') {
                                                handleAppointmentClick(evt);
                                            } else {
                                                setSelectedTask(evt.originalTask);
                                                setIsTaskModalOpen(true);
                                            }
                                        }}
                                    />
                                ) : (
                                    <div key={evt.id}
                                        className={`text-[10px] p-1 rounded truncate border-l-2 cursor-pointer hover:opacity-80 ${evt.eventType === 'task' ? 'bg-green-100 text-green-700 border-green-500' : 'bg-blue-100 text-blue-700 border-blue-500'}`}
                                        title={`${format(evt.start, 'HH:mm')} - ${evt.title}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (evt.eventType === 'appointment') {
                                                handleAppointmentClick(evt);
                                            } else {
                                                setSelectedTask(evt.originalTask);
                                                setIsTaskModalOpen(true);
                                            }
                                        }}
                                    >
                                        <span className="font-bold">{format(evt.start, 'HH:mm')}</span> {evt.title}
                                    </div>
                                )
                            ))}
                        </div>
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(<div className="grid grid-cols-7" key={day.toString()}>{days}</div>);
            days = [];
        }

        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                    {weekDays.map(d => (
                        <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            {d}
                        </div>
                    ))}
                </div>
                <div>{rows}</div>
            </div>
        );
    };

    const renderWeekView = () => {
        const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
        let days = eachDayOfInterval({
            start: startDate,
            end: addDays(startDate, 6)
        });

        if (isMobile) {
            // For mobile, we show 3 days starting from currentDate
            days = eachDayOfInterval({
                start: currentDate,
                end: addDays(currentDate, 2)
            });
        }

        const hours = Array.from({ length: 24 }, (_, i) => i); // 0-23 hours

        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
                {/* Header */}
                <div className="flex border-b border-slate-200">
                    {showHours && <div className="w-16 flex-shrink-0 border-r border-slate-200 bg-slate-50"></div>}
                    {days.map(day => (
                        <div key={day.toString()} className={`flex-1 py-3 text-center border-r border-slate-100 ${isToday(day) ? 'bg-blue-50/50' : ''}`}>
                            <div className="text-xs text-slate-500 uppercase">{format(day, 'EEE', { locale: es })}</div>
                            <div className={`text-lg font-bold ${isToday(day) ? 'text-blue-600' : 'text-slate-700'}`}>{format(day, 'd')}</div>
                        </div>
                    ))}
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {showHours ? hours.map(hour => (
                        <div key={hour} className="flex min-h-[60px] border-b border-slate-100">
                            <div className="w-16 flex-shrink-0 border-r border-slate-200 bg-slate-50 text-xs text-slate-500 text-right pr-2 pt-2 sticky left-0">
                                {hour}:00
                            </div>
                            {days.map(day => {
                                const cellKey = format(day, 'yyyy-MM-dd') + '-' + hour;
                                const cellEvents = calendarEvents.filter(a => {
                                    const evtKey = format(a.start, 'yyyy-MM-dd') + '-' + getHours(a.start);
                                    return cellKey === evtKey;
                                });

                                return (
                                    <div key={day.toString()} className="flex-1 border-r border-slate-100 relative group hover:bg-slate-50 transition-colors">
                                        {cellEvents.map((evt: any) => (
                                            <div
                                                key={evt.id}
                                                className={`absolute inset-x-1 top-1 text-xs p-1.5 rounded border-l-2 z-10 cursor-pointer hover:z-20 shadow-sm ${evt.eventType === 'task'
                                                    ? 'bg-green-100 text-green-700 border-green-500'
                                                    : 'bg-blue-100 text-blue-700 border-blue-500'
                                                    }`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (evt.eventType === 'appointment') {
                                                        handleAppointmentClick(evt);
                                                    } else {
                                                        setSelectedTask(evt.originalTask);
                                                        setIsTaskModalOpen(true);
                                                    }
                                                }}
                                            >
                                                <div className="font-bold">{format(evt.start, 'HH:mm')} - {format(evt.end, 'HH:mm')}</div>
                                                <div className="truncate font-medium">{evt.title}</div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    )) : (
                        <div className="flex divide-x divide-slate-100 min-h-full">
                            {days.map(day => {
                                const dayEvts = calendarEvents.filter(a => isSameDay(a.start, day));
                                return (
                                    <div key={day.toString()} className="flex-1 p-2 space-y-2 bg-white">
                                        {dayEvts.map((evt: any) => (
                                            <div
                                                key={evt.id}
                                                className={`text-xs p-2 rounded border-l-2 shadow-sm cursor-pointer hover:bg-opacity-80 ${evt.eventType === 'task'
                                                    ? 'bg-green-50 text-green-700 border-green-500'
                                                    : 'bg-blue-50 text-blue-700 border-blue-500'
                                                    }`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (evt.eventType === 'appointment') {
                                                        handleAppointmentClick(evt);
                                                    } else {
                                                        setSelectedTask(evt.originalTask);
                                                        setIsTaskModalOpen(true);
                                                    }
                                                }}
                                            >
                                                <div className="font-bold">{format(evt.start, 'HH:mm')}</div>
                                                <div className="truncate font-medium">{evt.title}</div>
                                            </div>
                                        ))}
                                        {dayEvts.length === 0 && (
                                            <div className="text-[10px] text-slate-400 text-center mt-4 italic">Sin eventos</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderDayView = () => {
        const hours = Array.from({ length: 24 }, (_, i) => i);

        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
                <div className="p-4 border-b border-slate-200 text-center bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800 capitalize">{format(currentDate, "EEEE d 'de' MMMM yyyy", { locale: es })}</h3>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {showHours ? hours.map(hour => {
                        const currentDayKey = format(currentDate, 'yyyy-MM-dd') + '-' + hour;
                        const cellEvents = calendarEvents.filter(a => {
                            const evtKey = format(a.start, 'yyyy-MM-dd') + '-' + getHours(a.start);
                            return currentDayKey === evtKey;
                        });

                        return (
                            <div key={hour} className="flex min-h-[80px] border-b border-slate-100">
                                <div className="w-20 flex-shrink-0 border-r border-slate-200 bg-slate-50 text-sm text-slate-500 flex items-center justify-center font-medium">
                                    {hour}:00
                                </div>
                                <div className="flex-1 p-2 relative group hover:bg-slate-50">
                                    {cellEvents.map((evt: any) => (
                                        <div key={evt.id}
                                            className={`mb-2 border p-3 rounded-lg flex justify-between items-start shadow-sm cursor-pointer transition-colors ${evt.eventType === 'task'
                                                ? 'bg-green-50 border-green-100 hover:bg-green-100'
                                                : 'bg-blue-50 border-blue-100 hover:bg-blue-100'
                                                }`}
                                            onClick={() => {
                                                if (evt.eventType === 'appointment') {
                                                    handleAppointmentClick(evt);
                                                } else {
                                                    setSelectedTask(evt.originalTask);
                                                    setIsTaskModalOpen(true);
                                                }
                                            }}
                                        >
                                            <div>
                                                <div className={`font-bold ${evt.eventType === 'task' ? 'text-green-900' : 'text-blue-900'}`}>{evt.title}</div>
                                                <div className={`text-xs flex items-center gap-2 mt-1 ${evt.eventType === 'task' ? 'text-green-700' : 'text-blue-700'}`}>
                                                    <span className="flex items-center gap-1"><Clock size={12} /> {format(evt.start, 'HH:mm')} - {format(evt.end, 'HH:mm')}</span>
                                                    {evt.location && <span className="flex items-center gap-1"><MapPin size={12} /> {evt.location}</span>}
                                                </div>
                                                {evt.contactName && <div className={`text-xs mt-1 font-medium flex items-center gap-1 ${evt.eventType === 'task' ? 'text-green-600' : 'text-blue-600'}`}><User size={12} /> {evt.contactName}</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="p-4 space-y-4 min-h-full bg-white">
                            {calendarEvents.filter(a => isSameDay(a.start, currentDate)).map((evt: any) => (
                                <div key={evt.id}
                                    className={`border p-4 rounded-xl flex justify-between items-start shadow-sm cursor-pointer transition-all hover:shadow-md ${evt.eventType === 'task'
                                        ? 'bg-green-50 border-green-100 hover:bg-green-100'
                                        : 'bg-blue-50 border-blue-100 hover:bg-blue-100'
                                        }`}
                                    onClick={() => {
                                        if (evt.eventType === 'appointment') {
                                            handleAppointmentClick(evt);
                                        } else {
                                            setSelectedTask(evt.originalTask);
                                            setIsTaskModalOpen(true);
                                        }
                                    }}
                                >
                                    <div>
                                        <div className={`text-lg font-bold ${evt.eventType === 'task' ? 'text-green-900' : 'text-blue-900'}`}>{evt.title}</div>
                                        <div className={`text-sm flex flex-wrap items-center gap-3 mt-2 ${evt.eventType === 'task' ? 'text-green-700' : 'text-blue-700'}`}>
                                            <span className="flex items-center gap-1.5"><Clock size={14} /> {format(evt.start, 'HH:mm')} - {format(evt.end, 'HH:mm')}</span>
                                            {evt.location && <span className="flex items-center gap-1.5"><MapPin size={14} /> {evt.location}</span>}
                                            {evt.contactName && <span className="flex items-center gap-1.5 font-medium"><User size={14} /> {evt.contactName}</span>}
                                        </div>
                                        {evt.description && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{evt.description}</p>}
                                    </div>
                                </div>
                            ))}
                            {calendarEvents.filter(a => isSameDay(a.start, currentDate)).length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                    <CalendarIcon size={48} className="mb-4 opacity-20" />
                                    <p className="text-lg font-medium">No hay eventos para este día</p>
                                    <p className="text-sm">Disfruta de tu tiempo libre o agenda algo nuevo.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col p-3 md:p-6 bg-slate-50 overflow-hidden select-none">
            {renderHeader()}

            <div
                className="flex-1 overflow-auto custom-scrollbar"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {view === 'month' && renderMonthView()}
                {view === 'week' && renderWeekView()}
                {view === 'day' && renderDayView()}
            </div>

            {/* FOOTER / TIMEZONE */}
            <div className="mt-4 flex items-center justify-between px-2 py-1.5 bg-slate-100/50 rounded-xl border border-slate-200/50">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 tracking-wider">
                    <CalendarIcon size={12} />
                    <span>NEXUS CRM CALENDAR v2.0</span>
                </div>

                <div className="relative">
                    <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        title="Selector de Zona Horaria"
                        className="pl-7 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold appearance-none focus:ring-1 focus:ring-blue-500 outline-none text-slate-500 shadow-xs"
                    >
                        <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>AUTO ({Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop()})</option>
                        <option value="America/Mexico_City">MEX (CDMX)</option>
                        <option value="America/Bogota">COL/PER</option>
                        <option value="America/Santiago">CHILE</option>
                        <option value="America/Argentina/Buenos_Aires">ARG</option>
                        <option value="America/Madrid">ESP (MADRID)</option>
                        <option value="America/New_York">USA (EST)</option>
                        <option value="America/Los_Angeles">USA (PST)</option>
                    </select>
                    <Globe size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
            </div>

            {/* NEW APPOINTMENT MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-slate-900">Agendar Cita</h3>
                            <button onClick={() => setIsModalOpen(false)} title="Cerrar" className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSaveAppointment} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
                                <input required type="text" value={newAppointment.title} onChange={e => setNewAppointment({ ...newAppointment, title: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Reunión de presentación..." />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
                                <div className="relative">
                                    <div
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 cursor-text flex items-center justify-between"
                                        onClick={() => setShowContactDropdown(!showContactDropdown)}
                                    >
                                        <span className={newAppointment.contactId ? 'text-slate-900' : 'text-slate-400'}>
                                            {newAppointment.contactId
                                                ? contacts.find(c => c.id === newAppointment.contactId)?.name || 'Cliente Seleccionado'
                                                : 'Buscar cliente...'}
                                        </span>
                                        <ChevronRight size={16} className={`text-slate-400 transition-transform ${showContactDropdown ? 'rotate-90' : ''}`} />
                                    </div>

                                    {showContactDropdown && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-20 max-h-60 flex flex-col">
                                            <div className="p-2 border-b border-slate-100 sticky top-0 bg-white z-10">
                                                <div className="relative">
                                                    <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:border-blue-500"
                                                        placeholder="Filtrar por nombre..."
                                                        value={searchQuery}
                                                        onChange={e => setSearchQuery(e.target.value)}
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>
                                            <div className="overflow-y-auto flex-1">
                                                {filteredContacts.length > 0 ? (
                                                    filteredContacts.map(c => (
                                                        <div
                                                            key={c.id}
                                                            className={`px-4 py-2 hover:bg-blue-50 cursor-pointer flex justify-between items-center ${newAppointment.contactId === c.id ? 'bg-blue-50' : ''}`}
                                                            onClick={() => {
                                                                setNewAppointment({ ...newAppointment, contactId: c.id });
                                                                setShowContactDropdown(false);
                                                                setSearchQuery('');
                                                            }}
                                                        >
                                                            <div>
                                                                <div className="text-sm font-medium text-slate-900">{c.name}</div>
                                                                <div className="text-xs text-slate-500">{c.company}</div>
                                                            </div>
                                                            {newAppointment.contactId === c.id && <div className="w-2 h-2 bg-blue-600 rounded-full"></div>}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="p-4 text-center text-xs text-slate-400">No se encontraron clientes.</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            readOnly
                                            value={newAppointment.date ? format(parseISO(newAppointment.date), 'dd/MM/yyyy') : ''}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700"
                                        />
                                        <input
                                            required
                                            type="date"
                                            value={newAppointment.date}
                                            min={format(new Date(), 'yyyy-MM-dd')}
                                            onChange={e => setNewAppointment({ ...newAppointment, date: e.target.value })}
                                            onClick={(e) => (e.target as any).showPicker && (e.target as any).showPicker()}
                                            title="Seleccionar fecha"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        <CalendarIcon size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Asignado a</label>
                                    <select
                                        value={newAppointment.assignedTo}
                                        onChange={e => setNewAppointment({ ...newAppointment, assignedTo: e.target.value })}
                                        title="Asignar a"
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        {team.map(m => (
                                            <option key={m.id} value={m.name}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg">
                                <Globe size={14} className="text-slate-400" />
                                <span>Zona Horaria: <strong>{timezone}</strong></span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Hora Inicio</label>
                                    <input required type="time" title="Hora de inicio" value={newAppointment.startTime} onChange={e => setNewAppointment({ ...newAppointment, startTime: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Hora Fin</label>
                                    <input required type="time" title="Hora de fin" value={newAppointment.endTime} onChange={e => setNewAppointment({ ...newAppointment, endTime: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Ubicación</label>
                                <div className="relative">
                                    <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input type="text" value={newAppointment.location} onChange={e => setNewAppointment({ ...newAppointment, location: e.target.value })} className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Oficina, Zoom, etc." />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Producto / Servicio Relacionado</label>
                                <div className="relative">
                                    <Package size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <select
                                        value={newAppointment.productId}
                                        onChange={e => setNewAppointment({ ...newAppointment, productId: e.target.value })}
                                        title="Producto relacionado"
                                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                    >
                                        <option value="">-- Ninguno --</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                    <ChevronRight size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                                <textarea rows={3} value={newAppointment.description} onChange={e => setNewAppointment({ ...newAppointment, description: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Detalles adicionales..." />
                            </div>

                            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 shadow-md">
                                Agendar Cita
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* VIEW APPOINTMENT MODAL */}
            {isDetailModalOpen && selectedAppointment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 relative">
                        <button onClick={() => setIsDetailModalOpen(false)} title="Cerrar" className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>

                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-slate-900 mb-1">{selectedAppointment.title}</h3>
                            {!isRescheduleMode ? (
                                <div className="flex items-center gap-2 text-blue-600 font-medium">
                                    <Clock size={16} />
                                    <span>{format(selectedAppointment.start, "EEEE d 'de' MMMM, HH:mm", { locale: es })}</span>
                                </div>
                            ) : (
                                <div className="bg-blue-50 p-4 rounded-lg mt-2 border border-blue-100">
                                    <h4 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2"><RefreshCw size={14} /> Reagendar Cita</h4>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase">Nueva Fecha</label>
                                            <div className="relative mt-1">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={rescheduleForm.date ? format(parseISO(rescheduleForm.date), 'dd/MM/yyyy') : ''}
                                                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-sm focus:outline-none text-slate-700"
                                                />
                                                <input
                                                    type="date"
                                                    value={rescheduleForm.date}
                                                    onChange={e => setRescheduleForm({ ...rescheduleForm, date: e.target.value })}
                                                    onClick={(e) => (e.target as any).showPicker && (e.target as any).showPicker()}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                />
                                                <CalendarIcon size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase">Inicio</label>
                                                <input type="time" value={rescheduleForm.startTime} onChange={e => setRescheduleForm({ ...rescheduleForm, startTime: e.target.value })} className="w-full mt-1 px-2 py-1 bg-white border border-slate-300 rounded text-sm" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase">Fin</label>
                                                <input type="time" value={rescheduleForm.endTime} onChange={e => setRescheduleForm({ ...rescheduleForm, endTime: e.target.value })} className="w-full mt-1 px-2 py-1 bg-white border border-slate-300 rounded text-sm" />
                                            </div>
                                        </div>
                                        <div className="flex gap-2 pt-1">
                                            <button onClick={() => setIsRescheduleMode(false)} className="flex-1 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50">Cancelar</button>
                                            <button onClick={handleReschedule} className="flex-1 py-1.5 text-xs font-bold text-white bg-blue-600 rounded hover:bg-blue-700">Confirmar Cambio</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {!isRescheduleMode && (
                            <div className="space-y-4 mb-8">
                                {selectedAppointment.contactName && (
                                    <div className="flex items-start gap-3">
                                        <User className="text-slate-400 mt-1" size={18} />
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase">Cliente</p>
                                            <p className="text-slate-900">{selectedAppointment.contactName}</p>
                                            <p className="text-xs text-slate-500">{selectedAppointment.contactCompany}</p>
                                        </div>
                                    </div>
                                )}

                                {selectedAppointment.location && (
                                    <div className="flex items-start gap-3">
                                        <MapPin className="text-slate-400 mt-1" size={18} />
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase">Ubicación</p>
                                            <p className="text-slate-900">{selectedAppointment.location}</p>
                                        </div>
                                    </div>
                                )}

                                {selectedAppointment.productName && (
                                    <div className="flex items-start gap-3">
                                        <Package className="text-slate-400 mt-1" size={18} />
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase">Producto Relacionado</p>
                                            <p className="text-slate-900">{selectedAppointment.productName}</p>
                                        </div>
                                    </div>
                                )}

                                {selectedAppointment.description && (
                                    <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 italic border border-slate-100">
                                        "{selectedAppointment.description}"
                                    </div>
                                )}

                                {(selectedAppointment.assignedTo || selectedAppointment.userName) && (
                                    <div className="flex items-center gap-3 pt-2">
                                        <User className="text-slate-400 mt-1" size={18} />
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase">Vendedor a Cargo</p>
                                            <p className="text-slate-900">{selectedAppointment.assignedTo || selectedAppointment.userName}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-2">
                                    <a
                                        href={generateGoogleCalendarLink(selectedAppointment)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline"
                                    >
                                        <ExternalLink size={14} /> Añadir a Google Calendar
                                    </a>
                                </div>
                            </div>
                        )}

                        {!isRescheduleMode && (
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsRescheduleMode(true)}
                                    className="flex-1 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg font-medium border border-blue-200 flex justify-center items-center gap-2"
                                >
                                    <RefreshCw size={16} /> Reagendar
                                </button>
                                <button
                                    onClick={() => setIsCancelModalOpen(true)}
                                    className="flex-1 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-medium border border-red-200 flex justify-center items-center gap-2"
                                >
                                    <Trash2 size={16} /> Cancelar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* CANCEL CONFIRMATION MODAL */}
            {isCancelModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-xs p-6 text-center">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="text-red-600" size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">¿Cancelar Cita?</h3>
                        <p className="text-slate-500 text-sm mb-6">Esta acción eliminará la cita del calendario permanentemente.</p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleDeleteAppointment}
                                className="w-full py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-bold shadow-md"
                            >
                                Sí, Cancelar Cita
                            </button>
                            <button
                                onClick={() => setIsCancelModalOpen(false)}
                                className="w-full py-2 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg font-medium"
                            >
                                No, Volver
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TASK MODAL */}
            <TaskModal
                isOpen={isTaskModalOpen}
                onClose={() => {
                    setIsTaskModalOpen(false);
                    setSelectedTask(undefined);
                }}
                onSubmit={handleTaskSubmit}
                initialTask={selectedTask}
                currentUser={currentUser}
                contacts={contacts}
                team={team}
            />
        </div>
    );
};
