import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography } from '../theme';
import { isFavorite, toggleFavorite } from '../utils/favorites';
import CollectionRail from '../components/CollectionRail';
import { fetchMediaDetails } from '../utils/media';

const { width } = Dimensions.get('window');

export default function PlayerScreen({ route, navigation }) {
  const { data } = route.params;
  const {
    tmdb_id,
    title,
    description,
    poster,
    backdrop,
    embedUrl,
    embedUrls,
    trailerUrl,
    release_date,
    runtime,
    genres,
    movieCollection,
    similar = [],
  } = data;
  const [favorited, setFavorited] = useState(false);
  const [resolvedMovieCollection, setResolvedMovieCollection] = useState(movieCollection || null);

  const favoriteItem = useMemo(
    () => ({
      tmdb_id,
      type: 'movie',
      title,
      poster,
      backdrop,
      release_date,
    }),
    [tmdb_id, title, poster, backdrop, release_date]
  );

  useEffect(() => {
    const loadFavoriteState = async () => {
      const favoriteState = await isFavorite(tmdb_id, 'movie');
      setFavorited(favoriteState);
    };

    loadFavoriteState();
  }, [tmdb_id]);

  useEffect(() => {
    setResolvedMovieCollection(movieCollection || null);
  }, [movieCollection, tmdb_id]);

  useEffect(() => {
    let isActive = true;

    const refreshMovieCollection = async () => {
      if (movieCollection?.parts?.length || !tmdb_id) {
        return;
      }

      try {
        const refreshedData = await fetchMediaDetails({ tmdb_id, type: 'movie' });

        if (isActive && refreshedData?.movieCollection?.parts?.length) {
          setResolvedMovieCollection(refreshedData.movieCollection);
        }
      } catch (error) {
        console.error('Failed to refresh movie collection:', error);
      }
    };

    refreshMovieCollection();

    return () => {
      isActive = false;
    };
  }, [movieCollection, tmdb_id]);

  const handleToggleFavorite = async () => {
    try {
      const result = await toggleFavorite(favoriteItem);
      setFavorited(result.isFavorite);
    } catch (error) {
      console.error('Failed to toggle movie favorite:', error);
    }
  };

  const openDetails = async (item) => {
    try {
      const newData = await fetchMediaDetails({
        tmdb_id: item.tmdb_id,
        type: item.type || 'movie',
      });
      navigation.push('PlayerScreen', { data: newData });
    } catch (error) {
      console.error('Failed to fetch movie details:', error);
    }
  };
  const movieCollectionItems = (resolvedMovieCollection?.parts || []).filter(
    (item) => String(item.tmdb_id) !== String(tmdb_id)
  );

  return (
    <View style={styles.container}>
      <ImageBackground source={{ uri: backdrop || poster || undefined }} style={styles.background} blurRadius={20}>
        <LinearGradient colors={['rgba(0,0,0,0.4)', '#0f172a']} style={styles.gradient} />

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Movie Detail</Text>
          <TouchableOpacity onPress={handleToggleFavorite}>
            <Ionicons name={favorited ? 'heart' : 'heart-outline'} size={22} color={favorited ? colors.danger : 'white'} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.posterWrapper}>
            <Image source={{ uri: poster || backdrop || undefined }} style={styles.poster} />
          </View>

          <Text style={styles.title}>{title}</Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{release_date?.split('-')[0] || 'N/A'}</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.metaText}>{runtime ? `${runtime} minutes` : 'N/A'}</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.metaText}>{genres?.[0] || 'N/A'}</Text>
          </View>

          {(trailerUrl || embedUrl || embedUrls) && (
            <View style={styles.buttonRow}>
              {trailerUrl && (
                <TouchableOpacity
                  style={styles.trailerButton}
                  onPress={() => navigation.navigate('VideoPlayer', { embedUrl: trailerUrl })}
                >
                  <Ionicons name="play-circle-outline" size={18} color="white" />
                  <Text style={styles.trailerText}>Watch Trailer</Text>
                </TouchableOpacity>
              )}

              {(embedUrls || embedUrl) && (
                <TouchableOpacity
                  style={styles.watchButton}
                  onPress={() =>
                    navigation.navigate('VideoPlayer', {
                      embedUrls,
                      embedUrl,
                      title,
                    })
                  }
                >
                  <Ionicons name="videocam-outline" size={18} color="white" />
                  <Text style={styles.watchText}>Watch Now</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <Text style={styles.description}>{description}</Text>

          {movieCollectionItems.length > 0 ? (
            <CollectionRail
              title="From This Collection"
              subtitle={resolvedMovieCollection?.name}
              items={movieCollectionItems}
              mediaType="movie"
              emptyText=""
              onPressItem={openDetails}
            />
          ) : null}

          <CollectionRail
            title="You May Also Like"
            items={similar}
            mediaType="movie"
            emptyText=""
            onPressItem={openDetails}
          />
        </ScrollView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  background: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    paddingTop: 130,
    paddingBottom: 100,
  },
  posterWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  poster: {
    width: width * 0.65,
    height: width * 0.95,
    borderRadius: 20,
    resizeMode: 'cover',
    backgroundColor: colors.card,
  },
  title: {
    ...typography.heading,
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    gap: 4,
  },
  metaText: {
    ...typography.muted,
    fontSize: 14,
  },
  dot: {
    color: colors.textSecondary,
    marginHorizontal: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  trailerButton: {
    backgroundColor: colors.buttonPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
  },
  trailerText: {
    ...typography.button,
    color: colors.buttonPrimaryText,
    marginLeft: 8,
  },
  watchButton: {
    backgroundColor: colors.buttonSecondary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
  },
  watchText: {
    ...typography.button,
    color: colors.buttonSecondaryText,
    marginLeft: 8,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
});
