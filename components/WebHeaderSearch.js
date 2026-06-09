import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { navigateToDrawerScreen, navigateToSearchResults } from '../utils/webNavigation';

export default function WebHeaderSearch({
  navigation,
  initialQuery = '',
  placeholder = 'Search titles',
  inputWidth = 260,
  showRandomizer = true,
}) {
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const handleSubmit = () => {
    navigateToSearchResults(navigation, query);
  };

  const trimmedQuery = query.trim();

  return (
    <View style={styles.row}>
      <View style={[styles.searchBox, { width: inputWidth }]}>
        <TouchableOpacity style={styles.searchIconButton} onPress={handleSubmit} disabled={!trimmedQuery}>
          <Ionicons name="search-outline" size={17} color="#cbd5e1" />
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSubmit}
          placeholder={placeholder}
          placeholderTextColor="#8d98ab"
          returnKeyType="search"
        />
      </View>

      {showRandomizer ? (
        <TouchableOpacity style={styles.actionButton} onPress={() => navigateToDrawerScreen(navigation, 'Random')}>
          <Ionicons name="dice-outline" size={15} color="#f8fafc" />
          <Text style={styles.actionButtonText}>Randomizer</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  searchBox: {
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: 'rgba(8,13,22,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 14,
  },
  searchIconButton: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 14,
    paddingVertical: 10,
  },
  actionButton: {
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: '#101725',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  actionButtonText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
});
