import React, { useState } from 'react';
import { Palette, GraduationCap, Briefcase, Shield, MoreHorizontal } from 'lucide-react';

interface OnboardingScreenProps {
  onComplete: (name: string, profiles: string[]) => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);

  const profiles = [
    { id: 'Creative', icon: Palette, glowClass: 'edge-glow-purple', iconColor: 'text-purple-400' },
    { id: 'Student', icon: GraduationCap, glowClass: 'edge-glow-orange', iconColor: 'text-orange-400' },
    { id: 'Job', icon: Briefcase, glowClass: 'edge-glow-purple', iconColor: 'text-slate-300' },
  ];

  const toggleProfile = (id: string) => {
    if (selectedProfiles.includes(id)) {
      setSelectedProfiles(prev => prev.filter(p => p !== id));
    } else if (selectedProfiles.length < 2) {
      setSelectedProfiles(prev => [...prev, id]);
    }
  };

  // Logic update: 1 profile is now enough to move forward, 2 is still the max
  const isReady = name.trim().length > 0 && selectedProfiles.length >= 1;

  return (
    <div className="fixed inset-0 z-[250] bg-transparent flex flex-col items-center px-6 py-12 overflow-y-auto">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-[360px] flex flex-col items-center gap-10 relative z-10">
        
        {/* Brand Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield size={16} className="text-purple-500" />
            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.5em]">Identity Setup</span>
          </div>
          <h1 className="text-5xl font-black text-white brand-glow tracking-tighter leading-none">
            TheD<span className="text-purple-600">.</span>
          </h1>
        </div>

        {/* Name Input Section */}
        <div className="w-full space-y-4">
          <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] ml-2">Username</label>
          <div className="relative group px-2">
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name -"
              className="w-full bg-transparent border-b border-white/10 pb-3 text-xl font-bold text-white outline-none focus:border-purple-500 transition-colors placeholder:text-white/20"
            />
          </div>
        </div>

        {/* Profile Selection Section */}
        <div className="w-full space-y-6">
          <div className="flex justify-between items-end px-2">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Profile (Select 1-2)</label>
            <span className="text-[10px] font-black text-purple-500 uppercase">{selectedProfiles.length}/2</span>
          </div>
          
          <div className="grid grid-cols-1 gap-4 px-1">
            {profiles.map((profile) => {
              const Icon = profile.icon;
              const isSelected = selectedProfiles.includes(profile.id);
              return (
                <button
                  key={profile.id}
                  onClick={() => toggleProfile(profile.id)}
                  className={`relative flex items-center justify-between px-6 py-5 rounded-full transition-all duration-500 glass-tile ${
                    isSelected ? `glass-tile-active ${profile.glowClass}` : 'opacity-40 grayscale-[0.3] hover:opacity-70'
                  }`}
                >
                  {/* Moveable Shimmer Glow */}
                  <div className="glass-glow-slide" />

                  {/* Left Icon Area */}
                  <div className={`relative z-10 w-10 h-10 flex items-center justify-center rounded-xl transition-all ${isSelected ? 'scale-110' : 'scale-100'}`}>
                    <Icon size={26} className={isSelected ? profile.iconColor : 'text-white/20'} strokeWidth={2} />
                  </div>

                  {/* Center Text Area */}
                  <div className="flex-1 text-center relative z-10">
                    <span className={`text-base font-bold tracking-widest uppercase transition-colors ${isSelected ? 'text-white' : 'text-white/30'}`}>
                      {profile.id}
                    </span>
                  </div>

                  {/* Right Dots Decorative */}
                  <div className="relative z-10 opacity-20">
                    <MoreHorizontal size={18} className="text-white" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Welcome Button */}
        <div className="w-full pt-4">
          <button 
            onClick={() => isReady && onComplete(name, selectedProfiles)}
            disabled={!isReady}
            className={`w-full h-16 rounded-full flex items-center justify-center text-center transition-all duration-500 ${
              isReady ? 'metallic-pill' : 'metallic-pill-disabled'
            }`}
          >
            <span className="text-lg font-bold tracking-tight px-8">
              WELCOME
            </span>
          </button>
        </div>
      </div>

      <p className="mt-12 text-[9px] font-black text-white/20 uppercase tracking-[0.4em]">Initialize Your Protocol</p>
    </div>
  );
};