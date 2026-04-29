import type {
  TaskStatus,
  TaskPriority,
  InvestmentType,
  InvestmentStatus,
  UserRole,
} from '@/types/database';

// ─── Task Status ─────────────────────────────────────────

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  do_zrobienia: 'Do zrobienia',
  w_trakcie: 'W trakcie',
  czeka: 'Czeka',
  zrobione: 'Zrobione',
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  do_zrobienia: '#6366f1', // indigo
  w_trakcie: '#f59e0b',   // amber
  czeka: '#8b5cf6',       // violet
  zrobione: '#22c55e',    // green
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
  normalny: '#6b7280',   // gray
  pilny: '#f59e0b',      // amber
  krytyczny: '#ef4444',  // red
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
  czeka_na_wplate: '#f59e0b', // amber
  w_planowaniu: '#6366f1',   // indigo
  w_realizacji: '#3b82f6',   // blue
  zakonczona: '#22c55e',     // green
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
