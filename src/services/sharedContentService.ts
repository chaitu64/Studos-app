import { ChatConversation, ChatMessage, ChatRoom, Idea, LeaderboardUser, NotificationItem, Project, TeamListing, UserProfile } from '../types';
import { requireSupabase } from './supabase';

type Entity = 'ideas' | 'teams' | 'projects';
const ownerColumn: Record<Entity, 'user_id' | 'owner_id'> = { ideas: 'user_id', teams: 'owner_id', projects: 'owner_id' };

export const sharedContentService = {
  async list<T extends Idea | Project | TeamListing>(entity: Entity, options: { ownerId?: string; ids?: string[] } = {}): Promise<T[]> {
    const db = requireSupabase();
    const ownerColumn = ownerColumnFor(entity);
    const rows: any[] = [];
    if (options.ids && options.ids.length === 0) return [];
    for (let offset = 0; ; offset += 500) {
      let query = db.from(entity).select(`id,${ownerColumn},title,payload,created_at`).order('created_at', { ascending: false });
      if (options.ownerId) query = query.eq(ownerColumn, options.ownerId);
      if (options.ids) query = query.in('id', options.ids);
      const { data, error } = await query.range(offset, offset + 499);
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < 500) break;
    }
    const ownerIds = [...new Set(rows.map((row) => row[ownerColumn]).filter(Boolean))];
    const profiles = ownerIds.length ? await db.from('profiles').select('id,first_name,last_name,college,branch,degree,avatar_url').in('id', ownerIds) : { data: [], error: null };
    if (profiles.error) throw profiles.error;
    const byId = new Map((profiles.data || []).map((profile: any) => [profile.id, profile]));
    return rows.map((row) => {
      const profile: any = byId.get(row[ownerColumn]) || {};
      const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Student';
      const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
      const mapped: any = { ...payload, id: row.id, title: payload.title || row.title, createdAt: row.created_at };
      if (entity === 'ideas') {
        mapped.tagline = payload.tagline || payload.description || '';
        mapped.requiredSkills = Array.isArray(payload.requiredSkills) ? payload.requiredSkills : [];
        mapped.rolesNeeded = Array.isArray(payload.rolesNeeded) ? payload.rolesNeeded : [];
        mapped.tags = Array.isArray(payload.tags) ? payload.tags : [];
        mapped.roadmap = Array.isArray(payload.roadmap) ? payload.roadmap : [];
        mapped.creator = { id: row[ownerColumn], identity: { type: 'real', id: row[ownerColumn] }, name, avatar: profile.avatar_url || '', college: profile.college || '', role: profile.branch || '' };
      }
      if (entity === 'projects') {
        mapped.description = payload.description || '';
        mapped.tagline = payload.tagline || '';
        mapped.technologies = Array.isArray(payload.technologies) ? payload.technologies : [];
        mapped.contributors = [{ id: row[ownerColumn], identity: { type: 'real', id: row[ownerColumn] }, name, avatar: profile.avatar_url || '', role: profile.branch || '' }];
      }
      if (entity === 'teams') {
        mapped.name = payload.name || row.title;
        mapped.tagline = payload.tagline || '';
        mapped.description = payload.description || '';
        mapped.projectDomain = payload.projectDomain || '';
        mapped.openRoles = Array.isArray(payload.openRoles) ? payload.openRoles : [];
        mapped.members = [];
        mapped.lead = { id: row[ownerColumn], identity: { type: 'real', id: row[ownerColumn] }, name, avatar: profile.avatar_url || '', role: profile.branch || '', isLead: true };
      }
      return mapped;
    }) as T[];
  },
  async create<T extends Idea | Project | TeamListing>(entity: Entity, payload: T): Promise<T> {
    const db = requireSupabase(); const { data: { user } } = await db.auth.getUser();
    if (!user) throw new Error('Sign in to publish shared content.');
    const { id: _localId, creator: _creator, lead: _lead, members: _members, contributors: _contributors, createdAt: _createdAt, upvotes: _upvotes, commentsCount: _commentsCount, applicantCount: _applicantCount, likes: _likes, views: _views, ...body } = payload as any;
    const { data, error } = await db.from(entity).insert({ [ownerColumn[entity]]: user.id, title: (payload as any).title || (payload as any).name, payload: body }).select('id,title,payload,created_at').single();
    if (error) throw error;
    const rows = await this.list<T>(entity);
    return rows.find((row: any) => row.id === data.id) || ({ ...data.payload, id: data.id, title: data.title, createdAt: data.created_at } as T);
  },
  async toggle(_entity: string, _idColumn: string, _id: string): Promise<boolean> { throw new Error('Engagement features are not available in the current database schema.'); },
  async savedOpportunityIds(): Promise<string[]> { const db = requireSupabase(); const { data: { user } } = await db.auth.getUser(); if (!user) return []; const { data, error } = await db.from('saved_opportunities').select('opportunity_id').eq('user_id', user.id); if (error) throw error; return (data || []).map((row: any) => row.opportunity_id); },
  async toggleSavedOpportunity(id: string): Promise<boolean> { const db = requireSupabase(); const { data: { user } } = await db.auth.getUser(); if (!user) throw new Error('Sign in to save opportunities.'); const existing = await db.from('saved_opportunities').select('opportunity_id').eq('user_id', user.id).eq('opportunity_id', id).maybeSingle(); if (existing.error) throw existing.error; const result = existing.data ? await db.from('saved_opportunities').delete().eq('user_id', user.id).eq('opportunity_id', id) : await db.from('saved_opportunities').insert({ user_id: user.id, opportunity_id: id }); if (result.error) throw result.error; return !existing.data; },
  async ideaComments(_ideaId: string) { throw new Error('Idea comments are not available in the current database schema.'); },
  async addIdeaComment(_ideaId: string, _content: string) { throw new Error('Idea comments are not available in the current database schema.'); },
  async applyToPost(_postId: string, _note: string, _role?: string) { throw new Error('Post collaboration requests are not available in the current database schema.'); },
  async applyToTeam(_teamId: string, _role: string, _message = '') { throw new Error('Team applications are not available in the current database schema.'); },
  async students(): Promise<UserProfile[]> {
    const rows: any[] = []; const db = requireSupabase();
    for (let offset = 0; ; offset += 500) { const { data, error } = await db.from('profiles').select('id,first_name,middle_name,last_name,college,branch,degree,study_year,graduation_year,bio,skills,interests,avatar_url').order('created_at', { ascending: false }).range(offset, offset + 499); if (error) throw error; rows.push(...(data || [])); if (!data || data.length < 500) break; }
    return rows.map((row: any) => ({ id: row.id, name: [row.first_name,row.middle_name,row.last_name].filter(Boolean).join(' ') || 'Student', avatar: row.avatar_url || '', college: row.college || '', branch: row.branch || '', degree: row.degree || '', studyYear: row.study_year ? String(row.study_year) : '', gradYear: row.graduation_year ? String(row.graduation_year) : '', shortBio: row.bio || '', skills: row.skills || [], interests: row.interests || [] })) as UserProfile[];
  },
  async leaderboard(): Promise<LeaderboardUser[]> {
    const db = requireSupabase(); const { data, error } = await db.from('leaderboard').select('user_id,points,rank').order('points', { ascending: false }).limit(100); if (error) throw error;
    const ids = (data || []).map((row: any) => row.user_id); if (!ids.length) return [];
    const profiles = await db.from('profiles').select('id,first_name,last_name,college,branch,avatar_url').in('id', ids); if (profiles.error) throw profiles.error;
    const byId = new Map((profiles.data || []).map((row: any) => [row.id, row]));
    return (data || []).map((row: any, index) => { const profile: any = byId.get(row.user_id) || {}; return { id: row.user_id, rank: row.rank ?? index + 1, name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Student', avatar: profile.avatar_url || '', college: profile.college || '', role: profile.branch || '', points: Number(row.points) }; });
  },
  async conversations(): Promise<ChatConversation[]> { return []; },
  async chatRooms(): Promise<ChatRoom[]> { return []; },
  async startDirectConversation(_otherUserId: string): Promise<string> { throw new Error('Direct messaging is not available in the current database schema.'); },
  async messages(_conversationId: string): Promise<ChatMessage[]> { return []; },
  async sendMessage(_conversationId: string, _content: string) { throw new Error('Direct messaging is not available in the current database schema.'); },
  async notifications(): Promise<NotificationItem[]> { return []; },
  async markNotificationRead(_id: string) { throw new Error('Notifications are not available in the current database schema.'); },
  async markAllNotificationsRead() { throw new Error('Notifications are not available in the current database schema.'); },
  async joinChatRoom(roomId: string) { const db = requireSupabase(); const { data: { user } } = await db.auth.getUser(); if (!user) throw new Error('Sign in to join chat rooms.'); const { error } = await db.from('chat_room_members').insert({ room_id: roomId, user_id: user.id }); if (error?.code === '23505') return; if (error) throw error; },
  async roomMessages(_roomId: string): Promise<ChatMessage[]> { return []; },
  async sendRoomMessage(_roomId: string, _content: string) { throw new Error('Room messaging is not available in the current database schema.'); },
};

function ownerColumnFor(entity: Entity): 'user_id' | 'owner_id' { return entity === 'ideas' ? 'user_id' : 'owner_id'; }
