import React, { useState, useEffect, useMemo } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { OpportunityCard } from '../../components/cards/OpportunityCard';
import { Chip } from '../../components/ui/Chip';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Opportunity, OpportunityCategory } from '../../types';
import { dataService } from '../../services/dataService';

const ALL_CATEGORIES: (OpportunityCategory | 'All')[] = [
  'All',
  'Competitions',
  'Hackathons',
  'Quizzes',
  'Scholarships',
  'Workshops',
  'Conferences',
  'Cultural Events',
  'College Festivals',
  'Internships',
  'Research Programs',
];

const TEAM_SIZE_OPTIONS = [
  'Individual',
  '2-4 members',
  '5+ members',
];

const PAYMENT_OPTIONS = [
  'Free registration',
  'Paid registration',
  'Stipend',
  'Prize or rewards',
  'Scholarship or funding',
];

type SortOption = 'deadline' | 'recent' | 'prize';

export default function ExploreScreen() {
  const params = useLocalSearchParams<{ category?: string; query?: string }>();

  const [searchQuery, setSearchQuery] = useState(params.query || '');
  const [userSelectedCategory, setUserSelectedCategory] = useState<string | null>(null);
  const selectedCategory = userSelectedCategory ?? (params.category || 'All');

  const [userSelectedCategories, setUserSelectedCategories] = useState<string[] | null>(null);
  const selectedCategories = useMemo(() => {
    if (userSelectedCategories !== null) return userSelectedCategories;
    if (params.category && params.category !== 'All') return [params.category];
    return [];
  }, [userSelectedCategories, params.category]);

  const [selectedTeamSizes, setSelectedTeamSizes] = useState<string[]>([]);
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('deadline');
  
  // Filter modal draft state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [draftCategories, setDraftCategories] = useState<string[]>([]);
  const [draftTeamSizes, setDraftTeamSizes] = useState<string[]>([]);
  const [draftPayments, setDraftPayments] = useState<string[]>([]);

  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [localOpportunities, setLocalOpportunities] = useState<Opportunity[]>([]);

  useEffect(() => {
    let ignore = false;
    const fetchOpportunities = async () => {
      try {
        const activeCats =
          selectedCategories.length > 0
            ? selectedCategories
            : selectedCategory !== 'All'
            ? [selectedCategory]
            : [];

        const data = await dataService.getOpportunities({
          search: searchQuery,
          categories: activeCats,
          teamSize: selectedTeamSizes,
          payment: selectedPayments,
          sortBy,
        });

        if (!ignore) {
          setLocalOpportunities(data);
          setHasError(false);
          setIsLoading(false);
          setIsRefreshing(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Error fetching opportunities:', err);
          setHasError(true);
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    fetchOpportunities();

    return () => {
      ignore = true;
    };
  }, [searchQuery, selectedCategory, selectedCategories, selectedTeamSizes, selectedPayments, sortBy]);

  const onRefreshList = () => {
    setIsRefreshing(true);
    dataService.getOpportunities({
      search: searchQuery,
      categories: selectedCategories.length > 0 ? selectedCategories : selectedCategory !== 'All' ? [selectedCategory] : [],
      teamSize: selectedTeamSizes,
      payment: selectedPayments,
      sortBy,
    }).then((data) => {
      setLocalOpportunities(data);
      setIsRefreshing(false);
    }).catch(() => {
      setIsRefreshing(false);
    });
  };

  const activeFilterCount = useMemo(() => {
    return (
      (selectedCategories.length > 0 ? selectedCategories.length : 0) +
      selectedTeamSizes.length +
      selectedPayments.length
    );
  }, [selectedCategories, selectedTeamSizes, selectedPayments]);

  const openFilterModal = () => {
    setDraftCategories(
      selectedCategories.length > 0
        ? [...selectedCategories]
        : selectedCategory !== 'All'
        ? [selectedCategory]
        : []
    );
    setDraftTeamSizes([...selectedTeamSizes]);
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
    setSelectedTeamSizes(draftTeamSizes);
    setSelectedPayments(draftPayments);
    setShowFilterModal(false);
  };

  const resetFilters = () => {
    setUserSelectedCategories([]);
    setUserSelectedCategory('All');
    setSelectedTeamSizes([]);
    setSelectedPayments([]);
    setSearchQuery('');
    setDraftCategories([]);
    setDraftTeamSizes([]);
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Explore Opportunities</Text>
          <Text style={styles.headerSubtitle}>
            Verified hackathons, internships, scholarships & events
          </Text>
        </View>

        <TouchableOpacity
          style={styles.filterBtn}
          onPress={openFilterModal}
          activeOpacity={0.8}
        >
          <Ionicons name="options-outline" size={20} color={Colors.primary} />
          {activeFilterCount > 0 ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchSection}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by title, organizer, or skill..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Horizontal Category Filter Chips */}
      <View style={styles.categoryBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {ALL_CATEGORIES.map((cat) => (
            <Chip
              key={cat}
              label={cat}
              selected={selectedCategory === cat}
              onPress={() => handleSelectQuickCategory(cat)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Sort row and Results Counter */}
      <View style={styles.metaRow}>
        <Text style={styles.counterText}>
          {localOpportunities.length} {localOpportunities.length === 1 ? 'Opportunity' : 'Opportunities'} Found
        </Text>

        <View style={styles.sortButtons}>
          <TouchableOpacity
            style={[styles.sortPill, sortBy === 'deadline' && styles.sortPillActive]}
            onPress={() => setSortBy('deadline')}
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

      {/* Opportunities List / States */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Fetching verified opportunities...</Text>
        </View>
      ) : hasError ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.primary} />
          <Text style={styles.errorTitle}>Failed to load opportunities</Text>
          <Text style={styles.errorDescription}>
            Unable to connect to the feed. Please verify your internet connection and try again.
          </Text>
          <Button
            title="Retry"
            variant="primary"
            onPress={onRefreshList}
            style={{ marginTop: 16 }}
          />
        </View>
      ) : localOpportunities.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="No Opportunities Found"
          description="We couldn't find any opportunities matching your active filters. Try broadening your criteria."
          actionTitle="Reset Filters"
          onAction={resetFilters}
          style={styles.emptyContainer}
        />
      ) : (
        <FlatList
          data={localOpportunities}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <OpportunityCard opportunity={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefreshList}
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
                <Text style={styles.sheetSubtitle}>Refine by format, team size, and funding</Text>
              </View>
              <TouchableOpacity onPress={() => setShowFilterModal(false)} style={styles.sheetCloseBtn}>
                <Ionicons name="close" size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetBody}>
              {/* Categories */}
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

              {/* Payment / Rewards */}
              <Text style={styles.filterSectionTitle}>PAYMENT & PRIZES</Text>
              <View style={styles.chipsWrap}>
                {PAYMENT_OPTIONS.map((p) => {
                  const isChecked = draftPayments.includes(p);
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[styles.filterCheckboxChip, isChecked && styles.filterCheckboxChipSelected]}
                      onPress={() => toggleDraftPayment(p)}
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
                        {p}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.sheetActions}>
              <Button
                title="Reset All"
                variant="outline"
                size="md"
                onPress={() => {
                  setDraftCategories([]);
                  setDraftTeamSizes([]);
                  setDraftPayments([]);
                }}
                style={{ flex: 1 }}
              />
              <Button
                title={`Apply Filters (${draftCategories.length + draftTeamSizes.length + draftPayments.length})`}
                variant="primary"
                size="md"
                onPress={applyDraftFilters}
                style={{ flex: 2 }}
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
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: Typography.title2,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.primary,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.background,
  },
  filterBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
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
    fontSize: Typography.body,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  categoryBar: {
    marginBottom: 10,
  },
  categoryScroll: {
    paddingHorizontal: Spacing.screenPadding,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: 10,
  },
  counterText: {
    fontSize: Typography.caption,
    fontWeight: Typography.semiBold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
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
    fontWeight: Typography.medium,
    color: Colors.textMuted,
  },
  sortPillTextActive: {
    color: '#FFF',
    fontWeight: Typography.bold,
  },
  listContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: 24,
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: Typography.body,
    marginTop: 12,
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
    marginTop: 16,
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyContainer: {
    marginTop: 60,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 15, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: '85%',
    paddingBottom: 24,
    ...Shadows.card,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 18,
    paddingBottom: 14,
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
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 16,
  },
  filterSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 8,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filterCheckboxChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterCheckboxChipSelected: {
    backgroundColor: Colors.primarySubtle,
    borderColor: Colors.primary,
  },
  filterChipLabel: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  filterChipLabelSelected: {
    color: Colors.textPrimary,
    fontWeight: Typography.bold,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
