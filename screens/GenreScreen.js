import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography } from '../theme';
import { fetchJson } from '../utils/api';
import { fetchMediaDetails, getMediaTargetScreen } from '../utils/media';
const { width } = Dimensions.get('window');
const FEATURED_HEIGHT = 200;
const POSTER_WIDTH = width / 3.2;
const POSTER_HEIGHT = POSTER_WIDTH * 1.5; 
const GENRE_ID_MAP = {
  28: { movie: 28, tv: 10759 },     // Action → Action & Adventure
  12: { movie: 12, tv: 10765 },     // Adventure → Sci-Fi & Fantasy
  16: { movie: 16, tv: 16 },        // Shared
  35: { movie: 35, tv: 35 },        // Comedy
  80: { movie: 80, tv: 80 },        // Crime
  99: { movie: 99, tv: 99 },        // Documentary
  18: { movie: 18, tv: 18 },        // Drama
  10751: { movie: 10751, tv: 10751 }, // Family
  14: { movie: 14, tv: 10765 },     // Fantasy → Sci-Fi & Fantasy
  36: { movie: 36, tv: 36 },
  27: { movie: 27, tv: 9648 },      // Horror → Mystery
  10402: { movie: 10402, tv: 10402 },
  9648: { movie: 9648, tv: 9648 },
  10749: { movie: 10749, tv: 10766 }, // Romance → Soap
  878: { movie: 878, tv: 10765 },   // Sci-Fi → Sci-Fi & Fantasy
  10770: { movie: 10770, tv: 10762 }, // TV Movie → Kids
  53: { movie: 53, tv: 9648 },      // Thriller → Mystery
  10752: { movie: 10752, tv: 10768 }, // War → War & Politics
  37: { movie: 37, tv: 37 },
};


export default function GenreScreen({ route, navigation }) {
  const { genreId, genreTitle, mediaType } = route.params;
  const [topPicks, setTopPicks] = useState([]);
  const [combos, setCombos] = useState({});
    const [mode, setMode] = useState(mediaType || 'movie'); // movie or tv
  const effectiveId = GENRE_ID_MAP[genreId]?.[mode] || genreId;
  const [cache, setCache] = useState({ movie: null, tv: null });
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
  const preloadAllModes = async () => {
    if (cache.movie && cache.tv) {
      const { topPicks, combos } = cache[mode];
      setTopPicks(topPicks);
      setCombos(combos);
      return;
    }

    try {
      const [movieTop, movieCombos, tvTop, tvCombos] = await Promise.all([
        fetchJson('/genre/top', { id: GENRE_ID_MAP[genreId]?.movie || genreId, type: 'movie' }),
        fetchJson('/genre/combos', { id: GENRE_ID_MAP[genreId]?.movie || genreId, type: 'movie' }),
        fetchJson('/genre/top', { id: GENRE_ID_MAP[genreId]?.tv || genreId, type: 'tv' }),
        fetchJson('/genre/combos', { id: GENRE_ID_MAP[genreId]?.tv || genreId, type: 'tv' }),
      ]);

      const newCache = {
        movie: { topPicks: movieTop, combos: movieCombos },
        tv: { topPicks: tvTop, combos: tvCombos },
      };

      setCache(newCache);
      setTopPicks(newCache[mode].topPicks);
      setCombos(newCache[mode].combos);
    } catch (err) {
      console.error('Genre preload failed:', err);
    }
  };

  preloadAllModes();
}, [genreId]);
// 2. When user toggles between movie/tv, swap cached data
useEffect(() => {
  if (cache[mode]) {
    setTopPicks(cache[mode].topPicks);
    setCombos(cache[mode].combos);
  }
}, [cache, mode]);


const openDetails = async (id) => {
  try {
    const data = await fetchMediaDetails({ tmdb_id: id, type: mode });
    navigation.push(getMediaTargetScreen(data.type || mode), { data });
  } catch (error) {
    console.error('Failed to open genre detail:', error);
  }
};
  const formatRuntime = (min) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}h ${m}m`;
    };
  const renderPoster = (item) => (
    <TouchableOpacity key={item.tmdb_id} onPress={() => openDetails(item.tmdb_id)} style={styles.posterCard}>
      <Image source={{ uri: item.poster }} style={styles.posterImage} />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{genreTitle}</Text>
       <TouchableOpacity onPress={() => setShowSearch(!showSearch)}>
  <Ionicons name={showSearch ? 'close' : 'search'} size={20} color="white" />
</TouchableOpacity>
      </View>
      {showSearch && (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Search in genre..."
              placeholderTextColor="#94a3b8"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => {
                if (searchQuery.trim()) {
                  navigation.navigate('SearchResultScreen', {
                    query: searchQuery.trim(),
                  });
                  setSearchQuery('');
                  setShowSearch(false);
                }
              }}
            />
          </View>
        )}

      {/* Hero Banner */}
      <View style={styles.featuredRow}>
        <FlatList
          data={topPicks}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => `${item.tmdb_id}`}
          contentContainerStyle={{ paddingLeft: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => openDetails(item.tmdb_id)}
              style={styles.featuredCard}
              activeOpacity={0.9}
            >
            <Image
            source={{ uri: item.backdrop }}
            style={styles.featuredImage}
            />

              <LinearGradient
                colors={['transparent', 'rgba(15,23,42,0.95)']}
                style={styles.featuredGradient}
              />

              <View style={styles.featuredTextOverlay}>
                <Text style={styles.featuredTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                           <Text style={styles.featuredMeta}>
  <Ionicons name="star" size={13} color="#facc15" /> {item.rating?.toFixed(1)} • {item.year || 'N/A'} • {item.runtime ? formatRuntime(item.runtime) : ''}
</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Toggle Buttons */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          onPress={() => setMode('movie')}
          style={[styles.toggleBtn, mode === 'movie' && styles.toggleActive]}
        >
          <Text style={[styles.toggleText, mode === 'movie' && styles.toggleTextActive]}>Movies</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setMode('tv')}
          style={[styles.toggleBtn, mode === 'tv' && styles.toggleActive]}
        >
          <Text style={[styles.toggleText, mode === 'tv' && styles.toggleTextActive]}>TV Shows</Text>
        </TouchableOpacity>
      </View>

      {/* Genre Combos */}
      {Object.keys(combos).map((label, idx) => (
        <View key={`section-${idx}`} style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>{label}</Text>
            <TouchableOpacity
  onPress={() =>
 navigation.navigate('ViewAllScreen', {
  title: label,
  items: combos[label],        // ← page 1 results
  genreId: effectiveId,        // ← to fetch more
  type: mode,                  // ← 'movie' or 'tv'
  sortBy: 'vote_average.desc'  // ← use 'popularity.desc' or whatever matches label
})
  }
>
  <Text style={styles.viewAll}>View All</Text>
</TouchableOpacity>

          </View>
          <FlatList
            data={combos[label]}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => `${item.tmdb_id}`}
            renderItem={({ item }) => renderPoster(item)}
            contentContainerStyle={{ paddingHorizontal: 12 }}
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 50,
  },
  searchBar: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#1e293b',
  marginHorizontal: 16,
  borderRadius: 14,
  paddingHorizontal: 12,
  paddingVertical: 10,
  marginBottom: 10,
},
searchInput: {
  flex: 1,
  color: 'white',
  fontSize: 15,
},

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerTitle: {
    ...typography.heading,
    fontSize: 18,
  },
  featuredRow: {
    marginTop: 10,
    marginBottom: 8,
  },
  featuredCard: {
    width: width * 0.85,
    height: FEATURED_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 16,
    backgroundColor: colors.card,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    resizeMode: 'cover',
  },
  featuredGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
  },
  featuredTextOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  featuredTitle: {
    ...typography.heading,
    fontSize: 20,
    marginBottom: 4,
  },
  featuredMeta: {
    ...typography.muted,
    fontSize: 13,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: colors.card,
    borderRadius: 20,
    marginVertical: 10,
  },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 20,
  },
  toggleText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  toggleActive: {
    backgroundColor: colors.accent,
    borderRadius: 20,
  },
  toggleTextActive: {
    color: colors.background,
  },
  section: {
    marginTop: 16,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    ...typography.heading,
    fontSize: 16,
  },
  viewAll: {
    ...typography.muted,
    fontSize: 13,
  },
  posterCard: {
    marginRight: 12,
  },
  posterImage: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: 10,
    backgroundColor: colors.card,
  },
});
