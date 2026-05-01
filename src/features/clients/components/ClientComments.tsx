import { useState } from 'react';
import type { ClientComment } from '@/features/clients/services/clientCommentsService';
import type { UserProfile } from '@/types/database';
import { MessageSquare, Send, Loader2, User } from 'lucide-react';

interface Props {
  comments: ClientComment[];
  profiles: UserProfile[];
  submitting: boolean;
  onSubmit: (body: string) => Promise<void>;
}

export default function ClientComments({ comments, profiles, submitting, onSubmit }: Props) {
  const [body, setBody] = useState('');

  const handle = async () => {
    if (!body.trim() || submitting) return;
    await onSubmit(body.trim());
    setBody('');
  };

  const profileName = (pid: string) => {
    const p = profiles.find(x => x.id === pid);
    return p ? (p.full_name || p.email) : pid.slice(0, 8);
  };

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare size={16} className="text-muted-400" />
        <p className="text-xs font-medium text-muted-500 uppercase tracking-wide">Komentarze ({comments.length})</p>
      </div>
      {/* Input */}
      <div className="flex gap-2 mb-3">
        <textarea value={body} onChange={(e) => setBody(e.target.value)}
          placeholder="Dodaj komentarz..." rows={1}
          className="flex-1 px-3 py-2 border border-surface-200 rounded-xl text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-primary-500/30 resize-none" />
        <button onClick={handle} disabled={!body.trim() || submitting}
          className="shrink-0 w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 active:scale-95 transition-all disabled:opacity-40">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
      {/* List */}
      {comments.length > 0 && (
        <div className="space-y-2.5">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-primary-50 flex items-center justify-center shrink-0 mt-0.5">
                <User size={14} className="text-primary-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-gray-800">{profileName(c.author_id)}</span>
                  <span className="text-[10px] text-muted-400">
                    {new Date(c.created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
