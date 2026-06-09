import React, { useMemo, useState } from 'react';
import {
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
import { navigateToHomeMode } from '../utils/webNavigation';

const logoAsset = require('../assets/logo.png');

const IFrameElement: any = 'iframe';

const NAV_ITEMS = [
  { key: 'home', label: 'Home' },
  { key: 'tv', label: 'TV Shows' },
  { key: 'movie', label: 'Movies' },
];

function resolveUrl(url?: string | null) {
  if (!url) {
    return null;
  }

  if (url.startsWith('http')) {
    return url;
  }

  if (url.startsWith('/')) {
    return `https://vidsrc.to${url}`;
  }

  return `https://vidsrc.to/${url}`;
}

function formatRuntime(minutes?: number | null) {
  if (!minutes) {
    return null;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (!hours) {
    return `${remainingMinutes}m`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

function getYear(releaseDate?: string | null) {
  return releaseDate ? String(releaseDate).split('-')[0] : null;
}

function ActionButton({ icon, label, onPress, primary = false }: any) {
  return (
    <TouchableOpacity
      style={[styles.actionButton, primary ? styles.actionButtonPrimary : styles.actionButtonSecondary]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Ionicons name={icon} size={16} color={primary ? '#08101b' : '#f8fafc'} />
      <Text style={[styles.actionButtonText, primary ? styles.actionButtonTextPrimary : null]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function DetailChip({ label, value }: any) {
  if (!value) {
    return null;
  }

  return (
    <View style={styles.detailChip}>
      <Text style={styles.detailChipLabel}>{label}</Text>
      <Text style={styles.detailChipValue}>{value}</Text>
    </View>
  );
}

export default function VideoPlayer({ route, navigation }) {
  const params = route?.params?.data || route?.params || {};
  const {
    embedUrls,
    embedUrl,
    title,
    description,
    backdrop,
    poster,
    genres = [],
    release_date,
    runtime,
    rating_label,
    type,
  } = params;

  const [activeServer, setActiveServer] = useState('server1');
  const [webKey, setWebKey] = useState(0);

  const rawUrl = embedUrls?.[activeServer] || embedUrl;
  const finalUrl = useMemo(() => resolveUrl(rawUrl), [rawUrl]);
  const serverKeys = useMemo(
    () => ['server1', 'server2', 'server3'].filter((key) => Boolean(embedUrls?.[key])),
    [embedUrls]
  );

  const openHomeMode = (mode: string) => {
    navigateToHomeMode(navigation, mode);
  };

  const metaItems = [rating_label, getYear(release_date), formatRuntime(runtime)].filter(Boolean);
  const artwork = backdrop || poster || undefined;
  const mediaLabel = type === 'tv' ? 'Series Player' : 'Movie Player';

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
      <View style={styles.shell}>
        <ImageBackground
          source={artwork ? { uri: artwork } : undefined}
          style={styles.heroCard}
          imageStyle={[styles.heroImage, { objectPosition: 'center 22%' } as any]}
        >
          <LinearGradient
            colors={['rgba(5,8,13,0.22)', 'rgba(5,8,13,0.46)', 'rgba(5,8,13,0.94)']}
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
                  <Text style={styles.playerPillText}>{mediaLabel}</Text>
                </View>

                <Text style={styles.heroTitle}>{title || 'Now Playing'}</Text>

                {metaItems.length ? (
                  <View style={styles.heroMetaRow}>
                    {metaItems.map((item) => (
                      <Text key={String(item)} style={styles.heroMetaText}>
                        {item}
                      </Text>
                    ))}
                  </View>
                ) : null}

                <View style={styles.genrePillRow}>
                  {genres.slice(0, 4).map((genre: string) => (
                    <View key={genre} style={styles.genrePill}>
                      <Text style={styles.genrePillText}>{genre}</Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.heroDescription} numberOfLines={4}>
                  {description || 'Launch playback, swap servers if needed, and keep this tab open for the cleanest web viewing experience.'}
                </Text>

                <View style={styles.heroActionRow}>
                  <ActionButton
                    icon="arrow-back-outline"
                    label="Back"
                    primary
                    onPress={() => navigation.goBack()}
                  />
                  <ActionButton icon="open-outline" label="Open in New Tab" onPress={() => finalUrl && Linking.openURL(finalUrl)} />
                </View>
              </View>

              <View style={styles.heroRight}>
                <DetailChip label="Format" value={type === 'tv' ? 'TV Series' : 'Movie'} />
                <DetailChip label="Available Servers" value={serverKeys.length || finalUrl ? `${serverKeys.length || 1}` : '0'} />
                <DetailChip label="Current Server" value={embedUrls ? activeServer.replace('server', 'Server ') : 'Direct'} />
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>

        <View style={styles.playerGrid}>
          <View style={styles.playerColumn}>
            <View style={styles.playerCard}>
              {finalUrl ? (
                <IFrameElement
                  key={webKey}
                  src={finalUrl}
                  title={title || 'Video player'}
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                  allowFullScreen
                  referrerPolicy="origin"
                  style={iframeStyle}
                />
              ) : (
                <View style={styles.errorState}>
                  <Ionicons name="alert-circle-outline" size={28} color="#f8fafc" />
                  <Text style={styles.errorTitle}>No playable video URL</Text>
                  <Text style={styles.errorText}>This item did not provide a valid web player source.</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.sideColumn}>
            <View style={styles.panel}>
              <Text style={styles.panelEyebrow}>Playback Controls</Text>
              <Text style={styles.panelTitle}>Switch servers without leaving the page.</Text>

              {serverKeys.length ? (
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
              ) : null}

              <View style={styles.panelButtonStack}>
                <ActionButton icon="refresh-outline" label="Reload Player" onPress={() => setWebKey((prev) => prev + 1)} />
                {finalUrl ? (
                  <ActionButton icon="open-outline" label="Open Browser Player" onPress={() => Linking.openURL(finalUrl)} />
                ) : null}
              </View>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelEyebrow}>Now Playing</Text>
              <Text style={styles.panelTitle}>{title || 'Untitled video'}</Text>
              <Text style={styles.panelDescription}>
                {description || 'If one server stalls, switch to another source and reload the player.'}
              </Text>

              <View style={styles.summaryList}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Year</Text>
                  <Text style={styles.summaryValue}>{getYear(release_date) || 'N/A'}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Runtime</Text>
                  <Text style={styles.summaryValue}>{formatRuntime(runtime) || 'N/A'}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Genres</Text>
                  <Text style={styles.summaryValue}>{genres.length ? genres.join(', ') : 'Unavailable'}</Text>
                </View>
              </View>
            </View>
          </View>
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
    minHeight: 420,
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
    paddingBottom: 30,
    paddingTop: 92,
  },
  heroLeft: {
    maxWidth: 760,
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
    fontSize: 64,
    lineHeight: 68,
    fontWeight: '900',
    marginBottom: 14,
    letterSpacing: -1.8,
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
    maxWidth: 640,
  },
  heroActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 24,
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
  actionButtonText: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 9,
  },
  actionButtonTextPrimary: {
    color: '#08101b',
  },
  heroRight: {
    width: 300,
    gap: 14,
    alignItems: 'stretch',
  },
  detailChip: {
    padding: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(7,12,20,0.56)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  detailChipLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  detailChipValue: {
    color: '#f8fafc',
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
  },
  playerGrid: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },
  playerColumn: {
    flex: 1,
  },
  sideColumn: {
    width: 360,
    gap: 20,
  },
  playerCard: {
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#000',
    aspectRatio: 16 / 9,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    boxShadow: '0px 20px 60px rgba(0, 0, 0, 0.35)' as any,
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
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: '#020617',
  },
  errorTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 12,
  },
  errorText: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 24,
    marginTop: 10,
    textAlign: 'center',
    maxWidth: 380,
  },
});

const iframeStyle = {
  border: 'none',
  width: '100%',
  height: '100%',
  backgroundColor: 'black',
};
