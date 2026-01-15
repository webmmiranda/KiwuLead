import { Contact, CurrentUser, LeadStatus, PipelineColumn, Product, Source, Task, TeamMember, Ticket, TicketPriority, TicketStatus, UserRole, Appointment, Message, Note } from '../../types';

// --- HELPERS ---
const subDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
};

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomDate = (start: Date, end: Date) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

// --- USERS ---
export const mockUsers: Record<string, CurrentUser> = {
  'manager': {
    id: 1,
    name: 'Carlos Gerente',
    email: 'gerente@kiwulead.demo',
    role: 'MANAGER',
    avatar: 'https://ui-avatars.com/api/?name=Carlos+Gerente&background=0D8ABC&color=fff',
    token: 'mock-token-manager'
  },
  'support': {
    id: 2,
    name: 'Sara Soporte',
    email: 'soporte@kiwulead.demo',
    role: 'SUPPORT',
    avatar: 'https://ui-avatars.com/api/?name=Sara+Soporte&background=E91E63&color=fff',
    token: 'mock-token-support'
  },
  'sales1': {
    id: 3,
    name: 'Juan Vendedor',
    email: 'juan@kiwulead.demo',
    role: 'SALES_REP',
    avatar: 'https://ui-avatars.com/api/?name=Juan+Vendedor&background=FF9800&color=fff',
    token: 'mock-token-sales1'
  },
  'sales2': {
    id: 4,
    name: 'Ana Ventas',
    email: 'ana@kiwulead.demo',
    role: 'SALES_REP',
    avatar: 'https://ui-avatars.com/api/?name=Ana+Ventas&background=4CAF50&color=fff',
    token: 'mock-token-sales2'
  },
  'sales3': {
    id: 5,
    name: 'Pedro Comercial',
    email: 'pedro@kiwulead.demo',
    role: 'SALES_REP',
    avatar: 'https://ui-avatars.com/api/?name=Pedro+Comercial&background=9C27B0&color=fff',
    token: 'mock-token-sales3'
  }
};

export const mockTeam: TeamMember[] = [
  { id: '1', name: 'Carlos Gerente', role: 'Manager', email: 'gerente@kiwulead.demo', status: 'Active', lastLogin: new Date().toISOString() },
  { id: '2', name: 'Sara Soporte', role: 'Support', email: 'soporte@kiwulead.demo', status: 'Active', lastLogin: subDays(new Date(), 1).toISOString() },
  { id: '3', name: 'Juan Vendedor', role: 'Sales', email: 'juan@kiwulead.demo', status: 'Active', lastLogin: new Date().toISOString() },
  { id: '4', name: 'Ana Ventas', role: 'Sales', email: 'ana@kiwulead.demo', status: 'Active', lastLogin: subDays(new Date(), 2).toISOString() },
  { id: '5', name: 'Pedro Comercial', role: 'Sales', email: 'pedro@kiwulead.demo', status: 'Inactive', lastLogin: subDays(new Date(), 5).toISOString() },
];

// --- PIPELINE & PRODUCTS ---
export const mockPipeline: PipelineColumn[] = [
  { id: '1', title: 'Nuevo Lead', color: '#3B82F6', probability: 10 },
  { id: '2', title: 'Contactado', color: '#F59E0B', probability: 30 },
  { id: '3', title: 'Cita Agendada', color: '#8B5CF6', probability: 50 },
  { id: '4', title: 'Propuesta', color: '#EC4899', probability: 70 },
  { id: '5', title: 'Negociación', color: '#6366F1', probability: 90 },
  { id: '6', title: 'Cerrado Ganado', color: '#10B981', probability: 100 },
];

export const mockProducts: Product[] = [
  { id: '1', name: 'Plan Starter', description: 'Licencia mensual para pymes', price: 29.99, currency: 'USD', category: 'SaaS' },
  { id: '2', name: 'Plan Growth', description: 'Funciones avanzadas y soporte', price: 99.99, currency: 'USD', category: 'SaaS' },
  { id: '3', name: 'Plan Enterprise', description: 'Solución corporativa completa', price: 299.00, currency: 'USD', category: 'SaaS' },
  { id: '4', name: 'Consultoría Estratégica', description: 'Hora de consultoría', price: 150.00, currency: 'USD', category: 'Services' },
  { id: '5', name: 'Implementación VIP', description: 'Configuración llave en mano', price: 1500.00, currency: 'USD', category: 'Services' },
];

// --- GENERATORS ---
const companies = [
  'Tech Solutions', 'Grupo Alpha', 'Innovación Digital', 'Consultores Asociados', 'Constructora Norte',
  'Logística Express', 'Finanzas Seguras', 'Marketing Pro', 'Diseño Creativo', 'SoftWare House',
  'Restaurante El Gourmet', 'Hotel Paradise', 'Clínica Salud', 'EduTech Global', 'Inmobiliaria Futuro',
  'Transportes Rápidos', 'Energía Verde', 'Agro Export', 'Textil Moda', 'Seguros Confianza'
];

const names = [
  'Roberto Gómez', 'María López', 'Carlos Ruiz', 'Ana Martínez', 'Luis Fernández',
  'Elena Torres', 'Javier Díaz', 'Sofía Castro', 'Miguel Ángel', 'Lucía Vega',
  'Diego Morales', 'Valentina Silva', 'Andrés Herrera', 'Camila Rojas', 'Fernando Ortiz',
  'Isabel Medina', 'Ricardo Vargas', 'Patricia Mendoza', 'Gabriel Cruz', 'Daniela Ríos'
];

const tagsList = ['VIP', 'Pyme', 'Enterprise', 'Caliente', 'Frío', 'Referido', 'Urgente', 'Tecnología', 'Salud', 'Finanzas'];

const generateHistory = (count: number): Message[] => {
  return Array.from({ length: count }).map((_, i) => ({
    id: `msg-${Math.random().toString(36).substr(2, 9)}`,
    sender: i % 2 === 0 ? 'agent' : 'customer',
    content: i % 2 === 0 
      ? 'Hola, ¿cómo podemos ayudarte hoy?' 
      : 'Estoy interesado en conocer más sobre sus planes.',
    timestamp: subDays(new Date(), i).toISOString(),
    channel: 'email',
    subject: 'Consulta sobre servicios'
  }));
};

// --- CONTACTS GENERATION ---
const salesIds = ['3', '4', '5']; // Juan, Ana, Pedro
const salesMap: Record<string, string> = {
  '3': 'Juan Vendedor',
  '4': 'Ana Ventas',
  '5': 'Pedro Comercial'
};

export const mockContacts: Contact[] = [];

// Generate 100 contacts
for (let i = 0; i < 100; i++) {
  const company = randomItem(companies);
  const contactName = randomItem(names);
  const ownerId = randomItem(salesIds);
  const ownerName = salesMap[ownerId];
  
  const createdAt = randomDate(subDays(new Date(), 180), new Date());
  const status = randomItem(Object.values(LeadStatus));
  const value = randomInt(500, 50000);
  
  let probability = 10;
  if (status === LeadStatus.CONTACTED) probability = 30;
  if (status === LeadStatus.MEETING) probability = 50;
  if (status === LeadStatus.PROPOSAL) probability = 70;
  if (status === LeadStatus.NEGOTIATION) probability = 90;
  if (status === LeadStatus.WON) probability = 100;
  if (status === LeadStatus.LOST) probability = 0;

  const contact: Contact = {
    id: `c-${i}`,
    name: contactName,
    company: `${company} ${randomInt(1, 99)}`,
    email: `${contactName.toLowerCase().replace(' ', '.')}@${company.toLowerCase().replace(' ', '')}.com`,
    phone: `+52${randomInt(5500000000, 5599999999)}`,
    status: status,
    source: randomItem(Object.values(Source)),
    owner: ownerName, // Using Name for Dashboard compatibility
    createdAt: createdAt.toISOString(),
    lastActivity: subDays(new Date(), randomInt(0, 30)).toISOString(),
    tags: [randomItem(tagsList), randomItem(tagsList)],
    value: value,
    probability: probability,
    notes: [],
    history: generateHistory(randomInt(0, 5))
  };

  if (status === LeadStatus.WON) {
    contact.wonData = {
      products: [randomItem(mockProducts).name],
      finalPrice: value,
      closedAt: addDays(createdAt, randomInt(5, 60)).toISOString()
    };
  }

  if (status === LeadStatus.LOST) {
    contact.lostReason = randomItem(['Precio alto', 'Competencia', 'Sin presupuesto', 'No interesado', 'Mala atención']);
  }

  mockContacts.push(contact);
}

// --- TASKS GENERATION ---
export const mockTasks: Task[] = [];
for (let i = 0; i < 50; i++) {
  const ownerId = randomItem(salesIds);
  const ownerName = salesMap[ownerId];
  
  const type = randomItem(['Call', 'Email', 'Meeting', 'ToDo'] as const);
  const status = randomItem(['Pending', 'Done', 'Pending', 'Pending', 'Cancelled'] as const); // More pending
  const priority = randomItem(['Low', 'Normal', 'High'] as const);
  const relatedContact = randomItem(mockContacts);
  
  mockTasks.push({
    id: `t-${i}`,
    title: `${type === 'Call' ? 'Llamar a' : type === 'Email' ? 'Escribir a' : 'Reunión con'} ${relatedContact.name}`,
    description: 'Seguimiento de oportunidad comercial',
    dueDate: addDays(new Date(), randomInt(-5, 10)).toISOString().split('T')[0],
    status: status,
    priority: priority,
    assignedTo: ownerName, // Using Name
    relatedContactId: relatedContact.id,
    relatedContactName: relatedContact.name,
    type: type
  });
}

// --- APPOINTMENTS GENERATION ---
export const mockAppointments: Appointment[] = [];
for (let i = 0; i < 20; i++) {
  const ownerId = randomItem(salesIds);
  const ownerName = salesMap[ownerId];
  const contact = randomItem(mockContacts);
  const start = addDays(new Date(), randomInt(-2, 7));
  start.setHours(randomInt(9, 17), 0, 0, 0);
  const end = new Date(start);
  end.setHours(start.getHours() + 1);

  mockAppointments.push({
    id: `a-${i}`,
    title: `Demo con ${contact.company}`,
    start: start,
    end: end,
    location: 'Google Meet',
    description: 'Presentación de propuesta comercial',
    contactId: contact.id,
    contactName: contact.name,
    userId: ownerId, // Keeping ID here as it might be used for linking, but adding Name just in case
    userName: ownerName,
    assignedTo: ownerName // Some components might use assignedTo
  });
}

// --- EMAILS GENERATION ---
export const mockEmails: any[] = [];
salesIds.forEach(userId => {
  // Inbox
  for (let i = 0; i < 15; i++) {
    const contact = randomItem(mockContacts);
    mockEmails.push({
      id: `e-in-${userId}-${i}`,
      subject: `Re: Propuesta comercial - ${contact.company}`,
      from: contact.email,
      to: mockUsers[userId === '3' ? 'sales1' : userId === '4' ? 'sales2' : 'sales3'].email,
      date: subDays(new Date(), randomInt(0, 10)).toISOString(),
      snippet: 'Hola, hemos revisado la propuesta y nos gustaría agendar una llamada...',
      read: Math.random() > 0.3,
      folder: 'inbox'
    });
  }
  // Sent
  for (let i = 0; i < 10; i++) {
    const contact = randomItem(mockContacts);
    mockEmails.push({
      id: `e-sent-${userId}-${i}`,
      subject: `Propuesta comercial - ${contact.company}`,
      from: mockUsers[userId === '3' ? 'sales1' : userId === '4' ? 'sales2' : 'sales3'].email,
      to: contact.email,
      date: subDays(new Date(), randomInt(0, 10)).toISOString(),
      snippet: 'Adjunto encontrarás la propuesta detallada...',
      read: true,
      folder: 'sent'
    });
  }
});

// --- NOTIFICATIONS ---
export const mockNotifications = [
  {
    id: 'n1',
    title: 'Nuevo Lead Asignado',
    message: 'Se te ha asignado un nuevo lead calificado.',
    type: 'success',
    timestamp: new Date().toISOString(),
    read: false
  },
  {
    id: 'n2',
    title: 'Meta Mensual Alcanzada',
    message: '¡Felicidades! Has alcanzado el 100% de tu meta.',
    type: 'success',
    timestamp: subDays(new Date(), 1).toISOString(),
    read: true
  },
  {
    id: 'n3',
    title: 'Tarea Vencida',
    message: 'Tienes tareas pendientes de seguimiento.',
    type: 'warning',
    timestamp: subDays(new Date(), 2).toISOString(),
    read: true
  },
  {
    id: 'n4',
    title: 'Reunión en 15 min',
    message: 'Prepárate para la demo con Tech Solutions.',
    type: 'info',
    timestamp: new Date().toISOString(),
    read: false
  }
];
