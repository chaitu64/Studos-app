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
import { ProjectStage, StudentRole } from '../../types';

const STAGES: ProjectStage[] = ['Concept', 'Research', 'Prototype', 'MVP', 'Launched'];

const ROLES: StudentRole[] = [
  'Developer',
  'AI/ML Engineer',
  'UI/UX Designer',
  'Hardware Engineer',
  'Researcher',
  'Business / Growth',
];

export default function CreateTeamScreen() {
  const { createTeam } = useApp();

  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [projectDomain, setProjectDomain] = useState('Robotics & Assistive Tech');
  const [hackathonOrEvent, setHackathonOrEvent] = useState('');
  const [stage, setStage] = useState<ProjectStage>('Prototype');
  const [selectedRoles, setSelectedRoles] = useState<StudentRole[]>(['Developer', 'AI/ML Engineer']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleRole = (r: StudentRole) => {
    if (selectedRoles.includes(r)) {
      if (selectedRoles.length > 1) {
        setSelectedRoles(selectedRoles.filter((item) => item !== r));
      }
    } else {
      setSelectedRoles([...selectedRoles, r]);
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || !tagline.trim() || !description.trim()) {
      Alert.alert('Required Fields', 'Please complete all team information.');
      return;
    }

    setIsSubmitting(true);
    try {
      const openRoles = selectedRoles.map((role) => ({
        role,
        skills: ['Team Player', 'Fast Learner'],
        commitment: '12-15 hrs/wk',
        filled: false,
      }));

      const created = await createTeam({
        name: name.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        projectDomain,
        hackathonOrEvent: hackathonOrEvent.trim() || undefined,
        stage,
        openRoles,
      });

      Alert.alert('Team Created!', 'Your squad recruitment listing is live.', [
        {
          text: 'View Team',
          onPress: () => router.replace(`/teams/${created.id}` as any),
        },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to create team. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Recruit Your Dream Squad</Text>
          <Text style={styles.subtitle}>
            Post an open call for hackathons, research labs, or venture competitions.
          </Text>
        </View>

        <Input
          label="Team / Project Name *"
          placeholder="e.g. NeuroLink Hackers, AuraGrid"
          value={name}
          onChangeText={setName}
        />

        <Input
          label="Tagline *"
          placeholder="e.g. Eye-tracking wheelchair for TreeHacks 2026"
          value={tagline}
          onChangeText={setTagline}
        />

        <Input
          label="Target Hackathon / Competition (Optional)"
          placeholder="e.g. TreeHacks 2026, MIT $100K Challenge"
          value={hackathonOrEvent}
          onChangeText={setHackathonOrEvent}
        />

        <Input
          label="Project Domain *"
          placeholder="e.g. Robotics & Assistive Tech, HealthTech, AI"
          value={projectDomain}
          onChangeText={setProjectDomain}
        />

        {/* Project Stage */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>PROJECT STAGE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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

        {/* Open Roles */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>ROLES YOU ARE RECRUITING FOR</Text>
          <View style={styles.rolesGrid}>
            {ROLES.map((role) => (
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

        <Input
          label="Team Mission & Description *"
          multiline
          numberOfLines={4}
          placeholder="Describe your project, current progress, hardware/software stack, and what you expect from teammates."
          value={description}
          onChangeText={setDescription}
        />

        <Button
          title="Publish Team Listing"
          variant="primary"
          size="lg"
          loading={isSubmitting}
          onPress={handleCreate}
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
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
