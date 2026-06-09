import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../theme';
import { fetchJson } from '../utils/api';

const genreMap = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
};

function getYear(item) {
  const date = item.release_date || item.first_air_date;
  return date ? date.split('-')[0] : 'N/A';
}

function getRating(item) {
  return typeof item.vote_average === 'number' ? item.vote_average.toFixed(1) : 'N/A';
}

function PosterArtwork({ item }) {
  if (item.poster) {
    return <Image source={{ uri: item.poster }} style={styles.poster} />;
  }

  return (
    <View style={[styles.poster, styles.posterFallback]}>
      <Ionicons name={item.type === 'tv' ? 'tv-outline' : 'film-outline'} size={24} color={colors.textMuted} />
      <Text style={styles.posterFallbackText}>{item.type === 'tv' ? 'Series' : 'Movie'}</Text>
    </View>
  );
}

export default function SearchResultScreen({ route, navigation }) {
  const { query: initialQuery } = route.params;
  const [query, setQuery] = useState(initialQuery || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(initialQuery || '');
    fetchSearch(initialQuery || '');
  }, [initialQuery]);

  const fetchSearch = async (value) => {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      const data = await fetchJson('/search', { q: trimmedValue });
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Search failed', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const openDetails = async (item) => {
    try {
      const data = await fetchJson('/details', {
        id: item.tmdb_id,
        type: item.type,
      });

      navigation.navigate(item.type === 'tv' ? 'TVDetailScreen' : 'PlayerScreen', { data });
    } catch (error) {
      console.error('Failed to open details:', error);
    }
  };

  const resultSummary = useMemo(() => {
    const movies = results.filter((item) => item.type === 'movie').length;
    const shows = results.filter((item) => item.type === 'tv').length;

    return { movies, shows };
  }, [results]);

  const renderItem = ({ item }) => {
    const genres = (item.genre_ids || []).map((id) => genreMap[id]).filter(Boolean).slice(0, 3);

    return (
      <TouchableOpacity style={styles.card} onPress={() => openDetails(item)} activeOpacity={0.86}>
        <PosterArtwork item={item} />

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={[styles.badge, item.type === 'tv' && styles.badgeTv]}>
              <Text style={[styles.badgeText, item.type === 'tv' && styles.badgeTextTv]}>
                {item.type === 'tv' ? 'SERIES' : 'MOVIE'}
              </Text>
            </View>
            <View style={styles.metaPill}>
              <Ionicons name="star" size={12} color={colors.accent} />
              <Text style={styles.metaPillText}>{getRating(item)}</Text>
            </View>
          </View>

          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>

          <Text style={styles.subMeta}>
            {getYear(item)}
            {genres.length ? ` • ${genres.join(', ')}` : ''}
          </Text>

          <Text style={styles.description} numberOfLines={3}>
            {item.overview || 'No overview available.'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Results</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#94A3B8" />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => fetchSearch(query)}
          placeholder="Search movies and TV shows"
          placeholderTextColor="#94A3B8"
          returnKeyType="search"
        />
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>{results.length} results</Text>
        <Text style={styles.summaryText}>
          {resultSummary.movies} movies • {resultSummary.shows} shows
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, idx) => `${item.type}-${item.tmdb_id}-${idx}`}
          renderItem={renderItem}
          contentContainerStyle={results.length ? styles.listContent : styles.emptyContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Ionicons name="search-outline" size={34} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No matches found</Text>
              <Text style={styles.emptyText}>Try another title, franchise, actor, or show name.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerTitle: {
    ...typography.heading,
    fontSize: 18,
  },
  headerSpacer: {
    width: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    marginHorizontal: 8,
    ...typography.body,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
  },
  summaryText: {
    ...typography.muted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  emptyContent: {
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
  },
  poster: {
    width: 84,
    height: 124,
    borderRadius: 12,
    backgroundColor: '#162133',
  },
  posterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  posterFallbackText: {
    ...typography.muted,
    fontSize: 11,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: 'rgba(250,204,21,0.14)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeTv: {
    backgroundColor: 'rgba(37,99,235,0.18)',
  },
  badgeText: {
    ...typography.body,
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.4,
  },
  badgeTextTv: {
    color: '#93c5fd',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaPillText: {
    ...typography.body,
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  title: {
    ...typography.heading,
    fontSize: 17,
    marginBottom: 6,
  },
  subMeta: {
    ...typography.muted,
    fontSize: 12,
    marginBottom: 8,
  },
  description: {
    ...typography.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    ...typography.heading,
    fontSize: 18,
    marginTop: 14,
    marginBottom: 8,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
});
