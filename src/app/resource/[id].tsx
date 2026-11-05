import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchResource, isResourceSaved, listStudyResourcePage, openDriveResource, reportBrokenResource, removeStudyResource, saveResource } from '../../services/resourceApi';
import { StudyResource } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { DrivePdfPreview } from '../../components/home/DrivePdfPreview';

export default function ResourceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth(); const [saved, setSaved] = useState(false);
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
  const remove = () => Alert.alert('Delete resource?', 'The metadata will be removed from Study Hub. The file remains in your Drive.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void removeStudyResource(id).then(() => router.back()).catch((cause) => Alert.alert('Could not delete', cause.message)) }]);
  return <SafeAreaView style={styles.safe}><View style={styles.header}><TouchableOpacity accessibilityLabel="Back" onPress={() => router.back()}><Ionicons name="arrow-back" size={23} color="#FFF"/></TouchableOpacity><Text style={styles.headerTitle}>Study resource</Text>{resource?.resourceKind === 'link' ? <TouchableOpacity accessibilityLabel="Share resource" onPress={() => resource.pdfUrl && Share.share({ title: resource.title, message: resource.pdfUrl })}><Ionicons name="share-social-outline" size={21} color="#FFF"/></TouchableOpacity> : null}</View>
    {loading ? <View style={styles.state}><ActivityIndicator color="#FF3B30"/><Text style={styles.muted}>Loading resource…</Text></View> : error || !resource ? <View style={styles.state}><Text style={styles.muted}>{error || 'This resource is unavailable.'}</Text></View> : resource.resourceKind === 'pdf' ? <ScrollView contentContainerStyle={styles.content}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 }}><TouchableOpacity onPress={() => void saveResource(id, !saved).then(() => setSaved(!saved)).catch((cause) => Alert.alert('Could not save', cause.message))}><Text style={styles.reportText}>{saved ? 'Saved' : 'Save PDF'}</Text></TouchableOpacity></View>
      <View style={styles.icon}><Ionicons name="document-text" size={32} color="#FF6B63"/></View>
      <Text style={styles.title}>{resource.pdfFileName || resource.fileName}</Text>
      {resource.title ? <Text style={styles.subtitle}>Resource title: {resource.title}</Text> : null}
      <View style={styles.meta}><Text style={styles.metaLabel}>Subject</Text><Text style={styles.metaValue}>{resource.subject}</Text></View>
      <View style={styles.meta}><Text style={styles.metaLabel}>Year and semester</Text><Text style={styles.metaValue}>{[resource.studyYear ? `Year ${resource.studyYear}` : null, resource.semester ? `Semester ${resource.semester}` : null].filter(Boolean).join(' · ') || 'Not provided'}</Text></View>
      <View style={styles.meta}><Text style={styles.metaLabel}>Category</Text><Text style={styles.metaValue}>{resource.type.replaceAll('_', ' ')}</Text></View>
      <View style={styles.meta}><Text style={styles.metaLabel}>College</Text><Text style={styles.metaValue}>{resource.college || 'Not provided'}</Text></View>
      <View style={styles.meta}><Text style={styles.metaLabel}>Degree</Text><Text style={styles.metaValue}>{resource.degree || 'Not provided'}</Text></View>
      <View style={styles.meta}><Text style={styles.metaLabel}>Regulation</Text><Text style={styles.metaValue}>{resource.regulation || 'Not provided'}</Text></View>
      {resource.fileSizeMb != null ? <View style={styles.meta}><Text style={styles.metaLabel}>File size</Text><Text style={styles.metaValue}>{resource.fileSizeMb.toFixed(2)} MB</Text></View> : null}
      <View style={styles.meta}><Text style={styles.metaLabel}>Uploaded by</Text><Text style={styles.metaValue}>{resource.uploader.name}</Text></View>
      {resource.createdAt ? <View style={styles.meta}><Text style={styles.metaLabel}>Created</Text><Text style={styles.metaValue}>{new Date(resource.createdAt).toLocaleDateString()}</Text></View> : null}
      <DrivePdfPreview key={resource.pdfUrl} url={resource.pdfUrl || ''} height={520} />
      <TouchableOpacity style={styles.open} onPress={() => resource.pdfUrl && openDriveResource(resource.pdfUrl)}><Ionicons name="open-outline" size={18} color="#FFF"/><Text style={styles.openText}>Open in Google Drive</Text></TouchableOpacity>
      <TouchableOpacity style={styles.report} onPress={report}><Text style={styles.reportText}>Report a broken PDF link</Text></TouchableOpacity>
    </ScrollView> : <ScrollView contentContainerStyle={styles.content}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginBottom: 10 }}>{own ? <><TouchableOpacity onPress={() => router.push({ pathname: '/share-resource', params: { id } })}><Text style={styles.reportText}>Edit resource</Text></TouchableOpacity><TouchableOpacity onPress={remove}><Text style={[styles.reportText, { color: '#FF6B63' }]}>Delete</Text></TouchableOpacity></> : null}<TouchableOpacity onPress={() => void saveResource(id, !saved).then(() => setSaved(!saved)).catch((cause) => Alert.alert('Could not save', cause.message))}><Text style={styles.reportText}>{saved ? 'Saved' : 'Save'}</Text></TouchableOpacity></View>
      <View style={styles.icon}><Ionicons name={resource.resourceKind === 'folder' ? 'folder-open' : 'document-text'} size={32} color="#FF6B63"/></View><Text style={styles.title}>{resource.title}</Text><Text style={styles.subtitle}>{resource.subject} - {resource.studyYear ? 'Year ' + resource.studyYear : 'Year not provided'} - {resource.semester ? 'Semester ' + resource.semester : 'Semester not provided'}</Text>
      {resource.resourceKind === 'folder' ? <View style={styles.pdfListing}>
        <Text style={styles.metaLabel}>PDF FILES IN THIS FOLDER</Text>
        <TextInput accessibilityLabel="Search PDFs in folder" value={childSearch} onChangeText={setChildSearch} placeholder="Search filenames or subject" placeholderTextColor="#777F90" style={styles.childSearch} />
        {childrenLoading && !children.length ? <View style={styles.childState}><ActivityIndicator color="#FF3B30"/><Text style={styles.muted}>Loading indexed PDFs&</Text></View> : null}
        {childrenError ? <View style={styles.childState}><Text style={styles.muted}>{childrenError}</Text><TouchableOpacity onPress={() => setChildReload((value) => value + 1)}><Text style={styles.reportText}>Retry</Text></TouchableOpacity></View> : null}
        {!childrenLoading && !childrenError && !children.length ? <Text style={styles.muted}>No indexed PDFs are available for this folder yet. The authorized Drive indexer must run and the files must be shared for access.</Text> : null}
        {children.map((child) => <View key={child.id} style={styles.childRow}>
          <TouchableOpacity style={styles.childInfo} accessibilityRole="button" onPress={() => router.push('/academic-library')}>
            <Text style={styles.childTitle} numberOfLines={2}>{child.fileName}</Text>
            <Text style={styles.childMeta}>{child.subject} - Year {child.studyYear || 'Not provided'} - Semester {child.semester || 'Not provided'}</Text>
            <Text style={styles.childMeta}>{child.type.replaceAll('_', ' ')}{child.driveFileSize != null ? ' - ' + (child.driveFileSize / (1024 * 1024)).toFixed(1) + ' MB' : ''}</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityLabel={child.isBookmarked ? 'Unsave PDF' : 'Save PDF'} onPress={() => void saveResource(child.id, !child.isBookmarked).then(() => setChildren((items) => items.map((item) => item.id === child.id ? { ...item, isBookmarked: !child.isBookmarked } : item))).catch((cause) => Alert.alert('Could not save', cause.message))}>
            <Ionicons name={child.isBookmarked ? 'bookmark' : 'bookmark-outline'} size={20} color={child.isBookmarked ? '#FF3B30' : '#A5ACBA'}/>
          </TouchableOpacity>
        </View>)}
        {childrenHasMore ? <TouchableOpacity style={styles.loadMore} disabled={childrenLoadingMore} onPress={() => void loadMoreChildren()}>{childrenLoadingMore ? <ActivityIndicator color="#FF3B30"/> : <Text style={styles.reportText}>Load more PDFs</Text>}</TouchableOpacity> : null}
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
      <View style={styles.meta}><Text style={styles.metaLabel}>Shared by</Text><Text style={styles.metaValue}>{resource.uploader.name}{resource.uploader.college ? ` · ${resource.uploader.college}` : ''}</Text></View>
      {resource.description ? <View style={styles.meta}><Text style={styles.metaLabel}>Description</Text><Text style={styles.metaValue}>{resource.description}</Text></View> : null}
      {resource.resourceKind === 'folder' ? <TouchableOpacity style={styles.open} onPress={() => router.push('/academic-library')}><Ionicons name="library-outline" size={18} color="#FFF"/><Text style={styles.openText}>Browse PDFs in STUDOS</Text></TouchableOpacity> : <TouchableOpacity style={styles.open} onPress={() => resource.pdfUrl && openDriveResource(resource.pdfUrl)}><Ionicons name="open-outline" size={18} color="#FFF"/><Text style={styles.openText}>Open in Google Drive</Text></TouchableOpacity>}
      <TouchableOpacity style={styles.report} onPress={report}><Text style={styles.reportText}>Report a broken link</Text></TouchableOpacity>
      <Text style={styles.note}>The file is hosted in the contributor’s Google Drive. Access depends on their sharing settings.</Text>
    </ScrollView>}
  </SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#090B0F' }, header: { height: 56, borderBottomWidth: 1, borderBottomColor: '#252C3D', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 16 }, headerTitle: { flex: 1, color: '#FFF', fontWeight: '700', fontSize: 16 }, content: { padding: 22 }, icon: { width: 64, height: 64, borderRadius: 18, backgroundColor: '#211717', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }, title: { color: '#FFF', fontSize: 26, lineHeight: 33, fontWeight: '800' }, subtitle: { color: '#A5ACBA', fontSize: 14, marginTop: 8, marginBottom: 20 }, meta: { paddingVertical: 15, borderTopWidth: 1, borderTopColor: '#252C3D', gap: 6 }, metaLabel: { color: '#929AAA', fontWeight: '700', fontSize: 12, textTransform: 'uppercase' }, metaValue: { color: '#E9ECF3', fontSize: 15, lineHeight: 22 }, open: { height: 52, marginTop: 18, borderRadius: 12, backgroundColor: '#FF3B30', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, openText: { color: '#FFF', fontWeight: '800', fontSize: 15 }, report: { alignItems: 'center', padding: 15 }, reportText: { color: '#FF8C86', fontWeight: '600', fontSize: 13 }, pdfListing: { marginTop: 18, marginBottom: 16, padding: 14, borderWidth: 1, borderColor: '#252C3D', borderRadius: 12, backgroundColor: '#11141C', gap: 10 }, childSearch: { color: '#FFF', backgroundColor: '#090B0F', borderWidth: 1, borderColor: '#252C3D', borderRadius: 9, minHeight: 42, paddingHorizontal: 11, fontSize: 13 }, childState: { minHeight: 64, alignItems: 'center', justifyContent: 'center', gap: 8 }, childRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#252C3D' }, childInfo: { flex: 1, gap: 5 }, childTitle: { color: '#E9ECF3', fontSize: 14, fontWeight: '700' }, childMeta: { color: '#929AAA', fontSize: 11 }, loadMore: { padding: 12, alignItems: 'center', borderRadius: 8, backgroundColor: '#1B202B' }, note: { color: '#777F90', fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 8 }, state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 25 }, muted: { color: '#A5ACBA', textAlign: 'center' }, pdfUnavailable: { marginTop: 20, padding: 18, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#5A3B36', borderRadius: 14, backgroundColor: '#211717' }, pdfUnavailableTitle: { color: '#FFF', fontSize: 15, fontWeight: '800' } });
