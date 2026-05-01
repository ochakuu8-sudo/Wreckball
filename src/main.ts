import { RampageGame } from './rampage-game-safe';
import { initSdk } from './sdk';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas not found');

const wrap = document.getElementById('wrap') as HTMLElement;
function applyScale() {
  const scale = Math.min(window.innerWidth / 360, window.innerHeight / 580);
  wrap.style.transform = `scale(${scale})`;
}
window.addEventListener('resize', applyScale);
applyScale();

// Runtime copy overrides keep the existing index.html shell while the new
// rampage loop owns the actual game rules.
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
if (rightTitle) rightTitle.innerHTML = 'WRECK<br>POWER';
const rightSub = document.querySelector('#side-right .sub');
if (rightSub) rightSub.innerHTML = 'BUILD MOMENTUM<br>BREAK BIGGER BLOCKS<br>CHAIN HUMANS<br>OVERDRIVE';

initSdk();

try {
  const game = new RampageGame(canvas);
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
