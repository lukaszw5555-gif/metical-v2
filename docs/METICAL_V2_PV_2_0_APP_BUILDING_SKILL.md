# METICAL V2 — PV Module App Building Skill

Instrukcja dla AI i programistów pracujących nad modułem PV w METICAL V2.

---

## 1. Zasady ogólne

1. **Czytaj raport stabilizacji** (`METICAL_V2_PV_2_0_STABILIZATION_REPORT.md`) przed każdym sprintem PV.
2. **Sprawdź numer ostatniej migracji** w `supabase/migrations/` — nowa migracja musi mieć kolejny numer.
3. **Nie modyfikuj istniejących migracji** — twórz nowe ALTER/ADD migracje.
4. **Nie uruchamiaj migracji automatycznie** — zawsze pokaż pełną treść SQL do kontroli przez użytkownika.

---

## 2. Czego nie ruszać

Przy kolejnych sprintach PV **nie zmieniaj** bez wyraźnej zgody:

- Leadów (`sales_leads`)
- Klientów (`clients`)
- Inwestycji (`investments`)
- Zadań (`tasks`)
- Push / OneSignal
- Edge Functions
- Profili (`profiles`)
- Layoutu aplikacji (sidebar, bottom nav)
- Logiki logowania / AuthContext (poza odczytem `profile.role`)

---

## 3. Kolejność wdrażania zmian

1. **Migracja SQL** — napisz, pokaż do kontroli, NIE uruchamiaj automatycznie
2. **Typy TypeScript** — zaktualizuj `pvOfferTypes.ts` lub `pvComponentTypes.ts`
3. **Serwis Supabase** — zaktualizuj serwis CRUD jeśli nowe pola
4. **Kalkulacje** — dodaj/zmodyfikuj `pvOfferCalculations.ts`
5. **Komponenty UI** — modyfikuj sekcje formularza, podsumowania, podglądu
6. **Routing** — dodaj nowe route w `App.tsx` jeśli nowa strona
7. **Build** — `npm run build`, napraw błędy TS
8. **Raport** — pokaż zmienione pliki, kontrolę, ryzyka

---

## 4. Zasady migracji SQL

- Numer: trzy cyfry, np. `018_nazwa.sql`
- Header: komentarz z numerem, tytułem, datą, sprintem
- Funkcje SECURITY DEFINER: zawsze `SET search_path = public`
- CHECK constraints: zawsze dodawaj dla pól numerycznych ≥ 0
- RLS: nie zmieniaj istniejących policy bez wyraźnej zgody
- Unique index: zawsze `WHERE ... IS NOT NULL AND trim(...) <> ''`
- Nie usuwaj kolumn — dodawaj nowe lub ALTER

---

## 5. Zasady ról admin/operator

### Definicja
```typescript
const canSeeInternalPricing = profile?.role === 'admin' || profile?.role === 'administracja';
```

### Reguły
- **Admin / Administracja** widzą: ceny zakupu, koszt zakupu, marżę PLN, marżę %, dane wewnętrzne podsumowania
- **Operator** widzi: ceny sprzedaży, netto/brutto dla klienta, narzut/rabat, finalną cenę
- **Operator NIE widzi**: purchase_price, koszt zakupu, margin_value, margin_percent

### Ważne
- Ukrycie jest **UI-only** (stan na PV 2.0)
- Dane `purchase_price` nadal wracają z Supabase API
- Pełna separacja wymaga osobnego sprintu z RLS/RPC (PV 2.1E)

---

## 6. Zasady kalkulacji

### Plik: `pvOfferCalculations.ts`

- Nie zmieniaj istniejących funkcji bez powodu
- Dodawaj nowe funkcje obok istniejących
- Kalkulacja per-line: `lineNetValue`, `lineGrossValue`, `lineMarginValue`
- Kalkulacja totals: `totalNet`, `totalVat`, `totalGross`, `totalPurchase`, `totalMargin`
- Kalkulacja korekt: `finalNetAfterAdjustments`, `finalGrossAfterAdjustments`

### Logika korekt
```
finalNet = max(0, baseNet + markupValue - discountValue)
finalVat = max(0, baseVat + markupVat - discountVat)
finalGross = finalNet + finalVat
```

### Zapis do bazy
- `price_net` = finalNet po korektach
- `price_gross` = finalGross po korektach
- `margin_value` i `margin_percent` liczone wewnętrznie (admin only)

---

## 7. Zasady PDF

### Stan obecny (PV 2.0)
- Technika: `window.print()` / „Zapisz jako PDF" z przeglądarki
- Strona: `/sales/offers/pv/:id/print`
- CSS: `pvOfferPrint.css` z `@media print` + `@page { size: A4 }`
- Przyciski ukrywane klasą `.no-print`

### Reguły zawartości PDF
- **NIGDY** nie pokazuj: `purchase_price`, koszt zakupu, `margin_value`, `margin_percent`
- Pokazuj: nazwę pozycji, kategorię, ilość, j.m., cenę netto, VAT, brutto
- Pokazuj korekty: narzut handlowy, rabat klienta (jeśli > 0)
- Stopka: stały tekst disclaimer + „METICAL Sp. z o.o."

### Przyszłość (PV 2.1)
- Prawdziwy eksport PDF przez bibliotekę serwerową lub Edge Function
- Ustawienia firmowe z bazy: logo, dane firmy, hero image
- Zapis do Supabase Storage

---

## 8. Zasady testów

### Build
- Zawsze kończ sprint przez `npm run build`
- 0 błędów TS = sprint zamknięty
- Usuń nieużywane importy (TS6133)

### Kontrola regresji
Po każdym sprincie sprawdź:
1. Czy formularz oferty PV nadal działa?
2. Czy podgląd oferty PV wyświetla poprawne dane?
3. Czy katalog komponentów działa (/settings/pv-components)?
4. Czy import/export CSV działa?
5. Czy widok wydruku działa (/sales/offers/pv/:id/print)?
6. Czy role admin/operator poprawnie ukrywają dane?

---

## 9. Struktura plików PV

```
src/features/offers/pv/
├── components/
│   ├── PvComponentPickerModal.tsx    — modal wyboru komponentów
│   ├── PvOfferFlowChecklist.tsx      — checklista ścieżki konfiguracji
│   ├── PvOfferItemsSection.tsx       — sekcja pozycji z tabela/karty
│   └── PvOfferSummaryPanel.tsx       — panel podsumowania (2 warianty)
├── config/
│   └── pvOfferFlowConfig.ts          — konfiguracja ścieżek per typ oferty
├── pages/
│   ├── PvComponentsPage.tsx          — /settings/pv-components
│   ├── PvOfferDetailPage.tsx         — /sales/offers/pv/:id
│   ├── PvOfferFormPage.tsx           — /sales/offers/pv/new + edit
│   ├── PvOfferPrintPage.tsx          — /sales/offers/pv/:id/print
│   └── PvOffersPage.tsx              — /sales/offers/pv
├── services/
│   ├── pvComponentService.ts         — CRUD komponentów
│   ├── pvOfferItemsService.ts        — CRUD pozycji oferty
│   └── pvOfferService.ts             — CRUD ofert PV
├── styles/
│   └── pvOfferPrint.css              — style wydruku A4
├── types/
│   ├── pvComponentTypes.ts           — typy komponentów
│   └── pvOfferTypes.ts               — typy ofert + pozycji
└── utils/
    └── pvOfferCalculations.ts        — funkcje kalkulacyjne
```
