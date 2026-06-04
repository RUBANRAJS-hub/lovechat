'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import Navbar from '../../components/Navbar';
import { apiRequest } from '../../lib/api';
import { 
  Award, Sparkles, RefreshCw, Trophy, Heart, Dices, 
  HelpCircle, Shuffle, CheckCircle, AlertCircle
} from 'lucide-react';

export default function GamesPage() {
  const router = useRouter();
  const auth = useAuthStore();

  const [activeGame, setActiveGame] = useState<'hub' | 'truth-dare' | 'spin-wheel' | 'love-language' | 'quiz'>('hub');
  const [history, setHistory] = useState<any[]>([]);

  // 1. Truth or Dare State
  const [tdPrompt, setTdPrompt] = useState('');
  const [tdCategory, setTdCategory] = useState<'truth' | 'dare'>('truth');
  const [loadingTd, setLoadingTd] = useState(false);

  // 2. Spin Wheel State
  const [spinning, setSpinning] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  // 3. Love Language State
  const [llQuestions, setLlQuestions] = useState<any[]>([]);
  const [currentLlIndex, setCurrentLlIndex] = useState(0);
  const [llAnswers, setLlAnswers] = useState<Record<string, number>>({}); // questionId -> rating 1-5
  const [llCompleted, setLlCompleted] = useState(false);
  const [llResults, setLlResults] = useState<any>(null);

  // 4. Love Quiz State
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({
    q1: '',
    q2: '',
    q3: '',
    q4: '',
    q5: ''
  });
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResults, setQuizResults] = useState<any>(null);

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

  // Load history
  const loadHistory = async () => {
    try {
      const data = await apiRequest('/games/history', 'GET');
      setHistory(data);
    } catch (err) {}
  };

  useEffect(() => {
    if (auth.token && auth.user?.partnerId) {
      loadHistory();
    }
  }, [auth.token, auth.user, activeGame]);

  // --- TRUTH OR DARE HANDLER ---
  const drawCard = async (cat: 'truth' | 'dare') => {
    setLoadingTd(true);
    setTdCategory(cat);
    try {
      const res = await apiRequest(`/games/truth-dare?category=${cat}`, 'GET');
      setTdPrompt(res.prompt);
    } catch (err) {
      setTdPrompt('Failed to draw card. Try again.');
    } finally {
      setLoadingTd(false);
    }
  };

  // --- SPIN WHEEL HANDLER ---
  const spinWheel = async () => {
    if (spinning) return;
    setSpinning(true);
    setSelectedTask(null);

    // Fetch wheel options
    try {
      const tasks = await apiRequest('/games/spin-tasks', 'GET');
      
      // Simulate spin delay
      setTimeout(async () => {
        const resultTask = tasks[Math.floor(Math.random() * tasks.length)];
        setSelectedTask(resultTask);
        setSpinning(false);

        // Save result
        await apiRequest('/games/spin-submit', 'POST', { task: resultTask });
        loadHistory();
        auth.loadUser(); // Refresh XP
      }, 1500);
    } catch (err) {
      setSpinning(false);
    }
  };

  // --- LOVE LANGUAGE QUIZ HANDLERS ---
  const startLoveLanguage = async () => {
    try {
      const questions = await apiRequest('/games/love-language/questions', 'GET');
      setLlQuestions(questions);
      setCurrentLlIndex(0);
      setLlAnswers({});
      setLlCompleted(false);
      setLlResults(null);
      setActiveGame('love-language');
    } catch (err) {}
  };

  const handleLlAnswer = (score: number) => {
    const currentQ = llQuestions[currentLlIndex];
    const newAnswers: Record<string, number> = { ...llAnswers };
    Reflect.set(newAnswers, String(currentQ.id), score);
    setLlAnswers(newAnswers);

    if (currentLlIndex < llQuestions.length - 1) {
      setCurrentLlIndex(currentLlIndex + 1);
    } else {
      // Calculate totals using Reflect
      const totals: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
      llQuestions.forEach((q) => {
        const category = q.category;
        const currentTotal = Reflect.get(totals, category) || 0;
        const answerVal = Reflect.get(newAnswers, String(q.id)) || 0;
        Reflect.set(totals, category, currentTotal + answerVal);
      });

      submitLoveLanguageScores(totals);
    }
  };

  const submitLoveLanguageScores = async (totals: Record<string, number>) => {
    try {
      await apiRequest('/games/love-language/submit', 'POST', { scores: totals });
      setLlResults(totals);
      setLlCompleted(true);
      auth.loadUser(); // reload XP
    } catch (err) {}
  };

  // --- LOVE QUIZ SUBMIT ---
  const handleQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/games/quiz/submit', 'POST', {
        quizId: 'weekly_compatibility_quiz',
        answers: quizAnswers
      });
      setQuizResults(res.results || { matchPercentage: 0, scoreText: 'Waiting' });
      setQuizSubmitted(true);
      auth.loadUser(); // Refresh XP
    } catch (err) {}
  };

  return (
    <div className="min-h-screen bg-[#060212] flex flex-col pb-16">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Hub Title */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-pink-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4" /> Games Portal
            </span>
            <h2 className="text-3xl font-extrabold text-white">Couple Games Sanctuary</h2>
            <p className="text-slate-400 text-sm">
              Fun quizzes, romantic tasks, truth or dare card draws, and daily challenges.
            </p>
          </div>

          {activeGame !== 'hub' && (
            <button
              onClick={() => setActiveGame('hub')}
              className="py-2.5 px-6 bg-slate-900 border border-slate-800 hover:border-pink-500/20 text-slate-400 hover:text-white rounded-xl font-bold text-xs"
            >
              Back to Games List
            </button>
          )}
        </section>

        {/* HUB GAME SELECTOR LIST */}
        {activeGame === 'hub' && (
          <section className="space-y-8 animate-float">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Game Card 1: Truth or Dare */}
              <div 
                onClick={() => {
                  setActiveGame('truth-dare');
                  setTdPrompt('');
                }}
                className="glass-panel p-6 rounded-3xl hover:border-pink-500/30 transition-all cursor-pointer group flex gap-5"
              >
                <div className="w-14 h-14 bg-pink-500/10 border border-pink-500/20 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-105 transition-transform shrink-0 text-pink-500">
                  <Dices className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-white font-bold text-base block group-hover:text-pink-400">Truth or Dare</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Take turns drawing cards containing romantic truths or silly couple dares.
                  </p>
                </div>
              </div>

              {/* Game Card 2: Spin Wheel */}
              <div 
                onClick={() => {
                  setActiveGame('spin-wheel');
                  setSelectedTask(null);
                }}
                className="glass-panel p-6 rounded-3xl hover:border-pink-500/30 transition-all cursor-pointer group flex gap-5"
              >
                <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-105 transition-transform shrink-0 text-amber-400">
                  <Shuffle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-white font-bold text-base block group-hover:text-amber-400">Spin the Wheel</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Spin to assign random romantic tasks for the week (e.g. massage night, cook dinner).
                  </p>
                </div>
              </div>

              {/* Game Card 3: Love Language Test */}
              <div 
                onClick={startLoveLanguage}
                className="glass-panel p-6 rounded-3xl hover:border-pink-500/30 transition-all cursor-pointer group flex gap-5"
              >
                <div className="w-14 h-14 bg-violet-500/10 border border-violet-500/20 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-105 transition-transform shrink-0 text-violet-400">
                  <Heart className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-white font-bold text-base block group-hover:text-violet-400">Love Language Test</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Take a 10-question quiz to breakdown and compare your love language profiles.
                  </p>
                </div>
              </div>

              {/* Game Card 4: Love Quiz */}
              <div 
                onClick={() => {
                  setActiveGame('quiz');
                  setQuizSubmitted(false);
                  setQuizResults(null);
                  setQuizAnswers({ q1: '', q2: '', q3: '', q4: '', q5: '' });
                }}
                className="glass-panel p-6 rounded-3xl hover:border-pink-500/30 transition-all cursor-pointer group flex gap-5"
              >
                <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-105 transition-transform shrink-0 text-blue-400">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-white font-bold text-base block group-hover:text-blue-400">Weekly Love Quiz</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Submit answers to questions about each other. Overlapping answers score compatibility points!
                  </p>
                </div>
              </div>
            </div>

            {/* History Logs */}
            <div className="glass-panel p-6 rounded-3xl space-y-4">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <Trophy className="w-4 h-4 text-pink-500" /> Recent Game Results & History
              </h3>

              <div className="space-y-3">
                {history.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs font-semibold">
                    No games logged yet. Play to earn rewards!
                  </div>
                ) : (
                  history.slice(0, 5).map((h) => (
                    <div key={h._id} className="bg-slate-950/40 border border-slate-900 rounded-2xl p-4 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-white uppercase block tracking-wider">{h.gameType.replace('-', ' ')}</span>
                        <span className="text-slate-400 mt-1 block">
                          {h.results?.scoreText || h.results?.task || `Session recorded`}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-semibold uppercase">
                        {new Date(h.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}

        {/* --- TRUTH OR DARE GAME SCREEN --- */}
        {activeGame === 'truth-dare' && (
          <section className="glass-panel p-8 rounded-3xl text-center space-y-8 max-w-lg mx-auto">
            <h3 className="text-xl font-bold text-white flex justify-center items-center gap-2">
              🎲 Draw a Truth or Dare Card
            </h3>
            
            <p className="text-slate-400 text-sm">
              Draw a card below. Answer honestly, or complete the dare together!
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => drawCard('truth')}
                className="flex-1 py-4 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-2xl transition-all shadow-md shadow-pink-500/10 active:scale-95"
              >
                Draw TRUTH Card
              </button>
              <button
                onClick={() => drawCard('dare')}
                className="flex-1 py-4 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-2xl transition-all shadow-md shadow-violet-500/10 active:scale-95"
              >
                Draw DARE Card
              </button>
            </div>

            {tdPrompt && (
              <div className={`p-8 rounded-2xl border text-center space-y-4 ${
                tdCategory === 'truth' 
                  ? 'bg-pink-500/5 border-pink-500/30 text-pink-400' 
                  : 'bg-violet-500/5 border-violet-500/30 text-violet-400'
              }`}>
                <span className="text-[10px] font-extrabold tracking-wider uppercase block">
                  {tdCategory} CARD DRAWN
                </span>
                <p className="text-lg font-bold leading-relaxed">{tdPrompt}</p>
              </div>
            )}
          </section>
        )}

        {/* --- SPIN THE WHEEL GAME SCREEN --- */}
        {activeGame === 'spin-wheel' && (
          <section className="glass-panel p-8 rounded-3xl text-center space-y-8 max-w-lg mx-auto">
            <h3 className="text-xl font-bold text-white">🌀 Spin the Task Wheel</h3>
            <p className="text-slate-400 text-sm">
              Spin to decide who performs a romantic task this week. (+10 XP)
            </p>

            {/* Simulated Wheel */}
            <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
              <div className={`w-full h-full rounded-full border-4 border-dashed border-pink-500 flex items-center justify-center relative ${
                spinning ? 'animate-spin' : ''
              }`}>
                <div className="w-10 h-10 bg-slate-950 rounded-full border border-pink-500 z-10"></div>
                <div className="absolute top-0 w-1 h-24 bg-pink-500 origin-bottom"></div>
                <div className="absolute left-0 w-24 h-1 bg-violet-500 origin-right"></div>
              </div>
              <div className="absolute -top-3 left-[90px] w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] border-t-rose-500"></div>
            </div>

            <button
              onClick={spinWheel}
              disabled={spinning}
              className="px-8 py-3.5 bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold rounded-2xl shadow-md active:scale-95 transition-all"
            >
              {spinning ? 'Spinning...' : 'Spin Wheel'}
            </button>

            {selectedTask && (
              <div className="p-6 bg-amber-500/5 border border-amber-500/20 text-amber-400 rounded-2xl">
                <span className="text-[10px] font-extrabold uppercase tracking-wide block">WHEEL TASK SELECTED</span>
                <p className="text-base font-bold mt-1">" {selectedTask} "</p>
              </div>
            )}
          </section>
        )}

        {/* --- LOVE LANGUAGE GAME SCREEN --- */}
        {activeGame === 'love-language' && llQuestions.length > 0 && (
          <section className="glass-panel p-8 rounded-3xl text-center space-y-6 max-w-md mx-auto">
            <h3 className="text-xl font-bold text-white flex justify-center items-center gap-2">
              ❤️ Love Language Profiler
            </h3>

            {!llCompleted ? (
              <div className="space-y-6">
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>Question {currentLlIndex + 1} of {llQuestions.length}</span>
                  <span>{Math.round(((currentLlIndex) / llQuestions.length) * 100)}%</span>
                </div>

                <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-pink-500" 
                    style={{ width: `${((currentLlIndex) / llQuestions.length) * 100}%` }}
                  ></div>
                </div>

                <div className="py-4">
                  <p className="text-base font-bold text-white leading-relaxed">
                    "{llQuestions[currentLlIndex].text}"
                  </p>
                </div>

                <div className="space-y-2">
                  {[
                    { val: 5, label: 'Strongly Agree' },
                    { val: 4, label: 'Agree' },
                    { val: 3, label: 'Neutral' },
                    { val: 2, label: 'Disagree' },
                    { val: 1, label: 'Strongly Disagree' }
                  ].map((btn) => (
                    <button
                      key={btn.val}
                      onClick={() => handleLlAnswer(btn.val)}
                      className="w-full py-2.5 bg-slate-900 border border-slate-800 hover:border-pink-500/20 text-slate-300 hover:text-white rounded-xl font-bold text-xs transition-all"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 px-4 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold">
                  <CheckCircle className="w-5 h-5 text-emerald-400" /> Profiler Completed! (+20 XP)
                </div>

                <div className="space-y-3 text-left">
                  <h4 className="text-white font-bold text-xs uppercase tracking-wide">Your Love Languages Score Breakdown:</h4>
                  {[
                    { cat: 'A', name: 'Words of Affirmation', score: llResults?.A || 0 },
                    { cat: 'B', name: 'Quality Time', score: llResults?.B || 0 },
                    { cat: 'C', name: 'Receiving Gifts', score: llResults?.C || 0 },
                    { cat: 'D', name: 'Acts of Service', score: llResults?.D || 0 },
                    { cat: 'E', name: 'Physical Touch', score: llResults?.E || 0 }
                  ].map((l) => {
                    const percent = Math.min((l.score / 10) * 100, 100); // 10 is max score (2 Qs * 5)
                    return (
                      <div key={l.cat} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-slate-300">
                          <span>{l.name}</span>
                          <span>{l.score} pts</span>
                        </div>
                        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                          <div className="h-full bg-pink-500" style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => setActiveGame('hub')}
                  className="w-full py-3 bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold text-sm rounded-xl transition-all"
                >
                  Return to Lobby
                </button>
              </div>
            )}
          </section>
        )}

        {/* --- LOVE QUIZ WEEKLY SCREEN --- */}
        {activeGame === 'quiz' && (
          <section className="glass-panel p-8 rounded-3xl text-left space-y-6 max-w-lg mx-auto">
            <h3 className="text-xl font-bold text-white text-center flex justify-center items-center gap-2">
              🏆 Weekly Compatibility Quiz
            </h3>

            {!quizSubmitted ? (
              <form onSubmit={handleQuizSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">1. What is your partner's favorite food?</label>
                  <input
                    type="text"
                    placeholder="e.g. Pizza"
                    value={quizAnswers.q1}
                    onChange={(e) => setQuizAnswers({ ...quizAnswers, q1: e.target.value })}
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">2. Where did you two first meet?</label>
                  <input
                    type="text"
                    placeholder="e.g. Central Park"
                    value={quizAnswers.q2}
                    onChange={(e) => setQuizAnswers({ ...quizAnswers, q2: e.target.value })}
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">3. What is their favorite color?</label>
                  <input
                    type="text"
                    placeholder="e.g. Blue"
                    value={quizAnswers.q3}
                    onChange={(e) => setQuizAnswers({ ...quizAnswers, q3: e.target.value })}
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">4. Which season do they like most?</label>
                  <input
                    type="text"
                    placeholder="e.g. Autumn"
                    value={quizAnswers.q4}
                    onChange={(e) => setQuizAnswers({ ...quizAnswers, q4: e.target.value })}
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">5. What is their ultimate dream travel spot?</label>
                  <input
                    type="text"
                    placeholder="e.g. Japan"
                    value={quizAnswers.q5}
                    onChange={(e) => setQuizAnswers({ ...quizAnswers, q5: e.target.value })}
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold text-sm rounded-xl transition-all"
                >
                  Submit Quiz Answers
                </button>
              </form>
            ) : (
              <div className="space-y-6 text-center">
                <div className="bg-pink-500/5 border border-pink-500/20 text-pink-400 p-4 rounded-2xl space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wide block">QUIZ RESULTS</span>
                  <div className="text-4xl font-extrabold text-white">
                    {quizResults?.matchPercentage !== undefined ? `${quizResults.matchPercentage}%` : 'Waiting'}
                  </div>
                  <p className="text-slate-400 text-xs">
                    {quizResults?.scoreText || 'Waiting for partner answers submission to calculate compatibility overlap...'}
                  </p>
                </div>
                <button
                  onClick={() => setActiveGame('hub')}
                  className="w-full py-3 bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs rounded-xl"
                >
                  Back to Hub
                </button>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
