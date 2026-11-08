import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { safeBack } from '@/navigation/safeBack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchResource, isResourceSaved, listStudyResourcePage, openDriveResource, reportBrokenResource, removeStudyResource, saveResource } from '../../services/resourceApi';
import { StudyResource } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { DrivePdfPreview } from '../../components/home/DrivePdfPreview';
import { CommunityLearningLinks } from '../../components/resources/CommunityLearningLinks';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/theme';

export default function ResourceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { session } = useAuth(); const [saved, setSaved] = useState(false);
  const [infoExpanded, setInfoExpanded] = useState(false);
  const [resource, setResource] = useState<StudyResource>(); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [children, setChildren] = useState<StudyResource[]>([]); const [childrenLoading, setChildrenLoading] = useState(false); const [childrenLoadingMore, setChildrenLoadingMore] = useState(false); const [childrenHasMore, setChildrenHasMore] = useState(false); const [childrenError, setChildrenError] = useState(''); const [childSearch, setChildSearch] = useState(''); const [debouncedChildSearch, setDebouncedChildSearch] = useState(''); const [childReload, setChildReload] = useState(0); const childRequest = React.useRef(false); const childVersion = React.useRef(0);
  useEffect(() => {
    let active = true;
    if (!id) return;
    void fetchResource(id).then((item) => {
      if (active) setResource(item);
      return isResourceSaved(id).then((savedItem) => { if (active) setSaved(savedItem); }).catch(() => { if (active) setSaved(false); });
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Resource unavailable.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);
  useEffect(() => { const timer = setTimeout(() => setDebouncedChildSearch(childSearch.trim()), 300); return () => clearTimeout(timer); }, [childSearch]);
  const parentResourceId = resource?.id;
  const resourceKind = resource?.resourceKind;
  useEffect(() => {
    let active = true;
    if (!parentResourceId || resourceKind !== 'folder') return () => { active = false; };
    const version = ++childVersion.current;
    void Promise.resolve().then(async () => {
      if (!active) return;
      setChildren([]); setChildrenError(''); setChildrenLoading(true);
      try {
        const page = await listStudyResourcePage({ parentResourceId, search: debouncedChildSearch, offset: 0, limit: 10 });
        if (active && version === childVersion.current) { setChildren(page.items); setChildrenHasMore(page.hasMore); }
      } catch (cause) {
        if (active && version === childVersion.current) { setChildrenError(cause instanceof Error ? cause.message : 'Could not load PDFs from this folder.'); setChildrenHasMore(false); }
      } finally {
        if (active && version === childVersion.current) setChildrenLoading(false);
      }
    });
    return () => { active = false; };
  }, [parentResourceId, resourceKind, debouncedChildSearch, childReload]);
  const loadMoreChildren = async () => {
    if (!resource || childRequest.current || !childrenHasMore) return;
    const version = childVersion.current;
    childRequest.current = true; setChildrenLoadingMore(true);
    try {
      const page = await listStudyResourcePage({ parentResourceId: resource.id, search: debouncedChildSearch, offset: children.length, limit: 10 });
      if (version === childVersion.current) { setChildren((current) => [...current, ...page.items.filter((item) => !current.some((existing) => existing.id === item.id))]); setChildrenHasMore(page.hasMore); }
    } catch (cause) { if (version === childVersion.current) setChildrenError(cause instanceof Error ? cause.message : 'Could not load more PDFs.'); }
    finally { childRequest.current = false; setChildrenLoadingMore(false); }
  };
  const report = () => Alert.alert('Report broken link?', 'This reports that the Google Drive link may no longer work.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Report', onPress: () => void reportBrokenResource(id).then(() => Alert.alert('Report sent', 'Thanks for helping keep Study Hub useful.')).catch(() => Alert.alert('Could not send report', 'Please sign in and try again.')) }]);
  const own = Boolean(resource && resource.resourceKind !== 'pdf' && session?.user.id === resource.uploader.id);
  const remove = () => Alert.alert('Delete resource?', 'The metadata will be removed from Study Hub. The file remains in your Drive.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void removeStudyResource(id).then(() => safeBack()).catch((cause) => Alert.alert('Could not delete', cause.message)) }]);
  return <SafeAreaView style={styles.safe}>
    <View style={styles.header}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back" onPress={() => safeBack()} style={styles.back}><Ionicons name="arrow-back" size={21} color={Colors.textPrimary}/></TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>{resource?.resourceKind === 'pdf' ? 'PDF Details' : 'Resource details'}</Text>
      {resource?.resourceKind === 'pdf' ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={saved ? 'Remove saved PDF' : 'Bookmark PDF'} onPress={() => void saveResource(id, !saved).then(() => setSaved(!saved)).catch((cause) => Alert.alert('Could not save', cause.message))} style={styles.back}><Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={20} color={saved ? Colors.primary : Colors.textPrimary}/></TouchableOpacity> : resource?.resourceKind === 'link' ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Share resource" onPress={() => resource.pdfUrl && Share.share({ title: resource.title, message: resource.pdfUrl })} style={styles.back}><Ionicons name="share-social-outline" size={20} color={Colors.textPrimary}/></TouchableOpacity> : null}
    </View>
    {loading ? <View style={styles.state}><ActivityIndicator color={Colors.primary}/><Text style={styles.muted}>Loading resource...</Text></View>
      : error || !resource ? <View style={styles.state}><Text style={styles.muted}>{error || 'This resource is unavailable.'}</Text></View>
      : resource.resourceKind === 'pdf' ? <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pdfContent}>
        <View style={[styles.pdfContentInner, { maxWidth: screenWidth >= 900 ? 820 : 720 }]}>
          <View style={styles.identityCard}>
            <View style={styles.pdfIcon}><Ionicons name="document-text" size={21} color={Colors.primary}/></View>
            <View style={styles.identityCopy}>
              <Text style={styles.filename}>{resource.pdfFileName || resource.fileName}</Text>
              {resource.title && resource.title !== (resource.pdfFileName || resource.fileName) ? <Text style={styles.documentTitle}>{resource.title}</Text> : null}
              <Text style={styles.subject}>{resource.subject}</Text>
              <View style={styles.chips}>
                {resource.studyYear ? <Text style={styles.chip}>Year {resource.studyYear}</Text> : null}
                {resource.semester ? <Text style={styles.chip}>Semester {resource.semester}</Text> : null}
                {resource.regulation ? <Text style={styles.chip}>{resource.regulation}</Text> : null}
                {resource.fileSizeMb != null ? <Text style={styles.chip}>{resource.fileSizeMb.toFixed(2)} MB</Text> : null}
              </View>
            </View>
          </View>
          <View style={styles.readerWrap}><DrivePdfPreview key={resource.pdfUrl} url={resource.pdfUrl || ''} height={Math.max(340, Math.min(560, screenHeight * 0.54))} readerMode/></View>
          <CommunityLearningLinks resource={resource} userId={session?.user.id}/>
          <View style={styles.infoCard}>
            <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: infoExpanded }} style={styles.infoToggle} onPress={() => setInfoExpanded((value) => !value)}>
              <View style={styles.infoHeadingCopy}><Text style={styles.infoTitle}>Document information</Text><Text style={styles.infoHint}>College, uploader and file details</Text></View>
              <Ionicons name={infoExpanded ? 'chevron-up' : 'chevron-down'} size={19} color={Colors.textMuted}/>
            </TouchableOpacity>
            {infoExpanded ? <View style={styles.infoGrid}>
              <View style={styles.infoItem}><Text style={styles.infoLabel}>College</Text><Text style={styles.infoValue}>{resource.college || 'Not provided'}</Text></View>
              <View style={styles.infoItem}><Text style={styles.infoLabel}>Degree</Text><Text style={styles.infoValue}>{resource.degree || 'Not provided'}</Text></View>
              <View style={styles.infoItem}><Text style={styles.infoLabel}>Category</Text><Text style={styles.infoValue}>{resource.type.replaceAll('_', ' ')}</Text></View>
              <View style={styles.infoItem}><Text style={styles.infoLabel}>Regulation</Text><Text style={styles.infoValue}>{resource.regulation || 'Not provided'}</Text></View>
              <View style={styles.infoItem}><Text style={styles.infoLabel}>Language</Text><Text style={styles.infoValue}>{resource.language || 'Not provided'}</Text></View>
              <View style={styles.infoItem}><Text style={styles.infoLabel}>File size</Text><Text style={styles.infoValue}>{resource.fileSizeMb != null ? resource.fileSizeMb.toFixed(2) + ' MB' : 'Not provided'}</Text></View>
              <View style={styles.infoItem}><Text style={styles.infoLabel}>Uploader</Text><Text style={styles.infoValue}>{resource.uploader.name}</Text></View>
              <View style={styles.infoItem}><Text style={styles.infoLabel}>Created</Text><Text style={styles.infoValue}>{resource.createdAt ? new Date(resource.createdAt).toLocaleDateString() : 'Not provided'}</Text></View>
            </View> : null}
          </View>
          <TouchableOpacity accessibilityRole="link" style={styles.driveButton} onPress={() => resource.pdfUrl && openDriveResource(resource.pdfUrl)}><Ionicons name="open-outline" size={18} color={Colors.textPrimary}/><Text style={styles.driveButtonText}>Open in Google Drive</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={styles.report} onPress={report}><Ionicons name="flag-outline" size={15} color={Colors.textMuted}/><Text style={styles.reportText}>Report broken PDF link</Text></TouchableOpacity>
        </View>
      </ScrollView> : <ScrollView contentContainerStyle={styles.content}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginBottom: 10 }}>{own ? <><TouchableOpacity onPress={() => router.push({ pathname: '/share-resource', params: { id } })}><Text style={styles.reportText}>Edit resource</Text></TouchableOpacity><TouchableOpacity onPress={remove}><Text style={[styles.reportText, { color: '#FF6B63' }]}>Delete</Text></TouchableOpacity></> : null}<TouchableOpacity onPress={() => void saveResource(id, !saved).then(() => setSaved(!saved)).catch((cause) => Alert.alert('Could not save', cause.message))}><Text style={styles.reportText}>{saved ? 'Saved' : 'Save'}</Text></TouchableOpacity></View>
      <View style={styles.icon}><Ionicons name={resource.resourceKind === 'folder' ? 'folder-open' : 'document-text'} size={32} color="#FF6B63"/></View><Text style={styles.title}>{resource.title}</Text><Text style={styles.subtitle}>{resource.subject} - {resource.studyYear ? 'Year ' + resource.studyYear : 'Year not provided'} - {resource.semester ? 'Semester ' + resource.semester : 'Semester not provided'}</Text>
      {resource.resourceKind === 'folder' ? <View style={styles.pdfListing}>
        <Text style={styles.metaLabel}>PDF FILES IN THIS FOLDER</Text>
        <TextInput accessibilityLabel="Search PDFs in folder" value={childSearch} onChangeText={setChildSearch} placeholder="Search filenames or subject" placeholderTextColor={Colors.textSubtle} style={styles.childSearch} />
        {childrenLoading && !children.length ? <View style={styles.childState}><ActivityIndicator color={Colors.primary}/><Text style={styles.muted}>Loading indexed PDFs...</Text></View> : null}
        {childrenError ? <View style={styles.childState}><Text style={styles.muted}>{childrenError}</Text><TouchableOpacity onPress={() => setChildReload((value) => value + 1)}><Text style={styles.reportText}>Retry</Text></TouchableOpacity></View> : null}
        {!childrenLoading && !childrenError && !children.length ? <Text style={styles.muted}>No indexed PDFs are available for this folder yet. The authorized Drive indexer must run and the files must be shared for access.</Text> : null}
        {children.map((child) => <View key={child.id} style={styles.childRow}>
          <TouchableOpacity style={styles.childInfo} accessibilityRole="button" onPress={() => router.push('/academic-library')}>
            <Text style={styles.childTitle} numberOfLines={2}>{child.fileName}</Text>
            <Text style={styles.childMeta}>{child.subject} - Year {child.studyYear || 'Not provided'} - Semester {child.semester || 'Not provided'}</Text>
            <Text style={styles.childMeta}>{child.type.replaceAll('_', ' ')}{child.driveFileSize != null ? ' - ' + (child.driveFileSize / (1024 * 1024)).toFixed(1) + ' MB' : ''}</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityLabel={child.isBookmarked ? 'Unsave PDF' : 'Save PDF'} onPress={() => void saveResource(child.id, !child.isBookmarked).then(() => setChildren((items) => items.map((item) => item.id === child.id ? { ...item, isBookmarked: !child.isBookmarked } : item))).catch((cause) => Alert.alert('Could not save', cause.message))}>
            <Ionicons name={child.isBookmarked ? 'bookmark' : 'bookmark-outline'} size={20} color={child.isBookmarked ? Colors.primary : Colors.textMuted}/>
          </TouchableOpacity>
        </View>)}
        {childrenHasMore ? <TouchableOpacity accessibilityRole="button" style={styles.loadMore} disabled={childrenLoadingMore} onPress={() => void loadMoreChildren()}>{childrenLoadingMore ? <ActivityIndicator color={Colors.primary}/> : <Text style={styles.reportText}>Load more PDFs</Text>}</TouchableOpacity> : null}
      </View> : <DrivePdfPreview key={resource.pdfUrl} url={resource.pdfUrl || ''} />}
      <View style={styles.meta}><Text style={styles.metaLabel}>Category</Text><Text style={styles.metaValue}>{resource.type.replaceAll('_', ' ')}</Text></View>
      {resource.college || resource.university ? <View style={styles.meta}><Text style={styles.metaLabel}>College / University</Text><Text style={styles.metaValue}>{[resource.college, resource.university].filter(Boolean).join(' · ')}</Text></View> : null}
      {resource.degree || resource.branch ? <View style={styles.meta}><Text style={styles.metaLabel}>Program / Branch</Text><Text style={styles.metaValue}>{[resource.degree, resource.branch].filter(Boolean).join(' · ')}</Text></View> : null}
      {resource.studyYear || resource.semester ? <View style={styles.meta}><Text style={styles.metaLabel}>Year / Semester</Text><Text style={styles.metaValue}>{[resource.studyYear && `Year ${resource.studyYear}`, resource.semester && `Semester ${resource.semester}`].filter(Boolean).join(' · ')}</Text></View> : null}
      {resource.subjectCode || resource.regulation || resource.unitModule ? <View style={styles.meta}><Text style={styles.metaLabel}>Syllabus details</Text><Text style={styles.metaValue}>{[resource.subjectCode && `Code ${resource.subjectCode}`, resource.regulation, resource.unitModule && `Unit ${resource.unitModule}`].filter(Boolean).join(' · ')}</Text></View> : null}
      {resource.language ? <View style={styles.meta}><Text style={styles.metaLabel}>Language</Text><Text style={styles.metaValue}>{resource.language}</Text></View> : null}
      {resource.fileName ? <View style={styles.meta}><Text style={styles.metaLabel}>Drive filename</Text><Text style={styles.metaValue}>{resource.fileName}</Text></View> : null}
      {resource.driveFileSize != null ? <View style={styles.meta}><Text style={styles.metaLabel}>File size</Text><Text style={styles.metaValue}>{(resource.driveFileSize / (1024 * 1024)).toFixed(2)} MB</Text></View> : null}
      {resource.driveCreatedAt ? <View style={styles.meta}><Text style={styles.metaLabel}>Drive created</Text><Text style={styles.metaValue}>{new Date(resource.driveCreatedAt).toLocaleDateString()}</Text></View> : null}
      {resource.driveMimeType ? <View style={styles.meta}><Text style={styles.metaLabel}>File type</Text><Text style={styles.metaValue}>{resource.driveMimeType}</Text></View> : null}
      {resource.driveModifiedAt ? <View style={styles.meta}><Text style={styles.metaLabel}>Last modified</Text><Text style={styles.metaValue}>{new Date(resource.driveModifiedAt).toLocaleDateString()}</Text></View> : null}
      <View style={styles.meta}><Text style={styles.metaLabel}>Shared by</Text><Text style={styles.metaValue}>{resource.uploader.name}{resource.uploader.college ? `· ${resource.uploader.college}` : ''}</Text></View>
      {resource.description ? <View style={styles.meta}><Text style={styles.metaLabel}>Description</Text><Text style={styles.metaValue}>{resource.description}</Text></View> : null}
      {resource.resourceKind === 'folder' ? <TouchableOpacity style={styles.open} onPress={() => router.push('/academic-library')}><Ionicons name="library-outline" size={18} color="#FFF"/><Text style={styles.openText}>Browse PDFs in STUDOS</Text></TouchableOpacity> : <TouchableOpacity style={styles.open} onPress={() => resource.pdfUrl && openDriveResource(resource.pdfUrl)}><Ionicons name="open-outline" size={18} color="#FFF"/><Text style={styles.openText}>Open in Google Drive</Text></TouchableOpacity>}
      <TouchableOpacity style={styles.report} onPress={report}><Text style={styles.reportText}>Report a broken link</Text></TouchableOpacity>
      <Text style={styles.note}>The file is hosted in the contributor&apos;s Google Drive. Access depends on their sharing settings.</Text>
    </ScrollView>}
  </SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: Colors.background }, header: { minHeight: 62, borderBottomWidth: 1, borderBottomColor: Colors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.screenPadding, gap: 12, backgroundColor: Colors.background }, back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border }, headerTitle: { flex: 1, minWidth: 0, color: Colors.textPrimary, fontWeight: Typography.bold, fontSize: 16 }, content: { padding: Spacing.screenPadding, paddingBottom: 36 }, heroIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: Colors.primarySubtle, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }, icon: { width: 58, height: 58, borderRadius: 18, backgroundColor: Colors.primarySubtle, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }, titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, title: { flex: 1, minWidth: 0, color: Colors.textPrimary, fontSize: 23, lineHeight: 31, fontWeight: Typography.bold, letterSpacing: -0.3 }, saveButton: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 14 }, subtitle: { color: Colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 14 }, meta: { paddingVertical: 14, borderTopWidth: 1, borderTopColor: Colors.border, gap: 5 }, metaLabel: { color: Colors.textMuted, fontWeight: Typography.semiBold, fontSize: 11, lineHeight: 16, textTransform: 'uppercase', letterSpacing: 0.5 }, metaValue: { color: Colors.textPrimary, fontSize: 14, lineHeight: 21 }, open: { minHeight: 52, marginTop: 18, borderRadius: 14, backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, openText: { color: Colors.textOnPrimary, fontWeight: Typography.bold, fontSize: 15 }, report: { alignItems: 'center', padding: 15, minHeight: 48, justifyContent: 'center' }, reportText: { color: Colors.primary, fontWeight: Typography.semiBold, fontSize: 13 }, pdfListing: { marginTop: 18, marginBottom: 16, padding: 14, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg, backgroundColor: Colors.surface, gap: 10 }, childSearch: { color: Colors.textPrimary, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 11, minHeight: 44, paddingHorizontal: 12, fontSize: 13 }, childState: { minHeight: 64, alignItems: 'center', justifyContent: 'center', gap: 8 }, childRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.border }, childInfo: { flex: 1, gap: 5 }, childTitle: { color: Colors.textPrimary, fontSize: 14, lineHeight: 20, fontWeight: Typography.semiBold }, childMeta: { color: Colors.textMuted, fontSize: 11, lineHeight: 16 }, loadMore: { padding: 12, alignItems: 'center', borderRadius: 10, backgroundColor: Colors.surfaceHighlight }, note: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 8 }, state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 25 }, muted: { color: Colors.textMuted, textAlign: 'center', lineHeight: 21 }, pdfUnavailable: { marginTop: 20, padding: 18, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, backgroundColor: Colors.surface }, pdfUnavailableTitle: { color: Colors.textPrimary, fontSize: 15, fontWeight: Typography.bold },
  pdfContent: { width: '100%', alignItems: 'center', paddingHorizontal: Spacing.screenPadding, paddingTop: 14, paddingBottom: 34 },
  pdfContentInner: { width: '100%', alignSelf: 'center' },
  identityCard: { width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 15, borderRadius: 17, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  pdfIcon: { width: 42, height: 42, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: Colors.primarySubtle },
  identityCopy: { flex: 1, minWidth: 0, gap: 4 },
  filename: { color: Colors.textPrimary, fontSize: 17, lineHeight: 23, fontWeight: Typography.bold, flexShrink: 1 },
  documentTitle: { color: Colors.textSecondary, fontSize: 12, lineHeight: 17 },
  subject: { color: Colors.textMuted, fontSize: 13, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chip: { overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9, color: Colors.textSecondary, backgroundColor: Colors.surfaceHighlight, fontSize: 10, lineHeight: 14 },
  readerWrap: { width: '100%', marginTop: 12 },
  infoCard: { width: '100%', marginTop: 18, borderRadius: 15, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, overflow: 'hidden' },
  infoToggle: { minHeight: 64, paddingHorizontal: 15, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoHeadingCopy: { flex: 1, minWidth: 0, gap: 3 },
  infoTitle: { color: Colors.textPrimary, fontSize: 14, lineHeight: 19, fontWeight: Typography.semiBold },
  infoHint: { color: Colors.textMuted, fontSize: 11, lineHeight: 16 },
  infoGrid: { paddingHorizontal: 15, paddingBottom: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  infoItem: { width: '47%', minWidth: 120, paddingTop: 12, gap: 3 },
  infoLabel: { color: Colors.textMuted, fontSize: 9, lineHeight: 13, fontWeight: Typography.semiBold, letterSpacing: 0.55, textTransform: 'uppercase' },
  infoValue: { color: Colors.textPrimary, fontSize: 12, lineHeight: 17, flexShrink: 1 },
  driveButton: { width: '100%', minHeight: 46, marginTop: 13, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderLight, backgroundColor: Colors.surface },
  driveButtonText: { color: Colors.textPrimary, fontSize: 13, fontWeight: Typography.semiBold }, });
