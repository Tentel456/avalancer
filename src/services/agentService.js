import { supabase } from '../lib/supabase';

export const getAllAgents = async () => {
  try {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('is_active', true)
      .order('agent_id');

    if (error) throw error;
    console.log('[getAllAgents] Loaded agents:', data?.length);
    return { data, error: null };
  } catch (error) {
    console.error('[getAllAgents] Error:', error);
    return { data: null, error };
  }
};

export const getAgentById = async (agentId) => {
  try {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('agent_id', agentId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('[getAgentById] Error:', error);
    return { data: null, error };
  }
};

export const askAgent = async (agentId, cryptoSymbol, currentPrice, priceChange) => {
  console.log(`[askAgent] Starting for ${agentId}, ${cryptoSymbol}`);
  
  try {
    const { data: agent, error: agentError } = await getAgentById(agentId);
    if (agentError) {
      console.error(`[askAgent] Error getting agent:`, agentError);
      throw agentError;
    }

    console.log(`[askAgent] Agent loaded:`, agent.name);

    const systemPrompt = `You are ${agent.name} - ${agent.role}.
${agent.personality.description}

Your traits: ${agent.personality.traits.join(', ')}.
Communication style: ${agent.personality.communication_style}
Risk tolerance: ${agent.risk_tolerance}/1.0

Answer briefly (2-3 sentences), in your style, as a live analyst.`;

    const userPrompt = `Analyze ${cryptoSymbol}. 
Current price: $${currentPrice}
24h change: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%

Give your opinion: buy, sell or hold?`;

    console.log(`[askAgent] Calling Gen-API...`);

    const response = await fetch('https://api.gen-api.ru/api/v1/networks/gpt-5-1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_GENAPI_KEY}`
      },
      body: JSON.stringify({
        is_sync: true,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        model: 'gpt-5.1',
        max_tokens: 200,
        temperature: 0.8,
        top_p: 1,
        top_k: 0,
        response_format: { type: 'text' },
        auto_cache: false,
        reasoning_effort: 'none',
        stream: false
      })
    });

    console.log(`[askAgent] Response status:`, response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[askAgent] API error:`, errorText);
      throw new Error(`Gen-API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    console.log(`[askAgent] API result:`, result);
    
    let message = '';
    
    // Gen-API возвращает массив choices
    if (result.choices && Array.isArray(result.choices) && result.choices.length > 0) {
      const choice = result.choices[0];
      // Если message это объект с content
      if (choice.message && typeof choice.message === 'object') {
        message = choice.message.content || '';
      } 
      // Если message это строка
      else if (typeof choice.message === 'string') {
        message = choice.message;
      }
      // Если есть text поле
      else if (choice.text) {
        message = choice.text;
      }
    } else if (result.output && result.output.choices && result.output.choices[0]) {
      message = result.output.choices[0].message.content;
    } else if (result.response) {
      message = result.response;
    } else {
      console.error(`[askAgent] Unexpected format:`, result);
      throw new Error(`Unexpected API response`);
    }

    // Если message всё ещё массив, берём первый элемент
    if (Array.isArray(message) && message.length > 0) {
      message = message[0].message || message[0].content || message[0].text || JSON.stringify(message[0]);
    }

    // Убеждаемся что это строка
    if (typeof message !== 'string') {
      console.error(`[askAgent] Message is not a string:`, message);
      message = JSON.stringify(message);
    }

    console.log(`[askAgent] Message from ${agent.name}:`, message);

    const { error: insertError } = await supabase
      .from('agent_messages')
      .insert({
        from_agent: agentId,
        to_agent: null,
        message: message,
        message_type: 'analysis',
        context: {
          crypto_symbol: cryptoSymbol,
          price: currentPrice,
          price_change: priceChange
        },
        emotion: 'neutral',
        is_public: true
      });

    if (insertError) console.error('[askAgent] DB error:', insertError);

    return { data: message, error: null };
  } catch (error) {
    console.error(`[askAgent] Exception:`, error);
    return { data: null, error };
  }
};

export const createMarketEvent = async (eventType, cryptoSymbol, title, description, severity = 0.5, data = {}) => {
  try {
    const { data: event, error } = await supabase
      .from('market_events')
      .insert({
        event_type: eventType,
        crypto_symbol: cryptoSymbol,
        title: title,
        description: description,
        severity: severity,
        data: data,
        processed: false
      })
      .select()
      .single();

    if (error) throw error;
    return { data: event, error: null };
  } catch (error) {
    console.error('[createMarketEvent] Error:', error);
    return { data: null, error };
  }
};

export const getAllAgentMessages = async (limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('agent_messages')
      .select(`
        *,
        agent:agents!agent_messages_from_agent_fkey(agent_id, name, role, current_mood)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    console.log('[getAllAgentMessages] Loaded messages:', data?.length);
    return { data, error: null };
  } catch (error) {
    console.error('[getAllAgentMessages] Error:', error);
    return { data: null, error };
  }
};
