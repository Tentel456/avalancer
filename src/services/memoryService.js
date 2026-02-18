import { supabase } from '../lib/supabase';

/**
 * Memory Service
 * Handles agent memory storage, retrieval, and summarization
 */

/**
 * Store episodic memory for an agent
 */
export const storeEpisodicMemory = async (agentId, content, options = {}) => {
  console.log(`[Memory] Storing episodic memory for ${agentId}`);
  
  try {
    const {
      importance = 0.5,
      emotionalValence = 0,
      relatedAgents = [],
      relatedCrypto = null,
      memoryType = 'episodic'
    } = options;
    
    const { data, error } = await supabase
      .from('agent_memories')
      .insert({
        agent_id: agentId,
        memory_type: memoryType,
        content: content,
        importance: importance,
        emotional_valence: emotionalValence,
        related_agents: relatedAgents,
        related_crypto: relatedCrypto
      })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log(`[Memory] Memory stored:`, data.id);
    return { data, error: null };
    
  } catch (error) {
    console.error('[Memory] Store error:', error);
    return { data: null, error };
  }
};

/**
 * Retrieve memories for an agent with filtering
 */
export const retrieveMemories = async (agentId, options = {}) => {
  console.log(`[Memory] Retrieving memories for ${agentId}`);
  
  try {
    const {
      limit = 20,
      memoryType = null,
      relatedAgent = null,
      relatedCrypto = null,
      minImportance = 0,
      sortBy = 'created_at',
      ascending = false
    } = options;
    
    let query = supabase
      .from('agent_memories')
      .select('*')
      .eq('agent_id', agentId)
      .gte('importance', minImportance)
      .order(sortBy, { ascending })
      .limit(limit);
    
    // Apply filters
    if (memoryType) {
      query = query.eq('memory_type', memoryType);
    }
    
    if (relatedAgent) {
      query = query.contains('related_agents', [relatedAgent]);
    }
    
    if (relatedCrypto) {
      query = query.eq('related_crypto', relatedCrypto);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    console.log(`[Memory] Retrieved ${data?.length || 0} memories`);
    return { data, error: null };
    
  } catch (error) {
    console.error('[Memory] Retrieve error:', error);
    return { data: null, error };
  }
};

/**
 * Get recent important memories for context
 */
export const getRecentImportantMemories = async (agentId, limit = 10) => {
  return retrieveMemories(agentId, {
    limit,
    minImportance: 0.6,
    sortBy: 'created_at',
    ascending: false
  });
};

/**
 * Get memories related to specific agent
 */
export const getMemoriesAboutAgent = async (agentId, targetAgentId, limit = 10) => {
  return retrieveMemories(agentId, {
    limit,
    relatedAgent: targetAgentId,
    sortBy: 'importance',
    ascending: false
  });
};

/**
 * Get memories related to specific crypto
 */
export const getMemoriesAboutCrypto = async (agentId, cryptoSymbol, limit = 10) => {
  return retrieveMemories(agentId, {
    limit,
    relatedCrypto: cryptoSymbol,
    sortBy: 'created_at',
    ascending: false
  });
};

/**
 * Summarize memories for an agent (basic version without vector search)
 */
export const summarizeMemories = async (agentId, options = {}) => {
  console.log(`[Memory] Summarizing memories for ${agentId}`);
  
  try {
    const {
      timeframe = 24, // hours
      minImportance = 0.5
    } = options;
    
    // Get memories from timeframe
    const cutoffTime = new Date(Date.now() - timeframe * 60 * 60 * 1000).toISOString();
    
    const { data: memories, error } = await supabase
      .from('agent_memories')
      .select('*')
      .eq('agent_id', agentId)
      .gte('created_at', cutoffTime)
      .gte('importance', minImportance)
      .order('importance', { ascending: false });
    
    if (error) throw error;
    
    if (!memories || memories.length === 0) {
      return {
        data: {
          summary: 'No significant memories in this timeframe.',
          memoryCount: 0,
          topMemories: []
        },
        error: null
      };
    }
    
    // Group by type
    const byType = memories.reduce((acc, mem) => {
      acc[mem.memory_type] = (acc[mem.memory_type] || 0) + 1;
      return acc;
    }, {});
    
    // Get top memories
    const topMemories = memories.slice(0, 5).map(m => ({
      content: m.content,
      importance: m.importance,
      timestamp: m.created_at
    }));
    
    // Calculate emotional trend
    const avgEmotionalValence = memories.reduce((sum, m) => sum + (m.emotional_valence || 0), 0) / memories.length;
    
    // Create summary
    const summary = {
      summary: `In the last ${timeframe} hours: ${memories.length} significant memories recorded. ` +
               `Types: ${Object.entries(byType).map(([type, count]) => `${type} (${count})`).join(', ')}. ` +
               `Emotional trend: ${avgEmotionalValence > 0.2 ? 'positive' : avgEmotionalValence < -0.2 ? 'negative' : 'neutral'}.`,
      memoryCount: memories.length,
      topMemories,
      emotionalTrend: avgEmotionalValence,
      memoryTypes: byType
    };
    
    console.log(`[Memory] Summary created for ${memories.length} memories`);
    return { data: summary, error: null };
    
  } catch (error) {
    console.error('[Memory] Summarize error:', error);
    return { data: null, error };
  }
};

/**
 * Delete old low-importance memories (cleanup)
 */
export const cleanupOldMemories = async (agentId, daysToKeep = 7, minImportanceToKeep = 0.3) => {
  console.log(`[Memory] Cleaning up old memories for ${agentId}`);
  
  try {
    const cutoffTime = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('agent_memories')
      .delete()
      .eq('agent_id', agentId)
      .lt('created_at', cutoffTime)
      .lt('importance', minImportanceToKeep);
    
    if (error) throw error;
    
    console.log(`[Memory] Cleanup complete`);
    return { data, error: null };
    
  } catch (error) {
    console.error('[Memory] Cleanup error:', error);
    return { data: null, error };
  }
};

/**
 * Get memory statistics for an agent
 */
export const getMemoryStats = async (agentId) => {
  console.log(`[Memory] Getting memory stats for ${agentId}`);
  
  try {
    // Total count
    const { count: totalCount } = await supabase
      .from('agent_memories')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agentId);
    
    // Count by type
    const { data: memories } = await supabase
      .from('agent_memories')
      .select('memory_type, importance, emotional_valence')
      .eq('agent_id', agentId);
    
    if (!memories) {
      return {
        data: {
          totalCount: 0,
          byType: {},
          avgImportance: 0,
          avgEmotionalValence: 0
        },
        error: null
      };
    }
    
    const byType = memories.reduce((acc, mem) => {
      acc[mem.memory_type] = (acc[mem.memory_type] || 0) + 1;
      return acc;
    }, {});
    
    const avgImportance = memories.reduce((sum, m) => sum + m.importance, 0) / memories.length;
    const avgEmotionalValence = memories.reduce((sum, m) => sum + (m.emotional_valence || 0), 0) / memories.length;
    
    const stats = {
      totalCount,
      byType,
      avgImportance,
      avgEmotionalValence
    };
    
    console.log(`[Memory] Stats:`, stats);
    return { data: stats, error: null };
    
  } catch (error) {
    console.error('[Memory] Stats error:', error);
    return { data: null, error };
  }
};
