import { useNavigate } from 'react-router-dom';
import type { Client } from '@/features/clients/services/clientService';
import type { UserProfile } from '@/types/database';
import { Phone, Mail, MapPin, User, ArrowRight, Link2 } from 'lucide-react';

interface Props { client: Client; profiles: UserProfile[]; }

export default function ClientCard({ client, profiles }: Props) {
  const navigate = useNavigate();
  const assignee = profiles.find(p => p.id === client.assigned_to);

  return (
    <button onClick={() => navigate(`/clients/${client.id}`)}
      className="card w-full p-4 text-left hover:bg-surface-50 transition-colors">
      <div className="flex items-start gap-2 mb-2">
        <h3 className="text-sm font-bold text-gray-900 flex-1 line-clamp-1">{client.full_name}</h3>
        {client.created_from_lead_id && (
          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-green-50 text-green-600">
            <Link2 size={9} />z leada
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs flex-wrap">
        {client.phone && <span className="inline-flex items-center gap-1 text-muted-500"><Phone size={11} />{client.phone}</span>}
        {client.email && <span className="inline-flex items-center gap-1 text-muted-400"><Mail size={11} /><span className="truncate max-w-[120px]">{client.email}</span></span>}
        {client.city && <span className="inline-flex items-center gap-1 text-muted-400"><MapPin size={11} />{client.city}</span>}
        {assignee && <span className="inline-flex items-center gap-1 text-muted-400"><User size={11} /><span className="truncate max-w-[80px]">{assignee.full_name || assignee.email}</span></span>}
        <span className="flex-1" />
        <ArrowRight size={14} className="text-muted-300" />
      </div>
    </button>
  );
}
