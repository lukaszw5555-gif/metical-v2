import { supabase } from '@/lib/supabase/client';
import type { LeadComment } from '@/types/database';

export async function getLeadComments(leadId: string): Promise<LeadComment[]> {
  const { data, error } = await supabase
    .from('lead_comments')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as LeadComment[];
}

export async function addLeadComment(
  leadId: string, body: string, authorId: string
): Promise<LeadComment> {
  const { data, error } = await supabase
    .from('lead_comments')
    .insert({ lead_id: leadId, author_id: authorId, body })
    .select()
    .single();
  if (error) throw error;
  return data as LeadComment;
}
