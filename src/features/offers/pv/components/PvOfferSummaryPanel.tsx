import type { PvOfferItemDraft } from '../types/pvOfferTypes';
import {
  totalNet, totalVat, totalGross, totalPurchase, totalMargin, totalMarginPercent,
  installationPowerKWp, storageCapacityKWh, fmtPln,
} from '../utils/pvOfferCalculations';
import { Sun, Battery, TrendingUp } from 'lucide-react';

interface Props { items: PvOfferItemDraft[]; }

export default function PvOfferSummaryPanel({ items }: Props) {
  if (items.length === 0) return null;

  const net = totalNet(items);
  const vat = totalVat(items);
  const gross = totalGross(items);
  const purchase = totalPurchase(items);
  const margin = totalMargin(items);
  const marginPct = totalMarginPercent(items);
  const powerKwp = installationPowerKWp(items);
  const storageKwh = storageCapacityKWh(items);

  return (
    <div className="card p-4 bg-primary-50/30 border-primary-100">
      <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Podsumowanie</p>
      <div className="space-y-2">
        <SumRow label="Pozycje" value={String(items.length)} />
        <SumRow label="Netto" value={fmtPln(net)} />
        <SumRow label="VAT" value={fmtPln(vat)} />
        <div className="flex items-center justify-between p-2 rounded-lg bg-primary-100/50">
          <span className="text-xs font-bold text-primary-700">Brutto</span>
          <span className="text-sm font-bold text-primary-700">{fmtPln(gross)}</span>
        </div>
        <SumRow label="Koszt zakupu" value={fmtPln(purchase)} />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-500 inline-flex items-center gap-1"><TrendingUp size={11} />Marża</span>
          <span className="text-xs font-semibold text-green-700">{fmtPln(margin)} ({marginPct.toFixed(1)}%)</span>
        </div>
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
