import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, CheckCircle, Trash2, Repeat, Lock, UserCircle, Flame, Zap, LogOut, Timer, X } from 'lucide-react';
import { Task, TaskStatus, UserStats, User } from './types';
import { generateRoutineTasks } from './services/geminiService';
import { StarSystem } from './components/StarSystem';
import { StarBackground } from './components/StarBackground';
import { Navbar, ScreenID } from './components/Navbar';
import { AuthScreen } from './components/AuthScreen';
import { supabase } from './services/supabase';

const HOUR_IN_MS = 60 * 60 * 1000;
const TWELVE_HOURS_MS = 12 * HOUR_IN_MS;

const generateRandomThresholds = () => {
  const nums = new Set<number>();
  while(nums.size < 3) {
    nums.add(Math.floor(Math.random() * 8) + 2);
  }
  return Array.from(nums).sort((a, b) => a - b);
};

const formatTimeLeft = (ms: number) => {
  const h = Math.floor(ms / HOUR_IN_MS);
  const m = Math.floor((ms % HOUR_IN_MS) / (60 * 1000));
  const s = Math.floor((ms % (60 * 1000)) / 1000);
  return `${h}h ${m}m ${s}s`;
};

const ActionLoading = ({ progress }: { progress: number }) => (
  <div className="loading-overlay">
    <div className="loading-pill">
      <div className="loading-percentage">{progress}%</div>
      <div className="loading-label tracking-[0.4em]">Optimizing</div>
    </div>
  </div>
);

const RechargeWidget = ({ title, value, max, colorClass, labels, icon: Icon }: { title: string, value: number, max: number, colorClass: 'orange' | 'purple', labels: [string, string, string], icon?: any }) => {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div className="recharge-widget aspect-square">
      <div className="flex justify-between items-start">
        <h3 className="recharge-title">{title}</h3>
        {Icon && <Icon size={16} className={colorClass === 'orange' ? 'text-orange-500' : 'text-purple-500'} />}
      </div>
      <div className="mt-auto">
        <div className="recharge-scale">
          <span>{labels[0]}</span>
          <span>{labels[1]}</span>
          <span>{labels[2]}</span>
        </div>
        <div className="recharge-track">
          <div 
            className={`recharge-pill ${colorClass}`}
            style={{ width: `${Math.max(percentage, 12)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<any>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isAppReady, setIsAppReady] = useState(false);

  const [activeScreen, setActiveScreen] = useState<ScreenID>('home');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [stats, setStats] = useState<UserStats>({
    stars: 0, 
    streak: 0,
    totalStars: 0,
    completedToday: 0,
    currentDayTimestamp: 0,
    lastCycleTimestamp: 0,
    thresholds: generateRandomThresholds()
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isDailyToggle, setIsDailyToggle] = useState(false);
  const [isTimerPanelOpen, setIsTimerPanelOpen] = useState(false);
  const [customTimerIndex, setCustomTimerIndex] = useState(0); 

  const rulerRef = useRef<HTMLDivElement>(null);
  const lastHapticValue = useRef(0);

  const cycleTimeLeft = Math.max(0, (stats.lastCycleTimestamp + TWELVE_HOURS_MS) - currentTime);
  const isCycleLocked = cycleTimeLeft > 0;

  const getTimerDetails = (index: number) => {
    if (index < 60) {
      return { value: index + 1, unit: 'm', label: 'MIN', isHrs: false, totalMins: index + 1 };
    } else {
      const hrs = index - 60 + 2;
      return { value: hrs, unit: 'h', label: 'HRS', isHrs: true, totalMins: hrs * 60 };
    }
  };

  const timerDetails = getTimerDetails(customTimerIndex);

  const syncStats = useCallback(async (newStats: UserStats, userId: string) => {
    try {
      await supabase.from('profiles').update({
        stars: newStats.stars,
        streak: newStats.streak,
        total_stars: newStats.totalStars,
        completed_today: newStats.completedToday,
        current_day_timestamp: newStats.currentDayTimestamp,
        last_cycle_timestamp: newStats.lastCycleTimestamp,
        thresholds: newStats.thresholds
      }).eq('id', userId);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (isTimerPanelOpen) {
        setIsTimerPanelOpen(false);
        e.preventDefault();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isTimerPanelOpen]);

  const handleTimerScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const ruler = e.currentTarget;
    const center = ruler.scrollLeft + (ruler.offsetWidth / 2);
    const marks = ruler.children;
    let closestIdx = 0;
    let minDistance = Infinity;

    for (let i = 0; i < marks.length; i++) {
      const mark = marks[i] as HTMLElement;
      const distance = Math.abs(center - (mark.offsetLeft + (mark.offsetWidth / 2)));
      if (distance < minDistance) {
        minDistance = distance;
        closestIdx = i;
      }
    }

    if (closestIdx !== customTimerIndex) {
      setCustomTimerIndex(closestIdx);
      if ((closestIdx + 1) % 5 === 0 && closestIdx !== lastHapticValue.current) {
        if ('vibrate' in navigator) navigator.vibrate(10);
        lastHapticValue.current = closestIdx;
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (rulerRef.current) {
      rulerRef.current.scrollLeft += e.deltaY;
    }
  };

  const addManualTask = async (forcedTimerMins?: number) => {
    if (!currentUser) return;
    
    // 1. Determine the duration
    let duration = 0;
    if (forcedTimerMins !== undefined) {
      duration = forcedTimerMins;
    } else if (isTimerPanelOpen) {
      duration = timerDetails.totalMins;
    }

    // 2. Determine the title
    const finalTitle = newTaskTitle.trim() || (duration > 0 ? "Timed Protocol" : "Sequence");

    try {
      const task: Task = {
        id: `manual-${Date.now()}`,
        title: finalTitle,
        description: isDailyToggle ? 'Daily Protocol' : 'Mission Objective',
        timeSlot: 'Now',
        status: TaskStatus.PENDING,
        isRoutine: false,
        isPersonal: true,
        isDaily: isDailyToggle,
        createdAt: Date.now(),
        timerMinutes: duration > 0 ? duration : undefined,
        timerStartedAt: duration > 0 ? Date.now() : undefined
      };
      
      const { data, error } = await supabase.from('tasks').insert({
        user_id: currentUser.id, 
        title: task.title, 
        description: task.description, 
        time_slot: task.timeSlot,
        status: task.status, 
        is_routine: task.isRoutine, 
        is_personal: task.isPersonal, 
        is_daily: task.isDaily,
        timer_minutes: task.timerMinutes, 
        timer_started_at: task.timerStartedAt ? new Date(task.timerStartedAt).toISOString() : null
      }).select().single();

      if (!error && data) {
        setTasks(prev => [{ ...task, id: data.id }, ...prev]);
        setNewTaskTitle('');
        if (isTimerPanelOpen) {
          setIsTimerPanelOpen(false);
          if (window.history.state?.panel === 'timer') {
            window.history.back();
          }
        }
      } else if (error) {
        setDbError(error.message);
      }
    } catch (e: any) { 
      setDbError(e.message); 
    }
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task || !currentUser) return;
    const newStatus = task.status === TaskStatus.COMPLETED ? TaskStatus.PENDING : TaskStatus.COMPLETED;
    try {
      await supabase.from('tasks').update({ status: newStatus }).eq('id', id);
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
      const inc = newStatus === TaskStatus.COMPLETED ? 1 : -1;
      const newStats = { ...stats, completedToday: Math.max(0, stats.completedToday + inc), totalStars: stats.totalStars + (newStatus === TaskStatus.COMPLETED ? 1 : 0) };
      setStats(newStats);
      syncStats(newStats, currentUser.id);
    } catch (e: any) { setDbError(e.message); }
  };

  const deleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    setTasks(tasks.filter(t => t.id !== id));
  };

  const start12HourCycle = async () => {
    if (isCycleLocked || !currentUser) return;
    setIsLoading(true);
    setLoadingProgress(0);
    const routineData = await generateRoutineTasks();
    const startTime = Date.now();
    const newTasks: Task[] = routineData.map((d, i) => ({
      id: `routine-${Date.now()}-${i}`, title: d.title, description: d.description,
      timeSlot: new Date(startTime + (i+1)*HOUR_IN_MS).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: TaskStatus.PENDING, isRoutine: true, isPersonal: false, isDaily: false,
      createdAt: Date.now(), unlockAt: startTime + (i+1)*HOUR_IN_MS
    }));
    await supabase.from('tasks').insert(newTasks.map(t => ({
      user_id: currentUser.id, title: t.title, description: t.description, time_slot: t.timeSlot,
      status: t.status, is_routine: t.isRoutine, is_personal: t.isPersonal, is_daily: t.isDaily,
      unlock_at: new Date(t.unlockAt!).toISOString()
    })));
    setTasks(prev => [...prev.filter(t => !t.isRoutine), ...newTasks]);
    const updatedStats = { ...stats, lastCycleTimestamp: startTime };
    setStats(updatedStats);
    syncStats(updatedStats, currentUser.id);
    setIsLoading(false);
  };

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch (e: any) { setDbError(e.message); }
  };

  const handleSessionUser = useCallback(async (user: any) => {
    try {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      const userData: User = {
        email: user.email!, id: user.id, lastLogin: Date.now(),
        hasOnboarded: !!profile?.has_onboarded, name: profile?.name, profiles: profile?.profiles_list
      };
      setCurrentUser(userData);
      if (profile) {
        setStats({
          stars: profile.stars || 0, streak: profile.streak || 0, totalStars: profile.total_stars || 0,
          completedToday: profile.completed_today || 0, currentDayTimestamp: profile.current_day_timestamp || new Date().setHours(0, 0, 0, 0),
          lastCycleTimestamp: profile.last_cycle_timestamp || 0, thresholds: profile.thresholds || generateRandomThresholds()
        });
      }
      const { data: userTasks } = await supabase.from('tasks').select('*').eq('user_id', user.id);
      if (userTasks) {
        setTasks(userTasks.map((t: any) => ({
          id: t.id, title: t.title, description: t.description, timeSlot: t.time_slot,
          status: t.status, isRoutine: t.is_routine, isPersonal: t.is_personal, isDaily: t.is_daily,
          createdAt: new Date(t.created_at).getTime(), unlockAt: t.unlock_at ? new Date(t.unlock_at).getTime() : undefined,
          timerMinutes: t.timer_minutes, timerStartedAt: t.timer_started_at ? new Date(t.timer_started_at).getTime() : undefined
        })));
      }
      setIsAppReady(true);
    } catch (e: any) { setDbError(e.message); }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) handleSessionUser(session.user);
      else setIsAppReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) handleSessionUser(session.user);
      else { setCurrentUser(null); setIsAppReady(true); }
    });
    return () => subscription.unsubscribe();
  }, [handleSessionUser]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const finalTasks = (() => {
    const active: Task[] = [];
    const completed: Task[] = [];
    const expired: Task[] = [];
    
    const routine = tasks.filter(t => t.isRoutine && t.status !== TaskStatus.COMPLETED);
    const windowIds = new Set([
      ...routine.filter(t => t.unlockAt && currentTime >= t.unlockAt).map(t => t.id),
      ...routine.filter(t => t.unlockAt && currentTime < t.unlockAt).sort((a,b) => a.unlockAt! - b.unlockAt!).slice(0, 3).map(t => t.id)
    ]);

    tasks.forEach(t => {
      const isComp = t.status === TaskStatus.COMPLETED;
      const isExp = t.isRoutine && !isComp && t.unlockAt && (currentTime - t.unlockAt > HOUR_IN_MS * 3);
      if (isComp) completed.push(t);
      else if (isExp) expired.push(t);
      else if (!t.isRoutine || windowIds.has(t.id)) active.push(t);
    });

    active.sort((a,b) => {
      const aIsTimed = !!(a.timerMinutes && a.timerStartedAt && a.status !== TaskStatus.COMPLETED);
      const bIsTimed = !!(b.timerMinutes && b.timerStartedAt && b.status !== TaskStatus.COMPLETED);
      
      if (aIsTimed && !bIsTimed) return -1;
      if (!aIsTimed && bIsTimed) return 1;
      if (a.isPersonal && !b.isPersonal) return -1;
      if (!a.isPersonal && b.isPersonal) return 1;
      return (a.unlockAt || a.createdAt) - (b.unlockAt || b.createdAt);
    });

    completed.sort((a,b) => (a.isPersonal && !b.isPersonal ? -1 : (b.isPersonal && !a.isPersonal ? 1 : b.createdAt - a.createdAt)));
    
    return [...active, ...completed, ...expired];
  })();

  if (!isAppReady) return <div className="min-h-screen bg-black flex items-center justify-center font-black uppercase text-white/10 tracking-[0.5em] animate-pulse">Syncing...</div>;

  return (
    <div className="flex flex-col min-h-screen pb-32 relative overflow-hidden">
      <StarBackground />
      {isLoading && <ActionLoading progress={loadingProgress} />}
      
      {isTimerPanelOpen && (
        <div 
          className="fixed inset-0 z-[400] bg-black/70 backdrop-blur-[6px] animate-in fade-in duration-300" 
          onClick={() => { setIsTimerPanelOpen(false); window.history.back(); }}
        />
      )}

      {isTimerPanelOpen && (
        <div className="floating-timer-pill" onClick={(e) => e.stopPropagation()}>
          <div className="ruler-section">
            <div 
              ref={rulerRef}
              onScroll={handleTimerScroll}
              onWheel={handleWheel}
              className="ruler-viewport hide-scrollbar"
            >
              {Array.from({ length: 71 }).map((_, i) => {
                const details = getTimerDetails(i);
                const isTenStep = (i + 1) % 10 === 0 || i === 0 || i === 59 || i >= 60;
                return (
                  <div key={i} className="ruler-mark-wrap">
                    <div className={`ruler-label ${i === customTimerIndex ? (details.isHrs ? 'active-purple' : 'active') : ''} ${isTenStep ? 'opacity-100' : 'opacity-0'}`}>
                      {details.value}
                    </div>
                    <div 
                      className={`ruler-bar ${ i <= customTimerIndex ? (details.isHrs ? 'active-purple' : 'active-orange') : '' }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="timer-bottom-row">
            <div className="flex flex-col items-center">
              <span className={`text-[9px] font-black uppercase tracking-widest mb-1 transition-all ${!timerDetails.isHrs ? 'text-orange-500' : 'text-white/10'}`}>MIN</span>
              <div className="timer-value-display text-white">
                {timerDetails.value}
                <span className={`text-lg ml-0.5 transition-colors ${!timerDetails.isHrs ? 'text-orange-500' : 'text-purple-500'}`}>{timerDetails.unit}</span>
              </div>
            </div>

            <button 
              onClick={() => addManualTask()} 
              className="timer-center-btn active:scale-90 shadow-2xl flex items-center justify-center"
              style={{ borderColor: timerDetails.isHrs ? 'rgba(168, 85, 247, 0.4)' : 'rgba(249, 115, 22, 0.4)' }}
            >
              <div className="inner-square" style={{ background: timerDetails.isHrs ? '#a855f7' : '#f97316' }} />
            </button>

            <div className="flex flex-col items-center">
              <span className={`text-[9px] font-black uppercase tracking-widest mb-1 transition-all ${timerDetails.isHrs ? 'text-purple-500' : 'text-white/10'}`}>HRS</span>
              <div className="timer-label-side" style={{ color: timerDetails.isHrs ? '#a855f7' : 'rgba(255,255,255,0.05)' }}>
                {timerDetails.isHrs ? 'ZENITH' : 'FLOW'}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 w-full flex flex-col min-h-screen">
        <header className="sticky top-0 z-50 liquid-glass rounded-b-[2.5rem] p-6 flex justify-between items-center border-b border-purple-500/10">
          <h1 className="text-3xl font-black text-white brand-glow tracking-tighter">TheD.</h1>
          <StarSystem progress={stats.completedToday} thresholds={stats.thresholds} />
        </header>

        <main className="flex-1 px-5 pt-4">
          {!session ? <AuthScreen onLogin={setSession} /> : (activeScreen === 'home' && (
            <div className="space-y-6 screen-fade-in relative">
              <div className="liquid-glass p-7 rounded-[3.5rem] space-y-6 border border-white/10 shadow-3xl">
                <div className="flex justify-center">
                  <div className="relative flex w-full max-w-[320px] p-2 rounded-full bg-black/60 border border-white/5 shadow-2xl">
                    <div 
                      className="absolute top-2 bottom-2 rounded-full transition-all duration-500 bg-purple-600 shadow-[0_0_20px_rgba(124,58,237,0.6)]"
                      style={{ width: 'calc(50% - 8px)', left: isDailyToggle ? 'calc(50% + 4px)' : '4px' }}
                    />
                    <button onClick={() => setIsDailyToggle(false)} className={`relative z-10 w-1/2 py-3.5 text-[11px] font-black uppercase tracking-[0.4em] transition-colors ${!isDailyToggle ? 'text-white' : 'text-slate-700'}`}>Once</button>
                    <button onClick={() => setIsDailyToggle(true)} className={`relative z-10 w-1/2 py-3.5 text-[11px] font-black uppercase tracking-[0.4em] transition-colors ${isDailyToggle ? 'text-white' : 'text-slate-700'}`}>Daily</button>
                  </div>
                </div>

                <div className="flex gap-4 items-center">
                  <input 
                    type="text" value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addManualTask()}
                    placeholder="Enter Sequence..."
                    className="flex-1 bg-white/5 border-none rounded-[2rem] px-8 py-5 text-base focus:ring-2 focus:ring-purple-500/30 outline-none font-bold text-white placeholder:text-white/10 shadow-inner"
                  />
                  <button onClick={() => addManualTask()} className="button-liquid w-16 h-16 rounded-[2rem] flex items-center justify-center shrink-0">
                    <Plus size={30} className="text-white" strokeWidth={4} />
                  </button>
                </div>

                <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar pt-1">
                   {[5, 10, 15].map(m => (
                     <button 
                      key={m} 
                      onClick={() => addManualTask(m)} 
                      className="px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 bg-white/5 text-slate-500 active:bg-orange-600 active:text-white active:scale-95"
                    >
                       {m}M
                     </button>
                   ))}
                   <button 
                    onClick={() => { setIsTimerPanelOpen(true); window.history.pushState({panel:'timer'}, ''); }} 
                    className="w-14 h-14 flex items-center justify-center rounded-2xl bg-purple-600/20 text-purple-400 hover:bg-purple-600/40 border border-purple-500/20 shrink-0 transition-all active:scale-90"
                   >
                     <Plus size={22} strokeWidth={3} />
                   </button>
                </div>
              </div>

              <div className="liquid-glass p-7 rounded-[2.8rem] border-l-4 border-l-orange-500 flex items-center justify-between shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-[50px] -mr-16 -mt-16" />
                <div className="relative z-10">
                  <h2 className={`text-xl font-black uppercase tracking-tight ${isCycleLocked ? 'text-slate-600' : 'text-orange-500'}`}>12H Flow</h2>
                  <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest mt-1">
                    {isCycleLocked ? `Cycle Locked: ${formatTimeLeft(cycleTimeLeft)}` : 'Handshake Ready'}
                  </p>
                </div>
                <button 
                  onClick={start12HourCycle} disabled={isCycleLocked} 
                  className={`relative z-10 px-8 py-4 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${isCycleLocked ? 'bg-white/5 text-slate-800' : 'button-liquid text-white'}`}
                >
                  {isCycleLocked ? <Lock size={16} /> : 'Initiate'}
                </button>
              </div>

              <div className="space-y-4 pb-32">
                {finalTasks.map(t => {
                  const isComp = t.status === TaskStatus.COMPLETED;
                  const isLocked = t.isRoutine && t.unlockAt && currentTime < t.unlockAt;
                  const isExp = t.isRoutine && !isComp && t.unlockAt && (currentTime - t.unlockAt > HOUR_IN_MS * 3);
                  let timerStr = "";
                  if (t.timerMinutes && t.timerStartedAt && !isComp) {
                    const rem = Math.max(0, (t.timerMinutes * 60000) - (currentTime - t.timerStartedAt));
                    timerStr = `${Math.floor(rem/60000)}:${Math.floor((rem%60000)/1000).toString().padStart(2,'0')}`;
                  }
                  return (
                    <div key={t.id} className={`task-card flex items-center gap-5 p-5 rounded-[2.2rem] ${t.isPersonal ? 'task-card-glow-purple border-purple-500/20' : ''} ${isComp ? 'opacity-20 scale-[0.97]' : 'hover:scale-[1.01]'} ${isExp ? 'opacity-5 saturate-0' : ''}`}>
                      <button onClick={() => toggleTask(t.id)} disabled={isLocked || isExp} className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all shrink-0 ${isComp ? 'bg-orange-500 border-orange-500 text-white shadow-orange-500/20 shadow-xl' : (isLocked ? 'border-white/5 text-slate-900' : 'border-white/15 bg-white/5')}`}>
                        {isComp ? <CheckCircle size={26} strokeWidth={3} /> : (isLocked ? <Lock size={20} /> : <div className="w-2 h-2 rounded-full bg-white/20" />)}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${t.isPersonal ? 'bg-purple-600 text-white' : 'bg-white/10 text-slate-500 uppercase tracking-widest'}`}>{t.timeSlot}</span>
                          {t.isDaily && <span className="text-[9px] font-black text-orange-400/80 uppercase tracking-widest flex items-center gap-1.5 bg-orange-500/5 px-2 py-1 rounded-lg"><Repeat size={10}/> Daily</span>}
                          {timerStr && <span className="text-[9px] font-black text-white bg-red-600/60 px-2.5 py-1 rounded-lg flex items-center gap-1.5 animate-pulse"><Timer size={10}/> {timerStr}</span>}
                        </div>
                        <h4 className={`text-base font-black truncate text-white tracking-tight ${isComp ? 'line-through text-slate-800' : ''}`}>{t.title}</h4>
                      </div>
                      <button onClick={() => deleteTask(t.id)} className="p-4 text-slate-800 hover:text-red-500 transition-all"><Trash2 size={20} /></button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {activeScreen === 'profile' && currentUser && (
             <div className="space-y-12 screen-fade-in pt-10 pb-32">
               <div className="flex flex-col items-center space-y-6">
                 <div className="relative w-32 h-32 rounded-full bg-gradient-to-tr from-purple-600 to-orange-500 p-1.5 shadow-2xl">
                   <div className="w-full h-full bg-black rounded-full flex items-center justify-center border border-white/10 overflow-hidden relative shadow-inner"><UserCircle size={80} className="text-white/10" /></div>
                 </div>
                 <h2 className="text-3xl font-black text-white uppercase tracking-tighter brand-glow">{currentUser.name || "Protocol User"}</h2>
               </div>
               <div className="grid grid-cols-2 gap-8">
                 <RechargeWidget title="Streak" value={stats.streak} max={30} colorClass="orange" labels={['0', '15', '30']} icon={Flame} />
                 <RechargeWidget title="Flow" value={stats.totalStars} max={100} colorClass="purple" labels={['0', '50', '100']} icon={Zap} />
               </div>
               <button onClick={handleLogout} className="w-full liquid-glass p-10 rounded-[3rem] text-lg font-black text-red-500 uppercase tracking-widest hover:bg-red-500/5 transition-all flex justify-between items-center group">
                 Kill Session <LogOut size={24} className="group-hover:translate-x-1 transition-transform" />
               </button>
             </div>
          )}
        </main>
        <Navbar activeScreen={activeScreen} setActiveScreen={setActiveScreen} />
      </div>
    </div>
  );
};

export default App;