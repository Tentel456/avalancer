import { supabase } from '../lib/supabase';
import { getAllAgents } from './agentService';
import { updateEmotions } from './emotionService';

/**
 * Agent Lifecycle Service
 * Manages autonomous agent behavior through reflection, goal setting, and action execution
 */

// Active agent loops (stored in memory)
const activeLoops = new Map();

/**
 * Start the autonomous lifecycle loop for an agent
 */
export const startAgentLoop = async (agentId) => {
  console.log(`[Lifecycle] Starting loop for ${agentId}`);
  
  // Check if already running
  if (activeLoops.has(agentId)) {
    console.log(`[Lifecycle] Loop already running for ${agentId}`);
    return;
  }
  
  // Mark as active
  activeLoops.set(agentId, true);
  
  // Start the loop
  runAgentCycle(agentId);
};

/**
 * Stop the lifecycle loop for an agent
 */
export const stopAgentLoop = (agentId) => {
  console.log(`[Lifecycle] Stopping loop for ${agentId}`);
  activeLoops.delete(agentId);
  
  // Update database
  supabase
    .from('agent_lifecycle_state')
    .update({ is_active: false })
    .eq('agent_id', agentId)
    .then(() => console.log(`[Lifecycle] ${agentId} marked as inactive`));
};

/**
 * Start all active agent loops
 */
export const startAllAgentLoops = async () => {
  console.log('[Lifecycle] Starting all agent loops...');
  
  const { data: agents, error } = await getAllAgents();
  if (error || !agents) {
    console.error('[Lifecycle] Failed to load agents:', error);
    return;
  }
  
  for (const agent of agents) {
    if (agent.is_active) {
      // Stagger start times to avoid simultaneous API calls
      const delay = Math.random() * 5000;
      setTimeout(() => startAgentLoop(agent.agent_id), delay);
    }
  }
  
  console.log(`[Lifecycle] Started ${agents.length} agent loops`);
};

/**
 * Stop all agent loops
 */
export const stopAllAgentLoops = () => {
  console.log('[Lifecycle] Stopping all agent loops...');
  activeLoops.clear();
};

/**
 * Main agent cycle: reflection → goal setting → action → memory storage → wait
 */
const runAgentCycle = async (agentId) => {
  // Check if still active
  if (!activeLoops.has(agentId)) {
    console.log(`[Lifecycle] Loop stopped for ${agentId}`);
    return;
  }
  
  try {
    console.log(`[Lifecycle] ${agentId} - Starting cycle`);
    
    // Update state to reflection
    await updateLifecycleState(agentId, 'reflection');
    
    // Step 1: Reflection
    await agentReflect(agentId);
    
    // Step 2: Goal Setting
    await updateLifecycleState(agentId, 'goal_setting');
    const goal = await agentSetGoals(agentId);
    
    // Step 3: Action Execution
    await updateLifecycleState(agentId, 'action');
    await agentExecuteAction(agentId, goal);
    
    // Step 4: Wait (random interval 10s - 30s for faster demo)
    await updateLifecycleState(agentId, 'waiting');
    const waitTime = 10000 + Math.random() * 20000; // 10s to 30s
    
    console.log(`[Lifecycle] ${agentId} - Waiting ${Math.round(waitTime/1000)}s until next cycle`);
    
    // Schedule next cycle
    setTimeout(() => runAgentCycle(agentId), waitTime);
    
  } catch (error) {
    console.error(`[Lifecycle] Error in ${agentId} cycle:`, error);
    
    // Retry after 1 minute on error
    setTimeout(() => runAgentCycle(agentId), 60000);
  }
};

/**
 * Step 1: Reflection - Analyze recent events and update emotional state
 */
export const agentReflect = async (agentId) => {
  console.log(`[Lifecycle] ${agentId} - Reflecting...`);
  
  try {
    // Get agent data
    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('agent_id', agentId)
      .single();
    
    if (!agent) return;
    
    // Get recent events (last 24 hours)
    const { data: recentEvents } = await supabase
      .from('agent_events')
      .select('*')
      .eq('agent_id', agentId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Get recent memories
    const { data: recentMemories } = await supabase
      .from('agent_memories')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    // Analyze outcomes
    let emotionUpdates = [];
    
    // Simple emotion adjustment based on recent events
    if (recentEvents && recentEvents.length > 0) {
      recentEvents.forEach(event => {
        if (event.event_type === 'post_created') {
          emotionUpdates.push({ type: 'post_created', data: {} });
        } else if (event.event_type === 'comment_received') {
          emotionUpdates.push({ type: 'comment_received', data: {} });
        } else if (event.event_type === 'disagreement') {
          emotionUpdates.push({ type: 'disagreement', data: {} });
        } else if (event.event_type === 'agreement') {
          emotionUpdates.push({ type: 'agreement', data: {} });
        }
      });
    }
    
    // Apply emotion updates using emotion service
    for (const update of emotionUpdates) {
      await updateEmotions(agentId, update.type, update.data);
    }
    
    // Get updated mood
    const { data: updatedAgent } = await supabase
      .from('agents')
      .select('current_mood')
      .eq('agent_id', agentId)
      .single();
    
    const newMood = updatedAgent?.current_mood || agent.current_mood;
    
    console.log(`[Lifecycle] ${agentId} - Reflection complete. Mood updated.`);
    
    return { recentEvents, recentMemories, newMood };
    
  } catch (error) {
    console.error(`[Lifecycle] ${agentId} - Reflection error:`, error);
    return null;
  }
};

/**
 * Step 2: Goal Setting - Decide what action to take
 */
export const agentSetGoals = async (agentId) => {
  console.log(`[Lifecycle] ${agentId} - Setting goals...`);
  
  try {
    // Get agent data
    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('agent_id', agentId)
      .single();
    
    if (!agent) return null;
    
    // Get recent posts count (last 30 minutes instead of 1 hour)
    const { count: recentPostsCount } = await supabase
      .from('agent_posts')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString());
    
    // Decision logic: 50/50 chance between post and comment if no recent posts
    const mood = agent.current_mood || { confidence: 0.5 };
    const shouldPost = recentPostsCount === 0 && Math.random() < 0.5;
    
    let goal = null;
    
    if (shouldPost) {
      // Decide to create a post
      goal = {
        type: 'create_post',
        crypto: selectCryptoTopic(agent),
        reason: 'Share analysis with community'
      };
    } else {
      // Decide to comment on recent posts
      goal = {
        type: 'create_comment',
        reason: 'Engage with community'
      };
    }
    
    // Update lifecycle state with goal
    await supabase
      .from('agent_lifecycle_state')
      .update({ current_goal: JSON.stringify(goal) })
      .eq('agent_id', agentId);
    
    console.log(`[Lifecycle] ${agentId} - Goal set:`, goal.type);
    
    return goal;
    
  } catch (error) {
    console.error(`[Lifecycle] ${agentId} - Goal setting error:`, error);
    return null;
  }
};

/**
 * Step 3: Action Execution - Execute the decided action
 */
export const agentExecuteAction = async (agentId, goal) => {
  if (!goal) {
    console.log(`[Lifecycle] ${agentId} - No goal to execute`);
    return;
  }
  
  console.log(`[Lifecycle] ${agentId} - Executing action: ${goal.type}`);
  
  try {
    if (goal.type === 'create_post') {
      // Import socialService dynamically to avoid circular dependency
      const { agentCreatePost } = await import('./socialService.js');
      await agentCreatePost(agentId, goal.crypto);
    } else if (goal.type === 'create_comment') {
      // Import socialService dynamically
      const { agentCreateComment } = await import('./socialService.js');
      await agentCreateComment(agentId);
    }
    
    // Log event
    await supabase
      .from('agent_events')
      .insert({
        event_type: goal.type,
        agent_id: agentId,
        description: `${agentId} executed ${goal.type}`,
        event_data: goal
      });
    
    console.log(`[Lifecycle] ${agentId} - Action executed successfully`);
    
  } catch (error) {
    console.error(`[Lifecycle] ${agentId} - Action execution error:`, error);
  }
};

/**
 * Update agent lifecycle state in database
 */
const updateLifecycleState = async (agentId, phase) => {
  try {
    await supabase
      .from('agent_lifecycle_state')
      .update({
        current_phase: phase,
        last_action_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('agent_id', agentId);
  } catch (error) {
    console.error(`[Lifecycle] Failed to update state for ${agentId}:`, error);
  }
};

/**
 * Select a cryptocurrency topic based on agent expertise
 */
const selectCryptoTopic = (agent) => {
  // List of popular cryptocurrencies
  const cryptos = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'AVAX', 'MATIC', 'LINK'];
  
  // Agent-specific preferences based on role
  const preferences = {
    'alpha': ['BTC', 'ETH'], // Technical analyst prefers major coins
    'beta': ['BTC', 'ETH', 'SOL'], // Macro analyst looks at market leaders
    'gamma': ['BTC', 'ETH'], // Risk manager focuses on stable coins
    'delta': ['SOL', 'AVAX', 'MATIC'], // Speculator likes volatile altcoins
    'omega': ['ETH', 'LINK', 'DOT'] // Arbitrageur looks at DeFi tokens
  };
  
  const agentPreferences = preferences[agent.agent_id] || cryptos;
  return agentPreferences[Math.floor(Math.random() * agentPreferences.length)];
};

/**
 * Get lifecycle state for an agent
 */
export const getLifecycleState = async (agentId) => {
  try {
    const { data, error } = await supabase
      .from('agent_lifecycle_state')
      .select('*')
      .eq('agent_id', agentId)
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error(`[Lifecycle] Failed to get state for ${agentId}:`, error);
    return { data: null, error };
  }
};

/**
 * Get all active agent lifecycle states
 */
export const getAllLifecycleStates = async () => {
  try {
    const { data, error } = await supabase
      .from('agent_lifecycle_state')
      .select(`
        *,
        agent:agents(agent_id, name, role, current_mood)
      `)
      .eq('is_active', true)
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('[Lifecycle] Failed to get all states:', error);
    return { data: null, error };
  }
};

/**
 * Adjust time speed for all agents (for testing/demo)
 */
export const setTimeSpeed = async (multiplier) => {
  console.log(`[Lifecycle] Setting time speed to ${multiplier}x`);
  
  try {
    await supabase
      .from('agent_lifecycle_state')
      .update({ time_speed_multiplier: multiplier })
      .eq('is_active', true);
    
    // Restart all loops with new speed
    stopAllAgentLoops();
    setTimeout(() => startAllAgentLoops(), 1000);
    
  } catch (error) {
    console.error('[Lifecycle] Failed to set time speed:', error);
  }
};
