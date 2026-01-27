// RandomScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ImageBackground,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography } from '../theme';

const { width } = Dimensions.get('window');

export default function RandomScreen({ navigation }) {
  const [randomItem, setRandomItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedType, setSelectedType] = useState('movie');   // 'movie' or 'tv'
  const [selectedGenre, setSelectedGenre] = useState(null);    // TMDB genre ID or null (no filter)
    const [selectedYear, setSelectedYear] = useState(null);
  useEffect(() => {
    // Fetch an initial random item on mount
    fetchRandomContent(selectedType, selectedGenre);
  }, []);

  const fetchRandomContent = async (type, genreId) => {
    try {
      setLoading(true);
      const genreParam = genreId ? `&genreId=${genreId}` : '';
      const yearParam = selectedYear ? `&year=${selectedYear}` : '';
      const res = await fetch(`https://streamcircleserver.onrender.com/random?type=${type}${genreParam}${yearParam}`);
      const data = await res.json();
      if (data) {
        // Normalize some fields for easy display
        const year = data.release_date ? data.release_date.slice(0, 4) : 'N/A';
        const rating = data.vote_average ? data.vote_average.toFixed(1) : 'N/A';
        setRandomItem({ ...data, year, rating });
      } else {
        setRandomItem(null);
      }
    } catch (err) {
      console.error('Random content fetch failed:', err);
      setRandomItem(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (!loading) {
      fetchRandomContent(selectedType, selectedGenre);
    }
  };

  const handleWatchNow = async () => {
    if (!randomItem) return;
    try {
      // Fetch full details (including stream info) then navigate
      const res = await fetch(
        `https://streamcircleserver.onrender.com/details?id=${randomItem.tmdb_id}&type=${randomItem.type}`
      );
      const data = await res.json();
      const targetScreen = data.type === 'tv' ? 'TVDetailScreen' : 'PlayerScreen';
      navigation.navigate(targetScreen, { data });
    } catch (err) {
      console.error('Failed to fetch details for playback:', err);
    }
  };

  // Prepare genre options (could also be fetched from TMDB API or a constant list)
 const movieGenres = [
  { id: 28, name: 'Action' }, { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' }, { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' }, { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' }, { id: 10751, name: 'Family' },
  { id: 14, name: 'Fantasy' }, { id: 36, name: 'History' },
  { id: 27, name: 'Horror' }, { id: 10402, name: 'Music' },
  { id: 9648, name: 'Mystery' }, { id: 10749, name: 'Romance' },
  { id: 878, name: 'Science Fiction' }, { id: 10770, name: 'TV Movie' },
  { id: 53, name: 'Thriller' }, { id: 10752, name: 'War' }, { id: 37, name: 'Western' }
];

const tvGenres = [
  { id: 10759, name: 'Action & Adventure' }, { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' }, { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' }, { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' }, { id: 10762, name: 'Kids' },
  { id: 9648, name: 'Mystery' }, { id: 10763, name: 'News' },
  { id: 10764, name: 'Reality' }, { id: 10765, name: 'Sci-Fi & Fantasy' },
  { id: 10766, name: 'Soap' }, { id: 10767, name: 'Talk' },
  { id: 10768, name: 'War & Politics' }, { id: 37, name: 'Western' }
];
  const genresList = selectedType === 'movie' ? movieGenres : tvGenres;

  return (
    <View style={styles.container}>
      {/* Background image (backdrop or poster) with blur */}
      {randomItem && (
        <ImageBackground
          source={{ uri: randomItem.backdrop || randomItem.poster }}
          style={styles.background}
          resizeMode="cover"
          blurRadius={10}
        >
          {/* Dark overlay for readability */}
          <LinearGradient colors={['rgba(15,23,42,0.4)', '#0f172a']} style={styles.overlay} />
        </ImageBackground>
      )}

      {/* Main content layer */}
      <View style={styles.content}>
        {/* Header bar with screen title and filter button */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            Random {selectedType === 'movie' ? 'Movie' : 'TV Show'}
          </Text>
          <TouchableOpacity onPress={() => setFilterVisible(true)}>
            <Ionicons name="options-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Random content details */}
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {randomItem ? (
            <>
              {/* Poster Image */}
              <View style={styles.posterWrapper}>
                <Image source={{ uri: randomItem.poster }} style={styles.posterImage} />
              </View>
              {/* Title and Metadata */}
              <Text style={styles.title}>{randomItem.title}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                <Text style={styles.meta}>{randomItem.year}</Text>
                <Text style={styles.meta}>·</Text>
                <Ionicons name="star" size={14} color={colors.accent} style={{ marginRight: 2 }} />
                <Text style={styles.meta}>{randomItem.rating}</Text>
            </View>
              {/* Description (overview) */}
              <Text style={styles.description}>
                {randomItem.overview || 'No description available.'}
              </Text>
            </>
          ) : (
            // If no item (e.g., error or not loaded) and not loading, show placeholder
            !loading && <Text style={styles.placeholderText}>No content found.</Text>
          )}
        </ScrollView>

        {/* "Watch Now" Button (fixed at bottom) */}
        <View style={styles.watchWrapper}>
          <TouchableOpacity 
            style={styles.watchButton} 
            onPress={handleWatchNow} 
            disabled={!randomItem || loading}
          >
            <Ionicons name="play" size={20} color="white" />
            <Text style={styles.watchButtonText}>Watch Now</Text>
          </TouchableOpacity>
        </View>

        {/* Floating "dice" refresh FAB */}
        <TouchableOpacity style={styles.fab} onPress={handleRefresh} disabled={loading}>
          <MaterialCommunityIcons name="dice-multiple" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* Filter Modal */}
      <Modal visible={filterVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <Text style={styles.filterTitle}>Filter Options</Text>
            {/* Type Toggle (Movies vs TV) */}
            <View style={styles.typeRow}>
              <TouchableOpacity 
                style={[styles.typeButton, selectedType === 'movie' && styles.typeButtonActive]}
                onPress={() => { setSelectedType('movie'); setSelectedGenre(null); }}
              >
                <Text style={[styles.typeButtonText, selectedType === 'movie' && styles.typeButtonTextActive]}>
                  Movies
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.typeButton, selectedType === 'tv' && styles.typeButtonActive]}
                onPress={() => { setSelectedType('tv'); setSelectedGenre(null); }}
              >
                <Text style={[styles.typeButtonText, selectedType === 'tv' && styles.typeButtonTextActive]}>
                  TV Shows
                </Text>
              </TouchableOpacity>
            </View>
            {/* Genre selection list */}
            <View style={styles.genreList}>
              <TouchableOpacity 
                style={[styles.genreItem, !selectedGenre && styles.genreItemActive]}
                onPress={() => setSelectedGenre(null)}
              >
                <Text style={styles.genreItemText}>All Genres</Text>
              </TouchableOpacity>
              {genresList.map((g) => (
                <TouchableOpacity 
                  key={g.id} 
                  style={[styles.genreItem, selectedGenre === g.id && styles.genreItemActive]}
                  onPress={() => setSelectedGenre(g.id)}
                >
                  <Text style={styles.genreItemText}>{g.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[typography.subtitle, { marginTop: 12 }]}>Year</Text>
                <View style={styles.genreList}>
                {[null, 2024, 2023, 2022, 2021, 2020, 2010].map((year) => (
                    <TouchableOpacity
                    key={year || 'any'}
                    style={[styles.genreItem, selectedYear === year && styles.genreItemActive]}
                    onPress={() => setSelectedYear(year)}
                    >
                    <Text style={styles.genreItemText}>{year || 'Any'}</Text>
                    </TouchableOpacity>
                ))}
                </View>
            {/* Modal action buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.applyButton} 
                onPress={() => {
                  setFilterVisible(false);
                  fetchRandomContent(selectedType, selectedGenre);
                }}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setFilterVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 30,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.7)',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    ...typography.heading,
    fontSize: 18,
  },
  posterWrapper: {
    alignItems: 'center',
    marginTop: 20,
  },
  posterImage: {
    width: width * 0.6,
    height: width * 0.9,
    borderRadius: 12,
    resizeMode: 'cover',
    marginBottom: 16,
  },
  title: {
    ...typography.heading,
    fontSize: 22,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  meta: {
    ...typography.muted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  description: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  placeholderText: {
    ...typography.body,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 50,
  },
  watchWrapper: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.buttonPrimary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  watchButtonText: {
    ...typography.button,
    color: colors.buttonPrimaryText,
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.buttonSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.6)',
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 20,
},

filterModal: {
  backgroundColor: colors.card,
  width: '100%',
  maxWidth: 400,
  maxHeight: '85%',
  padding: 20,
  borderRadius: 12,
},

filterTitle: {
  ...typography.heading,
  fontSize: 18,
  textAlign: 'center',
  marginBottom: 20,
},

typeRow: {
  flexDirection: 'row',
  justifyContent: 'center',
  marginBottom: 20,
  flexWrap: 'wrap',
  gap: 10,
},

typeButton: {
  paddingVertical: 6,
  paddingHorizontal: 16,
  borderRadius: 20,
  backgroundColor: colors.border,
  marginHorizontal: 5,
  marginBottom: 8,
},

typeButtonActive: {
  backgroundColor: colors.accent,
},

typeButtonText: {
  ...typography.body,
  fontWeight: '600',
  color: colors.textMuted,
},

typeButtonTextActive: {
  color: colors.accentText,
},

genreList: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: 8,
  marginBottom: 16,
},

genreItem: {
  backgroundColor: colors.border,
  borderRadius: 20,
  paddingHorizontal: 12,
  paddingVertical: 6,
},

genreItemActive: {
  backgroundColor: colors.accent,
},

genreItemText: {
  ...typography.body,
  fontSize: 13,
  color: colors.textPrimary,
},

modalActions: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginTop: 10,
},

applyButton: {
  backgroundColor: colors.buttonPrimary,
  borderRadius: 6,
  paddingVertical: 10,
  paddingHorizontal: 18,
},

applyButtonText: {
  ...typography.button,
  color: colors.buttonPrimaryText,
},

cancelButton: {
  paddingVertical: 10,
  paddingHorizontal: 18,
},

cancelButtonText: {
  ...typography.body,
  color: colors.textMuted,
  fontWeight: '600',
},
});
