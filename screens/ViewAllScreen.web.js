import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

const SORT_OPTIONS = [
  { value: 'popularity.desc', label: 'Popular' },
  { value: 'vote_average.desc', label: 'Top rated' },
  { value: 'release_date.desc', label: 'Latest' },
];

const RATING_OPTIONS = [
  { value: 0, label: 'Any rating' },
  { value: 7, label: '7.0+' },
  { value: 8, label: '8.0+' },
];

const LANGUAGE_OPTIONS = [
  { value: '', label: 'All languages' },
  { value: 'en', label: 'English only' },
];

const PAGE_SIZE = 40;

function getMediaKey(item) {
  return `${item?.type || 'movie'}-${item?.tmdb_id}`;
}

function getArtwork(item) {
  return item?.poster || item?.backdrop || null;
}

function FilterChip({ label, active, onPress }) {
  return (
    <TouchableOpacity style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function PosterCard({ item, width, imageHeight, onPress }) {
  const artwork = getArtwork(item);
  const ratingValue =
    typeof item?.rating === 'number'
      ? item.rating
      : typeof item?.vote_average === 'number'
        ? item.vote_average
        : null;

  return (
    <TouchableOpacity
      style={[styles.posterCard, { width }]}
      activeOpacity={0.9}
      onPress={() => onPress(item)}
    >
      {artwork ? (
        <Image source={{ uri: artwork }} style={[styles.posterImage, { height: imageHeight }]} />
      ) : (
        <View style={[styles.posterImage, styles.posterFallback, { height: imageHeight }]}>
          <Ionicons
            name={item.type === 'tv' ? 'tv-outline' : 'film-outline'}
            size={34}
            color="rgba(226,232,240,0.88)"
          />
        </View>
      )}

      <View style={styles.posterBody}>
        <Text style={styles.posterTitle} numberOfLines={2}>
          {getMediaTitle(item)}
        </Text>
        <Text style={styles.posterMeta} numberOfLines={1}>
          {item.type === 'tv' ? 'Series' : 'Movie'}
          {getMediaYear(item) ? ` • ${getMediaYear(item)}` : ''}
          {ratingValue ? ` • ${ratingValue.toFixed(1)}` : ''}
        </Text>
      </View>
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

export default function ViewAllScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const {
    title = 'View All',
    items: seededItems = [],
    genreId,
    type = 'movie',
    sortBy = 'popularity.desc',
  } = route.params || {};

  const cardWidth =
    width >= 1760 ? 246 : width >= 1540 ? 226 : width >= 1320 ? 208 : width >= 1120 ? 188 : 168;
  const cardHeight = Math.round(cardWidth * 1.48);
  const minimumFilledCount = width >= 1320 ? 12 : width >= 1120 ? 10 : 8;
  const initialItems = Array.isArray(seededItems) ? seededItems : [];

  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(2);
  const [loadingInitial, setLoadingInitial] = useState(Boolean(genreId));
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(Boolean(genreId));
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    sort_by: sortBy,
    vote_average_gte: 0,
    with_original_language: '',
  });

  const requestIdRef = useRef(0);
  const mediaLabel = type === 'tv' ? 'TV Series' : 'Movies';

  const openHomeMode = (mode) => {
    navigateToHomeMode(navigation, mode);
  };

  const openDetails = async (item) => {
    try {
      const data = await fetchMediaDetails({ tmdb_id: item.tmdb_id, type: item.type || type });
      navigation.navigate(getMediaTargetScreen(data.type || item.type || type), { data });
    } catch (error) {
      console.error('Failed to open view-all detail:', error);
    }
  };

  const buildParams = useCallback(
    (nextPage, nextFilters = filters) => {
      const params = {
        type,
        page: nextPage,
        limit: PAGE_SIZE,
        sort_by: nextFilters.sort_by,
      };

      if (genreId) {
        params.id = genreId;
      }

      if (nextFilters.sort_by === 'vote_average.desc') {
        params.vote_count_gte = 300;
      }

      if (nextFilters.vote_average_gte) {
        params.vote_average_gte = nextFilters.vote_average_gte;
      }

      if (nextFilters.with_original_language) {
        params.with_original_language = nextFilters.with_original_language;
      }

      return params;
    },
    [filters, genreId, type]
  );

  const fetchPage = useCallback(
    async (nextPage, { replace = false } = {}) => {
      if (!genreId) {
        setLoadingInitial(false);
        setLoadingMore(false);
        setHasMore(false);
        return;
      }

      const requestId = ++requestIdRef.current;

      if (replace) {
        setLoadingInitial(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const data = await fetchJson('/genre/viewall', buildParams(nextPage));
        const nextItems = Array.isArray(data) ? data : [];

        if (requestId !== requestIdRef.current) {
          return;
        }

        if (replace) {
          setItems(nextItems);
          setPage(2);
          setHasMore(nextItems.length >= PAGE_SIZE);
          return;
        }

        let uniqueNewCount = 0;

        setItems((currentItems) => {
          const seen = new Set(currentItems.map(getMediaKey));
          const mergedItems = [...currentItems];

          nextItems.forEach((item) => {
            const key = getMediaKey(item);
            if (!seen.has(key)) {
              seen.add(key);
              mergedItems.push(item);
              uniqueNewCount += 1;
            }
          });

          return mergedItems;
        });

        setPage(nextPage + 1);
        setHasMore(uniqueNewCount > 0 && nextItems.length >= PAGE_SIZE);
      } catch (error) {
        console.error('Failed to fetch view-all page:', error);
      } finally {
        if (requestId === requestIdRef.current) {
          if (replace) {
            setLoadingInitial(false);
          } else {
            setLoadingMore(false);
          }
        }
      }
    },
    [buildParams, genreId]
  );

  useEffect(() => {
    if (!genreId) {
      setLoadingInitial(false);
      setHasMore(false);
      setItems(initialItems);
      return;
    }

    fetchPage(1, { replace: true });
  }, [fetchPage, genreId]);

  useEffect(() => {
    if (!genreId || loadingInitial || loadingMore || !hasMore) {
      return;
    }

    if (items.length < minimumFilledCount) {
      fetchPage(page);
    }
  }, [fetchPage, genreId, hasMore, items.length, loadingInitial, loadingMore, minimumFilledCount, page]);

  const handleScroll = useCallback(
    ({ nativeEvent }) => {
      if (loadingInitial || loadingMore || !hasMore) {
        return;
      }

      const distanceFromBottom =
        nativeEvent.contentSize.height - (nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y);

      if (distanceFromBottom < 720) {
        fetchPage(page);
      }
    },
    [fetchPage, hasMore, loadingInitial, loadingMore, page]
  );

  const resultSummary = useMemo(() => {
    const prefix = items.length === 1 ? '1 title' : `${items.length}${hasMore ? '+' : ''} titles`;
    return `${prefix} • ${mediaLabel} only`;
  }, [hasMore, items.length, mediaLabel]);

  const resetFilters = () => {
    setFilters({
      sort_by: sortBy,
      vote_average_gte: 0,
      with_original_language: '',
    });
  };

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.pageContent}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={handleScroll}
    >
      <View style={styles.shell}>
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
            <WebHeaderSearch navigation={navigation} inputWidth={260} />
          </View>
        </View>

        <View style={styles.stageHeader}>
          <View style={styles.stageHeaderCopy}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={16} color="#f8fafc" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>

            <Text style={styles.breadcrumb}>Browse all</Text>
            <Text style={styles.pageTitle}>{title}</Text>
            <Text style={styles.pageSubtitle}>
              A cleaner desktop grid for browsing the full {mediaLabel.toLowerCase()} catalog.
            </Text>
          </View>

          <View style={styles.stageHeaderActions}>
            <View style={styles.mediaBadge}>
              <Text style={styles.mediaBadgeText}>{mediaLabel}</Text>
            </View>

            {genreId ? (
              <TouchableOpacity
                style={[styles.filterButton, showFilters && styles.filterButtonActive]}
                onPress={() => setShowFilters((currentValue) => !currentValue)}
              >
                <Ionicons
                  name={showFilters ? 'close-outline' : 'funnel-outline'}
                  size={17}
                  color={showFilters ? '#08101b' : '#f8fafc'}
                />
                <Text style={[styles.filterButtonText, showFilters && styles.filterButtonTextActive]}>
                  Filters
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {showFilters && genreId ? (
          <View style={styles.filterPanel}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupTitle}>Sort by</Text>
              <View style={styles.filterChipRow}>
                {SORT_OPTIONS.map((option) => (
                  <FilterChip
                    key={option.value}
                    label={option.label}
                    active={filters.sort_by === option.value}
                    onPress={() => setFilters((currentFilters) => ({ ...currentFilters, sort_by: option.value }))}
                  />
                ))}
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupTitle}>Minimum rating</Text>
              <View style={styles.filterChipRow}>
                {RATING_OPTIONS.map((option) => (
                  <FilterChip
                    key={option.value}
                    label={option.label}
                    active={filters.vote_average_gte === option.value}
                    onPress={() =>
                      setFilters((currentFilters) => ({
                        ...currentFilters,
                        vote_average_gte: option.value,
                      }))
                    }
                  />
                ))}
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupTitle}>Language</Text>
              <View style={styles.filterChipRow}>
                {LANGUAGE_OPTIONS.map((option) => (
                  <FilterChip
                    key={option.value || 'all'}
                    label={option.label}
                    active={filters.with_original_language === option.value}
                    onPress={() =>
                      setFilters((currentFilters) => ({
                        ...currentFilters,
                        with_original_language: option.value,
                      }))
                    }
                  />
                ))}
              </View>
            </View>

            <View style={styles.filterActions}>
              <TouchableOpacity style={styles.secondaryAction} onPress={resetFilters}>
                <Text style={styles.secondaryActionText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.primaryAction} onPress={() => setShowFilters(false)}>
                <Text style={styles.primaryActionText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={styles.resultSummaryRow}>
          <Text style={styles.resultSummaryText}>{resultSummary}</Text>
          {loadingMore ? <ActivityIndicator size="small" color="#facc15" /> : null}
        </View>

        {loadingInitial && !items.length ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color="#facc15" />
          </View>
        ) : items.length ? (
          <>
            <View style={styles.resultsGrid}>
              {items.map((item) => (
                <PosterCard
                  key={getMediaKey(item)}
                  item={item}
                  width={cardWidth}
                  imageHeight={cardHeight}
                  onPress={openDetails}
                />
              ))}
            </View>

            {hasMore ? (
              <TouchableOpacity
                style={[styles.loadMoreButton, loadingMore && styles.loadMoreButtonDisabled]}
                disabled={loadingMore}
                onPress={() => fetchPage(page)}
              >
                <Text style={styles.loadMoreButtonText}>{loadingMore ? 'Loading...' : 'Load more'}</Text>
              </TouchableOpacity>
            ) : null}
          </>
        ) : (
          <View style={styles.centerState}>
            <Ionicons name="film-outline" size={40} color="rgba(148,163,184,0.86)" />
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptyText}>Try another sort or relax the current desktop filters.</Text>
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
    marginBottom: 28,
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
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    rowGap: 20,
    marginBottom: 18,
  },
  stageHeaderCopy: {
    flexShrink: 1,
    maxWidth: 760,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1320',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 18,
  },
  backButtonText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  breadcrumb: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 8,
  },
  pageTitle: {
    color: '#f8fafc',
    fontSize: 40,
    fontWeight: '900',
    marginBottom: 10,
  },
  pageSubtitle: {
    color: '#8d98ab',
    fontSize: 15,
    lineHeight: 22,
  },
  stageHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  mediaBadge: {
    backgroundColor: 'rgba(47,110,232,0.2)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginRight: 12,
  },
  mediaBadgeText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1320',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterButtonActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  filterButtonText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  filterButtonTextActive: {
    color: '#08101b',
  },
  filterPanel: {
    backgroundColor: '#0d1320',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.14)',
    borderRadius: 22,
    padding: 22,
    marginBottom: 20,
  },
  filterGroup: {
    marginBottom: 18,
  },
  filterGroupTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  filterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterChip: {
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.14)',
  },
  filterChipActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  filterChipText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#08101b',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  secondaryAction: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
  },
  secondaryActionText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
  },
  primaryAction: {
    borderRadius: 999,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  primaryActionText: {
    color: '#08101b',
    fontSize: 12,
    fontWeight: '800',
  },
  resultSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  resultSummaryText: {
    color: '#8d98ab',
    fontSize: 14,
    fontWeight: '600',
  },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginRight: -22,
    marginBottom: -26,
  },
  posterCard: {
    marginRight: 22,
    marginBottom: 26,
  },
  posterImage: {
    width: '100%',
    borderRadius: 18,
    backgroundColor: '#101725',
  },
  posterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterBody: {
    paddingTop: 12,
  },
  posterTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 21,
    marginBottom: 6,
  },
  posterMeta: {
    color: '#8d98ab',
    fontSize: 12,
    fontWeight: '600',
  },
  loadMoreButton: {
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 12,
    marginTop: 28,
    marginBottom: 8,
  },
  loadMoreButtonDisabled: {
    opacity: 0.8,
  },
  loadMoreButtonText: {
    color: '#08101b',
    fontSize: 13,
    fontWeight: '800',
  },
  centerState: {
    minHeight: 420,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 10,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    marginTop: 28,
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
