# DeRailed MVP — Phase A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase A MVP of DeRailed — a hex-grid puzzle prototype where a train advances along pre-placed, player-rotated tiles, and derails when it reaches a track end.

**Architecture:** Vanilla TypeScript with a strict boundary between pure game logic (`src/game/`) and DOM/SVG rendering (`src/renderer/`). A single `requestAnimationFrame` loop in `src/main.ts` wires input → game state → renderer. Tests use Vitest on the pure game modules.

**Tech Stack:** TypeScript, Vite (dev server + build), Vitest (tests), SVG (rendering), CSS transforms (rotation animation), no other runtime dependencies.

Source design spec: `docs/superpowers/specs/2026-04-22-derailed-mvp-design.md`

---

## File Structure

```
src/
├── index.html
├── main.ts                          bootstrap + rAF loop + overlay screens
├── sanity.test.ts                   throwaway; deleted when real tests exist
├── game/                            pure logic, no DOM
│   ├── hex.ts                       axial coords, neighbors, opposite edges
│   ├── hex.test.ts
│   ├── tiles.ts                     tile types, connectivity table
│   ├── tiles.test.ts
│   ├── board.ts                     Map-backed board, get/set/rotate/lock/seed
│   ├── board.test.ts
│   ├── train.ts                     computeNextStep
│   ├── train.test.ts
│   ├── state.ts                     GameState, tick, phase transitions
│   └── state.test.ts
├── renderer/                        SVG + DOM
│   ├── hex-geometry.ts              hex → pixel, edge midpoints
│   ├── hex-geometry.test.ts
│   ├── tile-art.ts                  SVG path strings per tile type
│   ├── tile-art.test.ts
│   ├── svg.ts                       initial SVG layout, element refs
│   └── update.ts                    per-frame DOM mutation
└── input/
    └── tap.ts                       tap-to-rotate dispatcher
```

**Boundary rule:** `game/` never imports from `renderer/`, `input/`, or `main.ts`, and never touches the DOM. If a file in `game/` imports anything DOM-shaped, it's a bug.

**Conventions used throughout:**
- Pointy-top axial coords `{ q, r }`. `Edge` is `0..5` clockwise starting upper-right.
- Opposite edge: `(edge + 3) % 6`.
- Tile rotation is in 60° steps (`0..5`); connection edges shift by rotation at query time.

---

## Task 1: Project scaffold (Vite + TypeScript + Vitest)

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `src/index.html`
- Create: `src/main.ts`
- Create: `src/sanity.test.ts`

### Steps

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "derailed",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "vitest": "^1.5.0"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "noEmit": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 3: Write `vite.config.ts` (doubles as vitest config)**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  test: {
    globals: false,
    environment: 'node',
  },
});
```

- [ ] **Step 4: Write `src/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>DeRailed</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      height: 100%;
      background: #1a1a1a;
      color: #eee;
      font-family: sans-serif;
      overflow: hidden;
      -webkit-tap-highlight-color: transparent;
    }
    #app {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100vw;
      height: 100vh;
    }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./main.ts"></script>
</body>
</html>
```

- [ ] **Step 5: Write placeholder `src/main.ts`**

```ts
const app = document.getElementById('app');
if (app) app.textContent = 'DeRailed — scaffold';
```

- [ ] **Step 6: Write a sanity test**

File: `src/sanity.test.ts`

```ts
import { describe, it, expect } from 'vitest';

describe('sanity', () => {
  it('can run a test', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 7: Install deps**

```bash
npm install
```
Expected: installs without errors; creates `node_modules/` (ignored) and `package-lock.json`.

- [ ] **Step 8: Run the test**

```bash
npm test -- --run
```
Expected: `1 passed` (the sanity test).

- [ ] **Step 9: Smoke-check the dev server**

```bash
npm run dev
```
Expected: Vite starts at `http://localhost:5173/` and the page shows "DeRailed — scaffold". Stop the server (Ctrl-C).

- [ ] **Step 10: Commit**

```bash
git add package.json tsconfig.json vite.config.ts src/index.html src/main.ts src/sanity.test.ts package-lock.json
git commit -m "chore: scaffold vite + typescript + vitest"
```

---

## Task 2: Hex coordinates — `src/game/hex.ts`

Axial coordinates for pointy-top hexes. Provides neighbor math, opposite-edge helper, and a stable string key.

**Files:**
- Create: `src/game/hex.ts`
- Create: `src/game/hex.test.ts`

### Steps

- [ ] **Step 1: Write the failing test**

File: `src/game/hex.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { neighbor, opposite, hexKey, type HexCoord, type Edge } from './hex';

describe('neighbor (pointy-top, axial)', () => {
  const origin: HexCoord = { q: 0, r: 0 };
  const cases: Array<[Edge, HexCoord]> = [
    [0, { q:  1, r: -1 }],   // upper-right
    [1, { q:  1, r:  0 }],   // right
    [2, { q:  0, r:  1 }],   // lower-right
    [3, { q: -1, r:  1 }],   // lower-left
    [4, { q: -1, r:  0 }],   // left
    [5, { q:  0, r: -1 }],   // upper-left
  ];

  it.each(cases)('edge %i → neighbor %j', (edge, expected) => {
    expect(neighbor(origin, edge)).toEqual(expected);
  });

  it('offsets from a non-origin hex', () => {
    expect(neighbor({ q: 3, r: 5 }, 1)).toEqual({ q: 4, r: 5 });
  });
});

describe('opposite', () => {
  it.each([[0, 3], [1, 4], [2, 5], [3, 0], [4, 1], [5, 2]] as const)(
    'opposite(%i) = %i',
    (input, expected) => {
      expect(opposite(input as Edge)).toBe(expected);
    },
  );
});

describe('hexKey', () => {
  it('produces stable "q,r" strings', () => {
    expect(hexKey({ q: 0, r: 0 })).toBe('0,0');
    expect(hexKey({ q: -3, r: 2 })).toBe('-3,2');
  });
});
```

- [ ] **Step 2: Run tests (expect fail)**

```bash
npm test -- --run src/game/hex.test.ts
```
Expected: FAIL — `hex` module does not exist.

- [ ] **Step 3: Implement `hex.ts`**

File: `src/game/hex.ts`

```ts
export type HexCoord = { q: number; r: number };
export type Edge = 0 | 1 | 2 | 3 | 4 | 5;

// Pointy-top axial neighbors, clockwise starting from upper-right.
const DIRECTIONS: ReadonlyArray<{ dq: number; dr: number }> = [
  { dq:  1, dr: -1 },  // 0 upper-right
  { dq:  1, dr:  0 },  // 1 right
  { dq:  0, dr:  1 },  // 2 lower-right
  { dq: -1, dr:  1 },  // 3 lower-left
  { dq: -1, dr:  0 },  // 4 left
  { dq:  0, dr: -1 },  // 5 upper-left
];

export function neighbor(h: HexCoord, edge: Edge): HexCoord {
  const d = DIRECTIONS[edge]!;
  return { q: h.q + d.dq, r: h.r + d.dr };
}

export function opposite(edge: Edge): Edge {
  return ((edge + 3) % 6) as Edge;
}

export function hexKey(h: HexCoord): string {
  return `${h.q},${h.r}`;
}
```

- [ ] **Step 4: Run tests (expect pass)**

```bash
npm test -- --run src/game/hex.test.ts
```
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/game/hex.ts src/game/hex.test.ts
git commit -m "feat(game): hex coords, neighbors, opposite edges"
```

---

## Task 3: Tile connectivity — `src/game/tiles.ts`

Tile types, the `Connection` shape, and `connections(tile)` which returns post-rotation connections.

**Files:**
- Create: `src/game/tiles.ts`
- Create: `src/game/tiles.test.ts`

### Steps

- [ ] **Step 1: Write the failing test**

File: `src/game/tiles.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import {
  connections,
  type Tile,
  type TileType,
} from './tiles';
import type { Edge } from './hex';

const makeTile = (type: TileType, rotation: Edge): Tile => ({
  type,
  rotation,
  locked: false,
});

describe('connections — rotation 0 (base table)', () => {
  it('straight → [0,3] length 1.0', () => {
    expect(connections(makeTile('straight', 0))).toEqual([
      { edges: [0, 3], length: 1.0 },
    ]);
  });

  it('bend → [0,2] length 1.05', () => {
    expect(connections(makeTile('bend', 0))).toEqual([
      { edges: [0, 2], length: 1.05 },
    ]);
  });

  it('double-bend → [0,2] and [3,5]', () => {
    expect(connections(makeTile('double-bend', 0))).toEqual([
      { edges: [0, 2], length: 1.05 },
      { edges: [3, 5], length: 1.05 },
    ]);
  });

  it('cross-2 → [0,3] and [1,4]', () => {
    expect(connections(makeTile('cross-2', 0))).toEqual([
      { edges: [0, 3], length: 1.0 },
      { edges: [1, 4], length: 1.0 },
    ]);
  });

  it('cross-3 → [0,3], [1,4], [2,5]', () => {
    expect(connections(makeTile('cross-3', 0))).toEqual([
      { edges: [0, 3], length: 1.0 },
      { edges: [1, 4], length: 1.0 },
      { edges: [2, 5], length: 1.0 },
    ]);
  });
});

describe('connections — rotation shifts edges by +rotation mod 6', () => {
  it('straight rotation 1 → [1,4]', () => {
    expect(connections(makeTile('straight', 1))[0]!.edges).toEqual([1, 4]);
  });

  it('straight rotation 5 → [5,2]', () => {
    expect(connections(makeTile('straight', 5))[0]!.edges).toEqual([5, 2]);
  });

  it('bend rotation 3 → [3,5]', () => {
    expect(connections(makeTile('bend', 3))[0]!.edges).toEqual([3, 5]);
  });

  it('cross-2 rotation 2 → [2,5] and [3,0]', () => {
    expect(connections(makeTile('cross-2', 2)).map(c => c.edges)).toEqual([
      [2, 5],
      [3, 0],
    ]);
  });
});
```

- [ ] **Step 2: Run tests (fail)**

```bash
npm test -- --run src/game/tiles.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement `tiles.ts`**

File: `src/game/tiles.ts`

```ts
import type { Edge } from './hex';

export type TileType =
  | 'straight'
  | 'bend'
  | 'double-bend'
  | 'cross-2'
  | 'cross-3';

export type Connection = {
  edges: [Edge, Edge];
  length: number;
};

export type Tile = {
  type: TileType;
  rotation: Edge;
  locked: boolean;
};

const BASE: Record<TileType, ReadonlyArray<Connection>> = {
  'straight':    [{ edges: [0, 3], length: 1.00 }],
  'bend':        [{ edges: [0, 2], length: 1.05 }],
  'double-bend': [{ edges: [0, 2], length: 1.05 },
                  { edges: [3, 5], length: 1.05 }],
  'cross-2':     [{ edges: [0, 3], length: 1.00 },
                  { edges: [1, 4], length: 1.00 }],
  'cross-3':     [{ edges: [0, 3], length: 1.00 },
                  { edges: [1, 4], length: 1.00 },
                  { edges: [2, 5], length: 1.00 }],
};

function shift(e: Edge, r: number): Edge {
  return ((((e + r) % 6) + 6) % 6) as Edge;
}

export function connections(tile: Tile): Connection[] {
  return BASE[tile.type].map(c => ({
    edges: [shift(c.edges[0], tile.rotation), shift(c.edges[1], tile.rotation)],
    length: c.length,
  }));
}
```

- [ ] **Step 4: Run tests (pass)**

```bash
npm test -- --run src/game/tiles.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/game/tiles.ts src/game/tiles.test.ts
git commit -m "feat(game): tile types and rotation-shifted connectivity"
```

---

## Task 4: Board — `src/game/board.ts` (core API)

Internal `Map<string, ...>` storage with a `HexCoord`-friendly public API. Seeding is added in Task 5.

**Files:**
- Create: `src/game/board.ts`
- Create: `src/game/board.test.ts`

### Steps

- [ ] **Step 1: Write the failing test**

File: `src/game/board.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { createBoard } from './board';
import type { Tile } from './tiles';

const tile = (): Tile => ({ type: 'straight', rotation: 0, locked: false });

describe('Board — basic API', () => {
  it('set and get round-trip', () => {
    const b = createBoard();
    b.set({ q: 2, r: -1 }, tile());
    expect(b.get({ q: 2, r: -1 })?.type).toBe('straight');
  });

  it('get on empty cell returns undefined', () => {
    const b = createBoard();
    expect(b.get({ q: 0, r: 0 })).toBeUndefined();
  });

  it('has returns true when set, false otherwise', () => {
    const b = createBoard();
    b.set({ q: 0, r: 0 }, tile());
    expect(b.has({ q: 0, r: 0 })).toBe(true);
    expect(b.has({ q: 1, r: 0 })).toBe(false);
  });

  it('rotate increments rotation modulo 6 on unlocked tiles', () => {
    const b = createBoard();
    b.set({ q: 0, r: 0 }, { type: 'straight', rotation: 5, locked: false });
    b.rotate({ q: 0, r: 0 });
    expect(b.get({ q: 0, r: 0 })?.rotation).toBe(0);
  });

  it('rotate is a no-op on locked tiles', () => {
    const b = createBoard();
    b.set({ q: 1, r: 0 }, { type: 'straight', rotation: 2, locked: true });
    b.rotate({ q: 1, r: 0 });
    expect(b.get({ q: 1, r: 0 })?.rotation).toBe(2);
  });

  it('lock sets the locked flag', () => {
    const b = createBoard();
    b.set({ q: 0, r: 0 }, tile());
    b.lock({ q: 0, r: 0 });
    expect(b.get({ q: 0, r: 0 })?.locked).toBe(true);
  });

  it('cells() yields all set cells', () => {
    const b = createBoard();
    b.set({ q: 0, r: 0 }, tile());
    b.set({ q: 1, r: 0 }, tile());
    const all = [...b.cells()];
    expect(all).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests (fail)**

```bash
npm test -- --run src/game/board.test.ts
```

- [ ] **Step 3: Implement `board.ts` (core API)**

File: `src/game/board.ts`

```ts
import { hexKey, type Edge, type HexCoord } from './hex';
import type { Tile } from './tiles';

export type Board = {
  get(h: HexCoord): Tile | undefined;
  set(h: HexCoord, t: Tile): void;
  has(h: HexCoord): boolean;
  rotate(h: HexCoord): void;
  lock(h: HexCoord): void;
  cells(): IterableIterator<[HexCoord, Tile]>;
};

export function createBoard(): Board {
  const cells = new Map<string, { hex: HexCoord; tile: Tile }>();

  return {
    get(h) {
      return cells.get(hexKey(h))?.tile;
    },
    set(h, t) {
      cells.set(hexKey(h), { hex: { q: h.q, r: h.r }, tile: t });
    },
    has(h) {
      return cells.has(hexKey(h));
    },
    rotate(h) {
      const entry = cells.get(hexKey(h));
      if (!entry || entry.tile.locked) return;
      entry.tile.rotation = (((entry.tile.rotation + 1) % 6) as Edge);
    },
    lock(h) {
      const entry = cells.get(hexKey(h));
      if (!entry) return;
      entry.tile.locked = true;
    },
    *cells() {
      for (const { hex, tile } of cells.values()) {
        yield [hex, tile];
      }
    },
  };
}
```

- [ ] **Step 4: Run tests (pass)**

```bash
npm test -- --run src/game/board.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/game/board.ts src/game/board.test.ts
git commit -m "feat(game): board with Map-backed HexCoord API"
```

---

## Task 5: Board seeding — extend `src/game/board.ts`

Generate a hexagonal board of radius R, origin at (0,0) forced to `straight`, other cells random `TileType` (from Phase A set) and random rotation.

**Files:**
- Modify: `src/game/board.ts` — add `seedBoard`
- Modify: `src/game/board.test.ts` — add seeding tests

### Steps

- [ ] **Step 1: Add failing tests to `src/game/board.test.ts`**

Append to the bottom of `src/game/board.test.ts`:

```ts
import { seedBoard } from './board';

describe('seedBoard', () => {
  it('generates 1 + 3R(R+1) cells for radius R', () => {
    const b2 = seedBoard({ radius: 2, rng: () => 0 });
    expect([...b2.cells()]).toHaveLength(19);   // 1 + 3*2*3

    const b3 = seedBoard({ radius: 3, rng: () => 0 });
    expect([...b3.cells()]).toHaveLength(37);   // 1 + 3*3*4
  });

  it('origin (0,0) is a straight tile, unlocked', () => {
    const b = seedBoard({ radius: 3, rng: () => 0.5 });
    const origin = b.get({ q: 0, r: 0 });
    expect(origin).toBeDefined();
    expect(origin!.type).toBe('straight');
    expect(origin!.locked).toBe(false);
  });

  it('covers all axial cells within radius', () => {
    const b = seedBoard({ radius: 2, rng: () => 0 });
    for (const h of [
      { q:  2, r:  0 }, { q: -2, r:  0 },
      { q:  0, r:  2 }, { q:  0, r: -2 },
      { q:  2, r: -2 }, { q: -2, r:  2 },
    ]) {
      expect(b.has(h)).toBe(true);
    }
  });

  it('does not cover cells outside the radius', () => {
    const b = seedBoard({ radius: 2, rng: () => 0 });
    expect(b.has({ q: 3, r:  0 })).toBe(false);
    expect(b.has({ q: 0, r: -3 })).toBe(false);
    expect(b.has({ q: 3, r: -1 })).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests (fail — `seedBoard` missing)**

```bash
npm test -- --run src/game/board.test.ts
```

- [ ] **Step 3: Add `seedBoard` to `board.ts`**

Append to `src/game/board.ts`:

```ts
import type { TileType } from './tiles';

const NON_ORIGIN_TYPES: ReadonlyArray<TileType> = [
  'straight', 'bend', 'double-bend', 'cross-2', 'cross-3',
];

export type SeedOptions = {
  radius: number;
  rng?: () => number;   // defaults to Math.random
};

export function seedBoard(opts: SeedOptions): Board {
  const rng = opts.rng ?? Math.random;
  const b = createBoard();
  const R = opts.radius;

  for (let q = -R; q <= R; q++) {
    const rMin = Math.max(-R, -q - R);
    const rMax = Math.min(R,  -q + R);
    for (let r = rMin; r <= rMax; r++) {
      const isOrigin = q === 0 && r === 0;
      const type: TileType = isOrigin
        ? 'straight'
        : NON_ORIGIN_TYPES[Math.floor(rng() * NON_ORIGIN_TYPES.length)]!;
      const rotation = Math.floor(rng() * 6) as Edge;
      b.set({ q, r }, { type, rotation, locked: false });
    }
  }
  return b;
}
```

- [ ] **Step 4: Run tests (pass)**

```bash
npm test -- --run src/game/board.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/game/board.ts src/game/board.test.ts
git commit -m "feat(game): hex-radius board seeding with origin as straight"
```

---

## Task 6: Train step — `src/game/train.ts`

Pure `computeNextStep(board, train)` that returns the train's next state after crossing its current exit edge, or `null` if it derails.

**Files:**
- Create: `src/game/train.ts`
- Create: `src/game/train.test.ts`

### Steps

- [ ] **Step 1: Write the failing test**

File: `src/game/train.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { computeNextStep, type Train } from './train';
import { createBoard } from './board';
import type { Tile } from './tiles';
import type { Edge } from './hex';

const makeTile = (type: Tile['type'], rotation: Edge = 0): Tile => ({
  type, rotation, locked: false,
});

// Train sitting on origin, ready to cross its exit edge (progress >= 1 implied by caller).
const trainOn = (tile: { q: number; r: number }, entryEdge: Edge, exitEdge: Edge): Train => ({
  tile, entryEdge, exitEdge, progress: 1, speed: 1,
});

describe('computeNextStep', () => {
  it('straight → straight: passes into neighbor with opposite entry edge', () => {
    const b = createBoard();
    // Origin is straight rotation 1 → connections [1,4]; train will exit via edge 1 (right).
    b.set({ q: 0, r: 0 }, makeTile('straight', 1));
    b.set({ q: 1, r: 0 }, makeTile('straight', 1));  // also [1,4]; entry at edge 4

    const next = computeNextStep(b, trainOn({ q: 0, r: 0 }, 4, 1));

    expect(next).not.toBeNull();
    expect(next!.tile).toEqual({ q: 1, r: 0 });
    expect(next!.entryEdge).toBe(4);   // opposite of exit 1
    expect(next!.exitEdge).toBe(1);
    expect(next!.progress).toBe(0);
    expect(next!.speed).toBe(1);
  });

  it('derails when neighbor cell is empty', () => {
    const b = createBoard();
    b.set({ q: 0, r: 0 }, makeTile('straight', 1));

    expect(computeNextStep(b, trainOn({ q: 0, r: 0 }, 4, 1))).toBeNull();
  });

  it('derails when neighbor has no matching edge', () => {
    const b = createBoard();
    b.set({ q: 0, r: 0 }, makeTile('straight', 1));  // [1,4]
    b.set({ q: 1, r: 0 }, makeTile('straight', 0));  // [0,3] — no edge 4

    expect(computeNextStep(b, trainOn({ q: 0, r: 0 }, 4, 1))).toBeNull();
  });

  it('cross-2: entry determines exit along matching pair (no turning)', () => {
    const b = createBoard();
    b.set({ q: 0, r: 0 }, makeTile('straight', 1));   // [1,4] exiting edge 1
    b.set({ q: 1, r: 0 }, makeTile('cross-2', 0));    // [0,3],[1,4]; entry 4 matches [1,4] → exit 1

    const next = computeNextStep(b, trainOn({ q: 0, r: 0 }, 4, 1));

    expect(next!.entryEdge).toBe(4);
    expect(next!.exitEdge).toBe(1);
  });

  it('bend: entry on one edge → exit on the paired edge', () => {
    const b = createBoard();
    // Origin straight rotation 2 → [2,5]; exit via edge 2 (lower-right) → neighbor (0,1).
    b.set({ q: 0, r: 0 }, makeTile('straight', 2));
    // Bend rotation 3 → [3,5]; entry must match edge 5 (opposite of exit 2).
    b.set({ q: 0, r: 1 }, makeTile('bend', 3));

    const next = computeNextStep(b, trainOn({ q: 0, r: 0 }, 5, 2));

    expect(next!.tile).toEqual({ q: 0, r: 1 });
    expect(next!.entryEdge).toBe(5);
    expect(next!.exitEdge).toBe(3);
  });
});
```

- [ ] **Step 2: Run (fail)**

```bash
npm test -- --run src/game/train.test.ts
```

- [ ] **Step 3: Implement `train.ts`**

File: `src/game/train.ts`

```ts
import { neighbor, opposite, type Edge, type HexCoord } from './hex';
import { connections } from './tiles';
import type { Board } from './board';

export type Train = {
  tile: HexCoord;
  entryEdge: Edge;
  exitEdge: Edge;
  progress: number;   // 0..1 along current connection
  speed: number;      // track-units per second
};

export function computeNextStep(board: Board, train: Train): Train | null {
  const neighborHex = neighbor(train.tile, train.exitEdge);
  const neighborTile = board.get(neighborHex);
  if (!neighborTile) return null;

  const entryEdge = opposite(train.exitEdge);
  const conn = connections(neighborTile).find(
    c => c.edges[0] === entryEdge || c.edges[1] === entryEdge,
  );
  if (!conn) return null;

  const exitEdge: Edge = conn.edges[0] === entryEdge ? conn.edges[1] : conn.edges[0];

  return {
    tile: neighborHex,
    entryEdge,
    exitEdge,
    progress: 0,
    speed: train.speed,
  };
}
```

- [ ] **Step 4: Run tests (pass)**

```bash
npm test -- --run src/game/train.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/game/train.ts src/game/train.test.ts
git commit -m "feat(game): compute next train step with derail detection"
```

---

## Task 7: Game state and tick — `src/game/state.ts`

`GameState`, `createInitialState`, and `tick(dt)` — handles pre-game countdown, head-start-to-running transition with origin lock, train progress advancement with connection-length scaling, derail, and lock-on-entry.

**Files:**
- Create: `src/game/state.ts`
- Create: `src/game/state.test.ts`

### Steps

- [ ] **Step 1: Write the failing test**

File: `src/game/state.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { createInitialState, tick, DEFAULTS } from './state';
import { createBoard } from './board';
import type { Tile } from './tiles';
import type { Edge } from './hex';

const makeTile = (type: Tile['type'], rotation: Edge = 0): Tile => ({
  type, rotation, locked: false,
});

describe('createInitialState', () => {
  it('starts in pre-game with full head-start and score 0', () => {
    const board = createBoard();
    board.set({ q: 0, r: 0 }, makeTile('straight', 0));
    const s = createInitialState(board);
    expect(s.phase).toBe('pre-game');
    expect(s.headStartMs).toBe(DEFAULTS.headStartMs);
    expect(s.score).toBe(0);
  });

  it('derives train edges from origin rotation', () => {
    const board = createBoard();
    board.set({ q: 0, r: 0 }, makeTile('straight', 2));  // [2,5]
    const s = createInitialState(board);
    expect(s.train.entryEdge).toBe(2);
    expect(s.train.exitEdge).toBe(5);
    expect(s.train.progress).toBe(0);
    expect(s.train.tile).toEqual({ q: 0, r: 0 });
  });
});

describe('tick — pre-game', () => {
  it('counts down head-start', () => {
    const board = createBoard();
    board.set({ q: 0, r: 0 }, makeTile('straight', 0));
    const s = createInitialState(board);
    tick(s, 1000);
    expect(s.phase).toBe('pre-game');
    expect(s.headStartMs).toBe(DEFAULTS.headStartMs - 1000);
  });

  it('transitions to running and locks origin when head-start expires', () => {
    const board = createBoard();
    board.set({ q: 0, r: 0 }, makeTile('straight', 0));
    const s = createInitialState(board);
    tick(s, DEFAULTS.headStartMs + 1);
    expect(s.phase).toBe('running');
    expect(board.get({ q: 0, r: 0 })?.locked).toBe(true);
  });

  it('re-derives train edges from origin rotation at transition', () => {
    const board = createBoard();
    board.set({ q: 0, r: 0 }, makeTile('straight', 0));
    const s = createInitialState(board);
    // Simulate player rotating origin during head-start:
    board.set({ q: 0, r: 0 }, makeTile('straight', 3));
    tick(s, DEFAULTS.headStartMs + 1);
    // straight rotation 3 → [3, 0]
    expect(s.train.entryEdge).toBe(3);
    expect(s.train.exitEdge).toBe(0);
  });
});

describe('tick — running', () => {
  it('advances train and derails at a dead end', () => {
    const board = createBoard();
    // straight rot 4 → conns [4,1]; entry=4, exit=1 (right) → (1,0), which is empty → derail.
    board.set({ q: 0, r: 0 }, makeTile('straight', 4));
    const s = createInitialState(board);
    tick(s, DEFAULTS.headStartMs + 1);   // transition to running
    expect(s.phase).toBe('running');

    // Speed 1, length 1 → crossing the tile takes ~1000 ms.
    tick(s, 1000);
    expect(s.phase).toBe('derailed');
  });

  it('locks the next tile on entry, not the one just exited', () => {
    const board = createBoard();
    // straight rot 4 → [4,1]; exit=1 (right) toward (1,0). Chain origin → (1,0) → (2,0).
    board.set({ q: 0, r: 0 }, makeTile('straight', 4));
    board.set({ q: 1, r: 0 }, makeTile('straight', 4));
    board.set({ q: 2, r: 0 }, makeTile('straight', 4));
    const s = createInitialState(board);
    tick(s, DEFAULTS.headStartMs + 1);   // running
    tick(s, 1000);                        // progress 0→1: cross into (1,0), train now there
    expect(board.get({ q: 1, r: 0 })?.locked).toBe(true);
    expect(board.get({ q: 2, r: 0 })?.locked).toBe(false);
  });
});
```

- [ ] **Step 2: Run (fail)**

```bash
npm test -- --run src/game/state.test.ts
```

- [ ] **Step 3: Implement `state.ts`**

File: `src/game/state.ts`

```ts
import type { Board } from './board';
import { connections } from './tiles';
import { computeNextStep, type Train } from './train';

export type Phase = 'pre-game' | 'running' | 'derailed';

export type GameState = {
  board: Board;
  train: Train;
  phase: Phase;
  headStartMs: number;
  score: number;   // phase C onward; remains 0 in Phase A
};

export const DEFAULTS = {
  headStartMs: 5000,
  trainSpeed: 1.0,   // connection-lengths per second
};

function initialTrainFromOrigin(board: Board): Train {
  const originTile = board.get({ q: 0, r: 0 });
  if (!originTile) throw new Error('board has no origin at (0,0)');

  const conns = connections(originTile);
  if (conns.length === 0) throw new Error('origin tile has no connections');

  const [a, b] = conns[0]!.edges;
  return {
    tile: { q: 0, r: 0 },
    entryEdge: a,
    exitEdge: b,
    progress: 0,
    speed: DEFAULTS.trainSpeed,
  };
}

export function createInitialState(board: Board): GameState {
  return {
    board,
    train: initialTrainFromOrigin(board),
    phase: 'pre-game',
    headStartMs: DEFAULTS.headStartMs,
    score: 0,
  };
}

function currentConnectionLength(state: GameState): number {
  const t = state.board.get(state.train.tile);
  if (!t) return 1.0;
  const conn = connections(t).find(
    c => (c.edges[0] === state.train.entryEdge && c.edges[1] === state.train.exitEdge)
      || (c.edges[1] === state.train.entryEdge && c.edges[0] === state.train.exitEdge),
  );
  return conn?.length ?? 1.0;
}

export function tick(state: GameState, dtMs: number): void {
  if (state.phase === 'pre-game') {
    state.headStartMs -= dtMs;
    if (state.headStartMs <= 0) {
      // Re-derive train from origin's CURRENT rotation (player may have rotated it during head-start).
      state.train = initialTrainFromOrigin(state.board);
      state.board.lock({ q: 0, r: 0 });
      state.phase = 'running';
    }
    return;
  }

  if (state.phase !== 'running') return;

  const dtSec = dtMs / 1000;
  state.train.progress += (state.train.speed * dtSec) / currentConnectionLength(state);

  while (state.train.progress >= 1.0) {
    state.train.progress -= 1.0;
    const next = computeNextStep(state.board, state.train);
    if (next === null) {
      state.phase = 'derailed';
      return;
    }
    state.board.lock(next.tile);
    state.train = next;
  }
}
```

- [ ] **Step 4: Run tests (pass)**

```bash
npm test -- --run src/game/state.test.ts
```

- [ ] **Step 5: Run the full suite**

```bash
npm test -- --run
```
Expected: all `game/` tests green.

- [ ] **Step 6: Commit**

```bash
git add src/game/state.ts src/game/state.test.ts
git commit -m "feat(game): state, tick, phase transitions with head-start"
```

---

## Task 8: Hex geometry helpers — `src/renderer/hex-geometry.ts`

Pointy-top axial → pixel conversion, and edge-midpoint vectors in local tile coords (tile center at origin).

**Files:**
- Create: `src/renderer/hex-geometry.ts`
- Create: `src/renderer/hex-geometry.test.ts`

### Steps

- [ ] **Step 1: Write the failing test**

File: `src/renderer/hex-geometry.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { hexToPixel, edgeMidpoint, HEX_SIZE } from './hex-geometry';

describe('hexToPixel (pointy-top)', () => {
  it('origin hex at (0, 0) maps to (0, 0)', () => {
    const p = hexToPixel({ q: 0, r: 0 });
    expect(p.x).toBeCloseTo(0, 5);
    expect(p.y).toBeCloseTo(0, 5);
  });

  it('q offset moves by sqrt(3) * size horizontally', () => {
    const p = hexToPixel({ q: 1, r: 0 });
    expect(p.x).toBeCloseTo(Math.sqrt(3) * HEX_SIZE, 5);
    expect(p.y).toBeCloseTo(0, 5);
  });

  it('r offset moves diagonally', () => {
    const p = hexToPixel({ q: 0, r: 1 });
    expect(p.x).toBeCloseTo(Math.sqrt(3) * HEX_SIZE * 0.5, 5);
    expect(p.y).toBeCloseTo(1.5 * HEX_SIZE, 5);
  });
});

describe('edgeMidpoint (local tile coords, screen-y-down)', () => {
  const apothem = HEX_SIZE * Math.sqrt(3) / 2;

  it('edge 1 (right) is at (+apothem, 0)', () => {
    const m = edgeMidpoint(1);
    expect(m.x).toBeCloseTo(apothem, 5);
    expect(m.y).toBeCloseTo(0, 5);
  });

  it('edge 4 (left) is at (-apothem, 0)', () => {
    const m = edgeMidpoint(4);
    expect(m.x).toBeCloseTo(-apothem, 5);
    expect(m.y).toBeCloseTo(0, 5);
  });

  it('edge 0 (upper-right) has negative y (above center)', () => {
    const m = edgeMidpoint(0);
    expect(m.y).toBeLessThan(0);
    expect(m.x).toBeGreaterThan(0);
  });

  it('edge 3 (lower-left) has positive y (below center)', () => {
    const m = edgeMidpoint(3);
    expect(m.y).toBeGreaterThan(0);
    expect(m.x).toBeLessThan(0);
  });
});
```

- [ ] **Step 2: Run (fail)**

```bash
npm test -- --run src/renderer/hex-geometry.test.ts
```

- [ ] **Step 3: Implement `hex-geometry.ts`**

File: `src/renderer/hex-geometry.ts`

```ts
import type { Edge, HexCoord } from '../game/hex';

export const HEX_SIZE = 32;   // circumradius in pixels; tunable

export type Point = { x: number; y: number };

// Pointy-top axial → pixel, screen y-down.
export function hexToPixel(h: HexCoord, size: number = HEX_SIZE): Point {
  const x = size * Math.sqrt(3) * (h.q + h.r / 2);
  const y = size * 1.5 * h.r;
  return { x, y };
}

// Edge midpoint in local tile coords (tile center at origin).
// Edge e midpoint is at angle (60 - 60*e) degrees from +x axis (math convention);
// y is flipped for screen-y-down.
export function edgeMidpoint(edge: Edge, size: number = HEX_SIZE): Point {
  const apothem = size * Math.sqrt(3) / 2;
  const angleRad = ((60 - 60 * edge) * Math.PI) / 180;
  return {
    x: apothem * Math.cos(angleRad),
    y: -apothem * Math.sin(angleRad),
  };
}
```

- [ ] **Step 4: Run tests (pass)**

```bash
npm test -- --run src/renderer/hex-geometry.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/renderer/hex-geometry.ts src/renderer/hex-geometry.test.ts
git commit -m "feat(renderer): hex-to-pixel and edge-midpoint helpers"
```

---

## Task 9: Tile art SVG paths — `src/renderer/tile-art.ts`

SVG path strings per tile type, drawn in local tile coords (center at origin). Straights as lines; bends as quadratic béziers through the tile center.

**Files:**
- Create: `src/renderer/tile-art.ts`
- Create: `src/renderer/tile-art.test.ts`

### Steps

- [ ] **Step 1: Write the failing test**

File: `src/renderer/tile-art.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { tracksFor } from './tile-art';

describe('tracksFor', () => {
  it('straight: one path across edges [0, 3]', () => {
    const paths = tracksFor('straight');
    expect(paths).toHaveLength(1);
    expect(paths[0]!.edges).toEqual([0, 3]);
    expect(paths[0]!.d).toMatch(/^M/);
  });

  it('bend: one path across edges [0, 2]', () => {
    const paths = tracksFor('bend');
    expect(paths).toHaveLength(1);
    expect(paths[0]!.edges).toEqual([0, 2]);
  });

  it('double-bend: two paths with edges [0,2] and [3,5]', () => {
    expect(tracksFor('double-bend').map(p => p.edges)).toEqual([[0, 2], [3, 5]]);
  });

  it('cross-2: two paths', () => {
    expect(tracksFor('cross-2')).toHaveLength(2);
  });

  it('cross-3: three paths', () => {
    expect(tracksFor('cross-3')).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run (fail)**

```bash
npm test -- --run src/renderer/tile-art.test.ts
```

- [ ] **Step 3: Implement `tile-art.ts`**

File: `src/renderer/tile-art.ts`

```ts
import type { Edge } from '../game/hex';
import type { TileType } from '../game/tiles';
import { edgeMidpoint } from './hex-geometry';

export type TrackPath = {
  edges: [Edge, Edge];
  d: string;
};

function linePath(a: Edge, b: Edge): TrackPath {
  const p1 = edgeMidpoint(a);
  const p2 = edgeMidpoint(b);
  return { edges: [a, b], d: `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}` };
}

function bendPath(a: Edge, b: Edge): TrackPath {
  // Quadratic Bézier via the tile center gives a smooth arc between the two edge midpoints.
  const p1 = edgeMidpoint(a);
  const p2 = edgeMidpoint(b);
  return { edges: [a, b], d: `M ${p1.x} ${p1.y} Q 0 0 ${p2.x} ${p2.y}` };
}

export function tracksFor(type: TileType): TrackPath[] {
  switch (type) {
    case 'straight':    return [linePath(0, 3)];
    case 'bend':        return [bendPath(0, 2)];
    case 'double-bend': return [bendPath(0, 2), bendPath(3, 5)];
    case 'cross-2':     return [linePath(0, 3), linePath(1, 4)];
    case 'cross-3':     return [linePath(0, 3), linePath(1, 4), linePath(2, 5)];
  }
}
```

- [ ] **Step 4: Run tests (pass)**

```bash
npm test -- --run src/renderer/tile-art.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/renderer/tile-art.ts src/renderer/tile-art.test.ts
git commit -m "feat(renderer): svg track paths per tile type"
```

---

## Task 10: Renderer init and per-frame update — `src/renderer/svg.ts`, `src/renderer/update.ts`

Build the SVG board once; per frame, apply tile rotations via CSS transform and position the train on the active path.

**Files:**
- Create: `src/renderer/svg.ts`
- Create: `src/renderer/update.ts`

Renderer is DOM-bound; we smoke-test it in the browser in Task 13 rather than unit-testing.

### Steps

- [ ] **Step 1: Implement `svg.ts`**

File: `src/renderer/svg.ts`

```ts
import { hexKey, type HexCoord } from '../game/hex';
import type { Board } from '../game/board';
import { hexToPixel, HEX_SIZE } from './hex-geometry';
import { tracksFor } from './tile-art';

const SVG_NS = 'http://www.w3.org/2000/svg';

export type RendererRefs = {
  svg: SVGSVGElement;
  tiles: Map<string, {
    group: SVGGElement;
    paths: SVGPathElement[];   // one per tile-type connection, in tracksFor() order
  }>;
  train: SVGCircleElement;
};

export function initRenderer(container: HTMLElement, board: Board): RendererRefs {
  // Compute viewBox to fit the board + padding.
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [hex] of board.cells()) {
    const p = hexToPixel(hex);
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const pad = HEX_SIZE * 1.2;
  const viewBox = `${minX - pad} ${minY - pad} ${(maxX - minX) + pad * 2} ${(maxY - minY) + pad * 2}`;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.style.maxWidth = '100vmin';
  svg.style.maxHeight = '100vmin';
  container.appendChild(svg);

  const tiles = new Map<string, { group: SVGGElement; paths: SVGPathElement[] }>();

  for (const [hex, tile] of board.cells()) {
    const { x, y } = hexToPixel(hex);
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('data-q', String(hex.q));
    g.setAttribute('data-r', String(hex.r));
    g.setAttribute('transform', `translate(${x} ${y}) rotate(0)`);
    g.style.transition = 'transform 0.12s ease-out';
    g.style.transformBox = 'fill-box';
    g.style.transformOrigin = 'center';

    g.appendChild(buildHexBackground(HEX_SIZE));

    const tracks = tracksFor(tile.type);
    const pathEls: SVGPathElement[] = [];
    for (const t of tracks) {
      const p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('d', t.d);
      p.setAttribute('stroke', '#e0c878');
      p.setAttribute('stroke-width', '4');
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke-linecap', 'round');
      g.appendChild(p);
      pathEls.push(p);
    }

    svg.appendChild(g);
    tiles.set(hexKey(hex), { group: g, paths: pathEls });
  }

  const train = document.createElementNS(SVG_NS, 'circle');
  train.setAttribute('r', String(HEX_SIZE * 0.22));
  train.setAttribute('fill', '#ffffff');
  train.setAttribute('stroke', '#202020');
  train.setAttribute('stroke-width', '2');
  svg.appendChild(train);

  return { svg, tiles, train };
}

function buildHexBackground(size: number): SVGPolygonElement {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    // Pointy-top: first vertex at top (angle 90°).
    const angleRad = ((60 * i + 90) * Math.PI) / 180;
    const x = size * Math.cos(angleRad);
    const y = -size * Math.sin(angleRad);
    points.push(`${x},${y}`);
  }
  const poly = document.createElementNS(SVG_NS, 'polygon');
  poly.setAttribute('points', points.join(' '));
  poly.setAttribute('fill', '#242424');
  poly.setAttribute('stroke', '#2e2e2e');
  poly.setAttribute('stroke-width', '1');
  return poly;
}
```

Note on transform origin: because each `<g>` is `translate(cx, cy) rotate(0)`, the rotation naturally happens around the tile center (the translation moves the origin to the tile's pixel position, then rotation is about that new origin). The `transformBox` / `transformOrigin` CSS are belt-and-suspenders for the CSS transition on rotation to feel right.

- [ ] **Step 2: Implement `update.ts`**

File: `src/renderer/update.ts`

```ts
import type { RendererRefs } from './svg';
import type { GameState } from '../game/state';
import { hexKey } from '../game/hex';
import { hexToPixel } from './hex-geometry';
import { connections } from '../game/tiles';

export function render(refs: RendererRefs, state: GameState): void {
  updateTiles(refs, state);
  updateTrain(refs, state);
}

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
  }
}

function updateTrain(refs: RendererRefs, state: GameState): void {
  const { train, board } = state;
  const tile = board.get(train.tile);
  if (!tile) return;

  // During head-start, render the train at the current train tile's center so
  // it visibly "sits" on the origin while the player orients it.
  if (state.phase === 'pre-game') {
    const { x, y } = hexToPixel(train.tile);
    refs.train.setAttribute('cx', String(x));
    refs.train.setAttribute('cy', String(y));
    return;
  }

  const tileRefs = refs.tiles.get(hexKey(train.tile));
  if (!tileRefs) return;

  const conns = connections(tile);
  const activeIdx = conns.findIndex(c =>
    (c.edges[0] === train.entryEdge && c.edges[1] === train.exitEdge) ||
    (c.edges[1] === train.entryEdge && c.edges[0] === train.exitEdge),
  );
  if (activeIdx < 0) return;

  const path = tileRefs.paths[activeIdx];
  if (!path) return;

  // The path is drawn edges[0] → edges[1]. If the train enters via edges[0], progress
  // 0..1 maps to path 0..1. If it enters via edges[1], we walk the path backwards.
  const forward = train.entryEdge === conns[activeIdx]!.edges[0];
  const t = forward ? train.progress : 1 - train.progress;

  const pt = path.getPointAtLength(t * path.getTotalLength());
  const ctm = path.getCTM();
  const screenPt = ctm ? pt.matrixTransform(ctm) : pt;

  refs.train.setAttribute('cx', String(screenPt.x));
  refs.train.setAttribute('cy', String(screenPt.y));
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/svg.ts src/renderer/update.ts
git commit -m "feat(renderer): svg board init and per-frame update"
```

---

## Task 11: Tap input — `src/input/tap.ts`

Register a single `click` handler on the SVG; translate the tap target to a `HexCoord` and dispatch `board.rotate()`.

**Files:**
- Create: `src/input/tap.ts`

### Steps

- [ ] **Step 1: Implement `tap.ts`**

File: `src/input/tap.ts`

```ts
import type { Board } from '../game/board';
import type { HexCoord } from '../game/hex';
import type { RendererRefs } from '../renderer/svg';

export function installTapHandlers(refs: RendererRefs, board: Board): void {
  refs.svg.addEventListener('click', (ev) => {
    const target = ev.target as Element | null;
    const g = target?.closest('g[data-q][data-r]') as SVGGElement | null;
    if (!g) return;
    const hex: HexCoord = {
      q: Number(g.getAttribute('data-q')),
      r: Number(g.getAttribute('data-r')),
    };
    board.rotate(hex);
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/input/tap.ts
git commit -m "feat(input): tap-to-rotate dispatcher"
```

---

## Task 12: Main bootstrap, game loop, overlay screens — `src/main.ts` and `src/index.html`

Wire everything together. Handle pre-game ("Get ready") and derailed ("Tap to restart") overlays. Pre-game overlay does NOT block taps (player needs to rotate tiles during head-start); derailed overlay DOES (tap on it restarts).

**Files:**
- Modify: `src/main.ts` (replace scaffold)
- Modify: `src/index.html` (add overlay + styles)
- Delete: `src/sanity.test.ts` (real tests exist now)

### Steps

- [ ] **Step 1: Replace `src/index.html` body and add overlay styles**

File: `src/index.html`

Replace the entire file with:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>DeRailed</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      height: 100%;
      background: #1a1a1a;
      color: #eee;
      font-family: sans-serif;
      overflow: hidden;
      -webkit-tap-highlight-color: transparent;
    }
    #app {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100vw;
      height: 100vh;
    }
    .overlay {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      background: rgba(10, 10, 10, 0.55);
      z-index: 10;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
    }
    .overlay.visible { opacity: 1; }
    .overlay.blocking { pointer-events: auto; }
    .locked > polygon {
      fill: #1f1f1f;
    }
  </style>
</head>
<body>
  <div id="app"></div>
  <div id="overlay" class="overlay">
    <div id="overlay-text"></div>
  </div>
  <script type="module" src="./main.ts"></script>
</body>
</html>
```

- [ ] **Step 2: Delete `src/sanity.test.ts`**

```bash
rm src/sanity.test.ts
```

- [ ] **Step 3: Replace `src/main.ts`**

File: `src/main.ts`

```ts
import { seedBoard } from './game/board';
import { createInitialState, tick, type GameState } from './game/state';
import { initRenderer, type RendererRefs } from './renderer/svg';
import { render } from './renderer/update';
import { installTapHandlers } from './input/tap';

const appEl = document.getElementById('app')!;
const overlayEl = document.getElementById('overlay')!;
const overlayTextEl = document.getElementById('overlay-text')!;

let state: GameState;
let refs: RendererRefs;
let lastTs = 0;
let lastPhase: GameState['phase'] | null = null;

function showHint(text: string): void {
  overlayTextEl.textContent = text;
  overlayEl.classList.add('visible');
  overlayEl.classList.remove('blocking');
}

function showBlocking(text: string): void {
  overlayTextEl.textContent = text;
  overlayEl.classList.add('visible');
  overlayEl.classList.add('blocking');
}

function hideOverlay(): void {
  overlayEl.classList.remove('visible');
  overlayEl.classList.remove('blocking');
}

function startGame(): void {
  appEl.innerHTML = '';
  const board = seedBoard({ radius: 3 });
  state = createInitialState(board);
  refs = initRenderer(appEl, board);
  installTapHandlers(refs, board);
  lastPhase = null;                // force overlay refresh on first loop iter
  lastTs = performance.now();
  render(refs, state);
}

function loop(ts: number): void {
  const dt = ts - lastTs;
  lastTs = ts;

  tick(state, dt);
  render(refs, state);

  if (state.phase !== lastPhase) {
    lastPhase = state.phase;
    if (state.phase === 'pre-game')  showHint('Get ready — rotate tiles!');
    if (state.phase === 'running')   hideOverlay();
    if (state.phase === 'derailed')  showBlocking('Derailed — tap to restart');
  }

  requestAnimationFrame(loop);
}

overlayEl.addEventListener('click', () => {
  if (state.phase === 'derailed') startGame();
});

startGame();
requestAnimationFrame(loop);
```

- [ ] **Step 4: Build to verify TypeScript is happy**

```bash
npm run build
```
Expected: `tsc --noEmit` succeeds (no type errors), then Vite builds to `dist/` without errors.

- [ ] **Step 5: Run full test suite**

```bash
npm test -- --run
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/main.ts src/index.html
git rm src/sanity.test.ts
git commit -m "feat: game loop with pre-game and derail overlays"
```

---

## Task 13: Desktop + mobile smoke test, playtest prep

Final verification that Phase A is playable end-to-end.

**Files:**
- Modify (optional): `src/game/state.ts` — tune `DEFAULTS` based on playtest.
- Modify (optional): `src/game/tiles.ts` — tune connection lengths.

### Steps

- [ ] **Step 1: Desktop smoke test**

```bash
npm run dev
```

Open http://localhost:5173 in a browser.

Checklist (all must pass):
- Hex board renders with ~37 tiles (radius 3).
- Each tile shows its track piece (straight line, curve, double-curve, cross, 3-cross).
- "Get ready — rotate tiles!" overlay shown, non-blocking (can tap tiles through it).
- Tapping a tile rotates it 60° with a short animation.
- After ~5 seconds, overlay disappears and train starts moving from origin.
- Train follows rotated track along contiguous connections.
- Train derails when it hits a disconnected edge or off-board neighbor; "Derailed — tap to restart" overlay appears.
- Tapping the derail overlay restarts with a fresh random board.
- The tile currently under the train does not respond to taps (lock-on-entry).
- Origin tile does not respond to taps once the train is moving.

- [ ] **Step 2: Mobile smoke test (optional but recommended)**

```bash
npm run dev -- --host
```
Expected: Vite prints a network URL (e.g. `http://192.168.1.5:5173/`).

Open the network URL on a phone on the same Wi-Fi network. Walk the same checklist. Also check:
- Animations are smooth (~60 fps).
- Tap targets feel large enough.
- No iOS double-tap-to-zoom interference (`user-scalable=no` in viewport meta is set).

- [ ] **Step 3: Tune if needed**

If anything feels off, edit `DEFAULTS` in `src/game/state.ts`:
- `headStartMs`: raise if you can't orient enough tiles in time; lower if too easy.
- `trainSpeed`: lower to slow the train; raise for pressure.

Edit connection lengths in `src/game/tiles.ts` (`BASE` table) to change per-tile pacing. For Phase A, keeping all lengths near 1.0 is fine.

- [ ] **Step 4: Commit any tuning and push**

```bash
git add -u
git commit -m "chore: tune Phase A defaults after playtest" || true
git push
```

`|| true` because there may be no tuning changes — skip the commit if so.

---

## Phase A Complete — Stop Point 1

Phase A ships when all of the following are true:

- Full test suite passes (`npm test -- --run`).
- `npm run build` succeeds.
- The checklist in Task 13 passes on desktop (and ideally on mobile).
- Playtest feedback captured in a few lines in `docs/` or as GitHub issues.

**Next:** Playtest, collect feel notes, then write `docs/superpowers/plans/YYYY-MM-DD-derailed-mvp-phase-b.md` for stations once Phase A feel is dialed in.
