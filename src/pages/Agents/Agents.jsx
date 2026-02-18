import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, signOut } from '../../services/authService';
import { getAllAgents } from '../../services/agentService';
import { getMoodColor } from '../../services/emotionService';
import { getAgentAvatar } from '../../utils/agentAvatars';
import CryptoSelectModal from '../../components/CryptoSelectModal/CryptoSelectModal';
import './Agents.css';

const Agents = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [agents, setAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCryptoSelect, setShowCryptoSelect] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);

  useEffect(() => {
    loadUser();
    loadAgents();
  }, [navigate]);

  const loadUser = async () => {
    const storedUser = localStorage.getItem('userData');
    if (storedUser) {
      setUserData(JSON.parse(storedUser));
      return;
    }

    const { data, error } = await getCurrentUser();
    if (error || !data) {
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
  };

  const loadAgents = async () => {
    setIsLoading(true);
    const { data, error } = await getAllAgents();
    
    if (error) {
      console.error('Failed to load agents:', error);
    } else {
      setAgents(data || []);
    }
    
    setIsLoading(false);
  };

  const handleLogout = async () => {
    await signOut();
    localStorage.removeItem('userData');
    navigate('/');
  };

  const getAgentColor = (agentId) => {
    const colors = {
      alpha: '#4a6741',
      beta: '#e3ffa8',
      gamma: '#bdbbb7',
      delta: '#ff6b6b',
      omega: '#4ecdc4'
    };
    return colors[agentId] || '#4a6741';
  };

  const getMoodEmoji = (mood) => {
    if (mood.euphoria > 0.5) return '🚀';
    if (mood.fear > 0.5) return '😰';
    if (mood.confidence > 0.6) return '😎';
    if (mood.irritation > 0.5) return '😤';
    return '😐';
  };

  const handleAskAgent = (agent) => {
    setSelectedAgent(agent);
    setShowCryptoSelect(true);
  };

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
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>Overview</a>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/market'); }}>Market</a>
            <a href="#" className="active">Agents</a>
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
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>
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
            <a href="#" className="active">
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

        <div className="app-body-main-content">
          <section className="service-section">
            <h2>Quick Actions</h2>
            <div className="tiles">
              <article className="tile">
                <div className="tile-header">
                  <i className="ph-robot-light"></i>
                  <h3>
                    <span>AI Agents</span>
                    <span>5 Active Traders</span>
                  </h3>
                </div>
                <a href="#">
                  <span>View all agents</span>
                  <span className="icon-button">
                    <i className="ph-caret-right-bold"></i>
                  </span>
                </a>
              </article>
              <article className="tile">
                <div className="tile-header">
                  <i className="ph-graph-light"></i>
                  <h3>
                    <span>Relationships</span>
                    <span>Network Graph</span>
                  </h3>
                </div>
                <a href="#">
                  <span>View graph</span>
                  <span className="icon-button">
                    <i className="ph-caret-right-bold"></i>
                  </span>
                </a>
              </article>
              <article className="tile">
                <div className="tile-header">
                  <i className="ph-chats-circle-light"></i>
                  <h3>
                    <span>Discussions</span>
                    <span>Agent Debates</span>
                  </h3>
                </div>
                <a href="#">
                  <span>View chats</span>
                  <span className="icon-button">
                    <i className="ph-caret-right-bold"></i>
                  </span>
                </a>
              </article>
            </div>
          </section>

          <section className="transfer-section">
            <div className="transfer-section-header">
              <h2>AI Trading Agents</h2>
              <div className="filter-options">
                <p>Multi-agent system with personalities, memory and emotions</p>
              </div>
            </div>

            {isLoading ? (
              <div className="loading-state">
                <i className="ph-spinner"></i>
                <p>Loading agents...</p>
              </div>
            ) : (
              <div className="agents-grid">
                {agents.map((agent) => (
                  <article key={agent.id} className="agent-card" style={{ '--agent-color': getAgentColor(agent.agent_id) }}>
                    <div className="agent-card-header">
                      <div className="agent-avatar" style={{ borderColor: getMoodColor(agent.current_mood) }}>
                        <img src={getAgentAvatar(agent.agent_id)} alt={agent.name} />
                      </div>
                      <div className="agent-info">
                        <h3>{agent.name}</h3>
                        <p className="agent-role">{agent.role}</p>
                      </div>
                      <div className="agent-status">
                        <span className="status-dot"></span>
                        <span>Active</span>
                      </div>
                    </div>

                    <div className="agent-card-body">
                      <p className="agent-description">{agent.personality.description}</p>
                      
                      <div className="agent-traits">
                        {agent.personality.traits.slice(0, 3).map((trait, index) => (
                          <span key={index} className="trait-badge">{trait}</span>
                        ))}
                      </div>

                      <div className="agent-stats">
                        <div className="stat">
                          <span className="stat-label">Risk</span>
                          <div className="stat-bar">
                            <div className="stat-fill" style={{ width: `${agent.risk_tolerance * 100}%` }}></div>
                          </div>
                          <span className="stat-value">{(agent.risk_tolerance * 100).toFixed(0)}%</span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">Confidence</span>
                          <div className="stat-bar">
                            <div className="stat-fill" style={{ width: `${agent.current_mood.confidence * 100}%` }}></div>
                          </div>
                          <span className="stat-value">{(agent.current_mood.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </div>

                      <div className="agent-performance">
                        <div className="performance-item">
                          <i className="ph-wallet"></i>
                          <div>
                            <span className="performance-label">Balance</span>
                            <span className="performance-value">${agent.balance.toLocaleString()} AVA</span>
                          </div>
                        </div>
                        <div className="performance-item">
                          <i className="ph-trend-up"></i>
                          <div>
                            <span className="performance-label">Profit</span>
                            <span className={`performance-value ${agent.total_profit >= 0 ? 'positive' : 'negative'}`}>
                              {agent.total_profit >= 0 ? '+' : ''}{agent.total_profit.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                        <div className="performance-item">
                          <i className="ph-chart-bar"></i>
                          <div>
                            <span className="performance-label">Trades</span>
                            <span className="performance-value">{agent.total_trades}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="agent-card-footer">
                      <button className="agent-action-btn primary" onClick={() => handleAskAgent(agent)}>
                        <i className="ph-chat-circle-dots"></i>
                        <span>Ask Agent</span>
                      </button>
                      <button className="agent-action-btn secondary">
                        <i className="ph-user-circle"></i>
                        <span>Profile</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <CryptoSelectModal
        isOpen={showCryptoSelect}
        onClose={() => {
          setShowCryptoSelect(false);
          setSelectedAgent(null);
        }}
        selectedAgent={selectedAgent}
      />
    </div>
  );
};

export default Agents;
