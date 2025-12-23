
import React from 'react';
import { Home, Compass, User } from 'lucide-react';

export type ScreenID = 'home' | 'discover' | 'profile';

interface NavbarProps {
  activeScreen: ScreenID;
  setActiveScreen: (screen: ScreenID) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeScreen, setActiveScreen }) => {
  const tabs: { id: ScreenID; icon: React.ReactNode }[] = [
    { id: 'home', icon: <Home size={22} strokeWidth={activeScreen === 'home' ? 2.5 : 2} /> },
    { id: 'discover', icon: <Compass size={22} strokeWidth={activeScreen === 'discover' ? 2.5 : 2} /> },
    { id: 'profile', icon: <User size={22} strokeWidth={activeScreen === 'profile' ? 2.5 : 2} /> },
  ];

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-[260px]">
      <div className="nav-container rounded-full p-1.5 flex items-center justify-between relative overflow-hidden ring-1 ring-white/5">
        {tabs.map((tab) => {
          const isActive = activeScreen === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveScreen(tab.id)}
              className={`relative z-10 flex-1 flex items-center justify-center py-4 transition-all duration-300 ${
                isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {isActive && (
                <div className="absolute inset-0 mx-1.5 bg-white/5 rounded-[1.5rem] border border-white/10 transition-all duration-300 animate-in fade-in zoom-in-95" />
              )}
              <span className={`relative z-20 ${isActive ? 'scale-110' : 'scale-100'} transition-transform duration-300`}>
                {tab.icon}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
