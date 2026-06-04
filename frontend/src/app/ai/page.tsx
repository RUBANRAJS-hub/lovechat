'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import Navbar from '../../components/Navbar';
import { apiRequest } from '../../lib/api';
import { 
  Sparkles, Send, Loader2, Calendar, Gift, MessageSquare, 
  RefreshCw, Smile, AlertCircle, Heart 
} from 'lucide-react';

export default function AiHubPage() {
  const router = useRouter();
  const auth = useAuthStore();

  const [activeTab, setActiveTab] = useState<'advisor' | 'planner' | 'gifts' | 'starters'>('advisor');

  // 1. AI Relationship Advisor Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; content: string }[]>([
    { role: 'model', content: "Hello! I am your AI Relationship Counselor. I'm here to offer warmth, feedback, date ideas, or custom advice. What is on your mind today?" }
  ]);
  const [loadingChat, setLoadingChat] = useState(false);

  // 2. AI Date Planner State
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('Medium');
  const [mood, setMood] = useState('Romantic');
  const [interests, setInterests] = useState('');
  const [dateSuggestions, setDateSuggestions] = useState('');
  const [loadingDates, setLoadingDates] = useState(false);

  // 3. AI Gift Recommender State
  const [occasion, setOccasion] = useState('Anniversary');
  const [giftInterests, setGiftInterests] = useState('');
  const [giftBudget, setGiftBudget] = useState('Medium');
  const [giftSuggestions, setGiftSuggestions] = useState('');
  const [loadingGifts, setLoadingGifts] = useState(false);

  // 4. AI Conversation Starters State
  const [starters, setStarters] = useState<string[]>([]);
  const [loadingStarters, setLoadingStarters] = useState(false);

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

  // Fetch starters on tab select
  useEffect(() => {
    if (activeTab === 'starters') {
      fetchStarters();
    }
  }, [activeTab]);

  // --- ADVISOR CHAT ---
  const handleSendAdvisorMsg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || loadingChat) return;

    const userMsg = chatInput;
    setChatInput('');
    const updatedHistory = [...chatHistory, { role: 'user' as const, content: userMsg }];
    setChatHistory(updatedHistory);
    setLoadingChat(true);

    try {
      // API call to post chat history
      const res = await apiRequest('/ai/chat', 'POST', {
        history: updatedHistory.slice(-10), // send last 10 exchanges for context
        message: userMsg
      });
      setChatHistory([...updatedHistory, { role: 'model', content: res.reply }]);
    } catch (err) {
      setChatHistory([...updatedHistory, { role: 'model', content: 'Apologies, I experienced connection difficulties. Please try again in a moment.' }]);
    } finally {
      setLoadingChat(false);
    }
  };

  // --- DATE PLANNER ---
  const handlePlanDates = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingDates(true);
    try {
      const res = await apiRequest(
        `/ai/date-planner?location=${location}&budget=${budget}&mood=${mood}&interests=${interests}`,
        'GET'
      );
      setDateSuggestions(res.suggestions);
    } catch (err) {
      setDateSuggestions('Failed to load date ideas.');
    } finally {
      setLoadingDates(false);
    }
  };

  // --- GIFT RECOMMENDER ---
  const handleGetGifts = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingGifts(true);
    try {
      const res = await apiRequest(
        `/ai/gift-recommender?occasion=${occasion}&interests=${giftInterests}&budget=${giftBudget}`,
        'GET'
      );
      setGiftSuggestions(res.suggestions);
    } catch (err) {
      setGiftSuggestions('Failed to load gift suggestions.');
    } finally {
      setLoadingGifts(false);
    }
  };

  // --- CONVO STARTERS ---
  const fetchStarters = async () => {
    setLoadingStarters(true);
    try {
      const res = await apiRequest('/ai/conversation-starters', 'GET');
      setStarters(res);
    } catch (err) {
      setStarters(['Failed to fetch conversation starters.']);
    } finally {
      setLoadingStarters(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060212] flex flex-col pb-16">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Title */}
        <section className="space-y-1">
          <span className="text-pink-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" /> AI Relationship Hub
          </span>
          <h2 className="text-3xl font-extrabold text-white">Your Digital Love Coach</h2>
          <p className="text-slate-400 text-sm">
            Leverage Google Gemini intelligence to brainstorm date ideas, buy gifts, or seek warm relationship counsel.
          </p>
        </section>

        {/* Tab Selector Toolbar */}
        <section className="flex overflow-x-auto gap-2 p-1.5 bg-slate-950/45 border border-slate-900 rounded-2xl">
          {[
            { id: 'advisor', label: 'Love Advisor', icon: MessageSquare },
            { id: 'planner', label: 'Date Planner', icon: Calendar },
            { id: 'gifts', label: 'Gift Genius', icon: Gift },
            { id: 'starters', label: 'Convo Starters', icon: Heart }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-pink-500/10 border border-pink-500/30 text-pink-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </section>

        {/* TAB 1: LOVE ADVISOR CHAT */}
        {activeTab === 'advisor' && (
          <section className="glass-panel rounded-3xl flex flex-col h-[500px] overflow-hidden">
            {/* Scrollable Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {chatHistory.map((msg, idx) => {
                const isModel = msg.role === 'model';
                return (
                  <div key={idx} className={`flex ${isModel ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed font-medium ${
                      isModel 
                        ? 'bg-slate-900/90 text-slate-100 rounded-tl-none border border-slate-800' 
                        : 'bg-pink-500 text-white rounded-tr-none'
                    }`}>
                      {isModel && (
                        <span className="text-[9px] font-extrabold text-pink-400 block uppercase tracking-wider mb-1">
                          💖 Relationship Coach
                        </span>
                      )}
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                );
              })}
              {loadingChat && (
                <div className="flex justify-start">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2 text-xs font-semibold text-slate-400 animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-pink-400" />
                    AI Counselor is typing...
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendAdvisorMsg} className="border-t border-slate-900 p-4 bg-slate-950/20 flex gap-3">
              <input
                type="text"
                placeholder="Ask for advice, e.g. 'How can we resolve disputes about chores?'"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={loadingChat}
                className="flex-1 glass-input px-4 py-3.5 rounded-xl text-xs"
              />
              <button
                type="submit"
                disabled={loadingChat || !chatInput.trim()}
                className="px-6 bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-pink-500/20 disabled:opacity-50"
              >
                <Send className="w-4 h-4" /> Send
              </button>
            </form>
          </section>
        )}

        {/* TAB 2: DATE PLANNER */}
        {activeTab === 'planner' && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left Form Panel */}
            <div className="glass-panel p-6 rounded-3xl h-fit">
              <h3 className="text-white font-bold text-sm mb-4">Date Settings</h3>
              <form onSubmit={handlePlanDates} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Location / Setting</label>
                  <input
                    type="text"
                    placeholder="e.g. Chicago, Cosy home, Beach park"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Budget Level</label>
                  <select
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full glass-input px-3 py-2.5 rounded-xl text-xs bg-slate-950"
                  >
                    <option value="Low (~$15)">Low (~$15)</option>
                    <option value="Medium (~$50)">Medium (~$50)</option>
                    <option value="High ($150+)">High ($150+)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date Mood</label>
                  <select
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    className="w-full glass-input px-3 py-2.5 rounded-xl text-xs bg-slate-950"
                  >
                    <option value="Romantic">Romantic</option>
                    <option value="Adventurous">Adventurous</option>
                    <option value="Creative & Artistic">Creative & Artistic</option>
                    <option value="Cozy & Relaxed">Cozy & Relaxed</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Interests / Hobbies</label>
                  <input
                    type="text"
                    placeholder="e.g. Art, Coffee, Boardgames"
                    value={interests}
                    onChange={(e) => setInterests(e.target.value)}
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loadingDates}
                  className="w-full py-3 bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-pink-500/20"
                >
                  {loadingDates ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Plan My Date'}
                </button>
              </form>
            </div>

            {/* Right Result Markdown Panel */}
            <div className="md:col-span-2 glass-panel p-8 rounded-3xl min-h-[300px] flex flex-col justify-center">
              {loadingDates ? (
                <div className="text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-pink-500 animate-spin mx-auto" />
                  <p className="text-slate-400 text-xs font-medium">Curating custom date plans...</p>
                </div>
              ) : dateSuggestions ? (
                <div className="space-y-4 text-slate-300 prose prose-invert max-w-none text-sm leading-relaxed">
                  <h3 className="text-white font-bold text-lg border-b border-slate-900 pb-3 flex items-center gap-2">
                    ✨ Curated Date Ideas
                  </h3>
                  <div className="whitespace-pre-wrap font-medium">{dateSuggestions}</div>
                </div>
              ) : (
                <div className="text-center text-slate-500 text-xs font-semibold space-y-2">
                  <Calendar className="w-8 h-8 mx-auto" />
                  <p>Choose date parameters on the left and click "Plan My Date" to generate plans.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* TAB 3: GIFT IDEAS */}
        {activeTab === 'gifts' && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Form */}
            <div className="glass-panel p-6 rounded-3xl h-fit">
              <h3 className="text-white font-bold text-sm mb-4">Gift Settings</h3>
              <form onSubmit={handleGetGifts} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Occasion</label>
                  <input
                    type="text"
                    placeholder="e.g. Birthday, Anniversary"
                    value={occasion}
                    onChange={(e) => setOccasion(e.target.value)}
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Partner's Interests</label>
                  <input
                    type="text"
                    placeholder="e.g. Reading, Gaming, Makeup"
                    value={giftInterests}
                    onChange={(e) => setGiftInterests(e.target.value)}
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Budget Level</label>
                  <select
                    value={giftBudget}
                    onChange={(e) => setGiftBudget(e.target.value)}
                    className="w-full glass-input px-3 py-2.5 rounded-xl text-xs bg-slate-950"
                  >
                    <option value="Low (~$20)">Low (~$20)</option>
                    <option value="Medium (~$60)">Medium (~$60)</option>
                    <option value="High ($150+)">High ($150+)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loadingGifts}
                  className="w-full py-3 bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-pink-500/20"
                >
                  {loadingGifts ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Get Gift Ideas'}
                </button>
              </form>
            </div>

            {/* Results */}
            <div className="md:col-span-2 glass-panel p-8 rounded-3xl min-h-[300px] flex flex-col justify-center">
              {loadingGifts ? (
                <div className="text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-pink-500 animate-spin mx-auto" />
                  <p className="text-slate-400 text-xs font-medium">Researching thoughtful gift options...</p>
                </div>
              ) : giftSuggestions ? (
                <div className="space-y-4 text-slate-300 prose prose-invert max-w-none text-sm leading-relaxed">
                  <h3 className="text-white font-bold text-lg border-b border-slate-900 pb-3 flex items-center gap-2">
                    🎁 Recommended Gift Ideas
                  </h3>
                  <div className="whitespace-pre-wrap font-medium">{giftSuggestions}</div>
                </div>
              ) : (
                <div className="text-center text-slate-500 text-xs font-semibold space-y-2">
                  <Gift className="w-8 h-8 mx-auto" />
                  <p>Input gift requirements on the left and click "Get Gift Ideas".</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* TAB 4: CONVERSATION STARTERS */}
        {activeTab === 'starters' && (
          <section className="glass-panel p-8 rounded-3xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-900 pb-4">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                💬 Conversation Prompts
              </h3>
              <button
                onClick={fetchStarters}
                disabled={loadingStarters}
                className="p-2 border border-slate-800 hover:border-pink-500/30 text-slate-400 hover:text-white rounded-xl transition-all"
              >
                {loadingStarters ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </button>
            </div>

            <div className="space-y-4">
              {loadingStarters ? (
                <div className="h-48 flex justify-center items-center">
                  <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
                </div>
              ) : starters.length === 0 ? (
                <div className="text-center text-slate-500 text-xs font-semibold py-8">
                  Click the reload button to fetch starting conversation questions.
                </div>
              ) : (
                starters.map((s, idx) => (
                  <div key={idx} className="bg-slate-950/80 border border-slate-900 rounded-2xl p-5 hover:border-pink-500/10 transition-all flex gap-4 items-start">
                    <div className="w-6 h-6 rounded-lg bg-pink-500/15 border border-pink-500/35 flex items-center justify-center font-bold text-xs text-pink-400 shrink-0 select-none">
                      {idx + 1}
                    </div>
                    <p className="text-white font-bold text-sm leading-relaxed mt-0.5">
                      {s}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
