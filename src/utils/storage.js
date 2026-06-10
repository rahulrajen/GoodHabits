export const DEFAULT_HABITS = [
  { id: '1', text: 'Hydrate (Drink 2L Water)', points: 5, icon: '💧', category: 'Health' },
  { id: '2', text: 'Read 10 Pages of a Book', points: 10, icon: '📚', category: 'Mind' },
  { id: '3', text: '30-minute Workout', points: 15, icon: '💪', category: 'Fitness' },
  { id: '4', text: '10-minute Meditation', points: 10, icon: '🧘', category: 'Mind' },
  { id: '5', text: 'Eat a Healthy Meal', points: 10, icon: '🥗', category: 'Health' },
];

const STORAGE_KEY = 'good_habits_db';

export const getDefaultDbStructure = () => ({
  profiles: {
    default: {
      habits: [...DEFAULT_HABITS],
      dailyTarget: 35,
      history: {},
      streak: 0,
      lastActive: ''
    }
  },
  currentProfile: 'default'
});

// Sanity check/update streak for a specific profile state
export const checkProfileStreak = (profileState) => {
  if (!profileState) return profileState;
  
  const habits = profileState.habits || [];
  const dailyTarget = profileState.dailyTarget || 35;
  const history = profileState.history || {};
  let streak = profileState.streak || 0;
  let lastActive = profileState.lastActive || '';
  
  const todayStr = new Date().toISOString().split('T')[0];
  
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
    ...profileState,
    streak,
    lastActive
  };
};

// Fetch full DB from the server middleware or static db.json fallback
export const fetchServerDb = async () => {
  try {
    const response = await fetch('/api/db');
    if (response.ok) {
      const db = await response.json();
      return { db, isWritable: true };
    }
  } catch (error) {
    // ignore and fall through
  }

  try {
    const response = await fetch('./db.json');
    if (response.ok) {
      const db = await response.json();
      return { db, isWritable: false };
    }
  } catch (error) {
    // ignore
  }

  return null;
};

// Save full DB to the server middleware
export const saveServerDb = async (db) => {
  try {
    const response = await fetch('/api/db', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(db, null, 2)
    });
    if (!response.ok) throw new Error('Save to server API failed');
    return true;
  } catch (error) {
    console.error('Could not save to server DB:', error.message);
    return false;
  }
};

// LocalStorage Fallbacks
export const loadInitialDbFromLocalStorage = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    const defaultDb = getDefaultDbStructure();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultDb));
    return defaultDb;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    const defaultDb = getDefaultDbStructure();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultDb));
    return defaultDb;
  }
};

export const saveDbToLocalStorage = (db) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
};
