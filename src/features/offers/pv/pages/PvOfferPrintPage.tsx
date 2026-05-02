import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPvOfferById } from '../services/pvOfferService';
import { getPvOfferItems } from '../services/pvOfferItemsService';
import { generatePvOfferPdfProgrammatic } from '../services/generatePvOfferPdf';
import { exportElementToPdf } from '../services/exportPvOfferPdf';
import type { PvOffer, PvOfferItem } from '../types/pvOfferTypes';
import { PV_OFFER_TYPE_LABELS } from '../types/pvOfferTypes';
import { Loader2, AlertCircle, Printer, ArrowLeft, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import '../styles/pvOfferPrint.css';

const OFFER_TYPE_DISPLAY: Record<string, string> = {
  pv: 'Fotowoltaika',
  pv_me: 'Fotowoltaika + Magazyn energii',
  me: 'Magazyn energii',
  individual: 'Oferta indywidualna',
};

export default function PvOfferPrintPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<PvOffer | null>(null);
  const [items, setItems] = useState<PvOfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);

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

  // Mobile detection — simple width check
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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

  // ─── Calculations ──────────────────────────────────
  const itemsNet = items.reduce((s, i) => s + i.quantity * i.selling_price, 0);
  const itemsVat = items.reduce((s, i) => s + i.quantity * i.selling_price * i.vat_rate / 100, 0);
  const markup = offer.sales_markup_value || 0;
  const discount = offer.customer_discount_value || 0;
  const finalNet = Math.max(0, itemsNet + markup - discount);
  const markupVat = markup * offer.vat_rate / 100;
  const discountVat = discount * offer.vat_rate / 100;
  const finalVat = Math.max(0, itemsVat + markupVat - discountVat);
  const finalGross = finalNet + finalVat;

  // Derived scope info
  const storageKwh = items
    .filter(i => i.category === 'Magazyny energii' && i.capacity_kwh && i.capacity_kwh > 0)
    .reduce((s, i) => s + (i.capacity_kwh! * i.quantity), 0);

  // Build scope badges
  const scopeBadges: string[] = [];
  if (offer.pv_power_kw && offer.pv_power_kw > 0) scopeBadges.push(`${offer.pv_power_kw} kWp`);
  if (offer.panel_count) scopeBadges.push(`${offer.panel_count} paneli`);
  if (storageKwh > 0) scopeBadges.push(`Magazyn ${storageKwh.toFixed(1)} kWh`);
  scopeBadges.push('Dostawa komponentów');
  scopeBadges.push('Montaż i uruchomienie');
  scopeBadges.push('Konfiguracja systemu');

  return (
    <div style={{ background: '#f0f0f6', minHeight: '100vh', padding: '16px' }}>
      {/* Controls — hidden on print */}
      <div className="pv-print-controls no-print">
        <button onClick={() => navigate(`/sales/offers/pv/${offer.id}`)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-600 bg-white hover:bg-surface-100 transition-colors">
          <ArrowLeft size={14} />Wróć do oferty
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-muted-600 bg-white hover:bg-surface-100 transition-colors">
            <Printer size={16} />Drukuj
          </button>
          <button
            disabled={exporting}
            onClick={async () => {
              if (!offer) return;
              setExporting(true);
              try {
                const slug = (offer.offer_number || offer.id).replace(/[\s/\\]+/g, '-');
                const isMobilePdfDevice = window.innerWidth < 768 || /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);
                
                if (isMobilePdfDevice) {
                  try {
                    // 1. Prepare filtered data (NO internal pricing/costs)
                    const payload = {
                      offer_number: offer.offer_number,
                      offer_type: offer.offer_type,
                      customer_name: offer.customer_name,
                      customer_phone: offer.customer_phone,
                      customer_email: offer.customer_email,
                      customer_city: offer.customer_city,
                      investment_address: offer.investment_address,
                      pv_power_kw: offer.pv_power_kw,
                      panel_power_w: offer.panel_power_w,
                      panel_count: offer.panel_count,
                      inverter_name: offer.inverter_name,
                      valid_until: offer.valid_until,
                      created_at: offer.created_at,
                      vat_rate: offer.vat_rate,
                      price_gross: offer.price_gross,
                      offer_note: offer.offer_note,
                      items: items.map(i => ({
                        category: i.category,
                        manufacturer: i.manufacturer,
                        trade_name: i.trade_name,
                        unit: i.unit,
                        quantity: i.quantity,
                        power_w: i.power_w,
                        capacity_kwh: i.capacity_kwh
                      }))
                    };

                    // 2. Call Supabase Edge Function
                    const { data, error } = await supabase.functions.invoke('generate-pv-pdf', {
                      body: payload
                    });

                    if (error) throw error;

                    // 3. Download the blob
                    const blob = new Blob([data], { type: 'application/pdf' });
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `oferta-pv-${slug}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                    
                  } catch (edgeErr) {
                    console.warn('[PDF] Edge Function failed, using local fallback:', edgeErr);
                    // Fallback to local generator
                    const pdf = await generatePvOfferPdfProgrammatic(offer, items);
                    pdf.save(`oferta-pv-${slug}.pdf`);
                  }
                } else {
                  if (!docRef.current) throw new Error('Brak dokumentu PDF');
                  await exportElementToPdf(docRef.current, `oferta-pv-${slug}`);
                }
              } catch (err) {
                console.error('[PDF]', err);
                alert('Nie udało się wygenerować PDF. Spróbuj użyć opcji Drukuj.');
              } finally {
                setExporting(false);
              }
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 active:scale-[0.98] transition-all shadow-sm disabled:opacity-60">
            {exporting ? <><Loader2 size={16} className="animate-spin" />Generowanie PDF...</> : <><Download size={16} />Pobierz PDF</>}
          </button>
        </div>
      </div>

      {/* Mobile info — screen only */}
      {isMobile && (
        <div className="no-print" style={{ maxWidth: 820, margin: '0 auto 12px', padding: '12px 16px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 12, fontSize: 12, color: '#92400e', textAlign: 'center', lineHeight: 1.6 }}>
          Na telefonie pobierana jest uproszczona wersja PDF. Wersję premium pobierz z komputera.
        </div>
      )}

      {/* ═══ A4 DOCUMENT ═══════════════════════════════ */}
      <div className="pv-print-doc" ref={docRef}>

        {/* A. Hero cover */}
        <div className="pv-hero" style={{ backgroundImage: 'url(/pv-offer-hero.png)' }}>
          <div className="pv-hero-overlay" />
          <div className="pv-hero-content">
            <img src="/metical-logo-light.png" alt="METICAL" className="pv-hero-logo" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('style'); }} />
            <p className="pv-hero-company" style={{ display: 'none' }}>METICAL</p>
            <p className="pv-hero-subtitle">Oferta handlowa</p>
            <span className="pv-hero-type">
              {OFFER_TYPE_DISPLAY[offer.offer_type] || PV_OFFER_TYPE_LABELS[offer.offer_type]}
            </span>
            <div className="pv-hero-meta">
              <span><strong>Nr:</strong> {offer.offer_number || '—'}</span>
              <span><strong>Data:</strong> {fmtDate(offer.created_at)}</span>
              {offer.valid_until && <span><strong>Ważna do:</strong> {fmtDate(offer.valid_until)}</span>}
              <span><strong>Klient:</strong> {offer.customer_name}</span>
            </div>
          </div>
        </div>

        {/* B. Price card */}
        <div className="pv-price-card">
          <p className="pv-price-label">Cena końcowa brutto</p>
          <p className="pv-price-amount">{fmt(finalGross)}</p>
          <p className="pv-price-vat">Cena zawiera VAT {offer.vat_rate}%</p>
        </div>

        {/* C. Scope summary badges */}
        <div className="pv-scope-summary">
          {scopeBadges.map((badge, i) => (
            <span key={i} className="pv-scope-badge">
              <span className="dot" />{badge}
            </span>
          ))}
        </div>

        {/* D. Customer + Technical info */}
        <div className="pv-info-section">
          <div className="pv-info-grid">
            <div>
              <h3>Dane klienta</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <InfoRow label="Klient" value={offer.customer_name} />
                {offer.customer_phone && <InfoRow label="Telefon" value={offer.customer_phone} />}
                {offer.customer_email && <InfoRow label="E-mail" value={offer.customer_email} />}
                {offer.customer_city && <InfoRow label="Miejscowość" value={offer.customer_city} />}
                {offer.investment_address && <InfoRow label="Adres inwestycji" value={offer.investment_address} />}
              </div>
            </div>
            <div>
              <h3>Parametry techniczne</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <InfoRow label="Moc instalacji" value={`${offer.pv_power_kw} kWp`} />
                {offer.panel_count && <InfoRow label="Liczba paneli" value={`${offer.panel_count} szt.`} />}
                {offer.panel_power_w && <InfoRow label="Moc panelu" value={`${offer.panel_power_w} W`} />}
                {storageKwh > 0 && <InfoRow label="Magazyn energii" value={`${storageKwh.toFixed(1)} kWh`} />}
                {offer.inverter_name && <InfoRow label="Falownik" value={offer.inverter_name} />}
              </div>
            </div>
          </div>
        </div>

        {/* E. Scope table — no prices */}
        {items.length > 0 && (
          <div className="pv-scope-section">
            <h3>Zakres dostawy</h3>
            <table className="pv-scope-table">
              <thead>
                <tr>
                  <th style={{ width: '46%' }}>Element / zakres</th>
                  <th style={{ width: '24%' }}>Producent</th>
                  <th className="text-right" style={{ width: '16%' }}>Ilość</th>
                  <th style={{ width: '14%' }}>J.m.</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td><span className="item-name">{item.trade_name}</span></td>
                    <td><span className="item-mfg">{item.manufacturer || '—'}</span></td>
                    <td className="text-right">{item.quantity}</td>
                    <td>{item.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* F. Bottom price repeat */}
        <div className="pv-bottom-price">
          <span className="pv-bottom-price-label">Cena końcowa brutto</span>
          <span className="pv-bottom-price-amount">{fmt(finalGross)}</span>
        </div>

        {/* Offer note */}
        {offer.offer_note && (
          <div className="pv-note-section">
            <h3>Uwagi</h3>
            <div className="pv-note-content">{offer.offer_note}</div>
          </div>
        )}

        {/* G. Commercial terms */}
        <div className="pv-terms-section">
          <h3>Warunki handlowe i kolejny krok</h3>
          <div className="pv-terms-grid">
            <div>
              <div className="pv-term-label">Ważność oferty</div>
              <div className="pv-term-value">
                {offer.valid_until ? fmtDate(offer.valid_until) : 'Do potwierdzenia'}
              </div>
            </div>
            <div>
              <div className="pv-term-label">Czas realizacji</div>
              <div className="pv-term-value">Do ustalenia po akceptacji oferty</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#4a4a6a', lineHeight: 1.7 }}>
            <strong>Kolejny krok:</strong> Potwierdzenie zakresu, dostępności komponentów i terminu montażu.
          </div>
          <div className="pv-signatures">
            <div className="pv-sig-block">
              <div className="pv-sig-line" />
              <div className="pv-sig-label">Podpis handlowca</div>
            </div>
            <div className="pv-sig-block">
              <div className="pv-sig-line" />
              <div className="pv-sig-label">Podpis klienta</div>
            </div>
          </div>
        </div>

        {/* H. Footer */}
        <div className="pv-print-footer">
          <p><strong>METICAL Sp. z o.o.</strong></p>
          <p>Oferta ma charakter informacyjny i wymaga potwierdzenia dostępności komponentów oraz warunków montażu po wizji lokalnej lub analizie technicznej.</p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="pv-info-row">
      <span className="pv-info-label">{label}</span>
      <span className="pv-info-value">{value}</span>
    </div>
  );
}
