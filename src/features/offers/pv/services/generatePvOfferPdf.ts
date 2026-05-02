import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PvOffer, PvOfferItem } from '../types/pvOfferTypes';

// ─── Polish transliteration (no custom fonts needed) ─────────
const PL_MAP: Record<string, string> = {
  'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
  'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
  'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N',
  'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z',
};
function pl(text: string): string {
  return text.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, ch => PL_MAP[ch] || ch);
}

// ─── Color tokens ────────────────────────────────────────────
const C = {
  dark:  [26, 26, 46]     as [number, number, number],
  gold:  [201, 168, 76]   as [number, number, number],
  text:  [30, 30, 58]     as [number, number, number],
  muted: [122, 122, 154]  as [number, number, number],
  light: [247, 247, 251]  as [number, number, number],
  white: [255, 255, 255]  as [number, number, number],
};

// ─── Helpers ─────────────────────────────────────────────────
const PAGE_W = 210;
const PAGE_H = 297;
const MX = 20; // horizontal margin
const CONTENT_W = PAGE_W - MX * 2;

function fmtCurrency(value: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency', currency: 'PLN', maximumFractionDigits: 2,
  }).format(value);
}

function fmtDate(iso: string | null): string {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function getStorageKwh(items: PvOfferItem[]): number {
  return items
    .filter(i => i.category === 'Magazyny energii' && i.capacity_kwh && i.capacity_kwh > 0)
    .reduce((s, i) => s + (i.capacity_kwh || 0) * i.quantity, 0);
}

const OFFER_TYPE_DISPLAY: Record<string, string> = {
  pv: 'Fotowoltaika',
  pv_me: 'Fotowoltaika + Magazyn energii',
  me: 'Magazyn energii',
  individual: 'Oferta indywidualna',
};

// ─── Horizontal line helper ──────────────────────────────────
function hLine(doc: jsPDF, y: number, color: [number, number, number] = C.light) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.3);
  doc.line(MX, y, PAGE_W - MX, y);
}

// ─── Page footer (called on each page) ──────────────────────
function addFooter(doc: jsPDF) {
  const y = PAGE_H - 12;
  doc.setFontSize(7);
  doc.setTextColor(...C.muted);
  doc.text(pl('METICAL Sp. z o.o.'), PAGE_W / 2, y, { align: 'center' });
}

// ═══════════════════════════════════════════════════════════════
//  PAGE 1 — COVER
// ═══════════════════════════════════════════════════════════════
function drawCover(doc: jsPDF, offer: PvOffer, items: PvOfferItem[]) {
  // ─── Dark header block ─────────────────────────────
  doc.setFillColor(...C.dark);
  doc.rect(0, 0, PAGE_W, 120, 'F');

  // Company name
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text('METICAL', MX, 36);

  // Subtitle
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255, 0.7);
  doc.text(pl('Oferta handlowa'), MX, 46);

  // Offer type badge
  const typeLabel = pl(OFFER_TYPE_DISPLAY[offer.offer_type] || offer.offer_type);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  const badgeW = doc.getTextWidth(typeLabel) + 12;
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.4);
  doc.roundedRect(MX, 52, badgeW, 8, 2, 2, 'S');
  doc.text(typeLabel, MX + 6, 57.5);

  // Meta info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 220, 230);
  let metaY = 72;
  const metaLine = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.text(pl(label + ':'), MX, metaY);
    doc.setFont('helvetica', 'normal');
    doc.text(pl(value), MX + 28, metaY);
    metaY += 6;
  };
  metaLine('Nr', offer.offer_number || '--');
  metaLine('Data', fmtDate(offer.created_at));
  if (offer.valid_until) metaLine('Wazna do', fmtDate(offer.valid_until));
  metaLine('Klient', offer.customer_name);

  // ─── Price card ────────────────────────────────────
  const cardY = 135;
  const cardH = 55;
  doc.setFillColor(...C.dark);
  doc.roundedRect(MX, cardY, CONTENT_W, cardH, 4, 4, 'F');

  // Price label
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text(pl('CENA KONCOWA BRUTTO'), PAGE_W / 2, cardY + 16, { align: 'center' });

  // Price amount — use saved price_gross, fallback to calculation
  const vatRate = offer.vat_rate || 8;
  let finalGross = offer.price_gross;
  if (!finalGross || finalGross <= 0) {
    const itemsNet = items.reduce((s, i) => s + i.quantity * i.selling_price, 0);
    const markup = offer.sales_markup_value || 0;
    const discount = offer.customer_discount_value || 0;
    const finalNet = Math.max(0, itemsNet + markup - discount);
    finalGross = finalNet * (1 + vatRate / 100);
  }

  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text(pl(fmtCurrency(finalGross)), PAGE_W / 2, cardY + 34, { align: 'center' });

  // VAT info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 200);
  doc.text(pl(`Cena zawiera VAT ${vatRate}%`), PAGE_W / 2, cardY + 44, { align: 'center' });

  // ─── Scope summary bullets ────────────────────────
  const storageKwh = getStorageKwh(items);
  const badges: string[] = [];
  if (offer.pv_power_kw && offer.pv_power_kw > 0) badges.push(`${offer.pv_power_kw} kWp`);
  if (offer.panel_count) badges.push(`${offer.panel_count} paneli`);
  if (storageKwh > 0) badges.push(`Magazyn ${storageKwh.toFixed(1)} kWh`);
  badges.push('Dostawa komponentow');
  badges.push('Montaz i uruchomienie');
  badges.push('Konfiguracja systemu');

  let bx = MX;
  let by = cardY + cardH + 16;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.text);

  for (const badge of badges) {
    const txt = pl(badge);
    const tw = doc.getTextWidth(txt) + 10;
    if (bx + tw > PAGE_W - MX) { bx = MX; by += 9; }
    // Badge background
    doc.setFillColor(...C.light);
    doc.roundedRect(bx, by - 5, tw, 7, 2, 2, 'F');
    // Gold dot
    doc.setFillColor(...C.gold);
    doc.circle(bx + 4, by - 1.5, 1.2, 'F');
    // Text
    doc.setTextColor(...C.text);
    doc.text(txt, bx + 8, by - 0.5);
    bx += tw + 4;
  }

  addFooter(doc);
}

// ═══════════════════════════════════════════════════════════════
//  PAGE 2 — SCOPE & PARAMETERS
// ═══════════════════════════════════════════════════════════════
function drawScope(doc: jsPDF, offer: PvOffer, items: PvOfferItem[]) {
  let y = 20;

  // ─── Section: Customer data ────────────────────────
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text(pl('DANE KLIENTA'), MX, y);
  y += 3;
  hLine(doc, y);
  y += 6;

  const infoRow = (label: string, value: string) => {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.muted);
    doc.text(pl(label), MX, y);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.text);
    doc.text(pl(value), MX, y + 4.5);
    y += 11;
  };

  infoRow('Klient', offer.customer_name);
  if (offer.customer_phone) infoRow('Telefon', offer.customer_phone);
  if (offer.customer_email) infoRow('E-mail', offer.customer_email);
  if (offer.customer_city) infoRow('Miejscowosc', offer.customer_city);
  if (offer.investment_address) infoRow('Adres inwestycji', offer.investment_address);

  y += 4;

  // ─── Section: Technical parameters ─────────────────
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text(pl('PARAMETRY TECHNICZNE'), MX, y);
  y += 3;
  hLine(doc, y);
  y += 6;

  const storageKwh = getStorageKwh(items);

  infoRow('Moc instalacji', `${offer.pv_power_kw} kWp`);
  if (offer.panel_count) infoRow('Liczba paneli', `${offer.panel_count} szt.`);
  if (offer.panel_power_w) infoRow('Moc panelu', `${offer.panel_power_w} W`);
  if (storageKwh > 0) infoRow('Magazyn energii', `${storageKwh.toFixed(1)} kWh`);
  if (offer.inverter_name) infoRow('Falownik', offer.inverter_name);

  y += 4;

  // ─── Section: Scope table ──────────────────────────
  if (items.length > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.gold);
    doc.text(pl('ZAKRES DOSTAWY'), MX, y);
    y += 3;
    hLine(doc, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      margin: { left: MX, right: MX },
      head: [[
        pl('Element / zakres'),
        pl('Producent'),
        pl('Ilosc'),
        'J.m.',
      ]],
      body: items.map(item => [
        pl(item.trade_name),
        pl(item.manufacturer || '--'),
        String(item.quantity),
        pl(item.unit),
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: C.text,
        lineColor: C.light,
        lineWidth: 0.3,
      },
      headStyles: {
        fillColor: C.dark,
        textColor: C.white,
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      alternateRowStyles: {
        fillColor: C.light,
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 40 },
        2: { cellWidth: 18, halign: 'right' },
        3: { cellWidth: 18 },
      },
    });
  }

  addFooter(doc);
}

// ═══════════════════════════════════════════════════════════════
//  PAGE 3 — TERMS & CONDITIONS
// ═══════════════════════════════════════════════════════════════
function drawTerms(doc: jsPDF, offer: PvOffer) {
  let y = 20;

  // Header
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text(pl('WARUNKI HANDLOWE I KOLEJNY KROK'), MX, y);
  y += 3;
  hLine(doc, y);
  y += 10;

  // Terms grid
  const termRow = (label: string, value: string) => {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.muted);
    doc.text(pl(label), MX, y);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.text);
    doc.text(pl(value), MX, y + 5);
    y += 14;
  };

  termRow('Waznosc oferty', offer.valid_until ? fmtDate(offer.valid_until) : pl('Do potwierdzenia'));
  termRow('Czas realizacji', pl('Do ustalenia po akceptacji oferty'));

  y += 2;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.text);
  doc.text(pl('Kolejny krok:'), MX, y);
  doc.setFont('helvetica', 'normal');
  y += 5;
  doc.setFontSize(9);
  doc.text(pl('Potwierdzenie zakresu, dostepnosci komponentow i terminu montazu.'), MX, y);

  // ─── Offer note ────────────────────────────────────
  if (offer.offer_note) {
    y += 14;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.gold);
    doc.text(pl('UWAGI'), MX, y);
    y += 3;
    hLine(doc, y);
    y += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.text);
    const noteLines = doc.splitTextToSize(pl(offer.offer_note), CONTENT_W);
    doc.text(noteLines, MX, y);
    y += noteLines.length * 4;
  }

  // ─── Signatures ────────────────────────────────────
  y = Math.max(y + 20, 190);
  hLine(doc, y);
  y += 10;

  const sigW = CONTENT_W / 2 - 10;

  // Left — sales rep
  doc.setDrawColor(...C.muted);
  doc.setLineWidth(0.3);
  doc.line(MX, y + 20, MX + sigW, y + 20);
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  doc.text(pl('Podpis handlowca'), MX + sigW / 2, y + 26, { align: 'center' });

  // Right — client
  const rx = PAGE_W - MX - sigW;
  doc.line(rx, y + 20, rx + sigW, y + 20);
  doc.text(pl('Podpis klienta'), rx + sigW / 2, y + 26, { align: 'center' });

  // ─── Disclaimer ────────────────────────────────────
  y = PAGE_H - 30;
  doc.setFillColor(...C.dark);
  doc.rect(0, y, PAGE_W, 30, 'F');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text(pl('METICAL Sp. z o.o.'), PAGE_W / 2, y + 10, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 200);
  const disclaimer = pl('Oferta ma charakter informacyjny i wymaga potwierdzenia dostepnosci komponentow oraz warunkow montazu po wizji lokalnej lub analizie technicznej.');
  const dLines = doc.splitTextToSize(disclaimer, CONTENT_W - 20);
  doc.text(dLines, PAGE_W / 2, y + 16, { align: 'center' });
}

// ═══════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ═══════════════════════════════════════════════════════════════
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
