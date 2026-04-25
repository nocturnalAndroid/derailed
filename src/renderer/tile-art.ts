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
