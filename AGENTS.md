<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- The follow-up page derives source alerts, quality counts and activity search from the existing public dataset; it never fetches or persists private volunteer fields.
- Google Sheets is the source of truth; the app only reads it through the Google Sheets connector in `src/lib/dashboard.functions.ts` — never write to the source sheets (user must authorize any write).
- The list of connected spreadsheets lives in the `data_sources` table, so new years/files need no code change.
- Tabs are classified by their content/name in `src/lib/sheets/process.ts` (pure, unit-tested), not by the source's category.
- Public data (`getDataset`) strips personal fields; individual volunteer profiles come only from auth-protected server functions in `src/lib/access.functions.ts`, filtered by `canSeeCenter`.
- Roles live in `user_roles` (admin / center_manager / viewer) and center scopes in `user_center_access`; role writes go through admin-checked server functions. First signup becomes admin.
- The AI assistant receives only aggregated, permission-filtered context — never raw personal fields.
- The live goals presentation (`/presentation`) is derived from the newest-year Master Plan via pure `src/lib/sheets/deck.ts`; slides follow the sheet's goals, so no slide content is hard-coded.
- The presentation's default activity mode uses the reference catalog for labels only and pure `activity-deck.ts` for public Sheets aggregates and automatic unknown-type discovery; missing metrics stay null to avoid invented figures.
- Presentation photo overrides use browser-local IndexedDB, keyed by plan year, goal and item; they never write to Sheets or imply cross-device sharing.
- A failed Sheets read keeps serving the last good copy of that file and retries within a minute (`fetch.server.ts`), so a Google quota error never blanks the dashboard.
- Authentication and password recovery render independently of Sheets and the dashboard shell, so unavailable source data cannot block account access.
- Authentication destinations use the shared local-path sanitizer; ordinary sign-in defaults to the public home, explicit return paths travel through the public OAuth callback, and obsolete OAuth intent is cleared after completion or sign-out to prevent unintended administration redirects.
- All account controls share the `useAccess` query shape and the single root identity listener; sign-out cancels queries and clears private caches before ending the session.
- Source imports and mappings are administrator-validated configurations; raw imported grids and durable last-good Sheets caches remain private so public datasets expose only safe summaries.
- Apply selected columns and inclusive per-tab date windows through the shared mappedGrid for both public summaries and protected reads; calculate participation duration from timestamps before reported hours and flag discrepancies without approving them.
- Volunteer identity uses valid national IDs or codes, never name-only merges; source row fallbacks are provisional, while resolved identities receive persistent UUIDs.
- Individual participations use protected center-scoped reads and explicit attendance/approval fields; form validation metadata never approves hours.
- Quality diagnostics use public aggregate counts and protected individual queries; audit history is admin-only and external observations do not claim editor identity.
- Site-wide background photos come from admin-configured Google Drive folders (`photo_folders`, read via the Drive connector, refreshed every 5 minutes) plus activity-sheet photos, matched to activities by shared words in `src/lib/photo-match.ts`; manual presentation overrides take precedence. Drive images are served only through `/api/public/drive-image/$id`, which verifies the file sits in a configured folder.
