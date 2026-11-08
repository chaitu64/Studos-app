import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { OpportunityCard } from '../../components/cards/OpportunityCard';
import { Chip } from '../../components/ui/Chip';
import { EmptyState } from '../../components/ui/EmptyState';
import { SearchField } from '../../components/ui/SearchField';
import { useApp } from '../../context/AppContext';
import { OpportunityType } from '../../types';

const CATEGORIES: ('All' | OpportunityType | 'Saved')[] = [
  'All',
  'Hackathon',
  'Internship',
  'Job',
  'Competition',
  'Quiz',
  'Scholarship',
  'Workshop',
  'Conference',
  'Saved',
];

export default function OpportunitiesScreen() {
  const { opportunities } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[0]>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortByDeadline, setSortByDeadline] = useState(true);

  let filtered = opportunities.filter((opp) => {
    if (selectedCategory === 'Saved') {
      return !!opp.isSaved;
    }
    if (selectedCategory !== 'All' && opp.type !== selectedCategory && opp.category !== (selectedCategory as any)) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inTitle = opp.title.toLowerCase().includes(q);
      const inOrg = opp.organizer.toLowerCase().includes(q);
      const inDesc = opp.description.toLowerCase().includes(q);
      const inSkills = opp.requiredSkills.some((s) => s.toLowerCase().includes(q));
      return inTitle || inOrg || inDesc || inSkills;
    }
    return true;
  });

  if (sortByDeadline) {
    filtered = [...filtered].sort((a, b) => (a.daysRemaining || 999) - (b.daysRemaining || 999));
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {/* Search Bar */}
      <View style={styles.searchRow}>
        <SearchField
          accessibilityLabel="Search opportunities"
          placeholder="Search hackathons, grants, or internships"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchField}
        />

        <TouchableOpacity
          style={[styles.sortBtn, sortByDeadline ? styles.sortBtnActive : undefined]}
          onPress={() => setSortByDeadline(!sortByDeadline)}
        >
          <Ionicons
            name="hourglass-outline"
            size={18}
            color={sortByDeadline ? Colors.primary : Colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      {/* Category Tabs */}
      <View style={styles.categoriesRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
          {CATEGORIES.map((cat) => (
            <Chip
              key={cat}
              label={cat === 'Saved' ? '🔖 Saved' : cat}
              selected={selectedCategory === cat}
              onPress={() => setSelectedCategory(cat)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Verified Info Pill */}
      <View style={styles.verifiedInfoBanner}>
        <Ionicons name="shield-checkmark" size={14} color={Colors.primary} />
        <Text style={styles.verifiedInfoText}>
          All events and application deadlines are verified against official university & company programs.
        </Text>
      </View>

      {/* Opportunities List */}
      <ScrollView
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {filtered.length > 0 ? (
          filtered.map((opp) => <OpportunityCard key={opp.id} opportunity={opp} />)
        ) : (
          <EmptyState
            icon="calendar-outline"
            title="No opportunities found"
            description={
              selectedCategory === 'Saved'
                ? 'You have not bookmarked any opportunities yet.'
                : 'Try adjusting your search keywords or clear category filters.'
            }
            actionTitle={selectedCategory === 'Saved' ? 'Explore All' : undefined}
            onAction={selectedCategory === 'Saved' ? () => setSelectedCategory('All') : undefined}
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
  searchField: {
    flex: 1,
    minWidth: 0,
  },
  sortBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySubtle,
  },
  categoriesRow: {
    marginBottom: 8,
  },
  categoriesScroll: {
    paddingHorizontal: Spacing.screenPadding,
    gap: 6,
  },
  verifiedInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    marginHorizontal: Spacing.screenPadding,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.xs,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  verifiedInfoText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: 6,
    flex: 1,
    lineHeight: 17,
  },
  listContainer: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: 30,
  },
});
