import { useState, useEffect, useCallback } from 'react';
import type { FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '@/components/layout/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { getInvestmentById, updateInvestmentStatus } from '@/features/investments/services/investmentsService';
import { getInvestmentComments, addInvestmentComment } from '@/features/investments/services/investmentCommentsService';
import { getTasksByInvestmentId } from '@/features/tasks/services/tasksService';
import { fetchInvestmentActivity, logActivity } from '@/features/activity/services/activityLogService';
import { getActiveProfiles } from '@/lib/services/profilesService';
import { createNotification, markInvestmentNotificationsAsRead } from '@/features/notifications/services/notificationsService';
import { sendPushNotification } from '@/features/notifications/services/pushSendService';
import type { Investment, InvestmentStatus, InvestmentComment, ActivityLogEntry, UserProfile, Task } from '@/types/database';
import {
  INVESTMENT_STATUS_LABELS, INVESTMENT_STATUS_COLORS, INVESTMENT_STATUSES,
  INVESTMENT_TYPE_LABELS, TASK_STATUS_DISPLAY_LABELS, TASK_STATUS_COLORS,
  TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS,
} from '@/lib/constants';
import {
  Loader2, AlertCircle, MapPin, User, Phone, Mail, Clock, Banknote,
  Send, MessageSquare, History, ChevronDown, ChevronUp, Package, ClipboardCheck,
} from 'lucide-react';

export default function InvestmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile: authProfile } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id ?? '';
  const actorName = authProfile?.full_name || authProfile?.email || 'Ktoś';

  const [inv, setInv] = useState<Investment | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [comments, setComments] = useState<InvestmentComment[]>([]);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [invTasks, setInvTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  const loadAll = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const [invData, profs, coms, acts, tasks] = await Promise.all([
        getInvestmentById(id), getActiveProfiles(),
        getInvestmentComments(id), fetchInvestmentActivity(id),
        getTasksByInvestmentId(id),
      ]);
      setInv(invData); setProfiles(profs); setComments(coms); setActivity(acts); setInvTasks(tasks);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd ładowania');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Mark investment notifications as read on load
  useEffect(() => {
    if (id) markInvestmentNotificationsAsRead(id);
  }, [id]);

  const refreshSections = useCallback(async () => {
    if (!id) return;
    try {
      const [coms, acts, invData] = await Promise.all([
        getInvestmentComments(id), fetchInvestmentActivity(id), getInvestmentById(id),
      ]);
      setComments(coms); setActivity(acts); setInv(invData);
    } catch (e) { console.error(e); }
  }, [id]);

  // Status change
  const handleStatus = async (s: InvestmentStatus) => {
    if (!inv || inv.status === s) return;
    const old = inv.status;
    setUpdatingStatus(s);
    try {
      setInv(await updateInvestmentStatus(inv.id, s));
      await logActivity(userId, {
        event_type: 'investment_status_changed', entity_type: 'investment',
        entity_id: inv.id, investment_id: inv.id,
        metadata: { old_status: old, new_status: s },
      });

      // Notify other users who can see this investment
      const statusLabel = INVESTMENT_STATUS_LABELS[s] || s;
      const others = profiles.filter((p) => p.id !== userId && p.is_active);
      for (const p of others) {
        await createNotification({
          recipient_id: p.id, type: 'investment_status_changed',
          title: `${actorName} zmienił(a) status inwestycji`,
          body: `${inv.name} → ${statusLabel}`, investment_id: inv.id,
        });
        sendPushNotification({
          recipientId: p.id, title: `${actorName} zmienił(a) status inwestycji`,
          body: `${inv.name} → ${statusLabel}`, url: `/investments/${inv.id}`, priority: 'normal',
        });
      }

      await refreshSections();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd zmiany statusu');
    } finally { setUpdatingStatus(null); }
  };

  // Add comment
  const handleComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!inv || !commentBody.trim()) return;
    setSubmittingComment(true);
    try {
      const c = await addInvestmentComment(inv.id, commentBody.trim(), userId);
      await logActivity(userId, {
        event_type: 'investment_comment_added', entity_type: 'investment',
        entity_id: inv.id, investment_id: inv.id,
        body: commentBody.trim().slice(0, 100), metadata: { comment_id: c.id },
      });
      setCommentBody('');

      // Notify other users
      const others = profiles.filter((p) => p.id !== userId && p.is_active);
      for (const p of others) {
        await createNotification({
          recipient_id: p.id, type: 'investment_comment_added',
          title: `${actorName} skomentował(a) inwestycję`,
          body: `${inv.name}: ${commentBody.trim().slice(0, 60)}`, investment_id: inv.id,
        });
        sendPushNotification({
          recipientId: p.id, title: `${actorName} skomentował(a) inwestycję`,
          body: `${inv.name}: ${commentBody.trim().slice(0, 60)}`, url: `/investments/${inv.id}`, priority: 'normal',
        });
      }

      await refreshSections();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : 'Błąd komentarza');
    } finally { setSubmittingComment(false); }
  };

  // Helpers
  const profileName = (pid: string | null) => {
    if (!pid) return '—';
    const p = profiles.find((x) => x.id === pid);
    return p ? (p.full_name || p.email) : pid.slice(0, 8);
  };
  const profileInitials = (pid: string | null) => {
    if (!pid) return '?';
    const p = profiles.find((x) => x.id === pid);
    if (!p) return '?';
    return p.full_name ? p.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : p.email[0].toUpperCase();
  };
  const fmtDT = (iso: string) => new Date(iso).toLocaleDateString('pl-PL', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const fmtRel = (iso: string) => {
    const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (min < 1) return 'przed chwilą';
    if (min < 60) return `${min} min temu`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h} godz. temu`;
    return `${Math.floor(h / 24)} dn. temu`;
  };
  const actLabel = (entry: ActivityLogEntry) => {
    const m = entry.metadata as Record<string, string>;
    switch (entry.event_type) {
      case 'investment_status_changed': {
        const from = INVESTMENT_STATUS_LABELS[m.old_status as InvestmentStatus] ?? m.old_status;
        const to = INVESTMENT_STATUS_LABELS[m.new_status as InvestmentStatus] ?? m.new_status;
        return `Status: ${from} → ${to}`;
      }
      case 'investment_comment_added': return 'Dodano komentarz';
      case 'investment_created': return 'Utworzono inwestycję';
      case 'investment_edited': return 'Edytowano inwestycję';
      default: return entry.event_type;
    }
  };

  // Loading / Error
  if (loading) return (
    <><PageHeader title="Inwestycja" showBack />
      <div className="mt-16 flex flex-col items-center gap-2">
        <Loader2 size={28} className="animate-spin text-primary-500" /><p className="text-sm text-muted-500">Ładowanie...</p>
      </div></>
  );
  if (error && !inv) return (
    <><PageHeader title="Inwestycja" showBack />
      <div className="px-4 py-6 mx-auto max-w-lg">
        <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-100 rounded-xl">
          <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" /><p className="text-sm text-red-700">{error}</p>
        </div></div></>
  );
  if (!inv) return null;

  const sc = INVESTMENT_STATUS_COLORS[inv.status];
  const [showStatusPanel, setShowStatusPanel] = useState(false);

  return (
    <><PageHeader title="Inwestycja" showBack />
      <div className="px-4 py-4 mx-auto max-w-lg space-y-4 pb-24">
        {error && <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" /><p className="text-sm text-red-700">{error}</p>
        </div>}

        {/* ─── Info card with inline status ─────────────── */}
        <div className="card p-5">
          {/* Chips row */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: sc + '18', color: sc }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sc }} />
              {INVESTMENT_STATUS_LABELS[inv.status]}
            </span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary-50 text-primary-700">
              {INVESTMENT_TYPE_LABELS[inv.investment_type]}
            </span>
            {inv.deposit_paid && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-50 text-green-600">
              <Banknote size={12} />Zaliczka
            </span>}
          </div>

          <h1 className="text-lg font-bold text-gray-900 mb-3">{inv.name}</h1>

          {/* Details */}
          <div className="space-y-2.5 pt-3 border-t border-surface-100">
            <Row icon={<User size={16} className="text-primary-500" />} label="Klient" value={inv.client_name} />
            {inv.client_phone && <Row icon={<Phone size={16} className="text-muted-400" />} label="Telefon" value={inv.client_phone} />}
            {inv.client_email && <Row icon={<Mail size={16} className="text-muted-400" />} label="E-mail" value={inv.client_email} />}
            {inv.investment_address && <Row icon={<MapPin size={16} className="text-muted-400" />} label="Adres" value={inv.investment_address} />}
            <Row icon={<User size={16} className="text-muted-400" />} label="Utworzone przez" value={profileName(inv.created_by)} />
            <Row icon={<Clock size={16} className="text-muted-400" />} label="Utworzono" value={fmtDT(inv.created_at)} />
            <Row icon={<Clock size={16} className="text-muted-400" />} label="Ostatnia zmiana" value={fmtDT(inv.updated_at)} />
          </div>

          {/* Compact status changer — inline in info card */}
          <div className="mt-4 pt-3 border-t border-surface-100">
            <button
              onClick={() => setShowStatusPanel(!showStatusPanel)}
              className="flex items-center gap-2 w-full text-left group"
            >
              <p className="text-xs font-medium text-muted-500 uppercase tracking-wide flex-1">Zmień status</p>
              {showStatusPanel
                ? <ChevronUp size={14} className="text-muted-400" />
                : <ChevronDown size={14} className="text-muted-400" />}
            </button>
            {showStatusPanel && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {INVESTMENT_STATUSES.map((s) => {
                  const active = inv.status === s;
                  const updating = updatingStatus === s;
                  const col = INVESTMENT_STATUS_COLORS[s];
                  return (
                    <button key={s} onClick={() => handleStatus(s)}
                      disabled={active || updatingStatus !== null}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        active ? 'ring-2 ring-offset-1 text-white' : 'hover:opacity-80 active:scale-[0.97]'
                      } disabled:opacity-50`}
                      style={{ backgroundColor: active ? col : col + '18', color: active ? 'white' : col }}>
                      {updating ? <Loader2 size={12} className="animate-spin" /> :
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: active ? 'white' : col }} />}
                      {INVESTMENT_STATUS_LABELS[s]}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── Components note ─────────────────────────── */}
        {inv.components_note && (
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package size={16} className="text-primary-500" />
              <p className="text-xs font-medium text-muted-500 uppercase tracking-wide">Komponenty / notatki</p>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{inv.components_note}</p>
          </div>
        )}

        {/* ─── Tasks ───────────────────────────────────── */}
        {invTasks.length > 0 && (
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardCheck size={16} className="text-primary-500" />
              <p className="text-xs font-medium text-muted-500 uppercase tracking-wide">
                Zadania ({invTasks.length})
              </p>
            </div>
            <div className="space-y-2">
              {invTasks.map((t) => {
                const sc2 = TASK_STATUS_COLORS[t.status];
                const pc = TASK_PRIORITY_COLORS[t.priority];
                const assignee = profiles.find((p) => p.id === t.assigned_to);
                return (
                  <button key={t.id} onClick={() => navigate(`/tasks/${t.id}`)}
                    className="w-full text-left p-3 bg-surface-50 rounded-xl hover:bg-surface-100 transition-colors">
                    <div className="flex items-start gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900 flex-1 line-clamp-1">{t.title}</span>
                      {t.priority !== 'normalny' && (
                        <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold uppercase rounded text-white"
                          style={{ backgroundColor: pc }}>{TASK_PRIORITY_LABELS[t.priority]}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium"
                        style={{ backgroundColor: sc2 + '18', color: sc2 }}>
                        <span className="w-1 h-1 rounded-full" style={{ backgroundColor: sc2 }} />
                        {TASK_STATUS_DISPLAY_LABELS[t.status]}
                      </span>
                      <span className="text-muted-400">{t.due_date}</span>
                      {assignee && <span className="text-muted-400 truncate max-w-[80px]">{assignee.full_name || assignee.email}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Comments ────────────────────────────────── */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={16} className="text-primary-500" />
            <p className="text-xs font-medium text-muted-500 uppercase tracking-wide">Komentarze ({comments.length})</p>
          </div>
          {comments.length > 0 ? (
            <div className="space-y-3 mb-4">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-primary-700 text-[10px] font-bold">{profileInitials(c.author_id)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-gray-900 truncate">{profileName(c.author_id)}</span>
                      <span className="text-[11px] text-muted-400 shrink-0">{fmtRel(c.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-400 mb-4">Brak komentarzy.</p>}
          <form onSubmit={handleComment} className="flex gap-2">
            <textarea value={commentBody} onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Napisz komentarz..." rows={2}
              className="flex-1 px-3 py-2 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 bg-surface-50 resize-none"
              disabled={submittingComment} />
            <button type="submit" disabled={submittingComment || !commentBody.trim()}
              className="self-end w-10 h-10 flex items-center justify-center bg-primary-600 text-white rounded-xl hover:bg-primary-700 active:scale-95 transition-all disabled:opacity-40 shrink-0">
              {submittingComment ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </form>
        </div>

        {/* ─── Activity (collapsible) ──────────────────── */}
        <div className="card p-4">
          <button onClick={() => setShowActivity(!showActivity)} className="flex items-center gap-2 w-full text-left">
            <History size={16} className="text-muted-400" />
            <p className="text-xs font-medium text-muted-500 uppercase tracking-wide flex-1">Historia ({activity.length})</p>
            {showActivity ? <ChevronUp size={16} className="text-muted-400" /> : <ChevronDown size={16} className="text-muted-400" />}
          </button>
          {showActivity && activity.length > 0 && (
            <div className="mt-3 space-y-2">
              {activity.map((e) => (
                <div key={e.id} className="flex items-start gap-2 py-1.5 border-b border-surface-50 last:border-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-300 shrink-0 mt-2" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-700"><span className="font-medium">{profileName(e.actor_id)}</span> · {actLabel(e)}</p>
                    {e.body && <p className="text-[11px] text-muted-400 truncate mt-0.5">„{e.body}"</p>}
                    <p className="text-[11px] text-muted-400">{fmtRel(e.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {showActivity && activity.length === 0 && <p className="mt-3 text-sm text-muted-400">Brak historii.</p>}
        </div>
      </div>
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
