import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Linking,
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
import { navigateToHomeMode } from '../utils/webNavigation';

const logoAsset = require('../assets/logo.png');
const IFrameElement: any = 'iframe';

const NAV_ITEMS = [
  { key: 'home', label: 'Home' },
  { key: 'tv', label: 'TV Shows' },
  { key: 'movie', label: 'Movies' },
];

function pickRandomItem(items: any[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffleItems(items: any[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function normalizeEpisodes(items: any[] = []) {
  return items.filter((item) => Number.isInteger(item?.episode_number) && item.episode_number > 0);
}

function normalizeSeasons(items: any[] = []) {
  return items.filter((item) => Number.isInteger(item?.season_number) && item.season_number > 0);
}

function resolveEpisodeUrl(
  server: string,
  tmdbId: number | string,
  season: number | string,
  episode: number | string,
  imdbId?: string | null,
  tvdbId?: string | null
) {
  if (server === 'server1') {
    return `https://vidsrc-embed.ru/embed/tv?${imdbId ? `imdb=${imdbId}` : `tmdb=${tmdbId}`}&season=${season}&episode=${episode}&autoplay=1&autonext=1`;
  }

  if (server === 'server2') {
    return `https://embed.q62movies.ws/tv-show?tvdbId=${tvdbId || tmdbId}&s=${season}&e=${episode}`;
  }

  return `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}?autoplay=1`;
}

function notify(title: string, message?: string) {
  if (typeof globalThis?.alert === 'function') {
    globalThis.alert(message ? `${title}\n\n${message}` : title);
  }
}

function ActionButton({ icon, label, onPress, primary = false, disabled = false, loading = false }: any) {
  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        primary ? styles.actionButtonPrimary : styles.actionButtonSecondary,
        disabled && styles.actionButtonDisabled,
      ]}
      onPress={onPress}
      activeOpacity={0.9}
      disabled={disabled}
    >
      {loading ? (
        <ActivityIndicator size="small" color={primary ? '#08101b' : '#f8fafc'} />
      ) : (
        <Ionicons name={icon} size={16} color={primary ? '#08101b' : '#f8fafc'} />
      )}
      <Text style={[styles.actionButtonText, primary ? styles.actionButtonTextPrimary : null]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function EpisodeJumpCard({ item, isActive, onPress }: any) {
  return (
    <TouchableOpacity
      style={[styles.episodeJumpCard, isActive && styles.episodeJumpCardActive]}
      onPress={onPress}
      activeOpacity={0.92}
    >
      {item?.still ? (
        <Image source={{ uri: item.still }} style={styles.episodeJumpImage} />
      ) : (
        <View style={[styles.episodeJumpImage, styles.episodeJumpImageFallback]}>
          <Ionicons name="tv-outline" size={28} color="#f8fafc" />
        </View>
      )}

      <View style={styles.episodeJumpBody}>
        <Text style={styles.episodeJumpEyebrow}>Episode {item.episode_number}</Text>
        <Text style={styles.episodeJumpTitle} numberOfLines={1}>
          {item.name || `Episode ${item.episode_number}`}
        </Text>
        <Text style={styles.episodeJumpDescription} numberOfLines={3}>
          {item.overview || 'No description available for this episode yet.'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function EpisodePlayerScreen({ route, navigation }) {
  const { tmdb_id, season, episode, episodes, seasons, imdb_id, tvdb_id, show } = route.params;
  const [webKey, setWebKey] = useState(0);
  const [activeServer, setActiveServer] = useState('server1');
  const [favorited, setFavorited] = useState(false);
  const [randomLoading, setRandomLoading] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(season);
  const [seasonEpisodes, setSeasonEpisodes] = useState(() =>
    normalizeEpisodes(Array.isArray(episodes) ? episodes : [])
  );
  const [loadingSeasonEpisodes, setLoadingSeasonEpisodes] = useState(false);
  const [availableSeasons, setAvailableSeasons] = useState(() =>
    normalizeSeasons(Array.isArray(seasons) ? seasons : [])
  );

  const favoriteItem = useMemo(() => {
    if (!show?.title) {
      return null;
    }

    return {
      tmdb_id: show.tmdb_id || tmdb_id,
      type: 'tv',
      title: show.title,
      poster: show.poster || null,
      backdrop: show.backdrop || null,
      release_date: show.release_date || null,
    };
  }, [show, tmdb_id]);

  useEffect(() => {
    const loadFavoriteState = async () => {
      if (!favoriteItem) {
        setFavorited(false);
        return;
      }

      const favoriteState = await isFavorite(favoriteItem.tmdb_id, favoriteItem.type);
      setFavorited(favoriteState);
    };

    loadFavoriteState();
  }, [favoriteItem]);

  useEffect(() => {
    setSelectedSeason(season);
  }, [season]);

  useEffect(() => {
    setSeasonEpisodes(normalizeEpisodes(Array.isArray(episodes) ? episodes : []));
  }, [episodes]);

  useEffect(() => {
    setAvailableSeasons(normalizeSeasons(Array.isArray(seasons) ? seasons : []));
  }, [seasons]);

  useEffect(() => {
    let isActive = true;

    const loadSeasons = async () => {
      if (availableSeasons.length || !tmdb_id) {
        return;
      }

      try {
        const details = await fetchJson('/details', { id: tmdb_id, type: 'tv' });

        if (isActive) {
          setAvailableSeasons(normalizeSeasons(Array.isArray(details?.seasons) ? details.seasons : []));
        }
      } catch (error) {
        console.error('Failed to load seasons for web episode player:', error);
      }
    };

    loadSeasons();

    return () => {
      isActive = false;
    };
  }, [availableSeasons.length, tmdb_id]);

  useEffect(() => {
    let isActive = true;

    const loadSeasonEpisodes = async () => {
      if (!selectedSeason || selectedSeason === season) {
        return;
      }

      setLoadingSeasonEpisodes(true);

      try {
        const data = await fetchJson('/episodes', { tv_id: tmdb_id, season: selectedSeason });

        if (isActive) {
          setSeasonEpisodes(normalizeEpisodes(Array.isArray(data) ? data : []));
        }
      } catch (error) {
        console.error(`Failed to load season ${selectedSeason} episodes for web:`, error);
        if (isActive) {
          setSeasonEpisodes([]);
        }
      } finally {
        if (isActive) {
          setLoadingSeasonEpisodes(false);
        }
      }
    };

    loadSeasonEpisodes();

    return () => {
      isActive = false;
    };
  }, [selectedSeason, season, tmdb_id]);

  const currentEpisode = seasonEpisodes.find((item) => item.episode_number === episode);
  const nextEpisode = seasonEpisodes.find((item) => item.episode_number === episode + 1);
  const embedUrl = useMemo(
    () => resolveEpisodeUrl(activeServer, tmdb_id, season, episode, imdb_id, tvdb_id),
    [activeServer, tmdb_id, season, episode, imdb_id, tvdb_id]
  );

  const openHomeMode = (mode: string) => {
    navigateToHomeMode(navigation, mode);
  };

  const navigateToEpisode = (nextSeason: number, nextEpisodeNumber: number, nextEpisodes: any[]) => {
    navigation.replace('EpisodePlayerScreen', {
      tmdb_id,
      season: nextSeason,
      episode: nextEpisodeNumber,
      episodes: nextEpisodes,
      seasons: availableSeasons,
      imdb_id,
      tvdb_id,
      show,
    });
  };

  const handleToggleFavorite = async () => {
    if (!favoriteItem) {
      return;
    }

    try {
      const result = await toggleFavorite(favoriteItem);
      setFavorited(result.isFavorite);
    } catch (error) {
      console.error('Failed to toggle show favorite on web:', error);
    }
  };

  const fetchSeasonEpisodes = async (seasonNumber: number) => {
    if (seasonNumber === selectedSeason) {
      return seasonEpisodes;
    }

    try {
      const data = await fetchJson('/episodes', { tv_id: tmdb_id, season: seasonNumber });
      return normalizeEpisodes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(`Failed to fetch season ${seasonNumber} episodes for web:`, error);
      return [];
    }
  };

  const handleRandomEpisode = async () => {
    if (!availableSeasons.length) {
      notify('No seasons available', 'This show does not have any playable seasons yet.');
      return;
    }

    try {
      setRandomLoading(true);
      const seasonsToTry = shuffleItems(availableSeasons);

      for (const seasonItem of seasonsToTry) {
        const currentEpisodes =
          seasonItem.season_number === selectedSeason
            ? seasonEpisodes
            : await fetchSeasonEpisodes(seasonItem.season_number);

        if (!currentEpisodes.length) {
          continue;
        }

        const chosenEpisode = pickRandomItem(currentEpisodes);
        navigateToEpisode(seasonItem.season_number, chosenEpisode.episode_number, currentEpisodes);
        return;
      }

      notify('No episodes available', 'We could not find a playable random episode for this show.');
    } catch (error) {
      console.error('Failed to pick random episode on web:', error);
      notify('Random pick failed', 'We could not load a random episode right now.');
    } finally {
      setRandomLoading(false);
    }
  };

  const handleRandomThisSeason = async () => {
    const currentEpisodes = seasonEpisodes.length ? seasonEpisodes : await fetchSeasonEpisodes(selectedSeason);

    if (!currentEpisodes.length) {
      notify('No episodes available', 'This season does not have any playable episodes yet.');
      return;
    }

    const chosenEpisode = pickRandomItem(currentEpisodes);
    navigateToEpisode(selectedSeason, chosenEpisode.episode_number, currentEpisodes);
  };

  const serverKeys = ['server1', 'server2', 'server3'];
  const heroArtwork = show?.backdrop || show?.poster || null;
  const seasonLabel = `Season ${season}`;
  const episodeLabel = `Episode ${episode}`;
  const genreSummary = Array.isArray(show?.genres) ? show.genres.slice(0, 4) : [];

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
      <View style={styles.shell}>
        <ImageBackground
          source={heroArtwork ? { uri: heroArtwork } : undefined}
          style={styles.heroCard}
          imageStyle={[styles.heroImage, { objectPosition: 'center 22%' } as any]}
        >
          <LinearGradient
            colors={['rgba(5,8,13,0.2)', 'rgba(5,8,13,0.46)', 'rgba(5,8,13,0.95)']}
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
                <View style={styles.playerPill}>
                  <Text style={styles.playerPillText}>Episode Player</Text>
                </View>

                <Text style={styles.heroTitle}>{show?.title || 'TV Show'}</Text>
                <Text style={styles.heroSubtitle}>
                  {seasonLabel} • {episodeLabel}
                  {currentEpisode?.name ? ` • ${currentEpisode.name}` : ''}
                </Text>

                <View style={styles.heroMetaRow}>
                  <Text style={styles.heroMetaText}>{show?.rating_label || 'TV Series'}</Text>
                  {show?.release_date ? <Text style={styles.heroMetaText}>{String(show.release_date).split('-')[0]}</Text> : null}
                  {currentEpisode?.air_date ? <Text style={styles.heroMetaText}>{currentEpisode.air_date}</Text> : null}
                </View>

                <View style={styles.genrePillRow}>
                  {genreSummary.map((genre: string) => (
                    <View key={genre} style={styles.genrePill}>
                      <Text style={styles.genrePillText}>{genre}</Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.heroDescription} numberOfLines={4}>
                  {currentEpisode?.overview ||
                    show?.description ||
                    'Jump between episodes, switch servers, and keep the layout focused on playback instead of the old utility screen.'}
                </Text>

                <View style={styles.heroActionRow}>
                  <ActionButton icon="arrow-back-outline" label="Back to Show" primary onPress={() => navigation.goBack()} />
                  <ActionButton
                    icon="shuffle-outline"
                    label="Random This Season"
                    onPress={handleRandomThisSeason}
                    disabled={loadingSeasonEpisodes}
                  />
                  <ActionButton
                    icon="sparkles-outline"
                    label="Random Any Season"
                    onPress={handleRandomEpisode}
                    disabled={loadingSeasonEpisodes || randomLoading}
                    loading={randomLoading}
                  />
                </View>
              </View>

              <View style={styles.heroRight}>
                <TouchableOpacity style={styles.heroIconCircle} onPress={handleToggleFavorite}>
                  <Ionicons
                    name={favorited ? 'heart' : 'heart-outline'}
                    size={20}
                    color={favorited ? '#f43f5e' : '#f8fafc'}
                  />
                </TouchableOpacity>

                {nextEpisode ? (
                  <TouchableOpacity
                    style={styles.nextCard}
                    onPress={() => navigateToEpisode(season, nextEpisode.episode_number, seasonEpisodes)}
                  >
                    <Text style={styles.nextCardLabel}>Watch Next</Text>
                    <Text style={styles.nextCardTitle}>{nextEpisode.name || `Episode ${nextEpisode.episode_number}`}</Text>
                    <Text style={styles.nextCardMeta}>Season {season} • Episode {nextEpisode.episode_number}</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.nextCard}>
                    <Text style={styles.nextCardLabel}>Currently Watching</Text>
                    <Text style={styles.nextCardTitle}>{currentEpisode?.name || episodeLabel}</Text>
                    <Text style={styles.nextCardMeta}>{seasonLabel}</Text>
                  </View>
                )}
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>

        <View style={styles.playerGrid}>
          <View style={styles.playerColumn}>
            <View style={styles.playerCard}>
              <IFrameElement
                key={webKey}
                src={embedUrl}
                title={`${show?.title || 'Episode'} S${season}E${episode}`}
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                allowFullScreen
                referrerPolicy="origin"
                style={iframeStyle}
              />
            </View>
          </View>

          <View style={styles.sideColumn}>
            <View style={styles.panel}>
              <Text style={styles.panelEyebrow}>Server Controls</Text>
              <Text style={styles.panelTitle}>Swap sources if a stream stalls.</Text>

              <View style={styles.serverRow}>
                {serverKeys.map((key) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.serverPill, activeServer === key && styles.serverPillActive]}
                    onPress={() => {
                      setActiveServer(key);
                      setWebKey((prev) => prev + 1);
                    }}
                  >
                    <Text style={[styles.serverPillText, activeServer === key && styles.serverPillTextActive]}>
                      {key.replace('server', 'Server ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.panelButtonStack}>
                <ActionButton icon="refresh-outline" label="Reload Player" onPress={() => setWebKey((prev) => prev + 1)} />
                <ActionButton icon="open-outline" label="Open in New Tab" onPress={() => Linking.openURL(embedUrl)} />
              </View>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelEyebrow}>Current Episode</Text>
              <Text style={styles.panelTitle}>{currentEpisode?.name || episodeLabel}</Text>
              <Text style={styles.panelDescription}>
                {currentEpisode?.overview || 'Use the season rail below to jump to another episode without leaving the desktop player.'}
              </Text>

              <View style={styles.summaryList}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Season</Text>
                  <Text style={styles.summaryValue}>{season}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Episode</Text>
                  <Text style={styles.summaryValue}>{episode}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Air Date</Text>
                  <Text style={styles.summaryValue}>{currentEpisode?.air_date || 'Unavailable'}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Browse Episodes</Text>
            <Text style={styles.sectionSubtitle}>Keep the desktop layout, but still move through seasons like mobile.</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.seasonRow}>
            {availableSeasons.map((seasonItem) => (
              <TouchableOpacity
                key={seasonItem.season_number}
                style={[
                  styles.seasonPill,
                  selectedSeason === seasonItem.season_number && styles.seasonPillActive,
                ]}
                onPress={() => setSelectedSeason(seasonItem.season_number)}
              >
                <Text
                  style={[
                    styles.seasonPillText,
                    selectedSeason === seasonItem.season_number && styles.seasonPillTextActive,
                  ]}
                >
                  {seasonItem.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loadingSeasonEpisodes ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color="#f8fafc" />
            </View>
          ) : seasonEpisodes.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.episodeRow}>
              {seasonEpisodes.map((item) => (
                <EpisodeJumpCard
                  key={`${selectedSeason}-${item.episode_number}`}
                  item={item}
                  isActive={selectedSeason === season && item.episode_number === episode}
                  onPress={() => navigateToEpisode(selectedSeason, item.episode_number, seasonEpisodes)}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyEpisodes}>
              <Text style={styles.emptyEpisodesText}>No episodes were returned for this season.</Text>
            </View>
          )}
        </View>
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
    paddingBottom: 48,
  },
  shell: {
    width: '100%',
    maxWidth: 1600,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  heroCard: {
    minHeight: 500,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#101725',
    marginBottom: 28,
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
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  inlineNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineNavItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inlineNavText: {
    color: 'rgba(248,250,252,0.92)',
    fontSize: 16,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.38)',
    marginRight: 14,
  },
  profileName: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '600',
  },
  heroContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 28,
    paddingTop: 84,
  },
  heroLeft: {
    maxWidth: 820,
  },
  playerPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#2563eb',
    marginBottom: 16,
  },
  playerPillText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#f8fafc',
    fontSize: 62,
    lineHeight: 66,
    fontWeight: '900',
    marginBottom: 10,
    letterSpacing: -1.6,
  },
  heroSubtitle: {
    color: '#f8fafc',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    marginBottom: 14,
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 14,
  },
  heroMetaText: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '600',
  },
  genrePillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  genrePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  genrePillText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '600',
  },
  heroDescription: {
    color: '#e2e8f0',
    fontSize: 17,
    lineHeight: 28,
    maxWidth: 700,
  },
  heroActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 24,
  },
  heroRight: {
    width: 280,
    alignItems: 'flex-end',
    gap: 14,
  },
  heroIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7,12,20,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  nextCard: {
    width: '100%',
    padding: 18,
    borderRadius: 22,
    backgroundColor: 'rgba(7,12,20,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  nextCardLabel: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  nextCardTitle: {
    color: '#f8fafc',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    marginBottom: 8,
  },
  nextCardMeta: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
    minHeight: 50,
  },
  actionButtonPrimary: {
    backgroundColor: '#f8fafc',
  },
  actionButtonSecondary: {
    backgroundColor: 'rgba(15,23,42,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  actionButtonDisabled: {
    opacity: 0.55,
  },
  actionButtonText: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 9,
  },
  actionButtonTextPrimary: {
    color: '#08101b',
  },
  playerGrid: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },
  playerColumn: {
    flex: 1,
  },
  playerCard: {
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#000',
    aspectRatio: 16 / 9,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
  },
  sideColumn: {
    width: 360,
    gap: 20,
  },
  panel: {
    borderRadius: 24,
    backgroundColor: '#0c1220',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
    padding: 20,
  },
  panelEyebrow: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  panelTitle: {
    color: '#f8fafc',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    marginBottom: 10,
  },
  panelDescription: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 24,
  },
  serverRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
    marginBottom: 18,
  },
  serverPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  serverPillActive: {
    backgroundColor: '#f8fafc',
  },
  serverPillText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
  },
  serverPillTextActive: {
    color: '#08101b',
  },
  panelButtonStack: {
    gap: 12,
    marginTop: 6,
  },
  summaryList: {
    marginTop: 18,
    gap: 14,
  },
  summaryItem: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.12)',
  },
  summaryLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  summaryValue: {
    color: '#f8fafc',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600',
  },
  section: {
    marginTop: 30,
  },
  sectionHeader: {
    marginBottom: 18,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.7,
  },
  sectionSubtitle: {
    color: '#94a3b8',
    fontSize: 16,
    lineHeight: 24,
  },
  seasonRow: {
    paddingBottom: 8,
    paddingRight: 24,
    gap: 10,
  },
  seasonPill: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  seasonPillActive: {
    backgroundColor: '#f8fafc',
  },
  seasonPillText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
  },
  seasonPillTextActive: {
    color: '#08101b',
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
  },
  episodeRow: {
    paddingTop: 16,
    paddingRight: 24,
    gap: 18,
  },
  episodeJumpCard: {
    width: 320,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#0c1220',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
  },
  episodeJumpCardActive: {
    borderColor: '#f8fafc',
  },
  episodeJumpImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#020617',
  },
  episodeJumpImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodeJumpBody: {
    padding: 18,
  },
  episodeJumpEyebrow: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  episodeJumpTitle: {
    color: '#f8fafc',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    marginBottom: 10,
  },
  episodeJumpDescription: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
  },
  emptyEpisodes: {
    marginTop: 18,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#0c1220',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
  },
  emptyEpisodesText: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 24,
  },
});

const iframeStyle = {
  border: 'none',
  width: '100%',
  height: '100%',
  backgroundColor: 'black',
};
