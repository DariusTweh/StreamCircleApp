import React from 'react';
import { Dimensions } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import HomeScreen from './screens/HomeScreen';
import PlayerScreen from './screens/PlayerScreen';
import VideoPlayer from './screens/VideoPlayer';
import TVDetailScreen from './screens/TVDetailScreen';
import EpisodePlayerScreen from './screens/EpisodePlayerScreen';
import SearchResultScreen from './screens/SearchResultScreen';
import GenreScreen from './screens/GenreScreen';
import RandomScreen from './screens/RandomScreen';
import { colors, typography } from './theme';
const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();
const screenWidth = Dimensions.get('window').width;

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Search" component={HomeScreen} />
      <Stack.Screen name="PlayerScreen" component={PlayerScreen} />
      <Stack.Screen name="VideoPlayer" component={VideoPlayer} />
      <Stack.Screen name="TVDetailScreen" component={TVDetailScreen} />
      <Stack.Screen name="EpisodePlayerScreen" component={EpisodePlayerScreen} />
      <Stack.Screen name="SearchResultScreen" component={SearchResultScreen} />
    </Stack.Navigator>
  );
}

export default function MainDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
  drawerStyle: {
    backgroundColor: colors.background,
    width: screenWidth * 0.7,
  },
  drawerActiveTintColor: colors.accent,
  drawerInactiveTintColor: colors.textSecondary,
  drawerLabelStyle: {
    fontSize: 16,
    fontFamily: typography.body.fontFamily,  // optional if you use custom fonts
    marginLeft: -10,
    color: colors.textPrimary,
  },
  headerShown: false,
}}
    >
      <Drawer.Screen
        name="Home"
        component={AppStack}
        options={{
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Drawer.Screen
        name="Random"
        component={RandomScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="dice-multiple" color={color} size={size} />
          ),
        }}
      />

      {/* All genres below */}
      {[
        { id: 28, name: 'Action', icon: 'explosion' },
        { id: 12, name: 'Adventure', icon: 'map-marker-distance' },
        { id: 16, name: 'Animation', icon: 'animation' },
        { id: 35, name: 'Comedy', icon: 'emoticon-happy-outline' },
        { id: 80, name: 'Crime', icon: 'police-badge-outline' },
        { id: 99, name: 'Documentary', icon: 'filmstrip-box' },
        { id: 18, name: 'Drama', icon: 'drama-masks' },
        { id: 10751, name: 'Family', icon: 'human-male-female-child' },
        { id: 14, name: 'Fantasy', icon: 'magic-staff' },
        { id: 36, name: 'History', icon: 'book-open-page-variant-outline' },
        { id: 27, name: 'Horror', icon: 'ghost' },
        { id: 10402, name: 'Music', icon: 'music-note' },
        { id: 9648, name: 'Mystery', icon: 'magnify' },
        { id: 10749, name: 'Romance', icon: 'heart-outline' },
        { id: 878, name: 'Science Fiction', icon: 'ufo-outline' },
        { id: 10770, name: 'TV Movie', icon: 'television-classic' },
        { id: 53, name: 'Thriller', icon: 'target' },
        { id: 10752, name: 'War', icon: 'tank' },
        { id: 37, name: 'Western', icon: 'cowboy' },
      ].map((genre) => (
        <Drawer.Screen
          key={genre.id}
          name={genre.name}
          component={GenreScreen}
          initialParams={{ genreId: genre.id, genreTitle: genre.name }}
          options={{
            drawerIcon: ({ color, size }) => (
              <MaterialCommunityIcons name={genre.icon} color={color} size={size} />
            ),
          }}
        />
      ))}
    </Drawer.Navigator>
    
  );
}
