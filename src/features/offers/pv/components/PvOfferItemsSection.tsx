import { useState } from 'react';
import type { PvOfferItemDraft } from '../types/pvOfferTypes';
import type { PvComponent } from '../types/pvComponentTypes';
import PvComponentPickerModal from './PvComponentPickerModal';
import { lineNetValue, lineGrossValue, lineMarginValue, fmtPln } from '../utils/pvOfferCalculations';
import { Plus, Minus, Trash2, Package, ShoppingCart } from 'lucide-react';

interface Props {
  items: PvOfferItemDraft[];
  onChange: (items: PvOfferItemDraft[]) => void;
  defaultVatRate: number;
}

let keyCounter = 0;
function nextKey() { return `item_${Date.now()}_${keyCounter++}`; }

export function createDraftFromComponent(comp: PvComponent): PvOfferItemDraft {
  return {
    _key: nextKey(),
    component_id: comp.id,
    category: comp.category,
    manufacturer: comp.manufacturer,
    model: comp.model,
    trade_name: comp.trade_name,
    unit: comp.unit,
    quantity: 1,
    purchase_price: comp.purchase_price,
    selling_price: comp.selling_price,
    vat_rate: comp.vat_rate,
    power_w: comp.power_w,
    capacity_kwh: comp.capacity_kwh,
    notes: null,
    is_custom: false,
    sort_order: 0,
  };
}

export function createCustomDraft(vatRate: number): PvOfferItemDraft {
  return {
    _key: nextKey(),
    component_id: null,
    category: 'Dodatkowe usługi',
    manufacturer: null,
    model: null,
    trade_name: '',
    unit: 'szt.',
    quantity: 1,
    purchase_price: 0,
    selling_price: 0,
    vat_rate: vatRate,
    power_w: null,
    capacity_kwh: null,
    notes: null,
    is_custom: true,
    sort_order: 0,
  };
}

export function existingItemToDraft(item: { component_id: string|null; category: string; manufacturer: string|null; model: string|null; trade_name: string; unit: string; quantity: number; purchase_price: number; selling_price: number; vat_rate: number; power_w: number|null; capacity_kwh: number|null; notes: string|null; is_custom: boolean; sort_order: number; }): PvOfferItemDraft {
  return { ...item, _key: nextKey() };
}

export default function PvOfferItemsSection({ items, onChange, defaultVatRate }: Props) {
  const [showPicker, setShowPicker] = useState(false);

  const ic = 'w-full px-2 py-1.5 border border-surface-200 rounded-lg text-xs bg-surface-50 focus:outline-none focus:ring-1 focus:ring-primary-500/30';

  const update = (idx: number, patch: Partial<PvOfferItemDraft>) => {
    const next = [...items];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  const addFromCatalog = (comp: PvComponent) => {
    onChange([...items, createDraftFromComponent(comp)]);
    setShowPicker(false);
  };

  const addCustom = () => {
    onChange([...items, createCustomDraft(defaultVatRate)]);
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-gray-900 uppercase tracking-wide">Pozycje oferty</p>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => setShowPicker(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 transition-colors">
            <Package size={11} />Z katalogu
          </button>
          <button type="button" onClick={addCustom}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-muted-600 bg-surface-100 hover:bg-surface-200 transition-colors">
            <Plus size={11} />Własna
          </button>
        </div>
      </div>

      {items.length === 0 && (
        <div className="py-6 flex flex-col items-center text-center">
          <ShoppingCart size={24} className="text-muted-300 mb-2" />
          <p className="text-xs text-muted-400">Brak pozycji. Dodaj z katalogu lub utwórz własną.</p>
        </div>
      )}

      {/* Desktop table */}
      {items.length > 0 && (
        <div className="hidden md:block overflow-x-auto -mx-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface-50 text-left text-[10px] font-semibold text-muted-500 uppercase">
                <th className="px-2 py-1.5 w-[30%]">Nazwa</th>
                <th className="px-2 py-1.5 w-[10%]">Ilość</th>
                <th className="px-2 py-1.5 w-[12%]">Zakup</th>
                <th className="px-2 py-1.5 w-[12%]">Sprzedaż</th>
                <th className="px-2 py-1.5 w-[8%]">VAT%</th>
                <th className="px-2 py-1.5 w-[12%] text-right">Netto</th>
                <th className="px-2 py-1.5 w-[12%] text-right">Brutto</th>
                <th className="px-2 py-1.5 w-[4%]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {items.map((item, idx) => (
                <tr key={item._key} className="hover:bg-surface-50/50">
                  <td className="px-2 py-1.5">
                    {item.is_custom ? (
                      <input value={item.trade_name} onChange={e => update(idx, { trade_name: e.target.value })}
                        className={ic} placeholder="Nazwa pozycji" />
                    ) : (
                      <div>
                        <p className="font-medium text-gray-900 truncate">{item.trade_name}</p>
                        <p className="text-[10px] text-muted-400 truncate">{item.category}</p>
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-0.5">
                      <button type="button" onClick={() => update(idx, { quantity: Math.max(1, item.quantity - 1) })}
                        className="w-6 h-6 flex items-center justify-center rounded bg-surface-100 hover:bg-surface-200 text-muted-500 active:scale-90 transition-all"><Minus size={10} /></button>
                      <input type="number" min="1" step="1" value={item.quantity}
                        onChange={e => update(idx, { quantity: Math.max(1, parseFloat(e.target.value) || 1) })}
                        className="w-12 text-center px-1 py-1 border border-surface-200 rounded-lg text-xs bg-surface-50 focus:outline-none focus:ring-1 focus:ring-primary-500/30 font-semibold" />
                      <button type="button" onClick={() => update(idx, { quantity: item.quantity + 1 })}
                        className="w-6 h-6 flex items-center justify-center rounded bg-surface-100 hover:bg-surface-200 text-muted-500 active:scale-90 transition-all"><Plus size={10} /></button>
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" step="0.01" value={item.purchase_price}
                      onChange={e => update(idx, { purchase_price: parseFloat(e.target.value) || 0 })} className={ic} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" step="0.01" value={item.selling_price}
                      onChange={e => update(idx, { selling_price: parseFloat(e.target.value) || 0 })} className={ic} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" step="1" value={item.vat_rate}
                      onChange={e => update(idx, { vat_rate: parseFloat(e.target.value) || 0 })} className={ic} />
                  </td>
                  <td className="px-2 py-1.5 text-right font-medium">{fmtPln(lineNetValue(item))}</td>
                  <td className="px-2 py-1.5 text-right font-medium">{fmtPln(lineGrossValue(item))}</td>
                  <td className="px-2 py-1.5">
                    <button type="button" onClick={() => remove(idx)} className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile cards */}
      {items.length > 0 && (
        <div className="md:hidden space-y-2">
          {items.map((item, idx) => (
            <div key={item._key} className="p-3 border border-surface-100 rounded-xl space-y-2">
              <div className="flex items-start justify-between gap-2">
                {item.is_custom ? (
                  <input value={item.trade_name} onChange={e => update(idx, { trade_name: e.target.value })}
                    className={`${ic} flex-1`} placeholder="Nazwa pozycji" />
                ) : (
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-900 truncate">{item.trade_name}</p>
                    <p className="text-[10px] text-muted-400">{item.category}</p>
                  </div>
                )}
                <button type="button" onClick={() => remove(idx)} className="p-1 rounded hover:bg-red-50 text-red-400">
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div><span className="text-[10px] text-muted-400">Ilość</span>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <button type="button" onClick={() => update(idx, { quantity: Math.max(1, item.quantity - 1) })}
                      className="w-7 h-7 flex items-center justify-center rounded bg-surface-100 hover:bg-surface-200 text-muted-500 active:scale-90 transition-all"><Minus size={12} /></button>
                    <input type="number" min="1" step="1" value={item.quantity}
                      onChange={e => update(idx, { quantity: Math.max(1, parseFloat(e.target.value) || 1) })}
                      className="w-10 text-center px-1 py-1 border border-surface-200 rounded-lg text-xs bg-surface-50 focus:outline-none font-semibold" />
                    <button type="button" onClick={() => update(idx, { quantity: item.quantity + 1 })}
                      className="w-7 h-7 flex items-center justify-center rounded bg-surface-100 hover:bg-surface-200 text-muted-500 active:scale-90 transition-all"><Plus size={12} /></button>
                  </div></div>
                <div><span className="text-[10px] text-muted-400">Zakup</span>
                  <input type="number" step="0.01" value={item.purchase_price}
                    onChange={e => update(idx, { purchase_price: parseFloat(e.target.value) || 0 })} className={ic} /></div>
                <div><span className="text-[10px] text-muted-400">Sprzedaż</span>
                  <input type="number" step="0.01" value={item.selling_price}
                    onChange={e => update(idx, { selling_price: parseFloat(e.target.value) || 0 })} className={ic} /></div>
                <div><span className="text-[10px] text-muted-400">VAT%</span>
                  <input type="number" step="1" value={item.vat_rate}
                    onChange={e => update(idx, { vat_rate: parseFloat(e.target.value) || 0 })} className={ic} /></div>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-500">Netto: {fmtPln(lineNetValue(item))}</span>
                <span className="font-semibold text-gray-900">Brutto: {fmtPln(lineGrossValue(item))}</span>
              </div>
              <div className="text-[10px] text-muted-400">Marża: {fmtPln(lineMarginValue(item))}</div>
            </div>
          ))}
        </div>
      )}

      {showPicker && <PvComponentPickerModal onSelect={addFromCatalog} onClose={() => setShowPicker(false)} />}
    </div>
  );
}
