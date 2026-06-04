'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import Navbar from '../../components/Navbar';
import { apiRequest } from '../../lib/api';
import { 
  Trophy, Plus, Trash2, Loader2, Award, 
  Coins, Plane, Film, ClipboardList, CheckCircle2 
} from 'lucide-react';

export default function GoalsPage() {
  const router = useRouter();
  const auth = useAuthStore();

  const [goals, setGoals] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'travel' | 'money' | 'movie' | 'custom'>('custom');
  const [targetValue, setTargetValue] = useState('1');
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

  const loadGoals = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/goals', 'GET');
      setGoals(data);
    } catch (err) {
      console.error('Failed to fetch goals', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth.token && auth.user?.partnerId) {
      loadGoals();
    }
  }, [auth.token, auth.user]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !targetValue) return;

    setCreating(true);
    try {
      await apiRequest('/goals', 'POST', {
        title,
        description,
        category,
        targetValue: Number(targetValue)
      });
      setTitle('');
      setDescription('');
      setCategory('custom');
      setTargetValue('1');
      setShowAddModal(false);

      // Reload
      loadGoals();
    } catch (err) {
      console.error('Error creating goal', err);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateProgress = async (id: string, currentValue: number, increment: number, target: number) => {
    let newValue = currentValue + increment;
    if (newValue < 0) newValue = 0;
    if (newValue > target) newValue = target;

    try {
      await apiRequest(`/goals/${id}/progress`, 'PUT', { value: newValue });
      
      // Update locally
      setGoals(goals.map((g) => {
        if (g._id === id) {
          const isNowCompleted = newValue >= target;
          return {
            ...g,
            currentValue: newValue,
            status: isNowCompleted ? 'completed' : 'active',
            rewardBadge: isNowCompleted ? `${g.category.toUpperCase()}_CHAMPION` : g.rewardBadge
          };
        }
        return g;
      }));

      // Reload user profile to sync XP level bar on Navbar!
      if (newValue >= target && currentValue < target) {
        auth.loadUser();
      }
    } catch (err) {
      console.error('Failed to update goal progress', err);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Are you sure you want to remove this goal?')) return;

    try {
      await apiRequest(`/goals/${id}`, 'DELETE');
      loadGoals();
    } catch (err) {
      console.error('Failed to delete goal', err);
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'money':
        return <Coins className="w-5 h-5 text-yellow-400" />;
      case 'travel':
        return <Plane className="w-5 h-5 text-sky-400 animate-float" />;
      case 'movie':
        return <Film className="w-5 h-5 text-rose-400" />;
      default:
        return <ClipboardList className="w-5 h-5 text-pink-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#060212] flex flex-col pb-16">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Header title */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-pink-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Trophy className="w-4 h-4" /> Couple Shared Goals
            </span>
            <h2 className="text-3xl font-extrabold text-white">Our Dream Bucket List</h2>
            <p className="text-slate-400 text-sm">
              Save money, plan travels, track movies watched, and achieve milestones together.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white font-bold px-6 py-3.5 rounded-2xl shadow-lg shadow-pink-500/20 transition-all duration-200 active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" /> Add Shared Goal
          </button>
        </section>

        {/* Goals Checklist Grid */}
        <section className="space-y-6">
          {loading ? (
            <div className="h-64 flex justify-center items-center">
              <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
            </div>
          ) : goals.length === 0 ? (
            <div className="glass-panel p-12 rounded-3xl text-center space-y-3">
              <Trophy className="w-12 h-12 text-slate-800 mx-auto" />
              <h4 className="text-white font-bold text-base">No shared goals yet</h4>
              <p className="text-slate-500 text-xs max-w-sm mx-auto">
                Create custom goals like "Save $1000 for Tokyo Trip" or "Watch 10 romantic movies together" and earn XP!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {goals.map((g) => {
                const percent = Math.min(Math.round((g.currentValue / g.targetValue) * 100), 100);
                const isCompleted = g.status === 'completed';

                return (
                  <div 
                    key={g._id}
                    className={`glass-panel p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between space-y-4 border ${
                      isCompleted ? 'border-emerald-500/30 shadow-md shadow-emerald-500/5' : 'border-pink-500/10'
                    }`}
                  >
                    {isCompleted && (
                      <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 px-3.5 py-1 text-[9px] font-extrabold uppercase tracking-wider rounded-bl-xl flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                      </div>
                    )}

                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-950/80 border border-slate-900 rounded-xl flex items-center justify-center">
                          {getCategoryIcon(g.category)}
                        </div>
                        <div>
                          <h3 className="text-white font-bold text-base block group-hover:text-pink-400 truncate max-w-[180px]">
                            {g.title}
                          </h3>
                          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">
                            Category: {g.category}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteGoal(g._id)}
                        className="text-slate-600 hover:text-rose-500 p-1"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-slate-400 text-xs leading-relaxed font-medium">
                      {g.description || 'No description added.'}
                    </p>

                    {/* Progress tracking details */}
                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between text-xs font-bold text-slate-400">
                        <span>Progress</span>
                        <span>{g.currentValue} / {g.targetValue}</span>
                      </div>
                      
                      <div className="w-full h-2.5 bg-slate-950 border border-slate-900 rounded-full overflow-hidden p-0.5">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            isCompleted ? 'bg-emerald-500' : 'bg-pink-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>

                      {/* Interactive adjust controls */}
                      {!isCompleted && (
                        <div className="flex justify-between items-center gap-2 pt-1">
                          <button
                            onClick={() => handleUpdateProgress(g._id, g.currentValue, -1, g.targetValue)}
                            disabled={g.currentValue <= 0}
                            className="flex-1 py-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg font-bold text-[10px] transition-all disabled:opacity-50"
                          >
                            - 1
                          </button>
                          <button
                            onClick={() => handleUpdateProgress(g._id, g.currentValue, 1, g.targetValue)}
                            disabled={g.currentValue >= g.targetValue}
                            className="flex-1 py-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg font-bold text-[10px] transition-all disabled:opacity-50"
                          >
                            + 1
                          </button>
                          {g.targetValue >= 10 && (
                            <button
                              onClick={() => handleUpdateProgress(g._id, g.currentValue, 10, g.targetValue)}
                              disabled={g.currentValue >= g.targetValue}
                              className="flex-1 py-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg font-bold text-[10px] transition-all disabled:opacity-50"
                            >
                              + 10
                            </button>
                          )}
                        </div>
                      )}

                      {/* Completed Reward Alert */}
                      {isCompleted && g.rewardBadge && (
                        <div className="bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-[10px] font-bold p-2 rounded-xl flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-emerald-400 animate-pulse" />
                          Reward Badge: <span className="font-mono text-emerald-300 font-extrabold">{g.rewardBadge}</span> (+50 XP granted)
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

      {/* --- ADD GOAL MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel-glow max-w-md w-full p-6 rounded-3xl space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-pink-500" /> Create Shared Goal
            </h3>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Goal Title</label>
                <input
                  type="text"
                  placeholder="Save money for Paris trip"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
                <textarea
                  placeholder="Saving a target of $1,500 by setting aside $50 every week together."
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
                    <option value="custom">Custom Task</option>
                    <option value="travel">Travel Goal</option>
                    <option value="money">Financial Savings</option>
                    <option value="movie">Movie Checklist</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Count</label>
                  <input
                    type="number"
                    min={1}
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs text-center"
                    required
                  />
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
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
