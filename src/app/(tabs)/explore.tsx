import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { OpportunityCard } from '../../components/cards/OpportunityCard';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { CardSkeleton } from '../../components/ui/Skeleton';
import { Opportunity, OpportunityCategory } from '../../types';
import { dataService } from '../../services/dataService';
import { Header } from '../../components/navigation/Header';

// The 8 Retained Categories (Cultural Events removed as required)
const ALL_CATEGORIES: (OpportunityCategory | 'All')[] = [
  'All',
  'Hackathons',
  'Internships',
  'Jobs',
  'Competitions',
  'Quizzes',
  'Scholarships',
  'Workshops',
  'Conferences / Meets',
];

const FORMAT_OPTIONS = ['All', 'Online', 'In-Person', 'Hybrid'];

const DEADLINE_OPTIONS = [
  'All Deadlines',
  'Closing in 3 days',
  'Closing in 7 days',
  'Closing in 14 days',
  'Closing in 30 days',
];

const PAYMENT_OPTIONS = [
  'Free registration',
  'Paid registration',
  'Prizes & Rewards',
  'Stipends',
];

type SortOption = 'deadline' | 'recent' | 'prize';

function uniqueOpportunities(items: Opportunity[]): Opportunity[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export default function ExploreScreen() {
  const params = useLocalSearchParams<{ category?: string; query?: string }>();
  const insets = useSafeAreaInsets();

  // Search input and debounce state
  const [searchQuery, setSearchQuery] = useState(params.query || '');
  const [debouncedSearch, setDebouncedSearch] = useState(params.query || '');
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Category selections
  const [userSelectedCategory, setUserSelectedCategory] = useState<string | null>(null);
  const selectedCategory = userSelectedCategory ?? (params.category || 'All');

  const [userSelectedCategories, setUserSelectedCategories] = useState<string[] | null>(null);
  const selectedCategories = useMemo(() => {
    if (userSelectedCategories !== null) return userSelectedCategories;
    if (params.category && params.category !== 'All') return [params.category];
    return [];
  }, [userSelectedCategories, params.category]);

  // Modal filters
  const [selectedFormat, setSelectedFormat] = useState<string>('All');
  const [selectedTeamSizes, setSelectedTeamSizes] = useState<string[]>([]);
  const [selectedDeadlineFilter, setSelectedDeadlineFilter] = useState<string>('All Deadlines');
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [keywordFilter, setKeywordFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('deadline');

  // Filter modal draft state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [draftCategories, setDraftCategories] = useState<string[]>([]);
  const [draftFormat, setDraftFormat] = useState<string>('All');
  const [draftTeamSizes, setDraftTeamSizes] = useState<string[]>([]);
  const [draftDeadline, setDraftDeadline] = useState<string>('All Deadlines');
  const [draftPayments, setDraftPayments] = useState<string[]>([]);
  const [draftKeywordFilter, setDraftKeywordFilter] = useState('');

  // Feed master data and states
  const [masterFeed, setMasterFeed] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const teamSizeOptions = useMemo(
    () => Array.from(new Set(masterFeed.map((item) => item.teamSize).filter((value): value is string => Boolean(value && value !== 'Not specified')))),
    [masterFeed]
  );

  // Initial load
  useEffect(() => {
    let ignore = false;

    const loadMasterData = async () => {
      try {
        const data = await dataService.getOpportunities();
        if (!ignore) {
          setMasterFeed(uniqueOpportunities(data));
          setHasError(false);
          setErrorMessage('');
          setIsLoading(false);
        }
      } catch (err: any) {
        if (!ignore) {
          setHasError(true);
          setErrorMessage(
            err?.message ||
              'Unable to connect to live opportunity sources. Please verify your connection.'
          );
          setIsLoading(false);
        }
      }
    };

    loadMasterData();

    return () => {
      ignore = true;
    };
  }, []);

  // Pull-to-refresh
  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await dataService.getOpportunities({ forceRefresh: true });
      setMasterFeed(uniqueOpportunities(data));
      setHasError(false);
      setErrorMessage('');
    } catch (err: any) {
      setHasError(true);
      setErrorMessage(err?.message || 'Failed to refresh opportunities.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Compute active category array
  const activeCategories = useMemo(() => {
    if (selectedCategories.length > 0) return selectedCategories;
    if (selectedCategory !== 'All') return [selectedCategory];
    return [];
  }, [selectedCategories, selectedCategory]);

  // Client-side filtering & sorting for instantaneous response
  const displayedOpportunities = useMemo(() => {
    let items = dataService.applyFiltersAndSort(masterFeed, {
      search: debouncedSearch,
      keywords: keywordFilter,
      categories: activeCategories,
      teamSize: selectedTeamSizes,
      payment: selectedPayments,
      sortBy,
    });

    // Format / Mode filter
    if (selectedFormat && selectedFormat !== 'All') {
      items = items.filter((o) => o.format === selectedFormat);
    }

    // Deadline filter
    if (selectedDeadlineFilter && selectedDeadlineFilter !== 'All Deadlines') {
      const maxDays =
        selectedDeadlineFilter === 'Closing in 3 days'
          ? 3
          : selectedDeadlineFilter === 'Closing in 7 days'
          ? 7
          : selectedDeadlineFilter === 'Closing in 14 days'
          ? 14
          : 30;
      items = items.filter(
        (o) => o.daysRemaining !== undefined && o.daysRemaining >= 0 && o.daysRemaining <= maxDays
      );
    }

    return items;
  }, [
    masterFeed,
    debouncedSearch,
    keywordFilter,
    activeCategories,
    selectedTeamSizes,
    selectedPayments,
    selectedFormat,
    selectedDeadlineFilter,
    sortBy,
  ]);

  // Real-time matching count inside the Filter Modal
  const draftMatchingCount = useMemo(() => {
    let items = dataService.applyFiltersAndSort(masterFeed, {
      search: debouncedSearch,
      keywords: draftKeywordFilter,
      categories: draftCategories,
      teamSize: draftTeamSizes,
      payment: draftPayments,
      sortBy,
    });

    if (draftFormat && draftFormat !== 'All') {
      items = items.filter((o) => o.format === draftFormat);
    }

    if (draftDeadline && draftDeadline !== 'All Deadlines') {
      const maxDays =
        draftDeadline === 'Closing in 3 days'
          ? 3
          : draftDeadline === 'Closing in 7 days'
          ? 7
          : draftDeadline === 'Closing in 14 days'
          ? 14
          : 30;
      items = items.filter(
        (o) => o.daysRemaining !== undefined && o.daysRemaining >= 0 && o.daysRemaining <= maxDays
      );
    }

    return items.length;
  }, [
    masterFeed,
    debouncedSearch,
    draftCategories,
    draftFormat,
    draftTeamSizes,
    draftDeadline,
    draftPayments,
    draftKeywordFilter,
    sortBy,
  ]);

  // Active filter badge count (filters beyond top-level quick category chip)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategories.length > 0) count += selectedCategories.length;
    if (selectedFormat !== 'All') count += 1;
    if (selectedTeamSizes.length > 0) count += selectedTeamSizes.length;
    if (selectedDeadlineFilter !== 'All Deadlines') count += 1;
    if (selectedPayments.length > 0) count += selectedPayments.length;
    if (keywordFilter.trim()) count += 1;
    return count;
  }, [
    selectedCategories,
    selectedFormat,
    selectedTeamSizes,
    selectedDeadlineFilter,
    selectedPayments,
    keywordFilter,
  ]);

  const openFilterModal = () => {
    setDraftCategories(
      selectedCategories.length > 0
        ? [...selectedCategories]
        : selectedCategory !== 'All'
        ? [selectedCategory]
        : []
    );
    setDraftFormat(selectedFormat);
    setDraftTeamSizes([...selectedTeamSizes]);
    setDraftDeadline(selectedDeadlineFilter);
    setDraftPayments([...selectedPayments]);
    setDraftKeywordFilter(keywordFilter);
    setShowFilterModal(true);
  };

  const applyDraftFilters = () => {
    setUserSelectedCategories(draftCategories);
    if (draftCategories.length === 1) {
      setUserSelectedCategory(draftCategories[0]);
    } else if (draftCategories.length === 0) {
      setUserSelectedCategory('All');
    } else {
      setUserSelectedCategory('Multiple');
    }
    setSelectedFormat(draftFormat);
    setSelectedTeamSizes(draftTeamSizes);
    setSelectedDeadlineFilter(draftDeadline);
    setSelectedPayments(draftPayments);
    setKeywordFilter(draftKeywordFilter.trim());
    setShowFilterModal(false);
  };

  const resetFilters = () => {
    setUserSelectedCategories([]);
    setUserSelectedCategory('All');
    setSelectedFormat('All');
    setSelectedTeamSizes([]);
    setSelectedDeadlineFilter('All Deadlines');
    setSelectedPayments([]);
    setKeywordFilter('');
    setSearchQuery('');
    setDraftCategories([]);
    setDraftFormat('All');
    setDraftTeamSizes([]);
    setDraftDeadline('All Deadlines');
    setDraftPayments([]);
    setDraftKeywordFilter('');
  };

  const toggleDraftCategory = (cat: string) => {
    setDraftCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleDraftTeamSize = (ts: string) => {
    setDraftTeamSizes((prev) =>
      prev.includes(ts) ? prev.filter((t) => t !== ts) : [...prev, ts]
    );
  };

  const toggleDraftPayment = (p: string) => {
    setDraftPayments((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    );
  };

  const renderOpportunityCard = useCallback(({ item }: { item: Opportunity }) => {
    return <OpportunityCard opportunity={item} />;
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header hideGreeting showSearch={false} />
      <View style={styles.header}>
        <View style={styles.titleBlock}><Text style={styles.headerTitle}>Explore</Text><Text style={styles.headerSubtitle}>Find your next opportunity</Text></View>
      </View>
      <View style={styles.searchSection}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search opportunities..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="never"
            autoCorrect={false}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearSearchBtn}
              accessibilityRole="button"
              accessibilityLabel="Clear search text"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <FlatList
        data={isLoading || hasError ? [] : displayedOpportunities}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderOpportunityCard}
        ListHeaderComponent={<View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickControlsScroll} contentContainerStyle={styles.sortButtons}>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: selectedCategory === 'All' }} style={[styles.sortPill, selectedCategory === 'All' && styles.sortPillActive]} onPress={() => { setUserSelectedCategory('All'); setUserSelectedCategories([]); }}><Text style={[styles.sortPillText, selectedCategory === 'All' && styles.sortPillTextActive]}>All</Text></TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortPill, sortBy === 'deadline' && styles.sortPillActive]}
            onPress={() => setSortBy('deadline')}
            accessibilityRole="button"
            accessibilityLabel="Sort by closing deadline"
          >
            <Ionicons name="time-outline" size={12} color={sortBy === 'deadline' ? '#FFF' : Colors.textMuted} />
            <Text style={[styles.sortPillText, sortBy === 'deadline' && styles.sortPillTextActive]}>Deadline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.sortPill, sortBy === 'recent' && styles.sortPillActive]} onPress={() => setSortBy('recent')} accessibilityRole="button" accessibilityLabel="Sort by most recent listing">
            <Ionicons name="sparkles-outline" size={12} color={sortBy === 'recent' ? '#FFF' : Colors.textMuted} />
            <Text style={[styles.sortPillText, sortBy === 'recent' && styles.sortPillTextActive]}>Recent</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.sortPill, sortBy === 'prize' && styles.sortPillActive]} onPress={() => setSortBy('prize')} accessibilityRole="button" accessibilityLabel="Sort by highest prize reward">
            <Ionicons name="trophy-outline" size={12} color={sortBy === 'prize' ? '#FFF' : Colors.textMuted} />
            <Text style={[styles.sortPillText, sortBy === 'prize' && styles.sortPillTextActive]}>Prize</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterBtn, styles.filterBtnCompact, activeFilterCount > 0 && styles.filterBtnActive]} onPress={openFilterModal} accessibilityRole="button" accessibilityLabel="Open opportunity filters">
            <Ionicons name="options-outline" size={17} color={activeFilterCount > 0 ? '#FFF' : Colors.primary} />
            {activeFilterCount > 0 ? <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{activeFilterCount}</Text></View> : null}
          </TouchableOpacity>
        </ScrollView>
        <View style={styles.metaRow}>
        <Text style={styles.counterText}>
          {isLoading
            ? 'Updating listings...'
            : debouncedSearch.trim()
            ? `${displayedOpportunities.length} ${
                displayedOpportunities.length === 1 ? 'result' : 'results'
              } for "${debouncedSearch.trim()}"`
    : `${displayedOpportunities.length} ${
                displayedOpportunities.length === 1 ? 'opportunity' : 'opportunities'
              }`}
        </Text>

        </View>
        {activeFilterCount > 0 ? <Text style={styles.activeSummary}>{activeFilterCount} active filter{activeFilterCount === 1 ? '' : 's'}</Text> : null}
        </View>}
        ListEmptyComponent={isLoading ? <View style={styles.skeletonContainer}><CardSkeleton /><CardSkeleton /><CardSkeleton /></View> : hasError ? <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={Colors.primary} />
          <Text style={styles.errorTitle}>Connection Issue</Text>
          <Text style={styles.errorDescription}>{errorMessage}</Text>
          <Button
            title="Retry Connection"
            variant="primary"
            onPress={onRefresh}
            style={{ marginTop: 16 }}
          />
        </View> : debouncedSearch.trim() ? (
          <EmptyState
            icon="search-outline"
            title={`No results for "${debouncedSearch.trim()}"`}
            description="We couldn't find any opportunities matching your search term. Try checking for typos or searching by skill or city."
            actionTitle="Clear Search"
            onAction={() => setSearchQuery('')}
            style={styles.emptyContainer}
          />
        ) : activeFilterCount > 0 ? (
          <EmptyState
            icon="options-outline"
            title="No Matching Opportunities"
            description="No opportunities match your current filter combination. Try resetting your filters to broaden results."
            actionTitle="Reset All Filters"
            onAction={resetFilters}
            style={styles.emptyContainer}
          />
        ) : (
          <EmptyState
            icon="cube-outline"
            title="No active opportunities right now"
            description="Try refreshing or changing filters."
            actionTitle="Refresh Feed"
            onAction={onRefresh}
            style={styles.emptyContainer}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        keyboardShouldPersistTaps="handled"
        refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
        }
      />

      {/* FILTER MODAL */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheetContainer}>
            {/* Modal Header */}
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Filter Opportunities</Text>
                <Text style={styles.sheetSubtitle}>Refine mode, team size, deadline, and prizes</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowFilterModal(false)}
                style={styles.sheetCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Close filters modal"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetBody}
              keyboardShouldPersistTaps="handled"
            >
              {/* Category Multi-select */}
              <Text style={styles.filterSectionTitle}>Categories</Text>
              <View style={styles.chipsWrap}>
                {ALL_CATEGORIES.filter((c) => c !== 'All').map((cat) => {
                  const isChecked = draftCategories.includes(cat);
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.filterCheckboxChip, isChecked && styles.filterCheckboxChipSelected]}
                      onPress={() => toggleDraftCategory(cat)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={isChecked ? 'checkbox' : 'square-outline'}
                        size={16}
                        color={isChecked ? Colors.primary : Colors.textMuted}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.filterChipLabel,
                          isChecked && styles.filterChipLabelSelected,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.filterSectionTitle}>Skill or keyword</Text>
              <TextInput
                style={styles.filterKeywordInput}
                value={draftKeywordFilter}
                onChangeText={setDraftKeywordFilter}
                placeholder="Search skills, roles, or topics"
                placeholderTextColor={Colors.textMuted}
                autoCorrect={false}
                returnKeyType="done"
              />

              {/* Mode / Format */}
              <Text style={styles.filterSectionTitle}>Format</Text>
              <View style={styles.chipsWrap}>
                {FORMAT_OPTIONS.map((fmt) => {
                  const isChecked = draftFormat === fmt;
                  return (
                    <TouchableOpacity
                      key={fmt}
                      style={[styles.filterCheckboxChip, isChecked && styles.filterCheckboxChipSelected]}
                      onPress={() => setDraftFormat(fmt)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={isChecked ? 'radio-button-on' : 'radio-button-off'}
                        size={16}
                        color={isChecked ? Colors.primary : Colors.textMuted}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.filterChipLabel,
                          isChecked && styles.filterChipLabelSelected,
                        ]}
                      >
                        {fmt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Upcoming Deadlines */}
              <Text style={styles.filterSectionTitle}>Deadline</Text>
              <View style={styles.chipsWrap}>
                {DEADLINE_OPTIONS.map((dl) => {
                  const isChecked = draftDeadline === dl;
                  return (
                    <TouchableOpacity
                      key={dl}
                      style={[styles.filterCheckboxChip, isChecked && styles.filterCheckboxChipSelected]}
                      onPress={() => setDraftDeadline(dl)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={isChecked ? 'radio-button-on' : 'radio-button-off'}
                        size={16}
                        color={isChecked ? Colors.primary : Colors.textMuted}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.filterChipLabel,
                          isChecked && styles.filterChipLabelSelected,
                        ]}
                      >
                        {dl}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Team Size */}
              <Text style={styles.filterSectionTitle}>Team size</Text>
              <View style={styles.chipsWrap}>
                {teamSizeOptions.map((ts) => {
                  const isChecked = draftTeamSizes.includes(ts);
                  return (
                    <TouchableOpacity
                      key={ts}
                      style={[styles.filterCheckboxChip, isChecked && styles.filterCheckboxChipSelected]}
                      onPress={() => toggleDraftTeamSize(ts)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={isChecked ? 'radio-button-on' : 'radio-button-off'}
                        size={16}
                        color={isChecked ? Colors.primary : Colors.textMuted}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.filterChipLabel,
                          isChecked && styles.filterChipLabelSelected,
                        ]}
                      >
                        {ts}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Rewards & Fee */}
              <Text style={styles.filterSectionTitle}>Rewards and registration</Text>
              <View style={styles.chipsWrap}>
                {PAYMENT_OPTIONS.map((pay) => {
                  const isChecked = draftPayments.includes(pay);
                  return (
                    <TouchableOpacity
                      key={pay}
                      style={[styles.filterCheckboxChip, isChecked && styles.filterCheckboxChipSelected]}
                      onPress={() => toggleDraftPayment(pay)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={isChecked ? 'checkbox' : 'square-outline'}
                        size={16}
                        color={isChecked ? Colors.primary : Colors.textMuted}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.filterChipLabel,
                          isChecked && styles.filterChipLabelSelected,
                        ]}
                      >
                        {pay}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Modal Footer Controls */}
            <View style={[styles.sheetFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <TouchableOpacity
                style={styles.sheetResetBtn}
                onPress={() => {
                  setDraftCategories([]);
                  setDraftFormat('All');
                  setDraftTeamSizes([]);
                  setDraftDeadline('All Deadlines');
                  setDraftPayments([]);
                  setDraftKeywordFilter('');
                }}
                accessibilityRole="button"
                accessibilityLabel="Clear all draft filters"
              >
                <Text style={styles.sheetResetText}>Clear All</Text>
              </TouchableOpacity>

              <Button
                title={`Apply Filters (${draftMatchingCount})`}
                variant="primary"
                size="md"
                onPress={applyDraftFilters}
                style={styles.sheetApplyBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: 12,
    paddingTop: 7,
  },
  titleBlock: { gap: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconBtn: {
    width: 40, height: 40, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceElevated,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    lineHeight: 31,
  },
  headerSubtitle: { fontSize: 12, color: Colors.textMuted, letterSpacing: 0.15 },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBtnCompact: { width: 34, height: 32, borderRadius: 8 },
  filterBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.primary,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.background,
  },
  filterBadgeText: {
    color: Colors.textOnPrimary,
    fontSize: 10,
    fontWeight: '900',
  },
  searchSection: {
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: 4,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Typography.subhead,
    height: '100%',
  },
  filterKeywordInput: {
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 12,
    color: Colors.textPrimary,
    fontSize: Typography.footnote,
  },
  clearSearchBtn: {
    padding: 4,
  },
  suggestedBar: {
    marginBottom: 6,
  },
  suggestedScroll: {
    paddingHorizontal: Spacing.screenPadding,
    alignItems: 'center',
    gap: 6,
  },
  suggestedLabel: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    fontWeight: Typography.bold,
    marginRight: 2,
  },
  suggestedPill: {
    minHeight: 32,
    justifyContent: 'center',
    backgroundColor: Colors.surfaceHighlight,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  suggestedPillText: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  categoryBar: {
    marginBottom: 6,
  },
  categoryScroll: {
    paddingHorizontal: Spacing.screenPadding,
    gap: 8,
  },
  activeFiltersBar: {
    marginBottom: 6,
  },
  activeFiltersScroll: {
    paddingHorizontal: Spacing.screenPadding,
    alignItems: 'center',
    gap: 6,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: BorderRadius.full,
    gap: 5,
  },
  activeFilterText: {
    fontSize: Typography.caption,
    color: Colors.primary,
    fontWeight: Typography.semiBold,
  },
  clearAllFiltersBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearAllFiltersText: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: 8,
  },
  counterText: {
    fontSize: Typography.caption,
    fontWeight: Typography.bold,
    color: Colors.textMuted,
    flex: 1,
    marginRight: 8,
  },
  sortButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 2,
  },
  quickControlsScroll: { flexGrow: 0, marginBottom: 7 },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  sortPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  sortPillText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: Typography.medium,
  },
  sortPillTextActive: {
    color: '#FFF',
    fontWeight: Typography.bold,
  },
  skeletonContainer: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 8,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: 36,
  },
  activeSummary: {
    color: Colors.textMuted, fontSize: Typography.caption, paddingHorizontal: Spacing.screenPadding,
    marginTop: -3, marginBottom: 7,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: Typography.title3,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginTop: 12,
    marginBottom: 6,
  },
  errorDescription: {
    fontSize: Typography.footnote,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: Platform.OS === 'web' ? 'center' : undefined,
  },
  sheetContainer: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 560 : undefined,
    alignSelf: 'center',
    borderBottomLeftRadius: Platform.OS === 'web' ? BorderRadius.xl : 0,
    borderBottomRightRadius: Platform.OS === 'web' ? BorderRadius.xl : 0,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sheetTitle: {
    fontSize: Typography.title3,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  sheetSubtitle: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  sheetCloseBtn: {
    padding: 4,
  },
  sheetBody: {
    padding: 20,
    paddingBottom: 40,
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: Typography.semiBold,
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  filterCheckboxChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
  },
  filterCheckboxChipSelected: {
    backgroundColor: Colors.primarySubtle,
    borderColor: Colors.primaryBorder,
  },
  filterChipLabel: {
    fontSize: Typography.footnote,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  filterChipLabelSelected: {
    color: Colors.primary,
    fontWeight: Typography.bold,
  },
  sheetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.card,
  },
  sheetResetBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  sheetResetText: {
    fontSize: Typography.subhead,
    color: Colors.textMuted,
    fontWeight: Typography.semiBold,
  },
  sheetApplyBtn: {
    minWidth: 150,
  },
});
