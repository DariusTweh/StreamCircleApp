import React, { useMemo, useRef, useState,useEffect  } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as Device from 'expo-device';
import { colors } from '../theme';

const { width } = Dimensions.get('window');
const VIDEO_HEIGHT = (width * 9) / 16;

export default function EpisodePlayerScreen({ route }) {
  const navigation = useNavigation();
  const { tmdb_id, season, episode, episodes, imdb_id, tvdb_id } = route.params;
  const [uiEpisode, setUiEpisode] = useState(episode);
  const [webKey, setWebKey] = useState(0);
  const [activeServer, setActiveServer] = useState('server3');

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
 const currentEpisode = episodes?.find((ep) => ep.episode_number === uiEpisode);
const nextEpisode = episodes?.find((ep) => ep.episode_number === uiEpisode + 1);
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
      ? `https://vidsrc.to/embed/tv/${tmdb_id}/${season}/${episode}?autoplay=1`
      : activeServer === 'server2'
      ? `https://embed.q62movies.ws/tv-show?tvdbId=${tvdb_id || tmdb_id}&s=${season}&e=${episode}`
      : `https://vidsrc.xyz/embed/tv?${imdb_id ? `imdb=${imdb_id}` : `tmdb=${tmdb_id}`}&season=${season}&episode=${episode}&autoplay=1&autonext=1`;

  const isIpad =
    Platform.OS === 'ios' && Device.deviceType === Device.DeviceType.TABLET;

  // ✅ Allowlist the embed providers you use
  const allowedHosts = useMemo(() => {
    const base = [
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
  if (activeServer !== 'server3') return 'true;';

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
  if (activeServer !== 'server3') return;

  const url = String(maybeUrl || '');

  // Primary pattern: ?episode=12
  const match = url.match(/[?&]episode=(\d+)/);
  if (!match) return;

  const nextEpNum = parseInt(match[1], 10);
  if (!Number.isFinite(nextEpNum)) return;
  if (nextEpNum === episodeRef.current) return;

  const updatedEpisode = episodes?.find(
    (ep) => ep.episode_number === nextEpNum
  );
  if (!updatedEpisode) return;

  console.log('AUTO-NEXT → EPISODE', nextEpNum);

  navigation.replace('EpisodePlayerScreen', {
    tmdb_id,
    season,
    episode: nextEpNum,
    episodes,
    imdb_id,
    tvdb_id,
  });
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
          <TouchableOpacity onPress={() => {}}>
            <Ionicons name="bookmark-outline" size={20} color="white" />
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
            
            // ✅ NEW: listens for iframe autonext
             injectedJavaScript={`
    (function () {
      try {
        window.ReactNativeWebView.postMessage("INJECT_OK");
      } catch (e) {}
    })();
    true;
  `}
  onMessage={(e) => console.log("WV:", e.nativeEvent.data)}r
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

        {/* Safari Fallback */}
        {isIpad && (
          <TouchableOpacity
            style={[
              styles.serverButton,
              { backgroundColor: '#64748b', marginTop: 0 },
            ]}
            onPress={() => WebBrowser.openBrowserAsync(embedUrl)}
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
          <Text style={styles.description}>
            {currentEpisode?.overview || 'No description available.'}
          </Text>

          {nextEpisode && (
            <TouchableOpacity
              style={styles.nextBtn}
              onPress={() =>
                navigation.replace('EpisodePlayerScreen', {
                  tmdb_id,
                  season,
                  episode: nextEpisode.episode_number,
                  episodes,
                  imdb_id,
                  tvdb_id,
                })
              }
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
  description: { color: '#CBD5E1', fontSize: 15, lineHeight: 22 },
  nextBtn: {
    marginTop: 24,
    backgroundColor: '#1e3a8a',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  nextBtnText: { color: 'white', fontWeight: '600', fontSize: 16 },
});
  