// @ts-ignore – Deno runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore – Deno runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore – Deno runtime
import PdfPrinter from "npm:pdfmake";
import { createOfferDefinition } from "./pdfLayout.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Standard Roboto fonts from a public CDN
const fonts = {
  Roboto: {
    normal: "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf",
    bold: "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Medium.ttf",
    italics: "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Italic.ttf",
    bolditalics: "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-MediumItalic.ttf",
  },
};

const printer = new PdfPrinter(fonts);

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Auth Validation ──────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Parse & Filter Data ──────────────────────────────────────
    const body = await req.json();
    if (!body || !body.offer_number) {
      return new Response(JSON.stringify({ error: "Invalid offer data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[generate-pv-pdf] Generating for: ${body.offer_number} (User: ${user.id})`);

    // ── 3. Generate PDF ─────────────────────────────────────────────
    const docDefinition = createOfferDefinition(body);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    // Collect chunks to create a buffer
    const chunks: Uint8Array[] = [];
    await new Promise((resolve, reject) => {
      pdfDoc.on("data", (chunk: Uint8Array) => chunks.push(chunk));
      pdfDoc.on("end", () => resolve(null));
      pdfDoc.on("error", (err: Error) => reject(err));
      pdfDoc.end();
    });

    const pdfBuffer = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      pdfBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    // ── 4. Return PDF Response ──────────────────────────────────────
    const filename = `oferta-pv-${body.offer_number.replace(/[\s/\\]+/g, "-")}.pdf`;

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[generate-pv-pdf] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error", details: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
