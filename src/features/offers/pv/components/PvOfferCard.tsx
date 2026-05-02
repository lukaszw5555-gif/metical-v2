import { useNavigate } from 'react-router-dom';
import type { PvOffer } from '../types/pvOfferTypes';
import { PV_OFFER_STATUS_LABELS, PV_OFFER_STATUS_COLORS, PV_OFFER_TYPE_LABELS, PV_OFFER_TYPE_COLORS } from '../types/pvOfferTypes';
import { Sun, User, Zap, ExternalLink } from 'lucide-react';

interface PvOfferCardProps {
  offer: PvOffer;
}

export default function PvOfferCard({ offer }: PvOfferCardProps) {
  const navigate = useNavigate();
  const sc = PV_OFFER_STATUS_COLORS[offer.status];

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });

  const fmtCurrency = (v: number) =>
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(v);

  return (
    <div
      onClick={() => navigate(`/sales/offers/pv/${offer.id}`)}
      className="group card p-4 cursor-pointer hover:border-primary-200 hover:shadow-md transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900 group-hover:text-primary-700 truncate">
            {offer.offer_number || 'Brak numeru'}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <User size={11} className="text-muted-400 shrink-0" />
            <p className="text-xs text-muted-600 truncate">{offer.customer_name}</p>
          </div>
        </div>
        <span
          className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
          style={{ backgroundColor: sc + '18', color: sc }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sc }} />
          {PV_OFFER_STATUS_LABELS[offer.status]}
        </span>
      </div>

      {/* Details */}
      <div className="flex items-center gap-3 text-xs text-muted-500 flex-wrap mb-2">
        <span className="inline-flex items-center gap-1">
          <Sun size={11} className="text-amber-500" />
          {offer.pv_power_kw} kWp
        </span>
        <span className="inline-flex items-center gap-1">
          <Zap size={11} className="text-primary-500" />
          {fmtCurrency(offer.price_gross)}
        </span>
        <span className="text-muted-400">{fmtDate(offer.created_at)}</span>
      </div>

      {/* Source tags + type badge */}
      <div className="flex items-center gap-2 flex-wrap">
        {offer.offer_type && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold"
            style={{ backgroundColor: PV_OFFER_TYPE_COLORS[offer.offer_type] + '14', color: PV_OFFER_TYPE_COLORS[offer.offer_type] }}>
            {PV_OFFER_TYPE_LABELS[offer.offer_type]}
          </span>
        )}
        {offer.lead_id && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[10px] font-medium">
            <ExternalLink size={9} />Lead
          </span>
        )}
        {offer.client_id && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-50 text-green-600 text-[10px] font-medium">
            <ExternalLink size={9} />Klient
          </span>
        )}
      </div>
    </div>
  );
}
