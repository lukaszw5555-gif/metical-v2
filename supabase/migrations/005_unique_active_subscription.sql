-- ============================================================
-- METICAL V2 — Migration 005: unique active subscription
-- ============================================================
-- Ensures a single onesignal_subscription_id can only be active
-- for ONE user at a time. If the same browser/device switches
-- users, the old record must be deactivated first (handled by
-- the frontend pushSubscriptionsService before upserting).
-- ============================================================

-- Partial unique index: only one active row per subscription_id
CREATE UNIQUE INDEX uq_push_sub_active_subscription
  ON public.push_subscriptions(onesignal_subscription_id)
  WHERE is_active = true;
