/**
 * Supabase Edge Function: ingest-lead
 * ─────────────────────────────────────────────────────────────
 * Accepts leads from Zapier (Excel → Zapier → POST) and saves
 * them into sales_leads for the admin Lead Drum.
 *
 * Auth: x-ingest-secret header (shared secret, not JWT).
 * Insert: via service_role client (bypasses RLS).
 *
 * Deploy with: npx supabase functions deploy ingest-lead
 *
 * Environment (auto-injected by Supabase):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Secrets required (set via supabase secrets set):
 *   LEAD_INGEST_SECRET
 */

// @ts-ignore – Deno runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore – Deno runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── CORS ────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-ingest-secret, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ─── Field resolver helper ──────────────────────────────
// Excel columns can have inconsistent names. This resolves
// a value from multiple possible field names.

function pick(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    if (obj[k] != null && String(obj[k]).trim() !== "") return String(obj[k]).trim();
    // Try case-insensitive + trimmed match
    const lower = k.toLowerCase();
    for (const [ok, ov] of Object.entries(obj)) {
      if (ok.toLowerCase().trim() === lower && ov != null && String(ov).trim() !== "") {
        return String(ov).trim();
      }
    }
  }
  return null;
}

// ─── Mappers ─────────────────────────────────────────────

function mapDomy(p: Record<string, unknown>) {
  return {
    decision_stage: pick(p, "D-01 Etap", "D-01", "Etap", "etap"),
    desired_timeline: pick(p, "D-02 Termin", "D-02", "Termin", "termin"),
    has_plot: pick(p, "D-03 Działka", "D-03", "Działka", "dzialka", "działka"),
    location_text: pick(p, "D-04 Lokalizacja", "D-04", "Lokalizacja", "lokalizacja"),
    planning_status: pick(p, "D-05 Plan/WZ", "D-05", "Plan/WZ", "plan_wz"),
    documentation_status: pick(p, "D-06 Dokumenty", "D-06", "Dokumenty", "dokumenty"),
    project_status: pick(p, "D-07 Projekt", "D-07", "Projekt", "projekt"),
    expected_support_scope: pick(p, "D-08 Wsparcie", "D-08", "Wsparcie", "wsparcie"),
    house_area_range: pick(p, "D-09 Metraż", "D-09", "Metraż", "metraz", "metraż"),
    house_layout_type: pick(p, "D-10 Układ", "D-10", "Układ", "uklad", "układ"),
    client_priorities: pick(p, "D-11 Priorytety", "D-11", "Priorytety", "priorytety"),
    contact_name: pick(p, "D-12 Imię i nazwisko", "D-12", "Imię i nazwisko", "imie_i_nazwisko", "imię i nazwisko", "Imię"),
    contact_phone: pick(p, "D-13 Telefon", "D-13", "Telefon", "telefon", "phone"),
    contact_email: pick(p, "D-14 E-mail", "D-14", "E-mail", "email", "Email", "e-mail"),
    investment_description_raw: pick(p, "D-15 Uwagi", "D-15", "Uwagi", "uwagi"),
  };
}

function mapHale(p: Record<string, unknown>) {
  return {
    hall_object_type: pick(p, "H-01 Obiekt", "H-01", "Obiekt", "obiekt"),
    hall_investment_kind: pick(p, "H-02 Rodzaj", "H-02", "Rodzaj", "rodzaj"),
    desired_timeline: pick(p, "H-03 Termin", "H-03", "Termin", "termin"),
    has_plot: pick(p, "H-04 Działka", "H-04", "Działka", "dzialka", "działka"),
    hall_planning_status: pick(p, "H-05 Plan/WZ", "H-05", "Plan/WZ", "plan_wz"),
    has_architectural_project: pick(p, "H-06 Projekt", "H-06", "Projekt", "projekt"),
    hall_width: pick(p, "H-07 Szerokość", "H-07", "Szerokość", "szerokosc", "szerokość"),
    hall_length: pick(p, "H-08 Długość", "H-08", "Długość", "dlugosc", "długość"),
    hall_height: pick(p, "H-09 Wysokość", "H-09", "Wysokość", "wysokosc", "wysokość"),
    roof_type: pick(p, "H-10 Dach", "H-10", "Dach", "dach"),
    hall_form: pick(p, "H-11 Forma", "H-11", "Forma", "forma"),
    permit_mode: pick(p, "H-12 Tryb", "H-12", "Tryb", "tryb"),
    expected_scope: pick(p, "H-13 Zakres", "H-13", "Zakres", "zakres"),
    contact_name: pick(p, "H-14 Firma/osoba", "H-14", "Firma/osoba", "Firma", "firma", "Imię i nazwisko"),
    contact_phone: pick(p, "H-15 Telefon", "H-15", "Telefon", "telefon", "phone"),
    contact_email: pick(p, "H-16 E-mail", "H-16", "E-mail", "email", "Email", "e-mail"),
    investment_description_raw: pick(p, "H-17 Uwagi", "H-17", "Uwagi", "uwagi"),
  };
}

function mapInstalacje(p: Record<string, unknown>) {
  return {
    installation_scope: pick(p, "I-01 Zakres", "I-01", "Zakres", "zakres"),
    installation_object_type: pick(p, "I-02 Obiekt", "I-02", "Obiekt", "obiekt"),
    location_text: pick(p, "I-03 Lokalizacja", "I-03", "Lokalizacja", "lokalizacja"),
    installation_investment_kind: pick(p, "I-04 Typ inwestycji", "I-04", "Typ inwestycji", "typ_inwestycji"),
    desired_timeline: pick(p, "I-05 Termin", "I-05", "Termin", "termin"),
    installation_client_needs: pick(p, "I-06 Potrzeby", "I-06", "Potrzeby", "potrzeby"),
    contact_phone: pick(p, "I-07 Telefon", "I-07", "Telefon", "telefon", "phone"),
    contact_email: pick(p, "I-08 E-mail", "I-08", "E-mail", "email", "Email", "e-mail"),
    installation_description_raw: pick(p, "I-09 Opis tematu", "I-09", "Opis tematu", "opis", "Opis"),
    contact_name: pick(p, "Imię i nazwisko", "Firma", "Imię", "imie") || "Lead instalacje",
  };
}

// ─── Duplicate check ─────────────────────────────────────

async function checkDuplicate(
  client: ReturnType<typeof createClient>,
  sourceType: string,
  sourceRecordId: string | null,
  phone: string | null,
  email: string | null,
): Promise<string | null> {
  // Strategy 1: exact source_record_id match
  if (sourceRecordId) {
    const { data } = await client
      .from("sales_leads")
      .select("id")
      .eq("source_type", sourceType)
      .eq("source_record_id", sourceRecordId)
      .limit(1)
      .maybeSingle();
    if (data) return data.id;
  }

  // Strategy 2: same source_type + contact in last 24h
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  if (phone) {
    const { data } = await client
      .from("sales_leads")
      .select("id")
      .eq("source_type", sourceType)
      .eq("contact_phone", phone)
      .gte("created_at", since)
      .limit(1)
      .maybeSingle();
    if (data) return data.id;
  }

  if (email) {
    const { data } = await client
      .from("sales_leads")
      .select("id")
      .eq("source_type", sourceType)
      .eq("contact_email", email)
      .gte("created_at", since)
      .limit(1)
      .maybeSingle();
    if (data) return data.id;
  }

  return null;
}

// ─── Main handler ────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    // ── 1. Auth: shared secret ───────────────────────────
    // @ts-ignore – Deno.env
    const expectedSecret = Deno.env.get("LEAD_INGEST_SECRET") ?? "";
    const providedSecret = req.headers.get("x-ingest-secret") ?? "";

    if (!expectedSecret || providedSecret !== expectedSecret) {
      console.warn("[ingest-lead] REJECTED: invalid or missing x-ingest-secret");
      return json({ ok: false, error: "Unauthorized" }, 401);
    }

    // ── 2. Supabase service client ───────────────────────
    // @ts-ignore – Deno.env
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    // @ts-ignore – Deno.env
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseServiceKey) {
      console.error("[ingest-lead] SUPABASE_SERVICE_ROLE_KEY is empty!");
      return json({ ok: false, error: "internal_error" }, 500);
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // ── 3. Parse body ────────────────────────────────────
    const body = await req.json();
    const {
      source_type,
      investment_type,
      source_form_name,
      source_campaign,
      source_record_id,
      payload,
    } = body;

    if (!source_type || !investment_type || !payload || typeof payload !== "object") {
      return json({ ok: false, error: "source_type, investment_type, and payload are required" }, 400);
    }

    // ── 4. Map fields by type ────────────────────────────
    let mapped: Record<string, string | null> = {};

    if (investment_type === "dom" || source_type === "website_domy") {
      mapped = mapDomy(payload);
    } else if (investment_type === "hala" || source_type === "website_hale") {
      mapped = mapHale(payload);
    } else if (investment_type === "instalacja" || source_type === "website_instalacje") {
      mapped = mapInstalacje(payload);
    } else {
      // Generic: try to pick contact fields
      mapped = {
        contact_name: pick(payload, "Imię i nazwisko", "Firma", "name", "contact_name"),
        contact_phone: pick(payload, "Telefon", "telefon", "phone", "contact_phone"),
        contact_email: pick(payload, "E-mail", "email", "Email", "contact_email"),
        location_text: pick(payload, "Lokalizacja", "lokalizacja", "location"),
      };
    }

    // ── 5. Validate contact ──────────────────────────────
    const phone = mapped.contact_phone || null;
    const email = mapped.contact_email || null;

    if (!phone && !email) {
      return json({ ok: false, error: "At least one of contact_phone or contact_email is required" }, 400);
    }

    // ── 6. Check duplicates ──────────────────────────────
    const dupId = await checkDuplicate(serviceClient, source_type, source_record_id || null, phone, email);
    if (dupId) {
      console.log(`[ingest-lead] Duplicate detected: ${dupId}`);
      return json({ ok: true, duplicate: true, lead_id: dupId });
    }

    // ── 7. Determine defaults ────────────────────────────
    const finalSourceType = source_type;
    const finalInvestmentType = investment_type;
    const defaultFormNames: Record<string, string> = {
      website_domy: "METICAL_Briefy/Domy",
      website_hale: "METICAL_Briefy/Hale",
      website_instalacje: "METICAL_Briefy/Instalacje",
    };
    const finalFormName = source_form_name || defaultFormNames[source_type] || null;

    // ── 8. Build insert row ──────────────────────────────
    // Required legacy fields (full_name, phone have NOT NULL in DB)
    const fullName = mapped.contact_name || "Lead";
    const phoneVal = phone || "";

    const row: Record<string, unknown> = {
      // Legacy required fields
      full_name: fullName,
      phone: phoneVal,
      email: email,
      source: "website",
      status: "new",
      is_favorite: false,
      // We need a created_by but this is a system insert. Use a placeholder approach:
      // The sales_leads table requires created_by NOT NULL referencing profiles.
      // For system-inserted leads, we query the first admin user.
      // This will be set below after lookup.

      // Drum fields
      source_type: finalSourceType,
      source_record_id: source_record_id || null,
      source_payload_raw: payload,
      source_campaign: source_campaign || null,
      source_form_name: finalFormName,
      investment_type: finalInvestmentType,
      contact_name: mapped.contact_name || null,
      contact_phone: phone,
      contact_email: email,
      location_text: mapped.location_text || null,
      desired_timeline: mapped.desired_timeline || null,
      qualification_status: "new",
      sales_status: "not_started",
    };

    // Add all mapped brief fields (skip contact fields already set)
    const skipFields = new Set(["contact_name", "contact_phone", "contact_email", "location_text", "desired_timeline"]);
    for (const [k, v] of Object.entries(mapped)) {
      if (!skipFields.has(k) && v != null) {
        row[k] = v;
      }
    }

    // ── 9. Resolve created_by (system admin) ─────────────
    const { data: adminUser } = await serviceClient
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (!adminUser) {
      console.error("[ingest-lead] No active admin user found for created_by!");
      return json({ ok: false, error: "internal_error" }, 500);
    }
    row.created_by = adminUser.id;

    // ── 10. Insert ───────────────────────────────────────
    console.log(`[ingest-lead] Inserting lead: source=${finalSourceType}, type=${finalInvestmentType}, contact=${fullName}`);

    const { data: inserted, error: insertError } = await serviceClient
      .from("sales_leads")
      .insert(row)
      .select("id")
      .single();

    if (insertError) {
      console.error("[ingest-lead] Insert error:", insertError.message, insertError.details);
      return json({ ok: false, error: "insert_failed", details: insertError.message }, 500);
    }

    console.log(`[ingest-lead] Lead created: ${inserted.id}`);
    return json({ ok: true, lead_id: inserted.id, duplicate: false });

  } catch (err) {
    console.error("[ingest-lead] UNEXPECTED ERROR:", err);
    return json({ ok: false, error: "internal_error" }, 500);
  }
});
