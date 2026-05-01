import { supabase } from '@/lib/supabase/client';
import type { SalesLead, SalesLeadStatus } from '@/types/database';

// ─── Fetch ───────────────────────────────────────────────

export async function getLeads(): Promise<SalesLead[]> {
  const { data, error } = await supabase
    .from('sales_leads')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as SalesLead[];
}

export async function getLeadById(id: string): Promise<SalesLead> {
  const { data, error } = await supabase
    .from('sales_leads')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as SalesLead;
}

// ─── Create ──────────────────────────────────────────────

export interface CreateLeadInput {
  full_name: string;
  phone: string;
  email?: string | null;
  city?: string | null;
  source: string;
  service_type?: string | null;
  qualification_note?: string | null;
  primary_assigned_to?: string | null;
  secondary_assigned_to?: string | null;
  next_follow_up_at?: string | null;
  follow_up_note?: string | null;
}

export async function createLead(input: CreateLeadInput, userId: string): Promise<SalesLead> {
  const { data, error } = await supabase
    .from('sales_leads')
    .insert({
      full_name: input.full_name,
      phone: input.phone,
      email: input.email || null,
      city: input.city || null,
      source: input.source,
      service_type: input.service_type || null,
      qualification_note: input.qualification_note || null,
      primary_assigned_to: input.primary_assigned_to || null,
      secondary_assigned_to: input.secondary_assigned_to || null,
      next_follow_up_at: input.next_follow_up_at || null,
      follow_up_note: input.follow_up_note || null,
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return data as SalesLead;
}

// ─── Update ──────────────────────────────────────────────

export interface UpdateLeadInput {
  full_name?: string;
  phone?: string;
  email?: string | null;
  city?: string | null;
  source?: string;
  service_type?: string | null;
  qualification_note?: string | null;
  primary_assigned_to?: string | null;
  secondary_assigned_to?: string | null;
  next_follow_up_at?: string | null;
  follow_up_note?: string | null;
  is_favorite?: boolean;
}

export async function updateLead(id: string, input: UpdateLeadInput): Promise<SalesLead> {
  const { data, error } = await supabase
    .from('sales_leads')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as SalesLead;
}

export async function updateLeadStatus(id: string, status: SalesLeadStatus): Promise<SalesLead> {
  const { data, error } = await supabase
    .from('sales_leads')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as SalesLead;
}

export async function toggleLeadFavorite(id: string, isFavorite: boolean): Promise<SalesLead> {
  const { data, error } = await supabase
    .from('sales_leads')
    .update({ is_favorite: isFavorite })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as SalesLead;
}
