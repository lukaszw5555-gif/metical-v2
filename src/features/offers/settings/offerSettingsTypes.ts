// ─── Offer Settings Types ────────────────────────────────

export interface OfferSettings {
  id: string;
  offer_type: string;
  company_name: string | null;
  company_address: string | null;
  company_nip: string | null;
  company_email: string | null;
  company_phone: string | null;
  pdf_footer_text: string | null;
  next_step_text: string | null;
  default_realization_time: string | null;
  default_offer_valid_days: number;
  default_vat_rate: number;
  offer_number_prefix: string;
  offer_number_next: number;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export type UpdateOfferSettingsInput = Partial<
  Omit<OfferSettings, 'id' | 'offer_type' | 'created_at' | 'updated_at'>
>;
