
import React from 'react';
import { Star } from 'lucide-react';

interface StarSystemProps {
  progress: number;
  thresholds: number[];
}

export const StarSystem: React.FC<StarSystemProps> = ({ progress, thresholds = [3, 6, 10] }) => {
  const earnedStars = progress >= thresholds[2] ? 3 : progress >= thresholds[1] ? 2 : progress >= thresholds[0] ? 1 : 0;
  
  // Use a fixed visual max for the progress bar to keep the actual target hidden
  const visualMax = 10;
  
  return (
    <div className="flex flex-col items-center gap-2.5 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl min-w-[130px]">
      {/* Stars at the top */}
      <div className="flex gap-2">
        {[1, 2, 3].map((starIdx) => (
          <Star 
            key={starIdx} 
            size={18} 
            className={starIdx <= earnedStars 
              ? "fill-orange-400 text-orange-400 drop-shadow-[0_0_12px_rgba(251,146,60,1)] scale-110 transition-all duration-700 ease-out" 
              : "text-slate-800 opacity-20"
            }
          />
        ))}
      </div>

      {/* Conditional Flow Message - very compact */}
      {earnedStars === 3 && (
        <span className="text-[7px] font-black text-orange-500 tracking-[0.2em] uppercase animate-pulse leading-none -mt-1">
          FLOW ACHIEVED
        </span>
      )}
      
      {/* Progress bar at the bottom */}
      <div className="w-28 h-2 bg-slate-950 rounded-full relative overflow-hidden ring-1 ring-white/10 shadow-inner">
        <div 
          className="h-full bg-gradient-to-r from-purple-600 via-purple-400 to-orange-500 transition-all duration-1000 ease-out rounded-full shadow-[0_0_10px_rgba(168,85,247,0.4)]"
          style={{ width: `${Math.min((progress / visualMax) * 100, 100)}%` }}
        />
      </div>
    </div>
  );
};
