# REFERENCE — MTSoft programmatic PV PDF logic

## Cel

Ten plik jest referencją techniczną do przeniesienia mechanizmu generowania PDF z aplikacji `mtsoft` do `METICAL V2`.

Nie kopiujemy starego layoutu 1:1.
Przenosimy tylko zasadę działania:

**DANE OFERTY → jsPDF → autoTable → prawdziwy PDF → doc.save()**

Nie używać `html2canvas` jako głównego eksportu PDF.

---

## Dlaczego zmieniamy mechanizm

Obecny METICAL V2 używa:

**HTML/CSS → html2canvas → obraz → jsPDF**

Problem:
Na iPhone/Safari PDF traci style, skleja teksty i generuje się jako surowy dokument.

Stary mtsoft działa inaczej:

**dane oferty → jsPDF → PDF**

To jest stabilniejsze na mobile, bo nie zależy od DOM, szerokości ekranu, CSS ani renderowania html2canvas.

---

## Biblioteki

W mtsoft używane są:

```ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
```

METICAL V2 ma już `jspdf`.
Trzeba dodać:

```bash
npm install jspdf-autotable
```

---

## Główna struktura starego generatora

W mtsoft plik `src/lib/pv-pdf.ts` ma strukturę:

```ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function calcFinalPrices(quote) {
  // liczy netto, VAT, brutto
}

function addHeader(doc, quote, company) {
  // rysuje pasek nagłówka
}

function addFooter(doc, company) {
  // rysuje stopkę
}

function drawCover(doc, quote, company, prices, heroImg) {
  // okładka PDF
}

function drawSummary(doc, quote, company, prices) {
  // dane klienta, parametry, zakres dostawy, cena
}

function drawTerms(doc, quote, company) {
  // warunki handlowe, podpisy
}

export async function generatePvPDF(quote, company) {
  const doc = new jsPDF('p', 'mm', 'a4');

  const prices = calcFinalPrices(quote);

  drawCover(doc, quote, company, prices, heroImg);

  doc.addPage();
  drawSummary(doc, quote, company, prices);

  doc.addPage();
  drawTerms(doc, quote, company);

  return doc;
}
```

---

## Zasada pobierania PDF

W mtsoft pobranie wygląda tak:

```ts
const doc = await generatePvPDF(quote, company);
doc.save(`Oferta_PV_${quote.number.replace(/\//g, '_')}.pdf`);
```

Podgląd wygląda tak:

```ts
const doc = await generatePvPDF(quote, company);
const blob = doc.output('blob');
const url = URL.createObjectURL(blob);
setPdfUrl(url);
```

---

## Docelowy plik w METICAL V2

Utworzyć:

```txt
src/features/offers/pv/services/generatePvOfferPdf.ts
```

Ten plik ma przyjmować obecne typy METICAL V2:

```ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PvOffer, PvOfferItem } from '../types/pvOfferTypes';
```

Obecne typy w METICAL V2:

```ts
PvOffer:
- id
- offer_number
- customer_name
- customer_phone
- customer_email
- customer_city
- investment_address
- pv_power_kw
- panel_power_w
- panel_count
- inverter_name
- annual_production_kwh
- price_net
- vat_rate
- price_gross
- sales_markup_value
- customer_discount_value
- offer_note
- offer_type
- valid_until
- created_at

PvOfferItem:
- category
- manufacturer
- model
- trade_name
- unit
- quantity
- selling_price
- purchase_price
- vat_rate
- power_w
- capacity_kwh
```

---

## Bardzo ważne ograniczenia danych

Programowy PDF NIE MOŻE pokazać:

- `purchase_price`
- kosztu zakupu
- `margin_value`
- `margin_percent`
- marży wewnętrznej
- `sales_markup_value` jako osobnej pozycji
- `customer_discount_value` jako osobnej pozycji
- `selling_price` komponentów
- ceny netto pozycji
- ceny brutto pozycji
- VAT kwotowo

Programowy PDF MOŻE pokazać:

- finalną cenę brutto
- informację: cena zawiera VAT X%
- zakres rzeczowy
- producenta
- ilość
- jednostkę
- dane klienta
- parametry techniczne
- warunki handlowe

---

## Logika ceny w METICAL V2

Nie liczyć ceny od nowa z pozycji, jeśli nie trzeba.

Preferowane:
używać wartości zapisanych w ofercie:

```ts
const finalGross = offer.price_gross;
const vatRate = offer.vat_rate || 8;
```

Jeśli trzeba przeliczyć fallback:

```ts
const itemsNet = items.reduce((sum, item) => {
  return sum + item.quantity * item.selling_price;
}, 0);

const markup = offer.sales_markup_value || 0;
const discount = offer.customer_discount_value || 0;

const finalNet = Math.max(0, itemsNet + markup - discount);
const finalGross = finalNet * (1 + (offer.vat_rate || 8) / 100);
```

Ale w PDF nie pokazywać markup ani discount.

---

## Polski tekst i znaki

W mtsoft użyto transliteracji, bo domyślna Helvetica w jsPDF nie obsługuje dobrze polskich znaków.

Przykład:

```ts
const PL_MAP: Record<string, string> = {
  'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
  'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
  'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N',
  'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z',
};

function pl(text: string): string {
  return text.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, ch => PL_MAP[ch] || ch);
}
```

W METICAL V2 na pierwszy sprint można użyć transliteracji.
Docelowo można zrobić osobny sprint na osadzenie fontu z polskimi znakami.

---

## Kolory referencyjne

```ts
const C = {
  dark: [26, 26, 46] as [number, number, number],
  gold: [201, 168, 76] as [number, number, number],
  text: [30, 30, 58] as [number, number, number],
  muted: [122, 122, 154] as [number, number, number],
  light: [247, 247, 251] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};
```

---

## Docelowy layout PDF w METICAL V2

### Strona 1 — Cover / oferta

- ciemne tło / hero image, jeśli łatwe
- logo METICAL albo tekst METICAL
- Oferta handlowa
- typ oferty
- numer oferty
- data
- klient
- duża karta:
  - Cena końcowa brutto
  - kwota
  - Cena zawiera VAT X%

### Strona 2 — Zakres i parametry

- dane klienta
- parametry techniczne:
  - moc PV
  - liczba paneli
  - moc panelu
  - pojemność magazynu
  - falownik
- tabela zakresu dostawy bez cen:
  - Element / zakres
  - Producent
  - Ilość
  - J.m.

### Strona 3 — Warunki

- ważność oferty
- czas realizacji
- kolejny krok
- disclaimer
- podpis handlowca
- podpis klienta
- stopka METICAL

---

## Funkcje pomocnicze do generatora

```ts
function fmtCurrency(value: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    maximumFractionDigits: 2,
  }).format(value);
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getStorageKwh(items: PvOfferItem[]): number {
  return items
    .filter(item => item.category === 'Magazyny energii' && item.capacity_kwh && item.capacity_kwh > 0)
    .reduce((sum, item) => sum + (item.capacity_kwh || 0) * item.quantity, 0);
}
```

---

## Schemat funkcji docelowej

```ts
export async function generatePvOfferPdfProgrammatic(
  offer: PvOffer,
  items: PvOfferItem[]
): Promise<jsPDF> {
  const doc = new jsPDF('p', 'mm', 'a4');

  drawCover(doc, offer, items);
  doc.addPage();

  drawScope(doc, offer, items);
  doc.addPage();

  drawTerms(doc, offer);

  return doc;
}
```

---

## Schemat użycia w PvOfferPrintPage

Obecnie przycisk `Pobierz PDF` używa:

```ts
exportElementToPdf(docRef.current, filename)
```

Po wdrożeniu programowego PDF powinien używać:

```ts
const pdf = await generatePvOfferPdfProgrammatic(offer, items);
pdf.save(`oferta-pv-${slug}.pdf`);
```

Stary `exportElementToPdf` może zostać jako fallback albo zostać nieużywany.
Nie usuwać go w pierwszym sprincie.

---

## Zakaz zmian

Nie zmieniać:

- bazy danych
- migracji SQL
- RLS
- Edge Functions
- Storage
- OneSignal
- kalkulatora
- formularza
- leadów
- klientów
- inwestycji
- zadań

Ten sprint dotyczy tylko alternatywnego generatora PDF.

---

## Testy

Po wdrożeniu:

```bash
npm run build
```

Test ręczny:

1. Desktop: pobierz PDF.
2. iPhone pionowo: pobierz PDF.
3. iPhone poziomo: pobierz PDF.
4. Sprawdź, czy PDF nie traci stylu.
5. Sprawdź, czy PDF nie pokazuje cen komponentów.
6. Sprawdź, czy finalna cena brutto jest poprawna.
7. Sprawdź, czy PDF ma tabelę zakresu bez cen.
8. Sprawdź, czy build przechodzi.
