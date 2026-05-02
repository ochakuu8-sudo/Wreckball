/**
 * ui.ts — DOM UI 更新 (燃料ゲージ + ステージ + SCORE + CLEAR/GAMEOVER + BEST + PAUSE)
 */

import * as C from './constants';

export class UIManager {
  private elDistance    = document.getElementById('distance-display')!;
  private elZone        = document.getElementById('zone-display')!;
  private elScore       = document.getElementById('score-display')!;
  private elBest        = document.getElementById('best-display')!;
  private elFuelWrap    = document.getElementById('life-wrap')!;
  private elFuelFill    = document.getElementById('life-fill')!;
  private elGameover    = document.getElementById('gameover')!;
  private elFinalScore  = document.getElementById('final-score')!;
  private elFinalBest   = document.getElementById('final-best')!;
  private elFinalStats  = document.getElementById('final-stats')!;
  private elFinalRecord = document.getElementById('final-record')!;
  private elClear       = document.getElementById('clear')!;
  private elClearScore  = document.getElementById('clear-score')!;
  private elClearDist   = document.getElementById('clear-dist')!;
  private elClearStats  = document.getElementById('clear-stats')!;
  private elClearRecord = document.getElementById('clear-record')!;
  private elStageClear      = document.getElementById('stage-clear')!;
  private elStageClearTitle = document.getElementById('stage-clear-title')!;
  private elStageClearSub   = document.getElementById('stage-clear-sub')!;
  private elStageClearNext  = document.getElementById('stage-clear-next')!;
  private elStageClearScore = document.getElementById('stage-clear-score')!;
  private elStageClearFuel  = document.getElementById('stage-clear-fuel')!;
  private elPopupLayer  = document.getElementById('popup-layer')!;
  private elPause       = document.getElementById('pause')!;

  constructor() {
    // 黄色ベースの fill (ピンチ時は CSS class で赤に切り替え)
  }

  setDistance(meters: number) {
    this.elDistance.textContent = `${meters.toLocaleString()} m`;
  }

  setCheckpoint(distanceM: number, nextCheckpointM: number, secondsLeft: number) {
    const time = Math.max(0, secondsLeft);
    this.elDistance.textContent =
      `${distanceM.toLocaleString()}m CP${nextCheckpointM.toLocaleString()} ${time.toFixed(1)}s`;
  }

  /** ステージ表示: "STAGE N / NAME" (N は 1-origin)。Rampage では CHAIN 表示にも使う。 */
  setZone(stageIndex: number, stageNameEn: string) {
    this.elZone.textContent = stageIndex < 0 ? stageNameEn : `STAGE ${stageIndex + 1} / ${stageNameEn}`;
  }

  /** 現在スコア (建物・車両・家具の破壊で累積) */
  setScore(score: number) {
    this.elScore.textContent = `SCORE ${score.toLocaleString()}`;
  }

  /** ベストスコア HUD 表示 (0 の場合は隠す) */
  setBest(score: number) {
    if (score > 0) {
      this.elBest.textContent = `BEST ${score.toLocaleString()}`;
      this.elBest.classList.remove('hidden');
    } else {
      this.elBest.classList.add('hidden');
    }
  }

  setGear(chargePercent: number, gear: number, downThreshold: number) {
    const pct = Math.max(0, Math.min(100, chargePercent));
    this.elFuelFill.style.width = `${pct}%`;
    this.elFuelWrap.dataset.gear = String(gear);
    const low  = chargePercent <= downThreshold * 1.8 && chargePercent > downThreshold;
    const crit = chargePercent <= downThreshold;
    this.elFuelWrap.classList.toggle('low',  low);
    this.elFuelWrap.classList.toggle('crit', crit);
  }

  setSpeed(momentum: number) {
    this.setGear(momentum, 1, C.FUEL_LOW_THRESHOLD / 2);
  }

  /** 燃料ゲージ互換: Rampage では SPEED へ委譲する */
  setFuel(fuel: number) {
    this.setSpeed(fuel);
  }

  setChain(combo: number, overdrive: boolean, speedPhase = '') {
    const phase = overdrive ? 'OVERDRIVE' : speedPhase;
    const chain = `CHAIN x${combo}`;
    const label = phase ? `${phase} / ${chain}` : chain;
    this.setZone(-1, label);
  }

  setRaceStatus(gear: number, phase: string, chain: number) {
    this.setZone(-1, `G${gear} ${phase} / HUMAN x${chain}`);
  }

  /** 毎フレーム1回: ポップアップレイヤー全体をカメラに追従 */
  updatePopupLayer(cameraY: number) {
    this.elPopupLayer.style.transform = `translateY(${cameraY}px)`;
  }

  showGameOver(distanceM: number, score: number, destroys: number, humans: number, best: number) {
    this.showRunOver(distanceM, score, destroys, humans, 0, best);
  }

  showRunOver(distanceM: number, score: number, destroys: number, humans: number, maxCombo: number, best: number) {
    const title = this.elGameover.querySelector('h1');
    if (title) title.textContent = 'RUN OVER';
    this.elFinalScore.textContent  = `SCORE ${score.toLocaleString()}`;
    this.elFinalBest.textContent   = `${distanceM.toLocaleString()} m | ${destroys} DESTROYED`;
    this.elFinalStats.textContent  = `${humans.toLocaleString()} STOMPS | MAX CHAIN x${maxCombo}`;
    this.elFinalRecord.textContent = `BEST ${best.toLocaleString()}`;
    this.elGameover.classList.add('show');
  }

  hideGameOver() {
    this.elGameover.classList.remove('show');
  }

  showClear(distanceM: number, score: number, destroys: number, humans: number, best: number) {
    this.elClearScore.textContent  = `SCORE ${score.toLocaleString()}`;
    this.elClearDist.textContent   = `${distanceM.toLocaleString()} m | ${destroys} DESTROYED`;
    this.elClearStats.textContent  = `${humans.toLocaleString()} STOMPS`;
    this.elClearRecord.textContent = `BEST ${best.toLocaleString()}`;
    this.elClear.classList.add('show');
  }

  hideClear() {
    this.elClear.classList.remove('show');
  }

  showStageClear(stageIndex: number, stageNameEn: string, nextStageNameEn: string, score: number, fuel: number) {
    const fuelPct = Math.max(0, Math.min(100, Math.round((fuel / C.FUEL_MAX) * 100)));
    this.elStageClearTitle.textContent = `STAGE ${stageIndex + 1} CLEAR`;
    this.elStageClearSub.textContent   = stageNameEn;
    this.elStageClearNext.textContent  = `NEXT: ${nextStageNameEn}`;
    this.elStageClearScore.textContent = `SCORE ${score.toLocaleString()}`;
    this.elStageClearFuel.textContent  = `GEAR ${fuelPct}%`;
    this.elStageClear.classList.add('show');
  }

  hideStageClear() {
    this.elStageClear.classList.remove('show');
  }

  setPauseVisible(visible: boolean) {
    this.elPause.classList.toggle('show', visible);
  }

  showWorldPopup(worldX: number, worldY: number, text: string, kind: 'fuel' | 'boom' | 'pierce' | 'score' = 'score') {
    const el = document.createElement('div');
    el.className = `world-popup ${kind}`;
    el.textContent = text;
    el.style.left = `${worldX + C.CANVAS_WIDTH / 2}px`;
    el.style.top = `${C.CANVAS_HEIGHT / 2 - worldY}px`;
    this.elPopupLayer.appendChild(el);
    setTimeout(() => el.remove(), 850);
  }

  showSpeedPopup(worldX: number, worldY: number, combo: number, overdrive: boolean, shiftedUp = false) {
    const text = shiftedUp ? 'GEAR UP' : overdrive ? 'OVERDRIVE' : `+GEAR x${combo}`;
    this.showWorldPopup(worldX, worldY, text, 'fuel');
  }
}
