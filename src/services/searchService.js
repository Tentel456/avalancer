import { supabase } from '../lib/supabase';

// Поиск пользователей по username
export const searchUsers = async (searchQuery) => {
  try {
    // Убираем @ если он есть в начале
    const query = searchQuery.startsWith('@') ? searchQuery.slice(1) : searchQuery;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .ilike('username', `%${query}%`)
      .limit(10);

    if (error) throw error;
    
    console.log('Search users result:', { query, data, error });
    return { data, error: null };
  } catch (error) {
    console.error('Error searching users:', error);
    return { data: null, error };
  }
};

// Поиск открытых групп по username
export const searchGroups = async (searchQuery) => {
  try {
    // Убираем @ если он есть в начале
    const query = searchQuery.startsWith('@') ? searchQuery.slice(1) : searchQuery;
    
    const { data, error } = await supabase
      .from('groups')
      .select('id, name, username, avatar_url, is_private')
      .eq('is_private', false)
      .ilike('username', `%${query}%`)
      .limit(10);

    if (error) throw error;
    
    console.log('Search groups result:', { query, data, error });
    return { data, error: null };
  } catch (error) {
    console.error('Error searching groups:', error);
    return { data: null, error };
  }
};

// Универсальный поиск (пользователи + группы)
export const searchAll = async (searchQuery) => {
  try {
    if (!searchQuery || searchQuery.trim() === '' || searchQuery === '@') {
      return { data: { users: [], groups: [] }, error: null };
    }

    console.log('Searching for:', searchQuery);

    const [usersResult, groupsResult] = await Promise.all([
      searchUsers(searchQuery),
      searchGroups(searchQuery)
    ]);

    console.log('Search results:', {
      users: usersResult.data,
      groups: groupsResult.data
    });

    return {
      data: {
        users: usersResult.data || [],
        groups: groupsResult.data || []
      },
      error: null
    };
  } catch (error) {
    console.error('Error in universal search:', error);
    return { data: { users: [], groups: [] }, error };
  }
};
