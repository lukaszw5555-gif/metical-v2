-- ============================================================
-- METICAL V2 — Migration 003: simplify investment access
--
-- Business decision: in MVP the entire active team should see
-- ALL investments. The previous member-based RLS was too narrow.
--
-- Changes:
-- 1. New helper: is_active_user() — checks profiles.is_active
-- 2. Replace investments SELECT/UPDATE policies
-- 3. Replace investment_comments SELECT/INSERT policies
-- 4. Rewrite can_see_investment() to use is_active_user()
-- 5. investment_members table is KEPT (for future use)
-- ============================================================

-- ─── 1. HELPER: is_active_user() ────────────────────────

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND is_active = true
  );
$$;

COMMENT ON FUNCTION public.is_active_user()
  IS 'Returns true if the current user has an active profile';


-- ─── 2. REWRITE can_see_investment() ────────────────────
-- Now: any active user can see any existing investment.

CREATE OR REPLACE FUNCTION public.can_see_investment(_investment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_active_user()
    AND EXISTS (
      SELECT 1 FROM public.investments WHERE id = _investment_id
    );
$$;


-- ─── 3. INVESTMENTS — replace restrictive policies ──────

-- Drop old policies
DROP POLICY IF EXISTS "investments_select" ON public.investments;
DROP POLICY IF EXISTS "investments_insert" ON public.investments;
DROP POLICY IF EXISTS "investments_update" ON public.investments;
DROP POLICY IF EXISTS "investments_delete" ON public.investments;

-- SELECT: any active user
CREATE POLICY "investments_select"
  ON public.investments FOR SELECT TO authenticated
  USING (public.is_active_user());

-- INSERT: any active user
CREATE POLICY "investments_insert"
  ON public.investments FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user());

-- UPDATE: any active user
CREATE POLICY "investments_update"
  ON public.investments FOR UPDATE TO authenticated
  USING (public.is_active_user())
  WITH CHECK (public.is_active_user());

-- DELETE: admin only (unchanged logic)
CREATE POLICY "investments_delete"
  ON public.investments FOR DELETE TO authenticated
  USING (public.is_admin());


-- ─── 4. INVESTMENT_COMMENTS — replace restrictive policies

DROP POLICY IF EXISTS "investment_comments_select" ON public.investment_comments;
DROP POLICY IF EXISTS "investment_comments_insert" ON public.investment_comments;
DROP POLICY IF EXISTS "investment_comments_delete" ON public.investment_comments;

-- SELECT: any active user
CREATE POLICY "investment_comments_select"
  ON public.investment_comments FOR SELECT TO authenticated
  USING (public.is_active_user());

-- INSERT: any active user
CREATE POLICY "investment_comments_insert"
  ON public.investment_comments FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user());

-- DELETE: admin only (unchanged)
CREATE POLICY "investment_comments_delete"
  ON public.investment_comments FOR DELETE TO authenticated
  USING (public.is_admin());


-- ─── 5. INVESTMENT_MEMBERS — relax SELECT ───────────────
-- Let any active user see all memberships (needed for future UI).

DROP POLICY IF EXISTS "investment_members_select" ON public.investment_members;

CREATE POLICY "investment_members_select"
  ON public.investment_members FOR SELECT TO authenticated
  USING (public.is_active_user());

-- INSERT/DELETE policies remain as-is (creator or admin).


-- ============================================================
-- DONE. investment_members table is kept for future use.
-- No UI changes required.
-- ============================================================
