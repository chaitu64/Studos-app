import type { NotificationItem } from '../types';
import { requireSupabase } from './supabase';

const typeFor = (value: string): NotificationItem['type'] => {
  const supported: NotificationItem['type'][] = ['match', 'team_application', 'team_invite', 'message', 'idea_collab', 'deadline', 'achievement'];
  return supported.includes(value as NotificationItem['type']) ? value as NotificationItem['type'] : 'general';
};

export const notificationService = {
  async list(): Promise<NotificationItem[]> {
    const db = requireSupabase(); const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError) throw authError; if (!user) return [];
    const { data, error } = await db.from('notifications').select('id,recipient_id,event_type,title,body,target_path,is_read,is_demo,created_at')
      .eq('recipient_id', user.id).order('created_at', { ascending: false }).limit(100);
    if (error) {
      if (__DEV__) console.warn('[Supabase query failed]', { feature: 'load notifications', relation: 'notifications', code: error.code, message: error.message, details: error.details, hint: error.hint });
      throw error;
    }
    return (data || []).map((row) => ({
      id: row.id, type: typeFor(row.event_type), title: row.title, message: row.body,
      timestamp: row.created_at, read: row.is_read, actionUrl: row.target_path || undefined, isDemo: row.is_demo,
    }));
  },

  async markRead(id: string) {
    const db = requireSupabase(); const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError) throw authError; if (!user) throw new Error('Sign in to update notifications.');
    const { error } = await db.from('notifications').update({ is_read: true }).eq('id', id).eq('recipient_id', user.id);
    if (error) throw error;
  },

  async markAllRead() {
    const db = requireSupabase(); const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError) throw authError; if (!user) throw new Error('Sign in to update notifications.');
    const { error } = await db.from('notifications').update({ is_read: true }).eq('recipient_id', user.id).eq('is_read', false);
    if (error) throw error;
  },
};
