'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { Heart, Key, Link as LinkIcon, Loader2, ArrowRight } from 'lucide-react';

export default function PairPage() {
  const router = useRouter();
  const auth = useAuthStore();
  const [partnerCode, setPartnerCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isLoadingCode, setIsLoadingCode] = useState(false);

  // Redirect if already paired
  useEffect(() => {
    if (auth.user?.partnerId) {
      router.push('/dashboard');
    }
  }, [auth.user, router]);

  const handleGenerateCode = async () => {
    setErrorMsg('');
    setIsLoadingCode(true);
    try {
      const code = await auth.generatePairCode();
      setGeneratedCode(code);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate code.');
    } finally {
      setIsLoadingCode(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await auth.pairWithCode(partnerCode);
      setSuccessMsg('Successfully paired! Unlocking your dashboard...');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to pair. Double check the code.');
    }
  };

  return (
    <div className="flex-1 flex justify-center items-center px-4 py-12 relative min-h-screen">
      {/* Decorative Blur Blobs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-pink-500/5 rounded-full blur-3xl animate-pulse"></div>

      <div className="glass-panel max-w-lg w-full p-8 rounded-3xl relative z-10 space-y-8">
        <div className="text-center space-y-2">
          <LinkIcon className="w-12 h-12 text-pink-500 mx-auto filter drop-shadow-[0_0_8px_rgba(244,63,94,0.3)]" />
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Couple Pairing</h2>
          <p className="text-slate-400 text-sm">
            Generate a connection code or enter your partner's code to unlock your private space together.
          </p>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl text-xs font-semibold text-center">
            ⚠️ {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl text-xs font-semibold text-center">
            🎉 {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-slate-800">
          {/* Column 1: Generate Code */}
          <div className="space-y-4 pb-6 md:pb-0">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-pink-500">1.</span> Generate Code
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Generate a unique pairing code and send it to your partner. They will enter it on their screen.
            </p>

            {generatedCode ? (
              <div className="space-y-3">
                <div className="bg-slate-950/80 border border-pink-500/30 text-white font-mono text-3xl font-bold tracking-widest py-4 px-2 rounded-xl text-center neon-border-pink">
                  {generatedCode}
                </div>
                <p className="text-[11px] text-pink-500 text-center font-bold uppercase tracking-wider animate-pulse">
                  Active for 24 Hours
                </p>
              </div>
            ) : (
              <button
                onClick={handleGenerateCode}
                disabled={isLoadingCode}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 border border-pink-500/20 hover:border-pink-500/40 text-pink-400 hover:text-white font-bold py-3.5 rounded-xl transition-all duration-200"
              >
                {isLoadingCode ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Generate My Code'}
              </button>
            )}
          </div>

          {/* Column 2: Enter Partner's Code */}
          <div className="space-y-4 pt-6 md:pt-0 md:pl-8">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-violet-500">2.</span> Connect Partner
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              If your partner already generated a pairing code, enter it below to link your accounts instantly.
            </p>

            <form onSubmit={handleConnect} className="space-y-3">
              <input
                type="text"
                placeholder="ENTER CODE"
                value={partnerCode}
                onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full glass-input px-4 py-3 rounded-xl font-mono text-center text-xl font-bold tracking-widest uppercase"
                required
              />
              <button
                type="submit"
                disabled={auth.isLoading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white font-bold py-3.5 rounded-xl transition-all duration-200 active:scale-[0.98] shadow-md shadow-pink-500/20"
              >
                {auth.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Connect Now'}
              </button>
            </form>
          </div>
        </div>

        <div className="pt-4 text-center">
          <button
            onClick={() => auth.logout()}
            className="text-slate-500 hover:text-rose-500 text-xs font-semibold underline underline-offset-4"
          >
            Cancel and Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
