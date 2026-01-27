import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography } from '../theme';
const { width } = Dimensions.get('window');


export default function PlayerScreen({ route, navigation }) {
  const { data } = route.params;
  const {
    title,
    description,
    poster,
    backdrop,
    embedUrl,
    embedUrls,
    trailerUrl,
    release_date,
    runtime,
    genres,
    similar = [],
  } = data;

const openDetails = async (id) => {
  try {
    const res = await fetch(`https://streamcircleserver.onrender.com/details?id=${id}&type=movie`);
    const newData = await res.json();
    navigation.push('PlayerScreen', { data: newData });
  } catch (error) {
    console.error('Failed to fetch movie details:', error);
    alert('Could not load movie details.');
  }
};

  const renderSimilar = ({ item }) => (
    <TouchableOpacity onPress={() => openDetails(item.tmdb_id)} style={styles.similarCard}>
      <Image source={{ uri: item.poster }} style={styles.similarPoster} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ImageBackground source={{ uri: poster }} style={styles.background} blurRadius={20}>
        <LinearGradient colors={['rgba(0,0,0,0.4)', '#0f172a']} style={styles.gradient} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Movie Detail</Text>
          <TouchableOpacity>
            <Ionicons name="share-social-outline" size={22} color="white" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Poster */}
          <View style={styles.posterWrapper}>
            <Image source={{ uri: poster }} style={styles.poster} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Metadata */}
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{release_date?.split('-')[0] || 'N/A'}</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.metaText}>{runtime ? `${runtime} minutes` : 'N/A'}</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.metaText}>{genres?.[0] || 'N/A'}</Text>
          </View>

          {/* Watch Trailer Button */}
          {(trailerUrl || embedUrl) && (
  <View style={styles.buttonRow}>
    {trailerUrl && (
      <TouchableOpacity
        style={styles.trailerButton}
        onPress={() => navigation.navigate('VideoPlayer', { embedUrl: trailerUrl })}
      >
        <Ionicons name="play-circle-outline" size={18} color="white" />
        <Text style={styles.trailerText}>Watch Trailer</Text>
      </TouchableOpacity>
    )}

{(embedUrls || embedUrl) && (
  <TouchableOpacity
    style={styles.watchButton}
    onPress={() =>
      navigation.navigate('VideoPlayer', {
        embedUrls,
        embedUrl,
        title,
      })
    }
  >
        <Ionicons name="videocam-outline" size={18} color="white" />
        <Text style={styles.watchText}>Watch Now</Text>
      </TouchableOpacity>
    )}
  </View>
)}
          {/* Description */}
          <Text style={styles.description}>{description}</Text>

          {/* You May Also Like */}
          {similar.length > 0 && (
            <View style={styles.similarSection}>
              <Text style={styles.similarTitle}>You May Also Like</Text>
              <FlatList
                horizontal
                data={similar}
                keyExtractor={(item) => `${item.tmdb_id}`}
                renderItem={renderSimilar}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
              />
            </View>
          )}
        </ScrollView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  background: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },

  header: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },

  scrollContent: {
    paddingTop: 130,
    paddingBottom: 100,
  },

  posterWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  poster: {
    width: width * 0.65,
    height: width * 0.95,
    borderRadius: 20,
    resizeMode: 'cover',
  },

  title: {
    ...typography.heading,
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 6,
  },

  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    gap: 4,
  },
  metaText: {
    ...typography.muted,
    fontSize: 14,
  },
  dot: {
    color: colors.textSecondary,
    marginHorizontal: 6,
  },

  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },

  trailerButton: {
    backgroundColor: colors.buttonPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
  },

  trailerText: {
    ...typography.button,
    color: colors.buttonPrimaryText,
    marginLeft: 8,
  },

  watchButton: {
    backgroundColor: colors.buttonSecondary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
  },

  watchText: {
    ...typography.button,
    color: colors.buttonSecondaryText,
    marginLeft: 8,
  },

  description: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },

  similarSection: {
    marginBottom: 40,
  },
  similarTitle: {
    ...typography.heading,
    fontSize: 16,
    marginLeft: 20,
    marginBottom: 12,
  },
  similarCard: {
    marginRight: 12,
  },
  similarPoster: {
    width: width / 3,
    height: width / 1.8,
    borderRadius: 12,
    backgroundColor: colors.card,
  },
});
