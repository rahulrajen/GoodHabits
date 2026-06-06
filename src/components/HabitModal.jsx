import { useState } from 'react';
import { X, Trash2, Plus, Check } from 'lucide-react';

const EMOJI_OPTIONS = ['🏃', '📚', '💧', '🧘', '🥗', '💤', '🍎', '🤝', '💻', '🎸', '✏️', '🧹', '🚶', '🔋', '🌞'];
const CATEGORY_OPTIONS = ['Health', 'Mind', 'Fitness', 'Productivity', 'Social', 'Hobbies'];

export default function HabitModal({
  isOpen,
  onClose,
  habitToEdit,
  onSaveHabit,
  onDeleteHabit,
  dailyTarget,
  onSaveTarget
}) {
  const [text, setText] = useState(habitToEdit ? habitToEdit.text : '');
  const [points, setPoints] = useState(habitToEdit ? habitToEdit.points : 10);
  const [icon, setIcon] = useState(habitToEdit ? (habitToEdit.icon || '🏃') : '🏃');
  const [category, setCategory] = useState(habitToEdit ? (habitToEdit.category || 'Health') : 'Health');
  const [targetInput, setTargetInput] = useState(dailyTarget);
  
  // Tab within the modal: 'habit' or 'settings'
  const [activeTab, setActiveTab] = useState('habit');

  if (!isOpen) return null;

  const handleSubmitHabit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    onSaveHabit({
      id: habitToEdit ? habitToEdit.id : Date.now().toString(),
      text: text.trim(),
      points: parseInt(points, 10),
      icon,
      category
    });
    onClose();
  };

  const handleTargetSubmit = (e) => {
    e.preventDefault();
    const val = parseInt(targetInput, 10);
    if (val > 0) {
      onSaveTarget(val);
      onClose();
    }
  };

  return (
    <div className="modal-backdrop fade-in" onClick={onClose}>
      <div className="modal-content glass-card scale-up" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="modal-tabs">
          <button 
            className={`modal-tab ${activeTab === 'habit' ? 'active' : ''}`}
            onClick={() => setActiveTab('habit')}
          >
            {habitToEdit ? 'Edit Habit' : 'Add Habit'}
          </button>
          <button 
            className={`modal-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Daily Target Setting
          </button>
        </div>

        {activeTab === 'habit' ? (
          <form onSubmit={handleSubmitHabit} className="modal-form">
            <div className="form-group">
              <label htmlFor="habit-text">Habit Name</label>
              <input 
                type="text" 
                id="habit-text"
                placeholder="E.g. Read for 15 minutes, Floss teeth..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={40}
                required
                autoFocus
              />
            </div>

            <div className="form-row">
              <div className="form-group half">
                <label>Points Awarded</label>
                <div className="points-selector-wrapper">
                  <input 
                    type="range" 
                    min="1" 
                    max="30" 
                    value={points} 
                    onChange={(e) => setPoints(e.target.value)}
                    className="points-slider"
                  />
                  <span className="points-display-bubble">{points} pts</span>
                </div>
              </div>

              <div className="form-group half">
                <label htmlFor="habit-category">Category</label>
                <select 
                  id="habit-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORY_OPTIONS.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Choose Habit Icon</label>
              <div className="emoji-grid">
                {EMOJI_OPTIONS.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    className={`emoji-btn ${icon === emoji ? 'selected' : ''}`}
                    onClick={() => setIcon(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              {habitToEdit && (
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete "${habitToEdit.text}"?`)) {
                      onDeleteHabit(habitToEdit.id);
                      onClose();
                    }
                  }}
                >
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
              )}
              
              <button type="submit" className="btn-primary">
                {habitToEdit ? <Check size={16} /> : <Plus size={16} />}
                <span>{habitToEdit ? 'Save Changes' : 'Create Habit'}</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleTargetSubmit} className="modal-form">
            <div className="form-group">
              <label htmlFor="target-input">Daily Target Points</label>
              <p className="form-description">
                Adjust your daily score goal. Meeting or exceeding this will trigger the daily reward celebration.
              </p>
              <div className="target-input-wrapper">
                <input 
                  type="number" 
                  id="target-input"
                  min="5"
                  max="500"
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  required
                />
                <span className="pts-suffix">pts</span>
              </div>
            </div>

            <div className="modal-actions justify-end">
              <button type="submit" className="btn-primary width-full">
                <Check size={16} />
                <span>Save Daily Target</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
