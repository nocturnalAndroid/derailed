import { seedBoard } from './game/board';
import { createInitialState, tick, type GameState } from './game/state';
import { initRenderer, type RendererRefs } from './renderer/svg';
import { render } from './renderer/update';
import { installTapHandlers } from './input/tap';

const appEl = document.getElementById('app')!;
const overlayEl = document.getElementById('overlay')!;
const overlayTextEl = document.getElementById('overlay-text')!;

let state: GameState;
let refs: RendererRefs;
let lastTs = 0;
let lastPhase: GameState['phase'] | null = null;

function showBlocking(text: string): void {
  overlayTextEl.textContent = text;
  overlayEl.classList.add('visible');
  overlayEl.classList.add('blocking');
}

function hideOverlay(): void {
  overlayEl.classList.remove('visible');
  overlayEl.classList.remove('blocking');
}

function startGame(): void {
  appEl.innerHTML = '';
  const board = seedBoard({ radius: 5 });
  state = createInitialState(board);
  refs = initRenderer(appEl, board);
  installTapHandlers(refs, board);
  lastPhase = null;
  lastTs = performance.now();
  render(refs, state);
}

function loop(ts: number): void {
  const dt = ts - lastTs;
  lastTs = ts;

  tick(state, dt);
  render(refs, state);

  if (state.phase !== lastPhase) {
    lastPhase = state.phase;
    if (state.phase === 'pre-game')  hideOverlay();
    if (state.phase === 'running')   hideOverlay();
    if (state.phase === 'derailed')  showBlocking('Derailed — tap to restart');
  }

  requestAnimationFrame(loop);
}

overlayEl.addEventListener('click', () => {
  if (state.phase === 'derailed') startGame();
});

startGame();
requestAnimationFrame(loop);
