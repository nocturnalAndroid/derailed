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
  const matches = connections(neighborTile).filter(
    c => c.edges[0] === entryEdge || c.edges[1] === entryEdge,
  );
  if (matches.length === 0) return null;
  const conn = matches.find(c => c.active !== false) ?? matches[0]!;

  const exitEdge: Edge = conn.edges[0] === entryEdge ? conn.edges[1] : conn.edges[0];

  return {
    tile: neighborHex,
    entryEdge,
    exitEdge,
    progress: 0,
    speed: train.speed,
  };
}
