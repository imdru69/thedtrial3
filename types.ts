
export enum TaskStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED'
}

export interface Task {
  id: string;
  title: string;
  description: string;
  timeSlot: string;
  status: TaskStatus;
  isRoutine: boolean;
  isPersonal: boolean;
  isDaily: boolean;
  createdAt: number;
  unlockAt?: number;
  timerMinutes?: number; // Total duration in minutes
  timerStartedAt?: number; // Timestamp when the timer was initiated
}

export interface User {
  email: string;
  id: string;
  lastLogin: number;
  name?: string;
  profiles?: string[];
  hasOnboarded?: boolean;
}

export interface UserStats {
  stars: number;
  streak: number;
  totalStars: number;
  completedToday: number;
  currentDayTimestamp: number;
  lastCycleTimestamp: number;
  thresholds: number[];
}