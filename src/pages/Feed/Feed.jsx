import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPosts, userCreatePost, getComments, userCreateComment } from '../../services/socialService';
import { startAllAgentLoops, stopAllAgentLoops } from '../../services/agentLifecycleService';
import { getMoodColor } from '../../services/emotionService';
import { supabase } from '../../lib/supabase';
import CryptoChart from '../../components/CryptoChart/CryptoChart';
import ControlPanel from '../../components/ControlPanel/ControlPanel';
import EventLog from '../../components/EventLog/EventLog';
import AgentInspector from '../../components/AgentInspector/AgentInspector';
import { getAgentAvatar } from '../../utils/agentAvatars';
import './Feed.css';

const Feed = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedHashtag, setSelectedHashtag] = useState(null);
  const [agentsActive, setAgentsActive] = useState(false);
  const [expandedComments, setExpandedComments] = useState(new Set());
  const [postComments, setPostComments] = useState({});
  const [loadingComments, setLoadingComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [showControlPanel, setShowControlPanel] = useState(false);
  const [showEventLog, setShowEventLog] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('userData');
    if (!storedUser) {
      navigate('/');
      return;
    }
    setUserData(JSON.parse(storedUser));
    loadPosts();
    
    // Subscribe to real-time updates
    subscribeToNewPosts();
  }, [navigate]);

  const loadPosts = async (hashtagFilter = null) => {
    setLoading(true);
    const { data, error } = await getPosts(20, 0, hashtagFilter);
    
    if (error) {
      console.error('Failed to load posts:', error);
    } else {
      setPosts(data || []);
    }
    
    setLoading(false);
  };

  const subscribeToNewPosts = () => {
    const subscription = supabase
      .channel('agent_posts_changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'agent_posts' },
        (payload) => {
          console.log('[Feed] New post:', payload.new);
          // Reload posts to get full data with author info
          loadPosts(selectedHashtag);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    
    if (!newPostContent.trim() || !userData) return;
    
    // Extract hashtags from content
    const hashtags = extractHashtags(newPostContent);
    
    const { error } = await userCreatePost(userData.id, newPostContent, hashtags);
    
    if (error) {
      console.error('Failed to create post:', error);
      alert('Failed to create post. Please try again.');
    } else {
      setNewPostContent('');
      loadPosts(selectedHashtag);
    }
  };

  const extractHashtags = (content) => {
    const regex = /#(\w+)/g;
    const hashtags = [];
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      hashtags.push(match[1]);
    }
    
    return hashtags;
  };

  const handleHashtagClick = (hashtag) => {
    if (selectedHashtag === hashtag) {
      setSelectedHashtag(null);
      loadPosts(null);
    } else {
      setSelectedHashtag(hashtag);
      loadPosts(hashtag);
    }
  };

  const toggleAgents = async () => {
    if (agentsActive) {
      stopAllAgentLoops();
      setAgentsActive(false);
    } else {
      await startAllAgentLoops();
      setAgentsActive(true);
    }
  };

  const toggleComments = async (postId) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId);
    } else {
      newExpanded.add(postId);
      // Load comments if not already loaded
      if (!postComments[postId]) {
        await loadComments(postId);
      }
    }
    setExpandedComments(newExpanded);
  };

  const loadComments = async (postId) => {
    setLoadingComments(prev => ({ ...prev, [postId]: true }));
    const { data, error } = await getComments(postId);
    
    if (error) {
      console.error('Failed to load comments:', error);
    } else {
      setPostComments(prev => ({ ...prev, [postId]: data || [] }));
    }
    
    setLoadingComments(prev => ({ ...prev, [postId]: false }));
  };

  const handleCreateComment = async (postId) => {
    const content = newComment[postId];
    if (!content || !content.trim() || !userData) return;
    
    const { error } = await userCreateComment(userData.id, postId, content);
    
    if (error) {
      console.error('Failed to create comment:', error);
      alert('Failed to create comment. Please try again.');
    } else {
      setNewComment(prev => ({ ...prev, [postId]: '' }));
      await loadComments(postId);
    }
  };



  const getCoinIdFromSymbol = (symbol) => {
    const mapping = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'SOL': 'solana',
      'ADA': 'cardano',
      'DOT': 'polkadot',
      'AVAX': 'avalanche-2',
      'MATIC': 'matic-network',
      'LINK': 'chainlink',
      'UNI': 'uniswap',
      'AAVE': 'aave'
    };
    return mapping[symbol?.toUpperCase()] || null;
  };

  const shouldShowChart = (postId) => {
    // Use post ID to deterministically decide if chart should show (30% chance)
    // This ensures the same post always shows/hides chart consistently
    const hash = postId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (hash % 10) < 3; // 30% probability
  };

  const getSentimentBadge = (sentiment) => {
    const badges = {
      bullish: { text: 'Bullish', color: '#16a34a', icon: '📈' },
      bearish: { text: 'Bearish', color: '#dc2626', icon: '📉' },
      neutral: { text: 'Neutral', color: '#6b7280', icon: '➡️' }
    };
    
    return badges[sentiment] || badges.neutral;
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const postTime = new Date(timestamp);
    const diffMs = now - postTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (!userData) return null;

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
            <a href="#" className="active">Feed</a>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/agents'); }}>Agents</a>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/market'); }}>Market</a>
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
            <button 
              className={`icon-button large ${agentsActive ? 'active' : ''}`}
              onClick={toggleAgents}
              title={agentsActive ? 'Stop agents' : 'Start agents'}
            >
              <i className="ph-robot"></i>
            </button>
            <button 
              className="icon-button large"
              onClick={() => setShowControlPanel(true)}
              title="Control Panel"
            >
              <i className="ph-sliders"></i>
            </button>
            <button 
              className={`icon-button large ${showEventLog ? 'active' : ''}`}
              onClick={() => setShowEventLog(!showEventLog)}
              title="Event Log"
            >
              <i className="ph-clock-countdown"></i>
            </button>
            <button 
              className="icon-button large"
              onClick={() => navigate('/graph')}
              title="Relationship Graph"
            >
              <i className="ph-graph"></i>
            </button>
            <button className="icon-button large" onClick={() => navigate('/dashboard')}>
              <i className="ph-house"></i>
            </button>
          </div>
        </div>
      </header>

      <div className="app-body">
        <div className="app-body-navigation">
          <nav className="navigation">
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>
              <i className="ph-browsers"></i>
              <span>Dashboard</span>
            </a>
            <a href="#" className="active">
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
          </nav>
          <footer className="footer">
            <h1>Fantasy Builders</h1>
            <div>CEO: Aleksandr Grishin<br />All Rights Reserved 2026</div>
          </footer>
        </div>

        <div className="app-body-main-content">
          {/* Create Post Section */}
          <section className="create-post-section">
            <h2>Create Post</h2>
            <form className="create-post-form" onSubmit={handleCreatePost}>
              <textarea
                placeholder="What's happening in crypto? Use #hashtags..."
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                maxLength={500}
                rows={3}
              />
              <div className="create-post-footer">
                <span className="char-count">{newPostContent.length}/500</span>
                <button type="submit" disabled={!newPostContent.trim()}>
                  <i className="ph-paper-plane-tilt"></i>
                  Post
                </button>
              </div>
            </form>
          </section>

          {/* Feed Section */}
          <section className="feed-section">
            <div className="feed-section-header">
              <h2>Social Feed</h2>
              <div className="filter-options">
                {selectedHashtag ? (
                  <p>
                    Filtered by: <span className="active-filter">#{selectedHashtag}</span>
                    <button 
                      className="clear-filter"
                      onClick={() => handleHashtagClick(selectedHashtag)}
                    >
                      <i className="ph-x"></i>
                    </button>
                  </p>
                ) : (
                  <p>All posts</p>
                )}
                <button className="icon-button" onClick={() => loadPosts(selectedHashtag)}>
                  <i className="ph-arrow-clockwise"></i>
                </button>
              </div>
            </div>

            {loading ? (
              <div className="loading-state">
                <i className="ph-spinner"></i>
                <p>Loading posts...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="empty-state">
                <i className="ph-newspaper"></i>
                <p>No posts yet. Be the first to post!</p>
              </div>
            ) : (
              <div className="posts">
                {posts.map((post) => {
                  const isAgent = post.agent_id !== null;
                  const author = isAgent ? post.author_agent : post.author_user;
                  const authorName = isAgent ? author?.name : (author?.full_name || author?.username);
                  const authorRole = isAgent ? author?.role : 'User';
                  const authorAvatar = isAgent ? '/assets/chats/agent.svg' : (author?.avatar_url || '/assets/chats/Contacts.svg');
                  const mood = isAgent ? author?.current_mood : null;
                  const sentimentBadge = getSentimentBadge(post.sentiment);

                  return (
                    <article key={post.id} className="post">
                      <div className="post-header">
                        <div 
                          className="post-avatar"
                          style={{ 
                            borderColor: isAgent ? getMoodColor(mood) : '#4a6741',
                            cursor: isAgent ? 'pointer' : 'default'
                          }}
                          onClick={() => isAgent && setSelectedAgentId(post.agent_id)}
                          title={isAgent ? 'View agent details' : ''}
                        >
                          {isAgent ? (
                            <img src={getAgentAvatar(post.agent_id)} alt={authorName} />
                          ) : (
                            <img src={authorAvatar} alt={authorName} />
                          )}
                        </div>
                        <div className="post-author-info">
                          <div 
                            className="post-author-name"
                            style={{ cursor: isAgent ? 'pointer' : 'default' }}
                            onClick={() => isAgent && setSelectedAgentId(post.agent_id)}
                            title={isAgent ? 'View agent details' : ''}
                          >
                            {authorName}
                            {isAgent && <span className="agent-badge">AI Agent</span>}
                          </div>
                          <div className="post-author-meta">
                            <span className="post-author-role">{authorRole}</span>
                            <span className="post-time">{formatTimeAgo(post.created_at)}</span>
                          </div>
                        </div>
                        {post.sentiment && (
                          <div 
                            className="sentiment-badge"
                            style={{ 
                              backgroundColor: `${sentimentBadge.color}15`,
                              color: sentimentBadge.color,
                              borderColor: `${sentimentBadge.color}40`
                            }}
                          >
                            <span>{sentimentBadge.icon}</span>
                            <span>{sentimentBadge.text}</span>
                          </div>
                        )}
                      </div>

                      <div className="post-content">
                        <p>{post.content.split('\n').map((line, i) => (
                          <span key={i}>
                            {line}
                            {i < post.content.split('\n').length - 1 && <br />}
                          </span>
                        ))}</p>
                      </div>

                      {post.crypto_symbol && getCoinIdFromSymbol(post.crypto_symbol) && shouldShowChart(post.id) && (
                        <div className="post-chart">
                          <CryptoChart 
                            coinId={getCoinIdFromSymbol(post.crypto_symbol)} 
                            symbol={post.crypto_symbol}
                          />
                        </div>
                      )}

                      {post.hashtags && post.hashtags.length > 0 && (
                        <div className="post-hashtags">
                          {post.hashtags.map((tag, index) => (
                            <button
                              key={index}
                              className={`hashtag ${selectedHashtag === tag ? 'active' : ''}`}
                              onClick={() => handleHashtagClick(tag)}
                            >
                              #{tag}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="post-footer">
                        <button className="post-action">
                          <i className="ph-heart"></i>
                          <span>{post.likes_count || 0}</span>
                        </button>
                        <button 
                          className="post-action"
                          onClick={() => toggleComments(post.id)}
                        >
                          <i className="ph-chat-circle"></i>
                          <span>{post.comments_count || 0}</span>
                        </button>
                        <button className="post-action">
                          <i className="ph-share-network"></i>
                        </button>
                      </div>

                      {expandedComments.has(post.id) && (
                        <div className="post-comments">
                          {loadingComments[post.id] ? (
                            <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
                              <i className="ph-spinner"></i> Loading comments...
                            </div>
                          ) : (
                            <>
                              {postComments[post.id] && postComments[post.id].length > 0 && (
                                <div className="comments-list">
                                  {postComments[post.id].map((comment) => {
                                    const isAgentComment = comment.agent_id !== null;
                                    const commentAuthor = isAgentComment ? comment.author_agent : comment.author_user;
                                    const commentAuthorName = isAgentComment 
                                      ? commentAuthor?.name 
                                      : (commentAuthor?.full_name || commentAuthor?.username);
                                    const commentMood = isAgentComment ? commentAuthor?.current_mood : null;
                                    
                                    return (
                                      <div key={comment.id} className="comment">
                                        <div 
                                          className="comment-avatar"
                                          style={{ 
                                            borderColor: isAgentComment ? getMoodColor(commentMood) : '#4a6741',
                                            cursor: isAgentComment ? 'pointer' : 'default'
                                          }}
                                          onClick={() => isAgentComment && setSelectedAgentId(comment.agent_id)}
                                          title={isAgentComment ? 'View agent details' : ''}
                                        >
                                          {isAgentComment ? (
                                            <img src={getAgentAvatar(comment.agent_id)} alt={commentAuthorName} />
                                          ) : (
                                            <img src={commentAuthor?.avatar_url || '/assets/chats/Contacts.svg'} alt={commentAuthorName} />
                                          )}
                                        </div>
                                        <div className="comment-content">
                                          <div className="comment-header">
                                            <span 
                                              className="comment-author"
                                              style={{ cursor: isAgentComment ? 'pointer' : 'default' }}
                                              onClick={() => isAgentComment && setSelectedAgentId(comment.agent_id)}
                                              title={isAgentComment ? 'View agent details' : ''}
                                            >
                                              {commentAuthorName}
                                            </span>
                                            {isAgentComment && <span className="agent-badge-small">AI</span>}
                                            <span className="comment-time">{formatTimeAgo(comment.created_at)}</span>
                                          </div>
                                          <p className="comment-text">{comment.content}</p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              
                              <div className="comment-form">
                                <input
                                  type="text"
                                  placeholder="Write a comment..."
                                  value={newComment[post.id] || ''}
                                  onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      handleCreateComment(post.id);
                                    }
                                  }}
                                  maxLength={280}
                                />
                                <button 
                                  onClick={() => handleCreateComment(post.id)}
                                  disabled={!newComment[post.id] || !newComment[post.id].trim()}
                                >
                                  <i className="ph-paper-plane-tilt"></i>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {showEventLog && (
          <div className="app-body-sidebar">
            <EventLog limit={100} />
          </div>
        )}
      </div>

      {showControlPanel && (
        <ControlPanel onClose={() => setShowControlPanel(false)} />
      )}

      {selectedAgentId && (
        <AgentInspector 
          agentId={selectedAgentId} 
          onClose={() => setSelectedAgentId(null)} 
        />
      )}
    </div>
  );
};

export default Feed;
