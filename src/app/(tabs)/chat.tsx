import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { safeBack } from '../../navigation/safeBack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { Avatar } from '../../components/ui/Avatar';
import { Chip } from '../../components/ui/Chip';
import { useApp } from '../../context/AppContext';
import { chatService, chatRequestsEnabled, type ChatRequest } from '../../services/chatService';

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
  const params = useLocalSearchParams<{ recipient?: string }>();
  const { conversations, isLoading, dataErrors, refreshAll } = useApp();
  const [selectedTab, setSelectedTab] = useState<Filter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [composeVisible, setComposeVisible] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientLoading, setRecipientLoading] = useState(false);
  const [recipientError, setRecipientError] = useState('');
  const [recipientQuery, setRecipientQuery] = useState('');
  const [openingRecipient, setOpeningRecipient] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [selectedRecipientStatus, setSelectedRecipientStatus] = useState<'pending' | 'available' | 'unavailable'>('available');
  const [introMessage, setIntroMessage] = useState('');
  const [requestSide, setRequestSide] = useState<'received' | 'sent'>('received');
  const [requestRows, setRequestRows] = useState<{ received: ChatRequest[]; sent: ChatRequest[] }>({ received: [], sent: [] });
  const [requestPeople, setRequestPeople] = useState<Record<string, Recipient>>({});
  const [requestBusy, setRequestBusy] = useState('');
  const [requestError, setRequestError] = useState('');

  const loadRequests = useCallback(async () => {
    if (!chatRequestsEnabled) return;
    try {
      const [rows, people] = await Promise.all([chatService.requests(), chatService.messageRecipients()]);
      setRequestRows(rows);
      setRequestPeople(Object.fromEntries(people.map((person) => [person.id, person])));
      setRequestError('');
    } catch (cause) { setRequestError(cause instanceof Error ? cause.message : 'Requests could not be loaded.'); }
  }, []);
  useEffect(() => {
    if (selectedTab !== 'requests') return;
    const timer = setTimeout(() => { void loadRequests(); }, 0);
    return () => clearTimeout(timer);
  }, [selectedTab, loadRequests]);

  const openCompose = () => {
    setRecipientQuery('');
    setComposeVisible(true);
    setRecipientLoading(true);
    setRecipientError('');
    setSelectedRecipient(null);
    setSelectedRecipientStatus('available');
    setIntroMessage('');
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

  const startConversation = useCallback(async (recipient: Recipient) => {
    if (openingRecipient) return;
    setOpeningRecipient(recipient.id);
    try {
      const status = await chatService.requestStatus(recipient.id);
      if (status === 'conversation') {
        const existing = await chatService.existingConversation(recipient.id);
        if (existing) { openConversation(existing); return; }
        throw new Error('An existing conversation could not be opened. Refresh Messages and try again.');
      }
      setSelectedRecipient(recipient);
      setSelectedRecipientStatus(status === 'pending' ? 'pending' : status === 'unavailable' ? 'unavailable' : 'available');
      setRecipientError('');
    } catch (cause) {
      setRecipientError(cause instanceof Error ? cause.message : 'Could not start this conversation.');
    } finally { setOpeningRecipient(''); }
  }, [openingRecipient]);

  useEffect(() => {
    const recipientId = Array.isArray(params.recipient) ? params.recipient[0] : params.recipient;
    if (!recipientId || !chatRequestsEnabled) return;
    const timer = setTimeout(() => {
      setComposeVisible(true); setRecipientQuery(''); setRecipientLoading(true); setRecipientError('');
      void chatService.messageRecipients().then((rows) => {
        setRecipients(rows);
        const match = rows.find((row) => row.id === recipientId);
        if (match) void startConversation(match); else setRecipientError('This student is not available for private messaging.');
      }).catch((cause) => setRecipientError(cause instanceof Error ? cause.message : 'Could not load contactable students.')).finally(() => setRecipientLoading(false));
    }, 0);
    return () => clearTimeout(timer);
  }, [params.recipient, startConversation]);

  const sendRequest = async () => {
    if (!selectedRecipient || selectedRecipientStatus !== 'available' || !chatRequestsEnabled || requestBusy) return;
    setRequestBusy(selectedRecipient.id); setRecipientError('');
    try {
      await chatService.createRequest(selectedRecipient.id, introMessage);
      setSelectedRecipient(null); setIntroMessage(''); setComposeVisible(false);
      Alert.alert('Request sent', 'Your message request is pending until the student accepts it.');
      await loadRequests();
    } catch (cause) { setRecipientError(cause instanceof Error ? cause.message : 'Request could not be sent.'); }
    finally { setRequestBusy(''); }
  };

  const respondToRequest = async (request: ChatRequest, decision: 'accepted' | 'declined' | 'cancelled') => {
    setRequestBusy(request.id); setRequestError('');
    try {
      if (decision === 'cancelled') await chatService.cancelRequest(request.id);
      else {
        const conversationId = await chatService.respond(request.id, decision);
        if (decision === 'accepted' && conversationId) {
          // Acceptance is already committed by the RPC; a separate inbox refresh must not
          // turn that success into a client-side failure or prevent opening the conversation.
          void refreshAll().catch((cause) => console.warn('Conversation list refresh failed:', cause));
          router.push({ pathname: '/chat/[id]', params: { id: conversationId } } as never);
        }
      }
      await loadRequests();
    } catch (cause) { setRequestError(cause instanceof Error ? cause.message : 'Could not update this request.'); }
    finally { setRequestBusy(''); }
  };

  const conversationError = dataErrors.conversations;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back" onPress={() => safeBack('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>Your conversations</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={chatRequestsEnabled ? 'Start a new conversation' : 'Messaging setup required'} disabled={!chatRequestsEnabled} onPress={openCompose} style={[styles.newMessageButton, !chatRequestsEnabled && styles.disabledButton]}>
          <Ionicons name="create-outline" size={19} color={chatRequestsEnabled ? Colors.textOnPrimary : Colors.textMuted} />
          <Text style={[styles.newMessageText, !chatRequestsEnabled && styles.disabledButtonText]}>{chatRequestsEnabled ? 'New message' : 'Setup required'}</Text>
        </TouchableOpacity>
      </View>

      {!chatRequestsEnabled ? <View style={styles.stagingNotice}><Ionicons name="information-circle-outline" size={17} color={Colors.warning} /><Text style={styles.stagingNoticeText}>Private messaging requests are unavailable until the reviewed database migration is deployed and verified. Existing conversations remain available.</Text></View> : null}

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
        <View style={styles.requestSection}>
          {!chatRequestsEnabled ? <Text style={styles.emptySub}>Requests will appear here after messaging setup is deployed and verified.</Text> : <>
            <View style={styles.requestTabs}><TouchableOpacity accessibilityRole="tab" onPress={() => setRequestSide('received')} style={[styles.requestTab, requestSide === 'received' && styles.requestTabActive]}><Text style={[styles.requestTabText, requestSide === 'received' && styles.requestTabTextActive]}>Received</Text></TouchableOpacity><TouchableOpacity accessibilityRole="tab" onPress={() => setRequestSide('sent')} style={[styles.requestTab, requestSide === 'sent' && styles.requestTabActive]}><Text style={[styles.requestTabText, requestSide === 'sent' && styles.requestTabTextActive]}>Sent</Text></TouchableOpacity></View>
            {requestError ? <TouchableOpacity onPress={() => void loadRequests()}><Text style={styles.emptySub}>{requestError} · Retry</Text></TouchableOpacity> : null}
            <ScrollView contentContainerStyle={styles.requestList}>{(requestSide === 'received' ? requestRows.received : requestRows.sent).map((request) => { const peerId = requestSide === 'received' ? request.requester_id : request.recipient_id; const person = requestPeople[peerId]; return <View key={request.id} style={styles.requestCard}><View style={styles.requestPerson}><Avatar uri={person?.avatar} name={person?.name || 'STUDOS student'} size={42}/><View style={styles.recipientCopy}><Text style={styles.recipientName}>{person?.name || 'STUDOS student'}</Text><Text style={styles.convSubtitle}>{request.status === 'pending' ? 'Pending request' : `Request ${request.status}`}</Text></View></View>{request.introductory_message ? <Text style={styles.requestMessage}>{request.introductory_message}</Text> : null}{request.status === 'pending' ? requestSide === 'received' ? <View style={styles.requestActions}><TouchableOpacity disabled={Boolean(requestBusy)} onPress={() => void respondToRequest(request,'declined')} style={styles.secondaryAction}><Text style={styles.secondaryActionText}>Decline</Text></TouchableOpacity><TouchableOpacity disabled={Boolean(requestBusy)} onPress={() => void respondToRequest(request,'accepted')} style={styles.primaryAction}>{requestBusy === request.id ? <ActivityIndicator color={Colors.textOnPrimary}/> : <Text style={styles.primaryActionText}>Accept</Text>}</TouchableOpacity></View> : <TouchableOpacity disabled={Boolean(requestBusy)} onPress={() => void respondToRequest(request,'cancelled')}><Text style={styles.cancelText}>Cancel request</Text></TouchableOpacity> : null}</View>; })}</ScrollView>
          </>}
        </View>
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
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>{selectedTab === 'groups' ? 'No group conversations yet' : 'No conversations yet.'}</Text>
          <Text style={styles.emptyStateSub}>{selectedTab === 'groups' ? 'Accepted team members can open their private team conversation from the team page.' : 'Find a student and send a message request.'}</Text>
          {selectedTab !== 'groups' && chatRequestsEnabled ? <TouchableOpacity accessibilityRole="button" onPress={openCompose} style={styles.retryButton}><Text style={styles.retryText}>Start Conversation</Text></TouchableOpacity> : null}
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
            {selectedRecipient ? <View style={styles.composerCard}><View style={styles.requestPerson}><Avatar uri={selectedRecipient.avatar} name={selectedRecipient.name} size={42}/><View style={styles.recipientCopy}><Text style={styles.recipientName}>{selectedRecipient.name}</Text><Text style={styles.convSubtitle}>{[selectedRecipient.degree || selectedRecipient.branch, selectedRecipient.college].filter(Boolean).join(' · ')}</Text></View></View>{selectedRecipientStatus === 'pending' ? <Text style={styles.formError}>A request is already pending for this student.</Text> : selectedRecipientStatus === 'unavailable' ? <Text style={styles.formError}>This student is not accepting requests or is unavailable.</Text> : <><Text style={styles.fieldLabel}>Introductory message (optional)</Text><TextInput accessibilityLabel="Introductory message" multiline maxLength={1000} value={introMessage} onChangeText={setIntroMessage} placeholder="Say hello and share why you’d like to connect" placeholderTextColor={Colors.textSubtle} style={styles.introInput}/><TouchableOpacity accessibilityRole="button" disabled={Boolean(requestBusy)} onPress={() => void sendRequest()} style={styles.primaryAction}>{requestBusy ? <ActivityIndicator color={Colors.textOnPrimary}/> : <Text style={styles.primaryActionText}>Send request</Text>}</TouchableOpacity></>}{recipientError ? <Text accessibilityRole="alert" style={styles.formError}>{recipientError}</Text> : null}</View> : visibleRecipients.length ? visibleRecipients.map((recipient) => <TouchableOpacity key={recipient.id} accessibilityRole="button" disabled={Boolean(openingRecipient)} onPress={() => { void startConversation(recipient); }} style={styles.recipientRow}><Avatar uri={recipient.avatar} name={recipient.name} size={42} /><View style={styles.recipientCopy}><Text style={styles.recipientName}>{recipient.name}</Text><Text style={styles.convSubtitle} numberOfLines={1}>{[recipient.degree || recipient.branch, recipient.college].filter(Boolean).join(' · ') || 'STUDOS student'}</Text></View>{openingRecipient === recipient.id ? <ActivityIndicator color={Colors.primary} /> : <Ionicons name="chevron-forward" size={19} color={Colors.primary} />}</TouchableOpacity>) : <Text style={styles.emptySub}>No contactable students match that search.</Text>}
          </ScrollView>}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  modalSafe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingHorizontal: Spacing.screenPadding, paddingTop: 4, paddingBottom: 8 },
  headerCopy: { flex: 1, minWidth: 0 },
  backButton: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, lineHeight: 27, fontWeight: Typography.semiBold, color: Colors.textPrimary },
  subtitle: { fontSize: Typography.caption, color: Colors.textMuted, marginTop: 0 },
  newMessageButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 11, borderRadius: 10, backgroundColor: Colors.primary },
  newMessageText: { color: Colors.textOnPrimary, fontSize: Typography.caption, fontWeight: Typography.bold },
  disabledButton: { backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border },
  disabledButtonText: { color: Colors.textMuted },
  stagingNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: Spacing.screenPadding, marginBottom: 8, padding: 9, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, backgroundColor: Colors.surfaceSubtle },
  stagingNoticeText: { flex: 1, color: Colors.textMuted, fontSize: 12, lineHeight: 17 },
  requestSection: { flex: 1, paddingHorizontal: Spacing.screenPadding }, requestTabs: { flexDirection: 'row', gap: 6, marginBottom: 6 }, requestTab: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 9, backgroundColor: Colors.surfaceElevated }, requestTabActive: { backgroundColor: Colors.primarySubtle }, requestTabText: { color: Colors.textMuted, fontSize: Typography.caption, fontWeight: Typography.semiBold }, requestTabTextActive: { color: Colors.primary }, requestList: { paddingBottom: 24 }, requestCard: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: Colors.border, marginBottom: 4, gap: 9 }, requestPerson: { flexDirection: 'row', alignItems: 'center', gap: 10 }, requestMessage: { color: Colors.textSecondary, fontSize: Typography.footnote, lineHeight: 20 }, requestActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }, secondaryAction: { minWidth: 88, minHeight: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: Colors.border }, secondaryActionText: { color: Colors.textSecondary, fontWeight: Typography.semiBold }, primaryAction: { minWidth: 112, minHeight: 42, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center', borderRadius: 10, backgroundColor: Colors.primary }, primaryActionText: { color: Colors.textOnPrimary, fontWeight: Typography.bold }, cancelText: { color: Colors.error, fontWeight: Typography.semiBold, paddingVertical: 7 }, composerCard: { padding: 12, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, gap: 10, marginTop: 6 }, fieldLabel: { color: Colors.textSecondary, fontSize: Typography.caption, fontWeight: Typography.semiBold }, introInput: { minHeight: 84, maxHeight: 140, textAlignVertical: 'top', color: Colors.textPrimary, backgroundColor: Colors.surfaceElevated, borderColor: Colors.border, borderWidth: 1, borderRadius: 10, padding: 11 }, formError: { color: Colors.error, fontSize: Typography.caption },
  searchWrapper: { paddingHorizontal: Spacing.screenPadding, marginBottom: 7 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 11, minHeight: 42 },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: Typography.body, marginLeft: 8, paddingVertical: 8, minWidth: 0 },
  tabsRow: { marginBottom: 4 }, tabsScroll: { paddingHorizontal: Spacing.screenPadding, gap: 6 },
  listContainer: { paddingHorizontal: Spacing.screenPadding, paddingBottom: 24 },
  conversationItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: Colors.border, paddingVertical: 11, gap: 10 },
  convDetails: { flex: 1, minWidth: 0 }, convTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  convName: { fontSize: Typography.headline, fontWeight: Typography.bold, color: Colors.textPrimary, flex: 1, marginRight: 6 }, convTime: { fontSize: 11, color: Colors.textSubtle },
  convSubtitle: { fontSize: Typography.caption, color: Colors.textMuted, marginBottom: 3 }, lastMessage: { fontSize: Typography.footnote, color: Colors.textSecondary },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 10 }, emptyTitle: { fontSize: Typography.headline, fontWeight: Typography.bold, color: Colors.textPrimary, textAlign: 'center' },
  emptyState: { alignItems: 'flex-start', justifyContent: 'flex-start', paddingHorizontal: Spacing.screenPadding, paddingTop: 10, gap: 5 },
  emptyStateTitle: { fontSize: Typography.headline, fontWeight: Typography.bold, color: Colors.textPrimary }, emptyStateSub: { fontSize: Typography.footnote, lineHeight: 20, color: Colors.textMuted },
  emptySub: { fontSize: Typography.footnote, lineHeight: 20, color: Colors.textMuted, textAlign: 'center', maxWidth: 300 },
  retryButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: BorderRadius.md, backgroundColor: Colors.primary, marginTop: 4 }, retryText: { color: Colors.textOnPrimary, fontWeight: Typography.bold, fontSize: Typography.footnote },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: Spacing.screenPadding, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalClose: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }, modalHeadingCopy: { flex: 1, alignItems: 'center' }, modalTitle: { color: Colors.textPrimary, fontSize: Typography.title3, fontWeight: Typography.bold }, modalSubtitle: { color: Colors.textMuted, fontSize: Typography.caption, marginTop: 2 },
  recipientList: { paddingHorizontal: Spacing.screenPadding, paddingBottom: 24 }, recipientRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border }, recipientCopy: { flex: 1, minWidth: 0 }, recipientName: { color: Colors.textPrimary, fontWeight: Typography.semiBold, fontSize: Typography.body, marginBottom: 3 }, modalError: { alignItems: 'center', gap: 10, padding: 24 },
});
