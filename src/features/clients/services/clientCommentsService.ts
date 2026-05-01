import { supabase } from '@/lib/supabase/client';

export interface ClientComment {
  id: string;
  client_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export async function getClientComments(clientId: string): Promise<ClientComment[]> {
  const { data, error } = await supabase
    .from('client_comments').select('*').eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as ClientComment[];
}

export async function addClientComment(clientId: string, body: string, authorId: string): Promise<ClientComment> {
  const { data, error } = await supabase
    .from('client_comments')
    .insert({ client_id: clientId, author_id: authorId, body })
    .select().single();
  if (error) throw error;
  return data as ClientComment;
}
