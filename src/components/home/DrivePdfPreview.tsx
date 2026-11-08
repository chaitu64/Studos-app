import React, { useState } from 'react';
import { ActivityIndicator, Linking, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WebView from 'react-native-webview';
import { normalizeDriveUrl } from '../../services/driveUrl';
import { Colors } from '../../constants/theme';

type Props = { url: string; height?: number; readerMode?: boolean };

export function DrivePdfPreview({ url, height = 460, readerMode = false }: Props) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [expanded, setExpanded] = useState(false);
  const drive = (() => { try { return normalizeDriveUrl(url); } catch { return null; } })();
  const previewUrl = drive && drive.kind === 'file' ? `https://drive.google.com/file/d/${drive.id}/preview` : null;

  if (!previewUrl) return <View style={[styles.state, { height }]}><Text style={styles.message}>Unable to display this document. Check the Google Drive link, or open it in Google Drive.</Text></View>;

  const renderFrame = (frameHeight: number | string) => Platform.OS === 'web' ? React.createElement('iframe' as React.ElementType, {
      src: previewUrl,
      title: 'Google Drive PDF preview',
      allowFullScreen: true,
      allow: 'fullscreen',
      referrerPolicy: 'strict-origin-when-cross-origin',
      onLoad: () => setStatus('loaded'),
      onError: () => setStatus('error'),
      style: { width: '100%', height: frameHeight, border: 0, backgroundColor: '#171A21' },
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
  const frame = (frameHeight: number | string) => <View style={[styles.frame, { height: frameHeight as number }]}>
    {renderFrame(frameHeight)}
    {status === 'loading' ? <View pointerEvents="none" style={styles.overlay}><ActivityIndicator color={Colors.primary} /><Text style={styles.message}>Loading Google Drive preview…</Text></View> : null}
    {status === 'error' ? <View style={styles.overlay}><Text style={styles.message}>Unable to display this document. Check your access permissions or open it in Google Drive.</Text></View> : null}
  </View>;

  return <View>
    {!readerMode ? <View style={styles.actions}>
      <TouchableOpacity accessibilityRole="button" style={styles.action} onPress={() => setExpanded(true)}><Text style={styles.actionText}>Full screen</Text></TouchableOpacity>
      <TouchableOpacity accessibilityRole="link" style={styles.action} onPress={() => void Linking.openURL(drive!.url)}><Text style={styles.actionText}>Open in Google Drive</Text></TouchableOpacity>
    </View> : null}
    {frame(height)}
    {readerMode ? <TouchableOpacity accessibilityRole="button" accessibilityHint="Opens the full-screen PDF reader" style={styles.readAction} onPress={() => setExpanded(true)}><Ionicons name="book-outline" size={18} color={Colors.textOnPrimary} /><Text style={styles.readActionText}>Read PDF</Text><Ionicons name="expand-outline" size={16} color={Colors.textOnPrimary} /></TouchableOpacity> : null}
    <Modal visible={expanded} animationType="slide" onRequestClose={() => setExpanded(false)} supportedOrientations={['portrait', 'landscape']}>
      <View style={styles.modal}><View style={styles.modalHeader}><Text style={styles.modalTitle}>PDF preview</Text><TouchableOpacity accessibilityRole="button" onPress={() => setExpanded(false)}><Text style={styles.actionText}>Done</Text></TouchableOpacity></View>{frame('100%')}</View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', borderRadius: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, marginVertical: 14 },
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
  message: { color: Colors.textMuted, textAlign: 'center', fontSize: 13, lineHeight: 20, paddingHorizontal: 16 },
});
