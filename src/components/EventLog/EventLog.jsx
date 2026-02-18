import { useEffect, useState } from 'react';
import { getEvents, subscribeToEvents } from '../../services/eventService';
import './EventLog.css';

const EventLog = ({ agentId = null, limit = 50 }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    loadEvents();
    
    // Subscribe to real-time events
    const unsubscribe = subscribeToEvents((newEvent) => {
      setEvents(prev => [newEvent, ...prev].slice(0, limit));
      
      // Auto-scroll to top if enabled
      if (autoScroll) {
        setTimeout(() => {
          const logContainer = document.querySelector('.event-log-list');
          if (logContainer) {
            logContainer.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }, 100);
      }
    }, { agentId });
    
    return () => unsubscribe();
  }, [agentId, limit, autoScroll]);

  const loadEvents = async () => {
    setLoading(true);
    const { data } = await getEvents({
      agentId,
      limit,
      eventType: filter === 'all' ? null : filter
    });
    
    if (data) {
      setEvents(data);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadEvents();
  }, [filter]);

  const getEventIcon = (eventType) => {
    const icons = {
      post_created: '📝',
      comment_created: '💬',
      market_event: '📊',
      price_alert: '🔔',
      news: '📰',
      regulation: '⚖️',
      technical: '📈',
      direct_message: '✉️',
      reflection: '🤔',
      goal_set: '🎯',
      action_executed: '⚡'
    };
    return icons[eventType] || '📌';
  };

  const getEventColor = (eventType) => {
    const colors = {
      post_created: '#3b82f6',
      comment_created: '#8b5cf6',
      market_event: '#f59e0b',
      price_alert: '#ef4444',
      news: '#10b981',
      regulation: '#6366f1',
      technical: '#06b6d4',
      direct_message: '#ec4899',
      reflection: '#64748b',
      goal_set: '#14b8a6',
      action_executed: '#84cc16'
    };
    return colors[eventType] || '#6b7280';
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const eventTime = new Date(timestamp);
    const diffMs = now - eventTime;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return eventTime.toLocaleDateString();
  };

  const eventTypes = [
    { value: 'all', label: 'All Events' },
    { value: 'post_created', label: 'Posts' },
    { value: 'comment_created', label: 'Comments' },
    { value: 'market_event', label: 'Market' },
    { value: 'direct_message', label: 'Messages' }
  ];

  return (
    <div className="event-log">
      <div className="event-log-header">
        <div className="event-log-title">
          <h3>Event Log</h3>
          <span className="event-count">{events.length} events</span>
        </div>
        
        <div className="event-log-controls">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="event-filter"
          >
            {eventTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          
          <button
            className={`auto-scroll-toggle ${autoScroll ? 'active' : ''}`}
            onClick={() => setAutoScroll(!autoScroll)}
            title={autoScroll ? 'Disable auto-scroll' : 'Enable auto-scroll'}
          >
            <i className={`ph-${autoScroll ? 'pause' : 'play'}`}></i>
          </button>
          
          <button
            className="refresh-button"
            onClick={loadEvents}
            title="Refresh events"
          >
            <i className="ph-arrow-clockwise"></i>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="event-log-loading">
          <i className="ph-spinner"></i>
          <p>Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="event-log-empty">
          <i className="ph-clock-countdown"></i>
          <p>No events yet</p>
        </div>
      ) : (
        <div className="event-log-list">
          {events.map((event) => (
            <div
              key={event.id}
              className="event-item"
              style={{ borderLeftColor: getEventColor(event.event_type) }}
            >
              <div className="event-icon" style={{ backgroundColor: `${getEventColor(event.event_type)}20` }}>
                {getEventIcon(event.event_type)}
              </div>
              
              <div className="event-content">
                <div className="event-header">
                  <span className="event-type" style={{ color: getEventColor(event.event_type) }}>
                    {event.event_type.replace(/_/g, ' ')}
                  </span>
                  <span className="event-time">{formatTimeAgo(event.created_at)}</span>
                </div>
                
                <div className="event-description">
                  {event.agent && (
                    <span className="event-agent">{event.agent.name}</span>
                  )}
                  {event.description}
                  {event.related_agent && (
                    <span className="event-related"> → {event.related_agent.name}</span>
                  )}
                </div>
                
                {event.event_data && (
                  <div className="event-data">
                    {Object.entries(event.event_data).map(([key, value]) => (
                      <span key={key} className="event-data-item">
                        {key}: {typeof value === 'object' ? JSON.stringify(value) : value}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventLog;
