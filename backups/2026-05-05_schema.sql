


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."can_see_client"("_client_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = _client_id
      AND (
        public.is_admin_or_administracja()
        OR c.created_by = auth.uid()
        OR c.assigned_to = auth.uid()
      )
  );
$$;


ALTER FUNCTION "public"."can_see_client"("_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_see_investment"("_investment_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    public.is_active_user()
    AND EXISTS (
      SELECT 1 FROM public.investments WHERE id = _investment_id
    );
$$;


ALTER FUNCTION "public"."can_see_investment"("_investment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_see_lead"("_lead_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sales_leads sl
    WHERE sl.id = _lead_id
      AND (
        public.is_admin_or_administracja()
        OR sl.created_by = auth.uid()
        OR sl.primary_assigned_to = auth.uid()
        OR sl.secondary_assigned_to = auth.uid()
      )
  );
$$;


ALTER FUNCTION "public"."can_see_lead"("_lead_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_see_pv_offer"("_offer_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pv_offers o
    WHERE o.id = _offer_id
      AND (
        public.is_admin_or_administracja()
        OR o.created_by = auth.uid()
        OR o.assigned_to = auth.uid()
        OR (o.lead_id IS NOT NULL AND public.can_see_lead(o.lead_id))
        OR (o.client_id IS NOT NULL AND public.can_see_client(o.client_id))
      )
  );
$$;


ALTER FUNCTION "public"."can_see_pv_offer"("_offer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_see_task"("_task_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."can_see_task"("_task_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    'operator'
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_task_completion"() RETURNS "trigger"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."handle_task_completion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_active_user"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND is_active = true
  );
$$;


ALTER FUNCTION "public"."is_active_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_active_user"() IS 'Returns true if the current user has an active profile';



CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_or_administracja"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND is_active = true
      AND role IN ('admin', 'administracja')
  );
$$;


ALTER FUNCTION "public"."is_admin_or_administracja"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_admin_or_administracja"() IS 'Returns true if the current user is admin or administracja';



CREATE OR REPLACE FUNCTION "public"."is_investment_creator"("_investment_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.investments
    WHERE id = _investment_id AND created_by = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_investment_creator"("_investment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_investment_member"("_investment_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.investment_members
    WHERE investment_id = _investment_id AND user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_investment_member"("_investment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."next_pv_offer_number"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."next_pv_offer_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_pv_offer_auto_number"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Only assign if offer_number is NULL or empty string
  IF NEW.offer_number IS NULL OR trim(NEW.offer_number) = '' THEN
    NEW.offer_number := public.next_pv_offer_number();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_pv_offer_auto_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_id" "uuid",
    "event_type" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "task_id" "uuid",
    "investment_id" "uuid",
    "body" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."activity_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."activity_log" IS 'Historia aktywności — kto, co, kiedy, gdzie';



CREATE TABLE IF NOT EXISTS "public"."client_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."client_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" "text" NOT NULL,
    "phone" "text",
    "email" "text",
    "city" "text",
    "address" "text",
    "source" "text",
    "created_from_lead_id" "uuid",
    "created_by" "uuid" NOT NULL,
    "assigned_to" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."investment_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "investment_id" "uuid" NOT NULL,
    "author_id" "uuid",
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."investment_comments" OWNER TO "postgres";


COMMENT ON TABLE "public"."investment_comments" IS 'Komentarze do inwestycji';



CREATE TABLE IF NOT EXISTS "public"."investment_members" (
    "investment_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."investment_members" OWNER TO "postgres";


COMMENT ON TABLE "public"."investment_members" IS 'Przypisanie użytkowników do inwestycji (M:N)';



CREATE TABLE IF NOT EXISTS "public"."investments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "client_name" "text" NOT NULL,
    "client_phone" "text",
    "client_email" "text",
    "investment_address" "text",
    "investment_type" "text" NOT NULL,
    "status" "text" DEFAULT 'czeka_na_wplate'::"text" NOT NULL,
    "deposit_paid" boolean DEFAULT false NOT NULL,
    "components_note" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "client_id" "uuid",
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    CONSTRAINT "investments_investment_type_check" CHECK (("investment_type" = ANY (ARRAY['pv'::"text", 'pv_magazyn'::"text", 'magazyn'::"text", 'pompa_ciepla'::"text", 'hydraulika'::"text", 'elektryka'::"text", 'hala'::"text", 'dom'::"text", 'kompleksowa_usluga'::"text"]))),
    CONSTRAINT "investments_status_check" CHECK (("status" = ANY (ARRAY['czeka_na_wplate'::"text", 'w_planowaniu'::"text", 'w_realizacji'::"text", 'zakonczona'::"text"])))
);


ALTER TABLE "public"."investments" OWNER TO "postgres";


COMMENT ON TABLE "public"."investments" IS 'Inwestycje — kontekst dla zadań';



CREATE TABLE IF NOT EXISTS "public"."lead_activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "lead_activity_log_event_type_check" CHECK (("event_type" = ANY (ARRAY['lead_created'::"text", 'lead_status_changed'::"text", 'lead_followup_changed'::"text", 'lead_comment_added'::"text", 'lead_favorite_changed'::"text", 'lead_updated'::"text", 'lead_assignment_changed'::"text"])))
);


ALTER TABLE "public"."lead_activity_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lead_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."lead_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text",
    "task_id" "uuid",
    "investment_id" "uuid",
    "is_read" boolean DEFAULT false NOT NULL,
    "priority" "text" DEFAULT 'normal'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notifications_priority_check" CHECK (("priority" = ANY (ARRAY['normal'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."notifications" IS 'Powiadomienia w aplikacji';



CREATE TABLE IF NOT EXISTS "public"."offer_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_name" "text",
    "company_address" "text",
    "company_nip" "text",
    "company_email" "text",
    "company_phone" "text",
    "pdf_footer_text" "text",
    "next_step_text" "text",
    "default_realization_time" "text",
    "default_offer_valid_days" integer DEFAULT 14 NOT NULL,
    "default_vat_rate" numeric DEFAULT 8 NOT NULL,
    "offer_number_prefix" "text" DEFAULT 'PV'::"text" NOT NULL,
    "offer_number_next" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid",
    "offer_type" "text" DEFAULT 'PV'::"text" NOT NULL,
    CONSTRAINT "offer_settings_offer_type_not_empty" CHECK ((TRIM(BOTH FROM "offer_type") <> ''::"text"))
);


ALTER TABLE "public"."offer_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."offer_settings" IS 'Global offer settings — single row, editable by admin.';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text" DEFAULT ''::"text" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'operator'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'operator'::"text", 'administracja'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'User profiles extending auth.users';



CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "onesignal_subscription_id" "text" NOT NULL,
    "onesignal_user_id" "text",
    "platform" "text",
    "device_label" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."push_subscriptions" IS 'OneSignal push subscription IDs per user for direct targeting';



CREATE TABLE IF NOT EXISTS "public"."pv_components" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" "text" NOT NULL,
    "manufacturer" "text",
    "model" "text",
    "trade_name" "text" NOT NULL,
    "unit" "text" DEFAULT 'szt.'::"text" NOT NULL,
    "param1" "text",
    "param2" "text",
    "description" "text",
    "power_w" numeric,
    "capacity_kwh" numeric,
    "purchase_price" numeric DEFAULT 0 NOT NULL,
    "selling_price" numeric DEFAULT 0 NOT NULL,
    "vat_rate" numeric DEFAULT 23 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "notes" "text",
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pv_components_capacity_kwh_check" CHECK ((("capacity_kwh" IS NULL) OR ("capacity_kwh" >= (0)::numeric))),
    CONSTRAINT "pv_components_category_check" CHECK (("category" = ANY (ARRAY['Falowniki'::"text", 'Magazyny energii'::"text", 'Moduły fotowoltaiczne'::"text", 'Akcesoria montażowe'::"text", 'Konstrukcje montażowe'::"text", 'Dodatkowe usługi'::"text", 'SIG'::"text", 'Materiały pomocnicze'::"text", 'Skrzynki / rozdzielnice'::"text", 'Backup'::"text", 'Wyłącznik ppoż.'::"text"]))),
    CONSTRAINT "pv_components_power_w_check" CHECK ((("power_w" IS NULL) OR ("power_w" >= (0)::numeric))),
    CONSTRAINT "pv_components_purchase_price_check" CHECK (("purchase_price" >= (0)::numeric)),
    CONSTRAINT "pv_components_selling_price_check" CHECK (("selling_price" >= (0)::numeric)),
    CONSTRAINT "pv_components_vat_rate_check" CHECK (("vat_rate" >= (0)::numeric))
);


ALTER TABLE "public"."pv_components" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pv_offer_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "offer_id" "uuid" NOT NULL,
    "component_id" "uuid",
    "category" "text" NOT NULL,
    "manufacturer" "text",
    "model" "text",
    "trade_name" "text" NOT NULL,
    "unit" "text" DEFAULT 'szt.'::"text" NOT NULL,
    "quantity" numeric DEFAULT 1 NOT NULL,
    "purchase_price" numeric DEFAULT 0 NOT NULL,
    "selling_price" numeric DEFAULT 0 NOT NULL,
    "vat_rate" numeric DEFAULT 23 NOT NULL,
    "power_w" numeric,
    "capacity_kwh" numeric,
    "notes" "text",
    "is_custom" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pv_offer_items_capacity_kwh_check" CHECK ((("capacity_kwh" IS NULL) OR ("capacity_kwh" >= (0)::numeric))),
    CONSTRAINT "pv_offer_items_power_w_check" CHECK ((("power_w" IS NULL) OR ("power_w" >= (0)::numeric))),
    CONSTRAINT "pv_offer_items_purchase_price_check" CHECK (("purchase_price" >= (0)::numeric)),
    CONSTRAINT "pv_offer_items_quantity_check" CHECK (("quantity" > (0)::numeric)),
    CONSTRAINT "pv_offer_items_selling_price_check" CHECK (("selling_price" >= (0)::numeric)),
    CONSTRAINT "pv_offer_items_vat_rate_check" CHECK (("vat_rate" >= (0)::numeric))
);


ALTER TABLE "public"."pv_offer_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pv_offer_number_counters" (
    "year" integer NOT NULL,
    "last_number" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."pv_offer_number_counters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pv_offers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "offer_number" "text",
    "lead_id" "uuid",
    "client_id" "uuid",
    "created_by" "uuid" NOT NULL,
    "assigned_to" "uuid",
    "customer_name" "text" NOT NULL,
    "customer_phone" "text",
    "customer_email" "text",
    "customer_city" "text",
    "investment_address" "text",
    "pv_power_kw" numeric NOT NULL,
    "panel_power_w" integer,
    "panel_count" integer,
    "inverter_name" "text",
    "structure_type" "text",
    "roof_type" "text",
    "installation_type" "text",
    "annual_production_kwh" numeric,
    "price_net" numeric DEFAULT 0 NOT NULL,
    "vat_rate" numeric DEFAULT 8 NOT NULL,
    "price_gross" numeric DEFAULT 0 NOT NULL,
    "margin_value" numeric,
    "margin_percent" numeric,
    "offer_note" "text",
    "internal_note" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "valid_until" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "offer_type" "text" DEFAULT 'pv'::"text" NOT NULL,
    "sales_markup_value" numeric DEFAULT 0 NOT NULL,
    "customer_discount_value" numeric DEFAULT 0 NOT NULL,
    CONSTRAINT "pv_offers_customer_discount_check" CHECK (("customer_discount_value" >= (0)::numeric)),
    CONSTRAINT "pv_offers_offer_type_check" CHECK (("offer_type" = ANY (ARRAY['pv'::"text", 'pv_me'::"text", 'me'::"text", 'individual'::"text"]))),
    CONSTRAINT "pv_offers_sales_markup_check" CHECK (("sales_markup_value" >= (0)::numeric)),
    CONSTRAINT "pv_offers_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'sent'::"text", 'accepted'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."pv_offers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales_leads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "email" "text",
    "city" "text",
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "service_type" "text",
    "qualification_note" "text",
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "is_favorite" boolean DEFAULT false NOT NULL,
    "primary_assigned_to" "uuid",
    "secondary_assigned_to" "uuid",
    "created_by" "uuid" NOT NULL,
    "next_follow_up_at" timestamp with time zone,
    "follow_up_note" "text",
    "converted_client_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "sales_leads_source_check" CHECK (("source" = ANY (ARRAY['website'::"text", 'facebook_ads'::"text", 'manual'::"text"]))),
    CONSTRAINT "sales_leads_status_check" CHECK (("status" = ANY (ARRAY['new'::"text", 'follow_up'::"text", 'offered'::"text", 'won'::"text", 'lost'::"text"])))
);


ALTER TABLE "public"."sales_leads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "author_id" "uuid",
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."task_comments" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_comments" IS 'Komentarze do zadań';



CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'do_zrobienia'::"text" NOT NULL,
    "priority" "text" DEFAULT 'normalny'::"text" NOT NULL,
    "due_date" "date" DEFAULT CURRENT_DATE,
    "created_by" "uuid",
    "assigned_to" "uuid",
    "investment_id" "uuid",
    "awaiting_response" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "last_activity_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_bumped_at" timestamp with time zone,
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    CONSTRAINT "tasks_priority_check" CHECK (("priority" = ANY (ARRAY['normalny'::"text", 'pilny'::"text", 'krytyczny'::"text"]))),
    CONSTRAINT "tasks_status_check" CHECK (("status" = ANY (ARRAY['do_zrobienia'::"text", 'w_trakcie'::"text", 'czeka'::"text", 'zrobione'::"text"])))
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


COMMENT ON TABLE "public"."tasks" IS 'Zadania — rdzeń aplikacji';



COMMENT ON COLUMN "public"."tasks"."archived_at" IS 'When the task was archived (NULL = active)';



COMMENT ON COLUMN "public"."tasks"."archived_by" IS 'Who archived the task';



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_comments"
    ADD CONSTRAINT "client_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investment_comments"
    ADD CONSTRAINT "investment_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investment_members"
    ADD CONSTRAINT "investment_members_pkey" PRIMARY KEY ("investment_id", "user_id");



ALTER TABLE ONLY "public"."investments"
    ADD CONSTRAINT "investments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_activity_log"
    ADD CONSTRAINT "lead_activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_comments"
    ADD CONSTRAINT "lead_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."offer_settings"
    ADD CONSTRAINT "offer_settings_offer_type_unique" UNIQUE ("offer_type");



ALTER TABLE ONLY "public"."offer_settings"
    ADD CONSTRAINT "offer_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pv_components"
    ADD CONSTRAINT "pv_components_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pv_offer_items"
    ADD CONSTRAINT "pv_offer_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pv_offer_number_counters"
    ADD CONSTRAINT "pv_offer_number_counters_pkey" PRIMARY KEY ("year");



ALTER TABLE ONLY "public"."pv_offers"
    ADD CONSTRAINT "pv_offers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_leads"
    ADD CONSTRAINT "sales_leads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_activity_investment" ON "public"."activity_log" USING "btree" ("investment_id");



CREATE INDEX "idx_activity_task" ON "public"."activity_log" USING "btree" ("task_id");



CREATE INDEX "idx_client_comments_client_id" ON "public"."client_comments" USING "btree" ("client_id");



CREATE INDEX "idx_clients_assigned_to" ON "public"."clients" USING "btree" ("assigned_to");



CREATE INDEX "idx_clients_created_by" ON "public"."clients" USING "btree" ("created_by");



CREATE INDEX "idx_clients_created_from_lead" ON "public"."clients" USING "btree" ("created_from_lead_id");



CREATE INDEX "idx_clients_full_name" ON "public"."clients" USING "btree" ("full_name");



CREATE INDEX "idx_clients_phone" ON "public"."clients" USING "btree" ("phone");



CREATE INDEX "idx_inv_comments_inv" ON "public"."investment_comments" USING "btree" ("investment_id");



CREATE INDEX "idx_inv_members_user_id" ON "public"."investment_members" USING "btree" ("user_id");



CREATE INDEX "idx_investments_archived_at" ON "public"."investments" USING "btree" ("archived_at");



CREATE INDEX "idx_investments_client_id" ON "public"."investments" USING "btree" ("client_id");



CREATE INDEX "idx_investments_created_by" ON "public"."investments" USING "btree" ("created_by");



CREATE INDEX "idx_investments_status" ON "public"."investments" USING "btree" ("status");



CREATE INDEX "idx_lead_activity_log_lead_id" ON "public"."lead_activity_log" USING "btree" ("lead_id");



CREATE INDEX "idx_lead_comments_lead_id" ON "public"."lead_comments" USING "btree" ("lead_id");



CREATE INDEX "idx_notif_is_read" ON "public"."notifications" USING "btree" ("is_read");



CREATE INDEX "idx_notif_recipient" ON "public"."notifications" USING "btree" ("recipient_id");



CREATE INDEX "idx_profiles_is_active" ON "public"."profiles" USING "btree" ("is_active");



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_push_sub_user_active" ON "public"."push_subscriptions" USING "btree" ("user_id") WHERE ("is_active" = true);



CREATE INDEX "idx_pv_components_active" ON "public"."pv_components" USING "btree" ("active");



CREATE INDEX "idx_pv_components_category" ON "public"."pv_components" USING "btree" ("category");



CREATE INDEX "idx_pv_components_created_by" ON "public"."pv_components" USING "btree" ("created_by");



CREATE INDEX "idx_pv_components_trade_name" ON "public"."pv_components" USING "btree" ("trade_name");



CREATE INDEX "idx_pv_offer_items_category" ON "public"."pv_offer_items" USING "btree" ("category");



CREATE INDEX "idx_pv_offer_items_component_id" ON "public"."pv_offer_items" USING "btree" ("component_id");



CREATE INDEX "idx_pv_offer_items_offer_id" ON "public"."pv_offer_items" USING "btree" ("offer_id");



CREATE INDEX "idx_pv_offer_items_sort_order" ON "public"."pv_offer_items" USING "btree" ("sort_order");



CREATE INDEX "idx_pv_offers_assigned_to" ON "public"."pv_offers" USING "btree" ("assigned_to");



CREATE INDEX "idx_pv_offers_client_id" ON "public"."pv_offers" USING "btree" ("client_id");



CREATE INDEX "idx_pv_offers_created_at" ON "public"."pv_offers" USING "btree" ("created_at");



CREATE INDEX "idx_pv_offers_created_by" ON "public"."pv_offers" USING "btree" ("created_by");



CREATE INDEX "idx_pv_offers_lead_id" ON "public"."pv_offers" USING "btree" ("lead_id");



CREATE UNIQUE INDEX "idx_pv_offers_offer_number_unique" ON "public"."pv_offers" USING "btree" ("offer_number") WHERE (("offer_number" IS NOT NULL) AND (TRIM(BOTH FROM "offer_number") <> ''::"text"));



CREATE INDEX "idx_pv_offers_offer_type" ON "public"."pv_offers" USING "btree" ("offer_type");



CREATE INDEX "idx_pv_offers_status" ON "public"."pv_offers" USING "btree" ("status");



CREATE INDEX "idx_sales_leads_created_by" ON "public"."sales_leads" USING "btree" ("created_by");



CREATE INDEX "idx_sales_leads_follow_up" ON "public"."sales_leads" USING "btree" ("next_follow_up_at");



CREATE INDEX "idx_sales_leads_primary_assigned" ON "public"."sales_leads" USING "btree" ("primary_assigned_to");



CREATE INDEX "idx_sales_leads_secondary_assigned" ON "public"."sales_leads" USING "btree" ("secondary_assigned_to");



CREATE INDEX "idx_sales_leads_source" ON "public"."sales_leads" USING "btree" ("source");



CREATE INDEX "idx_sales_leads_status" ON "public"."sales_leads" USING "btree" ("status");



CREATE INDEX "idx_task_comments_task" ON "public"."task_comments" USING "btree" ("task_id");



CREATE INDEX "idx_tasks_archived" ON "public"."tasks" USING "btree" ("archived_at") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_tasks_assigned_to" ON "public"."tasks" USING "btree" ("assigned_to");



CREATE INDEX "idx_tasks_awaiting" ON "public"."tasks" USING "btree" ("awaiting_response");



CREATE INDEX "idx_tasks_created_by" ON "public"."tasks" USING "btree" ("created_by");



CREATE INDEX "idx_tasks_investment_id" ON "public"."tasks" USING "btree" ("investment_id");



CREATE INDEX "idx_tasks_status" ON "public"."tasks" USING "btree" ("status");



CREATE UNIQUE INDEX "uq_push_sub_active_subscription" ON "public"."push_subscriptions" USING "btree" ("onesignal_subscription_id") WHERE ("is_active" = true);



CREATE UNIQUE INDEX "uq_push_sub_user_subscription" ON "public"."push_subscriptions" USING "btree" ("user_id", "onesignal_subscription_id");



CREATE OR REPLACE TRIGGER "clients_updated_at" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "investments_updated_at" BEFORE UPDATE ON "public"."investments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "offer_settings_updated_at" BEFORE UPDATE ON "public"."offer_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "push_subscriptions_updated_at" BEFORE UPDATE ON "public"."push_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "pv_components_updated_at" BEFORE UPDATE ON "public"."pv_components" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "pv_offer_items_updated_at" BEFORE UPDATE ON "public"."pv_offer_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "pv_offers_auto_number" BEFORE INSERT ON "public"."pv_offers" FOR EACH ROW EXECUTE FUNCTION "public"."trg_pv_offer_auto_number"();



CREATE OR REPLACE TRIGGER "pv_offers_updated_at" BEFORE UPDATE ON "public"."pv_offers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "sales_leads_updated_at" BEFORE UPDATE ON "public"."sales_leads" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "tasks_completion" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."handle_task_completion"();



CREATE OR REPLACE TRIGGER "tasks_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "public"."investments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."client_comments"
    ADD CONSTRAINT "client_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."client_comments"
    ADD CONSTRAINT "client_comments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_created_from_lead_id_fkey" FOREIGN KEY ("created_from_lead_id") REFERENCES "public"."sales_leads"("id");



ALTER TABLE ONLY "public"."investment_comments"
    ADD CONSTRAINT "investment_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."investment_comments"
    ADD CONSTRAINT "investment_comments_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "public"."investments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investment_members"
    ADD CONSTRAINT "investment_members_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "public"."investments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investment_members"
    ADD CONSTRAINT "investment_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investments"
    ADD CONSTRAINT "investments_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."investments"
    ADD CONSTRAINT "investments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."investments"
    ADD CONSTRAINT "investments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."lead_activity_log"
    ADD CONSTRAINT "lead_activity_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."lead_activity_log"
    ADD CONSTRAINT "lead_activity_log_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."sales_leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_comments"
    ADD CONSTRAINT "lead_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."lead_comments"
    ADD CONSTRAINT "lead_comments_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."sales_leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "public"."investments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."offer_settings"
    ADD CONSTRAINT "offer_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pv_components"
    ADD CONSTRAINT "pv_components_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."pv_components"
    ADD CONSTRAINT "pv_components_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."pv_offer_items"
    ADD CONSTRAINT "pv_offer_items_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "public"."pv_components"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pv_offer_items"
    ADD CONSTRAINT "pv_offer_items_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."pv_offers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pv_offers"
    ADD CONSTRAINT "pv_offers_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."pv_offers"
    ADD CONSTRAINT "pv_offers_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."pv_offers"
    ADD CONSTRAINT "pv_offers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."pv_offers"
    ADD CONSTRAINT "pv_offers_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."sales_leads"("id");



ALTER TABLE ONLY "public"."sales_leads"
    ADD CONSTRAINT "sales_leads_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."sales_leads"
    ADD CONSTRAINT "sales_leads_primary_assigned_to_fkey" FOREIGN KEY ("primary_assigned_to") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."sales_leads"
    ADD CONSTRAINT "sales_leads_secondary_assigned_to_fkey" FOREIGN KEY ("secondary_assigned_to") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "public"."investments"("id") ON DELETE SET NULL;



CREATE POLICY "Admin can delete any push subscription" ON "public"."push_subscriptions" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can read all push subscriptions" ON "public"."push_subscriptions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can update any profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "profiles_1"
  WHERE (("profiles_1"."id" = "auth"."uid"()) AND ("profiles_1"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "profiles_1"
  WHERE (("profiles_1"."id" = "auth"."uid"()) AND ("profiles_1"."role" = 'admin'::"text")))));



CREATE POLICY "Authenticated users can read active profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "Owner can delete own push subscriptions" ON "public"."push_subscriptions" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert own push subscriptions" ON "public"."push_subscriptions" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can read own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "Users can read own push subscriptions" ON "public"."push_subscriptions" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



COMMENT ON POLICY "Users can read own push subscriptions" ON "public"."push_subscriptions" IS 'Users read own subs; Edge Function uses service_role to read any user subs';



CREATE POLICY "Users can update own profile except role" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK ((("id" = "auth"."uid"()) AND ("role" = ( SELECT "profiles_1"."role"
   FROM "public"."profiles" "profiles_1"
  WHERE ("profiles_1"."id" = "auth"."uid"())))));



CREATE POLICY "Users can update own push subscriptions" ON "public"."push_subscriptions" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."activity_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "activity_log_delete" ON "public"."activity_log" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "activity_log_insert" ON "public"."activity_log" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "activity_log_select" ON "public"."activity_log" FOR SELECT TO "authenticated" USING (((("task_id" IS NOT NULL) AND "public"."can_see_task"("task_id")) OR (("investment_id" IS NOT NULL) AND "public"."can_see_investment"("investment_id")) OR "public"."is_admin"()));



ALTER TABLE "public"."client_comments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_comments_delete" ON "public"."client_comments" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "client_comments_insert" ON "public"."client_comments" FOR INSERT TO "authenticated" WITH CHECK (("public"."can_see_client"("client_id") AND ("author_id" = "auth"."uid"())));



CREATE POLICY "client_comments_select" ON "public"."client_comments" FOR SELECT TO "authenticated" USING ("public"."can_see_client"("client_id"));



ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clients_delete" ON "public"."clients" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "clients_insert" ON "public"."clients" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_active_user"() AND ("created_by" = "auth"."uid"()) AND (("created_from_lead_id" IS NULL) OR "public"."can_see_lead"("created_from_lead_id"))));



CREATE POLICY "clients_select" ON "public"."clients" FOR SELECT TO "authenticated" USING (("public"."is_admin_or_administracja"() OR ("created_by" = "auth"."uid"()) OR ("assigned_to" = "auth"."uid"())));



CREATE POLICY "clients_update" ON "public"."clients" FOR UPDATE TO "authenticated" USING (("public"."is_admin_or_administracja"() OR ("created_by" = "auth"."uid"()) OR ("assigned_to" = "auth"."uid"()))) WITH CHECK (("public"."is_admin_or_administracja"() OR ("created_by" = "auth"."uid"()) OR ("assigned_to" = "auth"."uid"())));



ALTER TABLE "public"."investment_comments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "investment_comments_delete" ON "public"."investment_comments" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "investment_comments_insert" ON "public"."investment_comments" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_active_user"());



CREATE POLICY "investment_comments_select" ON "public"."investment_comments" FOR SELECT TO "authenticated" USING ("public"."is_active_user"());



ALTER TABLE "public"."investment_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "investment_members_delete" ON "public"."investment_members" FOR DELETE TO "authenticated" USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."investments" "i"
  WHERE (("i"."id" = "investment_members"."investment_id") AND ("i"."created_by" = "auth"."uid"()))))));



CREATE POLICY "investment_members_insert" ON "public"."investment_members" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."investments" "i"
  WHERE (("i"."id" = "investment_members"."investment_id") AND ("i"."created_by" = "auth"."uid"()))))));



CREATE POLICY "investment_members_select" ON "public"."investment_members" FOR SELECT TO "authenticated" USING ("public"."is_active_user"());



ALTER TABLE "public"."investments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "investments_delete" ON "public"."investments" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "investments_insert" ON "public"."investments" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_active_user"());



CREATE POLICY "investments_select" ON "public"."investments" FOR SELECT TO "authenticated" USING ("public"."is_active_user"());



CREATE POLICY "investments_update" ON "public"."investments" FOR UPDATE TO "authenticated" USING ("public"."is_active_user"()) WITH CHECK ("public"."is_active_user"());



ALTER TABLE "public"."lead_activity_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lead_activity_log_delete" ON "public"."lead_activity_log" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "lead_activity_log_insert" ON "public"."lead_activity_log" FOR INSERT TO "authenticated" WITH CHECK (("public"."can_see_lead"("lead_id") AND ("actor_id" = "auth"."uid"())));



CREATE POLICY "lead_activity_log_select" ON "public"."lead_activity_log" FOR SELECT TO "authenticated" USING ("public"."can_see_lead"("lead_id"));



ALTER TABLE "public"."lead_comments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lead_comments_delete" ON "public"."lead_comments" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "lead_comments_insert" ON "public"."lead_comments" FOR INSERT TO "authenticated" WITH CHECK (("public"."can_see_lead"("lead_id") AND ("author_id" = "auth"."uid"())));



CREATE POLICY "lead_comments_select" ON "public"."lead_comments" FOR SELECT TO "authenticated" USING ("public"."can_see_lead"("lead_id"));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_delete" ON "public"."notifications" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "notifications_insert" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "notifications_select" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("recipient_id" = "auth"."uid"()));



CREATE POLICY "notifications_update" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("recipient_id" = "auth"."uid"())) WITH CHECK (("recipient_id" = "auth"."uid"()));



ALTER TABLE "public"."offer_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "offer_settings_insert" ON "public"."offer_settings" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "offer_settings_select" ON "public"."offer_settings" FOR SELECT USING ("public"."is_active_user"());



CREATE POLICY "offer_settings_update" ON "public"."offer_settings" FOR UPDATE USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pv_components" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pv_components_delete" ON "public"."pv_components" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "pv_components_insert" ON "public"."pv_components" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin_or_administracja"() AND ("created_by" = "auth"."uid"()) AND (("updated_by" IS NULL) OR ("updated_by" = "auth"."uid"()))));



CREATE POLICY "pv_components_select" ON "public"."pv_components" FOR SELECT TO "authenticated" USING (("public"."is_admin_or_administracja"() OR ("public"."is_active_user"() AND ("active" = true))));



CREATE POLICY "pv_components_update" ON "public"."pv_components" FOR UPDATE TO "authenticated" USING ("public"."is_admin_or_administracja"()) WITH CHECK (("public"."is_admin_or_administracja"() AND (("updated_by" IS NULL) OR ("updated_by" = "auth"."uid"()))));



ALTER TABLE "public"."pv_offer_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pv_offer_items_delete" ON "public"."pv_offer_items" FOR DELETE TO "authenticated" USING ("public"."can_see_pv_offer"("offer_id"));



CREATE POLICY "pv_offer_items_insert" ON "public"."pv_offer_items" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_see_pv_offer"("offer_id"));



CREATE POLICY "pv_offer_items_select" ON "public"."pv_offer_items" FOR SELECT TO "authenticated" USING ("public"."can_see_pv_offer"("offer_id"));



CREATE POLICY "pv_offer_items_update" ON "public"."pv_offer_items" FOR UPDATE TO "authenticated" USING ("public"."can_see_pv_offer"("offer_id")) WITH CHECK ("public"."can_see_pv_offer"("offer_id"));



ALTER TABLE "public"."pv_offer_number_counters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pv_offers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pv_offers_delete" ON "public"."pv_offers" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "pv_offers_insert" ON "public"."pv_offers" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_active_user"() AND ("created_by" = "auth"."uid"()) AND (("lead_id" IS NULL) OR "public"."can_see_lead"("lead_id")) AND (("client_id" IS NULL) OR "public"."can_see_client"("client_id"))));



CREATE POLICY "pv_offers_select" ON "public"."pv_offers" FOR SELECT TO "authenticated" USING (("public"."is_admin_or_administracja"() OR ("created_by" = "auth"."uid"()) OR ("assigned_to" = "auth"."uid"()) OR (("lead_id" IS NOT NULL) AND "public"."can_see_lead"("lead_id")) OR (("client_id" IS NOT NULL) AND "public"."can_see_client"("client_id"))));



CREATE POLICY "pv_offers_update" ON "public"."pv_offers" FOR UPDATE TO "authenticated" USING (("public"."is_admin_or_administracja"() OR ("created_by" = "auth"."uid"()) OR ("assigned_to" = "auth"."uid"()) OR (("lead_id" IS NOT NULL) AND "public"."can_see_lead"("lead_id")) OR (("client_id" IS NOT NULL) AND "public"."can_see_client"("client_id")))) WITH CHECK (("public"."is_admin_or_administracja"() OR ("created_by" = "auth"."uid"()) OR ("assigned_to" = "auth"."uid"()) OR (("lead_id" IS NOT NULL) AND "public"."can_see_lead"("lead_id")) OR (("client_id" IS NOT NULL) AND "public"."can_see_client"("client_id"))));



ALTER TABLE "public"."sales_leads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sales_leads_delete" ON "public"."sales_leads" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "sales_leads_insert" ON "public"."sales_leads" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_active_user"() AND ("created_by" = "auth"."uid"())));



CREATE POLICY "sales_leads_select" ON "public"."sales_leads" FOR SELECT TO "authenticated" USING (("public"."is_admin_or_administracja"() OR ("created_by" = "auth"."uid"()) OR ("primary_assigned_to" = "auth"."uid"()) OR ("secondary_assigned_to" = "auth"."uid"())));



CREATE POLICY "sales_leads_update" ON "public"."sales_leads" FOR UPDATE TO "authenticated" USING (("public"."is_admin_or_administracja"() OR ("created_by" = "auth"."uid"()) OR ("primary_assigned_to" = "auth"."uid"()) OR ("secondary_assigned_to" = "auth"."uid"()))) WITH CHECK (("public"."is_admin_or_administracja"() OR ("created_by" = "auth"."uid"()) OR ("primary_assigned_to" = "auth"."uid"()) OR ("secondary_assigned_to" = "auth"."uid"())));



ALTER TABLE "public"."task_comments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "task_comments_delete" ON "public"."task_comments" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "task_comments_insert" ON "public"."task_comments" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_see_task"("task_id"));



CREATE POLICY "task_comments_select" ON "public"."task_comments" FOR SELECT TO "authenticated" USING ("public"."can_see_task"("task_id"));



ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tasks_delete" ON "public"."tasks" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "tasks_insert" ON "public"."tasks" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "tasks_select" ON "public"."tasks" FOR SELECT TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR ("assigned_to" = "auth"."uid"()) OR (("investment_id" IS NOT NULL) AND "public"."is_investment_member"("investment_id")) OR "public"."is_admin"()));



CREATE POLICY "tasks_update" ON "public"."tasks" FOR UPDATE TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR ("assigned_to" = "auth"."uid"()) OR "public"."is_admin"())) WITH CHECK ((("created_by" = "auth"."uid"()) OR ("assigned_to" = "auth"."uid"()) OR "public"."is_admin"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."can_see_client"("_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_see_client"("_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_see_client"("_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_see_investment"("_investment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_see_investment"("_investment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_see_investment"("_investment_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_see_lead"("_lead_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_see_lead"("_lead_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_see_lead"("_lead_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_see_pv_offer"("_offer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_see_pv_offer"("_offer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_see_pv_offer"("_offer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_see_task"("_task_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_see_task"("_task_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_see_task"("_task_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_task_completion"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_task_completion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_task_completion"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_active_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_active_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_active_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_or_administracja"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_or_administracja"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_or_administracja"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_investment_creator"("_investment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_investment_creator"("_investment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_investment_creator"("_investment_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_investment_member"("_investment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_investment_member"("_investment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_investment_member"("_investment_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."next_pv_offer_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."next_pv_offer_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."next_pv_offer_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_pv_offer_auto_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_pv_offer_auto_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_pv_offer_auto_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."activity_log" TO "anon";
GRANT ALL ON TABLE "public"."activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_log" TO "service_role";



GRANT ALL ON TABLE "public"."client_comments" TO "anon";
GRANT ALL ON TABLE "public"."client_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."client_comments" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."investment_comments" TO "anon";
GRANT ALL ON TABLE "public"."investment_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."investment_comments" TO "service_role";



GRANT ALL ON TABLE "public"."investment_members" TO "anon";
GRANT ALL ON TABLE "public"."investment_members" TO "authenticated";
GRANT ALL ON TABLE "public"."investment_members" TO "service_role";



GRANT ALL ON TABLE "public"."investments" TO "anon";
GRANT ALL ON TABLE "public"."investments" TO "authenticated";
GRANT ALL ON TABLE "public"."investments" TO "service_role";



GRANT ALL ON TABLE "public"."lead_activity_log" TO "anon";
GRANT ALL ON TABLE "public"."lead_activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_activity_log" TO "service_role";



GRANT ALL ON TABLE "public"."lead_comments" TO "anon";
GRANT ALL ON TABLE "public"."lead_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_comments" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."offer_settings" TO "anon";
GRANT ALL ON TABLE "public"."offer_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."offer_settings" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."pv_components" TO "anon";
GRANT ALL ON TABLE "public"."pv_components" TO "authenticated";
GRANT ALL ON TABLE "public"."pv_components" TO "service_role";



GRANT ALL ON TABLE "public"."pv_offer_items" TO "anon";
GRANT ALL ON TABLE "public"."pv_offer_items" TO "authenticated";
GRANT ALL ON TABLE "public"."pv_offer_items" TO "service_role";



GRANT ALL ON TABLE "public"."pv_offer_number_counters" TO "anon";
GRANT ALL ON TABLE "public"."pv_offer_number_counters" TO "authenticated";
GRANT ALL ON TABLE "public"."pv_offer_number_counters" TO "service_role";



GRANT ALL ON TABLE "public"."pv_offers" TO "anon";
GRANT ALL ON TABLE "public"."pv_offers" TO "authenticated";
GRANT ALL ON TABLE "public"."pv_offers" TO "service_role";



GRANT ALL ON TABLE "public"."sales_leads" TO "anon";
GRANT ALL ON TABLE "public"."sales_leads" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_leads" TO "service_role";



GRANT ALL ON TABLE "public"."task_comments" TO "anon";
GRANT ALL ON TABLE "public"."task_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."task_comments" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































