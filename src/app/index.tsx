import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/ui/Button';
import { Colors, Spacing, Typography } from '../constants/theme';

const features = [
  { icon: 'people-outline' as const, title: 'Meet your people', detail: 'Find teammates and collaborators across campuses.' },
  { icon: 'bulb-outline' as const, title: 'Build together', detail: 'Share ideas, projects, and problems worth solving.' },
  { icon: 'compass-outline' as const, title: "Discover what's next", detail: 'Find learning resources and relevant opportunities.' },
];

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}><Text style={styles.brandMarkText}>S</Text></View>
          <Text style={styles.wordmark}>STUDOS</Text>
        </View>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>YOUR CAMPUS. YOUR COMMUNITY.</Text>
          <Text style={styles.title}>Find your people.{ '\n' }Build your future.</Text>
          <Text style={styles.intro}>Turn ideas into projects, meet students who share your interests, and discover what comes next.</Text>
        </View>

        <View style={styles.features}>
          {features.map((feature) => (
            <View key={feature.title} style={styles.feature}>
              <View style={styles.featureIcon}><Ionicons name={feature.icon} size={20} color={Colors.primary} /></View>
              <View style={styles.featureCopy}><Text style={styles.featureTitle}>{feature.title}</Text><Text style={styles.featureDetail}>{feature.detail}</Text></View>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Button title="Get started" size="lg" onPress={() => router.push('/signup')} />
          <Button title="Log in" size="lg" variant="secondary" onPress={() => router.push('/login')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { flexGrow: 1, paddingHorizontal: Spacing.xxl, paddingTop: Spacing.lg, paddingBottom: Spacing.xl, justifyContent: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primarySubtle },
  brandMarkText: { color: Colors.primary, fontSize: 21, fontWeight: Typography.bold },
  wordmark: { color: Colors.textPrimary, fontSize: Typography.footnote, letterSpacing: 2, fontWeight: Typography.bold },
  hero: { alignItems: 'flex-start', paddingTop: 30, paddingBottom: 24 },
  eyebrow: { color: Colors.primary, fontSize: Typography.caption, letterSpacing: 1.2, fontWeight: Typography.bold, marginBottom: 10 },
  title: { color: Colors.textPrimary, fontSize: Typography.display, lineHeight: 40, fontWeight: Typography.bold, letterSpacing: -0.6 },
  intro: { maxWidth: 390, color: Colors.textSecondary, fontSize: Typography.body, lineHeight: 23, marginTop: 12 },
  features: { gap: 14 },
  feature: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 2 },
  featureIcon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  featureCopy: { flex: 1, gap: 3 },
  featureTitle: { color: Colors.textPrimary, fontSize: Typography.subhead, fontWeight: Typography.semiBold },
  featureDetail: { color: Colors.textMuted, fontSize: Typography.caption, lineHeight: 18 },
  actions: { gap: 10, paddingTop: 24 },
});
