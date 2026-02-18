import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getMemoryStats, getRecentImportantMemories } from '../../services/memoryService';
import { getRecentEvents } from '../../services/eventService';
import { getMoodColor } from '../../services/emotionService';
import { getAgentAvatar } from '../../utils/agentAvatars';
import './AgentInspector.css';

const AgentInspector = ({ agentId, onClose }) => {
  const [agent, setAgent] = useState(null);
  const [memories, setMemories] = useState([]);
  const [events, setEvents] = useState([]);
  const [memoryStats, setMemoryStats] = useState(null);
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (agentId) {
      loadAgentData();
    }
  }, [agentId]);

  const loadAgentData = async () => {
    setLoading(true);

    // Load agent
    const { data: agentData } = await supabase
      .from('agents')
      .select('*')
      .eq('agent_id', agentId)
      .single();

    if (agentData) {
      setAgent(agentData);
    }

    // Load memories
    const { data: memoriesData } = await getRecentImportantMemories(agentId, 10);
    if (memoriesData) {
      setMemories(memoriesData);
    }

    // Load events
    const { data: eventsData } = await getRecentEvents(agentId, 10);
    if (eventsData) {
      setEvents(eventsData);
    }

    // Load memory stats
    const { data: statsData } = await getMemoryStats(agentId);
    if (statsData) {
      setMemoryStats(statsData);
    }

    // Load relationships
    const { data: relsData } = await supabase
      .from('agent_relationships')
      .select(`
        *,
        agent2:agents!agent_relationships_agent_id_2_fkey(agent_id, name, role)
      `)
      .eq('agent_id_1', agentId)
      .order('trust', { ascending: false })
      .limit(5);

    if (relsData) {
      setRelationships(relsData);
    }

    setLoading(false);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRelationshipColor = (value) => {
    if (value > 0.7) return '#16a34a';
    if (value > 0.4) return '#84cc16';
    if (value > 0) return '#eab308';
    return '#ef4444';
  };

  if (!agent) return null;

  return (
    <div className="agent-inspector-overlay" onClick={onClose}>
      <div className="agent-inspector" onClick={(e) => e.stopPropagation()}>
        <div className="agent-inspector-header">
          <div className="agent-inspector-title">
            <div className="agent-avatar" style={{ borderColor: getMoodColor(agent.current_mood) }}>
              <img src={getAgentAvatar(agentId)} alt={agent.name} />
            </div>
            <div>
              <h2>{agent.name}</h2>
              <p className="agent-role">{agent.role}</p>
            </div>
          </div>
          <button className="close-button" onClick={onClose}>
            <i className="ph-x"></i>
          </button>
        </div>

        <div className="agent-inspector-tabs">
          <button
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <i className="ph-user"></i>
            Overview
          </button>
          <button
            className={`tab ${activeTab === 'memories' ? 'active' : ''}`}
            onClick={() => setActiveTab('memories')}
          >
            <i className="ph-brain"></i>
            Memories
          </button>
          <button
            className={`tab ${activeTab === 'relationships' ? 'active' : ''}`}
            onClick={() => setActiveTab('relationships')}
          >
            <i className="ph-users"></i>
            Relationships
          </button>
          <button
            className={`tab ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            <i className="ph-activity"></i>
            Activity
          </button>
        </div>

        <div className="agent-inspector-content">
          {loading ? (
            <div className="loading-state">
              <i className="ph-spinner"></i>
              <p>Loading agent data...</p>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="tab-content">
                  <div className="info-section">
                    <h3>Personality</h3>
                    <div className="personality-traits">
                      {agent.personality?.traits?.map((trait, i) => (
                        <span key={i} className="trait-badge">{trait}</span>
                      ))}
                    </div>
                    <p className="personality-description">
                      {agent.personality?.description}
                    </p>
                    <p className="communication-style">
                      <strong>Communication:</strong> {agent.personality?.communication_style}
                    </p>
                  </div>

                  <div className="info-section">
                    <h3>Current Mood</h3>
                    <div className="mood-grid">
                      {Object.entries(agent.current_mood || {}).map(([key, value]) => (
                        <div key={key} className="mood-item">
                          <span className="mood-label">{key}</span>
                          <div className="mood-bar">
                            <div
                              className="mood-fill"
                              style={{
                                width: `${value * 100}%`,
                                backgroundColor: getMoodColor({ [key]: value })
                              }}
                            />
                          </div>
                          <span className="mood-value">{(value * 100).toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {memoryStats && (
                    <div className="info-section">
                      <h3>Memory Statistics</h3>
                      <div className="stats-grid">
                        <div className="stat-card">
                          <div className="stat-value">{memoryStats.totalCount}</div>
                          <div className="stat-label">Total Memories</div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-value">{(memoryStats.avgImportance * 100).toFixed(0)}%</div>
                          <div className="stat-label">Avg Importance</div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-value">
                            {memoryStats.avgEmotionalValence > 0 ? '+' : ''}
                            {memoryStats.avgEmotionalValence.toFixed(2)}
                          </div>
                          <div className="stat-label">Emotional Trend</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'memories' && (
                <div className="tab-content">
                  <div className="info-section">
                    <h3>Recent Important Memories</h3>
                    {memories.length === 0 ? (
                      <p className="empty-message">No memories yet</p>
                    ) : (
                      <div className="memories-list">
                        {memories.map((memory) => (
                          <div key={memory.id} className="memory-item">
                            <div className="memory-header">
                              <span className="memory-type">{memory.memory_type}</span>
                              <span className="memory-time">{formatDate(memory.created_at)}</span>
                            </div>
                            <p className="memory-content">{memory.content}</p>
                            <div className="memory-meta">
                              <span className="memory-importance">
                                Importance: {(memory.importance * 100).toFixed(0)}%
                              </span>
                              {memory.emotional_valence !== 0 && (
                                <span className="memory-emotion">
                                  Emotion: {memory.emotional_valence > 0 ? '+' : ''}
                                  {memory.emotional_valence.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'relationships' && (
                <div className="tab-content">
                  <div className="info-section">
                    <h3>Top Relationships</h3>
                    {relationships.length === 0 ? (
                      <p className="empty-message">No relationships yet</p>
                    ) : (
                      <div className="relationships-list">
                        {relationships.map((rel) => (
                          <div key={rel.id} className="relationship-item">
                            <div className="relationship-agent">
                              <strong>{rel.agent2.name}</strong>
                              <span className="relationship-role">{rel.agent2.role}</span>
                            </div>
                            <div className="relationship-metrics">
                              <div className="metric">
                                <span>Trust</span>
                                <div className="metric-bar">
                                  <div
                                    className="metric-fill"
                                    style={{
                                      width: `${rel.trust * 100}%`,
                                      backgroundColor: getRelationshipColor(rel.trust)
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="metric">
                                <span>Sympathy</span>
                                <div className="metric-bar">
                                  <div
                                    className="metric-fill"
                                    style={{
                                      width: `${rel.sympathy * 100}%`,
                                      backgroundColor: getRelationshipColor(rel.sympathy)
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="metric">
                                <span>Respect</span>
                                <div className="metric-bar">
                                  <div
                                    className="metric-fill"
                                    style={{
                                      width: `${rel.respect * 100}%`,
                                      backgroundColor: getRelationshipColor(rel.respect)
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="tab-content">
                  <div className="info-section">
                    <h3>Recent Activity</h3>
                    {events.length === 0 ? (
                      <p className="empty-message">No recent activity</p>
                    ) : (
                      <div className="activity-list">
                        {events.map((event) => (
                          <div key={event.id} className="activity-item">
                            <div className="activity-icon">
                              {getEventIcon(event.event_type)}
                            </div>
                            <div className="activity-content">
                              <div className="activity-type">{event.event_type.replace(/_/g, ' ')}</div>
                              <div className="activity-description">{event.description}</div>
                              <div className="activity-time">{formatDate(event.created_at)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const getEventIcon = (eventType) => {
  const icons = {
    post_created: '📝',
    comment_created: '💬',
    market_event: '📊',
    reflection: '🤔',
    goal_set: '🎯',
    action_executed: '⚡'
  };
  return icons[eventType] || '📌';
};

export default AgentInspector;
