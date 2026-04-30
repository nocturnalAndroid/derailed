# Stations & Switches Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add station, switch-left, and switch-right tile types with scoring to the existing Phase A codebase, making DeRailed a playable game with branching routes and score tracking.

**Architecture:** Extend the existing tile type system with three new variants. Stations use a self-loop connection for train reversal. Switches use state-dependent connectivity that flips after each train pass. The board seeder gains new weights and minimum-count constraints. The renderer adds station/switch visuals and a score HUD.

**Tech Stack:** TypeScript, Vite, Vitest, SVG

---

### Task 1: Extend tile types and connections

**Files:**
- Modify: `src/game/tiles.ts:1-42`
- Modify: `src/game/tiles.test.ts:1-70`

- [ ] **Step 1: Write failing tests for station connections**

Add to `src/game/tiles.test.ts`:

```ts
describe('connections — station', () => {
  it('station rotation 0 → self-loop [0,0] length 2.0', () => {
    const tile: Tile = { type: 'station', rotation: 0, locked: false };
    expect(connections(tile)).toEqual([
      { edges: [0, 0], length: 2.0 },
    ]);
  });

  it('station rotation 3 → self-loop [3,3]', () => {
    const tile: Tile = { type: 'station', rotation: 3, locked: false };
    expect(connections(tile)).toEqual([
      { edges: [3, 3], length: 2.0 },
    ]);
  });
});
```

- [ ] **Step 2: Write failing tests for switch-l connections**

Add to `src/game/tiles.test.ts`:

```ts
describe('connections — switch-l', () => {
  it('switch-l state A rotation 0 → [0,2] length 1.0', () => {
    const tile: Tile = { type: 'switch-l', rotation: 0, locked: false, switchState: 'A' };
    expect(connections(tile)).toEqual([
      { edges: [0, 2], length: 1.0 },
    ]);
  });

  it('switch-l state B rotation 0 → [0,3] length 1.0', () => {
    const tile: Tile = { type: 'switch-l', rotation: 0, locked: false, switchState: 'B' };
    expect(connections(tile)).toEqual([
      { edges: [0, 3], length: 1.0 },
    ]);
  });

  it('switch-l state A rotation 2 → [2,4]', () => {
    const tile: Tile = { type: 'switch-l', rotation: 2, locked: false, switchState: 'A' };
    expect(connections(tile)).toEqual([
      { edges: [2, 4], length: 1.0 },
    ]);
  });
});
```

- [ ] **Step 3: Write failing tests for switch-r connections**

Add to `src/game/tiles.test.ts`:

```ts
describe('connections — switch-r', () => {
  it('switch-r state A rotation 0 → [0,3] length 1.0', () => {
    const tile: Tile = { type: 'switch-r', rotation: 0, locked: false, switchState: 'A' };
    expect(connections(tile)).toEqual([
      { edges: [0, 3], length: 1.0 },
    ]);
  });

  it('switch-r state B rotation 0 → [0,4] length 1.0', () => {
    const tile: Tile = { type: 'switch-r', rotation: 0, locked: false, switchState: 'B' };
    expect(connections(tile)).toEqual([
      { edges: [0, 4], length: 1.0 },
    ]);
  });

  it('switch-r state A rotation 1 → [1,4]', () => {
    const tile: Tile = { type: 'switch-r', rotation: 1, locked: false, switchState: 'A' };
    expect(connections(tile)).toEqual([
      { edges: [1, 4], length: 1.0 },
    ]);
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx vitest run src/game/tiles.test.ts`
Expected: FAIL — `'station'`, `'switch-l'`, `'switch-r'` are not valid `TileType` values.

- [ ] **Step 5: Implement tile type and connection changes**

In `src/game/tiles.ts`, update `TileType` to:

```ts
export type TileType =
  | 'straight'
  | 'bend'
  | 'double-bend'
  | 'cross-2'
  | 'cross-3'
  | 'station'
  | 'switch-l'
  | 'switch-r';
```

Update `Tile` to:

```ts
export type Tile = {
  type: TileType;
  rotation: Edge;
  locked: boolean;
  switchState?: 'A' | 'B';
};
```

Add station to `BASE`:

```ts
  'station':     [{ edges: [0, 0], length: 2.00 }],
```

Update `connections()` to handle switches:

```ts
export function connections(tile: Tile): Connection[] {
  if (tile.type === 'switch-l') {
    const stem: Edge = 0;
    const exit: Edge = tile.switchState === 'B' ? 3 : 2;
    return [{
      edges: [shift(stem, tile.rotation), shift(exit, tile.rotation)],
      length: 1.0,
    }];
  }
  if (tile.type === 'switch-r') {
    const stem: Edge = 0;
    const exit: Edge = tile.switchState === 'B' ? 4 : 3;
    return [{
      edges: [shift(stem, tile.rotation), shift(exit, tile.rotation)],
      length: 1.0,
    }];
  }
  return BASE[tile.type].map(c => ({
    edges: [shift(c.edges[0], tile.rotation), shift(c.edges[1], tile.rotation)],
    length: c.length,
  }));
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/game/tiles.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/game/tiles.ts src/game/tiles.test.ts
git commit -m "feat(tiles): add station, switch-l, switch-r tile types with connections"
```

---

### Task 2: Update board seeding with new tile types and minimum constraints

**Files:**
- Modify: `src/game/board.ts:44-97`
- Modify: `src/game/board.test.ts:56-90`

- [ ] **Step 1: Write failing tests for updated seeding**

Add to `src/game/board.test.ts`, replacing the existing `'origin (0,0) is a straight tile'` test and adding new tests:

Replace the test at line 65-71 with:

```ts
  it('origin (0,0) is a station tile, unlocked', () => {
    const b = seedBoard({ radius: 3, rng: () => 0.5 });
    const origin = b.get({ q: 0, r: 0 });
    expect(origin).toBeDefined();
    expect(origin!.type).toBe('station');
    expect(origin!.locked).toBe(false);
  });
```

Add new tests:

```ts
  it('has at least 1 non-origin station', () => {
    const b = seedBoard({ radius: 3, rng: () => 0.5 });
    let stationCount = 0;
    for (const [hex, tile] of b.cells()) {
      if (tile.type === 'station' && !(hex.q === 0 && hex.r === 0)) stationCount++;
    }
    expect(stationCount).toBeGreaterThanOrEqual(1);
  });

  it('has at least 2 switches total', () => {
    const b = seedBoard({ radius: 3, rng: () => 0.5 });
    let switchCount = 0;
    for (const [, tile] of b.cells()) {
      if (tile.type === 'switch-l' || tile.type === 'switch-r') switchCount++;
    }
    expect(switchCount).toBeGreaterThanOrEqual(2);
  });

  it('switch tiles are seeded with switchState A', () => {
    const b = seedBoard({ radius: 3, rng: () => 0.5 });
    for (const [, tile] of b.cells()) {
      if (tile.type === 'switch-l' || tile.type === 'switch-r') {
        expect(tile.switchState).toBe('A');
      }
    }
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/game/board.test.ts`
Expected: FAIL — origin is still `'straight'`, no stations/switches seeded, no `switchState`.

- [ ] **Step 3: Implement seeding changes**

In `src/game/board.ts`, update `NON_ORIGIN_WEIGHTS` to:

```ts
const NON_ORIGIN_WEIGHTS: ReadonlyArray<readonly [TileType, number]> = [
  ['straight',    4],
  ['bend',        6],
  ['double-bend', 4],
  ['cross-2',     1],
  ['cross-3',     1],
  ['station',     2],
  ['switch-l',    1],
  ['switch-r',    1],
];
```

Add minimum constraints type and enforcement function after `pickType`:

```ts
type MinConstraint = { type: TileType; min: number };

const MIN_CONSTRAINTS: MinConstraint[] = [
  { type: 'station',  min: 1 },
  { type: 'switch-l', min: 1 },
  { type: 'switch-r', min: 1 },
];

function enforceMinimums(board: Board, nonOriginCoords: HexCoord[], rng: () => number): void {
  for (const { type, min } of MIN_CONSTRAINTS) {
    let count = 0;
    for (const h of nonOriginCoords) {
      if (board.get(h)?.type === type) count++;
    }
    while (count < min) {
      const idx = Math.floor(rng() * nonOriginCoords.length);
      const h = nonOriginCoords[idx]!;
      const existing = board.get(h)!;
      if (existing.type !== 'station' && existing.type !== 'switch-l' && existing.type !== 'switch-r') {
        const switchState = (type === 'switch-l' || type === 'switch-r') ? 'A' as const : undefined;
        board.set(h, { type, rotation: existing.rotation, locked: false, switchState });
        count++;
      }
    }
  }
}
```

Update `seedBoard` to seed origin as station, add `switchState` to switch tiles, and call `enforceMinimums`:

```ts
export function seedBoard(opts: SeedOptions): Board {
  const rng = opts.rng ?? Math.random;
  const b = createBoard();

  const coords: HexCoord[] = [];
  if ('radius' in opts) {
    const R = opts.radius;
    for (let q = -R; q <= R; q++) {
      const rMin = Math.max(-R, -q - R);
      const rMax = Math.min(R,  -q + R);
      for (let r = rMin; r <= rMax; r++) coords.push({ q, r });
    }
  } else {
    const colHalf = Math.floor(opts.cols / 2);
    const rowStart = -Math.floor(opts.rows / 2);
    for (let i = 0; i < opts.rows; i++) {
      const row = rowStart + i;
      for (let j = 0; j < opts.cols; j++) {
        const col = j - colHalf;
        coords.push({ q: col - Math.floor(row / 2), r: row });
      }
    }
  }

  const nonOriginCoords: HexCoord[] = [];
  for (const h of coords) {
    const isOrigin = h.q === 0 && h.r === 0;
    const type: TileType = isOrigin ? 'station' : pickType(rng);
    const rotation = Math.floor(rng() * 6) as Edge;
    const switchState = (type === 'switch-l' || type === 'switch-r') ? 'A' as const : undefined;
    b.set(h, { type, rotation, locked: false, switchState });
    if (!isOrigin) nonOriginCoords.push(h);
  }
  enforceMinimums(b, nonOriginCoords, rng);
  return b;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/game/board.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/board.ts src/game/board.test.ts
git commit -m "feat(board): seed stations and switches with minimum constraints"
```

---

### Task 3: Train logic — station traversal and switch handling

**Files:**
- Modify: `src/game/train.test.ts:1-72`
- Modify: `src/game/train.ts:1-33` (no changes needed — verify)

- [ ] **Step 1: Write failing test for station self-loop traversal**

Add to `src/game/train.test.ts`:

```ts
  it('station self-loop: exitEdge equals entryEdge, returns to previous tile', () => {
    const b = createBoard();
    // Tile at (0,0) is a straight rotation 0 → [0,3]; train exits edge 0 toward (-1,1) via edge 0.
    // Wait, let's set up: train at (1,-1) exiting edge 3 → neighbor is (0,0).
    // Station at (0,0) rotation 0 → self-loop [0,0]. Entry edge = opposite(3) = 0. Matches [0,0]. Exit = 0.
    b.set({ q: 1, r: -1 }, makeTile('straight', 0));
    b.set({ q: 0, r: 0 }, { type: 'station', rotation: 0, locked: false } as Tile);

    const next = computeNextStep(b, trainOn({ q: 1, r: -1 }, 0, 3));

    expect(next).not.toBeNull();
    expect(next!.tile).toEqual({ q: 0, r: 0 });
    expect(next!.entryEdge).toBe(0);
    expect(next!.exitEdge).toBe(0);
  });
```

- [ ] **Step 2: Write failing test for switch follows active exit**

Add to `src/game/train.test.ts`:

```ts
  it('switch-l state A: train follows exit edge 2 (shifted by rotation)', () => {
    const b = createBoard();
    // Train at (1,-1) exits edge 3 → neighbor (0,0). Entry = opposite(3) = 0.
    // switch-l rotation 0 state A → [0,2]. Entry 0 matches. Exit = 2.
    b.set({ q: 1, r: -1 }, makeTile('straight', 0));
    b.set({ q: 0, r: 0 }, { type: 'switch-l', rotation: 0, locked: false, switchState: 'A' } as Tile);

    const next = computeNextStep(b, trainOn({ q: 1, r: -1 }, 0, 3));

    expect(next).not.toBeNull();
    expect(next!.entryEdge).toBe(0);
    expect(next!.exitEdge).toBe(2);
  });

  it('switch-l state B: train follows exit edge 3', () => {
    const b = createBoard();
    b.set({ q: 1, r: -1 }, makeTile('straight', 0));
    b.set({ q: 0, r: 0 }, { type: 'switch-l', rotation: 0, locked: false, switchState: 'B' } as Tile);

    const next = computeNextStep(b, trainOn({ q: 1, r: -1 }, 0, 3));

    expect(next).not.toBeNull();
    expect(next!.entryEdge).toBe(0);
    expect(next!.exitEdge).toBe(3);
  });
```

- [ ] **Step 3: Write failing test for non-stem switch entry → derail**

Add to `src/game/train.test.ts`:

```ts
  it('switch-l: entering from non-stem edge derails', () => {
    const b = createBoard();
    // Train at (0,1) exits edge 5 → neighbor (0,0). Entry = opposite(5) = 2.
    // switch-l rotation 0 state A → [0,2]. Entry 2 matches edge[1], exit = 0.
    // Actually this DOES match because edge 2 is in the connection.
    // For a true non-stem test: entry edge must NOT appear in the active connection.
    // switch-l rotation 0 state A → [0,2]. Entry edge 3 doesn't match either side.
    // Train at (-1,1) exits edge 0 → neighbor (0,0). Entry = opposite(0) = 3. No match → derail.
    b.set({ q: -1, r: 1 }, makeTile('straight', 0));
    b.set({ q: 0, r: 0 }, { type: 'switch-l', rotation: 0, locked: false, switchState: 'A' } as Tile);

    const next = computeNextStep(b, trainOn({ q: -1, r: 1 }, 0, 0));

    expect(next).toBeNull();
  });
```

- [ ] **Step 4: Run tests to verify they pass (no train.ts changes needed)**

Run: `npx vitest run src/game/train.test.ts`
Expected: PASS — `computeNextStep` already works generically via `connections()`. The new tile types just return different connections, and the algorithm handles them.

If tests fail, investigate and fix. The import of `Tile` type may need updating since `Tile` now has `switchState`.

- [ ] **Step 5: Commit**

```bash
git add src/game/train.test.ts
git commit -m "test(train): station self-loop, switch routing, non-stem derail"
```

---

### Task 4: Game state — switch flipping and scoring

**Files:**
- Modify: `src/game/state.ts:1-84`
- Modify: `src/game/state.test.ts:1-91`

- [ ] **Step 1: Write failing test for switch state flip**

Add to `src/game/state.test.ts`:

```ts
describe('tick — switch flipping', () => {
  it('flips switchState after train leaves a switch tile', () => {
    const board = createBoard();
    // Origin is a station rotation 0 → self-loop [0,0]. Train entry=0, exit=0.
    // Train will exit edge 0 toward (1,-1).
    board.set({ q: 0, r: 0 }, { type: 'station', rotation: 0, locked: false });
    // (1,-1): switch-l rotation 0 state A → [0,2]. Entry = opposite(0) = 3. No match!
    // Need switch stem facing toward origin. Train exits origin edge 0 → neighbor (1,-1), entry = opposite(0) = 3.
    // switch-l rotation 3 state A → shift(0,3)=3, shift(2,3)=5 → [3,5]. Entry 3 matches, exit 5.
    board.set({ q: 1, r: -1 }, { type: 'switch-l', rotation: 3, locked: false, switchState: 'A' });
    // Next tile after switch: neighbor across edge 5 of (1,-1) is (1,-2).
    board.set({ q: 1, r: -2 }, { type: 'straight', rotation: 2, locked: false }); // [2,5], entry 2 = opposite(5)

    const s = createInitialState(board);
    tick(s, DEFAULTS.headStartMs + 1); // transition to running
    // Train is on origin (station), exits edge 0.
    // Advance enough to cross origin (length 2.0) + switch (length 1.0).
    const crossTime = (2.0 + 1.0) / DEFAULTS.trainSpeed * 1000 + 1;
    tick(s, crossTime);

    expect(board.get({ q: 1, r: -1 })?.switchState).toBe('B');
  });
});
```

- [ ] **Step 2: Write failing test for scoring on station entry**

Add to `src/game/state.test.ts`:

```ts
describe('tick — scoring', () => {
  it('increments score when train enters a station', () => {
    const board = createBoard();
    // Origin station rotation 0 → [0,0]. Exit edge 0 → (1,-1).
    board.set({ q: 0, r: 0 }, { type: 'station', rotation: 0, locked: false });
    // Straight at (1,-1) rotation 0 → [0,3]. Entry = opposite(0)=3. Match [0,3], exit 0.
    board.set({ q: 1, r: -1 }, { type: 'straight', rotation: 0, locked: false });
    // Another station at (2,-2) rotation 3 → shift(0,3)=3, self-loop [3,3]. Entry = opposite(0)=3. Match!
    board.set({ q: 2, r: -2 }, { type: 'station', rotation: 3, locked: false });

    const s = createInitialState(board);
    tick(s, DEFAULTS.headStartMs + 1); // running
    // Cross origin (length 2.0) + straight (length 1.0) to reach station at (2,-2).
    const crossTime = (2.0 + 1.0) / DEFAULTS.trainSpeed * 1000 + 1;
    tick(s, crossTime);

    expect(s.score).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/game/state.test.ts`
Expected: FAIL — no switch flipping or scoring logic yet.

- [ ] **Step 4: Implement switch flipping and scoring in tick()**

In `src/game/state.ts`, add the scoring constant:

```ts
export const SCORE_PER_STATION = 1;
```

Update the `while` loop in `tick()` to track the previous tile and flip/score:

```ts
  while (state.train.progress >= 1.0) {
    state.train.progress -= 1.0;
    const prevTile = state.board.get(state.train.tile);
    const next = computeNextStep(state.board, state.train);
    if (next === null) {
      state.phase = 'derailed';
      return;
    }
    if (prevTile && (prevTile.type === 'switch-l' || prevTile.type === 'switch-r')) {
      prevTile.switchState = prevTile.switchState === 'A' ? 'B' : 'A';
    }
    state.board.lock(next.tile);
    state.train = next;
    const enteredTile = state.board.get(next.tile);
    if (enteredTile && enteredTile.type === 'station') {
      state.score += SCORE_PER_STATION;
    }
  }
```

- [ ] **Step 5: Update initialTrainFromOrigin for station origin**

The existing `initialTrainFromOrigin` gets `conns[0].edges` which for a station is `[E, E]`. So `entryEdge` and `exitEdge` will be the same. This is correct — the train starts at the station and its first step exits via that edge. No code change needed, but verify the existing state tests still pass (the test at line 21-29 that sets origin to `straight` needs updating to use `station`).

Update the test `'derives train edges from origin rotation'` in `src/game/state.test.ts`:

```ts
  it('derives train edges from origin rotation (station)', () => {
    const board = createBoard();
    board.set({ q: 0, r: 0 }, { type: 'station', rotation: 2, locked: false });  // [2,2]
    const s = createInitialState(board);
    expect(s.train.entryEdge).toBe(2);
    expect(s.train.exitEdge).toBe(2);
    expect(s.train.progress).toBe(0);
    expect(s.train.tile).toEqual({ q: 0, r: 0 });
  });
```

Also update the other state tests that create origin as `straight` — they should now use `station` to match the real game:

Update `'starts in pre-game'` test:

```ts
  it('starts in pre-game with full head-start and score 0', () => {
    const board = createBoard();
    board.set({ q: 0, r: 0 }, { type: 'station', rotation: 0, locked: false });
    const s = createInitialState(board);
    expect(s.phase).toBe('pre-game');
    expect(s.headStartMs).toBe(DEFAULTS.headStartMs);
    expect(s.score).toBe(0);
  });
```

Update pre-game tests similarly — replace `makeTile('straight', 0)` with `{ type: 'station', rotation: 0, locked: false }` for origin tiles. The running tests that chain straights for derail testing can keep using `straight` as origin since `createInitialState` only cares that the origin tile has connections.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/game/state.test.ts`
Expected: PASS

- [ ] **Step 7: Run full test suite**

Run: `npx vitest run`
Expected: PASS — all game tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/game/state.ts src/game/state.test.ts
git commit -m "feat(state): switch flipping and station scoring in tick()"
```

---

### Task 5: Tile art — station and switch SVG paths

**Files:**
- Modify: `src/renderer/tile-art.ts:1-30`

- [ ] **Step 1: Add station path helper**

Add to `src/renderer/tile-art.ts`:

```ts
function stationPath(a: Edge): TrackPath {
  const p1 = edgeMidpoint(a);
  return { edges: [a, a], d: `M ${p1.x} ${p1.y} L 0 0` };
}
```

- [ ] **Step 2: Update tracksFor to handle new tile types**

Add the three new cases. Switches return two paths in the array — index 0 is the state A exit, index 1 is the state B exit. Both are rendered; the renderer decides which to highlight and which to dim.

```ts
export function tracksFor(type: TileType): TrackPath[] {
  switch (type) {
    case 'straight':    return [linePath(0, 3)];
    case 'bend':        return [bendPath(0, 2)];
    case 'double-bend': return [bendPath(0, 2), bendPath(3, 5)];
    case 'cross-2':     return [linePath(0, 3), linePath(1, 4)];
    case 'cross-3':     return [linePath(0, 3), linePath(1, 4), linePath(2, 5)];
    case 'station':     return [stationPath(0)];
    case 'switch-l':    return [bendPath(0, 2), bendPath(0, 3)];
    case 'switch-r':    return [bendPath(0, 3), bendPath(0, 4)];
  }
}

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/tile-art.ts
git commit -m "feat(tile-art): station and switch SVG path definitions"
```

---

### Task 6: Renderer — station marker, switch indicator, and score HUD

**Files:**
- Modify: `src/renderer/svg.ts:1-120`
- Modify: `src/renderer/update.ts:1-104`
- Modify: `src/index.html:1-52`

- [ ] **Step 1: Add station marker in initRenderer**

In `src/renderer/svg.ts`, after the track paths are added to the tile group (after line 66), add a station disc:

```ts
    if (tile.type === 'station') {
      const disc = document.createElementNS(SVG_NS, 'circle');
      disc.setAttribute('cx', '0');
      disc.setAttribute('cy', '0');
      disc.setAttribute('r', String(HEX_SIZE * 0.22));
      disc.setAttribute('fill', '#e0c878');
      disc.setAttribute('stroke', '#1a1a1a');
      disc.setAttribute('stroke-width', '2');
      g.appendChild(disc);
    }
```

- [ ] **Step 2: Add switch path styling in initRenderer**

After the track paths are created for switch tiles, style the inactive path as dimmed. In `src/renderer/svg.ts`, after the path creation loop, add:

```ts
    if ((tile.type === 'switch-l' || tile.type === 'switch-r') && pathEls.length === 2) {
      pathEls[1]!.setAttribute('stroke-opacity', '0.25');
      pathEls[1]!.setAttribute('stroke-dasharray', '4 3');
    }
```

- [ ] **Step 3: Add score text ref to RendererRefs**

In `src/renderer/svg.ts`, update `RendererRefs`:

```ts
export type RendererRefs = {
  svg: SVGSVGElement;
  tiles: Map<string, {
    group: SVGGElement;
    paths: SVGPathElement[];
  }>;
  train: SVGGElement;
  countdown: SVGTextElement;
  countdownRing: SVGCircleElement;
  scoreText: SVGTextElement;
};
```

At the end of `initRenderer`, before the `return`, create the score text element:

```ts
  const scoreText = document.createElementNS(SVG_NS, 'text');
  scoreText.setAttribute('text-anchor', 'start');
  scoreText.setAttribute('dominant-baseline', 'hanging');
  scoreText.setAttribute('x', String(minX - pad + 10));
  scoreText.setAttribute('y', String(minY - pad + 10));
  scoreText.setAttribute('font-size', String(HEX_SIZE * 0.6));
  scoreText.setAttribute('font-weight', '700');
  scoreText.setAttribute('fill', '#e0c878');
  scoreText.style.display = 'none';
  svg.appendChild(scoreText);
```

Update the return to include `scoreText`:

```ts
  return { svg, tiles, train, countdown, countdownRing, scoreText };
```

- [ ] **Step 4: Update per-frame rendering for switches and score**

In `src/renderer/update.ts`, add switch indicator updating inside `updateTiles`:

```ts
function updateTiles(refs: RendererRefs, state: GameState): void {
  for (const [hex, tile] of state.board.cells()) {
    const entry = refs.tiles.get(hexKey(hex));
    if (!entry) continue;
    const { x, y } = hexToPixel(hex);
    entry.group.setAttribute(
      'transform',
      `translate(${x} ${y}) rotate(${tile.rotation * 60})`,
    );
    entry.group.classList.toggle('locked', tile.locked);
    if ((tile.type === 'switch-l' || tile.type === 'switch-r') && entry.paths.length === 2) {
      const aActive = tile.switchState === 'A';
      entry.paths[0]!.setAttribute('stroke-opacity', aActive ? '1' : '0.25');
      entry.paths[0]!.setAttribute('stroke-dasharray', aActive ? 'none' : '4 3');
      entry.paths[1]!.setAttribute('stroke-opacity', aActive ? '0.25' : '1');
      entry.paths[1]!.setAttribute('stroke-dasharray', aActive ? '4 3' : 'none');
    }
  }
}
```

Add a `updateScore` function and call it from `render`:

```ts
function updateScore(refs: RendererRefs, state: GameState): void {
  if (state.phase === 'running') {
    refs.scoreText.style.display = '';
    refs.scoreText.textContent = String(state.score);
  } else {
    refs.scoreText.style.display = 'none';
  }
}
```

Update `render`:

```ts
export function render(refs: RendererRefs, state: GameState): void {
  updateTiles(refs, state);
  updateTrain(refs, state);
  updateCountdown(refs, state);
  updateScore(refs, state);
}
```

- [ ] **Step 5: Show score on derail screen**

In `src/main.ts`, update the derail overlay to show the score:

```ts
    if (state.phase === 'derailed')  showBlocking(`Derailed — Score: ${state.score}\nTap to restart`);
```

- [ ] **Step 6: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/renderer/svg.ts src/renderer/update.ts src/main.ts
git commit -m "feat(renderer): station marker, switch indicator, score HUD"
```

---

### Task 7: Update train position rendering for station self-loop

**Files:**
- Modify: `src/renderer/update.ts`

- [ ] **Step 1: Handle station self-loop in updateTrain**

The current `updateTrain` finds the active path by matching `train.entryEdge` and `train.exitEdge` to a connection. For a station, both are the same edge, and `connections()` returns `[E, E]`. The existing `findIndex` already handles this — it checks if either edge matches `entryEdge` AND the other matches `exitEdge`. Since both are E, this works.

For the station, `forward` is determined by `train.entryEdge === conns[activeIdx].edges[0]`, which is `E === E` → `true`. The train goes from `progress=0` (edge midpoint) to `progress=1` (center at 0,0) and the visual path is a line from edge midpoint to center. This is correct — the train travels in, dwells, and exits back out.

However, when `exitEdge === entryEdge`, the train on exit re-enters the neighbor it came from. The visual transition between "arriving at center" and "traveling back out the same path" happens because `computeNextStep` places the train on the *previous* tile with a new entry/exit. No change needed in `updateTrain`.

Verify by checking: no code changes. Move on.

- [ ] **Step 2: Manual smoke test**

Run: `npx vite dev`

Verify in browser:
- Station tiles show a gold disc at center with a track line to one edge.
- Switch tiles show two paths — one solid, one dashed.
- Train reverses at stations.
- Switch indicator swaps (solid/dashed) after train passes through.
- Score displays during gameplay.
- Derail screen shows final score.

- [ ] **Step 3: Commit (if any adjustments were needed)**

```bash
git add -A
git commit -m "fix(renderer): adjustments from smoke testing"
```

---

### Task 8: Final verification

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Full gameplay smoke test**

Run: `npx vite dev`

Play through the following scenarios:
1. Train departs from origin station, advances along track.
2. Train reaches a non-origin station — it reverses and score increments.
3. Train passes through a switch — switch indicator flips.
4. On return through flipped switch, train takes alternate exit.
5. Derail screen shows final score with tap-to-restart.
6. New game seeds correctly — origin is a station, at least 1 other station and 2 switches visible.

- [ ] **Step 4: Commit any final fixes**

Only if needed. Otherwise, done.
