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
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import WebHeaderSearch from '../components/WebHeaderSearch';
import { fetchJson } from '../utils/api';
import { fetchMediaDetails, getMediaTargetScreen, getMediaTitle, getMediaYear } from '../utils/media';
import { navigateToHomeMode } from '../utils/webNavigation';

const logoAsset = require('../assets/logo.png');

const NAV_ITEMS = [
  { key: 'home', label: 'Home' },
  { key: 'tv', label: 'TV Shows' },
  { key: 'movie', label: 'Movies' },
];
const HERO_GRID_LIMIT = 48;
const RAIL_ROW_LIMIT = 24;

const GENRE_ID_MAP = {
  28: { movie: 28, tv: 10759 },
  12: { movie: 12, tv: 10765 },
  16: { movie: 16, tv: 16 },
  35: { movie: 35, tv: 35 },
  80: { movie: 80, tv: 80 },
  99: { movie: 99, tv: 99 },
  18: { movie: 18, tv: 18 },
  10751: { movie: 10751, tv: 10751 },
  14: { movie: 14, tv: 10765 },
  36: { movie: 36, tv: 36 },
  27: { movie: 27, tv: 9648 },
  10402: { movie: 10402, tv: 10402 },
  9648: { movie: 9648, tv: 9648 },
  10749: { movie: 10749, tv: 10766 },
  878: { movie: 878, tv: 10765 },
  10770: { movie: 10770, tv: 10762 },
  53: { movie: 53, tv: 9648 },
  10752: { movie: 10752, tv: 10768 },
  37: { movie: 37, tv: 37 },
};

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

function getArtwork(item, preferred = 'poster') {
  if (!item) {
    return null;
  }

  if (preferred === 'backdrop') {
    return item.backdrop || item.poster || null;
  }

  return item.poster || item.backdrop || null;
}

function getModeLabel(mode) {
  if (mode === 'tv') {
    return 'TV Series';
  }

  if (mode === 'movie') {
    return 'Movie';
  }

  return 'Popular this week';
}

function getSortByFromLabel(label) {
  if (/top rated/i.test(label)) {
    return 'vote_average.desc';
  }

  if (/latest releases/i.test(label)) {
    return 'release_date.desc';
  }

  return 'popularity.desc';
}

function getComboItems(combos, label) {
  return Array.isArray(combos?.[label]) ? combos[label] : [];
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

        <View style={styles.appBadgeRow}>
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

function PosterGridCard({
  item,
  width,
  imageHeight,
  onPress,
  compact = false,
  captionMode = 'overlay',
}) {
  const artwork = getArtwork(item, 'poster');

  return (
    <TouchableOpacity style={[styles.posterGridCard, { width }]} activeOpacity={0.9} onPress={() => onPress(item)}>
      {captionMode === 'below' ? (
        <>
          {artwork ? (
            <Image source={{ uri: artwork }} style={[styles.posterGridImage, { height: imageHeight }]} />
          ) : (
            <View style={[styles.posterGridImage, styles.posterGridFallback, { height: imageHeight }]}>
              <Ionicons
                name={item.type === 'tv' ? 'tv-outline' : 'film-outline'}
                size={34}
                color="rgba(226,232,240,0.88)"
              />
            </View>
          )}

          <View style={styles.posterCaptionBody}>
            <Text style={styles.posterCaptionTitle} numberOfLines={2}>
              {getMediaTitle(item)}
            </Text>
            <Text style={styles.posterCaptionMeta} numberOfLines={1}>
              {item.type === 'tv' ? 'Series' : 'Movie'}
              {getMediaYear(item) ? ` • ${getMediaYear(item)}` : ''}
            </Text>
          </View>
        </>
      ) : artwork ? (
        <ImageBackground source={{ uri: artwork }} style={[styles.posterGridImage, { height: imageHeight }]} imageStyle={styles.posterGridImage}>
          <LinearGradient
            colors={['rgba(6,8,14,0.02)', 'rgba(6,8,14,0.15)', 'rgba(6,8,14,0.92)']}
            style={styles.posterOverlay}
          >
            <View style={styles.posterOverlayBody}>
              <Text style={[styles.posterOverlayTitle, compact && styles.posterOverlayTitleCompact]} numberOfLines={2}>
                {getMediaTitle(item)}
              </Text>
              <Text style={styles.posterOverlayMeta} numberOfLines={1}>
                {item.type === 'tv' ? 'Series' : 'Movie'}
                {getMediaYear(item) ? ` • ${getMediaYear(item)}` : ''}
              </Text>
            </View>
          </LinearGradient>
        </ImageBackground>
      ) : (
        <View style={[styles.posterGridImage, styles.posterGridFallback, { height: imageHeight }]}>
          <Ionicons
            name={item.type === 'tv' ? 'tv-outline' : 'film-outline'}
            size={34}
            color="rgba(226,232,240,0.88)"
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function GenreScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const { genreId, genreTitle, mediaType } = route.params;
  const isCompact = width < 1180;
  const shelfWidth = width >= 1700 ? 206 : width >= 1440 ? 188 : 168;
  const shelfHeight = Math.round(shelfWidth * 1.48);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(mediaType || 'popular');
  const [cache, setCache] = useState({ movie: null, tv: null });

  const movieGenreId = GENRE_ID_MAP[genreId]?.movie || genreId;
  const tvGenreId = GENRE_ID_MAP[genreId]?.tv || genreId;

  useEffect(() => {
    const loadGenreData = async () => {
      try {
        setLoading(true);
        const [movieTop, movieCombos, tvTop, tvCombos] = await Promise.all([
          fetchJson('/genre/top', { id: movieGenreId, type: 'movie' }),
          fetchJson('/genre/combos', { id: movieGenreId, type: 'movie' }),
          fetchJson('/genre/top', { id: tvGenreId, type: 'tv' }),
          fetchJson('/genre/combos', { id: tvGenreId, type: 'tv' }),
        ]);

        setCache({
          movie: { topPicks: movieTop || [], combos: movieCombos || {} },
          tv: { topPicks: tvTop || [], combos: tvCombos || {} },
        });
      } catch (error) {
        console.error('Genre preload failed:', error);
        setCache({
          movie: { topPicks: [], combos: {} },
          tv: { topPicks: [], combos: {} },
        });
      } finally {
        setLoading(false);
      }
    };

    loadGenreData();
  }, [movieGenreId, tvGenreId]);

  useEffect(() => {
    if (mediaType === 'movie' || mediaType === 'tv') {
      setViewMode(mediaType);
    }
  }, [mediaType]);

  const popularItems = useMemo(
    () =>
      uniqueItems(
        cache.movie?.topPicks || [],
        ...Object.values(cache.movie?.combos || {}),
        cache.tv?.topPicks || [],
        ...Object.values(cache.tv?.combos || {})
      ).slice(0, HERO_GRID_LIMIT),
    [cache]
  );
  const trendingMovieItems = useMemo(
    () =>
      uniqueItems(
        cache.movie?.topPicks || [],
        getComboItems(cache.movie?.combos, 'Fan Favorites')
      ).slice(0, RAIL_ROW_LIMIT),
    [cache]
  );
  const popularTvItems = useMemo(
    () =>
      uniqueItems(
        cache.tv?.topPicks || [],
        ...Object.values(cache.tv?.combos || {})
      ).slice(0, RAIL_ROW_LIMIT),
    [cache]
  );
  const trendingTvItems = useMemo(
    () =>
      uniqueItems(
        cache.tv?.topPicks || [],
        getComboItems(cache.tv?.combos, 'Fan Favorites')
      ).slice(0, RAIL_ROW_LIMIT),
    [cache]
  );
  const movieSections = useMemo(() => Object.entries(cache.movie?.combos || {}), [cache]);
  const tvSections = useMemo(() => Object.entries(cache.tv?.combos || {}), [cache]);

  const activeHero =
    viewMode === 'tv'
      ? cache.tv?.topPicks?.[0] || cache.movie?.topPicks?.[0] || null
      : viewMode === 'movie'
        ? cache.movie?.topPicks?.[0] || cache.tv?.topPicks?.[0] || null
        : popularItems[0] || cache.movie?.topPicks?.[0] || cache.tv?.topPicks?.[0] || null;

  const openDetails = async (item) => {
    try {
      const data = await fetchMediaDetails({ tmdb_id: item.tmdb_id, type: item.type });
      navigation.navigate(getMediaTargetScreen(data.type || item.type), { data });
    } catch (error) {
      console.error('Failed to open genre detail:', error);
    }
  };

  const openHomeMode = (mode) => {
    navigateToHomeMode(navigation, mode);
  };

  const heroObjectPosition =
    viewMode === 'movie' ? 'center 22%' : viewMode === 'tv' ? 'center 26%' : 'center 24%';

  const openViewAll = (title, items, type, sortBy) => {
    navigation.navigate('ViewAllScreen', {
      title,
      items,
      genreId: type === 'tv' ? tvGenreId : movieGenreId,
      type,
      sortBy,
    });
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
      <View style={styles.shell}>
        <View style={[styles.header, isCompact && styles.headerCompact]}>
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

          <View style={[styles.headerRight, isCompact && styles.headerRightCompact]}>
            <WebHeaderSearch navigation={navigation} inputWidth={isCompact ? 220 : 250} />
          </View>
        </View>

        <View style={styles.heroCard}>
          {activeHero?.backdrop ? (
            <ImageBackground
              source={{ uri: activeHero.backdrop }}
              style={styles.heroBackdrop}
              imageStyle={[styles.heroBackdropImage, { objectPosition: heroObjectPosition }]}
            >
              <LinearGradient
                colors={['rgba(6,8,14,0.24)', 'rgba(6,8,14,0.28)', 'rgba(6,8,14,0.82)']}
                style={styles.heroOverlay}
              >
                <View style={styles.heroTitleWrap}>
                  <Text style={styles.heroTitle}>{genreTitle}</Text>
                </View>

                <View style={styles.heroTabs}>
                  {['popular', 'movie', 'tv'].map((mode) => (
                    <TouchableOpacity
                      key={mode}
                      style={[styles.heroTab, viewMode === mode && styles.heroTabActive]}
                      onPress={() => setViewMode(mode)}
                    >
                      <Text style={[styles.heroTabText, viewMode === mode && styles.heroTabTextActive]}>
                        {getModeLabel(mode)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </LinearGradient>
            </ImageBackground>
        ) : (
          <View style={[styles.heroBackdrop, styles.heroFallback]}>
            <Text style={styles.heroTitle}>{genreTitle}</Text>
          </View>
        )}
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#facc15" />
          </View>
        ) : viewMode === 'tv' ? (
          <View style={styles.contentBlock}>
            {trendingTvItems.length ? (
              <View style={styles.section}>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>Trending {genreTitle} TV series</Text>
                  <TouchableOpacity
                    onPress={() => openViewAll(`${genreTitle} TV Series`, trendingTvItems, 'tv', 'popularity.desc')}
                  >
                    <Text style={styles.viewAllText}>View all</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelfRow}>
                  {trendingTvItems.map((item) => (
                    <PosterGridCard
                      key={`tv-top-${item.tmdb_id}`}
                      item={item}
                      width={shelfWidth}
                      imageHeight={shelfHeight}
                      onPress={openDetails}
                      compact
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {tvSections.map(([label, items]) => (
              <View key={label} style={styles.section}>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>{label}</Text>
                  <TouchableOpacity
                    onPress={() => openViewAll(label, items, 'tv', getSortByFromLabel(label))}
                  >
                    <Text style={styles.viewAllText}>View all</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelfRow}>
                  {items.map((item) => (
                    <PosterGridCard
                      key={`${item.type || 'tv'}-${item.tmdb_id}`}
                      item={item}
                      width={shelfWidth}
                      imageHeight={shelfHeight}
                      onPress={openDetails}
                      compact
                    />
                  ))}
                </ScrollView>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.contentBlock}>
            {viewMode === 'popular' ? (
              <>
                <View style={styles.section}>
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionTitle}>Trending {genreTitle} movies</Text>
                    <TouchableOpacity
                      onPress={() => openViewAll(`${genreTitle} Movies`, trendingMovieItems, 'movie', 'popularity.desc')}
                    >
                      <Text style={styles.viewAllText}>View all</Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelfRow}>
                    {trendingMovieItems.map((item) => (
                      <PosterGridCard
                        key={`${item.type || 'movie'}-${item.tmdb_id}`}
                        item={item}
                        width={shelfWidth}
                        imageHeight={shelfHeight}
                        onPress={openDetails}
                        compact
                      />
                    ))}
                  </ScrollView>
                </View>

                {popularTvItems.length ? (
                  <View style={styles.section}>
                    <View style={styles.sectionRow}>
                      <Text style={styles.sectionTitle}>Trending {genreTitle} TV series</Text>
                      <TouchableOpacity
                        onPress={() => openViewAll(`${genreTitle} TV Series`, popularTvItems, 'tv', 'popularity.desc')}
                      >
                        <Text style={styles.viewAllText}>View all</Text>
                      </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelfRow}>
                      {popularTvItems.map((item) => (
                        <PosterGridCard
                          key={`popular-tv-${item.tmdb_id}`}
                          item={item}
                          width={shelfWidth}
                          imageHeight={shelfHeight}
                          onPress={openDetails}
                          compact
                        />
                      ))}
                    </ScrollView>
                  </View>
                ) : null}

                {getComboItems(cache.movie?.combos, 'Top Rated').length ? (
                  <View style={styles.section}>
                    <View style={styles.sectionRow}>
                      <Text style={styles.sectionTitle}>Top rated {genreTitle} movies</Text>
                      <TouchableOpacity
                        onPress={() =>
                          openViewAll(
                            `Top Rated ${genreTitle} Movies`,
                            getComboItems(cache.movie?.combos, 'Top Rated'),
                            'movie',
                            'vote_average.desc'
                          )
                        }
                      >
                        <Text style={styles.viewAllText}>View all</Text>
                      </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelfRow}>
                      {getComboItems(cache.movie?.combos, 'Top Rated').map((item) => (
                        <PosterGridCard
                          key={`movie-rated-${item.tmdb_id}`}
                          item={item}
                          width={shelfWidth}
                          imageHeight={shelfHeight}
                          onPress={openDetails}
                          compact
                        />
                      ))}
                    </ScrollView>
                  </View>
                ) : null}

                {getComboItems(cache.tv?.combos, 'Top Rated').length ? (
                  <View style={styles.section}>
                    <View style={styles.sectionRow}>
                      <Text style={styles.sectionTitle}>Top rated {genreTitle} TV series</Text>
                      <TouchableOpacity
                        onPress={() =>
                          openViewAll(
                            `Top Rated ${genreTitle} TV Series`,
                            getComboItems(cache.tv?.combos, 'Top Rated'),
                            'tv',
                            'vote_average.desc'
                          )
                        }
                      >
                        <Text style={styles.viewAllText}>View all</Text>
                      </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelfRow}>
                      {getComboItems(cache.tv?.combos, 'Top Rated').map((item) => (
                        <PosterGridCard
                          key={`tv-rated-${item.tmdb_id}`}
                          item={item}
                          width={shelfWidth}
                          imageHeight={shelfHeight}
                          onPress={openDetails}
                          compact
                        />
                      ))}
                    </ScrollView>
                  </View>
                ) : null}
              </>
            ) : (
              <>
                {trendingMovieItems.length ? (
                  <View style={styles.section}>
                    <View style={styles.sectionRow}>
                      <Text style={styles.sectionTitle}>Trending {genreTitle} movies</Text>
                      <TouchableOpacity
                        onPress={() => openViewAll(`${genreTitle} Movies`, trendingMovieItems, 'movie', 'popularity.desc')}
                      >
                        <Text style={styles.viewAllText}>View all</Text>
                      </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelfRow}>
                      {trendingMovieItems.map((item) => (
                        <PosterGridCard
                          key={`movie-top-${item.tmdb_id}`}
                          item={item}
                          width={shelfWidth}
                          imageHeight={shelfHeight}
                          onPress={openDetails}
                          compact
                        />
                      ))}
                    </ScrollView>
                  </View>
                ) : null}

                {movieSections.map(([label, items]) => (
                  <View key={label} style={styles.section}>
                    <View style={styles.sectionRow}>
                      <Text style={styles.sectionTitle}>{label}</Text>
                      <TouchableOpacity
                        onPress={() => openViewAll(label, items, 'movie', getSortByFromLabel(label))}
                      >
                        <Text style={styles.viewAllText}>View all</Text>
                      </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelfRow}>
                      {items.map((item) => (
                        <PosterGridCard
                          key={`movie-section-${label}-${item.tmdb_id}`}
                          item={item}
                          width={shelfWidth}
                          imageHeight={shelfHeight}
                          onPress={openDetails}
                          compact
                        />
                      ))}
                    </ScrollView>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

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
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRightCompact: {
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
  heroCard: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#101725',
    marginBottom: 18,
  },
  heroBackdrop: {
    width: '100%',
    minHeight: 540,
  },
  heroBackdropImage: {
    resizeMode: 'cover',
    transform: [{ scale: 1.03 }],
  },
  heroOverlay: {
    flex: 1,
    paddingHorizontal: 32,
    paddingVertical: 28,
  },
  heroTitleWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    color: '#f8fafc',
    fontSize: 62,
    fontWeight: '900',
    textAlign: 'center',
  },
  heroTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  heroTab: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 12,
    marginTop: 8,
  },
  heroTabActive: {
    backgroundColor: '#ffffff',
  },
  heroTabText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  heroTabTextActive: {
    color: '#08101b',
  },
  heroFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 360,
  },
  loadingState: {
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentBlock: {
    marginBottom: 22,
  },
  posterGridCard: {
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: 22,
    marginBottom: 22,
    backgroundColor: '#101725',
  },
  posterGridImage: {
    width: '100%',
    backgroundColor: '#101725',
    borderRadius: 14,
    overflow: 'hidden',
  },
  posterGridFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  posterOverlayBody: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  posterCaptionBody: {
    paddingTop: 10,
  },
  posterCaptionTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 4,
  },
  posterCaptionMeta: {
    color: 'rgba(226,232,240,0.74)',
    fontSize: 12,
    fontWeight: '600',
  },
  posterOverlayTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 4,
  },
  posterOverlayTitleCompact: {
    fontSize: 17,
    lineHeight: 19,
  },
  posterOverlayMeta: {
    color: 'rgba(226,232,240,0.88)',
    fontSize: 12,
    fontWeight: '600',
  },
  typePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(250,204,21,0.16)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  typePillTv: {
    backgroundColor: 'rgba(47,110,232,0.2)',
  },
  typePillText: {
    color: '#f8fafc',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  gridCardTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 8,
  },
  gridCardMeta: {
    color: '#8d98ab',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
  },
  viewAllText: {
    color: '#8d98ab',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  shelfRow: {
    paddingRight: 20,
  },
  footer: {
    marginTop: 22,
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
  appBadgeRow: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  appBadgeGroup: {
    alignItems: 'flex-start',
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
