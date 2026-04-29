import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { getInvestments, createInvestment } from '@/features/investments/services/investmentsService';
import InvestmentCard from '@/features/investments/components/InvestmentCard';
import InvestmentFormModal from '@/features/investments/components/InvestmentFormModal';
import type { InvestmentFormData } from '@/features/investments/components/InvestmentFormModal';
import type { Investment, InvestmentStatus } from '@/types/database';
import { Building2, Plus, Loader2, AlertCircle } from 'lucide-react';

type InvFilter = 'aktywne' | 'czeka' | 'planowanie' | 'realizacja' | 'zakonczone';

const FILTERS: { key: InvFilter; label: string }[] = [
  { key: 'aktywne', label: 'Aktywne' },
  { key: 'czeka', label: 'Czeka na wpłatę' },
  { key: 'planowanie', label: 'W planowaniu' },
  { key: 'realizacja', label: 'W realizacji' },
  { key: 'zakonczone', label: 'Zakończone' },
];

const STATUS_MAP: Record<InvFilter, InvestmentStatus | null> = {
  aktywne: null, czeka: 'czeka_na_wplate', planowanie: 'w_planowaniu',
  realizacja: 'w_realizacji', zakonczone: 'zakonczona',
};

export default function InvestmentsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<InvFilter>('aktywne');
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try { setError(null); setInvestments(await getInvestments()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Błąd'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = investments.filter((i) =>
    filter === 'aktywne' ? i.status !== 'zakonczona' : i.status === STATUS_MAP[filter]
  );

  const handleCreate = async (d: InvestmentFormData) => {
    await createInvestment({
      name: d.name, client_name: d.client_name,
      client_phone: d.client_phone || undefined, client_email: d.client_email || undefined,
      investment_address: d.investment_address || undefined, investment_type: d.investment_type,
      status: d.status, deposit_paid: d.deposit_paid, components_note: d.components_note || undefined,
    }, userId);
    setShowForm(false);
    await load();
  };

  return (
    <>
      <PageHeader title="Inwestycje" />
      <div className="px-4 py-4 mx-auto max-w-lg">
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === f.key ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white text-muted-600 hover:bg-primary-50 hover:text-primary-600 border border-surface-200'
              }`}>{f.label}</button>
          ))}
        </div>

        {loading && (
          <div className="mt-16 flex flex-col items-center gap-2">
            <Loader2 size={28} className="animate-spin text-primary-500" />
            <p className="text-sm text-muted-500">Ładowanie...</p>
          </div>
        )}

        {error && !loading && (
          <div className="mt-6 flex items-start gap-2 p-4 bg-red-50 border border-red-100 rounded-xl">
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((inv) => <InvestmentCard key={inv.id} investment={inv} />)}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="mt-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
              <Building2 size={28} className="text-primary-500" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Brak inwestycji</h2>
            <p className="text-sm text-muted-500 max-w-xs mb-6">
              {filter === 'aktywne' ? 'Nie masz aktywnych inwestycji.' : 'Brak inwestycji z tym statusem.'}
            </p>
            {filter === 'aktywne' && (
              <button onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 active:scale-[0.98] transition-all shadow-sm">
                <Plus size={18} />Nowa inwestycja
              </button>
            )}
          </div>
        )}
      </div>

      {!loading && (
        <button onClick={() => setShowForm(true)} aria-label="Nowa inwestycja"
          className="fixed right-4 bottom-20 z-40 w-14 h-14 bg-primary-600 text-white rounded-2xl shadow-lg hover:bg-primary-700 active:scale-95 transition-all flex items-center justify-center"
          style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <Plus size={24} />
        </button>
      )}

      {showForm && <InvestmentFormModal onSubmit={handleCreate} onClose={() => setShowForm(false)} />}
    </>
  );
}
