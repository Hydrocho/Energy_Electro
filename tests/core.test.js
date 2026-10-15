const {test}=require('node:test');const assert=require('node:assert/strict');const E=require('../engine.js'),R=require('../records.js');
function memory(){const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};}
const record={score:8000,accuracy:90,combo:34};
test('records separate difficulties, cap history, retain best and roll date', () => {
  const mem=memory(); let now=new Date(2026,9,13,23,59);
  const s=R.createStore(mem,()=>now);
  for(let i=0;i<12;i++) s.add('easy',{...record,score:7000+i});
  s.add('hard',record);
  assert.equal(s.read().modes.easy.count,12);
  assert.equal(s.read().modes.easy.recent.length,10);
  assert.equal(s.read().modes.easy.best,7011);
  assert.equal(s.read().modes.hard.best,8000);
  assert.equal(R.createStore(mem,()=>now).read().modes.hard.best,8000);
  now=new Date(2026,9,14); assert.equal(s.read().modes.hard.count,0);
});
test('corrupt data and disabled storage recover without losing in-memory play', () => {
  const s=R.createStore({getItem:()=>'{broken',setItem:()=>{} });
  assert.equal(s.read().modes.easy.count,0);
  const off=R.createStore({getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}});
  off.add('easy',record); assert.equal(off.read().modes.easy.best,8000);assert.equal(off.available,false);
});
test('date uses local calendar components and invalid records are rejected', () => {
  assert.equal(R.localDate(new Date(2026,0,2)), '2026-01-02');
  const s=R.createStore(memory());
  assert.throws(()=>s.add('easy',{...record,score:Infinity}));
  assert.equal(s.read().modes.easy.count,0);
});
test('today max combo survives truncation and another open store reads fresh records', () => {
  const mem=memory(),s=R.createStore(mem),other=R.createStore(mem);
  other.read();s.add('easy',{...record,combo:250});
  for(let i=0;i<12;i++)s.add('easy',{...record,combo:10});
  assert.equal(s.read().modes.easy.bestCombo,250);
  assert.equal(other.read().modes.easy.count,13);
  other.add('easy',record);assert.equal(s.read().modes.easy.count,14);
});

test('seven binary charts fit 60 seconds and get progressively denser',()=>{
 let prior=0;for(const mode of Object.keys(E.DIFFICULTIES)){const chart=E.charts[mode];assert.equal(chart[0].start,0);assert.equal(chart.at(-1).end,60);assert.equal(E.targetAt(mode,0),0);const count=chart.filter(s=>s.on).length;assert.ok(count>prior);prior=count;for(let i=0;i<chart.length;i++){assert.ok(chart[i].end>chart[i].start);if(i)assert.ok(Math.abs(chart[i].start-chart[i-1].end)<1e-8);}}
});
test('signal hit, dark rest, missing light, extra light and boundary forgiveness are distinct',()=>{
 for(const mode of Object.keys(E.DIFFICULTIES)){const signal=E.charts[mode].find(s=>s.on);const gap=E.charts[mode][2];const on=(signal.start+signal.end)/2,off=(gap.start+gap.end)/2;
 assert.equal(E.judge(mode,on,true),'hit');assert.equal(E.judge(mode,on,false),'miss');assert.equal(E.judge(mode,off,false),'rest');assert.equal(E.judge(mode,off,true),'penalty');assert.equal(E.judge(mode,signal.start+.01,false),'grace');}
});
function play(mode,policy,speed=.8){const e=new E.Engine(mode);let x=.5,dir=1;for(let i=0;i<7200;i++){if(policy(e.time)){x+=dir*speed/120;if(x>.90){x=.90;dir=-1;}if(x<.1){x=.1;dir=1;}}e.step(1/120,x);}return e;}
test('rest alone never farms points; unnecessary light subtracts earned points without going negative',()=>{
 const idle=play('easy',()=>false);assert.equal(idle.score,0);assert.equal(idle.judgments,200);
 const e=new E.Engine('easy');e.points=10;for(let i=0;i<100;i++)e.step(1/120,i%40<20?.9:.1);assert.ok(e.points<10);assert.ok(e.penalties>0);
 const always=play('easy',()=>true);assert.ok(always.penalties>0);assert.ok(always.score>=0);
});
test('following signals beats always shaking and harder shaking gives no bonus',()=>{
 const policy=t=>!!E.targetAt('easy',t);
 const correct=play('easy',policy,.8),strong=play('easy',policy,1.6),always=play('easy',()=>true);
 assert.ok(correct.score>9000);assert.ok(correct.score>always.score);assert.ok(Math.abs(correct.score-strong.score)<150);
 assert.ok(correct.score<=10000);const result=correct.score;correct.step(.2,.1);assert.equal(correct.score,result);
});
test('stable movement detection at different input rates and brief turnaround tolerated',()=>{
 for(const hz of [30,60,120]){const e=new E.Engine('easy',true);let aim=.5;for(let i=0;i<100;i++){if(i%(120/hz)===0)aim=.5+.4*i/120;e.step(1/120,aim);if(i>30)assert.equal(e.lit,true);}e.stopMotion();assert.equal(e.brightness,0);assert.equal(e.lit,false);}
});
test('physical current reverses and stationary magnet becomes dark',()=>{const e=new E.Engine('easy',true);e.step(.05,.9);assert.ok(e.current>0);e.step(.05,.1);assert.ok(e.current<0);e.step(.2,e.x);assert.equal(e.current,0);assert.equal(e.brightness,0);});

test('hard bursts remain judgeable, get denser after ten seconds and reward correct stopping',()=>{
 const chart=E.charts.hard;
 const counts=[0,10,20].map(start=>chart.filter(s=>s.on&&s.start>=start&&s.start<start+10).length);
 assert.ok(counts[1]>counts[0]);assert.ok(counts[2]>counts[0]);
 for(const s of chart){
  assert.ok(s.end-s.start>=.29);
  if(!s.on){
   const ticks=Array.from({length:600},(_,i)=>(i+1)/10-.001).filter(t=>t>=s.start&&t<s.end);
   assert.ok(ticks.some(t=>E.judge('hard',t,true)==='penalty'));
  }
 }
 const correct=play('hard',t=>!!E.targetAt('hard',t));
 const always=play('hard',()=>true);
 assert.ok(correct.score>8500);assert.ok(correct.score>always.score+3000);
 assert.equal(E.DIFFICULTIES.hard.grace,.10);
 assert.equal(E.DIFFICULTIES.hard.preview,2.8);
 for(const mode of ['easy','hard']){
  const e=new E.Engine(mode);e.points=20;
  for(let i=0;i<12;i++)e.step(1/120,.9);
  assert.equal(e.points,20-(mode==='hard'?2:1));
 }
});
test('survival thresholds use unrounded earned / possible points after 20 seconds',()=>{
 assert.equal(E.survivalState(19.99,0,100),'warmup');
 assert.equal(E.survivalState(20,70,100),'safe');
 assert.equal(E.survivalState(20,69.99,100),'warning');
 assert.equal(E.survivalState(20,60,100),'warning');
 assert.equal(E.survivalState(20,59.99,100),'failed');
 const idle=play('easy',()=>false);assert.equal(idle.time,20);assert.equal(idle.failed,true);
 const points=idle.points;idle.step(.2,.9);assert.equal(idle.time,20);assert.equal(idle.points,points);
});
test('seven levels can be completed with correct input and advanced rests have real judgment windows',()=>{
 for(const mode of Object.keys(E.DIFFICULTIES)){
  const e=play(mode,t=>!!E.targetAt(mode,t));assert.equal(e.failed,false,mode);assert.equal(e.time,60);assert.ok(e.rate>=.7,mode);
  const expected=Array.from({length:600},(_,i)=>(i+1)/10-.001).filter(t=>E.targetAt(mode,t)).length;
  assert.equal(e.possible,expected);
  if(['expert','master','lightning','ultimate'].includes(mode))for(const s of E.charts[mode])if(!s.on){
   assert.ok(Array.from({length:600},(_,i)=>(i+1)/10-.001).some(t=>t>=s.start&&t<s.end&&E.judge(mode,t,true)==='penalty'));
  }
 }
});
test('60 second records are separate from old rules and support all seven levels',()=>{
 const mem=memory();mem.setItem('light-signal-today-v2','old-records');const s=R.createStore(mem);
 for(const mode of Object.keys(E.DIFFICULTIES)){assert.equal(s.read().modes[mode].count,0);s.add(mode,{...record,combo:500});assert.equal(s.read().modes[mode].bestCombo,500);}
 assert.equal(mem.getItem('light-signal-today-v2'),'old-records');
});

test('levels 1 through 5 retain their exact charts and settings',()=>{
 const old=require('./legacy-charts.json');for(const mode of Object.keys(old.charts)){assert.deepEqual(E.charts[mode],old.charts[mode]);assert.deepEqual(E.DIFFICULTIES[mode],old.difficulties[mode]);}
});
test('existing five-level daily records survive addition of levels 6 and 7',()=>{
 const mem=memory(),s=R.createStore(mem);s.add('master',record);const old=s.read();delete old.modes.lightning;delete old.modes.ultimate;mem.setItem(R.KEY,JSON.stringify(old));
 const updated=R.createStore(mem);assert.equal(updated.read().modes.master.best,8000);assert.equal(updated.read().modes.master.count,1);
 updated.add('lightning',record);updated.add('ultimate',record);assert.equal(updated.read().modes.master.best,8000);assert.equal(updated.read().modes.ultimate.count,1);
});
