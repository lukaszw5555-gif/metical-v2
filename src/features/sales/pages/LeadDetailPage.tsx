import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import PageHeader from '@/components/layout/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { getLeadById, updateLead, updateLeadStatus, toggleLeadFavorite } from '@/features/sales/services/salesLeadService';
import { getLeadComments, addLeadComment } from '@/features/sales/services/leadCommentsService';
import { getActiveProfiles } from '@/lib/services/profilesService';
import LeadComments from '@/features/sales/components/LeadComments';
import type { SalesLead, SalesLeadStatus, LeadComment, UserProfile } from '@/types/database';
import {
  LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, LEAD_STATUSES,
  LEAD_SOURCE_LABELS, LEAD_SERVICE_TYPE_LABELS,
  LEAD_SOURCES, LEAD_SERVICE_TYPES,
} from '@/lib/constants';
import {
  Loader2, AlertCircle, Phone, Mail, MapPin, User, Star,
  CalendarClock, FileText, ChevronDown, ChevronUp, Pencil, X, Check, Tag,
} from 'lucide-react';

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile: authProfile } = useAuth();
  const userId = user?.id ?? '';

  const [lead, setLead] = useState<SalesLead | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [comments, setComments] = useState<LeadComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [showStatusPanel, setShowStatusPanel] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '', phone: '', email: '', city: '', source: 'manual',
    service_type: '', qualification_note: '',
    primary_assigned_to: '', secondary_assigned_to: '',
    next_follow_up_at: '', follow_up_note: '',
  });

  const loadAll = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const [ld, pr, coms] = await Promise.all([
        getLeadById(id), getActiveProfiles(), getLeadComments(id),
      ]);
      setLead(ld); setProfiles(pr); setComments(coms);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd ładowania');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const refreshLead = useCallback(async () => {
    if (!id) return;
    try {
      const [ld, coms] = await Promise.all([getLeadById(id), getLeadComments(id)]);
      setLead(ld); setComments(coms);
    } catch (e) { console.error(e); }
  }, [id]);

  // Permissions
  const canEdit = lead !== null && (
    lead.created_by === userId ||
    lead.primary_assigned_to === userId ||
    lead.secondary_assigned_to === userId ||
    authProfile?.role === 'admin' ||
    authProfile?.role === 'administracja'
  );

  // Status change
  const handleStatus = async (s: SalesLeadStatus) => {
    if (!lead || lead.status === s) return;
    setUpdatingStatus(s);
    try {
      setLead(await updateLeadStatus(lead.id, s));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd zmiany statusu');
    } finally { setUpdatingStatus(null); }
  };

  // Favorite
  const handleFavorite = async () => {
    if (!lead) return;
    try { setLead(await toggleLeadFavorite(lead.id, !lead.is_favorite)); }
    catch (e) { console.error(e); }
  };

  // Edit
  const startEditing = () => {
    if (!lead) return;
    const fmtDate = (iso: string | null) => {
      if (!iso) return '';
      return new Date(iso).toISOString().slice(0, 10);
    };
    setEditForm({
      full_name: lead.full_name, phone: lead.phone,
      email: lead.email || '', city: lead.city || '',
      source: lead.source, service_type: lead.service_type || '',
      qualification_note: lead.qualification_note || '',
      primary_assigned_to: lead.primary_assigned_to || '',
      secondary_assigned_to: lead.secondary_assigned_to || '',
      next_follow_up_at: fmtDate(lead.next_follow_up_at),
      follow_up_note: lead.follow_up_note || '',
    });
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!lead) return;
    if (!editForm.full_name.trim() || !editForm.phone.trim()) {
      setError('Imię i telefon są wymagane.'); return;
    }
    setSavingEdit(true);
    try {
      const updated = await updateLead(lead.id, {
        full_name: editForm.full_name.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim() || null,
        city: editForm.city.trim() || null,
        source: editForm.source,
        service_type: editForm.service_type || null,
        qualification_note: editForm.qualification_note.trim() || null,
        primary_assigned_to: editForm.primary_assigned_to || null,
        secondary_assigned_to: editForm.secondary_assigned_to || null,
        next_follow_up_at: editForm.next_follow_up_at ? new Date(editForm.next_follow_up_at).toISOString() : null,
        follow_up_note: editForm.follow_up_note.trim() || null,
      });
      setLead(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd zapisu');
    } finally { setSavingEdit(false); }
  };

  // Comment
  const handleComment = async (body: string) => {
    if (!lead) return;
    setSubmittingComment(true);
    try {
      await addLeadComment(lead.id, body, userId);
      await refreshLead();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd komentarza');
    } finally { setSubmittingComment(false); }
  };

  // Helpers
  const profileName = (pid: string | null) => {
    if (!pid) return '—';
    const p = profiles.find((x) => x.id === pid);
    return p ? (p.full_name || p.email) : pid.slice(0, 8);
  };
  const fmtDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const ic = 'w-full px-3 py-2 border border-surface-200 rounded-xl text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors';

  // Loading / Error
  if (loading) return (
    <><PageHeader title="Lead" showBack />
      <div className="mt-16 flex flex-col items-center gap-2">
        <Loader2 size={28} className="animate-spin text-primary-500" /><p className="text-sm text-muted-500">Ładowanie...</p>
      </div></>
  );
  if (error && !lead) return (
    <><PageHeader title="Lead" showBack />
      <div className="px-4 py-6 mx-auto max-w-lg">
        <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-100 rounded-xl">
          <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" /><p className="text-sm text-red-700">{error}</p>
        </div></div></>
  );
  if (!lead) return null;

  const sc = LEAD_STATUS_COLORS[lead.status];
  const activeProfiles = profiles.filter(p => p.is_active);

  return (
    <><PageHeader title="Lead" showBack />
      <div className="px-4 py-4 mx-auto max-w-lg space-y-4 pb-24">
        {error && <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" /><p className="text-sm text-red-700">{error}</p>
        </div>}

        {/* ─── Info card ────────────────────────────────── */}
        <div className="card p-5">
          {/* Chips */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: sc + '18', color: sc }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sc }} />
              {LEAD_STATUS_LABELS[lead.status]}
            </span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary-50 text-primary-700">
              {LEAD_SOURCE_LABELS[lead.source]}
            </span>
            {lead.service_type && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-surface-100 text-muted-600">
                <Tag size={10} />{LEAD_SERVICE_TYPE_LABELS[lead.service_type]}
              </span>
            )}
          </div>

          {/* Title + actions */}
          <div className="flex items-start gap-2 mb-3">
            <h1 className="text-lg font-bold text-gray-900 flex-1">{lead.full_name}</h1>
            <button onClick={handleFavorite}
              className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                lead.is_favorite ? 'bg-amber-50 text-amber-500' : 'bg-surface-50 text-muted-300 hover:text-amber-500'}`}>
              <Star size={16} className={lead.is_favorite ? 'fill-amber-500' : ''} />
            </button>
            {canEdit && !editing && (
              <button onClick={startEditing}
                className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 transition-colors">
                <Pencil size={12} />Edytuj
              </button>
            )}
          </div>

          {/* Edit form OR readonly */}
          {editing ? (
            <div className="space-y-3 pt-3 border-t border-surface-100">
              <EditField label="Imię i nazwisko *" value={editForm.full_name}
                onChange={(v) => setEditForm({ ...editForm, full_name: v })} disabled={savingEdit} />
              <div className="grid grid-cols-2 gap-2">
                <EditField label="Telefon *" value={editForm.phone}
                  onChange={(v) => setEditForm({ ...editForm, phone: v })} disabled={savingEdit} type="tel" />
                <EditField label="E-mail" value={editForm.email}
                  onChange={(v) => setEditForm({ ...editForm, email: v })} disabled={savingEdit} type="email" />
              </div>
              <EditField label="Miejscowość" value={editForm.city}
                onChange={(v) => setEditForm({ ...editForm, city: v })} disabled={savingEdit} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-muted-400 mb-1">Źródło</label>
                  <select value={editForm.source} onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
                    disabled={savingEdit} className={ic}>
                    {LEAD_SOURCES.map((s) => <option key={s} value={s}>{LEAD_SOURCE_LABELS[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-muted-400 mb-1">Typ usługi</label>
                  <select value={editForm.service_type} onChange={(e) => setEditForm({ ...editForm, service_type: e.target.value })}
                    disabled={savingEdit} className={ic}>
                    <option value="">— brak —</option>
                    {LEAD_SERVICE_TYPES.map((t) => <option key={t} value={t}>{LEAD_SERVICE_TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-muted-400 mb-1">Główny opiekun</label>
                  <select value={editForm.primary_assigned_to} onChange={(e) => setEditForm({ ...editForm, primary_assigned_to: e.target.value })}
                    disabled={savingEdit} className={ic}>
                    <option value="">— brak —</option>
                    {activeProfiles.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-muted-400 mb-1">Druga osoba</label>
                  <select value={editForm.secondary_assigned_to} onChange={(e) => setEditForm({ ...editForm, secondary_assigned_to: e.target.value })}
                    disabled={savingEdit} className={ic}>
                    <option value="">— brak —</option>
                    {activeProfiles.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-muted-400 mb-1">Notatka kwalifikacyjna</label>
                <textarea value={editForm.qualification_note}
                  onChange={(e) => setEditForm({ ...editForm, qualification_note: e.target.value })}
                  rows={2} disabled={savingEdit} className={`${ic} resize-none`} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <EditField label="Follow-up (data)" value={editForm.next_follow_up_at}
                  onChange={(v) => setEditForm({ ...editForm, next_follow_up_at: v })} disabled={savingEdit} type="date" />
                <EditField label="Notatka follow-up" value={editForm.follow_up_note}
                  onChange={(v) => setEditForm({ ...editForm, follow_up_note: v })} disabled={savingEdit} />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleSaveEdit} disabled={savingEdit}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 active:scale-[0.98] transition-all disabled:opacity-60">
                  {savingEdit ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {savingEdit ? 'Zapisywanie...' : 'Zapisz'}
                </button>
                <button onClick={() => setEditing(false)} disabled={savingEdit}
                  className="px-4 py-2.5 bg-surface-100 text-muted-600 text-sm font-semibold rounded-xl hover:bg-surface-200 transition-colors disabled:opacity-60">
                  <X size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 pt-3 border-t border-surface-100">
              <Row icon={<Phone size={16} className="text-primary-500" />} label="Telefon" value={lead.phone} />
              {lead.email && <Row icon={<Mail size={16} className="text-muted-400" />} label="E-mail" value={lead.email} />}
              {lead.city && <Row icon={<MapPin size={16} className="text-muted-400" />} label="Miejscowość" value={lead.city} />}
              <Row icon={<User size={16} className="text-muted-400" />} label="Główny opiekun" value={profileName(lead.primary_assigned_to)} />
              {lead.secondary_assigned_to && <Row icon={<User size={16} className="text-muted-400" />} label="Druga osoba" value={profileName(lead.secondary_assigned_to)} />}
              {lead.qualification_note && <Row icon={<FileText size={16} className="text-muted-400" />} label="Notatka kwalifikacyjna" value={lead.qualification_note} />}
              <Row icon={<CalendarClock size={16} className="text-muted-400" />} label="Follow-up" value={fmtDate(lead.next_follow_up_at)} />
              {lead.follow_up_note && <Row icon={<FileText size={16} className="text-muted-400" />} label="Notatka follow-up" value={lead.follow_up_note} />}
              <Row icon={<User size={16} className="text-muted-400" />} label="Utworzone przez" value={profileName(lead.created_by)} />
            </div>
          )}

          {/* Inline status changer */}
          <div className="mt-4 pt-3 border-t border-surface-100">
            <button onClick={() => setShowStatusPanel(!showStatusPanel)}
              className="flex items-center gap-2 w-full text-left">
              <p className="text-xs font-medium text-muted-500 uppercase tracking-wide flex-1">Zmień status</p>
              {showStatusPanel ? <ChevronUp size={14} className="text-muted-400" /> : <ChevronDown size={14} className="text-muted-400" />}
            </button>
            {showStatusPanel && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {LEAD_STATUSES.map((s) => {
                  const active = lead.status === s;
                  const updating = updatingStatus === s;
                  const col = LEAD_STATUS_COLORS[s];
                  return (
                    <button key={s} onClick={() => handleStatus(s)}
                      disabled={active || updatingStatus !== null}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        active ? 'ring-2 ring-offset-1 text-white' : 'hover:opacity-80 active:scale-[0.97]'
                      } disabled:opacity-50`}
                      style={{ backgroundColor: active ? col : col + '18', color: active ? 'white' : col }}>
                      {updating ? <Loader2 size={12} className="animate-spin" /> :
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: active ? 'white' : col }} />}
                      {LEAD_STATUS_LABELS[s]}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── Comments ──────────────────────────────────── */}
        <LeadComments comments={comments} profiles={profiles}
          submitting={submittingComment} onSubmit={handleComment} />
      </div>
    </>
  );
}

// Reusable helpers
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
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-surface-200 rounded-xl text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors" />
    </div>
  );
}
