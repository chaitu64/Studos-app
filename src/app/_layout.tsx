import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppProvider } from '../context/AppContext';
import { AuthProvider } from '../context/AuthContext';
import { Colors } from '../constants/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider><AppProvider>
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
          <Stack.Screen name="academic-library/index" options={{ headerShown: false }} />
          <Stack.Screen name="academic-library/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="academic-library/viewer/[id]" options={{ headerShown: false }} />
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
          <Stack.Screen name="chat/room/[id]" options={{ title: 'Chat Room' }} />
          <Stack.Screen name="search/index" options={{ headerShown: false }} />
          <Stack.Screen name="settings/index" options={{ title: 'Settings & Privacy' }} />
          <Stack.Screen name="saved" options={{ title: 'Saved Content' }} />
          <Stack.Screen name="post/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="signup" options={{ headerShown: false }} />
          <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
          <Stack.Screen name="reset-password" options={{ headerShown: false }} />
          <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
          <Stack.Screen name="share-resource" options={{ title: 'Share Study PDF', presentation: 'modal' }} />
        </Stack>
        </AppProvider></AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
