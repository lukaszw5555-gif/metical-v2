import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { useAuth } from '@/context/AuthContext';
import {
  getPvComponents, createPvComponent, updatePvComponent, togglePvComponentActive,
} from '../services/pvComponentService';
import { createPvComponents } from '../services/pvComponentService';
import { exportComponentsCsv, downloadTemplateCsv, parseCsvFile } from '../services/pvComponentCsv';
import PvComponentFormModal from '../components/PvComponentFormModal';
import type { PvComponent, CreatePvComponentInput } from '../types/pvComponentTypes';
import { PV_COMPONENT_CATEGORIES } from '../types/pvComponentTypes';
import {
  Search, Plus, Loader2, AlertCircle, Package, Download, Upload, FileSpreadsheet,
  Pencil, ToggleLeft, ToggleRight, CheckCircle,
} from 'lucide-react';

type ActiveFilter = 'all' | 'active' | 'inactive';

export default function PvComponentsPage() {
  const { user, profile } = useAuth();
  const userId = user?.id ?? '';
  const isAdmin = profile?.role === 'admin' || profile?.role === 'administracja';

  const [components, setComponents] = useState<PvComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');

  // Form modal
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<PvComponent | null>(null);

  // Import
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number; updated: number; skipped: number; errors: string[] } | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await getPvComponents();
      setComponents(data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Błąd'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ─── Filtering ─────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = components;
    if (categoryFilter !== 'all') result = result.filter(c => c.category === categoryFilter);
    if (activeFilter === 'active') result = result.filter(c => c.active);
    else if (activeFilter === 'inactive') result = result.filter(c => !c.active);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.trade_name.toLowerCase().includes(q) ||
        (c.manufacturer && c.manufacturer.toLowerCase().includes(q)) ||
        (c.model && c.model.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q))
      );
    }
    return result;
  }, [components, categoryFilter, activeFilter, search]);

  // ─── CRUD handlers ─────────────────────────────────────

  const handleCreate = async (data: CreatePvComponentInput) => {
    await createPvComponent(data, userId);
    setShowForm(false);
    setEditTarget(null);
    await load();
  };

  const handleUpdate = async (data: CreatePvComponentInput) => {
    if (!editTarget) return;
    await updatePvComponent(editTarget.id, { ...data, updated_by: userId });
    setShowForm(false);
    setEditTarget(null);
    await load();
  };

  const handleToggle = async (comp: PvComponent) => {
    try {
      await togglePvComponentActive(comp.id, !comp.active, userId);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Błąd'); }
  };

  const openEdit = (comp: PvComponent) => {
    setEditTarget(comp);
    setShowForm(true);
  };

  const openNew = () => {
    setEditTarget(null);
    setShowForm(true);
  };

  // ─── CSV Export ─────────────────────────────────────────

  const handleExport = () => exportComponentsCsv(filtered);

  // ─── CSV Import ─────────────────────────────────────────

  const handleImportClick = () => fileRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset for re-select

    setImporting(true);
    setImportResult(null);
    setError(null);

    try {
      const text = await file.text();
      const existingIds = new Set(components.map(c => c.id));
      const parsed = parseCsvFile(text, existingIds);

      let added = 0;
      let updated = 0;

      // Insert new rows
      if (parsed.newRows.length > 0) {
        const withUser = parsed.newRows.map(r => ({ ...r, created_by: userId }));
        await createPvComponents(withUser);
        added = parsed.newRows.length;
      }

      // Update existing rows
      for (const u of parsed.updateRows) {
        await updatePvComponent(u.id, { ...u.data, updated_by: userId });
        updated++;
      }

      setImportResult({ added, updated, skipped: parsed.skipped, errors: parsed.errors });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd importu');
    } finally {
      setImporting(false);
    }
  };

  // ─── Currency formatting ───────────────────────────────

  const fmtPln = (v: number) =>
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(v);

  return (
    <>
      <PageHeader title="Katalog komponentów PV" showBack />
      <div className="px-4 py-4 mx-auto max-w-lg md:max-w-6xl pb-24 md:pb-8">

        {/* ─── Top Actions ────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {isAdmin && (
            <>
              <button onClick={openNew}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary-600 text-white text-xs font-semibold rounded-xl hover:bg-primary-700 transition-colors">
                <Plus size={14} />Nowy komponent
              </button>
              <button onClick={handleImportClick} disabled={importing}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-60">
                {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}Import CSV
              </button>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            </>
          )}
          <button onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-100 text-muted-700 text-xs font-semibold rounded-xl hover:bg-surface-200 transition-colors">
            <Download size={14} />Eksport CSV
          </button>
          <button onClick={downloadTemplateCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-100 text-muted-700 text-xs font-semibold rounded-xl hover:bg-surface-200 transition-colors">
            <FileSpreadsheet size={14} />Pobierz szablon
          </button>
        </div>

        {/* ─── Import Result ─────────────────── */}
        {importResult && (
          <div className="mb-4 p-4 bg-green-50 border border-green-100 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={16} className="text-green-600" />
              <p className="text-sm font-semibold text-green-800">Import zakończony</p>
            </div>
            <div className="text-xs text-green-700 space-y-0.5">
              <p>Dodano: {importResult.added}</p>
              <p>Zaktualizowano: {importResult.updated}</p>
              {importResult.skipped > 0 && <p>Pominięto: {importResult.skipped}</p>}
            </div>
            {importResult.errors.length > 0 && (
              <div className="mt-2 text-xs text-red-600 space-y-0.5">
                <p className="font-semibold">Błędy:</p>
                {importResult.errors.slice(0, 20).map((err, i) => <p key={i}>• {err}</p>)}
                {importResult.errors.length > 20 && <p>... i {importResult.errors.length - 20} więcej</p>}
              </div>
            )}
          </div>
        )}

        {/* ─── Search ────────────────────────── */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Szukaj po nazwie, producencie, modelu..."
            className="w-full pl-9 pr-4 py-2.5 border border-surface-200 rounded-xl text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
        </div>

        {/* ─── Filters ───────────────────────── */}
        <div className="flex flex-wrap gap-2 mb-3">
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border border-surface-200 bg-white text-muted-600">
            <option value="all">Kategoria: wszystkie</option>
            {PV_COMPONENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {isAdmin && (
            <select value={activeFilter} onChange={e => setActiveFilter(e.target.value as ActiveFilter)}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border border-surface-200 bg-white text-muted-600">
              <option value="all">Status: wszystkie</option>
              <option value="active">Aktywne</option>
              <option value="inactive">Nieaktywne</option>
            </select>
          )}
          <span className="px-3 py-1.5 text-xs text-muted-400">
            {filtered.length} z {components.length}
          </span>
        </div>

        {/* ─── Error ─────────────────────────── */}
        {error && (
          <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-100 rounded-xl mb-3">
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* ─── Loading ───────────────────────── */}
        {loading && (
          <div className="mt-16 flex flex-col items-center gap-2">
            <Loader2 size={28} className="animate-spin text-primary-500" />
            <p className="text-sm text-muted-500">Ładowanie...</p>
          </div>
        )}

        {/* ─── Table (desktop) / Cards (mobile) ─ */}
        {!loading && !error && filtered.length > 0 && (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-50 text-left text-xs font-semibold text-muted-500">
                    <th className="px-3 py-2 rounded-tl-lg">Nazwa</th>
                    <th className="px-3 py-2">Kategoria</th>
                    <th className="px-3 py-2">Producent</th>
                    <th className="px-3 py-2 text-right">Zakup</th>
                    <th className="px-3 py-2 text-right">Sprzedaż</th>
                    <th className="px-3 py-2 text-center">Status</th>
                    {isAdmin && <th className="px-3 py-2 rounded-tr-lg text-center">Akcje</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {filtered.map(c => (
                    <tr key={c.id} className={`hover:bg-surface-50/50 transition-colors ${!c.active ? 'opacity-50' : ''}`}>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-gray-900 truncate max-w-[200px]">{c.trade_name}</p>
                        {c.model && <p className="text-[11px] text-muted-400 truncate">{c.model}</p>}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-600">{c.category}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-600">{c.manufacturer || '—'}</td>
                      <td className="px-3 py-2.5 text-right text-xs text-muted-500">{fmtPln(c.purchase_price)}</td>
                      <td className="px-3 py-2.5 text-right text-xs font-medium text-gray-900">{fmtPln(c.selling_price)}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          c.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                        }`}>{c.active ? 'Aktywny' : 'Nieaktywny'}</span>
                      </td>
                      {isAdmin && (
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-primary-50 text-primary-600 transition-colors" title="Edytuj">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => handleToggle(c)} className="p-1.5 rounded-lg hover:bg-surface-100 text-muted-500 transition-colors" title={c.active ? 'Dezaktywuj' : 'Aktywuj'}>
                              {c.active ? <ToggleRight size={16} className="text-green-600" /> : <ToggleLeft size={16} />}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {filtered.map(c => (
                <div key={c.id} className={`card p-3 ${!c.active ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{c.trade_name}</p>
                      <p className="text-[11px] text-muted-400">{c.category}{c.manufacturer ? ` · ${c.manufacturer}` : ''}</p>
                    </div>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      c.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                    }`}>{c.active ? 'Akt.' : 'Nieak.'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-500">
                    <span>Zakup: {fmtPln(c.purchase_price)}</span>
                    <span className="font-medium text-gray-900">Sprz: {fmtPln(c.selling_price)}</span>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-surface-100">
                      <button onClick={() => openEdit(c)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 transition-colors">
                        <Pencil size={10} />Edytuj
                      </button>
                      <button onClick={() => handleToggle(c)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-muted-600 bg-surface-100 hover:bg-surface-200 transition-colors">
                        {c.active ? <><ToggleRight size={12} className="text-green-600" />Dezaktywuj</> : <><ToggleLeft size={12} />Aktywuj</>}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ─── Empty ─────────────────────────── */}
        {!loading && !error && filtered.length === 0 && (
          <div className="mt-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
              <Package size={28} className="text-primary-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Brak komponentów</h2>
            <p className="text-sm text-muted-500 max-w-xs mb-6">
              {search || categoryFilter !== 'all' ? 'Brak wyników dla wybranych filtrów.' : 'Dodaj pierwszy komponent lub zaimportuj dane z CSV.'}
            </p>
            {isAdmin && (
              <div className="flex gap-2">
                <button onClick={openNew}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-all">
                  <Plus size={18} />Nowy komponent
                </button>
                <button onClick={handleImportClick}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-all">
                  <Upload size={18} />Import CSV
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── FAB (admin only) ────────────── */}
      {isAdmin && !loading && (
        <button onClick={openNew} aria-label="Nowy komponent"
          className="fixed right-4 bottom-20 md:bottom-8 md:right-8 z-40 w-14 h-14 bg-primary-600 text-white rounded-2xl shadow-lg hover:bg-primary-700 active:scale-95 transition-all flex items-center justify-center"
          style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <Plus size={24} />
        </button>
      )}

      {/* ─── Form Modal ─────────────────── */}
      {showForm && (
        <PvComponentFormModal
          existing={editTarget}
          onSubmit={editTarget ? handleUpdate : handleCreate}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}
    </>
  );
}
