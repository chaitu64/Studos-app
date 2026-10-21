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

  async getOpportunities(): Promise<Opportunity[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.OPPORTUNITIES);
      return data ? JSON.parse(data) : MOCK_OPPORTUNITIES;
    } catch {
      return MOCK_OPPORTUNITIES;
    }
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
