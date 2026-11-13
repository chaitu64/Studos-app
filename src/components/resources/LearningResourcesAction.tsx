import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StudyResource, StudyResourceLink, StudyResourceLinkType } from '../../types';
import { BorderRadius, Colors, Typography } from '../../constants/theme';
import { normalizeResourceLinkUrl, studyResourceLinksService } from '../../services/studyResourceLinksService';

const typeTitle: Record<StudyResourceLinkType, string> = { youtube: 'YouTube Link', chatgpt: 'ChatGPT Link' };
const iconName = (type: StudyResourceLinkType) => type === 'youtube' ? 'logo-youtube' as const : 'chatbubbles-outline' as const;

export function LearningResourcesAction({ resource, userId }: { resource: StudyResource; userId?: string }) {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<StudyResourceLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [type, setType] = useState<StudyResourceLinkType | null>(null);
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const visibleLinks = useMemo(() => {
    if (!resource.youtubeLink) return links;
    try {
      const legacyUrl = normalizeResourceLinkUrl('youtube', resource.youtubeLink);
      if (links.some((link) => { try { return normalizeResourceLinkUrl(link.resource_type, link.url) === legacyUrl; } catch { return false; } })) return links;
      const legacy: StudyResourceLink = { id: `legacy-${resource.id}`, study_resource_id: resource.id, resource_type: 'youtube', title: 'Related YouTube video', url: legacyUrl, submitted_by: '', created_at: resource.createdAt || '', updated_at: resource.createdAt || '', isMine: false };
      return [legacy, ...links];
    } catch { return links; }
  }, [links, resource.createdAt, resource.id, resource.youtubeLink]);

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try { setLinks(await studyResourceLinksService.list(resource.id)); }
    catch (cause) { setLoadError(cause instanceof Error ? cause.message : 'Shared resources could not be loaded.'); }
    finally { setLoading(false); }
  }, [resource.id]);
  useEffect(() => { const timer = setTimeout(() => { void load(); }, 0); return () => clearTimeout(timer); }, [load]);

  const startAdd = (nextType: StudyResourceLinkType) => {
    if (!userId) { Alert.alert('Sign in required', 'Sign in to share a learning resource.'); return; }
    setType(nextType); setUrl(''); setDescription(''); setFormError('');
  };
  const submit = async () => {
    if (!type || saving) return;
    setFormError(''); setSaving(true);
    try {
      const normalized = normalizeResourceLinkUrl(type, url);
      const title = description.trim() || (type === 'youtube' ? 'YouTube explanation' : 'ChatGPT explanation');
      await studyResourceLinksService.add(resource.id, type, title, normalized);
      setType(null); setUrl(''); setDescription('');
      await load();
    } catch (cause) { setFormError(cause instanceof Error ? cause.message : 'The link could not be shared.'); }
    finally { setSaving(false); }
  };
  const openLink = async (link: StudyResourceLink) => {
    try { await Linking.openURL(normalizeResourceLinkUrl(link.resource_type, link.url)); }
    catch (cause) { Alert.alert('Link unavailable', cause instanceof Error ? cause.message : 'This resource could not be opened.'); }
  };

  return <View pointerEvents="box-none" style={styles.anchor}>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Learning resources, ${visibleLinks.length} shared`} onPress={() => { setOpen(true); if (!links.length) void load(); }} style={styles.trigger}>
      <Ionicons name="add" size={22} color={Colors.textPrimary} />
    </TouchableOpacity>
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => { if (!saving) { setOpen(false); setType(null); } }}>
      <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close learning resources" activeOpacity={1} style={styles.scrim} onPress={() => { if (!saving) { setOpen(false); setType(null); } }} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.sheetHead}>
            <View style={{ flex: 1 }}><Text style={styles.sheetTitle}>{type ? `Add ${typeTitle[type]}` : 'Learning resources'}</Text><Text style={styles.subtitle} numberOfLines={2}>{resource.pdfFileName || resource.fileName}</Text></View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={() => { setOpen(false); setType(null); }} style={styles.close}><Ionicons name="close" size={19} color={Colors.textMuted} /></TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            {type ? <>
              <TouchableOpacity accessibilityRole="button" onPress={() => setType(null)} style={styles.backToList}><Ionicons name="arrow-back" size={16} color={Colors.textSecondary} /><Text style={styles.backLabel}>All learning resources</Text></TouchableOpacity>
              {type === 'chatgpt' ? <Text style={styles.privacy}>Only share public ChatGPT conversation links. Do not include private or sensitive content.</Text> : null}
              <Text style={styles.fieldLabel}>LINK</Text>
              <TextInput accessibilityLabel={`${typeTitle[type]} URL`} value={url} onChangeText={setUrl} maxLength={2048} placeholder={type === 'youtube' ? 'https://youtu.be/…' : 'https://chatgpt.com/share/…'} placeholderTextColor={Colors.textSubtle} style={styles.input} keyboardType="url" autoCapitalize="none" autoCorrect={false} textContentType="URL" />
              <Text style={styles.fieldLabel}>DESCRIPTION (OPTIONAL)</Text>
              <TextInput accessibilityLabel="Resource description, optional" value={description} onChangeText={setDescription} maxLength={120} placeholder="What does this explain?" placeholderTextColor={Colors.textSubtle} style={styles.input} />
              {formError ? <Text accessibilityRole="alert" style={styles.error}>{formError}</Text> : null}
              <TouchableOpacity accessibilityRole="button" disabled={saving} onPress={() => void submit()} style={[styles.submit, saving && { opacity: 0.65 }]}>{saving ? <ActivityIndicator color={Colors.textOnPrimary} /> : <Text style={styles.submitText}>Share resource</Text>}</TouchableOpacity>
            </> : <>
              {loading ? <View style={styles.loading}><ActivityIndicator color={Colors.primary} /><Text style={styles.meta}>Loading shared resources…</Text></View> : null}
              {loadError ? <View style={styles.errorRow}><Text style={styles.error}>{loadError}</Text><TouchableOpacity accessibilityRole="button" onPress={() => void load()}><Text style={styles.retry}>Retry</Text></TouchableOpacity></View> : null}
              {!loading && !loadError && visibleLinks.length === 0 ? <Text style={styles.empty}>No resources shared yet. Add the first one.</Text> : null}
              {visibleLinks.map((link) => <View key={link.id} style={styles.linkRow}>
                <View style={[styles.linkIcon, link.resource_type === 'youtube' ? styles.youtubeIcon : styles.chatIcon]}><Ionicons name={iconName(link.resource_type)} size={17} color={link.resource_type === 'youtube' ? '#E88982' : Colors.accentCyan} /></View>
                <View style={styles.linkCopy}><Text style={styles.linkTitle} numberOfLines={2}>{link.title}</Text><Text style={styles.contributor}>{link.contributorName ? `Shared by ${link.contributorName}` : 'Shared by a STUDOS student'}</Text></View>
                <TouchableOpacity accessibilityRole="link" accessibilityLabel={`Open ${link.title}`} onPress={() => void openLink(link)} style={styles.openLink}><Ionicons name="open-outline" size={17} color={Colors.textPrimary} /></TouchableOpacity>
              </View>)}
              <Text style={styles.fieldLabel}>ADD A RESOURCE</Text>
              <TouchableOpacity accessibilityRole="button" onPress={() => startAdd('youtube')} style={styles.addOption}><Ionicons name="logo-youtube" size={18} color="#E88982" /><Text style={styles.optionLabel}>Add YouTube Link</Text><Ionicons name="add" size={18} color={Colors.textMuted} /></TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" onPress={() => startAdd('chatgpt')} style={styles.addOption}><Ionicons name="chatbubbles-outline" size={18} color={Colors.accentCyan} /><Text style={styles.optionLabel}>Add ChatGPT Link</Text><Ionicons name="add" size={18} color={Colors.textMuted} /></TouchableOpacity>
            </>}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute', right: 15, bottom: 14, zIndex: 5 },
  trigger: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.full, borderWidth: 1, borderColor: '#3B414D', backgroundColor: '#202631', shadowColor: '#000', shadowOpacity: 0.24, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' }, scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.62)' },
  sheet: { width: '100%', maxWidth: 640, maxHeight: '84%', alignSelf: 'center', paddingHorizontal: 18, paddingTop: 10, paddingBottom: 18, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, borderBottomWidth: 0, borderColor: Colors.border, backgroundColor: Colors.surface },
  handle: { width: 38, height: 4, alignSelf: 'center', marginBottom: 12, borderRadius: 2, backgroundColor: Colors.borderLight },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  sheetTitle: { color: Colors.textPrimary, fontSize: 18, lineHeight: 23, fontWeight: Typography.bold }, subtitle: { marginTop: 3, color: Colors.textMuted, fontSize: 12, lineHeight: 17 },
  close: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: Colors.surfaceHighlight },
  body: { paddingTop: 7, paddingBottom: 14 }, loading: { alignItems: 'center', gap: 8, padding: 18 }, meta: { color: Colors.textMuted, fontSize: 12 }, empty: { paddingVertical: 17, color: Colors.textMuted, fontSize: 13, textAlign: 'center' },
  linkRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  linkIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 10 }, youtubeIcon: { backgroundColor: '#302124' }, chatIcon: { backgroundColor: Colors.accentCyanSubtle },
  linkCopy: { flex: 1, minWidth: 0, gap: 3 }, linkTitle: { color: Colors.textPrimary, fontSize: 13, lineHeight: 18, fontWeight: Typography.semiBold }, contributor: { color: Colors.textMuted, fontSize: 11, lineHeight: 15 }, openLink: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: Colors.surfaceHighlight },
  fieldLabel: { marginTop: 16, marginBottom: 7, color: Colors.textMuted, fontSize: 10, lineHeight: 14, fontWeight: Typography.semiBold, letterSpacing: 0.7 },
  addOption: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, marginTop: 7, borderRadius: 11, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background }, optionLabel: { flex: 1, color: Colors.textPrimary, fontSize: 13, fontWeight: Typography.medium },
  backToList: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 7 }, backLabel: { color: Colors.textSecondary, fontSize: 12 },
  privacy: { marginTop: 5, padding: 10, borderRadius: 10, color: Colors.textSecondary, backgroundColor: Colors.warningSubtle, fontSize: 11, lineHeight: 16 },
  input: { minHeight: 46, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background, color: Colors.textPrimary, fontSize: 13 }, error: { marginTop: 9, color: Colors.error, fontSize: 12, lineHeight: 18 }, errorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, retry: { color: Colors.primary, fontSize: 12, fontWeight: Typography.bold, padding: 8 },
  submit: { minHeight: 46, alignItems: 'center', justifyContent: 'center', marginTop: 16, borderRadius: 11, backgroundColor: Colors.primary }, submitText: { color: Colors.textOnPrimary, fontWeight: Typography.bold, fontSize: 13 },
});
