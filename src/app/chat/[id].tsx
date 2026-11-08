import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  type ScrollViewInstance,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { safeBack } from '@/navigation/safeBack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, BorderRadius } from '../../constants/theme';
import { Avatar } from '../../components/ui/Avatar';
import { useApp } from '../../context/AppContext';
import { dataService } from '../../services/dataService';
import { chatService } from '../../services/chatService';
import { ChatMessage, ChatConversation } from '../../types';

const QUICK_REPLIES = [
  'Let’s set up a quick 15-min call! 📞',
  'Here is my GitHub repo with the prototype 🚀',
  'Free to jam this evening on Figma! 🎨',
  'What tech stack are we thinking for this?',
];

function formatMessageTime(value: string) {
  if (value === 'Just now') return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function ChatConversationScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { conversations, sendMessage, user } = useApp();
  const [loadedConversation, setLoadedConversation] = useState<ChatConversation | null>(null);
  const conv = (loadedConversation?.id === id ? loadedConversation : null) || conversations.find((c) => c.id === id);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [membersVisible, setMembersVisible] = useState(false);
  const [conversationMembers, setConversationMembers] = useState<{ id: string; name: string; avatar: string }[]>([]);
  const [membersError, setMembersError] = useState('');
  const pollingEnabled = useRef(true);
  const scrollRef = useRef<ScrollViewInstance | null>(null);
  const pendingMessageSequence = useRef(0);

  useEffect(() => {
    if (!id) return;
    let active = true;
    pollingEnabled.current = true;
    const load = async (initial = false) => {
      try {
        const [conversationsResult, msgList] = await Promise.all([
          dataService.getConversations(),
          dataService.getMessages(id),
        ]);
        if (!active) return;
        const authorizedConversation = conversationsResult.find((item) => item.id === id);
        if (!authorizedConversation) {
          pollingEnabled.current = false;
          throw new Error('This conversation is unavailable to your account.');
        }
        setLoadedConversation(authorizedConversation);
        setMessages(msgList);
        setLoadError('');
      } catch (cause) {
        if (active) {
          const code = (cause as { code?: string } | null)?.code;
          const message = cause instanceof Error ? cause.message.toLocaleLowerCase() : '';
          if ((code && ['42501', '42703', 'PGRST200', 'PGRST204', 'PGRST205'].includes(code)) || message.includes('sign in')) pollingEnabled.current = false;
          if (initial) setMessages([]);
          setLoadError(cause instanceof Error ? cause.message : 'Messages could not be loaded.');
        }
      } finally {
        if (active && initial) setLoading(false);
      }
    };
    void load(true);
    const interval = setInterval(() => { if (pollingEnabled.current) void load(false); }, 15000);
    return () => { active = false; clearInterval(interval); };
  }, [id, reloadKey]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !conv || sending) return;

    setInputText('');
    const newMsg: ChatMessage = {
      id: `pending-${conv.id}-${pendingMessageSequence.current++}`,
      conversationId: conv.id,
      senderId: user.id,
      senderName: user.name,
      senderAvatar: user.avatar,
      text,
      timestamp: 'Just now',
      isCurrentUser: true,
    };

    setMessages((prev) => [...prev, newMsg]);
    setSending(true);
    try {
      await sendMessage(conv.id, text);
      const freshMessages = await dataService.getMessages(conv.id);
      setMessages(freshMessages);
    } catch (cause) {
      setMessages((previous) => previous.filter((message) => message.id !== newMsg.id));
      setInputText(text);
      Alert.alert('Message not sent', cause instanceof Error ? cause.message : 'Please try again.');
    } finally {
      setSending(false);
    }

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const showMembers = async () => {
    if (!conv || conv.type !== 'team') return;
    setMembersVisible(true);
    setMembersError('');
    try { setConversationMembers(await chatService.members(conv.id)); }
    catch (cause) { setMembersError(cause instanceof Error ? cause.message : 'Team members could not be loaded.'); }
  };

  if (!conv && loading) {
    return <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}><View style={styles.unavailable}><ActivityIndicator color={Colors.primary} /><Text style={styles.unavailableBody}>Opening conversation…</Text></View></SafeAreaView>;
  }

  if (!conv) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.unavailable}>
          <Ionicons name="chatbubble-ellipses-outline" size={30} color={Colors.textMuted} />
          <Text style={styles.unavailableTitle}>Conversation unavailable</Text>
          <Text style={styles.unavailableBody}>This conversation could not be found. Return to Messages and open an existing conversation.</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => safeBack()} style={styles.unavailableButton}><Text style={styles.unavailableButtonText}>Back to messages</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Custom Header Bar */}
        <View style={styles.topHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => safeBack()}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

          <Avatar uri={conv.avatar} name={conv.name} size={40} />

          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>{conv.name}</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{conv.subtitle}</Text>
          </View>
          {conv.type === 'team' ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="View team conversation members" onPress={() => { void showMembers(); }} style={styles.membersButton}><Ionicons name="people-outline" size={20} color={Colors.textSecondary} /></TouchableOpacity> : null}
        </View>

        {/* Message Thread */}
        {loadError ? <View style={styles.loadError}><Text accessibilityRole="alert" style={styles.loadErrorText}>{loadError}</Text><TouchableOpacity accessibilityRole="button" onPress={() => { setLoading(true); setLoadError(''); setReloadKey((value) => value + 1); }}><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View> : null}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {/* Encryption/Security Notice */}
          <View style={styles.encryptedBanner}>
            <Ionicons name="people-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.encryptedText}>
              A space for student collaboration
            </Text>
          </View>

          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.bubbleWrapper,
                msg.isCurrentUser ? styles.bubbleWrapperRight : styles.bubbleWrapperLeft,
              ]}
            >
              {!msg.isCurrentUser ? (
                <Avatar uri={msg.senderAvatar} name={msg.senderName} size={28} style={styles.msgAvatar} />
              ) : null}

              <View
                style={[
                  styles.bubble,
                  msg.isCurrentUser ? styles.bubbleRight : styles.bubbleLeft,
                ]}
              >
                {!msg.isCurrentUser ? (
                  <Text style={styles.senderLabel}>{msg.senderName}</Text>
                ) : null}
                <Text
                  style={[
                    styles.messageText,
                    msg.isCurrentUser ? styles.messageTextRight : styles.messageTextLeft,
                  ]}
                >
                  {msg.text}
                </Text>
                <Text
                  style={[
                    styles.timestampText,
                    msg.isCurrentUser ? styles.timestampRight : styles.timestampLeft,
                  ]}
                >
                  {formatMessageTime(msg.timestamp)}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Quick Reply Suggestions */}
        <View style={styles.quickRepliesBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRepliesScroll}>
            {QUICK_REPLIES.map((reply) => (
              <TouchableOpacity
                key={reply}
                style={styles.quickReplyChip}
                onPress={() => handleSend(reply)}
              >
                <Text style={styles.quickReplyText}>{reply}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input Composer */}
        <View style={styles.composerContainer}>
          <TextInput
            placeholder="Type a message or code idea..."
            placeholderTextColor={Colors.textSubtle}
            value={inputText}
            onChangeText={setInputText}
            style={styles.composerInput}
            multiline
          />

          <TouchableOpacity
            style={[
              styles.sendBtn,
              inputText.trim() ? styles.sendBtnActive : undefined,
            ]}
            disabled={!inputText.trim() || sending}
            onPress={() => handleSend()}
          >
            <Ionicons
              name="send"
              size={18}
              color={inputText.trim() ? '#FFF' : Colors.textDisabled}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <Modal visible={membersVisible} transparent animationType="fade" onRequestClose={() => setMembersVisible(false)}>
        <View style={styles.membersOverlay}><View style={styles.membersCard}>
          <View style={styles.membersHeading}><Text style={styles.membersTitle}>Team members</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close team members" onPress={() => setMembersVisible(false)} style={styles.membersClose}><Ionicons name="close" size={20} color={Colors.textMuted} /></TouchableOpacity></View>
          {membersError ? <Text accessibilityRole="alert" style={styles.loadErrorText}>{membersError}</Text> : conversationMembers.map((member) => <View key={member.id} style={styles.memberRow}><Avatar uri={member.avatar} name={member.name} size={38} /><Text style={styles.memberName}>{member.name}{member.id === user.id ? ' · You' : ''}</Text></View>)}
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  unavailable: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 },
  unavailableTitle: { color: Colors.textPrimary, fontSize: Typography.title3, fontWeight: Typography.bold, textAlign: 'center' },
  unavailableBody: { color: Colors.textMuted, fontSize: Typography.body, lineHeight: 22, textAlign: 'center', maxWidth: 320 },
  unavailableButton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, borderRadius: BorderRadius.md, backgroundColor: Colors.primary, marginTop: 8 },
  unavailableButtonText: { color: Colors.textOnPrimary, fontWeight: Typography.bold, fontSize: Typography.subhead },
  loadError: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.surfaceElevated },
  loadErrorText: { flex: 1, color: Colors.error, fontSize: Typography.caption },
  retryText: { color: Colors.primary, fontSize: Typography.caption, fontWeight: Typography.bold },
  membersOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  membersCard: { width: '100%', maxWidth: 420, maxHeight: '75%', padding: 18, borderRadius: BorderRadius.lg, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  membersHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  membersTitle: { color: Colors.textPrimary, fontSize: Typography.title3, fontWeight: Typography.bold },
  membersClose: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  memberRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  memberName: { color: Colors.textPrimary, fontSize: Typography.body, fontWeight: Typography.medium },
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    padding: 6,
    marginRight: 6,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  membersButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerName: {
    fontSize: Typography.headline,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 1,
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 10,
  },
  encryptedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceHighlight,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    alignSelf: 'center',
    marginBottom: 16,
  },
  encryptedText: {
    fontSize: 10,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  bubbleWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  bubbleWrapperLeft: {
    justifyContent: 'flex-start',
  },
  bubbleWrapperRight: {
    justifyContent: 'flex-end',
  },
  msgAvatar: {
    marginRight: 8,
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '78%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.lg,
  },
  bubbleLeft: {
    backgroundColor: Colors.surfaceElevated,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleRight: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  senderLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 4,
  },
  messageText: {
    fontSize: Typography.body,
    lineHeight: 20,
  },
  messageTextLeft: {
    color: Colors.textPrimary,
  },
  messageTextRight: {
    color: '#FFF',
  },
  timestampText: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timestampLeft: {
    color: Colors.textMuted,
  },
  timestampRight: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  quickRepliesBar: {
    backgroundColor: Colors.surfaceSubtle,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  quickRepliesScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  quickReplyChip: {
    backgroundColor: Colors.surfaceElevated,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  quickReplyText: {
    fontSize: Typography.footnote,
    color: Colors.textSecondary,
  },
  composerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  composerInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.textPrimary,
    fontSize: Typography.body,
    maxHeight: 100,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendBtnActive: {
    backgroundColor: Colors.primary,
  },
});
