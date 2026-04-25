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
  headStartMs: 7000,
  trainSpeed: 0.5,   // connection-lengths per second
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
