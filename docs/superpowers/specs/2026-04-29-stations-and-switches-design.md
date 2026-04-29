# DeRailed — Stations & Switches (Merged Phase B+C)

*Date: 2026-04-29*
*Supersedes: Phase B and Phase C sections of `docs/superpowers/specs/2026-04-22-derailed-mvp-design.md` (§9)*

## 1. Purpose

Merge the original Phase B (stations) and Phase C (switches) into a single phase. Phase B alone ("not a game" per the original spec) doesn't add meaningful playtesting signal beyond what Phase A already proved. Stations only become interesting once switches create branching — ship them together.

## 2. Scope

Adds to the existing Phase A codebase:

- Three new tile types: `station`, `switch-l`, `switch-r`.
- Origin becomes a station.
- Switch state tracking and flipping.
- Scoring (+1 per station visit, tunable constant).
- Score HUD during gameplay and on the derail screen.
- Board seeding with minimum-count constraints.
- Unit tests for all new game logic.

## 3. Data Model Changes

### New tile types

```ts
type TileType =
  | 'straight' | 'bend' | 'double-bend' | 'cross-2' | 'cross-3'
  | 'station'
  | 'switch-l' | 'switch-r';
```

### Tile gains optional switch state

```ts
type Tile = {
  type: TileType;
  rotation: Edge;
  locked: boolean;
  switchState?: 'A' | 'B';  // only present on switch tiles
};
```

### New connectivity entries

**Station:** `[{ edges: [0, 0], length: 2.0 }]` — self-loop. Entry and exit on the same edge. The train enters, dwells for `length` time, exits the same edge, lands back in the tile it came from. Reversal falls out of the existing `computeNextStep` math with no special-casing.

**Switch-left:** stem edge 0, length `1.0`. State `'A'` exposes `[0, 2]`, state `'B'` exposes `[0, 3]`. Connectivity resolved at query time based on `switchState`. Entering via a non-stem edge yields no connection (derail).

**Switch-right:** stem edge 0, length `1.0`. State `'A'` exposes `[0, 3]`, state `'B'` exposes `[0, 4]`. Same state-dependent resolution.

The `connections()` function becomes state-aware for switches — reads `tile.switchState` to return only the active connection. All other tile types are unchanged.

## 4. Game Logic

### Board seeding

- Origin `(0, 0)` is seeded as a `station` tile (instead of `straight`).
- Weight table gains entries for `station`, `switch-l`, `switch-r`. Switches are rare (low weight, similar to crosses). Stations moderately rare. Exact weights tunable.
- Switch tiles are seeded with `switchState: 'A'`.
- **Minimum count constraints:** after the random seeding pass, validate that minimums are met. If not, replace random non-origin tiles to fill the gap:
  - At least 1 non-origin `station`.
  - At least 2 switches (`switch-l` + `switch-r` combined).
- No maximum constraints — weights keep distribution reasonable.

### computeNextStep

No structural changes. The existing algorithm (find neighbor, match entry edge to a connection, take the other edge) handles stations and switches uniformly because `connections()` returns the correct edges for the tile's current state.

### tick()

Two additions after a successful `computeNextStep`:

1. **Switch flip:** if the tile the train just *left* is a switch, flip its `switchState` (`'A'` → `'B'` or vice versa).
2. **Scoring:** if the newly entered tile is a station, increment `score` by 1.

### initialTrainFromOrigin

Origin is now a station with self-loop `[E, E]`. The train's initial `entryEdge` and `exitEdge` are both the same edge. The train's first move exits origin into the neighbor across that edge — correct starting behavior.

## 5. Renderer

### Tile art (tile-art.ts)

`tracksFor()` gains cases for the three new types:

- **Station:** a line from edge 0's midpoint to the tile center, plus a filled disc at the center as the station marker. Visually it's a dead-end line with a dot — not a visible loop.
- **Switch-left / Switch-right:** two paths from the stem edge to each exit. The active path is visually emphasized; the inactive path is dimmed/dashed. A small direction indicator (dot or arrow) shows which exit is currently active.

### Per-frame update (update.ts)

- **Switch tiles:** update visual indicator to reflect current `switchState`. Toggle active/inactive styling on the two exit paths.
- **Train on station:** `path.getPointAtLength` animates the train along the line to center and back. The `length: 2.0` makes the visit feel longer.

### HUD

- Score text element displayed during `running` phase.
- Derail screen shows final score alongside "Derailed — tap to restart".

## 6. Testing

Unit tests on `game/` (Vitest):

- **`tiles.ts`:** `connections()` for `station` returns self-loop `[E, E]` at every rotation. `connections()` for `switch-l` and `switch-r` returns correct single connection based on `switchState`, at every rotation.
- **`board.ts`:** origin is seeded as station. Minimum count constraints enforced (at least 1 non-origin station, at least 2 switches). Switch tiles seeded with `switchState: 'A'`.
- **`train.ts`:** `computeNextStep` into station yields `exitEdge == entryEdge` and returns to previous tile. `computeNextStep` into switch follows active exit. Non-stem entry into switch yields derail.
- **`state.ts`:** switch state flips after train leaves. Score increments on station entry. `initialTrainFromOrigin` works with station origin.

Renderer verified by manual smoke testing.

## 7. Scoring

Simple linear scoring: `+1` per station visit. Stored as a tunable constant. A more interesting non-linear scoring mechanism is expected to replace this later — this is placeholder scoring for the prototype.

## 8. What This Replaces

The original spec's Phase B and Phase C (§9 of the MVP design) are replaced by this single phase. All other sections of the MVP design remain in effect. After this phase ships, the stop point is a full playtest of the core loop: stations, switches, branching, and scoring together.
