const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../city-rescue/core');
function solve(g){const t=g.task;assert.equal(g.connect(t.source,t.target).ok,true);assert.equal(g.submit(t.device,t.energies,'secondary').ok,true);g.next();}
function memory(){const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};}
test('all operations finish with valid battery charge and discharge on each difficulty',()=>{
 for(const level of [1,2,3]){const g=new C.Game(level);for(let i=0;i<9;i++){g.tick(5);solve(g);if(i===6)assert.equal(g.battery,2);if(i===7)assert.equal(g.battery,1);}
 assert.equal(g.complete,true);assert.equal(g.battery,0);assert.equal(g.log.length,9);assert.ok(g.score>9000);assert.ok(g.score<=10000);assert.equal(g.accuracy,100);
 const score=g.score;g.tick(50);assert.equal(g.score,score);assert.equal(g.submit('lamp',['light']).ok,false);}
});
test('incorrect routing, devices and energy choices do not complete tasks',()=>{
 const g=new C.Game();assert.equal(g.submit('lamp',['light']).ok,false);assert.equal(g.errors,0);
 assert.equal(g.connect('battery','hospital').ok,false);assert.equal(g.errors,1);
 assert.equal(g.connect('grid','school').ok,false);assert.equal(g.log.length,0);
 assert.equal(g.connect('grid','hospital').ok,true);assert.equal(g.submit('heater',['heat']).ok,false);
 assert.equal(g.submit('lamp',['light','heat']).ok,false);assert.equal(g.submit('lamp',['light']).ok,true);
 const points=g.score;assert.equal(g.submit('lamp',['light']).ok,false);assert.equal(g.score,points);
});
test('video needs both light and sound; heat from a lamp is not vanished energy',()=>{
 const g=new C.Game();for(let i=0;i<4;i++)solve(g);
 g.connect('grid','phone');assert.equal(g.submit('video',['light']).ok,false);assert.equal(g.submit('video',['light','sound']).ok,true);g.next();
 g.connect('grid','hospital');assert.equal(g.submit('lamp',['light'],'lost').ok,false);assert.equal(g.submit('lamp',['light'],'primary').ok,false);assert.equal(g.submit('lamp',['light'],'secondary').ok,true);
});
test('charging stores chemical energy and an outage blocks the grid',()=>{
 const g=new C.Game();for(let i=0;i<6;i++)solve(g);
 g.connect('grid','battery');assert.equal(g.submit('charging',['light']).ok,false);assert.equal(g.battery,0);
 assert.equal(g.submit('charging',['chemical']).ok,true);assert.equal(g.battery,2);g.next();
 assert.equal(g.connect('grid','hospital').ok,false);assert.equal(g.battery,2);
 assert.equal(g.connect('battery','hospital').ok,true);assert.equal(g.battery,2);
 assert.equal(g.submit('lamp',['light']).ok,true);assert.equal(g.battery,1);
});
test('time limit ends a round; pause and learning feedback protect reading time',()=>{
 const g=new C.Game(3);g.paused=true;g.tick(100);assert.equal(g.remaining,135);g.paused=false;
 g.connect('grid','hospital');g.submit('lamp',['light']);g.tick(1000);assert.equal(g.remaining,135);
 g.next();g.tick(135);assert.equal(g.done,true);assert.equal(g.complete,false);assert.equal(g.log.length,1);assert.equal(g.score,1000);
});
test('daily records preserve best scores, separate levels, roll date and handle blocked storage',()=>{
 const mem=memory(),g=new C.Game(2);for(let i=0;i<9;i++)solve(g);C.save(mem,g,'2026-10-15');
 for(let i=0;i<12;i++){const failed=new C.Game(2);failed.tick(1000);C.save(mem,failed,'2026-10-15');}
 const d=C.records(mem,'2026-10-15');assert.equal(d.best[2],10000);assert.equal(d.levels[2].length,10);assert.equal(d.counts[2],13);assert.equal(d.counts[1],0);assert.equal(C.records(mem,'2026-10-16').best[2],0);
 assert.equal(C.save(null,g).saved,false);mem.setItem(C.KEY,'{broken');assert.equal(C.records(mem).counts[2],0);
});
