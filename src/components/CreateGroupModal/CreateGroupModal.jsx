import { useState } from 'react';
import './CreateGroupModal.css';

const CreateGroupModal = ({ isOpen, onClose, onComplete }) => {
  const [groupName, setGroupName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleUsernameChange = (e) => {
    let value = e.target.value;
    if (value && !value.startsWith('@')) {
      value = '@' + value;
    }
    value = value.replace(/[^a-zA-Z0-9@_]/g, '');
    setUsername(value);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!groupName.trim() || !username.trim() || username === '@') {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setError('');
    
    try {
      const groupData = {
        name: groupName.trim(),
        username: username.trim(),
        avatar: avatarPreview || '/assets/chats/Channel.svg',
        isPrivate: isPrivate,
        inviteLink: isPrivate ? `https://avalancer.app/invite/${Math.random().toString(36).substr(2, 9)}` : null,
        createdAt: new Date().toISOString()
      };

      if (onComplete) {
        onComplete(groupData);
      }
      
      // Reset form
      setGroupName('');
      setUsername('');
      setAvatarFile(null);
      setAvatarPreview('');
      setIsPrivate(false);
    } catch (error) {
      console.error('Error creating group:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="create-group-modal-overlay" onClick={onClose}>
      <div className="create-group-modal" onClick={(e) => e.stopPropagation()}>
        <button className="create-group-modal-close" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="create-group-modal-content">
          <div className="create-group-modal-header">
            <h2 className="create-group-modal-title">Create Group</h2>
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="create-group-modal-form">
            <div className="avatar-upload-section">
              <div className="avatar-preview">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Group avatar" />
                ) : (
                  <div className="avatar-placeholder">
                    <i className="ph-image"></i>
                  </div>
                )}
              </div>
              <label htmlFor="avatar-upload" className="avatar-upload-button">
                <i className="ph-camera"></i>
                <span>Upload Avatar</span>
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            <div className="create-group-form-group">
              <label htmlFor="groupName" className="create-group-form-label">
                Group Name *
              </label>
              <input
                type="text"
                id="groupName"
                className="create-group-form-input"
                placeholder="Enter group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="create-group-form-group">
              <label htmlFor="username" className="create-group-form-label">
                Username *
              </label>
              <input
                type="text"
                id="username"
                className="create-group-form-input"
                placeholder="@groupusername"
                value={username}
                onChange={handleUsernameChange}
                required
              />
              <span className="create-group-form-hint">
                Unique identifier for your group
              </span>
            </div>

            <div className="create-group-form-group">
              <label className="privacy-toggle">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                />
                <span className="privacy-toggle-label">
                  <strong>Private Group</strong>
                  <small>Only members with invite link can join</small>
                </span>
              </label>
            </div>

            <button 
              type="submit" 
              className="create-group-modal-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Group...' : 'Create Group'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;
