import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { router, usePathname } from 'expo-router';
import {
  UserProfile,
  Idea,
  TeamListing,
  Opportunity,
  ChatConversation,
  NotificationItem,
  LeaderboardUser,
  CommunityPost,
  CommunityPostComment,
} from '../types';
import { dataService } from '../services/dataService';
import { supabaseConfigured } from '../services/supabase';
import { postService } from '../services/postService';
import { uploadPostImages } from '../services/postMediaService';
import { sharedContentService } from '../services/sharedContentService';
import { authIdentityProfile, getStudentProfile, updateStudentProfile } from '../services/profileService';
import { studentServicesService } from '../services/studentServicesService';
import { notificationService } from '../services/notificationService';
import { addDemoIdeaComment, createStudentIdea, getDemoIdeas, toggleDemoIdeaSave, toggleDemoIdeaSpark, toAppIdea } from '../services/demoIdeasService';
import type { StudentService } from '../services/homeDiscoveryData';
import { useAuth } from './AuthContext';

interface AppContextType {
  user: UserProfile;
  students: UserProfile[];
  studentServices: StudentService[];
  ideas: Idea[];
  teams: TeamListing[];
  opportunities: Opportunity[];
  conversations: ChatConversation[];
  notifications: NotificationItem[];
  notificationsLoading: boolean;
  notificationsError: string;
  refreshNotifications: () => Promise<void>;
  leaderboard: LeaderboardUser[];
  savedOpportunityIds: string[];
  unreadNotifsCount: number;
  isLoading: boolean;
  dataErrors: Record<string, string>;
  communityPosts: CommunityPost[];
  refreshCommunityPosts: () => Promise<void>;
  addCommunityPost: (newPost: Omit<CommunityPost, 'id' | 'createdAt' | 'createdAtTimestamp' | 'likesCount' | 'commentsCount' | 'author'>) => Promise<CommunityPost>;
  toggleLikePost: (id: string) => Promise<void>;
  toggleSavePost: (id: string) => Promise<void>;
  addPostComment: (postId: string, text: string) => Promise<CommunityPostComment>;
  editCommunityPost: (id: string, patch: Partial<CommunityPost>) => Promise<void>;
  deleteCommunityPost: (id: string) => Promise<void>;
  applyToCollaborate: (postId: string, note: string, role?: string) => Promise<{ success: boolean; message: string }>;
  refreshAll: () => Promise<void>;
  updateProfile: (updated: Partial<UserProfile>) => Promise<UserProfile>;
  toggleUpvoteIdea: (id: string) => Promise<void>;
  toggleBookmarkIdea: (id: string) => Promise<void>;
  addIdeaComment: (id: string, content: string) => Promise<import('../types').IdeaComment>;
  submitIdea: (newIdea: Omit<Idea, 'id' | 'createdAt' | 'upvotes' | 'commentsCount' | 'creator'>) => Promise<Idea>;
  createTeam: (newTeam: Omit<TeamListing, 'id' | 'createdAt' | 'applicantCount' | 'lead' | 'members'>) => Promise<TeamListing>;
  applyToTeam: (teamId: string, roleName: string, message?: string) => Promise<{ success: boolean; message: string }>;
  respondToTeamApplication: (teamId: string, applicantId: string, status: 'accepted' | 'declined') => Promise<void>;
  toggleSaveOpportunity: (id: string) => Promise<void>;
  sendMessage: (convId: string, text: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const pathname = usePathname();
  const loadVersion = useRef(0);
  const dataOwnerId = useRef<string | null>(null);
  const [readyOwnerId, setReadyOwnerId] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile>(() => session ? authIdentityProfile(session.user) : { id: '', name: 'Not signed in', avatar: '', college: '', degree: '', gradYear: '', shortBio: '', skills: [], interests: [] });
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [studentServices, setStudentServices] = useState<StudentService[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [teams, setTeams] = useState<TeamListing[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const notificationsRequest = useRef(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataErrors, setDataErrors] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    const version = ++loadVersion.current;
    setIsLoading(true); setDataErrors({});
    if (!session || !supabaseConfigured) {
      dataOwnerId.current = null;
      setReadyOwnerId(null);
      notificationsRequest.current += 1;
      setStudents([]); setStudentServices([]); setIdeas([]); setTeams([]); setLeaderboard([]); setCommunityPosts([]); setConversations([]); setOpportunities([]);
      setNotifications([]); setNotificationsError(''); setNotificationsLoading(false);
      setUser({ id: '', name: 'Not signed in', avatar: '', college: '', degree: '', gradYear: '', shortBio: '', skills: [], interests: [] });
      setIsLoading(false); return;
    }
    if (dataOwnerId.current !== session.user.id) {
      dataOwnerId.current = null;
      setReadyOwnerId(null);
      notificationsRequest.current += 1;
      setStudents([]); setStudentServices([]); setIdeas([]); setTeams([]); setLeaderboard([]); setCommunityPosts([]); setConversations([]); setOpportunities([]);
      setNotifications([]); setNotificationsError(''); setNotificationsLoading(false);
      setUser(authIdentityProfile(session.user));
    }
    const p = pathname.replace(/\/+$/, '') || '/';
    const at = (prefix: string) => p === prefix || p.startsWith(`${prefix}/`);
    const needs = new Set<string>();
    if (at('/(tabs)/index') || p === '/' || p === '/(tabs)') needs.add('posts');
    if (at('/(tabs)/profile')) ['services', 'ideas', 'conversations'].forEach((key) => needs.add(key));
    if (at('/(tabs)/explore')) needs.add('opportunities');
    if (at('/search')) ['students', 'ideas', 'teams', 'posts', 'opportunities'].forEach((key) => needs.add(key));
    if (at('/students')) needs.add('students');
    if (at('/ideahub')) needs.add('ideas');
    if (at('/teams')) needs.add('teams');
    if (at('/leaderboard')) needs.add('leaderboard');
    if (at('/opportunities')) needs.add('opportunities');
    if (at('/chat') || at('/messages') || at('/(tabs)/chat')) needs.add('conversations');

    const requests: { key: string; table: string; run: () => Promise<unknown> }[] = [
      { key: 'profile', table: 'profiles', run: () => getStudentProfile(session.user.id, authIdentityProfile(session.user), session.user) },
      ...(needs.has('students') ? [{ key: 'students', table: 'profiles', run: () => sharedContentService.students() }] : []),
      ...(needs.has('services') ? [{ key: 'services', table: 'services', run: () => studentServicesService.list() }] : []),
      ...(needs.has('ideas') ? [{ key: 'ideas', table: 'ideas', run: () => getDemoIdeas({ limit: 30 }).then((result) => result.items.map(toAppIdea)) }] : []),
      ...(needs.has('teams') ? [{ key: 'teams', table: 'teams,team_members,team_applications', run: () => sharedContentService.list<TeamListing>('teams') }] : []),
      ...(needs.has('leaderboard') ? [{ key: 'leaderboard', table: 'leaderboard,profiles', run: () => sharedContentService.leaderboard() }] : []),
      ...(needs.has('posts') ? [{ key: 'posts', table: 'posts,post_likes,post_comments,saved_posts', run: () => postService.feed(1, 20).then((result) => result.posts) }] : []),
      ...(needs.has('conversations') ? [{ key: 'conversations', table: 'conversation_members,conversations,messages', run: () => dataService.getConversations() }] : []),
      ...(needs.has('opportunities') ? [{ key: 'opportunities', table: 'external opportunities', run: () => dataService.getOpportunities() }] : []),
    ];
    const results = await Promise.allSettled(requests.map((request) => request.run()));
    if (version !== loadVersion.current) return;
    const errors: Record<string, string> = {};
    const loaded = new Map<string, unknown>();
    results.forEach((result, index) => {
      const request = requests[index];
      if (result.status === 'rejected') {
        const cause = result.reason as { code?: string; message?: string; details?: string | null; hint?: string | null };
        const code = cause?.code || 'unknown';
        errors[request.key] = request.key === 'profile' && code === 'PGRST202'
          ? 'Student profile setup is unavailable. Ask the project administrator to apply migration 018 and reload the Supabase API schema cache.'
          : `${request.key} data is unavailable (Supabase ${code}).`;
        if (__DEV__) console.warn('[Supabase query failed]', { feature: request.key, relation: request.table, code, message: cause?.message, details: cause?.details, hint: cause?.hint });
        return;
      }
      loaded.set(request.key, result.value);
      switch (request.key) {
        case 'profile': {
          const profile = result.value as UserProfile;
          setUser(profile);
          if (!profile.onboardingCompleted && pathname !== '/onboarding') router.replace('/onboarding' as never);
          break;
        }
        case 'students': setStudents(result.value as UserProfile[]); break;
        case 'services': setStudentServices(result.value as StudentService[]); break;
        case 'ideas': setIdeas(result.value as Idea[]); break;
        case 'teams': setTeams(result.value as TeamListing[]); break;
        case 'leaderboard': setLeaderboard(result.value as LeaderboardUser[]); break;
        case 'posts': setCommunityPosts(result.value as CommunityPost[]); break;
        case 'conversations': setConversations(result.value as ChatConversation[]); break;
        case 'opportunities': setOpportunities(result.value as Opportunity[]); break;
      }
    });
    setDataErrors(errors);
    const ownLeaderboard = (loaded.get('leaderboard') as LeaderboardUser[] | undefined)?.find((item) => item.id === session.user.id);
    if (requests.some((request) => request.key === 'profile')) {
      const profileResult = results[0];
      const currentProfile = profileResult.status === 'fulfilled' ? profileResult.value as UserProfile : authIdentityProfile(session.user);
      const ownIdeas = (loaded.get('ideas') as Idea[] | undefined)?.filter((item) => item.creator.id === session.user.id).length ?? currentProfile.ideasCount;
      setUser({ ...currentProfile, ideasCount: ownIdeas, points: ownLeaderboard?.points ?? currentProfile.points, leaderboardRank: ownLeaderboard?.rank ?? currentProfile.leaderboardRank });
    }
    dataOwnerId.current = session.user.id;
    setReadyOwnerId(session.user.id);
    setIsLoading(false);
  }, [session, pathname]);

  useEffect(() => { const timer = setTimeout(() => { void loadData(); }, 0); return () => clearTimeout(timer); }, [loadData]);
  const refreshNotifications = useCallback(async () => {
    const requestId = ++notificationsRequest.current;
    setNotificationsLoading(true); setNotificationsError('');
    try {
      const items = await notificationService.list();
      if (requestId === notificationsRequest.current) setNotifications(items);
    } catch (error) {
      const cause = error as { code?: string; message?: string; details?: string | null; hint?: string | null };
      const message = cause?.message || 'Notifications could not be loaded.';
      if (__DEV__) console.warn('[Supabase query failed]', { feature: 'notification list', relation: 'notifications', code: cause?.code || 'unknown', message: cause?.message, details: cause?.details, hint: cause?.hint });
      if (requestId === notificationsRequest.current) { setNotifications([]); setNotificationsError(message); }
    } finally { if (requestId === notificationsRequest.current) setNotificationsLoading(false); }
  }, []);
  useEffect(() => {
    notificationsRequest.current += 1;
    const timer = setTimeout(() => {
      if (!session?.user.id) { setNotifications([]); setNotificationsError(''); setNotificationsLoading(false); return; }
      void refreshNotifications();
    }, 0);
    return () => clearTimeout(timer);
  }, [session?.user.id, refreshNotifications]);

  const updateProfile = async (updated: Partial<UserProfile>) => {
    if (!session || !supabaseConfigured) throw new Error('Sign in to edit your profile.');
    const refreshed = await updateStudentProfile(session.user.id, updated, user);
    setUser(refreshed);
    return refreshed;
  };

  const toggleUpvoteIdea = async (id: string) => {
    if (!session || !supabaseConfigured) throw new Error('Sign in to vote on an idea.');
    const active = await toggleDemoIdeaSpark(id, session.user.id);
    setIdeas((rows) => rows.map((idea) => idea.id === id ? { ...idea, isUpvoted: active, upvotes: Math.max(0, (idea.upvotes || 0) + (active ? 1 : -1)) } : idea));
  };

  const toggleBookmarkIdea = async (id: string) => {
    if (!session || !supabaseConfigured) throw new Error('Sign in to save ideas.');
    const active = await toggleDemoIdeaSave(id, session.user.id);
    setIdeas((rows) => rows.map((idea) => idea.id === id ? { ...idea, isBookmarked: active } : idea));
  };
  const addIdeaComment = async (id: string, content: string) => {
    if (!session || !supabaseConfigured) throw new Error('Sign in to comment on ideas.');
    const saved = await addDemoIdeaComment(id, content);
    const comment = { id: saved.id, userId: saved.authorId, userName: saved.authorName, userAvatar: saved.avatarUrl || '', userRole: saved.branch || '', content: saved.body, createdAt: saved.createdAt, likes: 0 };
    setIdeas((rows) => rows.map((idea) => idea.id === id ? { ...idea, commentsCount: (idea.commentsCount || 0) + 1 } : idea));
    return comment;
  };

  const submitIdea = async (newIdea: Omit<Idea, 'id' | 'createdAt' | 'upvotes' | 'commentsCount' | 'creator'>) => {
    if (!session || !supabaseConfigured) throw new Error('Sign in to submit an idea.');
    const created = await createStudentIdea({
      title: newIdea.title, description: newIdea.tagline || newIdea.problemStatement,
      category: newIdea.category, ideaType: newIdea.ideaType, stage: newIdea.stage,
      tags: newIdea.tags, skillsNeeded: newIdea.requiredSkills, collaborationOpen: newIdea.collaborationOpen,
      problemStatement: newIdea.problemStatement, proposedSolution: newIdea.proposedSolution,
      targetAudience: newIdea.targetAudience, rolesNeeded: newIdea.rolesNeeded,
      githubUrl: newIdea.resources?.find((item) => /github\.com/i.test(item.url))?.url,
      youtubeUrl: newIdea.resources?.find((item) => /youtube\.com|youtu\.be/i.test(item.url))?.url,
      links: newIdea.resources?.map((item) => item.url) || [],
    });
    const mapped = toAppIdea(created);
    setIdeas((rows) => [mapped, ...rows.filter((idea) => idea.id !== mapped.id)]);
    return mapped;
  };

  const createTeam = async (newTeam: Omit<TeamListing, 'id' | 'createdAt' | 'applicantCount' | 'lead' | 'members'>) => {
    if (!session || !supabaseConfigured) throw new Error('Sign in to create a team.');
    const created = await sharedContentService.create<TeamListing>('teams', { ...newTeam, id: '', lead: { id: session.user.id, name: user.name, avatar: user.avatar, role: user.branch || 'Student', isLead: true }, members: [], applicantCount: 0, createdAt: new Date().toISOString() });
    setTeams((rows) => [created, ...rows]); return created;
  };

  const applyToTeam = async (teamId: string, roleName: string, message = '') => {
    if (!session || !supabaseConfigured) throw new Error('Sign in to apply to a team.');
    return sharedContentService.applyToTeam(teamId, roleName, message);
  };

  const respondToTeamApplication = async (teamId: string, applicantId: string, status: 'accepted' | 'declined') => {
    if (!session || !supabaseConfigured) throw new Error('Sign in to manage team applications.');
    const team = teams.find((item) => item.id === teamId);
    const application = team?.applications?.find((item) => item.applicantId === applicantId);
    if (!team || team.lead.id !== session.user.id || !application) throw new Error('You cannot manage this team application.');
    await sharedContentService.respondToTeamApplication(teamId, applicantId, status, application.requestedRole || 'Member');
    setTeams((rows) => rows.map((item) => {
      if (item.id !== teamId) return item;
      const applications = (item.applications || []).map((entry) => entry.applicantId === applicantId ? { ...entry, status } : entry);
      const members = status === 'accepted' && !item.members.some((member) => member.id === applicantId)
        ? [...item.members, { id: applicantId, name: application.applicantName, avatar: application.applicantAvatar, role: application.requestedRole || 'Member' }]
        : item.members;
      return { ...item, applications, members };
    }));
  };

  const toggleSaveOpportunity = async (id: string) => {
    if (session && supabaseConfigured) { const saved = await sharedContentService.toggleSavedOpportunity(id); setOpportunities((prev) => prev.map((item) => item.id === id ? { ...item, isSaved: saved } : item)); return; }
    const updated = await dataService.toggleSaveOpportunity(id);
    if (updated) {
      setOpportunities((prev) => prev.map((o) => (o.id === id ? updated : o)));
    }
  };

  const sendMessage = async (convId: string, text: string) => {
    await dataService.sendMessage(convId, text);
    const updatedConvs = await dataService.getConversations();
    setConversations(updatedConvs);
  };

  const markNotificationRead = async (id: string) => {
    await notificationService.markRead(id);
    setNotifications((rows) => rows.map((item) => item.id === id ? { ...item, read: true } : item));
  };

  const markAllNotificationsRead = async () => {
    await notificationService.markAllRead();
    setNotifications((rows) => rows.map((item) => ({ ...item, read: true })));
  };

  const refreshCommunityPosts = async () => {
    if (!session || !supabaseConfigured) throw new Error('Sign in to load community posts.');
    try {
      setCommunityPosts((await postService.feed(1, 20)).posts);
      setDataErrors((current) => { const next = { ...current }; delete next.posts; return next; });
    } catch (error) {
      const cause = error as { code?: string; message?: string };
      setDataErrors((current) => ({ ...current, posts: cause.message || `Community posts are unavailable (${cause.code || 'query error'}).` }));
      throw error;
    }
  };

  const addCommunityPost = async (newPost: Omit<CommunityPost, 'id' | 'createdAt' | 'createdAtTimestamp' | 'likesCount' | 'commentsCount' | 'author'>) => {
    if (!session || !supabaseConfigured) throw new Error('Sign in to create a post.');
    const image_urls = await uploadPostImages((newPost.images || []).map((uri) => ({ uri, fileName: uri.split(/[?#]/)[0].split('/').pop() } as any)));
    const created = await postService.create({ title: newPost.title || newPost.content.trim().slice(0, 80) || 'Post', content: newPost.content, type: newPost.type, category: newPost.category, tags: newPost.tags, image_urls, links: newPost.links, attachments: newPost.attachments, metadata: { githubUrl: newPost.githubUrl, demoUrl: newPost.demoUrl, technologies: newPost.technologies, rolesNeeded: newPost.rolesNeeded, problemStatement: newPost.problemStatement, proposedSolution: newPost.proposedSolution, targetAudience: newPost.targetAudience, stage: newPost.stage, servicePricing: newPost.servicePricing, serviceAvailability: newPost.serviceAvailability, eventName: newPost.eventName, eventRoleNeeded: newPost.eventRoleNeeded, eventDate: newPost.eventDate, ...newPost.metadata } });
    setCommunityPosts((rows) => [created, ...rows]); return created;
  };

  const editCommunityPost = async (id: string, patch: Partial<CommunityPost>) => {
    if (!session || !supabaseConfigured) throw new Error('Sign in to edit a community post.');
    const updated = await postService.update(id, { title: patch.title, content: patch.content, type: patch.type, category: patch.category, tags: patch.tags, links: patch.links, attachments: patch.attachments, metadata: patch.metadata });
    setCommunityPosts((previous) => previous.map((post) => post.id === id ? updated : post));
  };
  const deleteCommunityPost = async (id: string) => {
    if (!session || !supabaseConfigured) throw new Error('Sign in to delete a community post.');
    await postService.remove(id);
    setCommunityPosts((previous) => previous.filter((post) => post.id !== id));
  };

  const toggleLikePost = async (id: string) => {
    if (!session || !supabaseConfigured) throw new Error('Sign in to like posts.');
    const isLiked = await postService.toggleLike(id);
    setCommunityPosts((rows) => rows.map((post) => post.id === id ? { ...post, isLiked, likesCount: Math.max(0, (post.likesCount || 0) + (isLiked ? 1 : -1)) } : post));
  };
  const toggleSavePost = async (id: string) => {
    if (!session || !supabaseConfigured) throw new Error('Sign in to save posts.');
    const isSaved = await postService.toggleSave(id); setCommunityPosts((rows) => rows.map((post) => post.id === id ? { ...post, isSaved } : post));
  };
  const addPostComment = async (postId: string, text: string) => {
    if (!session || !supabaseConfigured) throw new Error('Sign in to comment on posts.');
    return postService.addComment(postId, text);
  };

  const applyToCollaborate = async (postId: string, note: string, role?: string) => {
    if (session && supabaseConfigured && !postId.startsWith('post_')) return sharedContentService.applyToPost(postId, note, role);
    throw new Error('Collaboration requests are unavailable in the current database schema.');
  };

  const hasCurrentSessionData = Boolean(session && supabaseConfigured && readyOwnerId === session.user.id);
  const unreadNotifsCount = hasCurrentSessionData ? notifications.filter((n) => !n.read).length : 0;
  const savedOpportunityIds = hasCurrentSessionData ? opportunities.filter((o) => o.isSaved).map((o) => o.id) : [];
  const visibleUser = hasCurrentSessionData && user.id === session?.user.id
    ? user
    : session && supabaseConfigured
      ? authIdentityProfile(session.user)
      : { id: '', name: 'Not signed in', avatar: '', college: '', degree: '', gradYear: '', shortBio: '', skills: [], interests: [] };

  return (
    <AppContext.Provider
      value={{
        user: visibleUser,
        students: hasCurrentSessionData ? students : [],
        studentServices: hasCurrentSessionData ? studentServices : [],
        ideas: hasCurrentSessionData ? ideas : [],
        teams: hasCurrentSessionData ? teams : [],
        opportunities: hasCurrentSessionData ? opportunities : [],
        conversations: hasCurrentSessionData ? conversations : [],
        notifications: hasCurrentSessionData ? notifications : [],
        notificationsLoading: hasCurrentSessionData && notificationsLoading,
        notificationsError: hasCurrentSessionData ? notificationsError : '',
        refreshNotifications,
        leaderboard: hasCurrentSessionData ? leaderboard : [],
        savedOpportunityIds,
        unreadNotifsCount,
        isLoading: isLoading || Boolean(session && supabaseConfigured && !hasCurrentSessionData),
        dataErrors: hasCurrentSessionData ? dataErrors : {},
        communityPosts: hasCurrentSessionData ? communityPosts : [],
        refreshCommunityPosts,
        addCommunityPost,
        toggleLikePost,
        toggleSavePost,
        addPostComment,
        editCommunityPost,
        deleteCommunityPost,
        applyToCollaborate,
        refreshAll: loadData,
        updateProfile,
        toggleUpvoteIdea,
        toggleBookmarkIdea,
        addIdeaComment,
        submitIdea,
        createTeam,
        applyToTeam,
        respondToTeamApplication,
        toggleSaveOpportunity,
        sendMessage,
        markNotificationRead,
        markAllNotificationsRead,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
