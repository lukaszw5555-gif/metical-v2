import { useNavigate } from 'react-router-dom';
import type { Investment } from '@/types/database';
import {
  INVESTMENT_TYPE_LABELS,
  INVESTMENT_STATUS_LABELS,
  INVESTMENT_STATUS_COLORS,
} from '@/lib/constants';
import { MapPin, User, Banknote } from 'lucide-react';

interface InvestmentCardProps {
  investment: Investment;
}

export default function InvestmentCard({ investment }: InvestmentCardProps) {
  const navigate = useNavigate();
  const statusColor = INVESTMENT_STATUS_COLORS[investment.status];

  return (
    <button
      onClick={() => navigate(`/investments/${investment.id}`)}
      className="card w-full p-4 text-left hover:bg-surface-50 transition-colors"
    >
      {/* Top row: name + status */}
      <div className="flex items-start gap-2 mb-2">
        <h3 className="text-sm font-semibold text-slate-800 flex-1 line-clamp-2">
          {investment.name}
        </h3>
        <span
          className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
          style={{
            backgroundColor: statusColor + '18',
            color: statusColor,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: statusColor }}
          />
          {INVESTMENT_STATUS_LABELS[investment.status]}
        </span>
      </div>

      {/* Info row */}
      <div className="flex items-center gap-3 text-xs flex-wrap">
        {/* Client */}
        <span className="inline-flex items-center gap-1 text-muted-500">
          <User size={12} className="shrink-0" />
          <span className="truncate max-w-[120px]">{investment.client_name}</span>
        </span>

        {/* Type */}
        <span className="text-muted-400">
          {INVESTMENT_TYPE_LABELS[investment.investment_type]}
        </span>

        {/* Deposit */}
        {investment.deposit_paid && (
          <span className="inline-flex items-center gap-1 text-green-600">
            <Banknote size={12} />
            Zaliczka
          </span>
        )}

        <span className="flex-1" />

        {/* Address */}
        {investment.investment_address && (
          <span className="inline-flex items-center gap-1 text-muted-400 max-w-[100px]">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">{investment.investment_address}</span>
          </span>
        )}
      </div>
    </button>
  );
}
