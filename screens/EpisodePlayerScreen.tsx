import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  ScrollView,
  ImageBackground,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme';
import { isFavorite, toggleFavorite } from '../utils/favorites';
import { fetchJson } from '../utils/api';

const { width } = Dimensions.get('window');
const VIDEO_HEIGHT = (width * 9) / 16;

function pickRandomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffleItems(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function normalizeEpisodes(items = []) {
  return items.filter((item) => Number.isInteger(item?.episode_number) && item.episode_number > 0);
}

function normalizeSeasons(items = []) {
  return items.filter((item) => Number.isInteger(item?.season_number) && item.season_number > 0);
}

export default function EpisodePlayerScreen({ route }) {
  const navigation = useNavigation<any>();
  const { tmdb_id, season, episode, episodes, seasons, imdb_id, tvdb_id, show } = route.params;
  const [uiEpisode, setUiEpisode] = useState(episode);
  const [webKey, setWebKey] = useState(0);
  const [activeServer, setActiveServer] = useState('server1');
  const [favorited, setFavorited] = useState(false);
  const [randomLoading, setRandomLoading] = useState(false);
  const [availableSeasons, setAvailableSeasons] = useState(() =>
    normalizeSeasons(Array.isArray(seasons) ? seasons : [])
  );

  const webRef = useRef(null);
  // ✅ keeps the latest episode number for callbacks (prevents stale closure issues)
  const episodeRef = useRef(episode);
  useEffect(() => {
    episodeRef.current = episode;
  }, [episode]);
  
  useEffect(() => {
    setUiEpisode(episode);
    episodeRef.current = episode;
  }, [episode]);

  useEffect(() => {
    setAvailableSeasons(normalizeSeasons(Array.isArray(seasons) ? seasons : []));
  }, [seasons]);

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
        console.error('Failed to load seasons for episode player:', error);
      }
    };

    loadSeasons();

    return () => {
      isActive = false;
    };
  }, [availableSeasons.length, tmdb_id]);

  const currentSeasonEpisodes = normalizeEpisodes(Array.isArray(episodes) ? episodes : []);
  const currentEpisode = currentSeasonEpisodes.find((ep) => ep.episode_number === uiEpisode);
  const nextEpisode = currentSeasonEpisodes.find((ep) => ep.episode_number === uiEpisode + 1);
  const navigateToEpisode = (nextSeason, nextEpisodeNumber, nextEpisodes) => {
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
const tryHandleFromRedirectUrl = (url) => {
  if (!url) return;

  // Many ad redirects include the real target in a q= param
  const qMatch = url.match(/[?&]q=([^&]+)/);
  if (qMatch?.[1]) {
    const decoded = decodeURIComponent(qMatch[1]);
    handlePossibleEpisodeUrl(decoded);
  }

  // Backup: sometimes episode is directly in the redirect URL
  handlePossibleEpisodeUrl(url);
};


  // ✅ Unified embed URL logic for all 3 servers
  const embedUrl =
    activeServer === 'server1'
      ? `https://vidsrc-embed.ru/embed/tv?${imdb_id ? `imdb=${imdb_id}` : `tmdb=${tmdb_id}`}&season=${season}&episode=${episode}&autoplay=1&autonext=1`
      : activeServer === 'server2'
      ? `https://embed.q62movies.ws/tv-show?tvdbId=${tvdb_id || tmdb_id}&s=${season}&e=${episode}`
      : `https://vidsrc.to/embed/tv/${tmdb_id}/${season}/${episode}?autoplay=1`;

  const isIos = Platform.OS === 'ios';

  // ✅ Allowlist the embed providers you use
  const allowedHosts = useMemo(() => {
    const base = [
      'vsembed.ru',
      'vidsrc.to',
      'embed.q62movies.ws',
      'vidsrc.xyz',
      'vidsrcme.su',
      'vidsrc-embed.ru',
      'vidsrc.to',
    ];
    return Array.from(new Set(base.flatMap((h) => [h, `www.${h}`])));
  }, []);

  const isAllowedHost = (url) => {
    try {
      const host = new URL(url).host;
      return allowedHosts.includes(host);
    } catch {
      return false;
    }
  };

  const isBlockedAdHost = (url) => {
    // hard-block common ad/tracker redirects
    return (
      url.includes('cloudnestra.com') ||
      url.includes('pxdrop.lijit.com') ||
      url.includes('t.sharethis.com')
    );
  };
    // ✅ Watch the iframe src. When it changes (autonext), send it to RN.
const injectedJavaScript = useMemo(() => {
  if (activeServer !== 'server1') return 'true;';

  return `
    (function () {
      function post(url) {
        try {
          window.ReactNativeWebView.postMessage(
            JSON.stringify({ type: 'IFRAME_SRC', url: String(url || '') })
          );
        } catch (e) {}
      }

      function isAdUrl(u) {
        if (!u) return true;
        return (
          u.indexOf('cloudnestra.com') !== -1 ||
          u.indexOf('pxdrop.lijit.com') !== -1 ||
          u.indexOf('sharethis') !== -1
        );
      }

      function looksLikePlayer(u) {
        if (!u) return false;
        // we only care about urls that likely contain episode info
        return (
          u.indexOf('vidsrc') !== -1 ||
          u.indexOf('tmdb=') !== -1 ||
          u.indexOf('imdb=') !== -1 ||
          u.indexOf('season=') !== -1 ||
          u.indexOf('episode=') !== -1
        );
      }

      function pickBestIframeSrc() {
        var ifrs = document.querySelectorAll('iframe');
        if (!ifrs || !ifrs.length) return '';

        // 1) Prefer iframes that look like the player and are not ads
        for (var i = 0; i < ifrs.length; i++) {
          var src = (ifrs[i] && ifrs[i].src) ? ifrs[i].src : '';
          if (src && !isAdUrl(src) && looksLikePlayer(src)) return src;
        }

        // 2) Otherwise take any non-ad iframe
        for (var j = 0; j < ifrs.length; j++) {
          var src2 = (ifrs[j] && ifrs[j].src) ? ifrs[j].src : '';
          if (src2 && !isAdUrl(src2)) return src2;
        }

        return '';
      }

      var last = '';

      function tick() {
        var src = pickBestIframeSrc();
        if (src && src !== last) {
          last = src;
          post(src);
        }
      }

      setTimeout(tick, 800);

      try {
        var obs = new MutationObserver(tick);
        obs.observe(document.documentElement, {
          subtree: true,
          childList: true,
          attributes: true
        });
      } catch (e) {}

      setInterval(tick, 700);
    })();
    true;
  `;
}, [activeServer]);



const handlePossibleEpisodeUrl = (maybeUrl?: string) => {
  if (activeServer !== 'server1') return;

  const url = String(maybeUrl || '');

  // Primary pattern: ?episode=12
  const match = url.match(/[?&]episode=(\d+)/);
  if (!match) return;

  const nextEpNum = parseInt(match[1], 10);
  if (!Number.isFinite(nextEpNum)) return;
  if (nextEpNum === episodeRef.current) return;

  const updatedEpisode = currentSeasonEpisodes.find(
    (ep) => ep.episode_number === nextEpNum
  );
  if (!updatedEpisode) return;

  console.log('AUTO-NEXT → EPISODE', nextEpNum);

  navigateToEpisode(season, nextEpNum, currentSeasonEpisodes);
};

const handleToggleFavorite = async () => {
  if (!favoriteItem) {
    console.warn('No show metadata available to favorite from this episode screen.');
    return;
  }

  try {
    const result = await toggleFavorite(favoriteItem);
    setFavorited(result.isFavorite);
  } catch (error) {
    console.error('Failed to toggle show favorite:', error);
  }
};

const fetchSeasonEpisodes = async (seasonNumber) => {
  if (seasonNumber === season) {
    return currentSeasonEpisodes;
  }

  try {
    const data = await fetchJson('/episodes', { tv_id: tmdb_id, season: seasonNumber });
    return normalizeEpisodes(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error(`Failed to fetch season ${seasonNumber} episodes:`, error);
    return [];
  }
};

const handleRandomEpisode = async () => {
  if (!availableSeasons.length) {
    Alert.alert('No seasons available', 'This show does not have any playable seasons yet.');
    return;
  }

  try {
    setRandomLoading(true);
    const seasonsToTry = shuffleItems(availableSeasons);

    for (const seasonItem of seasonsToTry) {
      const seasonEpisodes = await fetchSeasonEpisodes(seasonItem.season_number);

      if (!seasonEpisodes.length) {
        continue;
      }

      const chosenEpisode = pickRandomItem(seasonEpisodes);
      navigateToEpisode(seasonItem.season_number, chosenEpisode.episode_number, seasonEpisodes);
      return;
    }

    Alert.alert('No episodes available', 'We could not find a playable random episode for this show.');
  } catch (error) {
    console.error('Failed to pick random episode from player screen:', error);
    Alert.alert('Random pick failed', 'We could not load a random episode right now.');
  } finally {
    setRandomLoading(false);
  }
};

  return (
    <ImageBackground
      source={{ uri: currentEpisode?.still }}
      style={styles.container}
      blurRadius={20}
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.4)', '#0f172a']}
        style={StyleSheet.absoluteFill}
      />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <BlurView intensity={30} tint="dark" style={styles.topButton}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
        </BlurView>

        <BlurView intensity={30} tint="dark" style={styles.topButton}>
          <TouchableOpacity onPress={handleToggleFavorite} disabled={!favoriteItem} style={!favoriteItem ? styles.disabledIcon : null}>
            <Ionicons name={favorited ? 'heart' : 'bookmark-outline'} size={20} color={favorited ? '#ef4444' : 'white'} />
          </TouchableOpacity>
        </BlurView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* Video Player */}
        <View style={styles.videoWrapper}>
          <WebView
            ref={webRef}
            key={webKey}
            source={{ uri: embedUrl }}
            originWhitelist={['*']}
            javaScriptEnabled
            injectedJavaScript={injectedJavaScript}
            allowsInlineMediaPlayback
            allowsPictureInPictureMediaPlayback
            allowsAirPlayForMediaPlayback
            onMessage={(event) => {
              const message = event.nativeEvent.data;

              if (!message || message === 'INJECT_OK') {
                return;
              }

              try {
                const parsed = JSON.parse(message);

                if (parsed?.type === 'IFRAME_SRC') {
                  handlePossibleEpisodeUrl(parsed.url);
                }
              } catch {
                handlePossibleEpisodeUrl(message);
              }
            }}
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
            setSupportMultipleWindows={false}
            javaScriptCanOpenWindowsAutomatically={false}
            userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
            style={styles.webview}
            onShouldStartLoadWithRequest={(req) => {
              const url = req.url || '';

              // allow init/internal loads
              if (url === 'about:blank' || url.startsWith('data:')) return true;

              // ✅ don't block subframes (prevents breaking the actual player iframe)
              if (req.isTopFrame === false) return true;

              // ✅ block known ad/tracker redirects
              if (isBlockedAdHost(url)) {
                console.log('BLOCKED AD NAV:', url);
                // ✅ NEW: attempt to extract next episode from the redirect
                 tryHandleFromRedirectUrl(url);
                return false;
              }

              // ✅ only allow top-frame nav inside your providers
              const ok = isAllowedHost(url);
              if (!ok) console.log('BLOCKED NAV:', url);
                
              return ok;
            }}
             onNavigationStateChange={(navState) => {
              handlePossibleEpisodeUrl(navState?.url);
            }}
          />
        </View>

        {/* Reload (not a true "skip ad") */}
        <TouchableOpacity
          style={[styles.serverButton, { backgroundColor: '#ef4444' }]}
          onPress={() => setWebKey((prev) => prev + 1)}
        >
          <Ionicons name="refresh" size={16} color="white" />
          <Text style={styles.serverText}>Reload Player</Text>
        </TouchableOpacity>

        {/* Go back inside player */}
        <TouchableOpacity
          style={[styles.serverButton, { marginTop: 0 }]}
          onPress={() => webRef.current?.goBack?.()}
        >
          <Ionicons name="arrow-undo" size={16} color="white" />
          <Text style={styles.serverText}>Go Back</Text>
        </TouchableOpacity>

        {/* Server Switcher */}
        <TouchableOpacity
          style={styles.serverButton}
          onPress={() => {
            const servers = ['server1', 'server2', 'server3'];
            const currentIndex = servers.indexOf(activeServer);
            const nextIndex = (currentIndex + 1) % servers.length;
            setActiveServer(servers[nextIndex]);
            setWebKey((prev) => prev + 1); // ✅ reload when switching
          }}
        >
          <Ionicons name="repeat-outline" size={16} color="white" />
          <Text style={styles.serverText}>
            Switch to{' '}
            {activeServer === 'server1'
              ? 'Server 2'
              : activeServer === 'server2'
              ? 'Server 3'
              : 'Server 1'}
          </Text>
        </TouchableOpacity>

        {/* Safari fallback for more reliable AirPlay / remote playback */}
        {isIos && (
          <TouchableOpacity
            style={[
              styles.serverButton,
              { backgroundColor: '#64748b', marginTop: 0 },
            ]}
            onPress={() => Linking.openURL(embedUrl)}
          >
            <Ionicons name="globe-outline" size={16} color="white" />
            <Text style={styles.serverText}>Open in Safari</Text>
          </TouchableOpacity>
        )}

        {/* Episode Info */}
        <View style={styles.infoSection}>
          <Text style={styles.title}>
            {currentEpisode?.name || `Episode ${uiEpisode}`}
          </Text>
          <Text style={styles.meta}>{currentEpisode?.air_date}</Text>

          <TouchableOpacity
            style={[styles.randomBtn, randomLoading && styles.disabledButton]}
            onPress={handleRandomEpisode}
            disabled={randomLoading}
          >
            {randomLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="shuffle-outline" size={16} color="white" />
            )}
            <Text style={styles.randomBtnText}>Random Episode From This Show</Text>
          </TouchableOpacity>
          <Text style={styles.randomHint}>Pulls a random episode from any season.</Text>

          <Text style={styles.description}>
            {currentEpisode?.overview || 'No description available.'}
          </Text>

          {nextEpisode && (
            <TouchableOpacity
              style={styles.nextBtn}
              onPress={() => navigateToEpisode(season, nextEpisode.episode_number, currentSeasonEpisodes)}
            >
              <Text style={styles.nextBtnText}>
                ▶ Watch Next: {nextEpisode.name}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </ImageBackground>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 30 },
  topBar: {
    marginTop: Platform.OS === 'android' ? 30 : 50,
    marginBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topButton: { padding: 8, borderRadius: 18, overflow: 'hidden' },
  disabledIcon: { opacity: 0.45 },
  videoWrapper: {
    width: width * 0.92,
    height: VIDEO_HEIGHT,
    backgroundColor: 'black',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    alignSelf: 'center',
  },
  webview: { flex: 1 },
  serverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: 'center',
    marginVertical: 16,
  },
  serverText: { color: 'white', fontSize: 13, marginLeft: 8 },
  infoSection: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', color: 'white', marginBottom: 6 },
  meta: { color: '#94A3B8', fontSize: 14, marginBottom: 14 },
  randomBtn: {
    marginBottom: 8,
    backgroundColor: colors.buttonSecondary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  randomBtnText: { color: 'white', fontWeight: '600', fontSize: 14 },
  randomHint: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: { color: '#CBD5E1', fontSize: 15, lineHeight: 22 },
  nextBtn: {
    marginTop: 24,
    backgroundColor: '#1e3a8a',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  nextBtnText: { color: 'white', fontWeight: '600', fontSize: 16 },
  disabledButton: { opacity: 0.7 },
});
  
