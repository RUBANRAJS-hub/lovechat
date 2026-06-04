'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useCallStore } from '../store/callStore';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Volume2 } from 'lucide-react';
import Link from 'next/link';

const translations = {
  unlockTitle: 'Unlock E2EE Secure Space',
  unlockDescription: 'Your private chat is end-to-end encrypted. Enter your login password to decrypt your secure local keys.',
  passwordPlaceholder: 'Enter password',
  decryptButton: 'Decrypt & Unlock Space',
  resetExplanation: 'Forgot your password or recently reset it? You can recreate your security keys using the password entered above.',
  resetButton: 'Reset Secure Space & Recreate Keys',
  incomingCall: (type: string) => `Incoming ${type} call...`,
  callingPartner: (name: string) => `Calling ${name}...`,
  ringing: 'Ringing...',
  secureConnection: 'SECURE CONNECTION',
  partnerVideoStream: (name: string) => `${name}'s video stream`,
  cameraOff: 'Your camera is off',
  youLabel: 'You',
  voiceCallSubtitle: 'Secure End-to-End Voice Call',
  partnerFallback: 'Your Partner'
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { token, loadUser, isAuthenticated, user, partner, logout } = useAuthStore();
  const { initSocket, disconnectSocket, socket } = useChatStore();
  const call = useCallStore();
  const [passwordInput, setPasswordInput] = useState('');
  const { unlockChat, privateKeyJwk, generateKeysAndSave } = useAuthStore();
  const [unlockError, setUnlockError] = useState('');
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showResetOption, setShowResetOption] = useState(false);

  // 1. Restore Auth on Mount
  useEffect(() => {
    if (token) {
      loadUser();
    }
  }, [token]);

  // 2. Initialize Sockets when Authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      initSocket(token);
    } else {
      disconnectSocket();
    }
    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, token]);

  // 3. Initialize Call Listeners once socket is active
  useEffect(() => {
    if (socket) {
      call.initCallListeners();
    }
  }, [socket]);

  // 4. Prompt user to unlock E2EE Chat if they have keys but private key is not in memory
  useEffect(() => {
    if (user?.hasKeys && !privateKeyJwk && isAuthenticated) {
      setShowUnlockModal(true);
    } else {
      setShowUnlockModal(false);
    }
  }, [user, privateKeyJwk, isAuthenticated]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError('');
    const success = await unlockChat(passwordInput);
    if (success) {
      setShowUnlockModal(false);
      setPasswordInput('');
      setShowResetOption(false);
    } else {
      setUnlockError('Incorrect password. Failed to decrypt chat keys.');
      setShowResetOption(true);
    }
  };

  const handleResetKeys = async () => {
    if (!passwordInput) {
      setUnlockError('Please enter your login password above first.');
      return;
    }
    const confirmed = window.confirm(
      "WARNING: Resetting security keys will permanently make all of your PREVIOUS end-to-end encrypted messages in this chat unreadable. You and your partner will still be able to send new secure messages.\n\nDo you want to proceed?"
    );
    if (!confirmed) return;

    setUnlockError('');
    try {
      await generateKeysAndSave(passwordInput);
      setShowUnlockModal(false);
      setPasswordInput('');
      setShowResetOption(false);
    } catch (err: any) {
      setUnlockError(err.message || 'Failed to reset and recreate secure space keys.');
    }
  };

  // Format Call Timer (MM:SS)
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <>
      <div className="flex-1 flex flex-col min-h-screen relative z-10">
        {children}
      </div>
      {/* --- E2EE CHAT UNLOCK MODAL --- */}
      {showUnlockModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="glass-panel-glow max-w-md w-full p-8 rounded-3xl text-center space-y-6">
            <div className="w-16 h-16 bg-pink-500/10 border border-pink-500/30 rounded-full flex items-center justify-center mx-auto text-pink-500 neon-border-pink">
              <span className="text-2xl font-bold">🔒</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-white">{translations.unlockTitle}</h2>
              <p className="text-slate-400 text-sm">
                {translations.unlockDescription}
              </p>
            </div>
            <form onSubmit={handleUnlock} className="space-y-4">
              <input
                type="password"
                placeholder={translations.passwordPlaceholder}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full glass-input px-4 py-3 rounded-xl text-center"
                required
              />
              {unlockError && <p className="text-rose-500 text-xs">{unlockError}</p>}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 active:scale-[0.98] shadow-md shadow-pink-500/20"
              >
                {translations.decryptButton}
              </button>
              {showResetOption && (
                <div className="pt-4 border-t border-slate-800/80 text-center space-y-2">
                  <p className="text-slate-400 text-xs leading-relaxed">
                    {translations.resetExplanation}
                  </p>
                  <button
                    type="button"
                    onClick={handleResetKeys}
                    className="text-xs text-pink-400 hover:text-pink-300 underline font-semibold transition"
                  >
                    {translations.resetButton}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
      {/* --- INCOMING CALL MODAL (Ringer) --- */}
      {call.isIncoming && (
        <div className="fixed inset-0 bg-slate-950/95 flex flex-col justify-between items-center z-50 py-20 px-6">
          <div className="text-center space-y-4 animate-float mt-10">
            <div className="w-28 h-28 bg-gradient-to-r from-pink-500 to-violet-600 rounded-full flex items-center justify-center mx-auto p-1 shadow-lg shadow-pink-500/30">
              <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center text-4xl">
                💝
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-wide text-white">{partner?.name || translations.partnerFallback}</h2>
            <p className="text-pink-500 font-semibold tracking-wider uppercase text-xs animate-pulse">
              {translations.incomingCall(call.callType || 'voice')}
            </p>
          </div>

          <div className="flex gap-8 mb-10">
            <button
              onClick={call.declineCall}
              className="w-16 h-16 bg-rose-600 hover:bg-rose-700 rounded-full flex items-center justify-center text-white transition-all shadow-lg shadow-rose-600/30 hover:scale-105 active:scale-95"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <button
              onClick={call.acceptCall}
              className="w-16 h-16 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center text-white transition-all shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95"
            >
              <Phone className="w-7 h-7" />
            </button>
          </div>
        </div>
      )}

      {/* --- OUTGOING CALL MODAL (Ringing) --- */}
      {call.isOutgoing && (
        <div className="fixed inset-0 bg-slate-950/95 flex flex-col justify-between items-center z-50 py-20 px-6">
          <div className="text-center space-y-4 mt-10">
            <div className="w-28 h-28 bg-gradient-to-r from-pink-500 to-violet-600 rounded-full flex items-center justify-center mx-auto p-1 shadow-lg shadow-pink-500/30">
              <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center text-4xl">
                📞
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-wide text-white">{translations.callingPartner(partner?.name || translations.partnerFallback)}</h2>
            <p className="text-violet-400 font-medium tracking-wide text-sm animate-pulse">
              {translations.ringing}
            </p>
          </div>

          <div className="mb-10">
            <button
              onClick={call.endCall}
              className="w-16 h-16 bg-rose-600 hover:bg-rose-700 rounded-full flex items-center justify-center text-white transition-all shadow-lg shadow-rose-600/30 hover:scale-105 active:scale-95"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
          </div>
        </div>
      )}

      {/* --- ACTIVE VOICE/VIDEO CALL SCREEN --- */}
      {call.isInCall && (
        <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col justify-between items-center py-10 px-6">
          <div className="w-full flex justify-between items-center max-w-4xl">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-emerald-500 rounded-full animate-ping"></span>
              <span className="text-slate-300 text-sm font-semibold tracking-wider">{translations.secureConnection}</span>
            </div>
            <div className="bg-slate-900 px-4 py-1.5 rounded-full border border-slate-800 text-slate-200 text-sm font-mono font-medium">
              {formatTime(call.callDuration)}
            </div>
          </div>

          {/* Video Feed Area */}
          <div className="w-full max-w-4xl flex-1 my-6 rounded-3xl overflow-hidden glass-panel relative flex items-center justify-center">
            {call.callType === 'video' ? (
              <div className="w-full h-full relative grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                {/* Partner Feed */}
                <div className="bg-slate-900 rounded-2xl overflow-hidden relative border border-pink-500/10 flex items-center justify-center">
                  {call.remoteStream ? (
                    <video
                      ref={(el) => {
                        if (el) el.srcObject = call.remoteStream;
                      }}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center space-y-2">
                      <div className="w-16 h-16 bg-violet-500/10 rounded-full flex items-center justify-center mx-auto text-violet-400">
                        <Video className="w-6 h-6 animate-pulse" />
                      </div>
                      <p className="text-slate-400 text-sm font-medium">{translations.partnerVideoStream(partner?.name || translations.partnerFallback)}</p>
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 bg-slate-950/80 px-3 py-1 rounded-lg text-xs font-semibold border border-slate-800 text-white">
                    {partner?.name || translations.partnerFallback}
                  </div>
                </div>

                {/* Local Feed */}
                <div className="bg-slate-900 rounded-2xl overflow-hidden relative border border-pink-500/10 flex items-center justify-center">
                  {call.localStream && !call.isCameraOff ? (
                    <video
                      ref={(el) => {
                        if (el) el.srcObject = call.localStream;
                      }}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center space-y-2">
                      <div className="w-16 h-16 bg-pink-500/10 rounded-full flex items-center justify-center mx-auto text-pink-400">
                        <VideoOff className="w-6 h-6" />
                      </div>
                      <p className="text-slate-400 text-sm font-medium">{translations.cameraOff}</p>
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 bg-slate-950/80 px-3 py-1 rounded-lg text-xs font-semibold border border-slate-800 text-white">
                    {translations.youLabel}
                  </div>
                </div>
              </div>
            ) : (
              // Voice Call Visualizer
              <div className="text-center space-y-6 animate-float">
                <div className="relative">
                  <div className="w-32 h-32 bg-pink-500/10 border border-pink-500/30 rounded-full flex items-center justify-center mx-auto text-pink-500 neon-border-pink animate-pulse">
                    <Volume2 className="w-12 h-12" />
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-white">{partner?.name || translations.partnerFallback}</h3>
                  <p className="text-slate-400 text-sm font-medium">{translations.voiceCallSubtitle}</p>
                </div>
              </div>
            )}
          </div>

          {/* Call Controls */}
          <div className="w-full max-w-md flex justify-center items-center gap-6">
            <button
              onClick={call.toggleMute}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                call.isMuted
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {call.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              onClick={call.endCall}
              className="w-16 h-16 bg-rose-600 hover:bg-rose-700 rounded-full flex items-center justify-center text-white transition-all shadow-lg shadow-rose-600/30 hover:scale-105 active:scale-95"
            >
              <PhoneOff className="w-6 h-6" />
            </button>

            {call.callType === 'video' && (
              <button
                onClick={call.toggleCamera}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  call.isCameraOff
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {call.isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
