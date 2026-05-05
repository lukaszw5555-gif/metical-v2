import { supabase } from '@/lib/supabase/client';
import type { SalesLead, UserProfile } from '@/types/database';

// ─── Fetch all leads for admin drum ─────────────────────

export async function getAllLeadDrumLeads(): Promise<SalesLead[]> {
  const { data, error } = await supabase
    .from('sales_leads')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as SalesLead[];
}

// ─── Update qualification fields ────────────────────────

export async function updateLeadQualification(
  leadId: string,
  fields: {
    qualification_status?: string;
    lead_quality?: string | null;
  }
): Promise<SalesLead> {
  const { data, error } = await supabase
    .from('sales_leads')
    .update(fields)
    .eq('id', leadId)
    .select()
    .single();
  if (error) throw error;
  return data as SalesLead;
}

// ─── Assign lead to user ────────────────────────────────

export async function assignLeadToUser(
  leadId: string,
  assignedUserId: string | null,
  assignedByUserId: string
): Promise<SalesLead> {
  const now = assignedUserId ? new Date().toISOString() : null;
  const updates: Record<string, unknown> = {
    assigned_user_id: assignedUserId,
    assigned_at: now,
    assigned_by: assignedUserId ? assignedByUserId : null,
  };
  // Auto-set qualification_status to 'assigned' when assigning
  if (assignedUserId) {
    // Only update qualification_status if it's currently 'new' or 'to_review'
    const { data: current } = await supabase
      .from('sales_leads')
      .select('qualification_status')
      .eq('id', leadId)
      .single();
    if (current && (current.qualification_status === 'new' || current.qualification_status === 'to_review')) {
      updates.qualification_status = 'assigned';
    }
  }
  const { data, error } = await supabase
    .from('sales_leads')
    .update(updates)
    .eq('id', leadId)
    .select()
    .single();
  if (error) throw error;
  return data as SalesLead;
}

// ─── Get assignable users ───────────────────────────────

export async function getAssignableUsers(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_active', true)
    .order('full_name', { ascending: true });
  if (error) throw error;
  return data as UserProfile[];
}
