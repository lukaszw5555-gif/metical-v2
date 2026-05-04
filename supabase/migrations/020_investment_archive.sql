-- ============================================================
-- METICAL V2 — Migration 020: Investment archive (soft delete)
--
-- Sprint: Archiwizacja inwestycji
-- Adds archived_at / archived_by columns for soft archiving.
-- ============================================================

-- ─── 1. ADD COLUMNS ─────────────────────────────────────

ALTER TABLE public.investments
  ADD COLUMN archived_at timestamptz NULL,
  ADD COLUMN archived_by uuid NULL REFERENCES public.profiles(id);

-- ─── 2. INDEX for quick filtering ───────────────────────

CREATE INDEX idx_investments_archived_at ON public.investments(archived_at);

-- ============================================================
-- DONE.
-- - archived_at NULL = active investment.
-- - archived_at NOT NULL = archived investment.
-- - archived_by tracks who performed the archive.
-- - No RLS changes needed — existing UPDATE policy covers
--   setting archived_at (is_active_user can update).
-- - Archive/restore is admin-only at the SERVICE/UI level.
-- ============================================================
