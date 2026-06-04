'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import Navbar from '../../components/Navbar';
import { apiRequest } from '../../lib/api';
import { Heart, Flame, Trophy, Calendar, Sparkles, BookOpen, Image, Award, ChevronRight, Activity, CalendarClock, Settings } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const { user, couple, partner, isAuthenticated, token } = useAuthStore();

  const [daysCount, setDaysCount] = useState<number | null>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [memories, setMemories] = useState<any[]>([]);
  const [aiStats, setAiStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Anniversary date setting
  const [showAnniversaryModal, setShowAnniversaryModal] = useState(false);
  const [anniversaryInput, setAnniversaryInput] = useState('');

  // 1. Guard route
  useEffect(() => {
    if (!token) {
      router.push('/auth');
      return;
    }
    if (user && !user.partnerId) {
      router.push('/pair');
      return;
    }
  }, [user, token, router]);

  // 2. Fetch Dashboard Content
  useEffect(() => {
    if (user && user.partnerId && couple) {
      const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
          // Fetch goals
          const goalsData = await apiRequest('/goals', 'GET');
          setGoals(goalsData.slice(0, 3)); // show top 3

          // Fetch memories
          const memoriesData = await apiRequest('/vault/memories', 'GET');
          setMemories(memoriesData.slice(0, 4)); // show top 4

          // Fetch AI dashboard analysis
          const aiData = await apiRequest('/ai/dashboard', 'GET');
          setAiStats(aiData);

          // Calculate days together
          if (couple.anniversaryDate) {
            const anni = new Date(couple.anniversaryDate);
            const today = new Date();
            const diffTime = Math.abs(today.getTime() - anni.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            setDaysCount(diffDays);
          }
        } catch (err) {
          console.error('Error fetching dashboard info', err);
        } finally {
          setIsLoading(false);
        }
      };

      fetchDashboardData();
    }
  }, [user, couple]);

  const handleSaveAnniversary = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/timeline', 'POST', {
        title: 'Our Anniversary Date',
        description: 'The beautiful day our journey began!',
        date: anniversaryInput,
        category: 'anniversary'
      });
      // Refresh user to get updated couple object
      useAuthStore.getState().loadUser();
      setShowAnniversaryModal(false);
    } catch (err) {
      console.error('Failed to save anniversary', err);
    }
  };

  if (!user || !partner || !couple) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#060212]">
        <div className="text-center space-y-4">
          <Heart className="w-12 h-12 text-pink-500 animate-pulse mx-auto" />
          <p className="text-slate-400 text-sm font-medium">Entering secure sanctuary...</p>
        </div>
      </div>
    );
  }

  // XP calculations for leveling bar
  const nextLvlXp = couple.level * 200;
  const currentLvlXp = couple.xp;
  const xpPercent = Math.min(Math.round((currentLvlXp / nextLvlXp) * 100), 100);

  return (
    <div className="min-h-screen bg-[#060212] flex flex-col pb-16">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Top Header Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Days Count Glass Card */}
          <div className="glass-panel-glow p-8 rounded-3xl lg:col-span-2 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl"></div>
            
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-pink-500 text-xs font-bold uppercase tracking-wider">Relationship Timeline</span>
                <h2 className="text-3xl font-extrabold text-white">
                  {user.name} & {partner.name}
                </h2>
              </div>
              <button 
                onClick={() => {
                  if (couple.anniversaryDate) {
                    setAnniversaryInput(new Date(couple.anniversaryDate).toISOString().split('T')[0]);
                  }
                  setShowAnniversaryModal(true);
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 rounded-xl transition-all"
                title="Edit Anniversary Date"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

            <div className="my-8 text-center sm:text-left flex flex-col sm:flex-row items-center gap-6">
              <div className="text-7xl md:text-8xl font-black bg-gradient-to-r from-pink-500 via-rose-400 to-violet-600 bg-clip-text text-transparent filter drop-shadow-[0_4px_12px_rgba(255,46,147,0.15)] select-none">
                {daysCount !== null ? daysCount : '—'}
              </div>
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-xl font-bold text-white">Days of Loving Partnership</span>
                <p className="text-slate-400 text-sm">
                  {couple.anniversaryDate 
                    ? `Anniversary: ${new Date(couple.anniversaryDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` 
                    : 'Add anniversary in timeline/settings to track days together.'}
                </p>
              </div>
            </div>

            {/* Couple Level Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span className="flex items-center gap-1.5 text-violet-400">
                  <Award className="w-4 h-4" /> LEVEL {couple.level}
                </span>
                <span>{currentLvlXp} / {nextLvlXp} XP</span>
              </div>
              <div className="w-full h-3 bg-slate-950 border border-slate-800 rounded-full overflow-hidden p-0.5">
                <div 
                  className="h-full bg-gradient-to-r from-pink-500 to-violet-600 rounded-full transition-all duration-500 shadow-md shadow-pink-500/20"
                  style={{ width: `${xpPercent}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* AI Relationship Health Diagnostic Card */}
          <div className="glass-panel p-8 rounded-3xl flex flex-col justify-between border-violet-500/10">
            <div className="flex items-center justify-between">
              <span className="text-violet-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 animate-pulse text-violet-400" /> AI Relationship Health
              </span>
              <span className="bg-violet-500/15 border border-violet-500/30 text-violet-400 text-xs font-extrabold px-3 py-1 rounded-full">
                Weekly Score
              </span>
            </div>

            <div className="my-6 flex items-center gap-6">
              <div className="w-20 h-20 bg-gradient-to-tr from-violet-600 to-pink-500 rounded-2xl flex items-center justify-center text-3xl font-black text-white shadow-lg shadow-violet-500/20">
                {aiStats?.score || 90}
              </div>
              <div className="space-y-1">
                <span className="text-white font-bold text-lg">{aiStats?.trend || 'Warm & Loving'}</span>
                <p className="text-slate-400 text-xs leading-relaxed">
                  {aiStats?.analysis || 'Activity shows stable romantic bonds, high shared memories, and communication streaks! Keep journaling.'}
                </p>
              </div>
            </div>

            <Link 
              href="/ai"
              className="w-full py-3 bg-violet-600/10 hover:bg-violet-600/20 text-violet-400 border border-violet-500/20 hover:border-violet-500/40 text-center font-bold text-sm rounded-2xl transition-all flex items-center justify-center gap-1"
            >
              Open AI Insights <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* Quick Features Access */}
        <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Link href="/chat" className="glass-panel p-5 rounded-2xl hover:border-pink-500/30 transition-all text-center space-y-3 group hover:-translate-y-1">
            <div className="w-12 h-12 bg-pink-500/10 rounded-2xl flex items-center justify-center text-pink-500 mx-auto group-hover:scale-110 transition-transform">
              <Heart className="w-5 h-5 fill-current" />
            </div>
            <span className="text-slate-200 font-bold text-sm block">Private Chat</span>
          </Link>

          <Link href="/vault" className="glass-panel p-5 rounded-2xl hover:border-pink-500/30 transition-all text-center space-y-3 group hover:-translate-y-1">
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400 mx-auto group-hover:scale-110 transition-transform">
              <Image className="w-5 h-5" />
            </div>
            <span className="text-slate-200 font-bold text-sm block">Memory Vault</span>
          </Link>

          <Link href="/timeline" className="glass-panel p-5 rounded-2xl hover:border-pink-500/30 transition-all text-center space-y-3 group hover:-translate-y-1">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 mx-auto group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-slate-200 font-bold text-sm block">Timeline</span>
          </Link>

          <Link href="/goals" className="glass-panel p-5 rounded-2xl hover:border-pink-500/30 transition-all text-center space-y-3 group hover:-translate-y-1">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto group-hover:scale-110 transition-transform">
              <Trophy className="w-5 h-5" />
            </div>
            <span className="text-slate-200 font-bold text-sm block">Shared Goals</span>
          </Link>

          <Link href="/diary" className="glass-panel p-5 rounded-2xl hover:border-pink-500/30 transition-all text-center space-y-3 group hover:-translate-y-1">
            <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 mx-auto group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-slate-200 font-bold text-sm block">Shared Diary</span>
          </Link>

          <Link href="/games" className="glass-panel p-5 rounded-2xl hover:border-pink-500/30 transition-all text-center space-y-3 group hover:-translate-y-1">
            <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-400 mx-auto group-hover:scale-110 transition-transform">
              <Award className="w-5 h-5" />
            </div>
            <span className="text-slate-200 font-bold text-sm block">Games Hub</span>
          </Link>
        </section>

        {/* Bottom Split Section: Recent Memories & Goals */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Goals Checklist Snapshot */}
          <div className="glass-panel p-6 rounded-3xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-emerald-500" /> Active Goals
              </h3>
              <Link href="/goals" className="text-pink-500 hover:text-pink-400 text-xs font-bold flex items-center gap-0.5">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {goals.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs font-semibold">
                  No active goals. Create custom goals to complete together!
                </div>
              ) : (
                goals.map((g) => {
                  const percent = Math.min(Math.round((g.currentValue / g.targetValue) * 100), 100);
                  return (
                    <div key={g._id} className="bg-slate-950/40 border border-slate-900 rounded-2xl p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-white font-bold text-sm block">{g.title}</span>
                          <span className="text-slate-400 text-[11px] block">{g.description || 'No description'}</span>
                        </div>
                        <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                          {g.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold text-slate-300 min-w-[35px] text-right">{percent}%</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Memories Snapshot */}
          <div className="glass-panel p-6 rounded-3xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Image className="w-5 h-5 text-amber-500" /> Recent Vault Memories
              </h3>
              <Link href="/vault" className="text-pink-500 hover:text-pink-400 text-xs font-bold flex items-center gap-0.5">
                Open Vault <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {memories.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs font-semibold">
                Vault is empty. Upload your first romantic memory.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {memories.map((m) => (
                  <div key={m._id} className="relative aspect-square rounded-2xl overflow-hidden group border border-slate-900 hover:border-pink-500/20 transition-all">
                    {m.mediaType === 'image' ? (
                      <img 
                        src={m.mediaUrl} 
                        alt={m.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-900 flex items-center justify-center text-xs font-bold text-slate-400">
                        {m.mediaType === 'video' ? '📹 Video' : '🎵 Audio'}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5">
                      <span className="text-[10px] font-bold text-white block truncate">{m.title}</span>
                      <span className="text-[9px] text-pink-400 block font-semibold">{m.category.toUpperCase()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* --- SET ANNIVERSARY DATE MODAL --- */}
      {showAnniversaryModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel-glow max-w-md w-full p-6 rounded-3xl space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-pink-500" /> Anniversary Date Setup
            </h3>
            <p className="text-slate-400 text-xs">
              When did you and your partner start your beautiful journey together? We will use this to track your "Days together" counter!
            </p>
            <form onSubmit={handleSaveAnniversary} className="space-y-4">
              <input 
                type="date"
                value={anniversaryInput}
                onChange={(e) => setAnniversaryInput(e.target.value)}
                className="w-full glass-input px-4 py-3 rounded-xl text-center text-sm font-semibold"
                required
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAnniversaryModal(false)}
                  className="flex-1 py-3 bg-slate-900 border border-slate-800 text-slate-400 font-bold text-sm rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-pink-500/20"
                >
                  Save Anniversary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
