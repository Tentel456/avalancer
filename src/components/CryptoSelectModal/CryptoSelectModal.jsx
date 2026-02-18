import { useState, useEffect } from 'react';
import AgentDiscussion from '../AgentDiscussion/AgentDiscussion';
import './CryptoSelectModal.css';

const CryptoSelectModal = ({ isOpen, onClose, selectedAgent }) => {
  const [cryptos, setCryptos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [showDiscussion, setShowDiscussion] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTopCryptos();
    }
  }, [isOpen]);

  const fetchTopCryptos = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h',
        {
          headers: {
            'Accept': 'application/json',
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch cryptocurrencies');
      }
      
      const data = await response.json();
      setCryptos(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching cryptos:', error);
      setLoading(false);
    }
  };

  const filteredCryptos = cryptos.filter(crypto =>
    crypto.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    crypto.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectCrypto = (crypto) => {
    setSelectedCrypto(crypto);
    setShowDiscussion(true);
  };

  const handleCloseDiscussion = () => {
    setShowDiscussion(false);
    setSelectedCrypto(null);
    onClose();
  };

  if (!isOpen) return null;

  if (showDiscussion && selectedCrypto) {
    return (
      <AgentDiscussion
        coinSymbol={selectedCrypto.symbol}
        coinName={selectedCrypto.name}
        currentPrice={selectedCrypto.current_price}
        priceChange={selectedCrypto.price_change_percentage_24h}
        onClose={handleCloseDiscussion}
      />
    );
  }

  return (
    <div className="crypto-select-overlay" onClick={onClose}>
      <div className="crypto-select-modal" onClick={(e) => e.stopPropagation()}>
        <div className="crypto-select-header">
          <div className="select-title">
            <i className="ph-coins"></i>
            <div>
              <h3>Select Cryptocurrency</h3>
              <p>{selectedAgent ? `${selectedAgent.name} will analyze` : 'Choose a coin to analyze'}</p>
            </div>
          </div>
          <button className="select-close" onClick={onClose}>
            <i className="ph-x"></i>
          </button>
        </div>

        <div className="crypto-select-search">
          <i className="ph-magnifying-glass"></i>
          <input
            type="text"
            placeholder="Search cryptocurrency..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="crypto-select-body">
          {loading ? (
            <div className="select-loading">
              <i className="ph-spinner"></i>
              <p>Loading cryptocurrencies...</p>
            </div>
          ) : (
            <div className="crypto-list">
              {filteredCryptos.map((crypto) => (
                <div
                  key={crypto.id}
                  className="crypto-item"
                  onClick={() => handleSelectCrypto(crypto)}
                >
                  <div className="crypto-item-left">
                    <img src={crypto.image} alt={crypto.name} />
                    <div className="crypto-item-info">
                      <span className="crypto-name">{crypto.name}</span>
                      <span className="crypto-symbol">{crypto.symbol.toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="crypto-item-right">
                    <span className="crypto-price">
                      ${crypto.current_price.toLocaleString('en-US', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}
                    </span>
                    <span className={`crypto-change ${crypto.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}`}>
                      <i className={crypto.price_change_percentage_24h >= 0 ? 'ph-arrow-up' : 'ph-arrow-down'}></i>
                      {Math.abs(crypto.price_change_percentage_24h).toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))}
              
              {filteredCryptos.length === 0 && (
                <div className="no-results">
                  <i className="ph-magnifying-glass"></i>
                  <p>No cryptocurrencies found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CryptoSelectModal;
