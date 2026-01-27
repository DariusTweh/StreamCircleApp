// App.js
import React, { useEffect, useCallback, useState } from 'react';
import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import AppStack from './AppStack';
import * as SplashScreen from 'expo-splash-screen';

// 👇 Keep the splash visible until we're ready
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // 🔄 Simulate loading (e.g., fonts, user data, etc.)
        await new Promise(resolve => setTimeout(resolve, 1200));
      } finally {
        setAppReady(true);
      }
    }
    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appReady) {
      await SplashScreen.hideAsync(); // ✅ Hide when ready
    }
  }, [appReady]);

  if (!appReady) return null;

  return (
    <NavigationContainer onReady={onLayoutRootView}>
      <AppStack />
    </NavigationContainer>
  );
}
