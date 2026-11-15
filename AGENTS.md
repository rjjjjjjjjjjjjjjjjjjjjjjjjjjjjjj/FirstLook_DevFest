<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Safety rules (emergency chips, fever + redness/pus floor, one-level risk bump, low-confidence bump, user-reported worsening) live in `src/lib/triage.ts` and run after every AI result; why: AI output must never lower a rule-based tier.
- Health profiles and first-use acceptance live in owner-only `profiles.preferences`; map only relevant risk flags into analysis requests; why: full medical profiles must never be sent to AI.
- Photo analysis runs in `src/lib/analyze.functions.ts` (auth-required server fn) calling the AWS analyze endpoint from `AWS_ANALYZE_URL` with the `x-api-secret` header from `AWS_API_SECRET`, via `src/lib/ai.server.ts`; why: user chose AWS for all AI, and both values must stay server-side.
- Map app input to the AWS body and the AWS reply back to the result in `src/lib/analyze-map.ts`; a worse or unclear compare verdict floors the tier at clinic; why: the endpoint contract and the tier floor must stay testable without network or secrets.
- Validate photo/symptom inputs and the AWS reply JSON with `src/lib/analysis-schema.ts`; why: incomplete model output must not be converted into usable medical advice.
- Every AWS failure (401, timeout over 20s, unreadable reply) returns the fixed "Something went wrong. Please try again." message and logs the real error server-side; why: the front end must never see provider details.
- All UI text lives in `src/lib/i18n.tsx` (en/es dictionaries); why: every screen and AI reply must follow the language toggle.
- Photo paths starting with `/` are static demo images; others are private `photos` bucket paths under `{userId}/`.
- Profiles are created by the auth signup trigger and are owner-readable/updatable only; why: profile provisioning must not depend on a confirmed browser session.
- Wound checks must reference an owned wound and an owned photo path; why: row ownership alone does not validate linked resources.
- Clear the query cache on account identity changes; why: previous-account history must never remain visible after switching users.

- Shared workspace navigation lives in AppShell; desktop reserves a fixed sidebar and phones use a closable drawer, while content remains fluid rather than forced to a phone aspect ratio; why: all screens must remain readable without horizontal scrolling.
- Dashboard screening drafts use the in-memory screening-draft handoff into the existing emergency-first flow; why: preserve safety gates without retaining unfinished medical details on shared devices.
- Workspace pages reuse existing owner-only profile preferences for insurance notes and existing screenings for reports; unconfigured wearable or provider services must be labeled unavailable rather than simulated; why: avoid invented health, network, and pricing claims.
- Nearby care search runs in `src/lib/places.functions.ts` (auth-required) via the Google Maps gateway; why: Maps credentials stay server-side and billable lookups need a signed-in user.
