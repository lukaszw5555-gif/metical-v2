-- ============================================================
-- METICAL V2 — Migration 017: PV Offer Adjustments
--
-- Sprint PV 2.0D: Narzut handlowy i rabat klienta
-- ============================================================

-- ─── 1. ADD COLUMNS ─────────────────────────────────────

ALTER TABLE public.pv_offers
  ADD COLUMN sales_markup_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN customer_discount_value numeric NOT NULL DEFAULT 0;

-- ─── 2. CHECK CONSTRAINTS ───────────────────────────────

ALTER TABLE public.pv_offers
  ADD CONSTRAINT pv_offers_sales_markup_check CHECK (sales_markup_value >= 0),
  ADD CONSTRAINT pv_offers_customer_discount_check CHECK (customer_discount_value >= 0);

-- ============================================================
-- DONE.
-- - No changes to existing RLS policies.
-- - No changes to other columns.
-- - Existing rows get default 0.
-- ============================================================
