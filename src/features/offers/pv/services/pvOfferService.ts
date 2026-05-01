import { supabase } from '@/lib/supabase/client';
import type { PvOffer, CreatePvOfferInput, UpdatePvOfferInput } from '../types/pvOfferTypes';

// ─── Fetch ───────────────────────────────────────────────

export async function getPvOffers(): Promise<PvOffer[]> {
  const { data, error } = await supabase
    .from('pv_offers')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as PvOffer[];
}

export async function getPvOfferById(id: string): Promise<PvOffer> {
  const { data, error } = await supabase
    .from('pv_offers')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as PvOffer;
}

// ─── Create ──────────────────────────────────────────────

export async function createPvOffer(input: CreatePvOfferInput, userId: string): Promise<PvOffer> {
  const { data, error } = await supabase
    .from('pv_offers')
    .insert({ ...input, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data as PvOffer;
}

// ─── Update ──────────────────────────────────────────────

export async function updatePvOffer(id: string, input: UpdatePvOfferInput): Promise<PvOffer> {
  const { data, error } = await supabase
    .from('pv_offers')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as PvOffer;
}
