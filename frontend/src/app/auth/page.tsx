'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../lib/api';
import { Sparkles, Heart, Shield, Loader2, ArrowRight } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const auth = useAuthStore();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [savedPassword, setSavedPassword] = useState(''); // Saved password to trigger keygen on OTP success

  // Form states
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtpMsg, setDevOtpMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password reset state
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'submit'>('request');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await auth.login(email, password);
      if (res.status === 203) {
        // OTP needed
        setOtpEmail(res.email || email);
        setSavedPassword(password);
        setIsOtpStep(true);
      } else if (res.status === 200) {
        // Success
        router.push('/dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Check credentials.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await auth.register(name, username, email, password);
      setOtpEmail(email);
      setSavedPassword(password);
      setIsOtpStep(true);
      if (res.dev_otp) {
        setDevOtpMsg(`Development OTP code is: ${res.dev_otp}`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed.');
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await auth.verifyOtp(otpEmail, otp, savedPassword);
      router.push('/pair'); // Send to pairing screen on new accounts
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid or expired OTP.');
    }
  };

  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await apiRequest<{ dev_otp?: string; email: string }>('/auth/forgot-password', 'POST', { email });
      setOtpEmail(email);
      setResetStep('submit');
      if (res.dev_otp) {
        setDevOtpMsg(`Development OTP code is: ${res.dev_otp}`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send reset code.');
    }
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await apiRequest('/auth/reset-password', 'POST', { email: otpEmail, otp, newPassword: password });
      setSuccessMsg('Password reset successful! You can now log in.');
      setIsForgotPassword(false);
      setResetStep('request');
      setActiveTab('login');
      setPassword('');
      setOtp('');
      setDevOtpMsg('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reset password.');
    }
  };

  return (
    <div className="flex-1 flex justify-center items-center px-4 py-12 relative min-h-screen">
      {/* Decorative Blob */}
      <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-pink-500/5 rounded-full blur-3xl animate-pulse"></div>

      <div className="glass-panel max-w-md w-full p-8 rounded-3xl relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <Heart className="w-12 h-12 text-pink-500 fill-pink-500/10 mx-auto filter drop-shadow-[0_0_8px_rgba(244,63,94,0.3)]" />
          <h2 className="text-3xl font-extrabold tracking-tight text-white">ForeverUs</h2>
          <p className="text-slate-400 text-sm">
            {isOtpStep
              ? 'Verify your secure account'
              : isForgotPassword
              ? 'Reset your secure password'
              : activeTab === 'login'
              ? 'Welcome back to your private space'
              : 'Create your private couple sanctuary'}
          </p>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl text-xs font-semibold text-center">
            ⚠️ {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl text-xs font-semibold text-center">
            ✅ {successMsg}
          </div>
        )}

        {/* --- OTP VERIFICATION STEP --- */}
        {isOtpStep ? (
          <form onSubmit={handleOtpVerify} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 tracking-wider uppercase">OTP Code</label>
              <input
                type="text"
                placeholder="6-digit verification code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                className="w-full glass-input px-4 py-3 rounded-xl text-center font-mono text-lg font-bold tracking-widest"
                required
              />
              {devOtpMsg && (
                <div className="bg-pink-500/10 border border-pink-500/20 text-pink-400 px-3 py-2 rounded-lg text-[11px] font-bold text-center mt-2">
                  {devOtpMsg}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={auth.isLoading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white font-bold py-3.5 rounded-xl transition-all duration-200 shadow-md shadow-pink-500/20"
            >
              {auth.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify Account'}
            </button>
            <button
              type="button"
              onClick={() => setIsOtpStep(false)}
              className="w-full text-slate-400 hover:text-slate-200 text-xs font-semibold text-center"
            >
              Back to Sign In
            </button>
          </form>
        ) : isForgotPassword ? (
          /* --- FORGOT PASSWORD STEP --- */
          resetStep === 'request' ? (
            <form onSubmit={handleForgotPasswordRequest} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 tracking-wider uppercase">Email Address</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full glass-input px-4 py-3 rounded-xl"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={auth.isLoading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white font-bold py-3.5 rounded-xl transition-all duration-200"
              >
                {auth.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Code'}
              </button>
              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="w-full text-slate-400 hover:text-slate-200 text-xs font-semibold text-center"
              >
                Back to Login
              </button>
            </form>
          ) : (
            <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 tracking-wider uppercase">OTP Code</label>
                <input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  className="w-full glass-input px-4 py-3 rounded-xl font-mono text-center"
                  required
                />
                {devOtpMsg && (
                  <div className="bg-pink-500/10 border border-pink-500/20 text-pink-400 px-3 py-2 rounded-lg text-[11px] font-bold text-center mt-2">
                    {devOtpMsg}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 tracking-wider uppercase">New Password</label>
                <input
                  type="password"
                  placeholder="Create new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full glass-input px-4 py-3 rounded-xl"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={auth.isLoading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white font-bold py-3.5 rounded-xl transition-all duration-200"
              >
                {auth.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset Password'}
              </button>
            </form>
          )
        ) : (
          /* --- LOGIN / REGISTER STEP --- */
          <>
            <div className="flex border-b border-slate-800">
              <button
                onClick={() => {
                  setActiveTab('login');
                  setErrorMsg('');
                }}
                className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-all ${
                  activeTab === 'login' ? 'border-pink-500 text-white' : 'border-transparent text-slate-500'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setActiveTab('register');
                  setErrorMsg('');
                }}
                className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-all ${
                  activeTab === 'register' ? 'border-pink-500 text-white' : 'border-transparent text-slate-500'
                }`}
              >
                Register
              </button>
            </div>

            {activeTab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 tracking-wider uppercase">Username or Email</label>
                  <input
                    type="text"
                    placeholder="partner@love.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full glass-input px-4 py-3 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-400 tracking-wider uppercase">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setResetStep('request');
                        setErrorMsg('');
                      }}
                      className="text-pink-500 hover:text-pink-400 text-xs font-semibold"
                    >
                      Forgot?
                    </button>
                  </div>
                  <input
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full glass-input px-4 py-3 rounded-xl"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={auth.isLoading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white font-bold py-3.5 rounded-xl transition-all duration-200 active:scale-[0.98] shadow-md shadow-pink-500/20"
                >
                  {auth.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enter Secure Space'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 tracking-wider uppercase">Your Name</label>
                  <input
                    type="text"
                    placeholder="Alice"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full glass-input px-4 py-3 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 tracking-wider uppercase">Username</label>
                  <input
                    type="text"
                    placeholder="alice_hearts"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full glass-input px-4 py-3 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 tracking-wider uppercase">Email Address</label>
                  <input
                    type="email"
                    placeholder="alice@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full glass-input px-4 py-3 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 tracking-wider uppercase">Password</label>
                  <input
                    type="password"
                    placeholder="Create secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full glass-input px-4 py-3 rounded-xl"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={auth.isLoading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white font-bold py-3.5 rounded-xl transition-all duration-200 active:scale-[0.98]"
                >
                  {auth.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Initialize Sanctuary'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
