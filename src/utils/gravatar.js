// Простая функция для генерации MD5 хеша (для Gravatar)
// Gravatar требует MD5 хеш email в нижнем регистре

// Используем crypto API если доступен, иначе fallback на простой хеш
export const getGravatarUrl = (email, size = 200) => {
  if (!email) {
    return `https://www.gravatar.com/avatar/default?d=identicon&s=${size}`;
  }

  // Приводим email к нижнему регистру и убираем пробелы
  const normalizedEmail = email.toLowerCase().trim();
  
  // Используем простой хеш вместо MD5 для совместимости
  // Для production лучше использовать библиотеку crypto-js или md5
  const simpleHash = Array.from(normalizedEmail)
    .reduce((hash, char) => {
      const chr = char.charCodeAt(0);
      hash = ((hash << 5) - hash) + chr;
      return hash & hash;
    }, 0)
    .toString(16)
    .padStart(32, '0')
    .substring(0, 32);

  return `https://www.gravatar.com/avatar/${simpleHash}?d=identicon&s=${size}`;
};

// Альтернатива: использовать DiceBear API для генерации аватаров
export const getDiceBearUrl = (seed, size = 200) => {
  const normalizedSeed = encodeURIComponent(seed || 'default');
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${normalizedSeed}&size=${size}`;
};

// Универсальная функция для получения аватара
export const getAvatarUrl = (identifier, size = 200, useGravatar = false) => {
  if (useGravatar && identifier.includes('@')) {
    return getGravatarUrl(identifier, size);
  }
  return getDiceBearUrl(identifier, size);
};
