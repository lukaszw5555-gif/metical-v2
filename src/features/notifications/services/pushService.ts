/**
 * pushService.ts
 * ─────────────────────────────────────────────────────────────
 * OneSignal Web Push integration layer for METICAL V2.
 *
 * • initPush()              – lazy-init the SDK (safe no-op when env missing)
 * • requestPushPermission() – ask the user for notification permission
 * • loginPushUser(userId)   – bind OneSignal external_id to the auth user
 * • logoutPushUser()        – clear external_id on sign-out
 * • getPushPermissionStatus()  – current permission state
 */

import OneSignal from 'react-onesignal';

// ─── Internal State ──────────────────────────────────────────

const APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID as string | undefined;
let initialised = false;

// ─── Public API ──────────────────────────────────────────────

/**
 * Initialise OneSignal SDK.
 * - No-ops gracefully when VITE_ONESIGNAL_APP_ID is missing.
 * - Safe to call multiple times (idempotent).
 * - Does NOT show a permission prompt automatically.
 */
export async function initPush(): Promise<void> {
  if (initialised) return;
  if (!APP_ID) {
    console.warn('[Push] VITE_ONESIGNAL_APP_ID is not set – push disabled.');
    return;
  }

  try {
    await OneSignal.init({
      appId: APP_ID,
      allowLocalhostAsSecureOrigin: true,
      // Do NOT auto-prompt – the user will click a button manually
      notifyButton: { enable: false } as Parameters<typeof OneSignal.init>[0]['notifyButton'],
    });
    initialised = true;
    console.info('[Push] OneSignal initialised.');
  } catch (err) {
    console.error('[Push] OneSignal init failed:', err);
  }
}

/**
 * Request permission from the user (native browser / PWA prompt).
 * Must call `initPush()` first.
 */
export async function requestPushPermission(): Promise<void> {
  if (!initialised) {
    console.warn('[Push] SDK not initialised – call initPush() first.');
    return;
  }

  try {
    await OneSignal.Slidedown.promptPush();
  } catch (err) {
    console.error('[Push] Permission request failed:', err);
  }
}

/**
 * Bind OneSignal subscription to the authenticated user.
 * Uses the modern v5 User Model `login()` which sets external_id.
 */
export async function loginPushUser(userId: string): Promise<void> {
  if (!initialised) return;

  try {
    await OneSignal.login(userId);
    console.info('[Push] User linked:', userId);
  } catch (err) {
    console.error('[Push] loginPushUser failed:', err);
  }
}

/**
 * Unlink the user on sign-out (returns to anonymous subscription).
 */
export async function logoutPushUser(): Promise<void> {
  if (!initialised) return;

  try {
    await OneSignal.logout();
    console.info('[Push] User unlinked.');
  } catch (err) {
    console.error('[Push] logoutPushUser failed:', err);
  }
}

/**
 * Return the current push permission status.
 * Possible values: 'granted' | 'denied' | 'default' | 'unavailable'
 */
export type PushPermissionStatus = 'granted' | 'denied' | 'default' | 'unavailable';

export async function getPushPermissionStatus(): Promise<PushPermissionStatus> {
  if (!initialised || !APP_ID) return 'unavailable';

  try {
    const permission = await OneSignal.Notifications.permission;
    // OneSignal returns a boolean for `.permission`
    if (permission === true) return 'granted';

    // Fall back to native API for finer state
    if ('Notification' in window) {
      return Notification.permission as PushPermissionStatus;
    }
    return 'default';
  } catch {
    return 'unavailable';
  }
}

// ─── Subscription Info ───────────────────────────────────────

export interface OneSignalSubscriptionInfo {
  subscriptionId: string | null;
  userId: string | null;
}

/**
 * Get the current OneSignal Subscription ID and User ID from the SDK.
 * These are needed to save to our push_subscriptions table for
 * direct targeting via include_subscription_ids.
 */
export async function getOneSignalSubscriptionInfo(): Promise<OneSignalSubscriptionInfo> {
  if (!initialised || !APP_ID) {
    return { subscriptionId: null, userId: null };
  }

  try {
    // OneSignal Web SDK v5 User Model
    const subscriptionId = OneSignal.User.PushSubscription.id ?? null;
    const userId = OneSignal.User.onesignalId ?? null;

    console.info('[Push] Subscription info:', { subscriptionId, userId });
    return { subscriptionId, userId };
  } catch (err) {
    console.error('[Push] Failed to get subscription info:', err);
    return { subscriptionId: null, userId: null };
  }
}

