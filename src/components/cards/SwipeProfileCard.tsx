import React, { useState, useMemo, useEffect } from 'react';
import {
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Animated,
  PanResponder,
  Dimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { UserProfile } from '../../types';
import { Badge } from '../ui/Badge';
import { Colors, Typography, BorderRadius, Shadows } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 120;

export interface SwipeProfileCardProps {
  student: UserProfile;
  onPass: () => void;
  onConnect: () => void;
  onSave?: () => void;
  onViewDetails?: () => void;
}

export const SwipeProfileCard: React.FC<SwipeProfileCardProps> = ({
  student,
  onPass,
  onConnect,
  onSave,
  onViewDetails,
}) => {
  const [pan] = useState(() => new Animated.ValueXY());

  // Reset card position whenever student changes
  useEffect(() => {
    pan.setValue({ x: 0, y: 0 });
  }, [student.id, pan]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return (
            Math.abs(gestureState.dx) > 10 &&
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
          );
        },
        onPanResponderMove: (_, gestureState) => {
          pan.setValue({ x: gestureState.dx, y: gestureState.dy * 0.4 });
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx > SWIPE_THRESHOLD || gestureState.vx > 0.8) {
            Animated.timing(pan, {
              toValue: { x: SCREEN_WIDTH + 100, y: 0 },
              duration: 250,
              useNativeDriver: false,
            }).start(() => {
              pan.setValue({ x: 0, y: 0 });
              onConnect();
            });
          } else if (gestureState.dx < -SWIPE_THRESHOLD || gestureState.vx < -0.8) {
            Animated.timing(pan, {
              toValue: { x: -SCREEN_WIDTH - 100, y: 0 },
              duration: 250,
              useNativeDriver: false,
            }).start(() => {
              pan.setValue({ x: 0, y: 0 });
              onPass();
            });
          } else {
            Animated.spring(pan, {
              toValue: { x: 0, y: 0 },
              friction: 5,
              tension: 40,
              useNativeDriver: false,
            }).start();
          }
        },
      }),
    [pan, onConnect, onPass]
  );

  const handleButtonSwipe = (direction: 'left' | 'right') => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Optional on web
    }

    Animated.timing(pan, {
      toValue: {
        x: direction === 'right' ? SCREEN_WIDTH + 100 : -SCREEN_WIDTH - 100,
        y: 0,
      },
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      pan.setValue({ x: 0, y: 0 });
      if (direction === 'right') {
        onConnect();
      } else {
        onPass();
      }
    });
  };

  // Rotation based on horizontal translation
  const rotate = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  // Stamp badge opacities
  const connectOpacity = pan.x.interpolate({
    inputRange: [20, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const passOpacity = pan.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, -20],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const animatedCardStyle = {
    transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }],
  };

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[styles.cardContainer, animatedCardStyle]}
    >
      {/* SWIPE STAMPS */}
      <Animated.View style={[styles.stampBadge, styles.connectStamp, { opacity: connectOpacity }]}>
        <Ionicons name="flash" size={24} color="#10B981" style={{ marginRight: 6 }} />
        <Text style={styles.connectStampText}>CONNECT</Text>
      </Animated.View>

      <Animated.View style={[styles.stampBadge, styles.passStamp, { opacity: passOpacity }]}>
        <Ionicons name="close-circle" size={24} color="#EF4444" style={{ marginRight: 6 }} />
        <Text style={styles.passStampText}>SKIP</Text>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Image with role and availability badges */}
        <View style={styles.imageWrapper}>
          <Image source={{ uri: student.avatar }} style={styles.avatarImage} />
          <View style={styles.roleOverlay}>
            <Badge label={student.primaryRole || student.branch || 'Student'} variant="primary" size="md" />
          </View>
          {student.availability ? <View style={styles.availabilityOverlay}>
            <Ionicons name="time-outline" size={12} color="#FFF" />
            <Text style={styles.availabilityText}>{student.availability}</Text>
          </View> : null}

          {/* Swipe helper pill */}
          <View style={styles.swipeHintPill}>
            <Ionicons name="swap-horizontal" size={14} color="rgba(255,255,255,0.85)" />
            <Text style={styles.swipeHintText}>Swipe Right to Connect • Left to Skip</Text>
          </View>
        </View>

        {/* Core Info */}
        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{student.name}</Text>
            {student.isVerified ? (
              <Ionicons name="checkmark-circle" size={20} color={Colors.primary} style={{ marginLeft: 6 }} />
            ) : null}
          </View>

          <Text style={styles.collegeText}>{student.college}</Text>
          <Text style={styles.degreeText}>
            {student.degree} • Class of {student.gradYear}
          </Text>

          {/* Bio */}
          <Text style={styles.bioText}>{student.shortBio}</Text>

          {/* Goals */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>CURRENT GOALS</Text>
            <View style={styles.goalBox}>
              <Ionicons name="compass" size={16} color={Colors.accentCyan} style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={styles.goalText}>{student.goals}</Text>
            </View>
          </View>

          {/* Skills */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>SKILLS & TECHNOLOGIES</Text>
            <View style={styles.chipsWrap}>
              {student.skills.map((skill) => (
                <View key={skill} style={styles.skillPill}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Interests */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>DOMAINS & INTERESTS</Text>
            <View style={styles.chipsWrap}>
              {student.interests.map((interest) => (
                <View key={interest} style={styles.interestPill}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{student.projectsCount}</Text>
              <Text style={styles.statLabel}>Projects</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{student.hackathonsCount ?? '—'}</Text>
              <Text style={styles.statLabel}>Hackathons</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{student.leaderboardRank ? `#${student.leaderboardRank}` : '—'}</Text>
              <Text style={styles.statLabel}>Rank</Text>
            </View>
          </View>

          {/* Badges */}
          {(student.badges || []).length > 0 ? (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>ACHIEVEMENTS</Text>
              <View style={styles.chipsWrap}>
                {(student.badges || []).map((b) => (
                  <Badge key={b} label={b} variant="amber" size="sm" />
                ))}
              </View>
            </View>
          ) : null}

          {onViewDetails ? (
            <TouchableOpacity style={styles.viewMoreBtn} onPress={onViewDetails}>
              <Text style={styles.viewMoreText}>View Full Portfolio & Verified Work</Text>
              <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>

      {/* Accessible Floating Action Controls */}
      <View style={styles.actionControls}>
        <TouchableOpacity
          accessibilityLabel="Skip student"
          style={[styles.circleActionBtn, styles.passBtn]}
          onPress={() => handleButtonSwipe('left')}
        >
          <Ionicons name="close" size={26} color={Colors.textMuted} />
        </TouchableOpacity>

        {onSave ? (
          <TouchableOpacity
            accessibilityLabel="Save profile"
            style={[styles.circleActionBtn, styles.saveProfileBtn]}
            onPress={onSave}
          >
            <Ionicons name="bookmark-outline" size={20} color={Colors.accentAmber} />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          accessibilityLabel="Connect with student"
          style={[styles.circleActionBtn, styles.connectBtn]}
          onPress={() => handleButtonSwipe('right')}
        >
          <Ionicons name="flash" size={26} color="#FFF" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
    position: 'relative',
    ...Shadows.card,
  },
  stampBadge: {
    position: 'absolute',
    top: 40,
    zIndex: 99,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.md,
    borderWidth: 2.5,
    backgroundColor: 'rgba(9, 11, 15, 0.92)',
  },
  connectStamp: {
    left: 24,
    borderColor: '#10B981',
    transform: [{ rotate: '-14deg' }],
  },
  connectStampText: {
    color: '#10B981',
    fontSize: Typography.headline,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  passStamp: {
    right: 24,
    borderColor: '#EF4444',
    transform: [{ rotate: '14deg' }],
  },
  passStampText: {
    color: '#EF4444',
    fontSize: Typography.headline,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  scrollContent: {
    paddingBottom: 90,
  },
  imageWrapper: {
    width: '100%',
    height: 320,
    position: 'relative',
    backgroundColor: Colors.surfaceElevated,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  roleOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
  },
  availabilityOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(9, 11, 15, 0.85)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  availabilityText: {
    fontSize: Typography.caption,
    color: '#FFF',
    marginLeft: 4,
    fontWeight: Typography.medium,
  },
  swipeHintPill: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(9, 11, 15, 0.75)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  swipeHintText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 6,
    letterSpacing: 0.3,
  },
  infoSection: {
    padding: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: Typography.title2,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  collegeText: {
    fontSize: Typography.headline,
    color: Colors.primary,
    fontWeight: Typography.semiBold,
    marginBottom: 2,
  },
  degreeText: {
    fontSize: Typography.subhead,
    color: Colors.textMuted,
    marginBottom: 14,
  },
  bioText: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 18,
  },
  sectionBlock: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  goalBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceElevated,
    padding: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  goalText: {
    flex: 1,
    fontSize: Typography.subhead,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillPill: {
    backgroundColor: Colors.surfaceHighlight,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  skillText: {
    fontSize: Typography.footnote,
    color: Colors.textPrimary,
    fontWeight: Typography.medium,
  },
  interestPill: {
    backgroundColor: Colors.surfaceSubtle,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  interestText: {
    fontSize: Typography.footnote,
    color: Colors.accentCyan,
    fontWeight: Typography.medium,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.surfaceElevated,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: Typography.title3,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
  viewMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 6,
  },
  viewMoreText: {
    fontSize: Typography.subhead,
    color: Colors.primary,
    fontWeight: Typography.semiBold,
    marginRight: 6,
  },
  actionControls: {
    position: 'absolute',
    bottom: 16,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  circleActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  passBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  saveProfileBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  connectBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
});
