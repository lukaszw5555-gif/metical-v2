import { useState, useEffect, useCallback, useRef } from 'react';
import type { FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '@/components/layout/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { getTaskById, updateTaskStatus, bumpTask, editTask, archiveTask } from '@/features/tasks/services/tasksService';
import { getTaskComments, addTaskComment } from '@/features/tasks/services/taskCommentsService';
import { getInvestmentById } from '@/features/investments/services/investmentsService';
import { fetchTaskActivity, logActivity } from '@/features/activity/services/activityLogService';
import { createNotification } from '@/features/notifications/services/notificationsService';
import { sendPushNotification } from '@/features/notifications/services/pushSendService';
import { getActiveProfiles } from '@/lib/services/profilesService';
import type { Task, TaskStatus, TaskComment, ActivityLogEntry, UserProfile, Investment } from '@/types/database';
import {
  TASK_STATUS_DISPLAY_LABELS,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
} from '@/lib/constants';
import {
  Loader2, AlertCircle, Calendar, User, Clock, AlertTriangle, CheckCircle2,
  Send, Building2, MessageSquare, History, ChevronDown, ChevronUp, Megaphone,
  Pencil, Archive, X, Check,
} from 'lucide-react';

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile: authProfile } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id ?? '';
  const actorName = authProfile?.full_name || authProfile?.email || 'Ktoś';

  const [task, setTask] = useState<Task | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [linkedInvestment, setLinkedInvestment] = useState<Investment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [bumping, setBumping] = useState(false);

  // Comment form
  const [commentBody, setCommentBody] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);

  // Archive
  const [archiving, setArchiving] = useState(false);

  // Activity toggle
  const [showActivity, setShowActivity] = useState(false);

  // ─── Fetch ─────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const [taskData, profilesData, commentsData, activityData] = await Promise.all([
        getTaskById(id), getActiveProfiles(), getTaskComments(id), fetchTaskActivity(id),
      ]);
      setTask(taskData);
      setProfiles(profilesData);
      setComments(commentsData);
      setActivity(activityData);
      if (taskData.investment_id) {
        try { setLinkedInvestment(await getInvestmentById(taskData.investment_id)); }
        catch { setLinkedInvestment(null); }
      } else { setLinkedInvestment(null); }
    } catch (err) {
      console.error('[TaskDetail] Load error:', err);
      setError(err instanceof Error ? err.message : 'Nie udało się załadować zadania');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const refreshCommentsAndActivity = useCallback(async () => {
    if (!id) return;
    try {
      const [c, a, t] = await Promise.all([getTaskComments(id), fetchTaskActivity(id), getTaskById(id)]);
      setComments(c); setActivity(a); setTask(t);
    } catch (err) { console.error('[TaskDetail] Refresh error:', err); }
  }, [id]);

  // ─── Status Change ─────────────────────────────────────

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task || task.status === newStatus) return;
    const oldStatus = task.status;
    setUpdatingStatus(newStatus);
    try {
      setTask(await updateTaskStatus(task.id, newStatus));
      await logActivity(userId, {
        event_type: 'task_status_changed', entity_type: 'task',
        entity_id: task.id, task_id: task.id,
        metadata: { old_status: oldStatus, new_status: newStatus },
      });
      const otherParty = userId === task.created_by ? task.assigned_to : task.created_by;
      if (otherParty && otherParty !== userId) {
        const statusLabel = TASK_STATUS_DISPLAY_LABELS[newStatus] || newStatus;
        await createNotification({ recipient_id: otherParty, type: 'task_status_changed',
          title: `${actorName} zmienił(a) status`, body: `${task.title} → ${statusLabel}`, task_id: task.id });
        sendPushNotification({ recipientId: otherParty, title: `${actorName} zmienił(a) status`,
          body: `${task.title} → ${statusLabel}`, url: `/tasks/${task.id}`, priority: 'normal' });
      }
      await refreshCommentsAndActivity();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zmienić statusu');
    } finally { setUpdatingStatus(null); }
  };

  // ─── Add Comment ───────────────────────────────────────

  const handleAddComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!task || !commentBody.trim()) return;
    setSubmittingComment(true);
    try {
      const comment = await addTaskComment(task.id, commentBody.trim(), userId, task.assigned_to);
      await logActivity(userId, {
        event_type: 'task_comment_added', entity_type: 'task',
        entity_id: task.id, task_id: task.id,
        body: commentBody.trim().slice(0, 100), metadata: { comment_id: comment.id },
      });
      setCommentBody('');
      const otherParty = userId === task.assigned_to ? task.created_by : task.assigned_to;
      if (otherParty && otherParty !== userId) {
        await createNotification({ recipient_id: otherParty, type: 'task_comment_added',
          title: `${actorName} skomentował(a)`, body: `${task.title}: ${commentBody.trim().slice(0, 60)}`, task_id: task.id });
        sendPushNotification({ recipientId: otherParty, title: `${actorName} skomentował(a)`,
          body: `${task.title}: ${commentBody.trim().slice(0, 60)}`, url: `/tasks/${task.id}`, priority: 'normal' });
      }
      await refreshCommentsAndActivity();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się dodać komentarza');
    } finally { setSubmittingComment(false); }
  };

  // ─── Edit Task ─────────────────────────────────────────

  const startEditing = () => {
    if (!task) return;
    setEditTitle(task.title);
    setEditDesc(task.description || '');
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!task || !editTitle.trim()) return;
    setSaving(true);
    try {
      const updated = await editTask(task.id, { title: editTitle.trim(), description: editDesc.trim() || null });
      setTask(updated);
      setEditing(false);
      await logActivity(userId, {
        event_type: 'task_edited', entity_type: 'task',
        entity_id: task.id, task_id: task.id,
        body: editTitle.trim().slice(0, 100), metadata: {},
      });
      await refreshCommentsAndActivity();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zapisać zmian');
    } finally { setSaving(false); }
  };

  // ─── Archive Task ──────────────────────────────────────

  const handleArchive = async () => {
    if (!task || !confirm('Czy na pewno chcesz zarchiwizować to zadanie?')) return;
    setArchiving(true);
    try {
      await archiveTask(task.id, userId);
      await logActivity(userId, {
        event_type: 'task_archived', entity_type: 'task',
        entity_id: task.id, task_id: task.id,
        body: task.title.slice(0, 100), metadata: {},
      });
      navigate('/tasks');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zarchiwizować');
      setArchiving(false);
    }
  };

  // ─── Helpers ───────────────────────────────────────────

  const getProfileName = (pid: string | null) => {
    if (!pid) return '—';
    const p = profiles.find((pr) => pr.id === pid);
    return p ? (p.full_name || p.email) : pid.slice(0, 8);
  };
  const getProfileInitials = (pid: string | null) => {
    if (!pid) return '?';
    const p = profiles.find((pr) => pr.id === pid);
    if (!p) return '?';
    return p.full_name ? p.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : p.email[0].toUpperCase();
  };
  const formatDateTime = (iso: string) => new Date(iso).toLocaleDateString('pl-PL', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const formatRelative = (iso: string) => {
    const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diffMin < 1) return 'przed chwilą';
    if (diffMin < 60) return `${diffMin} min temu`;
    const h = Math.floor(diffMin / 60);
    if (h < 24) return `${h} godz. temu`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d} dn. temu`;
    return formatDateTime(iso);
  };
  const getActivityLabel = (entry: ActivityLogEntry) => {
    switch (entry.event_type) {
      case 'task_status_changed': {
        const m = entry.metadata as { old_status?: string; new_status?: string };
        return `Status: ${TASK_STATUS_DISPLAY_LABELS[m.old_status as TaskStatus] ?? m.old_status} → ${TASK_STATUS_DISPLAY_LABELS[m.new_status as TaskStatus] ?? m.new_status}`;
      }
      case 'task_comment_added': return 'Dodano komentarz';
      case 'task_created': return 'Utworzono zadanie';
      case 'task_edited': return 'Edytowano zadanie';
      case 'task_bumped': return 'Podbito zadanie';
      case 'task_archived': return 'Zarchiwizowano zadanie';
      default: return entry.event_type;
    }
  };

  // ─── Loading / Error ───────────────────────────────────

  if (loading) return (
    <><PageHeader title="Zadanie" showBack />
      <div className="mt-16 flex flex-col items-center gap-2">
        <Loader2 size={28} className="animate-spin text-primary-500" /><p className="text-sm text-muted-500">Ładowanie...</p>
      </div></>
  );
  if (error && !task) return (
    <><PageHeader title="Zadanie" showBack />
      <div className="px-4 py-6 mx-auto max-w-lg">
        <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-100 rounded-xl">
          <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error || 'Nie znaleziono zadania'}</p>
        </div></div></>
  );
  if (!task) return null;

  const isOverdue = task.status !== 'zrobione' && task.due_date < new Date().toISOString().split('T')[0];
  const statusColor = TASK_STATUS_COLORS[task.status];
  const priorityColor = TASK_PRIORITY_COLORS[task.priority];
  const isAuthor = task.created_by === userId;
  const isArchived = !!task.archived_at;

  // ─── Render ────────────────────────────────────────────

  return (
    <>
      <PageHeader title="Zadanie" showBack />
      <div className="px-4 py-4 mx-auto max-w-lg space-y-3 pb-8">
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Archived banner */}
        {isArchived && (
          <div className="flex items-center gap-2 p-3 bg-surface-100 border border-surface-200 rounded-xl">
            <Archive size={16} className="text-muted-400" />
            <p className="text-xs text-muted-500">
              Zarchiwizowane {task.archived_at ? formatDateTime(task.archived_at) : ''}
            </p>
          </div>
        )}

        {/* ── Main info card ─────────────────────────── */}
        <div className="card p-5">
          {/* Badges: status + priority + overdue */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: statusColor + '18', color: statusColor }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
              {TASK_STATUS_DISPLAY_LABELS[task.status]}
            </span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white"
              style={{ backgroundColor: priorityColor }}>
              {TASK_PRIORITY_LABELS[task.priority]}
            </span>
            {isOverdue && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-600">
                <AlertTriangle size={12} /> Po terminie
              </span>
            )}
          </div>

          {/* Title — edit mode or display */}
          {editing ? (
            <div className="space-y-2 mb-3">
              <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 text-base font-bold border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
              <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                rows={3} placeholder="Opis zadania..."
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none" />
              <div className="flex gap-2">
                <button onClick={handleSaveEdit} disabled={saving || !editTitle.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Zapisz
                </button>
                <button onClick={() => setEditing(false)} disabled={saving}
                  className="px-3 py-2 text-sm font-medium text-muted-500 bg-surface-100 rounded-xl hover:bg-surface-200 transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2 mb-2">
                <h1 className="text-lg font-bold text-gray-900 flex-1">{task.title}</h1>
                {isAuthor && !isArchived && (
                  <button onClick={startEditing}
                    className="shrink-0 p-1.5 rounded-lg text-muted-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                    aria-label="Edytuj zadanie">
                    <Pencil size={16} />
                  </button>
                )}
              </div>
              {task.description && (
                <p className="text-sm text-muted-500 mb-3 whitespace-pre-wrap">{task.description}</p>
              )}
            </>
          )}

          {/* Info rows */}
          <div className="space-y-2 pt-3 border-t border-surface-100">
            <InfoRow icon={<User size={16} className="text-primary-500" />} label="Przypisane do" value={getProfileName(task.assigned_to)} />
            <InfoRow icon={<User size={16} className="text-muted-400" />} label="Utworzone przez" value={getProfileName(task.created_by)} />
            <InfoRow icon={<Calendar size={16} className={isOverdue ? 'text-red-500' : 'text-primary-500'} />} label="Termin" value={task.due_date} highlight={isOverdue} />
            <InfoRow icon={<Clock size={16} className="text-muted-400" />} label="Utworzono" value={formatDateTime(task.created_at)} />
            {task.completed_at && <InfoRow icon={<CheckCircle2 size={16} className="text-green-500" />} label="Ukończono" value={formatDateTime(task.completed_at)} />}
          </div>
        </div>

        {/* ── Linked investment ──────────────────────── */}
        {linkedInvestment && (
          <button onClick={() => navigate(`/investments/${linkedInvestment.id}`)}
            className="card p-4 w-full text-left hover:bg-surface-50 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <Building2 size={14} className="text-primary-500" />
              <p className="text-[11px] font-medium text-muted-500 uppercase tracking-wide">Powiązana inwestycja</p>
            </div>
            <p className="text-sm font-semibold text-gray-900">{linkedInvestment.name}</p>
          </button>
        )}

        {/* ── Compact status + bump + archive ─────────── */}
        {!isArchived && (
          <div className="card p-3">
            <div className="flex items-center gap-1.5">
              {([
                { dbValue: 'do_zrobienia' as const, label: 'Nie rozpoczęto' },
                { dbValue: 'w_trakcie' as const, label: 'W trakcie' },
                { dbValue: 'zrobione' as const, label: 'Zrobione' },
              ]).map(({ dbValue, label }) => {
                const isActive = task.status === dbValue || (dbValue === 'do_zrobienia' && task.status === 'czeka');
                const isUpdating = updatingStatus === dbValue;
                const color = TASK_STATUS_COLORS[dbValue];
                return (
                  <button key={dbValue} onClick={() => handleStatusChange(dbValue)}
                    disabled={isActive || updatingStatus !== null}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive ? 'ring-1 ring-offset-1 text-white' : 'hover:opacity-80'
                    } disabled:opacity-50`}
                    style={{ backgroundColor: isActive ? color : color + '18', color: isActive ? 'white' : color }}>
                    {isUpdating ? <Loader2 size={12} className="animate-spin" /> :
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isActive ? 'white' : color }} />}
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Bump + Archive row */}
            <div className="flex gap-2 mt-2">
              {task.status !== 'zrobione' && isAuthor && task.assigned_to && task.assigned_to !== userId && (
                <button onClick={async () => {
                  setBumping(true);
                  try {
                    setTask(await bumpTask(task.id));
                    await createNotification({ recipient_id: task.assigned_to!, type: 'task_bumped',
                      title: `${actorName} podbił(a) zadanie`, body: task.title, task_id: task.id, priority: 'critical' });
                    sendPushNotification({ recipientId: task.assigned_to!, title: `${actorName} podbił(a) zadanie`,
                      body: task.title, url: `/tasks/${task.id}`, priority: 'critical' });
                    await logActivity(userId, { event_type: 'task_bumped', entity_type: 'task',
                      entity_id: task.id, task_id: task.id, body: task.title });
                    await refreshCommentsAndActivity();
                  } catch (err) { setError(err instanceof Error ? err.message : 'Błąd podbijania'); }
                  finally { setBumping(false); }
                }} disabled={bumping}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 transition-all disabled:opacity-60">
                  {bumping ? <Loader2 size={14} className="animate-spin" /> : <Megaphone size={14} />}
                  Podbij
                </button>
              )}
              {isAuthor && (
                <button onClick={handleArchive} disabled={archiving}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-muted-500 bg-surface-100 rounded-lg hover:bg-surface-200 transition-colors disabled:opacity-60">
                  {archiving ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
                  Archiwizuj
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Comments (higher in the layout) ─────────── */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={16} className="text-primary-500" />
            <p className="text-xs font-medium text-muted-500 uppercase tracking-wide">Komentarze ({comments.length})</p>
          </div>

          {/* Add comment form — at the top for quick access */}
          <form onSubmit={handleAddComment} className="flex gap-2 mb-3">
            <textarea ref={commentInputRef} value={commentBody} onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Napisz komentarz..." rows={2}
              className="flex-1 px-3 py-2 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 bg-surface-50 resize-none"
              disabled={submittingComment} />
            <button type="submit" disabled={submittingComment || !commentBody.trim()}
              className="self-end w-10 h-10 flex items-center justify-center bg-primary-600 text-white rounded-xl hover:bg-primary-700 active:scale-95 transition-all disabled:opacity-40 shrink-0">
              {submittingComment ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </form>

          {comments.length > 0 ? (
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-primary-700 text-[10px] font-bold">{getProfileInitials(c.author_id)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-gray-900 truncate">{getProfileName(c.author_id)}</span>
                      <span className="text-[11px] text-muted-400 shrink-0">{formatRelative(c.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-400">Brak komentarzy.</p>
          )}
        </div>

        {/* ── Activity History ───────────────────────── */}
        <div className="card p-4">
          <button onClick={() => setShowActivity(!showActivity)} className="flex items-center gap-2 w-full text-left">
            <History size={16} className="text-muted-400" />
            <p className="text-xs font-medium text-muted-500 uppercase tracking-wide flex-1">Historia ({activity.length})</p>
            {showActivity ? <ChevronUp size={16} className="text-muted-400" /> : <ChevronDown size={16} className="text-muted-400" />}
          </button>
          {showActivity && activity.length > 0 && (
            <div className="mt-3 space-y-2">
              {activity.map((entry) => (
                <div key={entry.id} className="flex items-start gap-2 py-1.5 border-b border-surface-50 last:border-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-300 shrink-0 mt-2" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-700"><span className="font-medium">{getProfileName(entry.actor_id)}</span>{' · '}{getActivityLabel(entry)}</p>
                    {entry.body && <p className="text-[11px] text-muted-400 truncate mt-0.5">„{entry.body}"</p>}
                    <p className="text-[11px] text-muted-400">{formatRelative(entry.created_at)}</p>
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

// ─── Helper Component ────────────────────────────────────

function InfoRow({ icon, label, value, highlight = false }: {
  icon: React.ReactNode; label: string; value: string; highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-400 leading-tight">{label}</p>
        <p className={`text-sm font-medium truncate ${highlight ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
      </div>
    </div>
  );
}
