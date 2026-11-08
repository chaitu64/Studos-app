import type { ChatConversation, ChatMessage } from '../types';
import { requireSupabase } from './supabase';

type PublicProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  college: string | null;
  branch: string | null;
  avatar_url: string | null;
};

export const directConversationStagingEnabled = process.env.EXPO_PUBLIC_CHAT_STAGING_ENABLED === 'true';

function displayName(profile?: Partial<PublicProfile>) {
  return [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'STUDOS student';
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
  const { data, error } = await db.from('profiles')
    .select('id,first_name,last_name,college,branch,avatar_url').in('id', ids);
  if (error) throw error;
  return new Map((data || []).map((profile) => [profile.id, profile as PublicProfile]));
}

export const chatService = {
  async conversations(): Promise<ChatConversation[]> {
    const { db, user } = await currentUser();
    const { data: memberships, error: membershipError } = await db.from('conversation_members')
      .select('conversation_id').eq('user_id', user.id);
    if (membershipError) throw membershipError;
    const ids = [...new Set((memberships || []).map((row) => row.conversation_id))];
    if (!ids.length) return [];

    const [conversationResult, membersResult, messagesResult] = await Promise.all([
      db.from('conversations').select('id,kind,title,created_by,direct_member_low,direct_member_high,created_at')
        .in('id', ids).order('created_at', { ascending: false }),
      db.from('conversation_members').select('conversation_id,user_id').in('conversation_id', ids),
      db.from('messages').select('conversation_id,body,created_at,sender_id')
        .in('conversation_id', ids).order('created_at', { ascending: false }).limit(500),
    ]);
    if (conversationResult.error) throw conversationResult.error;
    if (membersResult.error) throw membersResult.error;
    if (messagesResult.error) throw messagesResult.error;

    const members = membersResult.data || [];
    const profileIds = [...new Set(members.map((row) => row.user_id).filter((id) => id !== user.id))];
    const profiles = await publicProfiles(profileIds);
    const latestByConversation = new Map<string, (typeof messagesResult.data)[number]>();
    for (const message of messagesResult.data || []) {
      if (!latestByConversation.has(message.conversation_id)) latestByConversation.set(message.conversation_id, message);
    }

    return (conversationResult.data || []).map((row) => {
      const conversationMembers = members.filter((member) => member.conversation_id === row.id);
      const otherMembers = conversationMembers.filter((member) => member.user_id !== user.id);
      const other = otherMembers.length === 1 ? profiles.get(otherMembers[0].user_id) : undefined;
      const isGroup = row.kind !== 'direct';
      const latest = latestByConversation.get(row.id);
      return {
        id: row.id,
        name: isGroup ? row.title || 'Group conversation' : displayName(other),
        avatar: isGroup ? '' : other?.avatar_url || '',
        type: isGroup ? 'team' as const : 'direct' as const,
        lastMessage: latest?.body || '',
        lastMessageTime: latest?.created_at || row.created_at,
        unreadCount: 0,
        subtitle: isGroup ? `${conversationMembers.length} members` : [other?.branch, other?.college].filter(Boolean).join(' · '),
        membersCount: isGroup ? conversationMembers.length : undefined,
      };
    });
  },

  async messageRecipients(): Promise<{ id: string; name: string; avatar: string; college: string; branch: string }[]> {
    const { db, user } = await currentUser();
    // public.profiles are Auth-backed. Seeded student_profiles are intentionally excluded.
    const data: PublicProfile[] = [];
    for (let from = 0; ; from += 500) {
      const page = await db.from('profiles').select('id,first_name,last_name,college,branch,avatar_url')
        .neq('id', user.id).order('first_name', { ascending: true }).range(from, from + 499);
      if (page.error) throw page.error;
      data.push(...((page.data || []) as PublicProfile[]));
      if (!page.data || page.data.length < 500) break;
    }
    return data.map((profile) => ({
      id: profile.id,
      name: displayName(profile),
      avatar: profile.avatar_url || '',
      college: profile.college || '',
      branch: profile.branch || '',
    }));
  },

  async startDirectConversation(otherAuthId: string): Promise<string> {
    const { db, user } = await currentUser();
    if (!otherAuthId || otherAuthId === user.id) throw new Error('Choose another STUDOS student.');
    // The current RPC has no recipient-consent or abuse-prevention workflow. Keep creation disabled
    // unless an explicitly isolated staging deployment opts in.
    if (!directConversationStagingEnabled) {
      throw new Error('Starting new direct conversations is currently limited to the staging environment.');
    }
    const { data: recipient, error: recipientError } = await db.from('profiles').select('id').eq('id', otherAuthId).maybeSingle();
    if (recipientError) throw recipientError;
    if (!recipient) throw new Error('This student does not have a contactable authenticated account.');
    const { data, error } = await db.rpc('start_direct_conversation', { p_other_user: otherAuthId });
    if (error) throw error;
    const conversationId = typeof data === 'string' ? data : (data as { id?: string } | null)?.id;
    if (!conversationId) throw new Error('The conversation service returned no conversation ID.');
    return conversationId;
  },

  async members(conversationId: string): Promise<{ id: string; name: string; avatar: string }[]> {
    const { db, user } = await currentUser();
    const { data: ownMembership, error: ownError } = await db.from('conversation_members')
      .select('conversation_id').eq('conversation_id', conversationId).eq('user_id', user.id).maybeSingle();
    if (ownError) throw ownError;
    if (!ownMembership) throw new Error('This conversation is unavailable to your account.');
    const { data, error } = await db.from('conversation_members').select('user_id')
      .eq('conversation_id', conversationId);
    if (error) throw error;
    const ids = [...new Set((data || []).map((row) => row.user_id))];
    const profiles = await publicProfiles(ids);
    return ids.map((id) => {
      const profile = profiles.get(id);
      return { id, name: displayName(profile), avatar: profile?.avatar_url || '' };
    });
  },

  async messages(conversationId: string): Promise<ChatMessage[]> {
    const { db, user } = await currentUser();
    const { data: membership, error: membershipError } = await db.from('conversation_members')
      .select('conversation_id').eq('conversation_id', conversationId).eq('user_id', user.id).maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) throw new Error('This conversation is unavailable to your account.');
    const { data, error } = await db.from('messages')
      .select('id,conversation_id,sender_id,body,created_at').eq('conversation_id', conversationId)
      .order('created_at', { ascending: true }).limit(500);
    if (error) throw error;
    const profiles = await publicProfiles([...new Set((data || []).map((row) => row.sender_id))]);
    return (data || []).map((row) => {
      const profile = profiles.get(row.sender_id);
      return {
        id: row.id,
        conversationId: row.conversation_id,
        senderId: row.sender_id,
        senderName: displayName(profile),
        senderAvatar: profile?.avatar_url || '',
        text: row.body,
        timestamp: row.created_at,
        isCurrentUser: row.sender_id === user.id,
      };
    });
  },

  async sendMessage(conversationId: string, body: string): Promise<void> {
    const { db, user } = await currentUser();
    const messageBody = body.trim();
    if (!messageBody) throw new Error('Write a message before sending.');
    const { error } = await db.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: messageBody,
    });
    if (error) throw error;
  },
};
