import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChatConversation, ChatMessage, LeaderboardUser, Opportunity, UserProfile } from '../types';
import { calculateDaysRemaining, fetchLiveOpportunities } from './unstopService';
import { sharedContentService } from './sharedContentService';
import { chatService } from './chatService';
import { supabaseConfigured } from './supabase';
import { activeOpportunities, getOpportunityRewardAmount } from './opportunityUtils';

const OPPORTUNITIES_KEY = '@studos_opportunities_v2';
const LEGACY_OPPORTUNITIES_KEY = '@studos_opportunities';

class DataService {
  async getStudents(): Promise<UserProfile[]> { return sharedContentService.students(); }

  async getOpportunities(params?: { forceRefresh?: boolean; search?: string; keywords?: string; categories?: string[]; teamSize?: string[]; payment?: string[]; sortBy?: 'deadline' | 'recent' | 'prize' | 'relevance' }): Promise<Opportunity[]> {
    const currentCache = await AsyncStorage.getItem(OPPORTUNITIES_KEY);
    const legacyCache = currentCache ? null : await AsyncStorage.getItem(LEGACY_OPPORTUNITIES_KEY);
    let rows: Opportunity[] = JSON.parse(currentCache || legacyCache || '[]');
    if (!currentCache || params?.forceRefresh) {
      try {
        const live = await fetchLiveOpportunities({ forceRefresh: params?.forceRefresh });
        if (Array.isArray(live) && (live.length > 0 || params?.forceRefresh || !rows.length)) {
          rows = live;
          await AsyncStorage.setItem(OPPORTUNITIES_KEY, JSON.stringify(rows));
        }
      } catch (error) {
        if (!rows.length) throw error;
      }
    }
    if (!currentCache && rows.length) {
      await AsyncStorage.setItem(OPPORTUNITIES_KEY, JSON.stringify(rows));
    }
    rows = rows.map((item) => {
      if (!item.deadlineIso) return item;
      const daysRemaining = calculateDaysRemaining(item.deadlineIso);
      if (daysRemaining === undefined) return item;
      return { ...item, daysRemaining, status: daysRemaining < 0 ? 'Expired' : daysRemaining <= 5 ? 'Closing Soon' : 'Open' };
    });
    return this.applyFiltersAndSort(activeOpportunities(rows), params);
  }

  async refreshRealOpportunities(): Promise<Opportunity[]> { return this.getOpportunities({ forceRefresh: true }); }
  async getOpportunityById(id: string): Promise<Opportunity | undefined> { return (await this.getOpportunities()).find((item) => item.id === id); }

  applyFiltersAndSort(items: Opportunity[], params?: { search?: string; keywords?: string; categories?: string[]; teamSize?: string[]; payment?: string[]; sortBy?: 'deadline' | 'recent' | 'prize' | 'relevance' }): Opportunity[] {
    let result = activeOpportunities(items);
    const query = params?.search?.trim().toLowerCase();
    const matchesQuery = (item: Opportunity, value: string) => [item.title, item.organizer, item.category, item.type, item.location, item.description, ...(item.requiredSkills || []), ...(item.tags || [])].some((field) => String(field || '').toLowerCase().includes(value));
    if (query) result = result.filter((item) => matchesQuery(item, query));
    const keyword = params?.keywords?.trim().toLowerCase();
    if (keyword) result = result.filter((item) => matchesQuery(item, keyword));
    if (params?.categories?.length && !params.categories.includes('All')) result = result.filter((item) => params.categories!.includes(item.category || '') || params.categories!.includes(item.type));
    if (params?.teamSize?.length) result = result.filter((item) => params.teamSize!.includes(item.teamSize || ''));
    if (params?.payment?.length) result = result.filter((item) => params.payment!.some((value) => value === 'Free registration' ? item.registrationFee === 'Free' : value === 'Paid registration' ? item.registrationFee === 'Paid' : value.toLowerCase().includes('stipend') ? Boolean(item.stipend) : value.toLowerCase().includes('prize') ? Boolean(item.prizeAmount) : true));
    if (params?.sortBy === 'recent') result.sort((a, b) => {
      const aDate = Date.parse(a.publishedAt || '');
      const bDate = Date.parse(b.publishedAt || '');
      return (Number.isFinite(bDate) ? bDate : 0) - (Number.isFinite(aDate) ? aDate : 0);
    });
    else if (params?.sortBy === 'prize') result.sort((a, b) => (getOpportunityRewardAmount(b) || 0) - (getOpportunityRewardAmount(a) || 0));
    else if (params?.sortBy === 'deadline') result.sort((a, b) => {
      const aDate = Date.parse(a.deadlineIso || '');
      const bDate = Date.parse(b.deadlineIso || '');
      const aTime = Number.isFinite(aDate) ? aDate : Number.MAX_SAFE_INTEGER;
      const bTime = Number.isFinite(bDate) ? bDate : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
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
