import { supabase } from '../lib/supabase';

// Создать группу
export const createGroup = async (groupData, userId) => {
  try {
    // Создаем группу
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert([
        {
          name: groupData.name,
          username: groupData.username,
          avatar_url: groupData.avatar,
          is_private: groupData.isPrivate,
          invite_link: groupData.inviteLink,
          creator_id: userId
        }
      ])
      .select()
      .single();

    if (groupError) throw groupError;

    // Автоматически добавляем создателя как админа
    const { error: memberError } = await supabase
      .from('group_members')
      .insert([
        {
          group_id: group.id,
          user_id: userId,
          role: 'admin'
        }
      ]);

    if (memberError) throw memberError;

    return { data: group, error: null };
  } catch (error) {
    console.error('Error creating group:', error);
    return { data: null, error };
  }
};

// Получить все группы пользователя
export const getUserGroups = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        group_id,
        groups (
          id,
          name,
          username,
          avatar_url,
          is_private,
          created_at
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;

    // Преобразуем данные в нужный формат
    const groups = data.map(item => item.groups).filter(Boolean);
    
    return { data: groups, error: null };
  } catch (error) {
    console.error('Error fetching user groups:', error);
    return { data: null, error };
  }
};

// Получить информацию о группе
export const getGroup = async (groupId) => {
  try {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching group:', error);
    return { data: null, error };
  }
};

// Присоединиться к группе
export const joinGroup = async (groupId, userId) => {
  try {
    const { data, error } = await supabase
      .from('group_members')
      .insert([
        {
          group_id: groupId,
          user_id: userId,
          role: 'member'
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error joining group:', error);
    return { data: null, error };
  }
};

// Покинуть группу
export const leaveGroup = async (groupId, userId) => {
  try {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error leaving group:', error);
    return { error };
  }
};

// Обновить группу
export const updateGroup = async (groupId, updates) => {
  try {
    const { data, error } = await supabase
      .from('groups')
      .update(updates)
      .eq('id', groupId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating group:', error);
    return { data: null, error };
  }
};

// Удалить группу
export const deleteGroup = async (groupId) => {
  try {
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting group:', error);
    return { error };
  }
};
