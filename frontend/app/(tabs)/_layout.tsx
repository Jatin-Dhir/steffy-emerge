import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View } from 'react-native';
import Colors from '../../constants/Colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarItemStyle: { paddingVertical: 2 },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? { transform: [{ scale: 1.1 }] } : undefined}>
              <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="wardrobe"
        options={{
          title: 'Wardrobe',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? { transform: [{ scale: 1.1 }] } : undefined}>
              <Ionicons name={focused ? 'shirt' : 'shirt-outline'} size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="looks"
        options={{
          title: 'Looks',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? { transform: [{ scale: 1.1 }] } : undefined}>
              <Ionicons name={focused ? 'color-palette' : 'color-palette-outline'} size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="stylist"
        options={{
          title: 'Stylist',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? { transform: [{ scale: 1.1 }] } : undefined}>
              <Ionicons name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? { transform: [{ scale: 1.1 }] } : undefined}>
              <Ionicons name={focused ? 'settings' : 'settings-outline'} size={24} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
