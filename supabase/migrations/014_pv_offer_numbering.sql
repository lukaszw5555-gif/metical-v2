-- ============================================================
-- METICAL V2 — Migration 014: PV Offer Auto-Numbering
--
-- Sprint PV 1.3A: Automatyczny numer oferty PV
-- ============================================================

-- ─── 1. COUNTER TABLE ───────────────────────────────────

CREATE TABLE public.pv_offer_number_counters (
  year        integer PRIMARY KEY,
  last_number integer NOT NULL DEFAULT 0
);

-- No RLS needed — accessed only via trigger/function running as definer.
ALTER TABLE public.pv_offer_number_counters ENABLE ROW LEVEL SECURITY;

-- Only superuser/trigger can touch this table.
-- No SELECT/INSERT/UPDATE/DELETE policies for authenticated users.

-- ─── 2. FUNCTION: next_pv_offer_number() ────────────────

CREATE OR REPLACE FUNCTION public.next_pv_offer_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year  integer := EXTRACT(YEAR FROM now())::integer;
  v_next  integer;
BEGIN
  -- Upsert: insert year row if missing, then increment atomically.
  -- FOR UPDATE ensures serialized access under concurrent inserts.
  INSERT INTO public.pv_offer_number_counters (year, last_number)
  VALUES (v_year, 1)
  ON CONFLICT (year) DO UPDATE
    SET last_number = public.pv_offer_number_counters.last_number + 1
  RETURNING last_number INTO v_next;

  RETURN 'PV/' || v_year::text || '/' || lpad(v_next::text, 4, '0');
END;
$$;

-- ─── 3. TRIGGER: auto-assign offer_number ───────────────

CREATE OR REPLACE FUNCTION public.trg_pv_offer_auto_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only assign if offer_number is NULL or empty string
  IF NEW.offer_number IS NULL OR trim(NEW.offer_number) = '' THEN
    NEW.offer_number := public.next_pv_offer_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER pv_offers_auto_number
  BEFORE INSERT ON public.pv_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_pv_offer_auto_number();

-- ─── 4. UNIQUE INDEX (partial — only non-null) ──────────

CREATE UNIQUE INDEX idx_pv_offers_offer_number_unique
  ON public.pv_offers (offer_number)
  WHERE offer_number IS NOT NULL AND trim(offer_number) <> '';

-- ============================================================
-- DONE.
-- - No changes to existing pv_offers columns.
-- - No changes to existing RLS policies.
-- - No changes to existing records.
-- - Counter table has no user-facing RLS (trigger-only access).
-- ============================================================
