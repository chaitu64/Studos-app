import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { Avatar } from '../../components/ui/Avatar';
import { Chip } from '../../components/ui/Chip';
import { useApp } from '../../context/AppContext';
import { chatService, directConversationStagingEnabled } from '../../services/chatService';

type Filter = 'all' | 'direct' | 'groups' | 'requests';
type Recipient = Awaited<ReturnType<typeof chatService.messageRecipients>>[number];

function formatConversationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ChatListScreen() {
  const { conversations, isLoading, dataErrors, refreshAll } = useApp();
  const [selectedTab, setSelectedTab] = useState<Filter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [composeVisible, setComposeVisible] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientLoading, setRecipientLoading] = useState(false);
  const [recipientError, setRecipientError] = useState('');
  const [recipientQuery, setRecipientQuery] = useState('');
  const [openingRecipient, setOpeningRecipient] = useState('');

  const openCompose = () => {
    setRecipientQuery('');
    setComposeVisible(true);
    setRecipientLoading(true);
    setRecipientError('');
    void chatService.messageRecipients().then((rows) => {
      setRecipients(rows);
    }).catch((cause) => {
      setRecipientError(cause instanceof Error ? cause.message : 'Could not load contactable students.');
    }).finally(() => { setRecipientLoading(false); });
  };

  const filtered = useMemo(() => conversations.filter((conversation) => {
    const isGroup = conversation.type === 'team';
    const matchesTab = selectedTab === 'all' || (selectedTab === 'direct' && !isGroup) || (selectedTab === 'groups' && isGroup);
    const query = searchQuery.trim().toLocaleLowerCase();
    const matchesSearch = !query || `${conversation.name} ${conversation.lastMessage} ${conversation.subtitle || ''}`.toLocaleLowerCase().includes(query);
    return matchesTab && matchesSearch;
  }), [conversations, searchQuery, selectedTab]);

  const visibleRecipients = useMemo(() => {
    const query = recipientQuery.trim().toLocaleLowerCase();
    return recipients.filter((recipient) => !query || `${recipient.name} ${recipient.college} ${recipient.branch}`.toLocaleLowerCase().includes(query));
  }, [recipientQuery, recipients]);

  const openConversation = (id: string) => {
    setComposeVisible(false);
    router.push({ pathname: '/chat/[id]', params: { id } } as never);
  };

  const startConversation = async (recipient: Recipient) => {
    if (openingRecipient) return;
    setOpeningRecipient(recipient.id);
    try {
      const id = await chatService.startDirectConversation(recipient.id);
      openConversation(id);
    } catch (cause) {
      setRecipientError(cause instanceof Error ? cause.message : 'Could not start this conversation.');
    } finally { setOpeningRecipient(''); }
  };

  const conversationError = dataErrors.conversations;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Messages</Text>
          <Text style={styles.subtitle}>Your STUDOS conversations</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={directConversationStagingEnabled ? 'Start a new conversation' : 'New conversations are staging only'} disabled={!directConversationStagingEnabled} onPress={openCompose} style={[styles.newMessageButton, !directConversationStagingEnabled && styles.disabledButton]}>
          <Ionicons name="create-outline" size={19} color={directConversationStagingEnabled ? Colors.textOnPrimary : Colors.textMuted} />
          <Text style={[styles.newMessageText, !directConversationStagingEnabled && styles.disabledButtonText]}>{directConversationStagingEnabled ? 'New message' : 'Staging only'}</Text>
        </TouchableOpacity>
      </View>

      {!directConversationStagingEnabled ? <View style={styles.stagingNotice}><Ionicons name="information-circle-outline" size={17} color={Colors.warning} /><Text style={styles.stagingNoticeText}>Starting new chats is disabled until recipient consent and abuse-prevention controls are available. Existing authorized conversations remain accessible.</Text></View> : null}

      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={17} color={Colors.textMuted} />
          <TextInput accessibilityLabel="Search conversations" placeholder="Search conversations..." placeholderTextColor={Colors.textSubtle} value={searchQuery} onChangeText={setSearchQuery} style={styles.searchInput} />
          {searchQuery ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={17} color={Colors.textMuted} /></TouchableOpacity> : null}
        </View>
      </View>

      <View style={styles.tabsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          <Chip label="All" selected={selectedTab === 'all'} onPress={() => setSelectedTab('all')} />
          <Chip label="Direct" selected={selectedTab === 'direct'} onPress={() => setSelectedTab('direct')} />
          <Chip label="Groups" selected={selectedTab === 'groups'} onPress={() => setSelectedTab('groups')} />
          <Chip label="Requests" selected={selectedTab === 'requests'} onPress={() => setSelectedTab('requests')} />
        </ScrollView>
      </View>

      {conversationError ? (
        <View style={styles.state}>
          <Ionicons name="cloud-offline-outline" size={34} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Messages could not load</Text>
          <Text style={styles.emptySub}>{conversationError}</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => { void refreshAll(); }} style={styles.retryButton}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
        </View>
      ) : isLoading ? (
        <View style={styles.state}><ActivityIndicator color={Colors.primary} /><Text style={styles.emptySub}>Loading conversations…</Text></View>
      ) : selectedTab === 'requests' ? (
        <View style={styles.state}><Ionicons name="mail-open-outline" size={34} color={Colors.textMuted} /><Text style={styles.emptyTitle}>No message requests</Text><Text style={styles.emptySub}>Message requests are not enabled for this account yet.</Text></View>
      ) : filtered.length ? (
        <ScrollView contentContainerStyle={styles.listContainer}>
          {filtered.map((conversation) => (
            <TouchableOpacity key={conversation.id} accessibilityRole="button" activeOpacity={0.75} style={styles.conversationItem} onPress={() => openConversation(conversation.id)}>
              <Avatar uri={conversation.avatar} name={conversation.name} size={48} />
              <View style={styles.convDetails}>
                <View style={styles.convTopRow}><Text style={styles.convName} numberOfLines={1}>{conversation.name}</Text><Text style={styles.convTime}>{formatConversationTime(conversation.lastMessageTime)}</Text></View>
                {conversation.subtitle ? <Text style={styles.convSubtitle} numberOfLines={1}>{conversation.subtitle}</Text> : null}
                <Text style={styles.lastMessage} numberOfLines={1}>{conversation.lastMessage || (conversation.type === 'team' ? 'Team conversation' : 'Start the conversation')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.state}>
          <Ionicons name="chatbubble-ellipses-outline" size={42} color={Colors.textDisabled} />
          <Text style={styles.emptyTitle}>{selectedTab === 'groups' ? 'No group conversations yet' : 'No conversations yet.'}</Text>
          <Text style={styles.emptySub}>{selectedTab === 'groups' ? 'Accepted team members can open their private team conversation from the team page.' : 'Start a conversation with another real STUDOS student.'}</Text>
          {selectedTab !== 'groups' && directConversationStagingEnabled ? <TouchableOpacity accessibilityRole="button" onPress={openCompose} style={styles.retryButton}><Text style={styles.retryText}>Start a conversation</Text></TouchableOpacity> : null}
        </View>
      )}

      <Modal visible={composeVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setComposeVisible(false)}>
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close new conversation" onPress={() => setComposeVisible(false)} style={styles.modalClose}><Ionicons name="close" size={22} color={Colors.textPrimary} /></TouchableOpacity>
            <View style={styles.modalHeadingCopy}><Text style={styles.modalTitle}>New message</Text><Text style={styles.modalSubtitle}>Choose a real STUDOS account</Text></View>
            <View style={styles.modalClose} />
          </View>
          <View style={styles.searchWrapper}><View style={styles.searchBar}><Ionicons name="search" size={17} color={Colors.textMuted} /><TextInput accessibilityLabel="Search students" placeholder="Search name, college or branch" placeholderTextColor={Colors.textSubtle} value={recipientQuery} onChangeText={setRecipientQuery} style={styles.searchInput} /></View></View>
          {recipientLoading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 28 }} /> : recipientError ? <View style={styles.modalError}><Text accessibilityRole="alert" style={styles.emptySub}>{recipientError}</Text><TouchableOpacity onPress={openCompose}><Text style={styles.retryText}>Try again</Text></TouchableOpacity></View> : <ScrollView contentContainerStyle={styles.recipientList} keyboardShouldPersistTaps="handled">
            {visibleRecipients.length ? visibleRecipients.map((recipient) => <TouchableOpacity key={recipient.id} accessibilityRole="button" disabled={Boolean(openingRecipient)} onPress={() => { void startConversation(recipient); }} style={styles.recipientRow}><Avatar uri={recipient.avatar} name={recipient.name} size={42} /><View style={styles.recipientCopy}><Text style={styles.recipientName}>{recipient.name}</Text><Text style={styles.convSubtitle} numberOfLines={1}>{[recipient.branch, recipient.college].filter(Boolean).join(' · ') || 'STUDOS student'}</Text></View>{openingRecipient === recipient.id ? <ActivityIndicator color={Colors.primary} /> : <Ionicons name="chatbubble-outline" size={19} color={Colors.primary} />}</TouchableOpacity>) : <Text style={styles.emptySub}>No contactable students match that search.</Text>}
          </ScrollView>}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  modalSafe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingHorizontal: Spacing.screenPadding, paddingTop: 8, paddingBottom: 12 },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { fontSize: Typography.title2, fontWeight: Typography.bold, color: Colors.textPrimary },
  subtitle: { fontSize: Typography.caption, color: Colors.textMuted, marginTop: 3 },
  newMessageButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12, borderRadius: BorderRadius.md, backgroundColor: Colors.primary },
  newMessageText: { color: Colors.textOnPrimary, fontSize: Typography.caption, fontWeight: Typography.bold },
  disabledButton: { backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border },
  disabledButtonText: { color: Colors.textMuted },
  stagingNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: Spacing.screenPadding, marginBottom: 10, padding: 11, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceSubtle },
  stagingNoticeText: { flex: 1, color: Colors.textMuted, fontSize: Typography.caption, lineHeight: 18 },
  searchWrapper: { paddingHorizontal: Spacing.screenPadding, marginBottom: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, minHeight: 44 },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: Typography.body, marginLeft: 8, paddingVertical: 8, minWidth: 0 },
  tabsRow: { marginBottom: 8 }, tabsScroll: { paddingHorizontal: Spacing.screenPadding, gap: 7 },
  listContainer: { paddingHorizontal: Spacing.screenPadding, paddingBottom: 30 },
  conversationItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.cardBorder, padding: 12, marginBottom: 9, gap: 10 },
  convDetails: { flex: 1, minWidth: 0 }, convTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  convName: { fontSize: Typography.headline, fontWeight: Typography.bold, color: Colors.textPrimary, flex: 1, marginRight: 6 }, convTime: { fontSize: 11, color: Colors.textSubtle },
  convSubtitle: { fontSize: Typography.caption, color: Colors.textMuted, marginBottom: 3 }, lastMessage: { fontSize: Typography.footnote, color: Colors.textSecondary },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 10 }, emptyTitle: { fontSize: Typography.headline, fontWeight: Typography.bold, color: Colors.textPrimary, textAlign: 'center' },
  emptySub: { fontSize: Typography.footnote, lineHeight: 20, color: Colors.textMuted, textAlign: 'center', maxWidth: 300 },
  retryButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: BorderRadius.md, backgroundColor: Colors.primary, marginTop: 4 }, retryText: { color: Colors.textOnPrimary, fontWeight: Typography.bold, fontSize: Typography.footnote },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: Spacing.screenPadding, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalClose: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }, modalHeadingCopy: { flex: 1, alignItems: 'center' }, modalTitle: { color: Colors.textPrimary, fontSize: Typography.title3, fontWeight: Typography.bold }, modalSubtitle: { color: Colors.textMuted, fontSize: Typography.caption, marginTop: 2 },
  recipientList: { paddingHorizontal: Spacing.screenPadding, paddingBottom: 24 }, recipientRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border }, recipientCopy: { flex: 1, minWidth: 0 }, recipientName: { color: Colors.textPrimary, fontWeight: Typography.semiBold, fontSize: Typography.body, marginBottom: 3 }, modalError: { alignItems: 'center', gap: 10, padding: 24 },
});
