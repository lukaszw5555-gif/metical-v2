# METICAL V2 — PV PDF 2.2 Regression Checklist

**Last updated:** 2026-05-02  
**Use before:** każdy release zmieniający moduł ofert PV PDF

---

## Build

- [ ] `npm run build` — 0 błędów TypeScript
- [ ] `npm run build` — Vite buduje bez errorów

---

## Desktop

- [ ] `/sales/offers/pv/:id/print` — otwiera się poprawnie
- [ ] Widok /print — wyświetla pełny premium dokument
- [ ] "Pobierz PDF" — PDF pobiera się na dysk
- [ ] Nazwa pliku: `oferta-pv-PV-2026-XXXX.pdf` (bez podwójnego .pdf)

---

## Mobile (iPhone)

- [ ] `/sales/offers/pv/:id/print` — otwiera się poprawnie na telefonie
- [ ] "Pobierz PDF" — PDF generuje się i otwiera / udostępnia
- [ ] Nie pojawia się uproszczony jsPDF fallback automatycznie
- [ ] Jeśli błąd — wyświetla się alert, nie brzydki PDF

---

## Treść PDF

- [ ] PDF zawiera logo METICAL (metical-logo-light.png)
- [ ] PDF zawiera hero image (pv-offer-hero.png)
- [ ] PDF zawiera polskie znaki (ą, ę, ś, ź, ż, ó, ł, ć, ń)
- [ ] PDF pokazuje finalną cenę brutto
- [ ] PDF pokazuje dane klienta
- [ ] PDF pokazuje parametry techniczne
- [ ] PDF pokazuje zakres dostawy (nazwa, producent, ilość, j.m.)
- [ ] PDF pokazuje warunki handlowe
- [ ] PDF pokazuje pola podpisów
- [ ] Numer oferty widoczny w treści PDF

---

## Bezpieczeństwo danych

- [ ] PDF **NIE** pokazuje cen komponentów (selling_price)
- [ ] PDF **NIE** pokazuje kosztów zakupu (purchase_price)
- [ ] PDF **NIE** pokazuje marży (margin_value, margin_percent)
- [ ] PDF **NIE** pokazuje narzutu jako osobnej pozycji
- [ ] PDF **NIE** pokazuje rabatu jako osobnej pozycji

---

## Layout PDF

- [ ] Footer jest na dole strony 2
- [ ] Strona 2 ma wyraźny top spacing (padding-top)
- [ ] Sekcje nie są rozrywane między stronami (break-inside: avoid)
- [ ] Tabela zakresu dostawy wygląda czytelnie
- [ ] Price card jest widoczna i czytelna

---

## API Server-side

- [ ] `POST /api/generate-pv-offer-pdf` — zwraca status `200`
- [ ] Response content-type: `application/pdf`
- [ ] Response body size > 0 bytes
- [ ] Vercel Logs: brak błędów `[PDF API]`

---

## Znane ograniczenia (NIE są blokadami)

- ⚠️ iOS może pokazywać nazwę `Unknown.pdf` — akceptowalne
- ⚠️ Vercel cold start — pierwsze wywołanie może trwać 5-10s
- ⚠️ Endpoint API jest otwarty — wymaga zabezpieczenia przed publicznym SaaS

---

## Procedura testu

1. Otwórz ofertę PV w aplikacji.
2. Kliknij "Wydruk / PDF" → widok `/print`.
3. Sprawdź wizualnie: hero, logo, cena, tabela, warunki, footer.
4. Kliknij "Pobierz PDF".
5. Na desktop: sprawdź pobrany plik.
6. Na iPhone: sprawdź udostępniony/otwarty PDF.
7. Otwórz PDF — porównaj z widokiem /print.
8. Sprawdź Network tab: POST do API → 200 application/pdf.
