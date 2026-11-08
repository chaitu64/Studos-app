import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChatConversation, ChatMessage, LeaderboardUser, Opportunity, UserProfile } from '../types';
import { fetchLiveOpportunities } from './unstopService';
import { sharedContentService } from './sharedContentService';
import { chatService } from './chatService';
import { supabaseConfigured } from './supabase';

const OPPORTUNITIES_KEY = '@studos_opportunities';

class DataService {
  async getStudents(): Promise<UserProfile[]> { return sharedContentService.students(); }

  async getOpportunities(params?: { forceRefresh?: boolean; search?: string; categories?: string[]; teamSize?: string[]; payment?: string[]; sortBy?: 'deadline' | 'recent' | 'prize' | 'relevance' }): Promise<Opportunity[]> {
    const cached = await AsyncStorage.getItem(OPPORTUNITIES_KEY);
    let rows: Opportunity[] = cached ? JSON.parse(cached) : [];
    if (!rows.length || params?.forceRefresh) {
      const live = await fetchLiveOpportunities({ forceRefresh: params?.forceRefresh });
      rows = live || []; await AsyncStorage.setItem(OPPORTUNITIES_KEY, JSON.stringify(rows));
    }
    return this.applyFiltersAndSort(rows, params);
  }

  async refreshRealOpportunities(): Promise<Opportunity[]> { return this.getOpportunities({ forceRefresh: true }); }
  async getOpportunityById(id: string): Promise<Opportunity | undefined> { return (await this.getOpportunities()).find((item) => item.id === id); }

  applyFiltersAndSort(items: Opportunity[], params?: { search?: string; categories?: string[]; teamSize?: string[]; payment?: string[]; sortBy?: 'deadline' | 'recent' | 'prize' | 'relevance' }): Opportunity[] {
    let result = [...items];
    const query = params?.search?.trim().toLowerCase();
    if (query) result = result.filter((item) => [item.title, item.organizer, item.category, item.type, item.location, item.description, ...(item.requiredSkills || []), ...(item.tags || [])].some((value) => String(value || '').toLowerCase().includes(query)));
    if (params?.categories?.length && !params.categories.includes('All')) result = result.filter((item) => params.categories!.includes(item.category || '') || params.categories!.includes(item.type));
    if (params?.teamSize?.length) result = result.filter((item) => params.teamSize!.includes(item.teamSize || ''));
    if (params?.payment?.length) result = result.filter((item) => params.payment!.some((value) => value === 'Free registration' ? item.registrationFee === 'Free' : value === 'Paid registration' ? item.registrationFee === 'Paid' : value.toLowerCase().includes('stipend') ? Boolean(item.stipend) : value.toLowerCase().includes('prize') ? Boolean(item.prizeAmount) : true));
    if (params?.sortBy === 'recent') result.sort((a, b) => Date.parse(b.publishedAt || '') - Date.parse(a.publishedAt || ''));
    else if (params?.sortBy === 'prize') result.sort((a, b) => (b.prizeAmount || 0) - (a.prizeAmount || 0));
    else if (params?.sortBy === 'deadline') result.sort((a, b) => Date.parse(a.deadlineIso || '') - Date.parse(b.deadlineIso || ''));
    return result;
  }

  async toggleSaveOpportunity(id: string): Promise<Opportunity | undefined> {
    if (!supabaseConfigured) throw new Error('Sign in to save opportunities.');
    const saved = await sharedContentService.toggleSavedOpportunity(id);
    const items = await this.getOpportunities();
    return items.find((item) => item.id === id) ? { ...items.find((item) => item.id === id)!, isSaved: saved } : undefined;
  }

  async getConversations(): Promise<ChatConversation[]> { return chatService.conversations(); }
  async getMessages(conversationId: string): Promise<ChatMessage[]> { return chatService.messages(conversationId); }
  async sendMessage(conversationId: string, content: string): Promise<void> { await chatService.sendMessage(conversationId, content); }
  async getLeaderboard(): Promise<LeaderboardUser[]> { return sharedContentService.leaderboard(); }
  async getChatRooms() { return sharedContentService.chatRooms(); }
}

export const dataService = new DataService();
