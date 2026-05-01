import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import { getUnreadCount } from '@/features/notifications/services/notificationsService';

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  showNotifications?: boolean;
}

export default function PageHeader({
  title,
  showBack = false,
  showNotifications = true,
}: PageHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  const isNotificationsPage = location.pathname === '/notifications';

  useEffect(() => {
    if (!showNotifications) return;
    let mounted = true;
    const load = async () => {
      const count = await getUnreadCount();
      if (mounted) setUnread(count);
    };
    load();
    // Poll every 30s
    const interval = setInterval(load, 30_000);
    return () => { mounted = false; clearInterval(interval); };
  }, [showNotifications, location.pathname]);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-surface-200">
      <div className="mx-auto max-w-lg md:max-w-5xl flex items-center justify-between h-14 px-4">
        {/* Left side */}
        <div className="flex items-center gap-3 min-w-0">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center w-9 h-9 -ml-1 rounded-xl text-muted-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
              aria-label="Cofnij"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className="text-lg font-bold text-gray-900 truncate">
            {title}
          </h1>
        </div>

        {/* Right side */}
        {showNotifications && (
          <button
            onClick={() => navigate('/notifications')}
            className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${
              isNotificationsPage
                ? 'text-primary-600 bg-primary-50'
                : 'text-muted-500 hover:text-primary-600 hover:bg-primary-50'
            }`}
            aria-label="Powiadomienia"
          >
            <Bell size={20} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 bg-red-500 text-white text-[10px] font-bold rounded-full leading-none">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>
        )}
      </div>
    </header>
  );
}
