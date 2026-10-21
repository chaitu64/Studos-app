import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  Share,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useApp } from '../../context/AppContext';

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { projects } = useApp();

  const project = projects.find((p) => p.id === id);
  const [likesCount, setLikesCount] = useState(project?.likes || 0);
  const [isLiked, setIsLiked] = useState(project?.isLiked || false);

  if (!project) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>Project not found</Text>
        <Button title="Back to Showcase" variant="primary" onPress={() => router.back()} />
      </View>
    );
  }

  const handleToggleLike = () => {
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${project.title} on StuDos: ${project.demoUrl || project.githubUrl || ''}`,
      });
    } catch {
      // ignore
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Project Thumbnail */}
        {project.thumbnail ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: project.thumbnail }} style={styles.thumbnail} />
            <View style={styles.statusBadgeOverlay}>
              <Badge label={project.status} variant="green" size="md" />
            </View>
          </View>
        ) : null}

        {/* Title & Tagline */}
        <Text style={styles.title}>{project.title}</Text>
        <Text style={styles.tagline}>{project.tagline}</Text>

        {/* Action Row: Like, Share, External Links */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.likeBtn, isLiked ? styles.likeBtnActive : undefined]}
            onPress={handleToggleLike}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={18}
              color={isLiked ? '#FFF' : Colors.primary}
            />
            <Text style={[styles.likeText, isLiked ? { color: '#FFF' } : undefined]}>
              {likesCount} {likesCount === 1 ? 'Star' : 'Stars'}
            </Text>
          </TouchableOpacity>

          <View style={styles.linkGroup}>
            {project.githubUrl ? (
              <Button
                title="Code"
                variant="secondary"
                size="sm"
                icon={<Ionicons name="logo-github" size={16} color={Colors.textPrimary} />}
                onPress={() => Linking.openURL(project.githubUrl!)}
              />
            ) : null}

            {project.demoUrl ? (
              <Button
                title="Live Demo"
                variant="primary"
                size="sm"
                icon={<Ionicons name="open-outline" size={16} color="#FFF" />}
                onPress={() => Linking.openURL(project.demoUrl!)}
                style={{ marginLeft: 8 }}
              />
            ) : null}

            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Achievements if any */}
        {project.achievements && project.achievements.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>VALIDATED AWARDS & RECOGNITION</Text>
            <View style={styles.awardsList}>
              {project.achievements.map((ach) => (
                <View key={ach} style={styles.awardItem}>
                  <Ionicons name="trophy" size={16} color={Colors.accentAmber} />
                  <Text style={styles.awardText}>{ach}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT THE BUILD</Text>
          <Text style={styles.bodyText}>{project.description}</Text>
        </View>

        {/* Tech Stack */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TECHNOLOGIES & FRAMEWORKS</Text>
          <View style={styles.chipsWrap}>
            {project.technologies.map((t) => (
              <Badge key={t} label={t} variant="outline" size="md" />
            ))}
          </View>
        </View>

        {/* Contributors */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BUILDERS & CONTRIBUTORS ({project.contributors.length})</Text>
          <View style={styles.contributorsList}>
            {project.contributors.map((c) => (
              <Card key={c.id} variant="default" style={styles.contributorCard}>
                <Avatar uri={c.avatar} name={c.name} size={40} />
                <View style={styles.contributorInfo}>
                  <Text style={styles.contributorName}>{c.name}</Text>
                  <Text style={styles.contributorRole}>{c.role}</Text>
                </View>
                <Button
                  title="Connect"
                  variant="outline"
                  size="sm"
                  onPress={() => router.push('/(tabs)/discover' as any)}
                />
              </Card>
            ))}
          </View>
        </View>
      </ScrollView>
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
    padding: 20,
  },
  notFoundText: {
    fontSize: Typography.headline,
    color: Colors.textMuted,
    marginBottom: 16,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceElevated,
    position: 'relative',
    marginBottom: 16,
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
  title: {
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
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.md,
  },
  likeBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  likeText: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginLeft: 6,
  },
  linkGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shareBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
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
  awardsList: {
    gap: 8,
  },
  awardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accentAmberSubtle,
    padding: 10,
    borderRadius: BorderRadius.sm,
  },
  awardText: {
    fontSize: Typography.footnote,
    fontWeight: Typography.semiBold,
    color: Colors.accentAmber,
    marginLeft: 8,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  contributorsList: {
    gap: 10,
  },
  contributorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: Colors.surfaceElevated,
  },
  contributorInfo: {
    flex: 1,
    marginLeft: 10,
  },
  contributorName: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  contributorRole: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
  },
});
