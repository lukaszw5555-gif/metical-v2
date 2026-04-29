import { supabase } from '@/lib/supabase/client';
import type { TaskComment } from '@/types/database';

// ─── Fetch Comments ──────────────────────────────────────

/** Fetch all comments for a task, newest first */
export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
  const { data, error } = await supabase
    .from('task_comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as TaskComment[];
}

// ─── Add Comment ─────────────────────────────────────────

/** Add a comment to a task.
 *  Side effects:
 *  - Updates task.last_activity_at
 *  - If author is the task's assigned_to, clears awaiting_response
 */
export async function addTaskComment(
  taskId: string,
  body: string,
  authorId: string,
  taskAssignedTo: string | null
): Promise<TaskComment> {
  // 1. Insert comment
  const { data: comment, error: commentError } = await supabase
    .from('task_comments')
    .insert({
      task_id: taskId,
      author_id: authorId,
      body,
    })
    .select()
    .single();

  if (commentError) throw commentError;

  // 2. Update task.last_activity_at (and clear awaiting_response if assignee comments)
  const updatePayload: Record<string, unknown> = {
    last_activity_at: new Date().toISOString(),
  };

  if (authorId === taskAssignedTo) {
    updatePayload.awaiting_response = false;
  }

  const { error: taskError } = await supabase
    .from('tasks')
    .update(updatePayload)
    .eq('id', taskId);

  if (taskError) {
    console.error('[Comments] Failed to update task after comment:', taskError.message);
    // Don't throw — the comment was saved successfully
  }

  return comment as TaskComment;
}
