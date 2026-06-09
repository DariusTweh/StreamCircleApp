import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../theme';
import { getMediaTitle, getMediaYear } from '../utils/media';

function CollectionCard({ item, mediaType, onPressItem, showMediaBadge }) {
  const resolvedType = item.type || mediaType || 'movie';
  const title = getMediaTitle(item);
  const year = getMediaYear(item);

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPressItem(item)} activeOpacity={0.86}>
      {item.poster ? (
        <Image source={{ uri: item.poster }} style={styles.poster} />
      ) : (
        <View style={[styles.poster, styles.posterFallback]}>
          <Ionicons
            name={resolvedType === 'tv' ? 'tv-outline' : 'film-outline'}
            size={24}
            color={colors.textMuted}
          />
          <Text style={styles.posterFallbackText}>{resolvedType === 'tv' ? 'Series' : 'Movie'}</Text>
        </View>
      )}

      {showMediaBadge ? (
        <View style={[styles.badge, resolvedType === 'tv' && styles.badgeTv]}>
          <Text style={[styles.badgeText, resolvedType === 'tv' && styles.badgeTextTv]}>
            {resolvedType === 'tv' ? 'SERIES' : 'MOVIE'}
          </Text>
        </View>
      ) : null}

      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      {year ? (
        <Text style={styles.year}>{year}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

export default function CollectionRail({
  title,
  items = [],
  mediaType = 'movie',
  onPressItem,
  subtitle,
  loading = false,
  emptyText = 'Nothing here yet.',
  showMediaBadge = false,
}) {
  if (!loading && (!items || items.length === 0)) {
    return emptyText ? (
      <View style={styles.section}>
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    ) : null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={items}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => `${item.type || mediaType}-${item.tmdb_id}-${index}`}
          renderItem={({ item }) => (
            <CollectionCard
              item={item}
              mediaType={mediaType}
              onPressItem={onPressItem}
              showMediaBadge={showMediaBadge}
            />
          )}
          contentContainerStyle={styles.railContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 28,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    ...typography.heading,
    fontSize: 18,
    marginBottom: 4,
  },
  sectionSubtitle: {
    ...typography.muted,
    lineHeight: 18,
  },
  railContent: {
    paddingHorizontal: 16,
  },
  card: {
    width: 128,
    marginRight: 14,
  },
  poster: {
    width: 128,
    height: 188,
    borderRadius: 14,
    backgroundColor: colors.card,
    marginBottom: 10,
  },
  posterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  posterFallbackText: {
    ...typography.muted,
    marginTop: 8,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(250,204,21,0.9)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeTv: {
    backgroundColor: 'rgba(37,99,235,0.92)',
  },
  badgeText: {
    ...typography.body,
    color: colors.accentText,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  badgeTextTv: {
    color: '#f8fafc',
  },
  title: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 18,
    minHeight: 36,
  },
  year: {
    ...typography.muted,
    marginTop: 4,
    fontSize: 12,
  },
  loadingState: {
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...typography.muted,
    paddingHorizontal: 16,
  },
});
