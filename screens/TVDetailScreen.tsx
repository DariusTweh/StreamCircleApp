import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography } from '../theme';
import { fetchJson } from '../utils/api';
import { isFavorite, toggleFavorite } from '../utils/favorites';
import CollectionRail from '../components/CollectionRail';
import { fetchMediaDetails, normalizeMediaItem } from '../utils/media';

const { width } = Dimensions.get('window');
const EMPTY_ITEMS = [];

function pickRandomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffleItems(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function dedupeMediaItems(items = []) {
  const seen = new Set();

  return items.reduce((result, item) => {
    const normalizedItem = normalizeMediaItem(item, 'tv');

    if (!normalizedItem?.tmdb_id) {
      return result;
    }

    const key = `${normalizedItem.type}-${normalizedItem.tmdb_id}`;

    if (seen.has(key)) {
      return result;
    }

    seen.add(key);
    result.push(normalizedItem);
    return result;
  }, []);
}

export default function TVDetailScreen({ route, navigation }) {
  const { data } = route.params;
  const {
    title,
    description,
    poster,
    backdrop,
    tmdb_id,
    seasons: rawSeasons,
    release_date,
    imdb_id,
    tvdb_id,
  } = data;
  const seasons = useMemo(
    () => (Array.isArray(rawSeasons) ? rawSeasons : EMPTY_ITEMS),
    [rawSeasons]
  );
  const recommendations = useMemo(
    () => (Array.isArray(data.recommendations) ? data.recommendations : EMPTY_ITEMS),
    [data.recommendations]
  );
  const similar = useMemo(
    () => (Array.isArray(data.similar) ? data.similar : EMPTY_ITEMS),
    [data.similar]
  );

  const validSeasons = useMemo(
    () => seasons.filter((season) => Number.isInteger(season.season_number) && season.season_number > 0),
    [seasons]
  );
  const [selectedSeason, setSelectedSeason] = useState(validSeasons[0]?.season_number || 1);
  const [episodes, setEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [expandedEpisodeId, setExpandedEpisodeId] = useState(null);
  const [randomAnySeasonLoading, setRandomAnySeasonLoading] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [dynamicRecommendations, setDynamicRecommendations] = useState(() =>
    dedupeMediaItems(recommendations)
  );
  const [dynamicSimilar, setDynamicSimilar] = useState(() => dedupeMediaItems(similar));
  const [relatedLoading, setRelatedLoading] = useState(false);

  const favoriteItem = useMemo(
    () => ({
      tmdb_id,
      type: 'tv',
      title,
      poster,
      backdrop,
      release_date,
    }),
    [tmdb_id, title, poster, backdrop, release_date]
  );

  const loadFavoriteState = async () => {
    const favoriteState = await isFavorite(tmdb_id, 'tv');
    setFavorited(favoriteState);
  };

  const normalizeEpisodes = (items = []) =>
    items.filter((item) => Number.isInteger(item?.episode_number) && item.episode_number > 0);

  const fetchEpisodes = async (seasonNumber, options = { updateState: true }) => {
    if (options.updateState) {
      setLoadingEpisodes(true);
    }

    try {
      const data = await fetchJson('/episodes', { tv_id: tmdb_id, season: seasonNumber });
      const validEpisodes = normalizeEpisodes(data);

      if (options.updateState) {
        setEpisodes(validEpisodes);
      }

      return validEpisodes;
    } catch (err) {
      console.error('Failed to fetch episodes:', err);

      if (options.updateState) {
        setEpisodes([]);
      }

      return [];
    } finally {
      if (options.updateState) {
        setLoadingEpisodes(false);
      }
    }
  };

  const openEpisodePlayer = (seasonNumber, episodeNumber, seasonEpisodes) => {
    navigation.navigate('EpisodePlayerScreen', {
      tmdb_id,
      season: seasonNumber,
      episode: episodeNumber,
      episodes: seasonEpisodes,
      seasons: validSeasons,
      imdb_id,
      tvdb_id,
      show: favoriteItem,
    });
  };

  const openRelatedShow = async (item) => {
    try {
      const nextData = await fetchMediaDetails({
        tmdb_id: item.tmdb_id,
        type: item.type || 'tv',
      });
      navigation.push('TVDetailScreen', { data: nextData });
    } catch (error) {
      console.error('Failed to open related show:', error);
    }
  };

  useEffect(() => {
    if (tmdb_id && selectedSeason) {
      fetchEpisodes(selectedSeason);
    }
  }, [tmdb_id, selectedSeason]);

  useEffect(() => {
    loadFavoriteState();
  }, [tmdb_id]);

  useEffect(() => {
    setDynamicRecommendations(dedupeMediaItems(recommendations));
    setDynamicSimilar(dedupeMediaItems(similar));
  }, [recommendations, similar]);

  useEffect(() => {
    let isActive = true;
    const needsRecommendations = !recommendations?.length;
    const needsSimilar = !similar?.length;

    if (!needsRecommendations && !needsSimilar) {
      return undefined;
    }

    const loadDynamicRails = async () => {
      try {
        setRelatedLoading(true);
        const [recommendationResponse, similarResponse] = await Promise.allSettled([
          needsRecommendations
            ? fetchJson('/collections/tv/dynamic', { kind: 'recommendations', id: tmdb_id })
            : Promise.resolve(null),
          needsSimilar
            ? fetchJson('/collections/tv/dynamic', { kind: 'similar', id: tmdb_id })
            : Promise.resolve(null),
        ]);

        if (!isActive) {
          return;
        }

        if (recommendationResponse.status === 'fulfilled' && Array.isArray(recommendationResponse.value?.items)) {
          setDynamicRecommendations(dedupeMediaItems(recommendationResponse.value.items));
        }

        if (similarResponse.status === 'fulfilled' && Array.isArray(similarResponse.value?.items)) {
          setDynamicSimilar(dedupeMediaItems(similarResponse.value.items));
        }
      } catch (error) {
        console.error('Failed to load dynamic TV rails:', error);
      } finally {
        if (isActive) {
          setRelatedLoading(false);
        }
      }
    };

    loadDynamicRails();

    return () => {
      isActive = false;
    };
  }, [tmdb_id, recommendations, similar]);

  const handleToggleFavorite = async () => {
    try {
      const result = await toggleFavorite(favoriteItem);
      setFavorited(result.isFavorite);
    } catch (error) {
      console.error('Failed to toggle TV favorite:', error);
    }
  };

  const handleRandomThisSeason = () => {
    const validEpisodes = normalizeEpisodes(episodes);

    if (!validEpisodes.length) {
      Alert.alert('No episodes available', 'This season does not have any playable episodes yet.');
      return;
    }

    const chosenEpisode = pickRandomItem(validEpisodes);
    openEpisodePlayer(selectedSeason, chosenEpisode.episode_number, validEpisodes);
  };

  const handleRandomAnySeason = async () => {
    if (!validSeasons.length) {
      Alert.alert('No seasons available', 'This show does not have any playable seasons yet.');
      return;
    }

    try {
      setRandomAnySeasonLoading(true);
      const seasonsToTry = shuffleItems(validSeasons);

      for (const randomSeason of seasonsToTry) {
        const randomSeasonEpisodes =
          randomSeason.season_number === selectedSeason
            ? normalizeEpisodes(episodes)
            : await fetchEpisodes(randomSeason.season_number, { updateState: false });

        if (!randomSeasonEpisodes.length) {
          continue;
        }

        const chosenEpisode = pickRandomItem(randomSeasonEpisodes);
        openEpisodePlayer(randomSeason.season_number, chosenEpisode.episode_number, randomSeasonEpisodes);
        return;
      }

      Alert.alert('No episodes available', 'We could not find a playable episode in any season for this show.');
    } catch (error) {
      console.error('Failed random any season pick:', error);
      Alert.alert('Random pick failed', 'We could not load a random episode right now.');
    } finally {
      setRandomAnySeasonLoading(false);
    }
  };

  const actionsDisabled = loadingEpisodes || randomAnySeasonLoading;
  const recommendationItems = dynamicRecommendations.filter((item) => String(item.tmdb_id) !== String(tmdb_id));
  const similarItems = dynamicSimilar.filter((item) => String(item.tmdb_id) !== String(tmdb_id));
  const recommendedNextItems = recommendationItems.length ? recommendationItems : similarItems;
  const moreLikeThisItems = recommendationItems.length ? similarItems : [];
  const hasRelatedRails = recommendedNextItems.length > 0 || moreLikeThisItems.length > 0 || relatedLoading;

  const renderEpisode = ({ item }) => {
    const isExpanded = expandedEpisodeId === item.episode_number;

    return (
      <View
        style={[
          styles.episodeCard,
          isExpanded && styles.episodeCardActive,
          { marginBottom: 16, marginHorizontal: 16 },
        ]}
      >
        {item.still ? <Image source={{ uri: item.still }} style={styles.episodeThumb} /> : <View style={[styles.episodeThumb, styles.episodeThumbFallback]} />}

        <View style={styles.episodeContent}>
          <View style={styles.episodeHeader}>
            <View style={styles.episodeHeaderText}>
              <Text style={styles.episodeTitle}>{item.name || `Episode ${item.episode_number}`}</Text>
              <Text style={styles.episodeMeta}>{item.air_date || 'Air date unavailable'}</Text>
            </View>

            <TouchableOpacity
              onPress={() => openEpisodePlayer(selectedSeason, item.episode_number, episodes)}
              style={styles.watchButton}
            >
              <Ionicons name="play" size={20} color="white" />
              <Text style={styles.watchText}>Watch</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => setExpandedEpisodeId(isExpanded ? null : item.episode_number)}>
            <Text style={styles.episodeDesc} numberOfLines={isExpanded ? undefined : 2}>
              {item.overview || 'No description available.'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Image source={{ uri: poster || backdrop || undefined }} style={styles.bgImage} blurRadius={20} />
      <LinearGradient colors={['rgba(0,0,0,0.3)', '#0f172a']} style={styles.overlay} />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>TV Details</Text>
        <TouchableOpacity onPress={handleToggleFavorite}>
          <Ionicons name={favorited ? 'heart' : 'heart-outline'} size={22} color={favorited ? colors.danger : 'white'} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={episodes}
        keyExtractor={(item) => `ep-${item.episode_number}`}
        renderItem={renderEpisode}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListHeaderComponent={
          <>
            <View style={styles.posterWrapper}>
              <Image source={{ uri: poster || backdrop || undefined }} style={styles.poster} />
            </View>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>

            <View style={styles.randomActions}>
              <TouchableOpacity
                style={[styles.randomButton, actionsDisabled && styles.randomButtonDisabled]}
                onPress={handleRandomThisSeason}
                disabled={actionsDisabled}
              >
                <Ionicons name="shuffle-outline" size={16} color="white" />
                <Text style={styles.randomButtonText}>Random This Season</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.randomButton, styles.randomButtonSecondary, actionsDisabled && styles.randomButtonDisabled]}
                onPress={handleRandomAnySeason}
                disabled={actionsDisabled}
              >
                {randomAnySeasonLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="sparkles-outline" size={16} color="white" />
                )}
                <Text style={styles.randomButtonText}>Random Any Season</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.randomSubtitle}>Perfect for comfort shows and casual rewatches.</Text>

            {validSeasons.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.seasonRow}>
                {validSeasons.map((season) => (
                  <TouchableOpacity
                    key={season.season_number}
                    style={[
                      styles.seasonButton,
                      season.season_number === selectedSeason && styles.seasonButtonActive,
                    ]}
                    onPress={() => setSelectedSeason(season.season_number)}
                  >
                    <Text
                      style={[
                        styles.seasonText,
                        season.season_number === selectedSeason && styles.seasonTextActive,
                      ]}
                    >
                      {season.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.seasonFallbackText}>No seasons available.</Text>
            )}

            {loadingEpisodes && <ActivityIndicator color="white" size="large" style={styles.loadingSpinner} />}
          </>
        }
        ListFooterComponent={
          hasRelatedRails ? (
            <View style={styles.relatedRails}>
              <CollectionRail
                title="Recommended Next"
                subtitle=""
                items={recommendedNextItems}
                mediaType="tv"
                loading={relatedLoading && recommendedNextItems.length === 0}
                emptyText=""
                onPressItem={openRelatedShow}
              />

              <CollectionRail
                title="More Like This"
                subtitle=""
                items={moreLikeThisItems}
                mediaType="tv"
                loading={relatedLoading && moreLikeThisItems.length === 0 && recommendationItems.length > 0}
                emptyText=""
                onPressItem={openRelatedShow}
              />
            </View>
          ) : null
        }
        ListEmptyComponent={
          loadingEpisodes ? null : (
            <View style={styles.emptyEpisodes}>
              <Text style={styles.emptyEpisodesText}>No episodes were returned for this season.</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.7)',
  },
  topBar: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topTitle: {
    ...typography.body,
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  posterWrapper: {
    alignItems: 'center',
    marginTop: 120,
  },
  poster: {
    width: width * 0.6,
    height: width * 0.9,
    borderRadius: 20,
    resizeMode: 'cover',
    marginBottom: 10,
    backgroundColor: colors.card,
  },
  title: {
    ...typography.heading,
    fontSize: 22,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  randomActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 10,
  },
  randomButton: {
    flex: 1,
    backgroundColor: colors.buttonPrimary,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  randomButtonSecondary: {
    backgroundColor: colors.buttonSecondary,
  },
  randomButtonDisabled: {
    opacity: 0.6,
  },
  randomButtonText: {
    ...typography.button,
    color: '#fff',
    marginLeft: 8,
    fontSize: 13,
  },
  randomSubtitle: {
    ...typography.muted,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 28,
    marginBottom: 12,
  },
  seasonRow: {
    paddingHorizontal: 16,
    marginVertical: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  seasonButton: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 10,
    marginBottom: 8,
  },
  seasonButtonActive: {
    backgroundColor: colors.buttonSecondary,
  },
  seasonText: {
    ...typography.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  seasonTextActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  seasonFallbackText: {
    ...typography.muted,
    textAlign: 'center',
    marginBottom: 16,
  },
  loadingSpinner: {
    marginTop: 20,
  },
  relatedRails: {
    marginTop: 12,
  },
  episodeCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  episodeCardActive: {
    backgroundColor: '#243244',
  },
  episodeThumb: {
    width: 120,
    height: 75,
    borderRadius: 10,
    backgroundColor: '#162133',
  },
  episodeThumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodeContent: {
    flex: 1,
    paddingLeft: 10,
  },
  episodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  episodeHeaderText: {
    flex: 1,
  },
  episodeTitle: {
    ...typography.heading,
    fontSize: 16,
    color: colors.textPrimary,
  },
  episodeMeta: {
    ...typography.muted,
    fontSize: 12,
    marginTop: 2,
  },
  episodeDesc: {
    ...typography.body,
    fontSize: 13,
    color: '#e2e8f0',
    marginTop: 8,
    lineHeight: 18,
  },
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.buttonPrimary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  watchText: {
    ...typography.button,
    fontSize: 14,
    marginLeft: 4,
  },
  emptyEpisodes: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  emptyEpisodesText: {
    ...typography.muted,
    textAlign: 'center',
  },
});
