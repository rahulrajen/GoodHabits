import { Flame, Trophy, BarChart3, Settings, Calendar } from 'lucide-react';

export default function ProgressHeader({
  dailyScore,
  dailyTarget,
  streak,
  onOpenManage,
  currentView,
  setView
}) {
  const percentage = Math.min(Math.round((dailyScore / dailyTarget) * 100), 100) || 0;
  const isGoalMet = dailyScore >= dailyTarget;

  // Format today's date
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  return (
    <header className="progress-header glass-card">
      <div className="header-top">
        <div className="date-badge">
          <Calendar className="date-icon" size={16} />
          <span>{dateStr}</span>
        </div>
        
        <div className="streak-container flex-center">
          <Flame className={`streak-icon ${streak > 0 ? 'active' : ''}`} size={20} />
          <span className="streak-count">{streak} Day Streak</span>
        </div>

        <div className="header-actions">
          <button 
            className={`action-btn icon-only-btn ${currentView === 'analytics' ? 'active' : ''}`} 
            onClick={() => setView(currentView === 'analytics' ? 'dashboard' : 'analytics')}
            title="Toggle Analytics"
          >
            <BarChart3 size={18} />
          </button>
          <button 
            className="action-btn icon-only-btn" 
            onClick={onOpenManage}
            title="Manage Habits"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      <div className="progress-section">
        <div className="score-label-row">
          <span className="progress-title">Daily Progress</span>
          <span className={`score-value ${isGoalMet ? 'target-met-text' : ''}`}>
            {dailyScore} <span className="score-divider">/</span> {dailyTarget} pts
          </span>
        </div>

        <div className={`progress-bar-container ${isGoalMet ? 'target-met-glow' : ''}`}>
          <div 
            className={`progress-fill ${isGoalMet ? 'completed' : ''}`}
            style={{ width: `${percentage}%` }}
          />
          <span className="progress-percentage-label">{percentage}%</span>
        </div>

        {isGoalMet && (
          <div className="target-reached-badge pop-in">
            <Trophy size={14} className="trophy-icon" />
            <span>Target Met! Keep it up!</span>
          </div>
        )}
      </div>
    </header>
  );
}
