import { supabase } from '@/lib/supabase/client';
import type { Notification, NotificationType, NotificationPriority } from '@/types/database';

// ─── Fetch ───────────────────────────────────────────────

/** Fetch all notifications for the current user, newest first */
export async function getMyNotifications(): Promise<Notification[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return data as Notification[];
}

/** Get unread notification count for the current user */
export async function getUnreadCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', user.id)
    .eq('is_read', false);

  if (error) { console.error('[Notifications] Count error:', error.message); return 0; }
  return count ?? 0;
}

// ─── Mark as Read ────────────────────────────────────────

/** Mark a single notification as read */
export async function markNotificationAsRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);

  if (error) throw error;
}

/** Mark all notifications as read for the current user */
export async function markAllNotificationsAsRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', user.id)
    .eq('is_read', false);

  if (error) throw error;
}

// ─── Create Notification ─────────────────────────────────

export interface CreateNotificationInput {
  recipient_id: string;
  type: NotificationType;
  title: string;
  body?: string;
  task_id?: string | null;
  investment_id?: string | null;
  priority?: NotificationPriority;
}

/** Create a notification. Silently fails if RLS blocks it. */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .insert({
      recipient_id: input.recipient_id,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      task_id: input.task_id ?? null,
      investment_id: input.investment_id ?? null,
      is_read: false,
      priority: input.priority ?? 'normal',
    });

  if (error) {
    console.error('[Notifications] Create failed:', error.message);
  }
}

// ─── Investment Unread Counts ────────────────────────────

/** Fetch unread notification counts grouped by investment_id.
 *  Returns a Map<investmentId, count>. */
export async function getUnreadCountsByInvestment(): Promise<Map<string, number>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Map();

  const { data, error } = await supabase
    .from('notifications')
    .select('investment_id')
    .eq('recipient_id', user.id)
    .eq('is_read', false)
    .not('investment_id', 'is', null);

  if (error) { console.error('[Notifications] Unread counts error:', error.message); return new Map(); }

  const counts = new Map<string, number>();
  for (const row of (data || [])) {
    const id = row.investment_id as string;
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  return counts;
}

/** Mark all unread notifications for a specific investment as read */
export async function markInvestmentNotificationsAsRead(investmentId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', user.id)
    .eq('investment_id', investmentId)
    .eq('is_read', false);

  if (error) console.error('[Notifications] Mark investment read error:', error.message);
}
