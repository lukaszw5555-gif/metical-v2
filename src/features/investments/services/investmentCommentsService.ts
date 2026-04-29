import { supabase } from '@/lib/supabase/client';
import type { InvestmentComment } from '@/types/database';

// ─── Fetch Comments ──────────────────────────────────────

/** Fetch all comments for an investment, oldest first */
export async function getInvestmentComments(
  investmentId: string
): Promise<InvestmentComment[]> {
  const { data, error } = await supabase
    .from('investment_comments')
    .select('*')
    .eq('investment_id', investmentId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as InvestmentComment[];
}

// ─── Add Comment ─────────────────────────────────────────

/** Add a comment to an investment */
export async function addInvestmentComment(
  investmentId: string,
  body: string,
  authorId: string
): Promise<InvestmentComment> {
  const { data, error } = await supabase
    .from('investment_comments')
    .insert({
      investment_id: investmentId,
      author_id: authorId,
      body,
    })
    .select()
    .single();

  if (error) throw error;
  return data as InvestmentComment;
}
