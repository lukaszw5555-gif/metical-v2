-- ============================================================
-- METICAL V2 — Migration 002: core schema
-- investments, tasks, comments, activity_log, notifications
-- ============================================================

-- ─── 1. INVESTMENTS ──────────────────────────────────────

CREATE TABLE public.investments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  client_name       text NOT NULL,
  client_phone      text,
  client_email      text,
  investment_address text,
  investment_type   text NOT NULL
                    CHECK (investment_type IN (
                      'pv', 'pv_magazyn', 'magazyn', 'pompa_ciepla',
                      'hydraulika', 'elektryka', 'hala', 'dom', 'kompleksowa_usluga'
                    )),
  status            text NOT NULL DEFAULT 'czeka_na_wplate'
                    CHECK (status IN (
                      'czeka_na_wplate', 'w_planowaniu', 'w_realizacji', 'zakonczona'
                    )),
  deposit_paid      boolean NOT NULL DEFAULT false,
  components_note   text,
  created_by        uuid REFERENCES public.profiles(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.investments IS 'Inwestycje — kontekst dla zadań';

-- Auto-update updated_at (reuse function from 001)
CREATE TRIGGER investments_updated_at
  BEFORE UPDATE ON public.investments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ─── 2. INVESTMENT_MEMBERS ───────────────────────────────

CREATE TABLE public.investment_members (
  investment_id uuid NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (investment_id, user_id)
);

COMMENT ON TABLE public.investment_members IS 'Przypisanie użytkowników do inwestycji (M:N)';

-- ─── 3. TASKS ────────────────────────────────────────────

CREATE TABLE public.tasks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title             text NOT NULL,
  description       text,
  status            text NOT NULL DEFAULT 'do_zrobienia'
                    CHECK (status IN ('do_zrobienia', 'w_trakcie', 'czeka', 'zrobione')),
  priority          text NOT NULL DEFAULT 'normalny'
                    CHECK (priority IN ('normalny', 'pilny', 'krytyczny')),
  due_date          date DEFAULT CURRENT_DATE,
  created_by        uuid REFERENCES public.profiles(id),
  assigned_to       uuid REFERENCES public.profiles(id),
  investment_id     uuid REFERENCES public.investments(id) ON DELETE SET NULL,
  awaiting_response boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz,
  last_activity_at  timestamptz NOT NULL DEFAULT now(),
  last_bumped_at    timestamptz
);

COMMENT ON TABLE public.tasks IS 'Zadania — rdzeń aplikacji';

-- Auto-update updated_at
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Auto-set completed_at when status changes to/from 'zrobione'
CREATE OR REPLACE FUNCTION public.handle_task_completion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'zrobione' AND (OLD.status IS DISTINCT FROM 'zrobione') THEN
    NEW.completed_at = now();
  ELSIF OLD.status = 'zrobione' AND NEW.status != 'zrobione' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tasks_completion
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_task_completion();

-- ─── 4. TASK_COMMENTS ────────────────────────────────────

CREATE TABLE public.task_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id   uuid REFERENCES public.profiles(id),
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.task_comments IS 'Komentarze do zadań';

-- ─── 5. INVESTMENT_COMMENTS ──────────────────────────────

CREATE TABLE public.investment_comments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_id   uuid NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
  author_id       uuid REFERENCES public.profiles(id),
  body            text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.investment_comments IS 'Komentarze do inwestycji';

-- ─── 6. ACTIVITY_LOG ─────────────────────────────────────

CREATE TABLE public.activity_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        uuid REFERENCES public.profiles(id),
  event_type      text NOT NULL,
  entity_type     text NOT NULL,
  entity_id       uuid NOT NULL,
  task_id         uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  investment_id   uuid REFERENCES public.investments(id) ON DELETE SET NULL,
  body            text,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.activity_log IS 'Historia aktywności — kto, co, kiedy, gdzie';

-- ─── 7. NOTIFICATIONS ────────────────────────────────────

CREATE TABLE public.notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type            text NOT NULL,
  title           text NOT NULL,
  body            text,
  task_id         uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  investment_id   uuid REFERENCES public.investments(id) ON DELETE CASCADE,
  is_read         boolean NOT NULL DEFAULT false,
  priority        text NOT NULL DEFAULT 'normal'
                  CHECK (priority IN ('normal', 'critical')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notifications IS 'Powiadomienia w aplikacji';


-- ═════════════════════════════════════════════════════════
-- RLS HELPER FUNCTIONS (all SECURITY DEFINER = bypass RLS)
-- ═════════════════════════════════════════════════════════

-- Helper: check if current user is admin
-- Reads: profiles (has its own RLS, but SECURITY DEFINER bypasses it)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Helper: check if current user is creator of an investment
-- Reads: investments (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_investment_creator(_investment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.investments
    WHERE id = _investment_id AND created_by = auth.uid()
  );
$$;

-- Helper: check if current user is member of an investment
-- Reads: investment_members DIRECTLY, bypassing RLS via SECURITY DEFINER.
-- ⚠ This function must NOT be used in investment_members' own RLS policies
--   to avoid recursion. It is safe for use in policies of OTHER tables
--   (investments, tasks, task_comments, investment_comments, activity_log).
CREATE OR REPLACE FUNCTION public.is_investment_member(_investment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.investment_members
    WHERE investment_id = _investment_id AND user_id = auth.uid()
  );
$$;

-- Helper: check if current user can see a task
-- Reads: tasks (SECURITY DEFINER bypasses RLS), calls is_investment_member
CREATE OR REPLACE FUNCTION public.can_see_task(_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = _task_id
      AND (
        t.created_by = auth.uid()
        OR t.assigned_to = auth.uid()
        OR (t.investment_id IS NOT NULL AND public.is_investment_member(t.investment_id))
        OR public.is_admin()
      )
  );
$$;

-- Helper: check if current user can see an investment
-- Reads: investments (SECURITY DEFINER bypasses RLS), calls is_investment_member
CREATE OR REPLACE FUNCTION public.can_see_investment(_investment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.investments i
    WHERE i.id = _investment_id
      AND (
        i.created_by = auth.uid()
        OR public.is_investment_member(i.id)
        OR public.is_admin()
      )
  );
$$;


-- ═════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═════════════════════════════════════════════════════════

-- ─── INVESTMENTS RLS ─────────────────────────────────────

ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- SELECT: creator, member, or admin
CREATE POLICY "investments_select"
  ON public.investments FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_investment_member(id)
    OR public.is_admin()
  );

-- INSERT: any authenticated user
CREATE POLICY "investments_insert"
  ON public.investments FOR INSERT TO authenticated
  WITH CHECK (true);

-- UPDATE: creator, member, or admin
CREATE POLICY "investments_update"
  ON public.investments FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_investment_member(id)
    OR public.is_admin()
  )
  WITH CHECK (
    created_by = auth.uid()
    OR public.is_investment_member(id)
    OR public.is_admin()
  );

-- DELETE: admin only
CREATE POLICY "investments_delete"
  ON public.investments FOR DELETE TO authenticated
  USING (public.is_admin());


-- ─── INVESTMENT_MEMBERS RLS ──────────────────────────────
-- ⚠ These policies DO NOT call is_investment_member() to avoid recursion.
--   Instead they use direct checks on the row and parent investment.

ALTER TABLE public.investment_members ENABLE ROW LEVEL SECURITY;

-- SELECT: own membership, or creator of the investment, or admin
CREATE POLICY "investment_members_select"
  ON public.investment_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.investments i
      WHERE i.id = investment_members.investment_id
        AND i.created_by = auth.uid()
    )
  );

-- INSERT: creator of the investment or admin
CREATE POLICY "investment_members_insert"
  ON public.investment_members FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.investments i
      WHERE i.id = investment_id AND i.created_by = auth.uid()
    )
  );

-- DELETE: creator of the investment or admin
CREATE POLICY "investment_members_delete"
  ON public.investment_members FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.investments i
      WHERE i.id = investment_members.investment_id
        AND i.created_by = auth.uid()
    )
  );


-- ─── TASKS RLS ───────────────────────────────────────────

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- SELECT: creator, assignee, member of linked investment, or admin
CREATE POLICY "tasks_select"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR (investment_id IS NOT NULL AND public.is_investment_member(investment_id))
    OR public.is_admin()
  );

-- INSERT: any authenticated user
CREATE POLICY "tasks_insert"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (true);

-- UPDATE: creator, assignee, or admin
CREATE POLICY "tasks_update"
  ON public.tasks FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR public.is_admin()
  )
  WITH CHECK (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR public.is_admin()
  );

-- DELETE: admin only
CREATE POLICY "tasks_delete"
  ON public.tasks FOR DELETE TO authenticated
  USING (public.is_admin());


-- ─── TASK_COMMENTS RLS ───────────────────────────────────

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- SELECT: if user can see the task
CREATE POLICY "task_comments_select"
  ON public.task_comments FOR SELECT TO authenticated
  USING (public.can_see_task(task_id));

-- INSERT: if user can see the task
CREATE POLICY "task_comments_insert"
  ON public.task_comments FOR INSERT TO authenticated
  WITH CHECK (public.can_see_task(task_id));

-- DELETE: admin only
CREATE POLICY "task_comments_delete"
  ON public.task_comments FOR DELETE TO authenticated
  USING (public.is_admin());


-- ─── INVESTMENT_COMMENTS RLS ─────────────────────────────

ALTER TABLE public.investment_comments ENABLE ROW LEVEL SECURITY;

-- SELECT: if user can see the investment
CREATE POLICY "investment_comments_select"
  ON public.investment_comments FOR SELECT TO authenticated
  USING (public.can_see_investment(investment_id));

-- INSERT: if user can see the investment
CREATE POLICY "investment_comments_insert"
  ON public.investment_comments FOR INSERT TO authenticated
  WITH CHECK (public.can_see_investment(investment_id));

-- DELETE: admin only
CREATE POLICY "investment_comments_delete"
  ON public.investment_comments FOR DELETE TO authenticated
  USING (public.is_admin());


-- ─── NOTIFICATIONS RLS ──────────────────────────────────

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- SELECT: own only
CREATE POLICY "notifications_select"
  ON public.notifications FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

-- INSERT: any authenticated user (app creates on behalf)
CREATE POLICY "notifications_insert"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- UPDATE: own only (marking as read)
CREATE POLICY "notifications_update"
  ON public.notifications FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- DELETE: admin only
CREATE POLICY "notifications_delete"
  ON public.notifications FOR DELETE TO authenticated
  USING (public.is_admin());


-- ─── ACTIVITY_LOG RLS ────────────────────────────────────

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- SELECT: if user can see the linked task or investment
CREATE POLICY "activity_log_select"
  ON public.activity_log FOR SELECT TO authenticated
  USING (
    (task_id IS NOT NULL AND public.can_see_task(task_id))
    OR (investment_id IS NOT NULL AND public.can_see_investment(investment_id))
    OR public.is_admin()
  );

-- INSERT: any authenticated user
CREATE POLICY "activity_log_insert"
  ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (true);

-- DELETE: admin only
CREATE POLICY "activity_log_delete"
  ON public.activity_log FOR DELETE TO authenticated
  USING (public.is_admin());


-- ═════════════════════════════════════════════════════════
-- INDEXES
-- ═════════════════════════════════════════════════════════

-- Tasks
CREATE INDEX idx_tasks_created_by       ON public.tasks(created_by);
CREATE INDEX idx_tasks_assigned_to      ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_investment_id    ON public.tasks(investment_id);
CREATE INDEX idx_tasks_status           ON public.tasks(status);
CREATE INDEX idx_tasks_awaiting         ON public.tasks(awaiting_response);

-- Investments
CREATE INDEX idx_investments_created_by ON public.investments(created_by);
CREATE INDEX idx_investments_status     ON public.investments(status);

-- Investment members
CREATE INDEX idx_inv_members_user_id    ON public.investment_members(user_id);

-- Notifications
CREATE INDEX idx_notif_recipient        ON public.notifications(recipient_id);
CREATE INDEX idx_notif_is_read          ON public.notifications(is_read);

-- Comments
CREATE INDEX idx_task_comments_task     ON public.task_comments(task_id);
CREATE INDEX idx_inv_comments_inv       ON public.investment_comments(investment_id);

-- Activity log
CREATE INDEX idx_activity_task          ON public.activity_log(task_id);
CREATE INDEX idx_activity_investment    ON public.activity_log(investment_id);
