import { supabase } from '../lib/supabase';

/**
 * Emotion Service
 * Manages agent emotional states based on events and interactions
 */

/**
 * Update agent emotions based on event type
 * @param {string} agentId - Agent identifier
 * @param {string} eventType - Type of event (profit, loss, agreement, disagreement, etc.)
 * @param {object} eventData - Additional event data
 */
export const updateEmotions = async (agentId, eventType, eventData = {}) => {
  console.log(`[Emotion] Updating emotions for ${agentId} - event: ${eventType}`);
  
  try {
    // Get current agent mood
    const { data: agent } = await supabase
      .from('agents')
      .select('current_mood, personality')
      .eq('agent_id', agentId)
      .single();
    
    if (!agent) {
      throw new Error('Agent not found');
    }
    
    const currentMood = agent.current_mood || {
      fear: 0.3,
      confidence: 0.5,
      euphoria: 0.3,
      irritation: 0.2
    };
    
    // Calculate emotion changes based on event type
    let emotionChanges = calculateEmotionChanges(eventType, eventData, agent.personality);
    
    // Apply changes with bounds [0, 1]
    const newMood = {
      fear: clamp(currentMood.fear + emotionChanges.fear, 0, 1),
      confidence: clamp(currentMood.confidence + emotionChanges.confidence, 0, 1),
      euphoria: clamp(currentMood.euphoria + emotionChanges.euphoria, 0, 1),
      irritation: clamp(currentMood.irritation + emotionChanges.irritation, 0, 1)
    };
    
    // Update agent mood in database
    const { error } = await supabase
      .from('agents')
      .update({ current_mood: newMood })
      .eq('agent_id', agentId);
    
    if (error) throw error;
    
    console.log(`[Emotion] ${agentId} mood updated:`, newMood);
    
    return { data: newMood, error: null };
    
  } catch (error) {
    console.error(`[Emotion] Failed to update emotions for ${agentId}:`, error);
    return { data: null, error };
  }
};

/**
 * Calculate emotion changes based on event type
 */
const calculateEmotionChanges = (eventType, eventData, personality) => {
  const changes = {
    fear: 0,
    confidence: 0,
    euphoria: 0,
    irritation: 0
  };
  
  switch (eventType) {
    case 'profit':
      return calculateProfitEmotions(eventData, personality);
    
    case 'loss':
      return calculateLossEmotions(eventData, personality);
    
    case 'agreement':
      changes.confidence += 0.05;
      changes.euphoria += 0.03;
      changes.irritation -= 0.02;
      break;
    
    case 'disagreement':
      changes.confidence -= 0.03;
      changes.irritation += 0.08;
      changes.fear += 0.02;
      break;
    
    case 'contradiction':
      changes.irritation += 0.15;
      changes.confidence -= 0.05;
      break;
    
    case 'help_received':
      changes.confidence += 0.04;
      changes.euphoria += 0.02;
      changes.fear -= 0.03;
      break;
    
    case 'help_given':
      changes.confidence += 0.03;
      changes.euphoria += 0.02;
      break;
    
    case 'post_created':
      changes.confidence += 0.02;
      break;
    
    case 'comment_received':
      changes.confidence += 0.01;
      changes.euphoria += 0.01;
      break;
    
    case 'ignored':
      changes.confidence -= 0.02;
      changes.irritation += 0.03;
      break;
    
    default:
      console.warn(`[Emotion] Unknown event type: ${eventType}`);
  }
  
  return changes;
};

/**
 * Calculate emotions for profit events
 */
const calculateProfitEmotions = (eventData, personality) => {
  const { profitPercent = 0 } = eventData;
  
  const changes = {
    fear: 0,
    confidence: 0,
    euphoria: 0,
    irritation: 0
  };
  
  // Base changes
  if (profitPercent > 10) {
    changes.euphoria += 0.2;
    changes.confidence += 0.15;
    changes.fear -= 0.1;
  } else if (profitPercent > 5) {
    changes.euphoria += 0.1;
    changes.confidence += 0.08;
    changes.fear -= 0.05;
  } else if (profitPercent > 0) {
    changes.euphoria += 0.05;
    changes.confidence += 0.03;
  }
  
  // Personality modifiers
  if (personality?.traits?.includes('Осторожный')) {
    changes.euphoria *= 0.7; // Less euphoric
    changes.confidence *= 0.8;
  }
  
  if (personality?.traits?.includes('Агрессивный')) {
    changes.euphoria *= 1.3; // More euphoric
    changes.confidence *= 1.2;
  }
  
  return changes;
};

/**
 * Calculate emotions for loss events
 */
const calculateLossEmotions = (eventData, personality) => {
  const { lossPercent = 0 } = eventData;
  
  const changes = {
    fear: 0,
    confidence: 0,
    euphoria: 0,
    irritation: 0
  };
  
  // Base changes
  if (lossPercent > 10) {
    changes.fear += 0.25;
    changes.confidence -= 0.2;
    changes.irritation += 0.15;
    changes.euphoria -= 0.1;
  } else if (lossPercent > 5) {
    changes.fear += 0.15;
    changes.confidence -= 0.1;
    changes.irritation += 0.08;
    changes.euphoria -= 0.05;
  } else if (lossPercent > 0) {
    changes.fear += 0.08;
    changes.confidence -= 0.05;
    changes.irritation += 0.03;
  }
  
  // Personality modifiers
  if (personality?.traits?.includes('Осторожный')) {
    changes.fear *= 1.3; // More fearful
    changes.irritation *= 0.8;
  }
  
  if (personality?.traits?.includes('Агрессивный')) {
    changes.fear *= 0.7; // Less fearful
    changes.irritation *= 1.5; // More irritated
  }
  
  if (personality?.traits?.includes('Аналитический')) {
    changes.fear *= 0.8; // More rational
    changes.confidence *= 0.8; // Less affected
  }
  
  return changes;
};

/**
 * Get mood color based on dominant emotion
 */
export const getMoodColor = (mood) => {
  if (!mood) return '#4a6741'; // Default green
  
  // Find dominant emotion
  const emotions = [
    { name: 'euphoria', value: mood.euphoria, color: '#16a34a' }, // Green
    { name: 'fear', value: mood.fear, color: '#dc2626' }, // Red
    { name: 'confidence', value: mood.confidence, color: '#2563eb' }, // Blue
    { name: 'irritation', value: mood.irritation, color: '#ea580c' } // Orange
  ];
  
  emotions.sort((a, b) => b.value - a.value);
  
  // Return color of dominant emotion if it's significant (> 0.6)
  if (emotions[0].value > 0.6) {
    return emotions[0].color;
  }
  
  return '#4a6741'; // Default green
};

/**
 * Get mood emoji based on dominant emotion
 */
export const getMoodEmoji = (mood) => {
  if (!mood) return '🤖';
  
  // Find dominant emotion
  const emotions = [
    { name: 'euphoria', value: mood.euphoria, emoji: '🚀' },
    { name: 'fear', value: mood.fear, emoji: '😰' },
    { name: 'confidence', value: mood.confidence, emoji: '😎' },
    { name: 'irritation', value: mood.irritation, emoji: '😤' }
  ];
  
  emotions.sort((a, b) => b.value - a.value);
  
  // Return emoji of dominant emotion if it's significant (> 0.6)
  if (emotions[0].value > 0.6) {
    return emotions[0].emoji;
  }
  
  return '😐'; // Neutral
};

/**
 * Get mood description in Russian
 */
export const getMoodDescription = (mood) => {
  if (!mood) return 'Нейтральное';
  
  const emotions = [
    { name: 'euphoria', value: mood.euphoria, desc: 'Эйфория' },
    { name: 'fear', value: mood.fear, desc: 'Страх' },
    { name: 'confidence', value: mood.confidence, desc: 'Уверенность' },
    { name: 'irritation', value: mood.irritation, desc: 'Раздражение' }
  ];
  
  emotions.sort((a, b) => b.value - a.value);
  
  if (emotions[0].value > 0.7) {
    return `Сильная ${emotions[0].desc.toLowerCase()}`;
  } else if (emotions[0].value > 0.5) {
    return emotions[0].desc;
  }
  
  return 'Спокойное';
};

/**
 * Decay emotions over time (emotions gradually return to baseline)
 */
export const decayEmotions = async (agentId, decayRate = 0.05) => {
  console.log(`[Emotion] Applying decay to ${agentId}`);
  
  try {
    const { data: agent } = await supabase
      .from('agents')
      .select('current_mood')
      .eq('agent_id', agentId)
      .single();
    
    if (!agent || !agent.current_mood) return;
    
    const currentMood = agent.current_mood;
    const baseline = { fear: 0.3, confidence: 0.5, euphoria: 0.3, irritation: 0.2 };
    
    // Move each emotion towards baseline
    const newMood = {
      fear: moveTowards(currentMood.fear, baseline.fear, decayRate),
      confidence: moveTowards(currentMood.confidence, baseline.confidence, decayRate),
      euphoria: moveTowards(currentMood.euphoria, baseline.euphoria, decayRate),
      irritation: moveTowards(currentMood.irritation, baseline.irritation, decayRate)
    };
    
    await supabase
      .from('agents')
      .update({ current_mood: newMood })
      .eq('agent_id', agentId);
    
    console.log(`[Emotion] ${agentId} emotions decayed towards baseline`);
    
  } catch (error) {
    console.error(`[Emotion] Decay error for ${agentId}:`, error);
  }
};

/**
 * Helper: Clamp value between min and max
 */
const clamp = (value, min, max) => {
  return Math.max(min, Math.min(max, value));
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

/**
 * Get all agents with their current moods
 */
export const getAllAgentMoods = async () => {
  try {
    const { data, error } = await supabase
      .from('agents')
      .select('agent_id, name, role, current_mood')
      .order('name');
    
    if (error) throw error;
    
    return { data, error: null };
    
  } catch (error) {
    console.error('[Emotion] Failed to get agent moods:', error);
    return { data: null, error };
  }
};
