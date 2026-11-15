# StuDos

StuDos is an Expo SDK 58 / React Native student community app. It combines student profiles, a community feed, study resources, ideas, teams, projects, messaging, and opportunity discovery.

## Setup

1. Install Node.js 22 or newer and run `npm install`.
2. Copy `.env.example` to `.env` and set the Supabase project URL and publishable anon key. Never put a service-role key in the app.
3. Start with `npx expo start` and open the app in Expo Go or a development build.

For live Unstop opportunities on web, start the CORS-enabled API in a second terminal with `npm run start:backend`. The web app connects to `http://localhost:5001`; set `EXPO_PUBLIC_API_URL` to the deployed API URL for hosted web builds. On a physical device, set it to an address the phone can reach, such as your computer's LAN IP.

Required public environment variables:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

Without these values, cloud auth and services are disabled and the existing local/demo app remains available. Do not use production credentials when testing database changes.

## Authentication

Email/password signup stores only student profile fields in Auth metadata. An auth trigger initializes the public profile and private account record. Email verification is enforced by the Supabase Auth project settings; unverified users can request a resend. Password reset returns to the app's `reset-password` route (the `studos://reset-password` deep link on native and the current app origin on web) and uses the recovery session to set a new password. Sessions persist in native AsyncStorage and browser storage on web; auth-only screens are guarded by the root router.

Google sign-in is available on the login and signup screens. Configure the redirects in two places: in Google Cloud, the **Web application OAuth client's Authorized redirect URI** must be the Supabase callback URL shown under Supabase Dashboard → Authentication → Providers → Google (usually `https://<project-ref>.supabase.co/auth/v1/callback`). In Supabase, enable Google with that same client ID and secret, then add the app return URL `studos://auth-callback` under Authentication → URL Configuration → Redirect URLs. These URLs serve different steps of the OAuth flow; do not enter the app's `studos://` URL as Google's authorized redirect URI. For Expo Go, use a development build with the configured `studos` scheme for a stable native redirect. For web builds, also add the deployed site URL to Supabase's Site URL/Redirect URLs configuration.

Public student fields are selected from `profiles`. DOB and college email stay in `profile_private`, protected by owner-only RLS. `profiles` API grants in migration 002 expose only explicitly approved public columns.

## Database migrations

Apply migrations only to an explicitly configured disposable local or staging Supabase project first. Do not treat checked-in migration files as evidence of the deployed schema or apply them to production without inspecting the live catalog, reviewing the exact SQL, and obtaining explicit approval:

1. Back up the target database and inspect its schema.
2. Apply `backend/migrations/002_studos_application.sql` using the Supabase CLI or SQL editor.
3. **Never run** `backend/migrations/001_studos_social.sql`; it describes a conflicting schema.
4. Run the auth, two-user ownership, privacy, post, resource, and storage checks below before production rollout.
5. For production, review the migration diff and apply it as a planned deployment. This repository does not apply it automatically.

The VVIT Academic Library is an additive feature: after 002, apply `backend/migrations/003_academic_pdf_library.sql` in the Supabase SQL Editor. It creates the catalog, indexes, read/admin RLS, and private PDF/public preview buckets. `004_profile_compatibility.sql` is a standalone idempotent fix for older `profiles` schemas missing `degree` and `avatar_url`; 003 also includes those two safe `ADD COLUMN IF NOT EXISTS` statements. Do not apply 001.

Migration 002 is incremental and reuses `profiles`, `profile_private`, and `posts`. It adds community engagement, Drive resource metadata, content tables for future integrations, ownership/RLS policies, search indexes, and a private `studos-media` bucket for user-owned media. PDF bytes are never placed in Supabase Storage. The migration also revokes public execution of the existing `rls_auto_enable()` function if present; inspect it separately before changing its implementation.

The read-only `backend/diagnostics/auth_signup_oauth_readonly.sql` can diagnose Supabase's “Database error saving new user” response. Migration 022 repairs the signup triggers for the canonical `public.profiles` schema, creates the missing owner-protected `profile_private` relation, replaces the stale `student_profiles` trigger reference, and removes only the verified legacy `on_auth_user_created` trigger. It also removes broad client grants on `profiles` and restores an authenticated read-only allowlist that excludes private phone data; profile writes remain through the owner-checked RPC. Its preflight aborts on incompatible relations, duplicate/orphaned or legacy Auth links, unreviewed triggers, or custom private-profile policies. It does not update or delete existing profile rows or backfill private records. Inspect the live migration history and review this exact SQL before applying it to the data-bearing project; this migration has not been run.

The read-only `backend/diagnostics/team_chat_schema_readonly.sql` reports the location, columns, constraints, RLS, policies, grants, PostgREST schema setting, and Realtime publication membership of team/chat relations. Run it in the Supabase SQL Editor before deciding whether the REST `PGRST205` responses indicate missing relations or only a schema-cache/exposure issue. It returns metadata and an aggregate resource count, not message bodies or profile data.

Migration 020 restores missing team and topic-chat tables only after checking for schema collisions and incompatible columns/keys. It enables RLS, replaces only the known team/chat policies with the reviewed definitions, and aborts if it finds custom policies on those tables. It revokes existing client grants before granting the exact required privileges and inserts only the three built-in room rows with `ON CONFLICT DO NOTHING`; it does not delete or update existing rows. Review the diagnostic output and this exact migration before applying it to disposable staging. If the catalog confirms that the relations exist but PostgREST still cannot find them, an optional schema-cache refresh is `NOTIFY pgrst, 'reload schema';`—run it only after confirming the relations and grants.

Migration 021 adds an owner-checked, transactional team-application response RPC and registers the existing direct and room-message tables with Supabase Realtime. Apply it only after migration 020 and after checking its preflight against the staging catalog. Then test team accept/decline with two disposable users and verify live direct/room message events. Do not replay older migrations blindly; this repository cannot confirm the live schema or migration state.

## Community and Study Hub

When Supabase is configured, feed reads and new posts, likes, saves, comments, post images, profile contributions, and post management use Supabase. Post images go to the private media bucket under the owner's `posts/` folder and use short-lived signed URLs. Existing AsyncStorage records are retained and merged for the signed-in device. New ideas, teams, and projects are written to Supabase; their temporary local copies are removed only after the cloud insert succeeds. Old local records are not silently bulk-imported.

The Study Hub stores student-shared resource metadata plus a normalized Google Drive URL and file ID. Contributors upload PDFs to their own Drive, enable appropriate link sharing, and confirm their rights before submitting. Uploader edit/delete, saved resources, filters, broken-link reports, and external Drive opening are implemented. This separate community workflow does not fetch, proxy, render, or upload PDF bytes.

## VVIT Academic Library

Home → Study Hub → **VVIT Library** opens the database-backed VVIT catalog. It browses year/semester, subject, categories, and debounced full-text search with pagination. Document previews use generated first-page JPEGs; the source Drive URL is excluded from client selects. The reader uses a private Supabase Storage object with a temporary signed URL and PDF.js controls inside the app. React Native WebView 14.0.1 is pinned to the Expo SDK 58 compatible version.

Run the incremental source crawl/import from the repository root after applying migration 003 and creating the two buckets (the migration creates them):

```powershell
$env:SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co'
$env:SUPABASE_SERVICE_ROLE_KEY = 'SERVER_ONLY_KEY'
$env:VVIT_PDF_SOURCE_URL = 'https://cse-vvitu.vercel.app/'
python backend/academic_library/import_academic_pdfs.py --discover-only
python backend/academic_library/import_academic_pdfs.py --audit-only
python backend/academic_library/import_academic_pdfs.py
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` belong only in the trusted importer environment, never `.env` consumed by Expo, source control, or client builds. The importer honors source `robots.txt`, crawls the supplied site and linked public Drive folders, downloads only publicly served PDFs, and records inaccessible/restricted files as failures. It does not work around Google Drive login/interstitial screens. `--audit-only` fetches PDFs in memory to report affiliation and metadata without uploading or writing to Supabase. Import runs write `backend/academic_library/import-report.json` and append `import-log.jsonl`; the same normalized source URL and SHA-256 make imports incremental and prevent duplicate objects. Use `--retry-failed` to make the retry intent explicit, `--max-pages N` to cap a crawl, and `--report PATH` to choose a report location. Records without reliable year/semester/subject metadata stay unpublished for review. Previews are rendered from page 1 by PyMuPDF and compressed to JPEG.

The configured CSE Versatile endpoints must be reachable and expose VVIT PDFs for the initial import to populate real records. If the site is unavailable, the report will show that failure; no sample/demo content is inserted. There are currently no bundled PDF records.

Resource search and local filters cover title/subject, college, branch, study year, semester, and category. The database supports filtering and full-text search. Broken-link reports are private to their reporter; moderation review needs a trusted server-side workflow.

## Local data and current integration boundary

AsyncStorage data is not cleared by auth or migration. Signed-in reads now use Supabase for ideas, teams, projects, votes, team applications, student discovery, direct conversations/messages, chat rooms/messages, notifications, leaderboard, posts, and resources. Existing locally created records remain available as a device cache; a reviewed opt-in bulk import screen is still future work. Preferences and offline cache remain local. Opportunities come from the existing external Unstop integration and its local cache.

Direct conversations are created through a constrained security-definer RPC that only adds the caller and the selected registered student. Room membership is self-join only. Contribution points and notification production still require trusted server-side workflows; the client cannot award points or write notifications for other users. Profile avatar upload and editing/deletion of idea/team/project records remain incomplete; those records support cloud creation and read, while owner-scoped RLS protects mutations.

## Verification

```bash
npm test
npx tsc --noEmit
npx expo lint
npx expo-doctor
```

Drive URL tests and static migration security/repeatability checks run locally. Live integration tests are skipped unless the target is explicitly marked as disposable staging and write authorization is enabled. Put values in the Git-ignored `.env.test` or `.env.test.local` (never commit these files):

```env
STUDOS_TEST_SUPABASE_URL=https://YOUR_STAGING_PROJECT.supabase.co
STUDOS_TEST_SUPABASE_ANON_KEY=YOUR_STAGING_PUBLISHABLE_KEY
STUDOS_TEST_ENVIRONMENT=disposable-staging
STUDOS_TEST_ALLOW_WRITES=true
STUDOS_TEST_USER_A_EMAIL=...
STUDOS_TEST_USER_A_PASSWORD=...
STUDOS_TEST_USER_B_EMAIL=...
STUDOS_TEST_USER_B_PASSWORD=...
STUDOS_TEST_SUPABASE_SERVICE_ROLE_KEY=YOUR_STAGING_SERVICE_ROLE_KEY
```

Never point these tests at production or at the existing data-bearing development project. The service-role key is read only by chat test teardown to delete exact request/conversation IDs created by that run; keep it local and never use it in the app. The two-user RLS suite verifies private profile isolation, post/resource ownership, and team application accept/decline; it deletes only its uniquely created test rows as user A. Chat tests also require dedicated disposable accounts and remove only the requests, conversations, and block record they created. Configure the normal chat pair with `STUDOS_CHAT_TEST_USER_A_EMAIL`, `STUDOS_CHAT_TEST_USER_A_PASSWORD`, `STUDOS_CHAT_TEST_USER_B_EMAIL`, and `STUDOS_CHAT_TEST_USER_B_PASSWORD`. Optional security/blocking suites require separate disposable account pairs and their existing explicit opt-in flags. Leave all flags unset until the disposable staging target and accounts are approved.

## Production activation checklist

1. Confirm Supabase Auth email verification, password reset redirect allowlists (`studos://reset-password` for native and the deployed web app's `/reset-password` URL), and the app deep-link scheme.
2. Run the read-only team/chat diagnostic. Apply migration 020 and then 021 only to reviewed disposable staging, and run local checks plus the two-identity integration tests.
3. Review the existing Supabase security advisor finding for `public.rls_auto_enable()` and confirm migration 002 removes its callable grants.
4. Do not apply a migration to production until its live-schema preflight, data-preservation review, staging verification, rollback plan, and explicit approval are complete. Never run migration 001; migration 015 is destructive and must not be run without a separate, explicit review and approval.
5. Configure the app's public project URL and anon/publishable key in Expo deployment secrets; keep the service-role key server-side.
6. Build and smoke-test signup, email confirmation, reset, profiles, feed, comments, likes, resources, and Drive opening on iOS, Android, and web.

## Commands

```bash
npx expo start
npx tsc --noEmit
npx expo lint
npx expo-doctor
npm test
```
