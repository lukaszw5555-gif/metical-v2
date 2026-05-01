-- ============================================================
-- METICAL V2 — Migration 008: Lead Activity Log
--
-- Sprint Sales 1.1: Separate activity log for lead history.
-- ============================================================

CREATE TABLE public.lead_activity_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     uuid NOT NULL REFERENCES public.sales_leads(id) ON DELETE CASCADE,
  actor_id    uuid NOT NULL REFERENCES public.profiles(id),
  event_type  text NOT NULL
              CONSTRAINT lead_activity_log_event_type_check
              CHECK (event_type IN (
                'lead_created', 'lead_status_changed', 'lead_followup_changed',
                'lead_comment_added', 'lead_favorite_changed', 'lead_updated',
                'lead_assignment_changed'
              )),
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_activity_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_lead_activity_log_lead_id ON public.lead_activity_log(lead_id);

-- SELECT: visible if user can see the lead
CREATE POLICY "lead_activity_log_select"
  ON public.lead_activity_log FOR SELECT TO authenticated
  USING (public.can_see_lead(lead_id));

-- INSERT: can add if user can see the lead, must own actor_id
CREATE POLICY "lead_activity_log_insert"
  ON public.lead_activity_log FOR INSERT TO authenticated
  WITH CHECK (public.can_see_lead(lead_id) AND actor_id = auth.uid());

-- No DELETE policy for non-admins; admin only
CREATE POLICY "lead_activity_log_delete"
  ON public.lead_activity_log FOR DELETE TO authenticated
  USING (public.is_admin());

-- ============================================================
-- DONE. No changes to existing tables.
-- ============================================================
