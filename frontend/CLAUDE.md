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
│   ├── tournaments/       24 components — GroupManagementSection.jsx (group_stage admin), GroupPlancia.jsx (per-girone standings, exports GroupCard), PodiumDuelCard.jsx (generic duel UI, wrapped by ClassicPodiumDuelCard.jsx / FinalsPodiumDuelCard.jsx), WinnerFinalizeCard.jsx (decree winner + tie-block warnings)
│   ├── cards/              PowerCard.jsx (card visual, both grid and mini modes)
│   ├── community/          PlayerBadge.jsx, RoleBadge.jsx, PlayerTournamentHistory.jsx
│   └── common/              ApiBanner, CircuitThumbnail (circuit thumbnail with hover zoom + tooltip), NotificationBell, PlayerLink.jsx (player name → public profile link, reusable anywhere a nickname is shown), EditableContentImage.jsx (superadmin-uploadable image slot, e.g. the `/faq` page)
├── context/
│   ├── AppDataContext.jsx  client-side computed standings (buildTournamentDetails) — see root CLAUDE.md gotcha on tournament.standings scope; also loads the community-users list once for the whole session (backs `useCommunityUserNav`/`PlayerLink`, no per-component refetch)
│   └── AuthContext.jsx
├── hooks/useCommunityUserNav.js  `{ users, goToPlayerProfile(playerId) }`, sourced from AppDataContext — prefer `PlayerLink` for rendering, this hook for imperative navigation (e.g. row click)
├── lib/groupStage.js       groupLabel/groupColor/isPodiumDuelKey/findPlayerGroup — the canonical place to recognize a girone/semifinal/duel group_name string; keep in sync with backend's dynamic `duello_podio_<n>_<m>` naming
├── lib/playerBadges.js     BADGE_TIERS/BADGE_TIER_RANK/pickBestBadge() — per-game_id player level badges; PROFILE_CARD_STYLES/getProfileCardStyle() — "special card" styling (gold/blue border+bg+avatar+icon) for the 3 top tiers only
├── lib/roleBadges.js       ROLE_BADGES — account role badges (superadmin/admin/user), same visual language as playerBadges but a different concept
└── services/apiClient.js   every backend call, organized by domain object (tournamentsApi, schedineApi, schedineDeluxeApi, inventoryApi, statsApi, contentImagesApi, ...)
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
- Player badges (per-`game_id` level: LEGGENDA/CAMPIONE/VETERANO/OUTSIDER/SFIDANTE/ESORDIENTE) come from `statsApi.playerBadges(playerId)`, never computed client-side. `lib/playerBadges.js` maps the backend `tier` code to icon/palette (`BADGE_TIERS`) and exposes `pickBestBadge()` to choose the highest-rank badge across games; `components/community/PlayerBadge.jsx` renders one badge and always pairs it with the game name (a tier alone is ambiguous across games). Consumed by `CommunityUserPage.jsx`, `ProfileDashboard.jsx`, `Stats.jsx`/`PodiumSteps.jsx` (only for the 1st-place podium card, only when a specific `game_id` is filtered — a "Tutti i giochi" placement-index leader isn't necessarily a tournament winner, so no badge is shown there), and `HallOfFame.jsx` (the latter only swaps its Crown styling for the "leggenda" tier when a specific `game_id` is filtered).
- The "special profile card" gold/blue styling (highlighted border+background, avatar ring, icon badge overlay — `ProfileDashboard.jsx`, `CommunityUserPage.jsx`, `PlayerCard.jsx`/`Players.jsx`, `components/layout/Hero.jsx`) is driven by `getProfileCardStyle(bestBadge?.tier)` (`lib/playerBadges.js`), not by a binary "has won a tournament" flag — only `leggenda`/`campione`/`veterano` return a style (Crown/gold-shimmer, Trophy/gold, Star/blue respectively), everything else (including no badge) returns `null` and falls back to the normal, non-highlighted look. Superadmins have no `Player`/badges — per-`game_id` tiers don't apply to an account that doesn't play, so they get no card styling at all (`effectiveCardStyle = cardStyle`, `null` when there's no badge), same as any other badge-less account; this used to fall back to a fixed gold "leggenda" treatment via a separate `isSuperadmin` check, removed as intentionally out of scope for an account role. When adding a new component with this same "champion card" look, reuse `getProfileCardStyle` rather than re-deriving a boolean from `tournamentWins`.
- Account role (User.role) has its own parallel badge system — `lib/roleBadges.js` (`ROLE_BADGES`: superadmin/admin/user) + `components/community/RoleBadge.jsx` — same pill visual language as player-level badges but a different concept (no `game_id`, exactly one role per account). Used in `CommunityUserPage.jsx` and `ProfileDashboard.jsx`'s profile header.
- Whenever a player nickname is rendered anywhere in the UI, wrap it in `<PlayerLink playerId={...}>` (or `userId={...}` when the source data is already a `User.id`, e.g. schedina rows) instead of plain text — it's a real `<Link>` to `/community/user/:id` with zero per-instance fetch cost (backed by the community-users list already cached in `AppDataContext`). It resolves to a non-interactive `<span>` if the player has no linked account, so it's always safe to use. Don't nest it inside another interactive element (`<button>`) — invalid HTML and click conflicts; restructure the surrounding markup instead.
- Static-content images the superadmin should be able to replace (e.g. the founding photo on `/faq`) go through `contentImagesApi` (`app/controllers/utenti/content_images.py`, `site_content_images` table keyed by an arbitrary string) + `<EditableContentImage contentKey="...">` — new slots need no backend change, just a new `contentKey` string. Don't hardcode a static asset for content an admin is expected to update.
