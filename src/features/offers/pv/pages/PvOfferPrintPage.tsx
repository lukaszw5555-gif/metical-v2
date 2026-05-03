import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPvOfferById } from '../services/pvOfferService';
import { getPvOfferItems } from '../services/pvOfferItemsService';
import { generatePvOfferServerPdfBlob, downloadPdfBlob } from '../services/exportPvOfferServerPdf';
import type { PvOffer, PvOfferItem } from '../types/pvOfferTypes';
import { PV_OFFER_TYPE_LABELS } from '../types/pvOfferTypes';
import { Loader2, AlertCircle, ArrowLeft, Download, RefreshCw } from 'lucide-react';
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

  // PDF preview state
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewBlob, setPdfPreviewBlob] = useState<Blob | null>(null);
  const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false);
  const [pdfPreviewError, setPdfPreviewError] = useState<string | null>(null);
  const [sourceReady, setSourceReady] = useState(false);

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

  // ─── Compute filename ─────────────────────────────────
  const pdfFilename = offer
    ? `oferta-pv-${(offer.offer_number || offer.id).replace(/[/\\]/g, '-').replace(/[^a-zA-Z0-9_-]/g, '')}`
    : 'oferta-pv';

  // ─── Mark hidden source DOM as ready after render ─────
  useEffect(() => {
    if (offer && items.length >= 0 && !loading) {
      // Wait for next frame so DOM is fully painted
      const raf = requestAnimationFrame(() => {
        setSourceReady(true);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [offer, items, loading]);

  // ─── Generate PDF preview once source is ready ────────
  const generatePreview = useCallback(async () => {
    if (!docRef.current || !offer) return;
    setPdfPreviewLoading(true);
    setPdfPreviewError(null);

    // Revoke previous URL
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
    setPdfPreviewBlob(null);

    try {
      const blob = await generatePvOfferServerPdfBlob(docRef.current, pdfFilename);
      const url = URL.createObjectURL(blob);
      setPdfPreviewBlob(blob);
      setPdfPreviewUrl(url);
    } catch (e) {
      console.error('[PDF Preview] Failed:', e);
      setPdfPreviewError(e instanceof Error ? e.message : 'Nie udało się wygenerować podglądu PDF.');
    } finally {
      setPdfPreviewLoading(false);
    }
  }, [offer, pdfFilename, pdfPreviewUrl]);

  useEffect(() => {
    if (sourceReady && offer && !pdfPreviewUrl && !pdfPreviewLoading && !pdfPreviewError) {
      generatePreview();
    }
  }, [sourceReady, offer, pdfPreviewUrl, pdfPreviewLoading, pdfPreviewError, generatePreview]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    };
  }, [pdfPreviewUrl]);

  // ─── Download handler (with double-click guard) ───────
  const handleDownload = async () => {
    if (!offer || !docRef.current) return;
    if (exporting) return; // ← guard against double-tap on mobile
    setExporting(true);
    try {
      // Re-use existing blob if available
      const blob = pdfPreviewBlob || await generatePvOfferServerPdfBlob(docRef.current, pdfFilename);
      downloadPdfBlob(blob, pdfFilename);
    } catch (err) {
      console.error('[PDF] Download failed:', err);
      alert('Nie udało się wygenerować PDF premium. Spróbuj ponownie.\n\nSzczegóły są w konsoli / logach Vercel.');
    } finally {
      setExporting(false);
    }
  };

  // ─── Loading / Error states ───────────────────────────
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

  // ─── Calculations ──────────────────────────────────────
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
        <button type="button" onClick={() => navigate(`/sales/offers/pv/${offer.id}`)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-600 bg-white hover:bg-surface-100 transition-colors">
          <ArrowLeft size={14} />Wróć do oferty
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={generatePreview}
            disabled={pdfPreviewLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-muted-600 bg-white hover:bg-surface-100 transition-colors disabled:opacity-60">
            <RefreshCw size={14} className={pdfPreviewLoading ? 'animate-spin' : ''} />
            Odśwież
          </button>
          <button
            type="button"
            disabled={exporting || pdfPreviewLoading}
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 active:scale-[0.98] transition-all shadow-sm disabled:opacity-60">
            {exporting ? <><Loader2 size={16} className="animate-spin" />Pobieranie...</> : <><Download size={16} />Pobierz PDF</>}
          </button>
        </div>
      </div>

      {/* ═══ REAL PDF PREVIEW ═══════════════════════════ */}
      <div className="no-print" style={{ maxWidth: 820, margin: '0 auto' }}>
        {pdfPreviewLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '60px 16px', background: '#fff', borderRadius: 12, boxShadow: '0 2px 24px rgba(30,30,60,.08)' }}>
            <Loader2 size={28} className="animate-spin text-primary-500" />
            <p style={{ fontSize: 13, color: '#7a7a9a' }}>Generowanie podglądu PDF...</p>
          </div>
        )}

        {pdfPreviewError && !pdfPreviewLoading && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, marginBottom: 12 }}>
            <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontSize: 13, color: '#b91c1c', margin: 0 }}>{pdfPreviewError}</p>
              <button onClick={generatePreview} style={{ fontSize: 12, color: '#2563eb', marginTop: 6, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Spróbuj ponownie
              </button>
            </div>
          </div>
        )}

        {pdfPreviewUrl && !pdfPreviewLoading && (
          <iframe
            src={pdfPreviewUrl}
            title="Podgląd PDF"
            style={{
              width: '100%',
              height: 'calc(100vh - 120px)',
              border: 'none',
              borderRadius: 12,
              boxShadow: '0 2px 24px rgba(30,30,60,.08)',
              background: '#fff',
            }}
          />
        )}
      </div>

      {/* ═══ HIDDEN HTML SOURCE — used by generator only ═══ */}
      <div className="pv-print-doc pv-print-doc-source" ref={docRef}>

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

        {/* H. Footer — screen preview instance (hidden in server render by API) */}
        <div className="pv-print-footer">
          <p><strong>METICAL Sp. z o.o.</strong></p>
          <p>Oferta ma charakter informacyjny i wymaga potwierdzenia dostępności komponentów oraz warunków montażu po wizji lokalnej lub analizie technicznej.</p>
        </div>

      </div>{/* end pv-print-doc-source */}
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
