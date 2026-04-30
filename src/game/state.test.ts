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
    board.set({ q: 0, r: 0 }, { type: 'station', rotation: 0, locked: false });
    const s = createInitialState(board);
    expect(s.phase).toBe('pre-game');
    expect(s.headStartMs).toBe(DEFAULTS.headStartMs);
    expect(s.score).toBe(0);
  });

  it('derives train edges from origin rotation (station)', () => {
    const board = createBoard();
    board.set({ q: 0, r: 0 }, { type: 'station', rotation: 2, locked: false });
    const s = createInitialState(board);
    expect(s.train.entryEdge).toBe(2);
    expect(s.train.exitEdge).toBe(2);  // station self-loop: both edges are the same
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

    // Crossing one length-1 tile takes 1000 / trainSpeed ms.
    tick(s, 1000 / DEFAULTS.trainSpeed + 1);
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
    tick(s, 1000 / DEFAULTS.trainSpeed + 1);   // cross into (1,0), train now there
    expect(board.get({ q: 1, r: 0 })?.locked).toBe(true);
    expect(board.get({ q: 2, r: 0 })?.locked).toBe(false);
  });
});

describe('tick — switch flipping', () => {
  it('flips switchState after train leaves a switch tile', () => {
    const board = createBoard();
    board.set({ q: 0, r: 0 }, { type: 'station', rotation: 0, locked: false });
    // station rotation 0 → self-loop [0,0]. Train entry=0, exit=0.
    // Train exits edge 0 → neighbor (1,-1). Entry = opposite(0) = 3.
    // switch-l rotation 3 state A → shift(0,3)=3, shift(2,3)=5 → [3,5]. Entry 3 matches, exit 5.
    board.set({ q: 1, r: -1 }, { type: 'switch-l', rotation: 3, locked: false, switchState: 'A' });
    // Next tile after switch: neighbor across edge 5 of (1,-1) is (1,-2).
    // Need a tile where entry = opposite(5) = 2 matches.
    board.set({ q: 1, r: -2 }, { type: 'straight', rotation: 2, locked: false }); // [2,5], entry 2 matches

    const s = createInitialState(board);
    tick(s, DEFAULTS.headStartMs + 1); // transition to running
    // Station length=2.0 at speed 0.5 → 4s to cross; switch length=1.0 → 2s to cross.
    // Use two separate ticks so each tile's connection-length is correctly applied.
    tick(s, 2.0 / DEFAULTS.trainSpeed * 1000 + 1); // cross station (4001 ms)
    tick(s, 1.0 / DEFAULTS.trainSpeed * 1000 + 1); // cross switch  (2001 ms)

    expect(board.get({ q: 1, r: -1 })?.switchState).toBe('B');
  });
});

describe('tick — scoring', () => {
  it('increments score when train enters a station', () => {
    const board = createBoard();
    board.set({ q: 0, r: 0 }, { type: 'station', rotation: 0, locked: false });
    // Train exits station edge 0 → neighbor (1,-1). Entry = opposite(0) = 3.
    // Straight at (1,-1) rotation 0 → [0,3]. Entry 3 matches, exit 0.
    board.set({ q: 1, r: -1 }, { type: 'straight', rotation: 0, locked: false });
    // Train exits (1,-1) edge 0 → neighbor (2,-2). Entry = opposite(0) = 3.
    // Station at (2,-2) rotation 3 → self-loop shift(0,3)=3 → [3,3]. Entry 3 matches!
    board.set({ q: 2, r: -2 }, { type: 'station', rotation: 3, locked: false });

    const s = createInitialState(board);
    tick(s, DEFAULTS.headStartMs + 1); // running
    // Cross station (length 2.0) at speed 0.5 → 4s; then straight (length 1.0) → 2s.
    // Use two ticks so each tile's connection-length is correctly applied.
    tick(s, 2.0 / DEFAULTS.trainSpeed * 1000 + 1); // cross origin station (4001 ms)
    tick(s, 1.0 / DEFAULTS.trainSpeed * 1000 + 1); // cross straight → enter station (2001 ms)

    expect(s.score).toBeGreaterThanOrEqual(1);
  });
});
