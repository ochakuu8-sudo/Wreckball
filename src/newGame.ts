import * as C from './constants';

type GridCellTag = 'residential'|'small'|'commercial'|'public'|'medium'|'large'|'danger'|'no_spawn'|'edge'|'center'|'upper'|'lower';
type BuildingTag = 'residential'|'commercial'|'public'|'danger'|'crowd'|'explosive'|'landmark';

type Card = {id:string;name:string;level:number;cooldownSec:number;cooldownTimer:number;footprint:{w:number;h:number};score:number;exp:number;hp:number;tags:BuildingTag[];preferredTags:GridCellTag[];forbiddenTags:GridCellTag[];maxActive:number};
type Cell={col:number;row:number;x:number;y:number;tags:GridCellTag[];occ:string|null};
type Spawn={id:string;cardId:string;col:number;row:number;w:number;h:number;hp:number;score:number;exp:number;initial:boolean;cooldown:boolean};
type Pending={cardId:string;col:number;row:number;w:number;h:number;t:number};

const GRID=8,CELL=40,OX=20,OY=80;
const MAX_OCCUPIED=28;

export class NewGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ball={x:180,y:520,vx:120,vy:-120,r:10};
  private left=false;private right=false;
  private score=0; private exp=0; private level=1; private expNeed=100; private pendingLevels=0;
  private round=1; private quota=10000; private balls=3;
  private cards: Card[]=[];
  private cells: Cell[]=[];
  private buildings: Spawn[]=[];
  private pending: Pending[]=[];
  private loopId=0; private last=performance.now();
  private ended=false;
  constructor(canvas: HTMLCanvasElement){
    this.canvas=canvas;
    const ctx=canvas.getContext('2d'); if(!ctx) throw new Error('2D context missing'); this.ctx=ctx;
    this.initGrid(); this.initCards(); this.seedInitial(); this.bind(); this.tick();
  }
  private initGrid(){
    const rows=[['danger','danger','large','large','large','large','danger','danger'],['danger','medium','medium','large','large','medium','medium','danger'],['medium','medium','commercial','commercial','commercial','commercial','medium','medium'],['medium','commercial','commercial','public','public','commercial','commercial','medium'],['small','small','commercial','public','public','commercial','small','small'],['small','residential','residential','small','small','residential','residential','small'],['residential','residential','residential','small','small','residential','residential','residential'],['no_spawn','no_spawn','residential','residential','residential','residential','no_spawn','no_spawn']] as GridCellTag[][];
    for(let r=0;r<GRID;r++) for(let c=0;c<GRID;c++){
      const tags=[rows[r][c] as GridCellTag]; if(r<3) tags.push('upper'); else tags.push('lower'); if(c===0||c===7) tags.push('edge'); if(c>=2&&c<=5) tags.push('center');
      this.cells.push({col:c,row:r,x:OX+c*CELL,y:OY+r*CELL,tags,occ:null});
    }
  }
  private initCards(){
    this.cards=[
      {id:'house',name:'住宅',level:1,cooldownSec:2.2,cooldownTimer:0.4,footprint:{w:1,h:1},score:400,exp:10,hp:1,tags:['residential'],preferredTags:['residential','small','lower'],forbiddenTags:['no_spawn'],maxActive:8},
      {id:'conbini',name:'コンビニ',level:1,cooldownSec:3.6,cooldownTimer:1.2,footprint:{w:1,h:1},score:800,exp:16,hp:2,tags:['commercial'],preferredTags:['commercial','lower'],forbiddenTags:['no_spawn'],maxActive:6},
      {id:'apartment',name:'アパート',level:1,cooldownSec:5,cooldownTimer:2.1,footprint:{w:1,h:2},score:1600,exp:26,hp:3,tags:['residential','crowd'],preferredTags:['residential','medium'],forbiddenTags:['no_spawn'],maxActive:4},
      {id:'gas',name:'ガソリン',level:1,cooldownSec:7,cooldownTimer:3.2,footprint:{w:2,h:1},score:1700,exp:20,hp:2,tags:['danger','explosive'],preferredTags:['danger','edge'],forbiddenTags:['no_spawn'],maxActive:3},
      {id:'tower',name:'タワー',level:1,cooldownSec:10,cooldownTimer:4.8,footprint:{w:2,h:2},score:4500,exp:40,hp:5,tags:['landmark'],preferredTags:['large','upper','center'],forbiddenTags:['no_spawn','lower'],maxActive:2},
    ];
  }
  private seedInitial(){ for(let i=0;i<10;i++) this.trySpawn(this.cards[i%3],true); }
  private bind(){ window.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')this.left=true; if(e.key==='ArrowRight')this.right=true; if(e.key===' ') this.restartIfEnded();}); window.addEventListener('keyup',e=>{if(e.key==='ArrowLeft')this.left=false; if(e.key==='ArrowRight')this.right=false;}); }
  private restartIfEnded(){ if(!this.ended) return; this.score=0;this.exp=0;this.level=1;this.expNeed=100;this.pendingLevels=0;this.round=1;this.quota=10000;this.balls=3;this.buildings=[];this.pending=[];for(const c of this.cells)c.occ=null; for(const card of this.cards){card.level=1;card.cooldownTimer=Math.random()*card.cooldownSec;} this.seedInitial(); this.ball={x:180,y:520,vx:120,vy:-120,r:10}; this.ended=false; }
  private occupiedCount(){return this.cells.filter(c=>c.occ).length;}
  private tick=()=>{const now=performance.now(); const dt=Math.min(0.033,(now-this.last)/1000); this.last=now; if(!this.ended){this.update(dt);} this.render(); this.loopId=requestAnimationFrame(this.tick);};
  private update(dt:number){
    for(const card of this.cards){ card.cooldownTimer-=dt; if(card.cooldownTimer<=0){ if(this.activeCount(card.id)<card.maxActive && this.occupiedCount()<MAX_OCCUPIED){ this.trySpawn(card,false);} card.cooldownTimer=card.cooldownSec; }}
    this.pending=this.pending.filter(p=>{p.t-=dt; if(p.t>0) return true; const card=this.cards.find(c=>c.id===p.cardId)!; this.place(card,p.col,p.row,p.w,p.h,false); return false;});
    this.ball.vy += 600*dt; this.ball.x += this.ball.vx*dt; this.ball.y += this.ball.vy*dt;
    if(this.ball.x<10||this.ball.x>350){this.ball.vx*=-1; this.ball.x=Math.max(10,Math.min(350,this.ball.x));}
    if(this.ball.y<10){this.ball.vy=Math.abs(this.ball.vy);}    
    const flY=540; if(this.ball.y>flY&&this.ball.y<552){ if(this.left&&this.ball.x<180){this.ball.vy=-Math.abs(this.ball.vy)-180;this.ball.vx-=80;} if(this.right&&this.ball.x>180){this.ball.vy=-Math.abs(this.ball.vy)-180;this.ball.vx+=80;}}
    for(const b of [...this.buildings]){ const x=OX+b.col*CELL,y=OY+b.row*CELL,w=b.w*CELL,h=b.h*CELL; if(this.ball.x+this.ball.r>x&&this.ball.x-this.ball.r<x+w&&this.ball.y+this.ball.r>y&&this.ball.y-this.ball.r<y+h){ b.hp--; this.ball.vy*=-0.9; if(b.hp<=0) this.destroyBuilding(b);} }
    if(this.ball.y>580){ this.balls--; if(this.balls<=0){ this.endRound(); } this.ball={x:180,y:520,vx:(Math.random()-0.5)*130,vy:-160,r:10}; }
  }
  private endRound(){ if(this.score>=this.quota){ this.round++; this.quota=Math.floor(this.quota*2.4); this.balls=3; this.applyLevelUps(); } else { this.ended=true; } }
  private applyLevelUps(){ while(this.pendingLevels-->0){ const c=this.cards[Math.floor(Math.random()*this.cards.length)]; c.level++; c.score=Math.floor(c.score*1.2); c.cooldownSec=Math.max(1.3,c.cooldownSec*0.92);} this.pendingLevels=0; }
  private destroyBuilding(b:Spawn){ this.buildings=this.buildings.filter(x=>x.id!==b.id); this.free(b.id); this.score+=b.score; this.exp+=b.exp; while(this.exp>=this.expNeed){ this.exp-=this.expNeed; this.level++; this.pendingLevels++; this.expNeed=Math.floor(this.expNeed*1.35);} }
  private free(id:string){ for(const c of this.cells){ if(c.occ===id) c.occ=null; }}
  private activeCount(id:string){ return this.buildings.filter(b=>b.cardId===id).length + this.pending.filter(p=>p.cardId===id).length; }
  private trySpawn(card:Card,initial:boolean){ const candidates:{col:number;row:number;w:number}[]=[]; for(let r=0;r<=GRID-card.footprint.h;r++) for(let c=0;c<=GRID-card.footprint.w;c++){ if(this.canPlace(c,r,card)){ let w=1; const tags=this.tagsAt(c,r); for(const t of card.preferredTags){ if(tags.has(t)) w+=2;} if(tags.has('no_spawn')) w=0; candidates.push({col:c,row:r,w}); }} if(!candidates.length) return; const pick=this.weighted(candidates); this.pending.push({cardId:card.id,col:pick.col,row:pick.row,w:card.footprint.w,h:card.footprint.h,t:initial?0.1:1.0}); }
  private place(card:Card,col:number,row:number,w:number,h:number,initial:boolean){ if(!this.canPlace(col,row,card)) return; const id=`${card.id}-${Math.random().toString(36).slice(2,8)}`; for(let dy=0;dy<h;dy++) for(let dx=0;dx<w;dx++) this.cell(col+dx,row+dy)!.occ=id; this.buildings.push({id,cardId:card.id,col,row,w,h,hp:card.hp+card.level-1,score:card.score,exp:card.exp,initial,cooldown:!initial}); }
  private canPlace(col:number,row:number,card:Card){ for(let dy=0;dy<card.footprint.h;dy++) for(let dx=0;dx<card.footprint.w;dx++){ const cell=this.cell(col+dx,row+dy); if(!cell||cell.occ) return false; if(cell.tags.includes('no_spawn')) return false; if(card.forbiddenTags.some(t=>cell.tags.includes(t))) return false; if(this.ball.y>cell.y-40&&this.ball.y<cell.y+80&&Math.abs(this.ball.x-cell.x)<50) return false;} return true; }
  private cell(c:number,r:number){ return this.cells.find(x=>x.col===c&&x.row===r);}
  private tagsAt(c:number,r:number){ return new Set(this.cell(c,r)?.tags??[]);}
  private weighted<T extends {w:number}>(items:T[]):T{ const total=items.reduce((a,b)=>a+b.w,0); let t=Math.random()*total; for(const i of items){t-=i.w;if(t<=0)return i;} return items[items.length-1]; }
  private render(){ const g=this.ctx; g.clearRect(0,0,360,580); g.fillStyle='#10131a'; g.fillRect(0,0,360,580); g.strokeStyle='#2f3d4d'; for(const c of this.cells){ g.strokeRect(c.x,c.y,CELL,CELL); }
    for(const p of this.pending){ g.fillStyle='rgba(255,255,0,0.35)'; g.fillRect(OX+p.col*CELL+4,OY+p.row*CELL+4,p.w*CELL-8,p.h*CELL-8);}    
    for(const b of this.buildings){ g.fillStyle=b.cardId==='tower'?'#86b0ff':b.cardId==='gas'?'#f0b23f':b.cardId==='apartment'?'#9ac69a':'#c2c2c2'; g.fillRect(OX+b.col*CELL+3,OY+b.row*CELL+3,b.w*CELL-6,b.h*CELL-6);}    
    g.fillStyle='#ddd'; g.beginPath(); g.arc(this.ball.x,this.ball.y,this.ball.r,0,Math.PI*2); g.fill();
    g.fillStyle='#88f'; g.fillRect(110,546,60,8); g.fillRect(190,546,60,8);
    const score=document.getElementById('score-display'); if(score) score.textContent=`SCORE ${this.score.toLocaleString()}`;
    const zone=document.getElementById('zone-display'); if(zone) zone.textContent=`ROUND ${this.round} / QUOTA ${this.quota.toLocaleString()} / BALLS ${this.balls}`;
    const dist=document.getElementById('distance-display'); if(dist) dist.textContent=`EXP ${this.exp}/${this.expNeed} LV ${this.level} (+${this.pendingLevels}UP)`;
    const best=document.getElementById('best-display'); if(best) best.textContent=`CARDS ${this.cards.map(c=>`${c.name}Lv${c.level}`).join(' | ')}`;
    if(this.ended){ g.fillStyle='rgba(0,0,0,0.6)'; g.fillRect(0,0,360,580); g.fillStyle='#fff'; g.fillText('RUN OVER - SPACE TO RETRY',80,280);} }
}
