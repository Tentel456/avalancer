import { useState, useEffect } from 'react';
import { getShortAddress } from '../../utils/web3';
import { signInWithMetaMask } from '../../services/authService';
import { getDiceBearUrl } from '../../utils/gravatar';
import './WalletModal.css';

const WalletModal = ({ isOpen, onClose, walletAddress, onComplete }) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [gravatarUrl, setGravatarUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (walletAddress) {
      // Generate avatar URL from wallet address using DiceBear
      setGravatarUrl(getDiceBearUrl(walletAddress, 200));
    }
  }, [walletAddress]);

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
      const { data, error: authError } = await signInWithMetaMask(
        walletAddress,
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
        id: data.profile.id,
        email: data.profile.email,
        fullName: data.profile.full_name,
        username: data.profile.username,
        walletAddress: data.profile.wallet_address,
        gravatarUrl: data.profile.avatar_url,
        authMethod: 'metamask'
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
    <div className="wallet-modal-overlay" onClick={onClose}>
      <div className="wallet-modal" onClick={(e) => e.stopPropagation()}>
        <button className="wallet-modal-close" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="wallet-modal-content">
          <div className="wallet-modal-header">
            <h2 className="wallet-modal-title">Complete Your Profile</h2>
            {error && <div className="error-message" style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fee', color: '#c33', borderRadius: '8px', fontSize: '0.9rem' }}>{error}</div>}
            <div className="wallet-info-box">
              <div className="wallet-info-left">
                <div className="wallet-info-text">
                  <span className="wallet-label">Wallet Address</span>
                  <span className="wallet-address">{getShortAddress(walletAddress)}</span>
                </div>
              </div>
              <div className="wallet-avatar">
                <img src={gravatarUrl} alt="Avatar" />
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="wallet-modal-form">
            <div className="wallet-form-group">
              <label htmlFor="fullName" className="wallet-form-label">
                Full Name
              </label>
              <input
                type="text"
                id="fullName"
                className="wallet-form-input"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="wallet-form-group">
              <label htmlFor="username" className="wallet-form-label">
                Username
              </label>
              <input
                type="text"
                id="username"
                className="wallet-form-input"
                placeholder="@username"
                value={username}
                onChange={handleUsernameChange}
                required
              />
              <span className="wallet-form-hint">
                Choose a unique username (letters, numbers, and underscores only)
              </span>
            </div>

            <button 
              type="submit" 
              className="wallet-modal-submit"
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

export default WalletModal;
