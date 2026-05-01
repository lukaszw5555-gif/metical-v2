-- ============================================================
-- METICAL V2 — Migration 007: Sales Leads + Lead Comments
--
-- Sprint Sales 1: Adds sales_leads and lead_comments tables
-- with full RLS policies per role.
-- ============================================================

-- ─── 1. HELPER: is_admin_or_administracja() ─────────────

CREATE OR REPLACE FUNCTION public.is_admin_or_administracja()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND is_active = true
      AND role IN ('admin', 'administracja')
  );
$$;

COMMENT ON FUNCTION public.is_admin_or_administracja()
  IS 'Returns true if the current user is admin or administracja';


-- ─── 2. TABLE: sales_leads ──────────────────────────────

CREATE TABLE public.sales_leads (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name             text NOT NULL,
  phone                 text NOT NULL,
  email                 text,
  city                  text,
  source                text NOT NULL DEFAULT 'manual',
  service_type          text,
  qualification_note    text,
  status                text NOT NULL DEFAULT 'new'
                        CONSTRAINT sales_leads_status_check
                        CHECK (status IN ('new', 'follow_up', 'offered', 'won', 'lost')),
  is_favorite           boolean NOT NULL DEFAULT false,
  primary_assigned_to   uuid REFERENCES public.profiles(id),
  secondary_assigned_to uuid REFERENCES public.profiles(id),
  created_by            uuid NOT NULL REFERENCES public.profiles(id),
  next_follow_up_at     timestamptz,
  follow_up_note        text,
  converted_client_id   uuid,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT sales_leads_source_check
    CHECK (source IN ('website', 'facebook_ads', 'manual'))
);

ALTER TABLE public.sales_leads ENABLE ROW LEVEL SECURITY;

-- Auto-update updated_at (reuse function from 001)
CREATE TRIGGER sales_leads_updated_at
  BEFORE UPDATE ON public.sales_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Indexes
CREATE INDEX idx_sales_leads_status ON public.sales_leads(status);
CREATE INDEX idx_sales_leads_source ON public.sales_leads(source);
CREATE INDEX idx_sales_leads_created_by ON public.sales_leads(created_by);
CREATE INDEX idx_sales_leads_primary_assigned ON public.sales_leads(primary_assigned_to);
CREATE INDEX idx_sales_leads_secondary_assigned ON public.sales_leads(secondary_assigned_to);
CREATE INDEX idx_sales_leads_follow_up ON public.sales_leads(next_follow_up_at);


-- ─── 3. TABLE: lead_comments ────────────────────────────

CREATE TABLE public.lead_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     uuid NOT NULL REFERENCES public.sales_leads(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES public.profiles(id),
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_comments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_lead_comments_lead_id ON public.lead_comments(lead_id);


-- ─── 4. RLS: sales_leads ────────────────────────────────

-- Helper: can current user see this lead?
CREATE OR REPLACE FUNCTION public.can_see_lead(_lead_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sales_leads sl
    WHERE sl.id = _lead_id
      AND (
        public.is_admin_or_administracja()
        OR sl.created_by = auth.uid()
        OR sl.primary_assigned_to = auth.uid()
        OR sl.secondary_assigned_to = auth.uid()
      )
  );
$$;

-- SELECT: admin/administracja see all; operator sees own + assigned
CREATE POLICY "sales_leads_select"
  ON public.sales_leads FOR SELECT TO authenticated
  USING (
    public.is_admin_or_administracja()
    OR created_by = auth.uid()
    OR primary_assigned_to = auth.uid()
    OR secondary_assigned_to = auth.uid()
  );

-- INSERT: any active user, must own created_by
CREATE POLICY "sales_leads_insert"
  ON public.sales_leads FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user() AND created_by = auth.uid());

-- UPDATE: admin/administracja update all; operator updates own + assigned
CREATE POLICY "sales_leads_update"
  ON public.sales_leads FOR UPDATE TO authenticated
  USING (
    public.is_admin_or_administracja()
    OR created_by = auth.uid()
    OR primary_assigned_to = auth.uid()
    OR secondary_assigned_to = auth.uid()
  )
  WITH CHECK (
    public.is_admin_or_administracja()
    OR created_by = auth.uid()
    OR primary_assigned_to = auth.uid()
    OR secondary_assigned_to = auth.uid()
  );

-- DELETE: admin only
CREATE POLICY "sales_leads_delete"
  ON public.sales_leads FOR DELETE TO authenticated
  USING (public.is_admin());


-- ─── 5. RLS: lead_comments ──────────────────────────────

-- SELECT: can see comments if can see lead
CREATE POLICY "lead_comments_select"
  ON public.lead_comments FOR SELECT TO authenticated
  USING (public.can_see_lead(lead_id));

-- INSERT: can comment if can see lead, must own author_id
CREATE POLICY "lead_comments_insert"
  ON public.lead_comments FOR INSERT TO authenticated
  WITH CHECK (public.can_see_lead(lead_id) AND author_id = auth.uid());

-- DELETE: admin only
CREATE POLICY "lead_comments_delete"
  ON public.lead_comments FOR DELETE TO authenticated
  USING (public.is_admin());


-- ============================================================
-- DONE. No changes to existing tables or policies.
-- ============================================================
