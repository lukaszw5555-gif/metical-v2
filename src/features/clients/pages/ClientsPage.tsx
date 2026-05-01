import { useState, useEffect, useCallback, useMemo } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { getClients, createClient } from '@/features/clients/services/clientService';
import type { Client } from '@/features/clients/services/clientService';
import { getActiveProfiles } from '@/lib/services/profilesService';
import ClientCard from '@/features/clients/components/ClientCard';
import ClientFormModal from '@/features/clients/components/ClientFormModal';
import type { ClientFormData } from '@/features/clients/components/ClientFormModal';
import type { UserProfile } from '@/types/database';
import { Users, Plus, Loader2, AlertCircle, Search } from 'lucide-react';

export default function ClientsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [clients, setClients] = useState<Client[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'manual' | 'lead'>('all');

  const load = useCallback(async () => {
    try {
      setError(null);
      const [cl, pr] = await Promise.all([getClients(), getActiveProfiles()]);
      setClients(cl); setProfiles(pr);
    } catch (e) { setError(e instanceof Error ? e.message : 'Błąd'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let result = clients;
    if (filter === 'manual') result = result.filter(c => !c.created_from_lead_id);
    else if (filter === 'lead') result = result.filter(c => !!c.created_from_lead_id);

    if (!search.trim()) return result;
    const q = search.toLowerCase();
    return result.filter(c =>
      c.full_name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.city && c.city.toLowerCase().includes(q))
    );
  }, [clients, search, filter]);

  const handleCreate = async (d: ClientFormData) => {
    await createClient({
      full_name: d.full_name, phone: d.phone || null, email: d.email || null,
      city: d.city || null, address: d.address || null, source: d.source || null,
      assigned_to: d.assigned_to || null, notes: d.notes || null,
    }, userId);
    setShowForm(false);
    await load();
  };

  return (
    <>
      <PageHeader title="Klienci" />
      <div className="px-4 py-4 mx-auto max-w-lg pb-24">
        {/* Search */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj po nazwisku, telefonie, email, mieście..."
            className="w-full pl-9 pr-4 py-2.5 border border-surface-200 rounded-xl text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 hide-scrollbar">
          <button onClick={() => setFilter('all')}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === 'all' ? 'bg-primary-600 text-white' : 'bg-surface-100 text-muted-600 hover:bg-surface-200'}`}>
            Wszyscy
          </button>
          <button onClick={() => setFilter('manual')}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === 'manual' ? 'bg-primary-600 text-white' : 'bg-surface-100 text-muted-600 hover:bg-surface-200'}`}>
            Ręcznie dodani
          </button>
          <button onClick={() => setFilter('lead')}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === 'lead' ? 'bg-primary-600 text-white' : 'bg-surface-100 text-muted-600 hover:bg-surface-200'}`}>
            Z leadów
          </button>
        </div>

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
          <div className="space-y-2">
            {filtered.map(c => <ClientCard key={c.id} client={c} profiles={profiles} />)}
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="mt-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
              <Users size={28} className="text-primary-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Brak klientów</h2>
            <p className="text-sm text-muted-500 max-w-xs mb-6">
              {search ? 'Brak wyników.' : 'Dodaj pierwszego klienta.'}
            </p>
          </div>
        )}
      </div>

      {!loading && (
        <button onClick={() => setShowForm(true)} aria-label="Nowy klient"
          className="fixed right-4 bottom-20 z-40 w-14 h-14 bg-primary-600 text-white rounded-2xl shadow-lg hover:bg-primary-700 active:scale-95 transition-all flex items-center justify-center"
          style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <Plus size={24} />
        </button>
      )}

      {showForm && <ClientFormModal onSubmit={handleCreate} onClose={() => setShowForm(false)} profiles={profiles} />}
    </>
  );
}
