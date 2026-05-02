import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PvOffer, PvOfferItem } from '../types/pvOfferTypes';

// ─── Polish transliteration fallback ─────────────────────────
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
const CW = PW - MX * 2;

// ─── Helpers ─────────────────────────────────────────────────
async function loadImageAsDataUrl(src: string): Promise<string | null> {
  try {
    const response = await fetch(src);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error(`[PDF] Failed to load image: ${src}`, err);
    return null;
  }
}

function getImageFormat(dataUrl: string): 'PNG' | 'JPEG' {
  if (dataUrl.startsWith('data:image/png')) return 'PNG';
  return 'JPEG';
}

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

function goldLine(doc: jsPDF, y: number, x1 = MX, x2 = PW - MX) {
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.3);
  doc.line(x1, y, x2, y);
}

function sectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text(pl(title), MX, y);
  goldLine(doc, y + 1.5);
  return y + 6;
}

// ═══════════════════════════════════════════════════════════════
//  MAIN GENERATOR
// ═══════════════════════════════════════════════════════════════
export async function generatePvOfferPdfProgrammatic(
  offer: PvOffer,
  items: PvOfferItem[]
): Promise<jsPDF> {
  // Load assets
  const [logoDataUrl, heroDataUrl] = await Promise.all([
    loadImageAsDataUrl('/metical-logo-light.png'),
    loadImageAsDataUrl('/pv-offer-hero.png'),
  ]);

  const doc = new jsPDF('p', 'mm', 'a4');

  // ─── 1. COMPACT HEADER (35mm) ───────────────────
  const headH = 35;
  doc.setFillColor(...C.dark);
  doc.rect(0, 0, PW, headH, 'F');
  doc.setFillColor(...C.gold);
  doc.rect(0, 0, PW, 1, 'F');

  // Hero Image (right side)
  if (heroDataUrl) {
    const format = getImageFormat(heroDataUrl);
    const heroX = 118;
    const heroW = 92;
    const heroH = headH - 1;
    doc.addImage(heroDataUrl, format, heroX, 1, heroW, heroH, undefined, 'FAST');
    
    // Dark overlay (reduced opacity for better visibility)
    // @ts-ignore
    if (typeof (doc as any).GState === 'function') {
      const gState = new (doc as any).GState({ opacity: 0.40 });
      doc.setGState(gState);
      doc.setFillColor(...C.dark);
      doc.rect(heroX, 1, heroW, heroH, 'F');
      doc.setGState(new (doc as any).GState({ opacity: 1 }));
    }
  }

  // Logo
  if (logoDataUrl) {
    const format = getImageFormat(logoDataUrl);
    const logoH = 10;
    const logoW = 42; // Proportional width for METICAL logo
    doc.addImage(logoDataUrl, format, MX, 8, logoW, logoH, undefined, 'FAST');
  } else {
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.gold);
    doc.text('METICAL', MX, 18);
  }

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.goldLight);
  doc.text(pl('OFERTA HANDLOWA'), MX, 25);
  goldLine(doc, 27, MX, MX + 30);

  const typeLabel = pl(OFFER_TYPE_PL[offer.offer_type] || offer.offer_type).toUpperCase();
  doc.setFontSize(6.5);
  doc.setTextColor(...C.gold);
  doc.roundedRect(MX, 30, doc.getTextWidth(typeLabel) + 6, 5, 1, 1, 'S');
  doc.text(typeLabel, MX + 3, 33.5);

  // Meta grid
  doc.setFontSize(7);
  const metaX = PW / 2 + 20;
  let my = 14;
  const metaItem = (label: string, value: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 160, 185);
    doc.text(pl(label), metaX, my);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.white);
    doc.text(pl(value), metaX + 20, my);
    my += 4.5;
  };
  metaItem('Nr oferty', offer.offer_number || '--');
  metaItem('Data', fmtDate(offer.created_at));
  if (offer.valid_until) metaItem('Wazna do', fmtDate(offer.valid_until));
  metaItem('Klient', offer.customer_name);

  // ─── 2. PRICE CARD (y=45, h=30) ──────────────────
  const cardY = 45;
  const cardH = 30;
  doc.setFillColor(...C.darkMid);
  doc.roundedRect(MX, cardY, CW, cardH, 3, 3, 'F');
  doc.setFillColor(...C.gold);
  doc.rect(MX + 20, cardY, CW - 40, 0.6, 'F');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text(pl('CENA KONCOWA BRUTTO'), PW / 2, cardY + 8, { align: 'center' });

  const vatRate = offer.vat_rate || 8;
  let finalGross = offer.price_gross;
  if (!finalGross || finalGross <= 0) {
    const itemsNet = items.reduce((s, i) => s + i.quantity * i.selling_price, 0);
    const markup = offer.sales_markup_value || 0;
    const discount = offer.customer_discount_value || 0;
    const finalNet = Math.max(0, itemsNet + markup - discount);
    finalGross = finalNet * (1 + vatRate / 100);
  }

  doc.setFontSize(20);
  doc.setTextColor(...C.white);
  doc.text(pl(fmtCurrency(finalGross)), PW / 2, cardY + 19, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 175);
  doc.text(pl(`Cena zawiera VAT ${vatRate}%`), PW / 2, cardY + 26, { align: 'center' });

  // ─── 3. INFO CARDS (y=88, h=45) ──────────────────
  const iy = 88;
  const cardH2 = 45;
  const colW = (CW - 4) / 2;
  doc.setFillColor(...C.light);
  doc.roundedRect(MX, iy, colW, cardH2, 2, 2, 'F');
  doc.roundedRect(MX + colW + 4, iy, colW, cardH2, 2, 2, 'F');

  const infoItem = (x: number, yR: { v: number }, label: string, value: string) => {
    doc.setFontSize(5.5);
    doc.setTextColor(...C.muted);
    doc.text(pl(label), x + 5, yR.v);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.text);
    doc.text(pl(value), x + 5, yR.v + 3);
    yR.v += 7;
  };

  let cy = iy + 5;
  doc.setFontSize(7);
  doc.setTextColor(...C.gold);
  doc.text(pl('DANE KLIENTA'), MX + 5, cy);
  cy += 6;
  const cyR = { v: cy };
  infoItem(MX, cyR, 'Klient', offer.customer_name);
  if (offer.customer_phone) infoItem(MX, cyR, 'Telefon', offer.customer_phone);
  if (offer.customer_email) infoItem(MX, cyR, 'E-mail', offer.customer_email);
  if (offer.customer_city) infoItem(MX, cyR, pl('Miejscowosc'), offer.customer_city);

  let ry = iy + 5;
  doc.setFontSize(7);
  doc.setTextColor(...C.gold);
  doc.text(pl('PARAMETRY TECHNICZNE'), MX + colW + 9, ry);
  ry += 6;
  const ryR = { v: ry };
  infoItem(MX + colW + 4, ryR, 'Moc instalacji', `${offer.pv_power_kw} kWp`);
  if (offer.panel_count) infoItem(MX + colW + 4, ryR, 'Liczba paneli', `${offer.panel_count} szt.`);
  if (getStorageKwh(items) > 0) infoItem(MX + colW + 4, ryR, 'Magazyn energii', `${getStorageKwh(items).toFixed(1)} kWh`);
  if (offer.inverter_name) infoItem(MX + colW + 4, ryR, 'Falownik', offer.inverter_name);

  // ─── 4. SCOPE TABLE (start y=148) ───────────────
  let tableY = 148;
  tableY = sectionTitle(doc, 'ZAKRES DOSTAWY', tableY);

  autoTable(doc, {
    startY: tableY,
    margin: { left: MX, right: MX, bottom: 30 },
    head: [[pl('Element / zakres'), pl('Producent'), { content: pl('Ilosc'), styles: { halign: 'right' } }, 'J.m.']],
    body: items.map(i => [pl(i.trade_name), pl(i.manufacturer || '--'), { content: String(i.quantity), styles: { halign: 'right' } }, pl(i.unit)]),
    styles: { fontSize: 7, cellPadding: 2, textColor: C.text, lineColor: C.border, lineWidth: 0.1 },
    headStyles: { fillColor: C.dark, textColor: C.white, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: C.light },
    columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 35 }, 2: { cellWidth: 10 }, 3: { cellWidth: 10 } },
  });

  let fy = (doc as any).lastAutoTable.finalY;

  // New page logic
  if (fy > 220) {
    doc.addPage();
    fy = 14;
    doc.setFillColor(...C.gold);
    doc.rect(0, 0, PW, 1, 'F');
  } else {
    fy += 8;
  }

  // ─── 5. TERMS (Compact) ──────────────────────────
  fy = sectionTitle(doc, 'WARUNKI HANDLOWE', fy);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.text);
  
  const terms = [
    { l: 'WAZNOSC OFERTY:', v: offer.valid_until ? fmtDate(offer.valid_until) : pl('Do potwierdzenia') },
    { l: 'CZAS REALIZACJI:', v: pl('Do ustalenia po akceptacji') },
    { l: 'KOLEJNY KROK:', v: pl('Potwierdzenie zakresu i terminu montazu.') }
  ];

  terms.forEach(t => {
    doc.setFont('helvetica', 'bold');
    doc.text(pl(t.l), MX, fy);
    doc.setFont('helvetica', 'normal');
    doc.text(pl(t.v), MX + 35, fy);
    fy += 5;
  });

  if (offer.offer_note) {
    fy += 2;
    doc.setFont('helvetica', 'bold');
    doc.text(pl('UWAGI:'), MX, fy);
    const nl = doc.splitTextToSize(pl(offer.offer_note), CW - 35);
    doc.setFont('helvetica', 'normal');
    doc.text(nl, MX + 35, fy);
    fy += nl.length * 4 + 4;
  }

  // ─── 6. SIGNATURES (Hard Compact) ────────────────
  fy = Math.max(fy + 4, 235);
  doc.setDrawColor(...C.muted);
  doc.setLineWidth(0.2);
  const sw = (CW - 20) / 2;
  doc.line(MX + 5, fy + 12, MX + 5 + sw, fy + 12);
  doc.line(PW - MX - 5 - sw, fy + 12, PW - MX - 5, fy + 12);
  
  doc.setFontSize(6);
  doc.setTextColor(...C.muted);
  doc.text(pl('Podpis handlowca'), MX + 5 + sw/2, fy + 16, { align: 'center' });
  doc.text(pl('Podpis klienta'), PW - MX - 5 - sw/2, fy + 16, { align: 'center' });

  // ─── 7. FINAL FOOTER ─────────────────────────────
  const footY = PH - 20;
  doc.setFillColor(...C.dark);
  doc.rect(0, footY, PW, 20, 'F');
  doc.setFillColor(...C.gold);
  doc.rect(0, footY, PW, 0.6, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.gold);
  doc.text('METICAL Sp. z o.o.', PW / 2, footY + 6, { align: 'center' });
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 175);
  const disc = pl('Oferta ma charakter informacyjny i wymaga potwierdzenia dostepnosci komponentow oraz warunkow montazu.');
  doc.text(disc, PW / 2, footY + 12, { align: 'center' });

  return doc;
}
