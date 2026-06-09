import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import WebHeaderSearch from '../components/WebHeaderSearch';
import { fetchJson } from '../utils/api';
import {
  fetchMediaDetails,
  getMediaTargetScreen,
  getMediaTitle,
  getMediaYear,
  normalizeMediaItem,
} from '../utils/media';
import { getFavorites } from '../utils/favorites';

const curatedTvCollectionConfig = require('../data/curatedTvCollections');
const genres = require('../data/genres');
const logoAsset = require('../assets/logo.png');

const NAV_ITEMS = [
  { key: 'home', label: 'Home' },
  { key: 'tv', label: 'TV Shows' },
  { key: 'movie', label: 'Movies' },
];
const HOME_ROW_LIMIT = 18;

const GENRE_GRADIENTS = [
  ['#f6caca', '#b10918'],
  ['#e8c7f2', '#9b42b2'],
  ['#b4d4ff', '#2d76c8'],
  ['#f0d786', '#b68a13'],
  ['#bae6fd', '#0f766e'],
  ['#fecdd3', '#be123c'],
  ['#c7d2fe', '#4338ca'],
  ['#bbf7d0', '#15803d'],
  ['#fde68a', '#d97706'],
  ['#ddd6fe', '#7c3aed'],
];

const GENRE_TILES = genres.map((genre, index) => ({
  id: genre.id,
  title: genre.name,
  routeName: genre.name,
  colors: GENRE_GRADIENTS[index % GENRE_GRADIENTS.length],
}));

function uniqueItems(...groups) {
  const seen = new Set();
  const items = [];

  groups.flat().forEach((item) => {
    if (!item?.tmdb_id) {
      return;
    }

    const key = `${item.type || 'movie'}-${item.tmdb_id}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    items.push(item);
  });

  return items;
}

function getArtwork(item, preferred = 'backdrop') {
  if (!item) {
    return null;
  }

  if (preferred === 'poster') {
    return item.poster || item.backdrop || null;
  }

  return item.backdrop || item.poster || null;
}

function getScore(item) {
  const value = item?.vote_average ?? item?.rating ?? null;

  if (typeof value !== 'number') {
    return null;
  }

  return value.toFixed(1);
}

function formatRuntime(runtime) {
  if (!runtime) {
    return null;
  }

  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;

  if (!hours) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

function PosterFallback({ item, compact = false }) {
  return (
    <View style={[styles.posterFallback, compact && styles.posterFallbackCompact]}>
      <Ionicons
        name={(item?.type || 'movie') === 'tv' ? 'tv-outline' : 'film-outline'}
        size={compact ? 24 : 30}
        color="rgba(226,232,240,0.85)"
      />
      <Text style={styles.posterFallbackText}>
        {(item?.type || 'movie') === 'tv' ? 'Series' : 'Movie'}
      </Text>
    </View>
  );
}

function MediaPill({ item, compact = false }) {
  const isTv = item?.type === 'tv';

  return (
    <View style={[styles.mediaPill, compact && styles.mediaPillCompact]}>
      <Text style={styles.mediaPillText}>{isTv ? 'Series' : 'Movie'}</Text>
    </View>
  );
}

function SectionTitle({ title }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function HeroMainCard({ item, onOpenPlayer, onOpenDetails }) {
  const artwork = getArtwork(item, 'backdrop');

  return (
    <TouchableOpacity style={styles.heroMainCard} activeOpacity={0.92} onPress={() => onOpenDetails(item)}>
      {artwork ? (
        <ImageBackground source={{ uri: artwork }} style={styles.heroImage} imageStyle={styles.heroImage}>
          <LinearGradient
            colors={['rgba(6,8,14,0.05)', 'rgba(6,8,14,0.45)', 'rgba(6,8,14,0.95)']}
            style={styles.heroGradient}
          >
            <MediaPill item={item} compact />
            <View style={styles.heroInfo}>
              <Text style={styles.heroEyebrow}>Tonight&apos;s headliner</Text>
              <Text style={styles.heroTitle}>{getMediaTitle(item)}</Text>
              <View style={styles.heroMetaRow}>
                {getScore(item) ? (
                  <Text style={styles.heroMetaText}>
                    <Ionicons name="star" size={13} color="#facc15" /> {getScore(item)}
                  </Text>
                ) : null}
                {getMediaYear(item) ? <Text style={styles.heroMetaText}>{getMediaYear(item)}</Text> : null}
                {formatRuntime(item?.runtime) ? (
                  <Text style={styles.heroMetaText}>{formatRuntime(item.runtime)}</Text>
                ) : null}
              </View>
              <Text style={styles.heroOverview} numberOfLines={4}>
                {item?.overview || 'A featured pick from the StreamCircle front page.'}
              </Text>
              <View style={styles.heroButtons}>
                <TouchableOpacity style={styles.playButton} onPress={() => onOpenPlayer(item)}>
                  <Ionicons name="play" size={15} color="#08101b" />
                  <Text style={styles.playButtonText}>Play</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.detailButton} onPress={() => onOpenDetails(item)}>
                  <Ionicons name="information-circle-outline" size={15} color="#f8fafc" />
                  <Text style={styles.detailButtonText}>View details</Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>
      ) : (
        <View style={[styles.heroImage, styles.heroFallback]}>
          <PosterFallback item={item} />
        </View>
      )}
    </TouchableOpacity>
  );
}

function HeroSideCard({ item, onPress }) {
  const artwork = getArtwork(item, 'backdrop');

  return (
    <TouchableOpacity style={styles.heroSideCard} activeOpacity={0.9} onPress={() => onPress(item)}>
      {artwork ? (
        <ImageBackground source={{ uri: artwork }} style={styles.heroSideImage} imageStyle={styles.heroSideImage}>
          <LinearGradient colors={['rgba(6,8,14,0.06)', 'rgba(6,8,14,0.75)']} style={styles.heroSideGradient}>
            <MediaPill item={item} compact />
            <Text style={styles.heroSideTitle} numberOfLines={2}>
              {getMediaTitle(item)}
            </Text>
          </LinearGradient>
        </ImageBackground>
      ) : (
        <View style={[styles.heroSideImage, styles.heroFallback]}>
          <PosterFallback item={item} compact />
        </View>
      )}
    </TouchableOpacity>
  );
}

function DotStrip() {
  return (
    <View style={styles.dotStrip}>
      {[0, 1, 2, 3, 4].map((value) => (
        <View key={value} style={[styles.dot, value === 0 && styles.dotActive]} />
      ))}
    </View>
  );
}

function EpisodeCard({ item, onPress, cardWidth, cardHeight }) {
  const artwork = getArtwork(item, 'backdrop');

  return (
    <TouchableOpacity
      style={[styles.episodeCard, { width: cardWidth, height: cardHeight }]}
      activeOpacity={0.9}
      onPress={() => onPress(item)}
    >
      {artwork ? (
        <ImageBackground
          source={{ uri: artwork }}
          style={[styles.episodeImage, { width: cardWidth, height: cardHeight }]}
          imageStyle={styles.episodeImage}
        >
          <LinearGradient colors={['rgba(8,13,22,0.12)', 'rgba(8,13,22,0.92)']} style={styles.episodeGradient}>
            <MediaPill item={item} compact />
            <Text style={styles.episodeTitle} numberOfLines={2}>
              {getMediaTitle(item)}
            </Text>
            <View style={styles.episodeMetaRow}>
              {getScore(item) ? (
                <Text style={styles.episodeMetaText}>
                  <Ionicons name="star" size={12} color="#facc15" /> {getScore(item)}
                </Text>
              ) : null}
              {getMediaYear(item) ? <Text style={styles.episodeMetaText}>{getMediaYear(item)}</Text> : null}
            </View>
          </LinearGradient>
        </ImageBackground>
      ) : (
        <View style={[styles.episodeImage, styles.heroFallback]}>
          <PosterFallback item={item} compact />
        </View>
      )}
    </TouchableOpacity>
  );
}

function ContinueCard({ item, onPress, cardWidth, imageHeight }) {
  const artwork = getArtwork(item, 'poster');

  return (
    <TouchableOpacity
      style={[styles.continueCard, { width: cardWidth }]}
      activeOpacity={0.9}
      onPress={() => onPress(item)}
    >
      {artwork ? (
        <Image source={{ uri: artwork }} style={[styles.continueImage, { height: imageHeight }]} />
      ) : (
        <View style={[styles.continueImage, styles.heroFallback, { height: imageHeight }]}>
          <PosterFallback item={item} />
        </View>
      )}

      <View style={styles.continueFooter}>
        <Text style={styles.continueTitle} numberOfLines={2}>
          {getMediaTitle(item)}
        </Text>
        <View style={styles.continueActions}>
          <View style={styles.continuePrimaryAction}>
            <Text style={styles.continuePrimaryActionText}>Continue play</Text>
          </View>
          <View style={styles.continueSecondaryAction}>
            <Text style={styles.continueSecondaryActionText}>See details</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function PosterCard({ item, onPress, cardWidth, cardHeight }) {
  const artwork = getArtwork(item, 'poster');

  return (
    <TouchableOpacity
      style={[styles.posterCard, { width: cardWidth, height: cardHeight }]}
      activeOpacity={0.9}
      onPress={() => onPress(item)}
    >
      {artwork ? (
        <Image source={{ uri: artwork }} style={[styles.posterImage, { width: cardWidth, height: cardHeight }]} />
      ) : (
        <View style={[styles.posterImage, styles.heroFallback, { width: cardWidth, height: cardHeight }]}>
          <PosterFallback item={item} compact />
        </View>
      )}
    </TouchableOpacity>
  );
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

export default function HomeScreen({ navigation, route }) {
  const { width } = useWindowDimensions();
  const requestedMode = route?.params?.mode;
  const isCompact = width < 1280;
  const isStackedHero = width < 1024;
  const landscapeCardWidth = width >= 1800 ? 320 : width >= 1440 ? 272 : 232;
  const landscapeCardHeight = Math.round(landscapeCardWidth * 0.59);
  const continueCardWidth = width >= 1800 ? 290 : width >= 1440 ? 250 : 220;
  const continueImageHeight = Math.round(continueCardWidth * 1.5);
  const posterCardWidth = width >= 1800 ? 188 : width >= 1440 ? 164 : 140;
  const posterCardHeight = Math.round(posterCardWidth * 1.48);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [contentMode, setContentMode] = useState(
    NAV_ITEMS.some((item) => item.key === requestedMode) ? requestedMode : 'home'
  );
  const [preloadedData, setPreloadedData] = useState({
    movie: {
      trending: [],
      nowPlaying: [],
      topRated: [],
      editors: [],
      upcoming: [],
    },
    tv: {
      tvTrending: [],
      tvTopRated: [],
    },
  });
  const [genreRows, setGenreRows] = useState({ movie: {}, tv: {} });
  const [curatedTvCollections, setCuratedTvCollections] = useState([]);
  const [favorites, setFavorites] = useState([]);

  const loadFavorites = useCallback(async () => {
    const items = await getFavorites();
    setFavorites(items);
  }, []);

  const preloadAll = async () => {
    const preloadData = await fetchJson('/preload');
    setPreloadedData({
      movie: {
        trending: preloadData.trending || [],
        nowPlaying: preloadData.nowPlaying || [],
        topRated: preloadData.topRated || [],
        editors: preloadData.editors || [],
        upcoming: preloadData.upcoming || [],
      },
      tv: {
        tvTrending: preloadData.tvTrending || [],
        tvTopRated: preloadData.tvTopRated || [],
      },
    });
  };

  const fetchGenreRows = async (type) => {
    const data = await fetchJson('/homepage/genres', { type });
    setGenreRows((previous) => ({
      ...previous,
      [type]: data || {},
    }));
  };

  const hydrateCuratedTvCollectionsFallback = async () => {
    const hydratedCollections = await Promise.all(
      curatedTvCollectionConfig.map(async (collection) => {
        const items = await Promise.all(
          collection.items.map(async (tmdb_id) => {
            try {
              const details = await fetchMediaDetails({ tmdb_id, type: 'tv' });
              return normalizeMediaItem(details, 'tv');
            } catch (error) {
              console.error(`Fallback curated TV lookup failed for ${tmdb_id}:`, error);
              return null;
            }
          })
        );

        return {
          ...collection,
          items: items.filter(Boolean),
        };
      })
    );

    return hydratedCollections.filter((collection) => collection.items.length > 0);
  };

  const fetchCuratedTvCollections = async () => {
    try {
      const data = await fetchJson('/collections/tv/curated');
      setCuratedTvCollections(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Curated TV collections failed:', error);
      const fallbackCollections = await hydrateCuratedTvCollectionsFallback();
      setCuratedTvCollections(fallbackCollections);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        await Promise.allSettled([
          preloadAll(),
          fetchCuratedTvCollections(),
          fetchGenreRows('movie'),
          fetchGenreRows('tv'),
          loadFavorites(),
        ]);
      } finally {
        setLoading(false);
        await SplashScreen.hideAsync();
      }
    };

    initialize();
  }, [loadFavorites]);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites])
  );

  useEffect(() => {
    if (NAV_ITEMS.some((item) => item.key === requestedMode)) {
      setContentMode(requestedMode);
    }
  }, [requestedMode]);

  const openDetails = async (item) => {
    try {
      const type = item.type || 'movie';
      const data = await fetchMediaDetails({ tmdb_id: item.tmdb_id, type });
      navigation.navigate(getMediaTargetScreen(type), { data });
    } catch (error) {
      console.error('Failed to open media details:', error);
    }
  };

  const openPlayer = async (item) => {
    try {
      const type = item.type || 'movie';
      const data = await fetchMediaDetails({ tmdb_id: item.tmdb_id, type });
      navigation.navigate(type === 'tv' ? 'TVDetailScreen' : 'VideoPlayer', {
        ...(type === 'movie' ? data : { data }),
      });
    } catch (error) {
      openDetails(item);
    }
  };

  const openGenre = (genre) => {
    const parent = navigation.getParent();
    if (parent?.navigate) {
      parent.navigate(genre.routeName);
    }
  };

  const curatedPrimary = curatedTvCollections[0]?.items || [];
  const curatedSecondary = curatedTvCollections[1]?.items || [];
  const curatedThird = curatedTvCollections[2]?.items || [];
  const popularMovies = uniqueItems(preloadedData.movie.nowPlaying, preloadedData.movie.trending).slice(0, HOME_ROW_LIMIT);
  const popularSeries = uniqueItems(preloadedData.tv.tvTrending, curatedPrimary).slice(0, HOME_ROW_LIMIT);
  const topRatedMovies = uniqueItems(preloadedData.movie.topRated, preloadedData.movie.editors).slice(0, HOME_ROW_LIMIT);
  const topRatedSeries = uniqueItems(preloadedData.tv.tvTopRated, curatedSecondary).slice(0, HOME_ROW_LIMIT);
  const actionMovies = (genreRows.movie?.['28'] || []).slice(0, HOME_ROW_LIMIT);
  const comedyMovies = (genreRows.movie?.['35'] || []).slice(0, HOME_ROW_LIMIT);
  const dramaMovies = (genreRows.movie?.['18'] || []).slice(0, HOME_ROW_LIMIT);
  const romanceMovies = (genreRows.movie?.['10749'] || []).slice(0, HOME_ROW_LIMIT);
  const actionSeries = (genreRows.tv?.['10759'] || []).slice(0, HOME_ROW_LIMIT);
  const comedySeries = (genreRows.tv?.['35'] || []).slice(0, HOME_ROW_LIMIT);
  const dramaSeries = (genreRows.tv?.['18'] || []).slice(0, HOME_ROW_LIMIT);
  const continueWatching = (
    favorites.length
      ? favorites.map((item) => normalizeMediaItem(item, item.type))
      : uniqueItems(preloadedData.movie.trending, preloadedData.movie.nowPlaying)
  ).slice(0, 4);

  const heroPool = useMemo(() => {
    if (contentMode === 'movie') {
      return uniqueItems(
        preloadedData.movie.nowPlaying,
        preloadedData.movie.trending,
        preloadedData.movie.topRated
      );
    }

    if (contentMode === 'tv') {
      return uniqueItems(curatedPrimary, preloadedData.tv.tvTrending, preloadedData.tv.tvTopRated);
    }

    return uniqueItems(curatedPrimary, preloadedData.tv.tvTrending, curatedSecondary, preloadedData.movie.nowPlaying);
  }, [contentMode, curatedPrimary, curatedSecondary, preloadedData]);

  const featuredHero = heroPool[0] || null;
  const heroSideItems = heroPool.slice(1, 3);
  const homeRows =
    contentMode === 'movie'
      ? [
          { key: 'movie-popular', title: 'Popular Movies', items: popularMovies, posters: true },
          { key: 'continue', title: 'Continue watching', items: continueWatching, continue: true },
          { key: 'movie-top-rated', title: 'Top Rated Movies', items: topRatedMovies, posters: true },
          { key: 'movie-action', title: 'Action', items: actionMovies, posters: true },
          { key: 'movie-comedy', title: 'Comedy', items: comedyMovies, posters: true },
          { key: 'movie-drama', title: 'Drama', items: dramaMovies, posters: true },
          { key: 'movie-romance', title: 'Romance', items: romanceMovies, posters: true },
        ]
      : contentMode === 'tv'
        ? [
            { key: 'tv-popular', title: 'Popular Series', items: popularSeries, posters: true },
            { key: 'continue', title: 'Continue watching', items: continueWatching, continue: true },
            { key: 'tv-top-rated', title: 'Top Rated Series', items: topRatedSeries, posters: true },
            { key: 'tv-comfort', title: 'Comfort Shows', items: curatedPrimary, posters: true },
            { key: 'tv-action', title: 'Action & Adventure', items: actionSeries, posters: true },
            { key: 'tv-comedy', title: 'Comedy', items: comedySeries, posters: true },
            { key: 'tv-drama', title: 'Drama', items: dramaSeries, posters: true },
          ]
        : [
            { key: 'home-popular-movies', title: 'Popular Movies', items: popularMovies, posters: true },
            { key: 'home-popular-series', title: 'Popular Series', items: popularSeries, posters: true },
            { key: 'continue', title: 'Continue watching', items: continueWatching, continue: true },
            { key: 'home-top-rated', title: 'Top Rated', items: uniqueItems(topRatedMovies, topRatedSeries).slice(0, HOME_ROW_LIMIT), posters: true },
            { key: 'home-action', title: 'Action', items: uniqueItems(actionMovies, actionSeries).slice(0, HOME_ROW_LIMIT), posters: true },
            { key: 'home-comedy', title: 'Comedy', items: uniqueItems(comedyMovies, comedySeries).slice(0, HOME_ROW_LIMIT), posters: true },
            { key: 'home-drama', title: 'Drama', items: uniqueItems(dramaMovies, dramaSeries).slice(0, HOME_ROW_LIMIT), posters: true },
          ];

  if (loading && !featuredHero) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Loading StreamCircle…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
      <View style={styles.shell}>
        <View style={[styles.header, isCompact && styles.headerCompact]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.logoWrap} onPress={() => setContentMode('home')}>
              <Image source={logoAsset} style={styles.logo} resizeMode="contain" />
              <Text style={styles.logoText}>StreamCircle</Text>
            </TouchableOpacity>

            <View style={styles.inlineNav}>
              {NAV_ITEMS.map((item) => (
                <TouchableOpacity key={item.key} style={styles.inlineNavItem} onPress={() => setContentMode(item.key)}>
                  <Text style={[styles.inlineNavText, contentMode === item.key && styles.inlineNavTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.headerRight, isCompact && styles.headerRightCompact]}>
            <WebHeaderSearch navigation={navigation} initialQuery={query} inputWidth={isCompact ? 220 : 280} />
          </View>
        </View>

        <View style={[styles.heroRow, isStackedHero && styles.heroRowStacked]}>
          {featuredHero ? (
            <HeroMainCard item={featuredHero} onOpenPlayer={openPlayer} onOpenDetails={openDetails} />
          ) : null}

          <View style={[styles.heroSideColumn, isStackedHero && styles.heroSideColumnStacked]}>
            {heroSideItems.map((item) => (
              <HeroSideCard key={`${item.type}-${item.tmdb_id}`} item={item} onPress={openDetails} />
            ))}
          </View>
        </View>

        <DotStrip />

        <View style={styles.section}>
          <SectionTitle title="Genres" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genreRow}>
            {GENRE_TILES.map((genre) => (
              <TouchableOpacity key={genre.id} style={styles.genreTileWrap} onPress={() => openGenre(genre)}>
                <LinearGradient colors={genre.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.genreTile}>
                  <Text style={styles.genreTileText}>{genre.title}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {homeRows.map((row) => (
          <View key={row.key} style={styles.section}>
            <SectionTitle title={row.title} />
            {row.continue ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.continueRow}>
                {row.items.map((item) => (
                  <ContinueCard
                    key={`${item.type || 'movie'}-${item.tmdb_id}`}
                    item={item}
                    onPress={openDetails}
                    cardWidth={continueCardWidth}
                    imageHeight={continueImageHeight}
                  />
                ))}
              </ScrollView>
            ) : row.posters ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posterRow}>
                {row.items.map((item) => (
                  <PosterCard
                    key={`${item.type || 'movie'}-${item.tmdb_id}`}
                    item={item}
                    onPress={openDetails}
                    cardWidth={posterCardWidth}
                    cardHeight={posterCardHeight}
                  />
                ))}
              </ScrollView>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.episodeRow}>
                {row.items.map((item) => (
                  <EpisodeCard
                    key={`${item.type || 'movie'}-${item.tmdb_id}`}
                    item={item}
                    onPress={openDetails}
                    cardWidth={landscapeCardWidth}
                    cardHeight={landscapeCardHeight}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        ))}

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
  loadingScreen: {
    flex: 1,
    backgroundColor: '#06080d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#cbd5e1',
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerCompact: {
    flexWrap: 'wrap',
    rowGap: 14,
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
    color: '#8d98ab',
    fontSize: 11,
    fontWeight: '600',
  },
  inlineNavTextActive: {
    color: '#f8fafc',
    textDecorationLine: 'underline',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRightCompact: {
    width: '100%',
    justifyContent: 'space-between',
  },
  searchBox: {
    width: 190,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1320',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 13,
    outlineStyle: 'none',
  },
  heroRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  heroRowStacked: {
    flexDirection: 'column',
  },
  heroMainCard: {
    flex: 1.15,
    minHeight: 370,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#111827',
    marginRight: 10,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 18,
  },
  heroFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: {
    maxWidth: 320,
  },
  heroEyebrow: {
    color: '#facc15',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  heroTitle: {
    color: '#f8fafc',
    fontSize: 56,
    fontWeight: '900',
    lineHeight: 58,
    marginBottom: 10,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  heroMetaText: {
    color: '#e2e8f0',
    fontSize: 13,
    marginRight: 12,
  },
  heroOverview: {
    color: '#d7dee8',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
  },
  heroButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 10,
    marginBottom: 10,
  },
  playButtonText: {
    color: '#08101b',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14,20,33,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    marginBottom: 10,
  },
  detailButtonText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  heroSideColumn: {
    width: 330,
    justifyContent: 'space-between',
  },
  heroSideColumnStacked: {
    width: '100%',
    flexDirection: 'row',
    marginTop: 10,
  },
  heroSideCard: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#111827',
    minHeight: 180,
  },
  heroSideImage: {
    width: '100%',
    height: '100%',
  },
  heroSideGradient: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 16,
  },
  heroSideTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 24,
    maxWidth: '86%',
  },
  mediaPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#2f6ee8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  mediaPillCompact: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  mediaPillText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  dotStrip: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 20,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginLeft: 6,
  },
  dotActive: {
    backgroundColor: '#ffffff',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitleRow: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
  },
  episodeRow: {
    paddingRight: 20,
  },
  episodeCard: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#111827',
    marginRight: 12,
  },
  episodeImage: {
    width: '100%',
    height: '100%',
  },
  episodeGradient: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 8,
  },
  episodeTitle: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 14,
  },
  episodeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  episodeMetaText: {
    color: '#e2e8f0',
    fontSize: 10,
    marginRight: 8,
  },
  continueRow: {
    paddingRight: 20,
  },
  continueCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  continueImage: {
    width: '100%',
  },
  continueFooter: {
    padding: 8,
  },
  continueTitle: {
    color: '#08101b',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 17,
    marginBottom: 8,
  },
  continueActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  continuePrimaryAction: {
    flex: 1,
    backgroundColor: '#0b1220',
    borderRadius: 5,
    paddingVertical: 7,
    marginRight: 6,
  },
  continuePrimaryActionText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  continueSecondaryAction: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 5,
    paddingVertical: 7,
  },
  continueSecondaryActionText: {
    color: '#0f172a',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  posterRow: {
    paddingRight: 20,
  },
  posterCard: {
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: '#111827',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  posterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  posterFallbackCompact: {
    minHeight: 100,
  },
  posterFallbackText: {
    color: 'rgba(226,232,240,0.9)',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  genreRow: {
    paddingRight: 20,
  },
  genreTileWrap: {
    marginRight: 12,
  },
  genreTile: {
    width: 170,
    height: 74,
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  genreTileText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  footer: {
    marginTop: 22,
    paddingTop: 30,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.1)',
  },
  footerTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    marginBottom: 32,
  },
  footerIntro: {
    maxWidth: 360,
    marginBottom: 16,
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
