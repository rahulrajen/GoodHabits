import { Check, Edit2, GripVertical } from 'lucide-react';

export default function HabitCard({ habit, isCompleted, onToggle, onEdit }) {
  // Determine points color theme based on score weight
  const getPointsTheme = (pts) => {
    if (pts <= 5) return 'theme-low';
    if (pts <= 10) return 'theme-medium';
    return 'theme-high';
  };

  const ptsTheme = getPointsTheme(habit.points);

  const handleEditClick = (e) => {
    e.stopPropagation(); // Prevent toggling the habit state when clicking edit
    onEdit(habit);
  };

  return (
    <div 
      className={`habit-card glass-card ${isCompleted ? 'completed' : ''}`}
      onClick={onToggle}
    >
      <div className="habit-card-left">
        <div className="drag-handle-wrapper" onClick={(e) => e.stopPropagation()} title="Drag to rearrange">
          <GripVertical className="drag-handle-icon" size={16} />
        </div>
        <div className={`habit-checkbox ${isCompleted ? 'checked' : ''}`}>
          {isCompleted && <Check size={16} className="checkmark-icon" />}
        </div>
        <div className="habit-icon-wrapper">
          <span className="habit-emoji-icon">{habit.icon || '✨'}</span>
        </div>
        <div className="habit-details">
          <h3 className="habit-text">{habit.text}</h3>
          <span className="habit-category">{habit.category || 'General'}</span>
        </div>
      </div>

      <div className="habit-card-right">
        <span className={`points-badge ${ptsTheme}`}>
          +{habit.points} pts
        </span>
        <button 
          className="edit-habit-btn"
          onClick={handleEditClick}
          title="Edit Habit"
        >
          <Edit2 size={14} />
        </button>
      </div>
    </div>
  );
}
