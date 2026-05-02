import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PvOffer, PvOfferItem } from '../types/pvOfferTypes';

// ─── Polish transliteration fallback ─────────────────────────
// jsPDF built-in Helvetica does not render Polish diacritics.
// TODO: embed font with Polish characters in a separate sprint
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
//  PAGE 1 — PREMIUM COVER
// ═══════════════════════════════════════════════════════════════
function drawCover(doc: jsPDF, offer: PvOffer, items: PvOfferItem[]) {
  // ─── Compact dark cover block (85mm) ─────────────
  const coverH = 85;
  doc.setFillColor(...C.dark);
  doc.rect(0, 0, PW, coverH, 'F');

  // Gold accent strip at the very top
  doc.setFillColor(...C.gold);
  doc.rect(0, 0, PW, 2, 'F');

  // Company name
  doc.setFontSize(28); // Slightly smaller
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text('METICAL', MX, 24);

  // Subtitle — with thin gold line underneath
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.goldLight);
  doc.text(pl('OFERTA HANDLOWA'), MX, 32);
  goldLine(doc, 35, MX, MX + 40);

  // Offer type badge
  const typeLabel = pl(OFFER_TYPE_PL[offer.offer_type] || offer.offer_type).toUpperCase();
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  const bw = doc.getTextWidth(typeLabel) + 12;
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.4);
  doc.roundedRect(MX, 40, bw, 8, 1.5, 1.5, 'S');
  doc.text(typeLabel, MX + 6, 45.5);

  // ─── Meta grid ────────────────────────────────────
  doc.setFontSize(8);
  const metaX = PW / 2 + 15;
  const metaLabelX = metaX;
  const metaValX = metaX + 22;
  let my = 24;

  const metaItem = (label: string, value: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 160, 185);
    doc.text(pl(label), metaLabelX, my);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.white);
    doc.text(pl(value), metaValX, my);
    my += 6;
  };

  metaItem('Nr oferty', offer.offer_number || '--');
  metaItem('Data', fmtDate(offer.created_at));
  if (offer.valid_until) metaItem('Wazna do', fmtDate(offer.valid_until));
  metaItem('Klient', offer.customer_name);

  // ─── Customer name big on cover ────────────────────
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  const nameLines = doc.splitTextToSize(pl(offer.customer_name), CW);
  doc.text(nameLines, MX, 64);

  if (offer.investment_address) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 160, 185);
    doc.text(pl(offer.investment_address), MX, 64 + nameLines.length * 6);
  }

  // ─── Price card (Moved up) ─────────────────────────
  const cardY = 92;
  const cardH = 42;
  // Card shadow effect
  doc.setFillColor(20, 20, 40);
  doc.roundedRect(MX + 0.8, cardY + 0.8, CW, cardH, 5, 5, 'F');
  // Card
  doc.setFillColor(...C.darkMid);
  doc.roundedRect(MX, cardY, CW, cardH, 5, 5, 'F');
  // Gold top border on card
  doc.setFillColor(...C.gold);
  doc.rect(MX + 20, cardY, CW - 40, 1, 'F');

  // Price label
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text(pl('CENA KONCOWA BRUTTO'), PW / 2, cardY + 12, { align: 'center' });

  // Calculate final gross
  const vatRate = offer.vat_rate || 8;
  let finalGross = offer.price_gross;
  if (!finalGross || finalGross <= 0) {
    const itemsNet = items.reduce((s, i) => s + i.quantity * i.selling_price, 0);
    const markup = offer.sales_markup_value || 0;
    const discount = offer.customer_discount_value || 0;
    const finalNet = Math.max(0, itemsNet + markup - discount);
    finalGross = finalNet * (1 + vatRate / 100);
  }

  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text(pl(fmtCurrency(finalGross)), PW / 2, cardY + 26, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 175);
  doc.text(pl(`Cena zawiera VAT ${vatRate}%`), PW / 2, cardY + 36, { align: 'center' });

  // ─── Scope badges ─────────────────────────────────
  const storageKwh = getStorageKwh(items);
  const badges: string[] = [];
  if (offer.pv_power_kw && offer.pv_power_kw > 0) badges.push(`${offer.pv_power_kw} kWp`);
  if (offer.panel_count) badges.push(pl(`${offer.panel_count} paneli`));
  if (storageKwh > 0) badges.push(`Magazyn ${storageKwh.toFixed(1)} kWh`);
  badges.push(pl('Dostawa komponentow'));
  badges.push(pl('Montaz i uruchomienie'));
  badges.push(pl('Konfiguracja systemu'));

  let bx = MX;
  let by = cardY + cardH + 10;
  doc.setFontSize(7);

  for (const badge of badges) {
    const tw = doc.getTextWidth(badge) + 12;
    if (bx + tw > PW - MX) { bx = MX; by += 8; }
    // Pill bg
    doc.setFillColor(...C.light);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.15);
    doc.roundedRect(bx, by - 5, tw, 7, 2.5, 2.5, 'FD');
    // Gold dot
    doc.setFillColor(...C.gold);
    doc.circle(bx + 4, by - 1.5, 1.2, 'F');
    // Text
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.text);
    doc.text(badge, bx + 7.5, by - 0.2);
    bx += tw + 3;
  }

  drawFooterBar(doc);
}

// ═══════════════════════════════════════════════════════════════
//  PAGE 2 — SCOPE & PARAMETERS (Compact)
// ═══════════════════════════════════════════════════════════════
function drawScope(doc: jsPDF, offer: PvOffer, items: PvOfferItem[]): number {
  // Gold accent strip
  doc.setFillColor(...C.gold);
  doc.rect(0, 0, PW, 1.2, 'F');

  let y = 10;

  // ─── Two-column info cards ─────────────────────────
  const colW = (CW - 6) / 2;
  const leftX = MX;
  const rightX = MX + colW + 6;

  // Card backgrounds
  const cardH = 54;
  doc.setFillColor(...C.light);
  doc.roundedRect(leftX, y, colW, cardH, 2.5, 2.5, 'F');
  doc.roundedRect(rightX, y, colW, cardH, 2.5, 2.5, 'F');

  // Left card: Customer data
  let ly = y + 6;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text(pl('DANE KLIENTA'), leftX + 6, ly);
  goldLine(doc, ly + 2, leftX + 6, leftX + colW - 6);
  ly += 7;

  const infoItem = (x: number, yRef: { v: number }, label: string, value: string) => {
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.muted);
    doc.text(pl(label), x + 6, yRef.v);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.text);
    doc.text(pl(value), x + 6, yRef.v + 3);
    yRef.v += 8;
  };

  const lyRef = { v: ly };
  infoItem(leftX, lyRef, 'Klient', offer.customer_name);
  if (offer.customer_phone) infoItem(leftX, lyRef, 'Telefon', offer.customer_phone);
  if (offer.customer_email) infoItem(leftX, lyRef, 'E-mail', offer.customer_email);
  if (offer.customer_city) infoItem(leftX, lyRef, pl('Miejscowosc'), offer.customer_city);
  if (offer.investment_address) infoItem(leftX, lyRef, pl('Adres inwestycji'), offer.investment_address);

  // Right card: Technical parameters
  let ry = y + 6;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text(pl('PARAMETRY TECHNICZNE'), rightX + 6, ry);
  goldLine(doc, ry + 2, rightX + 6, rightX + colW - 6);
  ry += 7;

  const ryRef = { v: ry };
  const storageKwh = getStorageKwh(items);

  infoItem(rightX, ryRef, 'Moc instalacji', `${offer.pv_power_kw} kWp`);
  if (offer.panel_count) infoItem(rightX, ryRef, 'Liczba paneli', `${offer.panel_count} szt.`);
  if (offer.panel_power_w) infoItem(rightX, ryRef, 'Moc panelu', `${offer.panel_power_w} W`);
  if (storageKwh > 0) infoItem(rightX, ryRef, 'Magazyn energii', `${storageKwh.toFixed(1)} kWh`);
  if (offer.inverter_name) infoItem(rightX, ryRef, 'Falownik', offer.inverter_name);

  y += cardH + 8;

  // ─── Scope table ───────────────────────────────────
  if (items.length > 0) {
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
        fontSize: 7.5,
        cellPadding: { top: 2.5, right: 4, bottom: 2.5, left: 4 },
        textColor: C.text,
        lineColor: C.border,
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: C.dark,
        textColor: C.white,
        fontStyle: 'bold',
        fontSize: 7,
        cellPadding: { top: 3.5, right: 4, bottom: 3.5, left: 4 },
      },
      alternateRowStyles: {
        fillColor: C.light,
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 38 },
        2: { cellWidth: 14 },
        3: { cellWidth: 14 },
      },
    });

    // @ts-ignore
    y = doc.lastAutoTable.finalY;
  }

  drawFooterBar(doc);
  return y;
}

// ═══════════════════════════════════════════════════════════════
//  PAGE 3 — TERMS & SIGNATURES (Compact)
// ═══════════════════════════════════════════════════════════════
function drawTerms(doc: jsPDF, offer: PvOffer, startY?: number) {
  let y = startY || 14;

  // If we're on the same page, add a gap
  if (startY) y += 12;
  else {
    doc.setFillColor(...C.gold);
    doc.rect(0, 0, PW, 1.2, 'F');
  }

  y = sectionTitle(doc, 'WARUNKI HANDLOWE I KOLEJNY KROK', y);
  y += 3;

  // Terms cards — compact
  const colW = (CW - 6) / 2;

  doc.setFillColor(...C.light);
  doc.roundedRect(MX, y, colW, 18, 2, 2, 'F');
  doc.setFontSize(6);
  doc.setTextColor(...C.muted);
  doc.text(pl('WAZNOSC OFERTY'), MX + 6, y + 6);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.text);
  doc.text(offer.valid_until ? fmtDate(offer.valid_until) : pl('Do potwierdzenia'), MX + 6, y + 13);

  doc.setFillColor(...C.light);
  doc.roundedRect(MX + colW + 6, y, colW, 18, 2, 2, 'F');
  doc.setFontSize(6);
  doc.setTextColor(...C.muted);
  doc.text(pl('CZAS REALIZACJI'), MX + colW + 12, y + 6);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.text);
  doc.text(pl('Do ustalenia po akceptacji'), MX + colW + 12, y + 13);

  y += 24;

  // Next step
  doc.setFillColor(...C.light);
  doc.roundedRect(MX, y, CW, 16, 2, 2, 'F');
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text(pl('KOLEJNY KROK'), MX + 6, y + 6);
  doc.setFontSize(8);
  doc.setTextColor(...C.text);
  doc.text(pl('Potwierdzenie zakresu, dostepnosci komponentow i terminu montazu.'), MX + 6, y + 12);

  y += 22;

  // ─── Offer note ────────────────────────────────────
  if (offer.offer_note) {
    y = sectionTitle(doc, 'UWAGI', y);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.text);
    const noteLines = doc.splitTextToSize(pl(offer.offer_note), CW);
    doc.text(noteLines, MX, y);
    y += noteLines.length * 3.8 + 6;
  }

  // ─── Signatures (Compact) ──────────────────────────
  y = Math.max(y + 8, startY ? y : 190);
  
  // Don't draw signatures too low
  if (y > PH - 65 && startY) {
    doc.addPage();
    y = 14;
    doc.setFillColor(...C.gold);
    doc.rect(0, 0, PW, 1.2, 'F');
    drawFooterBar(doc);
  }

  subtleLine(doc, y);
  y += 5;

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text(pl('Miejsce na podpisy'), PW / 2, y, { align: 'center' });
  y += 6;

  const sigW = CW / 2 - 12;
  const sigLx = MX + 3;
  const sigRx = PW - MX - sigW - 3;

  doc.setFillColor(...C.light);
  doc.roundedRect(sigLx, y, sigW, 24, 2, 2, 'F');
  doc.roundedRect(sigRx, y, sigW, 24, 2, 2, 'F');

  doc.setDrawColor(...C.muted);
  doc.setLineWidth(0.2);
  doc.line(sigLx + 8, y + 16, sigLx + sigW - 8, y + 16);
  doc.line(sigRx + 8, y + 16, sigRx + sigW - 8, y + 16);

  doc.setFontSize(6.5);
  doc.setTextColor(...C.muted);
  doc.text(pl('Podpis handlowca'), sigLx + sigW / 2, y + 21, { align: 'center' });
  doc.text(pl('Podpis klienta'), sigRx + sigW / 2, y + 21, { align: 'center' });

  // ─── Footer Disclaimer (Moved insideTerms if same page) ──
  const footY = PH - 26;
  doc.setFillColor(...C.dark);
  doc.rect(0, footY, PW, 26, 'F');
  doc.setFillColor(...C.gold);
  doc.rect(0, footY, PW, 0.8, 'F');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text('METICAL Sp. z o.o.', PW / 2, footY + 8, { align: 'center' });

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 160, 185);
  const disc = pl('Oferta ma charakter informacyjny i wymaga potwierdzenia dostepnosci komponentow oraz warunkow montazu po wizji lokalnej lub analizie technicznej.');
  const dLines = doc.splitTextToSize(disc, CW - 16);
  doc.text(dLines, PW / 2, footY + 14, { align: 'center' });
}

// ═══════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ═══════════════════════════════════════════════════════════════
export async function generatePvOfferPdfProgrammatic(
  offer: PvOffer,
  items: PvOfferItem[]
): Promise<jsPDF> {
  const doc = new jsPDF('p', 'mm', 'a4');

  // Page 1
  drawCover(doc, offer, items);

  // Page 2
  doc.addPage();
  const finalY = drawScope(doc, offer, items);

  // Logic: can we fit terms on page 2?
  // We need ~80-100mm for terms and signatures.
  // PH is 297, footer is at 271 (297-26).
  // So we have until ~205mm to start terms safely on same page.
  if (finalY < 195) {
    drawTerms(doc, offer, finalY);
  } else {
    doc.addPage();
    drawTerms(doc, offer);
  }

  return doc;
}
