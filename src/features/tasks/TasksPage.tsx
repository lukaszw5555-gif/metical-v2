import { useState, useEffect, useCallback, useMemo } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { getTasks, createTask } from '@/features/tasks/services/tasksService';
import { getInvestments } from '@/features/investments/services/investmentsService';
import { getActiveProfiles } from '@/lib/services/profilesService';
import { createNotification } from '@/features/notifications/services/notificationsService';
import { sendPushNotification } from '@/features/notifications/services/pushSendService';
import TaskCard from '@/features/tasks/components/TaskCard';
import TaskFormModal from '@/features/tasks/components/TaskFormModal';
import type { TaskFormData } from '@/features/tasks/components/TaskFormModal';
import type { Task, UserProfile, Investment } from '@/types/database';
import { ClipboardCheck, Plus, Loader2, AlertCircle } from 'lucide-react';

// ─── Category & Sub-filter Types ─────────────────────────

type Category = 'moje' | 'zlecone' | 'podbite';

type MojeFilter = 'aktywne' | 'wlasne' | 'przypisane' | 'podbite' | 'wykonane';
type ZleconeFilter = 'aktywne' | 'nierozpoczete' | 'w_trakcie' | 'wykonane';

interface FilterDef {
  key: string;
  label: string;
}

const MOJE_FILTERS: FilterDef[] = [
  { key: 'aktywne', label: 'Aktywne' },
  { key: 'wlasne', label: 'Własne' },
  { key: 'przypisane', label: 'Przypisane' },
  { key: 'podbite', label: 'Podbite' },
  { key: 'wykonane', label: 'Wykonane' },
];

const ZLECONE_FILTERS: FilterDef[] = [
  { key: 'aktywne', label: 'Aktywne' },
  { key: 'nierozpoczete', label: 'Nierozpoczęte' },
  { key: 'w_trakcie', label: 'W trakcie' },
  { key: 'wykonane', label: 'Wykonane' },
];

// ─── Filter Helpers ──────────────────────────────────────

/** Is task status "nie rozpoczęto" (do_zrobienia or czeka) */
const isNotStarted = (t: Task) =>
  t.status === 'do_zrobienia' || t.status === 'czeka';

/** Tasks assigned to me (by others) — excludes self-assigned */
const isAssignedToMe = (t: Task, userId: string) =>
  t.assigned_to === userId && t.created_by !== userId;

/** Tasks I created for myself */
const isSelfAssigned = (t: Task, userId: string) =>
  t.created_by === userId && t.assigned_to === userId;

/** Tasks I created and assigned to others */
const isAssignedToOthers = (t: Task, userId: string) =>
  t.created_by === userId && t.assigned_to !== userId;

// ─── Component ───────────────────────────────────────────

export default function TasksPage() {
  const { user, profile: authProfile } = useAuth();
  const userId = user?.id ?? '';
  const actorName = authProfile?.full_name || authProfile?.email || 'Ktoś';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState<Category>('moje');
  const [mojeFilter, setMojeFilter] = useState<MojeFilter>('aktywne');
  const [zleconeFilter, setZleconeFilter] = useState<ZleconeFilter>('aktywne');

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

  // ─── Category Counts ────────────────────────────────────

  const counts = useMemo(() => {
    const moje = tasks.filter(
      (t) =>
        (t.assigned_to === userId || (t.created_by === userId && t.assigned_to === userId)) &&
        t.status !== 'zrobione'
    ).length;

    const zlecone = tasks.filter(
      (t) => isAssignedToOthers(t, userId) && t.status !== 'zrobione'
    ).length;

    const podbite = tasks.filter(
      (t) =>
        isAssignedToOthers(t, userId) &&
        t.awaiting_response &&
        t.status !== 'zrobione'
    ).length;

    return { moje, zlecone, podbite };
  }, [tasks, userId]);

  // ─── Filtered Tasks ─────────────────────────────────────

  const filteredTasks = useMemo(() => {
    let result: Task[] = [];

    if (category === 'moje') {
      switch (mojeFilter) {
        case 'aktywne':
          // Self-assigned + assigned to me by others, excluding done
          result = tasks.filter(
            (t) =>
              (isSelfAssigned(t, userId) || isAssignedToMe(t, userId)) &&
              t.status !== 'zrobione'
          );
          break;
        case 'wlasne':
          // Created by me for myself, excluding done
          result = tasks.filter(
            (t) => isSelfAssigned(t, userId) && t.status !== 'zrobione'
          );
          break;
        case 'przypisane':
          // Assigned to me by someone else, excluding done
          result = tasks.filter(
            (t) => isAssignedToMe(t, userId) && t.status !== 'zrobione'
          );
          break;
        case 'podbite':
          // Assigned to me + awaiting response
          result = tasks.filter(
            (t) => t.assigned_to === userId && t.awaiting_response && t.status !== 'zrobione'
          );
          break;
        case 'wykonane':
          // Done: self-assigned or assigned to me
          result = tasks.filter(
            (t) =>
              (isSelfAssigned(t, userId) || isAssignedToMe(t, userId)) &&
              t.status === 'zrobione'
          );
          break;
      }
    } else if (category === 'zlecone') {
      switch (zleconeFilter) {
        case 'aktywne':
          // Created by me, assigned to others, not done
          result = tasks.filter(
            (t) => isAssignedToOthers(t, userId) && t.status !== 'zrobione'
          );
          break;
        case 'nierozpoczete':
          result = tasks.filter(
            (t) => isAssignedToOthers(t, userId) && isNotStarted(t)
          );
          break;
        case 'w_trakcie':
          result = tasks.filter(
            (t) => isAssignedToOthers(t, userId) && t.status === 'w_trakcie'
          );
          break;
        case 'wykonane':
          result = tasks.filter(
            (t) => isAssignedToOthers(t, userId) && t.status === 'zrobione'
          );
          break;
      }
    } else {
      // podbite — assigned to others by me, bumped, not done
      result = tasks.filter(
        (t) =>
          isAssignedToOthers(t, userId) &&
          t.awaiting_response &&
          t.status !== 'zrobione'
      );
    }

    // Sort: bumped first (for "Moje / Aktywne"), then by last_activity_at desc
    result.sort((a, b) => {
      // In "Moje" category, bumped tasks float to top
      if (category === 'moje') {
        const aBumped = a.awaiting_response && a.assigned_to === userId ? 1 : 0;
        const bBumped = b.awaiting_response && b.assigned_to === userId ? 1 : 0;
        if (aBumped !== bBumped) return bBumped - aBumped;
      }
      return (b.last_activity_at ?? b.updated_at).localeCompare(
        a.last_activity_at ?? a.updated_at
      );
    });

    return result;
  }, [tasks, userId, category, mojeFilter, zleconeFilter]);

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
        title: `${actorName} przypisal(a) Ci zadanie`,
        body: task.title,
        task_id: task.id,
      });

      // Push notification (fire-and-forget)
      sendPushNotification({
        recipientId: data.assigned_to,
        title: `${actorName} przypisal(a) Ci zadanie`,
        body: task.title,
        url: `/tasks/${task.id}`,
        priority: 'normal',
      });
    }

    setShowForm(false);
    await loadData();
  };

  const [showForm, setShowForm] = useState(false);

  // ─── Active sub-filters ─────────────────────────────────

  const subFilters = category === 'moje' ? MOJE_FILTERS : category === 'zlecone' ? ZLECONE_FILTERS : null;
  const activeSubFilter = category === 'moje' ? mojeFilter : category === 'zlecone' ? zleconeFilter : null;

  const setSubFilter = (key: string) => {
    if (category === 'moje') setMojeFilter(key as MojeFilter);
    else if (category === 'zlecone') setZleconeFilter(key as ZleconeFilter);
  };

  // ─── Empty state messages ───────────────────────────────

  const emptyMessage = (() => {
    if (category === 'moje') {
      switch (mojeFilter) {
        case 'aktywne': return 'Nie masz aktywnych zadań.';
        case 'wlasne': return 'Nie masz zadań własnych.';
        case 'przypisane': return 'Nie masz zadań przypisanych przez innych.';
        case 'podbite': return 'Brak podbijanych zadań.';
        case 'wykonane': return 'Brak wykonanych zadań.';
      }
    } else if (category === 'zlecone') {
      switch (zleconeFilter) {
        case 'aktywne': return 'Nie zlecasz nikomu żadnych zadań.';
        case 'nierozpoczete': return 'Brak nierozpoczętych zadań zleconych.';
        case 'w_trakcie': return 'Brak zadań zleconych w trakcie.';
        case 'wykonane': return 'Brak wykonanych zadań zleconych.';
      }
    }
    return 'Brak podbijanych zadań oczekujących na reakcję.';
  })();

  // ─── Render ──────────────────────────────────────────────

  const categories: { key: Category; label: string; count: number }[] = [
    { key: 'moje', label: 'Moje', count: counts.moje },
    { key: 'zlecone', label: 'Zlecone', count: counts.zlecone },
    { key: 'podbite', label: 'Podbite', count: counts.podbite },
  ];

  return (
    <>
      <PageHeader title="Zadania" />
      <div className="px-4 py-4 mx-auto max-w-lg md:max-w-5xl pb-24 md:pb-8">
        {/* ─── Category Tabs ──────────────────────────────── */}
        <div className="flex gap-1 bg-surface-200/60 p-1 rounded-xl mb-3">
          {categories.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                category === c.key
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-muted-500 hover:text-gray-700'
              }`}
            >
              {c.label}
              {c.count > 0 && (
                <span
                  className={`min-w-[20px] h-[20px] inline-flex items-center justify-center px-1.5 text-[10px] font-bold rounded-full leading-none ${
                    category === c.key
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface-300 text-muted-600'
                  }`}
                >
                  {c.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ─── Sub-filters ────────────────────────────────── */}
        {subFilters && (
          <div className="flex gap-1.5 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
            {subFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => setSubFilter(f.key)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  activeSubFilter === f.key
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-white text-muted-600 hover:bg-primary-50 hover:text-primary-700 border border-surface-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
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
              {emptyMessage}
            </p>
            {category === 'moje' && mojeFilter === 'aktywne' && (
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
          className="fixed right-4 bottom-20 md:bottom-8 md:right-8 z-40 w-14 h-14 bg-primary-600 text-white rounded-2xl shadow-lg hover:bg-primary-700 active:scale-95 transition-all flex items-center justify-center"
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
