import { useState, useEffect, useCallback, type FormEvent } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { getOfferSettings, updateOfferSettings } from './offerSettingsService';
import { Loader2, AlertCircle, Check, Building2, FileText, Settings2, Hash } from 'lucide-react';

export default function OfferSettingsPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [settingsId, setSettingsId] = useState('');

  // Form fields
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyNip, setCompanyNip] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [pdfFooterText, setPdfFooterText] = useState('');
  const [nextStepText, setNextStepText] = useState('');
  const [defaultRealizationTime, setDefaultRealizationTime] = useState('');
  const [defaultOfferValidDays, setDefaultOfferValidDays] = useState('14');
  const [defaultVatRate, setDefaultVatRate] = useState('8');
  const [offerNumberPrefix, setOfferNumberPrefix] = useState('PV');
  const [offerNumberNext, setOfferNumberNext] = useState('1');

  const loadSettings = useCallback(async () => {
    try {
      setError(null);
      const s = await getOfferSettings();
      setSettingsId(s.id);
      setCompanyName(s.company_name || '');
      setCompanyAddress(s.company_address || '');
      setCompanyNip(s.company_nip || '');
      setCompanyEmail(s.company_email || '');
      setCompanyPhone(s.company_phone || '');
      setPdfFooterText(s.pdf_footer_text || '');
      setNextStepText(s.next_step_text || '');
      setDefaultRealizationTime(s.default_realization_time || '');
      setDefaultOfferValidDays(String(s.default_offer_valid_days));
      setDefaultVatRate(String(s.default_vat_rate));
      setOfferNumberPrefix(s.offer_number_prefix);
      setOfferNumberNext(String(s.offer_number_next));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd ładowania ustawień');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  // Validation
  const validate = (): string | null => {
    const days = parseInt(defaultOfferValidDays);
    if (isNaN(days) || days < 1) return 'Ważność oferty musi być większa niż 0 dni.';

    const vat = parseFloat(defaultVatRate);
    if (isNaN(vat) || vat < 0) return 'Stawka VAT nie może być ujemna.';

    const next = parseInt(offerNumberNext);
    if (isNaN(next) || next < 1) return 'Następny numer oferty musi być >= 1.';

    if (companyEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyEmail.trim())) {
      return 'Podaj poprawny adres e-mail firmy.';
    }

    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !settingsId) return;

    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      await updateOfferSettings(settingsId, {
        company_name: companyName.trim() || null,
        company_address: companyAddress.trim() || null,
        company_nip: companyNip.trim() || null,
        company_email: companyEmail.trim() || null,
        company_phone: companyPhone.trim() || null,
        pdf_footer_text: pdfFooterText.trim() || null,
        next_step_text: nextStepText.trim() || null,
        default_realization_time: defaultRealizationTime.trim() || null,
        default_offer_valid_days: parseInt(defaultOfferValidDays) || 14,
        default_vat_rate: parseFloat(defaultVatRate) || 8,
        offer_number_prefix: offerNumberPrefix.trim() || 'PV',
        offer_number_next: parseInt(offerNumberNext) || 1,
        updated_by: profile?.id || null,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd zapisu ustawień');
    } finally {
      setSaving(false);
    }
  };

  const ic = 'w-full px-3 py-2.5 border border-surface-200 rounded-xl text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed';
  const label = 'block text-[11px] text-muted-500 font-medium mb-1';

  if (loading) {
    return (
      <>
        <PageHeader title="Ustawienia ofert" showBack />
        <div className="mt-16 flex flex-col items-center gap-2">
          <Loader2 size={28} className="animate-spin text-primary-500" />
          <p className="text-sm text-muted-500">Ładowanie ustawień...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Ustawienia ofert" showBack />
      <div className="px-4 py-4 mx-auto max-w-lg pb-24 md:pb-8">
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-100 rounded-xl">
              <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-xl">
              <Check size={18} className="text-green-600 shrink-0" />
              <p className="text-sm text-green-700 font-medium">Ustawienia zapisane pomyślnie.</p>
            </div>
          )}

          {/* Non-admin banner */}
          {!isAdmin && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">Tylko administrator może edytować ustawienia ofert.</p>
            </div>
          )}

          {/* ─── Company Data ─────────────────────────── */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Building2 size={16} className="text-primary-500" />
              <p className="text-xs font-bold text-gray-900 uppercase tracking-wide">Dane firmy</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className={label}>Nazwa firmy</label>
                <input value={companyName} onChange={e => setCompanyName(e.target.value)} className={ic} disabled={!isAdmin} placeholder="np. METICAL Sp. z o.o." />
              </div>
              <div>
                <label className={label}>Adres firmy</label>
                <input value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} className={ic} disabled={!isAdmin} placeholder="np. ul. Przykładowa 1, 00-000 Warszawa" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>NIP</label>
                  <input value={companyNip} onChange={e => setCompanyNip(e.target.value)} className={ic} disabled={!isAdmin} placeholder="np. 1234567890" />
                </div>
                <div>
                  <label className={label}>Telefon</label>
                  <input value={companyPhone} onChange={e => setCompanyPhone(e.target.value)} className={ic} disabled={!isAdmin} type="tel" placeholder="np. +48 123 456 789" />
                </div>
              </div>
              <div>
                <label className={label}>E-mail firmy</label>
                <input value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} className={ic} disabled={!isAdmin} type="email" placeholder="np. biuro@firma.pl" />
              </div>
            </div>
          </div>

          {/* ─── PDF Texts ────────────────────────────── */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={16} className="text-primary-500" />
              <p className="text-xs font-bold text-gray-900 uppercase tracking-wide">Teksty PDF</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className={label}>Stopka PDF</label>
                <textarea value={pdfFooterText} onChange={e => setPdfFooterText(e.target.value)} rows={3} className={`${ic} resize-none`} disabled={!isAdmin} placeholder="Tekst widoczny w stopce dokumentu PDF..." />
              </div>
              <div>
                <label className={label}>Tekst kolejnego kroku</label>
                <textarea value={nextStepText} onChange={e => setNextStepText(e.target.value)} rows={2} className={`${ic} resize-none`} disabled={!isAdmin} placeholder="np. Potwierdzenie zakresu, dostępności komponentów i terminu montażu." />
              </div>
              <div>
                <label className={label}>Domyślny czas realizacji</label>
                <input value={defaultRealizationTime} onChange={e => setDefaultRealizationTime(e.target.value)} className={ic} disabled={!isAdmin} placeholder="np. Do ustalenia po akceptacji oferty" />
              </div>
            </div>
          </div>

          {/* ─── Default Offer Params ─────────────────── */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Settings2 size={16} className="text-primary-500" />
              <p className="text-xs font-bold text-gray-900 uppercase tracking-wide">Domyślne parametry oferty</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Ważność oferty (dni)</label>
                <input value={defaultOfferValidDays} onChange={e => setDefaultOfferValidDays(e.target.value)} className={ic} disabled={!isAdmin} type="number" min="1" step="1" />
              </div>
              <div>
                <label className={label}>Domyślna stawka VAT (%)</label>
                <input value={defaultVatRate} onChange={e => setDefaultVatRate(e.target.value)} className={ic} disabled={!isAdmin} type="number" min="0" step="1" />
              </div>
            </div>
          </div>

          {/* ─── Numbering ────────────────────────────── */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Hash size={16} className="text-primary-500" />
              <p className="text-xs font-bold text-gray-900 uppercase tracking-wide">Numeracja ofert</p>
            </div>
            <p className="text-[10px] text-muted-400 mb-3">
              Pola numeracji są zapisywane w ustawieniach, ale nie są jeszcze podłączone do automatycznego generatora numerów ofert. Zmiana wymaga osobnego sprintu.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Prefix numeru</label>
                <input value={offerNumberPrefix} onChange={e => setOfferNumberPrefix(e.target.value)} className={ic} disabled={!isAdmin} placeholder="PV" />
              </div>
              <div>
                <label className={label}>Następny numer</label>
                <input value={offerNumberNext} onChange={e => setOfferNumberNext(e.target.value)} className={ic} disabled={!isAdmin} type="number" min="1" step="1" />
              </div>
            </div>
          </div>

          {/* ─── Submit ───────────────────────────────── */}
          {isAdmin && (
            <button
              type="submit"
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 active:scale-[0.98] transition-all disabled:opacity-60 shadow-sm"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              {saving ? 'Zapisywanie...' : 'Zapisz ustawienia'}
            </button>
          )}
        </form>
      </div>
    </>
  );
}
