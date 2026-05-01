import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '@/components/layout/PageHeader';
import { getPvOfferById } from '../services/pvOfferService';
import { getPvOfferItems } from '../services/pvOfferItemsService';
import type { PvOffer, PvOfferItem } from '../types/pvOfferTypes';
import { PV_OFFER_STATUS_LABELS, PV_OFFER_STATUS_COLORS, PV_STRUCTURE_TYPES, PV_ROOF_TYPES, PV_INSTALLATION_TYPES } from '../types/pvOfferTypes';
import { Loader2, AlertCircle, Pencil, Sun, User, Phone, Mail, MapPin, Zap, Hash, ExternalLink, FileText, Construction, TrendingUp } from 'lucide-react';

export default function PvOfferDetailPage() {
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
      setOffer(o); setItems(it);
    } catch (e) { setError(e instanceof Error ? e.message : 'Błąd'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const fmt = (v: number) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(v);
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
  const lookupLabel = (list: { value: string; label: string }[], val: string | null) => list.find(i => i.value === val)?.label || val || '—';

  if (loading) return (<><PageHeader title="Oferta PV" showBack /><div className="mt-16 flex flex-col items-center gap-2"><Loader2 size={28} className="animate-spin text-primary-500" /><p className="text-sm text-muted-500">Ładowanie...</p></div></>);
  if (error || !offer) return (<><PageHeader title="Oferta PV" showBack /><div className="px-4 py-8"><div className="flex items-start gap-2 p-4 bg-red-50 border border-red-100 rounded-xl"><AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" /><p className="text-sm text-red-700">{error || 'Nie znaleziono oferty.'}</p></div></div></>);

  const sc = PV_OFFER_STATUS_COLORS[offer.status];

  return (
    <>
      <PageHeader title={offer.offer_number || 'Oferta PV'} showBack />
      <div className="px-4 py-4 mx-auto max-w-lg md:max-w-3xl pb-24 md:pb-8 space-y-4">

        {/* Status + Actions */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-semibold" style={{ backgroundColor: sc + '18', color: sc }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sc }} />{PV_OFFER_STATUS_LABELS[offer.status]}
            </span>
            <button onClick={() => navigate(`/sales/offers/pv/${offer.id}/edit`)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 transition-colors"><Pencil size={12} />Edytuj</button>
          </div>
          {offer.valid_until && <p className="text-xs text-muted-500 mt-2">Ważna do: {fmtDate(offer.valid_until)}</p>}
          <p className="text-xs text-muted-400 mt-1">Utworzona: {fmtDate(offer.created_at)}</p>
        </div>

        {/* Customer */}
        <div className="card p-4">
          <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Dane klienta</p>
          <div className="space-y-2">
            <Row icon={<User size={14} className="text-primary-500" />} label="Klient" value={offer.customer_name} />
            {offer.customer_phone && <Row icon={<Phone size={14} className="text-muted-400" />} label="Telefon" value={offer.customer_phone} />}
            {offer.customer_email && <Row icon={<Mail size={14} className="text-muted-400" />} label="E-mail" value={offer.customer_email} />}
            {offer.customer_city && <Row icon={<MapPin size={14} className="text-muted-400" />} label="Miejscowość" value={offer.customer_city} />}
            {offer.investment_address && <Row icon={<MapPin size={14} className="text-muted-400" />} label="Adres inwestycji" value={offer.investment_address} />}
          </div>
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div className="card p-4">
            <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Pozycje oferty ({items.length})</p>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="bg-surface-50 text-left text-[10px] font-semibold text-muted-500 uppercase">
                  <th className="px-2 py-1.5">Nazwa</th><th className="px-2 py-1.5">Kategoria</th><th className="px-2 py-1.5 text-right">Ilość</th><th className="px-2 py-1.5 text-right">Netto</th><th className="px-2 py-1.5 text-right">VAT</th><th className="px-2 py-1.5 text-right">Brutto</th>
                </tr></thead>
                <tbody className="divide-y divide-surface-100">
                  {items.map(item => {
                    const netLine = item.quantity * item.selling_price;
                    const vatLine = netLine * item.vat_rate / 100;
                    return (
                      <tr key={item.id}>
                        <td className="px-2 py-1.5"><p className="font-medium text-gray-900 truncate max-w-[200px]">{item.trade_name}</p>{item.manufacturer && <p className="text-[10px] text-muted-400">{item.manufacturer}</p>}</td>
                        <td className="px-2 py-1.5 text-muted-500">{item.category}</td>
                        <td className="px-2 py-1.5 text-right">{item.quantity} {item.unit}</td>
                        <td className="px-2 py-1.5 text-right">{fmt(netLine)}</td>
                        <td className="px-2 py-1.5 text-right text-muted-400">{item.vat_rate}%</td>
                        <td className="px-2 py-1.5 text-right font-medium">{fmt(netLine + vatLine)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Mobile */}
            <div className="md:hidden space-y-2">
              {items.map(item => {
                const netLine = item.quantity * item.selling_price;
                return (
                  <div key={item.id} className="p-2 border border-surface-100 rounded-lg">
                    <p className="text-xs font-semibold text-gray-900 truncate">{item.trade_name}</p>
                    <p className="text-[10px] text-muted-400">{item.category} · {item.quantity} {item.unit}</p>
                    <p className="text-xs text-muted-600 mt-1">Netto: {fmt(netLine)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Installation */}
        <div className="card p-4">
          <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Parametry instalacji</p>
          <div className="space-y-2">
            <Row icon={<Sun size={14} className="text-amber-500" />} label="Moc instalacji" value={`${offer.pv_power_kw} kWp`} />
            {offer.panel_power_w && <Row icon={<Hash size={14} className="text-muted-400" />} label="Moc panelu" value={`${offer.panel_power_w} W`} />}
            {offer.panel_count && <Row icon={<Hash size={14} className="text-muted-400" />} label="Liczba paneli" value={String(offer.panel_count)} />}
            {offer.inverter_name && <Row icon={<Zap size={14} className="text-muted-400" />} label="Falownik" value={offer.inverter_name} />}
            {offer.structure_type && <Row icon={<Hash size={14} className="text-muted-400" />} label="Typ konstrukcji" value={lookupLabel(PV_STRUCTURE_TYPES, offer.structure_type)} />}
            {offer.roof_type && <Row icon={<Hash size={14} className="text-muted-400" />} label="Typ dachu" value={lookupLabel(PV_ROOF_TYPES, offer.roof_type)} />}
            {offer.installation_type && <Row icon={<Hash size={14} className="text-muted-400" />} label="Typ montażu" value={lookupLabel(PV_INSTALLATION_TYPES, offer.installation_type)} />}
            {offer.annual_production_kwh && <Row icon={<Zap size={14} className="text-muted-400" />} label="Produkcja roczna" value={`${offer.annual_production_kwh} kWh`} />}
          </div>
        </div>

        {/* Pricing */}
        <div className="card p-4">
          <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Ceny</p>
          <div className="space-y-2">
            <Row icon={<Zap size={14} className="text-muted-400" />} label="Cena netto" value={fmt(offer.price_net)} />
            <Row icon={<Hash size={14} className="text-muted-400" />} label="VAT" value={`${offer.vat_rate}%`} />
            <div className="flex items-center gap-3 p-2 rounded-lg bg-primary-50"><Zap size={14} className="text-primary-600 shrink-0" /><div className="min-w-0 flex-1"><p className="text-[11px] text-primary-500 leading-tight">Cena brutto</p><p className="text-base font-bold text-primary-700">{fmt(offer.price_gross)}</p></div></div>
            {offer.margin_value != null && <Row icon={<TrendingUp size={14} className="text-green-500" />} label="Marża (PLN)" value={fmt(offer.margin_value)} />}
            {offer.margin_percent != null && <Row icon={<Hash size={14} className="text-muted-400" />} label="Marża (%)" value={`${offer.margin_percent.toFixed(1)}%`} />}
          </div>
        </div>

        {/* Notes */}
        {(offer.offer_note || offer.internal_note) && (
          <div className="card p-4">
            <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Notatki</p>
            {offer.offer_note && <div className="mb-3"><p className="text-[11px] text-muted-400 mb-1">Notatka ofertowa</p><p className="text-sm text-gray-700 whitespace-pre-wrap">{offer.offer_note}</p></div>}
            {offer.internal_note && <div><p className="text-[11px] text-muted-400 mb-1">Notatka wewnętrzna</p><p className="text-sm text-gray-700 whitespace-pre-wrap">{offer.internal_note}</p></div>}
          </div>
        )}

        {/* Relations */}
        {(offer.lead_id || offer.client_id) && (
          <div className="card p-4">
            <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Powiązania</p>
            <div className="flex flex-wrap gap-2">
              {offer.lead_id && <button onClick={() => navigate(`/sales/leads/${offer.lead_id}`)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"><ExternalLink size={12} />Otwórz leada</button>}
              {offer.client_id && <button onClick={() => navigate(`/clients/${offer.client_id}`)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-green-600 bg-green-50 hover:bg-green-100 transition-colors"><ExternalLink size={12} />Otwórz klienta</button>}
            </div>
          </div>
        )}

        {/* PDF Placeholder */}
        <div className="card p-4 opacity-60">
          <div className="flex items-center gap-2 mb-1"><FileText size={16} className="text-muted-400" /><p className="text-xs font-medium text-muted-500 uppercase tracking-wide">Eksport PDF</p></div>
          <div className="flex items-center gap-1.5"><Construction size={12} className="text-muted-400" /><p className="text-sm text-muted-400">W przygotowaniu</p></div>
        </div>
      </div>
    </>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (<div className="flex items-center gap-3"><div className="shrink-0">{icon}</div><div className="min-w-0 flex-1"><p className="text-[11px] text-muted-400 leading-tight">{label}</p><p className="text-sm font-medium text-gray-900 truncate">{value}</p></div></div>);
}
