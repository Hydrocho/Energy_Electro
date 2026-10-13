(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const {Engine,DIFFICULTIES,targetAt,clamp,MAX_SPEED,SIGNALS}=window.LightRhythm;
  let storage;try{storage=window.localStorage;}catch{storage=null;}
  const store=window.LightRecords.createStore(storage);
  let mode='easy', engine=new Engine(mode,true), state='ready';
  let aim=engine.x, pointer=null, anchorX=0, anchorAim=0, keyboard=0, keyboardSpeed=.8;
  let previousFrame=performance.now(), countdownAt=0, lastBeat=-1, lastJudgment=0;
  const canvas=$('track'), ctx=canvas.getContext('2d');
  let cw=600,ch=218;
  const format=n=>n.toLocaleString('ko-KR');
  const difficultyButtons=[...document.querySelectorAll('.difficulty')];

  function resize(){
    const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
    cw=r.width;ch=r.height;canvas.width=Math.round(cw*dpr);canvas.height=Math.round(ch*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  new ResizeObserver(resize).observe(canvas);

  function updateRecords(){
    const data=store.read(),m=data.modes[mode];
    $('today-date').textContent=data.date.slice(5).replace('-','.');$('record-mode').textContent=DIFFICULTIES[mode].label;
    $('best-score').textContent=m.count?format(m.best):'—';$('attempts').textContent=`${m.count}회`;
    $('best-combo').textContent=m.count?`${m.bestCombo}×`:'—';
    const list=$('recent-records');list.replaceChildren();
    if(!m.count){const li=document.createElement('li');li.className='empty-record';li.append('첫 번째 빛을 만들어 보세요.',document.createElement('br'),'오늘의 도전이 여기에 쌓여요.');list.append(li);}
    for(const r of m.recent){
      const li=document.createElement('li'),time=document.createElement('span'),points=document.createElement('b'),acc=document.createElement('span');
      time.textContent=new Date(r.time).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false});points.textContent=format(r.score);acc.textContent=`${r.accuracy}%`;
      li.append(time,points,acc);list.append(li);
    }
    $('storage-note').textContent=store.available?'오늘 기록은 이 브라우저에만 남아요. 친구와 같은 난이도의 점수를 비교해 보세요.':'이 브라우저에서는 기록을 저장할 수 없어요. 현재 화면에서만 기록이 유지돼요.';
  }
  function setControls(){
    const busy=state==='playing'||state==='countdown';
    document.body.classList.toggle('playing',busy);
    document.body.classList.toggle('focused-game',busy||state==='practice');
    difficultyButtons.forEach(b=>b.disabled=busy);
    $('practice').classList.toggle('hidden',busy||state==='practice');
    $('start').classList.toggle('hidden',busy);
    $('stop').classList.toggle('hidden',!busy&&state!=='practice');
    $('learn').disabled=busy;
    $('stage-label').textContent=state==='playing'?'LIVE · FEEL THE RHYTHM':state==='practice'?'PRACTICE · 자유롭게 움직여요':state==='countdown'?'GET READY':'READY TO GLOW';
  }
  function releaseInput(){pointer=null;keyboard=0;aim=engine.x;engine.stopMotion();}
  function ready(message='막대에서는 흔들기, 빈 구간에서는 멈추기!'){
    state='ready';engine=new Engine(mode,true);releaseInput();
    $('track-overlay').classList.remove('hidden');$('overlay-title').textContent='빛으로 신호를 보내요.';
    $('overlay-text').innerHTML='왼쪽 자석을 좌우로 움직여<br>막대가 오면 흔들고, 빈 곳에서는 멈춰요.';
    $('song-title').textContent=SIGNALS[mode].title;$('song-description').textContent=SIGNALS[mode].description;
    $('track-overlay').querySelector('.overlay-kicker').textContent='움직임이 빛이 되는 순간';
    $('judge').textContent='';$('status').textContent=message;setControls();updateRecords();
  }
  function practice(){
    state='practice';engine=new Engine(mode,true);releaseInput();lastBeat=-1;
    $('track-overlay').classList.add('hidden');$('judge').textContent='';
    $('status').textContent='연습은 감점과 기록이 없어요. 신호 막대에 맞춰 흔들고 멈춰 보세요.';setControls();document.querySelector('.game-card').scrollIntoView({block:'start'});
  }
  function start(){
    updateRecords();state='countdown';engine=new Engine(mode);releaseInput();countdownAt=performance.now();lastBeat=-1;lastJudgment=0;
    $('track-overlay').classList.remove('hidden');$('track-overlay').querySelector('.overlay-kicker').textContent='손가락을 자석 위에 준비하세요';
    $('overlay-title').textContent='3';$('overlay-text').textContent='처음에는 멈춤. 다음 빛을 미리 살펴보세요.';
    $('judge').textContent='';$('status').textContent='막대에서는 빛을 내면 가점, 빈 구간에서 빛을 내면 감점이에요.';
    setControls();document.querySelector('.game-card').scrollIntoView({block:'start'});
  }
  function finish(){
    if(state!=='playing')return;
    state='result';releaseInput();
    const result=engine.result(),old=store.read().modes[mode],isBest=old.count===0||result.score>old.best;
    const data=store.add(mode,result);updateRecords();setControls();
    $('result-mode').textContent=`난이도 ${DIFFICULTIES[mode].label} · ${DIFFICULTIES[mode].title}`;
    $('result-score').textContent=format(result.score);$('result-accuracy').textContent=`${result.accuracy}%`;
    $('result-combo').textContent=`${result.combo}×`;$('result-best').textContent=format(data.modes[mode].best);
    $('new-best').textContent=isBest?'✦ 오늘의 새로운 최고 기록!':'한 번 더, 나만의 리듬을 찾아볼까요?';
    $('status').textContent=store.available?'도전 완료! 오늘의 기록을 저장했어요.':'도전 완료! 저장이 차단되어 현재 화면에만 기록했어요.';
    $('result-dialog').showModal();
  }
  $('practice').addEventListener('click',practice);$('start').addEventListener('click',start);
  $('stop').addEventListener('click',()=>ready('도전을 중단했어요. 완료하지 않은 도전은 저장하지 않아요.'));
  $('retry').addEventListener('click',()=>{$('result-dialog').close();start();});
  $('close-result').addEventListener('click',()=>{$('result-dialog').close();ready();});
  $('result-dialog').addEventListener('cancel',()=>ready());
  $('learn').addEventListener('click',()=>{$('learn-dialog').showModal();releaseInput();});
  $('close-learn').addEventListener('click',()=>$('learn-dialog').close());
  difficultyButtons.forEach(button=>button.addEventListener('click',()=>{
    mode=button.dataset.mode;
    difficultyButtons.forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
    $('mode-badge').textContent=`${DIFFICULTIES[mode].label} · ${DIFFICULTIES[mode].title}`;ready();
  }));
  const zone=$('touch-zone');
  zone.addEventListener('pointerdown',e=>{
    if(pointer!==null||state==='result'||(e.pointerType==='mouse'&&e.button!==0))return;
    if(state==='ready')practice();
    pointer=e.pointerId;anchorX=e.clientX;anchorAim=engine.x;aim=engine.x;zone.setPointerCapture(pointer);zone.focus({preventScroll:true});e.preventDefault();
  });
  zone.addEventListener('pointermove',e=>{
    if(e.pointerId!==pointer)return;
    if(state==='countdown'){anchorX=e.clientX;anchorAim=engine.x;return;}
    const width=zone.getBoundingClientRect().width;
    // The short virtual rail lets a comfortable finger stroke cover the full insertion range.
    const proposed=anchorAim+(e.clientX-anchorX)/width*1.6;
    aim=clamp(proposed,.08,.92);
    if(aim!==proposed){anchorX=e.clientX;anchorAim=aim;}
  });
  function endPointer(e){if(e.pointerId===pointer)releaseInput();}
  zone.addEventListener('pointerup',endPointer);zone.addEventListener('pointercancel',endPointer);zone.addEventListener('lostpointercapture',endPointer);
  zone.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight'].includes(e.key)||state==='countdown'||state==='result')return;
    e.preventDefault();if(state==='ready')practice();keyboard=e.key==='ArrowRight'?1:-1;
    keyboardSpeed=.8;
  });
  zone.addEventListener('keyup',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){keyboard=0;aim=engine.x;}});
  zone.addEventListener('blur',releaseInput);window.addEventListener('blur',()=>{releaseInput();});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){
      if(['playing','countdown','practice'].includes(state))ready('화면을 벗어나 도전이 중단됐어요. 다시 시작해 주세요.');

    }else{previousFrame=performance.now();updateRecords();}
  });
  window.addEventListener('storage',e=>{if(e.key===window.LightRecords.KEY)updateRecords();});
  setInterval(()=>{if(!document.hidden)updateRecords();},15000);

  function targetTime(){return state==='practice'?engine.time%30:engine.time;}
  function motionText(on){return on?['⇆','지금 흔들기','막대가 끝날 때까지 좌우로 왕복해요.','ON']:['Ⅱ','지금 멈추기','빈 구간에서 빛을 내면 감점이에요.','OFF'];}
  function renderValues(){
    const active=state==='playing'||state==='result';
    $('score').textContent=String(active?engine.score:0).padStart(5,'0');$('combo').innerHTML=`${active?engine.combo:0}<span>×</span>`;
    const left=active?Math.max(0,30-engine.time):30;$('time').innerHTML=`${left.toFixed(1)}<span>s</span>`;
    $('time-fill').style.width=`${left/30*100}%`;
    const target=state==='ready'||state==='countdown'?0:targetAt(mode,targetTime());
    $('target-bulb').style.setProperty('--light',target);$('actual-bulb').style.setProperty('--light',engine.brightness);
    $('actual-bulb').classList.toggle('unlit',engine.brightness===0);
    $('target-percent').textContent=target?'켜기':'끄기';$('actual-percent').textContent=engine.lit?'켜짐':'꺼짐';$('played-note').textContent=engine.lit?'ON':'OFF';
    $('magnet').setAttribute('transform',`translate(${90+engine.x*150} 0)`);$('drag-thumb').style.left=`${engine.x*100}%`;
    zone.setAttribute('aria-valuenow',String(Math.round(engine.x*100)));
    $('needle').setAttribute('transform',`rotate(${clamp(engine.current/MAX_SPEED,-1,1)*65} 440 87)`);
    $('current-label').textContent=Math.abs(engine.current)<.01?'전류 없음':engine.current>0?'유도 전류 →':'← 유도 전류';
    if(state==='ready'){
      $('motion-icon').textContent='↔';$('motion-label').textContent='손가락으로 자석을 좌우로 움직여 보세요';$('motion-detail').textContent='막대가 있으면 흔들고, 없으면 멈춰요!';$('level-readout').textContent='READY';
    }else{
      const [icon,label,detail,readout]=motionText(target);$('motion-icon').textContent=icon;$('motion-label').textContent=label;$('motion-detail').textContent=detail;$('level-readout').textContent=state==='practice'?'PRACTICE':readout;
    }
  }
  function drawTrack(){
    ctx.clearRect(0,0,cw,ch);
    const lineX=cw*.19,pps=(cw-lineX)/DIFFICULTIES[mode].preview,y=ch*.48,t=targetTime();
    ctx.fillStyle='#1b2a33';ctx.fillRect(0,y-44,cw,88);
    ctx.strokeStyle='#405562';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(cw,y);ctx.stroke();
    for(const s of window.LightRhythm.charts[mode]){
      if(!s.on)continue;
      const x=lineX+(s.start-t)*pps,end=lineX+(s.end-t)*pps;
      if(end<0||x>cw)continue;
      ctx.fillStyle=end<lineX?'#4b6b5d':'#cefa76';ctx.fillRect(x,y-25,Math.max(4,end-x-2),50);
      if(x>lineX+8){ctx.fillStyle='#d1dfda';ctx.font='12px Arial';ctx.fillText(s.end-s.start<1.1?'짧게':'계속 흔들기',x,y-40);}
    }
    ctx.fillStyle=engine.lit?'#cefa7630':'#8ea8bb16';ctx.fillRect(lineX-14,20,28,ch-40);
    ctx.strokeStyle=engine.lit?'#cefa76':'#9dafbb';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(lineX,20);ctx.lineTo(lineX,ch-20);ctx.stroke();
    ctx.beginPath();ctx.arc(lineX,y,12,0,Math.PI*2);ctx.fillStyle=engine.lit?'#ffef98':'#253846';ctx.fill();ctx.stroke();
    ctx.font='13px Arial';ctx.fillStyle='#d0ddd8';ctx.fillText('판정선',lineX-18,ch-25);
    ctx.font='14px Arial';ctx.fillStyle='#a5b6bf';ctx.fillText('막대 = 흔들기',20,ch-86);ctx.fillText('빈 구간 = 멈추기',20,ch-62);
  }
  function frame(now){
    const dt=Math.min((now-previousFrame)/1000,.25);previousFrame=now;
    if(state==='countdown'){
      const elapsed=(now-countdownAt)/1000,beat=Math.floor(elapsed);
      if(beat!==lastBeat){lastBeat=beat;}
      if(elapsed>=3){state='playing';engine=new Engine(mode);aim=engine.x;anchorAim=engine.x;keyboard=0;$('track-overlay').classList.add('hidden');lastBeat=-1;setControls();}
      else $('overlay-title').textContent=String(3-Math.floor(elapsed));
    }else if(state==='playing'||state==='practice'){
      if(keyboard)aim=clamp(engine.x+keyboard*dt*keyboardSpeed,.08,.92);
      engine.step(dt,aim);
      if(state==='playing'){
        if(engine.judgments!==lastJudgment){lastJudgment=engine.judgments;$('judge').textContent=({hit:'빛 전달 성공!',rest:'멈춤 성공',grace:'전환 준비',miss:'흔들어 주세요',penalty:'불필요한 빛 − 감점'})[engine.lastJudge];$('judge').dataset.grade=engine.lastJudge;}
        if(engine.done)finish();
      }
    }
    renderValues();drawTrack();requestAnimationFrame(frame);
  }
  ready();resize();requestAnimationFrame(frame);
})();
