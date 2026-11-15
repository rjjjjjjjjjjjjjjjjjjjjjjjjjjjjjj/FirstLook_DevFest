# FirstLook safety and guidance update
- [x] Reorder the check flow and add description, risk factors, first-use acknowledgment, and insufficient-information handling.
- [x] Add emergency/self-harm text detection, tier-escalation rules, warning/24-hour guidance, and "It's getting worse" actions.
- [x] Save each check's inputs, AI output, triggered rules, and timestamp.
- [x] Add an optional owner-only My Health Profile with pre-fill/opt-out and data deletion.
- [x] Add result cost estimates, insurer questions, emergency cost messaging, and uninsured low-cost options.
- [x] Update bilingual copy, tests, and verify the core flows in the preview.
- [x] Replace the Gemini integration with the AWS analyze endpoint for both checks and two-photo comparisons, keeping the front end and response shape unchanged.
- [x] Verify live AWS results in the preview: single check, follow-up comparison, and the fixed failure message path.

# Reference design and mobile adaptation
- [x] Recreate the reference sidebar, breadcrumb, dashboard, upload area, and log cards with phone-friendly stacking.
- [x] Apply the same visual system to screening, results, history, and additional workspace pages without invented medical or provider data.
- [x] Verify navigation and screening handoff on desktop and narrow phones.
