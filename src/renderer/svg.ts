import { hexKey } from '../game/hex';
import type { Board } from '../game/board';
import { hexToPixel, HEX_SIZE } from './hex-geometry';
import { tracksFor } from './tile-art';

const SVG_NS = 'http://www.w3.org/2000/svg';

export type RendererRefs = {
  svg: SVGSVGElement;
  tiles: Map<string, {
    group: SVGGElement;
    paths: SVGPathElement[];
  }>;
  train: SVGGElement;
  countdown: SVGTextElement;
  countdownRing: SVGCircleElement;
};

export function initRenderer(container: HTMLElement, board: Board): RendererRefs {
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
  svg.style.display = 'block';
  svg.style.width = '100vw';
  svg.style.height = '100vh';
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

  const train = document.createElementNS(SVG_NS, 'g');
  const tri = document.createElementNS(SVG_NS, 'polygon');
  const tip = HEX_SIZE * 0.32;
  const back = HEX_SIZE * 0.22;
  tri.setAttribute('points', `${tip},0 ${-back},${-back} ${-back},${back}`);
  tri.setAttribute('fill', '#ffffff');
  tri.setAttribute('stroke', '#202020');
  tri.setAttribute('stroke-width', '2');
  tri.setAttribute('stroke-linejoin', 'round');
  train.appendChild(tri);
  train.style.transition = 'transform 0.08s linear';
  svg.appendChild(train);

  const countdownRing = document.createElementNS(SVG_NS, 'circle');
  countdownRing.setAttribute('r', String(HEX_SIZE * 0.42));
  countdownRing.setAttribute('fill', 'none');
  countdownRing.setAttribute('stroke', '#e0c878');
  countdownRing.setAttribute('stroke-width', '3');
  countdownRing.setAttribute('stroke-linecap', 'round');
  countdownRing.style.display = 'none';
  svg.appendChild(countdownRing);

  const countdown = document.createElementNS(SVG_NS, 'text');
  countdown.setAttribute('text-anchor', 'middle');
  countdown.setAttribute('dominant-baseline', 'central');
  countdown.setAttribute('font-size', String(HEX_SIZE * 0.55));
  countdown.setAttribute('font-weight', '700');
  countdown.setAttribute('fill', '#1a1a1a');
  countdown.style.pointerEvents = 'none';
  countdown.style.display = 'none';
  svg.appendChild(countdown);

  return { svg, tiles, train, countdown, countdownRing };
}

function buildHexBackground(size: number): SVGPolygonElement {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
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
