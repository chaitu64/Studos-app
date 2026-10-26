import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Share,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { CommunityPost } from '../../types';

export interface CommunityPostCardProps {
  post: CommunityPost;
  onLike?: (post: CommunityPost) => void;
  onComment?: (post: CommunityPost) => void;
  onSave?: (post: CommunityPost) => void;
  onCollaborate?: (post: CommunityPost) => void;
  onAuthorPress?: (authorId: string) => void;
  onCardPress?: (post: CommunityPost) => void;
}

export const CommunityPostCard: React.FC<CommunityPostCardProps> = ({
  post,
  onLike,
  onComment,
  onSave,
  onCollaborate,
  onAuthorPress,
  onCardPress,
}) => {
  const isDemo = post.id.startsWith('demo_');

  const handleShare = async () => {
    try {
      await Share.share({
        title: post.title,
        message: `${post.title}\n\n${post.content}\n\nShared via StudOs — The Student Network`,
      });
    } catch {}
  };

  const handleOpenLink = async (url?: string) => {
    if (!url) return;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch {}
  };

  // Category Configuration
  const getCategoryMeta = () => {
    switch (post.type) {
      case 'idea':
        return {
          label: 'Idea & Innovation',
          icon: 'bulb-outline' as const,
          color: Colors.accentAmber,
          bgColor: Colors.accentAmberSubtle,
          actionLabel: 'Collaborate',
          actionIcon: 'people-outline' as const,
        };
      case 'service':
        return {
          label: 'Student Service',
          icon: 'construct-outline' as const,
          color: Colors.accentCyan,
          bgColor: Colors.accentCyanSubtle,
          actionLabel: 'Request Service',
          actionIcon: 'chatbubble-ellipses-outline' as const,
        };
      case 'story':
        return {
          label: 'Experience & Story',
          icon: 'book-outline' as const,
          color: Colors.accentPurple,
          bgColor: Colors.accentPurpleSubtle,
          actionLabel: 'Discuss',
          actionIcon: 'chatbubbles-outline' as const,
        };
      case 'event_collab':
        return {
          label: 'Hackathon & Event',
          icon: 'trophy-outline' as const,
          color: Colors.primary,
          bgColor: Colors.primarySubtle,
          actionLabel: 'Volunteer / Join',
          actionIcon: 'hand-right-outline' as const,
        };
      case 'project':
        return {
          label: 'Project Showcase',
          icon: 'rocket-outline' as const,
          color: Colors.accentGreen,
          bgColor: Colors.accentGreenSubtle,
          actionLabel: 'Feedback',
          actionIcon: 'chatbubble-outline' as const,
        };
      case 'question':
      default:
        return {
          label: 'Community Question',
          icon: 'help-circle-outline' as const,
          color: Colors.info,
          bgColor: Colors.infoSubtle,
          actionLabel: 'Answer',
          actionIcon: 'create-outline' as const,
        };
    }
  };

  const meta = getCategoryMeta();

  return (
    <View style={styles.cardContainer}>
      {/* Author & Header Row */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.authorSection}
          activeOpacity={0.8}
          onPress={() => onAuthorPress?.(post.author.id)}
        >
          <Avatar
            uri={post.author.avatar}
            name={post.author.name}
            size={40}
            isVerified={post.author.isVerified}
          />
          <View style={styles.authorMeta}>
            <View style={styles.authorNameRow}>
              <Text style={styles.authorName} numberOfLines={1}>
                {post.author.name}
              </Text>
              {post.author.isVerified ? (
                <Ionicons name="checkmark-circle" size={14} color={Colors.primary} style={{ marginLeft: 3 }} />
              ) : null}
            </View>
            <Text style={styles.authorSub} numberOfLines={1}>
              {post.author.role ? `${post.author.role}` : ''}
              {post.author.college ? ` • ${post.author.college}` : ''}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerRight}>
          <View style={[styles.typeBadge, { backgroundColor: meta.bgColor, borderColor: meta.color + '40' }]}>
            <Ionicons name={meta.icon} size={11} color={meta.color} />
            <Text style={[styles.typeBadgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          {isDemo ? (
            <View style={styles.demoBadge}>
              <Text style={styles.demoBadgeText}>DEMO</Text>
            </View>
          ) : null}
          <Text style={styles.timestampText}>{post.createdAt}</Text>
        </View>
      </View>

      {/* Main Content Area */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onCardPress?.(post)}
        disabled={!onCardPress}
      >
        <Text style={styles.title}>{post.title}</Text>
        <Text style={styles.content}>{post.content}</Text>

        {/* Ideas Specific: Problem & Proposed Solution */}
        {post.type === 'idea' && (post.problemStatement || post.proposedSolution) ? (
          <View style={styles.ideaDetailsBox}>
            {post.problemStatement && post.problemStatement !== post.content ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>PROBLEM:</Text>
                <Text style={styles.detailValue} numberOfLines={3}>
                  {post.problemStatement}
                </Text>
              </View>
            ) : null}
            {post.proposedSolution ? (
              <View style={[styles.detailRow, { marginTop: 6 }]}>
                <Text style={styles.detailLabel}>PROPOSED SOLUTION:</Text>
                <Text style={styles.detailValue} numberOfLines={3}>
                  {post.proposedSolution}
                </Text>
              </View>
            ) : null}
            {post.rolesNeeded && post.rolesNeeded.length > 0 ? (
              <View style={styles.rolesRow}>
                <Text style={styles.detailLabel}>LOOKING FOR:</Text>
                <View style={styles.rolesBadges}>
                  {post.rolesNeeded.map((r) => (
                    <Badge key={r} label={r} variant="primary" size="sm" />
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Services Specific: Pricing & Availability */}
        {post.type === 'service' && (post.servicePricing || post.serviceAvailability) ? (
          <View style={styles.serviceMetaRow}>
            {post.servicePricing ? (
              <View style={styles.servicePill}>
                <Ionicons name="pricetag-outline" size={13} color={Colors.accentCyan} />
                <Text style={styles.servicePillText}>{post.servicePricing}</Text>
              </View>
            ) : null}
            {post.serviceAvailability ? (
              <View style={styles.servicePill}>
                <Ionicons name="time-outline" size={13} color={Colors.textSecondary} />
                <Text style={styles.servicePillText}>{post.serviceAvailability}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Event / Hackathon Collab Specific */}
        {post.type === 'event_collab' && (post.eventName || post.eventRoleNeeded || post.eventDate) ? (
          <View style={styles.eventBox}>
            {post.eventName ? (
              <View style={styles.eventRow}>
                <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
                <Text style={styles.eventNameText}>{post.eventName}</Text>
              </View>
            ) : null}
            {post.eventRoleNeeded ? (
              <View style={[styles.eventRow, { marginTop: 4 }]}>
                <Ionicons name="person-add-outline" size={14} color={Colors.accentAmber} />
                <Text style={styles.eventRoleText}>Seeking: {post.eventRoleNeeded}</Text>
              </View>
            ) : null}
            {post.eventDate ? (
              <View style={[styles.eventRow, { marginTop: 4 }]}>
                <Ionicons name="alarm-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.eventDateText}>Event Date: {post.eventDate}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Project Links (GitHub, Demo) */}
        {post.type === 'project' && (post.demoUrl || post.githubUrl) ? (
          <View style={styles.linksRow}>
            {post.demoUrl ? (
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => handleOpenLink(post.demoUrl)}
                activeOpacity={0.7}
              >
                <Ionicons name="globe-outline" size={14} color={Colors.accentGreen} />
                <Text style={[styles.linkButtonText, { color: Colors.accentGreen }]}>Live Demo</Text>
              </TouchableOpacity>
            ) : null}
            {post.githubUrl ? (
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => handleOpenLink(post.githubUrl)}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-github" size={14} color={Colors.textPrimary} />
                <Text style={styles.linkButtonText}>GitHub</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* Post Images if any provided */}
        {post.images && post.images.length > 0 ? (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: post.images[0] }}
              style={styles.postImage}
              resizeMode="cover"
            />
          </View>
        ) : null}

        {/* Skills & Tags Chips */}
        {((post.skills && post.skills.length > 0) || (post.tags && post.tags.length > 0)) ? (
          <View style={styles.chipsRow}>
            {post.skills?.slice(0, 4).map((skill) => (
              <View key={skill} style={styles.skillChip}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
            {post.tags?.slice(0, 3).map((tag) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </TouchableOpacity>

      {isDemo ? (
        <View style={styles.demoNotice}>
          <Ionicons name="eye-outline" size={14} color={Colors.accentAmber} />
          <Text style={styles.demoNoticeText}>Design preview · demo content · no live actions</Text>
        </View>
      ) : (
      /* Action Footer Row */
      <View style={styles.actionsRow}>
        <View style={styles.leftMetrics}>
          {/* Like Action */}
          <TouchableOpacity
            style={[styles.actionBtn, post.isLiked && styles.actionBtnActive]}
            activeOpacity={0.7}
            onPress={() => onLike?.(post)}
          >
            <Ionicons
              name={post.isLiked ? 'heart' : 'heart-outline'}
              size={18}
              color={post.isLiked ? Colors.primary : Colors.textMuted}
            />
            <Text style={[styles.actionBtnText, post.isLiked && { color: Colors.primary }]}>
              {post.likesCount || 0}
            </Text>
          </TouchableOpacity>

          {/* Comment Action */}
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.7}
            onPress={() => onComment?.(post)}
          >
            <Ionicons name="chatbubble-outline" size={17} color={Colors.textMuted} />
            <Text style={styles.actionBtnText}>{post.commentsCount || 0}</Text>
          </TouchableOpacity>

          {/* Bookmark / Save */}
          <TouchableOpacity
            style={styles.iconOnlyBtn}
            activeOpacity={0.7}
            onPress={() => onSave?.(post)}
          >
            <Ionicons
              name={post.isSaved ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={post.isSaved ? Colors.primary : Colors.textMuted}
            />
          </TouchableOpacity>

          {/* Share Action */}
          <TouchableOpacity
            style={styles.iconOnlyBtn}
            activeOpacity={0.7}
            onPress={handleShare}
          >
            <Ionicons name="share-social-outline" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Primary Action Button (Collaborate / Contact / Volunteer) */}
        {onCollaborate ? (
          <TouchableOpacity
            style={[styles.collaborateBtn, { backgroundColor: meta.bgColor, borderColor: meta.color + '50' }]}
            activeOpacity={0.8}
            onPress={() => onCollaborate(post)}
          >
            <Ionicons name={meta.actionIcon} size={14} color={meta.color} />
            <Text style={[styles.collaborateBtnText, { color: meta.color }]}>
              {meta.actionLabel}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 14,
    ...Shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  authorMeta: {
    marginLeft: 10,
    flex: 1,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  authorSub: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  timestampText: {
    fontSize: 10,
    color: Colors.textSubtle,
    marginTop: 4,
  },
  demoBadge: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.accentAmber,
    backgroundColor: Colors.accentAmberSubtle,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginTop: 4,
  },
  demoBadgeText: {
    color: Colors.accentAmber,
    fontSize: 9,
    fontWeight: Typography.bold,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: Typography.title3,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    lineHeight: 24,
    marginBottom: 6,
  },
  content: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 10,
  },
  ideaDetailsBox: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.sm,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  detailRow: {
    gap: 2,
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.6,
  },
  detailValue: {
    fontSize: Typography.footnote,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  rolesRow: {
    marginTop: 8,
    gap: 4,
  },
  rolesBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  serviceMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  servicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
    gap: 5,
  },
  servicePillText: {
    fontSize: 11,
    fontWeight: Typography.semiBold,
    color: Colors.textPrimary,
  },
  eventBox: {
    backgroundColor: Colors.surfaceElevated,
    padding: 10,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventNameText: {
    fontSize: Typography.footnote,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  eventRoleText: {
    fontSize: 11,
    color: Colors.accentAmber,
    fontWeight: Typography.medium,
  },
  eventDateText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  linksRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.xs,
    gap: 5,
  },
  linkButtonText: {
    fontSize: 11,
    fontWeight: Typography.semiBold,
    color: Colors.textPrimary,
  },
  imageContainer: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  postImage: {
    width: '100%',
    height: 180,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  skillChip: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  skillText: {
    fontSize: 10,
    fontWeight: Typography.medium,
    color: Colors.textSecondary,
  },
  tagChip: {
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
    marginTop: 4,
  },
  demoNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  demoNoticeText: {
    color: Colors.accentAmber,
    fontSize: Typography.caption,
  },
  leftMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 5,
  },
  actionBtnActive: {
    opacity: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: Typography.semiBold,
    color: Colors.textMuted,
  },
  iconOnlyBtn: {
    paddingVertical: 4,
  },
  collaborateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: 5,
  },
  collaborateBtnText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
