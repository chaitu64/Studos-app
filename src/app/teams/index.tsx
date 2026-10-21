import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { TeamCard } from '../../components/cards/TeamCard';
import { Chip } from '../../components/ui/Chip';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useApp } from '../../context/AppContext';
import { StudentRole } from '../../types';

const ROLES: (StudentRole | 'All')[] = [
  'All',
  'Developer',
  'AI/ML Engineer',
  'UI/UX Designer',
  'Hardware Engineer',
  'Researcher',
  'Business / Growth',
];

export default function TeamsScreen() {
  const { teams } = useApp();
  const [selectedRole, setSelectedRole] = useState<StudentRole | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTeams = teams.filter((team) => {
    // Role filter
    if (selectedRole !== 'All') {
      const hasRole = team.openRoles.some((r) => r.role === selectedRole && !r.filled);
      if (!hasRole) return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inName = team.name.toLowerCase().includes(q);
      const inTagline = team.tagline.toLowerCase().includes(q);
      const inDomain = team.projectDomain.toLowerCase().includes(q);
      const inEvent = (team.hackathonOrEvent || '').toLowerCase().includes(q);
      return inName || inTagline || inDomain || inEvent;
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {/* Search & Create Button */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={Colors.textMuted} />
          <TextInput
            placeholder="Search teams, hackathons, open roles..."
            placeholderTextColor={Colors.textSubtle}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <Button
          title="Create Team"
          variant="primary"
          size="sm"
          icon={<Ionicons name="people" size={16} color="#FFF" />}
          onPress={() => router.push('/teams/create' as any)}
          style={styles.createBtn}
        />
      </View>

      {/* Role Filter Chips */}
      <View style={styles.rolesSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rolesScroll}>
          {ROLES.map((r) => (
            <Chip
              key={r}
              label={r}
              selected={selectedRole === r}
              onPress={() => setSelectedRole(r)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Teams List */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {filteredTeams.length > 0 ? (
          filteredTeams.map((team) => <TeamCard key={team.id} team={team} />)
        ) : (
          <EmptyState
            icon="people-outline"
            title="No matching teams found"
            description="Try filtering by another role or start your own team for an upcoming hackathon."
            actionTitle="Form a Squad"
            onAction={() => router.push('/teams/create' as any)}
          />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Typography.body,
    marginLeft: 8,
  },
  createBtn: {
    paddingHorizontal: 12,
  },
  rolesSection: {
    marginBottom: 10,
  },
  rolesScroll: {
    paddingHorizontal: Spacing.screenPadding,
    gap: 6,
  },
  listContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: 30,
  },
});
