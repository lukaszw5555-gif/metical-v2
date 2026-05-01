import { supabase } from '@/lib/supabase/client';
import type { PvComponent, CreatePvComponentInput, UpdatePvComponentInput } from '../types/pvComponentTypes';

// ─── Fetch ───────────────────────────────────────────────

export async function getPvComponents(): Promise<PvComponent[]> {
  const { data, error } = await supabase
    .from('pv_components')
    .select('*')
    .order('category')
    .order('trade_name');
  if (error) throw error;
  return data as PvComponent[];
}

export async function getPvComponentById(id: string): Promise<PvComponent> {
  const { data, error } = await supabase
    .from('pv_components')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as PvComponent;
}

// ─── Create ──────────────────────────────────────────────

export async function createPvComponent(input: CreatePvComponentInput, userId: string): Promise<PvComponent> {
  const { data, error } = await supabase
    .from('pv_components')
    .insert({ ...input, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data as PvComponent;
}

// ─── Create Many (for CSV import) ────────────────────────

export async function createPvComponents(inputs: (CreatePvComponentInput & { created_by: string })[]): Promise<PvComponent[]> {
  const { data, error } = await supabase
    .from('pv_components')
    .insert(inputs)
    .select();
  if (error) throw error;
  return data as PvComponent[];
}

// ─── Update ──────────────────────────────────────────────

export async function updatePvComponent(id: string, input: UpdatePvComponentInput): Promise<PvComponent> {
  const { data, error } = await supabase
    .from('pv_components')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as PvComponent;
}

// ─── Toggle Active ───────────────────────────────────────

export async function togglePvComponentActive(id: string, active: boolean, userId: string): Promise<void> {
  const { error } = await supabase
    .from('pv_components')
    .update({ active, updated_by: userId })
    .eq('id', id);
  if (error) throw error;
}
