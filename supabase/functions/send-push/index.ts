/**
 * Supabase Edge Function: send-push
 * ─────────────────────────────────────────────────────────────
 * Sends a Web Push notification via OneSignal REST API.
 *
 * Targeting: looks up push_subscriptions table by recipientId
 * using a service_role client (bypasses RLS), then sends via
 * include_subscription_ids.
 *
 * Auth flow:
 *   1. Verify caller via JWT (Authorization header + anon client)
 *   2. Read subscriptions via service_role client (bypasses RLS)
 *   3. Send to OneSignal
 *
 * Deploy with: npx supabase functions deploy send-push
 *
 * Environment (auto-injected by Supabase):
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Secrets required (set via supabase secrets set):
 *   ONESIGNAL_APP_ID
 *   ONESIGNAL_REST_API_KEY
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

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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
    // ── 1. Verify caller JWT ─────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.warn("[send-push] REJECTED: no Authorization header");
      return json({ error: "Missing Authorization header" }, 401);
    }

    // @ts-ignore – Deno.env
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    // @ts-ignore – Deno.env
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    // @ts-ignore – Deno.env
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Verify caller identity with their JWT
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      console.warn("[send-push] REJECTED: auth failed:", authError?.message ?? "no user");
      return json({ error: "Unauthorized" }, 401);
    }

    console.log(`[send-push] Caller authenticated: ${user.id} (${user.email})`);

    // ── 2. Validate service_role key ─────────────────────
    if (!supabaseServiceKey) {
      console.error(
        "[send-push] SUPABASE_SERVICE_ROLE_KEY is empty! " +
        "This key is auto-injected by Supabase into Edge Functions. " +
        "If missing, the function cannot read push_subscriptions for other users."
      );
      return json({ error: "Server misconfiguration: service key unavailable" }, 500);
    }

    // Service client — bypasses RLS to read any user's subscriptions
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // ── 3. Read OneSignal secrets ────────────────────────
    // @ts-ignore – Deno.env
    const appId = Deno.env.get("ONESIGNAL_APP_ID");
    // @ts-ignore – Deno.env
    const restApiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");

    if (!appId || !restApiKey) {
      console.error("[send-push] Missing ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY");
      return json({ error: "Push service not configured" }, 500);
    }

    // ── 4. Parse request body ────────────────────────────
    const payload: PushPayload = await req.json();
    const { recipientId, title, body, url, priority, debugSubscriptionId } = payload;

    if (!title || !body) {
      return json({ error: "title and body are required" }, 400);
    }
    if (!recipientId && !debugSubscriptionId) {
      return json({ error: "recipientId or debugSubscriptionId is required" }, 400);
    }

    // ── 5. Resolve subscription IDs ──────────────────────
    let subscriptionIds: string[] = [];
    let targetingMode: string;

    if (debugSubscriptionId) {
      // Debug: direct subscription ID, bypass DB
      subscriptionIds = [debugSubscriptionId];
      targetingMode = `DEBUG → ${debugSubscriptionId}`;
      console.log(`[send-push] Debug mode: using subscription ${debugSubscriptionId} directly`);

    } else {
      // Production: look up from push_subscriptions via service_role
      console.log(`[send-push] Looking up subscriptions for user: ${recipientId}`);

      const { data: subs, error: subError } = await serviceClient
        .from("push_subscriptions")
        .select("onesignal_subscription_id")
        .eq("user_id", recipientId)
        .eq("is_active", true);

      if (subError) {
        console.error("[send-push] DB query error:", subError.message, subError.details, subError.hint);
        return json({ error: "Failed to lookup subscriptions", details: subError.message }, 500);
      }

      console.log(`[send-push] DB query result: ${JSON.stringify(subs)}`);

      subscriptionIds = (subs ?? []).map(
        (s: { onesignal_subscription_id: string }) => s.onesignal_subscription_id
      );
      targetingMode = `PROD → user=${recipientId}, found ${subscriptionIds.length} sub(s)`;
    }

    // ── 6. No subscriptions? ─────────────────────────────
    if (subscriptionIds.length === 0) {
      console.warn(
        `[send-push] NO ACTIVE SUBSCRIPTIONS for recipientId="${recipientId}". ` +
        `User may not have clicked "Włącz powiadomienia push" yet.`
      );
      return json({ success: false, reason: "NO_ACTIVE_SUBSCRIPTIONS", recipientId });
    }

    // ── 7. Build URL ─────────────────────────────────────
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

    // ── 8. Build OneSignal payload ───────────────────────
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
    console.log("[send-push] caller:", user.id);
    console.log("[send-push] targeting:", targetingMode);
    console.log("[send-push] subscription_ids:", JSON.stringify(subscriptionIds));
    console.log("[send-push] title:", title);
    console.log("[send-push] url:", finalUrl ?? "(none)");
    console.log("[send-push] PAYLOAD:", JSON.stringify(oneSignalBody));
    console.log("══════════════════════════════════════════");

    // ── 9. Send to OneSignal ─────────────────────────────
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
    console.log("[send-push] HTTP:", response.status);
    console.log("[send-push] body:", JSON.stringify(responseBody));
    console.log("[send-push] recipients:", responseBody?.recipients ?? "N/A");
    console.log("[send-push] errors:", responseBody?.errors ? JSON.stringify(responseBody.errors) : "none");
    console.log("══════════════════════════════════════════");

    if (!response.ok) {
      return json({ error: "OneSignal API error", status: response.status, details: responseBody }, response.status);
    }

    if (responseBody?.recipients === 0) {
      console.warn(`[send-push] ⚠️ ZERO RECIPIENTS: ${targetingMode}`);
    }

    if (responseBody?.errors?.length > 0) {
      console.warn("[send-push] ⚠️ Errors:", JSON.stringify(responseBody.errors));
    }

    return json({ success: true, onesignal: responseBody });

  } catch (err) {
    console.error("[send-push] UNEXPECTED ERROR:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
