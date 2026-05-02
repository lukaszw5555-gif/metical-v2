# METICAL V2 — PV 2.1 Next Steps

Planowane kolejne etapy rozwoju modułu ofert PV.

---

## PV 2.1A — Prawdziwy eksport PDF jako plik do pobrania

**Cel:** Wygenerować plik PDF po stronie klienta lub serwera i umożliwić pobranie.

**Opcje:**
- Biblioteka kliencka: `jsPDF` + `html2canvas` (proste, ale ograniczone)
- Edge Function: Puppeteer / Playwright (serwerowe renderowanie HTML → PDF)
- Biblioteka React: `@react-pdf/renderer` (natywny PDF bez HTML)

**Wymagania:**
- PDF musi zawierać te same dane co widok wydruku
- Bez danych wewnętrznych (ceny zakupu, marża)
- Przycisk „Pobierz PDF" na stronie podglądu oferty

**Nie rób:**
- Nie zmieniaj bazy
- Nie zmieniaj RLS
- Nie zmieniaj kalkulacji

---

## PV 2.1B — Ustawienia firmowe do PDF

**Cel:** Dane firmy ładowane z bazy, nie hardcoded.

**Zakres:**
- Nowa tabela `company_settings` lub `app_settings`
- Pola: nazwa firmy, NIP, adres, telefon, e-mail, strona WWW
- Strona ustawień w `/settings/company`
- PDF pobiera dane firmy z bazy zamiast stałego „METICAL Sp. z o.o."

---

## PV 2.1C — Logo i hero image

**Cel:** Firma może przesłać logo i opcjonalny obraz nagłówka PDF.

**Zakres:**
- Upload logo do Supabase Storage (bucket `company-assets`)
- Pole `logo_url` w `company_settings`
- Opcjonalny `hero_image_url` — obraz na 1. stronie PDF
- Wyświetlanie logo w nagłówku PDF zamiast tekstu „METICAL"

---

## PV 2.1D — PDF premium layout

**Cel:** Profesjonalny szablon graficzny PDF oferty PV.

**Zakres:**
- Nowoczesny layout z kolumnami
- Kolorowe sekcje z gradientami
- Tabela z przemiennym kolorem wierszy
- Podsumowanie cenowe w ramce
- Hero image na 1. stronie
- Stopka z danymi firmy i NIP

**Nie rób:**
- Nie zmieniaj logiki kalkulacji
- Nie zmieniaj bazy danych

---

## PV 2.1E — Twarde zabezpieczenie cen zakupu / marży

**Cel:** Operator nie dostaje `purchase_price` z API — nawet w narzędziach deweloperskich.

**Zakres:**
- Nowa funkcja RPC lub widok SQL, który filtruje pola per rola
- Operator pobiera ofertę/pozycje BEZ `purchase_price`, `margin_value`, `margin_percent`
- Admin/administracja pobierają pełne dane
- Modyfikacja serwisów TS, by używały nowego endpointu

**Uwaga:**
- To jest zmiana security-critical
- Wymaga testów z kontem operatora
- Wymaga aktualizacji serwisów i komponentów

---

## PV 2.1F — Zapis PDF do Supabase Storage (opcjonalnie)

**Cel:** Wygenerowany PDF jest zapisywany w Supabase Storage i linkowany do oferty.

**Zakres:**
- Bucket `pv-offer-pdfs` w Supabase Storage
- Kolumna `pdf_url` w `pv_offers` (nullable)
- Po wygenerowaniu PDF: upload do bucketa, zapis URL w ofercie
- Przycisk „Pobierz zapisany PDF" na podglądzie oferty
- Automatyczna regeneracja PDF przy edycji oferty (opcjonalnie)

---

## Kolejność priorytetów

| Priorytet | Sprint | Uzasadnienie |
|-----------|--------|-------------|
| 🔴 Wysoki | PV 2.1E | Bezpieczeństwo — ukrycie danych wewnętrznych na poziomie API |
| 🟡 Średni | PV 2.1A | UX — prawdziwy plik PDF do pobrania |
| 🟡 Średni | PV 2.1B | UX — konfigurowalność danych firmy |
| 🟢 Niski | PV 2.1C | Wizualizacja — logo i grafika |
| 🟢 Niski | PV 2.1D | Wizualizacja — premium layout |
| 🟢 Niski | PV 2.1F | Infrastruktura — storage PDF |

---

## Uwagi

- Każdy sprint PV 2.1 powinien kończyć się `npm run build` + commit + raport
- Nie łącz sprintów — rób jeden na raz
- Przed każdym sprintem czytaj `METICAL_V2_PV_2_0_APP_BUILDING_SKILL.md`
- Po PV 2.1E zaktualizuj skill i raport stabilizacji
