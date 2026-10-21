import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { SwipeProfileCard } from '../../components/cards/SwipeProfileCard';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { MOCK_STUDENTS } from '../../services/mockData';
import { StudentRole, UserProfile } from '../../types';
import { useApp } from '../../context/AppContext';

const ROLE_FILTERS: (StudentRole | 'All')[] = [
  'All',
  'Developer',
  'AI/ML Engineer',
  'UI/UX Designer',
  'Hardware Engineer',
  'Researcher',
  'Founder / Product',
];

export default function DiscoverScreen() {
  const { user, conversations } = useApp();
  const [deck, setDeck] = useState<UserProfile[]>(MOCK_STUDENTS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedRole, setSelectedRole] = useState<StudentRole | 'All'>('All');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchedStudent, setMatchedStudent] = useState<UserProfile | null>(null);
  const [savedProfiles, setSavedProfiles] = useState<string[]>([]);

  // Filter deck based on selected role
  const filteredDeck = deck.filter((s) => {
    if (selectedRole === 'All') return true;
    return s.primaryRole === selectedRole;
  });

  const currentStudent = filteredDeck[currentIndex];

  const handlePass = () => {
    if (currentIndex < filteredDeck.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(filteredDeck.length);
    }
  };

  const handleConnect = () => {
    if (!currentStudent) return;
    // Maya Chen and Marcus Vance trigger mutual match for demo delight!
    if (currentStudent.id === 'usr_1' || currentStudent.id === 'usr_2') {
      setMatchedStudent(currentStudent);
      setShowMatchModal(true);
    } else {
      Alert.alert(
        'Connection Request Sent!',
        `We notified ${currentStudent.name} about your mutual interest. You'll be notified when they accept.`,
        [{ text: 'Great!', onPress: handlePass }]
      );
    }
  };

  const handleSave = () => {
    if (!currentStudent) return;
    setSavedProfiles((prev) => [...prev, currentStudent.id]);
    Alert.alert('Profile Saved', `${currentStudent.name} saved to your bookmarks (${savedProfiles.length + 1} total).`);
  };

  const handleReport = () => {
    Alert.alert(
      'Report or Block Student',
      'Select an action to keep the StuDos innovation community respectful and safe.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report Inappropriate Profile',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Report Received', 'Our moderation team will review this profile within 2 hours.');
            handlePass();
          },
        },
        {
          text: 'Block User',
          style: 'destructive',
          onPress: () => {
            setDeck((prev) => prev.filter((s) => s.id !== currentStudent?.id));
            Alert.alert('Blocked', 'You will no longer see this user in your recommendations.');
          },
        },
      ]
    );
  };

  const handleResetDeck = () => {
    setDeck(MOCK_STUDENTS);
    setCurrentIndex(0);
  };

  const startConversationWithMatch = () => {
    setShowMatchModal(false);
    // Find or navigate to conversation
    const existing = conversations.find((c) => c.name === matchedStudent?.name);
    if (existing) {
      router.push(`/chat/${existing.id}` as any);
    } else {
      router.push(`/chat/conv_1` as any);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Swipe & Connect</Text>
          <Text style={styles.headerSubtitle}>Discover ambitious student co-builders</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons name="filter" size={18} color={Colors.primary} />
            {selectedRole !== 'All' ? (
              <View style={styles.activeFilterDot} />
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.flagBtn}
            onPress={handleReport}
            disabled={!currentStudent}
          >
            <Ionicons name="ellipsis-vertical" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Horizontal Role Chips */}
      <View style={styles.rolesRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rolesScroll}>
          {ROLE_FILTERS.map((r) => (
            <Chip
              key={r}
              label={r}
              selected={selectedRole === r}
              onPress={() => {
                setSelectedRole(r);
                setCurrentIndex(0);
              }}
            />
          ))}
        </ScrollView>
      </View>

      {/* Card Arena */}
      <View style={styles.arena}>
        {currentStudent ? (
          <SwipeProfileCard
            student={currentStudent}
            onPass={handlePass}
            onConnect={handleConnect}
            onSave={handleSave}
            onViewDetails={() => router.push('/(tabs)/profile' as any)}
          />
        ) : (
          <EmptyState
            icon="people-outline"
            title="All Caught Up!"
            description={`You've reviewed all available students matching ${selectedRole === 'All' ? 'your preferences' : selectedRole}.`}
            actionTitle="Reset Deck"
            onAction={handleResetDeck}
            style={styles.emptyContainer}
          />
        )}
      </View>

      {/* MUTUAL MATCH MODAL */}
      <Modal
        visible={showMatchModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMatchModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.matchCard}>
            <View style={styles.matchIconGlow}>
              <Ionicons name="flash" size={32} color="#FFF" />
            </View>

            <Text style={styles.matchTitle}>IT’S A MUTUAL MATCH!</Text>
            <Text style={styles.matchSubtitle}>
              You and <Text style={{ color: Colors.primary, fontWeight: '700' }}>{matchedStudent?.name}</Text> both want to collaborate!
            </Text>

            {/* Avatars connection visual */}
            <View style={styles.matchAvatarsRow}>
              <View style={styles.avatarBorderWrap}>
                <Avatar uri={user.avatar} name={user.name} size={64} />
              </View>
              <View style={styles.matchPlusWrap}>
                <Ionicons name="sparkles" size={18} color={Colors.primary} />
              </View>
              <View style={styles.avatarBorderWrap}>
                <Avatar uri={matchedStudent?.avatar} name={matchedStudent?.name} size={64} />
              </View>
            </View>

            <Text style={styles.matchHint}>
              {matchedStudent?.name} is a {matchedStudent?.primaryRole} at {matchedStudent?.college}. Start a conversation now to discuss project milestones.
            </Text>

            <View style={styles.matchActions}>
              <Button
                title="Send a Message"
                variant="primary"
                size="md"
                onPress={startConversationWithMatch}
                style={{ width: '100%', marginBottom: 10 }}
              />
              <Button
                title="Keep Swiping"
                variant="ghost"
                size="md"
                onPress={() => {
                  setShowMatchModal(false);
                  handlePass();
                }}
                style={{ width: '100%' }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* FILTER MODAL */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.filterModalOverlay}>
          <View style={styles.filterSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Collaborator Filters</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.filterGroupTitle}>PREFERRED ROLE</Text>
            <View style={styles.filterChipsGrid}>
              {ROLE_FILTERS.map((r) => (
                <Chip
                  key={r}
                  label={r}
                  selected={selectedRole === r}
                  onPress={() => {
                    setSelectedRole(r);
                    setCurrentIndex(0);
                  }}
                  style={{ marginBottom: 8 }}
                />
              ))}
            </View>

            <Button
              title="Apply Filters"
              variant="primary"
              size="lg"
              onPress={() => setShowFilterModal(false)}
              style={{ marginTop: 24 }}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: Typography.title2,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeFilterDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  flagBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rolesRow: {
    marginBottom: 10,
  },
  rolesScroll: {
    paddingHorizontal: Spacing.screenPadding,
  },
  arena: {
    flex: 1,
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: 12,
  },
  emptyContainer: {
    marginTop: 80,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  matchCard: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    padding: 24,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  matchIconGlow: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  matchTitle: {
    fontSize: Typography.title3,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
    marginBottom: 8,
  },
  matchSubtitle: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  matchAvatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 16,
  },
  avatarBorderWrap: {
    padding: 3,
    borderRadius: 36,
    backgroundColor: Colors.primary,
  },
  matchPlusWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  matchHint: {
    fontSize: Typography.footnote,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  matchActions: {
    width: '100%',
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  filterSheet: {
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
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: Typography.title3,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  filterGroupTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  filterChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
