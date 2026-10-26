import React, { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../ui/Avatar';
import { BorderRadius, Colors, Shadows, Typography } from '../../constants/theme';
import { CommunityPost } from '../../types';

export interface DiscoveryPerson {
  id: string;
  author: CommunityPost['author'];
  posts: CommunityPost[];
  sourcePost: CommunityPost;
  skills: string[];
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

const SWIPE_DISTANCE_RATIO = 0.24;
const SWIPE_FLICK_DISTANCE = 36;
const SWIPE_FLICK_VELOCITY = 0.75;

function SkillTags({ skills }: { skills: string[] }) {
  if (skills.length === 0) return null;

  return (
    <View style={styles.tags}>
      {skills.slice(0, 4).map((skill) => (
        <View key={skill} style={styles.tag}>
          <Text style={styles.tagText} numberOfLines={1}>{skill}</Text>
        </View>
      ))}
      {skills.length > 4 ? (
        <Text style={styles.moreSkills}>+{skills.length - 4}</Text>
      ) : null}
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

export function DiscoverySwipeCard({
  item,
  actionLabel,
  disabled = false,
  onSkip,
  onInterest,
  onDetails,
}: DiscoverySwipeCardProps) {
  const [pan] = useState(() => new Animated.ValueXY());
  const { width: screenWidth } = useWindowDimensions();
  const swipeThreshold = Math.min(120, Math.max(84, screenWidth * SWIPE_DISTANCE_RATIO));

  useEffect(() => {
    pan.setValue({ x: 0, y: 0 });
  }, [item.id, pan]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          !disabled && Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_, gesture) => pan.setValue({ x: gesture.dx, y: 0 }),
        onPanResponderRelease: (_, gesture) => {
          const direction =
            gesture.dx > swipeThreshold ||
            (gesture.dx > SWIPE_FLICK_DISTANCE && gesture.vx > SWIPE_FLICK_VELOCITY)
              ? 'right'
              : gesture.dx < -swipeThreshold ||
                (gesture.dx < -SWIPE_FLICK_DISTANCE && gesture.vx < -SWIPE_FLICK_VELOCITY)
                ? 'left'
                : null;

          if (!direction) {
            Animated.spring(pan, {
              toValue: { x: 0, y: 0 },
              velocity: { x: gesture.vx, y: 0 },
              tension: 85,
              friction: 12,
              useNativeDriver: true,
            }).start();
            return;
          }

          Animated.spring(pan, {
            toValue: {
              x: direction === 'right' ? screenWidth + 100 : -screenWidth - 100,
              y: 0,
            },
            velocity: { x: gesture.vx, y: 0 },
            tension: 70,
            friction: 12,
            overshootClamping: true,
            useNativeDriver: true,
          }).start(({ finished }) => {
            if (!finished) return;
            pan.setValue({ x: 0, y: 0 });
            if (direction === 'right') onInterest();
            else onSkip();
          });
        },
        onPanResponderTerminate: () => {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            tension: 85,
            friction: 12,
            useNativeDriver: true,
          }).start();
        },
      }),
    [disabled, onInterest, onSkip, pan, screenWidth, swipeThreshold]
  );

  const rotate = pan.x.interpolate({
    inputRange: [-screenWidth / 2, 0, screenWidth / 2],
    outputRange: ['-7deg', '0deg', '7deg'],
    extrapolate: 'clamp',
  });
  const scale = pan.x.interpolate({
    inputRange: [-screenWidth, 0, screenWidth],
    outputRange: [0.96, 1, 0.96],
    extrapolate: 'clamp',
  });
  const interestOpacity = pan.x.interpolate({
    inputRange: [16, swipeThreshold],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const skipOpacity = pan.x.interpolate({
    inputRange: [-swipeThreshold, -16],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const stylesForTransform = {
    transform: [{ translateX: pan.x }, { rotate }, { scale }],
  };

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[styles.card, stylesForTransform]}
    >
      <Animated.View style={[styles.stamp, styles.interestStamp, { opacity: interestOpacity }]}>
        <Text style={styles.interestStampText}>EXPRESS INTEREST</Text>
      </Animated.View>
      <Animated.View style={[styles.stamp, styles.skipStamp, { opacity: skipOpacity }]}>
        <Text style={styles.skipStampText}>SKIP</Text>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.cardContent}
      >
        {(item.kind === 'person' ? item.person.sourcePost : item.post).id.startsWith('demo_') ? (
          <View style={styles.demoNotice}>
            <Ionicons name="eye-outline" size={13} color={Colors.accentAmber} />
            <Text style={styles.demoNoticeText}>DEMO PREVIEW · no live request will be sent</Text>
          </View>
        ) : null}
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
  );
}

function PersonCard({ person }: { person: DiscoveryPerson }) {
  const recentPosts = person.posts.slice(0, 2);
  const primaryPost = person.sourcePost;
  const role = person.author.role;

  return (
    <>
      <View style={styles.personHeader}>
        <Avatar
          uri={person.author.avatar}
          name={person.author.name}
          size={64}
          isVerified={person.author.isVerified}
        />
        <View style={styles.personIdentity}>
          <View style={styles.nameRow}>
            <Text style={styles.personName} numberOfLines={1}>{person.author.name}</Text>
            {person.author.isVerified ? (
              <Ionicons name="checkmark-circle" size={16} color={Colors.accentCyan} />
            ) : null}
          </View>
          {role ? <Text style={styles.subtleText} numberOfLines={1}>{role}</Text> : null}
          {person.author.college ? (
            <Text style={styles.subtleText} numberOfLines={2}>{person.author.college}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.divider} />
      <Section label="RECENT CONTRIBUTION">
        <Text style={styles.cardTitle} numberOfLines={2}>{primaryPost.title}</Text>
        <Text style={styles.bodyText} numberOfLines={3}>
          {primaryPost.content.trim()}
        </Text>
      </Section>

      {person.skills.length > 0 ? (
        <Section label="SHARED SKILLS">
          <SkillTags skills={person.skills} />
        </Section>
      ) : null}

      {recentPosts.length > 1 ? (
        <Section label="ALSO SHARED">
          {recentPosts.slice(1).map((post) => (
            <View key={post.id} style={styles.relatedPost}>
              <Ionicons name="document-text-outline" size={15} color={Colors.textMuted} />
              <Text style={styles.relatedPostText} numberOfLines={1}>{post.title}</Text>
            </View>
          ))}
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
    minHeight: 260,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.card,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    ...Shadows.card,
  },
  cardContent: {
    padding: 18,
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
    alignItems: 'center',
    gap: 12,
  },
  personIdentity: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
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
