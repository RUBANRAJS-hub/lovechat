'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import Navbar from '../../components/Navbar';
import { apiRequest } from '../../lib/api';
import { 
  BookOpen, Plus, Trash2, Loader2, Sparkles, Lock, Globe,
  Smile, Frown, Angry, HelpCircle, Heart, Star
} from 'lucide-react';

export default function DiaryPage() {
  const router = useRouter();
  const auth = useAuthStore();

  const [entries, setEntries] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<'happy' | 'romantic' | 'sad' | 'angry' | 'neutral' | 'excited'>('happy');
  const [isPrivate, setIsPrivate] = useState(false);
  const [date, setDate] = useState('');
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  // Guard routing
  useEffect(() => {
    if (!auth.token) {
      router.push('/auth');
      return;
    }
    if (auth.user && !auth.user.partnerId) {
      router.push('/pair');
      return;
    }
  }, [auth.user, auth.token, router]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/diary', 'GET');
      setEntries(data);
    } catch (err) {
      console.error('Failed to fetch diary entries', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth.token && auth.user?.partnerId) {
      loadEntries();
    }
  }, [auth.token, auth.user]);

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content) return;

    setCreating(true);
    try {
      await apiRequest('/diary', 'POST', {
        content,
        mood,
        isPrivate,
        date: date || undefined
      });
      setContent('');
      setMood('happy');
      setIsPrivate(false);
      setDate('');
      setShowAddModal(false);

      // Reload
      loadEntries();
      // Reload user profile for XP updates
      auth.loadUser();
    } catch (err) {
      console.error('Error creating diary entry', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this diary entry?')) return;

    try {
      await apiRequest(`/diary/${id}`, 'DELETE');
      loadEntries();
    } catch (err) {
      console.error('Failed to delete diary entry', err);
    }
  };

  const getMoodDetails = (m: string) => {
    switch (m) {
      case 'happy':
        return { emoji: '😊', color: 'text-amber-400 bg-amber-500/5 border-amber-500/10' };
      case 'romantic':
        return { emoji: '💖', color: 'text-pink-400 bg-pink-500/5 border-pink-500/10' };
      case 'sad':
        return { emoji: '😢', color: 'text-sky-400 bg-sky-500/5 border-sky-500/10' };
      case 'angry':
        return { emoji: '😠', color: 'text-rose-400 bg-rose-500/5 border-rose-500/10' };
      case 'excited':
        return { emoji: '🤩', color: 'text-violet-400 bg-violet-500/5 border-violet-500/10' };
      default:
        return { emoji: '😐', color: 'text-slate-400 bg-slate-500/5 border-slate-500/10' };
    }
  };

  return (
    <div className="min-h-screen bg-[#060212] flex flex-col pb-16">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Title area */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-pink-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" /> Couple Shared Diary
            </span>
            <h2 className="text-3xl font-extrabold text-white">Our Daily Journal</h2>
            <p className="text-slate-400 text-sm">
              Log your mood, share thoughts, or write locked private notes only you can read.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white font-bold px-6 py-3.5 rounded-2xl shadow-lg shadow-pink-500/20 transition-all duration-200 active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" /> Write Entry
          </button>
        </section>

        {/* Entries list */}
        <section className="space-y-6">
          {loading ? (
            <div className="h-64 flex justify-center items-center">
              <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <div className="glass-panel p-12 rounded-3xl text-center space-y-3">
              <BookOpen className="w-12 h-12 text-slate-800 mx-auto" />
              <h4 className="text-white font-bold text-base">Diary is empty</h4>
              <p className="text-slate-500 text-xs max-w-sm mx-auto">
                No entries found. Write your first mood journal entry together to log how you feel and earn couple XP.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map((e) => {
                const isAuthorMe = e.authorId === auth.user?.id;
                const { emoji, color } = getMoodDetails(e.mood);
                
                return (
                  <div 
                    key={e._id}
                    className={`glass-panel p-6 rounded-3xl relative hover:border-pink-500/20 transition-all space-y-4`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{emoji}</span>
                        <div>
                          <span className="text-white font-bold text-sm block">
                            {isAuthorMe ? 'You' : auth.partner?.name}
                          </span>
                          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">
                            {new Date(e.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Private vs Shared flag */}
                        {e.isPrivate ? (
                          <span className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Private Note
                          </span>
                        ) : (
                          <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase flex items-center gap-1">
                            <Globe className="w-3 h-3" /> Shared
                          </span>
                        )}

                        {isAuthorMe && (
                          <button
                            onClick={() => handleDeleteEntry(e._id)}
                            className="text-slate-600 hover:text-rose-500 p-1"
                            title="Delete entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                      {e.content}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* --- WRITE ENTRY MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel-glow max-w-md w-full p-6 rounded-3xl space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-pink-500" /> Write in Diary
            </h3>

            <form onSubmit={handleCreateEntry} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mood Selection</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'happy', label: 'Happy', emoji: '😊' },
                    { id: 'romantic', label: 'Romantic', emoji: '💖' },
                    { id: 'excited', label: 'Excited', emoji: '🤩' },
                    { id: 'sad', label: 'Sad', emoji: '😢' },
                    { id: 'angry', label: 'Angry', emoji: '😠' },
                    { id: 'neutral', label: 'Neutral', emoji: '😐' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMood(m.id as any)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                        mood === m.id
                          ? 'bg-pink-500/10 border-pink-500/30 text-pink-400 shadow-md shadow-pink-500/5'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>{m.emoji}</span>
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Journal Entry</label>
                <textarea
                  placeholder="How was your day? What made you think of your partner today?"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs h-32"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date Logged</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs text-center"
                  />
                </div>
                <div className="space-y-1 flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer py-3 select-none text-xs font-semibold text-slate-300">
                    <input
                      type="checkbox"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-800 text-pink-500 bg-slate-950 focus:ring-pink-500 focus:ring-opacity-25"
                    />
                    <span>Private Note?</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-slate-900 border border-slate-800 text-slate-400 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-pink-500/20"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
