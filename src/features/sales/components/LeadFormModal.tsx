import { useState } from 'react';
import type { FormEvent } from 'react';
import type { UserProfile } from '@/types/database';
import {
  LEAD_SOURCES, LEAD_SOURCE_LABELS,
  LEAD_SERVICE_TYPES, LEAD_SERVICE_TYPE_LABELS,
} from '@/lib/constants';
import { X, Loader2, Plus } from 'lucide-react';

interface LeadFormModalProps {
  onSubmit: (data: LeadFormData) => Promise<void>;
  onClose: () => void;
  profiles: UserProfile[];
}

export interface LeadFormData {
  full_name: string;
  phone: string;
  email: string;
  city: string;
  source: string;
  service_type: string;
  qualification_note: string;
  primary_assigned_to: string;
  secondary_assigned_to: string;
  next_follow_up_at: string;
  follow_up_note: string;
}

export default function LeadFormModal({ onSubmit, onClose, profiles }: LeadFormModalProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [source, setSource] = useState('manual');
  const [serviceType, setServiceType] = useState('');
  const [qualNote, setQualNote] = useState('');
  const [primaryAssigned, setPrimaryAssigned] = useState('');
  const [secondaryAssigned, setSecondaryAssigned] = useState('');
  const [followUpAt, setFollowUpAt] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) { setError('Podaj imię i nazwisko.'); return; }
    if (!phone.trim()) { setError('Podaj numer telefonu.'); return; }

    setSubmitting(true);
    try {
      await onSubmit({
        full_name: fullName.trim(), phone: phone.trim(), email: email.trim(),
        city: city.trim(), source, service_type: serviceType,
        qualification_note: qualNote.trim(),
        primary_assigned_to: primaryAssigned, secondary_assigned_to: secondaryAssigned,
        next_follow_up_at: followUpAt, follow_up_note: followUpNote.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd tworzenia leadu');
    } finally { setSubmitting(false); }
  };

  const ic = 'w-full px-4 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors bg-surface-50';
  const activeProfiles = profiles.filter((p) => p.is_active);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[90dvh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-surface-200 px-5 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-base font-semibold text-gray-900">Nowy lead</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-400 hover:bg-surface-100 hover:text-muted-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Imię i nazwisko *</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
              placeholder="Jan Kowalski" className={ic} disabled={submitting} autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefon *</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="600 100 200" className={ic} disabled={submitting} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="klient@firma.pl" className={ic} disabled={submitting} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Miejscowość</label>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                placeholder="Kraków" className={ic} disabled={submitting} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Źródło *</label>
              <select value={source} onChange={(e) => setSource(e.target.value)} className={ic} disabled={submitting}>
                {LEAD_SOURCES.map((s) => <option key={s} value={s}>{LEAD_SOURCE_LABELS[s]}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Typ usługi</label>
            <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} className={ic} disabled={submitting}>
              <option value="">— nie wybrano —</option>
              {LEAD_SERVICE_TYPES.map((t) => <option key={t} value={t}>{LEAD_SERVICE_TYPE_LABELS[t]}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Główny opiekun</label>
              <select value={primaryAssigned} onChange={(e) => setPrimaryAssigned(e.target.value)} className={ic} disabled={submitting}>
                <option value="">— brak —</option>
                {activeProfiles.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Druga osoba</label>
              <select value={secondaryAssigned} onChange={(e) => setSecondaryAssigned(e.target.value)} className={ic} disabled={submitting}>
                <option value="">— brak —</option>
                {activeProfiles.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notatka kwalifikacyjna</label>
            <textarea value={qualNote} onChange={(e) => setQualNote(e.target.value)}
              placeholder="Np. klient zainteresowany PV 10kW..." rows={2}
              className={`${ic} resize-none`} disabled={submitting} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Follow-up</label>
              <input type="date" value={followUpAt} onChange={(e) => setFollowUpAt(e.target.value)}
                className={ic} disabled={submitting} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notatka follow-up</label>
              <input type="text" value={followUpNote} onChange={(e) => setFollowUpNote(e.target.value)}
                placeholder="Zadzwonić..." className={ic} disabled={submitting} />
            </div>
          </div>

          <button type="submit" disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 active:scale-[0.98] transition-all shadow-sm disabled:opacity-60">
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            {submitting ? 'Tworzenie...' : 'Dodaj lead'}
          </button>
        </form>
      </div>
    </div>
  );
}
