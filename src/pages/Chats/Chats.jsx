import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CreateGroupModal from '../../components/CreateGroupModal/CreateGroupModal';
import { createGroup, getUserGroups } from '../../services/groupService';
import { searchAll } from '../../services/searchService';
import { getAllAgentMessages } from '../../services/agentService';
import './Chats.css';

const Chats = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ users: [], groups: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const [chats] = useState([
    {
      id: 'agents-discussion',
      name: 'AI Agents Discussion',
      avatar: '/assets/chats/agent.svg',
      lastMessage: 'View all agent analyses and discussions',
      time: 'Live',
      unread: 0,
      online: true,
      type: 'agents'
    },
    {
      id: 1,
      name: 'AI Trading Assistant',
      avatar: '/assets/chats/agent.svg',
      lastMessage: 'How can I help you with trading today?',
      time: '10:30 AM',
      unread: 2,
      online: true,
      type: 'bot'
    },
    {
      id: 2,
      name: 'Market Analysis Bot',
      avatar: '/assets/chats/agent.svg',
      lastMessage: 'Bitcoin is showing bullish signals',
      time: '9:15 AM',
      unread: 0,
      online: true,
      type: 'bot'
    },
    {
      id: 3,
      name: 'Portfolio Manager',
      avatar: '/assets/chats/agent.svg',
      lastMessage: 'Your portfolio is up 5.2% today',
      time: 'Yesterday',
      unread: 1,
      online: false,
      type: 'bot'
    },
    {
      id: 4,
      name: 'Support Team',
      avatar: '/assets/chats/Contacts.svg',
      lastMessage: 'Thank you for contacting us',
      time: '2 days ago',
      unread: 0,
      online: false,
      type: 'contact'
    }
  ]);

  const [groups, setGroups] = useState([]);

  useEffect(() => {
    const storedUser = localStorage.getItem('userData');
    if (!storedUser) {
      navigate('/');
      return;
    }
    const user = JSON.parse(storedUser);
    setUserData(user);
    
    // Загружаем группы пользователя
    loadUserGroups(user.id);
    
    // Проверяем, нужно ли открыть чат агентов
    const openAgentsChat = localStorage.getItem('openAgentsChat');
    if (openAgentsChat === 'true') {
      localStorage.removeItem('openAgentsChat');
      // Открываем чат агентов
      const agentsChat = chats.find(c => c.type === 'agents');
      if (agentsChat) {
        setSelectedChat(agentsChat);
      }
    }
  }, [navigate]);

  const loadUserGroups = async (userId) => {
    const { data, error } = await getUserGroups(userId);
    if (!error && data) {
      setGroups(data);
    }
  };

  // Debounced search handler
  useEffect(() => {
    const delaySearch = setTimeout(async () => {
      if (searchQuery.trim() === '') {
        setSearchResults({ users: [], groups: [] });
        setShowSearchResults(false);
        setIsSearching(false);
        return;
      }

      console.log('Starting search for:', searchQuery);
      setIsSearching(true);
      
      try {
        const { data, error } = await searchAll(searchQuery);
        console.log('Search completed:', { data, error });
        
        if (error) {
          console.error('Search error:', error);
        }
        
        setSearchResults(data);
        setShowSearchResults(true);
      } catch (err) {
        console.error('Search exception:', err);
        setSearchResults({ users: [], groups: [] });
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleUserClick = (user) => {
    // Start a conversation with the user
    const newChat = {
      id: `user-${user.id}`,
      name: user.full_name || user.username,
      avatar: user.avatar_url || '/assets/chats/Contacts.svg',
      lastMessage: 'Start a conversation',
      time: 'Now',
      unread: 0,
      online: false,
      type: 'contact',
      userId: user.id
    };
    setSelectedChat(newChat);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const handleGroupClick = (group) => {
    // Open the group chat
    setSelectedChat({ ...group, type: 'group' });
    setSearchQuery('');
    setShowSearchResults(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.dropdown-container')) {
        setShowDropdown(false);
      }
      if (showSearchResults && !event.target.closest('.chats-search') && !event.target.closest('.search-results')) {
        setShowSearchResults(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown, showSearchResults]);

  useEffect(() => {
    if (selectedChat) {
      if (selectedChat.type === 'agents') {
        loadAgentMessages();
      } else {
        setMessages([
          {
            id: 1,
            sender: 'bot',
            text: 'Hello! How can I assist you today?',
            time: '10:25 AM'
          },
          {
            id: 2,
            sender: 'user',
            text: 'I need help analyzing Bitcoin trends',
            time: '10:26 AM'
          },
          {
            id: 3,
            sender: 'bot',
            text: 'Sure! Bitcoin is currently showing strong support at $45,000. The 24h volume is up 15% and technical indicators suggest a bullish trend.',
            time: '10:27 AM'
          }
        ]);
      }
    }
  }, [selectedChat]);

  // Автоматическая прокрутка вниз при новых сообщениях
  useEffect(() => {
    const messagesContainer = document.querySelector('.chat-messages');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }, [messages]);

  const loadAgentMessages = async () => {
    console.log('[Chats] Loading agent messages...');
    const { data, error } = await getAllAgentMessages(100);
    if (error) {
      console.error('[Chats] Failed to load agent messages:', error);
      return;
    }

    console.log('[Chats] Raw messages from DB:', data);

    if (!data || data.length === 0) {
      console.log('[Chats] No messages found');
      setMessages([]);
      return;
    }

    const formattedMessages = data.map((msg, index) => {
      const messageText = msg.message || 'No message';
      console.log(`[Chats] Message ${index}:`, {
        id: msg.id,
        from: msg.from_agent,
        text: messageText,
        length: messageText.length
      });

      return {
        id: msg.id || index,
        sender: 'agent',
        agentName: msg.agent?.name || 'Unknown Agent',
        agentRole: msg.agent?.role || '',
        agentId: msg.from_agent,
        text: messageText,
        context: msg.context,
        emotion: msg.emotion,
        time: new Date(msg.created_at).toLocaleTimeString('ru-RU', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        fullDate: new Date(msg.created_at).toLocaleDateString('ru-RU')
      };
    });

    // Сортируем от старых к новым (новые снизу)
    formattedMessages.reverse();
    
    console.log('[Chats] Formatted messages count:', formattedMessages.length);
    console.log('[Chats] First message:', formattedMessages[0]);
    setMessages(formattedMessages);
  };

  const handleLogout = () => {
    localStorage.removeItem('userData');
    navigate('/');
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && selectedChat) {
      const newMessage = {
        id: messages.length + 1,
        sender: 'user',
        text: message,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([...messages, newMessage]);
      setMessage('');
      
      setTimeout(() => {
        const botResponse = {
          id: messages.length + 2,
          sender: 'bot',
          text: 'Thank you for your message. I\'m processing your request...',
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botResponse]);
      }, 1000);
    }
  };

  const handleCreateGroup = async (groupData) => {
    if (!userData?.id) return;
    
    const { data, error } = await createGroup(groupData, userData.id);
    
    if (error) {
      console.error('Failed to create group:', error);
      alert('Failed to create group. Please try again.');
      return;
    }
    
    console.log('Group created:', data);
    setShowCreateGroupModal(false);
    
    // Перезагружаем список групп
    loadUserGroups(userData.id);
  };

  if (!userData) {
    return null;
  }

  return (
    <div className="app chats-app">
      <div className="chats-container">
          <div className="chats-sidebar">
            <div className="chats-sidebar-header">
              <div className="sidebar-logo" onClick={() => navigate('/dashboard')}>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 300 300" fill="none">
                  <path d="M150 0C67.4089 0 0 67.409 0 150C0 232.591 67.4089 300 150 300C232.591 300 300 232.591 300 150C300 67.409 232.591 0 150 0ZM41.9028 150C41.9028 119.028 55.2631 90.4859 76.5182 71.0527C85.0202 63.158 99.5951 65.587 105.668 75.9109L143.32 140.891C146.964 146.964 146.964 154.251 143.32 160.324L105.668 225.304C99.5951 236.235 85.0202 238.057 75.9109 229.555C55.2632 208.907 41.9028 180.972 41.9028 150ZM194.332 224.089L156.68 159.109C153.036 153.037 153.036 145.749 156.68 139.676L194.332 74.6963C200.405 64.3724 214.372 61.9433 223.482 69.8381C244.737 89.2713 258.097 117.814 258.097 148.785C258.097 179.757 244.737 208.3 223.482 227.733C214.372 237.449 200.405 235.02 194.332 224.089Z" fill="currentColor"/>
                </svg>
              </div>
              <div className="dropdown-container">
                <button 
                  className="icon-button menu-button"
                  onClick={() => setShowDropdown(!showDropdown)}
                  title="Menu"
                >
                  <img 
                    src="/assets/chats/Menu.svg" 
                    alt="Menu" 
                    className="menu-icon"
                    onError={(e) => {
                      console.error('Failed to load menu icon');
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = '<i class="ph-dots-three" style="font-size: 20px;"></i>';
                    }}
                  />
                </button>
                {showDropdown && (
                  <div className="dropdown-menu">
                    <button className="dropdown-item" onClick={() => {
                      setShowDropdown(false);
                      setShowCreateGroupModal(true);
                    }}>
                      <img src="/assets/chats/Channel.svg" alt="Channel" className="dropdown-icon" />
                      <span>Create Group</span>
                    </button>
                    <button className="dropdown-item" onClick={() => {
                      setShowDropdown(false);
                      // TODO: Implement Create Agent
                      console.log('Create Agent');
                    }}>
                      <img src="/assets/chats/agent.svg" alt="Agent" className="dropdown-icon" />
                      <span>Create Agent</span>
                    </button>
                    <button className="dropdown-item" onClick={() => {
                      setShowDropdown(false);
                      // TODO: Implement Add Contact
                      console.log('Add Contact');
                    }}>
                      <img src="/assets/chats/Contacts.svg" alt="Contact" className="dropdown-icon" />
                      <span>Add Contact</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="chats-search">
              <i className="ph-magnifying-glass"></i>
              <input 
                type="text" 
                placeholder="Search by @username..." 
                value={searchQuery}
                onChange={handleSearchChange}
              />
              {isSearching && <i className="ph-spinner-gap spin-icon"></i>}
            </div>

            {showSearchResults && (
              <div className="search-results">
                {searchResults.users.length === 0 && searchResults.groups.length === 0 ? (
                  <div className="search-no-results">
                    <p>No users or groups found</p>
                  </div>
                ) : (
                  <>
                    {searchResults.users.length > 0 && (
                      <div className="search-section">
                        <div className="search-section-title">Users</div>
                        {searchResults.users.map(user => (
                          <div
                            key={`search-user-${user.id}`}
                            className="search-result-item"
                            onClick={() => handleUserClick(user)}
                          >
                            <div className="chat-avatar">
                              <img src={user.avatar_url || '/assets/chats/Contacts.svg'} alt={user.username} />
                            </div>
                            <div className="search-result-info">
                              <h4>{user.full_name || user.username}</h4>
                              <p>@{user.username}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {searchResults.groups.length > 0 && (
                      <div className="search-section">
                        <div className="search-section-title">Open Groups</div>
                        {searchResults.groups.map(group => (
                          <div
                            key={`search-group-${group.id}`}
                            className="search-result-item"
                            onClick={() => handleGroupClick(group)}
                          >
                            <div className="chat-avatar">
                              <img src={group.avatar_url || '/assets/chats/Channel.svg'} alt={group.name} />
                            </div>
                            <div className="search-result-info">
                              <h4>{group.name}</h4>
                              <p>@{group.username}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="chats-list">
              {/* Группы пользователя */}
              {groups.map(group => (
                <div
                  key={`group-${group.id}`}
                  className={`chat-item ${selectedChat?.id === group.id ? 'active' : ''}`}
                  onClick={() => setSelectedChat({ ...group, type: 'group' })}
                >
                  <div className="chat-avatar">
                    <img src={group.avatar_url || '/assets/chats/Channel.svg'} alt={group.name} />
                  </div>
                  <div className="chat-info">
                    <div className="chat-header">
                      <h3>{group.name}</h3>
                      <span className="chat-time">{new Date(group.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="chat-preview">
                      <p>{group.username}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Боты и контакты */}
              {chats.map(chat => (
                <div
                  key={chat.id}
                  className={`chat-item ${selectedChat?.id === chat.id ? 'active' : ''}`}
                  onClick={() => setSelectedChat(chat)}
                >
                  <div className="chat-avatar">
                    <img src={chat.avatar} alt={chat.name} />
                    {chat.online && <span className="online-indicator"></span>}
                  </div>
                  <div className="chat-info">
                    <div className="chat-header">
                      <h3>{chat.name}</h3>
                      <span className="chat-time">{chat.time}</span>
                    </div>
                    <div className="chat-preview">
                      <p>{chat.lastMessage}</p>
                      {chat.unread > 0 && (
                        <span className="unread-badge">{chat.unread}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="chats-main">
            {selectedChat ? (
              <>
                <div className="chat-header">
                  <div className="chat-header-info">
                    <img src={selectedChat.avatar} alt={selectedChat.name} />
                    <div>
                      <h3>{selectedChat.name}</h3>
                      <span className={selectedChat.online ? 'online' : 'offline'}>
                        {selectedChat.online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  <div className="chat-header-actions">
                    {selectedChat.type === 'agents' && (
                      <button 
                        className="icon-button" 
                        onClick={loadAgentMessages}
                        title="Reload messages"
                      >
                        <i className="ph-arrow-clockwise"></i>
                      </button>
                    )}
                    <button className="icon-button">
                      <i className="ph-phone"></i>
                    </button>
                    <button className="icon-button">
                      <i className="ph-video-camera"></i>
                    </button>
                    <button className="icon-button">
                      <i className="ph-dots-three-vertical"></i>
                    </button>
                  </div>
                </div>

                <div className="chat-messages">
                  {messages.map(msg => (
                    <div key={msg.id} className={`message ${msg.sender}`}>
                      {(msg.sender === 'bot' || msg.sender === 'agent') && (
                        <img src={selectedChat.avatar} alt="Bot" className="message-avatar" />
                      )}
                      <div className="message-content">
                        <div className="message-bubble">
                          {msg.sender === 'agent' && (
                            <div className="agent-message-header">
                              <span className="agent-name">{msg.agentName}</span>
                              <span className="agent-role">{msg.agentRole}</span>
                              {msg.context?.crypto_symbol && (
                                <span className="crypto-badge">{msg.context.crypto_symbol}</span>
                              )}
                            </div>
                          )}
                          <p>
                            {msg.text}
                            <span className="message-time">{msg.time}</span>
                          </p>
                        </div>
                      </div>
                      {msg.sender === 'user' && (
                        <img src={userData.gravatarUrl} alt="You" className="message-avatar" />
                      )}
                    </div>
                  ))}
                </div>

                <form className="chat-input" onSubmit={handleSendMessage}>
                  <button type="button" className="icon-button">
                    <i className="ph-paperclip"></i>
                  </button>
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <button type="submit" className="send-button">
                    <i className="ph-paper-plane-tilt"></i>
                  </button>
                </form>
              </>
            ) : (
              <div className="no-chat-selected">
                <i className="ph-chats-circle"></i>
                <h3>Select a chat to start messaging</h3>
                <p>Choose from your existing conversations or start a new one</p>
              </div>
            )}
          </div>
        </div>

        <CreateGroupModal
          isOpen={showCreateGroupModal}
          onClose={() => setShowCreateGroupModal(false)}
          onComplete={handleCreateGroup}
        />
      </div>
    );
  };

export default Chats;
