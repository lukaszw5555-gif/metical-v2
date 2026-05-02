# PV 2.2A — Server-Side Premium PDF Export: Feasibility Report

## Problem Statement

METICAL V2 is a **mobile-first** application. Sales reps generate PV offer PDFs primarily from their phones. The current hybrid export has a fundamental UX gap:

| Device | Export Method | Quality | Status |
|--------|-------------|---------|--------|
| **Desktop** | `html2canvas` + jsPDF (DOM capture) | ✅ Premium | Works perfectly |
| **Mobile** | `jsPDF` + `autoTable` (programmatic) | ⚠️ Acceptable | Transliterated text, no hero image, simpler layout |

The mobile PDF does **not** match the brand standard. The user needs premium PDF from any device.

---

## Architecture Analysis

### Current Stack

| Layer | Technology | Where |
|-------|-----------|-------|
| Frontend | Vite + React 19 SPA | Vercel (static) |
| Backend | Supabase (Postgres + Auth + RLS) | Supabase Cloud |
| Edge Functions | Deno (1 function: `send-push`) | Supabase Edge |
| Deploy | Vercel via GitHub | `vercel.json` with SPA rewrite |
| PDF assets | `public/pv-offer-hero.png` (2.2 MB), `metical-logo-light.png` (18 KB) | Static |

### Key Constraints

- `vercel.json` has only SPA rewrite — **no `/api` folder exists**
- Supabase Edge Functions already work (send-push proves the pipeline)
- Hero image is 2.2 MB — too large to embed in-function
- App uses Supabase Auth (JWT-based)

---

## Evaluated Options

### Option A: Vercel Serverless Function + Puppeteer

```
Frontend → POST /api/generate-pdf → Vercel Function → puppeteer-core + @sparticuz/chromium → PDF
```

| Aspect | Assessment |
|--------|-----------|
| Feasibility | ⚠️ Technically possible |
| Complexity | 🔴 Very high |
| Bundle size | `@sparticuz/chromium-min` ~45MB, Vercel limit 50MB |
| Cold start | 5-15 seconds |
| Reliability | 🔴 Frequently breaks on Vercel version updates |
| Polish fonts | ✅ Renders real HTML with CSS |
| Hero image | ⚠️ Must fetch from deployed URL or bundle |
| Cost | Vercel Pro may be needed for `maxDuration` |
| Verdict | **NOT RECOMMENDED** — fragile, oversized, slow |

### Option B: Supabase Edge Function + pdfmake (Deno)

```
Frontend → POST /supabase/functions/v1/generate-pv-pdf → Edge Function → pdfmake → PDF bytes
```

| Aspect | Assessment |
|--------|-----------|
| Feasibility | ✅ High |
| Complexity | 🟡 Medium |
| Bundle size | pdfmake ~300KB, no Chromium needed |
| Cold start | <1 second |
| Reliability | ✅ Stable — proven Deno runtime |
| Polish fonts | ✅ Can embed custom font (Roboto/Inter with PL glyphs) |
| Hero image | ⚠️ Must fetch from public URL or Supabase Storage |
| Tables | ✅ Built-in table support with styles |
| Auth | ✅ Same JWT pattern as send-push |
| Cost | Free tier covers it |
| Verdict | **RECOMMENDED** |

### Option C: Supabase Edge Function + pdf-lib

```
Frontend → POST → Edge Function → pdf-lib → manual drawing → PDF
```

| Aspect | Assessment |
|--------|-----------|
| Feasibility | ✅ High |
| Complexity | 🔴 Very high — no table/layout engine |
| Polish fonts | ✅ Can embed fonts |
| Tables | 🔴 Must draw every cell manually |
| Verdict | Possible but too much manual work for premium layout |

### Option D: External microservice (Gotenberg / Cloud Run)

| Aspect | Assessment |
|--------|-----------|
| Feasibility | ✅ Best quality |
| Complexity | 🔴 Requires separate infrastructure |
| Cost | Additional server/container |
| Verdict | Overkill for current scale |

---

## Recommendation: Option B — Supabase Edge Function + pdfmake

> [!IMPORTANT]
> This is the only option that combines: proven deploy pipeline, Polish font support, built-in tables, JWT auth, and zero additional infrastructure.

### How It Works

1. Phone/Desktop clicks "Pobierz PDF".
2. App sends POST to `/functions/v1/generate-pv-pdf` with offer data and user JWT.
3. Edge Function validates JWT and identity.
4. Edge Function filters/validates data (removes sensitive costs).
5. `pdfmake` generates PDF buffer using embedded Polish fonts.
6. Function returns `application/pdf` binary.
7. Browser triggers download.

---

## Implementation Plan

### New Files

| File | Purpose |
|------|---------|
| `supabase/functions/generate-pv-pdf/index.ts` | Edge Function — receives offer data, generates PDF, returns binary |
| `supabase/functions/generate-pv-pdf/pdfLayout.ts` | PDF layout definition (cover, scope, terms) |
| `supabase/functions/generate-pv-pdf/fonts.ts` | Base64-encoded Roboto font with Polish characters |

### Modified Files

| File | Change |
|------|--------|
| `src/features/offers/pv/pages/PvOfferPrintPage.tsx` | Add server-side PDF call for mobile (keep html2canvas for desktop) |

### Packages

- `pdfmake` (via `npm:pdfmake`) used inside the Deno environment. No local `npm install` required.

---

## Data Flow & Security

### Security Pattern
- **Frontend filtering**: Frontend sends only customer-facing data.
- **Edge validation**: Function validates the user's Supabase JWT before processing.
- **Service Role**: Not needed for generation unless fetching extra data; user-level access is sufficient.

---

## Risks & Mitigations

- **Hero image size**: 2.2MB is too big to bundle. Strategy: use dark styled block for MVP, fetch from Storage in next phase.
- **Polish fonts**: Embedded as base64 (Roboto ~170KB) to ensure "ąęół" work perfectly.
- **Vercel parity**: No impact on Vercel deployment as Supabase Functions are hosted separately.

---

## Comparison: After Implementation

| Feature | Desktop (html2canvas) | Mobile (pdfmake Edge) |
|---------|----------------------|----------------------|
| Hero image | ✅ Full photo | ⚠️ Styled block (MVP) |
| Polish characters | ✅ Full CSS | ✅ Embedded font |
| Works on iPhone | ❌ (html2canvas fails) | ✅ Server-side |
| Generation time | ~2-5s | ~1-3s |

---

## Open Questions for Decision

1. **Hero image priority:** Should Sprint 2.2B include hero image from day one (requires Storage setup), or is a dark styled cover acceptable for MVP?
2. **Font choice:** Roboto (170KB, lighter) or Inter (300KB, matches app UI)?
3. **Desktop migration:** Should desktop eventually also use server-side PDF for consistency, or stay with html2canvas (which allows 100% parity with screen look)?
4. **Offline fallback:** On mobile without network, should we fall back to the existing client-side jsPDF generator?

---

## Summary

Server-side PDF generation via Supabase Edge Functions is the most robust and maintainable path for METICAL V2 to achieve premium mobile exports without the fragility of Puppeteer or the layout limits of client-side jsPDF.
