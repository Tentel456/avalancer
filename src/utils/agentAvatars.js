// Utility for getting agent avatar paths

export const getAgentAvatar = (agentId) => {
  const avatars = {
    'alpha': '/assets/agents/alpha.png',
    'beta': '/assets/agents/beta.png',
    'gamma': '/assets/agents/gamma.png',
    'delta': '/assets/agents/delta.png',
    'omega': '/assets/agents/omega.png'
  };
  
  return avatars[agentId] || '/assets/agents/alpha.png';
};

export const getAgentIcon = (agentId) => {
  // Fallback emoji icons (not used anymore but kept for compatibility)
  const icons = {
    'alpha': '🎯',
    'beta': '📊',
    'gamma': '🛡️',
    'delta': '⚡',
    'omega': '🔄'
  };
  return icons[agentId] || '🤖';
};
