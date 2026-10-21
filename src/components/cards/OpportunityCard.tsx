import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Opportunity } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { useApp } from '../../context/AppContext';

export interface OpportunityCardProps {
  opportunity: Opportunity;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({ opportunity }) => {
  const { toggleSaveOpportunity } = useApp();

  const handlePress = () => {
    router.push(`/opportunities/${opportunity.id}` as any);
  };

  const isUrgent = opportunity.daysRemaining <= 14;

  const getTypeVariant = (type: Opportunity['type']) => {
    switch (type) {
      case 'Hackathon':
        return 'primary';
      case 'Fellowship':
        return 'purple';
      case 'AI Summit':
        return 'cyan';
      case 'Internship':
        return 'green';
      case 'Workshop':
        return 'amber';
      default:
        return 'neutral';
    }
  };

  return (
    <Card variant="default" style={styles.card} onPress={handlePress}>
      {/* Top row: Type badge & Deadline indicator */}
      <View style={styles.topRow}>
        <Badge
          label={opportunity.type}
          variant={getTypeVariant(opportunity.type)}
          size="sm"
        />

        <View
          style={[
            styles.deadlinePill,
            isUrgent ? styles.deadlineUrgent : styles.deadlineNormal,
          ]}
        >
          <Ionicons
            name="time-outline"
            size={12}
            color={isUrgent ? Colors.primary : Colors.textMuted}
          />
          <Text
            style={[
              styles.deadlineText,
              isUrgent ? { color: Colors.primary, fontWeight: '700' } : undefined,
            ]}
          >
            {opportunity.daysRemaining}d left
          </Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>
        {opportunity.title}
      </Text>

      {/* Organizer with verified icon */}
      <View style={styles.organizerRow}>
        <Ionicons name="business-outline" size={14} color={Colors.textMuted} />
        <Text style={styles.organizerText}>{opportunity.organizer}</Text>
        {opportunity.isVerified ? (
          <Ionicons name="checkmark-circle" size={14} color={Colors.primary} style={{ marginLeft: 4 }} />
        ) : null}
      </View>

      {/* Location / Format & Compensation */}
      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <Ionicons name="location-outline" size={14} color={Colors.accentCyan} />
          <Text style={styles.infoText} numberOfLines={1}>
            {opportunity.format} • {opportunity.location}
          </Text>
        </View>

        <View style={styles.infoItem}>
          <Ionicons name="trophy-outline" size={14} color={Colors.accentAmber} />
          <Text style={[styles.infoText, { color: Colors.accentAmber }]} numberOfLines={1}>
            {opportunity.prizeOrCompensation}
          </Text>
        </View>
      </View>

      {/* Required Skills */}
      <View style={styles.skillsRow}>
        {opportunity.requiredSkills.slice(0, 3).map((skill) => (
          <View key={skill} style={styles.skillTag}>
            <Text style={styles.skillText}>{skill}</Text>
          </View>
        ))}
      </View>

      <View style={styles.divider} />

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.deadlineFull}>Deadline: {opportunity.deadline}</Text>

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={(e) => {
            e.stopPropagation();
            toggleSaveOpportunity(opportunity.id);
          }}
        >
          <Ionicons
            name={opportunity.isSaved ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={opportunity.isSaved ? Colors.primary : Colors.textMuted}
          />
        </TouchableOpacity>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  deadlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  deadlineNormal: {
    backgroundColor: Colors.surfaceHighlight,
    borderColor: Colors.border,
  },
  deadlineUrgent: {
    backgroundColor: Colors.primarySubtle,
    borderColor: Colors.primaryBorder,
  },
  deadlineText: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginLeft: 4,
    fontWeight: Typography.medium,
  },
  title: {
    fontSize: Typography.headline,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    lineHeight: 22,
    marginBottom: 6,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  organizerText: {
    fontSize: Typography.subhead,
    color: Colors.textMuted,
    marginLeft: 6,
    fontWeight: Typography.medium,
  },
  infoGrid: {
    gap: 6,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: Typography.footnote,
    color: Colors.textSecondary,
    marginLeft: 6,
    flex: 1,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  skillTag: {
    backgroundColor: Colors.surfaceHighlight,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.xs,
  },
  skillText: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    fontWeight: Typography.medium,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deadlineFull: {
    fontSize: Typography.caption,
    color: Colors.textSubtle,
  },
  saveBtn: {
    padding: 6,
  },
});
