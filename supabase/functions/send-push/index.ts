/**
 * Supabase Edge Function: send-push
 * ─────────────────────────────────────────────────────────────
 * Sends a Web Push notification via OneSignal REST API.
 *
 * Auth: Requires a valid Supabase JWT (Authorization: Bearer …).
 *       Deploy with: supabase functions deploy send-push
 *
 * Secrets required (set via Supabase CLI):
 *   ONESIGNAL_APP_ID
 *   ONESIGNAL_REST_API_KEY
 *
 * Request body:
 * {
 *   "recipientId": "uuid",    // maps to OneSignal external_id
 *   "title": "string",
 *   "body": "string",
 *   "url": "/tasks/xyz",      // relative or absolute URL
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
  // ── CORS preflight ───────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Verify JWT — reject unauthenticated requests ──────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.warn("[send-push] No Authorization header");
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
      console.warn("[send-push] Auth failed:", authError?.message ?? "no user");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-push] Authenticated caller: ${user.id} (${user.email})`);

    // ── Read secrets ──────────────────────────────────────
    // @ts-ignore – Deno.env
    const appId = Deno.env.get("ONESIGNAL_APP_ID");
    // @ts-ignore – Deno.env
    const restApiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");

    if (!appId || !restApiKey) {
      console.error("[send-push] Missing ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY secrets.");
      return new Response(
        JSON.stringify({ error: "Push service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Parse request body ─────────────────────────────────
    const payload: PushPayload = await req.json();
    const { recipientId, title, body, url, priority } = payload;

    if (!recipientId || !title || !body) {
      console.warn("[send-push] Missing required fields:", { recipientId, title, body });
      return new Response(
        JSON.stringify({ error: "recipientId, title, and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[send-push] Request:", JSON.stringify({
      caller: user.id,
      recipientId,
      title,
      body: body.slice(0, 80),
      url,
      priority,
    }));

    // ── Build OneSignal request ────────────────────────────
    // Uses "include_aliases" with the User Model (OneSignal v5+)
    const oneSignalPayload: Record<string, unknown> = {
      app_id: appId,
      include_aliases: {
        external_id: [recipientId],
      },
      target_channel: "push",
      headings: { en: title },
      contents: { en: body },
    };

    // Build full URL from relative path if needed
    if (url) {
      if (url.startsWith("http")) {
        oneSignalPayload.url = url;
      } else {
        // Extract origin from request headers (set by the browser)
        const origin = req.headers.get("origin")
          || req.headers.get("referer")?.replace(/\/[^/]*$/, "")
          || "";
        if (origin) {
          oneSignalPayload.url = `${origin}${url}`;
        } else {
          oneSignalPayload.url = url;
        }
      }
    }

    // Priority: 10 = critical, 5 = normal (Android/Web)
    if (priority === "critical") {
      oneSignalPayload.priority = 10;
    }

    // Log the exact payload being sent to OneSignal (safe — no REST API key)
    console.log("[send-push] OneSignal payload:", JSON.stringify(oneSignalPayload));

    // ── Send to OneSignal ─────────────────────────────────
    const response = await fetch(ONESIGNAL_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Basic ${restApiKey}`,
      },
      body: JSON.stringify(oneSignalPayload),
    });

    const result = await response.json();

    // Always log the full OneSignal response
    console.log(`[send-push] OneSignal HTTP ${response.status}:`, JSON.stringify(result));

    if (!response.ok) {
      console.error(`[send-push] OneSignal error ${response.status}:`, JSON.stringify(result));
      return new Response(
        JSON.stringify({ error: "OneSignal API error", details: result }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Check for zero recipients ─────────────────────────
    const recipients = result?.recipients ?? null;
    if (recipients === 0) {
      console.warn(
        `[send-push] WARNING: OneSignal accepted but 0 recipients! ` +
        `recipientId="${recipientId}" — user may not be subscribed ` +
        `or external_id does not match any OneSignal player.`
      );
    } else {
      console.log(
        `[send-push] Push delivered: caller=${user.id} -> recipient=${recipientId}, ` +
        `recipients=${recipients}, notification_id=${result?.id ?? "n/a"}`
      );
    }

    return new Response(
      JSON.stringify({ success: true, onesignal: result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[send-push] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
