import type { PvOfferItemDraft } from '../types/pvOfferTypes';
import {
  totalNet, totalVat, totalPurchase, totalMargin, totalMarginPercent,
  installationPowerKWp, storageCapacityKWh,
  finalNetAfterAdjustments, finalGrossAfterAdjustments,
  fmtPln,
} from '../utils/pvOfferCalculations';
import { Sun, Battery, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';

interface Props {
  items: PvOfferItemDraft[];
  canSeeInternalPricing: boolean;
  salesMarkupValue?: number;
  customerDiscountValue?: number;
  offerVatRate?: number;
}

export default function PvOfferSummaryPanel({ items, canSeeInternalPricing, salesMarkupValue = 0, customerDiscountValue = 0, offerVatRate = 8 }: Props) {
  if (items.length === 0) return null;

  const baseNet = totalNet(items);
  const baseVat = totalVat(items);
  const purchase = totalPurchase(items);
  const margin = totalMargin(items);
  const marginPct = totalMarginPercent(items);
  const powerKwp = installationPowerKWp(items);
  const storageKwh = storageCapacityKWh(items);

  const fNet = finalNetAfterAdjustments(baseNet, salesMarkupValue, customerDiscountValue);
  const fGross = finalGrossAfterAdjustments(baseNet, baseVat, salesMarkupValue, customerDiscountValue, offerVatRate);
  const hasAdjustments = salesMarkupValue > 0 || customerDiscountValue > 0;

  return (
    <div className="card p-4 bg-primary-50/30 border-primary-100">
      <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Podsumowanie</p>
      <div className="space-y-2">
        <SumRow label="Pozycje" value={String(items.length)} />
        <SumRow label="Netto pozycji" value={fmtPln(baseNet)} />

        {/* Adjustments */}
        {salesMarkupValue > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-amber-600 inline-flex items-center gap-1"><ArrowUp size={10} />Narzut handlowy</span>
            <span className="font-medium text-amber-700">+ {fmtPln(salesMarkupValue)}</span>
          </div>
        )}
        {customerDiscountValue > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-blue-600 inline-flex items-center gap-1"><ArrowDown size={10} />Rabat klienta</span>
            <span className="font-medium text-blue-700">- {fmtPln(customerDiscountValue)}</span>
          </div>
        )}

        {hasAdjustments && <SumRow label="Finalna netto" value={fmtPln(fNet)} />}

        <SumRow label="VAT" value={fmtPln(fGross - fNet)} />

        <div className="flex items-center justify-between p-2 rounded-lg bg-primary-100/50">
          <span className="text-xs font-bold text-primary-700">Brutto</span>
          <span className="text-sm font-bold text-primary-700">{fmtPln(fGross)}</span>
        </div>

        {/* Internal pricing — admin only */}
        {canSeeInternalPricing && (
          <>
            <div className="border-t border-surface-200 pt-2 mt-2">
              <p className="text-[10px] font-semibold text-muted-400 uppercase mb-1">Dane wewnętrzne</p>
            </div>
            <SumRow label="Koszt zakupu" value={fmtPln(purchase)} />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-500 inline-flex items-center gap-1"><TrendingUp size={11} />Marża</span>
              <span className="text-xs font-semibold text-green-700">{fmtPln(margin)} ({marginPct.toFixed(1)}%)</span>
            </div>
          </>
        )}

        {/* Technical */}
        {powerKwp > 0 && (
          <div className="flex items-center justify-between pt-1 border-t border-surface-200">
            <span className="text-xs text-muted-500 inline-flex items-center gap-1"><Sun size={11} className="text-amber-500" />Moc PV</span>
            <span className="text-xs font-semibold text-gray-900">{powerKwp.toFixed(2)} kWp</span>
          </div>
        )}
        {storageKwh > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-500 inline-flex items-center gap-1"><Battery size={11} className="text-green-500" />Magazyn</span>
            <span className="text-xs font-semibold text-gray-900">{storageKwh.toFixed(1)} kWh</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SumRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-500">{label}</span>
      <span className="text-xs font-medium text-gray-900">{value}</span>
    </div>
  );
}
