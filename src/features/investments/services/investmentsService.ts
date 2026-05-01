import { supabase } from '@/lib/supabase/client';
import type { Investment, InvestmentStatus } from '@/types/database';

// ─── Fetch ───────────────────────────────────────────────

/** Fetch all investments visible to the current user (RLS enforced) */
export async function getInvestments(): Promise<Investment[]> {
  const { data, error } = await supabase
    .from('investments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Investment[];
}

/** Fetch a single investment by ID */
export async function getInvestmentById(id: string): Promise<Investment> {
  const { data, error } = await supabase
    .from('investments')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Investment;
}

/** Fetch investments linked to a specific client */
export async function getInvestmentsByClientId(clientId: string): Promise<Investment[]> {
  const { data, error } = await supabase
    .from('investments')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Investment[];
}

// ─── Create ──────────────────────────────────────────────

export interface CreateInvestmentInput {
  name: string;
  client_name: string;
  client_phone?: string;
  client_email?: string;
  investment_address?: string;
  investment_type: string;
  status?: string;
  deposit_paid?: boolean;
  components_note?: string;
  client_id?: string;
}

/**
 * Create a new investment.
 * - Sets created_by = userId
 * - Adds creator to investment_members
 * - Logs activity
 */
export async function createInvestment(
  input: CreateInvestmentInput,
  userId: string
): Promise<Investment> {
  // 1. Insert investment
  const { data, error } = await supabase
    .from('investments')
    .insert({
      name: input.name,
      client_name: input.client_name,
      client_phone: input.client_phone || null,
      client_email: input.client_email || null,
      investment_address: input.investment_address || null,
      investment_type: input.investment_type,
      status: input.status || 'czeka_na_wplate',
      deposit_paid: input.deposit_paid ?? false,
      components_note: input.components_note || null,
      created_by: userId,
      client_id: input.client_id || null,
    })
    .select()
    .single();

  if (error) throw error;
  const investment = data as Investment;

  // 2. Add creator to investment_members
  const { error: memberError } = await supabase
    .from('investment_members')
    .insert({
      investment_id: investment.id,
      user_id: userId,
    });

  if (memberError) {
    console.error('[Investments] Failed to add creator as member:', memberError.message);
  }

  // 3. Log activity
  const { error: logError } = await supabase
    .from('activity_log')
    .insert({
      actor_id: userId,
      event_type: 'investment_created',
      entity_type: 'investment',
      entity_id: investment.id,
      investment_id: investment.id,
      metadata: {},
    });

  if (logError) {
    console.error('[Investments] Failed to log activity:', logError.message);
  }

  return investment;
}

// ─── Update ──────────────────────────────────────────────

export interface UpdateInvestmentInput {
  name?: string;
  client_name?: string;
  client_phone?: string | null;
  client_email?: string | null;
  investment_address?: string | null;
  investment_type?: string;
  status?: string;
  deposit_paid?: boolean;
  components_note?: string | null;
}

/** Update an existing investment */
export async function updateInvestment(
  id: string,
  input: UpdateInvestmentInput
): Promise<Investment> {
  const { data, error } = await supabase
    .from('investments')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Investment;
}

// ─── Update Status ───────────────────────────────────────

/** Update only the status of an investment */
export async function updateInvestmentStatus(
  id: string,
  status: InvestmentStatus
): Promise<Investment> {
  const { data, error } = await supabase
    .from('investments')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Investment;
}

// ─── Delete ──────────────────────────────────────────────

/** Delete an investment (admin only via RLS) */
export async function deleteInvestment(id: string): Promise<void> {
  const { error } = await supabase
    .from('investments')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
