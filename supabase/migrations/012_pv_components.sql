-- ============================================================
-- METICAL V2 — Migration 012: PV Components Catalog
--
-- Sprint PV-Components 1: Katalog komponentów PV
-- ============================================================

-- ─── 1. TABLE: pv_components ────────────────────────────

CREATE TABLE public.pv_components (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Classification
  category          text NOT NULL,
  manufacturer      text,
  model             text,
  trade_name        text NOT NULL,
  unit              text NOT NULL DEFAULT 'szt.',

  -- Parameters
  param1            text,
  param2            text,
  description       text,
  power_w           numeric,
  capacity_kwh      numeric,

  -- Pricing
  purchase_price    numeric NOT NULL DEFAULT 0,
  selling_price     numeric NOT NULL DEFAULT 0,
  vat_rate          numeric NOT NULL DEFAULT 23,

  -- State
  active            boolean NOT NULL DEFAULT true,
  notes             text,

  -- Audit
  created_by        uuid NOT NULL REFERENCES public.profiles(id),
  updated_by        uuid REFERENCES public.profiles(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT pv_components_category_check CHECK (
    category IN (
      'Falowniki',
      'Magazyny energii',
      'Moduły fotowoltaiczne',
      'Akcesoria montażowe',
      'Konstrukcje montażowe',
      'Dodatkowe usługi',
      'SIG'
    )
  ),
  CONSTRAINT pv_components_purchase_price_check CHECK (purchase_price >= 0),
  CONSTRAINT pv_components_selling_price_check CHECK (selling_price >= 0),
  CONSTRAINT pv_components_vat_rate_check CHECK (vat_rate >= 0),
  CONSTRAINT pv_components_power_w_check CHECK (power_w IS NULL OR power_w >= 0),
  CONSTRAINT pv_components_capacity_kwh_check CHECK (capacity_kwh IS NULL OR capacity_kwh >= 0)
);

ALTER TABLE public.pv_components ENABLE ROW LEVEL SECURITY;

-- ─── 2. TRIGGER: updated_at ─────────────────────────────

CREATE TRIGGER pv_components_updated_at
  BEFORE UPDATE ON public.pv_components
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ─── 3. INDEXES ─────────────────────────────────────────

CREATE INDEX idx_pv_components_category ON public.pv_components(category);
CREATE INDEX idx_pv_components_active ON public.pv_components(active);
CREATE INDEX idx_pv_components_created_by ON public.pv_components(created_by);
CREATE INDEX idx_pv_components_trade_name ON public.pv_components(trade_name);

-- ─── 4. RLS POLICIES ───────────────────────────────────

-- SELECT: admin/administracja see all; operator sees only active
CREATE POLICY "pv_components_select"
  ON public.pv_components FOR SELECT TO authenticated
  USING (
    public.is_admin_or_administracja()
    OR (public.is_active_user() AND active = true)
  );

-- INSERT: admin/administracja only
CREATE POLICY "pv_components_insert"
  ON public.pv_components FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_or_administracja()
    AND created_by = auth.uid()
    AND (updated_by IS NULL OR updated_by = auth.uid())
  );

-- UPDATE: admin/administracja only
CREATE POLICY "pv_components_update"
  ON public.pv_components FOR UPDATE TO authenticated
  USING (public.is_admin_or_administracja())
  WITH CHECK (
    public.is_admin_or_administracja()
    AND (updated_by IS NULL OR updated_by = auth.uid())
  );

-- DELETE: admin only
CREATE POLICY "pv_components_delete"
  ON public.pv_components FOR DELETE TO authenticated
  USING (public.is_admin());

-- ============================================================
-- DONE. No changes to existing tables or RLS policies.
-- ============================================================
