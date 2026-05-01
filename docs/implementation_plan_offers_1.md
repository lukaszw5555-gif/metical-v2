# SPRINT OFFERS 1 — Moduł Oferta PV MVP

**Data:** 2026-05-01
**Repozytorium:** REPO_APLIKACJA_METICAL_V2

## Cel

Dodać prosty moduł tworzenia, zapisu i podglądu oferty PV w ścieżce Sales → Oferty → Oferta Fotowoltaika.
Nie budujemy jeszcze eksportu PDF, katalogu komponentów ani ofert dla innych usług.

## Czego NIE robimy

- Eksportu PDF
- Katalogu komponentów / pozycji ofertowych
- Ofert dla hali/domu/pompy/źródła ciepła
- Zmian w istniejących modułach (Zadania, Inwestycje, Klienci, Leady)
- Zmian w Push/OneSignal/Edge Functions
- Zmian RLS poza nową tabelą `pv_offers`

---

## Proposed Changes

### 1. Baza danych

#### [NEW] `supabase/migrations/011_pv_offers.sql`

Tabela `pv_offers` z pełnym zestawem kolumn zgodnie ze specyfikacją:
- UUID, offer_number, referencje do lead_id/client_id/created_by/assigned_to
- Snapshot danych klienta (customer_name, phone, email, city, address)
- Parametry instalacji (pv_power_kw, panel_power_w, panel_count, inverter_name, structure_type, roof_type, installation_type, annual_production_kwh)
- Ceny (price_net, vat_rate, price_gross, margin_value, margin_percent)
- Treść (offer_note, internal_note)
- Status z CHECK (draft, sent, accepted, rejected)
- Daty (valid_until, created_at, updated_at)
- Indeksy na: lead_id, client_id, created_by, assigned_to, status, created_at
- updated_at trigger (reuse `update_updated_at()`)

RLS:
- `pv_offers_select`: admin/administracja widzą wszystko; operator widzi swoje (created_by/assigned_to) + powiązane z widocznym leadem/klientem
- `pv_offers_insert`: created_by = auth.uid(); walidacja lead_id/client_id przez can_see_lead/can_see_client
- `pv_offers_update`: admin/administracja mogą edytować wszystko; operator swoje/przypisane
- `pv_offers_delete`: tylko admin

Nowa helper function `can_see_pv_offer()` do użytku wewnętrznego.

### 2. Frontend: Typy i serwisy

#### [NEW] `src/features/offers/pv/types/pvOfferTypes.ts`
- Interface `PvOffer` mapujący kolumny tabeli
- Interface `CreatePvOfferInput` / `UpdatePvOfferInput`
- Typ `PvOfferStatus`
- Stałe: `PV_OFFER_STATUS_LABELS`, `PV_OFFER_STATUS_COLORS`

#### [NEW] `src/features/offers/pv/services/pvOfferService.ts`
- `getPvOffers()` — lista
- `getPvOfferById(id)` — szczegóły
- `createPvOffer(input, userId)` — tworzenie
- `updatePvOffer(id, input)` — edycja
- Wzorzec identyczny jak `clientService.ts` / `salesLeadService.ts`

### 3. Frontend: Strony

#### [NEW] `src/features/offers/pv/pages/PvOffersPage.tsx`
- Lista ofert PV z wyszukiwarką (klient/telefon/numer oferty)
- Filtr statusu (Wszystkie, Robocza, Wysłana, Zaakceptowana, Odrzucona)
- Karty ofert (via `PvOfferCard`)
- FAB „Nowa oferta PV"
- Kontener responsive: `max-w-lg md:max-w-5xl`, grid `md:grid-cols-2`

#### [NEW] `src/features/offers/pv/pages/PvOfferFormPage.tsx`
- Formularz pełnoekranowy (page, nie modal — zbyt dużo pól na modal)
- Sekcje: Źródło danych (ręcznie / z leada / z klienta), Parametry instalacji, Ceny, Status
- Autocalc: `price_gross = price_net * (1 + vat_rate / 100)`
- Loader leadów i klientów do select boxów
- Submit → `createPvOffer()` → nawigacja do listy

#### [NEW] `src/features/offers/pv/pages/PvOfferDetailPage.tsx`
- Podgląd oferty: dane klienta, parametry, ceny, status, notatki
- Linki do leada/klienta jeśli istnieją
- Przycisk edycji (otwiera formularz w trybie edycji)
- Placeholder: „Eksport PDF — w przygotowaniu"

### 4. Frontend: Komponenty

#### [NEW] `src/features/offers/pv/components/PvOfferCard.tsx`
- Karta na liście: numer oferty, klient, moc kW, kwota brutto, status, data

### 5. Routing i nawigacja

#### [MODIFY] `src/App.tsx`
- Dodanie 3 tras:
  - `/sales/offers/pv` → `PvOffersPage`
  - `/sales/offers/pv/new` → `PvOfferFormPage`
  - `/sales/offers/pv/:id` → `PvOfferDetailPage`

#### [MODIFY] `src/features/sales/pages/OffersPage.tsx`
- Kafelek „Oferta Fotowoltaika" staje się aktywny (klikalny, prowadzi do `/sales/offers/pv`)
- Pozostałe kafelki zachowują opacity-60 i „w przygotowaniu"

---

## Pliki — podsumowanie

| Plik | Akcja |
|------|-------|
| `supabase/migrations/011_pv_offers.sql` | NEW |
| `src/features/offers/pv/types/pvOfferTypes.ts` | NEW |
| `src/features/offers/pv/services/pvOfferService.ts` | NEW |
| `src/features/offers/pv/pages/PvOffersPage.tsx` | NEW |
| `src/features/offers/pv/pages/PvOfferFormPage.tsx` | NEW |
| `src/features/offers/pv/pages/PvOfferDetailPage.tsx` | NEW |
| `src/features/offers/pv/components/PvOfferCard.tsx` | NEW |
| `src/features/sales/pages/OffersPage.tsx` | MODIFY |
| `src/App.tsx` | MODIFY |

---

## Verification Plan

### Build
```
npm run build
```

### Test manualny
- Nawigacja: Sprzedaż → Oferty → kafelek Fotowoltaika → lista PV
- Tworzenie oferty ręcznie
- Tworzenie oferty z zaciągnięciem danych z leada
- Tworzenie oferty z zaciągnięciem danych z klienta
- Autocalc price_gross
- Lista ofert z filtrem statusu
- Podgląd oferty
- Edycja oferty
- Leady/Klienci/Inwestycje nadal działają

---

## Ryzyka

- **Niskie:** Migracja SQL musi być uruchomiona ręcznie w Supabase SQL Editor zanim frontend zadziała.
- **Brak:** Istniejące moduły nietknięte (poza dodaniem 3 routów i aktywacją kafelka PV).
