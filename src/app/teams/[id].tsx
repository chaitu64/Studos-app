import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useApp } from '../../context/AppContext';
import { StudentRole } from '../../types';

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { teams, user, applyToTeam } = useApp();

  const team = teams.find((t) => t.id === id);

  const [selectedRoleToApply, setSelectedRoleToApply] = useState<StudentRole | null>(null);
  const [pitchNote, setPitchNote] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!team) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>Team not found</Text>
        <Button title="Back to Teams" variant="primary" onPress={() => router.back()} />
      </View>
    );
  }

  const handleOpenApplyModal = (role: StudentRole) => {
    setSelectedRoleToApply(role);
    setPitchNote(`Hi ${team.lead.name}! I would love to join ${team.name} as a ${role}. My top skills are ${user.skills.slice(0, 3).join(', ')}.`);
    setShowApplyModal(true);
  };

  const handleConfirmApplication = async () => {
    if (!selectedRoleToApply) return;
    setIsSubmitting(true);
    try {
      const res = await applyToTeam(team.id, selectedRoleToApply);
      setShowApplyModal(false);
      Alert.alert('Application Sent!', res.message, [
        { text: 'Great!', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to submit application. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Top Badges */}
        <View style={styles.topBadges}>
          {team.hackathonOrEvent ? (
            <Badge label={team.hackathonOrEvent} variant="primary" size="md" />
          ) : (
            <Badge label={team.projectDomain} variant="cyan" size="md" />
          )}
          <Badge label={`Stage: ${team.stage}`} variant="purple" size="md" />
        </View>

        {/* Team Name & Tagline */}
        <Text style={styles.teamName}>{team.name}</Text>
        <Text style={styles.tagline}>{team.tagline}</Text>

        {/* Lead Info Banner */}
        <Card variant="elevated" style={styles.leadCard}>
          <Avatar uri={team.lead.avatar} name={team.lead.name} size={46} />
          <View style={styles.leadInfo}>
            <Text style={styles.leadTitle}>TEAM CREATOR & LEAD</Text>
            <Text style={styles.leadName}>{team.lead.name}</Text>
            <Text style={styles.leadRole}>{team.lead.role}</Text>
          </View>
          <Button
            title="Message"
            variant="outline"
            size="sm"
            icon={<Ionicons name="chatbubble-outline" size={14} color={Colors.primary} />}
            onPress={() => router.push('/chat/conv_1' as any)}
          />
        </Card>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MISSION & PROJECT SCOPE</Text>
          <Text style={styles.bodyText}>{team.description}</Text>
        </View>

        {/* Current Roster */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CURRENT TEAM ROSTER ({team.members.length})</Text>
          <View style={styles.membersList}>
            {team.members.map((m) => (
              <View key={m.id} style={styles.memberRow}>
                <Avatar uri={m.avatar} name={m.name} size={36} />
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{m.name}</Text>
                  <Text style={styles.memberRole}>{m.role}</Text>
                </View>
                {m.isLead ? <Badge label="Lead" variant="primary" size="sm" /> : null}
              </View>
            ))}
          </View>
        </View>

        {/* Open Roles Needed */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RECRUITING FOR THESE ROLES</Text>
          <View style={styles.rolesList}>
            {team.openRoles.map((r, idx) => (
              <Card key={idx} variant="default" style={styles.roleCard}>
                <View style={styles.roleHeaderRow}>
                  <View style={styles.roleTitleGroup}>
                    <Ionicons name="person-add" size={16} color={Colors.primary} />
                    <Text style={styles.roleTitle}>{r.role}</Text>
                  </View>
                  <Badge label={r.commitment} variant="outline" size="sm" />
                </View>

                <Text style={styles.roleSkillsLabel}>KEY SKILLS:</Text>
                <View style={styles.chipsWrap}>
                  {r.skills.map((s) => (
                    <View key={s} style={styles.skillPill}>
                      <Text style={styles.skillPillText}>{s}</Text>
                    </View>
                  ))}
                </View>

                <Button
                  title={`Apply for ${r.role}`}
                  variant="primary"
                  size="sm"
                  onPress={() => handleOpenApplyModal(r.role)}
                  style={{ marginTop: 12 }}
                />
              </Card>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* APPLY MODAL */}
      <Modal
        visible={showApplyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowApplyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.applyModalSheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Apply to {team.name}</Text>
                <Text style={styles.sheetSubtitle}>Role: {selectedRoleToApply}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowApplyModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.profileAttachedText}>
              ✓ Your student profile ({user.college}, {user.degree}) and GitHub link will be automatically attached.
            </Text>

            <Input
              label="Why are you excited for this role? *"
              multiline
              numberOfLines={4}
              value={pitchNote}
              onChangeText={setPitchNote}
              placeholder="Tell the team lead about your relevant experience..."
            />

            <Button
              title="Submit Team Application"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              onPress={handleConfirmApplication}
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>
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
  teamName: {
    fontSize: Typography.title1,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  tagline: {
    fontSize: Typography.headline,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: 16,
  },
  leadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 16,
  },
  leadInfo: {
    flex: 1,
    marginLeft: 12,
  },
  leadTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.8,
  },
  leadName: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  leadRole: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
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
    marginBottom: 10,
  },
  bodyText: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  membersList: {
    gap: 12,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 10,
  },
  memberName: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  memberRole: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
  },
  rolesList: {
    gap: 12,
  },
  roleCard: {
    padding: 14,
    backgroundColor: Colors.surfaceElevated,
  },
  roleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roleTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roleTitle: {
    fontSize: Typography.headline,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  roleSkillsLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillPill: {
    backgroundColor: Colors.surfaceHighlight,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.xs,
  },
  skillPillText: {
    fontSize: Typography.caption,
    color: Colors.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  applyModalSheet: {
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: Typography.title3,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  sheetSubtitle: {
    fontSize: Typography.subhead,
    color: Colors.primary,
    marginTop: 2,
    fontWeight: Typography.semiBold,
  },
  profileAttachedText: {
    fontSize: Typography.caption,
    color: Colors.success,
    backgroundColor: Colors.successSubtle,
    padding: 8,
    borderRadius: BorderRadius.sm,
    marginBottom: 14,
  },
});
