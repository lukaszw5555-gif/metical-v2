-- ============================================================
-- METICAL V2 — Migration 006: task archiving
-- ============================================================
-- Adds archived_at / archived_by fields to tasks table.
-- Archived tasks are soft-deleted — they stay in the DB but
-- are filtered out of active views by the frontend.
-- ============================================================

-- 1. Add columns
ALTER TABLE public.tasks
  ADD COLUMN archived_at timestamptz,
  ADD COLUMN archived_by uuid REFERENCES public.profiles(id);

-- 2. Index for filtering active vs archived
CREATE INDEX idx_tasks_archived
  ON public.tasks(archived_at)
  WHERE archived_at IS NULL;

-- 3. Comment
COMMENT ON COLUMN public.tasks.archived_at IS 'When the task was archived (NULL = active)';
COMMENT ON COLUMN public.tasks.archived_by IS 'Who archived the task';
