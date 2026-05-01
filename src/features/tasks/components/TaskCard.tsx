import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { Task, UserProfile, Investment } from '@/types/database';
import {
  TASK_STATUS_DISPLAY_LABELS,
  TASK_PRIORITY_LABELS,
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

  const isBumpedForMe =
    task.awaiting_response &&
    task.assigned_to === currentUserId &&
    task.status !== 'zrobione';

  const showCreator = task.created_by !== currentUserId && creator;

  // Status chip class
  const statusChipClass =
    task.status === 'zrobione' ? 'chip-done'
    : task.status === 'w_trakcie' ? 'chip-in-progress'
    : 'chip-not-started';

  // Priority chip class
  const priorityChipClass =
    task.priority === 'krytyczny' ? 'chip-critical'
    : task.priority === 'pilny' ? 'chip-urgent'
    : '';

  return (
    <button
      onClick={() => navigate(`/tasks/${task.id}`)}
      className={`card w-full p-4 text-left transition-all ${
        isBumpedForMe
          ? 'border-amber-300 bg-amber-50/50 hover:bg-amber-50'
          : 'hover:bg-surface-50'
      }`}
      style={isBumpedForMe ? { borderLeft: '3px solid #d97706' } : undefined}
    >
      {/* Top row: title + priority */}
      <div className="flex items-start gap-2 mb-1">
        <h3 className="text-sm font-bold text-gray-900 flex-1 line-clamp-2 leading-snug">
          {task.title}
        </h3>
        {task.priority !== 'normalny' && priorityChipClass && (
          <span className={`chip shrink-0 ${priorityChipClass}`}>
            {TASK_PRIORITY_LABELS[task.priority]}
          </span>
        )}
      </div>

      {/* Description snippet */}
      {task.description && (
        <p className="text-xs text-muted-500 line-clamp-2 mb-1.5 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Meta row: creator + investment */}
      {(showCreator || investment) && (
        <div className="flex items-center gap-3 mb-1.5">
          {showCreator && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-500">
              <User size={11} className="shrink-0" />
              <span className="truncate max-w-[120px]">
                Zlecający: {creator.full_name || creator.email}
              </span>
            </span>
          )}
          {investment && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-500">
              <Building2 size={11} className="shrink-0" />
              <span className="truncate max-w-[120px]">{investment.name}</span>
            </span>
          )}
        </div>
      )}

      {/* Bottom row: status, date, assignee, bumped badge */}
      <div className="flex items-center gap-2 text-xs mt-1.5">
        {/* Status badge */}
        <span className={`chip ${statusChipClass}`}>
          <span className="chip-dot" />
          {TASK_STATUS_DISPLAY_LABELS[task.status]}
        </span>

        {/* Due date */}
        <span className={`inline-flex items-center gap-1 ${
          isOverdue ? 'text-red-600 font-semibold' : 'text-muted-500'
        }`}>
          {isOverdue ? <AlertTriangle size={12} /> : <Calendar size={12} />}
          {formatDate(task.due_date)}
        </span>

        {/* Bumped indicator */}
        {isBumpedForMe && (
          <span className="chip chip-bumped">Podbite</span>
        )}

        <span className="flex-1" />

        {/* Assignee */}
        {assignee && task.assigned_to !== currentUserId && (
          <span className="inline-flex items-center gap-1 text-muted-500 max-w-[100px]">
            <User size={12} className="shrink-0" />
            <span className="truncate">{assignee.full_name || assignee.email}</span>
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

  const [y, m, d] = dateStr.split('-');
  void y;
  return `${d}.${m}`;
}
