import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StudyResource, StudyResourceLink, StudyResourceLinkType } from '../../types';
import { Colors, Typography } from '../../constants/theme';
import { normalizeResourceLinkUrl, studyResourceLinksService } from '../../services/studyResourceLinksService';

type Props = { resource: StudyResource; userId?: string };
type Draft = { type: StudyResourceLinkType; title: string; url: string; editing?: StudyResourceLink };

const labels: Record<StudyResourceLinkType, string> = {
  youtube: 'YouTube Video',
  chatgpt: 'ChatGPT Shared Conversation',
};

function LinkTypeIcon({ type, size = 19 }: { type: StudyResourceLinkType; size?: number }) {
  return <Ionicons name={type === 'youtube' ? 'logo-youtube' : 'chatbubbles-outline'} size={size} color={type === 'youtube' ? '#FF6259' : Colors.accentCyan} />;
}

export function CommunityLearningLinks({ resource, userId }: Props) {
  const [links, setLinks] = useState<StudyResourceLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleteId, setDeleteId] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      setLoading(true);
      setError('');
      try {
        const rows = await studyResourceLinksService.list(resource.id);
        if (active) setLinks(rows);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Learning links could not be loaded.');
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => { active = false; };
  }, [resource.id, reload]);

  const legacyLink = useMemo<StudyResourceLink | null>(() => {
    if (!resource.youtubeLink) return null;
    try {
      const url = normalizeResourceLinkUrl('youtube', resource.youtubeLink);
      if (links.some((link) => {
        try { return normalizeResourceLinkUrl(link.resource_type, link.url) === url; } catch { return false; }
      })) return null;
      return {
        id: `legacy-${resource.id}`,
        study_resource_id: resource.id,
        resource_type: 'youtube',
        title: 'Related YouTube video',
        url,
        submitted_by: '',
        created_at: resource.createdAt || '',
        updated_at: resource.createdAt || '',
        isMine: false,
      };
    } catch { return null; }
  }, [links, resource.createdAt, resource.id, resource.youtubeLink]);

  const visibleLinks = useMemo(() => [...(legacyLink ? [legacyLink] : []), ...links], [legacyLink, links]);

  const openDraft = (link?: StudyResourceLink) => {
    if (!userId) {
      Alert.alert('Sign in required', 'Sign in to share a learning link.');
      return;
    }
    setFormError('');
    setDraft(link ? { type: link.resource_type, title: link.title, url: link.url, editing: link } : { type: 'youtube', title: '', url: '' });
  };

  const submit = async () => {
    if (!draft || saving) return;
    setSaving(true);
    setFormError('');
    try {
      // Validate before calling Supabase so malformed or private URLs never
      // reach storage. The service also validates to protect non-UI callers.
      normalizeResourceLinkUrl(draft.type, draft.url);
      if (draft.editing) await studyResourceLinksService.update(draft.editing.id, resource.id, draft.type, draft.title, draft.url);
      else await studyResourceLinksService.add(resource.id, draft.type, draft.title, draft.url);
      setDraft(null);
      setNotice(draft.editing ? 'Learning link updated.' : 'Learning link shared.');
      setReload((value) => value + 1);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'The learning link could not be saved.');
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!deleteId || deleting) return;
    setDeleting(true);
    setError('');
    try {
      await studyResourceLinksService.remove(deleteId);
      setLinks((current) => current.filter((link) => link.id !== deleteId));
      setNotice('Learning link deleted.');
      setDeleteId('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'This learning link could not be deleted.');
      setDeleteId('');
    } finally { setDeleting(false); }
  };

  const openLink = async (link: StudyResourceLink) => {
    try {
      const safe = normalizeResourceLinkUrl(link.resource_type, link.url);
      await Linking.openURL(safe);
    } catch (cause) {
      Alert.alert('Link unavailable', cause instanceof Error ? cause.message : 'This link could not be opened.');
    }
  };

  return <View style={styles.section}>
    <View style={styles.headingRow}>
      <View style={styles.headingIcon}><Ionicons name="sparkles-outline" size={17} color={Colors.primary} /></View>
      <View style={styles.headingText}>
        <Text accessibilityRole="header" style={styles.heading}>Community Learning Links</Text>
        <Text style={styles.subtitle}>Helpful explanations shared by students</Text>
      </View>
    </View>

    {notice ? <Text accessibilityRole="status" style={styles.notice}>{notice}</Text> : null}
    {loading ? <View style={styles.state}><ActivityIndicator color={Colors.primary} /><Text style={styles.stateText}>Loading shared links…</Text></View> : null}
    {error ? <View style={styles.errorBox}><Ionicons name="alert-circle-outline" size={17} color={Colors.error} /><Text style={styles.errorText}>{error}</Text><TouchableOpacity accessibilityRole="button" onPress={() => setReload((value) => value + 1)}><Text style={styles.retry}>Retry</Text></TouchableOpacity></View> : null}
    {!loading && !visibleLinks.length && !error ? <View style={styles.empty}>
      <Ionicons name="link-outline" size={21} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>No learning links shared yet.</Text>
      <Text style={styles.emptyText}>Be the first to share one.</Text>
    </View> : null}

    {visibleLinks.map((link) => {
      let valid = true;
      try { normalizeResourceLinkUrl(link.resource_type, link.url); } catch { valid = false; }
      return <View key={link.id} style={styles.linkRow}>
        <View style={styles.linkIcon}><LinkTypeIcon type={link.resource_type} /></View>
        <View style={styles.linkCopy}>
          <Text style={styles.linkTitle}>{link.title}</Text>
          <Text style={styles.linkType}>{labels[link.resource_type] || 'Learning resource'}</Text>
          {link.contributorName ? <Text style={styles.contributor}>Shared by {link.contributorName}</Text> : null}
          {link.id.startsWith('legacy-') ? <Text style={styles.contributor}>Included with this PDF</Text> : null}
          {deleteId === link.id ? <View style={styles.confirmRow}>
            <Text style={styles.confirmText}>Delete this link?</Text>
            <TouchableOpacity accessibilityRole="button" disabled={deleting} onPress={() => setDeleteId('')}><Text style={styles.confirmCancel}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" disabled={deleting} onPress={() => void remove()}><Text style={styles.confirmDelete}>{deleting ? 'Deleting…' : 'Delete'}</Text></TouchableOpacity>
          </View> : null}
        </View>
        <View style={styles.rowActions}>
          <TouchableOpacity accessibilityRole="link" accessibilityLabel={`Open ${link.title}`} disabled={!valid} style={[styles.openButton, !valid && styles.disabled]} onPress={() => void openLink(link)}>
            <Ionicons name="open-outline" size={17} color={Colors.textPrimary} />
          </TouchableOpacity>
          {link.isMine ? <>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Edit ${link.title}`} style={styles.iconButton} onPress={() => openDraft(link)}><Ionicons name="pencil-outline" size={16} color={Colors.textMuted} /></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Delete ${link.title}`} style={styles.iconButton} onPress={() => setDeleteId(link.id)}><Ionicons name="trash-outline" size={16} color={Colors.textMuted} /></TouchableOpacity>
          </> : null}
        </View>
      </View>;
    })}

    <TouchableOpacity accessibilityRole="button" style={styles.addButton} onPress={() => openDraft()}>
      <Ionicons name="add" size={19} color={Colors.textOnPrimary} />
      <Text style={styles.addText}>Add a learning link</Text>
    </TouchableOpacity>

    <Modal visible={Boolean(draft)} transparent animationType="slide" onRequestClose={() => { if (!saving) setDraft(null); }}>
      <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close learning link form" activeOpacity={1} style={styles.scrim} onPress={() => { if (!saving) setDraft(null); }} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleGroup}>
              <Text style={styles.sheetTitle}>{draft?.editing ? 'Edit learning link' : 'Add a learning link'}</Text>
              <Text style={styles.sheetSubtitle}>Share a relevant explanation that may help other students understand this PDF.</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" disabled={saving} onPress={() => setDraft(null)} style={styles.closeButton}><Ionicons name="close" size={20} color={Colors.textMuted} /></TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>
            <Text style={styles.fieldLabel}>RESOURCE TYPE</Text>
            {(['youtube', 'chatgpt'] as const).map((type) => <TouchableOpacity key={type} accessibilityRole="radio" accessibilityState={{ checked: draft?.type === type }} style={[styles.typeOption, draft?.type === type && styles.typeOptionSelected]} onPress={() => setDraft((current) => current ? { ...current, type } : current)}>
              <LinkTypeIcon type={type} size={18} />
              <Text style={styles.typeLabel}>{labels[type]}</Text>
              <Ionicons name={draft?.type === type ? 'radio-button-on' : 'radio-button-off'} size={18} color={draft?.type === type ? Colors.primary : Colors.textSubtle} />
            </TouchableOpacity>)}
            {draft?.type === 'chatgpt' ? <View style={styles.privacyNote}><Ionicons name="shield-checkmark-outline" size={16} color={Colors.accentAmber} /><Text style={styles.privacyText}>Share a public shared conversation only. It should contain no sensitive or private information.</Text></View> : null}
            <Text style={styles.fieldLabel}>TITLE</Text>
            <TextInput value={draft?.title || ''} onChangeText={(title) => setDraft((current) => current ? { ...current, title } : current)} maxLength={120} placeholder="Give this explanation a clear title" placeholderTextColor={Colors.textSubtle} style={styles.input} returnKeyType="next" />
            <Text style={styles.fieldLabel}>URL</Text>
            <TextInput value={draft?.url || ''} onChangeText={(url) => setDraft((current) => current ? { ...current, url } : current)} maxLength={2048} placeholder={draft?.type === 'youtube' ? 'https://youtu.be/…' : 'https://chatgpt.com/share/…'} placeholderTextColor={Colors.textSubtle} style={styles.input} keyboardType="url" autoCapitalize="none" autoCorrect={false} textContentType="URL" />
            {formError ? <Text accessibilityRole="alert" style={styles.formError}>{formError}</Text> : null}
            <TouchableOpacity accessibilityRole="button" disabled={saving} style={[styles.submitButton, saving && styles.submitDisabled]} onPress={() => void submit()}>
              {saving ? <ActivityIndicator color={Colors.textOnPrimary} /> : <Text style={styles.submitText}>{draft?.editing ? 'Save changes' : 'Share resource'}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  section: { width: '100%', marginTop: 24, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 13 },
  headingIcon: { width: 35, height: 35, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: Colors.primarySubtle },
  headingText: { flex: 1, minWidth: 0 },
  heading: { color: Colors.textPrimary, fontSize: 17, lineHeight: 22, fontWeight: Typography.bold },
  subtitle: { marginTop: 2, color: Colors.textMuted, fontSize: 12, lineHeight: 17 },
  notice: { marginBottom: 9, color: Colors.accentGreen, fontSize: 12, lineHeight: 17 },
  state: { minHeight: 72, alignItems: 'center', justifyContent: 'center', gap: 8 },
  stateText: { color: Colors.textMuted, fontSize: 12 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: Colors.errorSubtle },
  errorText: { flex: 1, color: Colors.error, fontSize: 12, lineHeight: 18 },
  retry: { color: Colors.primary, fontSize: 12, fontWeight: Typography.semiBold, padding: 6 },
  empty: { alignItems: 'center', paddingVertical: 17, gap: 5 },
  emptyTitle: { color: Colors.textSecondary, fontSize: 13, fontWeight: Typography.semiBold },
  emptyText: { color: Colors.textMuted, fontSize: 12 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  linkIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceHighlight },
  linkCopy: { flex: 1, minWidth: 0, gap: 2 },
  linkTitle: { color: Colors.textPrimary, fontSize: 13, lineHeight: 18, fontWeight: Typography.semiBold },
  linkType: { color: Colors.textMuted, fontSize: 11, lineHeight: 15 },
  contributor: { color: Colors.textSubtle, fontSize: 11, lineHeight: 15 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  openButton: { minWidth: 38, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: Colors.surfaceHighlight },
  iconButton: { width: 34, height: 40, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.45 },
  confirmRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 9, marginTop: 6 },
  confirmText: { color: Colors.textSecondary, fontSize: 11 },
  confirmCancel: { color: Colors.textMuted, fontSize: 11, padding: 4 },
  confirmDelete: { color: Colors.error, fontSize: 11, fontWeight: Typography.semiBold, padding: 4 },
  addButton: { width: '100%', minHeight: 46, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, backgroundColor: Colors.primary },
  addText: { color: Colors.textOnPrimary, fontSize: 13, fontWeight: Typography.semiBold },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: Colors.overlay },
  sheet: { width: '100%', maxWidth: 640, maxHeight: '92%', alignSelf: 'center', paddingHorizontal: 18, paddingTop: 10, paddingBottom: 18, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, borderColor: Colors.border, backgroundColor: Colors.surface },
  sheetHandle: { width: 38, height: 4, alignSelf: 'center', marginBottom: 12, borderRadius: 2, backgroundColor: Colors.borderLight },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  sheetTitleGroup: { flex: 1, minWidth: 0 },
  sheetTitle: { color: Colors.textPrimary, fontSize: 19, lineHeight: 25, fontWeight: Typography.bold },
  sheetSubtitle: { marginTop: 5, color: Colors.textMuted, fontSize: 12, lineHeight: 18 },
  closeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: Colors.surfaceHighlight },
  sheetContent: { paddingBottom: 10, gap: 9 },
  fieldLabel: { marginTop: 7, color: Colors.textMuted, fontSize: 10, lineHeight: 15, fontWeight: Typography.semiBold, letterSpacing: 0.7 },
  typeOption: { minHeight: 46, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 11, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background },
  typeOptionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primarySubtle },
  typeLabel: { flex: 1, color: Colors.textPrimary, fontSize: 12, lineHeight: 17, fontWeight: Typography.medium },
  privacyNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 10, backgroundColor: Colors.warningSubtle },
  privacyText: { flex: 1, color: Colors.textSecondary, fontSize: 11, lineHeight: 16 },
  input: { width: '100%', minHeight: 48, paddingHorizontal: 13, paddingVertical: 11, borderRadius: 11, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background, color: Colors.textPrimary, fontSize: 13, lineHeight: 19 },
  formError: { color: Colors.error, fontSize: 12, lineHeight: 18 },
  submitButton: { minHeight: 50, marginTop: 4, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: Colors.primary },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: Colors.textOnPrimary, fontSize: 14, fontWeight: Typography.bold },
});
