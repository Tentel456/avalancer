import { useState, useEffect } from 'react';
import { logEvent } from '../../services/eventService';
import { getAllAgents } from '../../services/agentService';
import './ControlPanel.css';

const ControlPanel = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('events');
  const [eventType, setEventType] = useState('market_event');
  const [eventDescription, setEventDescription] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [message, setMessage] = useState('');
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    const agentsList = await getAllAgents();
    if (Array.isArray(agentsList)) {
      setAgents(agentsList);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Create event for all agents
      const agentsList = await getAllAgents();
      
      for (const agent of agentsList) {
        await logEvent(eventType, agent.agent_id, eventDescription, {
          eventData: { source: 'control_panel', manual: true }
        });
      }

      setSuccess(`Event created for ${agentsList.length} agents!`);
      setEventDescription('');
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to create event: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!selectedAgent) {
        throw new Error('Please select an agent');
      }

      // Log as a message event
      await logEvent('direct_message', selectedAgent, message, {
        eventData: { source: 'control_panel', message }
      });

      setSuccess(`Message sent to ${selectedAgent}!`);
      setMessage('');
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to send message: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="control-panel-overlay" onClick={onClose}>
      <div className="control-panel" onClick={(e) => e.stopPropagation()}>
        <div className="control-panel-header">
          <h2>Control Panel</h2>
          <button className="close-button" onClick={onClose}>
            <i className="ph-x"></i>
          </button>
        </div>

        <div className="control-panel-tabs">
          <button
            className={`tab ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            <i className="ph-lightning"></i>
            Market Events
          </button>
          <button
            className={`tab ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => setActiveTab('messages')}
          >
            <i className="ph-chat-circle"></i>
            Send Message
          </button>
        </div>

        <div className="control-panel-content">
          {success && (
            <div className="alert alert-success">
              <i className="ph-check-circle"></i>
              {success}
            </div>
          )}

          {error && (
            <div className="alert alert-error">
              <i className="ph-warning-circle"></i>
              {error}
            </div>
          )}

          {activeTab === 'events' && (
            <form className="control-form" onSubmit={handleCreateEvent}>
              <div className="form-group">
                <label>Event Type</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  required
                >
                  <option value="market_event">Market Event</option>
                  <option value="price_alert">Price Alert</option>
                  <option value="news">News</option>
                  <option value="regulation">Regulation</option>
                  <option value="technical">Technical Signal</option>
                </select>
              </div>

              <div className="form-group">
                <label>Event Description</label>
                <textarea
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  placeholder="Describe the market event (e.g., 'Bitcoin breaks $50k resistance')"
                  rows={4}
                  required
                  maxLength={500}
                />
                <span className="char-count">{eventDescription.length}/500</span>
              </div>

              <button type="submit" className="submit-button" disabled={loading}>
                {loading ? (
                  <>
                    <i className="ph-spinner"></i>
                    Creating...
                  </>
                ) : (
                  <>
                    <i className="ph-lightning"></i>
                    Create Event for All Agents
                  </>
                )}
              </button>

              <p className="help-text">
                This will create an event that all agents will react to in their next cycle.
              </p>
            </form>
          )}

          {activeTab === 'messages' && (
            <form className="control-form" onSubmit={handleSendMessage}>
              <div className="form-group">
                <label>Select Agent</label>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  required
                >
                  <option value="">Choose an agent...</option>
                  {agents && agents.length > 0 && agents.map((agent) => (
                    <option key={agent.agent_id} value={agent.agent_id}>
                      {agent.name} - {agent.role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Send a direct message to the agent..."
                  rows={4}
                  required
                  maxLength={500}
                />
                <span className="char-count">{message.length}/500</span>
              </div>

              <button type="submit" className="submit-button" disabled={loading}>
                {loading ? (
                  <>
                    <i className="ph-spinner"></i>
                    Sending...
                  </>
                ) : (
                  <>
                    <i className="ph-paper-plane-tilt"></i>
                    Send Message
                  </>
                )}
              </button>

              <p className="help-text">
                Send a direct message that the agent will consider in their next reflection.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
