import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/layout/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { getArchivedTasks } from '@/features/tasks/services/tasksService';
import { getInvestments } from '@/features/investments/services/investmentsService';
import { getActiveProfiles } from '@/lib/services/profilesService';
import type { Task, UserProfile, Investment } from '@/types/database';
import {
  TASK_STATUS_DISPLAY_LABELS,
  TASK_STATUS_COLORS,
} from '@/lib/constants';
import { Loader2, AlertCircle, Archive, Calendar, Building2 } from 'lucide-react';

export default function ArchivedTasksPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id ?? '';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [tasksData, profilesData, investmentsData] = await Promise.all([
        getArchivedTasks(),
        getActiveProfiles(),
        getInvestments(),
      ]);
      // Show only tasks the user created or was assigned to
      const myArchived = tasksData.filter(
        (t) => t.created_by === userId || t.assigned_to === userId
      );
      setTasks(myArchived);
      setProfiles(profilesData);
      setInvestments(investmentsData);
    } catch (err) {
      console.error('[Archive] Load error:', err);
      setError(err instanceof Error ? err.message : 'Błąd ładowania archiwum');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getProfileName = (id: string | null) => {
    if (!id) return '—';
    const p = profiles.find((x) => x.id === id);
    return p ? (p.full_name || p.email) : id.slice(0, 8);
  };

  return (
    <>
      <PageHeader title="Archiwum zadań" showBack />
      <div className="px-4 py-4 mx-auto max-w-lg md:max-w-5xl pb-24 md:pb-8">
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

        {!loading && !error && tasks.length > 0 && (
          <div className="space-y-2">
            {tasks.map((task) => {
              const statusColor = TASK_STATUS_COLORS[task.status];
              const investment = investments.find((i) => i.id === task.investment_id);

              return (
                <button
                  key={task.id}
                  onClick={() => navigate(`/tasks/${task.id}`)}
                  className="card w-full p-4 text-left hover:bg-surface-50 transition-colors opacity-80"
                >
                  {/* Title */}
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">
                    {task.title}
                  </h3>

                  {/* Description snippet */}
                  {task.description && (
                    <p className="text-xs text-muted-400 line-clamp-1 mb-1.5">
                      {task.description}
                    </p>
                  )}

                  {/* Meta row */}
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    {/* Status */}
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
                    <span className="inline-flex items-center gap-1 text-muted-400">
                      <Calendar size={11} />
                      {task.due_date}
                    </span>

                    {/* Investment */}
                    {investment && (
                      <span className="inline-flex items-center gap-1 text-muted-400">
                        <Building2 size={11} />
                        <span className="truncate max-w-[100px]">{investment.name}</span>
                      </span>
                    )}
                  </div>

                  {/* Archive info */}
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-400">
                    <Archive size={11} />
                    <span>
                      Zarchiwizowane {task.archived_at ? formatDate(task.archived_at) : ''}
                      {task.archived_by ? ` przez ${getProfileName(task.archived_by)}` : ''}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {!loading && !error && tasks.length === 0 && (
          <div className="mt-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
              <Archive size={28} className="text-muted-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Archiwum puste
            </h2>
            <p className="text-sm text-muted-500 max-w-xs">
              Nie masz żadnych zarchiwizowanych zadań.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
