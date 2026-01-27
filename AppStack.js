import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainDrawer from './MainDrawer';
import PlayerScreen from './screens/PlayerScreen';
import VideoPlayer from './screens/VideoPlayer';
import TVDetailScreen from './screens/TVDetailScreen';
import EpisodePlayerScreen from './screens/EpisodePlayerScreen';
import SearchResultScreen from './screens/SearchResultScreen';
import ViewAllScreen from './screens/ViewAllScreen';
import RandomScreen from './screens/RandomScreen';  // import the screen
const Stack = createNativeStackNavigator();

export default function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainDrawer" component={MainDrawer} />
      <Stack.Screen name="PlayerScreen" component={PlayerScreen} />
      <Stack.Screen name="TVDetailScreen" component={TVDetailScreen} />
      <Stack.Screen name="VideoPlayer" component={VideoPlayer} />
      <Stack.Screen name="EpisodePlayerScreen" component={EpisodePlayerScreen} />
      <Stack.Screen name="SearchResultScreen" component={SearchResultScreen} />
      <Stack.Screen name="ViewAllScreen" component={ViewAllScreen} />
      <Stack.Screen name="RandomScreen" component={RandomScreen} />
    </Stack.Navigator>
  );
}
