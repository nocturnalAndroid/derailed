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

  const forward = train.entryEdge === conns[activeIdx]!.edges[0];
  const t = forward ? train.progress : 1 - train.progress;

  const pt = path.getPointAtLength(t * path.getTotalLength());
  const ctm = path.getCTM();
  const screenPt = ctm ? pt.matrixTransform(ctm) : pt;

  refs.train.setAttribute('cx', String(screenPt.x));
  refs.train.setAttribute('cy', String(screenPt.y));
}
