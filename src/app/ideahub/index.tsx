import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { IdeaCard } from '../../components/cards/IdeaCard';
import { Chip } from '../../components/ui/Chip';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { SearchField } from '../../components/ui/SearchField';
import { useApp } from '../../context/AppContext';
import { ProjectStage } from '../../types';

const STAGE_FILTERS: ('All' | ProjectStage)[] = [
  'All',
  'Concept',
  'Research',
  'Prototype',
  'MVP',
  'Launched',
];

export default function IdeaHubScreen() {
  const { ideas } = useApp();
  const [selectedTab, setSelectedTab] = useState<'trending' | 'new' | 'seeking' | 'matching'>('trending');
  const [selectedStage, setSelectedStage] = useState<'All' | ProjectStage>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredIdeas = ideas.filter((i) => {
    // Stage
    if (selectedStage !== 'All' && i.stage !== selectedStage) return false;
    // Tab
    if (selectedTab === 'seeking' && i.currentTeamSize >= i.teamSizeNeeded) return false;
    if (selectedTab === 'matching' && !i.requiredSkills.some((s) => ['PyTorch', 'React Native', 'TypeScript', 'AI'].includes(s))) return false;
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inTitle = i.title.toLowerCase().includes(q);
      const inTagline = i.tagline.toLowerCase().includes(q);
      const inSkills = i.requiredSkills.some((s) => s.toLowerCase().includes(q));
      return inTitle || inTagline || inSkills;
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {/* Search & Submit header */}
      <View style={styles.searchContainer}>
        <SearchField
          accessibilityLabel="Search ideas"
          placeholder="Search ideas, problems, or skills"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchField}
        />

        <Button
          title="Submit Idea"
          variant="primary"
          size="sm"
          icon={<Ionicons name="add" size={16} color="#FFF" />}
          onPress={() => router.push('/ideahub/submit' as any)}
          style={styles.submitBtn}
        />
      </View>

      {/* Main Tabs */}
      <View style={styles.tabsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          <Chip label="🔥 Trending" selected={selectedTab === 'trending'} onPress={() => setSelectedTab('trending')} />
          <Chip label="⚡ Seeking Teammates" selected={selectedTab === 'seeking'} onPress={() => setSelectedTab('seeking')} />
          <Chip label="🎯 Matches Your Skills" selected={selectedTab === 'matching'} onPress={() => setSelectedTab('matching')} />
          <Chip label="✨ New" selected={selectedTab === 'new'} onPress={() => setSelectedTab('new')} />
        </ScrollView>
      </View>

      {/* Stage sub-filter */}
      <View style={styles.stagesRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {STAGE_FILTERS.map((stage) => (
            <TouchableOpacity
              key={stage}
              style={[
                styles.stagePill,
                selectedStage === stage ? styles.stagePillSelected : undefined,
              ]}
              onPress={() => setSelectedStage(stage)}
            >
              <Text
                style={[
                  styles.stagePillText,
                  selectedStage === stage ? styles.stagePillTextSelected : undefined,
                ]}
              >
                {stage}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Ideas List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {filteredIdeas.length > 0 ? (
          filteredIdeas.map((idea) => <IdeaCard key={idea.id} idea={idea} onOpen={(item) => router.push({ pathname: '/ideahub/[id]', params: { id: item.id, isDemo: 'true' } } as never)} />)
        ) : (
          <EmptyState
            icon="bulb-outline"
            title="No ideas match filters"
            description="Be the first to submit a project concept or adjust your search keywords."
            actionTitle="Submit Your Idea"
            onAction={() => router.push('/ideahub/submit' as any)}
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
  searchField: {
    flex: 1,
    minWidth: 0,
  },
  submitBtn: {
    paddingHorizontal: 12,
  },
  tabsRow: {
    marginBottom: 8,
  },
  tabsScroll: {
    paddingHorizontal: Spacing.screenPadding,
    gap: 6,
  },
  stagesRow: {
    marginBottom: 10,
  },
  stagePill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.xs,
    backgroundColor: Colors.surfaceHighlight,
    marginRight: 6,
  },
  stagePillSelected: {
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  stagePillText: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    fontWeight: Typography.medium,
  },
  stagePillTextSelected: {
    color: Colors.primary,
    fontWeight: Typography.bold,
  },
  listContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: 30,
  },
});
