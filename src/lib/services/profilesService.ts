import { supabase } from '@/lib/supabase/client';
import type { UserProfile } from '@/types/database';

/** Fetch all active user profiles (for assignment dropdowns etc.) */
export async function getActiveProfiles(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_active', true)
    .order('full_name', { ascending: true });

  if (error) throw error;
  return data as UserProfile[];
}
