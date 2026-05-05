-- ============================================================
-- METICAL V2 — Migration 022: Add source_external_id
--
-- Hotfix MET-FUNNEL-004-FIX-001
--
-- ADDITIVE-ONLY. No columns dropped, no existing data changed.
-- ============================================================

-- ─── 1. New column ──────────────────────────────────────

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS source_external_id text NULL;

-- ─── 2. Indexes ─────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_sales_leads_source_external_id
  ON public.sales_leads(source_external_id);

CREATE INDEX IF NOT EXISTS idx_sales_leads_source_type_external_id
  ON public.sales_leads(source_type, source_external_id)
  WHERE source_external_id IS NOT NULL;

-- ─── 3. Comment ─────────────────────────────────────────

COMMENT ON COLUMN public.sales_leads.source_external_id
  IS 'Zewnętrzny identyfikator leada ze źródeł typu Excel, Zapier, Meta Lead Ads; tekstowy odpowiednik source_record_id dla integracji.';

-- ============================================================
-- SAFETY SUMMARY:
-- ✅ No DROP COLUMN
-- ✅ No ALTER existing columns
-- ✅ No UNIQUE constraint (dedup in Edge Function)
-- ✅ No existing policies modified
-- ============================================================
