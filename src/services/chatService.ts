import type { ChatConversation, ChatMessage } from '../types';
import { requireSupabase } from './supabase';

type PublicProfile = { id: string; first_name: string | null; last_name: string | null; college: string | null; branch: string | null; degree?: string | null; avatar_url: string | null };
type ChatQueryResult = { data: Record<string, unknown>[] | null; error: { code: string; message: string } | null };
export type ChatRequest = { id: string; requester_id: string; recipient_id: string; introductory_message: string | null; status: 'pending' | 'accepted' | 'declined' | 'cancelled'; created_at: string; conversation_id: string | null };
// Enable only after migration 011 has been deployed and its live grants/RLS have been reviewed.
export const chatRequestsEnabled = process.env.EXPO_PUBLIC_CHAT_REQUESTS_ENABLED === 'true';

function displayName(profile?: Partial<PublicProfile>) { return [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'STUDOS student'; }
function isMissingColumn(error: { code?: string; message?: string } | null) {
  return Boolean(error && (error.code === '42703' || error.code === 'PGRST204' || /column .* does not exist/i.test(error.message || '')));
}
async function currentUser() {
  const db = requireSupabase();
  const { data: { user }, error } = await db.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error('Sign in to use Messages.');
  return { db, user };
}
async function publicProfiles(ids: string[]) {
  if (!ids.length) return new Map<string, PublicProfile>();
  const db = requireSupabase();
  const { data, error } = await db.from('profiles').select('id:auth_user_id,first_name,last_name,college,branch,degree,avatar_url').in('auth_user_id', ids);
  if (error) throw error;
  return new Map((data || []).map((profile) => [profile.id, profile as PublicProfile]));
}

export const chatService = {
  async conversations(): Promise<ChatConversation[]> {
    const { db, user } = await currentUser();
    const { data: memberships, error: membershipError } = await db.from('conversation_members').select('conversation_id').eq('user_id', user.id);
    if (membershipError) throw membershipError;
    const ids = [...new Set((memberships || []).map((row) => row.conversation_id))];
    if (!ids.length) return [];
    const memberRows = await db.from('conversation_members').select('conversation_id,user_id').in('conversation_id', ids);
    if (memberRows.error) throw memberRows.error;
    let conversations: ChatQueryResult = await db.from('conversations').select('id,kind,conversation_type,title,created_at,last_message_at,last_message_preview').in('id', ids);
    let hasPreview = true;
    if (conversations.error) {
      conversations = await db.from('conversations').select('id,kind,conversation_type,title,created_at,last_message_at').in('id', ids);
      if (!conversations.error) hasPreview = false;
    }
    if (conversations.error) {
      conversations = await db.from('conversations').select('id,conversation_type,title,created_at,last_message_at').in('id', ids);
      if (!conversations.error) hasPreview = false;
    }
    if (conversations.error) {
      conversations = await db.from('conversations').select('id,kind,title,created_at,last_message_at').in('id', ids);
      if (!conversations.error) hasPreview = false;
    }
    if (conversations.error) {
      conversations = await db.from('conversations').select('id,kind,title,created_at').in('id', ids);
      if (!conversations.error) hasPreview = false;
    }
    if (conversations.error) throw conversations.error;
    let legacyLatest = new Map<string, string>();
    if (!hasPreview) {
      let recent: ChatQueryResult = await db.from('messages').select('conversation_id,content,body,created_at').in('conversation_id', ids).order('created_at', { ascending: false }).limit(200);
      if (recent.error) recent = await db.from('messages').select('conversation_id,content,created_at').in('conversation_id', ids).order('created_at', { ascending: false }).limit(200);
      if (recent.error) recent = await db.from('messages').select('conversation_id,body,created_at').in('conversation_id', ids).order('created_at', { ascending: false }).limit(200);
      if (recent.error) throw recent.error;
      legacyLatest = new Map((recent.data || []).map((message) => [String(message.conversation_id), typeof message.content === 'string' ? message.content : typeof message.body === 'string' ? message.body : '']));
    }
    const members = memberRows.data || [];
    const profiles = await publicProfiles([...new Set(members.map((m) => m.user_id).filter((id) => id !== user.id))]);
    return (conversations.data || []).map((raw) => {
      const row = raw as { id: string; conversation_type?: string; kind?: string; title?: string; created_at: string; last_message_at?: string; last_message_preview?: string | null };
      const otherIds = members.filter((m) => m.conversation_id === row.id && m.user_id !== user.id).map((m) => m.user_id);
      const isGroup = (row.conversation_type || row.kind) !== 'direct';
      const other = otherIds.length === 1 ? profiles.get(otherIds[0]) : undefined;
      return { id: row.id, name: isGroup ? row.title || 'Group conversation' : displayName(other), avatar: other?.avatar_url || '', type: isGroup ? 'team' as const : 'direct' as const,
        lastMessage: (hasPreview ? row.last_message_preview : legacyLatest.get(row.id)) || '', lastMessageTime: row.last_message_at || row.created_at,
        unreadCount: 0, subtitle: isGroup ? `${otherIds.length + 1} members` : [other?.branch, other?.college].filter(Boolean).join(' · '), membersCount: isGroup ? otherIds.length + 1 : undefined };
    }).sort((a, b) => Date.parse(b.lastMessageTime) - Date.parse(a.lastMessageTime));
  },

  async messageRecipients(): Promise<{ id: string; name: string; avatar: string; college: string; branch: string; degree: string }[]> {
    const { db, user } = await currentUser();
    const rows: PublicProfile[] = [];
    for (let from = 0; ; from += 500) {
      const page = await db.from('profiles').select('id:auth_user_id,first_name,last_name,college,branch,degree,avatar_url').not('auth_user_id', 'is', null).neq('auth_user_id', user.id).order('first_name').range(from, from + 499);
      if (page.error) throw page.error;
      rows.push(...((page.data || []) as PublicProfile[]));
      if (!page.data || page.data.length < 500) break;
    }
    return rows.map((profile) => ({ id: profile.id, name: displayName(profile), avatar: profile.avatar_url || '', college: profile.college || '', branch: profile.branch || '', degree: profile.degree || '' }));
  },

  async requestStatus(otherAuthId: string): Promise<'conversation' | 'pending' | 'available' | 'unavailable'> {
    const { db } = await currentUser();
    const { data, error } = await db.rpc('direct_chat_contact_status', { target_user_id: otherAuthId });
    if (error) throw error;
    if (data === 'conversation' || data === 'pending' || data === 'available') return data;
    return 'unavailable';
  },

  async existingConversation(otherAuthId: string): Promise<string | null> {
    const { db, user } = await currentUser();
    const own = await db.from('conversation_members').select('conversation_id').eq('user_id', user.id);
    if (own.error) throw own.error;
    const ids = (own.data || []).map((row) => row.conversation_id);
    if (!ids.length) return null;
    const match = await db.from('conversation_members').select('conversation_id').eq('user_id', otherAuthId).in('conversation_id', ids).limit(1).maybeSingle();
    if (match.error) throw match.error;
    return match.data?.conversation_id || null;
  },

  async createRequest(otherAuthId: string, message: string): Promise<string> {
    const { db, user } = await currentUser();
    if (!otherAuthId || otherAuthId === user.id) throw new Error('Choose another STUDOS student.');
    const { data, error } = await db.rpc('request_direct_conversation', { target_user_id: otherAuthId, request_message: message.trim() || null });
    if (error) throw error;
    if (typeof data !== 'string') throw new Error('The request service returned no request ID.');
    return data;
  },

  async requests(): Promise<{ received: ChatRequest[]; sent: ChatRequest[] }> {
    const { db, user } = await currentUser();
    const { data, error } = await db.from('conversation_requests').select('id,requester_id,recipient_id,introductory_message,status,created_at,conversation_id').or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`).order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    const rows = (data || []) as ChatRequest[];
    return { received: rows.filter((r) => r.recipient_id === user.id), sent: rows.filter((r) => r.requester_id === user.id) };
  },

  async respond(requestId: string, decision: 'accepted' | 'declined'): Promise<string | null> {
    const { db } = await currentUser();
    const { data, error } = await db.rpc('respond_to_conversation_request', { request_id: requestId, decision });
    if (error) throw error;
    return typeof data === 'string' ? data : null;
  },
  async cancelRequest(requestId: string) {
    const { db } = await currentUser();
    const { error } = await db.rpc('cancel_conversation_request', { request_id: requestId });
    if (error) throw error;
  },
  async requestPreference(): Promise<boolean> {
    const { db, user } = await currentUser();
    const { data, error } = await db.from('user_chat_settings').select('allow_requests').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    return data?.allow_requests ?? true;
  },
  async setRequestPreference(enabled: boolean) {
    const { db } = await currentUser();
    const { error } = await db.rpc('set_chat_request_preference', { enabled });
    if (error) throw error;
  },
  async blockUser(targetUserId: string) {
    const { db } = await currentUser();
    const { error } = await db.rpc('block_chat_user', { target_user_id: targetUserId });
    if (error) throw error;
  },

  async members(conversationId: string): Promise<{ id: string; name: string; avatar: string }[]> {
    const { db, user } = await currentUser();
    const { data, error } = await db.from('conversation_members').select('user_id').eq('conversation_id', conversationId);
    if (error) throw error;
    const ids = [...new Set((data || []).map((row) => row.user_id))];
    if (!ids.includes(user.id)) throw new Error('This conversation is unavailable to your account.');
    const profiles = await publicProfiles(ids);
    return ids.map((id) => ({ id, name: displayName(profiles.get(id)), avatar: profiles.get(id)?.avatar_url || '' }));
  },

  async messages(conversationId: string, before?: { createdAt: string; id: string }): Promise<ChatMessage[]> {
    const { db, user } = await currentUser();
    let query = db.from('messages').select('id,conversation_id,sender_id,content,body,created_at').eq('conversation_id', conversationId).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(50);
    if (before) query = query.or(`created_at.lt.${before.createdAt},and(created_at.eq.${before.createdAt},id.lt.${before.id})`);
    let messageResult: ChatQueryResult = await query;
    if (messageResult.error) {
      if (!isMissingColumn(messageResult.error)) throw messageResult.error;
      let fallback = db.from('messages').select('id,conversation_id,sender_id,body,created_at').eq('conversation_id', conversationId).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(50);
      if (before) fallback = fallback.or(`created_at.lt.${before.createdAt},and(created_at.eq.${before.createdAt},id.lt.${before.id})`);
      messageResult = await fallback;
    }
    if (messageResult.error) {
      if (!isMissingColumn(messageResult.error)) throw messageResult.error;
      let fallback = db.from('messages').select('id,conversation_id,sender_id,content,created_at').eq('conversation_id', conversationId).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(50);
      if (before) fallback = fallback.or(`created_at.lt.${before.createdAt},and(created_at.eq.${before.createdAt},id.lt.${before.id})`);
      messageResult = await fallback;
    }
    if (messageResult.error) throw messageResult.error;
    const rows = [...(messageResult.data || [])].reverse().map((raw) => raw as { id: string; conversation_id: string; sender_id: string; content?: string | null; body?: string | null; created_at: string });
    const profiles = await publicProfiles([...new Set(rows.map((row) => row.sender_id))]);
    return rows.map((row) => ({ id: row.id, conversationId: row.conversation_id, senderId: row.sender_id, senderName: displayName(profiles.get(row.sender_id)), senderAvatar: profiles.get(row.sender_id)?.avatar_url || '', text: row.content || row.body || '', timestamp: row.created_at, isCurrentUser: row.sender_id === user.id }));
  },

  async sendMessage(conversationId: string, body: string): Promise<{ id: string; timestamp: string }> {
    const { db, user } = await currentUser();
    const message = body.trim();
    if (!message) throw new Error('Write a message before sending.');
    const result = await db.from('messages')
      .insert({ conversation_id: conversationId, sender_id: user.id, content: message })
      .select('id,created_at')
      .single();
    if (result.error) throw result.error;
    if (!result.data) throw new Error('The message was not confirmed by the database.');
    return { id: result.data.id, timestamp: result.data.created_at };
  },

  subscribeMessages(conversationId: string, onMessage: () => void, onStatus?: (status: string, error?: Error) => void) {
    const db = requireSupabase();
    const channel = db.channel(`chat:${conversationId}`).on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}`,
    }, onMessage).subscribe((status, error) => onStatus?.(status, error));
    return () => { void db.removeChannel(channel); };
  },
};
