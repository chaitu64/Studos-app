import { ChatConversation, ChatMessage, ChatRoom, Idea, LeaderboardUser, TeamListing, UserProfile } from '../types';
import { requireSupabase } from './supabase';
import { chatService } from './chatService';
import { addDemoIdeaComment, getDemoIdeaById, getDemoIdeaComments, getDemoIdeas, getSavedDemoIdeaIds, toAppIdea } from './demoIdeasService';

type Entity = 'ideas' | 'teams';
const ownerColumn: Record<Entity, 'user_id' | 'owner_id'> = { ideas: 'user_id', teams: 'owner_id' };

export const sharedContentService = {
  async list<T extends Idea | TeamListing>(entity: Entity, options: { ownerId?: string; ids?: string[] } = {}): Promise<T[]> {
    if (entity === 'ideas') {
      const page = await getDemoIdeas({ limit: 30 });
      const ids = options.ids ? new Set(options.ids) : null;
      return page.items.filter((idea) => (!options.ownerId || idea.author.id === options.ownerId) && (!ids || ids.has(idea.id))).map(toAppIdea) as T[];
    }
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
    const teamMemberResult = entity === 'teams' && rows.length ? await db.from('team_members').select('team_id,user_id,role').in('team_id', rows.map((row) => row.id)) : { data: [], error: null };
    if (teamMemberResult.error) throw teamMemberResult.error;
    const memberIds = (teamMemberResult.data || []).map((row: any) => row.user_id);
    const { data: { user } } = await db.auth.getUser();
    const teamApplicationResult = entity === 'teams' && user && rows.length ? await db.from('team_applications').select('id,team_id,applicant_id,requested_role,message,status,created_at').in('team_id', rows.map((row) => row.id)) : { data: [], error: null };
    if (teamApplicationResult.error) throw teamApplicationResult.error;
    const applicantIds = (teamApplicationResult.data || []).map((row: any) => row.applicant_id);
    const profileIds = [...new Set([...ownerIds, ...memberIds, ...applicantIds])];
    const profiles = profileIds.length ? await db.from('profiles').select('id,first_name,last_name,college,branch,degree,study_year,avatar_url').in('id', profileIds) : { data: [], error: null };
    if (profiles.error) throw profiles.error;
    const byId = new Map((profiles.data || []).map((profile: any) => [profile.id, profile]));
    const engagement = new Map<string, any>();
    for (const application of teamApplicationResult.data || []) if ((application as any).applicant_id === user?.id) engagement.set((application as any).team_id, { myApplicationStatus: (application as any).status, myApplicationRole: (application as any).requested_role });
    return rows.map((row) => {
      const profile: any = byId.get(row[ownerColumn]) || {};
      const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Student';
      const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
      const mapped: any = { ...payload, ...engagement.get(row.id), id: row.id, title: payload.title || row.title, createdAt: row.created_at };
      if (entity === 'teams') {
        mapped.name = payload.name || row.title;
        mapped.tagline = payload.tagline || '';
        mapped.description = payload.description || '';
        mapped.projectDomain = payload.projectDomain || '';
        mapped.openRoles = Array.isArray(payload.openRoles) ? payload.openRoles : [];
        const lead = { id: row[ownerColumn], identity: { type: 'real' as const, id: row[ownerColumn] }, name, avatar: profile.avatar_url || '', role: profile.branch || '', isLead: true };
        mapped.members = [lead, ...(teamMemberResult.data || []).filter((member: any) => member.team_id === row.id && member.user_id !== row[ownerColumn]).map((member: any) => { const memberProfile: any = byId.get(member.user_id) || {}; return { id: member.user_id, identity: { type: 'real' as const, id: member.user_id }, name: [memberProfile.first_name, memberProfile.last_name].filter(Boolean).join(' ') || 'Student', avatar: memberProfile.avatar_url || '', role: member.role || memberProfile.branch || 'Member', isLead: false }; })];
        mapped.lead = lead;
        const visibleApplications = (teamApplicationResult.data || []).filter((application: any) => application.team_id === row.id);
        mapped.applicantCount = row[ownerColumn] === user?.id ? visibleApplications.length : undefined;
        mapped.applications = row[ownerColumn] === user?.id ? visibleApplications.map((application: any) => { const applicant: any = byId.get(application.applicant_id) || {}; return { id: application.id, applicantId: application.applicant_id, applicantName: [applicant.first_name, applicant.last_name].filter(Boolean).join(' ') || 'Student', applicantAvatar: applicant.avatar_url || '', applicantRole: applicant.branch || applicant.degree || 'Student', requestedRole: application.requested_role || undefined, message: application.message || '', status: application.status, createdAt: application.created_at }; }) : [];
      }
      return mapped;
    }) as T[];
  },
  async create<T extends Idea | TeamListing>(entity: Entity, payload: T): Promise<T> {
    if (entity === 'ideas') throw new Error('Idea publishing requires the verified student_ideas write schema.');
    const db = requireSupabase(); const { data: { user } } = await db.auth.getUser();
    if (!user) throw new Error('Sign in to publish shared content.');
    const { id: _localId, creator: _creator, lead: _lead, members: _members, contributors: _contributors, createdAt: _createdAt, upvotes: _upvotes, commentsCount: _commentsCount, applicantCount: _applicantCount, likes: _likes, views: _views, ...body } = payload as any;
    const { data, error } = await db.from(entity).insert({ [ownerColumn[entity]]: user.id, title: (payload as any).title || (payload as any).name, payload: body }).select('id,title,payload,created_at').single();
    if (error) throw error;
    const rows = await this.list<T>(entity);
    return rows.find((row: any) => row.id === data.id) || ({ ...data.payload, id: data.id, title: data.title, createdAt: data.created_at } as T);
  },
  async toggle(entity: string, idColumn: string, id: string): Promise<boolean> {
    const allowed: Record<string, string> = {};
    if (allowed[entity] !== idColumn) throw new Error('Unsupported saved item.');
    const db = requireSupabase(); const { data: { user } } = await db.auth.getUser();
    if (!user) throw new Error('Sign in to update saved content.');
    const existing = await db.from(entity).select(idColumn).eq('user_id', user.id).eq(idColumn, id).maybeSingle();
    if (existing.error) throw existing.error;
    const result = existing.data
      ? await db.from(entity).delete().eq('user_id', user.id).eq(idColumn, id)
      : await db.from(entity).insert({ user_id: user.id, [idColumn]: id });
    if (result.error) throw result.error;
    return !existing.data;
  },
  async savedOpportunityIds(): Promise<string[]> { const db = requireSupabase(); const { data: { user } } = await db.auth.getUser(); if (!user) return []; const { data, error } = await db.from('saved_opportunities').select('opportunity_id').eq('user_id', user.id); if (error) throw error; return (data || []).map((row: any) => row.opportunity_id); },
  async savedEntityIds(_entity: 'ideas'): Promise<string[]> {
    const db = requireSupabase(); const { data: { user } } = await db.auth.getUser();
    if (!user) throw new Error('Sign in to view saved content.');
    return getSavedDemoIdeaIds(user.id);
  },
  async toggleSavedOpportunity(id: string): Promise<boolean> { const db = requireSupabase(); const { data: { user } } = await db.auth.getUser(); if (!user) throw new Error('Sign in to save opportunities.'); const existing = await db.from('saved_opportunities').select('opportunity_id').eq('user_id', user.id).eq('opportunity_id', id).maybeSingle(); if (existing.error) throw existing.error; const result = existing.data ? await db.from('saved_opportunities').delete().eq('user_id', user.id).eq('opportunity_id', id) : await db.from('saved_opportunities').insert({ user_id: user.id, opportunity_id: id }); if (result.error) throw result.error; return !existing.data; },
  async ideaComments(ideaId: string) {
    const rows = await getDemoIdeaComments(ideaId);
    return rows.map((row) => ({ id: row.id, userId: row.authorId, userName: row.authorName, userAvatar: row.avatarUrl || '', userRole: row.branch || '', content: row.body, createdAt: row.createdAt, likes: 0 }));
  },
  async ideaEngagement(ideaId: string) {
    const idea = await getDemoIdeaById(ideaId);
    if (!idea) throw new Error('This student idea could not be found.');
    return { sparkCount: idea.sparkCount || 0, commentCount: idea.commentCount || 0, isSparkedByViewer: idea.isSparkedByViewer, isSavedByViewer: idea.isSavedByViewer, bookmarkAvailable: idea.bookmarkAvailable };
  },
  async addIdeaComment(ideaId: string, content: string) {
    const data = await addDemoIdeaComment(ideaId, content);
    return { id: data.id, userId: data.authorId, userName: data.authorName, userAvatar: data.avatarUrl || '', userRole: data.branch || '', content: data.body, createdAt: data.createdAt, likes: 0 };
  },
  async removeIdeaComment(commentId: string) {
    const db = requireSupabase(); const { data: { user } } = await db.auth.getUser();
    if (!user) throw new Error('Sign in to remove your comment.');
    const { error } = await db.from('student_idea_live_comments').delete().eq('id', commentId).eq('user_id', user.id);
    if (error) throw error;
  },
  async reportIdea(ideaId: string, reason: string) {
    const db = requireSupabase(); const { data: { user } } = await db.auth.getUser();
    if (!user) throw new Error('Sign in to report an idea.');
    const { error } = await db.from('reports').insert({ reporter_id: user.id, target_type: 'idea', target_id: ideaId, reason });
    if (error) throw error;
  },
  async applyToPost(postId: string, note: string, role?: string) {
    const db = requireSupabase(); const { data: { user } } = await db.auth.getUser();
    if (!user) throw new Error('Sign in to request collaboration.');
    const { error } = await db.from('post_collaborations').insert({ post_id: postId, requester_id: user.id, requested_role: role?.trim() || null, note: note.trim() });
    if (error?.code === '23505') throw new Error('You have already requested to collaborate on this post.');
    if (error) throw error;
    return { success: true, message: 'Your collaboration request has been sent to the post author.' };
  },
  async applyToTeam(teamId: string, role: string, message = '') {
    const db = requireSupabase(); const { data: { user } } = await db.auth.getUser();
    if (!user) throw new Error('Sign in to apply to this team.');
    const { error } = await db.from('team_applications').insert({ team_id: teamId, applicant_id: user.id, requested_role: role, message: message.trim() });
    if (error?.code === '23505') throw new Error('You have already applied to this team.');
    if (error) throw error;
    return { success: true, message: 'Your application has been sent to the team lead.' };
  },
  async respondToTeamApplication(teamId: string, applicantId: string, status: 'accepted' | 'declined', role = 'Member') {
    const db = requireSupabase();
    const { error } = await db.from('team_applications').update({ status }).eq('team_id', teamId).eq('applicant_id', applicantId);
    if (error) throw error;
    if (status === 'accepted') {
      const { error: memberError } = await db.from('team_members').insert({ team_id: teamId, user_id: applicantId, role });
      if (memberError && memberError.code !== '23505') throw memberError;
    }
  },
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
  async conversations(): Promise<ChatConversation[]> { return chatService.conversations(); },
  async chatRooms(): Promise<ChatRoom[]> {
    const db = requireSupabase(); const { data, error } = await db.from('chat_rooms').select('id,slug,title,description').order('title', { ascending: true });
    if (error) throw error;
    return (data || []).map((row: any) => ({ id: row.id, title: row.title, topic: row.slug, description: row.description || '', membersCount: 0, activeNow: 0, icon: 'chatbubbles-outline', isPrivate: false }));
  },
  async startDirectConversation(otherUserId: string): Promise<string> { return chatService.startDirectConversation(otherUserId); },
  async messages(conversationId: string): Promise<ChatMessage[]> { return chatService.messages(conversationId); },
  async sendMessage(conversationId: string, content: string) { return chatService.sendMessage(conversationId, content); },
  async joinChatRoom(roomId: string) { const db = requireSupabase(); const { data: { user } } = await db.auth.getUser(); if (!user) throw new Error('Sign in to join chat rooms.'); const { error } = await db.from('chat_room_members').insert({ room_id: roomId, user_id: user.id }); if (error?.code === '23505') return; if (error) throw error; },
  async roomMessages(roomId: string): Promise<ChatMessage[]> {
    const db = requireSupabase(); const { data: { user } } = await db.auth.getUser();
    if (!user) throw new Error('Sign in to view room messages.');
    const { data, error } = await db.from('chat_room_messages').select('id,room_id,user_id,content,created_at').eq('room_id', roomId).order('created_at', { ascending: true }).limit(500);
    if (error) throw error;
    const ids = [...new Set((data || []).map((row: any) => row.user_id))];
    const profiles = ids.length ? await db.from('profiles').select('id,first_name,last_name,avatar_url').in('id', ids) : { data: [], error: null };
    if (profiles.error) throw profiles.error;
    const byId = new Map((profiles.data || []).map((row: any) => [row.id, row]));
    return (data || []).map((row: any) => { const profile: any = byId.get(row.user_id) || {}; return { id: row.id, conversationId: roomId, senderId: row.user_id, senderName: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Student', senderAvatar: profile.avatar_url || '', text: row.content, timestamp: row.created_at, isCurrentUser: row.user_id === user.id }; });
  },
  async sendRoomMessage(roomId: string, content: string) {
    const db = requireSupabase(); const { data: { user } } = await db.auth.getUser();
    if (!user) throw new Error('Sign in to send a room message.');
    const { error } = await db.from('chat_room_messages').insert({ room_id: roomId, user_id: user.id, content: content.trim() });
    if (error) throw error;
  },
};

function ownerColumnFor(entity: Entity): 'user_id' | 'owner_id' { return entity === 'ideas' ? 'user_id' : 'owner_id'; }
