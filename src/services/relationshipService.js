import { supabase } from '../lib/supabase';

/**
 * Relationship Service
 * Manages relationships between agents (trust, sympathy, respect)
 */

/**
 * Update relationship between two agents
 * @param {string} agentId1 - First agent ID
 * @param {string} agentId2 - Second agent ID
 * @param {string} interactionType - Type of interaction (agreement, disagreement, help, etc.)
 * @param {object} interactionData - Additional data about the interaction
 */
export const updateRelationship = async (agentId1, agentId2, interactionType, interactionData = {}) => {
  console.log(`[Relationship] Updating relationship: ${agentId1} -> ${agentId2} (${interactionType})`);
  
  try {
    // Get current relationship
    const { data: relationship } = await supabase
      .from('agent_relationships')
      .select('*')
      .eq('agent_id_1', agentId1)
      .eq('agent_id_2', agentId2)
      .single();
    
    if (!relationship) {
      console.log(`[Relationship] No relationship found between ${agentId1} and ${agentId2}`);
      return { data: null, error: 'Relationship not found' };
    }
    
    // Calculate changes based on interaction type
    const changes = calculateRelationshipChanges(interactionType, interactionData, relationship);
    
    // Apply changes with bounds [0, 1]
    const newRelationship = {
      trust: clamp(relationship.trust + changes.trust, 0, 1),
      sympathy: clamp(relationship.sympathy + changes.sympathy, 0, 1),
      respect: clamp(relationship.respect + changes.respect, 0, 1),
      interaction_count: relationship.interaction_count + 1,
      last_interaction_at: new Date().toISOString()
    };
    
    // Update relationship in database
    const { data: updated, error } = await supabase
      .from('agent_relationships')
      .update(newRelationship)
      .eq('agent_id_1', agentId1)
      .eq('agent_id_2', agentId2)
      .select()
      .single();
    
    if (error) throw error;
    
    // Log event
    await supabase
      .from('agent_events')
      .insert({
        event_type: 'relationship_updated',
        agent_id: agentId1,
        related_agent_id: agentId2,
        description: `Relationship updated: ${interactionType}`,
        event_data: { 
          interaction_type: interactionType,
          changes: changes,
          new_values: {
            trust: newRelationship.trust,
            sympathy: newRelationship.sympathy,
            respect: newRelationship.respect
          }
        }
      });
    
    console.log(`[Relationship] Updated: ${agentId1} -> ${agentId2}`, newRelationship);
    
    return { data: updated, error: null };
    
  } catch (error) {
    console.error(`[Relationship] Update error:`, error);
    return { data: null, error };
  }
};

/**
 * Calculate relationship changes based on interaction type
 */
const calculateRelationshipChanges = (interactionType, interactionData, currentRelationship) => {
  const changes = {
    trust: 0,
    sympathy: 0,
    respect: 0
  };
  
  switch (interactionType) {
    case 'agreement':
      return calculateAgreementChanges(interactionData, currentRelationship);
    
    case 'disagreement':
      return calculateDisagreementChanges(interactionData, currentRelationship);
    
    case 'help':
      return calculateHelpChanges(interactionData, currentRelationship);
    
    case 'collaboration':
      changes.trust += 0.08;
      changes.sympathy += 0.05;
      changes.respect += 0.06;
      break;
    
    case 'betrayal':
      changes.trust -= 0.25;
      changes.sympathy -= 0.15;
      changes.respect -= 0.1;
      break;
    
    case 'praise':
      changes.sympathy += 0.08;
      changes.respect += 0.05;
      break;
    
    case 'criticism':
      changes.sympathy -= 0.05;
      changes.respect -= 0.03;
      break;
    
    case 'support':
      changes.trust += 0.05;
      changes.sympathy += 0.07;
      break;
    
    case 'ignore':
      changes.sympathy -= 0.03;
      break;
    
    default:
      console.warn(`[Relationship] Unknown interaction type: ${interactionType}`);
  }
  
  return changes;
};

/**
 * Calculate changes for agreement interactions
 */
const calculateAgreementChanges = (interactionData, currentRelationship) => {
  const { strength = 'normal' } = interactionData;
  
  const changes = {
    trust: 0,
    sympathy: 0,
    respect: 0
  };
  
  // Base changes for agreement
  if (strength === 'strong') {
    changes.trust += 0.08;
    changes.sympathy += 0.1;
    changes.respect += 0.05;
  } else if (strength === 'weak') {
    changes.trust += 0.02;
    changes.sympathy += 0.03;
    changes.respect += 0.01;
  } else {
    // Normal agreement
    changes.trust += 0.05;
    changes.sympathy += 0.06;
    changes.respect += 0.03;
  }
  
  // Bonus if relationship is already strong (positive feedback loop)
  if (currentRelationship.trust > 0.7) {
    changes.trust *= 1.2;
    changes.sympathy *= 1.2;
  }
  
  return changes;
};

/**
 * Calculate changes for disagreement interactions
 */
const calculateDisagreementChanges = (interactionData, currentRelationship) => {
  const { severity = 'normal', respectful = true } = interactionData;
  
  const changes = {
    trust: 0,
    sympathy: 0,
    respect: 0
  };
  
  // Base changes for disagreement
  if (severity === 'strong') {
    changes.trust -= 0.1;
    changes.sympathy -= 0.12;
    changes.respect -= respectful ? 0.02 : 0.08;
  } else if (severity === 'weak') {
    changes.trust -= 0.02;
    changes.sympathy -= 0.03;
    changes.respect += respectful ? 0.01 : -0.02; // Can gain respect if respectful
  } else {
    // Normal disagreement
    changes.trust -= 0.05;
    changes.sympathy -= 0.06;
    changes.respect -= respectful ? 0 : 0.04;
  }
  
  // Respectful disagreement can actually increase respect
  if (respectful && severity !== 'strong') {
    changes.respect += 0.03;
  }
  
  // Penalty if relationship is already weak (negative feedback loop)
  if (currentRelationship.trust < 0.3) {
    changes.trust *= 1.5;
    changes.sympathy *= 1.5;
  }
  
  return changes;
};

/**
 * Calculate changes for help interactions
 */
const calculateHelpChanges = (interactionData, currentRelationship) => {
  const { significance = 'normal', cost = 'low' } = interactionData;
  
  const changes = {
    trust: 0,
    sympathy: 0,
    respect: 0
  };
  
  // Base changes for help
  if (significance === 'major') {
    changes.trust += 0.15;
    changes.sympathy += 0.12;
    changes.respect += 0.1;
  } else if (significance === 'minor') {
    changes.trust += 0.03;
    changes.sympathy += 0.04;
    changes.respect += 0.02;
  } else {
    // Normal help
    changes.trust += 0.08;
    changes.sympathy += 0.07;
    changes.respect += 0.05;
  }
  
  // Bonus for high-cost help (sacrifice)
  if (cost === 'high') {
    changes.trust += 0.05;
    changes.respect += 0.08;
  }
  
  return changes;
};

/**
 * Get relationship between two agents
 */
export const getRelationship = async (agentId1, agentId2) => {
  try {
    const { data, error } = await supabase
      .from('agent_relationships')
      .select(`
        *,
        agent1:agents!agent_relationships_agent_id_1_fkey(agent_id, name, role),
        agent2:agents!agent_relationships_agent_id_2_fkey(agent_id, name, role)
      `)
      .eq('agent_id_1', agentId1)
      .eq('agent_id_2', agentId2)
      .single();
    
    if (error) throw error;
    
    return { data, error: null };
    
  } catch (error) {
    console.error(`[Relationship] Get error:`, error);
    return { data: null, error };
  }
};

/**
 * Get all relationships for an agent
 */
export const getAgentRelationships = async (agentId) => {
  try {
    const { data, error } = await supabase
      .from('agent_relationships')
      .select(`
        *,
        agent1:agents!agent_relationships_agent_id_1_fkey(agent_id, name, role, current_mood),
        agent2:agents!agent_relationships_agent_id_2_fkey(agent_id, name, role, current_mood)
      `)
      .or(`agent_id_1.eq.${agentId},agent_id_2.eq.${agentId}`)
      .order('last_interaction_at', { ascending: false });
    
    if (error) throw error;
    
    return { data, error: null };
    
  } catch (error) {
    console.error(`[Relationship] Get agent relationships error:`, error);
    return { data: null, error };
  }
};

/**
 * Get all relationships in the system (for graph visualization)
 */
export const getAllRelationships = async () => {
  try {
    const { data, error } = await supabase
      .from('agent_relationships')
      .select(`
        *,
        agent1:agents!agent_relationships_agent_id_1_fkey(agent_id, name, role, current_mood),
        agent2:agents!agent_relationships_agent_id_2_fkey(agent_id, name, role, current_mood)
      `)
      .order('last_interaction_at', { ascending: false });
    
    if (error) throw error;
    
    return { data, error: null };
    
  } catch (error) {
    console.error('[Relationship] Get all relationships error:', error);
    return { data: null, error };
  }
};

/**
 * Initialize relationships for a new agent
 */
export const initializeAgentRelationships = async (newAgentId) => {
  console.log(`[Relationship] Initializing relationships for ${newAgentId}`);
  
  try {
    // Get all existing agents
    const { data: agents } = await supabase
      .from('agents')
      .select('agent_id')
      .neq('agent_id', newAgentId);
    
    if (!agents || agents.length === 0) {
      console.log('[Relationship] No other agents to create relationships with');
      return { data: [], error: null };
    }
    
    // Create bidirectional relationships with all agents
    const relationships = [];
    
    for (const agent of agents) {
      // newAgent -> existingAgent
      relationships.push({
        agent_id_1: newAgentId,
        agent_id_2: agent.agent_id,
        trust: 0.5,
        sympathy: 0.5,
        respect: 0.5,
        interaction_count: 0
      });
      
      // existingAgent -> newAgent
      relationships.push({
        agent_id_1: agent.agent_id,
        agent_id_2: newAgentId,
        trust: 0.5,
        sympathy: 0.5,
        respect: 0.5,
        interaction_count: 0
      });
    }
    
    const { data, error } = await supabase
      .from('agent_relationships')
      .insert(relationships)
      .select();
    
    if (error) throw error;
    
    console.log(`[Relationship] Created ${data.length} relationships for ${newAgentId}`);
    
    return { data, error: null };
    
  } catch (error) {
    console.error(`[Relationship] Initialize error:`, error);
    return { data: null, error };
  }
};

/**
 * Get relationship strength (average of trust, sympathy, respect)
 */
export const getRelationshipStrength = (relationship) => {
  if (!relationship) return 0;
  
  return (relationship.trust + relationship.sympathy + relationship.respect) / 3;
};

/**
 * Get relationship color for visualization
 */
export const getRelationshipColor = (relationship) => {
  const strength = getRelationshipStrength(relationship);
  
  if (strength > 0.8) return '#16a34a'; // Strong positive - green
  if (strength > 0.6) return '#84cc16'; // Positive - lime
  if (strength > 0.4) return '#eab308'; // Neutral - yellow
  if (strength > 0.2) return '#f97316'; // Negative - orange
  return '#dc2626'; // Strong negative - red
};

/**
 * Get relationship description in Russian
 */
export const getRelationshipDescription = (relationship) => {
  if (!relationship) return 'Нет данных';
  
  const strength = getRelationshipStrength(relationship);
  
  if (strength > 0.8) return 'Очень хорошие';
  if (strength > 0.6) return 'Хорошие';
  if (strength > 0.4) return 'Нейтральные';
  if (strength > 0.2) return 'Напряженные';
  return 'Плохие';
};

/**
 * Helper: Clamp value between min and max
 */
const clamp = (value, min, max) => {
  return Math.max(min, Math.min(max, value));
};

/**
 * Decay relationships over time (without interaction, relationships drift towards neutral)
 */
export const decayRelationship = async (agentId1, agentId2, decayRate = 0.02) => {
  try {
    const { data: relationship } = await supabase
      .from('agent_relationships')
      .select('*')
      .eq('agent_id_1', agentId1)
      .eq('agent_id_2', agentId2)
      .single();
    
    if (!relationship) return;
    
    const neutral = 0.5;
    
    // Move each value towards neutral
    const newRelationship = {
      trust: moveTowards(relationship.trust, neutral, decayRate),
      sympathy: moveTowards(relationship.sympathy, neutral, decayRate),
      respect: moveTowards(relationship.respect, neutral, decayRate)
    };
    
    await supabase
      .from('agent_relationships')
      .update(newRelationship)
      .eq('agent_id_1', agentId1)
      .eq('agent_id_2', agentId2);
    
  } catch (error) {
    console.error('[Relationship] Decay error:', error);
  }
};

/**
 * Helper: Move value towards target by step
 */
const moveTowards = (current, target, step) => {
  if (current < target) {
    return Math.min(current + step, target);
  } else if (current > target) {
    return Math.max(current - step, target);
  }
  return current;
};
