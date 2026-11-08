import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';

type ServiceItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  badge?: string;
};

const SERVICES: ServiceItem[] = [
  {
    id: 'students',
    title: 'Find Students',
    subtitle: 'Connect with peers',
    icon: 'people-outline',
    route: '/students',
  },
  {
    id: 'teams',
    title: 'Team Up',
    subtitle: 'Hackathons & clubs',
    icon: 'git-network-outline',
    route: '/teams',
  },
  {
    id: 'opportunities',
    title: 'Opportunities',
    subtitle: 'Internships & contests',
    icon: 'trophy-outline',
    route: '/opportunities',
  },
];

export const HomeServicesGrid: React.FC = React.memo(function HomeServicesGrid() {
  const handlePress = (route: string) => {
    router.push(route as never);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>SERVICES</Text>
      </View>
      <View style={styles.grid}>
        {SERVICES.map((item) => (
          <TouchableOpacity
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}, ${item.subtitle}`}
            activeOpacity={0.75}
            onPress={() => handlePress(item.route)}
            style={styles.card}
          >
            <View style={styles.iconCircle}>
              <Ionicons name={item.icon} size={20} color={Colors.primary} />
            </View>
            <View style={styles.textBlock}>
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.subtitle} numberOfLines={1}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={Colors.textSubtle} style={styles.arrow} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerRow: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: Typography.bold,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 64,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 13,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 15,
    marginTop: 1,
  },
  arrow: {
    opacity: 0.6,
  },
});

