import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity,
  Dimensions, StyleSheet, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FilterModal from '../modals/FilterModal';
import { colors, typography } from '../theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width / 2.2;
const CARD_HEIGHT = CARD_WIDTH * 1.5;

export default function ViewAllScreen({ route, navigation }) {
  const { title, items: initialItems = [], genreId, type, sortBy = 'vote_average.desc' } = route.params;

  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(2);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({
    sort_by: sortBy,
    vote_count_gte: 300,
    vote_average_gte: 0,
    with_original_language: '',
  });

  const fetchMoreItems = async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    const query = new URLSearchParams({
      id: genreId,
      type,
      page,
      sort_by: filters.sort_by,
      vote_count_gte: filters.vote_count_gte,
      vote_average_gte: filters.vote_average_gte,
    });

    if (filters.with_original_language) {
      query.append('with_original_language', filters.with_original_language);
    }

    try {
      const res = await fetch(`https://streamcircleserver.onrender.com/genre/viewall?${query.toString()}`);
      const data = await res.json();

      const seen = new Set(items.map(i => i.tmdb_id));
      const uniqueNew = data.filter(item => !seen.has(item.tmdb_id));

      if (uniqueNew.length === 0) {
        setHasMore(false);
      } else {
        setItems(prev => [...prev, ...uniqueNew]);
        setPage(prev => prev + 1);
      }
    } catch (err) {
      console.error('Failed to load more:', err);
    }

    setLoading(false);
  };

  const openDetails = async (id) => {
    const res = await fetch(`https://streamcircleserver.onrender.com/details?id=${id}&type=${type}`);
    const data = await res.json();
    const screen = type === 'tv' ? 'TVDetailScreen' : 'PlayerScreen';
    navigation.navigate(screen, { data });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => openDetails(item.tmdb_id)} style={styles.card}>
      <Image source={{ uri: item.poster }} style={styles.poster} />
      <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.meta}>{item.year} · ⭐ {item.rating?.toFixed(1) || 'N/A'}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <TouchableOpacity onPress={() => setShowFilter(true)}>
          <Ionicons name="funnel-outline" size={22} color="white" />
        </TouchableOpacity>
      </View>

      {/* Grid List */}
      <FlatList
        data={items}
        keyExtractor={(item) => `${item.tmdb_id}`}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 12 }}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
        onEndReached={fetchMoreItems}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading && hasMore ? (
            <View style={{ paddingVertical: 20 }}>
              <ActivityIndicator color="#facc15" size="large" />
            </View>
          ) : null
        }
      />

      <FilterModal
        visible={showFilter}
        onClose={() => setShowFilter(false)}
        filters={filters}
        setFilters={setFilters}
        applyFilters={() => {
  // Enforce vote count minimum if Top Rated is selected
  setFilters(prev => ({
    ...prev,
    vote_count_gte: prev.sort_by === 'vote_average.desc' && !prev.vote_count_gte ? 300 : prev.vote_count_gte,
  }));

  setItems([]);
  setPage(1);
  setHasMore(true);
  setShowFilter(false);
}}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 70,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  headerTitle: {
    ...typography.heading,
    fontSize: 18,
    maxWidth: '70%',
    textAlign: 'center',
  },
  card: {
    width: CARD_WIDTH,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  poster: {
    width: '100%',
    height: CARD_HEIGHT,
    resizeMode: 'cover',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  title: {
    ...typography.label,
    fontSize: 14,
    paddingHorizontal: 8,
    marginTop: 6,
  },
  meta: {
    ...typography.muted,
    fontSize: 12,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
});