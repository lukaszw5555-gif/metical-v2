-- ============================================================
-- METICAL V2 — Migration 010: Investments Client Link
--
-- Sprint Sales 4: Link investments to clients
-- ============================================================

-- 1. Add client_id to investments
ALTER TABLE public.investments
ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- 2. Add index for fast lookups
CREATE INDEX idx_investments_client_id ON public.investments(client_id);

-- Note: We are deliberately NOT altering the RLS policies for investments.
-- The existing RLS (based on investment_members and created_by)
-- is sufficient for the current operational needs.
