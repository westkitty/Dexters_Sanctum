# One-shot Codex build and publish contract

## Goal
Implement **The Unreasonable Little Universe — Dexter's Sanctum** as a complete, exceptionally beautiful, standalone browser-based miniature universe. Deliver it to this repository and deploy it through GitHub Pages. The user should experience wonder and mischief without being asked to work, heal, journal, collect streaks, or complete objectives.

## Scene / art direction
The initial frame must look like a finished animated film miniature, not a Three.js tech demo: asymmetric richly modeled floating island over a celestial ocean; richly composed cottage with amber-lit windows; turquoise luminous waterfall cascading into stars; reflective pools; sculpted stone; layered moss, trembling grasses, luminous flowers, small bridges, lanterns; deep-indigo nebula distance, drifting mist and clouds; enormous expressive moon; coordinated cinematic key/fill/rim, directional shadows, controlled bloom, painterly material variation, atmospheric perspective. Palette: midnight indigo, violet, turquoise, honey-gold and restrained coral. Favour strong silhouettes, staging, detail variety, warm/cool contrast and restrained spectacle over excessive particles, default primitives and cards.

## Dexter
The entire scene belongs to **Dexter the Furious Little Stinkweasel**. Follow `docs/DEXTER_VISUAL_CONTRACT.md` and the **actual** uploaded reference. Implement a recognizable, physically expressive *quadrupedal floppy-eared* animated Dexter. He autonomously patrols, sniffs, stops at overlooks, sits, occasionally lies down, investigates, reacts to world events and issues occasional dry remarks like “Gravity has been warned” and “That star was not authorized.” Use sparingly, with a silent default. If reference image is unavailable to the executor, require it as an input rather than inventing art. Original art must ship inside the repository.

## Five interactions, no fake controls
1. **Move the moon:** pointer/touch drag constrained to celestial arc changes real key light, shadows, sky color and water reflection; Dexter reacts.
2. **Paint constellations:** click/drag star placement and elegant line connections in open sky; environmental light response; accessible alternative for touch/keyboard.
3. **Awaken garden:** hit-test plants/lanterns/cottage, spawn spatially located flowering/light/reactive fireflies.
4. **Touch water:** cast to actual water surface, animate positioned concentric ripples and submerged reaction.
5. **Make trouble:** one discreet control triggers *four distinct authored sequences* with start, escalation, payoff and reset: moon sneeze/star shower; lantern parade; temporary loss of gravity lifting loose props and Dexter; absurd comet with pompous inspection notice. Avoid stacked event corruption and leaked temporary resources.

## The world is alive
Autonomous clouds, water, plant sway, lantern changes, subtle moon drift, Dexter behavior, and rare ambient surprises. Movement should be varied, not synchronized, and absence should never be punished. On launch: interactive immediate scene, 0-3s cinematic establish, 3-10s Dexter emerges/inspects, 10-20s coherent environmental moment, 20-30s subtle discovery cue. No forced onboarding.

## Product interface
Discreet responsive over-scene UI: Make trouble, sound toggle, quality preset, save postcard, small contextual help. Polished accessible typography and keyboard/focus/touch interaction; constrained camera orbit and parallax; avoid camera getting trapped. Capture working high-quality PNG (not black), optionally with tasteful title. Persist appropriate settings locally. Original synthesized or licensed bundled sound only; starts muted and avoids sudden transients. Respect reduced-motion preference with quiet transitions and minimal camera motion.

## Technology
Use Vite, TypeScript and Three.js. Modular scene, terrain, sky, water, vegetation, Dexter rig and state machine, picking, interactions, events, audio, settings and capture. Efficient batching/instancing, bounded effects, resource disposal, visibility handling, resize, pixel ratio limits, quality presets and honest fallback on WebGL failure. Works after npm install locally and as static GitHub Pages content. Avoid backend/auth/network runtime dependencies, secrets, telemetry, spiders, intrusive UX and unnecessary libraries.

## GitHub Pages — delivery is mandatory
Repo: `https://github.com/westkitty/Dexters_Sanctum`, branch `main`.
Use `base: '/Dexters_Sanctum/'` in Vite (or verified equivalent), absolute-path-safe assets, and an Actions deployment workflow using `actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages` and official Node setup. Ensure `dist/index.html` and JS/assets resolve through the repository subpath. GitHub repo Settings > Pages must have **Source: GitHub Actions**; if not configured and unable to change via available tools, explicitly identify this blocker. Never silently switch to an unrelated repository or fallback site.

## Implementation / proof
1. Verify target remote, main branch/head and current files; read `AGENTS.md`, this file, the reference and contract.
2. Build a **complete functional scene** in one cohesive pass. Do not substitute a moodboard, generic app shell, or written proposal.
3. Run `npm ci` when a lockfile exists; otherwise install and commit a lockfile. Run tests/build and launch a real browser.
4. Verify desktop approximately 1440x900 and mobile 390x844; capture and inspect images if browser tools exist. Test every control, all four incidents, touch/keyboard, WebGL fallback, reduced motion, postcard output, no console errors, and resource stability during repeated incidents. One focused repair pass if needed.
5. Review changed files, stage, commit, and push to `main` (explicitly authorized). No force push or unrelated mutations. If remote main moved, fetch/reconcile carefully; stop rather than overwrite unrelated work.
6. Check GitHub Actions deploy outcome and read the actual Pages URL, expected `https://westkitty.github.io/Dexters_Sanctum/`. Test loaded HTML and assets; report a failure if configuration or permissions block publication.

## Definition of done
Opening the URL renders a beautiful coherent 3D miniature with *recognizable, animated Dexter*; all five interactions and four cosmic incidents work; mobile/reduced-motion/audio/capture work; production build passes; project source and original reference are committed and pushed; a working GitHub Pages URL is verified.

## End report
Report exact commit SHA, files changed, tests/runtime proof, screenshots if produced, Pages Actions result and live URL, plus unverified areas and blockers. Do not say complete if any mandatory milestone remains unverified. Do not expose secrets.
