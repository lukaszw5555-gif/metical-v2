import { useState } from 'react';
import type { UserProfile } from '@/types/database';
import { X, Plus, Loader2 } from 'lucide-react';

export interface ClientFormData {
  full_name: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  source: string;
  assigned_to: string;
  notes: string;
}

interface Props {
  onSubmit: (data: ClientFormData) => Promise<void>;
  onClose: () => void;
  profiles: UserProfile[];
}

export default function ClientFormModal({ onSubmit, onClose, profiles }: Props) {
  const [form, setForm] = useState<ClientFormData>({
    full_name: '', phone: '', email: '', city: '', address: '',
    source: '', assigned_to: '', notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async () => {
    if (!form.full_name.trim()) { setError('Imię i nazwisko jest wymagane.'); return; }
    setSubmitting(true);
    try { await onSubmit(form); }
    catch (e) { setError(e instanceof Error ? e.message : 'Błąd'); setSubmitting(false); }
  };

  const ic = 'w-full px-3 py-2 border border-surface-200 rounded-xl text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors';
  const activeProfiles = profiles.filter(p => p.is_active);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-t-2xl shadow-xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white z-10 flex items-center gap-3 p-4 border-b border-surface-100">
          <h2 className="text-base font-bold text-gray-900 flex-1">Nowy klient</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center">
            <X size={16} className="text-muted-500" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-[11px] text-muted-400 mb-1">Imię i nazwisko *</label>
            <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={ic} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-muted-400 mb-1">Telefon</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={ic} />
            </div>
            <div>
              <label className="block text-[11px] text-muted-400 mb-1">E-mail</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={ic} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-muted-400 mb-1">Miejscowość</label>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={ic} />
            </div>
            <div>
              <label className="block text-[11px] text-muted-400 mb-1">Adres</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={ic} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-muted-400 mb-1">Źródło</label>
              <input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className={ic} placeholder="np. polecenie, lead" />
            </div>
            <div>
              <label className="block text-[11px] text-muted-400 mb-1">Opiekun</label>
              <select value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} className={ic}>
                <option value="">— brak —</option>
                {activeProfiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-muted-400 mb-1">Notatki</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2} className={`${ic} resize-none`} />
          </div>
          <button onClick={handle} disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 active:scale-[0.98] transition-all disabled:opacity-60">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {submitting ? 'Tworzenie...' : 'Dodaj klienta'}
          </button>
        </div>
      </div>
    </div>
  );
}
