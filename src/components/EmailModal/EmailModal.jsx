import { useState, useEffect } from 'react';
import { signUpWithEmail } from '../../services/authService';
import { getDiceBearUrl } from '../../utils/gravatar';
import './EmailModal.css';

const EmailModal = ({ isOpen, onClose, email, password, onComplete }) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [gravatarUrl, setGravatarUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (email) {
      // Generate avatar URL from email using DiceBear
      setGravatarUrl(getDiceBearUrl(email, 200));
    }
  }, [email]);

  const handleUsernameChange = (e) => {
    let value = e.target.value;
    // Auto-add @ if not present
    if (value && !value.startsWith('@')) {
      value = '@' + value;
    }
    // Remove spaces and special characters except @
    value = value.replace(/[^a-zA-Z0-9@_]/g, '');
    setUsername(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!fullName.trim() || !username.trim() || username === '@') {
      setError('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    setError('');
    
    try {
      const cleanUsername = username.trim();
      const { data, error: authError } = await signUpWithEmail(
        email,
        password,
        fullName.trim(),
        cleanUsername
      );

      if (authError) {
        setError(authError.message);
        setIsSubmitting(false);
        return;
      }

      // Save to localStorage
      const userData = {
        id: data.user.id,
        email: email,
        fullName: fullName.trim(),
        username: cleanUsername,
        gravatarUrl: getDiceBearUrl(email, 200),
        authMethod: 'email'
      };
      
      localStorage.setItem('userData', JSON.stringify(userData));
      
      if (onComplete) {
        onComplete(userData);
      }
    } catch (error) {
      console.error('Error completing registration:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="email-modal-overlay" onClick={onClose}>
      <div className="email-modal" onClick={(e) => e.stopPropagation()}>
        <button className="email-modal-close" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="email-modal-content">
          <div className="email-modal-header">
            <h2 className="email-modal-title">Complete Your Profile</h2>
            {error && <div className="error-message" style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fee', color: '#c33', borderRadius: '8px', fontSize: '0.9rem' }}>{error}</div>}
            <div className="email-info-box">
              <div className="email-info-left">
                <div className="email-info-text">
                  <span className="email-label">Email Address</span>
                  <span className="email-address">{email}</span>
                </div>
              </div>
              <div className="email-avatar">
                <img src={gravatarUrl || getDiceBearUrl(email || 'default', 200)} alt="Avatar" />
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="email-modal-form">
            <div className="email-form-group">
              <label htmlFor="fullName" className="email-form-label">
                Full Name
              </label>
              <input
                type="text"
                id="fullName"
                className="email-form-input"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="email-form-group">
              <label htmlFor="username" className="email-form-label">
                Username
              </label>
              <input
                type="text"
                id="username"
                className="email-form-input"
                placeholder="@username"
                value={username}
                onChange={handleUsernameChange}
                required
              />
              <span className="email-form-hint">
                Choose a unique username (letters, numbers, and underscores only)
              </span>
            </div>

            <button 
              type="submit" 
              className="email-modal-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Account...' : 'Complete Registration'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EmailModal;
