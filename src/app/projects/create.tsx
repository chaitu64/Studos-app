import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing } from '../../constants/theme';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { useApp } from '../../context/AppContext';
import { Project } from '../../types';

const STATUSES: Project['status'][] = ['Live / Shipped', 'MVP Ready', 'In Development'];

export default function CreateProjectScreen() {
  const { submitProject } = useApp();

  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [technologiesInput, setTechnologiesInput] = useState('');
  const [status, setStatus] = useState<Project['status']>('MVP Ready');
  const [demoUrl, setDemoUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [achievement, setAchievement] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !tagline.trim() || !description.trim()) {
      Alert.alert('Required Fields', 'Please complete title, tagline, and project description.');
      return;
    }

    setIsSubmitting(true);
    try {
      const techList = technologiesInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const created = await submitProject({
        title: title.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        thumbnail:
          'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop&q=80',
        technologies: techList.length > 0 ? techList : ['React Native', 'TypeScript'],
        status,
        demoUrl: demoUrl.trim() || undefined,
        githubUrl: githubUrl.trim() || undefined,
        achievements: achievement.trim() ? [achievement.trim()] : undefined,
      });

      Alert.alert('Project Published!', 'Your project is now in the StuDos portfolio showcase.', [
        {
          text: 'View Project',
          onPress: () => router.replace(`/projects/${created.id}` as any),
        },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to publish project. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Showcase Your Engineering</Text>
          <Text style={styles.subtitle}>
            Demonstrate what you built, credit collaborators, and link code repositories.
          </Text>
        </View>

        <Input
          label="Project Title *"
          placeholder="e.g. AeroGlide, HyperDraft"
          value={title}
          onChangeText={setTitle}
        />

        <Input
          label="Tagline *"
          placeholder="e.g. Autonomous Solar UAV with edge computer vision"
          value={tagline}
          onChangeText={setTagline}
        />

        {/* Status */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>DEVELOPMENT STATUS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {STATUSES.map((s) => (
              <Chip
                key={s}
                label={s}
                selected={status === s}
                onPress={() => setStatus(s)}
              />
            ))}
          </ScrollView>
        </View>

        <Input
          label="Technologies Used (comma-separated) *"
          placeholder="React Native, PyTorch, ROS2, Docker"
          value={technologiesInput}
          onChangeText={setTechnologiesInput}
        />

        <Input
          label="GitHub Repository Link"
          placeholder="https://github.com/username/project"
          value={githubUrl}
          onChangeText={setGithubUrl}
        />

        <Input
          label="Live Demo Link"
          placeholder="https://yourproject.tech"
          value={demoUrl}
          onChangeText={setDemoUrl}
        />

        <Input
          label="Awards / Achievements (Optional)"
          placeholder="e.g. 1st Place CalHacks Hardware Track"
          value={achievement}
          onChangeText={setAchievement}
        />

        <Input
          label="Full Project Story & Technical Architecture *"
          multiline
          numberOfLines={4}
          placeholder="What motivated the project? What architecture decisions were made? What were the biggest hurdles?"
          value={description}
          onChangeText={setDescription}
        />

        <Button
          title="Publish to Showcase"
          variant="primary"
          size="lg"
          loading={isSubmitting}
          onPress={handleSubmit}
          style={{ marginTop: 20, marginBottom: 40 }}
        />
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
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: Typography.title2,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: Typography.body,
    color: Colors.textMuted,
    lineHeight: 20,
    marginTop: 4,
  },
  fieldSection: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
});
