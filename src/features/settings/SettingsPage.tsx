import PageHeader from '@/components/layout/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { LogOut, User, Mail, Shield, Settings, CheckCircle } from 'lucide-react';
import { ROLE_LABELS } from '@/lib/constants';

export default function SettingsPage() {
  const { profile, signOut } = useAuth();

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
                <h2 className="text-base font-semibold text-slate-900 truncate">
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
        <p className="text-sm font-medium text-slate-800 truncate">{value}</p>
      </div>
    </div>
  );
}
