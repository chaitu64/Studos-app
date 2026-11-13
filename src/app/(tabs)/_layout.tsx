import React from 'react';
import { Tabs } from 'expo-router/tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { Avatar } from '../../components/ui/Avatar';
import { View } from 'react-native';

export default function TabLayout() {
  const { user } = useApp();
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
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <MaterialCommunityIcons name="home-variant-outline" size={21} color={focused ? Colors.primary : Colors.textMuted} />,
        }}
      />
      <Tabs.Screen
        name="study"
        options={{
          title: 'Study',
          tabBarLabel: 'Study',
          tabBarIcon: ({ focused }) => <MaterialCommunityIcons name="book-open-variant" size={21} color={focused ? Colors.primary : Colors.textMuted} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarLabel: 'Explore',
          tabBarIcon: ({ focused }) => <MaterialCommunityIcons name="compass-outline" size={21} color={focused ? Colors.primary : Colors.textMuted} />,
        }}
      />
      <Tabs.Screen
        name="swipe"
        options={{
          title: 'Connect',
          tabBarLabel: 'Connect',
          tabBarIcon: ({ focused }) => <MaterialCommunityIcons name="account-group-outline" size={21} color={focused ? Colors.primary : Colors.textMuted} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => <View style={{ width: 27, height: 27, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: focused ? 1.5 : 0, borderColor: focused ? Colors.primary : 'transparent' }}>
            {user.avatar ? <Avatar key={user.avatar} uri={user.avatar} name={user.name} size={22} /> : <MaterialCommunityIcons name="account-outline" size={21} color={focused ? Colors.primary : Colors.textMuted} />}
          </View>,
        }}
      />
      <Tabs.Screen name="chat" options={{ href: null }} />
    </Tabs>
  );
}
