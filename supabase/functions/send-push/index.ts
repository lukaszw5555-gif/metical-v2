/**
 * Supabase Edge Function: send-push
 * ─────────────────────────────────────────────────────────────
 * Sends a Web Push notification via OneSignal REST API.
 *
 * Auth: Requires a valid Supabase JWT (Authorization: Bearer …).
 *       Deploy with: npx supabase functions deploy send-push
 *
 * Secrets required (set via Supabase CLI):
 *   ONESIGNAL_APP_ID
 *   ONESIGNAL_REST_API_KEY
 *
 * Request body:
 * {
 *   "recipientId": "uuid",
 *   "title": "string",
 *   "body": "string",
 *   "url": "/tasks/xyz",
 *   "priority": "normal" | "critical"
 * }
 */

// @ts-ignore – Deno runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore – Deno runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ONESIGNAL_API = "https://onesignal.com/api/v1/notifications";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PushPayload {
  recipientId: string;
  title: string;
  body: string;
  url?: string;
  priority?: "normal" | "critical";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Auth ──────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.warn("[send-push] REJECTED: no Authorization header");
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // @ts-ignore – Deno.env
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    // @ts-ignore – Deno.env
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.warn("[send-push] REJECTED: auth failed:", authError?.message ?? "no user");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Secrets ──────────────────────────────────────────
    // @ts-ignore – Deno.env
    const appId = Deno.env.get("ONESIGNAL_APP_ID");
    // @ts-ignore – Deno.env
    const restApiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");

    if (!appId || !restApiKey) {
      console.error("[send-push] REJECTED: missing ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY");
      return new Response(
        JSON.stringify({ error: "Push service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Parse body ───────────────────────────────────────
    const payload: PushPayload = await req.json();
    const { recipientId, title, body, url, priority } = payload;

    if (!recipientId || !title || !body) {
      console.warn("[send-push] REJECTED: missing fields:", JSON.stringify({ recipientId, title, body }));
      return new Response(
        JSON.stringify({ error: "recipientId, title, and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Build URL ────────────────────────────────────────
    let finalUrl: string | undefined;
    if (url) {
      if (url.startsWith("http")) {
        finalUrl = url;
      } else {
        const origin = req.headers.get("origin")
          || req.headers.get("referer")?.replace(/\/[^/]*$/, "")
          || "";
        finalUrl = origin ? `${origin}${url}` : url;
      }
    }

    // ── Build OneSignal payload ──────────────────────────
    const oneSignalBody: Record<string, unknown> = {
      app_id: appId,
      include_aliases: {
        external_id: [recipientId],
      },
      target_channel: "push",
      headings: { en: title },
      contents: { en: body },
    };

    if (finalUrl) {
      oneSignalBody.url = finalUrl;
    }

    if (priority === "critical") {
      oneSignalBody.priority = 10;
    }

    // ── LOG: before sending ──────────────────────────────
    console.log("──────────────────────────────────────────");
    console.log("[send-push] >>> SENDING TO ONESIGNAL");
    console.log("[send-push] caller:", user.id, `(${user.email})`);
    console.log("[send-push] recipientId:", recipientId);
    console.log("[send-push] include_aliases:", JSON.stringify(oneSignalBody.include_aliases));
    console.log("[send-push] target_channel:", oneSignalBody.target_channel);
    console.log("[send-push] title:", title);
    console.log("[send-push] body:", body.slice(0, 100));
    console.log("[send-push] url:", finalUrl ?? "(none)");
    console.log("[send-push] priority:", priority ?? "normal");
    console.log("[send-push] full payload:", JSON.stringify(oneSignalBody));
    console.log("──────────────────────────────────────────");

    // ── Send ─────────────────────────────────────────────
    const response = await fetch(ONESIGNAL_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Basic ${restApiKey}`,
      },
      body: JSON.stringify(oneSignalBody),
    });

    const responseBody = await response.json();

    // ── LOG: after response ──────────────────────────────
    console.log("──────────────────────────────────────────");
    console.log("[send-push] <<< ONESIGNAL RESPONSE");
    console.log("[send-push] HTTP status:", response.status);
    console.log("[send-push] response body:", JSON.stringify(responseBody));
    console.log("[send-push] recipients:", responseBody?.recipients ?? "NOT IN RESPONSE");
    console.log("[send-push] errors:", responseBody?.errors ? JSON.stringify(responseBody.errors) : "none");
    console.log("[send-push] notification id:", responseBody?.id ?? "none");
    console.log("[send-push] external_id:", responseBody?.external_id ?? "NOT IN RESPONSE");
    console.log("──────────────────────────────────────────");

    // ── Error response ───────────────────────────────────
    if (!response.ok) {
      console.error(`[send-push] OneSignal HTTP ${response.status} ERROR`);
      return new Response(
        JSON.stringify({ error: "OneSignal API error", status: response.status, details: responseBody }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Zero recipients warning ──────────────────────────
    if (responseBody?.recipients === 0) {
      console.warn(
        `[send-push] ⚠️  ZERO RECIPIENTS — push was accepted by OneSignal but ` +
        `nobody received it. recipientId="${recipientId}" is not subscribed ` +
        `or the external_id in OneSignal does not match this Supabase user id.`
      );
    }

    // ── Errors array in 200 response ─────────────────────
    if (responseBody?.errors && Array.isArray(responseBody.errors) && responseBody.errors.length > 0) {
      console.warn("[send-push] ⚠️  OneSignal returned errors:", JSON.stringify(responseBody.errors));
    }

    return new Response(
      JSON.stringify({ success: true, onesignal: responseBody }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[send-push] UNEXPECTED ERROR:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
