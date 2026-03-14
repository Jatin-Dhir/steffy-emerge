import React from 'react';
import { Stack } from 'expo-router';
import { WardrobeProvider } from '../contexts/WardrobeContext';

export default function RootLayout() {
  return (
    <WardrobeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </WardrobeProvider>
  );
}