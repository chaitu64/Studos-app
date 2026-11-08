# STUDOS screen completion checklist

Audited from `src/app` on 2026-11-06. The app now has 41 route/layout files: 39 screens and 2 layouts. `/(tabs)/discover` is a legacy alias of Explore. “Verified” below means source inspection only unless a verification method is stated; no Android device rendering or authenticated live-backend run has been performed for this audit.

## Route inventory

| Route | Purpose / data source | Audit findings and required work | Implementation | Verification |
|---|---|---|---|---|
| `/` | Welcome and first-use entry | Added STUDOS introduction and links to existing auth screens | Implemented | Source review + 390 px web screenshot |
| `/(tabs)` | Main tab navigator | Four visible destinations; Chat/Create are hidden routes; confirm safe-area and accessible labels | In progress | Source audit |
| `/(tabs)/index` | Home feed, posts, discovery, Study Hub; Supabase posts/resources and app context | Discovery sections interrupt feed; post actions were not wired; verify demo labeling and pagination | In progress | Source audit |
| `/(tabs)/explore` | Student and content discovery; Supabase plus app collections | Large, dense screen; filters/results/errors/pagination need review | In progress | Source audit |
| `/(tabs)/discover` | Legacy Explore alias | Retain deep-link compatibility; avoid duplicate UX | Audited | Source audit |
| `/(tabs)/swipe` | People, ideas, teams, services discovery | Large screen; verify profile-only actions, real/demo distinction, text clipping, accessible alternatives | In progress | Source audit |
| `/(tabs)/profile` | Current student portfolio | Large screen; verify current identity, edit/save behavior, privacy, data-backed portfolio | In progress | Source audit |
| `/(tabs)/chat` | Conversation list | Uses app context; demo-style list, loading/error/refresh and type filters need validation | In progress | Source audit |
| `/(tabs)/create` | Creation hub | Audit all destinations and action availability | Pending | Not visually verified |
| `/login` | Email and Google authentication | Shared AuthScreen; inline status and theme alignment improved; Supabase auth flow not exercised | Partial | 390 px web screenshot; no live sign-in |
| `/signup` | Registration and verification | Shared AuthScreen; form grouped by name and studies; validation exists; email verification not live-tested | Partial | 390 px web screenshot; no live sign-up |
| `/forgot-password` | Password recovery | Shared AuthScreen; verify confirmation/error states | In progress | Source audit |
| `/reset-password` | Password reset | Shared AuthScreen; verify deep-link session and success navigation | In progress | Source audit |
| `/auth-callback` | OAuth/deep-link completion | Supabase callback handling exists; align loading UI with theme and verify actual OAuth flow | In progress | Source audit |
| `/post/[id]` | Community post details/comments | Detail route exists; verify missing-post behavior, comment loading and author navigation | In progress | Source audit |
| `/saved` | Saved content | Verify each supported entity, category and empty/error states | In progress | Source audit |
| `/notifications` | Notification center | Real data source exists; prior routing used hardcoded record IDs; route only from actual action URL | In progress | Source audit |
| `/search` | Global search | Supports student, post, idea, project, team, opportunity and room results; current records are searched locally rather than paged | Partially implemented | Source review |
| `/students` | Student directory | Supabase directory; free-text filters and responsive layout need refinement | In progress | Source audit |
| `/student/[type]/[id]` | Public student portfolio | Light-theme outlier; verify section links, privacy and dynamic empty sections | In progress | Source audit |
| `/chat-rooms` | Topic room directory | Loading starts false; join busy/error feedback and retry need review | In progress | Source audit |
| `/chat/[id]` | One-to-one conversation | Unknown IDs had a fabricated Maya fallback; actions/realtime/read-state need backend verification | In progress | Source audit |
| `/chat/room/[id]` | Topic room conversation | Theme outlier; safe-area/back, error/retry, and message refresh need review | In progress | Source audit |
| `/academic-library` | Academic PDF discovery | Server paging/search/filter/save/retry exists; compact-screen filters and a11y need review | In progress | Source audit |
| `/academic-library/[id]` | Legacy resource route | Redirect/compatibility route; confirm individual record opens viewer, never a Drive folder | In progress | Source audit |
| `/academic-library/viewer/[id]` | Individual PDF reader | Embedded viewer with loading/retry; actual rendering and page/zoom controls not verified | In progress | Source audit |
| `/resource/[id]` | Shared resource details | Verify actual PDF link, save/report behavior and missing record state | In progress | Source audit |
| `/share-resource` | Share/edit study resource | Form and validation exist; keyboard, rights acknowledgement and submit feedback need review | In progress | Source audit |
| `/ideahub` | Student idea feed | Uses `student_ideas_feed` with `student_ideas` fallback; requires live-schema verification | Partial | Source review; anon key unavailable |
| `/ideahub/submit` | Create a student idea | Persistence is paused pending live `student_ideas` write-column and authorization verification | Blocked | Source review; anon key unavailable |
| `/ideahub/[id]` | Student idea details/comments | Uses student profile authors, Spark/comment/request tables, and accepted memberships; verify live RLS and approval flow | Partial | Source review; anon key unavailable |
| `/projects` | Standalone Projects | Removed from navigation and app routes | Removed | Source review |
| `/projects/create` | Publish Project | Removed from creation actions and app routes | Removed | Source review |
| `/projects/[id]` | Project details | Removed from app routes | Removed | Source review |
| `/teams` | Team discovery | App collection; check filters, pagination and membership truthfulness | In progress | Source audit |
| `/teams/create` | Recruit teammates | Verify form validation and owner attribution | In progress | Source audit |
| `/teams/[id]` | Team details and applications | Team applications, owner accept/decline, membership insertion, and lead messaging are wired to existing schema; test authenticated roles | Partial | Source review; backend not live-tested |
| `/opportunities` | Opportunity discovery | External/cache-backed data; verify dates, status, filters and saves | In progress | Source audit |
| `/opportunities/[id]` | Opportunity details | Large, dense screen; review deadline accuracy, links, save/error/loading behavior | In progress | Source audit |
| `/leaderboard` | Student contributions ranking | Verify real data source, empty states and ranking semantics | In progress | Source audit |
| `/settings` | Account, privacy, preferences, help | Toggles were local only; StuDos ID/verification were fabricated; cache action did not clear cache | In progress | Source audit |

## Missing routes / explicit gaps

- No separate native splash-screen configuration or post-registration profile-completion step was found. Signup itself captures student details; `/` now provides the welcome/first-use introduction.
- Migration `002_studos_application.sql` defines protected tables/policies for idea votes/comments/saves, project likes/saves, team applications/members, conversations/messages, chat rooms, and notifications. Service methods now use these existing objects; authenticated RLS behavior has not been exercised in this environment.
- Source search did not find a floating gear/debug overlay component; only standard profile settings icons exist. Since the referenced Android screenshot was not attached here, its exact origin remains unconfirmed.
- Auth, Google OAuth, email verification, password recovery, session restoration, chat authorization, and in-app PDF rendering have not been live-verified in this environment.
- A read-only REST check with the configured anon key succeeded, but returned zero PDF rows visible to that role; authenticated PDF data could not be verified.
- No supplied Android screenshots were present in the workspace during this pass, so the floating blue gear cannot yet be attributed to app code or external tooling by screenshot comparison.

## Cross-screen design and interaction findings

- Existing semantic dark/light tokens and reusable primitives are present. A few routes still use hardcoded colors and diverge from the shared theme.
- Large high-density routes include Explore, Profile, Swipe, and Opportunity detail.
- Notification and team actions contained hardcoded IDs; search error handling concealed failures; several controls lacked accessible state/labels.
- Social feed card like/comment/save callbacks were not connected on Home. Several “more” or chat controls appeared interactive without a supported action.

## Progress log

- [x] Enumerate every route and layout file.
- [x] Audit route structure, auth guards, feature services, and shared components.
- [x] Record backend capabilities and missing onboarding routes.
- [x] Add welcome entry and retain the current auth/session flow.
- [x] Remove hardcoded notification destinations and unsupported settings claims.
- [x] Connect Home feed post like/save/comment controls and remove a dead card menu.
- [x] Remove the fabricated chat persona fallback; show an unavailable state for unknown conversations.
- [x] Remove the team detail's hardcoded conversation destination.
- [x] Suppress duplicate/default route headers on custom-header detail screens.
- [x] Add posts and projects to global search and show a retry state when student/room fetches fail.
- [x] Render and inspect welcome, login, and signup at a 390 px web viewport; save screenshots under `docs/screenshots/`.
- [x] Verify the Expo web route stack after removing duplicate route declarations.
- [x] Confirm the anon-key Study Hub query responds; no PDF records were visible to the anon role.
- [x] Run lint, TypeScript, and existing unit tests (results below).
- [ ] Complete remaining shared design and interaction fixes.
- [ ] Complete route-by-route implementation and visual audit.
- [x] Run lint and TypeScript checks after the service wiring changes.
- [x] Run existing automated tests after the service wiring changes.
- [ ] Inspect Android screenshots/device rendering where available.
- [ ] Update each route's implementation and verification status before completion.

## Verification results

- `npm run lint`: passed after the final service wiring changes.
- `npx tsc --noEmit`: passed after the final service wiring changes.
- `npm test`: 22 passed, 0 failed, 1 skipped (Supabase RLS integration requires authenticated credentials).
- `npx expo-doctor`: 20/20 checks passed.
- Expo web: bundled successfully; welcome, login, and signup loaded. A duplicate-stack-route runtime issue found during the first render was fixed and the route stack then loaded.
- Visual checks: web screenshots at a 390 px viewport for welcome, login, signup. These are mobile-width web screenshots, not Android device screenshots.
- Android: not available; `adb` is not installed.
- Supabase: anon read request succeeded; zero individual PDF rows were visible to the anon role. Authenticated records remain unverified.
