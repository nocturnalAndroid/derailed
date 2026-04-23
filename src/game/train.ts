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
