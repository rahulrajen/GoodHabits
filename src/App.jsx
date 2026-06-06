import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import {
  loadInitialAppState,
  saveAppState
} from './utils/storage';
import ProgressHeader from './components/ProgressHeader';
import HabitCard from './components/HabitCard';
import HabitModal from './components/HabitModal';
import AnalyticsView from './components/AnalyticsView';
import Celebration from './components/Celebration';
import './App.css';

export default function App() {
  const [state, setState] = useState(() => loadInitialAppState());
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState(null);
  const [currentView, setView] = useState('dashboard');
  const [celebrate, setCelebrate] = useState(false);

  // Sync state to local storage when state changes
  useEffect(() => {
    if (state) {
      saveAppState(state);
    }
  }, [state]);

  // Handle celebration timeout
  useEffect(() => {
    if (celebrate) {
      const timer = setTimeout(() => {
        setCelebrate(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [celebrate]);

  if (!state) {
    return (
      <div className="app-loading flex-center">
        <div className="loader"></div>
      </div>
    );
  }

  const { habits, dailyTarget, history, streak, todayStr } = state;

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

    // Check if target has just been met in this toggle action
    const crossedTargetMet = prevScore < dailyTarget && newScore >= dailyTarget;

    // Recalculate streak
    let newStreak;
    let newLastActive = state.lastActive;

    // Check yesterday's date
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
      // If today is now met:
      // If we met yesterday, streak = yesterday's streak + 1. Otherwise streak = 1
      if (metYesterday) {
        // Find yesterday's streak or default to max of current streak - 1
        newStreak = Math.max(1, streak); // Ensure streak is active
      } else {
        newStreak = 1;
      }
      
      // If we just crossed the line, trigger celebration particles!
      if (crossedTargetMet) {
        setCelebrate(true);
      }
    } else {
      // If today is now unmet:
      // If yesterday was met, streak resets to yesterday's streak (which is newStreak - 1, or we just fallback to yesterday's streak)
      if (metYesterday) {
        newStreak = Math.max(0, streak - 1);
      } else {
        newStreak = 0;
      }
    }

    setState({
      ...state,
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

    setState({
      ...state,
      habits: updatedHabits
    });
  };

  // Delete habit
  const handleDeleteHabit = (habitId) => {
    const updatedHabits = habits.filter(h => h.id !== habitId);
    
    // Clean up from today's active logs if logged
    const cleanHistory = { ...history };
    Object.keys(cleanHistory).forEach(date => {
      cleanHistory[date] = {
        ...cleanHistory[date],
        loggedHabits: cleanHistory[date].loggedHabits.filter(id => id !== habitId)
      };
    });

    setState({
      ...state,
      habits: updatedHabits,
      history: cleanHistory
    });
  };

  // Set new daily target score
  const handleSaveTarget = (newTarget) => {
    // Check if new target makes today's score cross the goal threshold
    const goalMetWithNewTarget = todayScore >= newTarget;
    const goalWasMetBefore = todayScore >= dailyTarget;
    
    let newStreak = streak;
    if (goalMetWithNewTarget && !goalWasMetBefore) {
      setCelebrate(true);
      newStreak = Math.max(1, streak);
    } else if (!goalMetWithNewTarget && goalWasMetBefore) {
      newStreak = Math.max(0, streak - 1);
    }

    setState({
      ...state,
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
        />

        {currentView === 'dashboard' ? (
          <main className="dashboard-view fade-in">
            <div className="section-header">
              <h2 className="section-title">Today's Habits</h2>
              <p className="section-subtitle">Tap a card to mark it complete</p>
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
                habits.map(habit => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    isCompleted={todayLoggedHabits.includes(habit.id)}
                    onToggle={() => handleToggleHabit(habit.id)}
                    onEdit={handleOpenEdit}
                  />
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
        />
      )}
    </div>
  );
}
