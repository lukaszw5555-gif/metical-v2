-- ============================================================
-- METICAL V2 — Migration 018: Offer Settings
--
-- Sprint: Ustawienia ofert 1.0
-- Global table for offer configuration (company data,
-- PDF texts, default VAT/validity, numbering info).
-- ============================================================

-- ─── 1. TABLE ───────────────────────────────────────────

CREATE TABLE public.offer_settings (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name             text,
  company_address          text,
  company_nip              text,
  company_email            text,
  company_phone            text,
  pdf_footer_text          text,
  next_step_text           text,
  default_realization_time text,
  default_offer_valid_days integer     NOT NULL DEFAULT 14,
  default_vat_rate         numeric     NOT NULL DEFAULT 8,
  offer_number_prefix      text        NOT NULL DEFAULT 'PV',
  offer_number_next        integer     NOT NULL DEFAULT 1,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  updated_by               uuid        REFERENCES public.profiles(id)
);

COMMENT ON TABLE public.offer_settings IS
  'Global offer settings — single row, editable by admin.';

-- ─── 2. UPDATED_AT TRIGGER ─────────────────────────────

CREATE TRIGGER offer_settings_updated_at
  BEFORE UPDATE ON public.offer_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ─── 3. RLS ────────────────────────────────────────────

ALTER TABLE public.offer_settings ENABLE ROW LEVEL SECURITY;

-- All active users can read
CREATE POLICY offer_settings_select ON public.offer_settings
  FOR SELECT
  USING (public.is_active_user());

-- Only admin can insert
CREATE POLICY offer_settings_insert ON public.offer_settings
  FOR INSERT
  WITH CHECK (public.is_admin());

-- Only admin can update
CREATE POLICY offer_settings_update ON public.offer_settings
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- No DELETE policy — nobody deletes settings

-- ─── 4. SEED: default global record ───────────────────

INSERT INTO public.offer_settings (
  company_name,
  company_address,
  company_nip,
  company_email,
  company_phone,
  pdf_footer_text,
  next_step_text,
  default_realization_time,
  default_offer_valid_days,
  default_vat_rate,
  offer_number_prefix,
  offer_number_next
) VALUES (
  'METICAL Sp. z o.o.',
  '',
  '',
  '',
  '',
  'Oferta ma charakter informacyjny i wymaga potwierdzenia dostępności komponentów oraz warunków montażu po wizji lokalnej lub analizie technicznej.',
  'Potwierdzenie zakresu, dostępności komponentów i terminu montażu.',
  'Do ustalenia po akceptacji oferty',
  14,
  8,
  'PV',
  1
);

-- ============================================================
-- DONE.
-- - One global settings row seeded.
-- - RLS: active users SELECT, admin INSERT/UPDATE.
-- - Reuses existing update_updated_at() trigger.
-- - No changes to other tables or policies.
-- ============================================================
