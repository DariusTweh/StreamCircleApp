import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../theme';
export default function SearchResultScreen({ route, navigation }) {
  const { query: initialQuery, type } = route.params;
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);

  const genreMap = {
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
    80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
    14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
    9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
    53: 'Thriller', 10752: 'War', 37: 'Western'
  };

  useEffect(() => {
    fetchSearch(initialQuery);
  }, []);

  const fetchSearch = async (q) => {
    try {
      const res = await fetch(`https://streamcircleserver.onrender.com/search?q=${encodeURIComponent(q)}&type=${type}`);
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error('Search failed', err);
    }
  };

  const openDetails = async (id) => {
    const res = await fetch(`https://streamcircleserver.onrender.com/details?id=${id}&type=${type}`);
    const data = await res.json();
    navigation.navigate(type === 'movie' ? 'PlayerScreen' : 'TVDetailScreen', { data });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => openDetails(item.tmdb_id)}>
      <Image source={{ uri: item.poster }} style={styles.poster} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.genre}>
          {(item.genre_ids || []).map(id => genreMap[id]).filter(Boolean).join(', ') || 'N/A'}
        </Text>
       <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
        <Ionicons name="star" size={12} color={colors.accent} />
        <Text style={styles.meta}> {item.vote_average?.toFixed(1) || 'N/A'}   </Text>

        <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
        <Text style={styles.meta}> {item.release_date?.split('-')[0] || 'N/A'}   </Text>

        <Ionicons name={item.adult ? 'warning-outline' : 'checkmark-circle-outline'} size={12} color={item.adult ? colors.danger : colors.accent} />
        <Text style={styles.meta}> {item.adult ? '18+' : '13+'}</Text>
      </View>
        <Text style={styles.description} numberOfLines={2}>
          {item.overview || 'No description available.'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Results</Text>
        <TouchableOpacity>
          <Ionicons name="options-outline" size={22} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#94A3B8" />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => fetchSearch(query)}
          placeholder="Search"
          placeholderTextColor="#94A3B8"
          editable={true}
        />
        <Ionicons name="mic-outline" size={18} color="#94A3B8" />
      </View>

      <FlatList
        data={results}
        keyExtractor={(item, idx) => `${item.tmdb_id}-${idx}`}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 30 }}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerTitle: {
    ...typography.heading,
    fontSize: 18,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    marginHorizontal: 8,
    ...typography.body,
  },
  card: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  poster: {
    width: 70,
    height: 100,
    borderRadius: 8,
    backgroundColor: colors.card,
  },
  title: {
    ...typography.heading,
    fontSize: 16,
    marginBottom: 4,
  },
  genre: {
    ...typography.body,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  meta: {
    ...typography.muted,
    fontSize: 12,
    marginBottom: 4,
  },
  description: {
    ...typography.body,
    fontSize: 13,
    lineHeight: 18,
  },
});
