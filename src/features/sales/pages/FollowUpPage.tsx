import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/layout/PageHeader';
import { getLeads } from '@/features/sales/services/salesLeadService';
import { getActiveProfiles } from '@/lib/services/profilesService';
import type { SalesLead, UserProfile } from '@/types/database';
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from '@/lib/constants';
import { Loader2, AlertCircle, CalendarClock, Phone, User, Star, AlertTriangle, Clock, ArrowRight } from 'lucide-react';

type Section = 'overdue' | 'today' | 'future';

export default function FollowUpPage() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<Section>('overdue');

  const load = useCallback(async () => {
    try {
      setError(null);
      const [ld, pr] = await Promise.all([getLeads(), getActiveProfiles()]);
      setLeads(ld); setProfiles(pr);
    } catch (e) { setError(e instanceof Error ? e.message : 'Błąd'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const todayStr = new Date().toDateString();

  const { overdue, today, future } = useMemo(() => {
    const withFollowUp = leads.filter(l => l.next_follow_up_at);
    const todayDate = new Date(todayStr);
    return {
      overdue: withFollowUp.filter(l => new Date(l.next_follow_up_at!) < todayDate),
      today: withFollowUp.filter(l => new Date(l.next_follow_up_at!).toDateString() === todayStr),
      future: withFollowUp.filter(l => new Date(l.next_follow_up_at!) > new Date(todayStr + ' 23:59:59')),
    };
  }, [leads, todayStr]);

  const sections: { key: Section; label: string; count: number; icon: React.ReactNode; color: string }[] = [
    { key: 'overdue', label: 'Zaległe', count: overdue.length, icon: <AlertTriangle size={14} />, color: '#dc2626' },
    { key: 'today', label: 'Dziś', count: today.length, icon: <CalendarClock size={14} />, color: '#d97706' },
    { key: 'future', label: 'Przyszłe', count: future.length, icon: <Clock size={14} />, color: '#2563eb' },
  ];

  const currentLeads = activeSection === 'overdue' ? overdue : activeSection === 'today' ? today : future;
  const fmtDate = (iso: string | null) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
  };

  return (
    <>
      <PageHeader title="Follow-up" showBack />
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
            {/* Section tabs */}
            <div className="flex gap-2 mb-4">
              {sections.map((s) => (
                <button key={s.key} onClick={() => setActiveSection(s.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    activeSection === s.key ? 'text-white shadow-sm' : 'bg-white border border-surface-200 text-muted-600 hover:bg-surface-50'
                  }`}
                  style={activeSection === s.key ? { backgroundColor: s.color } : {}}>
                  {s.icon}
                  {s.label}
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                    activeSection === s.key ? 'bg-white/20 text-white' : 'bg-surface-100 text-muted-500'}`}>
                    {s.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Lead list */}
            {currentLeads.length > 0 ? (
              <div className="space-y-2">
                {currentLeads.map((l) => {
                  const sc2 = LEAD_STATUS_COLORS[l.status];
                  const assignee = profiles.find(p => p.id === l.primary_assigned_to);
                  return (
                    <button key={l.id} onClick={() => navigate(`/sales/leads/${l.id}`)}
                      className="card w-full p-4 text-left hover:bg-surface-50 transition-colors">
                      <div className="flex items-start gap-2 mb-2">
                        <h3 className="text-sm font-bold text-gray-900 flex-1 line-clamp-1">{l.full_name}</h3>
                        {l.is_favorite && <Star size={14} className="text-amber-500 fill-amber-500 shrink-0 mt-0.5" />}
                        <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
                          style={{ backgroundColor: sc2 + '18', color: sc2 }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sc2 }} />
                          {LEAD_STATUS_LABELS[l.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs flex-wrap">
                        <span className="inline-flex items-center gap-1 text-muted-500">
                          <Phone size={11} />{l.phone}
                        </span>
                        {assignee && (
                          <span className="inline-flex items-center gap-1 text-muted-400">
                            <User size={11} /><span className="truncate max-w-[80px]">{assignee.full_name || assignee.email}</span>
                          </span>
                        )}
                        <span className="flex-1" />
                        <span className={`inline-flex items-center gap-1 font-medium ${activeSection === 'overdue' ? 'text-red-500' : 'text-muted-400'}`}>
                          <CalendarClock size={11} />{fmtDate(l.next_follow_up_at)}
                        </span>
                        <ArrowRight size={14} className="text-muted-300" />
                      </div>
                      {l.follow_up_note && (
                        <p className="text-[11px] text-muted-400 mt-1.5 line-clamp-1 italic">„{l.follow_up_note}"</p>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-12 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
                  <CalendarClock size={28} className="text-primary-500" />
                </div>
                <p className="text-sm text-muted-500">
                  {activeSection === 'overdue' ? 'Brak zaległych follow-upów.' :
                   activeSection === 'today' ? 'Brak follow-upów na dziś.' :
                   'Brak zaplanowanych follow-upów.'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
