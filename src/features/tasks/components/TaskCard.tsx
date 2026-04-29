import { useNavigate } from 'react-router-dom';
import type { Task, UserProfile, Investment } from '@/types/database';
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
} from '@/lib/constants';
import { Calendar, AlertTriangle, User, Building2 } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  profiles: UserProfile[];
  investments?: Investment[];
}

export default function TaskCard({ task, profiles, investments }: TaskCardProps) {
  const navigate = useNavigate();

  const assignee = profiles.find((p) => p.id === task.assigned_to);
  const isOverdue =
    task.status !== 'zrobione' &&
    task.due_date < new Date().toISOString().split('T')[0];

  const statusColor = TASK_STATUS_COLORS[task.status];
  const priorityColor = TASK_PRIORITY_COLORS[task.priority];

  return (
    <button
      onClick={() => navigate(`/tasks/${task.id}`)}
      className="card w-full p-4 text-left hover:bg-surface-50 transition-colors"
    >
      {/* Top row: title + priority */}
      <div className="flex items-start gap-2 mb-2">
        <h3 className="text-sm font-semibold text-slate-800 flex-1 line-clamp-2">
          {task.title}
        </h3>
        {task.priority !== 'normalny' && (
          <span
            className="shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase rounded-md text-white"
            style={{ backgroundColor: priorityColor }}
          >
            {TASK_PRIORITY_LABELS[task.priority]}
          </span>
        )}
      </div>

      {/* Investment label */}
      {task.investment_id && investments && (() => {
        const inv = investments.find((i) => i.id === task.investment_id);
        return inv ? (
          <div className="flex items-center gap-1 text-xs text-muted-400 mb-1.5">
            <Building2 size={11} className="shrink-0" />
            <span className="truncate">{inv.name}</span>
          </div>
        ) : null;
      })()}

      {/* Bottom row: status, date, assignee */}
      <div className="flex items-center gap-3 text-xs">
        {/* Status badge */}
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium"
          style={{
            backgroundColor: statusColor + '18',
            color: statusColor,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: statusColor }}
          />
          {TASK_STATUS_LABELS[task.status]}
        </span>

        {/* Due date */}
        <span
          className={`inline-flex items-center gap-1 ${
            isOverdue ? 'text-red-500 font-medium' : 'text-muted-400'
          }`}
        >
          {isOverdue ? (
            <AlertTriangle size={12} />
          ) : (
            <Calendar size={12} />
          )}
          {formatDate(task.due_date)}
        </span>

        {/* Spacer */}
        <span className="flex-1" />

        {/* Assignee */}
        {assignee && (
          <span className="inline-flex items-center gap-1 text-muted-400 max-w-[100px]">
            <User size={12} className="shrink-0" />
            <span className="truncate">
              {assignee.full_name || assignee.email}
            </span>
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Helper ──────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0];
  if (dateStr === today) return 'Dziś';

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Jutro';

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === yesterday.toISOString().split('T')[0]) return 'Wczoraj';

  // Format as DD.MM
  const [y, m, d] = dateStr.split('-');
  void y;
  return `${d}.${m}`;
}
