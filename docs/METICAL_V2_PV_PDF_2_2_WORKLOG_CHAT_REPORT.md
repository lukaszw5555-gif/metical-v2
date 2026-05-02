# METICAL V2 — PV PDF 2.2 Worklog (Chat Report)

**Date:** 2026-05-02  
**Conversation:** Pełny cykl pracy nad generowaniem ofert PV PDF  
**Result:** Premium PDF działa na desktop i mobile przez server-side rendering

---

## Chronologia prac

### 1. PV 2.0 — Print-ready HTML / window.print

Punkt wyjścia: widok `/sales/offers/pv/:id/print` renderuje ofertę jako stronę A4 w HTML/CSS. Użytkownik może użyć `Ctrl+P` / `window.print()` do wydruku lub zapisu PDF przez przeglądarkę.

### 2. PV 2.1A — html2canvas + jsPDF do pobierania PDF

Dodano `exportPvOfferPdf.ts` używający html2canvas do zrobienia screenshota DOM i jsPDF do zapisania go jako PDF. Na desktopie wynik wygląda premium — identyczny z widokiem /print.

### 3. Problem mobile — html2canvas na telefonie rozjeżdża layout

Na iPhone html2canvas gubi CSS custom properties, niepoprawnie renderuje gradient overlay, rozjeżdża układ elementów. PDF mobilny wyglądał drastycznie inaczej niż desktopowy.

### 4. PV 2.1E — programowy jsPDF + autoTable

Stworzono `generatePvOfferPdfProgrammatic()` — czysto programowy generator PDF z jsPDF + jspdf-autotable. Układ: ciemny header → karta ceny → dane klienta → tabela zakresu → warunki → podpisy → stopka.

### 5. Problem — programowy PDF działał, ale wyglądał słabo

- Brak hero image
- Brak premium designu (gradientów, overlay, typografii)
- Problemy z polskimi znakami (transliteracja: Wazna, Montaz)
- Surowy układ nie odpowiadający standardom marki METICAL

### 6. Hybryda — desktop html2canvas, mobile jsPDF

Wdrożono mechanizm hybrydowy: na desktopie html2canvas (premium), na mobile jsPDF (uproszczony). Użytkownik widział ostrzeżenie „Na telefonie pobierana jest uproszczona wersja PDF".

### 7. Dopracowanie jsPDF mobile — 2 strony, assety, logo, hero

Przez kilka sprintów (PV 2.1F, 2.1G, 2.1H) optymalizowano programowy PDF:
- Skompresowano do 2 stron
- Dodano logo z /metical-logo-light.png jako data URL
- Dodano hero image z /pv-offer-hero.png jako tło
- Poprawiono układ, marginesy, spacing

### 8. Wniosek — jsPDF nie da jakości desktop premium

Mimo wielu iteracji, programowy jsPDF nie jest w stanie odwzorować pełnego premium layoutu HTML/CSS. Różnice w typografii, gradientach, pozycjonowaniu elementów i polskich znakach są zbyt duże.

**Decyzja:** Przestajemy rozwijać jsPDF jako główne rozwiązanie mobile. Telefon ma generować ten sam PDF co desktop.

### 9. PV 2.2A — server-side PDF przez Vercel API + Chromium

Stworzono:
- `api/generate-pv-offer-pdf.ts` — Vercel Serverless Function z puppeteer-core + @sparticuz/chromium
- `exportPvOfferServerPdf.ts` — frontend wysyła HTML + CSS do API

Zaktualizowano PvOfferPrintPage.tsx — oba urządzenia używają server-side PDF jako primary export.

### 10. Problem — endpoint timeoutował

Pierwsze wdrożenie miało problemy:
- `networkidle0` czekał na pobranie hero image (2.2MB) przez Chromium — timeout
- vercel.json rewrite `/api/(.*) → /api/$1` kolidował z natywnym routingiem Vercel Functions
- Nazwy pól w body request były niespójne między frontend i backend
- Brak flag `--no-sandbox` / `--disable-dev-shm-usage` dla Chromium

### 11. FIX — self-contained HTML

Kluczowa zmiana: frontend teraz:
1. Klonuje `.pv-print-doc`
2. Konwertuje logo i hero na data URL (fetch → blob → FileReader)
3. Zbiera CSS jako tekst z `document.styleSheets`
4. Wysyła kompletny, samowystarczalny HTML do API

Backend nie pobiera niczego z sieci — renderuje gotowy HTML. Zmieniono `waitUntil` na `'load'` z 15s timeout.

### 12. Sukces — mobile generuje premium PDF

Po wdrożeniu self-contained HTML:
- Desktop i mobile generują identyczny premium PDF
- Polskie znaki działają (Chromium renderuje prawdziwe fonty)
- Hero image i logo są widoczne
- Czas generowania: 3-7s

### 13. PV 2.2B — poprawki page flow / footer / layout stron

- Rozbito dokument na dwie jawne strony `.pv-pdf-page` (zamiast jednego flow)
- Footer przyklejony do dołu strony 2 (`margin-top: auto` w flex-column)
- Strona 2 ma `padding-top: 32px` dla oddechu
- Dodano `break-after: page` na stronie 1
- Poprawiono spacing: zmniejszono hero min-height, price-card padding, table row padding
- Dodano `break-inside: avoid` na kluczowych sekcjach (poza @media print)

### 14. PV 2.2C-mini — próba poprawy nazwy pliku na iOS

Dodano Web Share API z `new File([blob], filename, { type: 'application/pdf' })`. Jeśli `navigator.canShare({ files })` zwraca true → `navigator.share()`. Fallback: `window.location.href = blobUrl`.

### 15. Stan końcowy

- ✅ PDF działa na desktop i mobile
- ✅ Desktop i mobile używają tego samego mechanizmu (server-side)
- ✅ Premium wygląd zachowany
- ✅ Polskie znaki działają
- ✅ Hero image i logo widoczne
- ✅ Dane wewnętrzne ukryte
- ⚠️ Unknown.pdf na iOS — znane ograniczenie, nie blokada
- ⚠️ Vercel cold start — pierwsze wywołanie może trwać dłużej

### 16. Najważniejsze decyzje

| Decyzja | Uzasadnienie |
|---------|-------------|
| Nie rozwijać jsPDF jako głównego PDF | Nie da się odwzorować premium HTML/CSS w programowym generatorze |
| Server-side PDF jest źródłem prawdy | Chromium renderuje ten sam HTML co przeglądarka — identyczny wynik |
| Layout HTML jest źródłem prawdy | Zmiany wyglądu PDF = zmiany w PvOfferPrintPage + pvOfferPrint.css |
| Self-contained HTML | Eliminuje zależność od sieci na serwerze — stabilne i szybkie |
| Nie ruszać mechanizmu bez potrzeby | Każda zmiana wymaga testu desktop + iPhone + build |
