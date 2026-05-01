import { useNavigate } from 'react-router-dom';
import type { SalesLead, UserProfile } from '@/types/database';
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, LEAD_SOURCE_LABELS } from '@/lib/constants';
import { Phone, Star, CalendarClock, User } from 'lucide-react';

interface LeadCardProps {
  lead: SalesLead;
  profiles: UserProfile[];
}

export default function LeadCard({ lead, profiles }: LeadCardProps) {
  const navigate = useNavigate();
  const sc = LEAD_STATUS_COLORS[lead.status];
  const assignee = profiles.find((p) => p.id === lead.primary_assigned_to);

  const fmtDate = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
  };

  const isOverdue = lead.next_follow_up_at && new Date(lead.next_follow_up_at) < new Date(new Date().toDateString());

  return (
    <button
      onClick={() => navigate(`/sales/leads/${lead.id}`)}
      className="card w-full p-4 text-left hover:bg-surface-50 transition-colors"
    >
      {/* Top row: name + favorite + status */}
      <div className="flex items-start gap-2 mb-2">
        <h3 className="text-sm font-bold text-gray-900 flex-1 line-clamp-1">{lead.full_name}</h3>
        {lead.is_favorite && <Star size={14} className="text-amber-500 fill-amber-500 shrink-0 mt-0.5" />}
        <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
          style={{ backgroundColor: sc + '18', color: sc }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sc }} />
          {LEAD_STATUS_LABELS[lead.status]}
        </span>
      </div>

      {/* Info row */}
      <div className="flex items-center gap-3 text-xs flex-wrap">
        <span className="inline-flex items-center gap-1 text-muted-500">
          <Phone size={11} className="shrink-0" />
          {lead.phone}
        </span>
        <span className="text-muted-400">{LEAD_SOURCE_LABELS[lead.source]}</span>
        {assignee && (
          <span className="inline-flex items-center gap-1 text-muted-400">
            <User size={11} className="shrink-0" />
            <span className="truncate max-w-[80px]">{assignee.full_name || assignee.email}</span>
          </span>
        )}
        <span className="flex-1" />
        {lead.next_follow_up_at && (
          <span className={`inline-flex items-center gap-1 ${isOverdue ? 'text-red-500 font-semibold' : 'text-muted-400'}`}>
            <CalendarClock size={11} className="shrink-0" />
            {fmtDate(lead.next_follow_up_at)}
          </span>
        )}
      </div>
    </button>
  );
}
