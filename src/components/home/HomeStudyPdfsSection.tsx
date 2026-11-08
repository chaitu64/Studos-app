import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import type { StudyResource } from '../../types';

type Props = {
  resources: StudyResource[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onBookmark?: (resource: StudyResource) => void;
  onOpen?: (resource: StudyResource) => void;
};

const formatSize = (mb?: number, bytes?: number | null) => {
  if (mb != null && Number.isFinite(mb)) return `${mb.toFixed(1)} MB`;
  if (bytes != null && Number.isFinite(bytes) && bytes > 0) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return null;
};

const cleanCategory = (value: string) => {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

export const HomeStudyPdfsSection: React.FC<Props> = React.memo(function HomeStudyPdfsSection({
  resources,
  loading = false,
  error = null,
  onRetry,
  onBookmark,
  onOpen,
}) {
  const handleOpen = (resource: StudyResource) => {
    if (onOpen) onOpen(resource);
    else router.push({ pathname: '/resource/[id]', params: { id: resource.id } } as never);
  };

  const handleBrowseAll = () => {
    router.push('/academic-library' as never);
  };

  return (
    <View style={styles.section}>
      {/* SECTION HEADER */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.sectionOverline}>ACADEMIC LIBRARY</Text>
          <Text style={styles.sectionTitle}>Study PDFs</Text>
          <Text style={styles.sectionSubtitle}>Verified course materials and student notes</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Browse all study resources"
          onPress={handleBrowseAll}
          style={styles.browseAllButton}
          activeOpacity={0.7}
        >
          <Text style={styles.browseAllText}>Browse all</Text>
          <Ionicons name="arrow-forward" size={13} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* LOADING STATE */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.primary} size="small" />
          <Text style={styles.loadingText}>Loading study PDFs…</Text>
        </View>
      ) : null}

      {/* ERROR STATE */}
      {!loading && error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={24} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          {onRetry ? (
            <TouchableOpacity onPress={onRetry} style={styles.retryButton} activeOpacity={0.8}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {/* EMPTY STATE */}
      {!loading && !error && resources.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={32} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No study PDFs found</Text>
          <Text style={styles.emptySubtitle}>Explore the full Study Hub to find notes by year and branch.</Text>
          <TouchableOpacity onPress={handleBrowseAll} style={styles.browseHubButton} activeOpacity={0.8}>
            <Text style={styles.browseHubText}>Open Study Hub</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* COMPACT VERTICAL ROWS */}
      {!loading && !error && resources.length > 0 ? (
        <View style={styles.list}>
          {resources.map((resource) => {
            const fileName = resource.pdfFileName || resource.fileName || resource.title;
            const fileSize = formatSize(resource.fileSizeMb, resource.fileSize);
            const metaParts = [
              resource.studyYear ? `Yr ${resource.studyYear}` : null,
              resource.semester ? `Sem ${resource.semester}` : null,
              resource.regulation || null,
            ].filter(Boolean);

            return (
              <TouchableOpacity
                key={resource.id}
                accessibilityRole="button"
                accessibilityLabel={`Study resource: ${fileName}`}
                onPress={() => handleOpen(resource)}
                style={styles.row}
                activeOpacity={0.75}
              >
                {/* PDF ICON */}
                <View style={styles.fileIconSquircle}>
                  <Ionicons name="document-text" size={20} color={Colors.primary} />
                  <Text style={styles.pdfTag}>PDF</Text>
                </View>

                {/* TEXT & METADATA */}
                <View style={styles.rowDetails}>
                  <Text style={styles.fileName} numberOfLines={2}>{fileName}</Text>
                  <Text style={styles.subject} numberOfLines={1}>{resource.subject}</Text>

                  <View style={styles.metaRow}>
                    {metaParts.map((item) => (
                      <View key={item} style={styles.metaPill}>
                        <Text style={styles.metaPillText}>{item}</Text>
                      </View>
                    ))}
                    {resource.type ? (
                      <View style={[styles.metaPill, styles.categoryPill]}>
                        <Text style={[styles.metaPillText, styles.categoryPillText]}>
                          {cleanCategory(resource.type)}
                        </Text>
                      </View>
                    ) : null}
                    {fileSize ? (
                      <Text style={styles.sizeText}>{fileSize}</Text>
                    ) : null}
                  </View>
                </View>

                {/* ACTIONS */}
                <View style={styles.rowActions}>
                  {onBookmark ? (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={resource.isBookmarked ? 'Remove saved PDF' : 'Save PDF'}
                      accessibilityState={{ selected: Boolean(resource.isBookmarked) }}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        onBookmark(resource);
                      }}
                      style={styles.bookmarkButton}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={resource.isBookmarked ? 'bookmark' : 'bookmark-outline'}
                        size={19}
                        color={resource.isBookmarked ? Colors.primary : Colors.textMuted}
                      />
                    </TouchableOpacity>
                  ) : null}
                  <Ionicons name="chevron-forward" size={15} color={Colors.textSubtle} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 24,
    paddingBottom: 28,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  sectionOverline: {
    fontSize: 11,
    fontWeight: Typography.bold,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    lineHeight: 26,
    marginTop: 2,
  },
  sectionSubtitle: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  browseAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  browseAllText: {
    fontSize: 12,
    fontWeight: Typography.semiBold,
    color: Colors.primary,
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.lg,
    padding: 12,
    gap: 12,
  },
  fileIconSquircle: {
    width: 44,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfTag: {
    fontSize: 8,
    fontWeight: Typography.bold,
    color: Colors.primary,
    marginTop: 1,
    letterSpacing: 0.5,
  },
  rowDetails: {
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    fontSize: 14,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    lineHeight: 19,
  },
  subject: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  metaPill: {
    backgroundColor: Colors.surfaceHighlight,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  metaPillText: {
    fontSize: 10,
    fontWeight: Typography.medium,
    color: Colors.textSecondary,
  },
  categoryPill: {
    backgroundColor: Colors.primarySubtle,
  },
  categoryPillText: {
    color: Colors.primary,
    fontWeight: Typography.semiBold,
  },
  sizeText: {
    fontSize: 10,
    color: Colors.textMuted,
    marginLeft: 2,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bookmarkButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.lg,
  },
  loadingText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.errorSubtle,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: BorderRadius.lg,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
  },
  retryText: {
    color: Colors.textOnPrimary,
    fontSize: 12,
    fontWeight: Typography.bold,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.lg,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
  browseHubButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    borderRadius: BorderRadius.md,
  },
  browseHubText: {
    fontSize: 12,
    fontWeight: Typography.bold,
    color: Colors.primary,
  },
});

