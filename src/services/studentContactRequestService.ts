import { requireSupabase } from './supabase';

export const studentContactRequestService = {
  async send(input: { targetUserId: string; serviceId?: string; message: string }): Promise<string> {
    const db = requireSupabase();
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('Sign in to send a request.');
    if (input.targetUserId === user.id) throw new Error('You cannot send a request to yourself.');
    if (!input.message.trim()) throw new Error('Add a short message before sending.');
    const { data, error } = await db.rpc('submit_student_contact_request', {
      target_user_id: input.targetUserId,
      target_service_id: input.serviceId || null,
      request_message: input.message.trim(),
    });
    if (error?.code === '23505') throw new Error('You already have an active request for this student or service.');
    if (error) throw error;
    return String(data);
  },
};
