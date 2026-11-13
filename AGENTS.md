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
- Photo analysis runs in `src/lib/analyze.functions.ts` (auth-required server fn) calling the Google Gemini API directly with `GEMINI_API_KEY` via `src/lib/ai.server.ts`; why: user chose direct Gemini over the gateway; keeps the key server-side and blocks anonymous AI spend.
- Validate photo/symptom inputs and Gemini JSON with `src/lib/analysis-schema.ts`; why: incomplete model output must not be converted into usable medical advice.
- All UI text lives in `src/lib/i18n.tsx` (en/es dictionaries); why: every screen and AI reply must follow the language toggle.
- Photo paths starting with `/` are static demo images; others are private `photos` bucket paths under `{userId}/`.
- Profiles are created by the auth signup trigger and are owner-readable/updatable only; why: profile provisioning must not depend on a confirmed browser session.
- Wound checks must reference an owned wound and an owned photo path; why: row ownership alone does not validate linked resources.
- Clear the query cache on account identity changes; why: previous-account history must never remain visible after switching users.
