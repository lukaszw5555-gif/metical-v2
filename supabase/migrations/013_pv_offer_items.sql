-- ============================================================
-- METICAL V2 — Migration 013: PV Offer Items
--
-- Sprint Offers 1.2: Pozycje oferty PV z katalogu komponentów
-- ============================================================

-- ─── 1. TABLE: pv_offer_items ───────────────────────────

CREATE TABLE public.pv_offer_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id          uuid NOT NULL REFERENCES public.pv_offers(id) ON DELETE CASCADE,
  component_id      uuid REFERENCES public.pv_components(id) ON DELETE SET NULL,

  -- Snapshot
  category          text NOT NULL,
  manufacturer      text,
  model             text,
  trade_name        text NOT NULL,
  unit              text NOT NULL DEFAULT 'szt.',
  quantity          numeric NOT NULL DEFAULT 1,

  -- Pricing
  purchase_price    numeric NOT NULL DEFAULT 0,
  selling_price     numeric NOT NULL DEFAULT 0,
  vat_rate          numeric NOT NULL DEFAULT 23,

  -- Technical
  power_w           numeric,
  capacity_kwh      numeric,

  -- Extra
  notes             text,
  is_custom         boolean NOT NULL DEFAULT false,
  sort_order        integer NOT NULL DEFAULT 0,

  -- Dates
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT pv_offer_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT pv_offer_items_purchase_price_check CHECK (purchase_price >= 0),
  CONSTRAINT pv_offer_items_selling_price_check CHECK (selling_price >= 0),
  CONSTRAINT pv_offer_items_vat_rate_check CHECK (vat_rate >= 0),
  CONSTRAINT pv_offer_items_power_w_check CHECK (power_w IS NULL OR power_w >= 0),
  CONSTRAINT pv_offer_items_capacity_kwh_check CHECK (capacity_kwh IS NULL OR capacity_kwh >= 0)
);

ALTER TABLE public.pv_offer_items ENABLE ROW LEVEL SECURITY;

-- ─── 2. TRIGGER: updated_at ─────────────────────────────

CREATE TRIGGER pv_offer_items_updated_at
  BEFORE UPDATE ON public.pv_offer_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ─── 3. INDEXES ─────────────────────────────────────────

CREATE INDEX idx_pv_offer_items_offer_id ON public.pv_offer_items(offer_id);
CREATE INDEX idx_pv_offer_items_component_id ON public.pv_offer_items(component_id);
CREATE INDEX idx_pv_offer_items_category ON public.pv_offer_items(category);
CREATE INDEX idx_pv_offer_items_sort_order ON public.pv_offer_items(sort_order);

-- ─── 4. RLS POLICIES ───────────────────────────────────

-- SELECT: can see if can see the parent offer
CREATE POLICY "pv_offer_items_select"
  ON public.pv_offer_items FOR SELECT TO authenticated
  USING (public.can_see_pv_offer(offer_id));

-- INSERT: can insert if can see the parent offer
CREATE POLICY "pv_offer_items_insert"
  ON public.pv_offer_items FOR INSERT TO authenticated
  WITH CHECK (public.can_see_pv_offer(offer_id));

-- UPDATE: can update if can see the parent offer
CREATE POLICY "pv_offer_items_update"
  ON public.pv_offer_items FOR UPDATE TO authenticated
  USING (public.can_see_pv_offer(offer_id))
  WITH CHECK (public.can_see_pv_offer(offer_id));

-- DELETE: can delete if can see the parent offer
CREATE POLICY "pv_offer_items_delete"
  ON public.pv_offer_items FOR DELETE TO authenticated
  USING (public.can_see_pv_offer(offer_id));

-- ============================================================
-- DONE. No changes to existing tables or RLS policies.
-- ============================================================
