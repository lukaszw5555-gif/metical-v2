import { supabase } from '@/lib/supabase/client';
import type { OfferSettings, UpdateOfferSettingsInput } from './offerSettingsTypes';

// ─── Fetch global settings (create default if missing) ───

export async function getOfferSettings(): Promise<OfferSettings> {
  const { data, error } = await supabase
    .from('offer_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (data) return data as OfferSettings;

  // No row yet — create default (requires admin, but seed should exist)
  const { data: created, error: insertErr } = await supabase
    .from('offer_settings')
    .insert({
      company_name: 'METICAL Sp. z o.o.',
      default_offer_valid_days: 14,
      default_vat_rate: 8,
      offer_number_prefix: 'PV',
      offer_number_next: 1,
    })
    .select()
    .single();

  if (insertErr) {
    // Non-admin can't insert — return safe defaults
    console.warn('[OfferSettings] No settings row and cannot create:', insertErr.message);
    return {
      id: '',
      company_name: 'METICAL Sp. z o.o.',
      company_address: null,
      company_nip: null,
      company_email: null,
      company_phone: null,
      pdf_footer_text: null,
      next_step_text: null,
      default_realization_time: null,
      default_offer_valid_days: 14,
      default_vat_rate: 8,
      offer_number_prefix: 'PV',
      offer_number_next: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: null,
    };
  }

  return created as OfferSettings;
}

// ─── Update settings (admin only) ────────────────────────

export async function updateOfferSettings(
  id: string,
  input: UpdateOfferSettingsInput,
): Promise<OfferSettings> {
  const { data, error } = await supabase
    .from('offer_settings')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as OfferSettings;
}
