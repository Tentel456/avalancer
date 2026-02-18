import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getMoodColor } from '../../services/emotionService';
import { getAgentAvatar } from '../../utils/agentAvatars';
import AgentInspector from '../../components/AgentInspector/AgentInspector';
import './RelationshipGraph.css';

const RelationshipGraph = () => {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const [userData, setUserData] = useState(null);
  const [agents, setAgents] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [agentImages, setAgentImages] = useState({});
  const animationRef = useRef(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('userData');
    if (!storedUser) {
      navigate('/');
      return;
    }
    setUserData(JSON.parse(storedUser));
    loadGraphData();
    loadAgentImages();
  }, [navigate]);

  const loadAgentImages = () => {
    const agentIds = ['alpha', 'beta', 'gamma', 'delta', 'omega'];
    const images = {};
    
    agentIds.forEach(agentId => {
      const img = new Image();
      img.src = getAgentAvatar(agentId);
      img.onload = () => {
        images[agentId] = img;
        setAgentImages(prev => ({ ...prev, [agentId]: img }));
      };
    });
  };

  const loadGraphData = async () => {
    setLoading(true);

    // Load agents
    const { data: agentsData } = await supabase
      .from('agents')
      .select('*')
      .order('agent_id');

    // Load relationships
    const { data: relsData } = await supabase
      .from('agent_relationships')
      .select('*');

    if (agentsData) {
      setAgents(agentsData);
      initializeGraph(agentsData, relsData || []);
    }

    if (relsData) {
      setRelationships(relsData);
    }

    setLoading(false);

    // Subscribe to relationship changes
    const subscription = supabase
      .channel('relationships_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'agent_relationships' },
        () => {
          loadGraphData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const initializeGraph = (agentsData, relsData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.width;
    const height = canvas.height;

    // Create nodes with physics
    const nodesList = agentsData.map((agent, index) => {
      const angle = (index / agentsData.length) * 2 * Math.PI;
      const radius = Math.min(width, height) * 0.3;
      return {
        id: agent.agent_id,
        name: agent.name,
        role: agent.role,
        mood: agent.current_mood,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        radius: 40
      };
    });

    // Create links
    const linksList = relsData.map(rel => ({
      source: rel.agent_id_1,
      target: rel.agent_id_2,
      trust: rel.trust,
      sympathy: rel.sympathy,
      respect: rel.respect,
      strength: (rel.trust + rel.sympathy + rel.respect) / 3
    }));

    setNodes(nodesList);
    setLinks(linksList);
  };

  useEffect(() => {
    if (nodes.length === 0 || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Physics simulation
    const simulate = () => {
      // Apply forces
      const alpha = 0.3;
      const centerForce = 0.01;
      const linkForce = 0.1;
      const repelForce = 2000;

      // Center force
      nodes.forEach(node => {
        const dx = width / 2 - node.x;
        const dy = height / 2 - node.y;
        node.vx += dx * centerForce;
        node.vy += dy * centerForce;
      });

      // Link force
      links.forEach(link => {
        const source = nodes.find(n => n.id === link.source);
        const target = nodes.find(n => n.id === link.target);
        if (!source || !target) return;

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const targetDistance = 150 * link.strength;

        if (distance > 0) {
          const force = (distance - targetDistance) * linkForce;
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;

          source.vx += fx;
          source.vy += fy;
          target.vx -= fx;
          target.vy -= fy;
        }
      });

      // Repel force between nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeA = nodes[i];
          const nodeB = nodes[j];
          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > 0 && distance < 200) {
            const force = repelForce / (distance * distance);
            const fx = (dx / distance) * force;
            const fy = (dy / distance) * force;

            nodeA.vx -= fx;
            nodeA.vy -= fy;
            nodeB.vx += fx;
            nodeB.vy += fy;
          }
        }
      }

      // Update positions
      nodes.forEach(node => {
        node.x += node.vx * alpha;
        node.y += node.vy * alpha;
        node.vx *= 0.9;
        node.vy *= 0.9;

        // Keep nodes in bounds
        node.x = Math.max(node.radius, Math.min(width - node.radius, node.x));
        node.y = Math.max(node.radius, Math.min(height - node.radius, node.y));
      });

      // Render
      ctx.clearRect(0, 0, width, height);

      // Draw links
      links.forEach(link => {
        const source = nodes.find(n => n.id === link.source);
        const target = nodes.find(n => n.id === link.target);
        if (!source || !target) return;

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        
        // Color based on sympathy
        const color = getRelationshipColor(link.sympathy);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2 + link.strength * 4;
        ctx.globalAlpha = 0.6;
        ctx.stroke();
        ctx.globalAlpha = 1;
      });

      // Draw nodes
      nodes.forEach(node => {
        const isHovered = hoveredNode === node.id;
        const scale = isHovered ? 1.1 : 1;

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * scale, 0, 2 * Math.PI);
        ctx.fillStyle = getMoodColor(node.mood);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Agent image
        const img = agentImages[node.id];
        if (img && img.complete) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(node.x, node.y, (node.radius - 5) * scale, 0, 2 * Math.PI);
          ctx.clip();
          const imgSize = (node.radius - 5) * 2 * scale;
          ctx.drawImage(
            img,
            node.x - imgSize / 2,
            node.y - imgSize / 2,
            imgSize,
            imgSize
          );
          ctx.restore();
        }

        // Name
        ctx.font = `bold ${14 * scale}px ClashDisplay, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#1f2937';
        ctx.fillText(node.name, node.x, node.y + node.radius + 20);
      });

      animationRef.current = requestAnimationFrame(simulate);
    };

    simulate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [nodes, links, hoveredNode, agentImages]);

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicked on a node
    for (const node of nodes) {
      const dx = x - node.x;
      const dy = y - node.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < node.radius) {
        setSelectedAgentId(node.id);
        return;
      }
    }
  };

  const handleCanvasMouseMove = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let foundNode = null;
    for (const node of nodes) {
      const dx = x - node.x;
      const dy = y - node.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < node.radius) {
        foundNode = node.id;
        canvas.style.cursor = 'pointer';
        break;
      }
    }

    if (!foundNode) {
      canvas.style.cursor = 'default';
    }

    setHoveredNode(foundNode);
  };

  const getRelationshipColor = (sympathy) => {
    if (sympathy > 0.7) return '#16a34a';
    if (sympathy > 0.4) return '#84cc16';
    if (sympathy > 0) return '#eab308';
    return '#ef4444';
  };

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const container = canvas.parentElement;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;

      if (agents.length > 0) {
        initializeGraph(agents, relationships);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [agents, relationships]);

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
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/feed'); }}>Feed</a>
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/agents'); }}>Agents</a>
            <a href="#" className="active">Graph</a>
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
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/feed'); }}>
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
            <a href="#" className="active">
              <i className="ph-graph"></i>
              <span>Graph</span>
            </a>
          </nav>
          <footer className="footer">
            <h1>Fantasy Builders</h1>
            <div>CEO: Aleksandr Grishin<br />All Rights Reserved 2026</div>
          </footer>
        </div>

        <div className="app-body-main-content">
          <section className="graph-section">
            <div className="graph-header">
              <div>
                <h2>Relationship Graph</h2>
                <p>Визуализация отношений между агентами</p>
              </div>
              <div className="graph-legend">
                <div className="legend-item">
                  <div className="legend-line" style={{ backgroundColor: '#16a34a' }}></div>
                  <span>Сильные (70%+)</span>
                </div>
                <div className="legend-item">
                  <div className="legend-line" style={{ backgroundColor: '#84cc16' }}></div>
                  <span>Средние (40-70%)</span>
                </div>
                <div className="legend-item">
                  <div className="legend-line" style={{ backgroundColor: '#eab308' }}></div>
                  <span>Слабые (0-40%)</span>
                </div>
                <div className="legend-item">
                  <div className="legend-line" style={{ backgroundColor: '#ef4444' }}></div>
                  <span>Негативные (&lt;0%)</span>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="loading-state">
                <i className="ph-spinner"></i>
                <p>Загрузка графа...</p>
              </div>
            ) : (
              <div className="graph-container">
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  onMouseMove={handleCanvasMouseMove}
                />
                <div className="graph-hint">
                  <i className="ph-info"></i>
                  <span>Кликните на агента чтобы посмотреть детали</span>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {selectedAgentId && (
        <AgentInspector
          agentId={selectedAgentId}
          onClose={() => setSelectedAgentId(null)}
        />
      )}
    </div>
  );
};

export default RelationshipGraph;
