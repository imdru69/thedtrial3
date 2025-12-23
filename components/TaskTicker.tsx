import React from 'react';
import { Task, TaskStatus } from '../types';
import { Zap } from 'lucide-react';

interface TaskTickerProps {
  tasks: Task[];
}

export const TaskTicker: React.FC<TaskTickerProps> = ({ tasks }) => {
  const pendingTasks = tasks.filter(t => t.status === TaskStatus.PENDING);
  
  if (pendingTasks.length === 0) return null;

  return (
    <div className="ticker-container w-full overflow-hidden bg-black/40 border-y border-white/5 py-2.5 mb-6 relative group">
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-black z-10 pointer-events-none"></div>
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-black z-10 pointer-events-none"></div>
      
      <div className="flex whitespace-nowrap animate-ticker">
        {pendingTasks.map((task, i) => (
          <div key={`${task.id}-${i}`} className="flex items-center gap-3 px-8">
            <Zap size={10} className="text-orange-500 fill-orange-500" />
            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
              {task.title}
            </span>
            <span className="text-[10px] font-black text-purple-500/40 uppercase tracking-[0.2em] ml-2">
              /
            </span>
          </div>
        ))}
        {/* Duplicate for seamless loop */}
        {pendingTasks.map((task, i) => (
          <div key={`${task.id}-dup-${i}`} className="flex items-center gap-3 px-8">
            <Zap size={10} className="text-orange-500 fill-orange-500" />
            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
              {task.title}
            </span>
            <span className="text-[10px] font-black text-purple-500/40 uppercase tracking-[0.2em] ml-2">
              /
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};