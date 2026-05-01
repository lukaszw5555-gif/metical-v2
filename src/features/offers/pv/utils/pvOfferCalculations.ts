import type { PvOfferItemDraft } from '../types/pvOfferTypes';

// ─── Line-level calculations ─────────────────────────────

export function lineNetValue(item: PvOfferItemDraft): number {
  return item.quantity * item.selling_price;
}

export function linePurchaseValue(item: PvOfferItemDraft): number {
  return item.quantity * item.purchase_price;
}

export function lineVatValue(item: PvOfferItemDraft): number {
  return lineNetValue(item) * item.vat_rate / 100;
}

export function lineGrossValue(item: PvOfferItemDraft): number {
  return lineNetValue(item) + lineVatValue(item);
}

export function lineMarginValue(item: PvOfferItemDraft): number {
  return (item.selling_price - item.purchase_price) * item.quantity;
}

// ─── Total calculations ─────────────────────────────────

export function totalNet(items: PvOfferItemDraft[]): number {
  return items.reduce((sum, i) => sum + lineNetValue(i), 0);
}

export function totalVat(items: PvOfferItemDraft[]): number {
  return items.reduce((sum, i) => sum + lineVatValue(i), 0);
}

export function totalGross(items: PvOfferItemDraft[]): number {
  return items.reduce((sum, i) => sum + lineGrossValue(i), 0);
}

export function totalPurchase(items: PvOfferItemDraft[]): number {
  return items.reduce((sum, i) => sum + linePurchaseValue(i), 0);
}

export function totalMargin(items: PvOfferItemDraft[]): number {
  return items.reduce((sum, i) => sum + lineMarginValue(i), 0);
}

export function totalMarginPercent(items: PvOfferItemDraft[]): number {
  const net = totalNet(items);
  if (net === 0) return 0;
  return (totalMargin(items) / net) * 100;
}

// ─── Technical aggregations ──────────────────────────────

export function installationPowerKWp(items: PvOfferItemDraft[]): number {
  return items
    .filter(i => i.category === 'Moduły fotowoltaiczne' && i.power_w != null && i.power_w > 0)
    .reduce((sum, i) => sum + (i.power_w! * i.quantity) / 1000, 0);
}

export function storageCapacityKWh(items: PvOfferItemDraft[]): number {
  return items
    .filter(i => i.category === 'Magazyny energii' && i.capacity_kwh != null && i.capacity_kwh > 0)
    .reduce((sum, i) => sum + i.capacity_kwh! * i.quantity, 0);
}

export function panelCountFromItems(items: PvOfferItemDraft[]): number {
  return items
    .filter(i => i.category === 'Moduły fotowoltaiczne')
    .reduce((sum, i) => sum + i.quantity, 0);
}

export function uniformPanelPowerW(items: PvOfferItemDraft[]): number | null {
  const panels = items.filter(i => i.category === 'Moduły fotowoltaiczne' && i.power_w != null);
  if (panels.length === 0) return null;
  const first = panels[0].power_w!;
  return panels.every(p => p.power_w === first) ? first : null;
}

// ─── Currency formatting ─────────────────────────────────

export function fmtPln(v: number): string {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(v);
}
