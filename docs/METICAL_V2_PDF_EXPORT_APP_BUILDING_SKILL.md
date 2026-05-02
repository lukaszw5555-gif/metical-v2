# METICAL V2 — PDF Export App Building Skill

**Module:** Oferty PV — generowanie i eksport PDF  
**Last updated:** 2026-05-02

---

## Główna zasada

> **NIE budować ponownie PDF przez jsPDF jako głównej ścieżki mobile.**  
> Server-side premium PDF jest źródłem prawdy.

---

## Zasady pracy z generatorem PDF

1. **Desktop i mobile mają używać server-side premium PDF** — ten sam endpoint, ten sam HTML, ten sam wynik.

2. **Layout PDF pochodzi z `.pv-print-doc` i `pvOfferPrint.css`** — wszelkie zmiany wizualne robimy w HTML/CSS widoku `/print`, nie w generatorze.

3. **API renderuje HTML/CSS przez Chromium** — endpoint `api/generate-pv-offer-pdf.ts` przyjmuje gotowy HTML i CSS jako tekst, nie pobiera niczego z sieci.

4. **Frontend przed wysyłką osadza logo i hero jako data URL** — `exportPvOfferServerPdf.ts` klonuje `.pv-print-doc`, konwertuje obrazy na data URL, zbiera CSS rules.

5. **Nie wysyłać całego state aplikacji** — do API trafia tylko klientowski HTML z `.pv-print-doc`, nie dane z formularza ani state React.

6. **Nie pokazywać danych wewnętrznych** — PDF nie może zawierać purchase_price, margin, kosztów zakupu, narzutu, rabatu jako osobnych pozycji.

7. **Nie ruszać PDF przy sprintach niezwiązanych z ofertami** — zmiany w module kalkulatora, leadów, inwestycji nie powinny dotykać plików PDF.

8. **Każda zmiana PDF wymaga testu desktop + iPhone** — Chromium renderuje inaczej niż Chrome desktop, szczególnie przy marginesach i page breaks.

9. **Każda zmiana PDF wymaga `npm run build`** — TypeScript musi przejść, Vite musi zbudować.

10. **Nie usuwać fallbacków bez decyzji** — `exportPvOfferPdf.ts` (html2canvas) i `generatePvOfferPdf.ts` (jsPDF) zostają w repo jako fallbacki techniczne.

---

## Procedura debugowania PDF

### Frontend (konsola przeglądarki)

Szukaj logów z prefiksem `[PDF CLIENT]`:

```
[PDF CLIENT] html length: ...
[PDF CLIENT] cssText length: ...
[PDF CLIENT] logo loaded: true/false
[PDF CLIENT] hero loaded: true/false
[PDF CLIENT] request start
[PDF CLIENT] response status: 200
[PDF CLIENT] content-type: application/pdf
[PDF CLIENT] blob size: ...
```

### Backend (Vercel Logs)

Szukaj logów z prefiksem `[PDF API]`:

```
[PDF API] method: POST
[PDF API] html length: ...
[PDF API] cssText length: ...
[PDF API] launching chromium...
[PDF API] executable path: ...
[PDF API] setContent start...
[PDF API] setContent done
[PDF API] pdf start...
[PDF API] pdf done, size: ... bytes
```

### Network (DevTools)

1. Otwórz Network tab.
2. Szukaj `POST /api/generate-pv-offer-pdf`.
3. Sprawdź:
   - Status: `200`
   - Response content-type: `application/pdf`
   - Response size: > 0 bytes

### Checklist diagnostyczny

- [ ] Czy HTML zawiera `.pv-print-doc`?
- [ ] Czy assety zostały zamienione na data URL?
- [ ] Czy CSS został zebrany jako tekst?
- [ ] Czy endpoint odpowiada 200?
- [ ] Czy content-type to application/pdf?
- [ ] Czy blob.size > 0?
- [ ] Czy Vercel Logs nie pokazują błędu Chromium?

---

## Zakazy

- ❌ Nie ruszać bazy danych / migracji SQL.
- ❌ Nie ruszać RLS.
- ❌ Nie ruszać Supabase Edge Functions.
- ❌ Nie ruszać Storage.
- ❌ Nie ruszać OneSignal.
- ❌ Nie wracać do jsPDF jako głównej ścieżki eksportu.
- ❌ Nie poprawiać PDF razem z kalkulatorem w jednym sprincie.
- ❌ Nie zmieniać assetów (`metical-logo-light.png`, `pv-offer-hero.png`) bez zgody użytkownika.
- ❌ Nie zmieniać layoutu PDF globalnie bez testu na desktop + iPhone.

---

## Checklist regresji PDF

Przed każdym releasem zmieniającym moduł PDF:

- [ ] `npm run build` — 0 błędów
- [ ] Desktop: `/print` otwiera się poprawnie
- [ ] Desktop: "Pobierz PDF" generuje PDF
- [ ] Mobile: `/print` otwiera się poprawnie
- [ ] Mobile: "Pobierz PDF" generuje PDF
- [ ] PDF zawiera logo METICAL
- [ ] PDF zawiera hero image
- [ ] PDF zawiera polskie znaki (ą, ę, ś, ź, ż, ó, ł, ć, ń)
- [ ] PDF pokazuje finalną cenę brutto
- [ ] PDF NIE pokazuje cen komponentów
- [ ] PDF NIE pokazuje marży
- [ ] PDF NIE pokazuje kosztów zakupu
- [ ] Numer oferty widoczny w treści PDF
- [ ] Footer na dole strony 2
- [ ] Strona 2 ma top spacing
- [ ] `POST /api/generate-pv-offer-pdf` zwraca `200 application/pdf`
