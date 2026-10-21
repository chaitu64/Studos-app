import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '../context/AppContext';
import { Colors } from '../constants/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: Colors.background,
            },
            headerTintColor: Colors.textPrimary,
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 18,
            },
            headerShadowVisible: false,
            contentStyle: {
              backgroundColor: Colors.background,
            },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="ideahub/index" options={{ title: 'IdeaHub' }} />
          <Stack.Screen name="ideahub/[id]" options={{ title: 'Idea Details' }} />
          <Stack.Screen
            name="ideahub/submit"
            options={{ title: 'Submit an Idea', presentation: 'modal' }}
          />
          <Stack.Screen name="teams/index" options={{ title: 'Team Finder' }} />
          <Stack.Screen name="teams/[id]" options={{ title: 'Team Details' }} />
          <Stack.Screen
            name="teams/create"
            options={{ title: 'Recruit Teammates', presentation: 'modal' }}
          />
          <Stack.Screen name="opportunities/index" options={{ title: 'Opportunities' }} />
          <Stack.Screen name="opportunities/[id]" options={{ title: 'Opportunity' }} />
          <Stack.Screen name="projects/index" options={{ title: 'Project Showcase' }} />
          <Stack.Screen name="projects/[id]" options={{ title: 'Project Details' }} />
          <Stack.Screen
            name="projects/create"
            options={{ title: 'Publish Project', presentation: 'modal' }}
          />
          <Stack.Screen name="leaderboard/index" options={{ title: 'Impact Leaderboard' }} />
          <Stack.Screen name="notifications/index" options={{ title: 'Notifications' }} />
          <Stack.Screen name="chat-rooms/index" options={{ title: 'Topic Chat Rooms' }} />
          <Stack.Screen name="chat/[id]" options={{ title: 'Conversation' }} />
          <Stack.Screen name="search/index" options={{ headerShown: false }} />
          <Stack.Screen name="settings/index" options={{ title: 'Settings & Privacy' }} />
        </Stack>
      </AppProvider>
    </SafeAreaProvider>
  );
}
