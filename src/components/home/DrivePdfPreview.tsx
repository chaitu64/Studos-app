import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WebView from 'react-native-webview';
import { normalizeDriveUrl } from '../../services/driveUrl';
import { Colors } from '../../constants/theme';

type Props = { url: string; height?: number; readerMode?: boolean; onOpenExternal?: () => void };

export function DrivePdfPreview({ url, height = 460, readerMode = false, onOpenExternal }: Props) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [expanded, setExpanded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const drive = (() => { try { return normalizeDriveUrl(url); } catch { return null; } })();
  const previewUrl = drive && drive.kind === 'file' ? `https://drive.google.com/file/d/${drive.id}/preview` : null;
  const openExternal = () => {
    if (!drive?.url) return;
    if (onOpenExternal) onOpenExternal();
    else void Linking.openURL(drive.url).catch(() => undefined);
  };
  useEffect(() => {
    if (!readerMode || status !== 'loading') return;
    const timeout = setTimeout(() => setStatus('error'), 20000);
    return () => clearTimeout(timeout);
  }, [attempt, readerMode, status, url]);

  if (!previewUrl) return <View style={[styles.state, readerMode ? styles.readerError : { height }]}><Ionicons name="document-text-outline" size={24} color={Colors.textMuted}/><Text style={styles.message}>This PDF preview is unavailable. Check the Drive link or open the document externally.</Text>{drive?.url ? <TouchableOpacity accessibilityRole="button" style={styles.retryAction} onPress={openExternal}><Text style={styles.actionText}>Open externally</Text></TouchableOpacity> : null}</View>;

  const renderFrame = (frameHeight: number | string) => Platform.OS === 'web' ? React.createElement('iframe' as React.ElementType, {
      src: previewUrl,
      title: 'Google Drive PDF preview',
      allowFullScreen: true,
      allow: 'fullscreen',
      referrerPolicy: 'strict-origin-when-cross-origin',
      onLoad: () => setStatus('loaded'),
      onError: () => setStatus('error'),
      style: { width: '100%', height: frameHeight, border: 0, backgroundColor: '#171A21', display: 'block' },
    }) : <WebView
      source={{ uri: previewUrl }}
      originWhitelist={['https://*']}
      javaScriptEnabled
      domStorageEnabled
      startInLoadingState
      renderLoading={() => <View style={styles.overlay}><ActivityIndicator color={Colors.primary} /><Text style={styles.message}>Loading Drive preview…</Text></View>}
      onLoad={() => setStatus('loaded')}
      onError={() => setStatus('error')}
      onHttpError={({ nativeEvent }) => { if (nativeEvent.statusCode >= 400) setStatus('error'); }}
      onShouldStartLoadWithRequest={({ url: nextUrl }) => /^https:\/\/(drive|accounts|docs)\.google\.com\//i.test(nextUrl) || nextUrl === 'about:blank'}
      style={[styles.webView, { height: frameHeight as number }]}
    />;
  const frame = (frameHeight: number | string) => <View key={attempt} style={[styles.frame, readerMode && styles.readerFrame, { height: frameHeight as number }]}>
    {renderFrame(frameHeight)}
    {status === 'loading' ? <View pointerEvents="none" style={styles.overlay}><ActivityIndicator color={Colors.primary} /><Text style={styles.message}>Loading Google Drive preview…</Text></View> : null}
    {status === 'error' ? <View style={styles.overlay}><Text style={styles.message}>Unable to display this PDF. Check the file’s Drive sharing permissions, retry the preview, or open it externally.</Text><View style={styles.errorActions}><TouchableOpacity accessibilityRole="button" style={styles.retryAction} onPress={() => { setStatus('loading'); setAttempt((value) => value + 1); }}><Text style={styles.actionText}>Retry preview</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" style={styles.retryAction} onPress={openExternal}><Text style={styles.actionText}>Open externally</Text></TouchableOpacity></View></View> : null}
  </View>;

  return <View style={readerMode ? styles.readerRoot : undefined}>
    {!readerMode ? <View style={styles.actions}>
      <TouchableOpacity accessibilityRole="button" style={styles.action} onPress={() => setExpanded(true)}><Text style={styles.actionText}>Full screen</Text></TouchableOpacity>
    </View> : null}
    {!readerMode ? frame(height) : null}
    {readerMode ? frame(height) : null}
    <Modal visible={expanded} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setExpanded(false)} supportedOrientations={['portrait', 'landscape']}>
      <View style={styles.modal}><View style={styles.modalHeader}><Text style={styles.modalTitle}>PDF reader</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close PDF reader" style={styles.closeButton} onPress={() => setExpanded(false)}><Ionicons name="close" size={20} color={Colors.textPrimary}/><Text style={styles.actionText}>Close</Text></TouchableOpacity></View>{frame('100%')}</View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', borderRadius: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, marginVertical: 14 },
  readerRoot: { flex: 1, width: '100%' },
  readerFrame: { flex: 1, marginVertical: 0, borderRadius: 0, borderWidth: 0, backgroundColor: '#10131A' },
  webView: { flex: 1, backgroundColor: Colors.surface },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, marginTop: 14 },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, backgroundColor: Colors.primarySubtle },
  actionText: { color: Colors.primary, fontWeight: '700', fontSize: 13 },
  readAction: { minHeight: 48, marginTop: 4, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, backgroundColor: Colors.primary },
  readActionText: { color: Colors.textOnPrimary, fontWeight: '700', fontSize: 14 },
  modal: { flex: 1, paddingTop: Platform.OS === 'web' ? 0 : 32, backgroundColor: Colors.background },
  modalHeader: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  modalTitle: { color: Colors.textPrimary, fontWeight: '700', fontSize: 16 },
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Colors.surface },
  state: { alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, marginVertical: 14 },
  compactState: { minHeight: 112, marginVertical: 0, borderRadius: 12 },
  closeButton: { minHeight: 44, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  retryAction: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 10, backgroundColor: Colors.primarySubtle },
  errorActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  readerError: { flex: 1, width: '100%', marginVertical: 0, borderWidth: 0, borderRadius: 0, backgroundColor: '#10131A' },
  message: { color: Colors.textMuted, textAlign: 'center', fontSize: 13, lineHeight: 20, paddingHorizontal: 16 },
});
