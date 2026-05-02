-- ============================================================
-- METICAL V2 — Migration 016: PV Component Categories 2.0
--
-- Sprint PV 2.0B: Rozszerzenie kategorii katalogu komponentów
-- ============================================================

-- ─── 1. DROP old constraint ─────────────────────────────

ALTER TABLE public.pv_components
  DROP CONSTRAINT pv_components_category_check;

-- ─── 2. ADD new constraint with extended categories ─────

ALTER TABLE public.pv_components
  ADD CONSTRAINT pv_components_category_check CHECK (
    category IN (
      'Falowniki',
      'Magazyny energii',
      'Moduły fotowoltaiczne',
      'Akcesoria montażowe',
      'Konstrukcje montażowe',
      'Dodatkowe usługi',
      'SIG',
      'Materiały pomocnicze',
      'Skrzynki / rozdzielnice',
      'Backup',
      'Wyłącznik ppoż.'
    )
  );

-- ============================================================
-- DONE.
-- - No changes to existing data.
-- - No changes to RLS.
-- - No changes to other tables.
-- - Old categories preserved, 4 new categories added.
-- ============================================================
