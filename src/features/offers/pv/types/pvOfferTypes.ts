// ─── PV Offer Types ──────────────────────────────────────

export type PvOfferStatus = 'draft' | 'sent' | 'accepted' | 'rejected';
export type PvOfferType = 'pv' | 'pv_me' | 'me' | 'individual';

export interface PvOffer {
  id: string;
  offer_number: string | null;
  lead_id: string | null;
  client_id: string | null;
  created_by: string;
  assigned_to: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  customer_city: string | null;
  investment_address: string | null;
  pv_power_kw: number;
  panel_power_w: number | null;
  panel_count: number | null;
  inverter_name: string | null;
  structure_type: string | null;
  roof_type: string | null;
  installation_type: string | null;
  annual_production_kwh: number | null;
  price_net: number;
  vat_rate: number;
  price_gross: number;
  margin_value: number | null;
  margin_percent: number | null;
  offer_note: string | null;
  internal_note: string | null;
  status: PvOfferStatus;
  offer_type: PvOfferType;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePvOfferInput {
  offer_number?: string | null;
  lead_id?: string | null;
  client_id?: string | null;
  assigned_to?: string | null;
  customer_name: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_city?: string | null;
  investment_address?: string | null;
  pv_power_kw: number;
  panel_power_w?: number | null;
  panel_count?: number | null;
  inverter_name?: string | null;
  structure_type?: string | null;
  roof_type?: string | null;
  installation_type?: string | null;
  annual_production_kwh?: number | null;
  price_net: number;
  vat_rate: number;
  price_gross: number;
  margin_value?: number | null;
  margin_percent?: number | null;
  offer_note?: string | null;
  internal_note?: string | null;
  status?: PvOfferStatus;
  offer_type?: PvOfferType;
  valid_until?: string | null;
}

export type UpdatePvOfferInput = Partial<CreatePvOfferInput>;

// ─── PV Offer Item Types ─────────────────────────────────

export interface PvOfferItem {
  id: string;
  offer_id: string;
  component_id: string | null;
  category: string;
  manufacturer: string | null;
  model: string | null;
  trade_name: string;
  unit: string;
  quantity: number;
  purchase_price: number;
  selling_price: number;
  vat_rate: number;
  power_w: number | null;
  capacity_kwh: number | null;
  notes: string | null;
  is_custom: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePvOfferItemInput {
  offer_id: string;
  component_id?: string | null;
  category: string;
  manufacturer?: string | null;
  model?: string | null;
  trade_name: string;
  unit?: string;
  quantity?: number;
  purchase_price?: number;
  selling_price?: number;
  vat_rate?: number;
  power_w?: number | null;
  capacity_kwh?: number | null;
  notes?: string | null;
  is_custom?: boolean;
  sort_order?: number;
}

// ─── Local item (for form state, before save) ────────────

export interface PvOfferItemDraft {
  _key: string; // local key for React rendering
  component_id: string | null;
  category: string;
  manufacturer: string | null;
  model: string | null;
  trade_name: string;
  unit: string;
  quantity: number;
  purchase_price: number;
  selling_price: number;
  vat_rate: number;
  power_w: number | null;
  capacity_kwh: number | null;
  notes: string | null;
  is_custom: boolean;
  sort_order: number;
}

// ─── Constants ───────────────────────────────────────────

export const PV_OFFER_STATUSES: PvOfferStatus[] = ['draft', 'sent', 'accepted', 'rejected'];

export const PV_OFFER_STATUS_LABELS: Record<PvOfferStatus, string> = {
  draft: 'Robocza',
  sent: 'Wysłana',
  accepted: 'Zaakceptowana',
  rejected: 'Odrzucona',
};

export const PV_OFFER_STATUS_COLORS: Record<PvOfferStatus, string> = {
  draft: '#6b7280',     // gray-500
  sent: '#2563eb',      // blue-600
  accepted: '#16a34a',  // green-600
  rejected: '#dc2626',  // red-600
};

// ─── Offer Type Constants ────────────────────────────────

export const PV_OFFER_TYPES: PvOfferType[] = ['pv', 'pv_me', 'me', 'individual'];

export const PV_OFFER_TYPE_LABELS: Record<PvOfferType, string> = {
  pv: 'Fotowoltaika',
  pv_me: 'Fotowoltaika + magazyn energii',
  me: 'Magazyn energii',
  individual: 'Oferta indywidualna',
};

export const PV_OFFER_TYPE_DESCRIPTIONS: Record<PvOfferType, string> = {
  pv: 'Instalacja PV bez magazynu energii',
  pv_me: 'Instalacja PV z magazynem energii',
  me: 'Sam magazyn energii lub rozbudowa istniejącej instalacji',
  individual: 'Dowolna konfiguracja bez wymaganych kroków',
};

export const PV_OFFER_TYPE_COLORS: Record<PvOfferType, string> = {
  pv: '#d97706',       // amber-600
  pv_me: '#7c3aed',    // violet-600
  me: '#059669',       // emerald-600
  individual: '#6366f1', // indigo-500
};

export const PV_STRUCTURE_TYPES = [
  { value: 'dach_skosy', label: 'Dach skośny' },
  { value: 'dach_plaski', label: 'Dach płaski' },
  { value: 'grunt', label: 'Grunt' },
  { value: 'carport', label: 'Carport' },
  { value: 'inne', label: 'Inne' },
];

export const PV_ROOF_TYPES = [
  { value: 'dachowka_ceramiczna', label: 'Dachówka ceramiczna' },
  { value: 'dachowka_betonowa', label: 'Dachówka betonowa' },
  { value: 'blachodachowka', label: 'Blachodachówka' },
  { value: 'blacha_trapezowa', label: 'Blacha trapezowa' },
  { value: 'blacha_na_rabek', label: 'Blacha na rąbek' },
  { value: 'papa', label: 'Papa' },
  { value: 'inne', label: 'Inne' },
];

export const PV_INSTALLATION_TYPES = [
  { value: 'on_grid', label: 'On-grid' },
  { value: 'off_grid', label: 'Off-grid' },
  { value: 'hybrid', label: 'Hybrydowa' },
];
