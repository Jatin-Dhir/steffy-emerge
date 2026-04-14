import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { WardrobeProvider } from '../contexts/WardrobeContext';
import { ToastProvider } from '../contexts/ToastContext';
import SwirlBackground from '../components/SwirlBackground';
import Colors from '../constants/Colors';

SplashScreen.preventAutoHideAsync?.();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    GreatVibes_400Regular: require('../assets/fonts/GreatVibes_400Regular.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync?.();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <WardrobeProvider>
      <ToastProvider>
        <View style={styles.root}>
          <SwirlBackground />
          <View style={styles.stackWrap}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: 'transparent' },
                animation: 'fade',
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="(tabs)" />
            </Stack>
          </View>
        </View>
      </ToastProvider>
    </WardrobeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  stackWrap: {
    flex: 1,
    zIndex: 1,
  },
});