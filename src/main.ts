import { RampageGame } from './game-rampage';
import { initSdk } from './sdk';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas not found');

const params = new URLSearchParams(window.location.search);
const screenshotMode = params.has('screenshot');
const screenshotChunkId = params.has('chunk') ? parseInt(params.get('chunk')!, 10) : null;
if (screenshotMode) document.body.classList.add('screenshot-mode');

const wrap = document.getElementById('wrap') as HTMLElement;
function applyScale() {
  const scale = Math.min(window.innerWidth / 360, window.innerHeight / 580);
  wrap.style.transform = `scale(${scale})`;
}
window.addEventListener('resize', applyScale);
applyScale();

// Keep the existing high-quality legacy shell and visuals, while the rampage
// integration layer replaces the old fuel/stage economy in small phases.
const style = document.createElement('style');
style.textContent = `
  #life-wrap::before { content: 'SPEED' !important; }
`;
document.head.appendChild(style);
const leftTitle = document.querySelector('#side-left .title-big');
if (leftTitle) leftTitle.innerHTML = 'RAMPAGE<br>PINBALL';
const leftSub = document.querySelector('#side-left .sub');
if (leftSub) leftSub.innerHTML = 'CRUSH THE CITY<br>STOMP FOR SPEED';
const rightTitle = document.querySelector('#side-right .title-big');
if (rightTitle) rightTitle.innerHTML = 'SPEED<br>CHAIN';
const rightSub = document.querySelector('#side-right .sub');
if (rightSub) rightSub.innerHTML = 'BREAK SMALL BUILDINGS<br>CRUSH HUMANS<br>KEEP SPEED<br>OVERDRIVE';

initSdk();

try {
  const game = new RampageGame(canvas, { screenshotMode, screenshotChunkId });
  void game;
  const loading = document.getElementById('loading');
  if (loading) {
    loading.classList.add('hidden');
    setTimeout(() => loading.remove(), 400);
  }
} catch (err) {
  console.error('Game init failed:', err);
  const loading = document.getElementById('loading');
  if (loading) loading.remove();
  const noWebgl = document.getElementById('no-webgl');
  if (noWebgl) noWebgl.classList.add('show');
}
