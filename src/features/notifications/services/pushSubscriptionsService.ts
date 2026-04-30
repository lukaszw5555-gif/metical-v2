/**
 * pushSubscriptionsService.ts
 * ─────────────────────────────────────────────────────────────
 * CRUD for the push_subscriptions table.
 * Stores OneSignal subscription IDs so the Edge Function can
 * target users via include_subscription_ids.
 */

import { supabase } from '@/lib/supabase/client';

// ─── Types ───────────────────────────────────────────────

export interface PushSubscription {
  id: string;
  user_id: string;
  onesignal_subscription_id: string;
  onesignal_user_id: string | null;
  platform: string | null;
  device_label: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpsertPushSubscriptionInput {
  user_id: string;
  onesignal_subscription_id: string;
  onesignal_user_id?: string | null;
  platform?: string | null;
  device_label?: string | null;
  is_active?: boolean;
}

// ─── Public API ──────────────────────────────────────────

/**
 * Upsert a push subscription for the current user.
 * Uses the unique(user_id, onesignal_subscription_id) constraint
 * to update if already exists.
 */
export async function upsertPushSubscription(
  input: UpsertPushSubscriptionInput
): Promise<void> {
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: input.user_id,
        onesignal_subscription_id: input.onesignal_subscription_id,
        onesignal_user_id: input.onesignal_user_id ?? null,
        platform: input.platform ?? null,
        device_label: input.device_label ?? null,
        is_active: input.is_active ?? true,
      },
      {
        onConflict: 'user_id,onesignal_subscription_id',
      }
    );

  if (error) {
    console.error('[PushSubs] Upsert failed:', error.message);
    throw error;
  }

  console.info('[PushSubs] Subscription saved:', input.onesignal_subscription_id);
}

/**
 * Get all push subscriptions for the current user.
 */
export async function getMyPushSubscriptions(): Promise<PushSubscription[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[PushSubs] Fetch failed:', error.message);
    return [];
  }

  return data as PushSubscription[];
}
