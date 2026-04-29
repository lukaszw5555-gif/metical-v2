import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { getTasks, createTask } from '@/features/tasks/services/tasksService';
import { getInvestments } from '@/features/investments/services/investmentsService';
import { getActiveProfiles } from '@/lib/services/profilesService';
import { createNotification } from '@/features/notifications/services/notificationsService';
import TaskCard from '@/features/tasks/components/TaskCard';
import TaskFormModal from '@/features/tasks/components/TaskFormModal';
import type { TaskFormData } from '@/features/tasks/components/TaskFormModal';
import type { Task, UserProfile, Investment } from '@/types/database';
import { ClipboardCheck, Plus, Loader2, AlertCircle } from 'lucide-react';

// ─── Filter Types ────────────────────────────────────────

type TaskFilter = 'moje' | 'zlecone' | 'oczekujace' | 'zalegle' | 'zrobione';

const FILTERS: { key: TaskFilter; label: string }[] = [
  { key: 'moje', label: 'Moje' },
  { key: 'zlecone', label: 'Zlecone' },
  { key: 'oczekujace', label: 'Oczekujące' },
  { key: 'zalegle', label: 'Zaległe' },
  { key: 'zrobione', label: 'Zrobione' },
];

// ─── Component ───────────────────────────────────────────

export default function TasksPage() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<TaskFilter>('moje');
  const [showForm, setShowForm] = useState(false);

  // ─── Fetch Data ──────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [tasksData, profilesData, investmentsData] = await Promise.all([
        getTasks(),
        getActiveProfiles(),
        getInvestments(),
      ]);
      setTasks(tasksData);
      setProfiles(profilesData);
      setInvestments(investmentsData);
    } catch (err) {
      console.error('[Tasks] Load error:', err);
      setError(err instanceof Error ? err.message : 'Błąd ładowania zadań');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Filter Logic ────────────────────────────────────────

  const today = new Date().toISOString().split('T')[0];

  const filteredTasks = tasks.filter((t) => {
    switch (activeFilter) {
      case 'moje':
        return t.assigned_to === userId && t.status !== 'zrobione';
      case 'zlecone':
        return (
          t.created_by === userId &&
          t.assigned_to !== userId &&
          t.status !== 'zrobione'
        );
      case 'oczekujace':
        return t.awaiting_response && t.status !== 'zrobione';
      case 'zalegle':
        return t.due_date < today && t.status !== 'zrobione';
      case 'zrobione':
        return t.status === 'zrobione';
      default:
        return true;
    }
  });

  // ─── Create Task ─────────────────────────────────────────

  const handleCreateTask = async (data: TaskFormData) => {
    const task = await createTask(
      {
        title: data.title,
        description: data.description || undefined,
        priority: data.priority,
        due_date: data.due_date,
        assigned_to: data.assigned_to,
        investment_id: data.investment_id || null,
      },
      userId
    );

    // Notify assignee if different from creator
    if (data.assigned_to && data.assigned_to !== userId) {
      await createNotification({
        recipient_id: data.assigned_to,
        type: 'task_created',
        title: 'Nowe zadanie',
        body: task.title,
        task_id: task.id,
      });
    }

    setShowForm(false);
    await loadData();
  };

  // ─── Render ──────────────────────────────────────────────

  return (
    <>
      <PageHeader title="Zadania" />
      <div className="px-4 py-4 mx-auto max-w-lg">
        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeFilter === f.key
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white text-muted-600 hover:bg-primary-50 hover:text-primary-600 border border-surface-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="mt-16 flex flex-col items-center gap-2">
            <Loader2 size={28} className="animate-spin text-primary-500" />
            <p className="text-sm text-muted-500">Ładowanie zadań...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="mt-6 flex items-start gap-2 p-4 bg-red-50 border border-red-100 rounded-xl">
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Task list */}
        {!loading && !error && filteredTasks.length > 0 && (
          <div className="space-y-2">
            {filteredTasks.map((task) => (
              <TaskCard key={task.id} task={task} profiles={profiles} investments={investments} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredTasks.length === 0 && (
          <div className="mt-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
              <ClipboardCheck size={28} className="text-primary-500" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">
              Brak zadań
            </h2>
            <p className="text-sm text-muted-500 max-w-xs mb-6">
              {activeFilter === 'moje'
                ? 'Nie masz żadnych zadań. Utwórz pierwsze zadanie.'
                : activeFilter === 'zlecone'
                  ? 'Nie zlecasz nikomu żadnych zadań.'
                  : activeFilter === 'oczekujace'
                    ? 'Brak zadań oczekujących na odpowiedź.'
                    : activeFilter === 'zalegle'
                      ? 'Brak zaległych zadań. Świetna robota!'
                      : 'Brak ukończonych zadań.'}
            </p>
            {activeFilter === 'moje' && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 active:scale-[0.98] transition-all shadow-sm"
              >
                <Plus size={18} />
                Nowe zadanie
              </button>
            )}
          </div>
        )}
      </div>

      {/* FAB — always visible */}
      {!loading && (
        <button
          onClick={() => setShowForm(true)}
          className="fixed right-4 bottom-20 z-40 w-14 h-14 bg-primary-600 text-white rounded-2xl shadow-lg hover:bg-primary-700 active:scale-95 transition-all flex items-center justify-center"
          style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
          aria-label="Nowe zadanie"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Create task modal */}
      {showForm && (
        <TaskFormModal
          profiles={profiles}
          investments={investments}
          currentUserId={userId}
          onSubmit={handleCreateTask}
          onClose={() => setShowForm(false)}
        />
      )}
    </>
  );
}
