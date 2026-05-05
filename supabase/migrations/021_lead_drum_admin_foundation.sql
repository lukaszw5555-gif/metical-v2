-- ============================================================
-- METICAL V2 — Migration 021: Lead Drum Admin Foundation
--
-- Sprint MET-FUNNEL-002
--
-- ADDITIVE-ONLY migration. No columns dropped, no existing
-- policies changed, no destructive changes.
--
-- Extends sales_leads with fields needed for the admin
-- lead drum (qualification, assignment, brief fields).
-- Creates lead_notes table.
-- ============================================================


-- ═════════════════════════════════════════════════════════════
-- 1. EXTEND sales_leads — Source fields
-- ═════════════════════════════════════════════════════════════

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS source_type text NULL
    CONSTRAINT sales_leads_source_type_check
    CHECK (source_type IN (
      'website_domy', 'website_hale', 'website_instalacje',
      'meta_domy', 'meta_hale',
      'manual', 'excel_import', 'other'
    ));

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS source_record_id uuid NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS source_payload_raw jsonb NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS source_campaign text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS source_form_name text NULL;


-- ═════════════════════════════════════════════════════════════
-- 2. EXTEND sales_leads — Investment type
-- ═════════════════════════════════════════════════════════════

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS investment_type text NULL
    CONSTRAINT sales_leads_investment_type_check
    CHECK (investment_type IN ('dom', 'hala', 'instalacja', 'pv', 'inne'));


-- ═════════════════════════════════════════════════════════════
-- 3. EXTEND sales_leads — Unified contact fields
-- ═════════════════════════════════════════════════════════════

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS contact_name text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS contact_phone text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS contact_email text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS location_text text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS postal_code text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS desired_timeline text NULL;


-- ═════════════════════════════════════════════════════════════
-- 4. EXTEND sales_leads — Qualification (admin drum)
-- ═════════════════════════════════════════════════════════════

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS qualification_status text NOT NULL DEFAULT 'new'
    CONSTRAINT sales_leads_qualification_status_check
    CHECK (qualification_status IN (
      'new', 'to_review', 'valuable', 'education_needed',
      'incomplete', 'useless', 'spam',
      'assigned', 'converted', 'lost'
    ));

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS lead_quality text NULL
    CONSTRAINT sales_leads_lead_quality_check
    CHECK (lead_quality IN ('A', 'B', 'C', 'D', 'X'));


-- ═════════════════════════════════════════════════════════════
-- 5. EXTEND sales_leads — Assignment
-- ═════════════════════════════════════════════════════════════

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS assigned_user_id uuid NULL
    REFERENCES public.profiles(id);

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS assigned_by uuid NULL
    REFERENCES public.profiles(id);


-- ═════════════════════════════════════════════════════════════
-- 6. EXTEND sales_leads — Sales workflow / next step
-- ═════════════════════════════════════════════════════════════

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS sales_status text NOT NULL DEFAULT 'not_started'
    CONSTRAINT sales_leads_sales_status_check
    CHECK (sales_status IN (
      'not_started', 'first_contact_pending', 'contacted', 'no_answer',
      'follow_up', 'meeting_scheduled', 'offer_needed', 'offer_sent',
      'won', 'lost'
    ));

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS last_contact_at timestamptz NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS next_step_at timestamptz NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS next_step_note text NULL;


-- ═════════════════════════════════════════════════════════════
-- 7. EXTEND sales_leads — Conversion
-- ═════════════════════════════════════════════════════════════

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS converted_investment_id uuid NULL
    REFERENCES public.investments(id);


-- ═════════════════════════════════════════════════════════════
-- 8. EXTEND sales_leads — Brief fields: Domy
-- ═════════════════════════════════════════════════════════════

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS house_interest_type text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS has_plot text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS decision_stage text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS planning_status text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS documentation_status text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS project_status text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS expected_support_scope text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS house_area_range text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS house_layout_type text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS client_priorities text NULL;


-- ═════════════════════════════════════════════════════════════
-- 9. EXTEND sales_leads — Brief fields: Hale
-- ═════════════════════════════════════════════════════════════

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS hall_interest_type text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS hall_object_type text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS hall_type text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS hall_investment_kind text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS has_architectural_project text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS hall_planning_status text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS hall_project_status text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS hall_width text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS hall_length text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS hall_height text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS roof_type text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS hall_form text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS permit_mode text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS expected_scope text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS wall_covering text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS roof_covering text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS gate_doors_windows_info text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS investment_description_raw text NULL;


-- ═════════════════════════════════════════════════════════════
-- 10. EXTEND sales_leads — Brief fields: Instalacje
-- ═════════════════════════════════════════════════════════════

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS installation_scope text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS installation_object_type text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS installation_investment_kind text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS installation_client_needs text NULL;

ALTER TABLE public.sales_leads
  ADD COLUMN IF NOT EXISTS installation_description_raw text NULL;


-- ═════════════════════════════════════════════════════════════
-- 11. CREATE TABLE: lead_notes
-- ═════════════════════════════════════════════════════════════

CREATE TABLE public.lead_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     uuid NOT NULL REFERENCES public.sales_leads(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES public.profiles(id),
  note_type   text NOT NULL DEFAULT 'general'
              CONSTRAINT lead_notes_note_type_check
              CHECK (note_type IN ('general', 'qualification', 'contact', 'internal')),
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;


-- ═════════════════════════════════════════════════════════════
-- 12. INDEXES — sales_leads (new fields)
-- ═════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_sales_leads_source_type
  ON public.sales_leads(source_type);

CREATE INDEX IF NOT EXISTS idx_sales_leads_investment_type
  ON public.sales_leads(investment_type);

CREATE INDEX IF NOT EXISTS idx_sales_leads_qualification_status
  ON public.sales_leads(qualification_status);

CREATE INDEX IF NOT EXISTS idx_sales_leads_lead_quality
  ON public.sales_leads(lead_quality);

CREATE INDEX IF NOT EXISTS idx_sales_leads_assigned_user
  ON public.sales_leads(assigned_user_id);

CREATE INDEX IF NOT EXISTS idx_sales_leads_sales_status
  ON public.sales_leads(sales_status);

CREATE INDEX IF NOT EXISTS idx_sales_leads_created_at
  ON public.sales_leads(created_at);

CREATE INDEX IF NOT EXISTS idx_sales_leads_next_step_at
  ON public.sales_leads(next_step_at);

CREATE INDEX IF NOT EXISTS idx_sales_leads_postal_code
  ON public.sales_leads(postal_code);


-- ═════════════════════════════════════════════════════════════
-- 13. INDEXES — lead_notes
-- ═════════════════════════════════════════════════════════════

CREATE INDEX idx_lead_notes_lead_id ON public.lead_notes(lead_id);
CREATE INDEX idx_lead_notes_author_id ON public.lead_notes(author_id);
CREATE INDEX idx_lead_notes_created_at ON public.lead_notes(created_at);


-- ═════════════════════════════════════════════════════════════
-- 14. RLS — lead_notes
--
-- Uses existing can_see_lead() helper. Does NOT modify
-- any existing sales_leads policies.
-- ═════════════════════════════════════════════════════════════

-- SELECT: visible if user can see the lead
CREATE POLICY "lead_notes_select"
  ON public.lead_notes FOR SELECT TO authenticated
  USING (public.can_see_lead(lead_id));

-- INSERT: can add if user can see the lead, must own author_id
CREATE POLICY "lead_notes_insert"
  ON public.lead_notes FOR INSERT TO authenticated
  WITH CHECK (public.can_see_lead(lead_id) AND author_id = auth.uid());

-- UPDATE: author can edit own notes
CREATE POLICY "lead_notes_update"
  ON public.lead_notes FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- DELETE: admin or author of the note
CREATE POLICY "lead_notes_delete"
  ON public.lead_notes FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR author_id = auth.uid()
  );


-- ═════════════════════════════════════════════════════════════
-- 15. BACKFILL — populate new fields from existing data
--
-- Safe: only fills NULL values; never overwrites existing data.
-- Preserves all original columns untouched.
-- ═════════════════════════════════════════════════════════════

-- 15a. Contact fields from legacy columns
UPDATE public.sales_leads
SET
  contact_name  = COALESCE(contact_name, full_name),
  contact_phone = COALESCE(contact_phone, phone),
  contact_email = COALESCE(contact_email, email)
WHERE contact_name IS NULL
   OR contact_phone IS NULL
   OR contact_email IS NULL;

-- 15b. assigned_user_id from primary_assigned_to
UPDATE public.sales_leads
SET assigned_user_id = primary_assigned_to
WHERE assigned_user_id IS NULL
  AND primary_assigned_to IS NOT NULL;

-- 15c. source_type from legacy source column
UPDATE public.sales_leads
SET source_type = CASE source
  WHEN 'website'      THEN 'other'
  WHEN 'facebook_ads' THEN 'other'
  WHEN 'manual'       THEN 'manual'
  ELSE 'other'
END
WHERE source_type IS NULL;

-- 15d. investment_type from legacy service_type column
UPDATE public.sales_leads
SET investment_type = CASE service_type
  WHEN 'dom'  THEN 'dom'
  WHEN 'hala' THEN 'hala'
  WHEN 'pv'   THEN 'pv'
  WHEN 'pv_magazyn' THEN 'pv'
  WHEN 'magazyn'    THEN 'pv'
  WHEN 'pompa_ciepla'  THEN 'instalacja'
  WHEN 'hydraulika'    THEN 'instalacja'
  WHEN 'elektryka'     THEN 'instalacja'
  WHEN 'kompleksowa_usluga' THEN 'inne'
  WHEN 'inne' THEN 'inne'
  ELSE NULL
END
WHERE investment_type IS NULL
  AND service_type IS NOT NULL;

-- 15e. sales_status from legacy status column
-- Maps old sales pipeline status to new sales_status.
-- qualification_status stays at default 'new' for old records.
UPDATE public.sales_leads
SET sales_status = CASE status
  WHEN 'new'       THEN 'not_started'
  WHEN 'follow_up' THEN 'follow_up'
  WHEN 'offered'   THEN 'offer_sent'
  WHEN 'won'       THEN 'won'
  WHEN 'lost'      THEN 'lost'
  ELSE 'not_started'
END
WHERE sales_status = 'not_started'
  AND status != 'new';

-- 15f. location_text from city
UPDATE public.sales_leads
SET location_text = city
WHERE location_text IS NULL
  AND city IS NOT NULL;


-- ═════════════════════════════════════════════════════════════
-- 16. COMMENTS
-- ═════════════════════════════════════════════════════════════

COMMENT ON TABLE public.lead_notes
  IS 'Notatki do leadów — kwalifikacja, kontakt, wewnętrzne. Tabela bębna leadów.';

COMMENT ON COLUMN public.sales_leads.source_type
  IS 'Rozszerzone źródło leadu dla bębna admina (website_domy, meta_hale, etc.)';

COMMENT ON COLUMN public.sales_leads.qualification_status
  IS 'Status kwalifikacji admina w bębnie leadów';

COMMENT ON COLUMN public.sales_leads.lead_quality
  IS 'Ocena jakości leadu (A/B/C/D/X) — admin drum';

COMMENT ON COLUMN public.sales_leads.sales_status
  IS 'Rozszerzony status pracy handlowca';

COMMENT ON COLUMN public.sales_leads.assigned_user_id
  IS 'Jednoznaczne przypisanie leadu do handlowca (bęben admina)';


-- ============================================================
-- DONE.
--
-- SAFETY SUMMARY:
-- ✅ No DROP COLUMN
-- ✅ No ALTER existing columns
-- ✅ No existing RLS policies modified
-- ✅ No existing constraints modified
-- ✅ All new columns are NULL or have safe defaults
-- ✅ Backfill only fills NULL values
-- ✅ Old columns (status, source, primary_assigned_to, etc.) preserved
-- ============================================================
