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
  // ─── Full dark cover block (top 110mm) ─────────────
  doc.setFillColor(...C.dark);
  doc.rect(0, 0, PW, 110, 'F');

  // Gold accent strip at the very top
  doc.setFillColor(...C.gold);
  doc.rect(0, 0, PW, 2, 'F');

  // Company name
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text('METICAL', MX, 28);

  // Subtitle — with thin gold line underneath
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.goldLight);
  doc.text(pl('OFERTA HANDLOWA'), MX, 38);
  goldLine(doc, 42, MX, MX + 50);

  // Offer type badge
  const typeLabel = pl(OFFER_TYPE_PL[offer.offer_type] || offer.offer_type).toUpperCase();
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  const bw = doc.getTextWidth(typeLabel) + 14;
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.5);
  doc.roundedRect(MX, 48, bw, 9, 2, 2, 'S');
  doc.text(typeLabel, MX + 7, 54);

  // ─── Meta grid (right side + below badge) ──────────
  doc.setFontSize(8.5);
  const metaX = PW / 2 + 5;
  const metaLabelX = metaX;
  const metaValX = metaX + 25;
  let my = 28;

  const metaItem = (label: string, value: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 160, 185);
    doc.text(pl(label), metaLabelX, my);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.white);
    doc.text(pl(value), metaValX, my);
    my += 7;
  };

  metaItem('Nr oferty', offer.offer_number || '--');
  metaItem('Data', fmtDate(offer.created_at));
  if (offer.valid_until) metaItem('Wazna do', fmtDate(offer.valid_until));
  metaItem('Klient', offer.customer_name);

  // ─── Customer name big on cover ────────────────────
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  const nameLines = doc.splitTextToSize(pl(offer.customer_name), CW);
  doc.text(nameLines, MX, 80);

  if (offer.investment_address) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 160, 185);
    doc.text(pl(offer.investment_address), MX, 80 + nameLines.length * 8);
  }

  // ─── Price card ────────────────────────────────────
  const cardY = 120;
  const cardH = 48;
  // Card shadow effect
  doc.setFillColor(20, 20, 40);
  doc.roundedRect(MX + 1, cardY + 1, CW, cardH, 6, 6, 'F');
  // Card
  doc.setFillColor(...C.darkMid);
  doc.roundedRect(MX, cardY, CW, cardH, 6, 6, 'F');
  // Gold top border on card
  doc.setFillColor(...C.gold);
  doc.rect(MX + 20, cardY, CW - 40, 1.2, 'F');

  // Price label
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text(pl('CENA KONCOWA BRUTTO'), PW / 2, cardY + 14, { align: 'center' });

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

  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text(pl(fmtCurrency(finalGross)), PW / 2, cardY + 30, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 175);
  doc.text(pl(`Cena zawiera VAT ${vatRate}%`), PW / 2, cardY + 40, { align: 'center' });

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
  let by = cardY + cardH + 14;
  doc.setFontSize(7.5);

  for (const badge of badges) {
    const tw = doc.getTextWidth(badge) + 14;
    if (bx + tw > PW - MX) { bx = MX; by += 10; }
    // Pill bg
    doc.setFillColor(...C.light);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.roundedRect(bx, by - 5.5, tw, 8, 3, 3, 'FD');
    // Gold dot
    doc.setFillColor(...C.gold);
    doc.circle(bx + 5, by - 1.5, 1.5, 'F');
    // Text
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.text);
    doc.text(badge, bx + 9, by);
    bx += tw + 4;
  }

  drawFooterBar(doc);
}

// ═══════════════════════════════════════════════════════════════
//  PAGE 2 — SCOPE & PARAMETERS (two-column info + table)
// ═══════════════════════════════════════════════════════════════
function drawScope(doc: jsPDF, offer: PvOffer, items: PvOfferItem[]) {
  // Gold accent strip
  doc.setFillColor(...C.gold);
  doc.rect(0, 0, PW, 1.5, 'F');

  let y = 14;

  // ─── Two-column info cards ─────────────────────────
  const colW = (CW - 8) / 2;
  const leftX = MX;
  const rightX = MX + colW + 8;

  // Card backgrounds
  doc.setFillColor(...C.light);
  doc.roundedRect(leftX, y, colW, 60, 3, 3, 'F');
  doc.roundedRect(rightX, y, colW, 60, 3, 3, 'F');

  // Left card: Customer data
  let ly = y + 7;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text(pl('DANE KLIENTA'), leftX + 8, ly);
  goldLine(doc, ly + 2, leftX + 8, leftX + colW - 8);
  ly += 7;

  const infoItem = (x: number, yRef: { v: number }, label: string, value: string) => {
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.muted);
    doc.text(pl(label), x + 8, yRef.v);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.text);
    doc.text(pl(value), x + 8, yRef.v + 3.5);
    yRef.v += 9;
  };

  const lyRef = { v: ly };
  infoItem(leftX, lyRef, 'Klient', offer.customer_name);
  if (offer.customer_phone) infoItem(leftX, lyRef, 'Telefon', offer.customer_phone);
  if (offer.customer_email) infoItem(leftX, lyRef, 'E-mail', offer.customer_email);
  if (offer.customer_city) infoItem(leftX, lyRef, pl('Miejscowosc'), offer.customer_city);
  if (offer.investment_address) infoItem(leftX, lyRef, pl('Adres inwestycji'), offer.investment_address);

  // Right card: Technical parameters
  let ry = y + 7;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text(pl('PARAMETRY TECHNICZNE'), rightX + 8, ry);
  goldLine(doc, ry + 2, rightX + 8, rightX + colW - 8);
  ry += 7;

  const ryRef = { v: ry };
  const storageKwh = getStorageKwh(items);

  infoItem(rightX, ryRef, 'Moc instalacji', `${offer.pv_power_kw} kWp`);
  if (offer.panel_count) infoItem(rightX, ryRef, 'Liczba paneli', `${offer.panel_count} szt.`);
  if (offer.panel_power_w) infoItem(rightX, ryRef, 'Moc panelu', `${offer.panel_power_w} W`);
  if (storageKwh > 0) infoItem(rightX, ryRef, 'Magazyn energii', `${storageKwh.toFixed(1)} kWh`);
  if (offer.inverter_name) infoItem(rightX, ryRef, 'Falownik', offer.inverter_name);

  y += 68;

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
        fontSize: 8,
        cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
        textColor: C.text,
        lineColor: C.border,
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: C.dark,
        textColor: C.white,
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: { top: 4, right: 4, bottom: 4, left: 4 },
      },
      alternateRowStyles: {
        fillColor: C.light,
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 38 },
        2: { cellWidth: 16 },
        3: { cellWidth: 16 },
      },
    });
  }

  drawFooterBar(doc);
}

// ═══════════════════════════════════════════════════════════════
//  PAGE 3 — TERMS, SIGNATURES, FOOTER
// ═══════════════════════════════════════════════════════════════
function drawTerms(doc: jsPDF, offer: PvOffer) {
  // Gold accent strip
  doc.setFillColor(...C.gold);
  doc.rect(0, 0, PW, 1.5, 'F');

  let y = 14;
  y = sectionTitle(doc, 'WARUNKI HANDLOWE I KOLEJNY KROK', y);
  y += 4;

  // Terms cards — two columns
  const colW = (CW - 8) / 2;

  // Card 1: Validity
  doc.setFillColor(...C.light);
  doc.roundedRect(MX, y, colW, 22, 3, 3, 'F');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text(pl('WAZNOSC OFERTY'), MX + 8, y + 8);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.text);
  doc.text(offer.valid_until ? fmtDate(offer.valid_until) : pl('Do potwierdzenia'), MX + 8, y + 16);

  // Card 2: Timeline
  doc.setFillColor(...C.light);
  doc.roundedRect(MX + colW + 8, y, colW, 22, 3, 3, 'F');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text(pl('CZAS REALIZACJI'), MX + colW + 16, y + 8);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.text);
  doc.text(pl('Do ustalenia po akceptacji'), MX + colW + 16, y + 16);

  y += 32;

  // Next step
  doc.setFillColor(...C.light);
  doc.roundedRect(MX, y, CW, 20, 3, 3, 'F');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text(pl('KOLEJNY KROK'), MX + 8, y + 8);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.text);
  doc.text(pl('Potwierdzenie zakresu, dostepnosci komponentow i terminu montazu.'), MX + 8, y + 15);

  y += 28;

  // ─── Offer note ────────────────────────────────────
  if (offer.offer_note) {
    y = sectionTitle(doc, 'UWAGI', y);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.text);
    const noteLines = doc.splitTextToSize(pl(offer.offer_note), CW);
    doc.text(noteLines, MX, y);
    y += noteLines.length * 4 + 8;
  }

  // ─── Signatures ────────────────────────────────────
  y = Math.max(y + 10, 180);
  subtleLine(doc, y);
  y += 6;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text(pl('Miejsce na podpisy'), PW / 2, y, { align: 'center' });
  y += 8;

  const sigW = CW / 2 - 14;
  const sigLx = MX + 4;
  const sigRx = PW - MX - sigW - 4;

  // Signature boxes
  doc.setFillColor(...C.light);
  doc.roundedRect(sigLx, y, sigW, 30, 3, 3, 'F');
  doc.roundedRect(sigRx, y, sigW, 30, 3, 3, 'F');

  // Sig lines inside boxes
  doc.setDrawColor(...C.muted);
  doc.setLineWidth(0.3);
  doc.line(sigLx + 10, y + 20, sigLx + sigW - 10, y + 20);
  doc.line(sigRx + 10, y + 20, sigRx + sigW - 10, y + 20);

  doc.setFontSize(7);
  doc.setTextColor(...C.muted);
  doc.text(pl('Podpis handlowca'), sigLx + sigW / 2, y + 26, { align: 'center' });
  doc.text(pl('Podpis klienta'), sigRx + sigW / 2, y + 26, { align: 'center' });

  // ─── Dark footer ───────────────────────────────────
  const footY = PH - 28;
  doc.setFillColor(...C.dark);
  doc.rect(0, footY, PW, 28, 'F');
  // Gold accent
  doc.setFillColor(...C.gold);
  doc.rect(0, footY, PW, 1, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text('METICAL Sp. z o.o.', PW / 2, footY + 10, { align: 'center' });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 160, 185);
  const disc = pl('Oferta ma charakter informacyjny i wymaga potwierdzenia dostepnosci komponentow oraz warunkow montazu po wizji lokalnej lub analizie technicznej.');
  const dLines = doc.splitTextToSize(disc, CW - 20);
  doc.text(dLines, PW / 2, footY + 17, { align: 'center' });
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
