import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { Task, UserProfile, Investment } from '@/types/database';
import {
  TASK_STATUS_DISPLAY_LABELS,
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
  const { user } = useAuth();
  const currentUserId = user?.id ?? '';

  const assignee = profiles.find((p) => p.id === task.assigned_to);
  const creator = profiles.find((p) => p.id === task.created_by);
  const investment = investments?.find((i) => i.id === task.investment_id);
  const isOverdue =
    task.status !== 'zrobione' &&
    task.due_date < new Date().toISOString().split('T')[0];

  // Is this task bumped and assigned to me?
  const isBumpedForMe =
    task.awaiting_response &&
    task.assigned_to === currentUserId &&
    task.status !== 'zrobione';

  const statusColor = TASK_STATUS_COLORS[task.status];
  const priorityColor = TASK_PRIORITY_COLORS[task.priority];

  // Show creator if I'm not the creator (i.e. someone else assigned this to me)
  const showCreator = task.created_by !== currentUserId && creator;

  return (
    <button
      onClick={() => navigate(`/tasks/${task.id}`)}
      className={`card w-full p-4 text-left transition-all ${
        isBumpedForMe
          ? 'bg-amber-50/60 border-amber-200/80 hover:bg-amber-50'
          : 'hover:bg-surface-50'
      }`}
      style={isBumpedForMe ? { borderLeft: '3px solid #f59e0b' } : undefined}
    >
      {/* Top row: title + priority */}
      <div className="flex items-start gap-2 mb-1">
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

      {/* Description snippet */}
      {task.description && (
        <p className="text-xs text-muted-400 line-clamp-2 mb-1.5 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Meta row: creator + investment */}
      {(showCreator || investment) && (
        <div className="flex items-center gap-3 mb-1.5">
          {showCreator && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-400">
              <User size={11} className="shrink-0" />
              <span className="truncate max-w-[120px]">
                Zlecający: {creator.full_name || creator.email}
              </span>
            </span>
          )}
          {investment && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-400">
              <Building2 size={11} className="shrink-0" />
              <span className="truncate max-w-[120px]">{investment.name}</span>
            </span>
          )}
        </div>
      )}

      {/* Bottom row: status, date, assignee, bumped badge */}
      <div className="flex items-center gap-2 text-xs mt-1">
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
          {TASK_STATUS_DISPLAY_LABELS[task.status]}
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

        {/* Bumped indicator */}
        {isBumpedForMe && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">
            Podbite
          </span>
        )}

        {/* Spacer */}
        <span className="flex-1" />

        {/* Assignee (show only if assigned to someone else) */}
        {assignee && task.assigned_to !== currentUserId && (
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
