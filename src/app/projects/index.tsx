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
import { ProjectCard } from '../../components/cards/ProjectCard';
import { Chip } from '../../components/ui/Chip';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useApp } from '../../context/AppContext';

export default function ProjectsScreen() {
  const { projects } = useApp();
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = projects.filter((p) => {
    if (selectedStatus !== 'All' && p.status !== selectedStatus) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inTitle = p.title.toLowerCase().includes(q);
      const inTagline = p.tagline.toLowerCase().includes(q);
      const inTech = p.technologies.some((t) => t.toLowerCase().includes(q));
      return inTitle || inTagline || inTech;
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {/* Search & Publish header */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={Colors.textMuted} />
          <TextInput
            placeholder="Search projects, technologies, awards..."
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
          title="Showcase"
          variant="primary"
          size="sm"
          icon={<Ionicons name="add" size={16} color="#FFF" />}
          onPress={() => router.push('/projects/create' as any)}
          style={{ paddingHorizontal: 12 }}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <Chip label="All Projects" selected={selectedStatus === 'All'} onPress={() => setSelectedStatus('All')} />
          <Chip label="🚀 Live / Shipped" selected={selectedStatus === 'Live / Shipped'} onPress={() => setSelectedStatus('Live / Shipped')} />
          <Chip label="⚡ MVP Ready" selected={selectedStatus === 'MVP Ready'} onPress={() => setSelectedStatus('MVP Ready')} />
          <Chip label="🛠 In Development" selected={selectedStatus === 'In Development'} onPress={() => setSelectedStatus('In Development')} />
        </ScrollView>
      </View>

      {/* Projects List */}
      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
        {filtered.length > 0 ? (
          filtered.map((project) => <ProjectCard key={project.id} project={project} />)
        ) : (
          <EmptyState
            icon="rocket-outline"
            title="No projects found"
            description="Be the first to publish a prototype or try different search terms."
            actionTitle="Publish a Project"
            onAction={() => router.push('/projects/create' as any)}
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
  searchRow: {
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
  filterRow: {
    marginBottom: 10,
  },
  filterScroll: {
    paddingHorizontal: Spacing.screenPadding,
    gap: 6,
  },
  listContainer: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: 30,
  },
});
