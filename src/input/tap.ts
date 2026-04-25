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
