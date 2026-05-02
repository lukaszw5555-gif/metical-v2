import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PvOffer, PvOfferItem } from '../types/pvOfferTypes';

// ─── Polish transliteration fallback ─────────────────────────
// jsPDF built-in Helvetica does not render Polish diacritics.
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
  dark:      [26, 26, 46]     as [number, number, number],
  darkMid:   [35, 35, 60]     as [number, number, number],
  gold:      [201, 168, 76]   as [number, number, number],
  goldLight: [232, 212, 139]  as [number, number, number],
  text:      [30, 30, 58]     as [number, number, number],
  muted:     [122, 122, 154]  as [number, number, number],
  light:     [245, 245, 250]  as [number, number, number],
  border:    [230, 230, 240]  as [number, number, number],
  white:     [255, 255, 255]  as [number, number, number],
};

// ─── Layout constants ────────────────────────────────────────
const PW = 210;
const PH = 297;
const MX = 18;
const CW = PW - MX * 2; // content width

// ─── Helpers ─────────────────────────────────────────────────
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

const OFFER_TYPE_PL: Record<string, string> = {
  pv: 'Fotowoltaika',
  pv_me: 'Fotowoltaika + Magazyn energii',
  me: 'Magazyn energii',
  individual: 'Oferta indywidualna',
};

// ─── Decorative helpers ──────────────────────────────────────
function goldLine(doc: jsPDF, y: number, x1 = MX, x2 = PW - MX) {
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.4);
  doc.line(x1, y, x2, y);
}

function subtleLine(doc: jsPDF, y: number, x1 = MX, x2 = PW - MX) {
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.2);
  doc.line(x1, y, x2, y);
}

function sectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text(pl(title), MX, y);
  goldLine(doc, y + 2);
  return y + 7;
}

// ─── Compact footer bar ─────────────────────────────────────
function drawFooterBar(doc: jsPDF) {
  const y = PH - 10;
  doc.setFillColor(...C.dark);
  doc.rect(0, y, PW, 10, 'F');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text('METICAL Sp. z o.o.', PW / 2, y + 6, { align: 'center' });
}

// ═══════════════════════════════════════════════════════════════
//  PAGE 1 — COVER & INFO
// ═══════════════════════════════════════════════════════════════
function drawPage1(doc: jsPDF, offer: PvOffer, items: PvOfferItem[]) {
  // ─── 1. Compact Header (60mm) ────────────────────
  const headerH = 60;
  doc.setFillColor(...C.dark);
  doc.rect(0, 0, PW, headerH, 'F');
  doc.setFillColor(...C.gold);
  doc.rect(0, 0, PW, 1.5, 'F');

  // Company
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text('METICAL', MX, 22);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.goldLight);
  doc.text(pl('OFERTA HANDLOWA'), MX, 29);
  goldLine(doc, 32, MX, MX + 35);

  const typeLabel = pl(OFFER_TYPE_PL[offer.offer_type] || offer.offer_type).toUpperCase();
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  const bw = doc.getTextWidth(typeLabel) + 10;
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.4);
  doc.roundedRect(MX, 37, bw, 7, 1.2, 1.2, 'S');
  doc.text(typeLabel, MX + 5, 42);

  // Meta grid (right side)
  doc.setFontSize(7.5);
  const metaX = PW / 2 + 15;
  const metaLabelX = metaX;
  const metaValX = metaX + 22;
  let my = 20;

  const metaItem = (label: string, value: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 160, 185);
    doc.text(pl(label), metaLabelX, my);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.white);
    doc.text(pl(value), metaValX, my);
    my += 5.5;
  };

  metaItem('Nr oferty', offer.offer_number || '--');
  metaItem('Data', fmtDate(offer.created_at));
  if (offer.valid_until) metaItem('Wazna do', fmtDate(offer.valid_until));
  metaItem('Klient', offer.customer_name);

  // ─── 2. Price Card (directly under header) ───────
  const cardY = headerH + 6;
  const cardH = 38;
  doc.setFillColor(20, 20, 40);
  doc.roundedRect(MX + 0.5, cardY + 0.5, CW, cardH, 4, 4, 'F');
  doc.setFillColor(...C.darkMid);
  doc.roundedRect(MX, cardY, CW, cardH, 4, 4, 'F');
  doc.setFillColor(...C.gold);
  doc.rect(MX + 20, cardY, CW - 40, 0.8, 'F');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text(pl('CENA KONCOWA BRUTTO'), PW / 2, cardY + 10, { align: 'center' });

  // Calc final gross
  const vatRate = offer.vat_rate || 8;
  let finalGross = offer.price_gross;
  if (!finalGross || finalGross <= 0) {
    const itemsNet = items.reduce((s, i) => s + i.quantity * i.selling_price, 0);
    const markup = offer.sales_markup_value || 0;
    const discount = offer.customer_discount_value || 0;
    const finalNet = Math.max(0, itemsNet + markup - discount);
    finalGross = finalNet * (1 + vatRate / 100);
  }

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text(pl(fmtCurrency(finalGross)), PW / 2, cardY + 23, { align: 'center' });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 175);
  doc.text(pl(`Cena zawiera VAT ${vatRate}%`), PW / 2, cardY + 31, { align: 'center' });

  // ─── 3. Scope Badges ─────────────────────────────
  const storageKwh = getStorageKwh(items);
  const badges: string[] = [];
  if (offer.pv_power_kw && offer.pv_power_kw > 0) badges.push(`${offer.pv_power_kw} kWp`);
  if (offer.panel_count) badges.push(pl(`${offer.panel_count} paneli`));
  if (storageKwh > 0) badges.push(`Magazyn ${storageKwh.toFixed(1)} kWh`);
  badges.push(pl('Dostawa komponentow'));
  badges.push(pl('Montaz i uruchomienie'));
  badges.push(pl('Konfiguracja systemu'));

  let bx = MX;
  let by = cardY + cardH + 8;
  doc.setFontSize(6.5);
  for (const badge of badges) {
    const tw = doc.getTextWidth(badge) + 10;
    if (bx + tw > PW - MX) { bx = MX; by += 7.5; }
    doc.setFillColor(...C.light);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.1);
    doc.roundedRect(bx, by - 4.5, tw, 6, 2, 2, 'FD');
    doc.setFillColor(...C.gold);
    doc.circle(bx + 3.5, by - 1.5, 1, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.text);
    doc.text(badge, bx + 6.5, by - 0.2);
    bx += tw + 3;
  }

  // ─── 4. Info Cards (two-column) ──────────────────
  let iy = by + 10;
  const colW = (CW - 5) / 2;
  const cardH2 = 50;
  doc.setFillColor(...C.light);
  doc.roundedRect(MX, iy, colW, cardH2, 2, 2, 'F');
  doc.roundedRect(MX + colW + 5, iy, colW, cardH2, 2, 2, 'F');

  // Left card
  let cy = iy + 5;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text(pl('DANE KLIENTA'), MX + 6, cy);
  goldLine(doc, cy + 1.5, MX + 6, MX + colW - 6);
  cy += 6;

  const infoItem = (x: number, yRef: { v: number }, label: string, value: string) => {
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.muted);
    doc.text(pl(label), x + 6, yRef.v);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.text);
    doc.text(pl(value), x + 6, yRef.v + 3);
    yRef.v += 7.5;
  };

  const cyRef = { v: cy };
  infoItem(MX, cyRef, 'Klient', offer.customer_name);
  if (offer.customer_phone) infoItem(MX, cyRef, 'Telefon', offer.customer_phone);
  if (offer.customer_email) infoItem(MX, cyRef, 'E-mail', offer.customer_email);
  if (offer.customer_city) infoItem(MX, cyRef, pl('Miejscowosc'), offer.customer_city);
  if (offer.investment_address) infoItem(MX, cyRef, pl('Adres inwestycji'), offer.investment_address);

  // Right card
  let ry = iy + 5;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text(pl('PARAMETRY TECHNICZNE'), MX + colW + 11, ry);
  goldLine(doc, ry + 1.5, MX + colW + 11, MX + CW - 6);
  ry += 6;
  const ryRef = { v: ry };
  infoItem(MX + colW + 5, ryRef, 'Moc instalacji', `${offer.pv_power_kw} kWp`);
  if (offer.panel_count) infoItem(MX + colW + 5, ryRef, 'Liczba paneli', `${offer.panel_count} szt.`);
  if (offer.panel_power_w) infoItem(MX + colW + 5, ryRef, 'Moc panelu', `${offer.panel_power_w} W`);
  if (storageKwh > 0) infoItem(MX + colW + 5, ryRef, 'Magazyn energii', `${storageKwh.toFixed(1)} kWh`);
  if (offer.inverter_name) infoItem(MX + colW + 5, ryRef, 'Falownik', offer.inverter_name);

  drawFooterBar(doc);
}

// ═══════════════════════════════════════════════════════════════
//  PAGE 2 — SCOPE & TERMS
// ═══════════════════════════════════════════════════════════════
function drawPage2(doc: jsPDF, offer: PvOffer, items: PvOfferItem[]) {
  doc.setFillColor(...C.gold);
  doc.rect(0, 0, PW, 1, 'F');

  let y = 10;
  y = sectionTitle(doc, 'ZAKRES DOSTAWY', y);

  autoTable(doc, {
    startY: y,
    margin: { left: MX, right: MX },
    head: [[
      pl('Element / zakres'),
      pl('Producent'),
      { content: pl('Ilosc'), styles: { halign: 'right' as const } },
      'J.m.',
    ]],
    body: items.map(item => [
      pl(item.trade_name),
      pl(item.manufacturer || '--'),
      { content: String(item.quantity), styles: { halign: 'right' as const } },
      pl(item.unit),
    ]),
    styles: {
      fontSize: 7,
      cellPadding: { top: 2.2, right: 4, bottom: 2.2, left: 4 },
      textColor: C.text,
      lineColor: C.border,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: C.dark,
      textColor: C.white,
      fontStyle: 'bold',
      fontSize: 6.5,
      cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
    },
    alternateRowStyles: {
      fillColor: C.light,
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 38 },
      2: { cellWidth: 12 },
      3: { cellWidth: 12 },
    },
  });

  y = (doc as any).lastAutoTable?.finalY || y;

  // Check if we need a new page for terms (limit 215mm)
  if (y > 215) {
    doc.addPage();
    doc.setFillColor(...C.gold);
    doc.rect(0, 0, PW, 1, 'F');
    drawFooterBar(doc);
    y = 10;
  } else {
    y += 10;
  }

  y = sectionTitle(doc, 'WARUNKI HANDLOWE I KOLEJNY KROK', y);
  y += 2;

  // Terms Cards
  const colW = (CW - 5) / 2;
  doc.setFillColor(...C.light);
  doc.roundedRect(MX, y, colW, 16, 2, 2, 'F');
  doc.roundedRect(MX + colW + 5, y, colW, 16, 2, 2, 'F');
  
  doc.setFontSize(5.5);
  doc.setTextColor(...C.muted);
  doc.text(pl('WAZNOSC OFERTY'), MX + 5, y + 5);
  doc.text(pl('CZAS REALIZACJI'), MX + colW + 10, y + 5);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.text);
  doc.text(offer.valid_until ? fmtDate(offer.valid_until) : pl('Do potwierdzenia'), MX + 5, y + 11);
  doc.text(pl('Do ustalenia po akceptacji'), MX + colW + 10, y + 11);
  
  y += 20;
  doc.setFillColor(...C.light);
  doc.roundedRect(MX, y, CW, 14, 2, 2, 'F');
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text(pl('KOLEJNY KROK'), MX + 5, y + 5);
  doc.setFontSize(7.5);
  doc.setTextColor(...C.text);
  doc.text(pl('Potwierdzenie zakresu, dostepnosci komponentow i terminu montazu.'), MX + 5, y + 10);
  
  y += 18;
  if (offer.offer_note) {
    y = sectionTitle(doc, 'UWAGI', y);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    const noteLines = doc.splitTextToSize(pl(offer.offer_note), CW);
    doc.text(noteLines, MX, y);
    y += noteLines.length * 3.5 + 4;
  }

  // Signatures
  y = Math.max(y + 6, 220);
  subtleLine(doc, y);
  y += 4;
  doc.setFontSize(6);
  doc.setTextColor(...C.muted);
  doc.text(pl('Miejsce na podpisy'), PW / 2, y, { align: 'center' });
  y += 5;

  const sigW = CW / 2 - 10;
  doc.setFillColor(...C.light);
  doc.roundedRect(MX + 2, y, sigW, 20, 2, 2, 'F');
  doc.roundedRect(PW - MX - sigW - 2, y, sigW, 20, 2, 2, 'F');
  doc.setDrawColor(...C.muted);
  doc.setLineWidth(0.2);
  doc.line(MX + 8, y + 14, MX + sigW - 4, y + 14);
  doc.line(PW - MX - sigW + 4, y + 14, PW - MX - 8, y + 14);
  doc.setFontSize(6);
  doc.text(pl('Podpis handlowca'), MX + sigW / 2 + 2, y + 18, { align: 'center' });
  doc.text(pl('Podpis klienta'), PW - MX - sigW / 2 - 2, y + 18, { align: 'center' });

  // Dark Footer Disclaimer
  const footY = PH - 24;
  doc.setFillColor(...C.dark);
  doc.rect(0, footY, PW, 24, 'F');
  doc.setFillColor(...C.gold);
  doc.rect(0, footY, PW, 0.8, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text('METICAL Sp. z o.o.', PW / 2, footY + 7, { align: 'center' });
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 160, 185);
  const disc = pl('Oferta ma charakter informacyjny i wymaga potwierdzenia dostepnosci komponentow oraz warunkow montazu po wizji lokalnej lub analizie technicznej.');
  const dLines = doc.splitTextToSize(disc, CW - 12);
  doc.text(dLines, PW / 2, footY + 13, { align: 'center' });

  drawFooterBar(doc);
}

// ═══════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ═══════════════════════════════════════════════════════════════
export async function generatePvOfferPdfProgrammatic(
  offer: PvOffer,
  items: PvOfferItem[]
): Promise<jsPDF> {
  const doc = new jsPDF('p', 'mm', 'a4');
  drawPage1(doc, offer, items);
  doc.addPage();
  drawPage2(doc, offer, items);
  return doc;
}
