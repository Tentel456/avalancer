import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, updateProfile, signOut, disconnectWallet } from '../../services/authService';
import './Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
  });

  useEffect(() => {
    loadUser();
  }, [navigate]);

  const loadUser = async () => {
    // Try localStorage first
    const storedUser = localStorage.getItem('userData');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserData(user);
      setFormData({
        fullName: user.fullName,
        username: user.username,
        email: user.email || '',
      });
      setIsLoading(false);
      return;
    }

    // Try Supabase session
    const { data, error } = await getCurrentUser();
    if (error || !data || !data.profile) {
      console.error('Failed to load user:', error);
      navigate('/');
      return;
    }

    const userData = {
      id: data.isMetaMask ? data.profile.id : data.user.id,
      email: data.profile.email || '',
      fullName: data.profile.full_name,
      username: data.profile.username,
      walletAddress: data.profile.wallet_address,
      gravatarUrl: data.profile.avatar_url,
      authMethod: data.profile.auth_method
    };

    localStorage.setItem('userData', JSON.stringify(userData));
    setUserData(userData);
    setFormData({
      fullName: userData.fullName,
      username: userData.username,
      email: userData.email || '',
    });
    setIsLoading(false);
  };

  const handleLogout = async () => {
    await signOut();
    localStorage.removeItem('userData');
    navigate('/');
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      const { data, error } = await updateProfile(userData.id, {
        full_name: formData.fullName,
        username: formData.username,
        email: formData.email,
      });

      if (error) {
        alert('Error updating profile: ' + error.message);
        setIsSaving(false);
        return;
      }

      const updatedUser = {
        ...userData,
        fullName: formData.fullName,
        username: formData.username,
        email: formData.email,
      };
      
      localStorage.setItem('userData', JSON.stringify(updatedUser));
      setUserData(updatedUser);
      setIsEditing(false);
    } catch (err) {
      alert('Error updating profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      fullName: userData.fullName,
      username: userData.username,
      email: userData.email || '',
    });
    setIsEditing(false);
  };

  if (isLoading || !userData) {
    return null;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-logo">
          <div className="logo">
            <span className="logo-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 300 300" fill="none">
                <path d="M150 0C67.4089 0 0 67.409 0 150C0 232.591 67.4089 300 150 300C232.591 300 300 232.591 300 150C300 67.409 232.591 0 150 0ZM41.9028 150C41.9028 119.028 55.2631 90.4859 76.5182 71.0527C85.0202 63.158 99.5951 65.587 105.668 75.9109L143.32 140.891C146.964 146.964 146.964 154.251 143.32 160.324L105.668 225.304C99.5951 236.235 85.0202 238.057 75.9109 229.555C55.2632 208.907 41.9028 180.972 41.9028 150ZM194.332 224.089L156.68 159.109C153.036 153.037 153.036 145.749 156.68 139.676L194.332 74.6963C200.405 64.3724 214.372 61.9433 223.482 69.8381C244.737 89.2713 258.097 117.814 258.097 148.785C258.097 179.757 244.737 208.3 223.482 227.733C214.372 237.449 200.405 235.02 194.332 224.089Z" fill="currentColor"/>
              </svg>
            </span>
          </div>
        </div>
        <div className="app-header-navigation">
          <div className="tabs">
            <a href="#" onClick={() => navigate('/dashboard')}>Overview</a>
            <a href="#">Payments</a>
            <a href="#">Cards</a>
            <a href="#" className="active">Account</a>
            <a href="#">System</a>
          </div>
        </div>
        <div className="app-header-actions">
          <button className="user-profile">
            <span>{userData.fullName}</span>
            <span>
              <img src={userData.gravatarUrl} alt="Avatar" />
            </span>
          </button>
          <div className="app-header-actions-buttons">
            <button className="icon-button large" onClick={handleLogout}>
              <i className="ph-sign-out"></i>
            </button>
          </div>
        </div>
        <div className="app-header-mobile">
          <button className="icon-button large">
            <i className="ph-list"></i>
          </button>
        </div>
      </header>

      <div className="app-body">
        <div className="app-body-navigation">
          <nav className="navigation">
            <a href="#" onClick={() => navigate('/dashboard')}>
              <i className="ph-browsers"></i>
              <span>Dashboard</span>
            </a>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/chats'); }}>
              <i className="ph-chats-circle"></i>
              <span>Chats</span>
            </a>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/market'); }}>
              <i className="ph-storefront"></i>
              <span>Market</span>
            </a>
            <a href="#">
              <i className="ph-robot"></i>
              <span>Agents</span>
            </a>
            <a href="#">
              <i className="ph-hammer"></i>
              <span>Workshop</span>
            </a>
            <a href="#">
              <i className="ph-chart-line"></i>
              <span>Analytics</span>
            </a>
            <a href="#">
              <i className="ph-gear"></i>
              <span>Settings</span>
            </a>
          </nav>
          <footer className="footer">
            <h1>Fantasy Builders</h1>
            <div>CEO: Aleksandr Grishin<br />All Rights Reserved 2026</div>
          </footer>
        </div>

        <div className="app-body-main-content profile-content">
          <section className="profile-section">
            <div className="profile-header">
              <h2>Profile Settings</h2>
              {!isEditing && (
                <button className="icon-button large" onClick={() => setIsEditing(true)} title="Edit Profile">
                  <i className="ph-pencil-simple"></i>
                </button>
              )}
            </div>

            <div className="profile-card">
              <div className="profile-avatar-section">
                <div className="profile-avatar-large">
                  <img src={userData.gravatarUrl} alt="Avatar" />
                </div>
                <div className="avatar-info">
                  <h3>Profile Picture</h3>
                  <p>Generated from your wallet address</p>
                </div>
              </div>

              <div className="profile-form">
                <div className="form-group">
                  <label>Full Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="profile-input"
                    />
                  ) : (
                    <div className="profile-value">{userData.fullName}</div>
                  )}
                </div>

                <div className="form-group">
                  <label>Username</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="profile-input"
                    />
                  ) : (
                    <div className="profile-value">{userData.username}</div>
                  )}
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="profile-input"
                      placeholder="Enter your email"
                    />
                  ) : (
                    <div className="profile-value">{userData.email || 'Not set'}</div>
                  )}
                </div>

                <div className="form-group">
                  <label>Wallet Address</label>
                  {userData.walletAddress ? (
                    <div className="wallet-display">
                      <i className="ph-wallet"></i>
                      <span>{userData.walletAddress}</span>
                      <button className="copy-button" onClick={() => navigator.clipboard.writeText(userData.walletAddress)}>
                        <i className="ph-copy"></i>
                      </button>
                    </div>
                  ) : (
                    <div className="profile-value">Not connected</div>
                  )}
                </div>

                {isEditing && (
                  <div className="form-actions">
                    <button className="save-button" onClick={handleSave} disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button className="cancel-button" onClick={handleCancel} disabled={isSaving}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="profile-card danger-zone">
              <div className="danger-zone-header">
                <i className="ph-warning-circle"></i>
                <div>
                  <h3>Account Actions</h3>
                  <p>Manage your account security and session</p>
                </div>
              </div>
              
              <div className="danger-actions">
                <button className="logout-button" onClick={handleLogout}>
                  <i className="ph-sign-out"></i>
                  <div>
                    <span>Logout</span>
                    <small>Sign out from your account</small>
                  </div>
                </button>
                
                <button className="disconnect-button" onClick={async () => {
                  if (confirm('Are you sure you want to disconnect your wallet? You will need to reconnect to access your account.')) {
                    if (userData.walletAddress) {
                      await disconnectWallet(userData.id);
                    }
                    await signOut();
                    localStorage.removeItem('userData');
                    navigate('/');
                  }
                }}>
                  <i className="ph-plug"></i>
                  <div>
                    <span>Disconnect Wallet</span>
                    <small>Remove wallet connection</small>
                  </div>
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Profile;
