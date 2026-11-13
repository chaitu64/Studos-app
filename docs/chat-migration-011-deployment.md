# Chat migration 011 deployment

Migration `011_secure_direct_chat_requests.sql` is prepared but has not been run. Keep
`EXPO_PUBLIC_CHAT_REQUESTS_ENABLED=false` until the SQL verification and authenticated tests below pass.

## What the live audit establishes

- `conversations`, `conversation_members`, and `messages` exist, RLS is enabled, and each currently has zero rows.
- `messages` has an INSERT policy but `authenticated` lacks INSERT privilege. Migration 011 grants INSERT on only `conversation_id`, `sender_id`, and `content`; its RLS policy still checks the authenticated sender, membership, and blocking state.
- `create_direct_conversation(uuid)` and `start_direct_conversation(uuid)` are executable by `authenticated`. Repository migration 002 shows `create_direct_conversation` creates a conversation and both memberships without recipient consent. The live body of `start_direct_conversation` was not included with the audit summary; migration 011 revokes its access without replacing its definition.
- The actual new table names in migration 011 are `conversation_requests`, `user_blocks`, and `user_chat_settings`. It does not create `chat_blocks` or `user_chat_preferences`.
- The chat portion of migration 002 is present, but the inventory does not prove every object from 002. Migration 009 group/team prerequisites were not verified. The revised 011 does not depend on 009 or replace its group RPC.

## Deploy

1. In Supabase SQL Editor, run `backend/diagnostics/chat_migration_011_preflight.sql`. Review all four verified function bodies, any other SECURITY DEFINER function that reads or writes chat tables, all current policies, column grants, and the Auth FK. Stop if an unexpected function can create memberships or any policy condition is not understood.
2. Run `backend/migrations/011_secure_direct_chat_requests.sql` as one transaction. It fails closed if the verified base is missing, RLS is off, a migration-owned table/RPC already exists, or the existing messages INSERT policy is absent. Do not run migrations 002 or 009 based only on the chat-table inventory.
3. Run `backend/diagnostics/chat_migration_011_verify.sql`. It raises an exception for failed RLS, grants, RPC, or policy invariants. Review the returned policies and function bodies as well.
4. Test with two genuine Auth accounts: request, pending state, recipient accept/decline, cancellation, message send/reply, block, request preference off, rate limit, and refresh persistence. Use a third account and an anonymous session to check message isolation. Confirm the old RPCs fail for `authenticated`.
5. Only after those checks pass, set `EXPO_PUBLIC_CHAT_REQUESTS_ENABLED=true` in the app build environment. This task does not enable it.

## Rollback

If migration 011 fails before commit, PostgreSQL rolls the transaction back. If it has committed but the feature must be disabled, turn off the app flag and revoke execute on the six new RPCs. Retain tables, policies, helper functions, requests, and audit data; do not drop tables or re-grant the old consent-free RPCs. Keep the message membership/block guard and column-level message INSERT grants in place for already-authorized conversations.

```sql
revoke all on function public.direct_chat_contact_status(uuid),
  public.request_direct_conversation(uuid,text), public.respond_to_conversation_request(uuid,text),
  public.cancel_conversation_request(uuid), public.set_chat_request_preference(boolean),
  public.block_chat_user(uuid) from public, anon, authenticated;
notify pgrst, 'reload schema';
```
