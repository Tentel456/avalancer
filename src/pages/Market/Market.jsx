import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Market.css';

const Market = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [cryptoData, setCryptoData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('userData');
    if (!storedUser) {
      navigate('/');
      return;
    }
    setUserData(JSON.parse(storedUser));
  }, [navigate]);

  useEffect(() => {
    if (userData) {
      fetchCryptoData();
      // Refresh data every 2 minutes to avoid rate limits
      const interval = setInterval(fetchCryptoData, 120000);
      return () => clearInterval(interval);
    }
  }, [userData]);

  const fetchCryptoData = async () => {
    try {
      setError(null);
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h',
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
      
      if (Array.isArray(data) && data.length > 0) {
        setCryptoData(data);
      } else {
        setError('No data received from API');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching crypto data:', error);
      setError(error.message || 'Failed to load market data');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userData');
    navigate('/');
  };

  const filteredCrypto = cryptoData.filter(coin =>
    coin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coin.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!userData) {
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
            <a href="#" className="active">Market</a>
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
            <a href="#" className="active">
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

        <div className="app-body-main-content market-content">
          <section className="market-section">
            <div className="market-header">
              <h2>Cryptocurrency Market</h2>
              <div className="market-search">
                <i className="ph-magnifying-glass"></i>
                <input
                  type="text"
                  placeholder="Search cryptocurrency..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="market-loading">
                <i className="ph-spinner"></i>
                <p>Loading market data...</p>
              </div>
            ) : error ? (
              <div className="market-error">
                <i className="ph-warning-circle"></i>
                <p>{error}</p>
                <button className="retry-button" onClick={fetchCryptoData}>
                  <i className="ph-arrow-clockwise"></i>
                  Retry
                </button>
              </div>
            ) : filteredCrypto.length === 0 ? (
              <div className="market-empty">
                <i className="ph-magnifying-glass"></i>
                <p>No cryptocurrencies found</p>
              </div>
            ) : (
              <div className="crypto-list">
                <div className="crypto-list-header">
                  <div className="crypto-rank">#</div>
                  <div className="crypto-name">Name</div>
                  <div className="crypto-price">Price</div>
                  <div className="crypto-change">24h Change</div>
                  <div className="crypto-market-cap">Market Cap</div>
                </div>
                {filteredCrypto.map((coin) => (
                  <div
                    key={coin.id}
                    className="crypto-item"
                    onClick={() => navigate(`/market/${coin.id}`)}
                  >
                    <div className="crypto-rank">{coin.market_cap_rank}</div>
                    <div className="crypto-name">
                      <img src={coin.image} alt={coin.name} />
                      <div>
                        <span className="name">{coin.name}</span>
                        <span className="symbol">{coin.symbol.toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="crypto-price">
                      ${coin.current_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className={`crypto-change ${coin.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}`}>
                      <i className={coin.price_change_percentage_24h >= 0 ? 'ph-arrow-up' : 'ph-arrow-down'}></i>
                      {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                    </div>
                    <div className="crypto-market-cap">
                      ${(coin.market_cap / 1000000000).toFixed(2)}B
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Market;
