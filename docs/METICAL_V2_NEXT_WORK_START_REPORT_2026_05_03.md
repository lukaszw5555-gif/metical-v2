# METICAL V2 — raport startowy do dalszych prac

**Data:** 2026-05-03
**Ostatnia aktualizacja:** 2026-05-03 po PV PDF 2.2I

---

## Aktualny stabilny stan

**Commit:** `4d50197`
**Tag:** `stable-pv-2-2i-mobile-single-download-2026-05-03`

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

PV PDF 2.2G → 2.2H → 2.2I:

- 2.2G: naprawiono białe PDF-y, przywrócono hero overlay, poprawiono stopkę, wdrożono realny PDF preview.
- 2.2H: naprawiono powtarzanie nagłówka tabeli na kolejnych stronach PDF.
- 2.2I: naprawiono podwójne pobieranie PDF na mobile — teraz pobiera się jeden plik.
- PDF jest stabilny, potwierdzony przez użytkownika na desktopie i mobile.
- Nie kontynuować dalszych poprawek PDF bez osobnego sprintu.

## Znane ograniczenia PDF (stan po 2.2I)

- iOS może wymagać Web Share API zamiast `<a download>` — obsłużone.
- API PDF (`/api/generate-pv-offer-pdf`) nie jest jeszcze zabezpieczone tokenem — do zrobienia w sprincie panel administratora.
- V3 programmatic (jsPDF) zostaje jako opcja przyszłościowa — nie wdrażać teraz.

## Następne rekomendowane sprinty

### 1. Ustawienia ofert 1.0 ← **najbliższy rekomendowany sprint**
- Stopka PDF (dane firmy do konfiguracji).
- Tekst „kolejnego kroku".
- Czas realizacji.
- Domyślna ważność oferty.
- Domyślna stawka VAT.
- Numeracja ofert.

### 2. Panel administratora / użytkownicy / role / deaktywacja
- Tworzenie użytkowników.
- Zarządzanie rolami.
- Deaktywacja użytkowników.
- Zabezpieczenie API PDF tokenem.

### 3. Zabezpieczenie API PDF
- Dodanie tokenu / API key do endpointu `/api/generate-pv-offer-pdf`.
- Może być częścią sprintu panel administratora.

### 4. Załączniki
- Zdjęcia i pliki do klienta.
- Później: do leadów, ofert i inwestycji.

### 5. Oferty PV UX v2
- Duplikowanie ofert.
- Walidacja numeru oferty.
- Historia zmian.

## Decyzja strategiczna

- **Nie otwierać nowego silnika PDF.**
- **Nie ruszać PDF** przy sprintach: ustawienia ofert, panel admina, załączniki.
- Jeśli PDF wymaga zmian → osobny sprint PDF z jasnym opisem problemu.
- Najbliższy wartościowy kierunek: **Ustawienia ofert 1.0**.
