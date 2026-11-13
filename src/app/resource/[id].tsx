import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { safeBack } from '@/navigation/safeBack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchResource, isResourceSaved, listStudyResourcePage, openDriveResource, reportBrokenResource, removeStudyResource, saveResource } from '../../services/resourceApi';
import { StudyResource } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { DrivePdfPreview } from '../../components/home/DrivePdfPreview';
import { LearningResourcesAction } from '../../components/resources/LearningResourcesAction';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/theme';
import { appendUniqueResources } from '../../utils/resourceDetail';

export default function ResourceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { session } = useAuth(); const [saved, setSaved] = useState(false);
  const [readerAreaHeight, setReaderAreaHeight] = useState(0);
  const [resource, setResource] = useState<StudyResource>(); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [children, setChildren] = useState<StudyResource[]>([]); const [childrenLoading, setChildrenLoading] = useState(false); const [childrenLoadingMore, setChildrenLoadingMore] = useState(false); const [childrenHasMore, setChildrenHasMore] = useState(false); const [childrenError, setChildrenError] = useState(''); const [childSearch, setChildSearch] = useState(''); const [debouncedChildSearch, setDebouncedChildSearch] = useState(''); const [childReload, setChildReload] = useState(0); const childRequest = React.useRef(false); const childVersion = React.useRef(0);
  useEffect(() => {
    let active = true;
    if (!id) return;
    void fetchResource(id).then((item) => {
      if (active) { setResource(item); setLoading(false); }
      void isResourceSaved(id).then((savedItem) => { if (active) setSaved(savedItem); }).catch(() => { if (active) setSaved(false); });
    }).catch((cause) => { if (active) { setError(cause instanceof Error ? cause.message : 'Resource unavailable.'); setLoading(false); } });
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
      if (version === childVersion.current) { setChildren((current) => appendUniqueResources(current, page.items)); setChildrenHasMore(page.hasMore); }
    } catch (cause) { if (version === childVersion.current) setChildrenError(cause instanceof Error ? cause.message : 'Could not load more PDFs.'); }
    finally { childRequest.current = false; setChildrenLoadingMore(false); }
  };
  const report = () => Alert.alert('Report broken link?', 'This reports that the Google Drive link may no longer work.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Report', onPress: () => void reportBrokenResource(id).then(() => Alert.alert('Report sent', 'Thanks for helping keep Study Hub useful.')).catch(() => Alert.alert('Could not send report', 'Please sign in and try again.')) }]);
  const own = Boolean(resource && resource.resourceKind !== 'pdf' && session?.user.id === resource.uploader.id);
  const remove = () => Alert.alert('Delete resource?', 'The metadata will be removed from Study Hub. The file remains in your Drive.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void removeStudyResource(id).then(() => safeBack()).catch((cause) => Alert.alert('Could not delete', cause.message)) }]);
  return <SafeAreaView style={styles.safe}>
    {resource?.resourceKind === 'pdf' ? null : <View style={styles.header}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back" onPress={() => safeBack()} style={styles.back}><Ionicons name="arrow-back" size={21} color={Colors.textPrimary}/></TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>Resource details</Text>
      {resource?.resourceKind === 'link' ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Share resource" onPress={() => resource.pdfUrl && Share.share({ title: resource.title, message: resource.pdfUrl })} style={styles.back}><Ionicons name="share-social-outline" size={20} color={Colors.textPrimary}/></TouchableOpacity> : null}
    </View>}
    {loading ? <View style={styles.state}><ActivityIndicator color={Colors.primary}/><Text style={styles.muted}>Loading resource...</Text></View>
      : error || !resource ? <View style={styles.state}><Text style={styles.muted}>{error || 'This resource is unavailable.'}</Text></View>
      : resource.resourceKind === 'pdf' ? <View style={styles.readerArea} onLayout={(event) => { const height = event.nativeEvent.layout.height; setReaderAreaHeight((current) => Math.abs(current - height) > 1 ? height : current); }}>
        <DrivePdfPreview key={resource.pdfUrl} url={resource.pdfUrl || ''} height={readerAreaHeight || Math.max(240, screenHeight - insets.top - insets.bottom)} readerMode onOpenExternal={() => { if (resource.pdfUrl) void openDriveResource(resource.pdfUrl).catch(() => Alert.alert('Could not open document', 'Check that the Google Drive file is shared and try again.')); }} />
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back" onPress={() => safeBack()} style={{ position: 'absolute', top: 12, left: 12, width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: 'rgba(26,29,36,0.88)', zIndex: 4 }}><Ionicons name="arrow-back" size={20} color={Colors.textPrimary}/></TouchableOpacity>
        <LearningResourcesAction resource={resource} userId={session?.user.id} />
      </View> : <ScrollView contentContainerStyle={styles.content}>
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
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: Colors.background }, header: { minHeight: 54, borderBottomWidth: 1, borderBottomColor: Colors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 7, backgroundColor: Colors.background }, back: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border }, headerTitle: { flex: 1, minWidth: 0, color: Colors.textPrimary, fontWeight: Typography.semiBold, fontSize: 14 }, readerArea: { flex: 1, minHeight: 0, position: 'relative', backgroundColor: '#10131A' }, moreOverlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.48)' }, moreSheet: { width: '100%', maxWidth: 560, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderBottomWidth: 0, borderColor: Colors.border, backgroundColor: Colors.surface }, moreHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }, moreTitle: { color: Colors.textPrimary, fontSize: 17, fontWeight: Typography.bold }, moreSectionTitle: { color: Colors.textMuted, fontSize: 10, fontWeight: Typography.semiBold, letterSpacing: 0.8, marginBottom: 5 }, detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border }, detailLabel: { color: Colors.textMuted, fontSize: 12 }, detailValue: { flex: 1, color: Colors.textPrimary, fontSize: 12, textAlign: 'right' }, moreActions: { marginTop: 13, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border }, moreAction: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border }, moreActionText: { color: Colors.textPrimary, fontSize: 13 }, content: { padding: Spacing.screenPadding, paddingBottom: 24 }, heroIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: Colors.primarySubtle, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }, icon: { width: 48, height: 48, borderRadius: 12, backgroundColor: Colors.primarySubtle, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }, titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, title: { flex: 1, minWidth: 0, color: Colors.textPrimary, fontSize: 22, lineHeight: 29, fontWeight: Typography.semiBold }, saveButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 12 }, subtitle: { color: Colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 6, marginBottom: 12 }, meta: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.border, gap: 4 }, metaLabel: { color: Colors.textMuted, fontWeight: Typography.medium, fontSize: 12, lineHeight: 16 }, metaValue: { color: Colors.textPrimary, fontSize: 14, lineHeight: 21 }, open: { minHeight: 48, marginTop: 16, borderRadius: 12, backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, openText: { color: Colors.textOnPrimary, fontWeight: Typography.semiBold, fontSize: 14 }, report: { alignItems: 'center', padding: 12, minHeight: 44, justifyContent: 'center' }, reportText: { color: Colors.primary, fontWeight: Typography.medium, fontSize: 13 }, pdfListing: { marginTop: 16, marginBottom: 12, padding: 12, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, backgroundColor: Colors.surface, gap: 8 }, childSearch: { color: Colors.textPrimary, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, minHeight: 44, paddingHorizontal: 12, fontSize: 14 }, childState: { minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 8 }, childRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border }, childInfo: { flex: 1, gap: 4 }, childTitle: { color: Colors.textPrimary, fontSize: 14, lineHeight: 20, fontWeight: Typography.semiBold }, childMeta: { color: Colors.textMuted, fontSize: 12, lineHeight: 16 }, loadMore: { padding: 12, alignItems: 'center', borderRadius: 10, backgroundColor: Colors.surfaceHighlight }, note: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 8 }, state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }, muted: { color: Colors.textMuted, textAlign: 'center', lineHeight: 21 }, pdfUnavailable: { marginTop: 16, padding: 16, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, backgroundColor: Colors.surface }, pdfUnavailableTitle: { color: Colors.textPrimary, fontSize: 15, fontWeight: Typography.semiBold },
});
