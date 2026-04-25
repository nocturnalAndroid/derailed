import type { RendererRefs } from './svg';
import type { GameState } from '../game/state';
import { DEFAULTS } from '../game/state';
import { hexKey } from '../game/hex';
import { hexToPixel, edgeMidpoint, HEX_SIZE } from './hex-geometry';
import { connections } from '../game/tiles';

export function render(refs: RendererRefs, state: GameState): void {
  updateTiles(refs, state);
  updateTrain(refs, state);
  updateCountdown(refs, state);
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

  const center = hexToPixel(train.tile);

  if (state.phase === 'pre-game') {
    const exitMid = edgeMidpoint(train.exitEdge);
    const angleDeg = (Math.atan2(exitMid.y, exitMid.x) * 180) / Math.PI;
    refs.train.setAttribute('transform', `translate(${center.x} ${center.y}) rotate(${angleDeg})`);
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
  const total = path.getTotalLength();
  const t = forward ? train.progress : 1 - train.progress;
  const len = t * total;

  const local = path.getPointAtLength(len);
  // Sample slightly ahead in travel direction for heading.
  const dir = forward ? 1 : -1;
  const eps = 0.5;
  const sampleLen = Math.min(total, Math.max(0, len + dir * eps));
  const lookAhead = path.getPointAtLength(sampleLen);
  const dxLocal = (lookAhead.x - local.x) * dir;
  const dyLocal = (lookAhead.y - local.y) * dir;

  const rad = (tile.rotation * 60 * Math.PI) / 180;
  const c = Math.cos(rad), s = Math.sin(rad);
  const x = center.x + local.x * c - local.y * s;
  const y = center.y + local.x * s + local.y * c;
  const hx = dxLocal * c - dyLocal * s;
  const hy = dxLocal * s + dyLocal * c;
  const angleDeg = (Math.atan2(hy, hx) * 180) / Math.PI;

  refs.train.setAttribute('transform', `translate(${x} ${y}) rotate(${angleDeg})`);
}

function updateCountdown(refs: RendererRefs, state: GameState): void {
  if (state.phase !== 'pre-game') {
    refs.countdown.style.display = 'none';
    refs.countdownRing.style.display = 'none';
    return;
  }

  const { x, y } = hexToPixel(state.train.tile);
  const remaining = Math.max(0, state.headStartMs);
  const secs = Math.ceil(remaining / 1000);
  const frac = remaining / DEFAULTS.headStartMs;

  refs.countdown.style.display = '';
  refs.countdown.setAttribute('x', String(x));
  refs.countdown.setAttribute('y', String(y));
  refs.countdown.textContent = String(secs);

  const r = HEX_SIZE * 0.42;
  const circ = 2 * Math.PI * r;
  refs.countdownRing.style.display = '';
  refs.countdownRing.setAttribute('cx', String(x));
  refs.countdownRing.setAttribute('cy', String(y));
  refs.countdownRing.setAttribute('transform', `rotate(-90 ${x} ${y})`);
  refs.countdownRing.setAttribute('stroke-dasharray', String(circ));
  refs.countdownRing.setAttribute('stroke-dashoffset', String(circ * (1 - frac)));
}
