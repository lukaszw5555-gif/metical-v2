import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/layout/PageHeader';
import { getLeads } from '@/features/sales/services/salesLeadService';
import type { SalesLead } from '@/types/database';
import { LEAD_STATUS_COLORS } from '@/lib/constants';
import { Loader2, AlertCircle, Users, CalendarClock, AlertTriangle, FileText, Trophy, XCircle, ClipboardCheck, ArrowRight } from 'lucide-react';

interface KpiTile {
  label: string;
  count: number;
  color: string;
  icon: React.ReactNode;
}

export default function SalesDashboardPage() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setError(null); setLeads(await getLeads()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Błąd'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const today = new Date().toDateString();
  const tiles: KpiTile[] = [
    { label: 'Nowe leady', count: leads.filter(l => l.status === 'new').length, color: LEAD_STATUS_COLORS.new, icon: <Users size={20} /> },
    { label: 'Follow-up dziś', count: leads.filter(l => l.next_follow_up_at && new Date(l.next_follow_up_at).toDateString() === today).length, color: LEAD_STATUS_COLORS.follow_up, icon: <CalendarClock size={20} /> },
    { label: 'Zaległe follow-upy', count: leads.filter(l => l.next_follow_up_at && new Date(l.next_follow_up_at) < new Date(today)).length, color: '#dc2626', icon: <AlertTriangle size={20} /> },
    { label: 'Zaofertowane', count: leads.filter(l => l.status === 'offered').length, color: LEAD_STATUS_COLORS.offered, icon: <FileText size={20} /> },
    { label: 'Wygrane', count: leads.filter(l => l.status === 'won').length, color: LEAD_STATUS_COLORS.won, icon: <Trophy size={20} /> },
    { label: 'Przegrane', count: leads.filter(l => l.status === 'lost').length, color: LEAD_STATUS_COLORS.lost, icon: <XCircle size={20} /> },
  ];

  return (
    <>
      <PageHeader title="Sprzedaż" />
      <div className="px-4 py-4 mx-auto max-w-lg pb-24">
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

        {!loading && !error && (
          <>
            {/* KPI Tiles */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {tiles.map((t) => (
                <div key={t.label} className="card p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: t.color + '18', color: t.color }}>
                      {t.icon}
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{t.count}</p>
                      <p className="text-[11px] text-muted-500 font-medium leading-tight">{t.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button onClick={() => navigate('/sales/leads')}
              className="card w-full p-4 text-left hover:bg-surface-50 transition-colors flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                <Users size={20} className="text-primary-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">Wszystkie leady</p>
                <p className="text-xs text-muted-500">{leads.length} leadów</p>
              </div>
              <ArrowRight size={16} className="text-muted-300" />
            </button>

            {/* Placeholder: sales tasks */}
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardCheck size={16} className="text-muted-400" />
                <p className="text-xs font-medium text-muted-500 uppercase tracking-wide">Zadania sprzedażowe</p>
              </div>
              <p className="text-sm text-muted-400">W przyszłości w tym miejscu pojawią się zadania przypisane do handlowca.</p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
