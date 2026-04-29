import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  INVESTMENT_TYPES,
  INVESTMENT_TYPE_LABELS,
  INVESTMENT_STATUSES,
  INVESTMENT_STATUS_LABELS,
} from '@/lib/constants';
import { X, Loader2, Plus } from 'lucide-react';

interface InvestmentFormModalProps {
  onSubmit: (data: InvestmentFormData) => Promise<void>;
  onClose: () => void;
}

export interface InvestmentFormData {
  name: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  investment_address: string;
  investment_type: string;
  status: string;
  deposit_paid: boolean;
  components_note: string;
}

export default function InvestmentFormModal({
  onSubmit,
  onClose,
}: InvestmentFormModalProps) {
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [address, setAddress] = useState('');
  const [investmentType, setInvestmentType] = useState('pv');
  const [status, setStatus] = useState('czeka_na_wplate');
  const [depositPaid, setDepositPaid] = useState(false);
  const [componentsNote, setComponentsNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Podaj nazwę inwestycji.');
      return;
    }
    if (!clientName.trim()) {
      setError('Podaj nazwę klienta.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        client_name: clientName.trim(),
        client_phone: clientPhone.trim(),
        client_email: clientEmail.trim(),
        investment_address: address.trim(),
        investment_type: investmentType,
        status,
        deposit_paid: depositPaid,
        components_note: componentsNote.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd tworzenia inwestycji');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-4 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors bg-surface-50';

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[90dvh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-surface-200 px-5 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-base font-semibold text-slate-900">
            Nowa inwestycja
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-400 hover:bg-surface-100 hover:text-muted-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label htmlFor="inv-name" className="block text-sm font-medium text-slate-700 mb-1.5">
              Nazwa inwestycji *
            </label>
            <input
              id="inv-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Np. PV Kowalski 10kW"
              className={inputClass}
              disabled={submitting}
              autoFocus
            />
          </div>

          {/* Client name */}
          <div>
            <label htmlFor="inv-client" className="block text-sm font-medium text-slate-700 mb-1.5">
              Klient *
            </label>
            <input
              id="inv-client"
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Jan Kowalski"
              className={inputClass}
              disabled={submitting}
            />
          </div>

          {/* Phone + Email row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="inv-phone" className="block text-sm font-medium text-slate-700 mb-1.5">
                Telefon
              </label>
              <input
                id="inv-phone"
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="600 100 200"
                className={inputClass}
                disabled={submitting}
              />
            </div>
            <div>
              <label htmlFor="inv-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                E-mail
              </label>
              <input
                id="inv-email"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="klient@firma.pl"
                className={inputClass}
                disabled={submitting}
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label htmlFor="inv-address" className="block text-sm font-medium text-slate-700 mb-1.5">
              Adres inwestycji
            </label>
            <input
              id="inv-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="ul. Kwiatowa 5, Kraków"
              className={inputClass}
              disabled={submitting}
            />
          </div>

          {/* Type + Status row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="inv-type" className="block text-sm font-medium text-slate-700 mb-1.5">
                Typ
              </label>
              <select
                id="inv-type"
                value={investmentType}
                onChange={(e) => setInvestmentType(e.target.value)}
                className={inputClass}
                disabled={submitting}
              >
                {INVESTMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {INVESTMENT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="inv-status" className="block text-sm font-medium text-slate-700 mb-1.5">
                Status
              </label>
              <select
                id="inv-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={inputClass}
                disabled={submitting}
              >
                {INVESTMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {INVESTMENT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Deposit toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={depositPaid}
              onChange={(e) => setDepositPaid(e.target.checked)}
              className="w-5 h-5 rounded-lg border-surface-300 text-primary-600 focus:ring-primary-500/30"
              disabled={submitting}
            />
            <span className="text-sm font-medium text-slate-700">
              Zaliczka wpłacona
            </span>
          </label>

          {/* Components note */}
          <div>
            <label htmlFor="inv-note" className="block text-sm font-medium text-slate-700 mb-1.5">
              Notatki / komponenty
            </label>
            <textarea
              id="inv-note"
              value={componentsNote}
              onChange={(e) => setComponentsNote(e.target.value)}
              placeholder="Lista komponentów, notatki..."
              rows={3}
              className={`${inputClass} resize-none`}
              disabled={submitting}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 active:scale-[0.98] transition-all shadow-sm disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Plus size={18} />
            )}
            {submitting ? 'Tworzenie...' : 'Utwórz inwestycję'}
          </button>
        </form>
      </div>
    </div>
  );
}
