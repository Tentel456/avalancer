import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CryptoChart from '../../components/CryptoChart/CryptoChart';
import AgentDiscussion from '../../components/AgentDiscussion/AgentDiscussion';
import './CryptoDetail.css';

const CryptoDetail = () => {
  const { coinId } = useParams();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [coinData, setCoinData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAgentDiscussion, setShowAgentDiscussion] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('userData');
    if (!storedUser) {
      navigate('/');
      return;
    }
    setUserData(JSON.parse(storedUser));
  }, [navigate]);

  useEffect(() => {
    if (userData && coinId) {
      fetchCoinData();
    }
  }, [coinId, userData]);

  const fetchCoinData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`,
        {
          headers: {
            'Accept': 'application/json',
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      setCoinData(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching coin data:', error);
      setError(error.message || 'Failed to load coin data');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userData');
    navigate('/');
  };

  const handleStartDiscussion = () => {
    if (coinData) {
      setShowAgentDiscussion(true);
    }
  };

  if (!userData) {
    return null;
  }

  if (loading) {
    return (
      <div className="app">
        <div className="market-loading">
          <i className="ph-spinner"></i>
          <p>Loading coin data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="market-error">
          <i className="ph-warning-circle"></i>
          <p>{error}</p>
          <button className="retry-button" onClick={fetchCoinData}>
            <i className="ph-arrow-clockwise"></i>
            Retry
          </button>
        </div>
      </div>
    );
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
            <a href="#" onClick={() => navigate('/market')} className="active">Market</a>
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
            <a href="#" onClick={() => navigate('/dashboard')}>
              <i className="ph-browsers"></i>
              <span>Dashboard</span>
            </a>
            <a href="#">
              <i className="ph-chats-circle"></i>
              <span>Chats</span>
            </a>
            <a href="#" onClick={() => navigate('/market')} className="active">
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

        <div className="app-body-main-content crypto-detail-content">
          <section className="crypto-detail-section">
            <div className="crypto-detail-header">
              <button className="back-button" onClick={() => navigate('/market')}>
                <i className="ph-arrow-left"></i>
                <span>Back to Market</span>
              </button>
              {coinData && (
                <div className="coin-info">
                  <img src={coinData.image.large} alt={coinData.name} />
                  <div>
                    <h2>{coinData.name}</h2>
                    <span className="coin-symbol">{coinData.symbol.toUpperCase()}</span>
                  </div>
                </div>
              )}
            </div>

            {coinData && (
              <div className="coin-stats">
                <div className="stat-card">
                  <span className="stat-label">Current Price</span>
                  <span className="stat-value">
                    ${coinData.market_data.current_price.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">24h Change</span>
                  <span className={`stat-value ${coinData.market_data.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}`}>
                    <i className={coinData.market_data.price_change_percentage_24h >= 0 ? 'ph-arrow-up' : 'ph-arrow-down'}></i>
                    {Math.abs(coinData.market_data.price_change_percentage_24h).toFixed(2)}%
                  </span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Market Cap</span>
                  <span className="stat-value">
                    ${(coinData.market_data.market_cap.usd / 1000000000).toFixed(2)}B
                  </span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">24h Volume</span>
                  <span className="stat-value">
                    ${(coinData.market_data.total_volume.usd / 1000000000).toFixed(2)}B
                  </span>
                </div>
              </div>
            )}

            <div className="chart-container">
              <CryptoChart coinId={coinId} symbol={coinData?.symbol} />
            </div>

            <div className="conversation-container">
              <div className="conversation-input-wrapper">
                <img src={userData.gravatarUrl} alt="Avatar" className="conversation-avatar" />
                <input
                  type="text"
                  className="conversation-input"
                  placeholder="Ask AI Agents about this coin..."
                  onClick={handleStartDiscussion}
                  readOnly
                />
                <button className="conversation-send-button" onClick={handleStartDiscussion}>
                  <i className="ph-robot"></i>
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {showAgentDiscussion && coinData && (
        <AgentDiscussion
          coinSymbol={coinData.symbol}
          coinName={coinData.name}
          currentPrice={coinData.market_data.current_price.usd}
          priceChange={coinData.market_data.price_change_percentage_24h}
          onClose={() => setShowAgentDiscussion(false)}
        />
      )}
    </div>
  );
};

export default CryptoDetail;
