'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import { Heart, MessageSquare, Image, Trophy, Calendar, BookOpen, Sparkles, LogOut, Flame, ShieldAlert, Award } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const { user, couple, logout } = useAuthStore();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Heart },
    { name: 'Private Chat', href: '/chat', icon: MessageSquare },
    { name: 'Vault', href: '/vault', icon: Image },
    { name: 'Timeline', href: '/timeline', icon: Calendar },
    { name: 'Goals', href: '/goals', icon: Trophy },
    { name: 'Diary', href: '/diary', icon: BookOpen },
    { name: 'Games', href: '/games', icon: Award },
    { name: 'AI Hub', href: '/ai', icon: Sparkles }
  ];

  if (!user) return null;

  return (
    <header className="glass-panel sticky top-0 z-40 border-b border-pink-500/10 px-4 md:px-8 py-3 flex items-center justify-between w-full">
      <div className="flex items-center gap-8">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl font-bold bg-gradient-to-r from-pink-500 to-violet-600 bg-clip-text text-transparent neon-text-pink">
            ForeverUs
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden xl:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-pink-500/10 border border-pink-500/30 text-pink-400 shadow-sm shadow-pink-500/5'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Stats / Profile / Logout */}
      <div className="flex items-center gap-4">
        {/* Streak Counter */}
        {couple && (
          <div className="flex items-center gap-3 bg-pink-500/5 border border-pink-500/15 rounded-full px-4 py-1.5 text-pink-500">
            <Flame className="w-5 h-5 fill-current text-orange-500 filter drop-shadow-[0_0_5px_rgba(239,68,68,0.5)] animate-pulse" />
            <span className="text-sm font-bold tracking-wide">{couple.streakCount || 0} Days</span>
            
            <div className="h-4 w-px bg-pink-500/20"></div>

            <div className="flex items-center gap-1 text-violet-400 font-bold text-xs tracking-wider uppercase">
              <span className="text-violet-500">LVL</span> {couple.level || 1}
            </div>
          </div>
        )}

        {/* Logged in User Profile Photo */}
        <div className="hidden sm:flex items-center gap-2 bg-slate-950/50 border border-slate-800 rounded-full px-3 py-1">
          <div className="w-7 h-7 rounded-full bg-gradient-to-r from-pink-500 to-violet-600 p-0.5">
            <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-xs font-bold text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
          <span className="text-xs text-slate-300 font-medium max-w-[100px] truncate">{user.name}</span>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/5 rounded-xl border border-slate-800/80 hover:border-rose-500/20 transition-all active:scale-95"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
