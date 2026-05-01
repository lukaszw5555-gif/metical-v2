import { useState, useEffect, type FormEvent } from 'react';
import type { PvComponent, CreatePvComponentInput, PvComponentCategory } from '../types/pvComponentTypes';
import { PV_COMPONENT_CATEGORIES } from '../types/pvComponentTypes';
import { X, Check, Loader2 } from 'lucide-react';

interface Props {
  existing?: PvComponent | null;
  onSubmit: (data: CreatePvComponentInput) => Promise<void>;
  onClose: () => void;
}

export default function PvComponentFormModal({ existing, onSubmit, onClose }: Props) {
  const isEdit = !!existing;

  const [category, setCategory] = useState<PvComponentCategory>('Moduły fotowoltaiczne');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [unit, setUnit] = useState('szt.');
  const [param1, setParam1] = useState('');
  const [param2, setParam2] = useState('');
  const [description, setDescription] = useState('');
  const [powerW, setPowerW] = useState('');
  const [capacityKwh, setCapacityKwh] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('0');
  const [sellingPrice, setSellingPrice] = useState('0');
  const [vatRate, setVatRate] = useState('23');
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existing) {
      setCategory(existing.category);
      setManufacturer(existing.manufacturer || '');
      setModel(existing.model || '');
      setTradeName(existing.trade_name);
      setUnit(existing.unit);
      setParam1(existing.param1 || '');
      setParam2(existing.param2 || '');
      setDescription(existing.description || '');
      setPowerW(existing.power_w != null ? String(existing.power_w) : '');
      setCapacityKwh(existing.capacity_kwh != null ? String(existing.capacity_kwh) : '');
      setPurchasePrice(String(existing.purchase_price));
      setSellingPrice(String(existing.selling_price));
      setVatRate(String(existing.vat_rate));
      setActive(existing.active);
      setNotes(existing.notes || '');
    }
  }, [existing]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!tradeName.trim()) { setError('Podaj nazwę handlową.'); return; }

    setSubmitting(true);
    try {
      await onSubmit({
        category,
        manufacturer: manufacturer.trim() || null,
        model: model.trim() || null,
        trade_name: tradeName.trim(),
        unit: unit.trim() || 'szt.',
        param1: param1.trim() || null,
        param2: param2.trim() || null,
        description: description.trim() || null,
        power_w: powerW ? parseFloat(powerW) : null,
        capacity_kwh: capacityKwh ? parseFloat(capacityKwh) : null,
        purchase_price: parseFloat(purchasePrice) || 0,
        selling_price: parseFloat(sellingPrice) || 0,
        vat_rate: parseFloat(vatRate) || 23,
        active,
        notes: notes.trim() || null,
      });
    } catch (e) { setError(e instanceof Error ? e.message : 'Błąd zapisu'); setSubmitting(false); }
  };

  const ic = 'w-full px-3 py-2 border border-surface-200 rounded-xl text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors';
  const lbl = 'block text-[11px] text-muted-500 font-medium mb-1';

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-lg max-h-[90dvh] bg-white rounded-t-2xl md:rounded-2xl overflow-hidden flex flex-col"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100 shrink-0">
          <h3 className="text-base font-bold text-gray-900">{isEdit ? 'Edytuj komponent' : 'Nowy komponent'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-100 text-muted-400"><X size={20} /></button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Kategoria *</label>
              <select value={category} onChange={e => setCategory(e.target.value as PvComponentCategory)} className={ic}>
                {PV_COMPONENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Jednostka</label>
              <input value={unit} onChange={e => setUnit(e.target.value)} className={ic} placeholder="szt." />
            </div>
          </div>

          <div>
            <label className={lbl}>Nazwa handlowa *</label>
            <input value={tradeName} onChange={e => setTradeName(e.target.value)} className={ic} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Producent</label><input value={manufacturer} onChange={e => setManufacturer(e.target.value)} className={ic} /></div>
            <div><label className={lbl}>Model</label><input value={model} onChange={e => setModel(e.target.value)} className={ic} /></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Parametr 1</label><input value={param1} onChange={e => setParam1(e.target.value)} className={ic} /></div>
            <div><label className={lbl}>Parametr 2</label><input value={param2} onChange={e => setParam2(e.target.value)} className={ic} /></div>
          </div>

          <div><label className={lbl}>Opis</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className={`${ic} resize-none`} /></div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Moc (W)</label><input value={powerW} onChange={e => setPowerW(e.target.value)} className={ic} type="number" step="0.01" /></div>
            <div><label className={lbl}>Pojemność (kWh)</label><input value={capacityKwh} onChange={e => setCapacityKwh(e.target.value)} className={ic} type="number" step="0.01" /></div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div><label className={lbl}>Cena zakupu (PLN)</label><input value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} className={ic} type="number" step="0.01" /></div>
            <div><label className={lbl}>Cena sprzedaży (PLN)</label><input value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} className={ic} type="number" step="0.01" /></div>
            <div><label className={lbl}>VAT (%)</label><input value={vatRate} onChange={e => setVatRate(e.target.value)} className={ic} type="number" step="1" /></div>
          </div>

          <div><label className={lbl}>Notatki</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${ic} resize-none`} /></div>

          <label className="flex items-center gap-2 cursor-pointer py-1">
            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)}
              className="w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500/30" />
            <span className="text-sm font-medium text-gray-700">Aktywny komponent</span>
          </label>

          {/* Submit — sticky at bottom */}
          <div className="pt-2 pb-safe-bottom">
            <button type="submit" disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 active:scale-[0.98] transition-all disabled:opacity-60 shadow-sm">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {submitting ? 'Zapisywanie...' : isEdit ? 'Zapisz zmiany' : 'Dodaj komponent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
