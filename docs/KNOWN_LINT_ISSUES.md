# Known pre-existing lint issues (frontend)

`npm run lint` in `frontend/` currently reports **69 problems (59 errors, 10 warnings)**. All of them pre-date the "Circuito" gaming redesign session (2026-07) — none were introduced by that work, which touched only styling (classNames, inline `style` for shadows). They are documented here as deferred debt, to be triaged and fixed in a future session.

Most of the errors come from the React Compiler ESLint plugin (`react-hooks/*` rules), which enforces the [Rules of React](https://react.dev/reference/rules) more strictly than plain `react-hooks/exhaustive-deps` did. `frontend/CLAUDE.md` already flags this: "some pre-existing files have known, unfixed warnings (e.g. `PodiumDuelCard.jsx`)".

## By file

### `src/components/common/GlobalCelebrationOverlay.jsx` — 52 problems (48 errors, 4 warnings)
The large celebration/confetti overlay component. Almost the entire error count of the codebase lives here:
- **`react-hooks/purity`** (44 errors, lines 62–131): every `Math.random()` call inside the `useMemo`-generated particle arrays (`starryBg`, `confettiRain`, `floatingElements`, `lateBurstParticles`, `coinConfetti`, `bgParticles`, `blueShellParticles`, `winnerFountainParticles`, `winnerSpiralParticles`, `winnerSparkleTrail`, `countdownRevealBursts`) is flagged as an impure call during render. Fix would mean seeding randomness outside render (e.g. via a ref populated in an effect, or `useState(() => ...)` initializer) — non-trivial given how many particle sets exist.
- **`react-hooks/set-state-in-effect`** (3 errors, lines 188, 288, 328): `setShellAnim('intro')` / `setPhase('winnerReveal')` called synchronously at the top of `useEffect` bodies.
- **`react-hooks/static-components`** (5 errors, lines 672, 690, 727, 1017, 1019): the local `ItemSprite` component (line 52) is defined with `useCallback` *inside* the component, so JSX that renders `<ItemSprite ... />` is flagged as "creating a component during render." Fix: hoist `ItemSprite` to module scope (it already takes all its inputs as props, via `getItemBackground`).
- **`react-hooks/refs`** (2 errors, lines 767, 985): `charactersByIdRef.current` read inside an inline IIFE during render.
- **`react-hooks/exhaustive-deps`** (4 warnings, lines 210, 301, 314, 444): missing deps (`leaderCharacterId`, `config`, `config.countdown`, and others).

### `src/components/tournaments/PodiumDuelCard.jsx` — 3 errors
Already called out by name in `frontend/CLAUDE.md` as a known-unfixed file.
- `no-unused-vars` (line 163): `loading` assigned but never read.
- `react-hooks/preserve-manual-memoization` (line 174): compiler couldn't preserve existing manual memoization.
- `react-hooks/set-state-in-effect` (line 208): synchronous `setState` in an effect.

### `src/components/tournaments/TournamentInfoPanel.jsx` — 2 errors
- `no-unused-vars` (line 72): `isAdmin` and `isSuperadmin` destructured but never used.

### `src/components/tournaments/RaceList.jsx` — 1 error
- `no-unused-vars` (line 2): `MapPin` icon imported but never used.

### `src/components/tournaments/GroupRaceForm.jsx` — 1 warning
- `react-hooks/exhaustive-deps` (line 223): `useEffect` missing `emptySlots` and `randomizeCircuit` deps.

### `src/components/tournaments/WinnerFinalizeCard.jsx` — 1 warning
- `react-hooks/exhaustive-deps` (line 138): `tiedOthers` logical expression could change the `useMemo` deps every render; suggested fix is wrapping `tiedOthers` in its own `useMemo`.

### Context files — 4 warnings (one each)
`src/context/CelebrationContext.jsx` (line 29), `src/context/NotificationsContext.jsx` (line 80), `src/context/SocketContext.jsx` (line 179), `src/context/UISoundContext.jsx` (line 83):
- `react-refresh/only-export-components`: each file exports both a component and non-component values (hooks/constants) from the same module, which breaks Vite Fast Refresh for that file. Fix would mean splitting the exported hook/constants into a separate file — a structural change, not a one-line fix.

### `vite.config.js` — 1 error
- `no-undef` (line 18): `__dirname` used without being defined — this file is likely running in an ESM context where `__dirname` isn't automatically available (needs `fileURLToPath(import.meta.url)` or the ESLint Node globals config updated).

## Notes for whoever picks this up

- Re-run `cd frontend && npx eslint . --format json` and diff against this file's counts before starting, in case something has drifted.
- `GlobalCelebrationOverlay.jsx` accounts for the large majority (52/69) of the total — fixing the `react-hooks/purity` violations there (via a ref-based RNG seeded in an effect) would be the single highest-leverage change.
- None of these affect `npm run build` — they are lint-only; the CI frontend lint job (`.github/workflows/ci.yml`) is intentionally set to `continue-on-error: true` because of this pre-existing debt.
