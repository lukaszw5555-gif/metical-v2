import { supabase } from '@/lib/supabase/client';
import type { Task, TaskStatus } from '@/types/database';

// ─── Fetch Tasks ─────────────────────────────────────────

/** Fetch all tasks visible to the current user (RLS enforced) */
export async function getTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Task[];
}

/** Fetch a single task by ID */
export async function getTaskById(id: string): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Task;
}

// ─── Create Task ─────────────────────────────────────────

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: string;
  due_date?: string;
  assigned_to?: string | null;
  investment_id?: string | null;
}

/** Create a new task. created_by is set to current user.
 *  Logs activity: task_created or task_created_for_investment */
export async function createTask(
  input: CreateTaskInput,
  userId: string
): Promise<Task> {
  const now = new Date().toISOString();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: input.title,
      description: input.description || null,
      status: 'do_zrobienia',
      priority: input.priority || 'normalny',
      due_date: input.due_date || today,
      created_by: userId,
      assigned_to: input.assigned_to ?? userId,
      investment_id: input.investment_id ?? null,
      awaiting_response: false,
      last_activity_at: now,
    })
    .select()
    .single();

  if (error) throw error;
  const task = data as Task;

  // Log activity
  const hasInvestment = !!task.investment_id;
  const { error: logErr } = await supabase.from('activity_log').insert({
    actor_id: userId,
    event_type: hasInvestment ? 'task_created_for_investment' : 'task_created',
    entity_type: 'task',
    entity_id: task.id,
    task_id: task.id,
    investment_id: task.investment_id,
    body: task.title,
    metadata: {},
  });
  if (logErr) console.error('[Tasks] Activity log failed:', logErr.message);

  return task;
}

// ─── Update Task ─────────────────────────────────────────

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  priority?: string;
  due_date?: string;
  assigned_to?: string | null;
  investment_id?: string | null;
  awaiting_response?: boolean;
  last_activity_at?: string;
  last_bumped_at?: string | null;
}

/** Update an existing task */
export async function updateTask(
  id: string,
  input: UpdateTaskInput
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

// ─── Update Status ───────────────────────────────────────

/** Update only the status of a task.
 *  completed_at is handled by the DB trigger. */
export async function updateTaskStatus(
  id: string,
  status: TaskStatus
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      status,
      last_activity_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

// ─── Delete Task ─────────────────────────────────────────

/** Delete a task (admin only via RLS) */
export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ─── Fetch by Investment ─────────────────────────────────

/** Fetch tasks linked to a specific investment */
export async function getTasksByInvestmentId(investmentId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('investment_id', investmentId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Task[];
}

// ─── Bump Task ───────────────────────────────────────────

/** Bump a task — sets awaiting_response, last_bumped_at, last_activity_at */
export async function bumpTask(id: string): Promise<Task> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('tasks')
    .update({
      awaiting_response: true,
      last_bumped_at: now,
      last_activity_at: now,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}
