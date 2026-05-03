# METICAL V2 — PV PDF 2.2I Final Checkpoint

**Data:** 2026-05-03
**Stabilny commit:** `4d50197`
**Tag:** `stable-pv-2-2i-mobile-single-download-2026-05-03`
**Backup branch:** `backup/stable-pv-2-2i-mobile-single-download-2026-05-03`

---

## Historia sprintów PDF 2.2G → 2.2I

### PV PDF 2.2G — finalna stabilizacja premium PDF

- Naprawiono generowanie białych PDF-ów.
- Przywrócono premium hero overlay z gradientem i backdrop-filter.
- Poprawiono stopkę PDF (Puppeteer footerTemplate na każdej stronie).
- Wdrożono realny PDF preview w iframe (blob z serwera).
- PDF self-contained: CSS inline, obrazy jako data URL, brak zależności sieciowych.
- Zachowano poprawne marginesy i page-break.

### PV PDF 2.2H — powtarzanie nagłówka tabeli

- Problem: tabela "Zakres dostawy" przy łamaniu na kolejną stronę nie powtarzała nagłówka (Element/zakres, Producent, Ilość, J.m.).
- Przyczyna: `emulateMediaType('screen')` w Puppeteer — Chromium w trybie screen ignoruje `display: table-header-group`.
- Naprawa: zmiana na `emulateMediaType('print')` w `api/generate-pv-offer-pdf.ts`.
- HTML (`<thead>`) i CSS (`display: table-header-group`) były już poprawne.
- Zmieniony plik: `api/generate-pv-offer-pdf.ts` (1 linia).

### PV PDF 2.2I — podwójne pobieranie PDF na mobile

- Problem: na telefonie po kliknięciu "Pobierz PDF" pobierały się dwa pliki — poprawna oferta + pusty/biały dokument z nazwą oferty.
- Przyczyna: fallback `window.location.href = blobUrl` w `downloadPdfBlob()` otwierał drugą kartę/dokument na mobilnych przeglądarkach. Element `<a>` nie miał `display: none`, co powodowało event-bubbling na niektórych przeglądarkach mobilnych.
- Naprawa:
  - Usunięto `window.location.href = blobUrl` — po anulowaniu iOS Web Share nie otwiera się żaden dodatkowy dokument.
  - Ujednolicono ścieżkę pobierania: iOS → Web Share API → return, reszta → `<a download>` z `display: none`.
  - Dodano guard `if (exporting) return` przeciwko double-tap na mobile.
  - Dodano `type="button"` na wszystkich przyciskach kontrolnych.
- Zmienione pliki:
  - `src/features/offers/pv/services/exportPvOfferServerPdf.ts`
  - `src/features/offers/pv/pages/PvOfferPrintPage.tsx`

---

## Potwierdzenie użytkownika

- ✅ PDF generuje się poprawnie.
- ✅ Mobile pobiera **jeden** plik PDF.
- ✅ Tabela "Zakres dostawy" kontynuuje się poprawnie na kolejnej stronie z powtórzonym nagłówkiem.
- ✅ PDF wygląda prawidłowo — hero, cena, dane klienta, tabela, stopka.
- ✅ Build przechodzi bez błędów.

---

## Decyzja strategiczna

- **Nie ruszać PDF** bez osobnego sprintu i konkretnego powodu biznesowego.
- Obecny silnik (HTML → self-contained payload → Vercel API → Chromium/Puppeteer → PDF) jest **aktywnym, stabilnym generatorem**.
- V3 programmatic (jsPDF + jspdf-autotable) pozostaje opcją przyszłościową.
- Przy sprintach: ustawienia ofert, panel admina, użytkownicy, załączniki — **nie modyfikować PDF**.
- Ewentualna zmiana PDF wymaga osobnego sprintu z jasno opisanym problemem.

---

## Pliki kluczowe dla silnika PDF

| Plik | Rola |
|---|---|
| `api/generate-pv-offer-pdf.ts` | Vercel API — Puppeteer PDF |
| `src/features/offers/pv/services/exportPvOfferServerPdf.ts` | Klient — payload + download |
| `src/features/offers/pv/pages/PvOfferPrintPage.tsx` | Widok print/preview + przycisk pobierania |
| `src/features/offers/pv/styles/pvOfferPrint.css` | Style PDF/print |
