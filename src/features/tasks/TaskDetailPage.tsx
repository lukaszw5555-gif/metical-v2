import { useState, useEffect, useCallback, useRef } from 'react';
import type { FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '@/components/layout/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { getTaskById, updateTaskStatus, bumpTask } from '@/features/tasks/services/tasksService';
import { getTaskComments, addTaskComment } from '@/features/tasks/services/taskCommentsService';
import { getInvestmentById } from '@/features/investments/services/investmentsService';
import { fetchTaskActivity, logActivity } from '@/features/activity/services/activityLogService';
import { createNotification } from '@/features/notifications/services/notificationsService';
import { getActiveProfiles } from '@/lib/services/profilesService';
import type { Task, TaskStatus, TaskComment, ActivityLogEntry, UserProfile, Investment } from '@/types/database';
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  TASK_STATUSES,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
} from '@/lib/constants';
import {
  Loader2,
  AlertCircle,
  Calendar,
  User,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Send,
  Building2,
  MessageSquare,
  History,
  ChevronDown,
  ChevronUp,
  Megaphone,
} from 'lucide-react';

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id ?? '';

  const [task, setTask] = useState<Task | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [linkedInvestment, setLinkedInvestment] = useState<Investment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [bumping, setBumping] = useState(false);

  // Comment form state
  const [commentBody, setCommentBody] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // Activity section toggle
  const [showActivity, setShowActivity] = useState(false);

  // ─── Fetch ─────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const [taskData, profilesData, commentsData, activityData] = await Promise.all([
        getTaskById(id),
        getActiveProfiles(),
        getTaskComments(id),
        fetchTaskActivity(id),
      ]);
      setTask(taskData);
      setProfiles(profilesData);
      setComments(commentsData);
      setActivity(activityData);

      // Fetch linked investment if present
      if (taskData.investment_id) {
        try {
          const inv = await getInvestmentById(taskData.investment_id);
          setLinkedInvestment(inv);
        } catch { setLinkedInvestment(null); }
      } else {
        setLinkedInvestment(null);
      }
    } catch (err) {
      console.error('[TaskDetail] Load error:', err);
      setError(err instanceof Error ? err.message : 'Nie udało się załadować zadania');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Refresh only comments + activity (lighter reload)
  const refreshCommentsAndActivity = useCallback(async () => {
    if (!id) return;
    try {
      const [commentsData, activityData, taskData] = await Promise.all([
        getTaskComments(id),
        fetchTaskActivity(id),
        getTaskById(id), // re-fetch task to get updated last_activity_at
      ]);
      setComments(commentsData);
      setActivity(activityData);
      setTask(taskData);
    } catch (err) {
      console.error('[TaskDetail] Refresh error:', err);
    }
  }, [id]);

  // ─── Status Change ─────────────────────────────────────

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task || task.status === newStatus) return;
    const oldStatus = task.status;
    setUpdatingStatus(newStatus);
    try {
      const updated = await updateTaskStatus(task.id, newStatus);
      setTask(updated);

      // Log activity
      await logActivity(userId, {
        event_type: 'task_status_changed',
        entity_type: 'task',
        entity_id: task.id,
        task_id: task.id,
        metadata: { old_status: oldStatus, new_status: newStatus },
      });

      // Notify the other party
      const otherParty = userId === task.created_by ? task.assigned_to : task.created_by;
      if (otherParty && otherParty !== userId) {
        await createNotification({
          recipient_id: otherParty,
          type: 'task_status_changed',
          title: 'Zmieniono status zadania',
          body: `${task.title} → ${newStatus}`,
          task_id: task.id,
        });
      }

      await refreshCommentsAndActivity();
    } catch (err) {
      console.error('[TaskDetail] Status update error:', err);
      setError(err instanceof Error ? err.message : 'Nie udało się zmienić statusu');
    } finally {
      setUpdatingStatus(null);
    }
  };

  // ─── Add Comment ───────────────────────────────────────

  const handleAddComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!task || !commentBody.trim()) return;

    setSubmittingComment(true);
    try {
      const comment = await addTaskComment(
        task.id,
        commentBody.trim(),
        userId,
        task.assigned_to
      );

      // Log activity
      await logActivity(userId, {
        event_type: 'task_comment_added',
        entity_type: 'task',
        entity_id: task.id,
        task_id: task.id,
        body: commentBody.trim().slice(0, 100),
        metadata: { comment_id: comment.id },
      });

      setCommentBody('');

      // Notify the other party
      const otherParty = userId === task.assigned_to ? task.created_by : task.assigned_to;
      if (otherParty && otherParty !== userId) {
        await createNotification({
          recipient_id: otherParty,
          type: 'task_comment_added',
          title: 'Nowy komentarz w zadaniu',
          body: commentBody.trim().slice(0, 80),
          task_id: task.id,
        });
      }

      await refreshCommentsAndActivity();
    } catch (err) {
      console.error('[TaskDetail] Comment error:', err);
      setError(err instanceof Error ? err.message : 'Nie udało się dodać komentarza');
    } finally {
      setSubmittingComment(false);
    }
  };

  // ─── Helpers ───────────────────────────────────────────

  const getProfileName = (profileId: string | null): string => {
    if (!profileId) return '—';
    const p = profiles.find((pr) => pr.id === profileId);
    return p ? (p.full_name || p.email) : profileId.slice(0, 8);
  };

  const getProfileInitials = (profileId: string | null): string => {
    if (!profileId) return '?';
    const p = profiles.find((pr) => pr.id === profileId);
    if (!p) return '?';
    if (p.full_name) {
      return p.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return p.email[0].toUpperCase();
  };

  const formatDateTime = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelative = (iso: string): string => {
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diffMin = Math.floor((now - then) / 60000);

    if (diffMin < 1) return 'przed chwilą';
    if (diffMin < 60) return `${diffMin} min temu`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH} godz. temu`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD} dn. temu`;
    return formatDateTime(iso);
  };

  // ─── Activity label helper ─────────────────────────────

  const getActivityLabel = (entry: ActivityLogEntry): string => {
    switch (entry.event_type) {
      case 'task_status_changed': {
        const meta = entry.metadata as { old_status?: string; new_status?: string };
        const from = TASK_STATUS_LABELS[meta.old_status as TaskStatus] ?? meta.old_status;
        const to = TASK_STATUS_LABELS[meta.new_status as TaskStatus] ?? meta.new_status;
        return `Zmieniono status: ${from} → ${to}`;
      }
      case 'task_comment_added':
        return 'Dodano komentarz';
      case 'task_created':
        return 'Utworzono zadanie';
      case 'task_edited':
        return 'Edytowano zadanie';
      case 'task_bumped':
        return 'Podbito zadanie';
      default:
        return entry.event_type;
    }
  };

  // ─── Loading / Error ───────────────────────────────────

  if (loading) {
    return (
      <>
        <PageHeader title="Zadanie" showBack />
        <div className="mt-16 flex flex-col items-center gap-2">
          <Loader2 size={28} className="animate-spin text-primary-500" />
          <p className="text-sm text-muted-500">Ładowanie...</p>
        </div>
      </>
    );
  }

  if (error && !task) {
    return (
      <>
        <PageHeader title="Zadanie" showBack />
        <div className="px-4 py-6 mx-auto max-w-lg">
          <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-100 rounded-xl">
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error || 'Nie znaleziono zadania'}</p>
          </div>
        </div>
      </>
    );
  }

  if (!task) return null;

  // ─── Derived Data ──────────────────────────────────────

  const isOverdue =
    task.status !== 'zrobione' &&
    task.due_date < new Date().toISOString().split('T')[0];
  const statusColor = TASK_STATUS_COLORS[task.status];
  const priorityColor = TASK_PRIORITY_COLORS[task.priority];

  // ─── Render ────────────────────────────────────────────

  return (
    <>
      <PageHeader title="Zadanie" showBack />
      <div className="px-4 py-4 mx-auto max-w-lg space-y-4 pb-8">
        {/* Inline error (non-fatal) */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* ── Main info card ─────────────────────────── */}
        <div className="card p-5">
          {/* Priority + Status row */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
              style={{
                backgroundColor: statusColor + '18',
                color: statusColor,
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: statusColor }}
              />
              {TASK_STATUS_LABELS[task.status]}
            </span>

            <span
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white"
              style={{ backgroundColor: priorityColor }}
            >
              {TASK_PRIORITY_LABELS[task.priority]}
            </span>

            {isOverdue && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-600">
                <AlertTriangle size={12} />
                Po terminie
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-lg font-bold text-slate-900 mb-2">
            {task.title}
          </h1>

          {/* Description */}
          {task.description && (
            <p className="text-sm text-muted-600 mb-4 whitespace-pre-wrap">
              {task.description}
            </p>
          )}

          {/* Info rows */}
          <div className="space-y-2.5 pt-3 border-t border-surface-100">
            <InfoRow
              icon={<User size={16} className="text-primary-500" />}
              label="Przypisane do"
              value={getProfileName(task.assigned_to)}
            />
            <InfoRow
              icon={<User size={16} className="text-muted-400" />}
              label="Utworzone przez"
              value={getProfileName(task.created_by)}
            />
            <InfoRow
              icon={<Calendar size={16} className={isOverdue ? 'text-red-500' : 'text-primary-500'} />}
              label="Termin"
              value={task.due_date}
              highlight={isOverdue}
            />
            <InfoRow
              icon={<Clock size={16} className="text-muted-400" />}
              label="Utworzono"
              value={formatDateTime(task.created_at)}
            />
            <InfoRow
              icon={<Clock size={16} className="text-muted-400" />}
              label="Ostatnia zmiana"
              value={formatDateTime(task.updated_at)}
            />
            {task.completed_at && (
              <InfoRow
                icon={<CheckCircle2 size={16} className="text-green-500" />}
                label="Ukończono"
                value={formatDateTime(task.completed_at)}
              />
            )}
          </div>
        </div>

        {/* ── Linked investment ──────────────────────── */}
        {linkedInvestment && (
          <button
            onClick={() => navigate(`/investments/${linkedInvestment.id}`)}
            className="card p-4 w-full text-left hover:bg-surface-50 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <Building2 size={16} className="text-primary-500" />
              <p className="text-xs font-medium text-muted-500 uppercase tracking-wide">
                Powiązana inwestycja
              </p>
            </div>
            <p className="text-sm font-semibold text-slate-800">{linkedInvestment.name}</p>
            <p className="text-xs text-muted-400">{linkedInvestment.client_name}</p>
          </button>
        )}

        {/* ── Quick status actions ───────────────────── */}
        <div className="card p-4">
          <p className="text-xs font-medium text-muted-500 uppercase tracking-wide mb-3">
            Zmień status
          </p>
          <div className="grid grid-cols-2 gap-2">
            {TASK_STATUSES.map((s) => {
              const isActive = task.status === s;
              const isUpdating = updatingStatus === s;
              const color = TASK_STATUS_COLORS[s];

              return (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={isActive || updatingStatus !== null}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'ring-2 ring-offset-1 text-white'
                      : 'hover:opacity-80 active:scale-[0.97]'
                  } disabled:opacity-50`}
                  style={{
                    backgroundColor: isActive ? color : color + '18',
                    color: isActive ? 'white' : color,
                    ...(isActive ? { ringColor: color } : {}),
                  }}
                >
                  {isUpdating ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: isActive ? 'white' : color,
                      }}
                    />
                  )}
                  {TASK_STATUS_LABELS[s]}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Bump button ────────────────────────────── */}
        {task.status !== 'zrobione' &&
         task.created_by === userId &&
         task.assigned_to &&
         task.assigned_to !== userId && (
          <button
            onClick={async () => {
              setBumping(true);
              try {
                const updated = await bumpTask(task.id);
                setTask(updated);

                await createNotification({
                  recipient_id: task.assigned_to!,
                  type: 'task_bumped',
                  title: 'Podbito zadanie',
                  body: task.title,
                  task_id: task.id,
                  priority: 'critical',
                });

                await logActivity(userId, {
                  event_type: 'task_bumped',
                  entity_type: 'task',
                  entity_id: task.id,
                  task_id: task.id,
                  body: task.title,
                });

                await refreshCommentsAndActivity();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Błąd podbijania');
              } finally { setBumping(false); }
            }}
            disabled={bumping}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 active:scale-[0.98] transition-all shadow-sm disabled:opacity-60"
          >
            {bumping ? <Loader2 size={18} className="animate-spin" /> : <Megaphone size={18} />}
            {bumping ? 'Podbijanie...' : 'Podbij zadanie'}
          </button>
        )}

        {/* ── Comments ───────────────────────────────── */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={16} className="text-primary-500" />
            <p className="text-xs font-medium text-muted-500 uppercase tracking-wide">
              Komentarze ({comments.length})
            </p>
          </div>

          {/* Comments list */}
          {comments.length > 0 ? (
            <div className="space-y-3 mb-4">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-primary-700 text-[10px] font-bold">
                      {getProfileInitials(c.author_id)}
                    </span>
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {getProfileName(c.author_id)}
                      </span>
                      <span className="text-[11px] text-muted-400 shrink-0">
                        {formatRelative(c.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">
                      {c.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-400 mb-4">
              Brak komentarzy. Dodaj pierwszy komentarz.
            </p>
          )}

          {/* Add comment form */}
          <form onSubmit={handleAddComment} className="flex gap-2">
            <textarea
              ref={commentInputRef}
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Napisz komentarz..."
              rows={2}
              className="flex-1 px-3 py-2 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors bg-surface-50 resize-none"
              disabled={submittingComment}
            />
            <button
              type="submit"
              disabled={submittingComment || !commentBody.trim()}
              className="self-end w-10 h-10 flex items-center justify-center bg-primary-600 text-white rounded-xl hover:bg-primary-700 active:scale-95 transition-all disabled:opacity-40 shrink-0"
              aria-label="Wyślij komentarz"
            >
              {submittingComment ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </form>
        </div>

        {/* ── Activity History ───────────────────────── */}
        <div className="card p-4">
          <button
            onClick={() => setShowActivity(!showActivity)}
            className="flex items-center gap-2 w-full text-left"
          >
            <History size={16} className="text-muted-400" />
            <p className="text-xs font-medium text-muted-500 uppercase tracking-wide flex-1">
              Historia ({activity.length})
            </p>
            {showActivity ? (
              <ChevronUp size={16} className="text-muted-400" />
            ) : (
              <ChevronDown size={16} className="text-muted-400" />
            )}
          </button>

          {showActivity && activity.length > 0 && (
            <div className="mt-3 space-y-2">
              {activity.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-2 py-1.5 border-b border-surface-50 last:border-0"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-300 shrink-0 mt-2" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-700">
                      <span className="font-medium">
                        {getProfileName(entry.actor_id)}
                      </span>
                      {' · '}
                      {getActivityLabel(entry)}
                    </p>
                    {entry.body && (
                      <p className="text-[11px] text-muted-400 truncate mt-0.5">
                        „{entry.body}"
                      </p>
                    )}
                    <p className="text-[11px] text-muted-400">
                      {formatRelative(entry.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showActivity && activity.length === 0 && (
            <p className="mt-3 text-sm text-muted-400">Brak historii aktywności.</p>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Helper Component ────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-400 leading-tight">{label}</p>
        <p className={`text-sm font-medium truncate ${highlight ? 'text-red-600' : 'text-slate-800'}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
