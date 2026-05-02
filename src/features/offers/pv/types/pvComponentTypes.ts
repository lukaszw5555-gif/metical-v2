// ─── PV Component Types ─────────────────────────────────

export interface PvComponent {
  id: string;
  category: PvComponentCategory;
  manufacturer: string | null;
  model: string | null;
  trade_name: string;
  unit: string;
  param1: string | null;
  param2: string | null;
  description: string | null;
  power_w: number | null;
  capacity_kwh: number | null;
  purchase_price: number;
  selling_price: number;
  vat_rate: number;
  active: boolean;
  notes: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type PvComponentCategory =
  | 'Falowniki'
  | 'Magazyny energii'
  | 'Moduły fotowoltaiczne'
  | 'Akcesoria montażowe'
  | 'Konstrukcje montażowe'
  | 'Dodatkowe usługi'
  | 'SIG'
  | 'Materiały pomocnicze'
  | 'Skrzynki / rozdzielnice'
  | 'Backup'
  | 'Wyłącznik ppoż.';

export const PV_COMPONENT_CATEGORIES: PvComponentCategory[] = [
  'Falowniki',
  'Magazyny energii',
  'Moduły fotowoltaiczne',
  'Akcesoria montażowe',
  'Konstrukcje montażowe',
  'Dodatkowe usługi',
  'SIG',
  'Materiały pomocnicze',
  'Skrzynki / rozdzielnice',
  'Backup',
  'Wyłącznik ppoż.',
];

export interface CreatePvComponentInput {
  category: PvComponentCategory;
  manufacturer?: string | null;
  model?: string | null;
  trade_name: string;
  unit?: string;
  param1?: string | null;
  param2?: string | null;
  description?: string | null;
  power_w?: number | null;
  capacity_kwh?: number | null;
  purchase_price?: number;
  selling_price?: number;
  vat_rate?: number;
  active?: boolean;
  notes?: string | null;
}

export type UpdatePvComponentInput = Partial<CreatePvComponentInput> & {
  updated_by?: string;
};

// CSV export column order (no audit fields)
export const PV_COMPONENT_CSV_COLUMNS = [
  'id', 'category', 'manufacturer', 'model', 'trade_name', 'unit',
  'param1', 'param2', 'description', 'active',
  'purchase_price', 'selling_price', 'vat_rate',
  'power_w', 'capacity_kwh', 'notes',
] as const;

// CSV template columns (no id — for new entries)
export const PV_COMPONENT_CSV_TEMPLATE_COLUMNS = [
  'category', 'manufacturer', 'model', 'trade_name', 'unit',
  'param1', 'param2', 'description', 'active',
  'purchase_price', 'selling_price', 'vat_rate',
  'power_w', 'capacity_kwh', 'notes',
] as const;
