import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Onboarding from '../components/Onboarding';

const ONBOARDING_KEY = '@steffy_has_seen_onboarding';

export default function Index() {
  const [hasSeen, setHasSeen] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((v) => setHasSeen(v === '1'))
      .catch(() => setHasSeen(true));
  }, []);

  const handleComplete = () => {
    AsyncStorage.setItem(ONBOARDING_KEY, '1').catch(() => {});
    setHasSeen(true);
  };

  if (hasSeen === null) {
    return <View style={{ flex: 1 }} />;
  }
  if (hasSeen) {
    return <Redirect href="/(tabs)/dashboard" />;
  }
  return <Onboarding onComplete={handleComplete} />;
}
