import { supabase } from '@/lib/supabase/client';
import type { ActivityLogEntry, ActivityEventType, ActivityEntityType } from '@/types/database';

// ─── Fetch Activity ──────────────────────────────────────

/** Fetch activity log for a specific task */
export async function fetchTaskActivity(taskId: string): Promise<ActivityLogEntry[]> {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as ActivityLogEntry[];
}

/** Fetch activity log for a specific investment */
export async function fetchInvestmentActivity(investmentId: string): Promise<ActivityLogEntry[]> {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('investment_id', investmentId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as ActivityLogEntry[];
}

// ─── Create Activity Entry ───────────────────────────────

export interface CreateActivityInput {
  event_type: ActivityEventType;
  entity_type: ActivityEntityType;
  entity_id: string;
  task_id?: string;
  investment_id?: string;
  body?: string;
  metadata?: Record<string, unknown>;
}

/** Log a new activity entry */
export async function logActivity(
  actorId: string,
  input: CreateActivityInput
): Promise<void> {
  const { error } = await supabase
    .from('activity_log')
    .insert({
      actor_id: actorId,
      event_type: input.event_type,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      task_id: input.task_id ?? null,
      investment_id: input.investment_id ?? null,
      body: input.body ?? null,
      metadata: input.metadata ?? {},
    });

  if (error) throw error;
}
