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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { OpportunityCard } from '../../components/cards/OpportunityCard';
import { Chip } from '../../components/ui/Chip';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { CardSkeleton } from '../../components/ui/Skeleton';
import { Opportunity, OpportunityCategory } from '../../types';
import { dataService } from '../../services/dataService';

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
const QUICK_CATEGORIES: (OpportunityCategory | 'All')[] = ['All', 'Hackathons', 'Internships', 'Jobs'];

const SUGGESTED_SEARCHES = [
  'Remote',
  'AI & ML',
  'Frontend',
  'Web3',
  'Hackathon',
  'Full Stack',
  'UI/UX',
];

const FORMAT_OPTIONS = ['All', 'Online', 'In-Person', 'Hybrid'];

const TEAM_SIZE_OPTIONS = [
  'Individual',
  '2–4 members',
  '5+ members',
];

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

export default function ExploreScreen() {
  const params = useLocalSearchParams<{ category?: string; query?: string }>();

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
  const [sortBy, setSortBy] = useState<SortOption>('deadline');

  // Filter modal draft state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [draftCategories, setDraftCategories] = useState<string[]>([]);
  const [draftFormat, setDraftFormat] = useState<string>('All');
  const [draftTeamSizes, setDraftTeamSizes] = useState<string[]>([]);
  const [draftDeadline, setDraftDeadline] = useState<string>('All Deadlines');
  const [draftPayments, setDraftPayments] = useState<string[]>([]);

  // Feed master data and states
  const [masterFeed, setMasterFeed] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Initial load
  useEffect(() => {
    let ignore = false;

    const loadMasterData = async () => {
      try {
        const data = await dataService.getOpportunities();
        if (!ignore) {
          setMasterFeed(data);
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
      setMasterFeed(data);
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
    sortBy,
  ]);

  // Active filter badge count (filters beyond top-level quick category chip)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategories.length > 1) count += selectedCategories.length;
    if (selectedFormat !== 'All') count += 1;
    if (selectedTeamSizes.length > 0) count += selectedTeamSizes.length;
    if (selectedDeadlineFilter !== 'All Deadlines') count += 1;
    if (selectedPayments.length > 0) count += selectedPayments.length;
    return count;
  }, [
    selectedCategories,
    selectedFormat,
    selectedTeamSizes,
    selectedDeadlineFilter,
    selectedPayments,
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
    setShowFilterModal(false);
  };

  const resetFilters = () => {
    setUserSelectedCategories([]);
    setUserSelectedCategory('All');
    setSelectedFormat('All');
    setSelectedTeamSizes([]);
    setSelectedDeadlineFilter('All Deadlines');
    setSelectedPayments([]);
    setSearchQuery('');
    setDraftCategories([]);
    setDraftFormat('All');
    setDraftTeamSizes([]);
    setDraftDeadline('All Deadlines');
    setDraftPayments([]);
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

  const handleSelectQuickCategory = (cat: string) => {
    setUserSelectedCategory(cat);
    if (cat === 'All') {
      setUserSelectedCategories([]);
    } else {
      setUserSelectedCategories([cat]);
    }
  };

  const renderOpportunityCard = useCallback(({ item }: { item: Opportunity }) => {
    return <OpportunityCard opportunity={item} />;
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header bar */}
      <View style={styles.header}>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Explore</Text>
          <Text style={styles.headerSubtitle}>Opportunities and ways to grow</Text>
        </View>

        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 ? styles.filterBtnActive : undefined]}
          onPress={openFilterModal}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Open opportunity filters"
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={activeFilterCount > 0 ? '#FFF' : Colors.primary}
          />
          {activeFilterCount > 0 ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Search Input Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by title, organizer, skill, role, location..."
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

      {/* Suggested Search Shortcuts (when search input is empty) */}
      {!searchQuery.trim() ? (
        <View style={styles.suggestedBar}>
          <Text style={styles.suggestedLabel}>Popular searches</Text>
          <View style={styles.suggestedWrap}>
            {SUGGESTED_SEARCHES.slice(0, 4).map((term) => (
              <TouchableOpacity key={term} style={styles.suggestedPill} onPress={() => setSearchQuery(term)} activeOpacity={0.7}>
                <Text style={styles.suggestedPillText}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.categoryBar} accessibilityRole="tablist">
        {QUICK_CATEGORIES.map((cat) => (
          <TouchableOpacity key={cat} accessibilityRole="tab" accessibilityState={{ selected: selectedCategory === cat }} style={[styles.quickCategory, selectedCategory === cat && styles.quickCategoryActive]} onPress={() => handleSelectQuickCategory(cat)}>
            <Text numberOfLines={1} style={[styles.quickCategoryText, selectedCategory === cat && styles.quickCategoryTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Active Dismissible Filters Strip */}
      {activeFilterCount > 0 ? (
        <View style={styles.activeFiltersBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeFiltersScroll}
            keyboardShouldPersistTaps="handled"
          >
            {selectedFormat !== 'All' ? (
              <TouchableOpacity
                style={styles.activeFilterChip}
                onPress={() => setSelectedFormat('All')}
                activeOpacity={0.7}
              >
                <Text style={styles.activeFilterText}>Mode: {selectedFormat}</Text>
                <Ionicons name="close" size={14} color={Colors.primary} />
              </TouchableOpacity>
            ) : null}

            {selectedDeadlineFilter !== 'All Deadlines' ? (
              <TouchableOpacity
                style={styles.activeFilterChip}
                onPress={() => setSelectedDeadlineFilter('All Deadlines')}
                activeOpacity={0.7}
              >
                <Text style={styles.activeFilterText}>{selectedDeadlineFilter}</Text>
                <Ionicons name="close" size={14} color={Colors.primary} />
              </TouchableOpacity>
            ) : null}

            {selectedTeamSizes.map((ts) => (
              <TouchableOpacity
                key={ts}
                style={styles.activeFilterChip}
                onPress={() => setSelectedTeamSizes((prev) => prev.filter((t) => t !== ts))}
                activeOpacity={0.7}
              >
                <Text style={styles.activeFilterText}>{ts}</Text>
                <Ionicons name="close" size={14} color={Colors.primary} />
              </TouchableOpacity>
            ))}

            {selectedPayments.map((p) => (
              <TouchableOpacity
                key={p}
                style={styles.activeFilterChip}
                onPress={() => setSelectedPayments((prev) => prev.filter((item) => item !== p))}
                activeOpacity={0.7}
              >
                <Text style={styles.activeFilterText}>{p}</Text>
                <Ionicons name="close" size={14} color={Colors.primary} />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.clearAllFiltersBtn}
              onPress={resetFilters}
              activeOpacity={0.7}
            >
              <Text style={styles.clearAllFiltersText}>Clear all</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      ) : null}

      {/* Meta Row: Live Count & Sort Controls */}
      <View style={styles.metaRow}>
        <Text style={styles.counterText}>
          {isLoading
            ? 'Updating listings...'
            : debouncedSearch.trim()
            ? `${displayedOpportunities.length} ${
                displayedOpportunities.length === 1 ? 'result' : 'results'
              } for "${debouncedSearch.trim()}"`
            : `${displayedOpportunities.length} ${
                displayedOpportunities.length === 1 ? 'Opportunity' : 'Opportunities'
              }`}
        </Text>

        <View style={styles.sortButtons}>
          <TouchableOpacity
            style={[styles.sortPill, sortBy === 'deadline' && styles.sortPillActive]}
            onPress={() => setSortBy('deadline')}
            accessibilityRole="button"
            accessibilityLabel="Sort by closing deadline"
          >
            <Ionicons
              name="time-outline"
              size={12}
              color={sortBy === 'deadline' ? '#FFF' : Colors.textMuted}
            />
            <Text style={[styles.sortPillText, sortBy === 'deadline' && styles.sortPillTextActive]}>
              Deadline
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sortPill, sortBy === 'recent' && styles.sortPillActive]}
            onPress={() => setSortBy('recent')}
            accessibilityRole="button"
            accessibilityLabel="Sort by most recent listing"
          >
            <Ionicons
              name="sparkles-outline"
              size={12}
              color={sortBy === 'recent' ? '#FFF' : Colors.textMuted}
            />
            <Text style={[styles.sortPillText, sortBy === 'recent' && styles.sortPillTextActive]}>
              Recent
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sortPill, sortBy === 'prize' && styles.sortPillActive]}
            onPress={() => setSortBy('prize')}
            accessibilityRole="button"
            accessibilityLabel="Sort by highest prize reward"
          >
            <Ionicons
              name="trophy-outline"
              size={12}
              color={sortBy === 'prize' ? '#FFF' : Colors.textMuted}
            />
            <Text style={[styles.sortPillText, sortBy === 'prize' && styles.sortPillTextActive]}>
              Prize
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Opportunities Feed / Virtualized FlatList */}
      {isLoading ? (
        <ScrollView contentContainerStyle={styles.skeletonContainer}>
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </ScrollView>
      ) : hasError ? (
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={Colors.primary} />
          <Text style={styles.errorTitle}>Connection Issue</Text>
          <Text style={styles.errorDescription}>{errorMessage}</Text>
          <Button
            title="Retry Connection"
            variant="primary"
            onPress={onRefresh}
            style={{ marginTop: 16 }}
          />
        </View>
      ) : displayedOpportunities.length === 0 ? (
        debouncedSearch.trim() ? (
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
            title="No Opportunities Found"
            description="There are currently no open listings in this category. Pull down to refresh or check back soon."
            actionTitle="Refresh Feed"
            onAction={onRefresh}
            style={styles.emptyContainer}
          />
        )
      ) : (
        <FlatList
          data={displayedOpportunities}
          keyExtractor={(item) => item.id}
          renderItem={renderOpportunityCard}
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
      )}

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
              <Text style={styles.filterSectionTitle}>CATEGORIES</Text>
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

              {/* Mode / Format */}
              <Text style={styles.filterSectionTitle}>MODE / LOCATION FORMAT</Text>
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
              <Text style={styles.filterSectionTitle}>UPCOMING DEADLINE</Text>
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
              <Text style={styles.filterSectionTitle}>TEAM SIZE</Text>
              <View style={styles.chipsWrap}>
                {TEAM_SIZE_OPTIONS.map((ts) => {
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
              <Text style={styles.filterSectionTitle}>REWARDS & REGISTRATION FEE</Text>
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
            <View style={styles.sheetFooter}>
              <TouchableOpacity
                style={styles.sheetResetBtn}
                onPress={() => {
                  setDraftCategories([]);
                  setDraftFormat('All');
                  setDraftTeamSizes([]);
                  setDraftDeadline('All Deadlines');
                  setDraftPayments([]);
                }}
                accessibilityRole="button"
                accessibilityLabel="Clear all draft filters"
              >
                <Text style={styles.sheetResetText}>Clear All</Text>
              </TouchableOpacity>

              <Button
                title={`Show Results (${draftMatchingCount})`}
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
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitles: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: Typography.title2,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    lineHeight: 32,
  },
  headerSubtitle: {
    fontSize: Typography.body,
    color: Colors.textMuted,
    marginTop: 2,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...Shadows.card,
  },
  filterBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.accentAmber,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.background,
  },
  filterBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
  },
  searchSection: {
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: 8,
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
  clearSearchBtn: {
    padding: 4,
  },
  suggestedBar: {
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: 10,
  },
  suggestedWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 6 },
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
    backgroundColor: Colors.surfaceHighlight,
    minHeight: 36,
    justifyContent: 'center',
    paddingVertical: 7,
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
    flexDirection: 'row',
    marginHorizontal: Spacing.screenPadding,
    marginBottom: 8,
    padding: 4,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickCategory: { minWidth: 0, minHeight: 42, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderRadius: BorderRadius.sm },
  quickCategoryActive: { backgroundColor: Colors.surfaceHighlight },
  quickCategoryText: { color: Colors.textMuted, fontSize: Typography.caption, fontWeight: Typography.medium },
  quickCategoryTextActive: { color: Colors.textPrimary, fontWeight: Typography.semiBold },
  categoryScroll: {
    paddingHorizontal: Spacing.screenPadding,
    gap: 8,
  },
  activeFiltersBar: {
    marginBottom: 10,
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
    marginBottom: 12,
  },
  counterText: {
    fontSize: Typography.caption,
    fontWeight: Typography.bold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
    marginRight: 8,
  },
  sortButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
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
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: 40,
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
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
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 10,
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
