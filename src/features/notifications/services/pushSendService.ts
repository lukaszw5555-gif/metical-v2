/**
 * pushSendService.ts
 * ─────────────────────────────────────────────────────────────
 * Frontend service that calls the Supabase Edge Function
 * `send-push` to deliver a Web Push via OneSignal.
 *
 * This is fire-and-forget: failures are logged but never crash
 * the app. The in-app notification in the `notifications` table
 * remains the source of truth.
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
 * - Silently no-ops if the user is sending to themselves.
 * - Silently catches all errors (console.warn in dev).
 * - Returns `true` if the push was accepted, `false` otherwise.
 */
export async function sendPushNotification(
  payload: PushNotificationPayload
): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    // Don't push to yourself
    if (session?.user?.id === payload.recipientId) {
      return false;
    }

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
      console.info('[PushSend] Push delivered:', payload.title);
      return true;
    }

    console.warn('[PushSend] Unexpected response:', data);
    return false;
  } catch (err) {
    console.warn('[PushSend] Failed (non-critical):', err);
    return false;
  }
}
