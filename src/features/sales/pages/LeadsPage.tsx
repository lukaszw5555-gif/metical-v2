import { useState, useEffect, useCallback, useMemo } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { getLeads, createLead } from '@/features/sales/services/salesLeadService';
import { getActiveProfiles } from '@/lib/services/profilesService';
import LeadCard from '@/features/sales/components/LeadCard';
import LeadFormModal from '@/features/sales/components/LeadFormModal';
import type { LeadFormData } from '@/features/sales/components/LeadFormModal';
import type { SalesLead, SalesLeadStatus, UserProfile } from '@/types/database';
import {
  LEAD_STATUSES, LEAD_STATUS_LABELS,
  LEAD_SOURCES, LEAD_SOURCE_LABELS,
} from '@/lib/constants';
import { Users, Plus, Loader2, AlertCircle, Search, Star } from 'lucide-react';

type StatusFilter = 'all' | SalesLeadStatus;

export default function LeadsPage() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [assignedFilter, setAssignedFilter] = useState<string>('all');
  const [favOnly, setFavOnly] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [ld, pr] = await Promise.all([getLeads(), getActiveProfiles()]);
      setLeads(ld); setProfiles(pr);
    } catch (e) { setError(e instanceof Error ? e.message : 'Błąd'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let result = leads;
    if (statusFilter !== 'all') result = result.filter(l => l.status === statusFilter);
    if (sourceFilter !== 'all') result = result.filter(l => l.source === sourceFilter);
    if (assignedFilter !== 'all') result = result.filter(l => l.primary_assigned_to === assignedFilter || l.secondary_assigned_to === assignedFilter);
    if (favOnly) result = result.filter(l => l.is_favorite);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        l.full_name.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.city && l.city.toLowerCase().includes(q))
      );
    }
    return result;
  }, [leads, statusFilter, sourceFilter, assignedFilter, favOnly, search]);

  const handleCreate = async (d: LeadFormData) => {
    await createLead({
      full_name: d.full_name, phone: d.phone,
      email: d.email || null, city: d.city || null,
      source: d.source, service_type: d.service_type || null,
      qualification_note: d.qualification_note || null,
      primary_assigned_to: d.primary_assigned_to || null,
      secondary_assigned_to: d.secondary_assigned_to || null,
      next_follow_up_at: d.next_follow_up_at ? new Date(d.next_follow_up_at).toISOString() : null,
      follow_up_note: d.follow_up_note || null,
    }, userId);
    setShowForm(false);
    await load();
  };

  const statusChips: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'Wszystkie' },
    ...LEAD_STATUSES.map((s) => ({ key: s as StatusFilter, label: LEAD_STATUS_LABELS[s] })),
  ];

  return (
    <>
      <PageHeader title="Leady" showBack />
      <div className="px-4 py-4 mx-auto max-w-lg pb-24">
        {/* Search */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj po nazwisku, telefonie, email, mieście..."
            className="w-full pl-9 pr-4 py-2.5 border border-surface-200 rounded-xl text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
        </div>

        {/* Status chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide mb-1">
          {statusChips.map((c) => (
            <button key={c.key} onClick={() => setStatusFilter(c.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                statusFilter === c.key ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white text-muted-600 hover:bg-primary-50 border border-surface-200'
              }`}>{c.label}</button>
          ))}
        </div>

        {/* Secondary filters */}
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border border-surface-200 bg-white text-muted-600">
            <option value="all">Źródło: wszystkie</option>
            {LEAD_SOURCES.map((s) => <option key={s} value={s}>{LEAD_SOURCE_LABELS[s]}</option>)}
          </select>
          <select value={assignedFilter} onChange={(e) => setAssignedFilter(e.target.value)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border border-surface-200 bg-white text-muted-600">
            <option value="all">Opiekun: wszyscy</option>
            {profiles.filter(p => p.is_active).map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
          </select>
          <button onClick={() => setFavOnly(!favOnly)}
            className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              favOnly ? 'bg-amber-500 text-white' : 'bg-white text-muted-600 border border-surface-200'
            }`}>
            <Star size={11} className={favOnly ? 'fill-white' : ''} />
            Ulubione
          </button>
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
          <div className="space-y-2">
            {filtered.map((l) => <LeadCard key={l.id} lead={l} profiles={profiles} />)}
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="mt-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
              <Users size={28} className="text-primary-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Brak leadów</h2>
            <p className="text-sm text-muted-500 max-w-xs mb-6">
              {search || statusFilter !== 'all' ? 'Brak wyników dla wybranych filtrów.' : 'Dodaj pierwszy lead.'}
            </p>
          </div>
        )}
      </div>

      {!loading && (
        <button onClick={() => setShowForm(true)} aria-label="Nowy lead"
          className="fixed right-4 bottom-20 z-40 w-14 h-14 bg-primary-600 text-white rounded-2xl shadow-lg hover:bg-primary-700 active:scale-95 transition-all flex items-center justify-center"
          style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <Plus size={24} />
        </button>
      )}

      {showForm && <LeadFormModal onSubmit={handleCreate} onClose={() => setShowForm(false)} profiles={profiles} />}
    </>
  );
}
