-- ============================================================
-- METICAL V2 — Migration 015: PV Offer Type
--
-- Sprint PV 2.0A: Typ oferty + 4 przyciski startowe
-- ============================================================

-- ─── 1. ADD COLUMN: offer_type ──────────────────────────

ALTER TABLE public.pv_offers
  ADD COLUMN offer_type text NOT NULL DEFAULT 'pv';

ALTER TABLE public.pv_offers
  ADD CONSTRAINT pv_offers_offer_type_check CHECK (
    offer_type IN ('pv', 'pv_me', 'me', 'individual')
  );

-- ─── 2. INDEX ───────────────────────────────────────────

CREATE INDEX idx_pv_offers_offer_type ON public.pv_offers(offer_type);

-- ============================================================
-- DONE.
-- - No changes to existing RLS policies.
-- - No changes to existing columns.
-- - Existing rows get default 'pv'.
-- ============================================================
