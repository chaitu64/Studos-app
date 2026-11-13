# STUDOS Supabase table migration map

The table below records relation names before migration 016, from the earlier
consolidation work. The repository had no usable Supabase anon key during that
implementation, so deployed schema details could not be confirmed live.

## Relation rename in migration 016

The `student_` relation names below describe the pre-016 schema. Migration
`backend/migrations/016_rename_student_public_relations.sql` removes that prefix
from every matching public table and view, including interaction tables. App
queries and current diagnostics use the post-016 names. It renames the canonical
`student_profiles` relation to `profiles`; it does not create or restore the
retired legacy `profiles` table. `study_resources` and `study_resource_links`
are unchanged.

The migration has not been applied to the live database by this code change.

| Previous relation | Current relation | Active use |
| --- | --- | --- |
| `demo_student_profiles` | `student_profiles` | Student idea authors and sample student directory/profile pages |
| `demo_student_portfolio` | `student_portfolio` | Consolidated portfolio relation; no direct frontend query was present |
| `demo_student_content` | `student_content` | Sample profile content associations |
| `studos_demo_ideas` | `student_ideas` | Idea details and fallback feed source |
| `studos_demo_idea_actors` | `student_idea_actors` | Seeded sample collaborators |
| `studos_demo_idea_sparks` | `student_idea_sparks` | Seeded sample Sparks and totals |
| `studos_demo_idea_comments` | `student_idea_comments` | Seeded sample comments and totals |
| `studos_demo_idea_requests` | `student_idea_requests` | Seeded collaboration request records; moderation workflow not implemented in the client |
| `studos_demo_live_sparks` | `student_idea_live_sparks` | Authenticated Spark toggle; rows use the signed-in Auth user ID |
| `studos_demo_live_comments` | `student_idea_live_comments` | Authenticated comments; rows use the signed-in Auth user ID |
| `studos_demo_live_requests` | `student_idea_live_requests` | Authenticated pending collaboration requests |
| `studos_demo_live_collaborators` | `student_idea_live_collaborators` | Accepted authenticated collaborators only |
| `studos_demo_ideas_feed` | `student_ideas_feed` | Preferred feed source; falls back to `student_ideas` if the view is missing or inaccessible |
| — | `student_services` | Active Home and student profile services |
| — | `study_resources` | Individual PDF feed, filtered by file name, PDF link, and matching Drive file ID |
| — | `profiles` | Auth-linked real users, profile editing, post/team authorship |
| — | `posts`, `teams`, `reports`, `leaderboard` | Existing supported app features retained |
| `ideas`, `idea_sparks`, `idea_comments`, `idea_collaboration_requests`, `idea_collaborators` | No active client target | Legacy generic idea queries removed from active Idea Hub/comment paths |
| `projects` | No active client target | Standalone Projects routes and API calls removed; database tables were not changed |

The identity resolver maps `profiles.auth_user_id` to a real Auth identity and
uses `profiles.id` for sample student identities where `auth_user_id` is null.
It never substitutes a sample profile UUID for `auth.uid()`.
