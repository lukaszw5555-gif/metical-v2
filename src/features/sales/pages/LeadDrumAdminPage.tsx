import { useState, useEffect, useCallback, useMemo } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { getAllLeadDrumLeads, updateLeadQualification, assignLeadToUser, getAssignableUsers } from '@/features/sales/services/leadDrumService';
import type { SalesLead, UserProfile, LeadQualificationStatus, LeadQuality, LeadSalesStatus, LeadSourceType, LeadInvestmentType } from '@/types/database';
import {
  QUALIFICATION_STATUS_LABELS, QUALIFICATION_STATUS_COLORS, QUALIFICATION_STATUSES,
  LEAD_QUALITY_LABELS, LEAD_QUALITY_COLORS, LEAD_QUALITIES,
  SALES_STATUS_LABELS, SALES_STATUS_COLORS,
  LEAD_SOURCE_TYPE_LABELS, LEAD_SOURCE_TYPES,
  LEAD_INVESTMENT_TYPE_LABELS, LEAD_INVESTMENT_TYPES,
  LEAD_SOURCE_LABELS,
} from '@/lib/constants';
import { Loader2, AlertCircle, Search, X, ChevronDown, ChevronUp, Users, Inbox, ShieldAlert, UserCheck, Ban, Eye } from 'lucide-react';
import LeadDrumDetailDrawer from '@/features/sales/components/LeadDrumDetailDrawer';

// ─── Helpers ─────────────────────────────────────────────

function fb(a: string | null | undefined, b: string | null | undefined): string {
  return a || b || '—';
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' });
}


// ─── Types ───────────────────────────────────────────────

type Filters = {
  search: string;
  sourceType: string;
  investmentType: string;
  qualStatus: string;
  quality: string;
  assignedFilter: string; // 'all' | 'unassigned' | 'assigned' | userId
  salesStatus: string;
  dateFrom: string;
  dateTo: string;
};

const defaultFilters: Filters = {
  search: '', sourceType: 'all', investmentType: 'all', qualStatus: 'all',
  quality: 'all', assignedFilter: 'all', salesStatus: 'all', dateFrom: '', dateTo: '',
};

// ─── Component ───────────────────────────────────────────

export default function LeadDrumAdminPage() {
  const { user, profile: authProfile } = useAuth();
  const userId = user?.id ?? '';

  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLead, setSelectedLead] = useState<SalesLead | null>(null);

  // Access guard
  const isAdminOrAdm = authProfile?.role === 'admin' || authProfile?.role === 'administracja';

  const load = useCallback(async () => {
    try {
      setError(null);
      const [ld, pr] = await Promise.all([getAllLeadDrumLeads(), getAssignableUsers()]);
      setLeads(ld); setProfiles(pr);
    } catch (e) { setError(e instanceof Error ? e.message : 'Błąd'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ─── Filtering (client-side) ───────────────────────────

  const filtered = useMemo(() => {
    let r = leads;
    const f = filters;
    if (f.sourceType !== 'all') r = r.filter(l => (l.source_type || l.source) === f.sourceType);
    if (f.investmentType !== 'all') r = r.filter(l => (l.investment_type || l.service_type) === f.investmentType);
    if (f.qualStatus !== 'all') r = r.filter(l => l.qualification_status === f.qualStatus);
    if (f.quality !== 'all') r = r.filter(l => l.lead_quality === f.quality);
    if (f.salesStatus !== 'all') r = r.filter(l => (l.sales_status || l.status) === f.salesStatus);
    if (f.assignedFilter === 'unassigned') r = r.filter(l => !l.assigned_user_id && !l.primary_assigned_to);
    else if (f.assignedFilter === 'assigned') r = r.filter(l => l.assigned_user_id || l.primary_assigned_to);
    else if (f.assignedFilter !== 'all') r = r.filter(l => l.assigned_user_id === f.assignedFilter || l.primary_assigned_to === f.assignedFilter);
    if (f.dateFrom) r = r.filter(l => l.created_at >= f.dateFrom);
    if (f.dateTo) r = r.filter(l => l.created_at <= f.dateTo + 'T23:59:59');
    if (f.search.trim()) {
      const q = f.search.toLowerCase();
      r = r.filter(l =>
        (l.contact_name || l.full_name || '').toLowerCase().includes(q) ||
        (l.contact_phone || l.phone || '').includes(q) ||
        (l.contact_email || l.email || '').toLowerCase().includes(q) ||
        (l.location_text || l.city || '').toLowerCase().includes(q) ||
        (l.postal_code || '').includes(q)
      );
    }
    return r;
  }, [leads, filters]);

  // ─── KPI counters ─────────────────────────────────────

  const kpi = useMemo(() => ({
    total: leads.length,
    newLeads: leads.filter(l => l.qualification_status === 'new').length,
    unassigned: leads.filter(l => !l.assigned_user_id && !l.primary_assigned_to).length,
    assigned: leads.filter(l => l.assigned_user_id || l.primary_assigned_to).length,
    spam: leads.filter(l => l.qualification_status === 'spam' || l.qualification_status === 'useless').length,
  }), [leads]);

  // ─── Actions ──────────────────────────────────────────

  const handleQualStatus = async (leadId: string, qs: LeadQualificationStatus) => {
    try {
      const updated = await updateLeadQualification(leadId, { qualification_status: qs });
      setLeads(prev => prev.map(l => l.id === leadId ? updated : l));
      if (selectedLead?.id === leadId) setSelectedLead(updated);
    } catch (e) { setError(e instanceof Error ? e.message : 'Błąd aktualizacji'); }
  };

  const handleQuality = async (leadId: string, q: LeadQuality | null) => {
    try {
      const updated = await updateLeadQualification(leadId, { lead_quality: q });
      setLeads(prev => prev.map(l => l.id === leadId ? updated : l));
      if (selectedLead?.id === leadId) setSelectedLead(updated);
    } catch (e) { setError(e instanceof Error ? e.message : 'Błąd aktualizacji'); }
  };

  const handleAssign = async (leadId: string, targetUserId: string | null) => {
    try {
      const updated = await assignLeadToUser(leadId, targetUserId, userId);
      setLeads(prev => prev.map(l => l.id === leadId ? updated : l));
      if (selectedLead?.id === leadId) setSelectedLead(updated);
    } catch (e) { setError(e instanceof Error ? e.message : 'Błąd przypisania'); }
  };

  // ─── Access denied ────────────────────────────────────

  if (!loading && !isAdminOrAdm) {
    return (
      <>
        <PageHeader title="Bęben leadów" showBack />
        <div className="px-4 py-16 mx-auto max-w-lg text-center">
          <ShieldAlert size={48} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Brak dostępu</h2>
          <p className="text-sm text-muted-500">Panel bębna leadów jest dostępny tylko dla administratorów.</p>
        </div>
      </>
    );
  }

  const sc = 'shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border border-surface-200 bg-white text-muted-600';

  return (
    <>
      <PageHeader title="Bęben leadów" showBack />
      <div className="px-4 py-4 mx-auto max-w-[1400px] pb-24 md:pb-8">
        {/* Header */}
        <div className="mb-4">
          <p className="text-sm text-muted-500">Roboczy panel administratora do przeglądania, kwalifikacji i przypisywania leadów.</p>
          <span className="inline-block mt-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wider">Wersja robocza MVP</span>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          {[
            { label: 'Wszystkie', count: kpi.total, icon: <Inbox size={18} />, color: '#6366f1' },
            { label: 'Nowe', count: kpi.newLeads, icon: <Inbox size={18} />, color: '#8b5cf6' },
            { label: 'Nieprzypisane', count: kpi.unassigned, icon: <Users size={18} />, color: '#d97706' },
            { label: 'Przypisane', count: kpi.assigned, icon: <UserCheck size={18} />, color: '#2563eb' },
            { label: 'Spam/Bezwart.', count: kpi.spam, icon: <Ban size={18} />, color: '#9ca3af' },
          ].map(t => (
            <div key={t.label} className="card p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: t.color + '18', color: t.color }}>{t.icon}</div>
              <div><p className="text-xl font-bold text-gray-900">{t.count}</p><p className="text-[10px] text-muted-500 font-medium">{t.label}</p></div>
            </div>
          ))}
        </div>

        {/* Search + filter toggle */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-400" />
            <input type="text" value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })}
              placeholder="Szukaj: imię, telefon, email, lokalizacja, kod…"
              className="w-full pl-9 pr-4 py-2.5 border border-surface-200 rounded-xl text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className="shrink-0 px-3 py-2 rounded-xl border border-surface-200 bg-white text-sm font-medium text-muted-600 hover:bg-surface-50 flex items-center gap-1.5">
            {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Filtry
          </button>
          {JSON.stringify(filters) !== JSON.stringify(defaultFilters) && (
            <button onClick={() => setFilters(defaultFilters)}
              className="shrink-0 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 flex items-center gap-1">
              <X size={14} /> Wyczyść
            </button>
          )}
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="card p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] text-muted-400 mb-1">Źródło</label>
              <select value={filters.sourceType} onChange={e => setFilters({ ...filters, sourceType: e.target.value })} className={sc + ' w-full'}>
                <option value="all">Wszystkie</option>
                {LEAD_SOURCE_TYPES.map(s => <option key={s} value={s}>{LEAD_SOURCE_TYPE_LABELS[s]}</option>)}
                <option value="website">Strona (stare)</option>
                <option value="facebook_ads">Facebook Ads (stare)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-muted-400 mb-1">Typ inwestycji</label>
              <select value={filters.investmentType} onChange={e => setFilters({ ...filters, investmentType: e.target.value })} className={sc + ' w-full'}>
                <option value="all">Wszystkie</option>
                {LEAD_INVESTMENT_TYPES.map(t => <option key={t} value={t}>{LEAD_INVESTMENT_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-muted-400 mb-1">Status kwalifikacji</label>
              <select value={filters.qualStatus} onChange={e => setFilters({ ...filters, qualStatus: e.target.value })} className={sc + ' w-full'}>
                <option value="all">Wszystkie</option>
                {QUALIFICATION_STATUSES.map(s => <option key={s} value={s}>{QUALIFICATION_STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-muted-400 mb-1">Jakość</label>
              <select value={filters.quality} onChange={e => setFilters({ ...filters, quality: e.target.value })} className={sc + ' w-full'}>
                <option value="all">Wszystkie</option>
                {LEAD_QUALITIES.map(q => <option key={q} value={q}>{LEAD_QUALITY_LABELS[q]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-muted-400 mb-1">Przypisanie</label>
              <select value={filters.assignedFilter} onChange={e => setFilters({ ...filters, assignedFilter: e.target.value })} className={sc + ' w-full'}>
                <option value="all">Wszystkie</option>
                <option value="unassigned">Nieprzypisane</option>
                <option value="assigned">Przypisane</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-muted-400 mb-1">Status pracy</label>
              <select value={filters.salesStatus} onChange={e => setFilters({ ...filters, salesStatus: e.target.value })} className={sc + ' w-full'}>
                <option value="all">Wszystkie</option>
                {(['not_started','first_contact_pending','contacted','no_answer','follow_up','meeting_scheduled','offer_needed','offer_sent','won','lost'] as const).map(s =>
                  <option key={s} value={s}>{SALES_STATUS_LABELS[s]}</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-muted-400 mb-1">Data od</label>
              <input type="date" value={filters.dateFrom} onChange={e => setFilters({ ...filters, dateFrom: e.target.value })} className={sc + ' w-full'} />
            </div>
            <div>
              <label className="block text-[11px] text-muted-400 mb-1">Data do</label>
              <input type="date" value={filters.dateTo} onChange={e => setFilters({ ...filters, dateTo: e.target.value })} className={sc + ' w-full'} />
            </div>
          </div>
        )}

        {/* Loading / Error */}
        {loading && (
          <div className="mt-16 flex flex-col items-center gap-2">
            <Loader2 size={28} className="animate-spin text-primary-500" /><p className="text-sm text-muted-500">Ładowanie…</p>
          </div>
        )}
        {error && !loading && (
          <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-100 rounded-xl mb-4">
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" /><p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Table */}
        {!loading && !error && (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200 bg-surface-50">
                  {['Data','Źródło','Typ','Kontakt','Telefon','Lokalizacja','Kwalifikacja','Jakość','Przypisany','Status pracy','Nast. krok',''].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={12} className="px-4 py-12 text-center text-muted-400">Brak leadów spełniających kryteria.</td></tr>
                )}
                {filtered.map(lead => {
                  const qs = lead.qualification_status as LeadQualificationStatus;
                  const qc = QUALIFICATION_STATUS_COLORS[qs] || '#9ca3af';
                  const lq = lead.lead_quality as LeadQuality | null;
                  const ss = (lead.sales_status || lead.status) as string;
                  const ssLabel = SALES_STATUS_LABELS[ss as LeadSalesStatus] || ss || '—';
                  const ssColor = SALES_STATUS_COLORS[ss as LeadSalesStatus] || '#9ca3af';
                  const srcLabel = lead.source_type
                    ? (LEAD_SOURCE_TYPE_LABELS[lead.source_type as LeadSourceType] || lead.source_type)
                    : (LEAD_SOURCE_LABELS[lead.source] || lead.source);
                  const invLabel = lead.investment_type
                    ? (LEAD_INVESTMENT_TYPE_LABELS[lead.investment_type as LeadInvestmentType] || lead.investment_type)
                    : (lead.service_type || '—');

                  return (
                    <tr key={lead.id} className="border-b border-surface-100 hover:bg-surface-50/50 transition-colors">
                      <td className="px-3 py-2 whitespace-nowrap text-muted-500 text-xs">{fmtDate(lead.created_at)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">{srcLabel}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">{invLabel}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-900">{fb(lead.contact_name, lead.full_name)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">
                        <a href={`tel:${fb(lead.contact_phone, lead.phone)}`} className="text-primary-600 hover:underline">{fb(lead.contact_phone, lead.phone)}</a>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-600">
                        {fb(lead.location_text, lead.city)}{lead.postal_code ? ` (${lead.postal_code})` : ''}
                      </td>
                      {/* Qualification status — inline select */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <select value={qs} onChange={e => handleQualStatus(lead.id, e.target.value as LeadQualificationStatus)}
                          className="px-2 py-1 rounded-md text-[11px] font-semibold border-0 cursor-pointer"
                          style={{ backgroundColor: qc + '18', color: qc }}>
                          {QUALIFICATION_STATUSES.map(s => <option key={s} value={s}>{QUALIFICATION_STATUS_LABELS[s]}</option>)}
                        </select>
                      </td>
                      {/* Quality — inline chips */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex gap-0.5">
                          {LEAD_QUALITIES.map(q => (
                            <button key={q} onClick={() => handleQuality(lead.id, lq === q ? null : q)}
                              className="w-6 h-6 rounded text-[10px] font-bold transition-all"
                              style={{
                                backgroundColor: lq === q ? LEAD_QUALITY_COLORS[q] : '#f3f4f6',
                                color: lq === q ? 'white' : '#9ca3af',
                              }}>{q}</button>
                          ))}
                        </div>
                      </td>
                      {/* Assignment — inline select */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <select
                          value={lead.assigned_user_id || lead.primary_assigned_to || ''}
                          onChange={e => handleAssign(lead.id, e.target.value || null)}
                          className="px-2 py-1 rounded-md text-[11px] font-medium border border-surface-200 bg-white cursor-pointer max-w-[140px] truncate">
                          <option value="">— brak —</option>
                          {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
                        </select>
                      </td>
                      {/* Sales status */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
                          style={{ backgroundColor: ssColor + '18', color: ssColor }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ssColor }} />
                          {ssLabel}
                        </span>
                      </td>
                      {/* Next step */}
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-500">{lead.next_step_at ? fmtDate(lead.next_step_at) : '—'}</td>
                      {/* Detail button */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <button onClick={() => setSelectedLead(lead)}
                          className="p-1.5 rounded-lg hover:bg-primary-50 text-muted-400 hover:text-primary-600 transition-colors"
                          title="Szczegóły">
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t border-surface-100 text-xs text-muted-400">
              Wyświetlono {filtered.length} z {leads.length} leadów
            </div>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selectedLead && (
        <LeadDrumDetailDrawer
          lead={selectedLead}
          profiles={profiles}
          onClose={() => setSelectedLead(null)}
          onQualStatus={handleQualStatus}
          onQuality={handleQuality}
          onAssign={handleAssign}
        />
      )}
    </>
  );
}
