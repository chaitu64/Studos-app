import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, ScrollView, Share, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DEMO_STUDY_RESOURCES, DEMO_HOME_POSTS } from '../../services/demoHomeData';
import { fetchResource, pageImageUrl } from '../../services/resourceApi';
import { StudyResource } from '../../types';
import { Colors, Typography } from '../../constants/theme';

export default function ResourceViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const demo = useMemo(() => DEMO_STUDY_RESOURCES.find((item) => item.id === id) || DEMO_HOME_POSTS.find((item) => item.document?.id === id)?.document, [id]);
  const [resource, setResource] = useState<StudyResource | undefined>(demo);
  const [loadingResource, setLoadingResource] = useState(!demo);
  const [page, setPage] = useState(1); const [zoom, setZoom] = useState(1);
  const [imageLoading, setImageLoading] = useState(true); const [imageError, setImageError] = useState(false);
  const { width } = useWindowDimensions();

  useEffect(() => {
    if (demo || !id) return;
    void fetchResource(id, { id: 'unknown', name: 'Student', avatar: '' })
      .then(setResource).catch(() => setResource(undefined)).finally(() => setLoadingResource(false));
  }, [demo, id]);

  if (loadingResource) return <StateView icon="document-text-outline" label="Loading document..." busy />;
  if (!resource) return <StateView icon="alert-circle-outline" label="This document is unavailable or its URL is broken." />;

  const pageWidth = Math.max(280, width - 28) * zoom;
  const pageHeight = pageWidth * (842 / 595);
  const pageUrl = pageImageUrl(resource.id, page);
  const setCurrentPage = (next: number) => { setPage(Math.min(resource.pageCount, Math.max(1, next))); setImageLoading(true); setImageError(false); };

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <View style={styles.header}><TouchableOpacity accessibilityLabel="Return to homepage" onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#FFF" /></TouchableOpacity><View style={styles.headerCopy}><Text style={styles.headerTitle} numberOfLines={1}>{resource.title}</Text><Text style={styles.headerMeta}>Page {page} of {resource.pageCount}</Text></View><TouchableOpacity onPress={() => Share.share({ title: resource.title, message: resource.pdfUrl || resource.title })}><Ionicons name="share-social-outline" size={22} color="#FFF" /></TouchableOpacity></View>
    <View style={styles.toolbar}>
      <TouchableOpacity accessibilityLabel="Previous page" disabled={page === 1} onPress={() => setCurrentPage(page - 1)} style={[styles.tool, page === 1 && styles.disabled]}><Ionicons name="chevron-back" size={20} color="#FFF" /></TouchableOpacity>
      <TouchableOpacity accessibilityLabel="Zoom out" disabled={zoom <= 0.75} onPress={() => setZoom((value) => Math.max(.75, value - .25))} style={styles.tool}><Ionicons name="remove" size={21} color="#FFF" /></TouchableOpacity>
      <Text style={styles.zoom}>{Math.round(zoom * 100)}%</Text>
      <TouchableOpacity accessibilityLabel="Zoom in" disabled={zoom >= 2.5} onPress={() => setZoom((value) => Math.min(2.5, value + .25))} style={styles.tool}><Ionicons name="add" size={21} color="#FFF" /></TouchableOpacity>
      <TouchableOpacity accessibilityLabel="Next page" disabled={page === resource.pageCount} onPress={() => setCurrentPage(page + 1)} style={[styles.tool, page === resource.pageCount && styles.disabled]}><Ionicons name="chevron-forward" size={20} color="#FFF" /></TouchableOpacity>
    </View>
    <ScrollView horizontal={zoom > 1} maximumZoomScale={3} minimumZoomScale={.75} contentContainerStyle={styles.horizontalScroll}>
      <ScrollView contentContainerStyle={styles.viewer} showsVerticalScrollIndicator={false}>
        <View style={[styles.page, { width: pageWidth, height: pageHeight }]}>
          {!imageError ? <Image key={pageUrl} source={{ uri: pageUrl }} style={StyleSheet.absoluteFill} resizeMode="contain" onLoadStart={() => setImageLoading(true)} onLoadEnd={() => setImageLoading(false)} onError={() => { setImageLoading(false); setImageError(true); }} /> : <View style={styles.pageState}><Ionicons name="alert-circle-outline" size={32} color={Colors.textMuted} /><Text style={styles.pageStateText}>Couldn’t render this page.</Text><TouchableOpacity onPress={() => { setImageError(false); setImageLoading(true); }}><Text style={styles.retry}>Try again</Text></TouchableOpacity></View>}
          {imageLoading && !imageError ? <View style={styles.loadingOverlay}><ActivityIndicator color={Colors.primary} /><Text style={styles.pageStateText}>Rendering page {page}...</Text></View> : null}
        </View>
      </ScrollView>
    </ScrollView>
    <View style={styles.bottomBar}><Text style={styles.fileName} numberOfLines={1}>{resource.fileName}</Text><TouchableOpacity disabled={!resource.pdfUrl} style={styles.originalButton} onPress={() => resource.pdfUrl && Linking.openURL(resource.pdfUrl)}><Ionicons name="download-outline" size={17} color="#FFF" /><Text style={styles.originalText}>Original PDF</Text></TouchableOpacity></View>
  </SafeAreaView>;
}

function StateView({ icon, label, busy = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; busy?: boolean }) {
  return <SafeAreaView style={styles.safe}><View style={styles.simpleHeader}><TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#FFF" /></TouchableOpacity></View><View style={styles.state}>{busy ? <ActivityIndicator color={Colors.primary} /> : <Ionicons name={icon} size={36} color={Colors.textMuted} />}<Text style={styles.pageStateText}>{label}</Text></View></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#090A0F' }, header: { height: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#252C3D' }, headerCopy: { flex: 1, marginHorizontal: 12 }, headerTitle: { color: '#FFF', fontSize: 14, fontWeight: Typography.bold }, headerMeta: { color: Colors.textMuted, fontSize: 10, marginTop: 2 }, simpleHeader: { height: 58, paddingHorizontal: 15, justifyContent: 'center' },
  toolbar: { height: 48, backgroundColor: '#121624', borderBottomWidth: 1, borderBottomColor: '#252C3D', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 13 }, tool: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#171D2D' }, disabled: { opacity: .3 }, zoom: { color: Colors.textSecondary, fontSize: 11, minWidth: 38, textAlign: 'center' },
  horizontalScroll: { flexGrow: 1 }, viewer: { padding: 14, alignItems: 'center' }, page: { backgroundColor: '#FFF', borderRadius: 3, overflow: 'hidden' }, loadingOverlay: { ...StyleSheet.absoluteFill, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', gap: 10 }, pageState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }, pageStateText: { color: Colors.textMuted, fontSize: 12, textAlign: 'center' }, retry: { color: Colors.primary, fontSize: 12, fontWeight: Typography.bold }, state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 30 },
  bottomBar: { minHeight: 58, backgroundColor: '#121624', borderTopWidth: 1, borderTopColor: '#252C3D', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 12 }, fileName: { flex: 1, color: Colors.textMuted, fontSize: 10 }, originalButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 8 }, originalText: { color: '#FFF', fontSize: 10, fontWeight: Typography.bold },
});
