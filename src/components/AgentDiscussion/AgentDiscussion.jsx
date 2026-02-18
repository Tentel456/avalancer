import { useState, useEffect } from 'react';
import { getAllAgents } from '../../services/agentService';
import { startAgentDiscussion } from '../../services/agentDiscussionService';
import { useNavigate } from 'react-router-dom';
import './AgentDiscussion.css';

const AgentDiscussion = ({ coinSymbol, coinName, currentPrice, priceChange, onClose }) => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadAgentsAndStartDiscussion();
  }, []);

  const loadAgentsAndStartDiscussion = async () => {
    console.log('[AgentDiscussion] Loading agents...');
    setLoading(true);
    
    const { data: agentsData, error } = await getAllAgents();
    if (error) {
      console.error('[AgentDiscussion] Failed to load agents:', error);
      setMessages([{
        id: Date.now(),
        type: 'system',
        content: `Error loading agents: ${error.message}`,
        timestamp: new Date()
      }]);
      setLoading(false);
      return;
    }

    console.log('[AgentDiscussion] Agents loaded:', agentsData?.length);
    setAgents(agentsData || []);
    setLoading(false);

    if (agentsData && agentsData.length > 0) {
      startAnalysis(agentsData);
    } else {
      setMessages([{
        id: Date.now(),
        type: 'system',
        content: 'No agents available',
        timestamp: new Date()
      }]);
    }
  };

  const startAnalysis = async (agentsList) => {
    if (!agentsList || agentsList.length === 0) {
      console.error('No agents to analyze');
      setAnalyzing(false);
      return;
    }

    setAnalyzing(true);
    
    // Системное сообщение
    setMessages([{
      id: Date.now(),
      type: 'system',
      content: `Запускаем дискуссию о ${coinName} (${coinSymbol.toUpperCase()})...`,
      timestamp: new Date()
    }]);

    console.log(`Starting discussion with ${agentsList.length} agents`);

    // Запускаем дискуссию
    const { data: discussionMessages, error } = await startAgentDiscussion(
      coinSymbol.toUpperCase(),
      currentPrice,
      priceChange
    );

    if (error) {
      console.error('Discussion error:', error);
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'system',
        content: `Ошибка: ${error.message}`,
        timestamp: new Date()
      }]);
      setAnalyzing(false);
      return;
    }

    // Добавляем сообщения по очереди с задержкой
    for (let i = 0; i < discussionMessages.length; i++) {
      const msg = discussionMessages[i];
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setMessages(prev => [...prev, {
        id: Date.now() + i,
        type: 'agent',
        agentId: msg.agent.agent_id,
        agentName: msg.agent.name,
        role: msg.agent.role,
        content: msg.message,
        round: msg.round,
        mood: msg.agent.current_mood,
        error: false,
        timestamp: new Date()
      }]);
    }

    setAnalyzing(false);
    
    // Устанавливаем флаг для открытия чата агентов
    localStorage.setItem('openAgentsChat', 'true');
    
    // После завершения дискуссии перенаправляем в чаты
    setTimeout(() => {
      onClose();
      navigate('/chats');
    }, 1500);
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
    if (!mood) return '🤖';
    if (mood.euphoria > 0.5) return '🚀';
    if (mood.fear > 0.5) return '😰';
    if (mood.confidence > 0.6) return '😎';
    if (mood.irritation > 0.5) return '😤';
    return '😐';
  };

  return (
    <div className="agent-discussion-overlay" onClick={onClose}>
      <div className="agent-discussion-modal" onClick={(e) => e.stopPropagation()}>
        <div className="agent-discussion-header">
          <div className="discussion-title">
            <i className="ph-robot"></i>
            <div>
              <h3>AI Agents Discussion</h3>
              <p>{coinName} ({coinSymbol.toUpperCase()}) Analysis</p>
            </div>
          </div>
          <button className="discussion-close" onClick={onClose}>
            <i className="ph-x"></i>
          </button>
        </div>

        <div className="agent-discussion-body">
          {loading ? (
            <div className="discussion-loading">
              <i className="ph-spinner"></i>
              <p>Loading agents...</p>
            </div>
          ) : (
            <>
              <div className="discussion-messages">
                {messages.map((message) => (
                  <div key={message.id} className={`discussion-message ${message.type}`}>
                    {message.type === 'system' ? (
                      <div className="system-message">
                        <i className="ph-info"></i>
                        <span>{message.content}</span>
                      </div>
                    ) : (
                      <div className="agent-message">
                        <div 
                          className="agent-message-avatar" 
                          style={{ backgroundColor: getAgentColor(message.agentId) }}
                        >
                          <span>{getMoodEmoji(message.mood)}</span>
                        </div>
                        <div className="agent-message-content">
                          <div className="agent-message-header">
                            <span className="agent-name">{message.agentName}</span>
                            <span className="agent-role">{message.role}</span>
                          </div>
                          <p className={message.error ? 'error-text' : ''}>
                            {message.content}
                          </p>
                          <span className="message-time">
                            {message.timestamp.toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {analyzing && (
                  <div className="discussion-message system">
                    <div className="system-message analyzing">
                      <i className="ph-spinner"></i>
                      <span>Agents are analyzing...</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="discussion-footer">
                <div className="discussion-stats">
                  <div className="stat-item">
                    <i className="ph-users-three"></i>
                    <span>{agents.length} Agents</span>
                  </div>
                  <div className="stat-item">
                    <i className="ph-chat-circle-dots"></i>
                    <span>{messages.filter(m => m.type === 'agent').length} Responses</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentDiscussion;
