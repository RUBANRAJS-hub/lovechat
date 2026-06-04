'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import Navbar from '../../components/Navbar';
import { apiRequest } from '../../lib/api';
import { 
  Calendar, Heart, Sparkles, Image as ImageIcon, MessageSquare, 
  MapPin, Plus, Trash2, Loader2, ArrowRight
} from 'lucide-react';

export default function TimelinePage() {
  const router = useRouter();
  const auth = useAuthStore();

  const [events, setEvents] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState<'meet' | 'chat' | 'photo' | 'date' | 'anniversary' | 'other'>('date');
  const [mediaUrl, setMediaUrl] = useState('');
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

  const loadTimeline = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/timeline', 'GET');
      setEvents(data);
    } catch (err) {
      console.error('Failed to fetch timeline', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth.token && auth.user?.partnerId) {
      loadTimeline();
    }
  }, [auth.token, auth.user]);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) return;

    setCreating(true);
    try {
      await apiRequest('/timeline', 'POST', {
        title,
        description,
        date,
        category,
        mediaUrl: mediaUrl || undefined
      });
      setTitle('');
      setDescription('');
      setDate('');
      setCategory('date');
      setMediaUrl('');
      setShowAddModal(false);
      
      // Reload
      loadTimeline();
      // Reload user profile for XP updates and dashboard syncing
      auth.loadUser();
    } catch (err) {
      console.error('Error adding milestone', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to remove this milestone?')) return;

    try {
      await apiRequest(`/timeline/${id}`, 'DELETE');
      loadTimeline();
    } catch (err) {
      console.error('Failed to delete milestone', err);
    }
  };

  // Get icon based on category
  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'meet':
        return <Sparkles className="w-5 h-5 text-amber-400" />;
      case 'chat':
        return <MessageSquare className="w-5 h-5 text-blue-400" />;
      case 'photo':
        return <ImageIcon className="w-5 h-5 text-pink-400" />;
      case 'date':
        return <MapPin className="w-5 h-5 text-emerald-400" />;
      case 'anniversary':
        return <Heart className="w-5 h-5 text-rose-500 fill-rose-500/20" />;
      default:
        return <Calendar className="w-5 h-5 text-violet-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#060212] flex flex-col pb-16">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Title and control */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-pink-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4" /> Relationship Timeline
            </span>
            <h2 className="text-3xl font-extrabold text-white">Our Love Milestones</h2>
            <p className="text-slate-400 text-sm">
              Chronological ledger of our special dates, trips, and memories together.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white font-bold px-6 py-3.5 rounded-2xl shadow-lg shadow-pink-500/20 transition-all duration-200 active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" /> Add Milestone
          </button>
        </section>

        {/* Vertical Timeline Tree */}
        <section className="relative">
          {loading ? (
            <div className="h-64 flex justify-center items-center">
              <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <div className="glass-panel p-12 rounded-3xl text-center space-y-3">
              <Calendar className="w-12 h-12 text-slate-800 mx-auto" />
              <h4 className="text-white font-bold text-base">Timeline is empty</h4>
              <p className="text-slate-500 text-xs max-w-sm mx-auto">
                No milestones added. Record your first meeting, first date, or anniversary to unlock the days counter!
              </p>
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-900 ml-4 md:ml-32 py-4 space-y-10">
              {events.map((e, index) => {
                const eventDate = new Date(e.date);
                return (
                  <div key={e._id} className="relative pl-8 md:pl-12 group">
                    {/* Circle Node Icon */}
                    <div className="absolute -left-[21px] top-1.5 bg-slate-950 border-2 border-slate-900 rounded-full w-10 h-10 flex items-center justify-center shadow-lg shadow-black group-hover:border-pink-500/30 transition-colors z-10">
                      {getCategoryIcon(e.category)}
                    </div>

                    {/* Date Tag Left Aligned on Desktop */}
                    <div className="hidden md:block absolute -left-36 top-3 text-right w-24">
                      <span className="text-xs font-bold text-slate-400 block">
                        {eventDate.toLocaleDateString('en-US', { year: 'numeric' })}
                      </span>
                      <span className="text-[10px] font-extrabold text-pink-500 uppercase tracking-wider block">
                        {eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    {/* Milestone Card */}
                    <div className="glass-panel p-6 rounded-3xl space-y-4 hover:border-pink-500/25 transition-all">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {/* Date Tag for Mobile screens */}
                            <span className="md:hidden bg-slate-900 border border-slate-800 text-slate-400 text-[9.5px] font-extrabold px-2 py-0.5 rounded-md uppercase">
                              {eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="bg-pink-500/10 border border-pink-500/20 text-pink-400 text-[9.5px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                              {e.category}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-white group-hover:text-pink-400 transition-colors">
                            {e.title}
                          </h3>
                        </div>

                        <button
                          onClick={() => handleDeleteEvent(e._id)}
                          className="text-slate-600 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete Milestone"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="text-slate-400 text-sm leading-relaxed font-medium">
                        {e.description}
                      </p>

                      {e.mediaUrl && (
                        <div className="rounded-2xl overflow-hidden border border-slate-900 max-w-sm">
                          <img src={e.mediaUrl} alt={e.title} className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* --- ADD MILESTONE MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel-glow max-w-md w-full p-6 rounded-3xl space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-pink-500" /> Add Milestone
            </h3>

            <form onSubmit={handleAddEvent} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Milestone Title</label>
                <input
                  type="text"
                  placeholder="Our First Date"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
                <textarea
                  placeholder="We went to the small Italian cafe downtown and talked for hours..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full glass-input px-3 py-2.5 rounded-xl text-xs bg-slate-950"
                  >
                    <option value="meet">First Meet</option>
                    <option value="chat">First Chat</option>
                    <option value="photo">First Photo</option>
                    <option value="date">First Date</option>
                    <option value="anniversary">Anniversary Date</option>
                    <option value="other">Other Milestone</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Milestone Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs text-center"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Photo URL (Optional)</label>
                <input
                  type="text"
                  placeholder="https://example.com/photo.jpg"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                />
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
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Milestone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
