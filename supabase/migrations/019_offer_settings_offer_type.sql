-- ============================================================
-- METICAL V2 — Migration 019: offer_settings per offer type
--
-- Sprint: Ustawienia ofert 1.1
-- Adds offer_type column to support per-type settings
-- (PV, hale, domy stalowe, etc. in the future).
-- ============================================================

-- ─── 1. ADD COLUMN ──────────────────────────────────────

ALTER TABLE public.offer_settings
  ADD COLUMN offer_type text NOT NULL DEFAULT 'PV';

-- ─── 2. SET EXISTING ROW ───────────────────────────────

UPDATE public.offer_settings
  SET offer_type = 'PV'
  WHERE offer_type = 'PV';

-- ─── 3. UNIQUE CONSTRAINT ──────────────────────────────

ALTER TABLE public.offer_settings
  ADD CONSTRAINT offer_settings_offer_type_unique UNIQUE (offer_type);

-- ─── 4. CHECK CONSTRAINT ───────────────────────────────

ALTER TABLE public.offer_settings
  ADD CONSTRAINT offer_settings_offer_type_not_empty CHECK (trim(offer_type) <> '');

-- ============================================================
-- DONE.
-- - offer_type column added with default 'PV'.
-- - Unique constraint ensures one settings row per offer type.
-- - Check constraint prevents empty offer_type.
-- - No changes to RLS or other tables.
-- ============================================================
