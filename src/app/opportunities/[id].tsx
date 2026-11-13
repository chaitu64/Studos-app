import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Share,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { safeBack } from '@/navigation/safeBack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useApp } from '../../context/AppContext';
import { dataService } from '../../services/dataService';
import { Opportunity } from '../../types';
import { formatDaysRemaining } from '../../services/unstopService';
import { OpportunityDescription } from '../../components/opportunities/OpportunityDescription';
import { getOpportunityReward } from '../../services/opportunityUtils';

export default function OpportunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { opportunities, toggleSaveOpportunity } = useApp();

  const [opp, setOpp] = useState<Opportunity | null>(() => {
    return opportunities.find((o) => o.id === id) || null;
  });
  const [isLoading, setIsLoading] = useState(!opp);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [hasReminderSet, setHasReminderSet] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [bannerError, setBannerError] = useState(false);

  useEffect(() => {
    let ignore = false;
    if (id) {
      dataService.getOpportunityById(id).then((found) => {
        if (!ignore && found) {
          setOpp(found);
          setIsLoading(false);
        } else if (!ignore) {
          setIsLoading(false);
        }
      }).catch(() => {
        if (!ignore) setIsLoading(false);
      });
    }
    return () => {
      ignore = true;
    };
  }, [id]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.navBar}><TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => safeBack()} style={styles.navBackBtn}><Ionicons name="arrow-back" size={22} color={Colors.textPrimary} /></TouchableOpacity><Text style={styles.navTitle} numberOfLines={1}>Opportunity Details</Text><View style={styles.navShareBtn} /></View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading opportunity details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!opp) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.navBar}><TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => safeBack()} style={styles.navBackBtn}><Ionicons name="arrow-back" size={22} color={Colors.textPrimary} /></TouchableOpacity><Text style={styles.navTitle} numberOfLines={1}>Opportunity Details</Text><View style={styles.navShareBtn} /></View>
        <View style={styles.notFoundContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.notFoundTitle}>Opportunity Not Found</Text>
          <Text style={styles.notFoundSubtitle}>
            This opportunity listing could not be found or may have expired.
          </Text>
          <Button
            title="Back to Opportunities"
            variant="primary"
            onPress={() => safeBack()}
          />
        </View>
      </SafeAreaView>
    );
  }

  const toggleCheck = (idx: number) => {
    setCheckedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleApply = async () => {
    if (!opp.officialUrl) {
      Alert.alert(
        'Registration Unavailable',
        'No official registration URL was provided for this opportunity.'
      );
      return;
    }

    try {
      const supported = await Linking.canOpenURL(opp.officialUrl);
      if (supported) {
        await Linking.openURL(opp.officialUrl);
      } else {
        Alert.alert('External Portal', `Please open: ${opp.officialUrl}`);
      }
    } catch {
      Alert.alert('Application Link', `Unable to open browser. URL: ${opp.officialUrl}`);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: opp.title,
        message: `${opp.title} by ${opp.organizer}\nDeadline: ${opp.deadline}\nApply here: ${opp.officialUrl}`,
      });
    } catch {
      // User cancelled
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

  const handleToggleApplied = () => {
    const nextState = !isApplied;
    setIsApplied(nextState);
    Alert.alert(
      nextState ? 'Marked as Applied' : 'Application Status Cleared',
      nextState
        ? 'Your status has been updated to Applied (self-reported). Good luck!'
        : 'Status cleared from your builder dashboard.'
    );
  };

  const getOrganizerInitials = (name: string): string => {
    if (!name) return 'UN';
    const words = name.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const isUrgent = opp.daysRemaining !== undefined && opp.daysRemaining >= 0 && opp.daysRemaining <= 7;
  const reward = getOpportunityReward(opp);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => safeBack()}
          style={styles.navBackBtn}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          Opportunity Details
        </Text>
        <TouchableOpacity
          onPress={handleShare}
          style={styles.navShareBtn}
          accessibilityLabel="Share opportunity"
        >
          <Ionicons name="share-social-outline" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Optional Banner Image */}
        {opp.bannerImage && !bannerError ? (
          <View style={styles.bannerWrapper}>
            <Image
              source={{ uri: opp.bannerImage }}
              style={styles.bannerImage}
              resizeMode="cover"
              onError={() => setBannerError(true)}
            />
          </View>
        ) : null}

        {/* Top Badges */}
        <View style={styles.topBadgesRow}>
          <Badge label={opp.type} variant="primary" size="md" />
          {opp.category && opp.category !== (opp.type as any) ? (
            <Badge label={opp.category} variant="purple" size="md" />
          ) : null}
          <Badge label={`${opp.format} • ${opp.location}`} variant="cyan" size="md" />
          {opp.status && opp.status !== 'Expired' && opp.status !== 'Closed' ? <Badge label={opp.status} variant="primary" size="md" /> : null}
        </View>

        {/* Title */}
        <Text style={styles.title}>{opp.title}</Text>

        {/* Organizer Row with Logo & Verified Badge */}
        <View style={styles.organizerRow}>
          {opp.organizerLogo && !logoError ? (
            <Image
              source={{ uri: opp.organizerLogo }}
              style={styles.organizerLogo}
              resizeMode="contain"
              onError={() => setLogoError(true)}
            />
          ) : (
            <View style={styles.organizerInitials}>
              <Text style={styles.organizerInitialsText}>
                {getOrganizerInitials(opp.organizer)}
              </Text>
            </View>
          )}

          <View style={styles.organizerInfo}>
            <View style={styles.organizerNameRow}>
              <Text style={styles.organizerName}>{opp.organizer}</Text>
            </View>
            {opp.source ? <Text style={styles.sourceText}>Source: {opp.source}</Text> : null}
          </View>
        </View>

        {/* Key Metrics Card */}
        <Card variant="elevated" style={styles.metricsCard}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>DEADLINE</Text>
            <Text style={[styles.metricValue, { color: isUrgent ? Colors.primary : Colors.textPrimary }]}>
              {opp.deadline !== 'Not specified' ? opp.deadline : 'Not specified'}
            </Text>
            {opp.daysRemaining !== undefined ? <Text style={styles.metricSub}>{formatDaysRemaining(opp.daysRemaining).label}</Text> : null}
          </View>

          <View style={styles.metricDivider} />

          {reward ? <><View style={styles.metricDivider} /><View style={styles.metricItem}>
            <Text style={styles.metricLabel}>{reward.label.toUpperCase()}</Text>
            <Text style={[styles.metricValue, { color: Colors.accentAmber }]} numberOfLines={2}>{reward.text}</Text>
          </View></> : null}

          {opp.teamSize || opp.registrationFee ? <><View style={styles.metricDivider} /><View style={styles.metricItem}>
            <Text style={styles.metricLabel}>TEAM & FEE</Text>
            <Text style={[styles.metricValue, { color: Colors.accentCyan }]}>
              {opp.teamSize && opp.teamSize !== 'Not specified' ? opp.teamSize : 'Open'}
            </Text>
            <Text style={styles.metricSub}>
              {opp.registrationFee ? `Fee: ${opp.registrationFee}` : 'Free'}
            </Text>
          </View></> : null}
        </Card>

        <Button
          title="Apply / View on Official Source"
          variant="primary"
          size="lg"
          icon={<Ionicons name="open-outline" size={18} color="#FFF" />}
          iconPosition="right"
          onPress={handleApply}
          style={styles.registerButton}
        />

        {/* Action Row: Save, Self-Report Applied, Reminder */}
        <View style={styles.actionRow}>
          <Button
            title={opp.isSaved ? 'Saved to Bookmarks' : 'Save Opportunity'}
            variant={opp.isSaved ? 'secondary' : 'outline'}
            size="sm"
            icon={
              <Ionicons
                name={opp.isSaved ? 'bookmark' : 'bookmark-outline'}
                size={16}
                color={opp.isSaved ? Colors.primary : Colors.textPrimary}
              />
            }
            onPress={() => toggleSaveOpportunity(opp.id)}
            style={{ flex: 1, marginRight: 8 }}
          />

          <TouchableOpacity
            style={[styles.iconBtn, isApplied ? styles.iconBtnApplied : undefined]}
            onPress={handleToggleApplied}
            accessibilityLabel="Toggle application status"
          >
            <Ionicons
              name={isApplied ? 'checkmark-circle' : 'checkmark-circle-outline'}
              size={18}
              color={isApplied ? Colors.accentGreen : Colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconBtn, hasReminderSet ? styles.iconBtnActive : undefined]}
            onPress={handleToggleReminder}
            accessibilityLabel="Set deadline reminder"
          >
            <Ionicons
              name={hasReminderSet ? 'notifications' : 'notifications-outline'}
              size={18}
              color={hasReminderSet ? Colors.primary : Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {isApplied ? (
          <View style={styles.appliedBanner}>
            <Ionicons name="checkmark-done" size={16} color={Colors.accentGreen} />
            <Text style={styles.appliedBannerText}>
              Marked as Applied (Self-reported status)
            </Text>
          </View>
        ) : null}

        {/* Section: Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT</Text>
          {opp.description ? <OpportunityDescription description={opp.description} title={opp.title} /> : <Text style={styles.bodyText}>No description was provided by the source.</Text>}
        </View>

        {reward ? <View style={styles.section}>
          <Text style={styles.sectionTitle}>BENEFITS / {reward.label.toUpperCase()}</Text>
          <View style={styles.rewardPanel}><Ionicons name="trophy-outline" size={18} color={Colors.primary} /><View style={{ flex: 1 }}><Text style={styles.rewardValue}>{reward.text}</Text><Text style={styles.metricSub}>{reward.label} offered by the organizer</Text></View></View>
        </View> : null}

        {opp.deadline && opp.deadline !== 'Not specified' ? <View style={styles.section}>
          <Text style={styles.sectionTitle}>IMPORTANT DATES</Text>
          <View style={styles.eligibilityBox}><Ionicons name="calendar-outline" size={18} color={isUrgent ? Colors.primary : Colors.accentCyan} style={{ marginRight: 9 }} /><Text style={styles.eligibilityText}>Apply by {opp.deadline}</Text></View>
        </View> : null}

        {(opp.format || opp.location) ? <View style={styles.section}>
          <Text style={styles.sectionTitle}>FORMAT / LOCATION</Text>
          <View style={styles.eligibilityBox}><Ionicons name="location-outline" size={18} color={Colors.accentCyan} style={{ marginRight: 9 }} /><Text style={styles.eligibilityText}>{[opp.format, opp.location !== opp.format ? opp.location : null].filter(Boolean).join(' · ')}</Text></View>
        </View> : null}

        {/* Section: Eligibility */}
        {opp.eligibility && opp.eligibility !== 'Everyone can apply' ? <View style={styles.section}>
          <Text style={styles.sectionTitle}>ELIGIBILITY REQUIREMENTS</Text>
          <View style={styles.eligibilityBox}>
            <Ionicons
              name="school-outline"
              size={18}
              color={Colors.accentCyan}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.eligibilityText}>{opp.eligibility}</Text>
          </View>
        </View> : null}

        {/* Section: Skills & Tags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RELEVANT SKILLS & TRACKS</Text>
          <View style={styles.chipsWrap}>
            {Array.from(new Set(opp.requiredSkills)).map((s, index) => (
              <Badge key={`${s}-${index}`} label={s} variant="outline" size="md" />
            ))}
          </View>
        </View>

        {/* Section: Application Checklist */}
        {opp.checklist && opp.checklist.length > 0 ? <View style={styles.section}>
          <Text style={styles.sectionTitle}>STUDENT PREPARATION CHECKLIST</Text>
          <Text style={styles.checklistHint}>
            Check items off as you prepare your application:
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
        </View> : null}

        <Text style={styles.sourceAttributionText}>Application opens the opportunity source in your browser.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: Typography.body,
    color: Colors.textMuted,
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  notFoundTitle: {
    fontSize: Typography.title2,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  notFoundSubtitle: {
    fontSize: Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 12,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  navBackBtn: {
    padding: 6,
  },
  navTitle: {
    flex: 1,
    fontSize: Typography.headline,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  navShareBtn: {
    padding: 6,
  },
  scrollContainer: {
    padding: Spacing.screenPadding,
    paddingBottom: 40,
  },
  bannerWrapper: {
    width: '100%',
    height: 180,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: Colors.surfaceElevated,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  topBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: Typography.title1,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    lineHeight: 34,
    marginBottom: 12,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  organizerLogo: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 12,
  },
  organizerInitials: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  organizerInitialsText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textSecondary,
  },
  organizerInfo: {
    flex: 1,
  },
  organizerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  organizerName: {
    fontSize: Typography.headline,
    fontWeight: Typography.semiBold,
    color: Colors.textPrimary,
  },
  sourceText: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
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
    marginBottom: 4,
  },
  metricValue: {
    fontSize: Typography.subhead,
    fontWeight: Typography.bold,
    textAlign: 'center',
    marginBottom: 2,
  },
  metricSub: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  rewardPanel: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14, borderRadius: BorderRadius.md, backgroundColor: Colors.primarySubtle, borderWidth: 1, borderColor: Colors.primaryBorder },
  rewardValue: { color: '#F0B0A8', fontSize: Typography.headline, fontWeight: Typography.bold, marginBottom: 3 },
  metricDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  iconBtnActive: {
    backgroundColor: Colors.primarySubtle,
    borderColor: Colors.primaryBorder,
  },
  iconBtnApplied: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  appliedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
    marginBottom: 16,
  },
  appliedBannerText: {
    fontSize: Typography.footnote,
    color: Colors.accentGreen,
    fontWeight: Typography.semiBold,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  bodyText: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  eligibilityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    padding: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  eligibilityText: {
    fontSize: Typography.body,
    color: Colors.textPrimary,
    flex: 1,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  checklistHint: {
    fontSize: Typography.footnote,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  checklist: {
    gap: 10,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    padding: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkLabel: {
    fontSize: Typography.body,
    color: Colors.textPrimary,
    flex: 1,
  },
  checkLabelChecked: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  teamMatchBanner: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: Colors.surfaceElevated,
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
    fontSize: Typography.footnote,
    color: Colors.textMuted,
    marginTop: 2,
  },
  registerButton: {
    marginTop: 10,
    marginBottom: 12,
  },
  sourceAttributionText: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 24,
  },
});
