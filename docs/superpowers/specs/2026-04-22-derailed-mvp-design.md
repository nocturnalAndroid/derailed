# DeRailed — MVP Design

*Date: 2026-04-22*
*Source GDD: `docs/derailed_gdd.md`*

## 1. Purpose & Scope

Build a minimal playable prototype of DeRailed using plain web technologies (SVG + vanilla TypeScript + Vite), playable on mobile. Delivered in three incremental phases with stop points for playtesting between them. No game engine.

The goal of the MVP is to prove the core moment-to-moment feel: can the player rotate pre-placed hex tiles fast enough to stay ahead of an advancing train? Everything beyond that is deliberately deferred.

## 2. Tech Stack

- **Rendering:** SVG (DOM), CSS transforms for rotation animation.
- **Language:** TypeScript.
- **Build:** Vite.
- **Tests:** Vitest (unit tests on pure game logic).
- **No runtime dependencies** beyond the above.

### Why SVG

Tile art in the GDD is already vector-shaped; CSS transforms give GPU-accelerated rotation animations for free; tap events attach directly to SVG elements; debuggable via browser inspector; tiny bundle. At the tile counts we care about (tens), SVG has no performance concern on mobile.

### Long-term ceiling

SVG handles everything the MVP needs. If the game later evolves toward heavy particle effects or shaders, the escape hatch is a Canvas overlay on top of SVG (cheap to add) or a renderer swap to PixiJS (isolated to `renderer/` thanks to the boundary in §3).

## 3. Module Architecture

```
src/
├── game/               ← pure game state, no DOM
│   ├── hex.ts              axial coords, neighbor math
│   ├── tiles.ts            tile types, connectivity table
│   ├── board.ts            Map<HexCoord, Tile>, seeding, rotate(), lock()
│   ├── train.ts            computeNextStep(board, train)
│   └── state.ts            GameState, tick(dt), phase transitions
├── renderer/           ← SVG; reads GameState, writes DOM
│   ├── svg.ts              initial layout, element refs
│   ├── tile-art.ts         per-type SVG path definitions
│   └── update.ts           per-frame DOM mutation
├── input/              ← DOM events → game actions
│   └── tap.ts              tap-to-rotate dispatcher
├── main.ts             bootstrap + rAF loop
└── index.html
```

**Renderer boundary:** `game/` never imports from `renderer/` or touches the DOM. The renderer reads `GameState`; input dispatches actions into the game. Renderer swap (e.g. Canvas, PixiJS) is isolated to `renderer/`.

## 4. Data Model

```ts
type HexCoord = { q: number; r: number };
type Edge = 0 | 1 | 2 | 3 | 4 | 5;   // clockwise

type TileType =
  | 'straight' | 'bend' | 'double-bend' | 'cross-2' | 'cross-3'  // phase A
  | 'station'                                                      // phase B
  | 'switch-l' | 'switch-r';                                       // phase C

type Tile = {
  type: TileType;
  rotation: Edge;           // 0..5 in 60° steps
  locked: boolean;          // true once train has entered
  switchState?: 'A' | 'B';  // phase C only
};

type Connection = { edges: [Edge, Edge]; length: number };

type Train = {
  tile: HexCoord;       // tile currently being traversed
  entryEdge: Edge;      // edge the train entered through
  exitEdge: Edge;       // edge it will leave through (resolved at tile entry)
  progress: number;     // 0..1 across current connection
  speed: number;        // track-units per second
};

type Phase = 'pre-game' | 'running' | 'derailed';

type GameState = {
  board: Board;         // wraps Map<string, Tile>; API takes HexCoord
  train: Train;
  phase: Phase;
  headStartMs: number;  // counts down during pre-game
  score: number;        // phase C onward
};
```

`board.ts` owns the string-key detail internally; its public API is `get(h)`, `set(h, t)`, `rotate(h)`, `lock(h)` — all in terms of `HexCoord`.

## 5. Tile Connectivity Table

Connectivity is stored per tile type only. Rotation is a runtime shift.

```ts
const BASE: Record<TileType, Connection[]> = {
  'straight':    [{ edges: [0, 3], length: 1.00 }],
  'bend':        [{ edges: [0, 2], length: 1.05 }],                 // ~60° arc
  'double-bend': [{ edges: [0, 2], length: 1.05 },
                  { edges: [3, 5], length: 1.05 }],
  'cross-2':     [{ edges: [0, 3], length: 1.00 },
                  { edges: [1, 4], length: 1.00 }],
  'cross-3':     [{ edges: [0, 3], length: 1.00 },
                  { edges: [1, 4], length: 1.00 },
                  { edges: [2, 5], length: 1.00 }],
  'station':     [{ edges: [0, 0], length: 2.00 }],                 // self-loop
  // Phase C — switch connectivity is state-dependent; resolved at query time.
  // Stem is edge 0 (pre-rotation). Switch-left exits 2 or 3; switch-right exits 3 or 4.
  // State 'A' exposes one exit, state 'B' exposes the other — always one active at a time.
  // Entering via a non-stem edge yields no connection → derail.
};

const shift = (e: Edge, r: number): Edge => ((e + r) % 6) as Edge;

export const connections = (t: Tile): Connection[] =>
  BASE[t.type].map(c => ({
    edges: [shift(c.edges[0], t.rotation), shift(c.edges[1], t.rotation)],
    length: c.length,
  }));
```

### Length as a feel-tuning parameter

Connection lengths are hand-picked numbers (not geometric truth). They control how long the train spends on each tile type relative to a base unit. Station length of 2.0 makes the station visit dwell visibly longer than a pass-through. Lengths are tunable.

### Station semantics (self-loop)

A station has one connection `[E, E]` — same edge in and out. The train enters the station via edge E, traverses the self-loop (taking `length` time), exits via the same edge E, and lands in the neighbor it came from. Direction reversal emerges from the geometry — no `direction` field, no reversal branch.

Entering a station tile via any edge other than E has no matching connection → derail.

### Crosses

Per the GDD, 2-way and 3-way crosses pass straight through — the train's entry edge determines its exit edge via the matching pair; they don't branch. This is handled uniformly by `computeNextStep` matching the entry edge to one of the tile's connections.

## 6. Game Loop

Single `requestAnimationFrame` loop:

```
function tick(state, dt):
  if state.phase == 'pre-game':
    state.headStartMs -= dt
    if state.headStartMs <= 0: state.phase = 'running'
    return

  if state.phase != 'running': return

  state.train.progress += (state.train.speed * dt) / currentConnectionLength(state)
  while state.train.progress >= 1.0:
    state.train.progress -= 1.0
    next = computeNextStep(state.board, state.train)
    if next == null:
      state.phase = 'derailed'; return
    lock(state.board, next.tile)        // lock on entry
    state.train = next
    // phase C: if next.tile is a station, score += N
```

`computeNextStep(board, train)`:
1. Find the neighbor hex across `train.exitEdge`.
2. If neighbor cell is empty or off-board → return null.
3. In the neighbor's connections, find one whose edges include the edge opposite `train.exitEdge` (the edge the train enters through).
4. If none → return null.
5. Return a new `Train { tile: neighbor, entryEdge, exitEdge: theOtherEdgeInTheConnection, progress: 0 }`.

**Self-loop traversal (station).** The connection `[E, E]` is matched by the general algorithm — entry edge E matches, the "other edge" is also E, so `exitEdge == entryEdge`. The neighbor across `exitEdge` is the tile the train just came from, which it re-enters via the shared edge. Reversal falls out of the math with no branch in `computeNextStep`.

### Locking

- **During head-start, all tiles are unlocked** — including origin. The player can rotate any tile, including origin, to set the train's starting heading.
- **When head-start ends** (phase transitions `pre-game` → `running`): lock origin, derive the train's starting `entryEdge` / `exitEdge` from origin's current rotation, and begin advancing.
- **On each successful step:** lock the newly-entered tile.

Tapping a locked tile is a no-op.

### Rotation

Tap on a non-locked tile: `tile.rotation = (tile.rotation + 1) % 6`. Renderer picks this up and applies a CSS `transform: rotate(60deg * rotation)` with a short transition for the animation.

## 7. Input

Single input: tap on a tile element. Mobile-first (`pointerdown` or `click` on SVG `<g>`). The `input/tap.ts` module:
1. Translates the tap target to a `HexCoord`.
2. Calls `board.rotate(hex)` — which is a no-op if the tile is locked.

No drag, no long-press, no gestures.

## 8. Renderer

**Hex orientation:** pointy-top (vertical long-axis).

On init: render the full board as SVG `<g>` elements (one per tile), each containing the track path(s) for its type. Store refs in a `Map<HexCoord, SVGElement>`.

Per frame:
- For each tile, set `transform: rotate(60deg * tile.rotation)` (CSS transition handles the animation smoothly). Cheap at this scale — pure rotate transforms are GPU-accelerated, don't trigger layout or paint, and run comfortably at 60 fps on mobile even if we re-set them every frame for all ~50 tiles. If ever needed, easy micro-optimization: only update tiles whose rotation changed since the previous frame.
- For each tile, toggle a `locked` CSS class (visual indicator is a later polish item).
- For the train, compute its screen position:
  - Locate the current tile's SVG path for the active connection.
  - Use `path.getPointAtLength(train.progress * path.getTotalLength())` to get (x, y).
  - Translate the train element accordingly.
- Render phase-specific overlays (pre-game countdown? derailed screen).

Station visual and switch indicator are added in their respective phases.

## 9. Phased Build Plan

### Phase A — MVP (track-only)

**In scope:**
- Fixed hex board, ~50 tiles, sized to fit a phone without panning.
- Tile types: `straight`, `bend`, `double-bend`, `cross-2`, `cross-3`.
- Board seeded with random tile types and random rotations. Origin is placed at axial (0, 0) — the center of the board — and seeded as a `straight` tile so its single connection gives an unambiguous starting heading.
- Head-start timer (default 5000 ms) during which the board is fully rotatable, including origin. When it expires, the train's starting `entryEdge` / `exitEdge` are derived from origin's current rotation and the train begins advancing.
- Tap-to-rotate.
- Train advances, tiles lock on entry, derails on missing neighbor or no matching edge.
- Start screen ("tap to start"), derailed screen ("tap to restart"). No score. No persistence.

**Out of scope:**
- Stations, switches, board expansion, panning, score, localStorage, sound, polish.

**Stop point 1:** playtest. Tune speed, head-start, tile density, rotation UX by feel. No pre-committed evaluation criteria — decide what's off after playing it.

### Phase B — Stations

**Adds:**
- `station` tile (self-loop, length 2.0).
- Origin is a station.
- Station visual — a simple placeholder graphic distinct from track (e.g. a filled disc). The GDD mockup is inspirational, not prescriptive; placeholder aesthetic is fine as long as it's not ugly.

Scoring is **not** introduced in Phase B. With no switches, there's only ever one reachable non-origin station, so the train bounces between two fixed points and a score would just count bounces. Scoring moves to Phase C.

**Expected behavior:** with origin-as-station and at least one other station, the train bounces between them indefinitely once a path exists. Tiles lock behind the train on each pass, so the route becomes static. The game effectively ends when a station is reached — this is expected; Phase B is a test bed for the station/reverse mechanic, not a playable game.

**Stop point 2:** playtest the reverse-at-station feel and station dwell time. Decide if station length 2.0 is right.

### Phase C — Switches

**Adds:**
- `switch-l`, `switch-r` tiles with `switchState: 'A' | 'B'`.
- Connectivity resolved at query time based on state: only the active exit is connected.
- State flips after each pass through the switch.
- Switch indicator rendered (arrow or dot showing the active exit).
- **Scoring introduced.** With switches, branches become reachable and routes vary. Score: +N per station visit (N tunable). Displayed during gameplay and on the derail screen. Still no persistence.

**This is where DeRailed becomes a game.** Bouncing between stations now forces the player to build the alternate branch during the return leg before the train, now on return, takes the switch's flipped exit.

**Stop point 3:** playtest the full core loop.

## 10. Testing

**Vitest**, unit tests on `game/` only. Pure functions, no DOM.

Coverage:
- `hex.ts` — neighbor math, edge-to-neighbor mapping.
- `tiles.ts` — `connections(tile)` for every type × every rotation.
- `board.ts` — seeding invariants (origin has a connected edge), rotate/lock semantics.
- `train.ts` — `computeNextStep`:
  - Valid connection → correct next tile, entry edge, exit edge, progress reset.
  - Missing neighbor → derail.
  - Neighbor exists, no matching edge → derail.
  - Cross tile: entry edge 0 → exit edge 3, no turning.
- `state.ts` — tick advances, phase transitions, lock-on-entry timing.

Phase B adds:
- Station self-loop traversal: `exitEdge == entryEdge`, progress scales by length 2.0.
- Bouncing between two stations via shared path.

Phase C adds:
- Switch connectivity varies by state.
- Each pass flips state.

Renderer and input are not unit tested — verified by manual smoke.

## 11. Deliberately Deferred

Items flagged but intentionally not in MVP:

- **Board expansion** (continuous / station-triggered / timed) — GDD §05.
- **Pan/zoom** once board outgrows screen.
- **Solvability test at seed + reshuffle on unsolvable start** (GDD §06 risk).
- **Sound, derail particle effects, juice** — Canvas overlay path when needed.
- **Traversed-path color coding** — path from last station visit to current train position in one color; path traversed earlier (before last station) in another. Visual clarity of progress.
- **Scoring model variations** (combo, per-branch, per-tile) — GDD §06.
- **Loop-closing mechanics** — ideas to explore:
  - Closed loop = win condition / level advance with point boost.
  - Closed loop persists, new train spawns from a new station, enabling multiple train lines.
- **GDD §07 "Ideas to Explore":** tile swap, reverse switch entry, origin-as-generic-station, city growth, multiple trains.
- **Station behavior variants** (dead-end-only, pass-through) — GDD §06.
- **Pre-train-arrival switch toggling** — GDD §06.
- **Difficulty scaling** (speed increase, complexity pressure) — GDD §06.
- **Loop coexistence with tree structure** — GDD §06.
- **Score persistence / leaderboards** — out of MVP entirely.

## 12. Known Risks Not Addressed in MVP

- **Unsolvable starting seed.** Random rotations may make the first few seconds unwinnable. Mitigated partially by forcing origin tile to have a connected edge; full mitigation (solvability test) deferred.
- **Tiles locking behind the train reduces player agency over time.** Intentional — the alternative (tiles re-rotatable after train passes) creates weird visual and gameplay cases. Revisit only if playtesting Phase A reveals the game shrinks into boredom too fast.
- **Phase B is not a game.** Explicit and expected; not a bug.

## 13. Open Implementation Questions

These are left to implementation phase, not pre-committed here:

- Initial board size and exact layout (hex radius = 3? 4?).
- Train speed default, head-start default, connection length values — all tunable during Phase A playtesting.
- Rotation animation duration.
- Visual style (colors, line weights, typography) — not set in stone; deferred. Placeholder aesthetic acceptable for MVP.
