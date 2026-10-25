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
} from '../types';
import {
  CURRENT_USER,
  MOCK_STUDENTS,
  MOCK_IDEAS,
  MOCK_TEAMS,
  MOCK_OPPORTUNITIES,
  MOCK_PROJECTS,
  MOCK_CONVERSATIONS,
  MOCK_CHAT_MESSAGES,
  MOCK_CHAT_ROOMS,
  MOCK_NOTIFICATIONS,
  MOCK_LEADERBOARD,
} from './mockData';
import { fetchUnstopHackathons } from './unstopService';

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
    allowDemoFallback?: boolean;
  }): Promise<Opportunity[]> {
    // First check cached opportunities if not forcing refresh
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.OPPORTUNITIES);
    let opportunitiesList: Opportunity[] = cached ? JSON.parse(cached) : [];

    // If no cached opportunities or forcing refresh, fetch real Unstop opportunities
    if (opportunitiesList.length === 0 || params?.forceRefresh) {
      try {
        const unstopData = await fetchUnstopHackathons(params?.forceRefresh);
        if (unstopData && unstopData.length > 0) {
          const mappedOpportunities: Opportunity[] = unstopData.map((h) => {
            const format: 'In-Person' | 'Online' | 'Hybrid' = h.mode.toLowerCase().includes('in-person')
              ? 'In-Person'
              : h.mode.toLowerCase().includes('hybrid')
              ? 'Hybrid'
              : 'Online';

            return {
              id: h.id,
              title: h.title,
              organizer: h.organizer,
              type: 'Hackathon',
              category: 'Hackathons',
              format,
              location: h.location,
              deadline: h.deadline || 'Open / Ongoing',
              daysRemaining: h.daysRemaining ?? 30,
              eligibility: h.eligibility,
              prizeOrCompensation: h.prize || 'Prizes & Certificates',
              prizeAmount: h.prizeAmount,
              registrationFee: h.isPaid ? 'Paid' : 'Free',
              teamSize: '2-4 members',
              minTeamSize: 2,
              maxTeamSize: 4,
              isVerified: true,
              requiredSkills: h.skills.length > 0 ? h.skills : ['Coding', 'Problem Solving'],
              description: h.description,
              officialUrl: h.registrationUrl,
              checklist: [
                'Review problem statements and eligibility on Unstop',
                'Register team on official portal before deadline',
                'Prepare prototype / project pitch deck',
              ],
              source: 'Unstop',
              status: 'Open',
              isSaved: false,
              featured: (h.prizeAmount && h.prizeAmount > 50000) || false,
              publishedAt: new Date().toISOString(),
            };
          });

          opportunitiesList = mappedOpportunities;
          await AsyncStorage.setItem(STORAGE_KEYS.OPPORTUNITIES, JSON.stringify(mappedOpportunities));
        }
      } catch (fetchErr) {
        console.warn('Real Unstop fetch error:', fetchErr);
        // If we have previously cached real opportunities, we can serve them
        if (opportunitiesList.length === 0) {
          if (params?.allowDemoFallback) {
            console.info('Demo fallback mode explicitly enabled: showing mock opportunities.');
            opportunitiesList = MOCK_OPPORTUNITIES;
          } else {
            // Rethrow so the UI displays the honest error state and retry button
            throw fetchErr;
          }
        }
      }
    }

    return this.applyFiltersAndSort(opportunitiesList, params);
  }

  async refreshRealOpportunities(): Promise<Opportunity[]> {
    return this.getOpportunities({ forceRefresh: true });
  }

  async getOpportunityById(id: string): Promise<Opportunity | undefined> {
    const opps = await this.getOpportunities();
    return opps.find((o) => o.id === id);
  }

  private applyFiltersAndSort(
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

    // Search by title and organizer
    if (params.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      result = result.filter(
        (o) =>
          o.title.toLowerCase().includes(q) ||
          o.organizer.toLowerCase().includes(q) ||
          (o.category && o.category.toLowerCase().includes(q)) ||
          o.type.toLowerCase().includes(q) ||
          (o.requiredSkills && o.requiredSkills.some((s) => s.toLowerCase().includes(q)))
      );
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
          if (p === 'Stipend') {
            return Boolean(o.stipend);
          }
          if (p === 'Prize or rewards') {
            return (o.prizeAmount && o.prizeAmount > 0) || Boolean(o.prizeOrCompensation);
          }
          if (p === 'Scholarship or funding') {
            return o.type === 'Scholarship' || o.category === 'Scholarships';
          }
          return false;
        });
      });
    }

    // Sorting
    if (params.sortBy === 'deadline') {
      result.sort((a, b) => (a.daysRemaining || 999) - (b.daysRemaining || 999));
    } else if (params.sortBy === 'recent') {
      result.sort((a, b) => {
        const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return db - da;
      });
    } else if (params.sortBy === 'prize') {
      result.sort((a, b) => (b.prizeAmount || 0) - (a.prizeAmount || 0));
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
}

export const dataService = new DataService();
