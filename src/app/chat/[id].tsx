import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, BorderRadius } from '../../constants/theme';
import { Avatar } from '../../components/ui/Avatar';
import { useApp } from '../../context/AppContext';
import { dataService } from '../../services/dataService';
import { ChatMessage } from '../../types';

const QUICK_REPLIES = [
  'Let’s set up a quick 15-min call! 📞',
  'Here is my GitHub repo with the prototype 🚀',
  'Free to jam this evening on Figma! 🎨',
  'What tech stack are we thinking for this?',
];

export default function ChatConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { conversations, sendMessage, user } = useApp();

  const conv = conversations.find((c) => c.id === id) || {
    id: id || 'conv_1',
    name: 'Maya Chen',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
    type: 'match' as const,
    lastMessage: '',
    lastMessageTime: '',
    unreadCount: 0,
    subtitle: 'Mutual Match • Stanford',
  };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const load = async () => {
      const msgList = await dataService.getMessages(conv.id);
      setMessages(msgList);
    };
    load();
  }, [conv.id]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    setInputText('');
    const newMsg: ChatMessage = {
      id: `m_${messages.length + 1}`,
      conversationId: conv.id,
      senderId: user.id,
      senderName: user.name,
      senderAvatar: user.avatar,
      text,
      timestamp: 'Just now',
      isCurrentUser: true,
    };

    setMessages((prev) => [...prev, newMsg]);
    await sendMessage(conv.id, text);

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleMenu = () => {
    Alert.alert(
      'Conversation Options',
      'Manage conversation settings or report.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mute Notifications', onPress: () => Alert.alert('Muted', 'Notifications muted for 8 hours.') },
        {
          text: 'Report & Block',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Reported', 'User reported and blocked.');
            router.back();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Custom Header Bar */}
        <View style={styles.topHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

          <Avatar uri={conv.avatar} name={conv.name} size={40} isOnline />

          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>{conv.name}</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{conv.subtitle}</Text>
          </View>

          <TouchableOpacity style={styles.menuBtn} onPress={handleMenu}>
            <Ionicons name="ellipsis-vertical" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Message Thread */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {/* Encryption/Security Notice */}
          <View style={styles.encryptedBanner}>
            <Ionicons name="lock-closed" size={12} color={Colors.textMuted} />
            <Text style={styles.encryptedText}>
              Verified Student Collaboration Channel • Direct & Secure
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
                  {msg.timestamp}
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
          <TouchableOpacity style={styles.attachBtn}>
            <Ionicons name="code-slash-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>

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
            disabled={!inputText.trim()}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  menuBtn: {
    padding: 6,
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
  attachBtn: {
    padding: 8,
    marginRight: 4,
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
