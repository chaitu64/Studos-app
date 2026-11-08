import React from 'react';
import { Tabs } from 'expo-router/tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography } from '../../constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          paddingTop: 5,
          paddingBottom: 5,
        },
        tabBarLabelStyle: {
          fontSize: Typography.caption,
          fontWeight: Typography.semiBold,
          marginBottom: 3,
        },
        tabBarItemStyle: { paddingVertical: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'HOME',
          tabBarIcon: ({ focused }) => <MaterialCommunityIcons name="home-variant-outline" size={21} color={focused ? Colors.primary : Colors.textMuted} />,
        }}
      />
      <Tabs.Screen
        name="study"
        options={{
          title: 'Study',
          tabBarLabel: 'STUDY',
          tabBarIcon: ({ focused }) => <MaterialCommunityIcons name="book-open-variant" size={21} color={focused ? Colors.primary : Colors.textMuted} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarLabel: 'EXPLORE',
          tabBarIcon: ({ focused }) => <MaterialCommunityIcons name="compass-outline" size={21} color={focused ? Colors.primary : Colors.textMuted} />,
        }}
      />
      <Tabs.Screen
        name="swipe"
        options={{
          title: 'Connect',
          tabBarLabel: 'CONNECT',
          tabBarIcon: ({ focused }) => <MaterialCommunityIcons name="handshake-outline" size={21} color={focused ? Colors.primary : Colors.textMuted} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'PROFILE',
          tabBarIcon: ({ focused }) => <MaterialCommunityIcons name="account-outline" size={21} color={focused ? Colors.primary : Colors.textMuted} />,
        }}
      />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="discover" options={{ href: null }} />
      <Tabs.Screen name="create" options={{ href: null }} />
    </Tabs>
  );
}
