# METICAL V2 — PV PDF 2.2 Stabilization Report

**Date:** 2026-05-02  
**Module:** Oferty PV — generowanie PDF  
**Status:** Stabilny, gotowy do użycia produkcyjnego

---

## 1. Stan końcowy modułu

Moduł generowania ofert PV PDF działa na desktopie i telefonie.  
Desktop i mobile używają tego samego mechanizmu:

```
Frontend (.pv-print-doc HTML/CSS)
  → klonowanie + osadzenie assetów jako data URL
  → POST /api/generate-pv-offer-pdf
  → Vercel Serverless Function + Chromium
  → PDF A4 application/pdf
  → download (desktop) / Web Share / blob URL (iOS)
```

---

## 2. Desktop vs Mobile

| Aspekt | Desktop | Mobile (iPhone) |
|--------|---------|-----------------|
| Główna ścieżka | Server-side PDF | Server-side PDF |
| Fallback | html2canvas (exportElementToPdf) | Alert z komunikatem błędu |
| Wygląd PDF | Premium — identyczny z /print | Premium — identyczny z desktop |
| Pobieranie | `<a download>` | Web Share API / blob URL |
| Nazwa pliku | oferta-pv-PV-2026-XXXX.pdf | Może pokazywać Unknown.pdf (znane ograniczenie iOS) |

---

## 3. Historia problemu

1. **Print-ready HTML / window.print** — początkowy widok `/print` renderujący ofertę jako stronę A4 w HTML/CSS.
2. **html2canvas desktop** — dodanie eksportu do PDF przez html2canvas + jsPDF. Na desktopie działa stabilnie i wygląda premium.
3. **Problem html2canvas na mobile** — na iPhone html2canvas gubi CSS, rozjeżdża layout, generuje brzydki PDF.
4. **Programowy jsPDF jako tymczasowy fallback** — stworzono `generatePvOfferPdfProgrammatic` z jsPDF + autoTable. Działał technicznie, ale wyglądał jak prosty dokument — brak hero, brak premium designu, problemy z polskimi znakami.
5. **Decyzja o server-side PDF** — nie da się odwzorować premium layoutu przez jsPDF. Decyzja: backend renderuje ten sam HTML co desktop.
6. **Problemy z Vercel/Chromium** — endpoint timeoutował przez `networkidle0` (oczekiwanie na 2.2MB hero image z sieci). Rewrite w vercel.json kolidował z natywnym routingiem funkcji.
7. **Self-contained HTML** — frontend teraz klonuje DOM, konwertuje logo i hero na data URL, zbiera CSS jako tekst. Backend nie pobiera niczego z sieci.
8. **Finalny działający server-side PDF** — mobile generuje identyczny premium PDF jak desktop.
9. **Znane ograniczenie Unknown.pdf na iOS** — Safari na iOS ignoruje atrybut `download` na blob URL. Web Share API pomaga, ale nie gwarantuje nazwy pliku we wszystkich scenariuszach.

---

## 4. Aktualny mechanizm

### Flow

1. **PvOfferPrintPage.tsx** — renderuje widok `/print` z pełnym premium HTML (`.pv-print-doc`).
2. **exportPvOfferServerPdf.ts** — klonuje dokument, osadza assety jako data URL, zbiera CSS, wysyła `POST` do API.
3. **api/generate-pv-offer-pdf.ts** — uruchamia Chromium, renderuje HTML, generuje PDF, zwraca `application/pdf`.
4. **exportPvOfferPdf.ts** — pozostaje jako desktop fallback (html2canvas).
5. **generatePvOfferPdf.ts** — pozostaje jako techniczny fallback historyczny / awaryjny, ale NIE jest częścią głównego flow.

### Handler w PvOfferPrintPage

```
Klik "Pobierz PDF"
  → exportPvOfferServerPdf (primary — desktop + mobile)
  → CATCH:
      desktop → exportElementToPdf (html2canvas)
      mobile  → alert("Nie udało się wygenerować PDF premium")
```

---

## 5. Pliki związane z PDF

| Plik | Rola |
|------|------|
| `src/features/offers/pv/pages/PvOfferPrintPage.tsx` | Widok /print + handler eksportu |
| `src/features/offers/pv/styles/pvOfferPrint.css` | Stylowanie premium PDF |
| `src/features/offers/pv/services/exportPvOfferServerPdf.ts` | Frontend: klonowanie + data URL + POST do API |
| `src/features/offers/pv/services/exportPvOfferPdf.ts` | Desktop fallback: html2canvas |
| `src/features/offers/pv/services/generatePvOfferPdf.ts` | Historyczny fallback: jsPDF programowy |
| `api/generate-pv-offer-pdf.ts` | Vercel Serverless: Chromium → PDF |
| `public/metical-logo-light.png` | Logo METICAL |
| `public/pv-offer-hero.png` | Zdjęcie hero cover |
| `vercel.json` | Konfiguracja rewrites i functions |

---

## 6. Bezpieczeństwo danych

### PDF NIE pokazuje

- `purchase_price` — cena zakupu komponentów
- `selling_price` pozycji — ceny jednostkowe sprzedaży
- `margin_value` — wartość marży
- `margin_percent` — procent marży
- Koszty zakupu
- Marża jako osobna linia
- Narzut jako osobna pozycja
- Rabat jako osobna pozycja
- Ceny netto/brutto poszczególnych komponentów

### PDF pokazuje

- Finalną cenę brutto (łączną)
- VAT %
- Dane klienta (imię, telefon, email, miejscowość, adres inwestycji)
- Parametry techniczne (moc, panele, falownik, magazyn)
- Zakres dostawy (nazwa, producent, ilość, j.m.)
- Warunki handlowe
- Podpisy (handlowiec + klient)
- Logo METICAL
- Hero image

---

## 7. Znane ograniczenia

| Ograniczenie | Szczegóły |
|-------------|-----------|
| **iOS Unknown.pdf** | Safari na iOS może pokazywać nazwę `Unknown.pdf` mimo poprawnej treści PDF. Web Share API częściowo pomaga. |
| **Vercel cold start** | Pierwsze wywołanie Chromium po dłuższej przerwie może trwać 5-10s. |
| **Endpoint otwarty** | API nie ma uwierzytelnienia. Przed publicznym SaaS wymaga klucza/auth guard. |
| **Hero image (2.2MB)** | Osadzany jako data URL zwiększa payload do ~3MB+. Na wolnych połączeniach upload może być wolny. |
| **Zmiany layoutu** | Każda zmiana CSS/HTML musi być testowana na desktop + iPhone, bo Chromium może inaczej renderować marginesy. |
