-- ============================================================
-- METICAL V2 — Migration 011: PV Offers
--
-- Sprint Offers 1: Moduł Oferta Fotowoltaika MVP
-- ============================================================

-- ─── 1. TABLE: pv_offers ────────────────────────────────

CREATE TABLE public.pv_offers (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_number          text,

  -- Relations
  lead_id               uuid REFERENCES public.sales_leads(id),
  client_id             uuid REFERENCES public.clients(id),
  created_by            uuid NOT NULL REFERENCES public.profiles(id),
  assigned_to           uuid REFERENCES public.profiles(id),

  -- Customer snapshot
  customer_name         text NOT NULL,
  customer_phone        text,
  customer_email        text,
  customer_city         text,
  investment_address    text,

  -- Installation parameters
  pv_power_kw           numeric NOT NULL,
  panel_power_w         integer,
  panel_count           integer,
  inverter_name         text,
  structure_type        text,
  roof_type             text,
  installation_type     text,
  annual_production_kwh numeric,

  -- Pricing
  price_net             numeric NOT NULL DEFAULT 0,
  vat_rate              numeric NOT NULL DEFAULT 8,
  price_gross           numeric NOT NULL DEFAULT 0,
  margin_value          numeric,
  margin_percent        numeric,

  -- Content
  offer_note            text,
  internal_note         text,

  -- Status
  status                text NOT NULL DEFAULT 'draft',

  -- Dates
  valid_until           date,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT pv_offers_status_check CHECK (
    status IN ('draft', 'sent', 'accepted', 'rejected')
  )
);

ALTER TABLE public.pv_offers ENABLE ROW LEVEL SECURITY;

-- ─── 2. TRIGGER: updated_at ─────────────────────────────

CREATE TRIGGER pv_offers_updated_at
  BEFORE UPDATE ON public.pv_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ─── 3. INDEXES ─────────────────────────────────────────

CREATE INDEX idx_pv_offers_lead_id ON public.pv_offers(lead_id);
CREATE INDEX idx_pv_offers_client_id ON public.pv_offers(client_id);
CREATE INDEX idx_pv_offers_created_by ON public.pv_offers(created_by);
CREATE INDEX idx_pv_offers_assigned_to ON public.pv_offers(assigned_to);
CREATE INDEX idx_pv_offers_status ON public.pv_offers(status);
CREATE INDEX idx_pv_offers_created_at ON public.pv_offers(created_at);

-- ─── 4. HELPER: can_see_pv_offer() ─────────────────────

CREATE OR REPLACE FUNCTION public.can_see_pv_offer(_offer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pv_offers o
    WHERE o.id = _offer_id
      AND (
        public.is_admin_or_administracja()
        OR o.created_by = auth.uid()
        OR o.assigned_to = auth.uid()
        OR (o.lead_id IS NOT NULL AND public.can_see_lead(o.lead_id))
        OR (o.client_id IS NOT NULL AND public.can_see_client(o.client_id))
      )
  );
$$;

-- ─── 5. RLS POLICIES ───────────────────────────────────

-- SELECT
CREATE POLICY "pv_offers_select"
  ON public.pv_offers FOR SELECT TO authenticated
  USING (
    public.is_admin_or_administracja()
    OR created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR (lead_id IS NOT NULL AND public.can_see_lead(lead_id))
    OR (client_id IS NOT NULL AND public.can_see_client(client_id))
  );

-- INSERT
CREATE POLICY "pv_offers_insert"
  ON public.pv_offers FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_user()
    AND created_by = auth.uid()
    AND (
      lead_id IS NULL
      OR public.can_see_lead(lead_id)
    )
    AND (
      client_id IS NULL
      OR public.can_see_client(client_id)
    )
  );

-- UPDATE
CREATE POLICY "pv_offers_update"
  ON public.pv_offers FOR UPDATE TO authenticated
  USING (
    public.is_admin_or_administracja()
    OR created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR (lead_id IS NOT NULL AND public.can_see_lead(lead_id))
    OR (client_id IS NOT NULL AND public.can_see_client(client_id))
  )
  WITH CHECK (
    public.is_admin_or_administracja()
    OR created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR (lead_id IS NOT NULL AND public.can_see_lead(lead_id))
    OR (client_id IS NOT NULL AND public.can_see_client(client_id))
  );

-- DELETE: admin only
CREATE POLICY "pv_offers_delete"
  ON public.pv_offers FOR DELETE TO authenticated
  USING (public.is_admin());

-- ============================================================
-- DONE. No changes to existing tables or RLS policies.
-- ============================================================
