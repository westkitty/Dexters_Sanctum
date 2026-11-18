# Dexter's Sanctum

**A living miniature universe. Questionable management.**

This repository is the home of **The Unreasonable Little Universe**, a cinematic, interactive, static browser experience starring **Dexter the Furious Little Stinkweasel**.

The finished app is a beautiful, explorable floating island: luminous water, a waterfall into the stars, a warm cottage, flowers and lanterns, an enormous draggable moon, editable constellations, environmental reactions, and four animated cosmic mishaps. Dexter autonomously patrols and judges the entire operation.

## Build instructions for Codex

1. Read [AGENTS.md](AGENTS.md) and [CODEX_TASK.md](CODEX_TASK.md) in full.
2. Follow [docs/DEXTER_VISUAL_CONTRACT.md](docs/DEXTER_VISUAL_CONTRACT.md) and the reference image handoff described in `public/references/README.md`; **this is Dexter, not a generic pet**.
3. Implement and test the complete production-ready app, not a mockup.
4. Stage, commit, and push the finished app to `westkitty/Dexters_Sanctum` on `main` after all checks pass.
5. Verify that GitHub Pages builds and deploys, and report the live URL and deployment evidence.

This repo is intentionally static-host friendly. The app should run locally with `npm ci && npm run dev` and build with `npm run build`. The Pages workflow deploys `dist/` when application files are pushed to `main`.

## Important boundaries

- Preserve the supplied artwork's identity and detailed markings.
- Do not add accounts, backends, telemetry, streaks, therapy dashboards, or engagement-pressure mechanics.
- Keep optional audio muted until the user enables it.
- No spiders or spider-like creatures.
- Do not claim a successful deploy, responsive proof, or exact character fidelity without testing.

See the detailed spec for all interaction and acceptance criteria.

## Local development and browser checks

Use Node 22.18 or later for local development and tests. Run `npm ci`, then `npm run dev` and open the repository subpath shown by Vite. `npm test` checks incident timing and the postcard formats. `npm run build` type-checks and builds the version served by Pages. For browser checks, run `npx playwright install chromium` and then `npm run test:browser`. Set `CHROMIUM_PATH` to use a system Chromium instead.

Drag the moon directly or choose a tool in the bottom bar. Press D for a Dexter portrait and drag to change the angle. Sound starts off each time. **Postcard** downloads the current camera view as a PNG. **Link** copies the living view or lets you preview and reopen an original Sanctum PNG. Opening a postcard restores the moon, island orbit, and drawn stars. **Return to previous view** brings back the island view from before the last PNG was opened. Both formats work without an account or upload. Image services that remove PNG metadata can leave the picture intact while removing its saved view.

The Pages workflow runs unit tests, the production build, and the Chromium regression suite before deploying.
