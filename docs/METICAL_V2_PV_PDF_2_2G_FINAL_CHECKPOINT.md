# METICAL V2 — PV PDF 2.2G Final Checkpoint

**Data:** 2026-05-03  
**Commit:** na moment tworzenia dokumentu  
**Branch:** `main`  
**Tag:** `stable-pv-2-2g-final-pdf-2026-05-03`  
**Backup branch:** `backup/stable-pv-2-2g-final-pdf-2026-05-03`

---

## Stan końcowy

- Generator PDF PV działa.
- Desktop i mobile korzystają z realnego PDF preview.
- Podgląd PDF pokazuje rzeczywisty dokument.
- Przycisk Pobierz PDF pobiera wygenerowany dokument.
- PDF nie generuje już białych stron.
- Hero image, logo i ciemny premium overlay działają.
- Cena końcowa brutto jest widoczna w hero i w podsumowaniu.
- PDF klienta nie pokazuje cen komponentów, marży ani kosztów wewnętrznych.
- Stopka jest poprawiona i czytelniejsza.
- Oferta testowa PV/2026/0011 generuje się jako czytelny 2-stronicowy dokument.

## Najważniejsze decyzje

- Nie kasujemy obecnego generatora.
- Nie przechodzimy teraz na V3.
- Nie poprawiamy już na tym etapie nagłówka tabeli na stronie 2.
- Nie usuwamy backdrop-filter, ponieważ wizualnie hero wygląda dobrze.
- Obecny stan jest akceptowany jako stabilny etap.
- Dalsze zmiany PDF tylko po nowym checkpointcie.

## Znane ograniczenia

- Nagłówek tabeli może nie powtarzać się na stronie 2.
- iOS może nadal pokazywać nazwę Unknown.pdf.
- Endpoint PDF przed publicznym SaaS wymaga zabezpieczenia.
- V3 programmatic pozostaje opcją przyszłościową, jeśli Chromium/HTML ponownie zacznie generować problemy.

## Pliki związane z PDF

- `src/features/offers/pv/pages/PvOfferPrintPage.tsx`
- `src/features/offers/pv/styles/pvOfferPrint.css`
- `src/features/offers/pv/services/exportPvOfferServerPdf.ts`
- `api/generate-pv-offer-pdf.ts`
- `public/metical-logo-light.png`
- `public/pv-offer-hero.png`

## Nie ruszać bez osobnego sprintu

- mechanizmu generowania PDF,
- API PDF,
- CSS PDF,
- kalkulacji,
- layoutu oferty,
- fallbacków PDF,
- assetów.
