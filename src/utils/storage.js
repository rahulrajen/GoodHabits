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

import { GITHUB_CONFIG } from '../config';

export const GITHUB_OVERRIDE_KEY = 'good_habits_github_override';

export const getGithubConfig = () => {
  let localOverride = null;
  try {
    const data = localStorage.getItem(GITHUB_OVERRIDE_KEY);
    if (data) localOverride = JSON.parse(data);
  } catch (e) {
    // ignore
  }

  const baseConfig = localOverride || GITHUB_CONFIG;
  if (!baseConfig || !baseConfig.owner || !baseConfig.repo || !baseConfig.token) return null;

  let token = baseConfig.token.trim();
  
  // Reverse the token back if it has the "reversed:" prefix
  if (token.startsWith('reversed:')) {
    token = token.substring(9).split('').reverse().join('');
  }

  // Decode base64 tokens automatically if they do not start with GitHub token prefixes
  if (token && !token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
    try {
      token = atob(token);
    } catch (e) {
      // Ignore and use original if not valid base64
    }
  }

  return {
    ...baseConfig,
    token
  };
};

export const saveGithubConfigOverride = (override) => {
  if (!override) {
    localStorage.removeItem(GITHUB_OVERRIDE_KEY);
  } else {
    localStorage.setItem(GITHUB_OVERRIDE_KEY, JSON.stringify(override));
  }
};

export const fetchGithubDb = async (config) => {
  const { owner, repo, branch, path, token } = config;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}&_t=${Date.now()}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (response.status === 404) {
    return { db: getDefaultDbStructure(), sha: null };
  }

  if (!response.ok) {
    throw new Error(`GitHub fetch failed: ${response.statusText}`);
  }

  const data = await response.json();
  const decodedContent = decodeURIComponent(escape(atob(data.content.replace(/\s/g, ''))));
  const db = JSON.parse(decodedContent);
  return { db, sha: data.sha };
};

export const saveGithubDb = async (config, db, sha) => {
  const { owner, repo, branch, path, token } = config;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  // Fetch the latest SHA immediately before write to avoid conflict
  let currentSha = sha;
  try {
    const checkRes = await fetch(`${url}?ref=${branch}&_t=${Date.now()}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (checkRes.ok) {
      const fileInfo = await checkRes.json();
      currentSha = fileInfo.sha;
    }
  } catch (e) {
    console.warn("Could not fetch fresh SHA before write, using cached:", e);
  }

  const content = btoa(unescape(encodeURIComponent(JSON.stringify(db, null, 2))));
  const body = {
    message: 'Sync habits data [skip ci]',
    content,
    branch
  };

  if (currentSha) {
    body.sha = currentSha;
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `GitHub save failed: ${response.statusText}`);
  }

  const resData = await response.json();
  return resData.content.sha;
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
