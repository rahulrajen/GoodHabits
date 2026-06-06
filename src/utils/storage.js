const DEFAULT_HABITS = [
  { id: '1', text: 'Hydrate (Drink 2L Water)', points: 5, icon: '💧', category: 'Health' },
  { id: '2', text: 'Read 10 Pages of a Book', points: 10, icon: '📚', category: 'Mind' },
  { id: '3', text: '30-minute Workout', points: 15, icon: '💪', category: 'Fitness' },
  { id: '4', text: '10-minute Meditation', points: 10, icon: '🧘', category: 'Mind' },
  { id: '5', text: 'Eat a Healthy Meal', points: 10, icon: '🥗', category: 'Health' },
];

const STORAGE_KEYS = {
  HABITS: 'good_habits_list',
  DAILY_TARGET: 'good_habits_target',
  HISTORY: 'good_habits_history',
  STREAK: 'good_habits_streak',
  LAST_ACTIVE: 'good_habits_last_active',
};

export const getStoredHabits = () => {
  const data = localStorage.getItem(STORAGE_KEYS.HABITS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(DEFAULT_HABITS));
    return DEFAULT_HABITS;
  }
  return JSON.parse(data);
};

export const saveStoredHabits = (habits) => {
  localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits));
};

export const getStoredTarget = () => {
  const target = localStorage.getItem(STORAGE_KEYS.DAILY_TARGET);
  return target ? parseInt(target, 10) : 35; // Default target
};

export const saveStoredTarget = (target) => {
  localStorage.setItem(STORAGE_KEYS.DAILY_TARGET, target.toString());
};

export const getStoredHistory = () => {
  const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
  return data ? JSON.parse(data) : {};
};

export const saveStoredHistory = (history) => {
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
};

export const getStoredStreak = () => {
  const streak = localStorage.getItem(STORAGE_KEYS.STREAK);
  return streak ? parseInt(streak, 10) : 0;
};

export const getStoredLastActive = () => {
  return localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE) || '';
};

// Main function to load full initial state and compute current streak
export const loadInitialAppState = () => {
  const habits = getStoredHabits();
  const dailyTarget = getStoredTarget();
  const history = getStoredHistory();
  let streak = getStoredStreak();
  let lastActive = getStoredLastActive();
  
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Calculate/Update streaks based on last check-in date
  if (lastActive && lastActive !== todayStr) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (lastActive === yesterdayStr) {
      // Checked in yesterday, check if yesterday's goal was met
      const yesterdayLog = history[yesterdayStr];
      const yesterdayScore = yesterdayLog 
        ? yesterdayLog.loggedHabits.reduce((sum, hId) => {
            const h = habits.find(habit => habit.id === hId);
            return sum + (h ? h.points : 0);
          }, 0)
        : 0;
      const yesterdayTarget = yesterdayLog ? yesterdayLog.target : dailyTarget;
      
      if (yesterdayScore < yesterdayTarget) {
        // Did not meet target yesterday, reset streak
        streak = 0;
      }
    } else {
      // Last active is older than yesterday, streak resets
      streak = 0;
    }
  }

  return {
    habits,
    dailyTarget,
    history,
    streak,
    lastActive,
    todayStr,
  };
};

export const saveAppState = (state) => {
  saveStoredHabits(state.habits);
  saveStoredTarget(state.dailyTarget);
  saveStoredHistory(state.history);
  localStorage.setItem(STORAGE_KEYS.STREAK, state.streak.toString());
  localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, state.lastActive);
};
