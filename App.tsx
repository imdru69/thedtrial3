import React, { useState, useEffect, useCallback } from 'react';
import { Plus, CheckCircle, Clock, Trash2, Sparkles, Repeat, Lock, UserCircle, Flame, Zap, Settings, LogOut, AlertTriangle, RefreshCw } from 'lucide-react';
import { Task, TaskStatus, UserStats, User } from './types';
import { generateRoutineTasks, generateSingleTask } from './services/geminiService';
import { StarSystem } from './components/StarSystem';
import { StarBackground } from './components/StarBackground';
import { Navbar, ScreenID } from './components/Navbar';
import { AuthScreen } from './components/AuthScreen';
import { OnboardingScreen } from './components/OnboardingScreen';
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
    currentDayTimestamp: new Date().setHours(0, 0, 0, 0),
    lastCycleTimestamp: 0,
    thresholds: generateRandomThresholds()
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isDailyToggle, setIsDailyToggle] = useState(false);

  const handleSessionUser = useCallback(async (user: any) => {
    setDbError(null);
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // PGRST116 means no row found, which is expected for new users
      if (profileError && profileError.code !== 'PGRST116') {
        setDbError(`DB Protocol Failure: ${profileError.message}`);
        return;
      }

      const userData: User = {
        email: user.email!,
        id: user.id,
        lastLogin: Date.now(),
        hasOnboarded: !!profile?.has_onboarded,
        name: profile?.name,
        profiles: profile?.profiles_list
      };
      
      setCurrentUser(userData);

      if (profile) {
        setStats({
          stars: profile.stars || 0,
          streak: profile.streak || 0,
          totalStars: profile.total_stars || 0,
          completedToday: profile.completed_today || 0,
          currentDayTimestamp: profile.current_day_timestamp || new Date().setHours(0, 0, 0, 0),
          lastCycleTimestamp: profile.last_cycle_timestamp || 0,
          thresholds: profile.thresholds || generateRandomThresholds()
        });
      }

      const { data: userTasks, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id);

      if (taskError) {
        console.warn("Task recovery skipped:", taskError.message);
      } else if (userTasks) {
        setTasks(userTasks.map((t: any) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          timeSlot: t.time_slot,
          status: t.status,
          isRoutine: t.is_routine,
          isPersonal: t.is_personal,
          isDaily: t.is_daily,
          createdAt: new Date(t.created_at).getTime(),
          unlockAt: t.unlock_at ? new Date(t.unlock_at).getTime() : undefined
        })));
      }
      setIsAppReady(true);
    } catch (e: any) {
      setDbError(`Critical System Exception: ${e.message}`);
    }
  }, []);

  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user) await handleSessionUser(session.user);
      else setIsAppReady(true);
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) handleSessionUser(session.user);
      else {
        setCurrentUser(null);
        setIsAppReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [handleSessionUser]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Day rollover logic
  useEffect(() => {
    if (!currentUser || !isAppReady) return;
    const today = new Date().setHours(0, 0, 0, 0);
    if (stats.currentDayTimestamp !== today && stats.currentDayTimestamp !== 0) {
      const resetTasks = async () => {
        try {
          const updatedTasks = tasks.map(t => t.isDaily ? { ...t, status: TaskStatus.PENDING } : t)
                               .filter(t => t.isDaily || (t.status === TaskStatus.PENDING && !t.isRoutine));
          
          await supabase.from('tasks').delete().eq('user_id', currentUser.id).neq('is_daily', true).eq('status', TaskStatus.COMPLETED);
          await supabase.from('tasks').update({ status: TaskStatus.PENDING }).eq('user_id', currentUser.id).eq('is_daily', true);

          setTasks(updatedTasks);
          const newStats = {
            ...stats,
            completedToday: 0,
            currentDayTimestamp: today,
            thresholds: generateRandomThresholds(),
            streak: stats.completedToday > 0 ? stats.streak + 1 : 0
          };
          setStats(newStats);
          syncStats(newStats);
        } catch (e) {
          console.error("Rollover failure:", e);
        }
      };
      resetTasks();
    }
  }, [stats.currentDayTimestamp, currentUser, isAppReady, tasks, stats]);

  const syncStats = async (s: UserStats) => {
    if (!currentUser) return;
    try {
      await supabase.from('profiles').upsert({
        id: currentUser.id,
        stars: s.stars,
        streak: s.streak,
        total_stars: s.totalStars,
        completed_today: s.completedToday,
        current_day_timestamp: s.currentDayTimestamp,
        last_cycle_timestamp: s.lastCycleTimestamp,
        thresholds: s.thresholds
      });
    } catch (e) {
      console.error("Sync failure:", e);
    }
  };

  const handleOnboardingComplete = async (name: string, profiles: string[]) => {
    if (currentUser) {
      setIsLoading(true);
      try {
        const { error } = await supabase.from('profiles').upsert({
          id: currentUser.id,
          name,
          profiles_list: profiles,
          has_onboarded: true,
          current_day_timestamp: new Date().setHours(0, 0, 0, 0)
        });
        if (!error) {
          setCurrentUser({ ...currentUser, name, profiles, hasOnboarded: true });
        } else {
          setDbError(`Identity Sync Failed: ${error.message}`);
        }
      } catch (e: any) {
        setDbError(e.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setSession(null);
    setActiveScreen('home');
    setDbError(null);
  };

  const cycleTimeLeft = Math.max(0, (stats.lastCycleTimestamp + TWELVE_HOURS_MS) - currentTime);
  const isCycleLocked = cycleTimeLeft > 0;

  const formatTimeLeft = (ms: number) => {
    const h = Math.floor(ms / HOUR_IN_MS);
    const m = Math.floor((ms % HOUR_IN_MS) / (60 * 1000));
    const s = Math.floor((ms % (60 * 1000)) / 1000);
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const simulateLoading = async (finalAction: () => Promise<void>) => {
    setIsLoading(true);
    setLoadingProgress(0);
    for (let i = 0; i <= 20; i++) {
      setLoadingProgress(Math.floor((i / 20) * 100));
      await new Promise(r => setTimeout(r, 40));
    }
    await finalAction();
    setIsLoading(false);
  };

  const start12HourCycle = async () => {
    if (isCycleLocked || !currentUser) return;
    await simulateLoading(async () => {
      try {
        const routineData = await generateRoutineTasks();
        const startTime = Date.now();
        const newRoutineTasks: Task[] = routineData.map((data, index) => ({
          id: `routine-${Date.now()}-${index}`,
          title: data.title,
          description: data.description,
          timeSlot: new Date(startTime + index * HOUR_IN_MS).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: TaskStatus.PENDING,
          isRoutine: true,
          isPersonal: false,
          isDaily: false,
          createdAt: Date.now(),
          unlockAt: startTime + index * HOUR_IN_MS
        }));

        const dbTasks = newRoutineTasks.map(t => ({
          user_id: currentUser.id,
          title: t.title,
          description: t.description,
          time_slot: t.timeSlot,
          status: t.status,
          is_routine: t.isRoutine,
          is_personal: t.isPersonal,
          is_daily: t.isDaily,
          unlock_at: t.unlockAt ? new Date(t.unlockAt).toISOString() : null
        }));
        
        const { error } = await supabase.from('tasks').insert(dbTasks);
        if (error) throw error;

        setTasks(prev => [...prev.filter(t => !t.isRoutine), ...newRoutineTasks]);
        const updatedStats = { ...stats, lastCycleTimestamp: startTime };
        setStats(updatedStats);
        syncStats(updatedStats);
      } catch (e: any) { 
        setDbError(`Cycle Initiation Failed: ${e.message}`);
      }
    });
  };

  const handleAIBoost = async () => {
    if (!currentUser) return;
    await simulateLoading(async () => {
      try {
        const data = await generateSingleTask();
        const task: Task = {
          id: `ai-${Date.now()}`,
          title: data.title,
          description: data.description,
          timeSlot: 'Now',
          status: TaskStatus.PENDING,
          isRoutine: false,
          isPersonal: true,
          isDaily: false,
          createdAt: Date.now()
        };

        const { error } = await supabase.from('tasks').insert({
          user_id: currentUser.id,
          title: task.title,
          description: task.description,
          time_slot: task.timeSlot,
          status: task.status,
          is_routine: task.isRoutine,
          is_personal: task.isPersonal,
          is_daily: task.isDaily
        });
        if (error) throw error;

        setTasks(prev => [task, ...prev]);
      } catch (e: any) { 
        setDbError(`AI Boost Offline: ${e.message}`);
      }
    });
  };

  const addManualTask = async () => {
    if (!newTaskTitle.trim() || !currentUser) return;
    try {
      const task: Task = {
        id: `manual-${Date.now()}`,
        title: newTaskTitle,
        description: isDailyToggle ? 'Daily Routine' : 'One-time Objective',
        timeSlot: 'Now',
        status: TaskStatus.PENDING,
        isRoutine: false,
        isPersonal: true,
        isDaily: isDailyToggle,
        createdAt: Date.now()
      };

      const { data, error } = await supabase.from('tasks').insert({
        user_id: currentUser.id,
        title: task.title,
        description: task.description,
        time_slot: task.timeSlot,
        status: task.status,
        is_routine: task.isRoutine,
        is_personal: task.isPersonal,
        is_daily: task.isDaily
      }).select().single();

      if (error) throw error;

      if (data) {
        setTasks([{ ...task, id: data.id }, ...tasks]);
        setNewTaskTitle('');
      }
    } catch (e: any) {
      setDbError(`Input Error: ${e.message}`);
    }
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task || !currentUser) return;
    if (task.isRoutine && task.unlockAt && currentTime < task.unlockAt - 1000) return;

    const newStatus = task.status === TaskStatus.COMPLETED ? TaskStatus.PENDING : TaskStatus.COMPLETED;
    const completing = newStatus === TaskStatus.COMPLETED;

    try {
      const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
      const newStats = { 
        ...stats, 
        completedToday: completing ? stats.completedToday + 1 : Math.max(0, stats.completedToday - 1),
        totalStars: completing ? stats.totalStars + 1 : stats.totalStars
      };
      setStats(newStats);
      syncStats(newStats);
    } catch (e: any) {
      setDbError(`Sync Error: ${e.message}`);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      setTasks(tasks.filter(t => t.id !== id));
    } catch (e: any) {
      setDbError(`Delete Error: ${e.message}`);
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    const aComp = a.status === TaskStatus.COMPLETED;
    const bComp = b.status === TaskStatus.COMPLETED;
    if (aComp !== bComp) return aComp ? 1 : -1;
    return (a.unlockAt || a.createdAt) - (b.unlockAt || b.createdAt);
  });

  if (!isAppReady) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <RefreshCw className="text-purple-500 animate-spin" size={32} />
          <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.5em]">Synchronizing</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-black relative">
        <StarBackground />
        <AuthScreen onLogin={(s) => setSession(s)} />
      </div>
    );
  }

  if (currentUser && !currentUser.hasOnboarded) {
    return (
      <div className="min-h-screen bg-black relative">
        <StarBackground />
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-32 relative overflow-hidden">
      <StarBackground />
      {isLoading && <ActionLoading progress={loadingProgress} />}
      
      <div className="relative z-10 w-full flex flex-col min-h-screen">
        <header className="sticky top-0 z-50 liquid-glass rounded-b-[2.5rem] p-6 flex justify-between items-center">
          <h1 className="text-3xl font-black text-white brand-glow tracking-tighter">TheD.</h1>
          <StarSystem progress={stats.completedToday} thresholds={stats.thresholds} />
        </header>

        {dbError && (
          <div className="mx-5 mt-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 animate-in fade-in slide-in-from-top-4">
            <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
            <div className="flex-1">
              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest leading-relaxed">
                {dbError}
              </p>
              <button 
                onClick={() => handleSessionUser(session.user)}
                className="mt-2 text-[8px] font-black text-white/60 hover:text-white uppercase tracking-widest flex items-center gap-1"
              >
                <RefreshCw size={10} /> Retry Sync
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 px-5 pt-8">
          {activeScreen === 'home' && (
            <div className="space-y-8 screen-fade-in">
              <div className="liquid-glass p-6 rounded-[2.5rem] space-y-6">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addManualTask()}
                    placeholder="Capture ritual..."
                    className="flex-1 bg-white/5 border-none rounded-2xl px-5 py-4 text-sm focus:ring-1 focus:ring-purple-500/50 outline-none font-bold text-white placeholder:text-slate-700"
                  />
                  <button onClick={addManualTask} className="button-liquid p-4 rounded-2xl">
                    <Plus size={20} className="text-white" strokeWidth={3} />
                  </button>
                </div>
                <div className="flex items-center justify-between px-2">
                  <div className="relative flex w-40 p-1 rounded-full bg-black/40 border border-white/5">
                    <div 
                      className={`absolute top-1 bottom-1 rounded-full transition-all duration-300 ease-out bg-purple-600`}
                      style={{ width: 'calc(50% - 4px)', left: isDailyToggle ? 'calc(50% + 2px)' : '2px' }}
                    />
                    <button onClick={() => setIsDailyToggle(false)} className={`relative z-10 w-1/2 py-1.5 text-[9px] font-black uppercase tracking-widest ${!isDailyToggle ? 'text-white' : 'text-slate-600'}`}>Once</button>
                    <button onClick={() => setIsDailyToggle(true)} className={`relative z-10 w-1/2 py-1.5 text-[9px] font-black uppercase tracking-widest ${isDailyToggle ? 'text-white' : 'text-slate-600'}`}>Daily</button>
                  </div>
                  <button onClick={handleAIBoost} className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Sparkles size={12} /> AI Boost
                  </button>
                </div>
              </div>

              <div className="liquid-glass p-6 rounded-[2.5rem] border-l-4 border-l-orange-500 flex items-center justify-between">
                <div>
                  <h2 className={`text-xl font-black uppercase tracking-tight ${isCycleLocked ? 'text-slate-500' : 'text-orange-500'}`}>
                    12H Flow
                  </h2>
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1">
                    {isCycleLocked ? `Next sequence in ${formatTimeLeft(cycleTimeLeft)}` : 'Ready to initiate'}
                  </p>
                </div>
                <button 
                  onClick={start12HourCycle} 
                  disabled={isCycleLocked} 
                  className={`px-8 py-3.5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${isCycleLocked ? 'bg-white/5 text-slate-700' : 'button-liquid text-white'}`}
                >
                  {isCycleLocked ? <Lock size={14} /> : 'Start'}
                </button>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-600 tracking-[0.3em] uppercase px-3">Protocol Queue</h3>
                <div className="space-y-4">
                  {sortedTasks.length === 0 && (
                    <div className="py-20 text-center liquid-glass rounded-[2.5rem] border-dashed border-white/5">
                      <Clock size={40} className="mx-auto text-slate-900 mb-4 opacity-30" />
                      <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Awaiting Command</p>
                    </div>
                  )}
                  {sortedTasks.map(task => {
                    const isComp = task.status === TaskStatus.COMPLETED;
                    const isLocked = task.isRoutine && task.unlockAt && currentTime < task.unlockAt - 1000;
                    return (
                      <div 
                        key={task.id}
                        className={`task-card flex items-center gap-5 p-5 rounded-[2rem] border transition-all ${isComp ? 'opacity-25' : ''} ${task.isPersonal ? 'border-purple-500/20 bg-purple-900/5' : 'border-white/5'}`}
                      >
                        <button 
                          onClick={() => toggleTask(task.id)}
                          disabled={isLocked}
                          className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all shrink-0 ${
                            isComp ? 'bg-orange-500 border-orange-500 text-white' : 
                            isLocked ? 'border-white/5 text-slate-900' : 'border-white/10 active:border-purple-500 bg-white/5'
                          }`}
                        >
                          {isComp ? <CheckCircle size={22} strokeWidth={3} /> : isLocked ? <Lock size={18} /> : null}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg ${task.isPersonal ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-600 uppercase'}`}>
                              {task.timeSlot}
                            </span>
                            {task.isDaily && <span className="text-[8px] font-black text-orange-400 uppercase tracking-widest flex items-center gap-1"><Repeat size={8}/> Daily</span>}
                          </div>
                          <h4 className={`text-base font-black truncate text-white tracking-tight ${isComp ? 'line-through text-slate-700' : ''}`}>{task.title}</h4>
                        </div>
                        <button onClick={() => deleteTask(task.id)} className="p-3 text-slate-800 hover:text-red-600 active:scale-90 transition-all"><Trash2 size={18} /></button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeScreen === 'profile' && currentUser && (
            <div className="space-y-12 screen-fade-in pt-6">
              <div className="flex flex-col items-center space-y-5">
                <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-purple-600 to-orange-500 p-1.5 shadow-[0_0_40px_rgba(168,85,247,0.2)]">
                  <div className="w-full h-full bg-black rounded-full flex items-center justify-center border border-white/5 overflow-hidden">
                    <UserCircle size={70} className="text-white/10" />
                  </div>
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-black text-white uppercase tracking-tighter truncate max-w-[300px]">
                    {currentUser.name || currentUser.email.split('@')[0]}
                  </h2>
                  <div className="flex gap-2 justify-center mt-2">
                    {currentUser.profiles?.map(p => (
                      <span key={p} className="text-[8px] font-black bg-white/10 px-2 py-1 rounded-full text-white/50 uppercase tracking-widest border border-white/5">
                        {p}
                      </span>
                    ))}
                  </div>
                  <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.4em] mt-3">Verified Node: {currentUser.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <RechargeWidget title="Streak" value={stats.streak} max={30} colorClass="orange" labels={['0', '15', '30']} icon={Flame} />
                <RechargeWidget title="Zenith" value={stats.totalStars} max={100} colorClass="purple" labels={['0', '50', '100']} icon={Zap} />
              </div>
              
              <div className="liquid-glass rounded-[3.5rem] overflow-hidden border border-white/5 shadow-2xl">
                <button className="w-full flex items-center justify-between p-8 hover:bg-white/5 transition-colors group">
                  <span className="text-base font-black text-white uppercase tracking-wider">Setting</span>
                  <Settings size={22} className="text-slate-800 group-hover:text-slate-400 transition-colors" />
                </button>
                <div className="mx-8 h-px bg-white/5" />
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between p-8 hover:bg-white/10 transition-colors group"
                >
                  <span className="text-base font-black text-red-500 uppercase tracking-wider">Logout</span>
                  <LogOut size={22} className="text-red-900 group-hover:text-red-500 transition-colors" />
                </button>
              </div>
            </div>
          )}
        </main>
        <Navbar activeScreen={activeScreen} setActiveScreen={setActiveScreen} />
      </div>
    </div>
  );
};

export default App;