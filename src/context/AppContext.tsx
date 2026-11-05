import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  UserProfile,
  Idea,
  TeamListing,
  Opportunity,
  Project,
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
import type { StudentService } from '../services/homeDiscoveryData';
import { useAuth } from './AuthContext';

interface AppContextType {
  user: UserProfile;
  students: UserProfile[];
  studentServices: StudentService[];
  ideas: Idea[];
  teams: TeamListing[];
  opportunities: Opportunity[];
  projects: Project[];
  conversations: ChatConversation[];
  notifications: NotificationItem[];
  leaderboard: LeaderboardUser[];
  savedOpportunityIds: string[];
  unreadNotifsCount: number;
  isLoading: boolean;
  dataError: string | null;
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
  updateProfile: (updated: Partial<UserProfile>) => Promise<void>;
  toggleUpvoteIdea: (id: string) => Promise<void>;
  toggleBookmarkIdea: (id: string) => Promise<void>;
  submitIdea: (newIdea: Omit<Idea, 'id' | 'createdAt' | 'upvotes' | 'commentsCount' | 'creator'>) => Promise<Idea>;
  createTeam: (newTeam: Omit<TeamListing, 'id' | 'createdAt' | 'applicantCount' | 'lead' | 'members'>) => Promise<TeamListing>;
  applyToTeam: (teamId: string, roleName: string) => Promise<{ success: boolean; message: string }>;
  toggleSaveOpportunity: (id: string) => Promise<void>;
  submitProject: (newProject: Omit<Project, 'id' | 'likes' | 'views' | 'contributors'>) => Promise<Project>;
  toggleLikeProject: (id: string) => Promise<void>;
  sendMessage: (convId: string, text: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const [user, setUser] = useState<UserProfile>(() => session ? authIdentityProfile(session.user) : { id: '', name: 'Not signed in', avatar: '', college: '', degree: '', gradYear: '', shortBio: '', skills: [], interests: [] });
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [studentServices, setStudentServices] = useState<StudentService[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [teams, setTeams] = useState<TeamListing[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true); setDataError(null);
    if (!session || !supabaseConfigured) {
      setStudents([]); setStudentServices([]); setIdeas([]); setTeams([]); setProjects([]); setLeaderboard([]); setCommunityPosts([]); setConversations([]); setNotifications([]); setOpportunities([]);
      setUser({ id: '', name: 'Not signed in', avatar: '', college: '', degree: '', gradYear: '', shortBio: '', skills: [], interests: [] });
      setDataError(supabaseConfigured ? 'Sign in to load STUDOS data.' : 'Configure Supabase to load STUDOS data.'); setIsLoading(false); return;
    }
    const results = await Promise.allSettled([
      getStudentProfile(session.user.id, authIdentityProfile(session.user), session.user), sharedContentService.students(), studentServicesService.list(), sharedContentService.list<Idea>('ideas'), sharedContentService.list<TeamListing>('teams'), sharedContentService.list<Project>('projects'), sharedContentService.leaderboard(), postService.feed(1, 100).then((result) => result.posts),
    ]);
    const [profile, studentRows, services, ideaRows, teamRows, projectRows, leaderboardRows, postRows] = results;
    const currentProfile = profile.status === 'fulfilled' ? profile.value : authIdentityProfile(session.user);
    setStudents(studentRows.status === 'fulfilled' ? studentRows.value : []);
    setStudentServices(services.status === 'fulfilled' ? services.value : []);
    setIdeas(ideaRows.status === 'fulfilled' ? ideaRows.value : []);
    setTeams(teamRows.status === 'fulfilled' ? teamRows.value : []);
    setProjects(projectRows.status === 'fulfilled' ? projectRows.value : []);
    setLeaderboard(leaderboardRows.status === 'fulfilled' ? leaderboardRows.value : []);
    setCommunityPosts(postRows.status === 'fulfilled' ? postRows.value : []);
    const ownIdeas = ideaRows.status === 'fulfilled' ? ideaRows.value.filter((item) => item.creator.id === session.user.id).length : 0;
    const ownProjects = projectRows.status === 'fulfilled' ? projectRows.value.filter((item) => item.contributors.some((owner) => owner.id === session.user.id)).length : 0;
    const ownLeaderboard = leaderboardRows.status === 'fulfilled' ? leaderboardRows.value.find((item) => item.id === session.user.id) : undefined;
    setUser({ ...currentProfile, ideasCount: ownIdeas, projectsCount: ownProjects, points: ownLeaderboard?.points, leaderboardRank: ownLeaderboard?.rank });
    setConversations([]); setNotifications([]);
    try { setOpportunities(await dataService.getOpportunities()); } catch { setOpportunities([]); }
    if (results.some((result) => result.status === 'rejected')) setDataError('Some Supabase data could not be loaded. Check your connection and try again.');
    setIsLoading(false);
  }, [session]);

  useEffect(() => { const timer = setTimeout(() => { void loadData(); }, 0); return () => clearTimeout(timer); }, [loadData]);

  const updateProfile = async (updated: Partial<UserProfile>) => {
    if (!session || !supabaseConfigured) throw new Error('Sign in to edit your profile.');
    setUser(await updateStudentProfile(session.user.id, updated, user));
  };

  const toggleUpvoteIdea = async (_id: string) => { throw new Error('Idea voting is unavailable because the database has no supported votes table.'); };

  const toggleBookmarkIdea = async (_id: string) => { throw new Error('Idea bookmarks are unavailable because the database has no supported saved ideas table.'); };

  const submitIdea = async (newIdea: Omit<Idea, 'id' | 'createdAt' | 'upvotes' | 'commentsCount' | 'creator'>) => {
    if (!session || !supabaseConfigured) throw new Error('Sign in to submit an idea.');
    const created = await sharedContentService.create<Idea>('ideas', { ...newIdea, creator: { id: session.user.id, name: user.name, avatar: user.avatar, college: user.college, role: user.branch || '' }, createdAt: new Date().toISOString() } as Idea);
    setIdeas((rows) => [created, ...rows]); return created;
  };

  const createTeam = async (newTeam: Omit<TeamListing, 'id' | 'createdAt' | 'applicantCount' | 'lead' | 'members'>) => {
    if (!session || !supabaseConfigured) throw new Error('Sign in to create a team.');
    const created = await sharedContentService.create<TeamListing>('teams', { ...newTeam, id: '', lead: { id: session.user.id, name: user.name, avatar: user.avatar, role: user.branch || 'Student', isLead: true }, members: [], applicantCount: 0, createdAt: new Date().toISOString() });
    setTeams((rows) => [created, ...rows]); return created;
  };

  const applyToTeam = async (_teamId: string, _roleName: string) => { throw new Error('Team applications are unavailable because the application table is not configured.'); };

  const toggleSaveOpportunity = async (id: string) => {
    if (session && supabaseConfigured) { const saved = await sharedContentService.toggleSavedOpportunity(id); setOpportunities((prev) => prev.map((item) => item.id === id ? { ...item, isSaved: saved } : item)); return; }
    const updated = await dataService.toggleSaveOpportunity(id);
    if (updated) {
      setOpportunities((prev) => prev.map((o) => (o.id === id ? updated : o)));
    }
  };

  const submitProject = async (newProject: Omit<Project, 'id' | 'likes' | 'views' | 'contributors'>) => {
    if (!session || !supabaseConfigured) throw new Error('Sign in to publish a project.');
    const created = await sharedContentService.create<Project>('projects', { ...newProject, id: '', contributors: [{ id: session.user.id, name: user.name, avatar: user.avatar, role: user.branch || 'Student' }] });
    setProjects((rows) => [created, ...rows]); return created;
  };
  const toggleLikeProject = async (_id: string) => { throw new Error('Project likes are unavailable because the database has no supported likes table.'); };

  const sendMessage = async (convId: string, text: string) => {
    await dataService.sendMessage(convId, text);
    const updatedConvs = await dataService.getConversations();
    setConversations(updatedConvs);
  };

  const markNotificationRead = async (id: string) => {
    await dataService.markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsRead = async () => {
    await dataService.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const refreshCommunityPosts = async () => {
    if (!session || !supabaseConfigured) throw new Error('Sign in to load community posts.');
    setCommunityPosts((await postService.feed(1, 100)).posts);
  };

  const addCommunityPost = async (newPost: Omit<CommunityPost, 'id' | 'createdAt' | 'createdAtTimestamp' | 'likesCount' | 'commentsCount' | 'author'>) => {
    if (!session || !supabaseConfigured) throw new Error('Sign in to create a post.');
    const image_urls = await uploadPostImages((newPost.images || []).map((uri) => ({ uri, fileName: uri.split('/').pop(), mimeType: 'image/jpeg' } as any)));
    const created = await postService.create({ title: newPost.title, content: newPost.content, type: newPost.type, category: newPost.category, tags: newPost.tags, image_urls });
    setCommunityPosts((rows) => [created, ...rows]); return created;
  };

  const editCommunityPost = async (id: string, patch: Partial<CommunityPost>) => {
    if (!session || !supabaseConfigured) throw new Error('Sign in to edit a community post.');
    const updated = await postService.update(id, { title: patch.title, content: patch.content, tags: patch.tags });
    setCommunityPosts((previous) => previous.map((post) => post.id === id ? updated : post));
  };
  const deleteCommunityPost = async (id: string) => {
    if (!session || !supabaseConfigured) throw new Error('Sign in to delete a community post.');
    await postService.remove(id);
    setCommunityPosts((previous) => previous.filter((post) => post.id !== id));
  };

  const toggleLikePost = async (id: string) => {
    if (!session || !supabaseConfigured) throw new Error('Sign in to like posts.');
    const isLiked = await postService.toggleLike(id); const feed = await postService.feed(1, 100);
    const updated = feed.posts.find((post) => post.id === id); if (updated) setCommunityPosts((rows) => rows.map((post) => post.id === id ? { ...updated, isLiked } : post));
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

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;
  const savedOpportunityIds = opportunities.filter((o) => o.isSaved).map((o) => o.id);
  const visibleUser = session && supabaseConfigured && user.id !== session.user.id ? authIdentityProfile(session.user) : user;

  return (
    <AppContext.Provider
      value={{
        user: visibleUser,
        students,
        studentServices,
        ideas,
        teams,
        opportunities,
        projects,
        conversations,
        notifications,
        leaderboard,
        savedOpportunityIds,
        unreadNotifsCount,
        isLoading,
        dataError,
        communityPosts,
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
        submitIdea,
        createTeam,
        applyToTeam,
        toggleSaveOpportunity,
        submitProject,
        toggleLikeProject,
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
