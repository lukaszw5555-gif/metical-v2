import { useState } from 'react';
import type { FormEvent } from 'react';
import type { UserProfile, Investment } from '@/types/database';
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS } from '@/lib/constants';
import { X, Loader2, Plus } from 'lucide-react';

interface TaskFormModalProps {
  profiles: UserProfile[];
  investments: Investment[];
  currentUserId: string;
  onSubmit: (data: TaskFormData) => Promise<void>;
  onClose: () => void;
}

export interface TaskFormData {
  title: string;
  description: string;
  assigned_to: string;
  priority: string;
  due_date: string;
  investment_id: string;
}

export default function TaskFormModal({
  profiles,
  investments,
  currentUserId,
  onSubmit,
  onClose,
}: TaskFormModalProps) {
  const today = new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState(currentUserId);
  const [priority, setPriority] = useState('normalny');
  const [dueDate, setDueDate] = useState(today);
  const [investmentId, setInvestmentId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Podaj tytuł zadania.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        assigned_to: assignedTo,
        priority,
        due_date: dueDate,
        investment_id: investmentId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd tworzenia zadania');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[90dvh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-surface-200 px-5 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-base font-semibold text-slate-900">
            Nowe zadanie
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-400 hover:bg-surface-100 hover:text-muted-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="task-title" className="block text-sm font-medium text-slate-700 mb-1.5">
              Tytuł *
            </label>
            <input
              id="task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Np. Zamówić panele"
              className="w-full px-4 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors bg-surface-50"
              disabled={submitting}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="task-desc" className="block text-sm font-medium text-slate-700 mb-1.5">
              Opis
            </label>
            <textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opcjonalny opis zadania..."
              rows={3}
              className="w-full px-4 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors bg-surface-50 resize-none"
              disabled={submitting}
            />
          </div>

          {/* Assigned to */}
          <div>
            <label htmlFor="task-assignee" className="block text-sm font-medium text-slate-700 mb-1.5">
              Osoba przypisana
            </label>
            <select
              id="task-assignee"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-4 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors bg-surface-50"
              disabled={submitting}
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name || p.email}
                  {p.id === currentUserId ? ' (Ja)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Priority + Due Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-priority" className="block text-sm font-medium text-slate-700 mb-1.5">
                Priorytet
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-4 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors bg-surface-50"
                disabled={submitting}
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {TASK_PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="task-due" className="block text-sm font-medium text-slate-700 mb-1.5">
                Termin
              </label>
              <input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors bg-surface-50"
                disabled={submitting}
              />
            </div>
          </div>

          {/* Investment (optional) */}
          {investments.length > 0 && (
            <div>
              <label htmlFor="task-investment" className="block text-sm font-medium text-slate-700 mb-1.5">
                Inwestycja
              </label>
              <select
                id="task-investment"
                value={investmentId}
                onChange={(e) => setInvestmentId(e.target.value)}
                className="w-full px-4 py-2.5 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors bg-surface-50"
                disabled={submitting}
              >
                <option value="">— Bez inwestycji —</option>
                {investments.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.name} ({inv.client_name})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 active:scale-[0.98] transition-all shadow-sm disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Plus size={18} />
            )}
            {submitting ? 'Tworzenie...' : 'Utwórz zadanie'}
          </button>
        </form>
      </div>
    </div>
  );
}
