# STUDOS student publishing audit

## Verification basis

The repository includes prior read-only schema evidence for `profiles`, `posts`, `ideas`, `problems`, `help_requests`, `services`, and `study_resources`; `student_profiles` is expected to be absent after migration 016. In this verification pass, REST schema probes returned HTTP 404 even for `study_resources`, so the live catalog and migration state could not be independently confirmed. Do not infer migration 016 or 017 deployment from local SQL files. The live database has not been changed by this work. Migration 017 is a local, reviewable migration only.

Live `problems` and `help_requests` have Auth UUID ownership, demo/profile separation checks, owner write policies, and title/description bounds. Live `ideas` has seeded `demo_author_id` rows and only read policies, so authenticated idea writes need migration 017. `studos-media` is currently private without an upload size or MIME limit. The existing `academic-pdf-files` bucket is private and configured for PDF files up to 40 MiB. Study Hub tables and records remain untouched.

## Feature status

| Feature | Status | Evidence and limitation |
| --- | --- | --- |
| General text posts, tags, links, profile and date | Partially working | Post service writes Auth ownership and metadata; profile mapping uses `profiles`; create UI includes tags/links. Full mobile submission was not exercised against Supabase. |
| Optional post images | Partially working | Image selection and storage upload exist; client validation and a 10 MiB private bucket policy are in the app/migration. Migration is not deployed and device upload is unverified. |
| Ideas | Partially working | Submit form calls `ideas` with Auth UUID ownership and supports category, stage, skills, collaboration and links. Existing sparks/comments/requests are retained; live insert policy depends on migration 017. Owner edit/delete UI is missing. |
| Problems | Partially working | Composer saves title, description, context, expected solution, tags and link attachments; owner edit/delete is available. New columns depend on migration 017. |
| Projects / builds | Partially working | Project-specific GitHub/demo/technology/collaboration fields are persisted in post metadata. Screenshot support uses the post image flow. Authenticated round trip is unverified. |
| Help requests | Partially working | Create, status display, attachments and owner edit/delete are implemented against `help_requests`; new attachment column depends on migration 017. |
| PDF / Study Material | Partially working | Existing Share Resource screen supports Google Drive PDF URLs, academic metadata and rights confirmation; Study Hub preview/opening remains on its existing resources. Local PDF upload from the student composer is missing. |
| Survey / poll | Partially working | Native and external survey forms, poll card/results, authenticated RPC creation, and unique per-user votes are implemented. Poll tables and functions are local migration only; live flow is unverified. |
| General resource | Partially working | Students can publish HTTPS resource links in community posts and share Google Drive PDFs through Study Hub. A single generic resource form with document upload is missing. |
| Official Explore opportunity listings | Partially working | No official listing choice appears in the student Create menu; Explore continues to use approved integrations. Migration 017 adds restrictive policies for direct `posts` API inserts/updates, but those protections are not live until deployment. |
| Edit/delete ownership | Partially working | Post and community-record mutations are scoped to the signed-in Auth UUID in services and existing RLS. Cross-user behavior has not been exercised against live Auth accounts. |
| Feed, author and details | Partially working | Feed refreshes when returning from create routes; author mapping and post/poll details are wired. Device/web interaction has not been run end to end. |

No audited path is marked fully working because the submission flows and proposed database additions have not been deployed and tested together. No feature was conclusively classified as broken by static review; authenticated walkthroughs remain unavailable in this environment. The post owner editor currently covers title/body, and poll choices do not have an editor. PNG/WebP selections are now uploaded with a matching content type inferred from their filename when picker metadata is unavailable.

## Code and database changes

- Unified seven-option Create sheet and category-specific routes/forms.
- Idea insert and real Auth author profile mapping.
- Community post links, attachments, metadata, project fields, image validation and owner-scoped updates.
- Problem context/solution/attachments and Help Request owner editing/deletion.
- Native poll service, post feed card, details card, result aggregation and vote uniqueness.
- `backend/migrations/017_community_publishing.sql`: additive post/idea/problem/help columns; Auth-owned idea RLS; poll tables/RLS/RPCs; opportunity listing deny policies; and private community-media MIME/size limits.

Migration 017 does not rename, delete, truncate, or alter Study Hub resource tables. The prior rename migration 016 is separately idempotent and the live catalog already confirms the renamed relations exist.

## Not verified

- Local PDF picker/upload, PDF preview and direct-device attachment: not implemented in the composer.
- End-to-end authenticated create/edit/delete tests for each content type, vote duplication, cross-user owner attacks, and direct API Explore restriction: unverified because no disposable Auth test accounts were used and migration 017 is not live.
- Android and web visual/interactions: unverified.
- Migration 017 SQL execution: not performed. Apply through the normal reviewed migration workflow before relying on its new columns, tables, RLS, RPCs or storage configuration.

## Local checks (2026-11-12)

- `npm run lint`: passed.
- `npx tsc --noEmit`: passed.
- `npm test`: 57 passed, 4 skipped (opt-in authenticated integration tests); 0 failed.
- Live Supabase REST schema probe: unverified; requests returned HTTP 404, including `study_resources`.
