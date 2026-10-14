const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const Engine=require('../engine.js'),Records=require('../records.js');

// Small DOM adapter tests real game event handlers and animation state without a browser dependency.
function setup(withAudio=false,engineApi=Engine){
  let now=0,frame;const elements=new Map(),saved=new Map();
  class Element {
    constructor(){this.textContent='';this.dataset={};this.handlers={};this.attrs={};this.children=[];this.open=false;this.classes=new Set();this.classList={add:k=>this.classes.add(k),remove:k=>this.classes.delete(k),toggle:(k,v)=>v?this.classes.add(k):this.classes.delete(k)};this.style={setProperty(){}};}
    addEventListener(k,f){(this.handlers[k]||=[]).push(f);}
    emit(k,v={}){for(const f of this.handlers[k]||[])f(v);}
    setAttribute(k,v){this.attrs[k]=v;}
    querySelector(k){return get(k);}
    append(...v){this.children.push(...v);}
    replaceChildren(){this.children=[];}
    getBoundingClientRect(){return {width:300,height:200};}
    setPointerCapture(){} focus(){} scrollIntoView(){}
    showModal(){this.open=true;}close(){this.open=false;}
    getContext(){return new Proxy({createLinearGradient:()=>({addColorStop(){}})}, {get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});}
  }
  const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
  const modes=Object.keys(Engine.DIFFICULTIES).map(mode=>{const e=new Element();e.dataset.mode=mode;return e;});
  const doc=new Element();doc.body=new Element();doc.getElementById=get;doc.createElement=()=>new Element();doc.querySelectorAll=()=>modes;doc.querySelector=()=>get('game-card');doc.hidden=false;
  const win=new Element();win.LightRhythm=engineApi;win.LightRecords=Records;win.localStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};
  const gains=[],frequencies=[];
  if(withAudio)win.AudioContext=class{
    constructor(){this.currentTime=0;this.state='running';this.destination={};}
    resume(){return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}
    createOscillator(){return {type:'',frequency:{setTargetAtTime:v=>frequencies.push(v)},connect(){},start(){},stop(){}};}
    createBiquadFilter(){return {frequency:{value:0},connect(){}};}
    createGain(){return {gain:{value:0,cancelScheduledValues(){},setValueAtTime:v=>gains.push(v),setTargetAtTime:v=>gains.push(v),linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}
  };
  const sandbox={window:win,document:doc,performance:{now:()=>now},ResizeObserver:class{observe(){}},devicePixelRatio:1,Path2D:class{moveTo(){}lineTo(){}},requestAnimationFrame:f=>frame=f,setInterval(){},setTimeout(){},console};
  vm.runInNewContext(fs.readFileSync('game.js','utf8'),sandbox);
  const tick=ms=>{now+=ms;frame(now);};
  const pointer=(type,x=100,id=1)=>get('touch-zone').emit(type,{pointerId:id,pointerType:'touch',clientX:x,preventDefault(){}});
  return {get,tick,pointer,doc,win,saved,modes,gains,frequencies};
}
test('a touch held during countdown controls the magnet after GO',()=>{
  const ui=setup();ui.get('start').emit('click');ui.pointer('pointerdown',100);
  ui.tick(3100);ui.pointer('pointermove',140);ui.tick(100);
  assert.ok(Number(ui.get('touch-zone').attrs['aria-valuenow'])>50);
});
test('touch cancellation stops movement and second pointer cannot take over',()=>{
  const ui=setup();ui.get('practice').emit('click');ui.pointer('pointerdown',100);ui.pointer('pointermove',150);ui.tick(100);
  ui.pointer('pointerdown',10,2);ui.pointer('pointermove',200,2);ui.pointer('pointercancel',150);ui.tick(100);
  const x=ui.get('touch-zone').attrs['aria-valuenow'];ui.tick(100);assert.equal(ui.get('touch-zone').attrs['aria-valuenow'],x);
  assert.equal(ui.get('current-label').textContent,'전류 없음');assert.equal(ui.get('actual-percent').textContent,'꺼짐');
});
test('background abort discards a round, finished rounds save once and retry preserves records',()=>{
  const ui=setup();ui.get('start').emit('click');ui.tick(3100);ui.tick(100);
  ui.doc.hidden=true;ui.doc.emit('visibilitychange');
  assert.equal(ui.get('attempts').textContent,'0회');
  ui.doc.hidden=false;ui.doc.emit('visibilitychange');ui.get('start').emit('click');ui.tick(3100);
  for(let i=0;i<300;i++)ui.tick(100);
  assert.equal(ui.get('result-dialog').open,true);assert.equal(ui.get('attempts').textContent,'1회');
  ui.tick(1000);assert.equal(ui.get('attempts').textContent,'1회');
  ui.get('retry').emit('click');assert.equal(ui.get('result-dialog').open,false);assert.equal(ui.get('attempts').textContent,'1회');
});
test('warning appears, clears on recovery, and game over ends and saves only once',()=>{
 let current;
 class Controlled extends Engine.Engine{constructor(...args){super(...args);current=this;}}
 const ui=setup(false,{...Engine,Engine:Controlled});
 ui.modes[4].emit('click');assert.match(ui.get('mode-badge').textContent,/5단계/);
 ui.get('start').emit('click');ui.tick(3100);
 current.time=20;current.possible=100;current.points=65;ui.tick(0);
 assert.ok(ui.get('track-wrap').classes.has('signal-warning'));
 current.points=70;ui.tick(0);assert.ok(!ui.get('track-wrap').classes.has('signal-warning'));
 current.points=59;current.failed=true;current.done=true;ui.tick(0);
 assert.equal(ui.get('result-title').textContent,'GAME OVER');assert.equal(ui.get('result-dialog').open,true);
 assert.ok(!ui.get('track-wrap').classes.has('signal-warning'));assert.equal(ui.get('attempts').textContent,'1회');
 ui.tick(100);assert.equal(ui.get('attempts').textContent,'1회');
 ui.get('retry').emit('click');assert.equal(ui.get('result-dialog').open,false);ui.tick(0);assert.match(ui.get('time').innerHTML,/60.0/);
});

test('light gates one fixed beep; mute, release, background and stop silence it',()=>{
 const ui=setup(true);ui.get('practice').emit('click');
 assert.deepEqual(ui.frequencies,[660]);assert.equal(ui.gains.length,0);
 ui.pointer('pointerdown',100);ui.pointer('pointermove',150);ui.tick(50);
 assert.equal(ui.get('actual-percent').textContent,'켜짐');assert.equal(ui.gains.at(-1),.07);
 ui.get('sound-toggle').emit('click');assert.equal(ui.gains.at(-1),0);assert.equal(ui.get('sound-toggle').attrs['aria-pressed'],'false');
 ui.get('sound-toggle').emit('click');assert.equal(ui.gains.at(-1),.07);assert.equal(ui.frequencies.length,1);
 ui.pointer('pointerup');assert.equal(ui.gains.at(-1),0);
 ui.pointer('pointerdown',100);ui.pointer('pointermove',180);ui.tick(50);assert.equal(ui.gains.at(-1),.07);
 ui.doc.hidden=true;ui.doc.emit('visibilitychange');assert.equal(ui.gains.at(-1),0);
 ui.doc.hidden=false;ui.get('practice').emit('click');ui.pointer('pointerdown',100);ui.pointer('pointermove',180);ui.tick(50);
 ui.get('stop').emit('click');assert.equal(ui.gains.at(-1),0);
});
test('missing audio support leaves the game playable',()=>{
 const ui=setup();ui.get('practice').emit('click');assert.equal(ui.get('sound-toggle').textContent,'소리 사용 불가');
 ui.pointer('pointerdown',100);ui.pointer('pointermove',150);ui.tick(50);assert.equal(ui.get('actual-percent').textContent,'켜짐');
});

test('intro navigation stops an active game and keeps unfinished rounds out of records',()=>{
 const ui=setup(true);ui.get('enter-game').emit('click');assert.equal(ui.get('intro-screen').hidden,true);assert.equal(ui.get('game-screen').hidden,false);
 ui.get('start').emit('click');ui.tick(3100);ui.pointer('pointerdown',100);ui.pointer('pointermove',150);ui.tick(50);
 ui.get('back-intro').emit('click');assert.equal(ui.get('intro-screen').hidden,false);assert.equal(ui.get('game-screen').hidden,true);assert.equal(ui.gains.at(-1),0);assert.equal(ui.get('attempts').textContent,'0회');
 ui.get('enter-game').emit('click');ui.tick(0);assert.match(ui.get('time').innerHTML,/60.0/);
});

test('central preparation dialog selects a level and starts its countdown',()=>{
 const ui=setup(true);ui.get('enter-game').emit('click');assert.equal(ui.get('prepare-dialog').open,true);
 ui.modes[4].emit('click');assert.match(ui.get('prepare-selection').textContent,/5단계/);
 ui.get('prepare-start').emit('click');assert.equal(ui.get('prepare-dialog').open,false);assert.equal(ui.get('overlay-title').textContent,'3');assert.match(ui.get('mode-badge').textContent,/5단계/);
 ui.get('stop').emit('click');ui.get('open-prepare').emit('click');assert.equal(ui.get('prepare-dialog').open,true);
 ui.get('prepare-start').emit('click');assert.equal(ui.get('prepare-dialog').open,false);assert.equal(ui.get('overlay-title').textContent,'3');
});

test('every cleared stage shows success, advances correctly, and the final stage has no next button',()=>{
 let current;
 class Controlled extends Engine.Engine{constructor(...args){super(...args);current=this;}}
 const ui=setup(true,{...Engine,Engine:Controlled});ui.get('start').emit('click');ui.tick(3100);
 for(let i=0;i<5;i++){
  current.time=60;current.done=true;current.failed=false;current.possible=current.maxHits;current.points=current.maxHits;
  ui.tick(0);
  assert.equal(ui.get('result-dialog').dataset.outcome,'success');assert.equal(ui.get('result-title').textContent,`${i+1}단계 통과!`);
  assert.equal(ui.get('attempts').textContent,'1회');assert.equal(ui.get('next-level').hidden,i===4);
  ui.tick(100);assert.equal(ui.get('attempts').textContent,'1회');
  if(i<4){ui.get('next-level').emit('click');assert.equal(ui.get('result-dialog').open,false);assert.match(ui.get('mode-badge').textContent,new RegExp(`${i+2}단계`));ui.tick(3100);}
 }
 assert.match(ui.get('result-celebration').textContent,/최고 난도 5단계도 성공/);
 ui.get('next-level').emit('click');assert.equal(ui.get('result-dialog').open,true);
 ui.get('retry').emit('click');ui.tick(3100);current.done=true;current.failed=true;current.time=20;ui.tick(0);
 assert.equal(ui.get('result-dialog').dataset.outcome,'failure');assert.equal(ui.get('result-title').textContent,'GAME OVER');assert.equal(ui.get('next-level').hidden,true);
});
