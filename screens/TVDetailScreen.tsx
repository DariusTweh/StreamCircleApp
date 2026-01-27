import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, StyleSheet, ScrollView,
  TouchableOpacity, Dimensions, FlatList, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { colors, typography } from '../theme';

const { width } = Dimensions.get('window');

export default function TVDetailScreen({ route, navigation }) {
  const { data } = route.params;
  const {
    title, description, poster, embedUrl,
    tmdb_id, seasons
  } = data;

  const [selectedSeason, setSelectedSeason] = useState(seasons?.[0]?.season_number || 1);
  const [episodes, setEpisodes] = useState([]);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [expandedEpisodeId, setExpandedEpisodeId] = useState(null);
  
  const fetchEpisodes = async (seasonNumber) => {
    setLoadingEpisodes(true);
    try {
      const res = await fetch(`https://streamcircleserver.onrender.com/episodes?tv_id=${tmdb_id}&season=${seasonNumber}`);
      const data = await res.json();
      setEpisodes(data);
      setSelectedEpisode(data[0]); // default to first episode
    } catch (err) {
      console.error('Failed to fetch episodes:', err);
    }
    setLoadingEpisodes(false);
  };

  useEffect(() => {
    if (tmdb_id && selectedSeason) {
      fetchEpisodes(selectedSeason);
    }
  }, [selectedSeason]);

const renderEpisode = ({ item }) => {
  const isExpanded = expandedEpisodeId === item.episode_number;

  return (
    <View style={[
        styles.episodeCard,
        isExpanded && styles.episodeCardActive,
        { marginBottom: 16, marginHorizontal: 16 }, // ← spacing added here
      ]}>
      {item.still && <Image source={{ uri: item.still }} style={styles.episodeThumb} />}

      <View style={{ flex: 1, paddingLeft: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.episodeTitle}>{item.name}</Text>
            <Text style={styles.episodeMeta}>{item.air_date}</Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              navigation.navigate('EpisodePlayerScreen', {
                tmdb_id,
                season: selectedSeason,
                episode: item.episode_number,
                episodes, // pass entire episodes list
                });
            }}
            style={styles.watchButton}
          >
            <Ionicons name="play" size={20} color="white" />
            <Text style={styles.watchText}>Watch</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() =>
            setExpandedEpisodeId(isExpanded ? null : item.episode_number)
          }
        >
          {isExpanded && (
            <Text style={styles.episodeDesc}>
              {item.overview || 'No description available.'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};
  return (
    <View style={styles.container}>
      <Image source={{ uri: poster }} style={styles.bgImage} blurRadius={20} />
      <LinearGradient colors={['rgba(0,0,0,0.3)', '#0f172a']} style={styles.overlay} />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>TV Details</Text>
        <View style={{ width: 24 }} />
      </View>

    <FlatList
  data={episodes}
  keyExtractor={(item) => `ep-${item.episode_number}`}
  renderItem={renderEpisode}
  contentContainerStyle={{ paddingBottom: 120 }}
  ListHeaderComponent={
    <>
      <View style={styles.posterWrapper}>
        <Image source={{ uri: poster }} style={styles.poster} />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.seasonRow}
      >
        {seasons.map((season) => (
          <TouchableOpacity
            key={season.season_number}
            style={[
              styles.seasonButton,
              season.season_number === selectedSeason && styles.seasonButtonActive,
            ]}
            onPress={() => setSelectedSeason(season.season_number)}
          >
            <Text
              style={[
                styles.seasonText,
                season.season_number === selectedSeason && styles.seasonTextActive,
              ]}
            >
              {season.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loadingEpisodes && (
        <ActivityIndicator color="white" size="large" style={{ marginTop: 20 }} />
      )}
    </>
  }
/>

      
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.7)',
  },
  topBar: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topTitle: {
    ...typography.body,
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  posterWrapper: {
    alignItems: 'center',
    marginTop: 120,
  },
  poster: {
    width: width * 0.6,
    height: width * 0.9,
    borderRadius: 20,
    resizeMode: 'cover',
    marginBottom: 10,
  },
  title: {
    ...typography.heading,
    fontSize: 22,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  seasonRow: {
    paddingHorizontal: 16,
    marginVertical: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  seasonButton: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 10,
    marginBottom: 8,
  },
  seasonButtonActive: {
    backgroundColor: colors.buttonSecondary,
  },
  seasonText: {
    ...typography.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  seasonTextActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  episodeCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  episodeCardActive: {
    backgroundColor: colors.surface,
  },
  episodeThumb: {
    width: 120,
    height: 75,
    borderRadius: 10,
  },
  episodeTitle: {
    ...typography.heading,
    fontSize: 16,
    color: colors.textPrimary,
  },
  episodeMeta: {
    ...typography.muted,
    fontSize: 12,
    marginTop: 2,
  },
  episodeDesc: {
    ...typography.body,
    fontSize: 13,
    color: '#e2e8f0',
    marginTop: 8,
  },
  playerWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'black',
    height: 200,
  },
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.buttonPrimary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  watchText: {
    ...typography.button,
    fontSize: 14,
    marginLeft: 4,
  },
});
