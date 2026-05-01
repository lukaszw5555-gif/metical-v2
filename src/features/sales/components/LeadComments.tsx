import { useState } from 'react';
import type { FormEvent } from 'react';
import type { LeadComment, UserProfile } from '@/types/database';
import { Send, Loader2, MessageSquare } from 'lucide-react';

interface LeadCommentsProps {
  comments: LeadComment[];
  profiles: UserProfile[];
  submitting: boolean;
  onSubmit: (body: string) => Promise<void>;
}

export default function LeadComments({ comments, profiles, submitting, onSubmit }: LeadCommentsProps) {
  const [body, setBody] = useState('');

  const profileName = (pid: string) => {
    const p = profiles.find((x) => x.id === pid);
    return p ? (p.full_name || p.email) : pid.slice(0, 8);
  };
  const profileInitials = (pid: string) => {
    const p = profiles.find((x) => x.id === pid);
    if (!p) return '?';
    return p.full_name ? p.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : p.email[0].toUpperCase();
  };
  const fmtRel = (iso: string) => {
    const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (min < 1) return 'przed chwilą';
    if (min < 60) return `${min} min temu`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h} godz. temu`;
    return `${Math.floor(h / 24)} dn. temu`;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    await onSubmit(body.trim());
    setBody('');
  };

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare size={16} className="text-primary-500" />
        <p className="text-xs font-medium text-muted-500 uppercase tracking-wide">Komentarze ({comments.length})</p>
      </div>

      {comments.length > 0 ? (
        <div className="space-y-3 mb-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-primary-700 text-[10px] font-bold">{profileInitials(c.author_id)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-gray-900 truncate">{profileName(c.author_id)}</span>
                  <span className="text-[11px] text-muted-400 shrink-0">{fmtRel(c.created_at)}</span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      ) : <p className="text-sm text-muted-400 mb-4">Brak komentarzy.</p>}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea value={body} onChange={(e) => setBody(e.target.value)}
          placeholder="Napisz komentarz..." rows={2}
          className="flex-1 px-3 py-2 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 bg-surface-50 resize-none"
          disabled={submitting} />
        <button type="submit" disabled={submitting || !body.trim()}
          className="self-end w-10 h-10 flex items-center justify-center bg-primary-600 text-white rounded-xl hover:bg-primary-700 active:scale-95 transition-all disabled:opacity-40 shrink-0">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
}
