import { useState, useEffect, useCallback, useMemo } from 'react';
import { getPvComponents } from '../services/pvComponentService';
import type { PvComponent } from '../types/pvComponentTypes';
import { PV_COMPONENT_CATEGORIES } from '../types/pvComponentTypes';
import { X, Search, Package, Loader2 } from 'lucide-react';

interface Props {
  onSelect: (component: PvComponent) => void;
  onClose: () => void;
  initialCategory?: string;
  title?: string;
}

export default function PvComponentPickerModal({ onSelect, onClose, initialCategory, title }: Props) {
  const [components, setComponents] = useState<PvComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(initialCategory || 'all');

  const load = useCallback(async () => {
    try {
      const data = await getPvComponents();
      setComponents(data.filter(c => c.active));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let result = components;
    if (category !== 'all') result = result.filter(c => c.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.trade_name.toLowerCase().includes(q) ||
        (c.manufacturer && c.manufacturer.toLowerCase().includes(q)) ||
        (c.model && c.model.toLowerCase().includes(q))
      );
    }
    return result;
  }, [components, category, search]);

  const fmtPln = (v: number) =>
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(v);

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-2xl max-h-[85dvh] bg-white rounded-t-2xl md:rounded-2xl overflow-hidden flex flex-col"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100 shrink-0">
          <h3 className="text-base font-bold text-gray-900">{title || 'Wybierz komponent z katalogu'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-100 text-muted-400"><X size={20} /></button>
        </div>

        {/* Search + Filter */}
        <div className="px-4 py-3 border-b border-surface-100 space-y-2 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Szukaj komponentu..."
              className="w-full pl-8 pr-3 py-2 border border-surface-200 rounded-xl text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="w-full px-3 py-1.5 border border-surface-200 rounded-xl text-xs bg-surface-50">
            <option value="all">Wszystkie kategorie</option>
            {PV_COMPONENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="mt-12 flex flex-col items-center gap-2">
              <Loader2 size={24} className="animate-spin text-primary-500" />
              <p className="text-sm text-muted-500">Ładowanie...</p>
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="mt-12 flex flex-col items-center">
              <Package size={28} className="text-muted-300 mb-2" />
              <p className="text-sm text-muted-500">Brak wyników</p>
            </div>
          )}
          {!loading && filtered.map(c => (
            <button key={c.id} onClick={() => onSelect(c)}
              className="w-full text-left px-4 py-3 border-b border-surface-50 hover:bg-primary-50/50 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{c.trade_name}</p>
                  <p className="text-[11px] text-muted-400 truncate">
                    {c.category}{c.manufacturer ? ` · ${c.manufacturer}` : ''}{c.model ? ` · ${c.model}` : ''}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-medium text-primary-600">{fmtPln(c.selling_price)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
