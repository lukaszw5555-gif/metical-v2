import type {
  TaskStatus,
  TaskPriority,
  InvestmentType,
  InvestmentStatus,
  UserRole,
  SalesLeadStatus,
  SalesLeadSource,
  SalesServiceType,
} from '@/types/database';

// ─── Task Status ─────────────────────────────────────────

/** Raw DB status labels (kept for backwards compatibility) */
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  do_zrobienia: 'Do zrobienia',
  w_trakcie: 'W trakcie',
  czeka: 'Czeka',
  zrobione: 'Zrobione',
};

/** Simplified display labels for the UI (Sprint UX 1) */
export const TASK_STATUS_DISPLAY_LABELS: Record<TaskStatus, string> = {
  do_zrobienia: 'Nie rozpoczęto',
  w_trakcie: 'W trakcie',
  czeka: 'Nie rozpoczęto',
  zrobione: 'Zrobione',
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  do_zrobienia: '#4f46e5', // indigo-600
  w_trakcie: '#d97706',   // amber-700
  czeka: '#4f46e5',        // indigo-600 (same as do_zrobienia)
  zrobione: '#16a34a',    // green-600
};

export const TASK_STATUSES: TaskStatus[] = [
  'do_zrobienia',
  'w_trakcie',
  'czeka',
  'zrobione',
];

// ─── Task Priority ───────────────────────────────────────

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  normalny: 'Normalny',
  pilny: 'Pilny',
  krytyczny: 'Krytyczny',
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  normalny: '#6b7280',   // gray-500
  pilny: '#b45309',      // amber-800
  krytyczny: '#b91c1c',  // red-700
};

export const TASK_PRIORITIES: TaskPriority[] = [
  'normalny',
  'pilny',
  'krytyczny',
];

// ─── Investment Type ─────────────────────────────────────

export const INVESTMENT_TYPE_LABELS: Record<InvestmentType, string> = {
  pv: 'PV',
  pv_magazyn: 'PV + magazyn energii',
  magazyn: 'Magazyn energii',
  pompa_ciepla: 'Pompa ciepła',
  hydraulika: 'Hydraulika',
  elektryka: 'Elektryka',
  hala: 'Hala',
  dom: 'Dom',
  kompleksowa_usluga: 'Kompleksowa usługa',
};

export const INVESTMENT_TYPES: InvestmentType[] = [
  'pv',
  'pv_magazyn',
  'magazyn',
  'pompa_ciepla',
  'hydraulika',
  'elektryka',
  'hala',
  'dom',
  'kompleksowa_usluga',
];

// ─── Investment Status ───────────────────────────────────

export const INVESTMENT_STATUS_LABELS: Record<InvestmentStatus, string> = {
  czeka_na_wplate: 'Czeka na wpłatę',
  w_planowaniu: 'W planowaniu',
  w_realizacji: 'W realizacji',
  zakonczona: 'Zakończona',
};

export const INVESTMENT_STATUS_COLORS: Record<InvestmentStatus, string> = {
  czeka_na_wplate: '#d97706', // amber-700
  w_planowaniu: '#4f46e5',   // indigo-600
  w_realizacji: '#2563eb',   // blue-600
  zakonczona: '#16a34a',     // green-600
};

export const INVESTMENT_STATUSES: InvestmentStatus[] = [
  'czeka_na_wplate',
  'w_planowaniu',
  'w_realizacji',
  'zakonczona',
];

// ─── User Roles ──────────────────────────────────────────

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  operator: 'Operator',
  administracja: 'Administracja',
};

// ─── Overdue Thresholds ──────────────────────────────────

/** Hours without activity before a task is considered overdue */
export const OVERDUE_THRESHOLD_HOURS = 24;

/** Hours without activity before a "czeka" task is considered overdue */
export const OVERDUE_THRESHOLD_WAITING_HOURS = 48;

// ─── Sales Lead Status ──────────────────────────────────

export const LEAD_STATUS_LABELS: Record<SalesLeadStatus, string> = {
  new: 'Nowy Lead',
  follow_up: 'Follow-up',
  offered: 'Zaofertowany',
  won: 'Wygrany',
  lost: 'Przegrany',
};

export const LEAD_STATUS_COLORS: Record<SalesLeadStatus, string> = {
  new: '#6366f1',      // indigo-500
  follow_up: '#d97706', // amber-600
  offered: '#2563eb',   // blue-600
  won: '#16a34a',       // green-600
  lost: '#dc2626',      // red-600
};

export const LEAD_STATUSES: SalesLeadStatus[] = [
  'new', 'follow_up', 'offered', 'won', 'lost',
];

// ─── Sales Lead Source ──────────────────────────────────

export const LEAD_SOURCE_LABELS: Record<SalesLeadSource, string> = {
  website: 'Strona internetowa',
  facebook_ads: 'Facebook Ads',
  manual: 'Ręcznie dodany',
};

export const LEAD_SOURCES: SalesLeadSource[] = [
  'website', 'facebook_ads', 'manual',
];

// ─── Sales Service Type ─────────────────────────────────

export const LEAD_SERVICE_TYPE_LABELS: Record<SalesServiceType, string> = {
  pv: 'PV',
  pv_magazyn: 'PV + magazyn energii',
  magazyn: 'Magazyn energii',
  pompa_ciepla: 'Pompa ciepła',
  hydraulika: 'Hydraulika',
  elektryka: 'Elektryka',
  hala: 'Hala stalowa',
  dom: 'Dom stalowy',
  kompleksowa_usluga: 'Kompleksowa usługa',
  inne: 'Inne',
};

export const LEAD_SERVICE_TYPES: SalesServiceType[] = [
  'pv', 'pv_magazyn', 'magazyn', 'pompa_ciepla', 'hydraulika',
  'elektryka', 'hala', 'dom', 'kompleksowa_usluga', 'inne',
];
