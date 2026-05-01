-- ============================================================
-- METICAL V2 — Migration 009: Clients + Client Comments
--
-- Sprint Sales 3: Client database + lead conversion
-- ============================================================

-- ─── 1. TABLE: clients ──────────────────────────────────

CREATE TABLE public.clients (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name           text NOT NULL,
  phone               text,
  email               text,
  city                text,
  address             text,
  source              text,
  created_from_lead_id uuid REFERENCES public.sales_leads(id),
  created_by          uuid NOT NULL REFERENCES public.profiles(id),
  assigned_to         uuid REFERENCES public.profiles(id),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_clients_full_name ON public.clients(full_name);
CREATE INDEX idx_clients_phone ON public.clients(phone);
CREATE INDEX idx_clients_created_by ON public.clients(created_by);
CREATE INDEX idx_clients_assigned_to ON public.clients(assigned_to);
CREATE INDEX idx_clients_created_from_lead ON public.clients(created_from_lead_id);

-- ─── 2. HELPER: can_see_client() ────────────────────────

CREATE OR REPLACE FUNCTION public.can_see_client(_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = _client_id
      AND (
        public.is_admin_or_administracja()
        OR c.created_by = auth.uid()
        OR c.assigned_to = auth.uid()
      )
  );
$$;

-- ─── 3. TABLE: client_comments ──────────────────────────

CREATE TABLE public.client_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES public.profiles(id),
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_comments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_client_comments_client_id ON public.client_comments(client_id);

-- ─── 4. RLS: clients ────────────────────────────────────

-- SELECT
CREATE POLICY "clients_select"
  ON public.clients FOR SELECT TO authenticated
  USING (
    public.is_admin_or_administracja()
    OR created_by = auth.uid()
    OR assigned_to = auth.uid()
  );

-- INSERT
CREATE POLICY "clients_insert"
  ON public.clients FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_user()
    AND created_by = auth.uid()
    AND (
      created_from_lead_id IS NULL
      OR public.can_see_lead(created_from_lead_id)
    )
  );

-- UPDATE
CREATE POLICY "clients_update"
  ON public.clients FOR UPDATE TO authenticated
  USING (
    public.is_admin_or_administracja()
    OR created_by = auth.uid()
    OR assigned_to = auth.uid()
  )
  WITH CHECK (
    public.is_admin_or_administracja()
    OR created_by = auth.uid()
    OR assigned_to = auth.uid()
  );

-- DELETE: admin only
CREATE POLICY "clients_delete"
  ON public.clients FOR DELETE TO authenticated
  USING (public.is_admin());

-- ─── 5. RLS: client_comments ────────────────────────────

CREATE POLICY "client_comments_select"
  ON public.client_comments FOR SELECT TO authenticated
  USING (public.can_see_client(client_id));

CREATE POLICY "client_comments_insert"
  ON public.client_comments FOR INSERT TO authenticated
  WITH CHECK (public.can_see_client(client_id) AND author_id = auth.uid());

CREATE POLICY "client_comments_delete"
  ON public.client_comments FOR DELETE TO authenticated
  USING (public.is_admin());

-- ============================================================
-- DONE. No changes to existing tables.
-- ============================================================
