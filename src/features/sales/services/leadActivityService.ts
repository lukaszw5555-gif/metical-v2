import { supabase } from '@/lib/supabase/client';

export interface LeadActivityEntry {
  id: string;
  lead_id: string;
  actor_id: string;
  event_type: string;
  body: string;
  created_at: string;
}

export async function getLeadActivity(leadId: string): Promise<LeadActivityEntry[]> {
  const { data, error } = await supabase
    .from('lead_activity_log')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as LeadActivityEntry[];
}

export async function logLeadActivity(
  leadId: string, actorId: string, eventType: string, body: string
): Promise<void> {
  const { error } = await supabase
    .from('lead_activity_log')
    .insert({ lead_id: leadId, actor_id: actorId, event_type: eventType, body });
  if (error) console.error('[LeadActivity] insert failed:', error.message);
}
