/* Reanimated shared values are intentionally mutated inside UI-thread worklets. */
/* eslint-disable react-hooks/immutability */
import React, { forwardRef, useImperativeHandle } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../ui/Avatar';
import { BorderRadius, Colors, Shadows, Typography } from '../../constants/theme';
import { CommunityPost, StudentDirectoryProfile, StudentIdentity } from '../../types';

export interface DiscoveryPerson {
  id: string;
  author: CommunityPost['author'];
  posts: CommunityPost[];
  sourcePost?: CommunityPost;
  skills: string[];
  identity?: StudentIdentity;
  profile?: StudentDirectoryProfile;
}

export type DiscoveryItem =
  | { kind: 'person'; id: string; person: DiscoveryPerson }
  | { kind: 'post'; id: string; post: CommunityPost };

interface DiscoverySwipeCardProps {
  item: DiscoveryItem;
  actionLabel: string;
  disabled?: boolean;
  onSkip: () => void;
  onInterest: () => void;
  onDetails: () => void;
}

export interface DiscoverySwipeCardHandle {
  swipeLeft: () => void;
  swipeRight: () => void;
}

const SWIPE_DISTANCE_RATIO = 0.24;
const SWIPE_FLICK_DISTANCE = 36;
const SWIPE_FLICK_VELOCITY = 0.75;

function SkillTags({ skills }: { skills: string[] }) {
  if (skills.length === 0) return null;

  return (
    <View style={styles.tags}>
      {skills.map((skill, index) => (
        <View key={`${skill}-${index}`} style={styles.tag}>
          <Text style={styles.tagText}>{skill}</Text>
        </View>
      ))}
    </View>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

export const DiscoverySwipeCard = forwardRef<DiscoverySwipeCardHandle, DiscoverySwipeCardProps>(function DiscoverySwipeCard({
  item,
  actionLabel,
  disabled = false,
  onSkip,
  onInterest,
  onDetails,
}: DiscoverySwipeCardProps, ref) {
  const { width: screenWidth } = useWindowDimensions();
  const swipeThreshold = Math.min(120, Math.max(84, screenWidth * SWIPE_DISTANCE_RATIO));
  const translateX = useSharedValue(0);
  const gestureStartX = useSharedValue(0);

  const completeSwipe = (direction: 'left' | 'right') => {
    'worklet';
    translateX.value = withTiming(direction === 'right' ? screenWidth + 120 : -screenWidth - 120, { duration: 210 }, (finished) => {
      if (finished) {
        translateX.value = 0;
        runOnJS(direction === 'right' ? onInterest : onSkip)();
      }
    });
  };

  useImperativeHandle(ref, () => ({
    swipeLeft: () => completeSwipe('left'),
    swipeRight: () => completeSwipe('right'),
  }));

  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    .activeOffsetX([-12, 12])
    .failOffsetY([-18, 18])
    .onBegin(() => { gestureStartX.value = translateX.value; })
    .onUpdate((event) => { translateX.value = gestureStartX.value + event.translationX; })
    .onEnd((event) => {
      const projectedX = translateX.value + event.velocityX * 0.12;
      const right = projectedX > swipeThreshold || (translateX.value > SWIPE_FLICK_DISTANCE && event.velocityX > SWIPE_FLICK_VELOCITY * 1000);
      const left = projectedX < -swipeThreshold || (translateX.value < -SWIPE_FLICK_DISTANCE && event.velocityX < -SWIPE_FLICK_VELOCITY * 1000);
      if (right) completeSwipe('right');
      else if (left) completeSwipe('left');
      else translateX.value = withSpring(0, { damping: 18, stiffness: 210, mass: 0.75 });
    });

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(translateX.value), [0, screenWidth], [1, 0.76]),
    transform: [
      { translateX: translateX.value },
      { rotate: `${interpolate(translateX.value, [-screenWidth / 2, 0, screenWidth / 2], [-7, 0, 7])}deg` },
      { scale: interpolate(Math.abs(translateX.value), [0, screenWidth], [1, 0.96]) },
    ],
  }));
  const interestStyle = useAnimatedStyle(() => ({ opacity: interpolate(translateX.value, [16, swipeThreshold], [0, 1], 'clamp') }));
  const skipStyle = useAnimatedStyle(() => ({ opacity: interpolate(translateX.value, [-swipeThreshold, -16], [1, 0], 'clamp') }));

  return (
    <GestureDetector gesture={panGesture}>
    <Animated.View style={[styles.card, cardAnimatedStyle]}>
      <Animated.View style={[styles.stamp, styles.interestStamp, interestStyle]}>
        <Text style={styles.interestStampText}>EXPRESS INTEREST</Text>
      </Animated.View>
      <Animated.View style={[styles.stamp, styles.skipStamp, skipStyle]}>
        <Text style={styles.skipStampText}>SKIP</Text>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.cardContent}
      >
        {item.kind === 'person' ? (
          <PersonCard person={item.person} />
        ) : item.post.type === 'service' ? (
          <ServiceCard post={item.post} />
        ) : (
          <OpportunityCard post={item.post} />
        )}
      </ScrollView>

      <View style={styles.cardFooter}>
        <Text style={styles.gestureHint}>Swipe left to skip · right to {actionLabel.toLowerCase()}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View full details"
          onPress={onDetails}
          style={styles.detailsLink}
        >
          <Text style={styles.detailsLinkText}>View details</Text>
        </Pressable>
      </View>
    </Animated.View>
    </GestureDetector>
  );
});

function PersonCard({ person }: { person: DiscoveryPerson }) {
  const primaryPost = person.sourcePost;
  const role = person.author.role;
  const interests = person.profile?.interests || primaryPost?.tags || [];
  const lookingFor = primaryPost?.eventRoleNeeded || primaryPost?.rolesNeeded?.join(', ');

  return (
    <>
      <View style={styles.personHeader}>
        <Avatar
          uri={person.author.avatar}
          name={person.author.name}
          size={88}
          isOnline={false}
          isVerified={person.author.isVerified}
        />
        <View style={styles.personIdentity}>
          <View style={styles.nameRow}>
            <Text style={styles.personName}>{person.author.name}</Text>
            {person.author.isVerified ? (
              <Ionicons name="checkmark-circle" size={16} color={Colors.accentCyan} />
            ) : null}
          </View>
          {role ? <Text style={styles.subtleText}>{role}</Text> : null}
          {person.author.college ? (
            <Text style={styles.subtleText}>{person.author.college}</Text>
          ) : null}
        </View>
      </View>

      {person.profile?.isDemo ? <Text style={styles.demoNoticeText}>DEMO PROFILE</Text> : null}
      <Text style={styles.personBio}>{(person.profile?.shortBio || primaryPost?.content || 'Student profile').trim()}</Text>

      {person.skills.length > 0 ? (
        <Section label="TOP SKILLS">
          <SkillTags skills={person.skills} />
        </Section>
      ) : null}

      <View style={styles.profileGrid}>
        <View style={styles.profileFact}>
          <View style={styles.factIcon}><Ionicons name="rocket-outline" size={15} color={Colors.primary} /></View>
          <View style={styles.factCopy}><Text style={styles.sectionLabel}>{person.profile ? 'STUDY' : 'BUILDING'}</Text><Text style={styles.factValue}>{person.profile ? [person.profile.degree, person.profile.studyYear && `Year ${person.profile.studyYear}`, person.profile.gradYear && `Class of ${person.profile.gradYear}`].filter(Boolean).join(' · ') || person.profile.branch || 'Student' : primaryPost?.title}</Text></View>
        </View>
        {lookingFor ? <View style={styles.profileFact}>
          <View style={styles.factIcon}><Ionicons name="people-outline" size={15} color={Colors.accentCyan} /></View>
          <View style={styles.factCopy}><Text style={styles.sectionLabel}>LOOKING FOR</Text><Text style={styles.factValue}>{lookingFor}</Text></View>
        </View> : null}
        {primaryPost?.serviceAvailability ? <View style={styles.profileFact}>
          <View style={styles.factIcon}><Ionicons name="calendar-outline" size={15} color={Colors.accentGreen} /></View>
          <View style={styles.factCopy}><Text style={styles.sectionLabel}>AVAILABILITY</Text><Text style={styles.factValue} numberOfLines={2}>{primaryPost.serviceAvailability}</Text></View>
        </View> : null}
      </View>

      {interests.length ? (
        <Section label="INTERESTS">
          <Text style={styles.interestsText}>{interests.join('  ·  ')}</Text>
        </Section>
      ) : null}
    </>
  );
}

function OpportunityCard({ post }: { post: CommunityPost }) {
  const roles = post.rolesNeeded?.length
    ? post.rolesNeeded
    : post.eventRoleNeeded
      ? post.eventRoleNeeded.split(',').map((role) => role.trim()).filter(Boolean)
      : [];

  return (
    <>
      <View style={styles.kindRow}>
        <View style={styles.kindIcon}>
          <Ionicons name={post.type === 'event_collab' ? 'people-outline' : 'bulb-outline'} size={18} color={Colors.primary} />
        </View>
        <View style={styles.kindText}>
          <Text style={styles.eyebrow}>{post.type === 'event_collab' ? 'TEAM OPPORTUNITY' : 'IDEA & PROJECT'}</Text>
          {post.stage ? <Text style={styles.subtleText}>{post.stage}</Text> : null}
        </View>
      </View>
      <Text style={styles.cardTitle}>{post.title}</Text>

      <Section label={post.problemStatement ? 'THE PROBLEM' : 'PROJECT OVERVIEW'}>
        <Text style={styles.bodyText} numberOfLines={4}>
          {(post.problemStatement || post.content).trim()}
        </Text>
      </Section>

      {post.proposedSolution ? (
        <Section label="PROPOSED SOLUTION">
          <Text style={styles.bodyText} numberOfLines={3}>{post.proposedSolution}</Text>
        </Section>
      ) : null}

      {roles.length > 0 ? (
        <Section label="LOOKING FOR">
          <SkillTags skills={roles} />
        </Section>
      ) : post.skills?.length ? (
        <Section label="SKILLS TO CONTRIBUTE">
          <SkillTags skills={post.skills} />
        </Section>
      ) : null}

      <View style={styles.ownerRow}>
        <Avatar uri={post.author.avatar} name={post.author.name} size={34} />
        <View style={styles.ownerInfo}>
          <Text style={styles.sectionLabel}>SHARED BY</Text>
          <Text style={styles.ownerName} numberOfLines={1}>{post.author.name}</Text>
        </View>
        {post.author.isVerified ? (
          <Ionicons name="checkmark-circle" size={16} color={Colors.accentCyan} />
        ) : null}
      </View>
    </>
  );
}

function ServiceCard({ post }: { post: CommunityPost }) {
  return (
    <>
      <View style={styles.kindRow}>
        <View style={styles.serviceIcon}>
          <Ionicons name="construct-outline" size={18} color={Colors.accentCyan} />
        </View>
        <View style={styles.kindText}>
          <Text style={styles.eyebrow}>STUDENT SERVICE</Text>
          {post.category ? <Text style={styles.subtleText}>{post.category}</Text> : null}
        </View>
      </View>
      <Text style={styles.cardTitle}>{post.title}</Text>
      <Section label="WHAT'S OFFERED">
        <Text style={styles.bodyText} numberOfLines={5}>{post.content.trim()}</Text>
      </Section>

      {post.skills?.length ? (
        <Section label="SKILLS">
          <SkillTags skills={post.skills} />
        </Section>
      ) : null}

      {(post.servicePricing || post.serviceAvailability) ? (
        <View style={styles.serviceTerms}>
          {post.servicePricing ? (
            <View style={styles.term}>
              <Ionicons name="pricetag-outline" size={15} color={Colors.textMuted} />
              <Text style={styles.termText}>{post.servicePricing}</Text>
            </View>
          ) : null}
          {post.serviceAvailability ? (
            <View style={styles.term}>
              <Ionicons name="time-outline" size={15} color={Colors.textMuted} />
              <Text style={styles.termText}>{post.serviceAvailability}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.ownerRow}>
        <Avatar uri={post.author.avatar} name={post.author.name} size={34} />
        <View style={styles.ownerInfo}>
          <Text style={styles.sectionLabel}>PROVIDER</Text>
          <Text style={styles.ownerName} numberOfLines={1}>{post.author.name}</Text>
        </View>
        {post.author.isVerified ? (
          <Ionicons name="checkmark-circle" size={16} color={Colors.accentCyan} />
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.card,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    ...Shadows.card,
  },
  cardContent: {
    padding: 16,
    paddingBottom: 12,
  },
  demoNotice: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: Colors.accentAmberSubtle,
    borderColor: Colors.accentAmber,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
  },
  demoNoticeText: {
    color: Colors.accentAmber,
    fontSize: 9,
    fontWeight: Typography.bold,
    letterSpacing: 0.25,
  },
  stamp: {
    position: 'absolute',
    top: 26,
    zIndex: 2,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    backgroundColor: Colors.background,
  },
  interestStamp: {
    left: 18,
    borderColor: Colors.accentGreen,
    transform: [{ rotate: '-8deg' }],
  },
  interestStampText: {
    color: Colors.accentGreen,
    fontSize: Typography.caption,
    fontWeight: Typography.bold,
    letterSpacing: 0.6,
  },
  skipStamp: {
    right: 18,
    borderColor: Colors.primary,
    transform: [{ rotate: '8deg' }],
  },
  skipStampText: {
    color: Colors.primary,
    fontSize: Typography.caption,
    fontWeight: Typography.bold,
  },
  personHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  personIdentity: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
  },
  personName: {
    flexShrink: 1,
    color: Colors.textPrimary,
    fontSize: Typography.title3,
    fontWeight: Typography.bold,
  },
  subtleText: {
    color: Colors.textMuted,
    fontSize: Typography.caption,
    lineHeight: 16,
  },
  personBio: { color: Colors.textSecondary, fontSize: Typography.body, lineHeight: 21, marginTop: 16 },
  profileGrid: { gap: 9, marginTop: 16 },
  profileFact: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceSubtle, borderWidth: 1, borderColor: Colors.border },
  factIcon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: Colors.surfaceHighlight },
  factCopy: { flex: 1 },
  factValue: { color: Colors.textPrimary, fontSize: Typography.caption, lineHeight: 17, fontWeight: Typography.semiBold },
  interestsText: { color: Colors.textSecondary, fontSize: Typography.caption, lineHeight: 18 },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 16,
  },
  section: {
    marginTop: 14,
  },
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: Typography.bold,
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.title2,
    fontWeight: Typography.bold,
    lineHeight: 28,
    marginTop: 12,
  },
  bodyText: {
    color: Colors.textSecondary,
    fontSize: Typography.body,
    lineHeight: 20,
  },
  tags: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
  },
  tag: {
    maxWidth: '90%',
    backgroundColor: Colors.surfaceHighlight,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: {
    color: Colors.textSecondary,
    fontSize: Typography.caption,
    flexShrink: 1,
  },
  moreSkills: {
    color: Colors.textMuted,
    fontSize: Typography.caption,
  },
  relatedPost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  relatedPostText: {
    color: Colors.textSecondary,
    flex: 1,
    fontSize: Typography.caption,
  },
  kindRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  kindIcon: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySubtle,
  },
  serviceIcon: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accentCyanSubtle,
  },
  kindText: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: Typography.bold,
    letterSpacing: 0.7,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    color: Colors.textPrimary,
    fontSize: Typography.caption,
    fontWeight: Typography.semiBold,
  },
  serviceTerms: {
    gap: 8,
    marginTop: 14,
  },
  term: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  termText: {
    color: Colors.textSecondary,
    fontSize: Typography.caption,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: Colors.surfaceSubtle,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  gestureHint: {
    flex: 1,
    color: Colors.textMuted,
    fontSize: 10,
  },
  detailsLink: {
    padding: 4,
  },
  detailsLinkText: {
    color: Colors.primary,
    fontSize: Typography.caption,
    fontWeight: Typography.semiBold,
  },
});
