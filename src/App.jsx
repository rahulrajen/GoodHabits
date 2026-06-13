import { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import {
  DEFAULT_HABITS,
  checkProfileStreak,
  fetchServerDb,
  saveServerDb,
  loadInitialDbFromLocalStorage,
  saveDbToLocalStorage,
  getGithubConfig,
  saveGithubConfigOverride,
  fetchGithubDb,
  saveGithubDb
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

  // GitHub Sync States
  const [isUsingGithub, setIsUsingGithub] = useState(false);
  const [githubConfig, setGithubConfigState] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const dbShaRef = useRef(null);

  // Drag and drop long-press states
  const [draggableIndex, setDraggableIndex] = useState(null);
  const pressTimerRef = useRef(null);
  const isLongPressActiveRef = useRef(false);
  const touchDragStartedRef = useRef(false);
  const startTouchYRef = useRef(0);

  // Initialize DB asynchronously
  useEffect(() => {
    const initDb = async () => {
      const gitConfig = getGithubConfig();
      setGithubConfigState(gitConfig);

      let loadedDb = null;
      let loadedSha = null;
      let usingGit = false;

      // 1. Try loading from GitHub if credentials exist
      if (gitConfig) {
        setIsSyncing(true);
        try {
          const res = await fetchGithubDb(gitConfig);
          loadedDb = res.db;
          loadedSha = res.sha;
          dbShaRef.current = res.sha;
          usingGit = true;
          setIsUsingGithub(true);
          setSyncError(null);
        } catch (err) {
          console.error("Failed to load from GitHub, falling back to local:", err.message);
          setSyncError(`GitHub Sync failed: ${err.message}`);
        } finally {
          setIsSyncing(false);
        }
      }

      // 2. If GitHub config was not active or failed, check local storage/server fallback
      if (!loadedDb) {
        const localData = localStorage.getItem('good_habits_db');
        if (localData) {
          loadedDb = loadInitialDbFromLocalStorage();
          setIsUsingServer(false);
        } else {
          const serverResult = await fetchServerDb();
          if (serverResult) {
            loadedDb = serverResult.db;
            setIsUsingServer(serverResult.isWritable);
            if (!serverResult.isWritable) {
              saveDbToLocalStorage(loadedDb);
            }
          } else {
            loadedDb = loadInitialDbFromLocalStorage();
            setIsUsingServer(false);
          }
        }
      }

      // Ensure profile consistency
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
      
      // Update local storage backup/cache
      saveDbToLocalStorage(loadedDb);
      
      // If we are connected to GitHub, and local Vite dev server is running,
      // let's also POST the retrieved DB to the server to update the local db.json file
      if (usingGit) {
        try {
          await saveServerDb(loadedDb);
        } catch (e) {
          // ignore
        }
      }

      setDb(loadedDb);
    };
    initDb();
  }, []);

  // Save DB when changed
  useEffect(() => {
    if (!db) return;
    
    // Always backup to localStorage
    saveDbToLocalStorage(db);

    const saveChanges = async () => {
      // Save to local Vite dev server if running
      if (isUsingServer) {
        await saveServerDb(db);
      }

      // Save to GitHub if active
      if (isUsingGithub) {
        const gitConfig = getGithubConfig();
        if (gitConfig) {
          try {
            const newSha = await saveGithubDb(gitConfig, db, dbShaRef.current);
            dbShaRef.current = newSha;
            setSyncError(null);
          } catch (err) {
            console.error("Failed to sync to GitHub:", err.message);
            setSyncError(`GitHub Sync failed: ${err.message}`);
          }
        }
      }
    };
    saveChanges();
  }, [db, isUsingServer, isUsingGithub]);

  // Automatic sync-on-focus / visibility change
  useEffect(() => {
    if (!isUsingGithub) return;

    const handleFocusSync = async () => {
      const gitConfig = getGithubConfig();
      if (!gitConfig || isSyncing) return;

      setIsSyncing(true);
      try {
        const res = await fetchGithubDb(gitConfig);
        // Compare with stringified local state to avoid unnecessary redraws
        const localStr = JSON.stringify(db);
        const remoteStr = JSON.stringify(res.db);
        
        if (localStr !== remoteStr) {
          const current = res.db.currentProfile || 'default';
          res.db.profiles[current] = checkProfileStreak(res.db.profiles[current]);
          
          setDb(res.db);
          dbShaRef.current = res.sha;
          saveDbToLocalStorage(res.db);
          
          if (isUsingServer) {
            await saveServerDb(res.db);
          }
        }
        setSyncError(null);
      } catch (err) {
        console.warn("Auto-sync failed on focus:", err.message);
      } finally {
        setIsSyncing(false);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleFocusSync();
      }
    };

    window.addEventListener('focus', handleFocusSync);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocusSync);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isUsingGithub, db, isUsingServer, isSyncing]);

  // Handle celebration timeout
  useEffect(() => {
    if (celebrate) {
      const timer = setTimeout(() => {
        setCelebrate(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [celebrate]);

  // GitHub sync details saver
  const handleSaveGithubOverride = (overrideConfig) => {
    saveGithubConfigOverride(overrideConfig);
    window.location.reload();
  };

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

  // Touch/Mouse event handlers for drag-and-drop
  const clearLongPressTimer = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const handleMouseDown = (e, index) => {
    if (e.target.closest('button') || e.target.closest('select') || e.target.closest('.habit-checkbox') || e.target.closest('.edit-habit-btn')) {
      return;
    }
    clearLongPressTimer();
    isLongPressActiveRef.current = false;
    
    pressTimerRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      setDraggableIndex(index);
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(40);
      }
    }, 350);
  };

  const handleMouseUp = (e, habitId) => {
    clearLongPressTimer();
    if (!isLongPressActiveRef.current && !e.target.closest('button') && !e.target.closest('.edit-habit-btn')) {
      // only toggle if we didn't trigger long press and not clicking buttons
      handleToggleHabit(habitId);
    }
    setDraggableIndex(null);
  };

  const handleMouseLeave = () => {
    clearLongPressTimer();
    setDraggableIndex(null);
  };

  const handleTouchStart = (e, index) => {
    if (e.target.closest('button') || e.target.closest('select') || e.target.closest('.habit-checkbox') || e.target.closest('.edit-habit-btn')) {
      return;
    }
    clearLongPressTimer();
    isLongPressActiveRef.current = false;
    touchDragStartedRef.current = false;
    startTouchYRef.current = e.touches[0].pageY;

    pressTimerRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      touchDragStartedRef.current = true;
      setDraggedIndex(index);
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(40);
      }
    }, 350);
  };

  const handleTouchMove = (e) => {
    if (touchDragStartedRef.current) {
      e.preventDefault(); // Prevent scrolling during drag
      const touch = e.touches[0];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const wrapper = element?.closest('.draggable-wrapper');
      
      if (wrapper) {
        const overIndex = parseInt(wrapper.getAttribute('data-index'), 10);
        if (!isNaN(overIndex) && overIndex !== draggedIndex) {
          setDragOverIndex(overIndex);
        }
      }
    } else {
      const touch = e.touches[0];
      if (Math.abs(touch.pageY - startTouchYRef.current) > 10) {
        clearLongPressTimer();
      }
    }
  };

  const handleTouchEnd = (e, habitId) => {
    clearLongPressTimer();
    if (touchDragStartedRef.current) {
      if (dragOverIndex !== null && dragOverIndex !== draggedIndex) {
        handleDrop(null, dragOverIndex);
      } else {
        setDraggedIndex(null);
        setDragOverIndex(null);
      }
      touchDragStartedRef.current = false;
    } else if (!isLongPressActiveRef.current && !e.target.closest('button') && !e.target.closest('.edit-habit-btn')) {
      handleToggleHabit(habitId);
    }
  };

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
    setDraggableIndex(null);
  };

  const handleDrop = (e, targetIndex) => {
    if (e) e.preventDefault();
    const sourceIndex = e ? parseInt(e.dataTransfer.getData('text/plain'), 10) : draggedIndex;
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDraggableIndex(null);

    if (sourceIndex === targetIndex || isNaN(sourceIndex) || sourceIndex === null || targetIndex === null) return;

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
              <p className="section-subtitle">Press & hold cards to drag and rearrange. Tap cards to toggle status.</p>
            </div>

            {syncError && (
              <div className="sync-error-banner glass-card">
                <span>⚠️ {syncError}</span>
              </div>
            )}

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
                    data-index={index}
                    draggable={draggableIndex === index}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDrop(e, index)}
                    onMouseDown={(e) => handleMouseDown(e, index)}
                    onMouseUp={(e) => handleMouseUp(e, habit.id)}
                    onMouseLeave={handleMouseLeave}
                    onTouchStart={(e) => handleTouchStart(e, index)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={(e) => handleTouchEnd(e, habit.id)}
                    className={`draggable-wrapper ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''} ${draggableIndex === index ? 'ready-to-drag' : ''}`}
                  >
                    <HabitCard
                      habit={habit}
                      isCompleted={todayLoggedHabits.includes(habit.id)}
                      onToggle={null} // Toggling handled by mouse/touch long press handlers on the wrapper
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
          isUsingGithub={isUsingGithub}
          syncError={syncError}
          githubConfig={githubConfig}
          onSaveGithubOverride={handleSaveGithubOverride}
        />
      )}
    </div>
  );
}
