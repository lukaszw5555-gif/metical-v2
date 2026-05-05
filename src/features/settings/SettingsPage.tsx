import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/layout/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { LogOut, User, Mail, Shield, Settings, CheckCircle, Bell, Loader2, Info, Archive, ChevronRight, FileText, Building2, Inbox } from 'lucide-react';
import { ROLE_LABELS } from '@/lib/constants';
import {
  initPush,
  requestPushPermission,
  loginPushUser,
  getPushPermissionStatus,
  getOneSignalSubscriptionInfo,
  type PushPermissionStatus,
} from '@/features/notifications/services/pushService';
import { upsertPushSubscription } from '@/features/notifications/services/pushSubscriptionsService';

// ─── Status Labels ───────────────────────────────────────

const STATUS_LABEL: Record<PushPermissionStatus | 'idle', string> = {
  idle: '',
  granted: '✅ Powiadomienia włączone',
  denied: '🚫 Powiadomienia odrzucone — zmień w ustawieniach przeglądarki',
  default: '⏳ Oczekiwanie na zgodę…',
  unavailable: '⚠️ Powiadomienia push niedostępne w tej przeglądarce',
};

export default function SettingsPage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const [pushStatus, setPushStatus] = useState<PushPermissionStatus | 'idle'>('idle');
  const [pushLoading, setPushLoading] = useState(false);

  const handleEnablePush = useCallback(async () => {
    if (!user) return;
    setPushLoading(true);
    try {
      await initPush();
      await requestPushPermission();
      await loginPushUser(user.id);
      const status = await getPushPermissionStatus();
      setPushStatus(status);

      // Save subscription ID to Supabase for direct targeting
      if (status === 'granted') {
        const subInfo = await getOneSignalSubscriptionInfo();
        if (subInfo.subscriptionId) {
          // Detect platform
          const ua = navigator.userAgent;
          let platform = 'web';
          if (/android/i.test(ua)) platform = 'android';
          else if (/iPhone|iPad|iPod/i.test(ua)) platform = 'ios';

          await upsertPushSubscription({
            user_id: user.id,
            onesignal_subscription_id: subInfo.subscriptionId,
            onesignal_user_id: subInfo.userId,
            platform,
            device_label: navigator.userAgent.slice(0, 100),
            is_active: true,
          });
          console.info('[Settings] Push subscription saved:', subInfo.subscriptionId);
        } else {
          console.warn('[Settings] Push granted but no subscription ID from SDK yet.');
        }
      }
    } catch (err) {
      console.error('[Settings] Push setup failed:', err);
      setPushStatus('unavailable');
    } finally {
      setPushLoading(false);
    }
  }, [user]);

  return (
    <>
      <PageHeader title="Ustawienia" showNotifications={false} />
      <div className="px-4 py-6 mx-auto max-w-lg space-y-4">
        {/* User profile card */}
        {profile && (
          <div className="card p-5">
            {/* Avatar + name */}
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center shrink-0">
                <span className="text-primary-700 font-bold text-lg">
                  {profile.full_name
                    ? profile.full_name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                    : profile.email[0].toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-gray-900 truncate">
                  {profile.full_name || 'Brak imienia'}
                </h2>
                <p className="text-sm text-muted-500 truncate">{profile.email}</p>
              </div>
            </div>

            {/* Profile details */}
            <div className="space-y-3">
              <ProfileRow
                icon={<User size={18} className="text-primary-500" />}
                label="Imię i nazwisko"
                value={profile.full_name || '—'}
              />
              <ProfileRow
                icon={<Mail size={18} className="text-primary-500" />}
                label="E-mail"
                value={profile.email}
              />
              <ProfileRow
                icon={<Shield size={18} className="text-primary-500" />}
                label="Rola"
                value={ROLE_LABELS[profile.role] ?? profile.role}
              />
              <ProfileRow
                icon={<CheckCircle size={18} className={profile.is_active ? 'text-green-500' : 'text-red-400'} />}
                label="Status"
                value={profile.is_active ? 'Aktywny' : 'Nieaktywny'}
              />
            </div>
          </div>
        )}

        {/* ─── Push Notifications Section ──────────────────────── */}
        <div className="card p-5 space-y-4" id="push-notifications-section">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
              <Bell size={20} className="text-primary-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Powiadomienia push</h3>
              <p className="text-xs text-muted-500">Otrzymuj powiadomienia o nowych zadaniach</p>
            </div>
          </div>

          <button
            id="enable-push-btn"
            onClick={handleEnablePush}
            disabled={pushLoading || pushStatus === 'granted'}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                       bg-primary-600 text-white text-sm font-semibold
                       hover:bg-primary-700 active:bg-primary-800
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            {pushLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Konfigurowanie…
              </>
            ) : pushStatus === 'granted' ? (
              <>
                <CheckCircle size={18} />
                Powiadomienia włączone
              </>
            ) : (
              <>
                <Bell size={18} />
                Włącz powiadomienia push
              </>
            )}
          </button>

          {/* Status message */}
          {pushStatus !== 'idle' && (
            <p className="text-xs text-center text-muted-500">{STATUS_LABEL[pushStatus]}</p>
          )}

          {/* iPhone hint */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              Na iPhone powiadomienia push działają po dodaniu aplikacji do ekranu
              początkowego i uruchomieniu jej z ikony.
            </p>
          </div>
        </div>

        {/* ─── PV Components Catalog ───────────────────────── */}
        <button
          onClick={() => navigate('/settings/pv-components')}
          className="card w-full p-4 flex items-center gap-4 text-left hover:bg-surface-50 transition-colors group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 group-hover:bg-amber-100 flex items-center justify-center shrink-0 transition-colors">
            <Settings size={20} className="text-amber-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">Katalog komponentów PV</p>
            <p className="text-xs text-muted-500">Zarządzaj produktami PV, import/export CSV</p>
          </div>
          <ChevronRight size={18} className="text-muted-400 shrink-0" />
        </button>

        {/* ─── Offer Settings ─────────────────────────────── */}
        <button
          onClick={() => navigate('/settings/offer-settings')}
          className="card w-full p-4 flex items-center gap-4 text-left hover:bg-surface-50 transition-colors group"
        >
          <div className="w-10 h-10 rounded-xl bg-primary-50 group-hover:bg-primary-100 flex items-center justify-center shrink-0 transition-colors">
            <FileText size={20} className="text-primary-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">Ustawienia ofert</p>
            <p className="text-xs text-muted-500">Dane firmy, domyślne parametry, teksty PDF</p>
          </div>
          <ChevronRight size={18} className="text-muted-400 shrink-0" />
        </button>

        {/* ─── Lead Drum (admin/administracja only) ────────── */}
        {(profile?.role === 'admin' || profile?.role === 'administracja') && (
          <button
            onClick={() => navigate('/settings/lead-drum')}
            className="card w-full p-4 flex items-center gap-4 text-left hover:bg-surface-50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-50 group-hover:bg-violet-100 flex items-center justify-center shrink-0 transition-colors">
              <Inbox size={20} className="text-violet-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">Bęben leadów</p>
              <p className="text-xs text-muted-500">Przeglądaj, kwalifikuj i przypisuj leady (admin)</p>
            </div>
            <ChevronRight size={18} className="text-muted-400 shrink-0" />
          </button>
        )}

        {/* ─── Archived Investments (admin only) ────────────── */}
        {profile?.role === 'admin' && (
          <button
            onClick={() => navigate('/settings/investments-archive')}
            className="card w-full p-4 flex items-center gap-4 text-left hover:bg-surface-50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-red-50 group-hover:bg-red-100 flex items-center justify-center shrink-0 transition-colors">
              <Building2 size={20} className="text-red-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">Archiwum inwestycji</p>
              <p className="text-xs text-muted-500">Przeglądaj i przywracaj zarchiwizowane inwestycje</p>
            </div>
            <ChevronRight size={18} className="text-muted-400 shrink-0" />
          </button>
        )}

        {/* ─── Archive Link ──────────────────────────────── */}
        <button
          onClick={() => navigate('/tasks/archived')}
          className="card w-full p-4 flex items-center gap-4 text-left hover:bg-surface-50 transition-colors group"
        >
          <div className="w-10 h-10 rounded-xl bg-surface-100 group-hover:bg-surface-200 flex items-center justify-center shrink-0 transition-colors">
            <Archive size={20} className="text-muted-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">Archiwum zadań</p>
            <p className="text-xs text-muted-500">Przeglądaj zarchiwizowane zadania</p>
          </div>
          <ChevronRight size={18} className="text-muted-400 shrink-0" />
        </button>

        {/* Sign out */}
        <button
          onClick={() => signOut()}
          className="card w-full p-4 flex items-center gap-4 text-left hover:bg-red-50 transition-colors group"
        >
          <div className="w-10 h-10 rounded-xl bg-red-50 group-hover:bg-red-100 flex items-center justify-center shrink-0 transition-colors">
            <LogOut size={20} className="text-red-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-red-600">Wyloguj się</p>
            <p className="text-xs text-muted-500">Zakończ sesję</p>
          </div>
        </button>

        {/* App info */}
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 text-muted-400 text-xs">
            <Settings size={14} />
            METICAL V2 · Wersja 0.1.0
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Helper Component ────────────────────────────────────

function ProfileRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-surface-100 last:border-0">
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-400">{label}</p>
        <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
      </div>
    </div>
  );
}
