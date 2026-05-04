import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/layout/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { getArchivedInvestments, restoreInvestment } from '@/features/investments/services/investmentsService';
import { getActiveProfiles } from '@/lib/services/profilesService';
import type { Investment, UserProfile } from '@/types/database';
import { INVESTMENT_TYPE_LABELS, INVESTMENT_STATUS_LABELS, INVESTMENT_STATUS_COLORS } from '@/lib/constants';
import { Loader2, AlertCircle, Archive, RotateCcw, Building2 } from 'lucide-react';

export default function ArchivedInvestmentsPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id ?? '';
  const isAdmin = profile?.role === 'admin';

  const [investments, setInvestments] = useState<Investment[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [inv, profs] = await Promise.all([getArchivedInvestments(), getActiveProfiles()]);
      setInvestments(inv);
      setProfiles(profs);
    } catch (e) { setError(e instanceof Error ? e.message : 'Błąd'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const profileName = (pid: string | null) => {
    if (!pid) return '—';
    const p = profiles.find((x) => x.id === pid);
    return p ? (p.full_name || p.email) : pid.slice(0, 8);
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });

  const handleRestore = async (inv: Investment) => {
    if (!isAdmin) return;
    if (!confirm(`Czy przywrócić inwestycję „${inv.name}" do aktywnych?`)) return;
    setRestoringId(inv.id);
    try {
      await restoreInvestment(inv.id, userId);
      setInvestments((prev) => prev.filter((i) => i.id !== inv.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd przywracania');
    } finally {
      setRestoringId(null);
    }
  };

  // Non-admin redirect
  if (!isAdmin && !loading) {
    navigate('/settings');
    return null;
  }

  return (
    <>
      <PageHeader title="Archiwum inwestycji" showBack />
      <div className="px-4 py-4 mx-auto max-w-lg md:max-w-3xl pb-24 md:pb-8">
        {loading && (
          <div className="mt-16 flex flex-col items-center gap-2">
            <Loader2 size={28} className="animate-spin text-primary-500" />
            <p className="text-sm text-muted-500">Ładowanie archiwum...</p>
          </div>
        )}

        {error && !loading && (
          <div className="mt-6 flex items-start gap-2 p-4 bg-red-50 border border-red-100 rounded-xl">
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {!loading && !error && investments.length === 0 && (
          <div className="mt-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
              <Archive size={28} className="text-muted-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Archiwum puste</h2>
            <p className="text-sm text-muted-500 max-w-xs">Nie ma zarchiwizowanych inwestycji.</p>
          </div>
        )}

        {!loading && !error && investments.length > 0 && (
          <div className="space-y-3">
            {investments.map((inv) => {
              const sc = INVESTMENT_STATUS_COLORS[inv.status];
              const restoring = restoringId === inv.id;
              return (
                <div key={inv.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Building2 size={18} className="text-muted-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900 truncate">{inv.name}</p>
                      <p className="text-xs text-muted-500 truncate">{inv.client_name}</p>

                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold"
                          style={{ backgroundColor: sc + '18', color: sc }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sc }} />
                          {INVESTMENT_STATUS_LABELS[inv.status]}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-primary-50 text-primary-700">
                          {INVESTMENT_TYPE_LABELS[inv.investment_type]}
                        </span>
                      </div>

                      <div className="mt-2 text-[11px] text-muted-400 space-y-0.5">
                        {inv.archived_at && <p>Archiwizacja: {fmtDate(inv.archived_at)}</p>}
                        {inv.archived_by && <p>Przez: {profileName(inv.archived_by)}</p>}
                      </div>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => handleRestore(inv)}
                        disabled={restoring}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 active:scale-[0.97] transition-all disabled:opacity-60"
                      >
                        {restoring ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                        Przywróć
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
