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
 *
 * IMPORTANT: A single OneSignal subscription ID (browser/device) can
 * only be active for ONE user at a time. Before upserting, we deactivate
 * any existing records with the same onesignal_subscription_id that
 * belong to other users. This handles the case where a device was
 * previously used by a different user.
 */
export async function upsertPushSubscription(
  input: UpsertPushSubscriptionInput
): Promise<void> {
  // Step 1: Deactivate this subscription_id for ALL other users
  const { error: deactivateError } = await supabase
    .from('push_subscriptions')
    .update({ is_active: false })
    .eq('onesignal_subscription_id', input.onesignal_subscription_id)
    .neq('user_id', input.user_id);

  if (deactivateError) {
    // Non-critical: RLS may block updating other users' rows.
    // The Edge Function uses service_role so stale records won't
    // cause wrong delivery — they'll just be inactive or belong
    // to the old user. Log and continue.
    console.warn('[PushSubs] Deactivate other users failed (may be RLS):', deactivateError.message);
  }

  // Step 2: Upsert the current user's record
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: input.user_id,
        onesignal_subscription_id: input.onesignal_subscription_id,
        onesignal_user_id: input.onesignal_user_id ?? null,
        platform: input.platform ?? null,
        device_label: input.device_label ?? null,
        is_active: true,
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
