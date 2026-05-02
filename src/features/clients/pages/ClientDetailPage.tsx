import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '@/components/layout/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { getClientById, updateClient } from '@/features/clients/services/clientService';
import type { Client } from '@/features/clients/services/clientService';
import { getClientComments, addClientComment } from '@/features/clients/services/clientCommentsService';
import type { ClientComment } from '@/features/clients/services/clientCommentsService';
import { getActiveProfiles } from '@/lib/services/profilesService';
import ClientComments from '@/features/clients/components/ClientComments';
import type { UserProfile } from '@/types/database';
import {
  Loader2, AlertCircle, Phone, Mail, MapPin, User, FileText,
  Pencil, X, Check, Link2, Construction, Building2, ExternalLink, Plus, Sun,
} from 'lucide-react';
import type { Investment } from '@/types/database';
import { getInvestmentsByClientId, createInvestment } from '@/features/investments/services/investmentsService';
import InvestmentFormModal from '@/features/investments/components/InvestmentFormModal';
import type { InvestmentFormData } from '@/features/investments/components/InvestmentFormModal';
import { INVESTMENT_TYPE_LABELS, INVESTMENT_STATUS_LABELS } from '@/lib/constants';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile: authProfile } = useAuth();
  const userId = user?.id ?? '';

  const [client, setClient] = useState<Client | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [comments, setComments] = useState<ClientComment[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Edit
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '', phone: '', email: '', city: '', address: '',
    source: '', assigned_to: '', notes: '',
  });

  const loadAll = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const [cl, pr, coms, invs] = await Promise.all([
        getClientById(id), getActiveProfiles(), getClientComments(id), getInvestmentsByClientId(id),
      ]);
      setClient(cl); setProfiles(pr); setComments(coms); setInvestments(invs);
    } catch (e) { setError(e instanceof Error ? e.message : 'Błąd'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const refreshAll = useCallback(async () => {
    if (!id) return;
    try {
      const [cl, coms, invs] = await Promise.all([getClientById(id), getClientComments(id), getInvestmentsByClientId(id)]);
      setClient(cl); setComments(coms); setInvestments(invs);
    } catch (e) { setError(e instanceof Error ? e.message : 'Błąd odświeżania'); }
  }, [id]);

  // Permissions
  const canEdit = client !== null && (
    client.created_by === userId ||
    client.assigned_to === userId ||
    authProfile?.role === 'admin' ||
    authProfile?.role === 'administracja'
  );

  const startEditing = () => {
    if (!client) return;
    setEditForm({
      full_name: client.full_name, phone: client.phone || '',
      email: client.email || '', city: client.city || '',
      address: client.address || '', source: client.source || '',
      assigned_to: client.assigned_to || '', notes: client.notes || '',
    });
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!client) return;
    if (!editForm.full_name.trim()) { setError('Imię jest wymagane.'); return; }
    setSavingEdit(true);
    try {
      const updated = await updateClient(client.id, {
        full_name: editForm.full_name.trim(),
        phone: editForm.phone.trim() || null,
        email: editForm.email.trim() || null,
        city: editForm.city.trim() || null,
        address: editForm.address.trim() || null,
        source: editForm.source.trim() || null,
        assigned_to: editForm.assigned_to || null,
        notes: editForm.notes.trim() || null,
      });
      setClient(updated); setEditing(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Błąd'); }
    finally { setSavingEdit(false); }
  };

  const handleComment = async (body: string) => {
    if (!client) return;
    setSubmittingComment(true);
    try { await addClientComment(client.id, body, userId); await refreshAll(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Błąd'); }
    finally { setSubmittingComment(false); }
  };

  const handleCreateInvestment = async (data: InvestmentFormData) => {
    if (!client) return;
    try {
      const newInv = await createInvestment({ ...data, client_id: client.id }, userId);
      setInvestments(prev => [newInv, ...prev]);
      setShowInvestmentModal(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd przy tworzeniu inwestycji');
    }
  };

  const profileName = (pid: string | null) => {
    if (!pid) return '—';
    const p = profiles.find(x => x.id === pid);
    return p ? (p.full_name || p.email) : pid.slice(0, 8);
  };

  const ic = 'w-full px-3 py-2 border border-surface-200 rounded-xl text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors';

  if (loading) return (
    <><PageHeader title="Klient" showBack />
      <div className="mt-16 flex flex-col items-center gap-2">
        <Loader2 size={28} className="animate-spin text-primary-500" /><p className="text-sm text-muted-500">Ładowanie...</p>
      </div></>
  );
  if (error && !client) return (
    <><PageHeader title="Klient" showBack />
      <div className="px-4 py-6 mx-auto max-w-lg"><div className="flex items-start gap-2 p-4 bg-red-50 border border-red-100 rounded-xl">
        <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" /><p className="text-sm text-red-700">{error}</p>
      </div></div></>
  );
  if (!client) return null;

  const activeProfiles = profiles.filter(p => p.is_active);

  return (
    <><PageHeader title="Klient" showBack />
      <div className="px-4 py-4 mx-auto max-w-lg space-y-4 pb-24">
        {error && <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" /><p className="text-sm text-red-700">{error}</p>
        </div>}

        {/* ─── Info card ─────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-start gap-2 mb-3">
            <h1 className="text-lg font-bold text-gray-900 flex-1">{client.full_name}</h1>
            {client.created_from_lead_id && (
              <button onClick={() => navigate(`/sales/leads/${client.created_from_lead_id}`)}
                className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-green-600 bg-green-50 hover:bg-green-100 transition-colors">
                <Link2 size={10} />Otwórz lead
              </button>
            )}
            {canEdit && !editing && (
              <button onClick={startEditing}
                className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 transition-colors">
                <Pencil size={12} />Edytuj
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-3 pt-3 border-t border-surface-100">
              <EditField label="Imię i nazwisko *" value={editForm.full_name} onChange={v => setEditForm({...editForm, full_name: v})} disabled={savingEdit} />
              <div className="grid grid-cols-2 gap-2">
                <EditField label="Telefon" value={editForm.phone} onChange={v => setEditForm({...editForm, phone: v})} disabled={savingEdit} type="tel" />
                <EditField label="E-mail" value={editForm.email} onChange={v => setEditForm({...editForm, email: v})} disabled={savingEdit} type="email" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <EditField label="Miejscowość" value={editForm.city} onChange={v => setEditForm({...editForm, city: v})} disabled={savingEdit} />
                <EditField label="Adres" value={editForm.address} onChange={v => setEditForm({...editForm, address: v})} disabled={savingEdit} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <EditField label="Źródło" value={editForm.source} onChange={v => setEditForm({...editForm, source: v})} disabled={savingEdit} />
                <div>
                  <label className="block text-[11px] text-muted-400 mb-1">Opiekun</label>
                  <select value={editForm.assigned_to} onChange={e => setEditForm({...editForm, assigned_to: e.target.value})} disabled={savingEdit} className={ic}>
                    <option value="">— brak —</option>
                    {activeProfiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-muted-400 mb-1">Notatki</label>
                <textarea value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})}
                  rows={3} disabled={savingEdit} className={`${ic} resize-none`} />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleSaveEdit} disabled={savingEdit}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 active:scale-[0.98] transition-all disabled:opacity-60">
                  {savingEdit ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {savingEdit ? 'Zapisywanie...' : 'Zapisz'}
                </button>
                <button onClick={() => setEditing(false)} disabled={savingEdit}
                  className="px-4 py-2.5 bg-surface-100 text-muted-600 text-sm font-semibold rounded-xl hover:bg-surface-200 transition-colors"><X size={16} /></button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 pt-3 border-t border-surface-100">
              {client.phone && <Row icon={<Phone size={16} className="text-primary-500" />} label="Telefon" value={client.phone} />}
              {client.email && <Row icon={<Mail size={16} className="text-muted-400" />} label="E-mail" value={client.email} />}
              {client.city && <Row icon={<MapPin size={16} className="text-muted-400" />} label="Miejscowość" value={client.city} />}
              {client.address && <Row icon={<MapPin size={16} className="text-muted-400" />} label="Adres" value={client.address} />}
              {client.source && <Row icon={<FileText size={16} className="text-muted-400" />} label="Źródło" value={client.source} />}
              <Row icon={<User size={16} className="text-muted-400" />} label="Opiekun" value={profileName(client.assigned_to)} />
              <Row icon={<User size={16} className="text-muted-400" />} label="Utworzył(a)" value={profileName(client.created_by)} />
              {client.notes && <Row icon={<FileText size={16} className="text-muted-400" />} label="Notatki" value={client.notes} />}
            </div>
          )}
        </div>

        {/* ─── Source ────────────────────────────────────── */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Link2 size={16} className="text-muted-400" />
            <p className="text-xs font-medium text-muted-500 uppercase tracking-wide">Źródło klienta</p>
          </div>
          {client.created_from_lead_id ? (
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">Klient utworzony z leada</p>
              <button onClick={() => navigate(`/sales/leads/${client.created_from_lead_id}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 transition-colors">
                <ExternalLink size={14} />Otwórz źródłowego leada
              </button>
            </div>
          ) : (
            <p className="text-sm font-medium text-gray-900">Klient dodany ręcznie</p>
          )}
        </div>

        {/* ─── Create PV Offer ─────────────────────────── */}
        <button onClick={() => navigate(`/sales/offers/pv/new?clientId=${client.id}`)}
          className="card w-full p-4 text-left hover:bg-primary-50 transition-colors flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
            <Sun size={20} className="text-primary-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900">Utwórz ofertę PV</p>
            <p className="text-xs text-muted-500">Otwórz formularz oferty z danymi tego klienta</p>
          </div>
        </button>

        {/* ─── Comments ─────────────────────────────── */}
        <ClientComments comments={comments} profiles={profiles}
          submitting={submittingComment} onSubmit={handleComment} />

        {/* ─── Client Investments ─────────────────────── */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-primary-500" />
              <p className="text-xs font-bold text-gray-900 uppercase tracking-wide">Inwestycje klienta</p>
            </div>
            {canEdit && (
              <button onClick={() => setShowInvestmentModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-lg text-xs font-semibold transition-colors">
                <Plus size={14} />Utwórz inwestycję
              </button>
            )}
          </div>
          {investments.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-500 border border-dashed border-surface-200 rounded-xl bg-surface-50">
              Brak inwestycji dla tego klienta.
            </div>
          ) : (
            <div className="space-y-3">
              {investments.map(inv => (
                <div key={inv.id} onClick={() => navigate(`/investments/${inv.id}`)}
                  className="group flex items-center justify-between p-3 rounded-xl border border-surface-200 bg-surface-50 hover:border-primary-200 hover:bg-primary-50/50 transition-all cursor-pointer">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-primary-700 truncate">{inv.name}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-surface-200 text-gray-700 text-[10px] font-medium whitespace-nowrap">
                        {INVESTMENT_TYPE_LABELS[inv.investment_type] || inv.investment_type}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-surface-200 text-gray-700 text-[10px] font-medium whitespace-nowrap">
                        {INVESTMENT_STATUS_LABELS[inv.status] || inv.status}
                      </span>
                    </div>
                  </div>
                  <ExternalLink size={16} className="text-muted-400 group-hover:text-primary-500 ml-3 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card p-4 opacity-60">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={16} className="text-muted-400" />
            <p className="text-xs font-medium text-muted-500 uppercase tracking-wide">Dokumenty i zdjęcia</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Construction size={12} className="text-muted-400" />
            <p className="text-sm text-muted-400">W przygotowaniu</p>
          </div>
        </div>
      </div>

      {showInvestmentModal && client && (
        <InvestmentFormModal
          onClose={() => setShowInvestmentModal(false)}
          onSubmit={handleCreateInvestment}
          initialData={{
            client_name: client.full_name,
            client_phone: client.phone || '',
            client_email: client.email || '',
            investment_address: client.address || client.city || '',
          }}
        />
      )}
    </>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-400 leading-tight">{label}</p>
        <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
      </div>
    </div>
  );
}

function EditField({ label, value, onChange, disabled, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; disabled: boolean; type?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] text-muted-400 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        className="w-full px-3 py-2 border border-surface-200 rounded-xl text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors" />
    </div>
  );
}
