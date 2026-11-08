# STUDOS idea experience design decision

## Oil UI exploration

Compared three mobile card structures at 390 × 844 using Oil UI's offline explorer and screenshot tool. The shared placeholder copy and counts marked “—” are layout-only; they are not STUDOS records.

| Direction | Hierarchy and interaction | Trade-off |
|---|---|---|
| Editorial | Long title and explanation lead; metadata and engagement recede | Best reading rhythm, less familiar at feed glance |
| Social discovery | Student identity first, wrapped title and preview, compact labels, direct Spark/comment/save row | Keeps familiar scanning and interaction while giving the idea enough room |
| Collaboration-first | Roles, application surface, and request action lead | Makes joining obvious but crowds the proposal and implies backend support that does not exist |

Selected: **Social discovery with editorial copy treatment.** The card keeps a social author header and familiar actions, while title and explanation use larger type, longer line-height, and natural card height. Collaboration status stays a small, data-backed note. The details view becomes a long-form proposal with a clear discussion area.

Preview comparison: `.oil-ui/idea-redesign/shots/sheet.png` (three alternatives). Source pages and manifest are in `.oil-ui/idea-redesign/explore/`.

## Data and capability audit

- The current app routes student Ideas through `student_ideas` and `student_ideas_feed`, with sample authors from `student_profiles` and authenticated actions in `student_idea_live_*` relations. See [the migration map](supabase-table-migration-map.md).
- The live schema and policies remain unverified because the project `.env` has an empty `EXPO_PUBLIC_SUPABASE_ANON_KEY`. The frontend keeps sample student identities separate from `profiles` and uses the signed-in Auth ID for live actions.
- Spark, comment, and active collaborator totals prefer the feed view's counts and fall back to the sample and live interaction rows. Comments remain scoped to the selected idea.

## Visual/interaction acceptance notes

- The feed card has dynamic height and no required image; title/body navigation opens the details route, and author navigation uses the author's real identity.
- Details preserve all proposal text, separate skills/topics, validate external links before opening, and provide keyboard avoidance and comment retry/error states.
- Idea collaboration requests are inserted as pending records in `student_idea_live_requests`; the frontend does not implement request approval. Server-side owner/moderator approval and RLS need live schema verification before release.
- Web comparison screenshots passed the Oil screenshot runner's console, image-load, and horizontal-overflow checks. These are HTML layout exploration previews, not Android screenshots or app-device verification.
