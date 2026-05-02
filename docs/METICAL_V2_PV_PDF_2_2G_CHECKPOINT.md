# METICAL V2 — PV PDF 2.2G Checkpoint

**Data:** 2026-05-03  
**Branch:** `main`  
**Tag:** `stable-pv-2-2g-premium-pdf-2026-05-03`  
**Backup branch:** `backup/stable-pv-2-2g-premium-pdf-2026-05-03`

---

## Stan modułu PDF PV

| Element | Status |
|---------|--------|
| PDF desktop | ✅ Działa |
| PDF mobile | ✅ Działa |
| Podgląd PDF (iframe) | ✅ Działa — realny PDF z serwera |
| Pobrany PDF | ✅ Działa — ten sam blob co podgląd |
| Silnik | Server-side: Puppeteer + Chromium na Vercel |
| Jeden silnik desktop + mobile | ✅ Brak fallbacku html2canvas/jsPDF |
| Self-contained HTML | ✅ Logo + hero jako data URL, CSS inline |

## Stan wizualny PDF

| Element | Status |
|---------|--------|
| Hero overlay | ✅ Premium — podwójny gradient + backdrop-filter blur |
| Hero tekst | ✅ Czytelny — text-shadow |
| Price card | ✅ Bez zmian |
| Scope badges | ✅ Bez zmian |
| Info grid (klient + tech) | ✅ Bez zmian |
| Tabela zakresu dostawy | ✅ Działa, naturalnie przechodzi między stronami |
| Cena końcowa (bottom) | ✅ Bez zmian |
| Warunki handlowe | ✅ Bez zmian |
| Podpisy | ✅ Bez zmian |
| Stopka (footer) | ✅ Puppeteer footerTemplate — navy, gold, 8.5px, na każdej stronie |

## Znane ograniczenia

| Ograniczenie | Priorytet | Notatka |
|-------------|-----------|---------|
| Nagłówek tabeli nie powtarza się na kolejnej stronie | Niski | CSS `display: table-header-group` jest ustawiony, ale Chromium w trybie `screen` nie honoruje go przy page break. Wymaga przejścia na `emulateMediaType('print')` lub programowe duplikowanie nagłówka. Nie naprawiamy teraz. |
| iOS: plik może pojawiać się jako `Unknown.pdf` | Niski | Web Share API działa na iOS, ale Safari nie zawsze respektuje filename. Znane ograniczenie platformy. |
| `backdrop-filter: blur(1.5px)` w hero | Info | Działa w obecnym Chromium na Vercel. Gdyby przestał, gradient nadal zapewnia ciemny overlay. |

## Architektura PDF (flow)

```
Użytkownik → /sales/offers/pv/:id/print
    ↓
PvOfferPrintPage.tsx renderuje ukryty .pv-print-doc-source
    ↓
generatePvOfferServerPdfBlob() → klonuje DOM, inline assets, POST /api
    ↓
api/generate-pv-offer-pdf.ts → Chromium → page.pdf({displayHeaderFooter, footerTemplate})
    ↓
Blob PDF → URL.createObjectURL → <iframe> podgląd
    ↓
Przycisk "Pobierz PDF" → downloadPdfBlob(ten sam blob)
```

## Pliki kluczowe

| Plik | Rola |
|------|------|
| `src/features/offers/pv/pages/PvOfferPrintPage.tsx` | Strona podglądu + eksportu |
| `src/features/offers/pv/services/exportPvOfferServerPdf.ts` | generatePvOfferServerPdfBlob + downloadPdfBlob |
| `src/features/offers/pv/styles/pvOfferPrint.css` | Style premium PDF |
| `api/generate-pv-offer-pdf.ts` | Endpoint Vercel: Chromium → PDF |

## Zasada

> **Nie ruszać PDF bez osobnego sprintu.**  
> Każda zmiana w module PDF musi mieć dedykowany sprint z numerem wersji.  
> Przed zmianą sprawdzić ten checkpoint jako punkt odniesienia.
