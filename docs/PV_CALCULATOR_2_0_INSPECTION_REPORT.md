# PV Calculator 2.0 — Inspection Report

**Data:** 2026-05-02  
**Autor:** Antigravity (sprint PV 1.3A)  
**Cel:** Przegląd obecnego kalkulatora PV pod kątem przyszłego refactoru UX 2.0.

---

## 1. Pliki odpowiadające za kalkulator PV

| Plik | Rola |
|------|------|
| `PvOfferFormPage.tsx` | Formularz tworzenia/edycji oferty PV (źródło danych, klient, pozycje, zapis) |
| `PvOfferItemsSection.tsx` | Sekcja pozycji ofertowych — tabela desktop, karty mobile |
| `PvComponentPickerModal.tsx` | Modal wyboru komponentu z katalogu PV |
| `PvOfferSummaryPanel.tsx` | Panel podsumowania (netto/brutto/marża/moc/magazyn) |
| `PvOfferDetailPage.tsx` | Podgląd oferty z pozycjami |
| `pvOfferCalculations.ts` | Funkcje kalkulacyjne (lineNet, lineGross, totalMargin, powerKWp...) |
| `pvOfferItemsService.ts` | CRUD pozycji ofertowych (fetch, atomic replace) |
| `pvOfferService.ts` | CRUD oferty PV |
| `pvComponentService.ts` | CRUD katalogu komponentów |
| `pvComponentCsv.ts` | Import/export CSV komponentów |
| `pvOfferTypes.ts` | Typy: PvOffer, PvOfferItem, PvOfferItemDraft |
| `pvComponentTypes.ts` | Typy: PvComponent, kategorie, kolumny CSV |

---

## 2. Co obecnie działa

- Tworzenie oferty PV: ręcznie, z leada, z klienta
- Automatyczny numer oferty (po migracji 014)
- Dodawanie pozycji z katalogu komponentów PV
- Dodawanie pozycji własnych (is_custom)
- Edycja ilości, cen zakupu/sprzedaży, VAT
- Usuwanie pozycji
- Automatyczny przelicznik: netto, brutto, marża, moc PV, pojemność magazynu
- Zapis atomowy pozycji (delete all → insert all)
- Podgląd oferty z pozycjami
- Tryb fallback bez pozycji (ręczne ceny)
- Sticky summary panel na desktopie
- Mobile-first responsive layout

---

## 3. Problemy UX (do przebudowy w 2.0)

### 3.1 Zbyt tabelaryczny widok
- Pozycje ofertowe wyglądają jak spreadsheet
- Handlowiec potrzebuje prostszego interfejsu: „wybierz produkt → ustaw ilość → gotowe"
- Za dużo kolumn: zakup, sprzedaż, VAT, netto, brutto na jednym ekranie

### 3.2 Mało widoczna ilość komponentów
- Pole „ilość" jest małe i łatwo je przeoczyć
- Brak wizualnego wyróżnienia ilości (np. stepper +/-)

### 3.3 Zbyt dużo danych technicznych na jednym ekranie
- Formularz zawiera jednocześnie: dane klienta, pozycje, parametry instalacji, ceny, notatki, status
- Brak podziału na kroki/etapy

### 3.4 Handlowiec widzi za dużo
- Cena zakupu i marża nie powinny być widoczne dla handlowca
- Brak rozdzielenia widoków admin vs handlowiec

### 3.5 Brak prowadzenia krok po kroku
- Użytkownik nie wie, od czego zacząć
- Brak walidacji „musisz dodać moduł PV zanim przejdziesz dalej"
- Brak automatycznego dodawania obligatoryjnych pozycji (zgłoszenie ZE, montaż)

---

## 4. Aktualne kategorie z importu CSV

| Kategoria | Opis |
|-----------|------|
| Falowniki | Falowniki PV |
| Magazyny energii | Akumulatory, BMS |
| Moduły fotowoltaiczne | Panele PV |
| Akcesoria montażowe | Uchwyty, śruby, konektory |
| Konstrukcje montażowe | Ramy, systemy dachowe |
| Dodatkowe usługi | Montaż, transport, dokumentacja |
| SIG | System inteligentnego grzania |

---

## 5. Braki względem docelowego PV Kalkulator 2.0

| Brak | Opis |
|------|------|
| Kategoria: Materiały pomocnicze | Kable, rury, peszel |
| Kategoria: Skrzynki / rozdzielnice | DC/AC combiner box |
| Kategoria: Backup | UPS, przełącznik |
| Kategoria: Wyłącznik ppoż. | Rapid shutdown |
| Ścieżki ofertowe | PV, PV+ME, ME, Indywidualna |
| Must-have kroki | Walidacja: „musisz wybrać moduł, falownik..." |
| Auto zgłoszenie ZE | Automatyczne dodanie pozycji „Zgłoszenie do Zakładu Energetycznego" |
| Auto domyślny montaż | Automatyczne dodanie pozycji „Montaż" po wyborze mocy |
| Widoczność ról | Rozdzielenie admin (marża, zakup) vs handlowiec (cena klienta) |
| Narzut/rabat | Procentowy narzut lub rabat na finalna cenę |

---

## 6. Rekomendowany podział dalszego wdrożenia

| Sprint | Zakres |
|--------|--------|
| **PV 2.0A** | Typ oferty: 4 przyciski startowe (PV / PV+ME / ME / Indywidualna), wybór typu determinuje ścieżkę must-have |
| **PV 2.0B** | Mapowanie kategorii i ścieżki must-have: nowe kategorie w bazie, walidacja „musisz dodać moduł" |
| **PV 2.0C** | Uproszczony wybór komponentów krok po kroku: zamiast tabeli — karty produktów z ilością, filtr po kompatybilności |
| **PV 2.0D** | Widoczność handlowiec/admin: ukrycie marży i cen zakupu dla roli operator/handlowiec |
| **PV 2.0E** | Narzut, rabat, finalna kalkulacja: mechanizm procentowego narzutu na kategorię, rabat na ofertę |
| **PV 2.0F** | Przygotowanie pod PDF: generowanie dokumentu ofertowego z pozycjami, cenami, logo |

---

## 7. Uwagi

- Obecny kalkulator **jest funkcjonalny** i nadaje się do MVP
- Przebudowa na 2.0 powinna być etapowa, nie jednorazowa
- Każdy sprint 2.0 powinien zachować kompatybilność wsteczną z istniejącymi ofertami
- Migracje nowych kategorii (2.0B) powinny rozszerzać CHECK constraint, nie zastępować go
