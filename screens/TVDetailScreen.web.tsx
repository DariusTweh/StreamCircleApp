import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import WebHeaderSearch from '../components/WebHeaderSearch';
import { fetchJson } from '../utils/api';
import { isFavorite, toggleFavorite } from '../utils/favorites';
import { fetchMediaDetails, normalizeMediaItem, getMediaYear } from '../utils/media';
import { navigateToHomeMode } from '../utils/webNavigation';

const logoAsset = require('../assets/logo.png');
const EMPTY_ITEMS = [];

const NAV_ITEMS = [
  { key: 'home', label: 'Home' },
  { key: 'tv', label: 'TV Shows' },
  { key: 'movie', label: 'Movies' },
];

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

function notify(title, message) {
  if (typeof globalThis?.alert === 'function') {
    globalThis.alert(message ? `${title}\n\n${message}` : title);
  }
}

function Footer() {
  return (
    <View style={styles.footer}>
      <View style={styles.footerTopRow}>
        <View style={styles.footerIntro}>
          <Text style={styles.footerDownloadTitle}>Download our mobile app</Text>
          <Text style={styles.footerDownloadText}>
            Sync up your comfort-show rotation with our mobile app for a faster episode-hop workflow.
          </Text>
        </View>

        <View style={styles.appBadgeGroup}>
          <Text style={styles.appBadgeLabel}>Available on</Text>
          <View style={styles.appBadgeList}>
            <TouchableOpacity style={styles.appBadge}>
              <Ionicons name="logo-apple" size={20} color="#f8fafc" />
              <Text style={styles.appBadgeText}>App Store</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.appBadge}>
              <Ionicons name="logo-google-playstore" size={18} color="#f8fafc" />
              <Text style={styles.appBadgeText}>Google Play</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.footerBottomRow}>
        <View style={styles.footerBrandBlock}>
          <Text style={styles.footerBrand}>StreamCircle</Text>
          <Text style={styles.footerBrandText}>
            123 Lorem Street{'\n'}
            StreamCircle, California
          </Text>
        </View>

        <View style={styles.footerLinksRow}>
          <View style={styles.footerLinkColumn}>
            <Text style={styles.footerLinkHeading}>special</Text>
            <Text style={styles.footerLink}>about us</Text>
            <Text style={styles.footerLink}>privacy policy</Text>
            <Text style={styles.footerLink}>terms & condition</Text>
            <Text style={styles.footerLink}>careers</Text>
          </View>

          <View style={styles.footerLinkColumn}>
            <Text style={styles.footerLinkHeading}>support</Text>
            <Text style={styles.footerLink}>help</Text>
            <Text style={styles.footerLink}>faq</Text>
            <Text style={styles.footerLink}>contact us</Text>
            <Text style={styles.footerLink}>customer service</Text>
          </View>

          <View style={styles.footerLinkColumn}>
            <Text style={styles.footerLinkHeading}>users</Text>
            <Text style={styles.footerLink}>media center</Text>
            <Text style={styles.footerLink}>partner</Text>
            <Text style={styles.footerLink}>plans</Text>
            <Text style={styles.footerLink}>offers</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function PersonCard({ person }) {
  return (
    <View style={styles.personCard}>
      {person?.profile ? (
        <Image source={{ uri: person.profile }} style={styles.personAvatar} />
      ) : (
        <View style={[styles.personAvatar, styles.personAvatarFallback]}>
          <Ionicons name="person-outline" size={20} color="#f8fafc" />
        </View>
      )}
      <Text style={styles.personName} numberOfLines={1}>
        {person?.name}
      </Text>
      <Text style={styles.personRole} numberOfLines={2}>
        {person?.role || ''}
      </Text>
    </View>
  );
}

function EpisodeCard({ item, seasonNumber, seasonEpisodes, onPress }) {
  return (
    <TouchableOpacity
      style={styles.episodeCard}
      activeOpacity={0.9}
      onPress={() => onPress(seasonNumber, item.episode_number, seasonEpisodes)}
    >
      {item?.still ? (
        <Image source={{ uri: item.still }} style={styles.episodeImage} />
      ) : (
        <View style={[styles.episodeImage, styles.episodeImageFallback]}>
          <Ionicons name="tv-outline" size={28} color="#f8fafc" />
        </View>
      )}

      <View style={styles.episodeBody}>
        <Text style={styles.episodeEyebrow}>Episode {item.episode_number}</Text>
        <Text style={styles.episodeTitle} numberOfLines={1}>
          {item.name || `Episode ${item.episode_number}`}
        </Text>
        <Text style={styles.episodeDescription} numberOfLines={3}>
          {item.overview || 'No description available for this episode yet.'}
        </Text>
        <Text style={styles.episodeMeta}>{item.air_date || 'Air date unavailable'}</Text>
      </View>
    </TouchableOpacity>
  );
}

function RelatedCard({ item, onPress }) {
  const artwork = item?.poster || item?.backdrop || null;

  return (
    <TouchableOpacity style={styles.relatedCard} onPress={() => onPress(item)} activeOpacity={0.9}>
      {artwork ? (
        <Image source={{ uri: artwork }} style={styles.relatedPoster} />
      ) : (
        <View style={[styles.relatedPoster, styles.relatedPosterFallback]}>
          <Ionicons name={item.type === 'tv' ? 'tv-outline' : 'film-outline'} size={26} color="#f8fafc" />
        </View>
      )}
      <Text style={styles.relatedTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.relatedMeta} numberOfLines={1}>
        {item.type === 'tv' ? 'Series' : 'Movie'}
        {item.release_date ? ` • ${String(item.release_date).split('-')[0]}` : ''}
      </Text>
    </TouchableOpacity>
  );
}

function InfoItem({ label, value }) {
  if (!value) {
    return null;
  }

  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
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
    genres = [],
    embedUrl,
    embedUrls,
    cast = [],
    directors = [],
    writers = [],
    creators = [],
    spoken_languages = [],
    rating_label,
    number_of_seasons,
    number_of_episodes,
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

  const normalizeEpisodes = (items = []) =>
    items.filter((item) => Number.isInteger(item?.episode_number) && item.episode_number > 0);

  const fetchEpisodes = async (seasonNumber, options = { updateState: true }) => {
    if (options.updateState) {
      setLoadingEpisodes(true);
    }

    try {
      const response = await fetchJson('/episodes', { tv_id: tmdb_id, season: seasonNumber });
      const validEpisodesForSeason = normalizeEpisodes(response);

      if (options.updateState) {
        setEpisodes(validEpisodesForSeason);
      }

      return validEpisodesForSeason;
    } catch (error) {
      console.error('Failed to fetch TV episodes:', error);

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
      show: {
        ...favoriteItem,
        description,
        genres,
        rating_label,
        number_of_seasons: number_of_seasons || validSeasons.length,
      },
    });
  };

  const openRelatedShow = async (item) => {
    try {
      const nextData = await fetchMediaDetails({
        tmdb_id: item.tmdb_id,
        type: item.type || 'tv',
      });
      navigation.navigate('TVDetailScreen', { data: nextData });
    } catch (error) {
      console.error('Failed to open related show:', error);
    }
  };

  const openHomeMode = (mode) => {
    navigateToHomeMode(navigation, mode);
  };

  useEffect(() => {
    const loadFavoriteState = async () => {
      const favoriteState = await isFavorite(tmdb_id, 'tv');
      setFavorited(favoriteState);
    };

    loadFavoriteState();
  }, [tmdb_id]);

  useEffect(() => {
    if (tmdb_id && selectedSeason) {
      fetchEpisodes(selectedSeason);
    }
  }, [selectedSeason, tmdb_id]);

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

  const handlePlaySelected = async () => {
    if (!selectedSeason) {
      notify('No season selected', 'Pick a season before starting playback.');
      return;
    }

    let seasonEpisodes = normalizeEpisodes(episodes);

    if (!seasonEpisodes.length) {
      seasonEpisodes = await fetchEpisodes(selectedSeason, { updateState: false });
    }

    if (!seasonEpisodes.length) {
      notify('No episodes available', 'This season does not have any playable episodes yet.');
      return;
    }

    const firstEpisode = seasonEpisodes[0];
    openEpisodePlayer(selectedSeason, firstEpisode.episode_number, seasonEpisodes);
  };

  const handleRandomThisSeason = async () => {
    let seasonEpisodes = normalizeEpisodes(episodes);

    if (!seasonEpisodes.length) {
      seasonEpisodes = await fetchEpisodes(selectedSeason, { updateState: false });
    }

    if (!seasonEpisodes.length) {
      notify('No episodes available', 'This season does not have any playable episodes yet.');
      return;
    }

    const chosenEpisode = pickRandomItem(seasonEpisodes);
    openEpisodePlayer(selectedSeason, chosenEpisode.episode_number, seasonEpisodes);
  };

  const handleRandomAnySeason = async () => {
    if (!validSeasons.length) {
      notify('No seasons available', 'This show does not have any playable seasons yet.');
      return;
    }

    try {
      setRandomAnySeasonLoading(true);
      const seasonsToTry = shuffleItems(validSeasons);

      for (const randomSeason of seasonsToTry) {
        const seasonEpisodes =
          randomSeason.season_number === selectedSeason
            ? normalizeEpisodes(episodes)
            : await fetchEpisodes(randomSeason.season_number, { updateState: false });

        if (!seasonEpisodes.length) {
          continue;
        }

        const chosenEpisode = pickRandomItem(seasonEpisodes);
        openEpisodePlayer(randomSeason.season_number, chosenEpisode.episode_number, seasonEpisodes);
        return;
      }

      notify('No episodes available', 'We could not find a playable episode in any season for this show.');
    } catch (error) {
      console.error('Failed random any season pick:', error);
      notify('Random pick failed', 'We could not load a random episode right now.');
    } finally {
      setRandomAnySeasonLoading(false);
    }
  };

  const recommendationItems = dynamicRecommendations.filter((item) => String(item.tmdb_id) !== String(tmdb_id));
  const similarItems = dynamicSimilar.filter((item) => String(item.tmdb_id) !== String(tmdb_id));
  const moreLikeThisItems = dedupeMediaItems([...recommendationItems, ...similarItems]).slice(0, 24);
  const castItems = cast.slice(0, 12);
  const creatorLabel = creators.length ? 'Created by' : 'Director';
  const creatorValue =
    creators.length
      ? creators.slice(0, 2).map((person) => person.name).join(', ')
      : directors[0]?.name || writers[0]?.name || 'Unavailable';
  const starringValue =
    cast.slice(0, 5).map((person) => person.name).join(', ') || data.starring_names?.join(', ') || 'Unavailable';

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
      <View style={styles.shell}>
        <ImageBackground
          source={{ uri: backdrop || poster || undefined }}
          style={styles.heroCard}
          imageStyle={[styles.heroImage, { objectPosition: 'center 20%' } as any]}
        >
          <LinearGradient
            colors={['rgba(5,8,13,0.22)', 'rgba(5,8,13,0.34)', 'rgba(5,8,13,0.92)']}
            style={styles.heroOverlay}
          >
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <TouchableOpacity style={styles.logoWrap} onPress={() => openHomeMode('home')}>
                  <Image source={logoAsset} style={styles.logo} resizeMode="contain" />
                  <Text style={styles.logoText}>StreamCircle</Text>
                </TouchableOpacity>

                <View style={styles.inlineNav}>
                  {NAV_ITEMS.map((item) => (
                    <TouchableOpacity
                      key={item.key}
                      style={styles.inlineNavItem}
                      onPress={() => openHomeMode(item.key)}
                    >
                      <Text style={styles.inlineNavText}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.headerRight}>
                <WebHeaderSearch navigation={navigation} inputWidth={240} />
              </View>
            </View>

            <View style={styles.heroContent}>
              <View style={styles.heroLeft}>
                <Text style={styles.heroTitle}>{title}</Text>

                <View style={styles.heroMetaRow}>
                  {rating_label ? <Text style={styles.heroMetaText}>{rating_label}</Text> : null}
                  {getMediaYear(data) ? <Text style={styles.heroMetaText}>{getMediaYear(data)}</Text> : null}
                  <Text style={styles.heroMetaText}>
                    {number_of_seasons || validSeasons.length || 0} {Number(number_of_seasons || validSeasons.length || 0) === 1 ? 'Season' : 'Seasons'}
                  </Text>
                </View>

                <View style={styles.genrePillRow}>
                  {genres.slice(0, 4).map((genre) => (
                    <View key={genre} style={styles.genrePill}>
                      <Text style={styles.genrePillText}>{genre}</Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.heroDescription} numberOfLines={4}>
                  {description || 'No synopsis available yet.'}
                </Text>

                <View style={styles.heroActionRow}>
                  <TouchableOpacity style={styles.primaryButton} onPress={handlePlaySelected}>
                    <Ionicons name="play" size={16} color="#08101b" />
                    <Text style={styles.primaryButtonText}>Play</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.iconCircleButton} onPress={handleToggleFavorite}>
                    <Ionicons
                      name={favorited ? 'heart' : 'add'}
                      size={20}
                      color={favorited ? '#f43f5e' : '#f8fafc'}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.heroRight}>
                <View style={styles.heroSideBlock}>
                  <Text style={styles.heroSideLabel}>{creatorLabel}</Text>
                  <Text style={styles.heroSideValue}>{creatorValue}</Text>
                </View>

                <View style={styles.heroSideBlock}>
                  <Text style={styles.heroSideLabel}>Starring</Text>
                  <Text style={styles.heroSideValue}>{starringValue}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>

        <View style={styles.actionsBand}>
          <TouchableOpacity style={styles.bandButton} onPress={handleRandomThisSeason} disabled={loadingEpisodes}>
            <Ionicons name="shuffle-outline" size={16} color="#f8fafc" />
            <Text style={styles.bandButtonText}>Random This Season</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bandButton}
            onPress={handleRandomAnySeason}
            disabled={loadingEpisodes || randomAnySeasonLoading}
          >
            {randomAnySeasonLoading ? (
              <ActivityIndicator size="small" color="#f8fafc" />
            ) : (
              <Ionicons name="sparkles-outline" size={16} color="#f8fafc" />
            )}
            <Text style={styles.bandButtonText}>Random Any Season</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Season {selectedSeason}</Text>
            <Text style={styles.sectionSubtitle}>Pick a season, then jump into any episode.</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.seasonRow}>
            {validSeasons.map((season) => (
              <TouchableOpacity
                key={season.season_number}
                style={[
                  styles.seasonChip,
                  season.season_number === selectedSeason && styles.seasonChipActive,
                ]}
                onPress={() => setSelectedSeason(season.season_number)}
              >
                <Text
                  style={[
                    styles.seasonChipText,
                    season.season_number === selectedSeason && styles.seasonChipTextActive,
                  ]}
                >
                  {season.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loadingEpisodes ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color="#facc15" />
            </View>
          ) : episodes.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.episodeRow}>
              {episodes.map((episode) => (
                <EpisodeCard
                  key={`episode-${episode.episode_number}`}
                  item={episode}
                  seasonNumber={selectedSeason}
                  seasonEpisodes={episodes}
                  onPress={openEpisodePlayer}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyEpisodes}>
              <Text style={styles.emptyEpisodesText}>No episodes were returned for this season.</Text>
            </View>
          )}
        </View>

        {castItems.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cast & Crews</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.peopleRow}>
              {castItems.map((person) => (
                <PersonCard key={`cast-${person.id}`} person={person} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>More like this</Text>
          {relatedLoading && !moreLikeThisItems.length ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color="#facc15" />
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedRow}>
              {moreLikeThisItems.map((item) => (
                <RelatedCard key={`related-${item.type}-${item.tmdb_id}`} item={item} onPress={openRelatedShow} />
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoColumnWide}>
            <Text style={styles.infoSectionTitle}>Synopsis</Text>
            <Text style={styles.synopsisText}>{description || 'No synopsis available.'}</Text>
          </View>

          <View style={styles.infoColumn}>
            <Text style={styles.infoSectionTitle}>Information</Text>
            <InfoItem
              label="Seasons"
              value={`${number_of_seasons || validSeasons.length || 0}`}
            />
            <InfoItem
              label="Episodes"
              value={number_of_episodes ? `${number_of_episodes}` : null}
            />
            <InfoItem label="Release Date" value={release_date || getMediaYear(data)} />
            <InfoItem label="Genre" value={genres.join(', ')} />
            <InfoItem label="Rated" value={rating_label || 'Unavailable'} />
          </View>

          <View style={styles.infoColumn}>
            <Text style={styles.infoSectionTitle}>Languages</Text>
            <InfoItem
              label="Original Audio"
              value={spoken_languages[0] || data.original_language?.toUpperCase() || 'Unavailable'}
            />
            <InfoItem
              label="Spoken"
              value={spoken_languages.length ? spoken_languages.join(', ') : 'Unavailable'}
            />
          </View>
        </View>

        <Footer />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#06080d',
  },
  pageContent: {
    paddingBottom: 56,
  },
  shell: {
    width: '100%',
    maxWidth: 1600,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  heroCard: {
    minHeight: 720,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#101725',
    marginBottom: 18,
  },
  heroImage: {
    resizeMode: 'cover',
    transform: [{ scale: 1.04 }],
  },
  heroOverlay: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 22,
  },
  logo: {
    width: 32,
    height: 32,
    marginRight: 10,
  },
  logoText: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  inlineNav: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineNavItem: {
    marginRight: 18,
  },
  inlineNavText: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  profileName: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '500',
  },
  heroContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 54,
    paddingTop: 120,
  },
  heroLeft: {
    width: '58%',
    maxWidth: 640,
  },
  heroTitle: {
    color: '#f8fafc',
    fontSize: 64,
    fontWeight: '900',
    lineHeight: 68,
    marginBottom: 14,
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroMetaText: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '600',
    marginRight: 16,
  },
  genrePillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 18,
  },
  genrePill: {
    backgroundColor: 'rgba(15,23,42,0.64)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  genrePillText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '600',
  },
  heroDescription: {
    color: '#e5e7eb',
    fontSize: 17,
    lineHeight: 28,
    maxWidth: 580,
    marginBottom: 22,
  },
  heroActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 13,
    marginRight: 12,
  },
  primaryButtonText: {
    color: '#08101b',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
  },
  iconCircleButton: {
    width: 46,
    height: 46,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13,19,32,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  heroRight: {
    width: 280,
    alignItems: 'flex-end',
    paddingBottom: 6,
  },
  heroSideBlock: {
    marginBottom: 24,
    alignItems: 'flex-end',
  },
  heroSideLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 16,
    marginBottom: 8,
  },
  heroSideValue: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '500',
    textAlign: 'right',
    lineHeight: 32,
  },
  actionsBand: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 28,
  },
  bandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1320',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginRight: 12,
    marginBottom: 12,
  },
  bandButtonText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  section: {
    marginBottom: 34,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },
  sectionSubtitle: {
    color: '#8d98ab',
    fontSize: 14,
  },
  seasonRow: {
    paddingRight: 20,
    marginBottom: 18,
  },
  seasonChip: {
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
  },
  seasonChipActive: {
    backgroundColor: '#ffffff',
  },
  seasonChipText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  seasonChipTextActive: {
    color: '#08101b',
  },
  episodeRow: {
    paddingRight: 20,
  },
  episodeCard: {
    width: 320,
    marginRight: 18,
  },
  episodeImage: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    backgroundColor: '#101725',
    marginBottom: 12,
  },
  episodeImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodeBody: {
    paddingRight: 6,
  },
  episodeEyebrow: {
    color: '#8d98ab',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  episodeTitle: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 10,
  },
  episodeDescription: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  episodeMeta: {
    color: '#8d98ab',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingState: {
    minHeight: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyEpisodes: {
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d1320',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.1)',
  },
  emptyEpisodesText: {
    color: '#8d98ab',
    fontSize: 14,
  },
  peopleRow: {
    paddingRight: 20,
  },
  personCard: {
    width: 104,
    marginRight: 18,
  },
  personAvatar: {
    width: 86,
    height: 86,
    borderRadius: 999,
    marginBottom: 12,
    backgroundColor: '#111827',
  },
  personAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  personName: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  personRole: {
    color: '#8d98ab',
    fontSize: 12,
    lineHeight: 16,
  },
  relatedRow: {
    paddingRight: 20,
  },
  relatedCard: {
    width: 244,
    marginRight: 18,
  },
  relatedPoster: {
    width: '100%',
    height: 138,
    borderRadius: 16,
    backgroundColor: '#101725',
    marginBottom: 10,
  },
  relatedPosterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  relatedTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 4,
  },
  relatedMeta: {
    color: '#8d98ab',
    fontSize: 12,
    fontWeight: '600',
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: 34,
  },
  infoColumnWide: {
    width: '46%',
    minWidth: 320,
    marginBottom: 20,
  },
  infoColumn: {
    width: '24%',
    minWidth: 220,
    marginBottom: 20,
  },
  infoSectionTitle: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 18,
  },
  synopsisText: {
    color: '#d1d5db',
    fontSize: 15,
    lineHeight: 26,
  },
  infoItem: {
    marginBottom: 18,
  },
  infoLabel: {
    color: '#8d98ab',
    fontSize: 13,
    marginBottom: 6,
  },
  infoValue: {
    color: '#f8fafc',
    fontSize: 18,
    lineHeight: 26,
  },
  footer: {
    marginTop: 18,
    paddingTop: 30,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.1)',
  },
  footerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: 32,
  },
  footerIntro: {
    maxWidth: 360,
    marginBottom: 16,
  },
  appBadgeGroup: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  appBadgeLabel: {
    color: '#f8fafc',
    fontSize: 13,
    marginBottom: 12,
  },
  appBadgeList: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginLeft: 12,
  },
  appBadgeText: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
  },
  footerDownloadTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
  },
  footerDownloadText: {
    color: '#8d98ab',
    fontSize: 12,
    lineHeight: 18,
  },
  footerBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  footerBrandBlock: {
    maxWidth: 220,
    marginBottom: 18,
  },
  footerBrand: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 10,
  },
  footerBrandText: {
    color: '#8d98ab',
    fontSize: 12,
    lineHeight: 18,
  },
  footerLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  footerLinkColumn: {
    minWidth: 140,
    marginLeft: 24,
    marginBottom: 18,
  },
  footerLinkHeading: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
    textTransform: 'lowercase',
  },
  footerLink: {
    color: '#8d98ab',
    fontSize: 11,
    marginBottom: 8,
    textTransform: 'lowercase',
  },
});
