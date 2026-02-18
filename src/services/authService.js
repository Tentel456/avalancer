import { supabase } from '../lib/supabase';
import { getDiceBearUrl } from '../utils/gravatar';

// Регистрация с email/password
export const signUpWithEmail = async (email, password, fullName, username) => {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          username: username,
          avatar_url: getDiceBearUrl(email, 200),
        },
        emailRedirectTo: `${window.location.origin}/dashboard`
      }
    });

    if (authError) {
      // Обработка специфичных ошибок
      if (authError.message.includes('rate limit')) {
        throw new Error('Слишком много попыток регистрации. Пожалуйста, подождите несколько минут или используйте другой email.');
      }
      throw authError;
    }

    // Если триггер не настроен, создаем профиль вручную
    if (authData.user) {
      // Проверяем, существует ли уже профиль (создан триггером)
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', authData.user.id)
        .maybeSingle();

      // Если профиль не существует, создаем его
      if (!existingProfile && !checkError) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authData.user.id,
              email: email,
              full_name: fullName,
              username: username,
              avatar_url: getDiceBearUrl(email, 200),
              auth_method: 'email'
            }
          ]);

        if (profileError) {
          console.error('Profile creation error:', profileError);
          throw profileError;
        }
      } else if (existingProfile) {
        // Обновляем профиль данными из формы
        await supabase
          .from('profiles')
          .update({
            full_name: fullName,
            username: username,
          })
          .eq('id', authData.user.id);
      }
    }

    return { data: authData, error: null };
  } catch (error) {
    console.error('SignUp error:', error);
    return { data: null, error };
  }
};

// Вход с email/password
export const signInWithEmail = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Получаем профиль пользователя
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    return { data: { ...data, profile }, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Вход через Google
export const signInWithGoogle = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Регистрация/вход через MetaMask
export const signInWithMetaMask = async (walletAddress, fullName, username) => {
  try {
    // Проверяем, существует ли пользователь с этим кошельком
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    if (existingProfile && !checkError) {
      // Пользователь уже существует - создаем сессию
      // Сохраняем данные в localStorage для имитации сессии
      localStorage.setItem('metamask_session', JSON.stringify({
        profile: existingProfile,
        wallet_address: walletAddress,
        timestamp: Date.now()
      }));
      
      return { data: { profile: existingProfile, isNew: false }, error: null };
    }

    // Создаем анонимную сессию для нового пользователя
    const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
    
    if (anonError) throw anonError;

    // Создаем профиль с привязкой к анонимному пользователю
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: anonData.user.id,
          wallet_address: walletAddress,
          full_name: fullName,
          username: username,
          avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${walletAddress}`,
          auth_method: 'metamask'
        }
      ])
      .select()
      .single();

    if (profileError) throw profileError;

    // Сохраняем данные в localStorage
    localStorage.setItem('metamask_session', JSON.stringify({
      profile: profile,
      wallet_address: walletAddress,
      timestamp: Date.now()
    }));

    return { data: { profile, isNew: true }, error: null };
  } catch (error) {
    console.error('MetaMask auth error:', error);
    return { data: null, error };
  }
};

// Получить текущего пользователя
export const getCurrentUser = async () => {
  try {
    // Сначала проверяем MetaMask сессию
    const metamaskSession = localStorage.getItem('metamask_session');
    if (metamaskSession) {
      const session = JSON.parse(metamaskSession);
      // Проверяем, что сессия не старше 7 дней
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - session.timestamp < sevenDays) {
        return { data: { user: null, profile: session.profile, isMetaMask: true }, error: null };
      } else {
        // Сессия истекла
        localStorage.removeItem('metamask_session');
      }
    }

    // Проверяем обычную Supabase сессию
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) throw userError;
    if (!user) return { data: null, error: null };

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    return { data: { user, profile, isMetaMask: false }, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Обновить профиль
export const updateProfile = async (userId, updates) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .maybeSingle();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Выход
export const signOut = async () => {
  try {
    // Удаляем MetaMask сессию
    localStorage.removeItem('metamask_session');
    
    // Выходим из Supabase
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error };
  }
};

// Отключить кошелек
export const disconnectWallet = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ wallet_address: null })
      .eq('id', userId)
      .select()
      .maybeSingle();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};
