// components/HeroBanner.js
import React from 'react';
import { View, Text, ImageBackground, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function HeroBanner({ title, backdrop, genres = [], rating, year }) {
  return (
    <ImageBackground
      source={{ uri: backdrop }}
      style={styles.banner}
      imageStyle={styles.image}
    >
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.gradient}
      />
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>
          {genres.join(' • ')} {year ? `• ${year}` : ''} {rating ? `• ⭐ ${rating}` : ''}
        </Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: 220,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  meta: {
    color: '#d1d5db',
    marginTop: 4,
    fontSize: 14,
  },
});
