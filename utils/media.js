import { fetchJson } from './api';

export function getMediaTitle(item) {
  return item?.title || item?.name || 'Untitled';
}

export function getMediaYear(item) {
  const date = item?.release_date || item?.first_air_date || null;

  if (!date) {
    return null;
  }

  return String(date).split('-')[0] || null;
}

export function getMediaTargetScreen(type) {
  return type === 'tv' ? 'TVDetailScreen' : 'PlayerScreen';
}

export function normalizeMediaItem(item, fallbackType = 'movie') {
  if (!item) {
    return null;
  }

  return {
    tmdb_id: item.tmdb_id ?? item.id,
    title: getMediaTitle(item),
    poster: item.poster ?? null,
    backdrop: item.backdrop ?? null,
    release_date: item.release_date || item.first_air_date || null,
    vote_average: item.vote_average ?? item.rating ?? null,
    overview: item.overview || item.description || '',
    type: item.type || fallbackType,
  };
}

export async function fetchMediaDetails(item) {
  return fetchJson('/details', {
    id: item.tmdb_id,
    type: item.type,
  });
}
