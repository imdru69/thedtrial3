import React, { useState } from 'react';
import { Mail, Lock, User, Sparkles, ArrowRight, Check, Shield } from 'lucide-react';

interface AuthScreenProps {
  onLogin: (email: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Credentials Required');
      return;
    }
    onLogin(email);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-transparent flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-purple-600/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Main Container */}
      <div className="flex flex-col items-center justify-center w-full max-w-[340px] gap-8 relative z-10">
        
        {/* Top Brand Header */}
        <div className="text-center animate-in fade-in slide-in-from-top-2 duration-1000">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Shield size={14} className="text-purple-500 fill-purple-500/10" />
            <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.4em]">Protocol Node</span>
          </div>
          <h1 className="text-5xl font-black text-white brand-glow tracking-tighter leading-none">
            TheD<span className="text-purple-600">.</span>
          </h1>
        </div>

        {/* Main Glass Deck - Balanced Spacing */}
        <div className="w-full liquid-glass rounded-[2.8rem] p-6 py-8 flex flex-col gap-6 border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.4)] animate-in fade-in zoom-in-95 duration-700">
          
          {/* Profile Avatar Placeholder */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
              <User size={44} className="text-white/20 mt-3" strokeWidth={1.5} />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-6">
              {/* Email Input Group */}
              <div className="relative group">
                <div className="flex items-center gap-3 pb-2 border-b border-white/10 group-focus-within:border-purple-500 transition-colors">
                  <Mail className="text-white/30 group-focus-within:text-purple-500 transition-colors" size={16} />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email ID"
                    className="w-full bg-transparent text-white text-xs outline-none font-medium placeholder:text-white/20"
                  />
                </div>
              </div>

              {/* Password Input Group */}
              <div className="relative group">
                <div className="flex items-center gap-3 pb-2 border-b border-white/10 group-focus-within:border-orange-500 transition-colors">
                  <Lock className="text-white/30 group-focus-within:text-orange-500 transition-colors" size={16} />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full bg-transparent text-white text-xs outline-none font-medium placeholder:text-white/20"
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

            {/* Options Row - Improved tracking and spacing */}
            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div 
                  onClick={() => setRememberMe(!rememberMe)}
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

            {error && <p className="text-[9px] font-black text-red-500 text-center uppercase tracking-widest animate-pulse">{error}</p>}

            {/* Action Button */}
            <button 
              type="submit"
              className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-800 via-purple-600 to-purple-400 text-white font-black uppercase tracking-[0.2em] text-[10px] shadow-[0_8px_20px_rgba(124,58,237,0.2)] hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {isLogin ? 'Login' : 'Init Node'}
              <ArrowRight size={12} strokeWidth={3} />
            </button>
          </form>

          {/* Footer Link */}
          <div className="text-center pt-1">
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-[9px] text-white/20 font-black uppercase tracking-[0.2em] hover:text-white transition-colors"
            >
              {isLogin ? "New? Join Terminal" : "Active? Back to Node"}
            </button>
          </div>
        </div>
      </div>

      {/* Minimal Version Info */}
      <div className="absolute bottom-8 opacity-5">
        <p className="text-[7px] font-black text-white uppercase tracking-[0.5em]">OS v1.0.4-c</p>
      </div>
    </div>
  );
};