import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Opportunity } from '../../types';
import { BorderRadius, Colors, Typography } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { formatDaysRemaining } from '../../services/unstopService';
import { getOpportunityReward } from '../../services/opportunityUtils';

export interface OpportunityCardProps { opportunity: Opportunity }

export const OpportunityCard: React.FC<OpportunityCardProps> = ({ opportunity }) => {
  const { user, toggleSaveOpportunity } = useApp();
  const [logoError, setLogoError] = useState(false);
  const summary = useMemo(() => {
    const clean = (opportunity.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return clean || undefined;
  }, [opportunity.description]);
  const countdown = formatDaysRemaining(opportunity.daysRemaining);
  const reward = getOpportunityReward(opportunity);
  const categoryName = `${opportunity.category || opportunity.type}`.toLowerCase();
  const accent = categoryName.includes('hackathon') ? { color: Colors.accentPurple, tint: Colors.accentPurpleSubtle, border: 'rgba(166,150,232,0.30)' }
    : /internship|job|fellowship|research/.test(categoryName) ? { color: Colors.accentGreen, tint: Colors.accentGreenSubtle, border: 'rgba(114,198,155,0.30)' }
      : /scholarship/.test(categoryName) ? { color: Colors.accentAmber, tint: Colors.accentAmberSubtle, border: 'rgba(225,182,110,0.30)' }
        : /workshop|conference/.test(categoryName) ? { color: Colors.accentCyan, tint: Colors.accentCyanSubtle, border: 'rgba(97,185,193,0.30)' }
          : { color: Colors.accentPurple, tint: Colors.accentPurpleSubtle, border: 'rgba(166,150,232,0.30)' };

  const handleBookmark = async () => {
    if (!user.id) {
      Alert.alert('Sign in required', 'Sign in to save opportunities.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign in', onPress: () => router.push('/login' as never) },
      ]);
      return;
    }
    try {
      await toggleSaveOpportunity(opportunity.id);
    } catch {
      Alert.alert('Unable to save opportunity', 'Please try again in a moment.');
    }
  };

  return (
    <View style={styles.card}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => router.push(`/opportunities/${opportunity.id}` as any)}
        accessibilityRole="button"
        accessibilityLabel={`View ${opportunity.title} opportunity details`}
      />
      <View pointerEvents="none">
        <View style={styles.topRow}>
          <View style={[styles.logo, { borderColor: accent.border, backgroundColor: accent.tint }]}>
            {opportunity.organizerLogo && !logoError ? (
              <Image source={{ uri: opportunity.organizerLogo }} style={styles.logoImage} resizeMode="contain" onError={() => setLogoError(true)} />
            ) : <Ionicons name="briefcase-outline" size={21} color={accent.color} />}
          </View>
          <View style={styles.heading}>
            <Text style={styles.title} numberOfLines={2}>{opportunity.title}</Text>
            <Text style={styles.organizer} numberOfLines={1}>{opportunity.organizer}</Text>
          </View>
          <View style={styles.bookmarkSpacer} />
        </View>

        {summary ? <Text style={styles.summary} numberOfLines={2}>{summary}</Text> : null}

        <View style={styles.metaRow}>
          <View style={[styles.pill, { backgroundColor: accent.tint, borderColor: accent.border }]}><Text style={[styles.category, { color: accent.color }]} numberOfLines={1}>{opportunity.category || opportunity.type}</Text></View>
          {opportunity.format ? <View style={styles.mode}><Ionicons name="globe-outline" size={12} color={Colors.textMuted} /><Text style={styles.fact}>{opportunity.format}</Text></View> : null}
          {opportunity.eligibility && opportunity.eligibility !== 'Everyone can apply' ? <Text style={styles.audience} numberOfLines={1}>{opportunity.eligibility}</Text> : null}
        </View>
        <View style={styles.bottomRow}>
          {reward ? <View style={styles.reward}><Ionicons name="trophy-outline" size={13} color={Colors.primary} /><Text style={styles.rewardText} numberOfLines={1}>{reward.label} · {reward.text}</Text></View> : <View />}
          {opportunity.deadline && opportunity.deadline !== 'Not specified' ? <View style={styles.deadlineWrap}><Ionicons name="time-outline" size={13} color={countdown.isUrgent ? Colors.primary : Colors.textMuted} /><Text style={[styles.deadline, countdown.isUrgent && styles.urgent]} numberOfLines={1}>{countdown.isUrgent ? countdown.label : `Due ${opportunity.deadline}`}</Text></View> : null}
        </View>
      </View>
      <TouchableOpacity
        style={styles.bookmarkButton}
        onPress={() => { void handleBookmark(); }}
        accessibilityRole="button"
        accessibilityLabel={opportunity.isSaved ? 'Remove bookmark' : 'Bookmark opportunity'}
        hitSlop={8}
      >
        <Ionicons name={opportunity.isSaved ? 'bookmark' : 'bookmark-outline'} size={20} color={opportunity.isSaved ? Colors.primary : Colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { position: 'relative', backgroundColor: '#171C26', borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: '#2A313E', padding: 15, marginBottom: 12, overflow: 'hidden' },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 46, height: 46, borderRadius: 12, backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginRight: 12, overflow: 'hidden' },
  logoImage: { width: 34, height: 34 },
  heading: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: Typography.bold, color: Colors.textPrimary, lineHeight: 21, paddingRight: 28 },
  organizer: { fontSize: 12, color: '#AEB7C5', marginTop: 4 },
  bookmarkSpacer: { width: 40, height: 40, marginLeft: 4 },
  bookmarkButton: { position: 'absolute', top: 14, right: 14, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  summary: { fontSize: 13, color: '#B8C0CC', lineHeight: 19, marginTop: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 13 },
  pill: { backgroundColor: Colors.primarySubtle, borderColor: Colors.primaryBorder, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7, maxWidth: '48%' },
  category: { color: Colors.primary, fontSize: 11, fontWeight: Typography.semiBold },
  mode: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fact: { color: Colors.textMuted, fontSize: 11 },
  audience: { color: Colors.textMuted, fontSize: 11, maxWidth: '55%' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#252C37' },
  reward: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, backgroundColor: Colors.primarySubtle, borderRadius: 7, maxWidth: '60%' },
  rewardText: { color: '#E89A91', fontSize: 11, fontWeight: Typography.bold, flexShrink: 1 },
  deadlineWrap: { flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 'auto' },
  deadline: { color: Colors.textSecondary, fontSize: 11 },
  urgent: { color: '#E89A91', fontWeight: Typography.bold },
});
