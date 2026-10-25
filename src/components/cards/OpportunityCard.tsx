import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Share,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Opportunity } from '../../types';
import { Colors, Typography, BorderRadius } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { formatDaysRemaining } from '../../services/unstopService';

export interface OpportunityCardProps {
  opportunity: Opportunity;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({ opportunity }) => {
  const { toggleSaveOpportunity } = useApp();
  const [logoError, setLogoError] = useState(false);

  const handlePress = () => {
    router.push(`/opportunities/${opportunity.id}` as any);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: opportunity.title,
        message: `${opportunity.title} by ${opportunity.organizer}\nDeadline: ${opportunity.deadline}\nApply here: ${opportunity.officialUrl}`,
      });
    } catch {
      // User cancelled share
    }
  };

  const countdownInfo = formatDaysRemaining(opportunity.daysRemaining);

  // Category Icon fallback
  const getCategoryIcon = (type: Opportunity['type']): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'Hackathon':
        return 'trophy-outline';
      case 'Internship':
        return 'briefcase-outline';
      case 'Job':
        return 'business-outline';
      case 'Competition':
        return 'ribbon-outline';
      case 'Quiz':
        return 'help-circle-outline';
      case 'Scholarship':
        return 'school-outline';
      case 'Workshop':
        return 'construct-outline';
      case 'Conference':
        return 'people-outline';
      default:
        return 'sparkles-outline';
    }
  };

  // Concise, source-grounded summary
  const summaryText = useMemo(() => {
    const raw = opportunity.description;
    if (raw && raw.trim()) {
      const clean = raw
        .replace(/<[^>]*>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();

      const firstSentence = clean.split(/[.!?]\s+/)[0];
      if (firstSentence && firstSentence.length >= 25 && firstSentence.length <= 130) {
        return firstSentence.endsWith('.') ? firstSentence : `${firstSentence}.`;
      }
      if (clean.length > 20) {
        return clean.length > 120 ? `${clean.slice(0, 117)}...` : clean;
      }
    }

    // Grounded fallback by category
    switch (opportunity.type) {
      case 'Hackathon':
        return 'Solve real-world problems and build a project with a multidisciplinary team.';
      case 'Internship':
        return 'Gain real-world industry experience, mentorship, and professional career growth.';
      case 'Job':
        return 'Full-time employment opportunity with direct industry hiring and career advancement.';
      case 'Competition':
        return 'Put your problem-solving abilities to the test and compete for recognition and prizes.';
      case 'Quiz':
        return 'Test your domain knowledge and quick thinking across competitive timed rounds.';
      case 'Scholarship':
        return 'Academic merit sponsorship and financial grant support for deserving students.';
      case 'Workshop':
        return 'Interactive, hands-on learning session led by verified industry mentors.';
      case 'Conference':
        return 'Engage with field leaders, attend keynotes, and discover emerging tech frontiers.';
      default:
        return 'Verified student opportunity hosted on the official organization portal.';
    }
  }, [opportunity.description, opportunity.type]);

  // Clean, non-duplicate tags (up to 3 tags + remaining count)
  const { visibleTags, remainingCount } = useMemo(() => {
    const typeLower = (opportunity.type || '').toLowerCase();
    const catLower = (opportunity.category || '').toLowerCase();

    const rawTags = [...(opportunity.tags || []), ...(opportunity.requiredSkills || [])];
    const unique = Array.from(
      new Set(
        rawTags
          .map((t) => t.trim())
          .filter((t) => {
            if (!t) return false;
            const l = t.toLowerCase();
            return l !== typeLower && l !== catLower;
          })
      )
    );

    const visible = unique.slice(0, 3);
    const remaining = unique.length - visible.length;
    return {
      visibleTags: visible,
      remainingCount: remaining > 0 ? remaining : 0,
    };
  }, [opportunity.tags, opportunity.requiredSkills, opportunity.type, opportunity.category]);

  // Countdown banner label
  const countdownBannerText = useMemo(() => {
    if (countdownInfo.isExpired) {
      return 'Registration closed · Expired';
    }
    if (opportunity.daysRemaining === 0) {
      return 'Closing today · Final hours left to apply';
    }
    if (opportunity.daysRemaining === 1) {
      return 'Closing soon · 1 day left';
    }
    if (opportunity.daysRemaining !== undefined && opportunity.daysRemaining <= 14) {
      return `Closing soon · ${opportunity.daysRemaining} days left`;
    }
    if (opportunity.daysRemaining !== undefined) {
      return `Active listing · ${opportunity.daysRemaining} days left`;
    }
    return 'Open registration · Rolling deadline';
  }, [countdownInfo.isExpired, opportunity.daysRemaining]);

  const hasPrize = Boolean(
    (opportunity.prizeAmount && opportunity.prizeAmount > 0) ||
      (opportunity.prizeOrCompensation &&
        opportunity.prizeOrCompensation !== 'Not specified' &&
        opportunity.prizeOrCompensation !== 'Unpaid')
  );

  return (
    <View style={styles.card}>
      {/* 1. Header: Logo, Title, Organizer, Verified badge & Bookmark */}
      <View style={styles.headerRow}>
        {/* Organizer Logo / Icon */}
        <View style={styles.logoContainer}>
          {opportunity.organizerLogo && !logoError ? (
            <Image
              source={{ uri: opportunity.organizerLogo }}
              style={styles.logoImage}
              resizeMode="contain"
              onError={() => setLogoError(true)}
            />
          ) : (
            <Ionicons
              name={getCategoryIcon(opportunity.type)}
              size={22}
              color={Colors.primary}
            />
          )}
        </View>

        {/* Title & Organizer Details */}
        <View style={styles.headerCenter}>
          <Text style={styles.title} numberOfLines={2}>
            {opportunity.title}
          </Text>
          <Text style={styles.organizer} numberOfLines={1}>
            {opportunity.organizer}
          </Text>
          {opportunity.isVerified ? (
            <View style={styles.verifiedRow}>
              <Ionicons name="checkmark-circle" size={13} color={Colors.primary} />
              <Text style={styles.verifiedText}>Verified source</Text>
            </View>
          ) : null}
        </View>

        {/* Bookmark Icon Button */}
        <TouchableOpacity
          style={styles.bookmarkBtn}
          onPress={() => toggleSaveOpportunity(opportunity.id)}
          accessibilityRole="button"
          accessibilityLabel={opportunity.isSaved ? 'Remove bookmark' : 'Bookmark opportunity'}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={opportunity.isSaved ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={opportunity.isSaved ? Colors.primary : Colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      {/* 2. Source-grounded explanation */}
      <Text style={styles.summary} numberOfLines={2}>
        {summaryText}
      </Text>

      {/* 3. Tags: Opportunity Type, Domain/Skill tags, Prize */}
      <View style={styles.tagsRow}>
        {/* Type pill (primary accent) */}
        <View style={styles.typeTag}>
          <Text style={styles.typeTagText}>{opportunity.type}</Text>
        </View>

        {/* Skill/Domain tags */}
        {visibleTags.map((tag) => (
          <View key={tag} style={styles.skillTag}>
            <Text style={styles.skillTagText} numberOfLines={1}>
              {tag}
            </Text>
          </View>
        ))}

        {/* +N more indicator */}
        {remainingCount > 0 ? (
          <View style={styles.moreTag}>
            <Text style={styles.moreTagText}>+{remainingCount} more</Text>
          </View>
        ) : null}

        {/* Prize / Reward highlight pill if available */}
        {hasPrize ? (
          <View style={styles.prizeTag}>
            <Text style={styles.prizeTagText} numberOfLines={1}>
              🏆 {opportunity.prizeOrCompensation.split(' ')[0]}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* 4. 2x2 Metadata Grid */}
      <View style={styles.grid}>
        {/* Row 1 */}
        <View style={styles.gridRow}>
          {/* Team Size */}
          <View style={styles.gridCell}>
            <Ionicons name="people-outline" size={18} color="#FF9F0A" style={styles.gridIcon} />
            <View style={styles.gridCellText}>
              <Text style={styles.gridLabel}>Team size</Text>
              <Text style={styles.gridValue} numberOfLines={1}>
                {opportunity.teamSize || 'Individual'}
              </Text>
            </View>
          </View>

          {/* Format */}
          <View style={styles.gridCell}>
            <Ionicons name="globe-outline" size={18} color="#64D2FF" style={styles.gridIcon} />
            <View style={styles.gridCellText}>
              <Text style={styles.gridLabel}>Format</Text>
              <Text style={styles.gridValue} numberOfLines={1}>
                {opportunity.format}
              </Text>
            </View>
          </View>
        </View>

        {/* Row 2 */}
        <View style={[styles.gridRow, { marginTop: 12 }]}>
          {/* Eligibility */}
          <View style={styles.gridCell}>
            <Ionicons name="school-outline" size={18} color="#BF5AF2" style={styles.gridIcon} />
            <View style={styles.gridCellText}>
              <Text style={styles.gridLabel}>Eligibility</Text>
              <Text style={styles.gridValue} numberOfLines={1}>
                {opportunity.eligibility ? opportunity.eligibility : 'Check criteria'}
              </Text>
            </View>
          </View>

          {/* Deadline */}
          <View style={styles.gridCell}>
            <Ionicons name="time-outline" size={18} color="#FF453A" style={styles.gridIcon} />
            <View style={styles.gridCellText}>
              <Text style={styles.gridLabel}>Deadline</Text>
              <Text style={styles.gridValue} numberOfLines={1}>
                {opportunity.deadline}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* 5. Countdown Strip */}
      <View
        style={[
          styles.countdownStrip,
          countdownInfo.isExpired ? styles.countdownStripExpired : undefined,
        ]}
      >
        <Ionicons
          name={countdownInfo.isExpired ? 'alert-circle-outline' : 'flame'}
          size={16}
          color={countdownInfo.isExpired ? Colors.textSubtle : Colors.primary}
        />
        <Text
          style={[
            styles.countdownStripText,
            countdownInfo.isExpired ? styles.countdownStripTextExpired : undefined,
          ]}
          numberOfLines={1}
        >
          {countdownBannerText}
        </Text>
      </View>

      {/* 6. Bottom Action Row: View Opportunity & Share */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={handlePress}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`View details for ${opportunity.title}`}
        >
          <Text style={styles.viewButtonText}>View opportunity</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShare}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Share opportunity"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="share-social-outline" size={19} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Subtle attribution note */}
      <Text style={styles.cardFootnote}>
        Source verified via {opportunity.source || 'Unstop'} · Details subject to host updates
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0E121A',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#181E29',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoImage: {
    width: 32,
    height: 32,
  },
  headerCenter: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  organizer: {
    fontSize: 13,
    color: '#8E95A5',
    marginTop: 2,
    fontWeight: Typography.medium,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  verifiedText: {
    fontSize: 11,
    color: '#8E95A5',
    fontWeight: Typography.medium,
  },
  bookmarkBtn: {
    padding: 4,
  },
  summary: {
    fontSize: 13,
    color: '#C4CAD4',
    lineHeight: 19,
    marginTop: 10,
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  typeTag: {
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  typeTagText: {
    color: '#FF453A',
    fontSize: 12,
    fontWeight: '600',
  },
  skillTag: {
    backgroundColor: '#181E29',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  skillTagText: {
    color: '#C4CAD4',
    fontSize: 12,
    fontWeight: '500',
  },
  moreTag: {
    backgroundColor: '#181E29',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  moreTagText: {
    color: '#8E95A5',
    fontSize: 11,
    fontWeight: '500',
  },
  prizeTag: {
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 10, 0.3)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  prizeTagText: {
    color: '#FF9F0A',
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    marginBottom: 14,
  },
  grid: {
    marginBottom: 14,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridIcon: {
    marginRight: 8,
  },
  gridCellText: {
    flex: 1,
  },
  gridLabel: {
    fontSize: 11,
    color: '#6E7687',
    marginBottom: 1,
  },
  gridValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  countdownStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.25)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  countdownStripExpired: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  countdownStripText: {
    color: '#FF6961',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  countdownStripTextExpired: {
    color: '#8E95A5',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  viewButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  shareButton: {
    width: 46,
    height: 46,
    backgroundColor: '#181E29',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFootnote: {
    fontSize: 10,
    color: '#555C6B',
    marginTop: 8,
    textAlign: 'center',
  },
});
