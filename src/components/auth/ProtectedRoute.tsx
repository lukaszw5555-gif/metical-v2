import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { LogOut } from 'lucide-react';

export default function ProtectedRoute() {
  const { session, profile, loading, signOut } = useAuth();

  // 1. Still loading session / profile
  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-surface-50 gap-3">
        <LoadingSpinner size={32} />
        <p className="text-sm text-muted-500">Ładowanie...</p>
      </div>
    );
  }

  // 2. No session → redirect to login
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // 3. User is inactive → show message + sign out
  if (profile && !profile.is_active) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-surface-50">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <LogOut size={28} className="text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            Konto nieaktywne
          </h1>
          <p className="text-sm text-muted-500 mb-6">
            Twoje konto zostało dezaktywowane. Skontaktuj się z administratorem.
          </p>
          <button
            onClick={() => signOut()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 active:scale-[0.98] transition-all shadow-sm"
          >
            <LogOut size={18} />
            Wyloguj się
          </button>
        </div>
      </div>
    );
  }

  // 4. Authenticated + active → render child routes
  return <Outlet />;
}
