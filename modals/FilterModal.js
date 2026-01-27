// FilterModal.js
import React from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SORT_OPTIONS = [
  { label: 'Top Rated', value: 'vote_average.desc' },
  { label: 'Fan Favorites', value: 'popularity.desc' },
  { label: 'Latest Releases', value: 'release_date.desc' },
];

const VOTE_COUNT_OPTIONS = [
  { label: '50+', value: 50 },
  { label: '100+', value: 100 },
  { label: '300+', value: 300 },
];

const RATING_OPTIONS = [
  { label: '5.0+', value: 5.0 },
  { label: '6.5+', value: 6.5 },
  { label: '7.5+', value: 7.5 },
  { label: '8.0+', value: 8.0 },
];

const YEAR_OPTIONS = [
  { label: '2024', value: '2024-01-01' },
  { label: '2023', value: '2023-01-01' },
  { label: '2020+', value: '2020-01-01' },
  { label: '2015+', value: '2015-01-01' },
];

const RUNTIME_OPTIONS = [
  { label: '≥ 60 min', value: 60 },
  { label: '≥ 90 min', value: 90 },
  { label: '≥ 120 min', value: 120 },
];

const FilterModal = ({ visible, onClose, filters, setFilters, applyFilters }) => {
 const updateFilter = (key, value) => {
  if (key === 'sort_by' && value === 'vote_average.desc' && !filters.vote_count_gte) {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      vote_count_gte: 300,
    }));
  } else {
    setFilters(prev => ({ ...prev, [key]: value }));
  }
};

  const resetFilters = () => {
    setFilters({
      sort_by: 'vote_average.desc',
      vote_average_gte: 0,
      vote_count_gte: 100,
      with_original_language: '',
      primary_release_date_gte: '',
      with_runtime_gte: 0,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Filters</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <ScrollView>
            {/* Sort By */}
            <Text style={styles.label}>Sort By</Text>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.option, filters.sort_by === opt.value && styles.optionActive]}
                onPress={() => updateFilter('sort_by', opt.value)}>
                <Text style={[styles.optionText, filters.sort_by === opt.value && styles.optionTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}

            {/* Minimum Rating */}
            <Text style={styles.label}>Minimum Rating</Text>
            {RATING_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.option, filters.vote_average_gte === opt.value && styles.optionActive]}
                onPress={() => updateFilter('vote_average_gte', opt.value)}>
                <Text style={[styles.optionText, filters.vote_average_gte === opt.value && styles.optionTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}

            {/* Minimum Vote Count */}
            <Text style={styles.label}>Minimum Vote Count</Text>
            {VOTE_COUNT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.option, filters.vote_count_gte === opt.value && styles.optionActive]}
                onPress={() => updateFilter('vote_count_gte', opt.value)}>
                <Text style={[styles.optionText, filters.vote_count_gte === opt.value && styles.optionTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}

            {/* Language Toggle */}
            <Text style={styles.label}>English Only</Text>
            <TouchableOpacity
              style={[styles.option, filters.with_original_language === 'en' && styles.optionActive]}
              onPress={() => updateFilter('with_original_language', filters.with_original_language === 'en' ? '' : 'en')}>
              <Text style={[styles.optionText, filters.with_original_language === 'en' && styles.optionTextActive]}>
                {filters.with_original_language === 'en' ? 'Yes' : 'No'}
              </Text>
            </TouchableOpacity>

            {/* Release Year */}
            <Text style={styles.label}>Release Year</Text>
            {YEAR_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.option, filters.primary_release_date_gte === opt.value && styles.optionActive]}
                onPress={() => updateFilter('primary_release_date_gte', opt.value)}>
                <Text style={[styles.optionText, filters.primary_release_date_gte === opt.value && styles.optionTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}

            {/* Runtime */}
            <Text style={styles.label}>Runtime</Text>
            {RUNTIME_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.option, filters.with_runtime_gte === opt.value && styles.optionActive]}
                onPress={() => updateFilter('with_runtime_gte', opt.value)}>
                <Text style={[styles.optionText, filters.with_runtime_gte === opt.value && styles.optionTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
            <Text style={styles.applyText}>Apply Filters</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.applyBtn, { backgroundColor: '#334155', marginTop: 10 }]} onPress={resetFilters}>
            <Text style={styles.applyText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#1e293b', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { color: 'white', fontSize: 18, fontWeight: '700' },
  label: { color: '#cbd5e1', fontSize: 14, marginVertical: 10, fontWeight: '600' },
  option: { backgroundColor: '#334155', padding: 12, borderRadius: 8, marginBottom: 8 },
  optionActive: { backgroundColor: '#facc15' },
  optionText: { color: '#cbd5e1', fontSize: 14 },
  optionTextActive: { color: '#1e293b', fontWeight: '700' },
  applyBtn: { marginTop: 10, backgroundColor: '#ef4444', padding: 14, borderRadius: 12, alignItems: 'center' },
  applyText: { color: 'white', fontWeight: '700', fontSize: 16 },
});

export default FilterModal;
