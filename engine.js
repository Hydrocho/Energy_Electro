(function(root){
'use strict';
const DURATION=30, DT=1/120, MAX_SPEED=4;
const DIFFICULTIES={
 easy:{label:'하',title:'첫 번째 신호',grace:.22,preview:6,penalty:1},
 medium:{label:'중',title:'빛의 메시지',grace:.16,preview:6,penalty:1},
 hard:{label:'상',title:'신호 마스터',grace:.10,preview:2.8,penalty:2}
};
const SIGNALS={
 easy:{title:'첫 번째 신호',description:'긴 빛, 넉넉한 쉼',sequence:[2,2,1,2,1,2,2],gap:1.5},
 medium:{title:'빛의 메시지',description:'짧은 빛과 긴 빛을 번갈아',sequence:[1,2,1,1,2,1,2,1,1,2],gap:.9},
 hard:{title:'신호 마스터',description:'3단계 가속 도전 · 2.8초 미리 보기 · 감점 2배',phases:[
  {start:1.5,end:10,pairs:[[.8,.5],[1.2,.4],[.6,.6],[1,.4],[.7,.5],[.9,.9]]},
  {start:10,end:20,pairs:[[.3,.3],[.3,.3],[.3,.5],[.4,.3],[.3,.3],[.3,.3],[.4,.6],[.3,.3],[.3,.3],[.3,.3],[.3,.5],[.8,.4]]},
  {start:20,end:30,pairs:[[1.2,.3],[.3,.3],[.4,.3],[1.1,.4],[.3,.3],[.3,.3],[.4,.3],[1.2,.3],[.3,.3],[.5,.9]]}
 ]}
};
const charts={};
for(const [mode,p] of Object.entries(SIGNALS)){
 if(p.phases){
  const rows=[{start:0,end:1.5,on:false}];
  for(const phase of p.phases){
   const scale=(phase.end-phase.start)/phase.pairs.flat().reduce((a,b)=>a+b,0);let t=phase.start;
   for(const [on,off] of phase.pairs){rows.push({start:t,end:t+on*scale,on:true});t+=on*scale;rows.push({start:t,end:t+off*scale,on:false});t+=off*scale;}
   rows.at(-1).end=phase.end;
  }
  charts[mode]=rows;continue;
 }
 const total=p.sequence.reduce((a,b)=>a+b,0)+p.sequence.length*p.gap;
 const unit=27/total;let t=1.5;const rows=[{start:0,end:t,on:false}];
 for(const length of p.sequence){rows.push({start:t,end:t+length*unit,on:true});t+=length*unit;rows.push({start:t,end:t+p.gap*unit,on:false});t+=p.gap*unit;}
 rows.at(-1).end=30;charts[mode]=rows;
}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function segmentAt(mode,t){const list=charts[mode]||charts.easy;return list.find(s=>t<s.end-1e-8)||list.at(-1);}
function targetAt(mode,t){return segmentAt(mode,t).on?1:0;}
// Boundary grace never awards free signal points; it only forgives a mismatch.
function judge(mode,t,lit){
 const list=charts[mode],s=segmentAt(mode,t),on=!!lit,grace=DIFFICULTIES[mode].grace;
 if(s.on===on)return s.on?'hit':'rest';
 const index=list.indexOf(s);
 const nearStart=index>0&&t-s.start<grace;
 const nearEnd=index<list.length-1&&s.end-t<grace;
 if(nearStart||nearEnd)return 'grace';
 return s.on?'miss':'penalty';
}
class Engine{
 constructor(mode='easy',practice=false){
 this.mode=DIFFICULTIES[mode]?mode:'easy';this.practice=practice;
 this.x=.5;this.current=0;this.brightness=0;this.lit=false;this.time=0;this.ticks=0;this.accumulator=0;this.done=false;
 this.motionWindow=Array(12).fill(0);this.motionIndex=0;this.motionSum=0;this.lastPowered=-100;
 this.judgments=0;this.hits=0;this.evaluated=0;this.points=0;this.combo=0;this.maxCombo=0;this.lastJudge='';this.penalties=0;
 this.maxHits=0;for(let i=1;i<=300;i++)if(targetAt(this.mode,i/10-.001))this.maxHits++;
 }
 get score(){return Math.round(clamp(this.points/this.maxHits*10000,0,10000));}
 get accuracy(){return this.evaluated?Math.round(this.hits/this.evaluated*100):0;}
 stopMotion(){this.current=0;this.brightness=0;this.lit=false;this.motionWindow.fill(0);this.motionSum=0;}
 step(seconds,targetX){
 if(this.done||!Number.isFinite(seconds)||seconds<=0)return;
 this.accumulator+=Math.min(seconds,.25);const aim=Number.isFinite(targetX)?clamp(targetX,.08,.92):this.x;
 while(this.accumulator+1e-10>=DT&&!this.done){
 this.accumulator-=DT;const old=this.x;this.x+=clamp(aim-this.x,-MAX_SPEED*DT,MAX_SPEED*DT);this.current=(this.x-old)/DT;
 const distance=Math.abs(this.x-old);this.motionSum+=distance-this.motionWindow[this.motionIndex];this.motionWindow[this.motionIndex]=distance;this.motionIndex=(this.motionIndex+1)%12;
 const speed=Math.max(0,this.motionSum)/.1;
 // A stable on/off threshold; excessive speed never earns extra points.
 this.lit=speed>=(this.lit?.18:.28);this.brightness=this.lit?.85:0;
 if(this.lit)this.lastPowered=this.time;
 this.ticks++;this.time=this.ticks*DT;
 if(!this.practice&&this.ticks%12===0){
 const t=this.time-.001;const held=targetAt(this.mode,t)&&this.time-this.lastPowered<=.12;
 this.lastJudge=judge(this.mode,t,this.lit||held);this.judgments++;
 if(this.lastJudge!=='grace'){
 this.evaluated++;
 if(this.lastJudge==='hit'){this.points++;this.hits++;this.combo++;}
 else if(this.lastJudge==='rest'){this.hits++;}
 else {this.combo=0;if(this.lastJudge==='penalty'){this.points=Math.max(0,this.points-DIFFICULTIES[this.mode].penalty);this.penalties++;}}
 this.maxCombo=Math.max(this.maxCombo,this.combo);
 }
 }
 if(!this.practice&&this.ticks>=3600){this.done=true;this.time=30;}
 }
 }
 result(){return {score:this.score,accuracy:this.accuracy,combo:this.maxCombo};}
}
const api={Engine,DIFFICULTIES,SIGNALS,DURATION,MAX_SPEED,charts,targetAt,segmentAt,judge,clamp};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LightRhythm=api;
})(typeof globalThis!=='undefined'?globalThis:this);
