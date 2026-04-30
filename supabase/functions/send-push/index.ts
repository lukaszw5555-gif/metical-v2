/**
 * Supabase Edge Function: send-push
 * ─────────────────────────────────────────────────────────────
 * Sends a Web Push notification via OneSignal REST API.
 *
 * Production targeting: looks up push_subscriptions table by
 * recipientId and sends via include_subscription_ids.
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
 *
 * Debug mode (bypasses DB lookup):
 *   "debugSubscriptionId": "sub-uuid"  // → include_subscription_ids directly
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
  debugSubscriptionId?: string;
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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    // @ts-ignore – Deno.env
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    // Auth client — uses caller's JWT to verify identity
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      console.warn("[send-push] REJECTED: auth failed:", authError?.message ?? "no user");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service client — bypasses RLS to read any user's subscriptions
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // ── Secrets ──────────────────────────────────────────
    // @ts-ignore – Deno.env
    const appId = Deno.env.get("ONESIGNAL_APP_ID");
    // @ts-ignore – Deno.env
    const restApiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");

    if (!appId || !restApiKey) {
      console.error("[send-push] REJECTED: missing ONESIGNAL secrets");
      return new Response(
        JSON.stringify({ error: "Push service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Parse body ───────────────────────────────────────
    const payload: PushPayload = await req.json();
    const { recipientId, title, body, url, priority, debugSubscriptionId } = payload;

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: "title and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!recipientId && !debugSubscriptionId) {
      return new Response(
        JSON.stringify({ error: "recipientId or debugSubscriptionId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Resolve subscription IDs ─────────────────────────
    let subscriptionIds: string[] = [];
    let targetingMode: string;

    if (debugSubscriptionId) {
      // Debug mode — direct subscription ID
      subscriptionIds = [debugSubscriptionId];
      targetingMode = `DEBUG → ${debugSubscriptionId}`;
    } else {
      // Production — look up from push_subscriptions table
      const { data: subs, error: subError } = await serviceClient
        .from("push_subscriptions")
        .select("onesignal_subscription_id")
        .eq("user_id", recipientId)
        .eq("is_active", true);

      if (subError) {
        console.error("[send-push] DB lookup error:", subError.message);
        return new Response(
          JSON.stringify({ error: "Failed to lookup subscriptions", details: subError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      subscriptionIds = (subs ?? []).map((s: { onesignal_subscription_id: string }) => s.onesignal_subscription_id);
      targetingMode = `PROD → user=${recipientId}, found ${subscriptionIds.length} subscription(s)`;
    }

    // ── No subscriptions found ───────────────────────────
    if (subscriptionIds.length === 0) {
      console.warn(`[send-push] NO ACTIVE SUBSCRIPTIONS for recipientId="${recipientId}"`);
      return new Response(
        JSON.stringify({
          success: false,
          reason: "NO_ACTIVE_SUBSCRIPTIONS",
          recipientId,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      include_subscription_ids: subscriptionIds,
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
    console.log("══════════════════════════════════════════");
    console.log("[send-push] >>> SENDING TO ONESIGNAL");
    console.log("[send-push] caller:", user.id, `(${user.email})`);
    console.log("[send-push] targeting:", targetingMode);
    console.log("[send-push] subscription_ids:", JSON.stringify(subscriptionIds));
    console.log("[send-push] title:", title);
    console.log("[send-push] body:", body.slice(0, 100));
    console.log("[send-push] url:", finalUrl ?? "(none)");
    console.log("[send-push] priority:", priority ?? "normal");
    console.log("[send-push] PAYLOAD:", JSON.stringify(oneSignalBody));
    console.log("══════════════════════════════════════════");

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
    console.log("══════════════════════════════════════════");
    console.log("[send-push] <<< ONESIGNAL RESPONSE");
    console.log("[send-push] HTTP status:", response.status);
    console.log("[send-push] RESPONSE:", JSON.stringify(responseBody));
    console.log("[send-push] recipients:", responseBody?.recipients ?? "NOT IN RESPONSE");
    console.log("[send-push] errors:", responseBody?.errors ? JSON.stringify(responseBody.errors) : "none");
    console.log("══════════════════════════════════════════");

    if (!response.ok) {
      console.error(`[send-push] OneSignal HTTP ${response.status} ERROR`);
      return new Response(
        JSON.stringify({ error: "OneSignal API error", status: response.status, details: responseBody }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (responseBody?.recipients === 0) {
      console.warn(`[send-push] ⚠️  ZERO RECIPIENTS: ${targetingMode}`);
    }

    if (responseBody?.errors && Array.isArray(responseBody.errors) && responseBody.errors.length > 0) {
      console.warn("[send-push] ⚠️  Errors:", JSON.stringify(responseBody.errors));
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
