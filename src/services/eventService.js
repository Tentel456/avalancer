import { supabase } from '../lib/supabase';

/**
 * Event Service
 * Handles logging and retrieval of agent events
 */

/**
 * Log an event for an agent
 */
export const logEvent = async (eventType, agentId, description, options = {}) => {
  console.log(`[Event] Logging ${eventType} for ${agentId}`);
  
  try {
    const {
      relatedAgentId = null,
      eventData = null
    } = options;
    
    const { data, error } = await supabase
      .from('agent_events')
      .insert({
        event_type: eventType,
        agent_id: agentId,
        related_agent_id: relatedAgentId,
        description: description,
        event_data: eventData
      })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log(`[Event] Event logged:`, data.id);
    return { data, error: null };
    
  } catch (error) {
    console.error('[Event] Log error:', error);
    return { data: null, error };
  }
};

/**
 * Get events with filtering
 */
export const getEvents = async (options = {}) => {
  console.log(`[Event] Getting events`);
  
  try {
    const {
      agentId = null,
      eventType = null,
      relatedAgentId = null,
      limit = 50,
      offset = 0,
      sortBy = 'created_at',
      ascending = false
    } = options;
    
    let query = supabase
      .from('agent_events')
      .select(`
        *,
        agent:agents!agent_events_agent_id_fkey(agent_id, name, role),
        related_agent:agents!agent_events_related_agent_id_fkey(agent_id, name, role)
      `)
      .order(sortBy, { ascending })
      .range(offset, offset + limit - 1);
    
    // Apply filters
    if (agentId) {
      query = query.eq('agent_id', agentId);
    }
    
    if (eventType) {
      query = query.eq('event_type', eventType);
    }
    
    if (relatedAgentId) {
      query = query.eq('related_agent_id', relatedAgentId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    console.log(`[Event] Retrieved ${data?.length || 0} events`);
    return { data, error: null };
    
  } catch (error) {
    console.error('[Event] Get events error:', error);
    return { data: null, error };
  }
};

/**
 * Get recent events for an agent
 */
export const getRecentEvents = async (agentId, limit = 20) => {
  return getEvents({
    agentId,
    limit,
    sortBy: 'created_at',
    ascending: false
  });
};

/**
 * Get events by type
 */
export const getEventsByType = async (eventType, limit = 50) => {
  return getEvents({
    eventType,
    limit,
    sortBy: 'created_at',
    ascending: false
  });
};

/**
 * Get interaction events between two agents
 */
export const getInteractionEvents = async (agentId1, agentId2, limit = 20) => {
  console.log(`[Event] Getting interactions between ${agentId1} and ${agentId2}`);
  
  try {
    const { data, error } = await supabase
      .from('agent_events')
      .select(`
        *,
        agent:agents!agent_events_agent_id_fkey(agent_id, name, role),
        related_agent:agents!agent_events_related_agent_id_fkey(agent_id, name, role)
      `)
      .or(`and(agent_id.eq.${agentId1},related_agent_id.eq.${agentId2}),and(agent_id.eq.${agentId2},related_agent_id.eq.${agentId1})`)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    console.log(`[Event] Retrieved ${data?.length || 0} interaction events`);
    return { data, error: null };
    
  } catch (error) {
    console.error('[Event] Get interactions error:', error);
    return { data: null, error };
  }
};

/**
 * Subscribe to real-time events
 */
export const subscribeToEvents = (callback, options = {}) => {
  console.log(`[Event] Setting up real-time subscription`);
  
  const {
    agentId = null,
    eventType = null
  } = options;
  
  let channel = supabase
    .channel('agent_events_changes')
    .on('postgres_changes', 
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'agent_events',
        ...(agentId && { filter: `agent_id=eq.${agentId}` })
      },
      (payload) => {
        console.log('[Event] New event:', payload.new);
        if (!eventType || payload.new.event_type === eventType) {
          callback(payload.new);
        }
      }
    )
    .subscribe();
  
  return () => {
    channel.unsubscribe();
  };
};

/**
 * Get event statistics
 */
export const getEventStats = async (agentId = null, timeframe = 24) => {
  console.log(`[Event] Getting event stats`);
  
  try {
    const cutoffTime = new Date(Date.now() - timeframe * 60 * 60 * 1000).toISOString();
    
    let query = supabase
      .from('agent_events')
      .select('event_type, created_at')
      .gte('created_at', cutoffTime);
    
    if (agentId) {
      query = query.eq('agent_id', agentId);
    }
    
    const { data: events, error } = await query;
    
    if (error) throw error;
    
    if (!events || events.length === 0) {
      return {
        data: {
          totalCount: 0,
          byType: {},
          eventsPerHour: 0
        },
        error: null
      };
    }
    
    // Count by type
    const byType = events.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {});
    
    const stats = {
      totalCount: events.length,
      byType,
      eventsPerHour: (events.length / timeframe).toFixed(2)
    };
    
    console.log(`[Event] Stats:`, stats);
    return { data: stats, error: null };
    
  } catch (error) {
    console.error('[Event] Stats error:', error);
    return { data: null, error };
  }
};

/**
 * Get event timeline (grouped by hour)
 */
export const getEventTimeline = async (agentId = null, hours = 24) => {
  console.log(`[Event] Getting event timeline`);
  
  try {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    let query = supabase
      .from('agent_events')
      .select('event_type, created_at')
      .gte('created_at', cutoffTime)
      .order('created_at', { ascending: true });
    
    if (agentId) {
      query = query.eq('agent_id', agentId);
    }
    
    const { data: events, error } = await query;
    
    if (error) throw error;
    
    if (!events || events.length === 0) {
      return { data: [], error: null };
    }
    
    // Group by hour
    const timeline = events.reduce((acc, event) => {
      const hour = new Date(event.created_at).toISOString().slice(0, 13) + ':00:00';
      if (!acc[hour]) {
        acc[hour] = { timestamp: hour, count: 0, byType: {} };
      }
      acc[hour].count++;
      acc[hour].byType[event.event_type] = (acc[hour].byType[event.event_type] || 0) + 1;
      return acc;
    }, {});
    
    const timelineArray = Object.values(timeline);
    
    console.log(`[Event] Timeline created with ${timelineArray.length} data points`);
    return { data: timelineArray, error: null };
    
  } catch (error) {
    console.error('[Event] Timeline error:', error);
    return { data: null, error };
  }
};

/**
 * Delete old events (cleanup)
 */
export const cleanupOldEvents = async (daysToKeep = 7) => {
  console.log(`[Event] Cleaning up old events`);
  
  try {
    const cutoffTime = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('agent_events')
      .delete()
      .lt('created_at', cutoffTime);
    
    if (error) throw error;
    
    console.log(`[Event] Cleanup complete`);
    return { data, error: null };
    
  } catch (error) {
    console.error('[Event] Cleanup error:', error);
    return { data: null, error };
  }
};
