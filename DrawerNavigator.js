import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import HomeScreen from './screens/HomeScreen'; // your main screen
import GenreScreen from './screens/GenreScreen'; // each genre will be routed here

const Drawer = createDrawerNavigator();

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator
      screenOptions={{
        drawerStyle: {
          backgroundColor: '#0f172a',
        },
        headerShown: false,
        drawerActiveTintColor: '#facc15',
        drawerInactiveTintColor: '#cbd5e1',
        drawerLabelStyle: {
          fontSize: 16,
        },
      }}
    >
      <Drawer.Screen name="Home" component={HomeScreen} />
      <Drawer.Screen name="Action" component={GenreScreen} initialParams={{ genreId: 28 }} />
      <Drawer.Screen name="Comedy" component={GenreScreen} initialParams={{ genreId: 35 }} />
      <Drawer.Screen name="Sci-Fi" component={GenreScreen} initialParams={{ genreId: 878 }} />
      <Drawer.Screen name="Horror" component={GenreScreen} initialParams={{ genreId: 27 }} />
      {/* Add more genres here */}
    </Drawer.Navigator>
  );
}
