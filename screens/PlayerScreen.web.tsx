import React, { useEffect, useMemo, useState } from 'react';
import {
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
import { isFavorite, toggleFavorite } from '../utils/favorites';
import { fetchMediaDetails, getMediaTargetScreen, getMediaTitle, getMediaYear } from '../utils/media';
import { navigateToHomeMode } from '../utils/webNavigation';

const logoAsset = require('../assets/logo.png');

const NAV_ITEMS = [
  { key: 'home', label: 'Home' },
  { key: 'tv', label: 'TV Shows' },
  { key: 'movie', label: 'Movies' },
];

function formatRuntime(minutes) {
  if (!minutes) {
    return 'N/A';
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (!hours) {
    return `${remainingMinutes}m`;
  }

  return `${hours}h ${remainingMinutes}m`;
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
        {getMediaTitle(item)}
      </Text>
      <Text style={styles.relatedMeta} numberOfLines={1}>
        {item.type === 'tv' ? 'Series' : 'Movie'}
        {getMediaYear(item) ? ` • ${getMediaYear(item)}` : ''}
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
    genres = [],
    movieCollection,
    similar = [],
    rating_label,
    spoken_languages = [],
    cast = [],
    directors = [],
    writers = [],
    starring_names = [],
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

  const openHomeMode = (mode) => {
    navigateToHomeMode(navigation, mode);
  };

  const openDetails = async (item) => {
    try {
      const nextData = await fetchMediaDetails({
        tmdb_id: item.tmdb_id,
        type: item.type || 'movie',
      });
      navigation.navigate(getMediaTargetScreen(nextData.type || item.type || 'movie'), { data: nextData });
    } catch (error) {
      console.error('Failed to fetch movie details:', error);
    }
  };

  const movieCollectionItems = (resolvedMovieCollection?.parts || []).filter(
    (item) => String(item.tmdb_id) !== String(tmdb_id)
  );
  const castItems = cast.slice(0, 12);
  const infoCast = starring_names.length ? starring_names.join(', ') : cast.slice(0, 5).map((person) => person.name).join(', ');
  const heroDirector = directors[0]?.name || writers[0]?.name || 'Unavailable';
  const heroStarring = infoCast || 'Unavailable';

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
      <View style={styles.shell}>
        <ImageBackground
          source={{ uri: backdrop || poster || undefined }}
          style={styles.heroCard}
          imageStyle={[styles.heroImage, { objectPosition: 'center 20%' } as any]}
        >
          <LinearGradient
            colors={['rgba(5,8,13,0.26)', 'rgba(5,8,13,0.36)', 'rgba(5,8,13,0.92)']}
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
                  {runtime ? <Text style={styles.heroMetaText}>{formatRuntime(runtime)}</Text> : null}
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
                  {(embedUrls || embedUrl) ? (
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={() =>
                        navigation.navigate('VideoPlayer', {
                          embedUrls,
                          embedUrl,
                          title,
                          description,
                          backdrop,
                          poster,
                          genres,
                          release_date,
                          runtime,
                          rating_label,
                          type: 'movie',
                        })
                      }
                    >
                      <Ionicons name="play" size={16} color="#08101b" />
                      <Text style={styles.primaryButtonText}>Play</Text>
                    </TouchableOpacity>
                  ) : null}

                  {trailerUrl ? (
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() =>
                        navigation.navigate('VideoPlayer', {
                          embedUrl: trailerUrl,
                          title: `${title} trailer`,
                          description,
                          backdrop,
                          poster,
                          genres,
                          release_date,
                          runtime,
                          rating_label,
                          type: 'movie',
                        })
                      }
                    >
                      <Ionicons name="videocam-outline" size={16} color="#f8fafc" />
                      <Text style={styles.secondaryButtonText}>Trailer</Text>
                    </TouchableOpacity>
                  ) : null}

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
                  <Text style={styles.heroSideLabel}>Director</Text>
                  <Text style={styles.heroSideValue}>{heroDirector}</Text>
                </View>

                <View style={styles.heroSideBlock}>
                  <Text style={styles.heroSideLabel}>Starring</Text>
                  <Text style={styles.heroSideValue}>{heroStarring}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>

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

        {movieCollectionItems.length ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>From this collection</Text>
              {resolvedMovieCollection?.name ? <Text style={styles.sectionSubtitle}>{resolvedMovieCollection.name}</Text> : null}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedRow}>
              {movieCollectionItems.map((item) => (
                <RelatedCard key={`collection-${item.tmdb_id}`} item={item} onPress={openDetails} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {similar.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>More like this</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedRow}>
              {similar.map((item) => (
                <RelatedCard key={`similar-${item.tmdb_id}`} item={item} onPress={openDetails} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.infoGrid}>
          <View style={styles.infoColumnWide}>
            <Text style={styles.infoSectionTitle}>Synopsis</Text>
            <Text style={styles.synopsisText}>{description || 'No synopsis available.'}</Text>
          </View>

          <View style={styles.infoColumn}>
            <Text style={styles.infoSectionTitle}>Information</Text>
            <InfoItem label="Release Date" value={release_date || getMediaYear(data)} />
            <InfoItem label="Runtime" value={formatRuntime(runtime)} />
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
    marginBottom: 30,
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
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13,19,32,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 13,
    marginRight: 12,
  },
  secondaryButtonText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
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
  section: {
    marginBottom: 34,
  },
  sectionHeader: {
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
