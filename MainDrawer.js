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
import FavoritesScreen from './screens/FavoritesScreen';
import { colors, typography } from './theme';
const genres = require('./data/genres');

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
      <Drawer.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="heart-multiple" color={color} size={size} />
          ),
        }}
      />

      {/* All genres below */}
      {genres.map((genre) => (
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
