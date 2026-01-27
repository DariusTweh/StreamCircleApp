import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography } from '../theme';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback } from 'react';

const { width } = Dimensions.get('window');
const POSTER_WIDTH = width / 3.2;
const POSTER_HEIGHT = POSTER_WIDTH * 1.5; // 2:3 ratio (poster-style)
const FEATURED_HEIGHT = 200;

export default function HomeScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [preloadedData, setPreloadedData] = useState({ movie: {}, tv: {} });
  const [genreRows, setGenreRows] = useState({});
  const [mediaFilter, setMediaFilter] = useState('movie');
  const [genreCache, setGenreCache] = useState({ movie: {}, tv: {} });
  const [loading, setLoading] = useState(true);

  
  useEffect(() => {
    preloadAll();
  }, []);

  useEffect(() => {
    fetchGenreRows();
  }, [mediaFilter]);

  const preloadAll = async () => {
    try {
      const [movieRes, tvRes] = await Promise.all([
        fetch(`https://streamcircleserver.onrender.com/preload?type=movie`).then(res => res.json()),
        fetch(`https://streamcircleserver.onrender.com/preload?type=tv`).then(res => res.json())
      ]);
      setPreloadedData({ movie: movieRes, tv: tvRes });
    } catch (err) {
      console.error('Preload failed:', err);
    }
  };
  const onLayoutRootView = useCallback(async () => {
  if (!loading) {
    await SplashScreen.hideAsync();
  }
}, [loading]);
  const fetchGenreRows = async () => {
    try {
      const res = await fetch(`https://streamcircleserver.onrender.com/homepage/genres?type=${mediaFilter}`);
      const data = await res.json();
      setGenreRows(data);
    } catch (err) {
      console.error('Genre rows failed:', err);
    }
  };

  const fetchSearch = () => {
    if (!query.trim()) return;
    navigation.navigate('SearchResultScreen', {
      query,
      type: mediaFilter,
    });
  };

  const openDetails = async (id) => {
    const res = await fetch(`https://streamcircleserver.onrender.com/details?id=${id}&type=${mediaFilter}`);
    const data = await res.json();
    navigation.navigate(mediaFilter === 'movie' ? 'PlayerScreen' : 'TVDetailScreen', { data });
  };

  const formatRuntime = (min) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}h ${m}m`;
  };

  const renderPoster = (item) => (
    <TouchableOpacity onPress={() => openDetails(item.tmdb_id)} style={styles.posterCard}>
      <Image source={{ uri: item.poster }} style={styles.posterImage} />
    </TouchableOpacity>
  );

const renderSection = (iconName, title, data) => (
  <View style={styles.sectionRow}>
    <View style={styles.sectionHeaderRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name={iconName} size={18} color="#facc15" style={{ marginRight: 8 }} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {title === 'Trending' && (
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, mediaFilter === 'movie' && styles.toggleActive]}
            onPress={() => setMediaFilter('movie')}
          >
            <Text style={[styles.toggleText, mediaFilter === 'movie' && styles.toggleTextActive]}>Films</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, mediaFilter === 'tv' && styles.toggleActive]}
            onPress={() => setMediaFilter('tv')}
          >
            <Text style={[styles.toggleText, mediaFilter === 'tv' && styles.toggleTextActive]}>Series</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
    <FlatList
      data={data}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item, index) => `${item.tmdb_id}-${index}`}
      renderItem={({ item }) => renderPoster(item)}
      contentContainerStyle={{ paddingHorizontal: 16 }}
    />
  </View>
);

  const genreMap = {
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
    99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
    27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction',
    10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
    10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News', 10764: 'Reality',
    10765: 'Sci-Fi & Fantasy', 10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics'
  };

  const preloaded = preloadedData[mediaFilter] || {};

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} onLayout={onLayoutRootView} >
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.burgerButton} onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.welcomeText}>StreamCircle</Text>
       
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={20} color="#94a3b8" style={{ marginRight: 10 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search movies, shows, genres..."
          placeholderTextColor="#94A3B8"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={fetchSearch}
        />
      </View>

      <View style={styles.featuredRow}>
        <FlatList
          data={mediaFilter === 'movie' ? preloaded.nowPlaying : preloaded.tvTrending}
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
              <Image source={{ uri: item.backdrop }} style={styles.featuredImage} />
              <LinearGradient colors={['transparent', 'rgba(15,23,42,0.95)']} style={styles.featuredGradient} />
              <View style={styles.featuredTextOverlay}>
                <Text style={styles.featuredTitle} numberOfLines={1}>{item.title}</Text>
               <Text style={styles.featuredMeta}>
  <Ionicons name="star" size={13} color="#facc15" /> {item.rating?.toFixed(1)} • {item.year || 'N/A'} • {item.runtime ? formatRuntime(item.runtime) : ''}
</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

   <View>
 <View style={{ display: mediaFilter === 'movie' ? 'flex' : 'none' }}>
  {renderSection('flame-outline', 'Trending', preloadedData.movie.trending)}
  {renderSection('film-outline', 'Now Playing', preloadedData.movie.nowPlaying)}
  {renderSection('star-outline', 'Top Rated', preloadedData.movie.topRated)}
  {renderSection('target-outline', 'Editor’s Picks', preloadedData.movie.editors)}
  {renderSection('calendar-outline', 'Upcoming Movies', preloadedData.movie.upcoming)}
</View>

<View style={{ display: mediaFilter === 'tv' ? 'flex' : 'none' }}>
  {renderSection('flame-outline', 'Trending', preloadedData.tv.tvTrending)}
  {renderSection('star-outline', 'Top Rated', preloadedData.tv.tvTopRated)}
</View>
</View>

   {Object.keys(genreRows).map((genreId) => (
  <View key={`genre-${genreId}`}>
    {renderSection('grid-outline', genreMap[genreId] || 'Genre', genreRows[genreId])}
  </View>
))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 60,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  welcomeText: {
    ...typography.heading,
    fontSize: 18,
    
  },
  profileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 16,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    color: colors.textPrimary,
    fontSize: 16,
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
  sectionRow: {
    marginBottom: 30,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    ...typography.heading,
    fontSize: 18,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 20,
  },
  toggleBtn: {
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  toggleActive: {
    backgroundColor: colors.accent,
  },
  toggleText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.background,
  },
  posterCard: {
    marginRight: 14,
  },
posterImage: {
  width: POSTER_WIDTH,
  height: POSTER_HEIGHT,
  borderRadius: 12,
  resizeMode: 'cover',
  backgroundColor: colors.card,
}
,
});
