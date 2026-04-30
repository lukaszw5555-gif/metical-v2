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

// ─── Public API ──────────────────────────────────────────

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
