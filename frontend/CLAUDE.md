# CLAUDE.md — Frontend (frontend/)

Guidance for Claude Code when working in `frontend/`. See root `CLAUDE.md` for cross-cutting architecture (the classic vs group_stage fork, known gotchas).

## Commands

```bash
npm run dev      # Vite dev server, port 5173
npm run build    # production build
npm run lint      # eslint . — run after every change, this is the only automated check
npm run preview
```

No test runner configured. `npm run lint` is mandatory after edits — this repo uses the React Compiler ESLint plugin, which flags manual-memoization mismatches and `setState`-in-effect patterns; some pre-existing files have known, unfixed warnings (e.g. `PodiumDuelCard.jsx`), so when linting check that you haven't introduced *new* errors rather than expecting a clean run.

## Stack

React 19 + Vite + Tailwind CSS v4, react-router-dom v7, Material UI (dialogs/tables), Axios, dnd-kit (schedina drag-reorder), Sonner (toasts), lucide-react (icons).

## Structure

```
src/
├── pages/                 route-level components (TournamentDetail.jsx is the largest — admin + player views in one file, branched heavily on tournament_format and isAdmin/adminModeOn)
├── components/
│   ├── tournaments/       19 components — GroupManagementSection.jsx (group_stage admin), GroupPlancia.jsx (per-girone standings, exports GroupCard), PodiumDuelCard.jsx (generic duel UI, wrapped by ClassicPodiumDuelCard.jsx / FinalsPodiumDuelCard.jsx), WinnerFinalizeCard.jsx (decree winner + tie-block warnings)
│   ├── cards/              PowerCard.jsx (card visual, both grid and mini modes)
│   └── common/              ApiBanner, CircuitThumbnail (circuit thumbnail with hover zoom + tooltip), NotificationBell
├── context/
│   ├── AppDataContext.jsx  client-side computed standings (buildTournamentDetails) — see root CLAUDE.md gotcha on tournament.standings scope
│   └── AuthContext.jsx
├── lib/groupStage.js       groupLabel/groupColor/isPodiumDuelKey/findPlayerGroup — the canonical place to recognize a girone/semifinal/duel group_name string; keep in sync with backend's dynamic `duello_podio_<n>_<m>` naming
└── services/apiClient.js   every backend call, organized by domain object (tournamentsApi, schedineApi, schedineDeluxeApi, inventoryApi, statsApi, ...)
```

## Asset system — sprite sheets + CDN

- **Circuiti MKDS**: `image_url` viene dal CDN (`textures.spriters-resource.com/media/asset_icons/{folder}/{id}.png`), non da asset locali. `CircuitThumbnail.jsx` ha `onError` fallback a `buildCircuitPlaceholder`. `getCircuitImage(circuit)` in `index.js` restituisce `circuit?.image_url` direttamente.
- **Mugshots**: `frontend/src/assets/images/mkds/mugshots.png` (862×75, 12 personaggi). `CHARACTER_OFFSETS[name]` in `mugshots.js` dà l'indice frame (0-11). Usare CSS `background-image` + `background-size: 1200% 100%` + `background-position: ${(idx/12)*100}% 0%` per estrarre un frame.
- **Items**: `frontend/src/assets/images/mkds/items/items.gif` (643×66, 18 frame). `getItemBackground(itemKey)` in `items.js` restituisce background shorthand. `getItemBackground("star")`, `getItemBackground("spinyShell")`, `getItemBackground("itemBox")`, ecc.
- **Overlay sprites**: `GlobalCelebrationOverlay.jsx` usa `ItemSprite` (inline component) per rimpiazzare ⭐/🌀/📦 con frame da items.gif, e `<div>` con `backgroundImage` + `backgroundPosition` per mostrare mugshots al posto delle icone personaggio.

## Overlay animation notes

`GlobalCelebrationOverlay.jsx` anima 7 fasi (`idle`→`thankyou`→`derapata`→`blueShell`→`countdown`→`winnerReveal`→`winner`) via CSS keyframes in `index.css`. Le particelle con valori random sono generate in `useMemo`. Stati visivi extra: `isRouletteSpinning`, `drumrollActive`, `showPhaseFlash` (flash bianco tra fasi), `shellAnim` (`'intro'`/`'impact'` per blue shell).

Nuove animazioni aggiunte di recente in `@theme inline`:
`animate-confetti-spiral`, `animate-sparkle-trail`, `animate-particle-fountain`, `animate-avatar-reveal-ring`, `animate-rubber-stripe-1/2`, `animate-rubber-glow`, `animate-golden-wipe`, `animate-spark-trail`, `animate-text-show-cycle`.

## Conventions worth following

- A `group_name` string identifies a girone, semifinal battery, or duel — always resolve its display label/color via `groupLabel()`/`groupColor()` in `lib/groupStage.js` rather than hand-rolling string checks, since the duel naming scheme includes a dynamic `duello_podio_<start>_<end>` form.
- When a component needs "the player's own" view of a group_stage tournament (their girone's standings, their phase's circuits), use `findPlayerGroup(tournament.format_data, playerId)` — see the `myCircuitsView`/`myStandingsView` pattern in `TournamentDetail.jsx`.
- Admin-only UI inside `TournamentDetail.jsx` is gated by `isAdmin && activeSection === '...'`, not by hiding/showing — read the `activeSection` tab-switcher before assuming a panel is reachable; a panel that exists in code but has no tab button is effectively dead code (this has happened before).
- Prefer extending an existing generic component (`PodiumDuelCard`, `GroupCard`) over forking it per-format — the classic/group_stage duplication already exists at the *data* layer (backend), don't duplicate it at the UI layer too.
- `Compare.jsx` (`/compare`, head-to-head) and `CircuitStats.jsx` (`/circuits`, per-circuit aggregates) are backed by `statsApi` (`app/controllers/tornei/stats.py`), not client-side computation over `AppDataContext` — `game_id` is a mandatory explicit filter in `Compare.jsx` (no default). `CircuitStats.jsx` fetches the cheap per-circuit list eagerly and lazily fetches the full player ranking (`components/stats/CircuitRankingTable.jsx`) only when a card is expanded (accordion pattern) — follow this lazy-detail-on-expand pattern for any future circuit-level drill-down rather than precomputing every circuit's full ranking upfront.
