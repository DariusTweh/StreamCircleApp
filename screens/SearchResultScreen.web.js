import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchJson } from '../utils/api';
import { fetchMediaDetails, getMediaTargetScreen, getMediaTitle } from '../utils/media';
import { navigateToDrawerScreen } from '../utils/webNavigation';

const logoAsset = require('../assets/logo.png');

const NAV_ITEMS = [
  { key: 'home', label: 'Home' },
  { key: 'tv', label: 'TV Shows' },
  { key: 'movie', label: 'Movies' },
];

function getMediaKey(item) {
  return `${item?.type || 'movie'}-${item?.tmdb_id}`;
}

function getMediaTypeLabel(item) {
  return item?.type === 'tv' ? 'Series' : 'Movie';
}

function getMediaYear(item) {
  const date = item?.release_date || item?.first_air_date || null;
  return date ? String(date).split('-')[0] : null;
}

function ResultCard({ item, width, onPress }) {
  const artwork = item?.poster || item?.backdrop || null;

  return (
    <TouchableOpacity style={[styles.resultCard, { width }]} activeOpacity={0.9} onPress={() => onPress(item)}>
      {artwork ? (
        <Image source={{ uri: artwork }} style={styles.resultCardImage} />
      ) : (
        <View style={[styles.resultCardImage, styles.resultCardFallback]}>
          <Ionicons
            name={item.type === 'tv' ? 'tv-outline' : 'film-outline'}
            size={34}
            color="rgba(226,232,240,0.88)"
          />
        </View>
      )}

      <View style={styles.resultCardBody}>
        <View style={styles.resultCardMetaRow}>
          <View style={[styles.typePill, item.type === 'tv' && styles.typePillTv]}>
            <Text style={styles.typePillText}>{getMediaTypeLabel(item)}</Text>
          </View>
          {getMediaYear(item) ? <Text style={styles.resultYear}>{getMediaYear(item)}</Text> : null}
        </View>

        <Text style={styles.resultTitle} numberOfLines={2}>
          {getMediaTitle(item)}
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

export default function SearchResultScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const initialQuery = route?.params?.query || '';
  const isCompact = width < 1180;
  const cardWidth =
    width >= 1700 ? 236 : width >= 1440 ? 220 : width >= 1240 ? 204 : width >= 1024 ? 188 : 168;
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(initialQuery);
    fetchSearch(initialQuery);
  }, [initialQuery]);

  const fetchSearch = async (value) => {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      const data = await fetchJson('/search', { q: trimmedValue });
      setResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const openDetails = async (item) => {
    try {
      const data = await fetchMediaDetails({ tmdb_id: item.tmdb_id, type: item.type });
      navigation.navigate(getMediaTargetScreen(item.type), { data });
    } catch (error) {
      console.error('Failed to open details:', error);
    }
  };

  const openHomeMode = (mode) => {
    navigation.navigate('Search', { mode });
  };

  const openFavorites = () => {
    const parent = navigation.getParent();
    if (parent?.navigate) {
      parent.navigate('Favorites');
      return;
    }

    navigation.navigate('Favorites');
  };

  const openRandom = () => {
    navigateToDrawerScreen(navigation, 'Random');
  };

  const submitSearch = () => {
    fetchSearch(query);
  };
  const movieCount = results.filter((item) => item.type === 'movie').length;
  const seriesCount = results.filter((item) => item.type === 'tv').length;

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
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={17} color="#cbd5e1" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={submitSearch}
                placeholder="Search"
                placeholderTextColor="#8d98ab"
                returnKeyType="search"
              />
            </View>

            <TouchableOpacity style={styles.favoriteButton} onPress={openRandom}>
              <Ionicons name="dice-outline" size={15} color="#f8fafc" />
              <Text style={styles.favoriteButtonText}>Randomizer</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.favoriteButton} onPress={openFavorites}>
              <Ionicons name="heart-outline" size={15} color="#f8fafc" />
              <Text style={styles.favoriteButtonText}>Favorites</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.resultStage}>
          <Text style={styles.breadcrumb}>
            Search result <Text style={styles.breadcrumbDivider}>›</Text>{' '}
            <Text style={styles.breadcrumbCurrent}>{query || 'Search'}</Text>
          </Text>

          {loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color="#facc15" />
            </View>
          ) : results.length ? (
            <>
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsTitle}>All results</Text>
                <Text style={styles.resultsSummary}>
                  {results.length} titles • {movieCount} movies • {seriesCount} series
                </Text>
              </View>

              <View style={styles.resultsGrid}>
                {results.map((item) => (
                  <ResultCard
                    key={getMediaKey(item)}
                    item={item}
                    width={cardWidth}
                    onPress={openDetails}
                  />
                ))}
              </View>
            </>
          ) : (
            <View style={styles.centerState}>
              <Ionicons name="search-outline" size={40} color="rgba(148,163,184,0.86)" />
              <Text style={styles.emptyTitle}>No matches found</Text>
              <Text style={styles.emptyText}>Try another title, franchise, actor, or show name.</Text>
            </View>
          )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 48,
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
    width: '100%',
    justifyContent: 'space-between',
  },
  searchBox: {
    width: 220,
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
    fontSize: 14,
    outlineStyle: 'none',
  },
  favoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    marginLeft: 10,
  },
  favoriteButtonText: {
    color: '#08101b',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 7,
  },
  resultStage: {
    minHeight: 600,
    marginBottom: 36,
  },
  breadcrumb: {
    color: '#a7b0bf',
    fontSize: 16,
    marginBottom: 28,
  },
  breadcrumbDivider: {
    color: '#748093',
  },
  breadcrumbCurrent: {
    color: '#f8fafc',
    fontWeight: '600',
  },
  resultsHeader: {
    marginBottom: 20,
  },
  resultsTitle: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  resultsSummary: {
    color: '#8d98ab',
    fontSize: 14,
  },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginRight: -18,
    marginBottom: -18,
  },
  resultCard: {
    backgroundColor: '#0d1320',
    borderRadius: 18,
    overflow: 'hidden',
    marginRight: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
  },
  resultCardImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#101725',
  },
  resultCardFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultCardBody: {
    padding: 14,
  },
  resultCardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  typePill: {
    backgroundColor: 'rgba(250,204,21,0.16)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
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
  resultYear: {
    color: '#8d98ab',
    fontSize: 12,
    fontWeight: '600',
  },
  resultTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  centerState: {
    minHeight: 360,
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
