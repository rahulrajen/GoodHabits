import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import {
  DEFAULT_HABITS,
  checkProfileStreak,
  fetchServerDb,
  saveServerDb,
  loadInitialDbFromLocalStorage,
  saveDbToLocalStorage
} from './utils/storage';
import ProgressHeader from './components/ProgressHeader';
import HabitCard from './components/HabitCard';
import HabitModal from './components/HabitModal';
import AnalyticsView from './components/AnalyticsView';
import Celebration from './components/Celebration';
import './App.css';

export default function App() {
  const [db, setDb] = useState(null);
  const [isUsingServer, setIsUsingServer] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState(null);
  const [currentView, setView] = useState('dashboard');
  const [celebrate, setCelebrate] = useState(false);
  
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Initialize DB asynchronously
  useEffect(() => {
    const initDb = async () => {
      // 1. Check if we already have local storage edits
      const localData = localStorage.getItem('good_habits_db');
      if (localData) {
        const loadedDb = loadInitialDbFromLocalStorage();
        setIsUsingServer(false);
        setDb(loadedDb);
        return;
      }

      // 2. No local storage, try loading from server API or static db.json seed
      const serverResult = await fetchServerDb();
      let loadedDb;
      
      if (serverResult) {
        loadedDb = serverResult.db;
        setIsUsingServer(serverResult.isWritable);
        // If it's a static fetch (not writable API), populate localStorage with it
        if (!serverResult.isWritable) {
          saveDbToLocalStorage(loadedDb);
        }
      } else {
        loadedDb = loadInitialDbFromLocalStorage();
        setIsUsingServer(false);
      }
      
      const current = loadedDb.currentProfile || 'default';
      if (!loadedDb.profiles[current]) {
        loadedDb.profiles[current] = {
          habits: [...DEFAULT_HABITS],
          dailyTarget: 35,
          history: {},
          streak: 0,
          lastActive: ''
        };
      }
      loadedDb.profiles[current] = checkProfileStreak(loadedDb.profiles[current]);
      setDb(loadedDb);
    };
    initDb();
  }, []);

  // Save DB when changed
  useEffect(() => {
    if (!db) return;
    if (isUsingServer) {
      saveServerDb(db);
    } else {
      saveDbToLocalStorage(db);
    }
  }, [db, isUsingServer]);

  // Handle celebration timeout
  useEffect(() => {
    if (celebrate) {
      const timer = setTimeout(() => {
        setCelebrate(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [celebrate]);

  if (!db) {
    return (
      <div className="app-loading flex-center">
        <div className="loader"></div>
      </div>
    );
  }

  const activeProfile = db.currentProfile || 'default';
  const state = db.profiles[activeProfile];
  const { habits, dailyTarget, history, streak, lastActive } = state;
  const todayStr = new Date().toISOString().split('T')[0];

  const updateActiveState = (newState) => {
    setDb(prevDb => ({
      ...prevDb,
      profiles: {
        ...prevDb.profiles,
        [activeProfile]: {
          ...prevDb.profiles[activeProfile],
          ...newState
        }
      }
    }));
  };

  const handleSwitchProfile = (profileName) => {
    if (!db.profiles[profileName]) return;
    setDb(prevDb => {
      const checkedState = checkProfileStreak(prevDb.profiles[profileName]);
      return {
        ...prevDb,
        currentProfile: profileName,
        profiles: {
          ...prevDb.profiles,
          [profileName]: checkedState
        }
      };
    });
  };

  const handleCreateProfile = (profileName) => {
    if (!profileName.trim()) return;
    const name = profileName.trim().toLowerCase();
    if (db.profiles[name]) {
      alert('Profile already exists!');
      return;
    }
    setDb(prevDb => {
      const newProfile = {
        habits: [...DEFAULT_HABITS],
        dailyTarget: 35,
        history: {},
        streak: 0,
        lastActive: ''
      };
      return {
        ...prevDb,
        currentProfile: name,
        profiles: {
          ...prevDb.profiles,
          [name]: newProfile
        }
      };
    });
  };

  const handleDeleteProfile = (profileName) => {
    if (profileName === 'default') return;
    setDb(prevDb => {
      const updatedProfiles = { ...prevDb.profiles };
      delete updatedProfiles[profileName];
      const nextProfile = prevDb.currentProfile === profileName ? 'default' : prevDb.currentProfile;
      return {
        ...prevDb,
        currentProfile: nextProfile,
        profiles: updatedProfiles
      };
    });
  };

  // Helper to compute daily score for a list of checked habits
  const calculateScore = (loggedHabitIds) => {
    return loggedHabitIds.reduce((sum, hId) => {
      const h = habits.find(habit => habit.id === hId);
      return sum + (h ? h.points : 0);
    }, 0);
  };

  // Get today's logs
  const todayLog = history[todayStr] || { loggedHabits: [], target: dailyTarget };
  const todayLoggedHabits = todayLog.loggedHabits;
  const todayScore = calculateScore(todayLoggedHabits);

  // Drag and Drop Handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    setDraggedIndex(null);
    setDragOverIndex(null);

    if (sourceIndex === targetIndex || isNaN(sourceIndex)) return;

    const completedHabits = habits.filter(h => todayLoggedHabits.includes(h.id));
    const uncompletedHabits = habits.filter(h => !todayLoggedHabits.includes(h.id));
    const displayHabits = [...completedHabits, ...uncompletedHabits];

    const sourceHabit = displayHabits[sourceIndex];
    const targetHabit = displayHabits[targetIndex];

    const isSourceCompleted = todayLoggedHabits.includes(sourceHabit.id);
    const isTargetCompleted = todayLoggedHabits.includes(targetHabit.id);

    let newLogged = [...todayLoggedHabits];
    
    if (isSourceCompleted !== isTargetCompleted) {
      if (isTargetCompleted) {
        newLogged.push(sourceHabit.id);
      } else {
        newLogged = newLogged.filter(id => id !== sourceHabit.id);
      }
    }

    const reorderedDisplay = [...displayHabits];
    const [movedItem] = reorderedDisplay.splice(sourceIndex, 1);
    reorderedDisplay.splice(targetIndex, 0, movedItem);

    const updatedHabits = reorderedDisplay;

    const prevScore = todayScore;
    const newScore = calculateScore(newLogged);
    const crossedTargetMet = prevScore < dailyTarget && newScore >= dailyTarget;

    let newStreak = streak;
    let newLastActive = lastActive;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const yesterdayLog = history[yesterdayStr];

    const yesterdayScore = yesterdayLog
      ? yesterdayLog.loggedHabits.reduce((sum, hId) => {
          const h = habits.find(habit => habit.id === hId);
          return sum + (h ? h.points : 0);
        }, 0)
      : 0;
    const yesterdayTarget = yesterdayLog ? yesterdayLog.target : dailyTarget;
    const metYesterday = yesterdayLog && yesterdayScore >= yesterdayTarget;

    if (newScore >= dailyTarget) {
      newLastActive = todayStr;
      if (metYesterday) {
        newStreak = Math.max(1, streak);
      } else {
        newStreak = 1;
      }
      if (crossedTargetMet) {
        setCelebrate(true);
      }
    } else {
      if (metYesterday) {
        newStreak = Math.max(0, streak - 1);
      } else {
        newStreak = 0;
      }
    }

    updateActiveState({
      habits: updatedHabits,
      streak: newStreak,
      lastActive: newLastActive,
      history: {
        ...history,
        [todayStr]: {
          loggedHabits: newLogged,
          target: dailyTarget
        }
      }
    });
  };

  // Handle habit check / uncheck toggle
  const handleToggleHabit = (habitId) => {
    let newLogged = [...todayLoggedHabits];
    const isLogging = !newLogged.includes(habitId);

    if (isLogging) {
      newLogged.push(habitId);
    } else {
      newLogged = newLogged.filter(id => id !== habitId);
    }

    const prevScore = todayScore;
    const newScore = calculateScore(newLogged);
    const crossedTargetMet = prevScore < dailyTarget && newScore >= dailyTarget;

    let newStreak;
    let newLastActive = lastActive;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const yesterdayLog = history[yesterdayStr];

    const yesterdayScore = yesterdayLog
      ? yesterdayLog.loggedHabits.reduce((sum, hId) => {
          const h = habits.find(habit => habit.id === hId);
          return sum + (h ? h.points : 0);
        }, 0)
      : 0;
    const yesterdayTarget = yesterdayLog ? yesterdayLog.target : dailyTarget;
    const metYesterday = yesterdayLog && yesterdayScore >= yesterdayTarget;

    if (newScore >= dailyTarget) {
      newLastActive = todayStr;
      if (metYesterday) {
        newStreak = Math.max(1, streak);
      } else {
        newStreak = 1;
      }
      if (crossedTargetMet) {
        setCelebrate(true);
      }
    } else {
      if (metYesterday) {
        newStreak = Math.max(0, streak - 1);
      } else {
        newStreak = 0;
      }
    }

    updateActiveState({
      streak: newStreak,
      lastActive: newLastActive,
      history: {
        ...history,
        [todayStr]: {
          loggedHabits: newLogged,
          target: dailyTarget
        }
      }
    });
  };

  // Add or Edit habit
  const handleSaveHabit = (newHabit) => {
    let updatedHabits;
    const exists = habits.some(h => h.id === newHabit.id);

    if (exists) {
      updatedHabits = habits.map(h => h.id === newHabit.id ? newHabit : h);
    } else {
      updatedHabits = [...habits, newHabit];
    }

    updateActiveState({
      habits: updatedHabits
    });
  };

  // Delete habit
  const handleDeleteHabit = (habitId) => {
    const updatedHabits = habits.filter(h => h.id !== habitId);
    
    const cleanHistory = { ...history };
    Object.keys(cleanHistory).forEach(date => {
      cleanHistory[date] = {
        ...cleanHistory[date],
        loggedHabits: cleanHistory[date].loggedHabits.filter(id => id !== habitId)
      };
    });

    updateActiveState({
      habits: updatedHabits,
      history: cleanHistory
    });
  };

  // Set new daily target score
  const handleSaveTarget = (newTarget) => {
    const goalMetWithNewTarget = todayScore >= newTarget;
    const goalWasMetBefore = todayScore >= dailyTarget;
    
    let newStreak = streak;
    if (goalMetWithNewTarget && !goalWasMetBefore) {
      setCelebrate(true);
      newStreak = Math.max(1, streak);
    } else if (!goalMetWithNewTarget && goalWasMetBefore) {
      newStreak = Math.max(0, streak - 1);
    }

    updateActiveState({
      dailyTarget: newTarget,
      streak: newStreak,
      history: {
        ...history,
        [todayStr]: {
          ...todayLog,
          target: newTarget
        }
      }
    });
  };

  const handleOpenEdit = (habit) => {
    setHabitToEdit(habit);
    setIsManageOpen(true);
  };

  const handleOpenCreate = () => {
    setHabitToEdit(null);
    setIsManageOpen(true);
  };

  const completedHabits = habits.filter(h => todayLoggedHabits.includes(h.id));
  const uncompletedHabits = habits.filter(h => !todayLoggedHabits.includes(h.id));
  const displayHabits = [...completedHabits, ...uncompletedHabits];

  return (
    <div className="app-container">
      <Celebration active={celebrate} />
      
      <div className="app-content-wrapper">
        <ProgressHeader
          dailyScore={todayScore}
          dailyTarget={dailyTarget}
          streak={streak}
          onOpenManage={handleOpenCreate}
          onOpenAnalytics={() => setView('analytics')}
          currentView={currentView}
          setView={setView}
          profiles={Object.keys(db.profiles)}
          currentProfile={activeProfile}
          onSwitchProfile={handleSwitchProfile}
        />

        {currentView === 'dashboard' ? (
          <main className="dashboard-view fade-in">
            <div className="section-header">
              <h2 className="section-title">Today's Habits</h2>
              <p className="section-subtitle">Grip handle to rearrange. Tap card to toggle status.</p>
            </div>

            <div className="habits-grid">
              {habits.length === 0 ? (
                <div className="empty-state glass-card">
                  <p>No habits configured yet.</p>
                  <button className="btn-primary" onClick={handleOpenCreate}>
                    <Plus size={16} />
                    <span>Create Your First Habit</span>
                  </button>
                </div>
              ) : (
                displayHabits.map((habit, index) => (
                  <div
                    key={habit.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`draggable-wrapper ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
                  >
                    <HabitCard
                      habit={habit}
                      isCompleted={todayLoggedHabits.includes(habit.id)}
                      onToggle={() => handleToggleHabit(habit.id)}
                      onEdit={handleOpenEdit}
                    />
                  </div>
                ))
              )}
            </div>

            {habits.length > 0 && (
              <div className="action-row">
                <button className="btn-secondary" onClick={handleOpenCreate}>
                  <Plus size={16} />
                  <span>Add Custom Habit</span>
                </button>
              </div>
            )}
          </main>
        ) : (
          <AnalyticsView
            history={history}
            habits={habits}
            dailyTarget={dailyTarget}
            streak={streak}
          />
        )}
      </div>

      {isManageOpen && (
        <HabitModal
          key={habitToEdit ? `edit-${habitToEdit.id}` : 'create'}
          isOpen={isManageOpen}
          onClose={() => {
            setIsManageOpen(false);
            setHabitToEdit(null);
          }}
          habitToEdit={habitToEdit}
          onSaveHabit={handleSaveHabit}
          onDeleteHabit={handleDeleteHabit}
          dailyTarget={dailyTarget}
          onSaveTarget={handleSaveTarget}
          profiles={Object.keys(db.profiles)}
          currentProfile={activeProfile}
          onSwitchProfile={handleSwitchProfile}
          onCreateProfile={handleCreateProfile}
          onDeleteProfile={handleDeleteProfile}
        />
      )}
    </div>
  );
}
