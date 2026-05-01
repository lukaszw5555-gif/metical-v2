import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '@/components/layout/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { getLeads } from '@/features/sales/services/salesLeadService';
import { getClients } from '@/features/clients/services/clientService';
import { getActiveProfiles } from '@/lib/services/profilesService';
import { createPvOffer, getPvOfferById, updatePvOffer } from '../services/pvOfferService';
import type { SalesLead, UserProfile } from '@/types/database';
import type { Client } from '@/features/clients/services/clientService';
import type { PvOfferStatus } from '../types/pvOfferTypes';
import {
  PV_OFFER_STATUSES, PV_OFFER_STATUS_LABELS,
  PV_STRUCTURE_TYPES, PV_ROOF_TYPES, PV_INSTALLATION_TYPES,
} from '../types/pvOfferTypes';
import { Loader2, AlertCircle, Check } from 'lucide-react';

type Source = 'manual' | 'lead' | 'client';

export default function PvOfferFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  // Data sources
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loadingSources, setLoadingSources] = useState(true);

  // Source selector
  const [source, setSource] = useState<Source>('manual');
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  // Form fields
  const [offerNumber, setOfferNumber] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [investmentAddress, setInvestmentAddress] = useState('');
  const [pvPowerKw, setPvPowerKw] = useState('');
  const [panelPowerW, setPanelPowerW] = useState('');
  const [panelCount, setPanelCount] = useState('');
  const [inverterName, setInverterName] = useState('');
  const [structureType, setStructureType] = useState('');
  const [roofType, setRoofType] = useState('');
  const [installationType, setInstallationType] = useState('');
  const [annualProductionKwh, setAnnualProductionKwh] = useState('');
  const [priceNet, setPriceNet] = useState('');
  const [vatRate, setVatRate] = useState('8');
  const [priceGross, setPriceGross] = useState('');
  const [marginValue, setMarginValue] = useState('');
  const [marginPercent, setMarginPercent] = useState('');
  const [offerNote, setOfferNote] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [status, setStatus] = useState<PvOfferStatus>('draft');
  const [validUntil, setValidUntil] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load sources + existing offer if editing
  const loadData = useCallback(async () => {
    try {
      const [ld, cl, pr] = await Promise.all([getLeads(), getClients(), getActiveProfiles()]);
      setLeads(ld); setClients(cl); setProfiles(pr);

      if (isEdit && id) {
        const o = await getPvOfferById(id);
        setOfferNumber(o.offer_number || '');
        setAssignedTo(o.assigned_to || '');
        setCustomerName(o.customer_name);
        setCustomerPhone(o.customer_phone || '');
        setCustomerEmail(o.customer_email || '');
        setCustomerCity(o.customer_city || '');
        setInvestmentAddress(o.investment_address || '');
        setPvPowerKw(String(o.pv_power_kw));
        setPanelPowerW(o.panel_power_w ? String(o.panel_power_w) : '');
        setPanelCount(o.panel_count ? String(o.panel_count) : '');
        setInverterName(o.inverter_name || '');
        setStructureType(o.structure_type || '');
        setRoofType(o.roof_type || '');
        setInstallationType(o.installation_type || '');
        setAnnualProductionKwh(o.annual_production_kwh ? String(o.annual_production_kwh) : '');
        setPriceNet(String(o.price_net));
        setVatRate(String(o.vat_rate));
        setPriceGross(String(o.price_gross));
        setMarginValue(o.margin_value ? String(o.margin_value) : '');
        setMarginPercent(o.margin_percent ? String(o.margin_percent) : '');
        setOfferNote(o.offer_note || '');
        setInternalNote(o.internal_note || '');
        setStatus(o.status);
        setValidUntil(o.valid_until || '');
        if (o.lead_id) { setSource('lead'); setSelectedLeadId(o.lead_id); }
        else if (o.client_id) { setSource('client'); setSelectedClientId(o.client_id); }
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Błąd'); }
    finally { setLoadingSources(false); }
  }, [id, isEdit]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-fill from lead
  const handleLeadSelect = (leadId: string) => {
    setSelectedLeadId(leadId);
    setSelectedClientId('');
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setCustomerName(lead.full_name);
      setCustomerPhone(lead.phone);
      setCustomerEmail(lead.email || '');
      setCustomerCity(lead.city || '');
    }
  };

  // Auto-fill from client
  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedLeadId('');
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setCustomerName(client.full_name);
      setCustomerPhone(client.phone || '');
      setCustomerEmail(client.email || '');
      setCustomerCity(client.city || '');
      setInvestmentAddress(client.address || '');
    }
  };

  // Auto-calc gross
  const recalcGross = (net: string, vat: string) => {
    const n = parseFloat(net) || 0;
    const v = parseFloat(vat) || 0;
    setPriceGross((n * (1 + v / 100)).toFixed(2));
  };

  const handleNetChange = (v: string) => { setPriceNet(v); recalcGross(v, vatRate); };
  const handleVatChange = (v: string) => { setVatRate(v); recalcGross(priceNet, v); };

  // Submit
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim()) { setError('Podaj nazwę klienta.'); return; }
    if (!pvPowerKw || parseFloat(pvPowerKw) <= 0) { setError('Podaj moc instalacji (kW).'); return; }

    setSubmitting(true);
    try {
      const payload = {
        offer_number: offerNumber.trim() || null,
        lead_id: source === 'lead' && selectedLeadId ? selectedLeadId : null,
        client_id: source === 'client' && selectedClientId ? selectedClientId : null,
        assigned_to: assignedTo || null,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || null,
        customer_email: customerEmail.trim() || null,
        customer_city: customerCity.trim() || null,
        investment_address: investmentAddress.trim() || null,
        pv_power_kw: parseFloat(pvPowerKw),
        panel_power_w: panelPowerW ? parseInt(panelPowerW) : null,
        panel_count: panelCount ? parseInt(panelCount) : null,
        inverter_name: inverterName.trim() || null,
        structure_type: structureType || null,
        roof_type: roofType || null,
        installation_type: installationType || null,
        annual_production_kwh: annualProductionKwh ? parseFloat(annualProductionKwh) : null,
        price_net: parseFloat(priceNet) || 0,
        vat_rate: parseFloat(vatRate) || 8,
        price_gross: parseFloat(priceGross) || 0,
        margin_value: marginValue ? parseFloat(marginValue) : null,
        margin_percent: marginPercent ? parseFloat(marginPercent) : null,
        offer_note: offerNote.trim() || null,
        internal_note: internalNote.trim() || null,
        status,
        valid_until: validUntil || null,
      };

      if (isEdit && id) {
        await updatePvOffer(id, payload);
        navigate(`/sales/offers/pv/${id}`);
      } else {
        const created = await createPvOffer(payload, userId);
        navigate(`/sales/offers/pv/${created.id}`);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Błąd zapisu'); }
    finally { setSubmitting(false); }
  };

  // Shared input classes
  const ic = 'w-full px-3 py-2.5 border border-surface-200 rounded-xl text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors';
  const label = 'block text-[11px] text-muted-500 font-medium mb-1';

  if (loadingSources) {
    return (
      <>
        <PageHeader title={isEdit ? 'Edytuj ofertę PV' : 'Nowa oferta PV'} showBack />
        <div className="mt-16 flex flex-col items-center gap-2">
          <Loader2 size={28} className="animate-spin text-primary-500" />
          <p className="text-sm text-muted-500">Ładowanie...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title={isEdit ? 'Edytuj ofertę PV' : 'Nowa oferta PV'} showBack />
      <div className="px-4 py-4 mx-auto max-w-lg md:max-w-3xl pb-24 md:pb-8">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ─── Error ─────────────────────────────── */}
          {error && (
            <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-100 rounded-xl">
              <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* ─── Source selector ───────────────────── */}
          <div className="card p-4">
            <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Źródło danych</p>
            <div className="flex gap-2 mb-3">
              {(['manual', 'lead', 'client'] as Source[]).map(s => (
                <button key={s} type="button" onClick={() => { setSource(s); setSelectedLeadId(''); setSelectedClientId(''); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    source === s ? 'bg-primary-600 text-white' : 'bg-surface-100 text-muted-600 hover:bg-surface-200'
                  }`}>
                  {s === 'manual' ? 'Ręcznie' : s === 'lead' ? 'Z leada' : 'Z klienta'}
                </button>
              ))}
            </div>

            {source === 'lead' && (
              <div>
                <label className={label}>Wybierz leada</label>
                <select value={selectedLeadId} onChange={e => handleLeadSelect(e.target.value)} className={ic}>
                  <option value="">— wybierz —</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.full_name} — {l.phone}</option>)}
                </select>
              </div>
            )}

            {source === 'client' && (
              <div>
                <label className={label}>Wybierz klienta</label>
                <select value={selectedClientId} onChange={e => handleClientSelect(e.target.value)} className={ic}>
                  <option value="">— wybierz —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}{c.phone ? ` — ${c.phone}` : ''}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* ─── Customer data ─────────────────────── */}
          <div className="card p-4">
            <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Dane klienta</p>
            <div className="space-y-3">
              <div>
                <label className={label}>Nazwa klienta *</label>
                <input value={customerName} onChange={e => setCustomerName(e.target.value)} className={ic} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={label}>Telefon</label><input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className={ic} type="tel" /></div>
                <div><label className={label}>E-mail</label><input value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} className={ic} type="email" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={label}>Miejscowość</label><input value={customerCity} onChange={e => setCustomerCity(e.target.value)} className={ic} /></div>
                <div><label className={label}>Adres inwestycji</label><input value={investmentAddress} onChange={e => setInvestmentAddress(e.target.value)} className={ic} /></div>
              </div>
            </div>
          </div>

          {/* ─── Offer number + assigned ──────────── */}
          <div className="card p-4">
            <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Ogólne</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>Numer oferty</label><input value={offerNumber} onChange={e => setOfferNumber(e.target.value)} className={ic} placeholder="np. PV/2026/001" /></div>
              <div>
                <label className={label}>Opiekun</label>
                <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className={ic}>
                  <option value="">— brak —</option>
                  {profiles.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ─── Installation parameters ──────────── */}
          <div className="card p-4">
            <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Parametry instalacji</p>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div><label className={label}>Moc instalacji (kWp) *</label><input value={pvPowerKw} onChange={e => setPvPowerKw(e.target.value)} className={ic} type="number" step="0.01" /></div>
                <div><label className={label}>Moc panelu (W)</label><input value={panelPowerW} onChange={e => setPanelPowerW(e.target.value)} className={ic} type="number" /></div>
                <div><label className={label}>Liczba paneli</label><input value={panelCount} onChange={e => setPanelCount(e.target.value)} className={ic} type="number" /></div>
              </div>
              <div><label className={label}>Falownik</label><input value={inverterName} onChange={e => setInverterName(e.target.value)} className={ic} placeholder="np. Huawei SUN2000-10KTL" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={label}>Typ konstrukcji</label>
                  <select value={structureType} onChange={e => setStructureType(e.target.value)} className={ic}>
                    <option value="">— brak —</option>
                    {PV_STRUCTURE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={label}>Typ dachu</label>
                  <select value={roofType} onChange={e => setRoofType(e.target.value)} className={ic}>
                    <option value="">— brak —</option>
                    {PV_ROOF_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={label}>Typ montażu</label>
                  <select value={installationType} onChange={e => setInstallationType(e.target.value)} className={ic}>
                    <option value="">— brak —</option>
                    {PV_INSTALLATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div><label className={label}>Szacowana produkcja roczna (kWh)</label><input value={annualProductionKwh} onChange={e => setAnnualProductionKwh(e.target.value)} className={ic} type="number" /></div>
            </div>
          </div>

          {/* ─── Pricing ──────────────────────────── */}
          <div className="card p-4">
            <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Ceny</p>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div><label className={label}>Cena netto (PLN)</label><input value={priceNet} onChange={e => handleNetChange(e.target.value)} className={ic} type="number" step="0.01" /></div>
                <div><label className={label}>VAT (%)</label><input value={vatRate} onChange={e => handleVatChange(e.target.value)} className={ic} type="number" step="1" /></div>
                <div>
                  <label className={label}>Cena brutto (PLN)</label>
                  <input value={priceGross} readOnly className={`${ic} bg-surface-100 text-gray-700 font-semibold`} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={label}>Marża (PLN)</label><input value={marginValue} onChange={e => setMarginValue(e.target.value)} className={ic} type="number" step="0.01" /></div>
                <div><label className={label}>Marża (%)</label><input value={marginPercent} onChange={e => setMarginPercent(e.target.value)} className={ic} type="number" step="0.01" /></div>
              </div>
            </div>
          </div>

          {/* ─── Content ──────────────────────────── */}
          <div className="card p-4">
            <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Treść</p>
            <div className="space-y-3">
              <div>
                <label className={label}>Notatka ofertowa (widoczna dla klienta)</label>
                <textarea value={offerNote} onChange={e => setOfferNote(e.target.value)} rows={3} className={`${ic} resize-none`} />
              </div>
              <div>
                <label className={label}>Notatka wewnętrzna</label>
                <textarea value={internalNote} onChange={e => setInternalNote(e.target.value)} rows={2} className={`${ic} resize-none`} />
              </div>
            </div>
          </div>

          {/* ─── Status + Valid until ─────────────── */}
          <div className="card p-4">
            <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Status i ważność</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Status</label>
                <select value={status} onChange={e => setStatus(e.target.value as PvOfferStatus)} className={ic}>
                  {PV_OFFER_STATUSES.map(s => <option key={s} value={s}>{PV_OFFER_STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Ważna do</label>
                <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className={ic} />
              </div>
            </div>
          </div>

          {/* ─── Submit ───────────────────────────── */}
          <button type="submit" disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 active:scale-[0.98] transition-all disabled:opacity-60 shadow-sm">
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            {submitting ? 'Zapisywanie...' : isEdit ? 'Zapisz zmiany' : 'Utwórz ofertę'}
          </button>
        </form>
      </div>
    </>
  );
}
