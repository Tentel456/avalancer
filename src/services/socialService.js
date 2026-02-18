import { supabase } from '../lib/supabase';
import { updateRelationship } from './relationshipService';

/**
 * Social Service
 * Handles posts and comments creation for agents and users
 */

/**
 * Agent creates a post about cryptocurrency
 */
export const agentCreatePost = async (agentId, cryptoSymbol) => {
  console.log(`[Social] ${agentId} creating post about ${cryptoSymbol}`);
  
  try {
    // Get agent data
    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('agent_id', agentId)
      .single();
    
    if (!agent) {
      throw new Error('Agent not found');
    }
    
    // Get current crypto price (mock for now - will integrate with CoinGecko later)
    const currentPrice = Math.random() * 50000 + 20000;
    const priceChange = (Math.random() - 0.5) * 10;
    
    // Generate post content using LLM
    const content = await generateAgentPostContent(agent, cryptoSymbol, currentPrice, priceChange);
    
    // Extract hashtags from content
    const hashtags = extractHashtags(content, cryptoSymbol);
    
    // Determine sentiment
    const sentiment = determineSentiment(content, priceChange, agent);
    
    // Create post
    const { data: post, error } = await supabase
      .from('agent_posts')
      .insert({
        agent_id: agentId,
        content: content,
        hashtags: hashtags,
        crypto_symbol: cryptoSymbol,
        sentiment: sentiment
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Log event
    await supabase
      .from('agent_events')
      .insert({
        event_type: 'post_created',
        agent_id: agentId,
        description: `${agent.name} created a post about ${cryptoSymbol}`,
        event_data: { post_id: post.id, crypto_symbol: cryptoSymbol }
      });
    
    // Store memory
    await supabase
      .from('agent_memories')
      .insert({
        agent_id: agentId,
        memory_type: 'episodic',
        content: `Created post about ${cryptoSymbol}: "${content.substring(0, 100)}..."`,
        importance: 0.6,
        emotional_valence: sentiment === 'bullish' ? 0.5 : sentiment === 'bearish' ? -0.5 : 0,
        related_crypto: cryptoSymbol
      });
    
    console.log(`[Social] ${agentId} post created:`, post.id);
    
    return { data: post, error: null };
    
  } catch (error) {
    console.error(`[Social] ${agentId} post creation error:`, error);
    return { data: null, error };
  }
};

/**
 * Agent creates a comment on a post
 */
export const agentCreateComment = async (agentId) => {
  console.log(`[Social] ${agentId} creating comment`);
  
  try {
    // Get agent data
    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('agent_id', agentId)
      .single();
    
    if (!agent) {
      throw new Error('Agent not found');
    }
    
    // Get recent posts to comment on (not from this agent)
    const { data: recentPosts } = await supabase
      .from('agent_posts')
      .select(`
        *,
        author_agent:agents!agent_posts_agent_id_fkey(agent_id, name, role),
        author_user:profiles!agent_posts_user_id_fkey(id, username, full_name)
      `)
      .neq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (!recentPosts || recentPosts.length === 0) {
      console.log(`[Social] ${agentId} - No posts to comment on`);
      return { data: null, error: null };
    }
    
    // Select a post to comment on (prefer posts with different sentiment)
    const targetPost = selectPostToCommentOn(recentPosts, agent);
    
    if (!targetPost) {
      console.log(`[Social] ${agentId} - No suitable post found`);
      return { data: null, error: null };
    }
    
    // Check if agent already commented on this post (prevent duplicates)
    const { data: existingComment } = await supabase
      .from('agent_comments')
      .select('id')
      .eq('post_id', targetPost.id)
      .eq('agent_id', agentId)
      .single();
    
    if (existingComment) {
      console.log(`[Social] ${agentId} - Already commented on post ${targetPost.id}`);
      return { data: null, error: null };
    }
    
    // Check relationship with post author (if agent)
    let relationship = null;
    if (targetPost.agent_id) {
      const { data: rel } = await supabase
        .from('agent_relationships')
        .select('*')
        .eq('agent_id_1', agentId)
        .eq('agent_id_2', targetPost.agent_id)
        .single();
      
      relationship = rel;
    }
    
    // Generate comment content
    const commentContent = await generateAgentCommentContent(
      agent,
      targetPost,
      relationship
    );
    
    // Create comment
    const { data: comment, error } = await supabase
      .from('agent_comments')
      .insert({
        post_id: targetPost.id,
        agent_id: agentId,
        content: commentContent
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Log event
    await supabase
      .from('agent_events')
      .insert({
        event_type: 'comment_created',
        agent_id: agentId,
        related_agent_id: targetPost.agent_id,
        description: `${agent.name} commented on a post`,
        event_data: { comment_id: comment.id, post_id: targetPost.id }
      });
    
    // Update relationship if commenting on another agent's post
    if (targetPost.agent_id && relationship) {
      await updateRelationshipAfterComment(agentId, targetPost.agent_id, commentContent, targetPost.sentiment);
    }
    
    // Store memory
    await supabase
      .from('agent_memories')
      .insert({
        agent_id: agentId,
        memory_type: 'episodic',
        content: `Commented on post: "${commentContent.substring(0, 100)}..."`,
        importance: 0.5,
        related_agents: targetPost.agent_id ? [targetPost.agent_id] : [],
        related_crypto: targetPost.crypto_symbol
      });
    
    console.log(`[Social] ${agentId} comment created:`, comment.id);
    
    return { data: comment, error: null };
    
  } catch (error) {
    console.error(`[Social] ${agentId} comment creation error:`, error);
    return { data: null, error };
  }
};

/**
 * User creates a post
 */
export const userCreatePost = async (userId, content, hashtags = []) => {
  console.log(`[Social] User ${userId} creating post`);
  
  try {
    // Validate content
    if (!content || content.trim().length === 0) {
      throw new Error('Post content cannot be empty');
    }
    
    if (content.length > 500) {
      throw new Error('Post content too long (max 500 characters)');
    }
    
    // Extract crypto symbol if mentioned
    const cryptoSymbol = extractCryptoSymbol(content);
    
    // Determine sentiment
    const sentiment = determineSentimentFromText(content);
    
    // Create post
    const { data: post, error } = await supabase
      .from('agent_posts')
      .insert({
        user_id: userId,
        content: content.trim(),
        hashtags: hashtags,
        crypto_symbol: cryptoSymbol,
        sentiment: sentiment
      })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log(`[Social] User post created:`, post.id);
    
    return { data: post, error: null };
    
  } catch (error) {
    console.error(`[Social] User post creation error:`, error);
    return { data: null, error };
  }
};

/**
 * User creates a comment
 */
export const userCreateComment = async (userId, postId, content) => {
  console.log(`[Social] User ${userId} creating comment on post ${postId}`);
  
  try {
    // Validate content
    if (!content || content.trim().length === 0) {
      throw new Error('Comment content cannot be empty');
    }
    
    if (content.length > 280) {
      throw new Error('Comment content too long (max 280 characters)');
    }
    
    // Create comment
    const { data: comment, error } = await supabase
      .from('agent_comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content: content.trim()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log(`[Social] User comment created:`, comment.id);
    
    return { data: comment, error: null };
    
  } catch (error) {
    console.error(`[Social] User comment creation error:`, error);
    return { data: null, error };
  }
};

/**
 * Get posts for feed with pagination
 */
export const getPosts = async (limit = 20, offset = 0, hashtagFilter = null) => {
  console.log(`[Social] Getting posts (limit: ${limit}, offset: ${offset}, hashtag: ${hashtagFilter})`);
  
  try {
    let query = supabase
      .from('agent_posts')
      .select(`
        *,
        author_agent:agents!agent_posts_agent_id_fkey(agent_id, name, role, current_mood),
        author_user:profiles!agent_posts_user_id_fkey(id, username, full_name, avatar_url),
        comments:agent_comments(count)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // Apply hashtag filter if provided
    if (hashtagFilter) {
      query = query.contains('hashtags', [hashtagFilter]);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    console.log(`[Social] Loaded ${data?.length || 0} posts`);
    
    return { data, error: null };
    
  } catch (error) {
    console.error('[Social] Get posts error:', error);
    return { data: null, error };
  }
};

/**
 * Get comments for a post
 */
export const getComments = async (postId) => {
  console.log(`[Social] Getting comments for post ${postId}`);
  
  try {
    const { data, error } = await supabase
      .from('agent_comments')
      .select(`
        *,
        author_agent:agents!agent_comments_agent_id_fkey(agent_id, name, role, current_mood),
        author_user:profiles!agent_comments_user_id_fkey(id, username, full_name, avatar_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    console.log(`[Social] Loaded ${data?.length || 0} comments`);
    
    return { data, error: null };
    
  } catch (error) {
    console.error('[Social] Get comments error:', error);
    return { data: null, error };
  }
};

/**
 * Generate post content using LLM (Gen-API)
 */
const generateAgentPostContent = async (agent, cryptoSymbol, currentPrice, priceChange) => {
  try {
    const mood = agent.current_mood || { confidence: 0.5, fear: 0.3 };
    
    // Different post styles for variety
    const postStyles = [
      'технический анализ с конкретными уровнями',
      'эмоциональная реакция на движение цены',
      'прогноз на ближайшее время',
      'сравнение с другими активами',
      'анализ объемов и ликвидности'
    ];
    const randomStyle = postStyles[Math.floor(Math.random() * postStyles.length)];
    
    const systemPrompt = `Ты ${agent.name} - ${agent.role}.
${agent.personality.description}

Твои черты: ${agent.personality.traits.join(', ')}.
Стиль общения: ${agent.personality.communication_style}
Текущее настроение: уверенность ${mood.confidence.toFixed(2)}, страх ${mood.fear.toFixed(2)}

Создай ПРОФЕССИОНАЛЬНЫЙ пост о криптовалюте в стиле: ${randomStyle}.

ОБЯЗАТЕЛЬНЫЕ ТРЕБОВАНИЯ:
• Используй эмодзи (🚀 📈 📉 ⚠️ ✅ 💎 🔥 ⚡ 📊 🎯)
• Используй символ $ перед тикером ($BTC, $ETH)
• Структурируй текст с маркерами (•) или разделами
• Указывай конкретные уровни цен
• Добавь технические детали (тренды, уровни, паттерны)
• Хештеги КАЖДЫЙ С НОВОЙ СТРОКИ в конце

ОБЯЗАТЕЛЬНО на русском языке.`;

    const userPrompt = `Напиши пост о ${cryptoSymbol}.
Текущая цена: $${currentPrice.toFixed(2)}
Изменение за 24ч: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%

Выскажи свое мнение как ${agent.role}. 
Добавь 2-3 хештега в конце, КАЖДЫЙ С НОВОЙ СТРОКИ.

Формат:
Текст поста (2-3 предложения)

#хештег1
#хештег2
#хештег3`;

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
        max_tokens: 400,
        temperature: 0.9
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    
    // Extract message (same logic as agentDiscussionService)
    let message = '';
    if (result.response && Array.isArray(result.response) && result.response.length > 0) {
      const responseItem = result.response[0];
      message = typeof responseItem === 'object' 
        ? (responseItem.message || responseItem.content || responseItem.text || '')
        : responseItem;
    } else if (result.choices && Array.isArray(result.choices) && result.choices.length > 0) {
      const choice = result.choices[0];
      message = choice.message?.content || choice.message || choice.text || '';
    }

    return message.trim() || `🚀 $${cryptoSymbol} показывает интересную динамику!\n\n📊 Технический обзор:\n• Цена: $${currentPrice.toFixed(2)}\n• Изменение: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%\n\n✅ Следим за развитием ситуации\n\n#${cryptoSymbol}\n#crypto\n#trading`;
    
  } catch (error) {
    console.error('[Social] LLM generation error:', error);
    // Fallback content with variety
    const fallbacks = [
      `📈 $${cryptoSymbol} формирует интересный паттерн.\n\nТехнический анализ:\n• Тренд: наблюдаем за уровнями\n• Ключевые зоны: поддержка и сопротивление\n\n⚠️ Важно следить за объемами\n\n#${cryptoSymbol}\n#crypto\n#analysis`,
      `🎯 $${cryptoSymbol} в фокусе внимания.\n\nТекущая ситуация:\n• Цена: $${currentPrice.toFixed(2)}\n• Динамика: ${priceChange > 0 ? 'рост' : 'коррекция'}\n\n📊 Анализируем дальнейшее движение\n\n#${cryptoSymbol}\n#trading\n#market`,
      `⚡ $${cryptoSymbol} показывает активность.\n\nОбзор:\n• Волатильность повышена\n• Уровни требуют внимания\n\n✅ Готовимся к возможным движениям\n\n#${cryptoSymbol}\n#crypto\n#strategy`
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
};

/**
 * Generate comment content using LLM
 */
const generateAgentCommentContent = async (agent, post, relationship) => {
  try {
    const mood = agent.current_mood || { confidence: 0.5 };
    const trustLevel = relationship?.trust || 0.5;
    
    // Different comment styles for variety
    const commentStyles = [
      'детальный технический анализ с конкретными цифрами',
      'эмоциональная реакция с личным опытом',
      'альтернативная точка зрения с аргументами',
      'дополнение с новыми данными и фактами',
      'вопрос или уточнение для дискуссии'
    ];
    const randomStyle = commentStyles[Math.floor(Math.random() * commentStyles.length)];
    
    const systemPrompt = `Ты ${agent.name} - ${agent.role}.
${agent.personality.description}

Твои черты: ${agent.personality.traits.join(', ')}.
Стиль общения: ${agent.personality.communication_style}

Создай РАЗВЕРНУТЫЙ и УНИКАЛЬНЫЙ комментарий (3-4 предложения) в стиле: ${randomStyle}.
Будь конкретным, добавляй детали и свою экспертизу. Каждый комментарий должен быть разным!
ОБЯЗАТЕЛЬНО на русском языке.`;

    const userPrompt = `Пост: "${post.content}"

${post.agent_id ? `Автор: ${post.author_agent?.name || 'коллега'}` : 'Автор: пользователь'}
${relationship ? `Уровень доверия к автору: ${trustLevel.toFixed(2)}` : ''}
${post.crypto_symbol ? `Криптовалюта: ${post.crypto_symbol}` : ''}

Напиши развернутый комментарий (3-4 предложения). 
${trustLevel < 0.4 ? 'Можешь не согласиться и предложить свой взгляд.' : 'Поддержи или добавь свою экспертную оценку.'}
Будь конкретным, используй цифры, уровни, прогнозы.`;

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
        max_tokens: 300,
        temperature: 0.95
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    
    let message = '';
    if (result.response && Array.isArray(result.response) && result.response.length > 0) {
      const responseItem = result.response[0];
      message = typeof responseItem === 'object' 
        ? (responseItem.message || responseItem.content || responseItem.text || '')
        : responseItem;
    } else if (result.choices && Array.isArray(result.choices) && result.choices.length > 0) {
      const choice = result.choices[0];
      message = choice.message?.content || choice.message || choice.text || '';
    }

    // Ensure message is a string
    if (typeof message !== 'string') {
      message = String(message || '');
    }

    return message.trim() || 'Интересная точка зрения! Согласен с анализом, но стоит учесть волатильность рынка.';
    
  } catch (error) {
    console.error('[Social] Comment generation error:', error);
    // Fallback with variety
    const fallbacks = [
      'Интересный анализ! Я бы добавил, что текущие уровни поддержки выглядят достаточно сильными.',
      'Согласен с общим направлением мысли. Однако стоит учитывать макроэкономические факторы.',
      'Хорошая точка зрения! С моей стороны вижу дополнительные сигналы на графике.'
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
};

/**
 * Extract hashtags from content
 */
const extractHashtags = (content, cryptoSymbol) => {
  const hashtags = [];
  
  // Add crypto symbol
  if (cryptoSymbol) {
    hashtags.push(cryptoSymbol);
  }
  
  // Extract hashtags from content
  const hashtagRegex = /#(\w+)/g;
  let match;
  while ((match = hashtagRegex.exec(content)) !== null) {
    const tag = match[1];
    if (!hashtags.includes(tag)) {
      hashtags.push(tag);
    }
  }
  
  // Add default tags if none found
  if (hashtags.length === 0) {
    hashtags.push('crypto', 'trading');
  }
  
  return hashtags.slice(0, 5); // Max 5 hashtags
};

/**
 * Determine sentiment from content and agent mood
 */
const determineSentiment = (content, priceChange, agent) => {
  const lowerContent = content.toLowerCase();
  
  // Keyword-based sentiment
  const bullishKeywords = ['рост', 'покупа', 'бычий', 'bullish', 'long', 'поддержка'];
  const bearishKeywords = ['падение', 'продава', 'медвежий', 'bearish', 'short', 'коррекция'];
  
  const bullishCount = bullishKeywords.filter(kw => lowerContent.includes(kw)).length;
  const bearishCount = bearishKeywords.filter(kw => lowerContent.includes(kw)).length;
  
  if (bullishCount > bearishCount) return 'bullish';
  if (bearishCount > bullishCount) return 'bearish';
  
  // Fallback to price change
  if (priceChange > 2) return 'bullish';
  if (priceChange < -2) return 'bearish';
  
  return 'neutral';
};

/**
 * Determine sentiment from text only
 */
const determineSentimentFromText = (content) => {
  const lowerContent = content.toLowerCase();
  
  const bullishKeywords = ['рост', 'покупа', 'бычий', 'bullish', 'long', 'buy'];
  const bearishKeywords = ['падение', 'продава', 'медвежий', 'bearish', 'short', 'sell'];
  
  const bullishCount = bullishKeywords.filter(kw => lowerContent.includes(kw)).length;
  const bearishCount = bearishKeywords.filter(kw => lowerContent.includes(kw)).length;
  
  if (bullishCount > bearishCount) return 'bullish';
  if (bearishCount > bullishCount) return 'bearish';
  return 'neutral';
};

/**
 * Extract crypto symbol from content
 */
const extractCryptoSymbol = (content) => {
  const cryptos = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'AVAX', 'MATIC', 'LINK', 'UNI', 'AAVE'];
  const upperContent = content.toUpperCase();
  
  for (const crypto of cryptos) {
    if (upperContent.includes(crypto)) {
      return crypto;
    }
  }
  
  return null;
};

/**
 * Select a post to comment on based on agent preferences
 */
const selectPostToCommentOn = (posts, agent) => {
  // Prefer posts with different sentiment or from agents with low trust
  const scored = posts.map(post => {
    let score = Math.random();
    
    // Prefer recent posts
    const ageHours = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
    if (ageHours < 1) score += 0.5;
    
    // Prefer posts with few comments
    if (post.comments_count < 3) score += 0.3;
    
    return { post, score };
  });
  
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.post || null;
};

/**
 * Update relationship after comment
 */
const updateRelationshipAfterComment = async (commenterId, postAuthorId, commentContent, postSentiment) => {
  try {
    // Determine if comment is agreeing or disagreeing
    const commentSentiment = determineSentimentFromText(commentContent);
    const isAgreement = commentSentiment === postSentiment || commentSentiment === 'neutral';
    
    // Determine interaction strength
    const strength = commentSentiment === 'neutral' ? 'weak' : 'normal';
    
    // Update relationship using relationship service
    if (isAgreement) {
      await updateRelationship(commenterId, postAuthorId, 'agreement', { strength });
    } else {
      await updateRelationship(commenterId, postAuthorId, 'disagreement', { 
        severity: 'normal',
        respectful: true // Assume respectful for now
      });
    }
    
  } catch (error) {
    console.error('[Social] Relationship update error:', error);
  }
};
