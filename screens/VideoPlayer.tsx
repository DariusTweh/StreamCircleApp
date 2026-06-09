import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  ScrollView,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme';

const { width } = Dimensions.get('window');
export default function VideoPlayer({ route }) {
  const navigation = useNavigation();
  const { embedUrls, embedUrl, title } = route.params;

  const [activeServer, setActiveServer] = useState('server1');
  const [webKey, setWebKey] = useState(0);

  const webRef = useRef(null);

  const isIos = Platform.OS === 'ios';

  // ✅ Sanitize and resolve relative URLs to full https links
  const resolveUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `https://vidsrc.to${url}`;
    return `https://vidsrc.to/${url}`;
  };

  const rawUrl = embedUrls?.[activeServer] || embedUrl;
  const finalUrl = useMemo(() => resolveUrl(rawUrl), [rawUrl]);

  if (!finalUrl || !finalUrl.startsWith('http')) {
    alert('Invalid embed URL. Cannot load video.');
    return null;
  }

// ✅ Allowlist ONLY your embed providers
const allowedHosts = useMemo(() => {
  const base = [
    'vsembed.ru',
    'vidsrcme.su',
    'embed.q62movies.ws',
    'vidsrc-embed.ru',
    'vidsrc.to',
    'vidsrc.xyz',
    'www.vidsrc.to',
  ];
  return Array.from(new Set(base.flatMap(h => [h, `www.${h}`])));
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
  // Hard block the garbage you logged (and similar)
  return (
    url.includes('cloudnestra.com') ||
    url.includes('pxdrop.lijit.com') ||
    url.includes('t.sharethis.com')
  );
};

  return (
    <ScrollView style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={20} color="white" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      {/* Rounded Video Card */}
      <View style={styles.videoCard}>
       <WebView
          ref={webRef}
          key={webKey}
          source={{ uri: finalUrl }}
          originWhitelist={['*']}
          javaScriptEnabled
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          allowsPictureInPictureMediaPlayback
          allowsAirPlayForMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          setSupportMultipleWindows={false}
          javaScriptCanOpenWindowsAutomatically={false}
          onShouldStartLoadWithRequest={(req) => {
            const url = req.url || '';

            // Allow WebView init + weird internal loads
            if (url === 'about:blank' || url.startsWith('data:')) return true;

            // ✅ If it's NOT the top frame, don't block it (prevents breaking the player)
            // iOS provides isTopFrame. Android sometimes does too. This keeps you safe.
            if (req.isTopFrame === false) return true;

            // ✅ Hard-block known ad redirect hosts
            if (isBlockedAdHost(url)) {
              console.log('BLOCKED AD NAV:', url);
              return false;
            }

            // ✅ Only allow top-level navigation to your providers
            const ok = isAllowedHost(url);
            if (!ok) console.log('BLOCKED NAV:', url);
            return ok;
          }}
          style={{ flex: 1 }}
        />
      </View>

      {/* Info & Controls */}
      <View style={styles.infoSection}>
        <Text style={styles.title}>{title || 'Now Playing'}</Text>

        {/* Reload */}
        <TouchableOpacity
          style={[styles.serverButton, { backgroundColor: '#ef4444' }]}
          onPress={() => setWebKey((prev) => prev + 1)}
        >
          <Ionicons name="refresh" size={16} color="white" />
          <Text style={styles.serverText}>Reload Player</Text>
        </TouchableOpacity>

        {/* Go back inside player */}
        <TouchableOpacity
          style={[styles.serverButton, { marginTop: 12 }]}
          onPress={() => webRef.current?.goBack?.()}
        >
          <Ionicons name="arrow-undo" size={16} color="white" />
          <Text style={styles.serverText}>Go Back</Text>
        </TouchableOpacity>

        {/* Switch Server */}
        {embedUrls && (
          <TouchableOpacity
            style={[styles.serverButton, { marginTop: 12 }]}
            onPress={() => {
              const servers = ['server1', 'server2', 'server3'];
              const currentIndex = servers.indexOf(activeServer);
              const nextIndex = (currentIndex + 1) % servers.length;
              setActiveServer(servers[nextIndex]);
              setWebKey((prev) => prev + 1); // reload when switching
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
        )}

        {/* Open in Safari for better system playback controls */}
        {isIos && (
          <TouchableOpacity
            style={[styles.serverButton, { marginTop: 12, backgroundColor: '#64748b' }]}
            onPress={() => Linking.openURL(finalUrl)}
          >
            <Ionicons name="globe-outline" size={16} color="white" />
            <Text style={styles.serverText}>Open in Safari</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 60,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
    marginBottom: 12,
  },
  backText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 6,
  },
  videoCard: {
    width: '92%',
    height: (width * 9) / 16,
    alignSelf: 'center',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'black',
    marginBottom: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  webview: {
    flex: 1,
  },
  infoSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  serverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 8,
  },
  serverText: {
    color: 'white',
    fontSize: 13,
    marginLeft: 8,
  },
});
