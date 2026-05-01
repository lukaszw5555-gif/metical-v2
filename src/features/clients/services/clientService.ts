import { supabase } from '@/lib/supabase/client';

export interface Client {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  address: string | null;
  source: string | null;
  created_from_lead_id: string | null;
  created_by: string;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateClientInput {
  full_name: string;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  address?: string | null;
  source?: string | null;
  created_from_lead_id?: string | null;
  assigned_to?: string | null;
  notes?: string | null;
}

export interface UpdateClientInput {
  full_name?: string;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  address?: string | null;
  source?: string | null;
  assigned_to?: string | null;
  notes?: string | null;
}

export async function getClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as Client[];
}

export async function getClientById(id: string): Promise<Client> {
  const { data, error } = await supabase
    .from('clients').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Client;
}

export async function createClient(input: CreateClientInput, userId: string): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .insert({ ...input, created_by: userId })
    .select().single();
  if (error) throw error;
  return data as Client;
}

export async function updateClient(id: string, input: UpdateClientInput): Promise<Client> {
  const { data, error } = await supabase
    .from('clients').update(input).eq('id', id).select().single();
  if (error) throw error;
  return data as Client;
}
