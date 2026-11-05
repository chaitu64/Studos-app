import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TeamListing } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';

export interface TeamCardProps {
  team: TeamListing;
}

export const TeamCard: React.FC<TeamCardProps> = ({ team }) => {
  const handlePress = () => {
    router.push(`/teams/${team.id}` as any);
  };

  return (
    <Card variant="default" style={styles.card} onPress={handlePress}>
      {/* Event or Hackathon Badge & Stage */}
      <View style={styles.topRow}>
        {team.hackathonOrEvent ? (
          <Badge label={team.hackathonOrEvent} variant="primary" size="sm" />
        ) : (
          <Badge label={team.projectDomain} variant="cyan" size="sm" />
        )}
        <Badge label={team.stage} variant="outline" size="sm" />
      </View>

      {/* Team Name & Tagline */}
      <Text style={styles.name}>{team.name}</Text>
      <Text style={styles.tagline} numberOfLines={2}>
        {team.tagline}
      </Text>

      {/* Lead info */}
      <TouchableOpacity style={styles.leadRow} onPress={() => team.lead.identity && router.push(`/student/${team.lead.identity.type}/${team.lead.identity.id}` as any)}>
        <Avatar uri={team.lead.avatar} name={team.lead.name} size={28} />
        <Text style={styles.leadText}>
          Led by <Text style={{ color: Colors.textPrimary, fontWeight: '600' }}>{team.lead.name}</Text>
        </Text>
      </TouchableOpacity>

      {/* Open Roles Needed */}
      <View style={styles.rolesSection}>
        <Text style={styles.rolesHeader}>OPEN ROLES:</Text>
        <View style={styles.rolesList}>
          {team.openRoles.map((r, idx) => (
            <View key={idx} style={styles.roleChip}>
              <Ionicons name="person-add-outline" size={12} color={Colors.primary} />
            <Text style={styles.roleChipText} numberOfLines={1}>{r.role}</Text>
            <Text style={styles.roleCommitment} numberOfLines={1}>· {r.commitment}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.divider} />

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          title="View & Apply"
          variant="outline"
          size="sm"
          onPress={handlePress}
          style={styles.applyBtn}
        />
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
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  name: {
    fontSize: Typography.headline,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  tagline: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 10,
  },
  leadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  leadText: {
    fontSize: Typography.footnote,
    color: Colors.textMuted,
    marginLeft: 8,
    flex: 1,
  },
  rolesSection: {
    marginBottom: 12,
  },
  rolesHeader: {
    fontSize: 10,
    fontWeight: Typography.bold,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  rolesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceHighlight,
    minHeight: 36,
    maxWidth: '100%',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  roleChipText: {
    fontSize: Typography.caption,
    color: Colors.textPrimary,
    fontWeight: Typography.semiBold,
    marginLeft: 4,
  },
  roleCommitment: {
    fontSize: 10,
    color: Colors.textSubtle,
    marginLeft: 4,
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
  applicantStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  applicantText: {
    fontSize: Typography.footnote,
    color: Colors.textMuted,
    marginLeft: 6,
  },
  applyBtn: {
    minHeight: 44,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
});
