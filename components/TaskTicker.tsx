import React from 'react';
import { Task, TaskStatus } from '../types';
import { Zap } from 'lucide-react';

interface TaskTickerProps {
  tasks: Task[];
}

export const TaskTicker: React.FC<TaskTickerProps> = ({ tasks }) => {
  const pendingTasks = tasks.filter(t => t.status === TaskStatus.PENDING);
  
  if (pendingTasks.length === 0) return null;

  // Repeat tasks to ensure the ticker is always full for a seamless loop
  const displayTasks = [...pendingTasks, ...pendingTasks, ...pendingTasks];

  return (
    <div className="ticker-container w-full overflow-hidden bg-white/[0.02] border-y border-white/[0.05] py-3 mb-6 relative group">
      {/* Edge Fades */}
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-black z-10 pointer-events-none"></div>
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-black z-10 pointer-events-none"></div>
      
      <div className="flex whitespace-nowrap animate-ticker">
        {displayTasks.map((task, i) => (
          <div key={`${task.id}-${i}`} className="flex items-center gap-4 px-10">
            <Zap size={12} className="text-orange-500 fill-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
            <span className="text-[11px] font-black text-white/90 uppercase tracking-[0.25em]">
              {task.title}
            </span>
            <span className="text-[11px] font-black text-purple-500/30 uppercase tracking-[0.2em] ml-2">
              •
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};