import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, CheckCircle, Clock, Trash2, Sparkles, Repeat, Lock, UserCircle, Flame, Zap, Settings, LogOut } from 'lucide-react';
import { Task, TaskStatus, UserStats, User } from './types';
import { generateRoutineTasks, generateSingleTask } from './services/geminiService';
import { StarSystem } from './components/StarSystem';
import { StarBackground } from './components/StarBackground';
import { Navbar, ScreenID } from './components/Navbar';
import { AuthScreen } from './components/AuthScreen';
import { OnboardingScreen } from './components/OnboardingScreen';

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
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('thed_active_user');
    return saved ? JSON.parse(saved) : null;
  });

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

  // Load user-specific data
  useEffect(() => {
    if (currentUser) {
      const storageKey = `thed_data_${currentUser.email}`;
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setTasks(parsed.tasks || []);
        setStats(parsed.stats || {
          stars: 0, 
          streak: 0,
          totalStars: 0,
          completedToday: 0,
          currentDayTimestamp: new Date().setHours(0, 0, 0, 0),
          lastCycleTimestamp: 0,
          thresholds: generateRandomThresholds()
        });
      }
    }
  }, [currentUser]);

  // Save user-specific data
  useEffect(() => {
    if (currentUser) {
      const storageKey = `thed_data_${currentUser.email}`;
      localStorage.setItem(storageKey, JSON.stringify({ tasks, stats }));
      localStorage.setItem('thed_active_user', JSON.stringify(currentUser));
    }
  }, [tasks, stats, currentUser]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const today = new Date().setHours(0, 0, 0, 0);
    if (stats.currentDayTimestamp !== today) {
      setTasks(prev => {
        return prev.map(t => t.isDaily ? { ...t, status: TaskStatus.PENDING } : t)
                  .filter(t => t.isDaily || (t.status === TaskStatus.PENDING && !t.isRoutine));
      });
      setStats(prev => ({
        ...prev,
        completedToday: 0,
        currentDayTimestamp: today,
        thresholds: generateRandomThresholds(),
        streak: prev.completedToday > 0 ? prev.streak + 1 : 0
      }));
    }
  }, [stats.currentDayTimestamp]);

  const handleLogin = (email: string) => {
    // Check if this is a known user to determine onboarding status
    const storageKey = `thed_data_${email}`;
    const existingData = localStorage.getItem(storageKey);
    const parsed = existingData ? JSON.parse(existingData) : null;
    
    setCurrentUser({
      email,
      id: btoa(email),
      lastLogin: Date.now(),
      hasOnboarded: parsed?.user?.hasOnboarded || false,
      name: parsed?.user?.name,
      profiles: parsed?.user?.profiles
    });
  };

  const handleOnboardingComplete = (name: string, profiles: string[]) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, name, profiles, hasOnboarded: true };
      setCurrentUser(updatedUser);
      // Explicitly trigger a save of the user metadata
      const storageKey = `thed_data_${currentUser.email}`;
      const currentStorage = JSON.parse(localStorage.getItem(storageKey) || '{"tasks":[], "stats":{}}');
      localStorage.setItem(storageKey, JSON.stringify({ ...currentStorage, user: updatedUser }));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('thed_active_user');
    setCurrentUser(null);
    setActiveScreen('home');
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
    if (isCycleLocked) return;
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
        setTasks(prev => [...prev.filter(t => !t.isRoutine), ...newRoutineTasks]);
        setStats(prev => ({ ...prev, lastCycleTimestamp: startTime }));
      } catch (e) { console.error(e); }
    });
  };

  const handleAIBoost = async () => {
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
        setTasks(prev => [task, ...prev]);
      } catch (e) {
        console.error("AI Boost failed", e);
      }
    });
  };

  const addManualTask = () => {
    if (!newTaskTitle.trim()) return;
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
    setTasks([task, ...tasks]);
    setNewTaskTitle('');
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        if (t.isRoutine && t.unlockAt && currentTime < t.unlockAt - 1000) return t;
        const completing = t.status !== TaskStatus.COMPLETED;
        setStats(s => ({ 
          ...s, 
          completedToday: completing ? s.completedToday + 1 : Math.max(0, s.completedToday - 1),
          totalStars: completing ? s.totalStars + 1 : s.totalStars
        }));
        return { ...t, status: completing ? TaskStatus.COMPLETED : TaskStatus.PENDING };
      }
      return t;
    }));
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    const aComp = a.status === TaskStatus.COMPLETED;
    const bComp = b.status === TaskStatus.COMPLETED;
    if (aComp !== bComp) return aComp ? 1 : -1;
    return (a.unlockAt || a.createdAt) - (b.unlockAt || b.createdAt);
  });

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-black relative">
        <StarBackground />
        <AuthScreen onLogin={handleLogin} />
      </div>
    );
  }

  // Show onboarding if the user hasn't completed it
  if (!currentUser.hasOnboarded) {
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
                        <button onClick={() => setTasks(tasks.filter(t => t.id !== task.id))} className="p-3 text-slate-800 hover:text-red-600 active:scale-90 transition-all"><Trash2 size={18} /></button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeScreen === 'profile' && (
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
              
              {/* Profile Settings Menu - Updated to match image design */}
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