import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Tabs, type BottomTabBarProps } from 'expo-router/tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Shadows } from '../../constants/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  // Custom TabBar that renders exactly 4 tab destinations in order:
  // 1. Home, 2. Explore, 3. Swipe, 4. Profile
  const renderCustomTabBar = ({ state, emitter, navigateToTab }: BottomTabBarProps) => {
    const focusedRouteName = state.routes[state.index].name;

    const renderTabItem = (routeName: string, title: string, iconOutline: any, iconFilled: any, badgeCount?: number) => {
      const route = state.routes.find((tabRoute) => tabRoute.name === routeName);
      if (!route) return null;

      const isFocused = focusedRouteName === routeName;
      const onPress = () => {
        const event = emitter.emit({
          type: 'tabPress',
          target: route.key,
          canPreventDefault: true,
        });

        if (!isFocused && !event.defaultPrevented) {
          navigateToTab(route.key);
        }
      };

      const color = isFocused ? Colors.primary : Colors.textMuted;

      return (
        <TouchableOpacity
          key={routeName}
          accessibilityRole="button"
          accessibilityState={isFocused ? { selected: true } : {}}
          accessibilityLabel={title}
          testID={`tab-${routeName}`}
          onPress={onPress}
          style={styles.tabButton}
          activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <Ionicons name={isFocused ? iconFilled : iconOutline} size={22} color={color} />
            {badgeCount && badgeCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badgeCount}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.tabLabel, { color }]}>{title}</Text>
        </TouchableOpacity>
      );
    };

    return (
      <View
        style={[
          styles.tabBarContainer,
          {
            height: 64 + insets.bottom,
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ]}
      >
        {/* Destination 1: Home */}
        {renderTabItem('index', 'Home', 'home-outline', 'home')}

        {/* Destination 2: Explore */}
        {renderTabItem('explore', 'Explore', 'compass-outline', 'compass')}

        {/* Destination 3: Swipe */}
        {renderTabItem('swipe', 'Swipe', 'flame-outline', 'flame')}

        {/* Destination 4: Profile */}
        {renderTabItem('profile', 'Profile', 'person-outline', 'person')}
      </View>
    );
  };

  return (
    <>
      <Tabs
        tabBar={renderCustomTabBar}
        screenOptions={{
          headerShown: false,
        }}
      >
        {/* Destination 1: Home */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
          }}
        />

        {/* Destination 2: Explore */}
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Explore',
          }}
        />

        {/* Destination 3: Swipe */}
        <Tabs.Screen
          name="swipe"
          options={{
            title: 'Swipe',
          }}
        />

        {/* Destination 4: Profile */}
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
          }}
        />

        {/* Chat screen preserved for in-app navigation without being a bottom tab */}
        <Tabs.Screen
          name="chat"
          options={{
            href: null,
          }}
        />

        {/* Hidden legacy routes so existing deep links remain functional */}
        <Tabs.Screen
          name="discover"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="create"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    paddingTop: 5,
    ...Shadows.subtle,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 3,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 24,
  },
  tabLabel: {
    fontSize: Typography.caption,
    fontWeight: Typography.medium,
    marginTop: 3,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
});
