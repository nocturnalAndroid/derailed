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
