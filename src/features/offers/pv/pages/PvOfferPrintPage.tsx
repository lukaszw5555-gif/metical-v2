import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPvOfferById } from '../services/pvOfferService';
import { getPvOfferItems } from '../services/pvOfferItemsService';
import type { PvOffer, PvOfferItem } from '../types/pvOfferTypes';
import { PV_OFFER_TYPE_LABELS, PV_OFFER_TYPE_COLORS } from '../types/pvOfferTypes';
import { Loader2, AlertCircle, Printer, ArrowLeft } from 'lucide-react';
import '../styles/pvOfferPrint.css';

export default function PvOfferPrintPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<PvOffer | null>(null);
  const [items, setItems] = useState<PvOfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const [o, it] = await Promise.all([getPvOfferById(id), getPvOfferItems(id)]);
      setOffer(o);
      setItems(it);
    } catch (e) { setError(e instanceof Error ? e.message : 'Błąd'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const fmt = (v: number) =>
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(v);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });

  if (loading) return (
    <div className="mt-16 flex flex-col items-center gap-2">
      <Loader2 size={28} className="animate-spin text-primary-500" />
      <p className="text-sm text-muted-500">Ładowanie oferty...</p>
    </div>
  );

  if (error || !offer) return (
    <div className="px-4 py-8 max-w-lg mx-auto">
      <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-100 rounded-xl">
        <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
        <p className="text-sm text-red-700">{error || 'Nie znaleziono oferty.'}</p>
      </div>
    </div>
  );

  // ─── Calculations (no internal pricing) ────────────────
  const itemsNet = items.reduce((s, i) => s + i.quantity * i.selling_price, 0);
  const itemsVat = items.reduce((s, i) => s + i.quantity * i.selling_price * i.vat_rate / 100, 0);
  const markup = offer.sales_markup_value || 0;
  const discount = offer.customer_discount_value || 0;
  const hasAdjustments = markup > 0 || discount > 0;
  const finalNet = Math.max(0, itemsNet + markup - discount);
  const markupVat = markup * offer.vat_rate / 100;
  const discountVat = discount * offer.vat_rate / 100;
  const finalVat = Math.max(0, itemsVat + markupVat - discountVat);
  const finalGross = finalNet + finalVat;

  // Storage capacity from items
  const storageKwh = items
    .filter(i => i.category === 'Magazyny energii' && i.capacity_kwh && i.capacity_kwh > 0)
    .reduce((s, i) => s + (i.capacity_kwh! * i.quantity), 0);

  const tc = PV_OFFER_TYPE_COLORS[offer.offer_type] || '#6a6a8e';

  return (
    <div style={{ background: '#f0f0f6', minHeight: '100vh', padding: '16px' }}>
      {/* Controls bar — hidden on print */}
      <div className="pv-print-controls no-print">
        <button onClick={() => navigate(`/sales/offers/pv/${offer.id}`)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-600 bg-white hover:bg-surface-100 transition-colors">
          <ArrowLeft size={14} />Wróć do oferty
        </button>
        <button onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 active:scale-[0.98] transition-all shadow-sm">
          <Printer size={16} />Drukuj / Zapisz PDF
        </button>
      </div>

      {/* ─── A4 Document ──────────────────────────────────── */}
      <div className="pv-print-doc">

        {/* A. Header */}
        <div className="pv-print-header">
          <div className="pv-print-header-left">
            <h1>METICAL</h1>
            <p className="pv-print-subtitle">Oferta fotowoltaiczna</p>
          </div>
          <div className="pv-print-header-right">
            <p className="pv-print-offer-number">{offer.offer_number || '—'}</p>
            <p>Data: {fmtDate(offer.created_at)}</p>
            {offer.valid_until && <p>Ważna do: {fmtDate(offer.valid_until)}</p>}
            <span className="pv-print-type-badge" style={{ backgroundColor: tc + '18', color: tc }}>
              {PV_OFFER_TYPE_LABELS[offer.offer_type]}
            </span>
          </div>
        </div>

        {/* B. Customer + C. Technical — side by side */}
        <div className="pv-print-info-grid">
          <div className="pv-print-info-block">
            <h2>Dane klienta</h2>
            <p><span className="pv-print-info-label">Klient</span></p>
            <p className="pv-print-info-value">{offer.customer_name}</p>
            {offer.customer_phone && <><p><span className="pv-print-info-label">Telefon</span></p><p className="pv-print-info-value">{offer.customer_phone}</p></>}
            {offer.customer_email && <><p><span className="pv-print-info-label">E-mail</span></p><p className="pv-print-info-value">{offer.customer_email}</p></>}
            {offer.customer_city && <><p><span className="pv-print-info-label">Miejscowość</span></p><p className="pv-print-info-value">{offer.customer_city}</p></>}
            {offer.investment_address && <><p><span className="pv-print-info-label">Adres inwestycji</span></p><p className="pv-print-info-value">{offer.investment_address}</p></>}
          </div>
          <div className="pv-print-info-block">
            <h2>Parametry techniczne</h2>
            <p><span className="pv-print-info-label">Moc instalacji</span></p>
            <p className="pv-print-info-value">{offer.pv_power_kw} kWp</p>
            {offer.panel_count && <><p><span className="pv-print-info-label">Liczba paneli</span></p><p className="pv-print-info-value">{offer.panel_count} szt.</p></>}
            {offer.panel_power_w && <><p><span className="pv-print-info-label">Moc panelu</span></p><p className="pv-print-info-value">{offer.panel_power_w} W</p></>}
            {storageKwh > 0 && <><p><span className="pv-print-info-label">Magazyn energii</span></p><p className="pv-print-info-value">{storageKwh.toFixed(1)} kWh</p></>}
            {offer.inverter_name && <><p><span className="pv-print-info-label">Falownik</span></p><p className="pv-print-info-value">{offer.inverter_name}</p></>}
          </div>
        </div>

        {/* D. Items table */}
        {items.length > 0 && (
          <>
            <h2>Zakres oferty</h2>
            <table className="pv-print-table">
              <thead>
                <tr>
                  <th style={{ width: '4%' }}>Lp.</th>
                  <th style={{ width: '36%' }}>Nazwa</th>
                  <th style={{ width: '14%' }}>Kategoria</th>
                  <th className="text-right" style={{ width: '8%' }}>Ilość</th>
                  <th style={{ width: '6%' }}>J.m.</th>
                  <th className="text-right" style={{ width: '12%' }}>Netto</th>
                  <th className="text-right" style={{ width: '8%' }}>VAT</th>
                  <th className="text-right" style={{ width: '12%' }}>Brutto</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const lineNet = item.quantity * item.selling_price;
                  const lineVat = lineNet * item.vat_rate / 100;
                  return (
                    <tr key={item.id}>
                      <td>{idx + 1}</td>
                      <td>
                        <span className="pv-print-item-name">{item.trade_name}</span>
                        {item.manufacturer && <><br /><span className="pv-print-item-cat">{item.manufacturer}</span></>}
                      </td>
                      <td><span className="pv-print-item-cat">{item.category}</span></td>
                      <td className="text-right">{item.quantity}</td>
                      <td>{item.unit}</td>
                      <td className="text-right">{fmt(lineNet)}</td>
                      <td className="text-right">{item.vat_rate}%</td>
                      <td className="text-right">{fmt(lineNet + lineVat)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        {/* E. Price summary */}
        <div className="pv-print-summary">
          <div className="pv-print-summary-table">
            {items.length > 0 && (
              <div className="pv-print-summary-row">
                <span className="pv-print-summary-label">Suma pozycji netto</span>
                <span className="pv-print-summary-value">{fmt(itemsNet)}</span>
              </div>
            )}
            {markup > 0 && (
              <div className="pv-print-summary-row adjustment">
                <span>Narzut handlowy</span>
                <span className="pv-print-summary-value">+ {fmt(markup)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="pv-print-summary-row adjustment">
                <span>Rabat klienta</span>
                <span className="pv-print-summary-value">- {fmt(discount)}</span>
              </div>
            )}
            {hasAdjustments && (
              <div className="pv-print-summary-row">
                <span className="pv-print-summary-label">Netto po korekcie</span>
                <span className="pv-print-summary-value">{fmt(finalNet)}</span>
              </div>
            )}
            <div className="pv-print-summary-row">
              <span className="pv-print-summary-label">VAT</span>
              <span className="pv-print-summary-value">{fmt(finalVat)}</span>
            </div>
            <div className="pv-print-summary-row total">
              <span>Brutto</span>
              <span>{fmt(finalGross)}</span>
            </div>
          </div>
        </div>

        {/* F. Offer note */}
        {offer.offer_note && (
          <>
            <h2>Uwagi</h2>
            <div className="pv-print-note">{offer.offer_note}</div>
          </>
        )}

        {/* G. Footer / disclaimer */}
        <div className="pv-print-footer">
          <p>Oferta ma charakter informacyjny i wymaga potwierdzenia dostępności komponentów oraz warunków montażu po wizji lokalnej lub analizie technicznej.</p>
          <p style={{ marginTop: '8px', fontWeight: 700, color: '#4a4a6a' }}>METICAL Sp. z o.o.</p>
        </div>
      </div>
    </div>
  );
}
