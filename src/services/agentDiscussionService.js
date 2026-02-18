import { supabase } from '../lib/supabase';
import { getAllAgents, getAgentById } from './agentService';

/**
 * Запустить дискуссию агентов о криптовалюте
 * Агенты отвечают последовательно и реагируют друг на друга
 */
export const startAgentDiscussion = async (cryptoSymbol, currentPrice, priceChange) => {
  console.log(`[Discussion] Starting for ${cryptoSymbol}`);
  
  try {
    // Получаем всех агентов
    const { data: agents, error: agentsError } = await getAllAgents();
    if (agentsError || !agents || agents.length === 0) {
      throw new Error('No agents available');
    }

    console.log(`[Discussion] ${agents.length} agents loaded`);

    // Массив для хранения всех сообщений дискуссии
    const discussionMessages = [];

    // Раунд 1: Каждый агент дает свое первоначальное мнение
    console.log('[Discussion] Round 1: Initial opinions');
    for (const agent of agents) {
      const message = await askAgentInRussian(
        agent,
        cryptoSymbol,
        currentPrice,
        priceChange,
        null
      );
      
      if (message) {
        discussionMessages.push({
          agent: agent,
          message: message,
          round: 1
        });
        
        // Задержка 2-3 секунды между ответами (как живые люди)
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
      }
    }

    // Раунд 2: Агенты реагируют на мнения друг друга
    console.log('[Discussion] Round 2: Reactions');
    
    const reactingAgents = selectReactingAgents(agents, discussionMessages);
    
    for (const agent of reactingAgents) {
      const message = await askAgentToReact(
        agent,
        cryptoSymbol,
        discussionMessages
      );
      
      if (message) {
        discussionMessages.push({
          agent: agent,
          message: message,
          round: 2
        });
        
        // Задержка 2-4 секунды
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
      }
    }

    console.log(`[Discussion] Completed with ${discussionMessages.length} messages`);
    return { data: discussionMessages, error: null };
    
  } catch (error) {
    console.error('[Discussion] Error:', error);
    return { data: null, error };
  }
};

/**
 * Спросить агента на русском языке
 */
const askAgentInRussian = async (agent, cryptoSymbol, currentPrice, priceChange, previousMessages) => {
  try {
    const systemPrompt = `Ты ${agent.name} - ${agent.role}.
${agent.personality.description}

Твои черты: ${agent.personality.traits.join(', ')}.
Стиль общения: ${agent.personality.communication_style}
Склонность к риску: ${agent.risk_tolerance}/1.0

Отвечай кратко (2-3 предложения), в своем стиле, как живой аналитик. ОБЯЗАТЕЛЬНО на русском языке.`;

    let userPrompt = `Проанализируй ${cryptoSymbol}. 
Текущая цена: $${currentPrice}
Изменение за 24ч: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%

Дай свое мнение: покупать, продавать или держать? Объясни почему.`;

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
        max_tokens: 250,
        temperature: 0.8,
        response_format: { type: 'text' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[askAgentInRussian] API error (${response.status}):`, errorText);
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('[askAgentInRussian] Full API response:', JSON.stringify(result, null, 2));
    
    let message = extractMessage(result);

    console.log('[askAgentInRussian] Extracted message:', message);
    console.log('[askAgentInRussian] Message length:', message?.length);
    console.log('[askAgentInRussian] Message type:', typeof message);

    // Проверяем что сообщение не пустое
    if (!message || message === 'No message' || message.trim() === '') {
      console.error('[askAgentInRussian] Empty message received, using fallback');
      message = `Анализирую ${cryptoSymbol}... (ответ не получен)`;
    }

    // Сохраняем в БД
    await saveAgentMessage(agent.agent_id, message, cryptoSymbol, currentPrice, priceChange);

    return message;
  } catch (error) {
    console.error(`[askAgentInRussian] Error for ${agent.name}:`, error);
    return null;
  }
};

/**
 * Попросить агента отреагировать на мнения других
 */
const askAgentToReact = async (agent, cryptoSymbol, previousMessages) => {
  try {
    const systemPrompt = `Ты ${agent.name} - ${agent.role}.
${agent.personality.description}

Твои черты: ${agent.personality.traits.join(', ')}.
Стиль общения: ${agent.personality.communication_style}

Ты участвуешь в дискуссии с другими аналитиками. Прокомментируй их мнения, согласись или поспорь. Будь эмоциональным и живым. ОБЯЗАТЕЛЬНО на русском языке.`;

    // Формируем контекст из предыдущих сообщений
    const context = previousMessages
      .filter(m => m.round === 1)
      .map(m => `${m.agent.name}: "${m.message}"`)
      .join('\n\n');

    const userPrompt = `Другие аналитики высказались о ${cryptoSymbol}:

${context}

Что ты думаешь об их мнениях? С кем согласен, с кем нет? Дай свою реакцию (2-3 предложения).`;

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
        max_tokens: 250,
        temperature: 0.9,
        response_format: { type: 'text' }
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    let message = extractMessage(result);

    // Проверяем что сообщение не пустое
    if (!message || message === 'No message' || message.trim() === '') {
      console.error('[askAgentToReact] Empty message received, using fallback');
      message = `Интересные мнения коллег... (ответ не получен)`;
    }

    // Сохраняем в БД
    const context_data = previousMessages[0];
    await saveAgentMessage(
      agent.agent_id, 
      message, 
      context_data ? context_data.agent.name : cryptoSymbol,
      null,
      null,
      'reaction'
    );

    return message;
  } catch (error) {
    console.error(`[askAgentToReact] Error for ${agent.name}:`, error);
    return null;
  }
};

/**
 * Извлечь текст сообщения из ответа API
 */
const extractMessage = (result) => {
  console.log('[extractMessage] Raw result:', JSON.stringify(result, null, 2));
  
  let message = '';
  
  // Формат 1: result.response (массив)
  if (result.response && Array.isArray(result.response) && result.response.length > 0) {
    console.log('[extractMessage] Format 1: response array');
    const responseItem = result.response[0];
    
    if (typeof responseItem === 'object') {
      message = responseItem.message || responseItem.content || responseItem.text || '';
    } else if (typeof responseItem === 'string') {
      message = responseItem;
    }
  }
  // Формат 2: result.choices (OpenAI-like)
  else if (result.choices && Array.isArray(result.choices) && result.choices.length > 0) {
    console.log('[extractMessage] Format 2: choices array');
    const choice = result.choices[0];
    
    if (choice.message && typeof choice.message === 'object') {
      message = choice.message.content || '';
    } else if (typeof choice.message === 'string') {
      message = choice.message;
    } else if (choice.text) {
      message = choice.text;
    }
  }
  // Формат 3: result.output.choices
  else if (result.output && result.output.choices && Array.isArray(result.output.choices) && result.output.choices.length > 0) {
    console.log('[extractMessage] Format 3: output.choices');
    const choice = result.output.choices[0];
    if (choice.message && choice.message.content) {
      message = choice.message.content;
    }
  }
  // Формат 4: прямой response
  else if (result.response && typeof result.response === 'string') {
    console.log('[extractMessage] Format 4: direct response string');
    message = result.response;
  }

  console.log('[extractMessage] After extraction:', message);

  // Если message всё ещё массив
  if (Array.isArray(message) && message.length > 0) {
    console.log('[extractMessage] Message is array, extracting first element');
    const firstItem = message[0];
    if (typeof firstItem === 'object') {
      message = firstItem.message || firstItem.content || firstItem.text || JSON.stringify(firstItem);
    } else {
      message = String(firstItem);
    }
  }

  // Убеждаемся что это строка
  if (typeof message !== 'string') {
    console.log('[extractMessage] Converting to string, type:', typeof message);
    message = JSON.stringify(message);
  }

  const finalMessage = message.trim();
  console.log('[extractMessage] Final message length:', finalMessage.length, 'Preview:', finalMessage.substring(0, 100));
  
  return finalMessage || 'No message';
};

/**
 * Сохранить сообщение агента в БД
 */
const saveAgentMessage = async (agentId, message, cryptoSymbol, price, priceChange, messageType = 'analysis') => {
  try {
    console.log(`[saveAgentMessage] Saving for ${agentId}:`, message);
    
    if (!message || message.trim() === '') {
      console.error('[saveAgentMessage] Empty message, skipping save');
      return;
    }

    const { error } = await supabase
      .from('agent_messages')
      .insert({
        from_agent: agentId,
        to_agent: null,
        message: message.trim(),
        message_type: messageType,
        context: {
          crypto_symbol: cryptoSymbol,
          price: price,
          price_change: priceChange
        },
        emotion: 'neutral',
        is_public: true
      });

    if (error) {
      console.error('[saveAgentMessage] DB error:', error);
    } else {
      console.log('[saveAgentMessage] Saved successfully');
    }
  } catch (error) {
    console.error('[saveAgentMessage] Exception:', error);
  }
};

/**
 * Выбрать агентов для реакции (те, у кого разные мнения)
 */
const selectReactingAgents = (agents, messages) => {
  // Берем агентов с высокой конфликтностью
  const conflictAgents = agents
    .filter(a => a.personality.conflict_tendency > 0.5)
    .slice(0, 2);
  
  // Если мало конфликтных, добавляем случайных
  if (conflictAgents.length < 2) {
    const remaining = agents.filter(a => !conflictAgents.includes(a));
    conflictAgents.push(...remaining.slice(0, 2 - conflictAgents.length));
  }
  
  return conflictAgents;
};
