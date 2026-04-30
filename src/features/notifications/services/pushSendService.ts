/**
 * pushSendService.ts
 * ─────────────────────────────────────────────────────────────
 * Frontend service that calls the Supabase Edge Function
 * `send-push` to deliver a Web Push via OneSignal.
 *
 * This is fire-and-forget: failures are logged but never crash
 * the app. The in-app notification in the `notifications` table
 * remains the source of truth.
 *
 * IMPORTANT: This service does NOT check the sender's local push
 * permission. An admin without push enabled can still send pushes
 * to operators who do have push enabled. The Edge Function handles
 * delivery via OneSignal server-side.
 */

import { supabase } from '@/lib/supabase/client';

// ─── Types ───────────────────────────────────────────────

export interface PushNotificationPayload {
  recipientId: string;
  title: string;
  body: string;
  url?: string;
  priority?: 'normal' | 'critical';
}

// ─── Production API ──────────────────────────────────────

/**
 * Send a push notification through the Edge Function.
 *
 * - Skips if recipientId is empty/undefined.
 * - Skips if the caller is sending to themselves.
 * - Does NOT depend on the sender's push permission status.
 * - Silently catches all errors (console.warn in dev).
 * - Returns `true` if the push was accepted, `false` otherwise.
 */
export async function sendPushNotification(
  payload: PushNotificationPayload
): Promise<boolean> {
  try {
    // Guard: no recipient
    if (!payload.recipientId) {
      console.warn('[PushSend] No recipientId — skipping.');
      return false;
    }

    // Guard: don't push to yourself
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id === payload.recipientId) {
      return false;
    }

    // If no session at all, the Edge Function will return 401 anyway
    if (!session) {
      console.warn('[PushSend] No active session — push will be rejected by Edge Function.');
      return false;
    }

    console.info('[PushSend] Sending push:', {
      recipientId: payload.recipientId,
      title: payload.title,
      priority: payload.priority ?? 'normal',
    });

    const { data, error } = await supabase.functions.invoke('send-push', {
      body: {
        recipientId: payload.recipientId,
        title: payload.title,
        body: payload.body,
        url: payload.url,
        priority: payload.priority ?? 'normal',
      },
    });

    if (error) {
      console.warn('[PushSend] Edge Function error:', error.message);
      return false;
    }

    if (data?.success) {
      const recipients = data?.onesignal?.recipients ?? '?';
      console.info(`[PushSend] Push accepted: "${payload.title}" -> recipients=${recipients}`);
      return true;
    }

    console.warn('[PushSend] Unexpected response:', JSON.stringify(data));
    return false;
  } catch (err) {
    console.warn('[PushSend] Failed (non-critical):', err);
    return false;
  }
}

// ─── Debug API ───────────────────────────────────────────

/**
 * Debug: send a test push using alternative targeting.
 * Exposed on window.__debugSendPush for console access.
 *
 * Usage from browser console (must be logged in):
 *
 *   // TEST 1: By Subscription ID (bypasses external_id)
 *   window.__debugSendPush({ debugSubscriptionId: "8fa67f2c-4df0-4e4b-9cd4-f47f3db0e853" })
 *
 *   // TEST 2: By OneSignal ID
 *   window.__debugSendPush({ debugOneSignalId: "ONESIGNAL-USER-ID" })
 *
 *   // TEST 3: By External ID (production mode)
 *   window.__debugSendPush({ recipientId: "9012ec6c-b061-45ff-be1b-c96018f5b251" })
 *
 * If TEST 1 delivers but TEST 3 doesn't → external_id mapping issue.
 */
export async function debugSendPush(opts: {
  title?: string;
  body?: string;
  debugSubscriptionId?: string;
  debugOneSignalId?: string;
  recipientId?: string;
}): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke('send-push', {
    body: {
      recipientId: opts.recipientId ?? 'debug-placeholder',
      title: opts.title ?? 'DEBUG Push Test',
      body: opts.body ?? 'Test push z debugSendPush()',
      debugSubscriptionId: opts.debugSubscriptionId,
      debugOneSignalId: opts.debugOneSignalId,
    },
  });

  if (error) {
    console.error('[DebugPush] Error:', error);
    return { error };
  }

  console.log('[DebugPush] Response:', JSON.stringify(data, null, 2));
  return data;
}

// Expose debug function on window for console access
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__debugSendPush = debugSendPush;
}
