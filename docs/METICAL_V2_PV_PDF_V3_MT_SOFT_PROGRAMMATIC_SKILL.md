# METICAL V2 — PV PDF V3 Programmatic Skill

## Aktualizacja po PV PDF 2.2G

- Po Sprint PV 2.2G obecny generator HTML → self-contained payload → Vercel API → Chromium → PDF został uznany za wystarczająco stabilny dla aktualnego etapu.
- V3 programmatic zostaje jako alternatywa, nie jako natychmiastowy następny sprint.
- Nie należy kasować obecnego generatora.
- Nie należy przebudowywać PDF bez konkretnego problemu biznesowego.
- Jeżeli PDF działa i wygląda dobrze, priorytetem są teraz ustawienia ofert, załączniki i panel administratora.

---

## Cel

Ten skill opisuje **opcjonalny** kierunek przebudowy generatora ofert PV PDF w METICAL V2 na podstawie sprawdzonego modelu z repo `mtsoft`.

Kierunek V3: **programowy generator PDF oparty o `jsPDF` + `jspdf-autotable`** — do rozważenia, jeśli obecny silnik Chromium przestanie spełniać wymagania.

Nowy kierunek: **programowy generator PDF V3 oparty o `jsPDF` + `jspdf-autotable`, z prawdziwym podglądem PDF w iframe i pobieraniem tego samego pliku.**

---

## Dlaczego zmiana silnika ma sens

Obecny model METICAL V2:

```txt
HTML/CSS .pv-print-doc
→ self-contained payload
→ Vercel API
→ Puppeteer/Chromium
→ PDF
```

Zadziałał technicznie, ale jest trudny do stabilizacji przy:

- marginesach stron,
- stopce na każdej stronie,
- łamaniu tabel,
- różnicy między podglądem HTML a finalnym PDF,
- iOS / Safari,
- różnym zachowaniu desktop/mobile,
- kosztownym debugowaniu CSS paged media.

Model `mtsoft` jest prostszy:

```txt
dane oferty
→ jsPDF
→ PDF blob
→ iframe preview
→ download tego samego PDF
```

To daje jedno źródło prawdy: **podgląd PDF = pobrany PDF**.

---

## Wzorzec z mtsoft

W `mtsoft` generator PV działa programowo:

- `src/lib/pv-pdf.ts`
- `generatePvPDF(quote, company): Promise<jsPDF>`
- `drawCover()`
- `drawSummary()`
- `drawTerms()`
- `addHeader()`
- `addFooter()`
- `autoTable()` do tabeli zakresu

Podgląd działa w `QuoteDetail` tak:

```ts
const doc = await generatePvPDF(quote, company);
const blob = doc.output('blob');
const url = URL.createObjectURL(blob);
setPdfUrl(url);
```

Następnie:

```tsx
<iframe src={pdfUrl + '#toolbar=1'} />
```

Pobieranie działa tak:

```ts
const doc = await generatePvPDF(quote, company);
doc.save(`Oferta_PV_${quote.number.replace(/\//g, '_')}.pdf`);
```

W METICAL V2 należy ulepszyć ten wzorzec: pobieranie powinno używać tego samego blobu, który jest w podglądzie, jeśli blob jest aktualny.

---

## Docelowy model w METICAL V2

```txt
PvOffer data + PvOfferItems
→ mapowanie do danych PDF
→ generatePvOfferPdfV3()
→ Blob
→ iframe preview
→ download/share tego samego blobu
```

Nie używać HTML preview jako źródła prawdy.

---

## Pliki docelowe

Nowe pliki:

```txt
src/features/offers/pv/services/generatePvOfferPdfV3.ts
src/features/offers/pv/services/pvOfferPdfV3DataMapper.ts
src/features/offers/pv/components/PvOfferPdfPreview.tsx
```

Modyfikowane pliki:

```txt
src/features/offers/pv/pages/PvOfferPrintPage.tsx
```

Zostawić jako backup / legacy:

```txt
api/generate-pv-offer-pdf.ts
src/features/offers/pv/services/exportPvOfferServerPdf.ts
src/features/offers/pv/services/exportPvOfferPdf.ts
src/features/offers/pv/services/generatePvOfferPdf.ts
src/features/offers/pv/styles/pvOfferPrint.css
```

Nie usuwać legacy od razu. Najpierw zbudować V3 obok i przetestować.

---

## Zasady generatora V3

### 1. Silnik

Używać:

```ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
```

Nie używać:

- Puppeteer,
- Chromium,
- html2canvas,
- renderowania DOM jako PDF,
- CSS paged media jako głównej logiki PDF.

### 2. Jednostki

PDF rysować w `mm`, format A4:

```ts
const doc = new jsPDF('p', 'mm', 'a4');
const PW = 210;
const PH = 297;
const M = 14; // lub 16–18 mm
const FOOTER_Y = 282;
```

### 3. Stopka

Stopka ma być rysowana ręcznie na każdej stronie:

```ts
function addFooter(doc, company, page, total) {
  doc.line(M, 282, PW - M, 282);
  doc.text(company data, PW / 2, 286, { align: 'center' });
  doc.text(`${page} / ${total}`, PW - M, 292, { align: 'right' });
}
```

Nie używać CSS footerTemplate jako głównej logiki.

### 4. Header

Na stronach po coverze używać lekkiego headera:

```ts
function addHeader(doc, offer, company) {
  doc.rect(0, 0, PW, 20, 'F');
  doc.text(`Oferta ${offer.offer_number}`, M, 13);
  doc.text(company.name, PW - M, 13, { align: 'right' });
}
```

### 5. Tabela

Tabela zakresu dostawy ma być kontrolowana przez `autoTable`:

```ts
autoTable(doc, {
  startY: y,
  head: [['Element', 'Producent', 'Ilość', 'J.m.']],
  body,
  margin: { left: M, right: M, top: 28, bottom: 24 },
  didDrawPage: () => {
    addHeader(doc, offer, company);
    addFooter(doc, company, currentPage, totalPages);
  },
});
```

Dzięki temu tabela sama przechodzi między stronami z zachowaniem marginesów.

### 6. Kontrola miejsca

Przed rysowaniem większej sekcji zawsze sprawdzić miejsce:

```ts
function ensureSpace(doc, y, needed, offer, company) {
  if (y + needed > 270) {
    addFooter(doc, company);
    doc.addPage();
    addHeader(doc, offer, company);
    return 34;
  }
  return y;
}
```

Sekcje, które nie powinny być rozdzielane:

- cena końcowa,
- warunki handlowe,
- podpisy.

### 7. Cena końcowa

PDF klienta pokazuje tylko:

- finalną cenę brutto,
- informację o VAT %.

Nie pokazywać:

- purchase_price,
- selling_price pozycji,
- kosztów zakupu,
- marży,
- narzutu jako osobnej pozycji,
- rabatu jako osobnej pozycji,
- cen komponentów.

### 8. Polskie znaki

Preferowana opcja V3:

- osadzić font obsługujący polskie znaki, jeśli plik fontu jest legalnie dostępny w repo/public.

Opcja awaryjna:

- transliteracja jak w mtsoft (`ą → a`, `ł → l`) — tylko tymczasowo.

Nie dodawać fontów bez decyzji użytkownika.

---

## Docelowy UX

Na stronie oferty:

1. Użytkownik klika `Podgląd PDF` albo wchodzi w widok oferty.
2. Aplikacja generuje PDF blob lokalnie w przeglądarce.
3. PDF jest pokazany w iframe/object.
4. Przycisk `Pobierz PDF` pobiera ten sam blob.
5. Na iOS można użyć Web Share API z `File([blob], filename)`.

Przykład:

```ts
const doc = await generatePvOfferPdfV3(offer, items, companySettings);
const blob = doc.output('blob');
const url = URL.createObjectURL(blob);
setPdfBlob(blob);
setPdfUrl(url);
```

Download:

```ts
if (pdfBlob) {
  downloadPdfBlob(pdfBlob, filename);
}
```

---

## Kolejność wdrożenia

### Sprint V3A — generator obok starego

- dodać `generatePvOfferPdfV3.ts`,
- nie podłączać jeszcze jako główny eksport,
- wygenerować testowy PDF z danych oferty,
- zrobić preview iframe,
- build.

### Sprint V3B — podłączenie w PvOfferPrintPage

- dodać przełącznik techniczny albo podmienić flow tylko dla testu,
- `Podgląd PDF` pokazuje V3,
- `Pobierz PDF` pobiera ten sam blob,
- legacy zostaje w repo.

### Sprint V3C — dopracowanie layoutu

- logo,
- hero / cover,
- kolory METICAL,
- tabela,
- stopki,
- podpisy,
- test PV/2026/0011.

### Sprint V3D — przełączenie głównego flow

- V3 jako główny generator,
- Chromium jako legacy fallback albo do usunięcia później,
- checkpoint.

---

## Kryteria akceptacji V3

Generator V3 jest gotowy, jeśli:

- ten sam PDF widoczny jest w podglądzie i pobierany,
- działa na desktopie,
- działa na iPhonie,
- tabela przechodzi między stronami z marginesem,
- stopka jest na każdej stronie,
- cena/warunki/podpisy nie wypadają losowo,
- PDF nie pokazuje danych wewnętrznych,
- build przechodzi,
- legacy PDF nie został usunięty przed checkpointem.

---

## Zakazy

Nie robić:

- pełnego refactoru ofert PV,
- migracji SQL,
- zmian RLS,
- zmian Storage,
- zmian OneSignal,
- zmian w kalkulacji cen,
- usuwania legacy PDF bez osobnej decyzji,
- powrotu do html2canvas jako głównego generatora,
- dalszego łatania HTML/CSS paged flow bez wyraźnej potrzeby.

---

## Decyzja końcowa

Dla METICAL V2 generator ofert PV **może** iść w kierunku programowego PDF V3, jeśli obecny silnik Chromium przestanie spełniać wymagania.

Obecny HTML/Chromium jest aktywnym, stabilnym generatorem. V3 programmatic zostaje jako opcja awaryjna / przyszłościowa na wypadek:

1. Chromium znowu zacznie mieć problemy z paginacją,
2. mobile zacznie generować błędy,
3. będzie potrzebna pełna kontrola tabel i stopki,
4. będziemy budować uniwersalny silnik ofert dla wielu branż.
