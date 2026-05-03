import { Game } from './game';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas not found');

const params = new URLSearchParams(window.location.search);
const screenshotMode = params.has('screenshot');
const screenshotChunkId = params.has('chunk') ? parseInt(params.get('chunk')!, 10) : null;
document.title = 'Wreckball';
if (screenshotMode) document.body.classList.add('screenshot-mode');

const wrap = document.getElementById('wrap') as HTMLElement;
function applyScale() {
  const scale = Math.min(window.innerWidth / 360, window.innerHeight / 580);
  wrap.style.transform = `scale(${scale})`;
}
window.addEventListener('resize', applyScale);
applyScale();

const leftTitle = document.querySelector('#side-left .title-big');
if (leftTitle) leftTitle.innerHTML = 'WRECKBALL';
const leftSub = document.querySelector('#side-left .sub');
if (leftSub) leftSub.innerHTML = 'CRUSH THE CITY<br>EAT FOR GEARS';
const rightTitle = document.querySelector('#side-right .title-big');
if (rightTitle) rightTitle.innerHTML = 'GEAR<br>CHAIN';
const rightSub = document.querySelector('#side-right .sub');
if (rightSub) rightSub.innerHTML = 'BREAK SMALL BUILDINGS<br>EAT HUMANS<br>SHIFT UP<br>OVERDRIVE';

try {
  const game = new Game(canvas, { screenshotMode, screenshotChunkId });
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
