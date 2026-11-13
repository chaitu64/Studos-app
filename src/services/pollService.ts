import { requireSupabase } from './supabase';
import { postService } from './postService';

export type CommunityPollOption = { id: string; text: string; votes: number };
export type CommunityPoll = {
  id: string; author_id: string; title: string; description: string; external_url: string | null;
  closes_at: string | null; created_at: string; closed: boolean; has_voted: boolean;
  options: CommunityPollOption[];
};

export const pollService = {
  async get(id: string): Promise<CommunityPoll> {
    const { data, error } = await requireSupabase().rpc('get_community_poll', { target_poll_id: id });
    if (error) throw error;
    return data as CommunityPoll;
  },

  async create(input: { title: string; description: string; options: string[]; externalUrl?: string; closesAt?: string | null }) {
    const db = requireSupabase();
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('Sign in to publish a poll.');
    const { data: pollId, error } = await db.rpc('create_community_poll', {
      poll_title: input.title.trim(), poll_description: input.description.trim(),
      option_values: input.options.map((option) => option.trim()).filter(Boolean),
      poll_external_url: input.externalUrl?.trim() || null, poll_closes_at: input.closesAt || null,
    });
    if (error) throw error;
    try {
      const post = await postService.create({
        title: input.title.trim(), content: input.description.trim(), type: 'poll',
        category: 'Survey / Poll', tags: ['poll'], metadata: { pollId }, links: input.externalUrl ? [input.externalUrl] : [],
      });
      return { pollId, post };
    } catch (cause) {
      await db.from('polls').delete().eq('id', pollId).eq('author_id', user.id);
      throw cause;
    }
  },

  async vote(pollId: string, optionId: string) {
    const db = requireSupabase();
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('Sign in to vote.');
    const poll = await this.get(pollId);
    if (poll.closed) throw new Error('This poll has closed.');
    if (poll.has_voted) throw new Error('You have already voted in this poll.');
    const { error } = await db.from('poll_votes').insert({ poll_id: pollId, option_id: optionId, user_id: user.id });
    if (error?.code === '23505') throw new Error('You have already voted in this poll.');
    if (error) throw error;
    return this.get(pollId);
  },
};
