import AsyncStorage from '@react-native-async-storage/async-storage';

export const FAVORITES_STORAGE_KEY = 'STREAMCIRCLE_FAVORITES';

function normalizeFavoriteItem(item) {
  return {
    tmdb_id: item.tmdb_id,
    type: item.type,
    title: item.title,
    poster: item.poster || null,
    backdrop: item.backdrop || null,
    release_date: item.release_date || null,
    added_at: item.added_at || new Date().toISOString(),
  };
}

function matchesFavorite(item, tmdb_id, type) {
  return String(item.tmdb_id) === String(tmdb_id) && item.type === type;
}

export async function getFavorites() {
  try {
    const stored = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to read favorites:', error);
    return [];
  }
}

async function saveFavorites(items) {
  await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(items));
  return items;
}

export async function isFavorite(tmdb_id, type) {
  const favorites = await getFavorites();
  return favorites.some((item) => matchesFavorite(item, tmdb_id, type));
}

export async function removeFavorite(tmdb_id, type) {
  const favorites = await getFavorites();
  const nextFavorites = favorites.filter((item) => !matchesFavorite(item, tmdb_id, type));

  await saveFavorites(nextFavorites);
  return nextFavorites;
}

export async function toggleFavorite(item) {
  const favorites = await getFavorites();
  const exists = favorites.some((favorite) => matchesFavorite(favorite, item.tmdb_id, item.type));

  if (exists) {
    const nextFavorites = favorites.filter(
      (favorite) => !matchesFavorite(favorite, item.tmdb_id, item.type)
    );

    await saveFavorites(nextFavorites);
    return { favorites: nextFavorites, isFavorite: false };
  }

  const nextFavorites = [normalizeFavoriteItem(item), ...favorites];
  await saveFavorites(nextFavorites);
  return { favorites: nextFavorites, isFavorite: true };
}
