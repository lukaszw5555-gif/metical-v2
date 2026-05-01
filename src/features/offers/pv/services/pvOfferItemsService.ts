import { supabase } from '@/lib/supabase/client';
import type { PvOfferItem, CreatePvOfferItemInput } from '../types/pvOfferTypes';

// ─── Fetch ───────────────────────────────────────────────

export async function getPvOfferItems(offerId: string): Promise<PvOfferItem[]> {
  const { data, error } = await supabase
    .from('pv_offer_items')
    .select('*')
    .eq('offer_id', offerId)
    .order('sort_order')
    .order('created_at');
  if (error) throw error;
  return data as PvOfferItem[];
}

// ─── Replace all items (atomic save) ─────────────────────

export async function replacePvOfferItems(
  offerId: string,
  items: Omit<CreatePvOfferItemInput, 'offer_id'>[],
): Promise<PvOfferItem[]> {
  // 1. Delete all existing items for this offer
  const { error: delErr } = await supabase
    .from('pv_offer_items')
    .delete()
    .eq('offer_id', offerId);
  if (delErr) throw delErr;

  // 2. Insert new items
  if (items.length === 0) return [];

  const rows = items.map((item, i) => ({
    ...item,
    offer_id: offerId,
    sort_order: item.sort_order ?? i,
  }));

  const { data, error: insErr } = await supabase
    .from('pv_offer_items')
    .insert(rows)
    .select();
  if (insErr) throw insErr;
  return data as PvOfferItem[];
}
