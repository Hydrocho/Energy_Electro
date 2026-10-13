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

test('three binary charts fit 30 seconds and get progressively denser',()=>{
 let prior=0;for(const mode of Object.keys(E.DIFFICULTIES)){const chart=E.charts[mode];assert.equal(chart[0].start,0);assert.equal(chart.at(-1).end,30);assert.equal(E.targetAt(mode,0),0);const count=chart.filter(s=>s.on).length;assert.ok(count>prior);prior=count;for(let i=0;i<chart.length;i++){assert.ok(chart[i].end>chart[i].start);if(i)assert.ok(Math.abs(chart[i].start-chart[i-1].end)<1e-8);}}
});
test('signal hit, dark rest, missing light, extra light and boundary forgiveness are distinct',()=>{
 for(const mode of Object.keys(E.DIFFICULTIES)){const signal=E.charts[mode].find(s=>s.on);const gap=E.charts[mode][2];const on=(signal.start+signal.end)/2,off=(gap.start+gap.end)/2;
 assert.equal(E.judge(mode,on,true),'hit');assert.equal(E.judge(mode,on,false),'miss');assert.equal(E.judge(mode,off,false),'rest');assert.equal(E.judge(mode,off,true),'penalty');assert.equal(E.judge(mode,signal.start+.01,false),'grace');}
});
function play(mode,policy,speed=.8){const e=new E.Engine(mode);let x=.5,dir=1;for(let i=0;i<3600;i++){if(policy(e.time)){x+=dir*speed/120;if(x>.90){x=.90;dir=-1;}if(x<.1){x=.1;dir=1;}}e.step(1/120,x);}return e;}
test('rest alone never farms points; unnecessary light subtracts earned points without going negative',()=>{
 const idle=play('easy',()=>false);assert.equal(idle.score,0);assert.equal(idle.judgments,300);
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
   const ticks=Array.from({length:300},(_,i)=>(i+1)/10-.001).filter(t=>t>=s.start&&t<s.end);
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
test('new hard records start separately while today easy and medium records migrate once',()=>{
 const mem=memory(),now=()=>new Date(2026,9,13,12);
 const old=R.createStore(memory(),now);old.add('easy',record);old.add('medium',record);old.add('hard',record);
 mem.setItem('light-signal-today-v1',JSON.stringify(old.read()));
 const fresh=R.createStore(mem,now);
 assert.equal(fresh.read().modes.easy.best,8000);assert.equal(fresh.read().modes.medium.best,8000);assert.equal(fresh.read().modes.hard.count,0);
 fresh.add('hard',{...record,score:5000});assert.equal(R.createStore(mem,now).read().modes.hard.best,5000);
 assert.equal(JSON.parse(mem.getItem('light-signal-today-v1')).modes.hard.best,8000);
});
