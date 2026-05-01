import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/layout/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { getLeads, updateLead, updateLeadStatus } from '@/features/sales/services/salesLeadService';
import { logLeadActivity } from '@/features/sales/services/leadActivityService';
import { getActiveProfiles } from '@/lib/services/profilesService';
import type { SalesLead, SalesLeadStatus, UserProfile } from '@/types/database';
import {
  LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, LEAD_STATUSES,
  LEAD_SOURCE_LABELS, LEAD_SERVICE_TYPE_LABELS,
} from '@/lib/constants';
import {
  Loader2, AlertCircle, CalendarClock, Phone, User, Star,
  AlertTriangle, Clock, Pencil, X, Check, Tag,
  ChevronDown, ChevronUp, ArrowRightCircle,
} from 'lucide-react';

type Section = 'overdue' | 'today' | 'future';

export default function FollowUpPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<Section>('overdue');

  // Per-lead inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fuDate, setFuDate] = useState('');
  const [fuNote, setFuNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Per-lead status panel
  const [statusOpenId, setStatusOpenId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [ld, pr] = await Promise.all([getLeads(), getActiveProfiles()]);
      setLeads(ld); setProfiles(pr);
    } catch (e) { setError(e instanceof Error ? e.message : 'Błąd'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const todayStart = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);
  const todayEnd = useMemo(() => {
    const d = new Date(); d.setHours(23, 59, 59, 999); return d;
  }, []);

  const { overdue, today, future } = useMemo(() => {
    const withFU = leads.filter(l => l.next_follow_up_at);
    return {
      overdue: withFU.filter(l => new Date(l.next_follow_up_at!) < todayStart),
      today: withFU.filter(l => { const d = new Date(l.next_follow_up_at!); return d >= todayStart && d <= todayEnd; }),
      future: withFU.filter(l => new Date(l.next_follow_up_at!) > todayEnd),
    };
  }, [leads, todayStart, todayEnd]);

  const currentLeads = activeSection === 'overdue' ? overdue : activeSection === 'today' ? today : future;

  const sections: { key: Section; label: string; count: number; icon: React.ReactNode; color: string }[] = [
    { key: 'overdue', label: 'Zaległe', count: overdue.length, icon: <AlertTriangle size={14} />, color: '#dc2626' },
    { key: 'today', label: 'Dziś', count: today.length, icon: <CalendarClock size={14} />, color: '#d97706' },
    { key: 'future', label: 'Przyszłe', count: future.length, icon: <Clock size={14} />, color: '#2563eb' },
  ];

  // ─── Helpers ───────────────────────────────────────────
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('pl-PL', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  // ─── Follow-up edit ────────────────────────────────────
  const startEdit = (l: SalesLead) => {
    setFuDate(l.next_follow_up_at ? new Date(l.next_follow_up_at).toISOString().slice(0, 16) : '');
    setFuNote(l.follow_up_note || '');
    setEditingId(l.id);
  };

  const saveFollowUp = async (leadId: string) => {
    setSaving(true);
    try {
      await updateLead(leadId, {
        next_follow_up_at: fuDate ? new Date(fuDate).toISOString() : null,
        follow_up_note: fuNote.trim() || null,
      });
      const label = fuDate ? new Date(fuDate).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'brak';
      await logLeadActivity(leadId, userId, 'lead_followup_changed', `Ustawiono follow-up na ${label}`);
      setEditingId(null);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Błąd zapisu'); }
    finally { setSaving(false); }
  };

  // ─── Quick postpone ────────────────────────────────────
  const postpone = async (leadId: string, days: number) => {
    setSaving(true);
    try {
      const d = new Date(); d.setDate(d.getDate() + days); d.setHours(9, 0, 0, 0);
      await updateLead(leadId, { next_follow_up_at: d.toISOString() });
      const label = d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
      await logLeadActivity(leadId, userId, 'lead_followup_changed', `Przełożono follow-up na ${label}`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Błąd'); }
    finally { setSaving(false); }
  };

  // ─── Quick status change ───────────────────────────────
  const handleStatus = async (leadId: string, oldStatus: SalesLeadStatus, newStatus: SalesLeadStatus) => {
    if (oldStatus === newStatus) return;
    setUpdatingStatus(`${leadId}_${newStatus}`);
    try {
      await updateLeadStatus(leadId, newStatus);
      await logLeadActivity(leadId, userId, 'lead_status_changed', `Zmieniono status z ${LEAD_STATUS_LABELS[oldStatus]} na ${LEAD_STATUS_LABELS[newStatus]}`);
      setStatusOpenId(null);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Błąd'); }
    finally { setUpdatingStatus(null); }
  };

  const ic = 'w-full px-3 py-2 border border-surface-200 rounded-xl text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors';

  return (
    <>
      <PageHeader title="Follow-up" showBack />
      <div className="px-4 py-4 mx-auto max-w-lg pb-24">
        {loading && (
          <div className="mt-16 flex flex-col items-center gap-2">
            <Loader2 size={28} className="animate-spin text-primary-500" />
            <p className="text-sm text-muted-500">Ładowanie...</p>
          </div>
        )}
        {error && !loading && (
          <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-100 rounded-xl mb-3">
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {!loading && (
          <>
            {/* Section tabs */}
            <div className="flex gap-2 mb-4">
              {sections.map((s) => (
                <button key={s.key} onClick={() => setActiveSection(s.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    activeSection === s.key ? 'text-white shadow-sm' : 'bg-white border border-surface-200 text-muted-600 hover:bg-surface-50'
                  }`}
                  style={activeSection === s.key ? { backgroundColor: s.color } : {}}>
                  {s.icon}
                  {s.label}
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                    activeSection === s.key ? 'bg-white/20 text-white' : 'bg-surface-100 text-muted-500'}`}>
                    {s.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Lead cards */}
            {currentLeads.length > 0 ? (
              <div className="space-y-3">
                {currentLeads.map((l) => {
                  const sc = LEAD_STATUS_COLORS[l.status];
                  const isEditing = editingId === l.id;
                  const isStatusOpen = statusOpenId === l.id;
                  const assignee = profiles.find(p => p.id === l.primary_assigned_to);

                  return (
                    <div key={l.id} className="card p-4">
                      {/* Header: name + star + status */}
                      <div className="flex items-start gap-2 mb-2">
                        <h3 className="text-sm font-bold text-gray-900 flex-1 line-clamp-1">{l.full_name}</h3>
                        {l.is_favorite && <Star size={14} className="text-amber-500 fill-amber-500 shrink-0 mt-0.5" />}
                        <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
                          style={{ backgroundColor: sc + '18', color: sc }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sc }} />
                          {LEAD_STATUS_LABELS[l.status]}
                        </span>
                      </div>

                      {/* Info row */}
                      <div className="flex items-center gap-3 text-xs flex-wrap mb-2">
                        <span className="inline-flex items-center gap-1 text-muted-500">
                          <Phone size={11} />{l.phone}
                        </span>
                        <span className="text-muted-400">{LEAD_SOURCE_LABELS[l.source]}</span>
                        {l.service_type && (
                          <span className="inline-flex items-center gap-1 text-muted-400">
                            <Tag size={10} />{LEAD_SERVICE_TYPE_LABELS[l.service_type]}
                          </span>
                        )}
                        {assignee && (
                          <span className="inline-flex items-center gap-1 text-muted-400">
                            <User size={11} /><span className="truncate max-w-[80px]">{assignee.full_name || assignee.email}</span>
                          </span>
                        )}
                      </div>

                      {/* Follow-up info / edit */}
                      {isEditing ? (
                        <div className="space-y-2 pt-2 border-t border-surface-100">
                          <div>
                            <label className="block text-[11px] text-muted-400 mb-1">Data i godzina</label>
                            <input type="datetime-local" value={fuDate} onChange={(e) => setFuDate(e.target.value)}
                              disabled={saving} className={ic} />
                          </div>
                          <div>
                            <label className="block text-[11px] text-muted-400 mb-1">Notatka</label>
                            <textarea value={fuNote} onChange={(e) => setFuNote(e.target.value)}
                              rows={2} disabled={saving} className={`${ic} resize-none`}
                              placeholder="Np. Zadzwonić po decyzji..." />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => saveFollowUp(l.id)} disabled={saving}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-primary-600 text-white text-xs font-semibold rounded-xl hover:bg-primary-700 active:scale-[0.98] transition-all disabled:opacity-60">
                              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}Zapisz
                            </button>
                            <button onClick={() => setEditingId(null)} disabled={saving}
                              className="px-3 py-2 bg-surface-100 text-muted-600 text-xs font-semibold rounded-xl hover:bg-surface-200 transition-colors">
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-surface-100">
                          <div className="flex items-center gap-2 mb-1">
                            <CalendarClock size={12} className={activeSection === 'overdue' ? 'text-red-500' : 'text-muted-400'} />
                            <span className={`text-xs font-medium ${activeSection === 'overdue' ? 'text-red-500' : 'text-gray-700'}`}>
                              {fmtDate(l.next_follow_up_at!)}
                            </span>
                          </div>
                          {l.follow_up_note && (
                            <p className="text-[11px] text-muted-500 italic mb-2 line-clamp-2">„{l.follow_up_note}"</p>
                          )}

                          {/* Quick actions */}
                          <div className="flex gap-1.5 flex-wrap">
                            <button onClick={() => startEdit(l)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 transition-colors">
                              <Pencil size={10} />Edytuj
                            </button>
                            <button onClick={() => postpone(l.id, 1)} disabled={saving}
                              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-muted-600 bg-surface-100 hover:bg-surface-200 transition-colors disabled:opacity-50">
                              +1 dzień
                            </button>
                            <button onClick={() => postpone(l.id, 3)} disabled={saving}
                              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-muted-600 bg-surface-100 hover:bg-surface-200 transition-colors disabled:opacity-50">
                              +3 dni
                            </button>
                            <button onClick={() => navigate(`/sales/leads/${l.id}`)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-muted-600 bg-surface-100 hover:bg-surface-200 transition-colors">
                              <ArrowRightCircle size={10} />Otwórz
                            </button>
                          </div>

                          {/* Inline status changer */}
                          <div className="mt-2 pt-2 border-t border-surface-50">
                            <button onClick={() => setStatusOpenId(isStatusOpen ? null : l.id)}
                              className="flex items-center gap-1 text-[11px] text-muted-400">
                              <span>Status</span>
                              {isStatusOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                            </button>
                            {isStatusOpen && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {LEAD_STATUSES.map((s) => {
                                  const active = l.status === s;
                                  const isUpdating = updatingStatus === `${l.id}_${s}`;
                                  const col = LEAD_STATUS_COLORS[s];
                                  return (
                                    <button key={s} onClick={() => handleStatus(l.id, l.status, s)}
                                      disabled={active || updatingStatus !== null}
                                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
                                        active ? 'ring-1 ring-offset-1 text-white' : 'hover:opacity-80'
                                      } disabled:opacity-50`}
                                      style={{ backgroundColor: active ? col : col + '18', color: active ? 'white' : col }}>
                                      {isUpdating ? <Loader2 size={8} className="animate-spin" /> :
                                        <span className="w-1 h-1 rounded-full" style={{ backgroundColor: active ? 'white' : col }} />}
                                      {LEAD_STATUS_LABELS[s]}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-12 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
                  <CalendarClock size={28} className="text-primary-500" />
                </div>
                <p className="text-sm text-muted-500">
                  {activeSection === 'overdue' ? 'Brak zaległych follow-upów.' :
                   activeSection === 'today' ? 'Brak follow-upów na dziś.' :
                   'Brak zaplanowanych follow-upów.'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
