import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/layout/PageHeader';
import { getPvOffers } from '../services/pvOfferService';
import PvOfferCard from '../components/PvOfferCard';
import type { PvOffer, PvOfferStatus, PvOfferType } from '../types/pvOfferTypes';
import { PV_OFFER_STATUSES, PV_OFFER_STATUS_LABELS, PV_OFFER_TYPES, PV_OFFER_TYPE_LABELS, PV_OFFER_TYPE_DESCRIPTIONS, PV_OFFER_TYPE_COLORS } from '../types/pvOfferTypes';
import { Sun, Plus, Loader2, AlertCircle, Search, Battery, Zap, FileText } from 'lucide-react';

type StatusFilter = 'all' | PvOfferStatus;

const TYPE_ICONS: Record<PvOfferType, React.ReactNode> = {
  pv: <Sun size={20} />,
  pv_me: <Zap size={20} />,
  me: <Battery size={20} />,
  individual: <FileText size={20} />,
};

export default function PvOffersPage() {
  const navigate = useNavigate();

  const [offers, setOffers] = useState<PvOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await getPvOffers();
      setOffers(data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Błąd'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let result = offers;
    if (statusFilter !== 'all') result = result.filter(o => o.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(o =>
        o.customer_name.toLowerCase().includes(q) ||
        (o.customer_phone && o.customer_phone.includes(q)) ||
        (o.offer_number && o.offer_number.toLowerCase().includes(q))
      );
    }
    return result;
  }, [offers, statusFilter, search]);

  const statusChips: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'Wszystkie' },
    ...PV_OFFER_STATUSES.map(s => ({ key: s as StatusFilter, label: PV_OFFER_STATUS_LABELS[s] })),
  ];

  return (
    <>
      <PageHeader title="Oferty PV" showBack />
      <div className="px-4 py-4 mx-auto max-w-lg md:max-w-5xl pb-24 md:pb-8">

        {/* ─── New Offer Type Tiles ──────────── */}
        <div className="mb-5">
          <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">Utwórz nową ofertę</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {PV_OFFER_TYPES.map(t => {
              const color = PV_OFFER_TYPE_COLORS[t];
              return (
                <button key={t} onClick={() => navigate(`/sales/offers/pv/new?type=${t}`)}
                  className="card p-3 flex flex-col items-center text-center gap-2 hover:shadow-md hover:border-primary-200 active:scale-[0.98] transition-all cursor-pointer">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '18', color }}>
                    {TYPE_ICONS[t]}
                  </div>
                  <p className="text-[11px] font-semibold text-gray-700 leading-tight">{PV_OFFER_TYPE_LABELS[t]}</p>
                  <p className="text-[9px] text-muted-400 leading-tight hidden md:block">{PV_OFFER_TYPE_DESCRIPTIONS[t]}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj po kliencie, telefonie, numerze oferty..."
            className="w-full pl-9 pr-4 py-2.5 border border-surface-200 rounded-xl text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
        </div>

        {/* Status filter */}
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide mb-1">
          {statusChips.map(c => (
            <button key={c.key} onClick={() => setStatusFilter(c.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                statusFilter === c.key ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white text-muted-600 hover:bg-primary-50 border border-surface-200'
              }`}>{c.label}</button>
          ))}
        </div>

        {/* Content */}
        {loading && (
          <div className="mt-16 flex flex-col items-center gap-2">
            <Loader2 size={28} className="animate-spin text-primary-500" />
            <p className="text-sm text-muted-500">Ładowanie...</p>
          </div>
        )}
        {error && !loading && (
          <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-100 rounded-xl">
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map(o => <PvOfferCard key={o.id} offer={o} />)}
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="mt-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
              <Sun size={28} className="text-amber-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Brak ofert PV</h2>
            <p className="text-sm text-muted-500 max-w-xs mb-6">
              {search || statusFilter !== 'all' ? 'Brak wyników dla wybranych filtrów.' : 'Utwórz pierwszą ofertę fotowoltaiczną.'}
            </p>
          </div>
        )}
      </div>

      {/* FAB */}
      {!loading && (
        <button onClick={() => navigate('/sales/offers/pv/new?type=pv')} aria-label="Nowa oferta PV"
          className="fixed right-4 bottom-20 md:bottom-8 md:right-8 z-40 w-14 h-14 bg-primary-600 text-white rounded-2xl shadow-lg hover:bg-primary-700 active:scale-95 transition-all flex items-center justify-center"
          style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <Plus size={24} />
        </button>
      )}
    </>
  );
}
