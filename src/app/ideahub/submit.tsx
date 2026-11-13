import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { useApp } from '../../context/AppContext';
import { ProjectStage, StudentRole } from '../../types';

const CATEGORIES: ('AI / GenAI' | 'HealthTech' | 'Climate / CleanTech' | 'EdTech' | 'Web3 / FinTech' | 'Robotics & IoT' | 'Developer Tools')[] = [
  'AI / GenAI',
  'HealthTech',
  'Climate / CleanTech',
  'EdTech',
  'Web3 / FinTech',
  'Robotics & IoT',
  'Developer Tools',
];

const STAGES: ProjectStage[] = ['Concept', 'Research', 'Prototype', 'MVP', 'Launched'];

const AVAILABLE_ROLES: StudentRole[] = [
  'Developer',
  'AI/ML Engineer',
  'UI/UX Designer',
  'Hardware Engineer',
  'Researcher',
  'Founder / Product',
  'Business / Growth',
];

export default function SubmitIdeaScreen() {
  const { submitIdea } = useApp();

  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [proposedSolution, setProposedSolution] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [category, setCategory] = useState<typeof CATEGORIES[0]>('AI / GenAI');
  const [stage, setStage] = useState<ProjectStage>('Concept');
  const [skillsInput, setSkillsInput] = useState('');
  const [linksInput, setLinksInput] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<StudentRole[]>(['Developer']);
  const [teamSizeNeeded, setTeamSizeNeeded] = useState(3);
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleRole = (r: StudentRole) => {
    if (selectedRoles.includes(r)) {
      if (selectedRoles.length > 1) {
        setSelectedRoles(selectedRoles.filter((item) => item !== r));
      }
    } else {
      setSelectedRoles([...selectedRoles, r]);
    }
  };

  const validate = () => {
    const err: Record<string, string> = {};
    if (!title.trim()) err.title = 'Title is required';
    if (!tagline.trim()) err.tagline = 'Tagline is required';
    if (!problemStatement.trim()) err.problem = 'Problem statement is required';
    if (!proposedSolution.trim()) err.solution = 'Proposed solution is required';
    if (!targetAudience.trim()) err.targetAudience = 'Target audience is required';
    if (!skillsInput.trim()) err.skills = 'Please enter at least one technical skill';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Alert.alert('Required Fields', 'Please fill in all required fields before publishing.');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedSkills = skillsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const links = linksInput.split(/[\n,]+/).map((value) => value.trim()).filter(Boolean);
      if (links.some((value) => { try { return !['https:', 'http:'].includes(new URL(value).protocol); } catch { return true; } })) {
        Alert.alert('Invalid link', 'Use complete HTTP or HTTPS URLs.');
        return;
      }

      const created = await submitIdea({
        title: title.trim(),
        tagline: tagline.trim(),
        problemStatement: problemStatement.trim(),
        proposedSolution: proposedSolution.trim(),
        targetAudience: targetAudience.trim(),
        category,
        stage,
        requiredSkills: parsedSkills,
        teamSizeNeeded,
        currentTeamSize: 1,
        rolesNeeded: selectedRoles,
        visibility: 'Public',
        roadmap: [
          { phase: 'Phase 1', title: 'Problem Discovery & Architecture Spec', completed: true },
          { phase: 'Phase 2', title: 'Prototype & Core MVP Development', completed: false },
          { phase: 'Phase 3', title: 'Collegiate Beta Testing', completed: false },
        ],
        tags: [category, stage],
        resources: links.map((url) => ({ label: 'Related link', url })),
      });

      Alert.alert(
        'Idea Published!',
        'Your idea is now live on IdeaHub. Collaborators will be matched based on your required skills.',
        [
          {
            text: 'View Idea',
            onPress: () => router.replace(`/ideahub/${created.id}` as any),
          },
        ]
      );
    } catch {
      Alert.alert('Error', 'Failed to publish idea. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.titleText}>Submit an Innovation Idea</Text>
          <Text style={styles.subtitleText}>
            Describe what you want to solve, what skills you need, and find student partners.
          </Text>
        </View>

        {/* Live Preview Toggle */}
        <View style={styles.previewToggleRow}>
          <Button
            title={showPreview ? 'Back to Editor' : '👁 Preview Submission'}
            variant="outline"
            size="sm"
            onPress={() => setShowPreview(!showPreview)}
          />
        </View>

        {showPreview ? (
          <Card variant="elevated" style={styles.previewCard}>
            <View style={styles.previewBadgeRow}>
              <Badge label={category} variant="primary" size="sm" />
              <Badge label={stage} variant="purple" size="sm" />
            </View>
            <Text style={styles.previewTitle}>{title || 'Untitled Project Idea'}</Text>
            <Text style={styles.previewTagline}>{tagline || 'Short descriptive tagline will appear here.'}</Text>
            <View style={styles.previewSection}>
              <Text style={styles.previewLabel}>PROBLEM</Text>
              <Text style={styles.previewBody}>{problemStatement || 'Problem description...'}</Text>
            </View>
            <View style={styles.previewSection}>
              <Text style={styles.previewLabel}>SOLUTION</Text>
              <Text style={styles.previewBody}>{proposedSolution || 'Proposed tech solution...'}</Text>
            </View>
            <View style={styles.previewSection}>
              <Text style={styles.previewLabel}>ROLES NEEDED</Text>
              <View style={styles.previewChipsRow}>
                {selectedRoles.map((r) => (
                  <Badge key={r} label={r} variant="cyan" size="sm" />
                ))}
              </View>
            </View>
          </Card>
        ) : (
          <View style={styles.form}>
            {/* Title */}
            <Input
              label="Idea Title *"
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. MedVision AR, SustainaByte"
              error={errors.title}
            />

            {/* Tagline */}
            <Input
              label="Short Tagline *"
              value={tagline}
              onChangeText={setTagline}
              placeholder="e.g. Offline clinical decision support on edge hardware."
              error={errors.tagline}
            />

            {/* Category */}
            <View style={styles.fieldSection}>
              <Text style={styles.fieldLabel}>DOMAIN / CATEGORY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                {CATEGORIES.map((cat) => (
                  <Chip
                    key={cat}
                    label={cat}
                    selected={category === cat}
                    onPress={() => setCategory(cat)}
                  />
                ))}
              </ScrollView>
            </View>

            {/* Project Stage */}
            <View style={styles.fieldSection}>
              <Text style={styles.fieldLabel}>CURRENT STAGE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                {STAGES.map((s) => (
                  <Chip
                    key={s}
                    label={s}
                    selected={stage === s}
                    onPress={() => setStage(s)}
                  />
                ))}
              </ScrollView>
            </View>

            {/* Problem Statement */}
            <Input
              label="Problem Statement *"
              multiline
              numberOfLines={4}
              value={problemStatement}
              onChangeText={setProblemStatement}
              placeholder="Who experiences this problem? What is broken or costly about the status quo?"
              error={errors.problem}
            />

            {/* Proposed Solution */}
            <Input
              label="Proposed Solution *"
              multiline
              numberOfLines={4}
              value={proposedSolution}
              onChangeText={setProposedSolution}
              placeholder="How does your technical solution address this problem?"
              error={errors.solution}
            />

            {/* Target Audience */}
            <Input
              label="Target Audience *"
              value={targetAudience}
              onChangeText={setTargetAudience}
              placeholder="e.g. Rural field clinicians, university researchers"
              error={errors.targetAudience}
            />

            {/* Required Skills */}
            <Input
              label="Required Skills (comma-separated) *"
              value={skillsInput}
              onChangeText={setSkillsInput}
              placeholder="PyTorch, React Native, ROS2, Docker"
              error={errors.skills}
              helperText="Students with matching skills will receive recommendations."
            />
            <Input label="Related links (optional)" value={linksInput} onChangeText={setLinksInput} placeholder="https://… (one per line)" autoCapitalize="none" keyboardType="url" multiline />

            {/* Roles Needed */}
            <View style={styles.fieldSection}>
              <Text style={styles.fieldLabel}>COLLABORATOR ROLES SOUGHT</Text>
              <View style={styles.rolesGrid}>
                {AVAILABLE_ROLES.map((role) => (
                  <Chip
                    key={role}
                    label={role}
                    selected={selectedRoles.includes(role)}
                    onPress={() => toggleRole(role)}
                    style={{ marginBottom: 8 }}
                  />
                ))}
              </View>
            </View>

            {/* Target Team Size */}
            <View style={styles.fieldSection}>
              <Text style={styles.fieldLabel}>TARGET SQUAD SIZE: {teamSizeNeeded} BUILDERS</Text>
              <View style={styles.teamSizeRow}>
                {[2, 3, 4, 5, 6].map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.sizeBtn,
                      teamSizeNeeded === num ? styles.sizeBtnSelected : undefined,
                    ]}
                    onPress={() => setTeamSizeNeeded(num)}
                  >
                    <Text
                      style={[
                        styles.sizeBtnText,
                        teamSizeNeeded === num ? styles.sizeBtnTextSelected : undefined,
                      ]}
                    >
                      {num}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Button
              title="Publish Idea to IdeaHub"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              onPress={handleSubmit}
              style={{ marginTop: 24, marginBottom: 40 }}
            />
          </View>
        )}
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
    marginBottom: 16,
  },
  titleText: {
    fontSize: Typography.title2,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  subtitleText: {
    fontSize: Typography.body,
    color: Colors.textMuted,
    lineHeight: 20,
    marginTop: 4,
  },
  previewToggleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  form: {
    gap: 4,
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
  chipsScroll: {
    flexDirection: 'row',
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  teamSizeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sizeBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeBtnSelected: {
    backgroundColor: Colors.primarySubtle,
    borderColor: Colors.primary,
  },
  sizeBtnText: {
    fontSize: Typography.headline,
    fontWeight: Typography.bold,
    color: Colors.textSecondary,
  },
  sizeBtnTextSelected: {
    color: Colors.primary,
  },
  previewCard: {
    padding: 18,
    marginBottom: 24,
  },
  previewBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  previewTitle: {
    fontSize: Typography.title2,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  previewTagline: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  previewSection: {
    marginBottom: 12,
  },
  previewLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  previewBody: {
    fontSize: Typography.footnote,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  previewChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
});
