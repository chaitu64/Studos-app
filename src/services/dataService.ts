import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  UserProfile,
  Idea,
  TeamListing,
  Opportunity,
  Project,
  ChatConversation,
  ChatMessage,
  ChatRoom,
  NotificationItem,
  LeaderboardUser,
  CommunityPost,
  CommunityPostComment,
} from '../types';
import {
  CURRENT_USER,
  MOCK_STUDENTS,
  MOCK_IDEAS,
  MOCK_TEAMS,
  MOCK_PROJECTS,
  MOCK_CONVERSATIONS,
  MOCK_CHAT_MESSAGES,
  MOCK_CHAT_ROOMS,
  MOCK_NOTIFICATIONS,
  MOCK_LEADERBOARD,
} from './mockData';
import { fetchLiveOpportunities } from './unstopService';

const STORAGE_KEYS = {
  USER: '@studos_user',
  IDEAS: '@studos_ideas',
  TEAMS: '@studos_teams',
  OPPORTUNITIES: '@studos_opportunities',
  PROJECTS: '@studos_projects',
  CONVERSATIONS: '@studos_conversations',
  MESSAGES: '@studos_messages',
  NOTIFICATIONS: '@studos_notifications',
  SAVED_STUDENTS: '@studos_saved_students',
  SWIPED_STUDENTS: '@studos_swiped_students',
  COMMUNITY_POSTS: '@studos_community_posts',
};

class DataService {
  async getUser(): Promise<UserProfile> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      return data ? JSON.parse(data) : CURRENT_USER;
    } catch {
      return CURRENT_USER;
    }
  }

  async updateUser(user: Partial<UserProfile>): Promise<UserProfile> {
    const current = await this.getUser();
    const updated = { ...current, ...user };
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
    return updated;
  }

  async getStudents(): Promise<UserProfile[]> {
    return MOCK_STUDENTS;
  }

  async getIdeas(): Promise<Idea[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.IDEAS);
      return data ? JSON.parse(data) : MOCK_IDEAS;
    } catch {
      return MOCK_IDEAS;
    }
  }

  async getIdeaById(id: string): Promise<Idea | undefined> {
    const ideas = await this.getIdeas();
    return ideas.find((i) => i.id === id);
  }

  async addIdea(newIdea: Omit<Idea, 'id' | 'createdAt' | 'upvotes' | 'commentsCount' | 'creator'>): Promise<Idea> {
    const ideas = await this.getIdeas();
    const currentUser = await this.getUser();
    const created: Idea = {
      ...newIdea,
      id: `idea_${Date.now()}`,
      createdAt: 'Just now',
      upvotes: 1,
      commentsCount: 0,
      isUpvoted: true,
      creator: {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
        college: currentUser.college,
        role: currentUser.primaryRole,
      },
    };
    const updated = [created, ...ideas];
    await AsyncStorage.setItem(STORAGE_KEYS.IDEAS, JSON.stringify(updated));
    return created;
  }

  async toggleUpvoteIdea(id: string): Promise<Idea | undefined> {
    const ideas = await this.getIdeas();
    const index = ideas.findIndex((i) => i.id === id);
    if (index === -1) return undefined;
    const idea = ideas[index];
    const isUpvoted = !idea.isUpvoted;
    const upvotes = isUpvoted ? idea.upvotes + 1 : Math.max(0, idea.upvotes - 1);
    const updatedIdea = { ...idea, isUpvoted, upvotes };
    ideas[index] = updatedIdea;
    await AsyncStorage.setItem(STORAGE_KEYS.IDEAS, JSON.stringify(ideas));
    return updatedIdea;
  }

  async toggleBookmarkIdea(id: string): Promise<Idea | undefined> {
    const ideas = await this.getIdeas();
    const index = ideas.findIndex((i) => i.id === id);
    if (index === -1) return undefined;
    const idea = ideas[index];
    const isBookmarked = !idea.isBookmarked;
    const updatedIdea = { ...idea, isBookmarked };
    ideas[index] = updatedIdea;
    await AsyncStorage.setItem(STORAGE_KEYS.IDEAS, JSON.stringify(ideas));
    return updatedIdea;
  }

  async getTeams(): Promise<TeamListing[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.TEAMS);
      return data ? JSON.parse(data) : MOCK_TEAMS;
    } catch {
      return MOCK_TEAMS;
    }
  }

  async getTeamById(id: string): Promise<TeamListing | undefined> {
    const teams = await this.getTeams();
    return teams.find((t) => t.id === id);
  }

  async addTeam(newTeam: Omit<TeamListing, 'id' | 'createdAt' | 'applicantCount' | 'lead' | 'members'>): Promise<TeamListing> {
    const teams = await this.getTeams();
    const user = await this.getUser();
    const created: TeamListing = {
      ...newTeam,
      id: `team_${Date.now()}`,
      createdAt: 'Just now',
      applicantCount: 0,
      lead: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        role: user.primaryRole,
        isLead: true,
      },
      members: [
        {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          role: user.primaryRole,
          isLead: true,
        },
      ],
    };
    const updated = [created, ...teams];
    await AsyncStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(updated));
    return created;
  }

  async applyToTeam(teamId: string, roleName: string): Promise<{ success: boolean; message: string }> {
    const teams = await this.getTeams();
    const teamIndex = teams.findIndex((t) => t.id === teamId);
    if (teamIndex !== -1) {
      teams[teamIndex].applicantCount += 1;
      await AsyncStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
    }
    return {
      success: true,
      message: `Application submitted for ${roleName}! The team lead will review your profile.`,
    };
  }

  async getOpportunities(params?: {
    search?: string;
    categories?: string[];
    teamSize?: string[];
    payment?: string[];
    sortBy?: 'deadline' | 'recent' | 'prize' | 'relevance';
    forceRefresh?: boolean;
  }): Promise<Opportunity[]> {
    // Check cached opportunities in local storage
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.OPPORTUNITIES);
    let opportunitiesList: Opportunity[] = cached ? JSON.parse(cached) : [];

    // If no cached opportunities or forcing refresh, fetch real Unstop opportunities
    if (opportunitiesList.length === 0 || params?.forceRefresh) {
      try {
        const liveData = await fetchLiveOpportunities({
          forceRefresh: params?.forceRefresh,
        });
        if (liveData && liveData.length > 0) {
          opportunitiesList = liveData;
          await AsyncStorage.setItem(STORAGE_KEYS.OPPORTUNITIES, JSON.stringify(liveData));
        }
      } catch (fetchErr) {
        console.warn('Real Unstop fetch error:', fetchErr);
        // If we have previously cached real opportunities, serve them
        if (opportunitiesList.length === 0) {
          // Never fabricate mock data — rethrow so the UI shows an honest error and retry action
          throw fetchErr;
        }
      }
    }

    return this.applyFiltersAndSort(opportunitiesList, params);
  }

  async refreshRealOpportunities(): Promise<Opportunity[]> {
    return this.getOpportunities({ forceRefresh: true });
  }

  async getOpportunityById(id: string): Promise<Opportunity | undefined> {
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.OPPORTUNITIES);
    if (cached) {
      try {
        const items: Opportunity[] = JSON.parse(cached);
        const found = items.find((o) => o.id === id);
        if (found) return found;
      } catch {}
    }
    const opps = await this.getOpportunities();
    return opps.find((o) => o.id === id);
  }

  public applyFiltersAndSort(
    items: Opportunity[],
    params?: {
      search?: string;
      categories?: string[];
      teamSize?: string[];
      payment?: string[];
      sortBy?: 'deadline' | 'recent' | 'prize' | 'relevance';
    }
  ): Opportunity[] {
    if (!params) return items;

    let result = [...items];

    // Search by title, organizer, category, type, location, skills, tags
    if (params.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      const tokens = q.split(/\s+/).filter(Boolean);

      result = result.filter((o) => {
        const title = (o.title || '').toLowerCase();
        const organizer = (o.organizer || '').toLowerCase();
        const category = (o.category || '').toLowerCase();
        const type = (o.type || '').toLowerCase();
        const loc = (o.location || '').toLowerCase();
        const skills = (o.requiredSkills || []).map((s) => s.toLowerCase());
        const tags = (o.tags || []).map((t) => t.toLowerCase());
        const desc = (o.description || '').toLowerCase();

        // Every search token must match somewhere in the opportunity data
        return tokens.every(
          (t) =>
            title.includes(t) ||
            organizer.includes(t) ||
            category.includes(t) ||
            type.includes(t) ||
            loc.includes(t) ||
            desc.includes(t) ||
            skills.some((s) => s.includes(t)) ||
            tags.some((tag) => tag.includes(t))
        );
      });
    }

    // Filter by categories (multiple selection)
    if (params.categories && params.categories.length > 0 && !params.categories.includes('All')) {
      result = result.filter((o) => {
        const cat = o.category || o.type;
        return params.categories!.includes(cat as any) || params.categories!.includes(o.type as any);
      });
    }

    // Filter by team size
    if (params.teamSize && params.teamSize.length > 0) {
      result = result.filter((o) => {
        return params.teamSize!.some((ts) => {
          if (ts === 'Individual') {
            return o.teamSize === 'Individual' || o.maxTeamSize === 1;
          }
          if (ts === '2–4 members' || ts === '2-4 members') {
            return (
              o.teamSize === '2–4 members' ||
              o.teamSize === '2-4 members' ||
              (o.minTeamSize && o.minTeamSize >= 2 && o.maxTeamSize && o.maxTeamSize <= 4)
            );
          }
          if (ts === '5 or more members' || ts === '5+ members') {
            return (
              o.teamSize === '5+ members' ||
              (o.maxTeamSize && o.maxTeamSize >= 5) ||
              (o.minTeamSize && o.minTeamSize >= 5)
            );
          }
          return false;
        });
      });
    }

    // Filter by payment structure
    if (params.payment && params.payment.length > 0) {
      result = result.filter((o) => {
        return params.payment!.some((p) => {
          if (p === 'Free registration') {
            return o.registrationFee === 'Free' || !o.registrationFee;
          }
          if (p === 'Paid registration') {
            return o.registrationFee === 'Paid' || (o.registrationFee && o.registrationFee !== 'Free');
          }
          if (p === 'Stipends' || p === 'Stipend') {
            return Boolean(o.stipend);
          }
          if (p === 'Prizes & Rewards' || p === 'Prize or rewards') {
            return (o.prizeAmount && o.prizeAmount > 0) || Boolean(o.prizeOrCompensation && o.prizeOrCompensation !== 'Not specified');
          }
          return false;
        });
      });
    }

    // Sorting with explicit handling for missing and negative values
    if (params.sortBy === 'deadline') {
      result.sort((a, b) => {
        // Active non-expired deadlines first (ascending: 0, 1, 2...)
        const aHasDays = a.daysRemaining !== undefined && a.daysRemaining >= 0;
        const bHasDays = b.daysRemaining !== undefined && b.daysRemaining >= 0;

        if (aHasDays && bHasDays) {
          return (a.daysRemaining as number) - (b.daysRemaining as number);
        }
        if (aHasDays && !bHasDays) return -1;
        if (!aHasDays && bHasDays) return 1;

        // If both are missing or expired, place unexpired before expired
        const aDays = a.daysRemaining !== undefined ? a.daysRemaining : -999;
        const bDays = b.daysRemaining !== undefined ? b.daysRemaining : -999;
        return bDays - aDays;
      });
    } else if (params.sortBy === 'recent') {
      result.sort((a, b) => {
        const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        if (db !== da) return db - da;
        return a.title.localeCompare(b.title);
      });
    } else if (params.sortBy === 'prize') {
      result.sort((a, b) => {
        const pa = a.prizeAmount && a.prizeAmount > 0 ? a.prizeAmount : 0;
        const pb = b.prizeAmount && b.prizeAmount > 0 ? b.prizeAmount : 0;
        if (pb !== pa) return pb - pa;
        return a.title.localeCompare(b.title);
      });
    }

    return result;
  }

  async toggleSaveOpportunity(id: string): Promise<Opportunity | undefined> {
    const opps = await this.getOpportunities();
    const index = opps.findIndex((o) => o.id === id);
    if (index === -1) return undefined;
    const isSaved = !opps[index].isSaved;
    opps[index] = { ...opps[index], isSaved };
    await AsyncStorage.setItem(STORAGE_KEYS.OPPORTUNITIES, JSON.stringify(opps));
    return opps[index];
  }

  async getProjects(): Promise<Project[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PROJECTS);
      return data ? JSON.parse(data) : MOCK_PROJECTS;
    } catch {
      return MOCK_PROJECTS;
    }
  }

  async addProject(newProject: Omit<Project, 'id' | 'likes' | 'views' | 'contributors'>): Promise<Project> {
    const projects = await this.getProjects();
    const user = await this.getUser();
    const created: Project = {
      ...newProject,
      id: `proj_${Date.now()}`,
      likes: 1,
      views: 12,
      contributors: [
        {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          role: user.primaryRole,
        },
      ],
    };
    const updated = [created, ...projects];
    await AsyncStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated));
    return created;
  }

  async getConversations(): Promise<ChatConversation[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
      return data ? JSON.parse(data) : MOCK_CONVERSATIONS;
    } catch {
      return MOCK_CONVERSATIONS;
    }
  }

  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.MESSAGES);
      const allMessages = data ? JSON.parse(data) : MOCK_CHAT_MESSAGES;
      return allMessages[conversationId] || [];
    } catch {
      return MOCK_CHAT_MESSAGES[conversationId] || [];
    }
  }

  async sendMessage(conversationId: string, text: string): Promise<ChatMessage> {
    const user = await this.getUser();
    const newMessage: ChatMessage = {
      id: `m_${Date.now()}`,
      conversationId,
      senderId: user.id,
      senderName: user.name,
      senderAvatar: user.avatar,
      text,
      timestamp: 'Just now',
      isCurrentUser: true,
    };

    let allMessages: Record<string, ChatMessage[]> = { ...MOCK_CHAT_MESSAGES };
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.MESSAGES);
      if (data) allMessages = JSON.parse(data);
    } catch {
      // fallback
    }

    const currentList = allMessages[conversationId] || [];
    allMessages[conversationId] = [...currentList, newMessage];
    await AsyncStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(allMessages));

    // Update conversation last message
    const conversations = await this.getConversations();
    const convIndex = conversations.findIndex((c) => c.id === conversationId);
    if (convIndex !== -1) {
      conversations[convIndex].lastMessage = `You: ${text}`;
      conversations[convIndex].lastMessageTime = 'Just now';
      await AsyncStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
    }

    return newMessage;
  }

  async getChatRooms(): Promise<ChatRoom[]> {
    return MOCK_CHAT_ROOMS;
  }

  async getNotifications(): Promise<NotificationItem[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      return data ? JSON.parse(data) : MOCK_NOTIFICATIONS;
    } catch {
      return MOCK_NOTIFICATIONS;
    }
  }

  async markNotificationRead(id: string): Promise<void> {
    const notifs = await this.getNotifications();
    const updated = notifs.map((n) => (n.id === id ? { ...n, read: true } : n));
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
  }

  async markAllNotificationsRead(): Promise<void> {
    const notifs = await this.getNotifications();
    const updated = notifs.map((n) => ({ ...n, read: true }));
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
  }

  async getLeaderboard(): Promise<LeaderboardUser[]> {
    return MOCK_LEADERBOARD;
  }

  async getCommunityPosts(params?: {
    category?: string;
    page?: number;
    perPage?: number;
  }): Promise<{ posts: CommunityPost[]; total: number; hasMore: boolean }> {
    let rawPosts: CommunityPost[] = [];
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.COMMUNITY_POSTS);
      if (data) {
        rawPosts = JSON.parse(data);
      }
    } catch {
      rawPosts = [];
    }

    // Include user-submitted ideas (exclude mock ideas)
    try {
      const ideasData = await AsyncStorage.getItem(STORAGE_KEYS.IDEAS);
      if (ideasData) {
        const storedIdeas: Idea[] = JSON.parse(ideasData);
        const userSubmittedIdeas = storedIdeas.filter(
          (idea) => !['idea_1', 'idea_2', 'idea_3', 'idea_4', 'idea_5'].includes(idea.id)
        );
        for (const idea of userSubmittedIdeas) {
          if (!rawPosts.some((p) => p.ideaId === idea.id || p.id === idea.id)) {
            rawPosts.push({
              id: idea.id,
              type: 'idea',
              title: idea.title,
              content: idea.tagline + (idea.problemStatement ? `\n\n${idea.problemStatement}` : ''),
              author: {
                id: idea.creator.id,
                name: idea.creator.name,
                avatar: idea.creator.avatar,
                college: idea.creator.college,
                role: idea.creator.role,
              },
              createdAt: idea.createdAt,
              createdAtTimestamp:
                idea.id.startsWith('idea_') && !isNaN(Number(idea.id.replace('idea_', '')))
                  ? Number(idea.id.replace('idea_', ''))
                  : Date.now() - 3600000,
              category: idea.category,
              skills: idea.requiredSkills,
              problemStatement: idea.problemStatement,
              proposedSolution: idea.proposedSolution,
              targetAudience: idea.targetAudience,
              stage: idea.stage,
              rolesNeeded: idea.rolesNeeded,
              ideaId: idea.id,
              tags: idea.tags,
              likesCount: idea.upvotes,
              commentsCount: idea.commentsCount,
              isLiked: idea.isUpvoted,
              isSaved: idea.isBookmarked,
            });
          }
        }
      }
    } catch {}

    // Include user-submitted projects (exclude mock projects)
    try {
      const projectsData = await AsyncStorage.getItem(STORAGE_KEYS.PROJECTS);
      if (projectsData) {
        const storedProjects: Project[] = JSON.parse(projectsData);
        const userSubmittedProjects = storedProjects.filter(
          (p) => !['proj_1', 'proj_2', 'proj_3', 'proj_4'].includes(p.id)
        );
        for (const project of userSubmittedProjects) {
          if (!rawPosts.some((p) => p.projectId === project.id || p.id === project.id)) {
            const author = project.contributors?.[0] || {
              id: 'unknown',
              name: 'Builder',
              avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
              role: 'Developer',
            };
            rawPosts.push({
              id: project.id,
              type: 'project',
              title: project.title,
              content: project.tagline + (project.description ? `\n\n${project.description}` : ''),
              author: {
                id: author.id,
                name: author.name,
                avatar: author.avatar,
                role: author.role,
              },
              createdAt: 'Recently',
              createdAtTimestamp:
                project.id.startsWith('proj_') && !isNaN(Number(project.id.replace('proj_', '')))
                  ? Number(project.id.replace('proj_', ''))
                  : Date.now() - 7200000,
              technologies: project.technologies,
              skills: project.technologies,
              demoUrl: project.demoUrl,
              githubUrl: project.githubUrl,
              projectId: project.id,
              likesCount: project.likes,
              commentsCount: 0,
              isLiked: project.isLiked,
              isSaved: project.isBookmarked,
            });
          }
        }
      }
    } catch {}

    // Include user-submitted teams as event_collab posts (exclude mock teams)
    try {
      const teamsData = await AsyncStorage.getItem(STORAGE_KEYS.TEAMS);
      if (teamsData) {
        const storedTeams: TeamListing[] = JSON.parse(teamsData);
        const userSubmittedTeams = storedTeams.filter(
          (t) => !['team_1', 'team_2', 'team_3', 'team_4'].includes(t.id)
        );
        for (const team of userSubmittedTeams) {
          if (!rawPosts.some((p) => p.teamId === team.id || p.id === team.id)) {
            const neededRoles = team.openRoles.map((r) => r.role).join(', ');
            rawPosts.push({
              id: team.id,
              type: 'event_collab',
              title: `${team.name} — Recruiting Teammates`,
              content: team.description,
              author: {
                id: team.lead.id,
                name: team.lead.name,
                avatar: team.lead.avatar,
                role: team.lead.role,
              },
              createdAt: team.createdAt,
              createdAtTimestamp:
                team.id.startsWith('team_') && !isNaN(Number(team.id.replace('team_', '')))
                  ? Number(team.id.replace('team_', ''))
                  : Date.now() - 10800000,
              eventName: team.hackathonOrEvent,
              eventRoleNeeded: neededRoles,
              teamId: team.id,
              category: team.projectDomain,
              skills: team.openRoles.flatMap((r) => r.skills),
              likesCount: 1,
              commentsCount: team.applicantCount || 0,
              isLiked: false,
              isSaved: team.isSaved,
            });
          }
        }
      }
    } catch {}

    // Sort by timestamp descending (newest first)
    rawPosts.sort((a, b) => (b.createdAtTimestamp || 0) - (a.createdAtTimestamp || 0));

    let filtered = rawPosts;
    if (params?.category && params.category !== 'All') {
      filtered = rawPosts.filter((p) => {
        if (params.category === 'idea') return p.type === 'idea';
        if (params.category === 'service') return p.type === 'service';
        if (params.category === 'story') return p.type === 'story';
        if (params.category === 'event_collab') return p.type === 'event_collab';
        if (params.category === 'project') return p.type === 'project';
        if (params.category === 'question') return p.type === 'question';
        return p.category === params.category || p.type === params.category;
      });
    }

    const page = params?.page || 1;
    const perPage = params?.perPage || 20;
    const startIndex = (page - 1) * perPage;
    const paginated = filtered.slice(startIndex, startIndex + perPage);

    return {
      posts: paginated,
      total: filtered.length,
      hasMore: startIndex + perPage < filtered.length,
    };
  }

  async addCommunityPost(
    post: Omit<CommunityPost, 'id' | 'createdAt' | 'createdAtTimestamp' | 'likesCount' | 'commentsCount' | 'author'>
  ): Promise<CommunityPost> {
    const user = await this.getUser();
    const now = Date.now();
    const newPost: CommunityPost = {
      ...post,
      id: `post_${now}`,
      createdAt: 'Just now',
      createdAtTimestamp: now,
      likesCount: 0,
      commentsCount: 0,
      isLiked: false,
      isSaved: false,
      author: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        college: user.college,
        role: user.primaryRole,
        isVerified: user.isVerified,
      },
    };

    let existing: CommunityPost[] = [];
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.COMMUNITY_POSTS);
      if (data) existing = JSON.parse(data);
    } catch {}

    const updated = [newPost, ...existing];
    await AsyncStorage.setItem(STORAGE_KEYS.COMMUNITY_POSTS, JSON.stringify(updated));

    // Also mirror to ideas if post is an idea
    if (post.type === 'idea') {
      try {
        await this.addIdea({
          title: post.title,
          tagline: post.content.slice(0, 120),
          problemStatement: post.problemStatement || post.content,
          proposedSolution: post.proposedSolution || 'Community collaboration in progress.',
          targetAudience: post.targetAudience || 'College students and builders',
          category: (post.category as any) || 'AI / GenAI',
          requiredSkills: post.skills || ['React Native', 'TypeScript'],
          stage: post.stage || 'Concept',
          teamSizeNeeded: 3,
          currentTeamSize: 1,
          rolesNeeded: post.rolesNeeded || ['Developer'],
          visibility: 'Public',
          roadmap: [],
          tags: post.tags || ['Community', 'Innovation'],
        });
      } catch (err) {
        console.warn('Could not mirror idea:', err);
      }
    }

    // Mirror to projects if type is project
    if (post.type === 'project') {
      try {
        await this.addProject({
          title: post.title,
          tagline: post.content.slice(0, 100),
          description: post.content,
          thumbnail: post.images?.[0] || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600',
          technologies: post.technologies || post.skills || ['React Native'],
          status: 'MVP Ready',
          demoUrl: post.demoUrl,
          githubUrl: post.githubUrl,
        });
      } catch (err) {
        console.warn('Could not mirror project:', err);
      }
    }

    return newPost;
  }

  async toggleLikePost(postId: string): Promise<CommunityPost | undefined> {
    let posts: CommunityPost[] = [];
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.COMMUNITY_POSTS);
      if (data) posts = JSON.parse(data);
    } catch {}

    const index = posts.findIndex((p) => p.id === postId);
    if (index !== -1) {
      const p = posts[index];
      const isLiked = !p.isLiked;
      const likesCount = isLiked ? (p.likesCount || 0) + 1 : Math.max(0, (p.likesCount || 1) - 1);
      posts[index] = { ...p, isLiked, likesCount };
      await AsyncStorage.setItem(STORAGE_KEYS.COMMUNITY_POSTS, JSON.stringify(posts));
      return posts[index];
    }

    // If it's an idea
    if (postId.startsWith('idea_')) {
      const updatedIdea = await this.toggleUpvoteIdea(postId);
      if (updatedIdea) {
        return {
          id: updatedIdea.id,
          type: 'idea',
          title: updatedIdea.title,
          content: updatedIdea.tagline,
          author: updatedIdea.creator,
          createdAt: updatedIdea.createdAt,
          createdAtTimestamp: Date.now(),
          likesCount: updatedIdea.upvotes,
          commentsCount: updatedIdea.commentsCount,
          isLiked: updatedIdea.isUpvoted,
        };
      }
    }

    return undefined;
  }

  async toggleSavePost(postId: string): Promise<CommunityPost | undefined> {
    let posts: CommunityPost[] = [];
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.COMMUNITY_POSTS);
      if (data) posts = JSON.parse(data);
    } catch {}

    const index = posts.findIndex((p) => p.id === postId);
    if (index !== -1) {
      const p = posts[index];
      const isSaved = !p.isSaved;
      posts[index] = { ...p, isSaved };
      await AsyncStorage.setItem(STORAGE_KEYS.COMMUNITY_POSTS, JSON.stringify(posts));
      return posts[index];
    }
    return undefined;
  }

  async addPostComment(postId: string, text: string): Promise<CommunityPostComment> {
    const user = await this.getUser();
    const newComment: CommunityPostComment = {
      id: `comm_${Date.now()}`,
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      userRole: user.primaryRole,
      content: text.trim(),
      createdAt: 'Just now',
    };

    let posts: CommunityPost[] = [];
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.COMMUNITY_POSTS);
      if (data) posts = JSON.parse(data);
    } catch {}

    const index = posts.findIndex((p) => p.id === postId);
    if (index !== -1) {
      const p = posts[index];
      const comments = p.comments ? [...p.comments, newComment] : [newComment];
      posts[index] = {
        ...p,
        comments,
        commentsCount: (p.commentsCount || 0) + 1,
      };
      await AsyncStorage.setItem(STORAGE_KEYS.COMMUNITY_POSTS, JSON.stringify(posts));
    }

    return newComment;
  }

  async applyToCollaborate(
    _postId: string,
    note: string,
    role?: string
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.getUser();
    const notifs = await this.getNotifications();
    const newNotif: NotificationItem = {
      id: `notif_${Date.now()}`,
      type: 'idea_collab',
      title: 'New Collaboration Request',
      message: `${user.name} wants to collaborate on your post${role ? ` as ${role}` : ''}: "${note.slice(0, 60)}..."`,
      timestamp: 'Just now',
      read: false,
      avatar: user.avatar,
    };
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([newNotif, ...notifs]));

    return {
      success: true,
      message: 'Your collaboration request has been delivered to the author!',
    };
  }
}

export const dataService = new DataService();
