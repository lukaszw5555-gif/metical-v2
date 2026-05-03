import { useState, useEffect, useCallback, useMemo, type FormEvent } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '@/components/layout/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { getLeads } from '@/features/sales/services/salesLeadService';
import { getClients } from '@/features/clients/services/clientService';
import { getActiveProfiles } from '@/lib/services/profilesService';
import { createPvOffer, getPvOfferById, updatePvOffer } from '../services/pvOfferService';
import { getPvOfferItems, replacePvOfferItems } from '../services/pvOfferItemsService';
import { getOfferSettings } from '../../settings/offerSettingsService';
import PvOfferItemsSection, { existingItemToDraft, createDraftFromComponent } from '../components/PvOfferItemsSection';
import PvOfferSummaryPanel from '../components/PvOfferSummaryPanel';
import PvOfferFlowChecklist from '../components/PvOfferFlowChecklist';
import PvComponentPickerModal from '../components/PvComponentPickerModal';
import {
  totalNet, totalVat, totalMargin, totalMarginPercent,
  installationPowerKWp, panelCountFromItems, uniformPanelPowerW,
  finalNetAfterAdjustments, finalGrossAfterAdjustments,
} from '../utils/pvOfferCalculations';
import type { SalesLead, UserProfile } from '@/types/database';
import type { Client } from '@/features/clients/services/clientService';
import type { PvOfferStatus, PvOfferType, PvOfferItemDraft } from '../types/pvOfferTypes';
import {
  PV_OFFER_STATUSES, PV_OFFER_STATUS_LABELS,
  PV_OFFER_TYPES, PV_OFFER_TYPE_LABELS, PV_OFFER_TYPE_DESCRIPTIONS, PV_OFFER_TYPE_COLORS,
  PV_STRUCTURE_TYPES, PV_ROOF_TYPES, PV_INSTALLATION_TYPES,
} from '../types/pvOfferTypes';
import { type PvOfferFlowStep } from '../config/pvOfferFlowConfig';
import { Loader2, AlertCircle, Check } from 'lucide-react';

type Source = 'manual' | 'lead' | 'client';

export default function PvOfferFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const userId = user?.id ?? '';
  const canSeeInternalPricing = profile?.role === 'admin' || profile?.role === 'administracja';

  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loadingSources, setLoadingSources] = useState(true);

  const [source, setSource] = useState<Source>('manual');
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');

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
  const [offerType, setOfferType] = useState<PvOfferType>(() => {
    const qp = searchParams.get('type');
    return (qp && PV_OFFER_TYPES.includes(qp as PvOfferType)) ? qp as PvOfferType : 'pv';
  });

  // Items state
  const [items, setItems] = useState<PvOfferItemDraft[]>([]);

  // Step-based picker
  const [stepPickerStep, setStepPickerStep] = useState<PvOfferFlowStep | null>(null);
  // Adjustment state
  const [salesMarkupValue, setSalesMarkupValue] = useState('0');
  const [customerDiscountValue, setCustomerDiscountValue] = useState('0');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const hasItems = items.length > 0;

  // Derived values from items
  const itemsSummary = useMemo(() => {
    if (!hasItems) return null;
    const baseNet = totalNet(items);
    const baseVat = totalVat(items);
    const markup = parseFloat(salesMarkupValue) || 0;
    const discount = parseFloat(customerDiscountValue) || 0;
    const vr = parseFloat(vatRate) || 8;
    return {
      baseNet,
      baseVat,
      net: finalNetAfterAdjustments(baseNet, markup, discount),
      gross: finalGrossAfterAdjustments(baseNet, baseVat, markup, discount, vr),
      margin: totalMargin(items),
      marginPct: totalMarginPercent(items),
      powerKwp: installationPowerKWp(items),
      panels: panelCountFromItems(items),
      panelW: uniformPanelPowerW(items),
    };
  }, [items, hasItems, salesMarkupValue, customerDiscountValue, vatRate]);

  const loadData = useCallback(async () => {
    try {
      const [ld, cl, pr, settings] = await Promise.all([
        getLeads(), getClients(), getActiveProfiles(), getOfferSettings(),
      ]);
      setLeads(ld); setClients(cl); setProfiles(pr);

      if (isEdit && id) {
        const [o, existingItems] = await Promise.all([getPvOfferById(id), getPvOfferItems(id)]);
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
        setOfferType(o.offer_type || 'pv');
        setValidUntil(o.valid_until || '');
        setSalesMarkupValue(String(o.sales_markup_value ?? 0));
        setCustomerDiscountValue(String(o.customer_discount_value ?? 0));
        if (o.lead_id) { setSource('lead'); setSelectedLeadId(o.lead_id); }
        else if (o.client_id) { setSource('client'); setSelectedClientId(o.client_id); }
        setItems(existingItems.map(existingItemToDraft));
      } else {
        // Apply defaults from offer settings for NEW offers
        setVatRate(String(settings.default_vat_rate));
        if (settings.default_offer_valid_days > 0) {
          const d = new Date();
          d.setDate(d.getDate() + settings.default_offer_valid_days);
          setValidUntil(d.toISOString().slice(0, 10));
        }

        // Prefill from query params (new offer only)
        const qpLeadId = searchParams.get('leadId');
        const qpClientId = searchParams.get('clientId');
        if (qpLeadId) {
          const lead = ld.find(l => l.id === qpLeadId);
          if (lead) {
            setSource('lead'); setSelectedLeadId(lead.id);
            setCustomerName(lead.full_name); setCustomerPhone(lead.phone);
            setCustomerEmail(lead.email || ''); setCustomerCity(lead.city || '');
          }
        } else if (qpClientId) {
          const client = cl.find(c => c.id === qpClientId);
          if (client) {
            setSource('client'); setSelectedClientId(client.id);
            setCustomerName(client.full_name); setCustomerPhone(client.phone || '');
            setCustomerEmail(client.email || ''); setCustomerCity(client.city || '');
            setInvestmentAddress(client.address || '');
          }
        }
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Błąd'); }
    finally { setLoadingSources(false); }
  }, [id, isEdit, searchParams]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleLeadSelect = (leadId: string) => {
    setSelectedLeadId(leadId); setSelectedClientId('');
    const lead = leads.find(l => l.id === leadId);
    if (lead) { setCustomerName(lead.full_name); setCustomerPhone(lead.phone); setCustomerEmail(lead.email || ''); setCustomerCity(lead.city || ''); }
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId); setSelectedLeadId('');
    const client = clients.find(c => c.id === clientId);
    if (client) { setCustomerName(client.full_name); setCustomerPhone(client.phone || ''); setCustomerEmail(client.email || ''); setCustomerCity(client.city || ''); setInvestmentAddress(client.address || ''); }
  };

  const recalcGross = (net: string, vat: string) => {
    const n = parseFloat(net) || 0; const v = parseFloat(vat) || 0;
    setPriceGross((n * (1 + v / 100)).toFixed(2));
  };
  const handleNetChange = (v: string) => { setPriceNet(v); recalcGross(v, vatRate); };
  const handleVatChange = (v: string) => { setVatRate(v); recalcGross(priceNet, v); };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError(null);
    if (!customerName.trim()) { setError('Podaj nazwę klienta.'); return; }

    // If no items, require manual pvPowerKw
    const computedPower = hasItems && itemsSummary ? itemsSummary.powerKwp : parseFloat(pvPowerKw);
    if (!hasItems && (!pvPowerKw || parseFloat(pvPowerKw) <= 0)) { setError('Podaj moc instalacji (kW) lub dodaj pozycje.'); return; }

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
        pv_power_kw: hasItems && itemsSummary && itemsSummary.powerKwp > 0 ? itemsSummary.powerKwp : (computedPower || 0),
        panel_power_w: hasItems && itemsSummary ? itemsSummary.panelW : (panelPowerW ? parseInt(panelPowerW) : null),
        panel_count: hasItems && itemsSummary && itemsSummary.panels > 0 ? itemsSummary.panels : (panelCount ? parseInt(panelCount) : null),
        inverter_name: inverterName.trim() || null,
        structure_type: structureType || null,
        roof_type: roofType || null,
        installation_type: installationType || null,
        annual_production_kwh: annualProductionKwh ? parseFloat(annualProductionKwh) : null,
        price_net: hasItems && itemsSummary ? itemsSummary.net : (parseFloat(priceNet) || 0),
        vat_rate: parseFloat(vatRate) || 8,
        price_gross: hasItems && itemsSummary ? itemsSummary.gross : (parseFloat(priceGross) || 0),
        margin_value: hasItems && itemsSummary ? itemsSummary.margin : (marginValue ? parseFloat(marginValue) : null),
        margin_percent: hasItems && itemsSummary ? itemsSummary.marginPct : (marginPercent ? parseFloat(marginPercent) : null),
        offer_note: offerNote.trim() || null,
        internal_note: internalNote.trim() || null,
        status,
        offer_type: offerType,
        sales_markup_value: parseFloat(salesMarkupValue) || 0,
        customer_discount_value: parseFloat(customerDiscountValue) || 0,
        valid_until: validUntil || null,
      };

      let offerId: string;
      if (isEdit && id) {
        await updatePvOffer(id, payload);
        offerId = id;
      } else {
        const created = await createPvOffer(payload, userId);
        offerId = created.id;
      }

      // Save items
      if (hasItems) {
        const itemPayloads = items.map((item, i) => ({
          component_id: item.component_id,
          category: item.category,
          manufacturer: item.manufacturer,
          model: item.model,
          trade_name: item.trade_name,
          unit: item.unit,
          quantity: item.quantity,
          purchase_price: item.purchase_price,
          selling_price: item.selling_price,
          vat_rate: item.vat_rate,
          power_w: item.power_w,
          capacity_kwh: item.capacity_kwh,
          notes: item.notes,
          is_custom: item.is_custom,
          sort_order: i,
        }));
        await replacePvOfferItems(offerId, itemPayloads);
      } else if (isEdit) {
        // Clear items if user removed all
        await replacePvOfferItems(offerId, []);
      }

      navigate(`/sales/offers/pv/${offerId}`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Błąd zapisu'); }
    finally { setSubmitting(false); }
  };

  const ic = 'w-full px-3 py-2.5 border border-surface-200 rounded-xl text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors';
  const label = 'block text-[11px] text-muted-500 font-medium mb-1';

  if (loadingSources) {
    return (<><PageHeader title={isEdit ? 'Edytuj ofertę PV' : 'Nowa oferta PV'} showBack /><div className="mt-16 flex flex-col items-center gap-2"><Loader2 size={28} className="animate-spin text-primary-500" /><p className="text-sm text-muted-500">Ładowanie...</p></div></>);
  }

  return (
    <>
      <PageHeader title={isEdit ? 'Edytuj ofertę PV' : 'Nowa oferta PV'} showBack />
      <div className="px-4 py-4 mx-auto max-w-lg md:max-w-5xl pb-24 md:pb-8">
        <form onSubmit={handleSubmit}>
          <div className="md:flex md:gap-6">
            {/* Left column — form fields */}
            <div className="md:flex-1 space-y-6">
              {error && (<div className="flex items-start gap-2 p-4 bg-red-50 border border-red-100 rounded-xl"><AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" /><p className="text-sm text-red-700">{error}</p></div>)}

              {/* Offer type panel */}
              <div className="card p-4">
                <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Typ oferty</p>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: PV_OFFER_TYPE_COLORS[offerType] + '18', color: PV_OFFER_TYPE_COLORS[offerType] }}>
                    <span className="text-lg font-bold">{offerType === 'pv' ? '☀' : offerType === 'pv_me' ? '⚡' : offerType === 'me' ? '🔋' : '📋'}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">{PV_OFFER_TYPE_LABELS[offerType]}</p>
                    <p className="text-[11px] text-muted-400">{PV_OFFER_TYPE_DESCRIPTIONS[offerType]}</p>
                  </div>
                </div>
                <select value={offerType} onChange={e => setOfferType(e.target.value as PvOfferType)} className={ic}>
                  {PV_OFFER_TYPES.map(t => <option key={t} value={t}>{PV_OFFER_TYPE_LABELS[t]}</option>)}
                </select>
              </div>

              {/* Flow checklist with step-based picker */}
              <PvOfferFlowChecklist
                offerType={offerType}
                items={items}
                onAddFromStep={(step) => setStepPickerStep(step)}
              />

              {/* Step-based picker modal */}
              {stepPickerStep && (
                <PvComponentPickerModal
                  initialCategory={stepPickerStep.category}
                  title={`Wybierz: ${stepPickerStep.label}`}
                  onSelect={(comp) => {
                    setItems(prev => [...prev, createDraftFromComponent(comp)]);
                    setStepPickerStep(null);
                  }}
                  onClose={() => setStepPickerStep(null)}
                />
              )}

              {/* Source selector */}
              <div className="card p-4">
                <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Źródło danych</p>
                <div className="flex gap-2 mb-3">
                  {(['manual', 'lead', 'client'] as Source[]).map(s => (
                    <button key={s} type="button" onClick={() => { setSource(s); setSelectedLeadId(''); setSelectedClientId(''); }}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${source === s ? 'bg-primary-600 text-white' : 'bg-surface-100 text-muted-600 hover:bg-surface-200'}`}>
                      {s === 'manual' ? 'Ręcznie' : s === 'lead' ? 'Z leada' : 'Z klienta'}
                    </button>))}
                </div>
                {source === 'lead' && (<div><label className={label}>Wybierz leada</label><select value={selectedLeadId} onChange={e => handleLeadSelect(e.target.value)} className={ic}><option value="">— wybierz —</option>{leads.map(l => <option key={l.id} value={l.id}>{l.full_name} — {l.phone}</option>)}</select></div>)}
                {source === 'client' && (<div><label className={label}>Wybierz klienta</label><select value={selectedClientId} onChange={e => handleClientSelect(e.target.value)} className={ic}><option value="">— wybierz —</option>{clients.map(c => <option key={c.id} value={c.id}>{c.full_name}{c.phone ? ` — ${c.phone}` : ''}</option>)}</select></div>)}
              </div>

              {/* Customer data */}
              <div className="card p-4">
                <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Dane klienta</p>
                <div className="space-y-3">
                  <div><label className={label}>Nazwa klienta *</label><input value={customerName} onChange={e => setCustomerName(e.target.value)} className={ic} /></div>
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

              {/* General */}
              <div className="card p-4">
                <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Ogólne</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={label}>Numer oferty</label><input value={offerNumber} onChange={e => setOfferNumber(e.target.value)} className={ic} placeholder="Nadany automatycznie po zapisie" /></div>
                  <div><label className={label}>Opiekun</label><select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className={ic}><option value="">— brak —</option>{profiles.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}</select></div>
                </div>
              </div>

              {/* Warunki cenowe — before items for visibility */}
              <div className="card p-4">
                <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-1">Warunki cenowe</p>
                <p className="text-[10px] text-muted-400 mb-3">Stawka VAT wpływa na podsumowanie i finalną kwotę oferty.</p>
                <div className="space-y-3">
                  {/* VAT segmented */}
                  <div>
                    <label className={label}>Stawka VAT oferty</label>
                    <div className="flex gap-2 mt-1">
                      {['8', '23'].map(v => (
                        <button key={v} type="button" onClick={() => { setVatRate(v); handleVatChange(v); }}
                          className={`flex-1 py-3 rounded-xl text-base font-bold transition-colors ${
                            vatRate === v
                              ? 'bg-primary-600 text-white shadow-md ring-2 ring-primary-300'
                              : 'bg-surface-100 text-muted-600 hover:bg-surface-200'
                          }`}>
                          {v}%
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Markup + discount */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={label}>Narzut / marża handlowa netto (PLN)</label>
                      <input value={salesMarkupValue} onChange={e => setSalesMarkupValue(e.target.value)} className={ic} type="number" step="0.01" min="0" placeholder="0" />
                    </div>
                    <div>
                      <label className={label}>Rabat klienta netto (PLN)</label>
                      <input value={customerDiscountValue} onChange={e => setCustomerDiscountValue(e.target.value)} className={ic} type="number" step="0.01" min="0" placeholder="0" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── ITEMS SECTION ──────────────────── */}
              <PvOfferItemsSection items={items} onChange={setItems} defaultVatRate={parseFloat(vatRate) || 23} canSeeInternalPricing={canSeeInternalPricing} />

              {/* Summary on mobile (below items) */}
              <div className="md:hidden">
                <PvOfferSummaryPanel items={items} canSeeInternalPricing={canSeeInternalPricing} salesMarkupValue={parseFloat(salesMarkupValue) || 0} customerDiscountValue={parseFloat(customerDiscountValue) || 0} offerVatRate={parseFloat(vatRate) || 8} />
              </div>

              {/* Installation (manual fallback when no items) */}
              {!hasItems && (
                <div className="card p-4">
                  <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Parametry instalacji (ręcznie)</p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div><label className={label}>Moc (kWp) *</label><input value={pvPowerKw} onChange={e => setPvPowerKw(e.target.value)} className={ic} type="number" step="0.01" /></div>
                      <div><label className={label}>Moc panelu (W)</label><input value={panelPowerW} onChange={e => setPanelPowerW(e.target.value)} className={ic} type="number" /></div>
                      <div><label className={label}>Liczba paneli</label><input value={panelCount} onChange={e => setPanelCount(e.target.value)} className={ic} type="number" /></div>
                    </div>
                    <div><label className={label}>Falownik</label><input value={inverterName} onChange={e => setInverterName(e.target.value)} className={ic} /></div>
                  </div>
                </div>
              )}

              {/* Structure/roof/type — always shown */}
              <div className="card p-4">
                <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Typ montażu</p>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className={label}>Konstrukcja</label><select value={structureType} onChange={e => setStructureType(e.target.value)} className={ic}><option value="">— brak —</option>{PV_STRUCTURE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                  <div><label className={label}>Typ dachu</label><select value={roofType} onChange={e => setRoofType(e.target.value)} className={ic}><option value="">— brak —</option>{PV_ROOF_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                  <div><label className={label}>Montaż</label><select value={installationType} onChange={e => setInstallationType(e.target.value)} className={ic}><option value="">— brak —</option>{PV_INSTALLATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                </div>
                <div className="mt-3"><label className={label}>Szacowana produkcja roczna (kWh)</label><input value={annualProductionKwh} onChange={e => setAnnualProductionKwh(e.target.value)} className={ic} type="number" /></div>
              </div>

              {/* Manual pricing (only if no items) */}
              {!hasItems && (
                <div className="card p-4">
                  <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Ceny (ręcznie)</p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={label}>Netto (PLN)</label><input value={priceNet} onChange={e => handleNetChange(e.target.value)} className={ic} type="number" step="0.01" /></div>
                      <div><label className={label}>Brutto (PLN)</label><input value={priceGross} readOnly className={`${ic} bg-surface-100 font-semibold`} /></div>
                    </div>
                    {canSeeInternalPricing && (
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={label}>Marża (PLN)</label><input value={marginValue} onChange={e => setMarginValue(e.target.value)} className={ic} type="number" step="0.01" /></div>
                      <div><label className={label}>Marża (%)</label><input value={marginPercent} onChange={e => setMarginPercent(e.target.value)} className={ic} type="number" step="0.01" /></div>
                    </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="card p-4">
                <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Treść</p>
                <div className="space-y-3">
                  <div><label className={label}>Notatka ofertowa</label><textarea value={offerNote} onChange={e => setOfferNote(e.target.value)} rows={3} className={`${ic} resize-none`} /></div>
                  <div><label className={label}>Notatka wewnętrzna</label><textarea value={internalNote} onChange={e => setInternalNote(e.target.value)} rows={2} className={`${ic} resize-none`} /></div>
                </div>
              </div>

              {/* Status */}
              <div className="card p-4">
                <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Status i ważność</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={label}>Status</label><select value={status} onChange={e => setStatus(e.target.value as PvOfferStatus)} className={ic}>{PV_OFFER_STATUSES.map(s => <option key={s} value={s}>{PV_OFFER_STATUS_LABELS[s]}</option>)}</select></div>
                  <div><label className={label}>Ważna do</label><input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className={ic} /></div>
                </div>
              </div>

              {/* Submit */}
              <button type="submit" disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 active:scale-[0.98] transition-all disabled:opacity-60 shadow-sm">
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                {submitting ? 'Zapisywanie...' : isEdit ? 'Zapisz zmiany' : 'Utwórz ofertę'}
              </button>
            </div>

            {/* Right column — sticky summary (desktop) */}
            <div className="hidden md:block md:w-72 md:shrink-0">
              <div className="md:sticky md:top-4">
                <PvOfferSummaryPanel items={items} canSeeInternalPricing={canSeeInternalPricing} salesMarkupValue={parseFloat(salesMarkupValue) || 0} customerDiscountValue={parseFloat(customerDiscountValue) || 0} offerVatRate={parseFloat(vatRate) || 8} />
              </div>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
