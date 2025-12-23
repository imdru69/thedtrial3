import React, { useState } from 'react';
import { Mail, Lock, User, Sparkles, ArrowRight, Check, Shield, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabase';

interface AuthScreenProps {
  onLogin: (session: any) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(false);

  const generatePassword = () => {
    setIsGenerating(true);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTimeout(() => {
      setPassword(result);
      setIsGenerating(false);
    }, 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Credentials Required');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (signInError) {
          // Specifically catch email confirmation error
          if (signInError.message.includes("Email not confirmed")) {
            throw new Error("Activation Required: Check your email inbox for a confirmation link.");
          }
          if (signInError.message.includes("Invalid login credentials")) {
            throw new Error("Access Denied: Invalid Email or Password.");
          }
          throw signInError;
        }
        
        onLogin(data.session);
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin
          }
        });
        
        if (signUpError) throw signUpError;
        
        if (data.session) {
          onLogin(data.session);
        } else {
          setSuccess('Node Initialized: Check your email for the confirmation link.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Terminal Handshake Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-transparent flex flex-col items-center justify-center px-6 overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-purple-600/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="flex flex-col items-center justify-center w-full max-w-[340px] gap-8 relative z-10">
        <div className="text-center animate-in fade-in slide-in-from-top-2 duration-1000">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Shield size={14} className="text-purple-500 fill-purple-500/10" />
            <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.4em]">Protocol Node</span>
          </div>
          <h1 className="text-5xl font-black text-white brand-glow tracking-tighter leading-none">
            TheD<span className="text-purple-600">.</span>
          </h1>
        </div>

        <div className="w-full liquid-glass rounded-[2.8rem] p-6 py-8 flex flex-col gap-6 border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.4)] animate-in fade-in zoom-in-95 duration-700">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
              <User size={44} className="text-white/20 mt-3" strokeWidth={1.5} />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-6">
              <div className="relative group">
                <div className="flex items-center gap-3 pb-2 border-b border-white/10 group-focus-within:border-purple-500 transition-colors">
                  <Mail className="text-white/30 group-focus-within:text-purple-500 transition-colors" size={16} />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email ID"
                    className="w-full bg-transparent text-white text-xs outline-none font-medium placeholder:text-white/20"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="relative group">
                <div className="flex items-center gap-3 pb-2 border-b border-white/10 group-focus-within:border-orange-500 transition-colors">
                  <Lock className="text-white/30 group-focus-within:text-orange-500 transition-colors" size={16} />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full bg-transparent text-white text-xs outline-none font-medium placeholder:text-white/20"
                    disabled={loading}
                  />
                  {!isLogin && (
                    <button 
                      type="button"
                      onClick={generatePassword}
                      className={`ml-1 text-orange-500 transition-opacity ${isGenerating ? 'animate-spin opacity-50' : 'opacity-60 hover:opacity-100'}`}
                    >
                      <Sparkles size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div 
                  onClick={() => !loading && setRememberMe(!rememberMe)}
                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${rememberMe ? 'bg-purple-600 border-purple-600 shadow-[0_0_8px_rgba(124,58,237,0.4)]' : 'border-white/15'}`}
                >
                  {rememberMe && <Check size={8} className="text-white" strokeWidth={5} />}
                </div>
                <span className="text-[8px] text-white/40 font-black uppercase tracking-[0.15em] group-hover:text-white/70 transition-colors">Remember</span>
              </label>
              <button type="button" className="text-[8px] text-white/40 font-black uppercase tracking-[0.15em] hover:text-orange-500 transition-colors">
                Recover?
              </button>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-[9px] font-black text-red-500 uppercase tracking-widest leading-tight">{error}</p>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                <Check size={14} className="text-green-500 shrink-0 mt-0.5" />
                <p className="text-[9px] font-black text-green-500 uppercase tracking-widest leading-tight">{success}</p>
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className={`w-full h-12 rounded-xl bg-gradient-to-r from-purple-800 via-purple-600 to-purple-400 text-white font-black uppercase tracking-[0.2em] text-[10px] shadow-[0_8px_20px_rgba(124,58,237,0.2)] hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Processing...' : (isLogin ? 'Login' : 'Init Node')}
              {!loading && <ArrowRight size={12} strokeWidth={3} />}
            </button>
          </form>

          <div className="text-center pt-1">
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }}
              className="text-[9px] text-white/20 font-black uppercase tracking-[0.2em] hover:text-white transition-colors"
            >
              {isLogin ? "New? Join Terminal" : "Active? Back to Node"}
            </button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 opacity-5">
        <p className="text-[7px] font-black text-white uppercase tracking-[0.5em]">OS v1.1.0-S</p>
      </div>
    </div>
  );
};