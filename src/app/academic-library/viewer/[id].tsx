import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { safeBack } from '@/navigation/safeBack';
import { Ionicons } from '@expo/vector-icons';
import { AcademicPdf } from '../../../types';
import { getAcademicPdf, createAcademicPdfViewerUrl } from '../../../services/academicPdfService';
import PdfViewer from '../../../components/academic/PdfViewer';
import { BorderRadius, Colors, Spacing, Typography } from '../../../constants/theme';

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
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to document details" onPress={() => safeBack()} style={styles.back}><Ionicons name="arrow-back" size={20} color={Colors.textPrimary} /></TouchableOpacity>
      <Text numberOfLines={1} style={styles.title}>{title}</Text>
    </View>
    {loading ? <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /><Text style={styles.message}>Preparing secure PDF…</Text></View>
      : error ? <View style={styles.center}><Ionicons name="alert-circle-outline" size={34} color={Colors.error} /><Text style={styles.message}>{error}</Text><TouchableOpacity accessibilityRole="button" onPress={() => setRetryToken((n) => n + 1)} style={styles.retry}><Text style={styles.retryText}>Try again</Text></TouchableOpacity></View>
      : <View style={styles.viewer}><PdfViewer pdfUrl={url} onLoad={() => setViewerLoaded(true)} onError={() => setError('The PDF viewer could not load this document. Check your connection and retry.')} />{!viewerLoaded ? <View pointerEvents="none" style={styles.loadingOverlay}><ActivityIndicator size="large" color={Colors.primary} /><Text style={styles.message}>Loading PDF pages…</Text></View> : null}</View>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { minHeight: 60, paddingHorizontal: Spacing.screenPadding, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.surface },
  title: { color: Colors.textPrimary, fontWeight: Typography.semiBold, fontSize: Typography.body, lineHeight: 21, flex: 1, minWidth: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 13, padding: 24 },
  message: { color: Colors.textSecondary, fontSize: Typography.body, textAlign: 'center', lineHeight: 21 },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 18, backgroundColor: Colors.primary, borderRadius: BorderRadius.md },
  retryText: { color: Colors.textOnPrimary, fontWeight: Typography.bold },
  viewer: { flex: 1, position: 'relative' },
  loadingOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: Colors.background },
});
