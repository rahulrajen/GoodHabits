import { useState } from 'react';
import { X, Trash2, Plus, Check } from 'lucide-react';

const EMOJI_OPTIONS = [
  '💧', '🥗', '🍎', '🦷', '💊', '🧘', '💤', '🔋',
  '🏃', '💪', '🚴', '🚶', '🏊', '🤸', '👟',
  '📚', '✏️', '🧠', '🎯', '💻', '💼', '📈', '📝', '⏳',
  '🎨', '🎸', '📷', '🌱', '🍳', '🧩', '🎮',
  '🧹', '🤝', '📞', '❤️', '🐾', '🌞', '🌙', '☕'
];
const CATEGORY_OPTIONS = ['Health', 'Mind', 'Fitness', 'Productivity', 'Social', 'Hobbies'];

export default function HabitModal({
  isOpen,
  onClose,
  habitToEdit,
  onSaveHabit,
  onDeleteHabit,
  dailyTarget,
  onSaveTarget,
  profiles = ['default'],
  currentProfile = 'default',
  onSwitchProfile,
  onCreateProfile,
  onDeleteProfile,
  isUsingGithub,
  syncError,
  githubConfig,
  onSaveGithubOverride
}) {
  const [text, setText] = useState(habitToEdit ? habitToEdit.text : '');
  const [points, setPoints] = useState(habitToEdit ? habitToEdit.points : 10);
  const [icon, setIcon] = useState(habitToEdit ? (habitToEdit.icon || '🏃') : '🏃');
  const [category, setCategory] = useState(habitToEdit ? (habitToEdit.category || 'Health') : 'Health');
  const [targetInput, setTargetInput] = useState(dailyTarget);
  const [newProfileName, setNewProfileName] = useState('');
  
  // Tab within the modal: 'habit', 'settings', or 'profiles'
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
          <button 
            className={`modal-tab ${activeTab === 'profiles' ? 'active' : ''}`}
            onClick={() => setActiveTab('profiles')}
          >
            Manage Profiles
          </button>
          <button 
            className={`modal-tab ${activeTab === 'github' ? 'active' : ''}`}
            onClick={() => setActiveTab('github')}
          >
            GitHub Sync
          </button>
        </div>

        {activeTab === 'habit' && (
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
        )}

        {activeTab === 'settings' && (
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

        {activeTab === 'profiles' && (
          <div className="modal-form">
            <div className="form-group">
              <label>Switch Active Profile</label>
              <select
                value={currentProfile}
                onChange={(e) => onSwitchProfile && onSwitchProfile(e.target.value)}
              >
                {profiles.map(name => (
                  <option key={name} value={name}>
                    {name.charAt(0).toUpperCase() + name.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (newProfileName.trim() && onCreateProfile) {
                  onCreateProfile(newProfileName.trim());
                  setNewProfileName('');
                }
              }} 
              className="form-group"
            >
              <label htmlFor="new-profile-name">Create New Profile</label>
              <div className="profile-create-row">
                <input
                  type="text"
                  id="new-profile-name"
                  placeholder="E.g. Work, Personal, Sports..."
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  maxLength={20}
                  required
                />
                <button type="submit" className="btn-primary">
                  <Plus size={16} />
                  <span>Create</span>
                </button>
              </div>
            </form>

            {currentProfile !== 'default' && (
              <div className="form-group delete-profile-section">
                <label>Danger Zone</label>
                <p className="form-description">
                  Deleting this profile wipes all its habits, streaks, and completion history permanently.
                </p>
                <button
                  type="button"
                  className="btn-danger width-full"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to permanently delete the profile "${currentProfile}"?`)) {
                      onDeleteProfile && onDeleteProfile(currentProfile);
                    }
                  }}
                >
                  <Trash2 size={16} />
                  <span>Delete Profile: {currentProfile.charAt(0).toUpperCase() + currentProfile.slice(1)}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'github' && (
          <div className="modal-form">
            <div className="form-group">
              <label>Sync Status</label>
              <div className={`sync-status-indicator ${isUsingGithub ? 'connected' : 'offline'}`}>
                {isUsingGithub ? '✓ Connected to GitHub Cloud' : '⚠ Local Storage Only (Offline)'}
              </div>
              {syncError && <p className="sync-error-text" style={{ color: 'var(--accent-rose)', fontSize: '13px', marginTop: '6px' }}>{syncError}</p>}
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const owner = e.target.owner.value.trim();
                const repo = e.target.repo.value.trim();
                const branch = e.target.branch.value.trim();
                const path = e.target.path.value.trim();
                const token = e.target.token.value.trim();
                onSaveGithubOverride({ owner, repo, branch, path, token });
              }}
              className="modal-form"
            >
              <div className="form-group">
                <label htmlFor="sync-owner">GitHub Owner (Username)</label>
                <input 
                  type="text" 
                  id="sync-owner"
                  name="owner"
                  defaultValue={githubConfig ? githubConfig.owner : ''}
                  placeholder="e.g. rahulrajen"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="sync-repo">Repository Name</label>
                <input 
                  type="text" 
                  id="sync-repo"
                  name="repo"
                  defaultValue={githubConfig ? githubConfig.repo : ''}
                  placeholder="e.g. GoodHabits"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label htmlFor="sync-branch">Branch</label>
                  <input 
                    type="text" 
                    id="sync-branch"
                    name="branch"
                    defaultValue={githubConfig ? githubConfig.branch : 'main'}
                    placeholder="e.g. main"
                    required
                  />
                </div>
                <div className="form-group half">
                  <label htmlFor="sync-path">File Path</label>
                  <input 
                    type="text" 
                    id="sync-path"
                    name="path"
                    defaultValue={githubConfig ? githubConfig.path : 'db.json'}
                    placeholder="e.g. db.json"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="sync-token">Personal Access Token (PAT)</label>
                <p className="form-description">
                  Create a token with <code>repo</code> write permission. You can paste a Base64-encoded token here to prevent auto-revocation if your repo is public.
                </p>
                <input 
                  type="password" 
                  id="sync-token"
                  name="token"
                  defaultValue={githubConfig ? githubConfig.token : ''}
                  placeholder="ghp_... or Base64 string"
                  required
                />
              </div>

              <div className="modal-actions justify-end">
                {githubConfig && (
                  <button 
                    type="button" 
                    className="btn-danger"
                    onClick={() => {
                      if (window.confirm("Disconnect GitHub Sync? This resets storage to local network/localStorage.")) {
                        onSaveGithubOverride(null);
                      }
                    }}
                  >
                    Disconnect
                  </button>
                )}
                <button type="submit" className="btn-primary">
                  Save & Connect
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
