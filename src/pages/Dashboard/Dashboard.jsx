import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser, signOut } from '../../services/authService';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, [navigate]);

  const loadUser = async () => {
    // Try localStorage first
    const storedUser = localStorage.getItem('userData');
    if (storedUser) {
      setUserData(JSON.parse(storedUser));
      setIsLoading(false);
      return;
    }

    // Try Supabase session
    const { data, error } = await getCurrentUser();
    
    if (error || !data) {
      console.error('Failed to load user:', error);
      navigate('/');
      return;
    }

    // Если профиль не существует (например, первый вход через Google)
    if (!data.profile && data.user) {
      console.log('Profile not found, creating for Google user...');
      
      // Создаем профиль для Google пользователя
      const { supabase } = await import('../../lib/supabase');
      const { getDiceBearUrl } = await import('../../utils/gravatar');
      
      const newProfile = {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
        username: data.user.email?.split('@')[0] || `user_${data.user.id.slice(0, 8)}`,
        avatar_url: data.user.user_metadata?.avatar_url || getDiceBearUrl(data.user.email, 200),
        auth_method: 'google'
      };

      const { error: insertError } = await supabase
        .from('profiles')
        .insert([newProfile]);

      // Игнорируем ошибку 409 (профиль уже существует)
      if (insertError && !insertError.message?.includes('duplicate key')) {
        console.error('Failed to create profile:', insertError);
      }

      // Перезагружаем пользователя в любом случае
      const { data: reloadData } = await getCurrentUser();
      if (!reloadData || !reloadData.profile) {
        console.error('Profile still not found after creation attempt');
        navigate('/');
        return;
      }
      
      data.profile = reloadData.profile;
    }

    if (!data.profile) {
      console.error('Profile still not found');
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
    setIsLoading(false);
  };

  const handleLogout = async () => {
    await signOut();
    localStorage.removeItem('userData');
    navigate('/');
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
            <a href="#" className="active">Overview</a>
            <a href="#">Payments</a>
            <a href="#">Cards</a>
            <a href="#">Account</a>
            <a href="#">System</a>
          </div>
        </div>
        <div className="app-header-actions">
          <button className="user-profile" onClick={() => navigate('/profile')}>
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
            <a href="#" className="active">
              <i className="ph-browsers"></i>
              <span>Dashboard</span>
            </a>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/feed'); }}>
              <i className="ph-newspaper"></i>
              <span>Feed</span>
            </a>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/chats'); }}>
              <i className="ph-chats-circle"></i>
              <span>Chats</span>
            </a>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/market'); }}>
              <i className="ph-storefront"></i>
              <span>Market</span>
            </a>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/agents'); }}>
              <i className="ph-robot"></i>
              <span>Agents</span>
            </a>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/graph'); }}>
              <i className="ph-graph"></i>
              <span>Graph</span>
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

        <div className="app-body-main-content">
          <section className="service-section">
            <h2>Quick Actions</h2>
            <div className="tiles">
              <article className="tile">
                <div className="tile-header">
                  <i className="ph-wallet-light"></i>
                  <h3>
                    <span>My Wallet</span>
                    <span>{userData.walletAddress ? userData.walletAddress.slice(0, 10) + '...' : 'Not connected'}</span>
                  </h3>
                </div>
                <a href="#">
                  <span>View details</span>
                  <span className="icon-button">
                    <i className="ph-caret-right-bold"></i>
                  </span>
                </a>
              </article>
              <article className="tile">
                <div className="tile-header">
                  <i className="ph-chart-line-light"></i>
                  <h3>
                    <span>Analytics</span>
                    <span>Performance</span>
                  </h3>
                </div>
                <a href="#">
                  <span>View stats</span>
                  <span className="icon-button">
                    <i className="ph-caret-right-bold"></i>
                  </span>
                </a>
              </article>
              <article className="tile">
                <div className="tile-header">
                  <i className="ph-gear-light"></i>
                  <h3>
                    <span>Settings</span>
                    <span>Configure</span>
                  </h3>
                </div>
                <a href="#">
                  <span>Manage</span>
                  <span className="icon-button">
                    <i className="ph-caret-right-bold"></i>
                  </span>
                </a>
              </article>
            </div>
          </section>

          <section className="transfer-section">
            <div className="transfer-section-header">
              <h2>Recent Activity</h2>
              <div className="filter-options">
                <p>All transactions</p>
                <button className="icon-button">
                  <i className="ph-funnel"></i>
                </button>
              </div>
            </div>
            <div className="transfers">
              <div className="transfer">
                <div className="transfer-logo">
                  <i className="ph-check-circle"></i>
                </div>
                <dl className="transfer-details">
                  <div>
                    <dt>Wallet Connected</dt>
                    <dd>{userData.authMethod === 'metamask' ? 'MetaMask Authentication' : 'Email Authentication'}</dd>
                  </div>
                  <div>
                    <dt>{userData.walletAddress ? userData.walletAddress.slice(0, 10) + '...' : userData.email}</dt>
                    <dd>{userData.walletAddress ? 'Wallet Address' : 'Email Address'}</dd>
                  </div>
                  <div>
                    <dt>Just now</dt>
                    <dd>Connection Time</dd>
                  </div>
                </dl>
                <div className="transfer-status success">
                  <i className="ph-check-circle-fill"></i>
                  <span>Active</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
