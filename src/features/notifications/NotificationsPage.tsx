import { useState, useEffect, useCallback } from 'react';
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

  const handleClick = async (n: Notification) => {
    if (!n.is_read) {
      await markNotificationAsRead(n.id);
      setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x));
    }
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
      case 'task_bumped': return <Megaphone size={16} className="text-amber-500" />;
      case 'task_comment_added':
      case 'investment_comment_added':
        return <MessageSquare size={16} className="text-primary-500" />;
      case 'task_created':
      case 'task_status_changed':
        return <ClipboardCheck size={16} className="text-primary-500" />;
      case 'investment_created':
      case 'investment_status_changed':
        return <Building2 size={16} className="text-primary-500" />;
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
      <div className="px-4 py-4 mx-auto max-w-lg">
        {/* Mark all button */}
        {unreadCount > 0 && (
          <button onClick={handleMarkAll}
            className="flex items-center gap-2 mb-3 text-sm text-primary-600 font-medium hover:text-primary-700">
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

        {!loading && !error && items.length === 0 && (
          <div className="mt-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
              <Bell size={28} className="text-primary-500" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Brak powiadomień</h2>
            <p className="text-sm text-muted-500 max-w-xs">
              Nie masz nowych powiadomień.
            </p>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="space-y-1.5">
            {items.map((n) => (
              <button key={n.id} onClick={() => handleClick(n)}
                className={`w-full text-left p-3.5 rounded-xl transition-colors flex gap-3 ${
                  n.is_read ? 'bg-white hover:bg-surface-50' : 'bg-primary-50/50 hover:bg-primary-50'
                } ${n.priority === 'critical' && !n.is_read ? 'ring-1 ring-amber-300' : ''}`}>
                {/* Icon */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  n.priority === 'critical' && !n.is_read ? 'bg-amber-100' : 'bg-surface-100'
                }`}>
                  {getIcon(n.type)}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className={`text-sm font-medium truncate ${n.is_read ? 'text-slate-600' : 'text-slate-900'}`}>
                      {n.title}
                    </p>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />}
                    {n.priority === 'critical' && !n.is_read && (
                      <span className="shrink-0 px-1.5 py-0.5 bg-amber-500 text-white text-[9px] font-bold rounded uppercase">
                        Pilne
                      </span>
                    )}
                  </div>
                  {n.body && (
                    <p className={`text-xs truncate ${n.is_read ? 'text-muted-400' : 'text-muted-600'}`}>
                      {n.body}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-400 mt-0.5">{fmtRel(n.created_at)}</p>
                </div>
                {/* Arrow */}
                {(n.task_id || n.investment_id) && (
                  <ArrowRight size={14} className="text-muted-300 shrink-0 self-center" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
