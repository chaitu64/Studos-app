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
import { safeBack } from '@/navigation/safeBack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useApp } from '../../context/AppContext';
import { sharedContentService } from '../../services/sharedContentService';
import { StudentRole } from '../../types';

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { teams, user, applyToTeam, respondToTeamApplication } = useApp();

  const team = teams.find((t) => t.id === id);

  const [selectedRoleToApply, setSelectedRoleToApply] = useState<StudentRole | null>(null);
  const [pitchNote, setPitchNote] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messagingLead, setMessagingLead] = useState(false);
  const [managingApplicant, setManagingApplicant] = useState('');

  if (!team) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>Team not found</Text>
        <Button title="Back to Teams" variant="primary" onPress={() => safeBack()} />
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
      const res = await applyToTeam(team.id, selectedRoleToApply, pitchNote);
      setShowApplyModal(false);
      Alert.alert('Application Sent!', res.message, [
        { text: 'Great!', onPress: () => safeBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to submit application. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMessageLead = async () => {
    if (!team.lead.id || team.lead.id === user.id || messagingLead) return;
    setMessagingLead(true);
    try {
      const conversationId = await sharedContentService.startDirectConversation(team.lead.id);
      router.push(`/chat/${conversationId}` as never);
    } catch (cause) {
      Alert.alert('Could not start a conversation', cause instanceof Error ? cause.message : 'Please try again.');
    } finally {
      setMessagingLead(false);
    }
  };
  const handleApplicationResponse = async (applicantId: string, status: 'accepted' | 'declined') => {
    if (managingApplicant) return; setManagingApplicant(applicantId);
    try {
      await respondToTeamApplication(team.id, applicantId, status);
      if (status === 'accepted') {
        Alert.alert('Application accepted', 'The membership is saved. Team chat is not available in the current messaging schema.');
      }
    }
    catch (cause) { Alert.alert('Could not update application', cause instanceof Error ? cause.message : 'Please try again.'); }
    finally { setManagingApplicant(''); }
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
          {team.lead.id !== user.id && team.lead.identity?.type !== 'demo' ? <Button title={messagingLead ? 'Opening…' : 'Message'} variant="outline" size="sm" loading={messagingLead} onPress={() => { void handleMessageLead(); }} icon={<Ionicons name="chatbubble-outline" size={14} color={Colors.primary} />} /> : null}
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

        {team.lead.id === user.id && team.applications?.length ? <View style={styles.section}>
          <Text style={styles.sectionTitle}>TEAM APPLICATIONS ({team.applications.length})</Text>
          <View style={styles.membersList}>{team.applications.map((application) => <View key={application.id} style={styles.applicationCard}>
            <View style={styles.memberRow}><Avatar uri={application.applicantAvatar} name={application.applicantName} size={36} /><View style={styles.memberInfo}><Text style={styles.memberName}>{application.applicantName}</Text><Text style={styles.memberRole}>{application.requestedRole || 'Student'} · {application.status}</Text></View></View>
            {application.message ? <Text style={styles.bodyText}>{application.message}</Text> : null}
            {application.status === 'pending' ? <View style={styles.applicationActions}><Button title="Decline" variant="outline" size="sm" disabled={Boolean(managingApplicant)} loading={managingApplicant === application.applicantId} onPress={() => { void handleApplicationResponse(application.applicantId, 'declined'); }} /><Button title="Accept" variant="primary" size="sm" disabled={Boolean(managingApplicant)} loading={managingApplicant === application.applicantId} onPress={() => { void handleApplicationResponse(application.applicantId, 'accepted'); }} /></View> : null}
          </View>)}</View>
        </View> : null}

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

                {team.myApplicationStatus ? <Text style={styles.applicationStatus}>Application {team.myApplicationStatus} · {team.myApplicationRole || 'team role'}</Text> : team.lead.id !== user.id ? <Button
                  title={`Apply for ${r.role}`}
                  variant="primary"
                  size="sm"
                  onPress={() => handleOpenApplyModal(r.role)}
                  style={{ marginTop: 12 }}
                /> : null}
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
              ✓ Your STUDOS profile is associated with the application.
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
  applicationStatus: { color: Colors.accentCyan, fontSize: Typography.caption, lineHeight: 18, marginTop: 12, fontWeight: Typography.semiBold },
  applicationCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: 12, marginBottom: 10 },
  applicationActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
});
