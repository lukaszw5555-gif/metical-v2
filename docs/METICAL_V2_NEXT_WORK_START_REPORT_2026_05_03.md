# METICAL V2 — raport startowy do dalszych prac

**Data:** 2026-05-03

---

## Aktualny stabilny stan

Aplikacja ma działające:

- Zadania
- Inwestycje
- Leady
- Klienci
- Oferty PV
- Katalog komponentów PV
- Kalkulator PV
- Premium PDF PV desktop/mobile
- Realny PDF preview
- Flow lead → oferta PV
- Flow klient → oferta PV
- Role admin/operator/administracja
- Push / OneSignal w istniejącym zakresie

## Ostatnio zakończony etap

PV PDF 2.2G:

- naprawiono białe PDF-y,
- przywrócono premium hero overlay,
- poprawiono stopkę,
- zachowano realny PDF preview,
- PDF jest używalny i stabilny na tym etapie,
- nie kontynuować dalszych poprawek PDF bez osobnego sprintu.

## Znane ograniczenia PDF

- iOS może pokazywać Unknown.pdf,
- nagłówek tabeli może nie powtarzać się na drugiej stronie,
- API PDF wymaga zabezpieczenia przed SaaS,
- V3 programmatic zostaje jako opcja przyszłościowa.

## Następne rekomendowane sprinty

1. **Stabilizacja drobna aplikacji**
   - dokończenie P5/P6/P8/P9/P10 z regression raportu.

2. **Ustawienia ofert**
   - stopka PDF,
   - dane firmy,
   - tekst kolejnego kroku,
   - czas realizacji,
   - domyślna ważność oferty,
   - domyślna stawka VAT,
   - numeracja ofert.

3. **Panel administratora**
   - tworzenie użytkowników,
   - role,
   - deaktywacja użytkowników,
   - zabezpieczenie API PDF.

4. **Załączniki**
   - zdjęcia i pliki do klienta,
   - później do leadów, ofert i inwestycji.

5. **Oferty PV UX v2**
   - duplikowanie ofert,
   - walidacja numeru,
   - historia zmian.

## Decyzja strategiczna

Nie otwierać teraz nowego silnika PDF.
Nie ruszać PDF, jeśli nie ma krytycznego błędu.
Najbliższy wartościowy kierunek: **Ustawienia ofert** albo **Panel administratora**.
