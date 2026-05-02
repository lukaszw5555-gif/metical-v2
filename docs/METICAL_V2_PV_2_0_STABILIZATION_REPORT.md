# METICAL V2 — PV 2.0 Stabilization Report

**Checkpoint:** `stable-pv-2-0-print-2026-05-02`
**Data:** 2026-05-02

---

## 1. Wykonane sprinty

| Sprint | Zakres |
|--------|--------|
| **Offers 1** | MVP oferty PV — tabela `pv_offers`, formularz, podgląd, lista |
| **Offers 1.1** | Katalog komponentów PV — `pv_components`, CRUD, import/export CSV |
| **Offers 1.2** | Pozycje oferty — `pv_offer_items`, kalkulator, podsumowanie |
| **PV 1.3A** | Automatyczny numer oferty (trigger + sekwencja) |
| **PV 2.0A** | Typy ofert: PV, PV+ME, ME, indywidualna — kolumna `offer_type` |
| **PV 2.0B** | Rozszerzone kategorie PV 2.0 + ścieżki must-have |
| **PV 2.0C** | Wybór komponentów po krokach, checklista, stepper ilości |
| **PV 2.0D** | Korekty handlowe (narzut/rabat), widoczność admin/operator |
| **PV 2.0F** | Widok wydruku oferty PV — print-ready A4 HTML |

---

## 2. Migracje SQL

| Nr | Plik | Opis |
|----|------|------|
| 011 | `011_pv_offers.sql` | Tabela `pv_offers` — dane oferty, klient, parametry, ceny |
| 012 | `012_pv_components.sql` | Tabela `pv_components` — katalog referencyjny komponentów |
| 013 | `013_pv_offer_items.sql` | Tabela `pv_offer_items` — pozycje oferty z cenami |
| 014 | `014_pv_offer_numbering.sql` | Auto-numbering: sekwencja + trigger `BEFORE INSERT` |
| 015 | `015_pv_offer_type.sql` | Kolumna `offer_type` z CHECK constraint |
| 016 | `016_pv_component_categories_2_0.sql` | Rozszerzenie kategorii komponentów |
| 017 | `017_pv_offer_adjustments.sql` | Kolumny `sales_markup_value`, `customer_discount_value` |

---

## 3. Tabele

### pv_offers
Główna tabela ofert fotowoltaicznych.

Kluczowe pola:
- `id`, `offer_number` (auto-generated)
- `lead_id`, `client_id`, `created_by`, `assigned_to`
- `customer_name`, `customer_phone`, `customer_email`, `customer_city`, `investment_address`
- `pv_power_kw`, `panel_power_w`, `panel_count`, `inverter_name`
- `structure_type`, `roof_type`, `installation_type`
- `price_net`, `vat_rate`, `price_gross`
- `margin_value`, `margin_percent`
- `sales_markup_value`, `customer_discount_value`
- `offer_type` (pv | pv_me | me | individual)
- `status` (draft | sent | accepted | rejected)
- `valid_until`, `offer_note`, `internal_note`

RLS: admin/administracja — pełne CRUD; operator — SELECT, INSERT (own), UPDATE (own).

### pv_components
Katalog referencyjny komponentów PV.

Kluczowe pola:
- `id`, `category`, `manufacturer`, `model`, `trade_name`, `unit`
- `purchase_price`, `selling_price`, `vat_rate`
- `power_w`, `capacity_kwh`
- `active`, `notes`, `description`
- `param1`, `param2`

RLS: admin/administracja — pełne CRUD; operator — SELECT aktywnych.

Kategorie PV 2.0:
- Moduły fotowoltaiczne
- Falowniki
- Konstrukcje montażowe
- Materiały pomocnicze
- Magazyny energii
- Skrzynki / rozdzielnice
- Montaż PV
- Montaż magazynu energii
- Zgłoszenie do ZE
- Backup
- Wyłącznik ppoż.
- Dodatki
- Inne

### pv_offer_items
Pozycje oferty, powiązane z `pv_offers` przez `offer_id`.

Kluczowe pola:
- `component_id` (NULL dla pozycji własnych)
- `category`, `manufacturer`, `model`, `trade_name`, `unit`
- `quantity`, `purchase_price`, `selling_price`, `vat_rate`
- `power_w`, `capacity_kwh`
- `is_custom`, `sort_order`

RLS: jak pv_offers.

---

## 4. Logika ofert

### Typy ofert
| Typ | Opis |
|-----|------|
| `pv` | Sama fotowoltaika |
| `pv_me` | Fotowoltaika + magazyn energii |
| `me` | Sam magazyn energii |
| `individual` | Oferta indywidualna (bez checklisty) |

### Ścieżka konfiguracji
Plik `pvOfferFlowConfig.ts` definiuje wymagane i opcjonalne kroki per typ oferty.
Checklista `PvOfferFlowChecklist.tsx` pokazuje postęp w formularzu z przyciskami „Dodaj".

### Korekty handlowe
- `sales_markup_value` — narzut handlowy netto (dodawany do sumy pozycji)
- `customer_discount_value` — rabat klienta netto (odejmowany od sumy)
- Finalna cena: `max(0, baseNet + markup - discount)`

### Kalkulacje
Plik `pvOfferCalculations.ts` zawiera:
- Funkcje per-line: `lineNetValue`, `lineGrossValue`, `lineMarginValue`
- Funkcje total: `totalNet`, `totalVat`, `totalGross`, `totalPurchase`, `totalMargin`
- Funkcje adjustment: `finalNetAfterAdjustments`, `finalVatAfterAdjustments`, `finalGrossAfterAdjustments`
- Agregacje techniczne: `installationPowerKWp`, `storageCapacityKWh`, `panelCountFromItems`

---

## 5. Katalog komponentów

- Strona: `/settings/pv-components`
- CRUD: dodawanie, edycja, aktywacja/dezaktywacja
- Filtrowanie: wyszukiwarka + filtr kategorii + filtr aktywności
- Import CSV: separator `;`, nagłówki polskie, walidacja linii
- Export CSV: pobieranie wszystkich komponentów widocznych dla użytkownika
- Szablon CSV: pobieranie samych nagłówków

---

## 6. Print-ready PDF view

- Route: `/sales/offers/pv/:id/print`
- Technika: `window.print()` / „Zapisz jako PDF" z przeglądarki
- Layout: czysty dokument A4 z CSS `@media print` + `@page`
- Zawartość: nagłówek METICAL, dane klienta, parametry techniczne, tabela pozycji (bez cen zakupu/marży), podsumowanie cenowe z korektami, stopka
- **PDF nie pokazuje danych wewnętrznych** (cena zakupu, koszt zakupu, marża, marża %)

---

## 7. Widoczność admin/operator

| Element | Admin / Administracja | Operator |
|---------|----------------------|----------|
| Cena zakupu (kolumna w pozycjach) | ✅ | ❌ Ukryta |
| Marża PLN / % | ✅ | ❌ Ukryta |
| Koszt zakupu (podsumowanie) | ✅ | ❌ Ukryty |
| Marża ręczna (ceny manualne) | ✅ | ❌ Ukryta |
| Ceny sprzedaży | ✅ | ✅ |
| Narzut / rabat | ✅ | ✅ |
| Finalna cena | ✅ | ✅ |

**Logika:** `profile.role === 'admin' || profile.role === 'administracja'` → `canSeeInternalPricing = true`

---

## 8. Ograniczenia (stan na PV 2.0)

1. **Ukrycie kosztów/marży jest UI-only.** Dane `purchase_price` nadal wracają z Supabase API. Pełna separacja wymaga osobnego sprintu RLS/RPC.
2. **Prawdziwy eksport PDF nie jest wdrożony.** Obecnie działa `window.print()` / „Zapisz jako PDF" z przeglądarki. Generowanie pliku PDF wymaga biblioteki lub serwera.
3. **Brak ustawień firmowych** — logo, dane firmy, hero image w PDF są stałe/hardcoded.
4. **Brak zapisu PDF do Supabase Storage.**
5. **Brak wysyłki PDF mailem.**
6. **Checklista ścieżki jest informacyjna** — nie blokuje zapisu oferty.
7. **Brak automatycznego dodawania pozycji** (np. montaż, zgłoszenie ZE) — użytkownik dodaje ręcznie.
