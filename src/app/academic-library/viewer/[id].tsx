import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AcademicPdf } from '../../../types';
import { getAcademicPdf, createAcademicPdfViewerUrl } from '../../../services/academicPdfService';
import PdfViewer from '../../../components/academic/PdfViewer';

export default function AcademicPdfViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [title, setTitle] = useState('PDF Reader');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewerLoaded, setViewerLoaded] = useState(false);
  const [error, setError] = useState('');
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      setUrl('');
      try {
        const pdf: AcademicPdf = await getAcademicPdf(String(id));
        const signedUrl = await createAcademicPdfViewerUrl(pdf);
        if (active) { setTitle(pdf.title); setViewerLoaded(false); setUrl(signedUrl); }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not open this PDF.');
      } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [id, retryToken]);

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <View style={styles.header}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to document details" onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={20} color="#FFF" /></TouchableOpacity>
      <Text numberOfLines={1} style={styles.title}>{title}</Text>
    </View>
    {loading ? <View style={styles.center}><ActivityIndicator size="large" color="#FF6B63" /><Text style={styles.message}>Preparing secure PDF…</Text></View>
      : error ? <View style={styles.center}><Ionicons name="alert-circle-outline" size={34} color="#FF817A" /><Text style={styles.message}>{error}</Text><TouchableOpacity onPress={() => setRetryToken((n) => n + 1)} style={styles.retry}><Text style={styles.retryText}>Try again</Text></TouchableOpacity></View>
      : <View style={styles.viewer}><PdfViewer pdfUrl={url} onLoad={() => setViewerLoaded(true)} onError={() => setError('The PDF viewer could not load this document. Check your connection and retry.')} />{!viewerLoaded ? <View pointerEvents="none" style={styles.loadingOverlay}><ActivityIndicator size="large" color="#FF6B63" /><Text style={styles.message}>Loading PDF pages…</Text></View> : null}</View>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#090A0F' }, header: { minHeight: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#252C3D' }, back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#171D2D' }, title: { color: '#FFF', fontWeight: '700', fontSize: 15, lineHeight: 20, flex: 1, minWidth: 0 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 13, padding: 24 }, message: { color: '#BFC5D1', fontSize: 14, textAlign: 'center', lineHeight: 21 }, retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 18, backgroundColor: '#C92F32', borderRadius: 12 }, retryText: { color: '#FFF', fontWeight: '700' }, viewer: { flex: 1, position: 'relative' }, loadingOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#090A0F' },
});
