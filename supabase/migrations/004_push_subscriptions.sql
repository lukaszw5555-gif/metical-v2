-- ============================================================
-- METICAL V2 — Migration 004: push_subscriptions
-- ============================================================
-- Stores OneSignal subscription IDs per user so we can target
-- push notifications via include_subscription_ids instead of
-- relying on external_id mapping.
-- ============================================================

-- 1. Create table
CREATE TABLE public.push_subscriptions (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  onesignal_subscription_id text NOT NULL,
  onesignal_user_id         text,
  platform                  text,
  device_label              text,
  is_active                 boolean NOT NULL DEFAULT true,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.push_subscriptions IS 'OneSignal push subscription IDs per user for direct targeting';

-- 2. Unique constraint — one subscription per user+device
CREATE UNIQUE INDEX uq_push_sub_user_subscription
  ON public.push_subscriptions(user_id, onesignal_subscription_id);

-- 3. Index for lookups by user
CREATE INDEX idx_push_sub_user_active
  ON public.push_subscriptions(user_id)
  WHERE is_active = true;

-- 4. Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Users can read their own subscriptions
CREATE POLICY "Users can read own push subscriptions"
  ON public.push_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admin can read all subscriptions
CREATE POLICY "Admin can read all push subscriptions"
  ON public.push_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can insert their own subscriptions
CREATE POLICY "Users can insert own push subscriptions"
  ON public.push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own subscriptions
CREATE POLICY "Users can update own push subscriptions"
  ON public.push_subscriptions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Delete: owner or admin
CREATE POLICY "Owner can delete own push subscriptions"
  ON public.push_subscriptions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin can delete any push subscription"
  ON public.push_subscriptions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 6. Auto-update updated_at (reuses existing trigger function)
CREATE TRIGGER push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 7. Service-role policy for Edge Functions
-- Edge Functions use the service_role key to read subscriptions
-- for ANY user when sending push notifications.
-- We need to ensure the function can query by recipientId.
-- Since service_role bypasses RLS, no extra policy is needed here,
-- but we document this for clarity.
COMMENT ON POLICY "Users can read own push subscriptions" ON public.push_subscriptions
  IS 'Users read own subs; Edge Function uses service_role to read any user subs';
