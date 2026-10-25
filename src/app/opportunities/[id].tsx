import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Share,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useApp } from '../../context/AppContext';

export default function OpportunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { opportunities, toggleSaveOpportunity } = useApp();

  const opp = opportunities.find((o) => o.id === id);

  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [hasReminderSet, setHasReminderSet] = useState(false);

  if (!opp) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>Opportunity not found</Text>
        <Button title="Back to Opportunities" variant="primary" onPress={() => router.back()} />
      </View>
    );
  }

  const toggleCheck = (idx: number) => {
    setCheckedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleApply = async () => {
    try {
      const supported = await Linking.canOpenURL(opp.officialUrl);
      if (supported) {
        await Linking.openURL(opp.officialUrl);
      } else {
        Alert.alert('Official Portal', `Opening application link: ${opp.officialUrl}`);
      }
    } catch {
      Alert.alert('External Portal', `Please visit: ${opp.officialUrl}`);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${opp.title} (${opp.prizeOrCompensation}) on StuDos: ${opp.officialUrl}`,
      });
    } catch {
      // ignore
    }
  };

  const handleToggleReminder = () => {
    setHasReminderSet(!hasReminderSet);
    Alert.alert(
      hasReminderSet ? 'Reminder Removed' : 'Deadline Reminder Set!',
      hasReminderSet
        ? 'You will no longer receive notifications for this deadline.'
        : `StuDos will notify you 48 hours and 24 hours before ${opp.deadline}.`
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Top Badges */}
        <View style={styles.topBadges}>
          <Badge label={opp.type} variant="primary" size="md" />
          {opp.category && opp.category !== (opp.type as any) ? (
            <Badge label={opp.category} variant="purple" size="md" style={{ marginLeft: 6 }} />
          ) : null}
          <Badge label={`${opp.format} • ${opp.location}`} variant="cyan" size="md" style={{ marginLeft: 6 }} />
        </View>

        {/* Title */}
        <Text style={styles.title}>{opp.title}</Text>

        {/* Organizer Row */}
        <View style={styles.organizerRow}>
          <Ionicons name="business" size={16} color={Colors.primary} />
          <Text style={styles.organizerText}>{opp.organizer}</Text>
          {opp.isVerified ? (
            <Badge label="Verified Official" variant="green" size="sm" style={{ marginLeft: 8 }} />
          ) : null}
          {opp.source ? (
            <Text style={styles.sourceText}>via {opp.source}</Text>
          ) : null}
        </View>

        {/* Key Metrics Card */}
        <Card variant="elevated" style={styles.metricsCard}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>DEADLINE</Text>
            <Text style={[styles.metricValue, { color: Colors.primary }]}>{opp.deadline}</Text>
            <Text style={styles.metricSub}>
              {opp.daysRemaining !== undefined && opp.daysRemaining <= 0
                ? 'Closing Today'
                : `${opp.daysRemaining} days remaining`}
              {opp.timezone ? ` • ${opp.timezone}` : ''}
            </Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>PRIZE / STIPEND</Text>
            <Text style={[styles.metricValue, { color: Colors.accentAmber }]}>
              {opp.prizeOrCompensation.split(' ')[0]}
            </Text>
            <Text style={styles.metricSub} numberOfLines={1}>
              {opp.prizeOrCompensation}
            </Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>TEAM & FEE</Text>
            <Text style={[styles.metricValue, { color: Colors.accentCyan }]}>
              {opp.teamSize || 'Individual'}
            </Text>
            <Text style={styles.metricSub}>
              {opp.registrationFee ? `Fee: ${opp.registrationFee}` : 'Free Registration'}
            </Text>
          </View>
        </Card>

        {/* Action Row: Save, Share, Reminder */}
        <View style={styles.actionRow}>
          <Button
            title={opp.isSaved ? 'Saved to Bookmarks' : 'Save Opportunity'}
            variant={opp.isSaved ? 'secondary' : 'outline'}
            size="sm"
            icon={<Ionicons name={opp.isSaved ? 'bookmark' : 'bookmark-outline'} size={16} color={opp.isSaved ? Colors.primary : Colors.textPrimary} />}
            onPress={() => toggleSaveOpportunity(opp.id)}
            style={{ flex: 1, marginRight: 8 }}
          />

          <TouchableOpacity
            style={[styles.iconBtn, hasReminderSet ? styles.iconBtnActive : undefined]}
            onPress={handleToggleReminder}
          >
            <Ionicons
              name={hasReminderSet ? 'notifications' : 'notifications-outline'}
              size={18}
              color={hasReminderSet ? Colors.primary : Colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Section: Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT THIS OPPORTUNITY</Text>
          <Text style={styles.bodyText}>{opp.description}</Text>
        </View>

        {/* Section: Eligibility */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ELIGIBILITY REQUIREMENTS</Text>
          <View style={styles.eligibilityBox}>
            <Ionicons name="school-outline" size={18} color={Colors.accentCyan} style={{ marginRight: 8 }} />
            <Text style={styles.eligibilityText}>{opp.eligibility}</Text>
          </View>
        </View>

        {/* Section: Skills Needed */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RELEVANT SKILLS & TRACKS</Text>
          <View style={styles.chipsWrap}>
            {opp.requiredSkills.map((s) => (
              <Badge key={s} label={s} variant="outline" size="md" />
            ))}
          </View>
        </View>

        {/* Section: Application Checklist */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>STUDENT PREPARATION CHECKLIST</Text>
          <Text style={styles.checklistHint}>
            Check items off as you complete requirements for your application:
          </Text>

          <View style={styles.checklist}>
            {(opp.checklist || []).map((item, idx) => {
              const isChecked = !!checkedItems[idx];
              return (
                <TouchableOpacity
                  key={idx}
                  style={styles.checkRow}
                  activeOpacity={0.7}
                  onPress={() => toggleCheck(idx)}
                >
                  <View style={[styles.checkbox, isChecked ? styles.checkboxChecked : undefined]}>
                    {isChecked ? <Ionicons name="checkmark" size={14} color="#FFF" /> : null}
                  </View>
                  <Text style={[styles.checkLabel, isChecked ? styles.checkLabelChecked : undefined]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Teammate Match CTA */}
        <Card variant="outline" style={styles.teamMatchBanner}>
          <View style={styles.teamMatchInfo}>
            <Ionicons name="people" size={20} color={Colors.primary} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.teamMatchTitle}>Need a team for this hackathon?</Text>
              <Text style={styles.teamMatchSub}>
                Browse students looking for teammates for {opp.title.split('—')[0]}.
              </Text>
            </View>
          </View>
          <Button
            title="Find Teammates"
            variant="secondary"
            size="sm"
            onPress={() => router.push('/teams' as any)}
            style={{ marginTop: 10 }}
          />
        </Card>

        {/* Official Application CTA Button */}
        <Button
          title="Open Official Application Portal"
          variant="primary"
          size="lg"
          icon={<Ionicons name="open-outline" size={18} color="#FFF" />}
          iconPosition="right"
          onPress={handleApply}
          style={{ marginTop: 16, marginBottom: 40 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    padding: Spacing.screenPadding,
    paddingBottom: 40,
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: 20,
  },
  notFoundText: {
    fontSize: Typography.headline,
    color: Colors.textMuted,
    marginBottom: 16,
  },
  topBadges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: Typography.title1,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    lineHeight: 34,
    marginBottom: 8,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  organizerText: {
    fontSize: Typography.headline,
    color: Colors.textSecondary,
    fontWeight: Typography.semiBold,
    marginLeft: 6,
  },
  sourceText: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  metricsCard: {
    flexDirection: 'row',
    padding: 16,
    marginBottom: 16,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  metricValue: {
    fontSize: Typography.title3,
    fontWeight: Typography.bold,
    marginTop: 4,
  },
  metricSub: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: '100%',
    backgroundColor: Colors.border,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  iconBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySubtle,
  },
  section: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  bodyText: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  eligibilityBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceElevated,
    padding: 12,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  eligibilityText: {
    flex: 1,
    fontSize: Typography.body,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  checklistHint: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginBottom: 10,
  },
  checklist: {
    gap: 10,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkLabel: {
    flex: 1,
    fontSize: Typography.body,
    color: Colors.textPrimary,
  },
  checkLabelChecked: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  teamMatchBanner: {
    padding: 14,
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.borderLight,
    marginBottom: 16,
  },
  teamMatchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamMatchTitle: {
    fontSize: Typography.subhead,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  teamMatchSub: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
