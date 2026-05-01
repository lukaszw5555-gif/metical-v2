import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/layout/PageHeader';
import {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/features/notifications/services/notificationsService';
import type { Notification } from '@/types/database';
import {
  Bell, Loader2, AlertCircle, CheckCheck, Megaphone,
  MessageSquare, ClipboardCheck, Building2, ArrowRight,
} from 'lucide-react';

// ─── Event type labels ──────────────────────────────────

const EVENT_LABELS: Record<string, string> = {
  task_bumped: 'Podbicie',
  task_comment_added: 'Komentarz',
  task_created: 'Nowe zadanie',
  task_status_changed: 'Status',
  investment_comment_added: 'Komentarz',
  investment_created: 'Inwestycja',
  investment_status_changed: 'Status',
};

// ─── Grouped notification type ──────────────────────────

interface GroupedNotification {
  /** The newest notification in the group */
  latest: Notification;
  /** How many notifications are grouped */
  count: number;
  /** All IDs (for marking as read) */
  ids: string[];
  /** Whether any in the group is unread */
  hasUnread: boolean;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setError(null); setItems(await getMyNotifications()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Błąd'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ─── Group bumps by task_id + title (actor) ───────────

  const grouped = useMemo<GroupedNotification[]>(() => {
    const result: GroupedNotification[] = [];
    const bumpMap = new Map<string, GroupedNotification>();

    for (const n of items) {
      // Group bumps by task_id + title (title contains actor name)
      if (n.type === 'task_bumped' && n.task_id) {
        // Extract actor prefix from title (e.g. "Łukasz podbił(a) zadanie")
        const actorKey = n.title.split(' ')[0] || '';
        const key = `bump_${n.task_id}_${actorKey}`;
        const existing = bumpMap.get(key);
        if (existing) {
          existing.count++;
          existing.ids.push(n.id);
          if (!n.is_read) existing.hasUnread = true;
          // Keep newest as latest
          if (n.created_at > existing.latest.created_at) existing.latest = n;
        } else {
          const group: GroupedNotification = {
            latest: n, count: 1, ids: [n.id], hasUnread: !n.is_read,
          };
          bumpMap.set(key, group);
          result.push(group);
        }
      } else {
        result.push({ latest: n, count: 1, ids: [n.id], hasUnread: !n.is_read });
      }
    }

    return result;
  }, [items]);

  // ─── Actions ──────────────────────────────────────────

  const handleClick = async (g: GroupedNotification) => {
    // Mark all in group as read
    const unreadIds = g.ids.filter((id) => {
      const n = items.find((x) => x.id === id);
      return n && !n.is_read;
    });
    for (const id of unreadIds) {
      await markNotificationAsRead(id);
    }
    setItems((prev) => prev.map((x) => g.ids.includes(x.id) ? { ...x, is_read: true } : x));

    const n = g.latest;
    if (n.task_id) navigate(`/tasks/${n.task_id}`);
    else if (n.investment_id) navigate(`/investments/${n.investment_id}`);
  };

  const handleMarkAll = async () => {
    await markAllNotificationsAsRead();
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
  };

  const unreadCount = items.filter((n) => !n.is_read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'task_bumped': return <Megaphone size={16} className="text-amber-600" />;
      case 'task_comment_added':
      case 'investment_comment_added':
        return <MessageSquare size={16} className="text-primary-600" />;
      case 'task_created':
      case 'task_status_changed':
        return <ClipboardCheck size={16} className="text-primary-600" />;
      case 'investment_created':
      case 'investment_status_changed':
        return <Building2 size={16} className="text-primary-600" />;
      default: return <Bell size={16} className="text-muted-400" />;
    }
  };

  const fmtRel = (iso: string) => {
    const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (min < 1) return 'teraz';
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h} godz.`;
    return `${Math.floor(h / 24)} dn.`;
  };

  return (
    <>
      <PageHeader title="Powiadomienia" showBack showNotifications={false} />
      <div className="px-4 py-4 mx-auto max-w-lg md:max-w-5xl pb-24 md:pb-8">
        {/* Mark all button */}
        {unreadCount > 0 && (
          <button onClick={handleMarkAll}
            className="flex items-center gap-2 mb-3 text-sm text-primary-600 font-semibold hover:text-primary-700">
            <CheckCheck size={16} />
            Oznacz wszystkie jako przeczytane ({unreadCount})
          </button>
        )}

        {loading && (
          <div className="mt-16 flex flex-col items-center gap-2">
            <Loader2 size={28} className="animate-spin text-primary-500" />
            <p className="text-sm text-muted-500">Ładowanie...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-100 rounded-xl">
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {!loading && !error && grouped.length === 0 && (
          <div className="mt-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
              <Bell size={28} className="text-primary-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Brak powiadomień</h2>
            <p className="text-sm text-muted-500 max-w-xs">Nie masz nowych powiadomień.</p>
          </div>
        )}

        {!loading && !error && grouped.length > 0 && (
          <div className="space-y-1.5">
            {grouped.map((g) => {
              const n = g.latest;
              const isBump = n.type === 'task_bumped';
              const isCritical = n.priority === 'critical' && g.hasUnread;
              const eventLabel = EVENT_LABELS[n.type] || n.type;

              return (
                <button key={g.ids[0]} onClick={() => handleClick(g)}
                  className={`card w-full text-left p-3.5 transition-colors flex gap-3 ${
                    g.hasUnread ? 'bg-primary-50/40 hover:bg-primary-50/70' : 'hover:bg-surface-50'
                  } ${isCritical ? 'border-amber-300' : ''}`}>

                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    isBump && g.hasUnread ? 'bg-amber-100' : isCritical ? 'bg-amber-100' : 'bg-surface-100'
                  }`}>
                    {getIcon(n.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Title row: title + unread dot + event chip + bump count */}
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <p className={`text-sm font-semibold truncate ${g.hasUnread ? 'text-gray-900' : 'text-muted-600'}`}>
                        {n.title}
                      </p>
                      {g.hasUnread && <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />}
                    </div>

                    {/* Chips row */}
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      {/* Event type chip */}
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        isBump ? 'bg-amber-100 text-amber-700'
                        : n.type === 'task_comment_added' ? 'bg-primary-50 text-primary-700'
                        : n.type === 'task_status_changed' ? 'bg-blue-50 text-blue-700'
                        : 'bg-surface-100 text-muted-600'
                      }`}>
                        {eventLabel}
                      </span>

                      {/* Bump count badge */}
                      {isBump && g.count > 1 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">
                          ×{g.count}
                        </span>
                      )}

                      {/* Critical badge */}
                      {isCritical && (
                        <span className="chip chip-critical text-[9px] font-bold uppercase">Pilne</span>
                      )}
                    </div>

                    {/* Body */}
                    {n.body && (
                      <p className={`text-xs truncate ${g.hasUnread ? 'text-muted-500' : 'text-muted-400'}`}>
                        {isBump && g.count > 1
                          ? `${n.body} (podbite ${g.count}×)`
                          : n.body}
                      </p>
                    )}

                    {/* Time */}
                    <p className="text-[11px] text-muted-400 mt-0.5">{fmtRel(n.created_at)}</p>
                  </div>

                  {/* Arrow */}
                  {(n.task_id || n.investment_id) && (
                    <ArrowRight size={14} className="text-muted-300 shrink-0 self-center" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
