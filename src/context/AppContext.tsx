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
} from '../types';
import { dataService } from '../services/dataService';
import {
  CURRENT_USER,
  MOCK_IDEAS,
  MOCK_TEAMS,
  MOCK_PROJECTS,
  MOCK_CONVERSATIONS,
  MOCK_NOTIFICATIONS,
  MOCK_LEADERBOARD,
} from '../services/mockData';

interface AppContextType {
  user: UserProfile;
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
  refreshAll: () => Promise<void>;
  updateProfile: (updated: Partial<UserProfile>) => Promise<void>;
  toggleUpvoteIdea: (id: string) => Promise<void>;
  toggleBookmarkIdea: (id: string) => Promise<void>;
  submitIdea: (newIdea: Omit<Idea, 'id' | 'createdAt' | 'upvotes' | 'commentsCount' | 'creator'>) => Promise<Idea>;
  createTeam: (newTeam: Omit<TeamListing, 'id' | 'createdAt' | 'applicantCount' | 'lead' | 'members'>) => Promise<TeamListing>;
  applyToTeam: (teamId: string, roleName: string) => Promise<{ success: boolean; message: string }>;
  toggleSaveOpportunity: (id: string) => Promise<void>;
  submitProject: (newProject: Omit<Project, 'id' | 'likes' | 'views' | 'contributors'>) => Promise<Project>;
  sendMessage: (convId: string, text: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(CURRENT_USER);
  const [ideas, setIdeas] = useState<Idea[]>(MOCK_IDEAS);
  const [teams, setTeams] = useState<TeamListing[]>(MOCK_TEAMS);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [conversations, setConversations] = useState<ChatConversation[]>(MOCK_CONVERSATIONS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>(MOCK_LEADERBOARD);
  const [isLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [u, i, t, o, p, c, n, l] = await Promise.all([
        dataService.getUser(),
        dataService.getIdeas(),
        dataService.getTeams(),
        dataService.getOpportunities(),
        dataService.getProjects(),
        dataService.getConversations(),
        dataService.getNotifications(),
        dataService.getLeaderboard(),
      ]);
      setUser(u);
      setIdeas(i);
      setTeams(t);
      setOpportunities(o);
      setProjects(p);
      setConversations(c);
      setNotifications(n);
      setLeaderboard(l);
    } catch (err) {
      console.error('Error loading StuDos data:', err);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const sync = async () => {
      try {
        const [u, i, t, o, p, c, n, l] = await Promise.all([
          dataService.getUser(),
          dataService.getIdeas(),
          dataService.getTeams(),
          dataService.getOpportunities(),
          dataService.getProjects(),
          dataService.getConversations(),
          dataService.getNotifications(),
          dataService.getLeaderboard(),
        ]);
        if (active) {
          setUser(u);
          setIdeas(i);
          setTeams(t);
          setOpportunities(o);
          setProjects(p);
          setConversations(c);
          setNotifications(n);
          setLeaderboard(l);
        }
      } catch (err) {
        console.error('Sync error:', err);
      }
    };
    sync();
    return () => {
      active = false;
    };
  }, []);

  const updateProfile = async (updated: Partial<UserProfile>) => {
    const newUser = await dataService.updateUser(updated);
    setUser(newUser);
  };

  const toggleUpvoteIdea = async (id: string) => {
    const updated = await dataService.toggleUpvoteIdea(id);
    if (updated) {
      setIdeas((prev) => prev.map((item) => (item.id === id ? updated : item)));
    }
  };

  const toggleBookmarkIdea = async (id: string) => {
    const updated = await dataService.toggleBookmarkIdea(id);
    if (updated) {
      setIdeas((prev) => prev.map((item) => (item.id === id ? updated : item)));
    }
  };

  const submitIdea = async (newIdea: Omit<Idea, 'id' | 'createdAt' | 'upvotes' | 'commentsCount' | 'creator'>) => {
    const created = await dataService.addIdea(newIdea);
    setIdeas((prev) => [created, ...prev]);
    return created;
  };

  const createTeam = async (newTeam: Omit<TeamListing, 'id' | 'createdAt' | 'applicantCount' | 'lead' | 'members'>) => {
    const created = await dataService.addTeam(newTeam);
    setTeams((prev) => [created, ...prev]);
    return created;
  };

  const applyToTeam = async (teamId: string, roleName: string) => {
    const res = await dataService.applyToTeam(teamId, roleName);
    setTeams((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, applicantCount: t.applicantCount + 1 } : t))
    );
    return res;
  };

  const toggleSaveOpportunity = async (id: string) => {
    const updated = await dataService.toggleSaveOpportunity(id);
    if (updated) {
      setOpportunities((prev) => prev.map((o) => (o.id === id ? updated : o)));
    }
  };

  const submitProject = async (newProject: Omit<Project, 'id' | 'likes' | 'views' | 'contributors'>) => {
    const created = await dataService.addProject(newProject);
    setProjects((prev) => [created, ...prev]);
    return created;
  };

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

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;
  const savedOpportunityIds = opportunities.filter((o) => o.isSaved).map((o) => o.id);

  return (
    <AppContext.Provider
      value={{
        user,
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
        refreshAll: loadData,
        updateProfile,
        toggleUpvoteIdea,
        toggleBookmarkIdea,
        submitIdea,
        createTeam,
        applyToTeam,
        toggleSaveOpportunity,
        submitProject,
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
