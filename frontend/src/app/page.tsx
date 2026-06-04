'use client';

import Link from 'next/link';
import { Sparkles, Heart, Shield, Video, Gamepad2 } from 'lucide-react';

export default function OnboardingLanding() {
  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 relative min-h-screen">
      {/* Decorative Blur Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl animate-pulse-slow"></div>

      <main className="max-w-4xl w-full text-center space-y-12 py-16 relative z-10">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 bg-pink-500/10 border border-pink-500/25 px-4 py-1.5 rounded-full text-pink-500 text-xs font-semibold tracking-wider uppercase shadow-sm shadow-pink-500/10">
            <Sparkles className="w-3.5 h-3.5 text-pink-500 animate-spin" />
            Your Private Digital Sanctuary
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-tight">
            Together, Always.<br />
            Introducing{' '}
            <span className="bg-gradient-to-r from-pink-500 via-rose-400 to-violet-600 bg-clip-text text-transparent neon-text-pink">
              ForeverUs
            </span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto font-medium">
            An AI-powered private ecosystem designed exclusively for couples. Encrypted communication, shared memories, gamified quizzes, and intelligent relationship coaching.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto mt-6">
          <div className="glass-panel p-6 rounded-2xl border border-pink-500/10 hover:border-pink-500/30 transition-all hover:-translate-y-1">
            <div className="w-10 h-10 bg-pink-500/10 rounded-xl flex items-center justify-center text-pink-500 mb-4 mx-auto">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-white font-bold text-base">E2EE Private Chat</h3>
            <p className="text-slate-400 text-xs mt-2">End-to-end encrypted messaging. Your private words stay yours.</p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-pink-500/10 hover:border-pink-500/30 transition-all hover:-translate-y-1">
            <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center text-violet-400 mb-4 mx-auto">
              <Video className="w-5 h-5" />
            </div>
            <h3 className="text-white font-bold text-base">Voice & Video Calls</h3>
            <p className="text-slate-400 text-xs mt-2">Crystal-clear WebRTC voice & video calls directly in your browser.</p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-pink-500/10 hover:border-pink-500/30 transition-all hover:-translate-y-1">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 mb-4 mx-auto">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <h3 className="text-white font-bold text-base">Relationship Games</h3>
            <p className="text-slate-400 text-xs mt-2">Compatibility tests, love language quizzes, truth or dare, and daily challenges.</p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-pink-500/10 hover:border-pink-500/30 transition-all hover:-translate-y-1">
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400 mb-4 mx-auto">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-white font-bold text-base">AI Love Assistant</h3>
            <p className="text-slate-400 text-xs mt-2">Intelligent date planners, conversation starters, and weekly mood dashboards.</p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
          <Link
            href="/auth"
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white font-bold rounded-2xl shadow-lg shadow-pink-500/20 active:scale-[0.98] transition-all duration-200"
          >
            Enter Secure Space
          </Link>
        </div>
      </main>

      <footer className="absolute bottom-6 text-slate-500 text-xs font-semibold tracking-wider">
        FOREVERUS © 2026 • SECURED WITH AES-256 E2EE & WEBRTC
      </footer>
    </div>
  );
}
