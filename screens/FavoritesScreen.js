import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography } from '../theme';
import { fetchJson } from '../utils/api';
import { getFavorites, toggleFavorite } from '../utils/favorites';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'movie', label: 'Movies' },
  { key: 'tv', label: 'TV Shows' },
];

function FavoritePoster({ item }) {
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

export default function FavoritesScreen({ navigation }) {
  const [favorites, setFavorites] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState(null);

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    const storedFavorites = await getFavorites();
    setFavorites(storedFavorites);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites])
  );

  const filteredFavorites = useMemo(() => {
    if (filter === 'all') {
      return favorites;
    }

    return favorites.filter((item) => item.type === filter);
  }, [favorites, filter]);

  const openFavorite = async (item) => {
    try {
      setOpeningId(`${item.type}-${item.tmdb_id}`);
      const data = await fetchJson('/details', { id: item.tmdb_id, type: item.type });
      const targetScreen = item.type === 'tv' ? 'TVDetailScreen' : 'PlayerScreen';
      const parentNavigation = navigation.getParent();

      if (parentNavigation?.navigate) {
        parentNavigation.navigate(targetScreen, { data });
      } else {
        navigation.navigate(targetScreen, { data });
      }
    } catch (error) {
      console.error('Failed to open favorite details:', error);
    } finally {
      setOpeningId(null);
    }
  };

  const handleToggleFavorite = async (item) => {
    const result = await toggleFavorite(item);
    setFavorites(result.favorites);
  };

  const renderFavorite = ({ item }) => {
    const year = item.release_date ? item.release_date.split('-')[0] : 'N/A';
    const isOpening = openingId === `${item.type}-${item.tmdb_id}`;

    return (
      <TouchableOpacity style={styles.card} onPress={() => openFavorite(item)} activeOpacity={0.88}>
        <FavoritePoster item={item} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.type === 'tv' ? 'SERIES' : 'MOVIE'}</Text>
            </View>
            <TouchableOpacity onPress={() => handleToggleFavorite(item)} hitSlop={10}>
              <Ionicons name="heart" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>

          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.meta}>{year}</Text>

          {isOpening ? (
            <ActivityIndicator size="small" color={colors.accent} style={styles.openingLoader} />
          ) : (
            <Text style={styles.tapHint}>Tap to open details</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favorites</Text>
        <Text style={styles.headerSubtitle}>Saved locally for quick rewatches.</Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.filterChip, filter === item.key && styles.filterChipActive]}
            onPress={() => setFilter(item.key)}
          >
            <Text style={[styles.filterChipText, filter === item.key && styles.filterChipTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : filteredFavorites.length === 0 ? (
        <View style={styles.centerState}>
          <Ionicons name="heart-outline" size={34} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptyText}>Save a movie or show from its detail screen and it will show up here.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredFavorites}
          keyExtractor={(item) => `${item.type}-${item.tmdb_id}`}
          renderItem={renderFavorite}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 58,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  headerTitle: {
    ...typography.heading,
    fontSize: 24,
    marginBottom: 6,
  },
  headerSubtitle: {
    ...typography.muted,
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  filterChip: {
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterChipText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
  },
  filterChipTextActive: {
    color: colors.accentText,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
  },
  poster: {
    width: 90,
    height: 132,
    borderRadius: 14,
    backgroundColor: '#162133',
  },
  posterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  posterFallbackText: {
    ...typography.muted,
    marginTop: 8,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  cardContent: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: 'rgba(250,204,21,0.14)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    ...typography.body,
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    ...typography.heading,
    fontSize: 17,
    lineHeight: 22,
    marginBottom: 6,
  },
  meta: {
    ...typography.muted,
    marginBottom: 12,
  },
  tapHint: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
  },
  openingLoader: {
    alignSelf: 'flex-start',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  emptyTitle: {
    ...typography.heading,
    fontSize: 18,
    marginTop: 14,
    marginBottom: 8,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    color: colors.textSecondary,
    lineHeight: 21,
  },
});
