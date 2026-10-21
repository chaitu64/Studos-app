import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { OpportunityCard } from '../../components/cards/OpportunityCard';
import { Chip } from '../../components/ui/Chip';
import { EmptyState } from '../../components/ui/EmptyState';
import { useApp } from '../../context/AppContext';
import { OpportunityType } from '../../types';

const CATEGORIES: ('All' | OpportunityType | 'Saved')[] = [
  'All',
  'Hackathon',
  'Fellowship',
  'AI Summit',
  'Internship',
  'Workshop',
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
    if (selectedCategory !== 'All' && opp.type !== selectedCategory) {
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
    filtered = [...filtered].sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {/* Search Bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={Colors.textMuted} />
          <TextInput
            placeholder="Search hackathons, grants, fellowships..."
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
      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
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
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.xs,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  verifiedInfoText: {
    fontSize: 10,
    color: Colors.textMuted,
    marginLeft: 6,
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: 30,
  },
});
