import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Project } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';

export interface ProjectCardProps {
  project: Project;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const handlePress = () => {
    router.push(`/projects/${project.id}` as any);
  };

  const getStatusVariant = (status: Project['status']) => {
    switch (status) {
      case 'Live / Shipped':
        return 'green';
      case 'MVP Ready':
        return 'cyan';
      default:
        return 'amber';
    }
  };

  return (
    <Card variant="default" style={styles.card} onPress={handlePress}>
      {/* Thumbnail */}
      {project.thumbnail ? (
        <View style={styles.thumbnailContainer}>
          <Image source={{ uri: project.thumbnail }} style={styles.thumbnail} />
          <View style={styles.statusBadgeOverlay}>
            <Badge
              label={project.status}
              variant={getStatusVariant(project.status)}
              size="sm"
            />
          </View>
        </View>
      ) : null}

      <View style={styles.content}>
        {/* Title & Likes */}
        <Text style={styles.title} numberOfLines={2}>{project.title}</Text>

        {/* Tagline */}
        <Text style={styles.tagline} numberOfLines={2}>
          {project.tagline}
        </Text>

        {/* Achievements if any */}
        {project.achievements && project.achievements.length > 0 ? (
          <View style={styles.achievementRow}>
            <Ionicons name="trophy" size={13} color={Colors.accentAmber} />
            <Text style={styles.achievementText} numberOfLines={1}>
              {project.achievements[0]}
            </Text>
          </View>
        ) : null}

        {/* Tech Stack */}
        <View style={styles.techRow}>
          {project.technologies.slice(0, 4).map((tech) => (
            <View key={tech} style={styles.techBadge}>
              <Text style={styles.techText}>{tech}</Text>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        {/* Footer: Contributors & External links */}
        <View style={styles.footer}>
          <View style={styles.contributorsRow}>
            {project.contributors.map((c, i) => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.contributorAvatar,
                  i > 0 ? { marginLeft: -10 } : undefined,
                ]}
                onPress={() => c.identity && router.push(`/student/${c.identity.type}/${c.identity.id}` as any)}
              >
                <Avatar uri={c.avatar} name={c.name} size={26} />
              </TouchableOpacity>
            ))}
            <Text style={styles.contributorsCount}>
              {project.contributors.length} {project.contributors.length === 1 ? 'builder' : 'builders'}
            </Text>
          </View>

          <View style={styles.linksRow}>
            {project.githubUrl ? (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  Linking.openURL(project.githubUrl!);
                }}
              >
                <Ionicons name="logo-github" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            ) : null}

            {project.demoUrl ? (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  Linking.openURL(project.demoUrl!);
                }}
              >
                <Ionicons name="open-outline" size={18} color={Colors.primary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 0,
    marginBottom: Spacing.md,
  },
  thumbnailContainer: {
    width: '100%',
    aspectRatio: 2.3,
    maxHeight: 168,
    position: 'relative',
    backgroundColor: Colors.surfaceElevated,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  statusBadgeOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  content: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: Typography.headline,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginLeft: 4,
    fontWeight: Typography.medium,
  },
  tagline: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 10,
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accentAmberSubtle,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.xs,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  achievementText: {
    fontSize: Typography.caption,
    color: Colors.accentAmber,
    marginLeft: 6,
    fontWeight: Typography.semiBold,
  },
  techRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  techBadge: {
    backgroundColor: Colors.surfaceHighlight,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.xs,
  },
  techText: {
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
  contributorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contributorAvatar: {
    borderWidth: 1.5,
    borderColor: Colors.card,
    borderRadius: 14,
  },
  contributorsCount: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginLeft: 8,
  },
  linksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    padding: 4,
  },
});
