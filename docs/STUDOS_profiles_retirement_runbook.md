# STUDOS profile retirement runbook

## Status

No Supabase migration has been applied by this workspace session. Local migration files are not evidence of live deployment. The repository has no service-role key or database URL, and no disposable authenticated test accounts are configured.

## Staging sequence

1. Run `backend/diagnostics/012_013_live_state_preflight.sql` in Supabase SQL Editor. It works before deciding whether 012/013 are deployed and reports schema, mapping aggregates, triggers, FKs, functions, views and policies. If it reports a migration-history table, run the commented `version,name` query in the script.
2. If `student_profiles.auth_user_id` exists, run `backend/diagnostics/014_profiles_runtime_preflight.sql` and save the output. If the column is absent, do not run queries that require it; compare the schema to migration 012 before deciding whether to apply 012.
3. Take a Supabase backup or point-in-time recovery snapshot. Record counts and the demo digest from the preflight. Historical expectations are 4 Auth users, 4 linked profiles, 20 null-linked demos and about 374 resources; live output is authoritative. Record posts and community-table counts too.
4. Inspect the full definitions for Auth triggers, profile RPCs, chat/contact RPCs, policies, views, triggers and FKs. Confirm `ensure_student_profile` and `save_student_profile` have fixed search paths and owner checks; confirm the canonical Auth trigger is enabled and idempotent. Do not infer deployment from filenames or migration-history rows alone.
5. Apply migration 012 only if the live schema/functions are missing and the reviewed migration matches the captured schema. If already correctly deployed, skip it.
6. Deploy the prepared application cutover to staging. Authenticated directory rows use `student_profiles.auth_user_id`; demos use `auth_user_id IS NULL` and `student_profiles.id`. Public queries exclude private contact fields.
7. Apply migration 013. It accepts either the reviewed legacy FK target or the already-cut-over Auth target and preserves UUID values. Stop if names, columns or deletion actions differ.
8. Apply migration 014 once. It verifies mappings, demo count, canonical trigger, uniqueness, RPC security, private-phone RLS and FK ownership before replacing functions and removing legacy runtime access. It aborts transactionally on an unsupported FK, orphan, or unresolved view, policy, trigger or function.
9. Run `backend/diagnostics/014_profiles_runtime_verify.sql`. Compare the demo digest and counts with step 3. Complete the authenticated tests below, including chat consent and blocking checks. A skipped test is not a pass.
10. Take a fresh backup. Only after every check passes, apply `backend/migrations/015_drop_legacy_profiles.sql` as the separate final transaction. It uses `DROP TABLE public.profiles RESTRICT`, never `CASCADE`.
11. Run `backend/diagnostics/015_profiles_final_verify.sql` and compare all counts to the saved baseline. Confirm the legacy relation is absent, canonical/private tables remain, mappings are one-to-one, and content counts and demo digest are unchanged.

## Authenticated staging checks

- Email signup: create a controlled account, verify the email, and confirm one `student_profiles` row has `auth_user_id` equal to the Auth UUID. Complete onboarding and reload.
- Google signup: repeat with a controlled OAuth account. Verify available name/avatar prefills and the same one-row mapping.
- Repeat login and logout/login: confirm the existing profile UUID remains unchanged and the mapping count stays one.
- Profile edits: update name, college, degree, branch, study year, graduation year, bio, skills and links; reload and verify persistence.
- Ownership: using account B, try updating account A’s `student_profiles` row directly and through profile RPC inputs. The database must reject the write or return zero updated rows. Confirm account A can still edit its own row.
- Phone privacy: account A can read its own `profile_private` row; account B receives no row for A. Neither public `student_profiles` directory queries nor resource/chat queries request phone fields.
- Five tabs: Home, Search/Explore, Study Hub, Connect, Messages. Verify data, navigation and normal actions.
- Chat: test existing conversations, new request, accept/decline, sending/receiving, blocked pair, disabled requests, and unauthorized membership/message attempts. Confirm all existing RLS and consent checks remain enforced.

## Rollback

Before migration 015, use the saved preflight output and restore legacy FKs with `backend/diagnostics/013_profiles_ownership_rollback.sql` if needed, then redeploy the prior app. Do not roll back by deleting profile, Auth, post, resource, conversation, or message rows. After migration 015, recovery requires restoring the backup or a forward migration that recreates and repopulates `profiles`; there is no data-preserving automatic rollback for a dropped table.
