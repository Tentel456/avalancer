import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { connectWallet, getShortAddress } from '../../utils/web3';
import { signInWithGoogle } from '../../services/authService';
import WalletModal from '../../components/WalletModal/WalletModal';
import EmailModal from '../../components/EmailModal/EmailModal';
import './Register.css';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Open modal to complete profile
    setShowEmailModal(true);
  };

  const handleGoogleSignIn = async () => {
    setError('');
    const { error: googleError } = await signInWithGoogle();
    
    if (googleError) {
      setError(googleError.message);
    }
  };

  const handleWalletConnect = async () => {
    setIsConnecting(true);
    try {
      const wallet = await connectWallet();
      if (wallet) {
        setWalletAddress(wallet.address);
        console.log('Wallet connected:', wallet.address);
        // Open modal for completing profile
        setShowWalletModal(true);
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleModalComplete = async (userData) => {
    console.log('Registration completed:', userData);
    setShowWalletModal(false);
    navigate('/dashboard');
  };

  const handleEmailModalComplete = async (userData) => {
    console.log('Email registration completed:', userData);
    setShowEmailModal(false);
    navigate('/dashboard');
  };

  return (
    <div className="register-page">
      <div className="register-header">
        <Link to="/" className="register-logo">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 300 300" fill="none">
            <path d="M150 0C67.4089 0 0 67.409 0 150C0 232.591 67.4089 300 150 300C232.591 300 300 232.591 300 150C300 67.409 232.591 0 150 0ZM41.9028 150C41.9028 119.028 55.2631 90.4859 76.5182 71.0527C85.0202 63.158 99.5951 65.587 105.668 75.9109L143.32 140.891C146.964 146.964 146.964 154.251 143.32 160.324L105.668 225.304C99.5951 236.235 85.0202 238.057 75.9109 229.555C55.2632 208.907 41.9028 180.972 41.9028 150ZM194.332 224.089L156.68 159.109C153.036 153.037 153.036 145.749 156.68 139.676L194.332 74.6963C200.405 64.3724 214.372 61.9433 223.482 69.8381C244.737 89.2713 258.097 117.814 258.097 148.785C258.097 179.757 244.737 208.3 223.482 227.733C214.372 237.449 200.405 235.02 194.332 224.089Z" fill="currentColor"/>
          </svg>
        </Link>
        <button className="register-menu-button">
          Menu
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M7.33333 16L7.33333 -3.2055e-07L8.66667 -3.78832e-07L8.66667 16L7.33333 16Z" fill="currentColor"></path>
            <path d="M16 8.66667L-2.62269e-07 8.66667L-3.78832e-07 7.33333L16 7.33333L16 8.66667Z" fill="currentColor"></path>
          </svg>
        </button>
      </div>
      <div className="register-container">
        <div className="register-left">
          <div className="register-form-wrapper">
            <h1 className="register-title">Welcome!</h1>
            <p className="register-subtitle">Enter your Credentials to access your account</p>

            {error && <div className="error-message">{error}</div>}

            {showEmailForm ? (
            <form onSubmit={handleSubmit} className="register-form">
              <div className="form-group">
                <label htmlFor="email" className="form-label">Email address</label>
                <input
                  type="email"
                  id="email"
                  className="form-input"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <div className="form-label-row">
                  <label htmlFor="password" className="form-label">Password</label>
                  <a href="#" className="forgot-password">forgot password?</a>
                </div>
                <input
                  type="password"
                  id="password"
                  className="form-input"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-checkbox">
                <input
                  type="checkbox"
                  id="remember"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <label htmlFor="remember">Remember for 30 days</label>
              </div>

              <button type="submit" className="register-button" disabled={isLoading}>
                {isLoading ? 'Creating Account...' : 'Register'}
              </button>
            </form>
            ) : (
              <button 
                className="register-button" 
                onClick={() => setShowEmailForm(true)}
                style={{ marginTop: '2rem' }}
              >
                Register with Email
              </button>
            )}

            <div className="divider">
              <span>Or</span>
            </div>

            <div className="social-buttons">
              <button 
                type="button"
                className="social-button google"
                onClick={handleGoogleSignIn}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M19.8 10.2273C19.8 9.51819 19.7364 8.83637 19.6182 8.18182H10.2V12.05H15.5818C15.3273 13.3 14.5636 14.3591 13.4182 15.0682V17.5773H16.7364C18.7091 15.7682 19.8 13.2318 19.8 10.2273Z" fill="#4285F4"/>
                  <path d="M10.2 20C12.9 20 15.1727 19.1045 16.7364 17.5773L13.4182 15.0682C12.4636 15.6682 11.2455 16.0227 10.2 16.0227C7.59091 16.0227 5.37273 14.2 4.52727 11.8H1.11364V14.3909C2.66818 17.4909 6.20909 20 10.2 20Z" fill="#34A853"/>
                  <path d="M4.52727 11.8C4.30909 11.2 4.18182 10.5545 4.18182 9.88636C4.18182 9.21818 4.30909 8.57273 4.52727 7.97273V5.38182H1.11364C0.418182 6.76364 0 8.28182 0 9.88636C0 11.4909 0.418182 13.0091 1.11364 14.3909L4.52727 11.8Z" fill="#FBBC05"/>
                  <path d="M10.2 3.75C11.3545 3.75 12.3818 4.14545 13.1909 4.92273L16.1364 1.97727C15.1682 1.08182 12.9 0 10.2 0C6.20909 0 2.66818 2.50909 1.11364 5.38182L4.52727 7.97273C5.37273 5.6 7.59091 3.75 10.2 3.75Z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </button>
              <button 
                type="button" 
                className="social-button ethereum"
                onClick={handleWalletConnect}
                disabled={isConnecting}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 0L9.85 0.51V13.68L10 13.83L15.5 10.54L10 0Z" fill="#343434"/>
                  <path d="M10 0L4.5 10.54L10 13.83V7.4V0Z" fill="#8C8C8C"/>
                  <path d="M10 14.98L9.91 15.09V19.45L10 19.68L15.5 11.7L10 14.98Z" fill="#3C3C3B"/>
                  <path d="M10 19.68V14.98L4.5 11.7L10 19.68Z" fill="#8C8C8C"/>
                  <path d="M10 13.83L15.5 10.54L10 7.4V13.83Z" fill="#141414"/>
                  <path d="M4.5 10.54L10 13.83V7.4L4.5 10.54Z" fill="#393939"/>
                </svg>
                {isConnecting 
                  ? 'Connecting...' 
                  : walletAddress 
                    ? `Connected: ${getShortAddress(walletAddress)}`
                    : 'Sign in with MetaMask'
                }
              </button>
            </div>

            <p className="login-link">
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </div>
        </div>

        <div className="register-right">
          <img 
            src="/assets/register.png" 
            alt="Autonomous AI Layer" 
            className="register-image"
          />
        </div>
      </div>

      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        walletAddress={walletAddress}
        onComplete={handleModalComplete}
      />

      <EmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        email={email}
        password={password}
        onComplete={handleEmailModalComplete}
      />
    </div>
  );
};

export default Register;
