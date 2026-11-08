import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/ui/Button';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/theme';

const features = [
  { icon: 'people-outline' as const, title: 'Meet your people', detail: 'Find students with shared interests and skills.' },
  { icon: 'bulb-outline' as const, title: 'Share what you’re building', detail: 'Share student ideas and campus moments.' },
  { icon: 'book-outline' as const, title: 'Study together', detail: 'Discover academic resources shared by students.' },
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
          <View style={styles.heroOrb}><Ionicons name="sparkles-outline" size={30} color={Colors.primary} /></View>
          <Text style={styles.eyebrow}>YOUR CAMPUS, CONNECTED</Text>
          <Text style={styles.title}>Make good things{ '\n' }happen together.</Text>
          <Text style={styles.intro}>A student community to find collaborators, share your work, and make studying feel less solo.</Text>
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
          <Button title="Create your account" onPress={() => router.push('/signup')} />
          <Button title="I already have an account" variant="secondary" onPress={() => router.push('/login')} />
          <Text style={styles.note}>Use your student profile to get started. You can update it any time.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { flexGrow: 1, padding: Spacing.xxl, paddingTop: Spacing.xl, paddingBottom: Spacing.xxxl, justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primarySubtle },
  brandMarkText: { color: Colors.primary, fontSize: 22, fontWeight: Typography.bold },
  wordmark: { color: Colors.textPrimary, fontSize: Typography.footnote, letterSpacing: 2, fontWeight: Typography.bold },
  hero: { alignItems: 'flex-start', paddingTop: 38, paddingBottom: 28 },
  heroOrb: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primarySubtle, marginBottom: 22 },
  eyebrow: { color: Colors.primary, fontSize: Typography.caption, letterSpacing: 1.3, fontWeight: Typography.bold, marginBottom: 10 },
  title: { color: Colors.textPrimary, fontSize: Typography.display, lineHeight: 41, fontWeight: Typography.bold, letterSpacing: -0.6 },
  intro: { maxWidth: 370, color: Colors.textSecondary, fontSize: Typography.body, lineHeight: 24, marginTop: 13 },
  features: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.xl, paddingHorizontal: 14 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 76, paddingVertical: 12 },
  featureIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: Colors.primarySubtle, alignItems: 'center', justifyContent: 'center' },
  featureCopy: { flex: 1, gap: 3 },
  featureTitle: { color: Colors.textPrimary, fontSize: Typography.subhead, fontWeight: Typography.semiBold },
  featureDetail: { color: Colors.textMuted, fontSize: Typography.caption, lineHeight: 17 },
  actions: { gap: 10, paddingTop: 24 },
  note: { color: Colors.textSubtle, fontSize: Typography.caption, lineHeight: 17, textAlign: 'center', marginTop: 2 },
});
