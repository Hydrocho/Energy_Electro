(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const {Engine,DIFFICULTIES,targetAt,clamp,MAX_SPEED,SIGNALS,DURATION}=window.LightRhythm;
  let storage;try{storage=window.localStorage;}catch{storage=null;}
  const store=window.LightRecords.createStore(storage);
  let mode='easy', engine=new Engine(mode,true), state='ready';
  let aim=engine.x, pointer=null, anchorX=0, anchorAim=0, keyboard=0, keyboardSpeed=.8;
  let previousFrame=performance.now(), countdownAt=0, lastBeat=-1, lastJudgment=0;
  const canvas=$('track'), ctx=canvas.getContext('2d');
  let cw=600,ch=218;
  const format=n=>n.toLocaleString('ko-KR');
  const difficultyButtons=[...document.querySelectorAll('.difficulty')];
  const reducedMotion=window.matchMedia?window.matchMedia('(prefers-reduced-motion: reduce)'):null;
  let sparks=[],burstAt=-10;
  const effectsLevel=()=>mode==='ultimate'?2:mode==='lightning'?1:0;
  function hitBurst(){
    if(!effectsLevel()||reducedMotion?.matches)return;
    burstAt=engine.time;
    const count=effectsLevel()===2?12:7;
    for(let i=0;i<count;i++){
      const angle=Math.PI*2*i/count+engine.time*2;
      sparks.push({born:engine.time,vx:Math.cos(angle)*(50+i*8),vy:Math.sin(angle)*(65+i*7),color:i%3===0?'#ffe99b':effectsLevel()===2?'#e6a9ff':'#88f6ff'});
    }
    sparks=sparks.slice(-90);
  }
  let soundEnabled=true,audio=null,sounding=false;
  function soundButton(){
    $('sound-toggle').textContent=soundEnabled?'🔊 소리 켜짐':'🔇 소리 꺼짐';
    $('sound-toggle').setAttribute('aria-pressed',String(soundEnabled));
    $('sound-toggle').setAttribute('aria-label',soundEnabled?'소리 끄기':'소리 켜기');
  }
  function syncSound(){
    const on=soundEnabled&&!document.hidden&&(state==='playing'||state==='practice')&&engine.lit;
    if(!audio||on===sounding)return;
    sounding=on;
    audio.gain.gain.cancelScheduledValues(audio.context.currentTime);
    audio.gain.gain.setTargetAtTime(on?.07:0,audio.context.currentTime,.005);
  }
  function audioUnavailable(){soundEnabled=false;syncSound();soundButton();$('sound-toggle').textContent='소리 사용 불가';}
  // Initialize/resume only inside a user gesture, including Android touch input.
  function unlockSound(){
    if(!soundEnabled)return;
    try{
      if(!audio){
        const Audio=window.AudioContext||window.webkitAudioContext;
        if(!Audio){audioUnavailable();return;}
        const context=new Audio(),gain=context.createGain(),osc=context.createOscillator();
        gain.gain.value=0;osc.type='sine';osc.frequency.setTargetAtTime(660,context.currentTime,.005);
        osc.connect(gain);gain.connect(context.destination);osc.start();audio={context,gain};
      }
      if(audio.context.state!=='running')audio.context.resume().catch(audioUnavailable);
    }catch{audioUnavailable();}
  }
  $('sound-toggle').addEventListener('click',()=>{soundEnabled=!soundEnabled;soundButton();unlockSound();syncSound();});
  soundButton();
  $('enter-game').addEventListener('click',()=>{
    $('intro-screen').hidden=true;$('game-screen').hidden=false;
    ready();resize();$('game-screen').scrollIntoView({block:'start'});openPrepare();
  });
  $('back-intro').addEventListener('click',()=>{
    ready();$('prepare-dialog').close();$('result-dialog').close();$('learn-dialog').close();
    $('game-screen').hidden=true;$('intro-screen').hidden=false;
    $('intro-screen').scrollIntoView({block:'start'});$('enter-game').focus();
  });
  function openPrepare(){releaseInput();$('prepare-dialog').showModal();$('prepare-start').focus();}
  $('open-prepare').addEventListener('click',()=>{ready();openPrepare();});
  $('prepare-start').addEventListener('click',()=>{$('prepare-dialog').close();start();});

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
    $('open-prepare').disabled=busy;
    $('practice').classList.toggle('hidden',busy||state==='practice');
    $('start').classList.toggle('hidden',busy);
    $('stop').classList.toggle('hidden',!busy&&state!=='practice');
    $('learn').disabled=busy;
    $('stage-label').textContent=state==='playing'?'LIVE · FEEL THE RHYTHM':state==='practice'?'PRACTICE · 자유롭게 움직여요':state==='countdown'?'GET READY':'READY TO GLOW';
  }
  function releaseInput(){pointer=null;keyboard=0;aim=engine.x;engine.stopMotion();syncSound();}
  function ready(message='막대에서는 흔들기, 빈 구간에서는 멈추기!'){
    sparks=[];burstAt=-10;$('game-screen').dataset.fx=effectsLevel()===2?'ultimate':effectsLevel()===1?'lightning':'none';
    state='ready';engine=new Engine(mode,true);releaseInput();
    $('track-overlay').classList.remove('hidden');$('overlay-title').textContent='빛으로 신호를 보내요.';
    $('overlay-text').innerHTML='왼쪽 자석을 좌우로 움직여<br>막대가 오면 흔들고, 빈 곳에서는 멈춰요.';
    $('song-title').textContent=SIGNALS[mode].title;$('song-description').textContent=SIGNALS[mode].description;
    $('prepare-selection').textContent=`${DIFFICULTIES[mode].label} · ${SIGNALS[mode].title} — ${SIGNALS[mode].description}`;
    $('track-overlay').querySelector('.overlay-kicker').textContent='움직임이 빛이 되는 순간';
    $('judge').textContent='';$('status').textContent=message;setControls();updateRecords();
  }
  function practice(){
    unlockSound();
    state='practice';engine=new Engine(mode,true);releaseInput();lastBeat=-1;
    $('track-overlay').classList.add('hidden');$('judge').textContent='';
    $('status').textContent='연습은 감점과 기록이 없어요. 신호 막대에 맞춰 흔들고 멈춰 보세요.';setControls();document.querySelector('.game-card').scrollIntoView({block:'start'});
  }
  function start(){
    sparks=[];burstAt=-10;
    unlockSound();
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
    const cleared=!engine.failed&&engine.time>=DURATION;
    const modes=Object.keys(DIFFICULTIES),next=modes[modes.indexOf(mode)+1];
    $('result-dialog').dataset.outcome=cleared?'success':'failure';
    $('result-emblem').textContent=cleared?'🏆':'↻';
    $('result-kicker').textContent=cleared?'STAGE CLEAR':'TRY AGAIN';
    $('result-title').textContent=cleared?`${DIFFICULTIES[mode].label} 통과!`:'GAME OVER';
    $('result-celebration').textContent=cleared?(next?'60초 동안 빛의 신호를 끝까지 보냈어요!':'최고 난도 7단계도 성공! 빛의 신호 마스터예요.'):'다시 도전해서 빛의 신호를 이어 보세요.';
    $('next-level').hidden=!cleared||!next;
    $('next-level').textContent=next?`${DIFFICULTIES[next].label} 도전하기 →`:'';
    $('result-reason').textContent=engine.failed?`누적 획득률 ${(engine.rate*100).toFixed(1)}% · 60% 미만으로 ${engine.time.toFixed(1)}초에 종료`:`누적 획득률 ${(engine.rate*100).toFixed(1)}% · 끝까지 신호를 보냈어요!`;
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
  $('next-level').addEventListener('click',()=>{
    if(state!=='result'||engine.failed||engine.time<DURATION)return;
    const modes=Object.keys(DIFFICULTIES),next=modes[modes.indexOf(mode)+1];
    if(!next)return;
    $('result-dialog').close();selectMode(next);start();
  });
  $('close-result').addEventListener('click',()=>{$('result-dialog').close();ready();});
  $('result-dialog').addEventListener('cancel',()=>ready());
  $('learn').addEventListener('click',()=>{$('learn-dialog').showModal();releaseInput();});
  $('close-learn').addEventListener('click',()=>$('learn-dialog').close());
  function selectMode(selected){
    mode=selected;
    difficultyButtons.forEach(b=>{const active=b.dataset.mode===mode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
    $('mode-badge').textContent=`${DIFFICULTIES[mode].label} · ${DIFFICULTIES[mode].title}`;ready();
  }
  difficultyButtons.forEach(button=>button.addEventListener('click',()=>selectMode(button.dataset.mode)));
  const zone=$('touch-zone');
  zone.addEventListener('pointerdown',e=>{
    if(pointer!==null||state==='result'||(e.pointerType==='mouse'&&e.button!==0))return;
    unlockSound();
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
    unlockSound();
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

  function targetTime(){return state==='practice'?engine.time%DURATION:engine.time;}
  function motionText(on){return on?['⇆','지금 흔들기','막대가 끝날 때까지 좌우로 왕복해요.','ON']:['Ⅱ','지금 멈추기','빈 구간에서 빛을 내면 감점이에요.','OFF'];}
  function renderValues(){
    const active=state==='playing'||state==='result';
    $('track-wrap').classList.toggle('signal-warning',state==='playing'&&engine.survival==='warning');
    $('survival-readout').textContent=active?`누적 획득률 ${(engine.rate*100).toFixed(1)}% · ${engine.time<20?'20초부터 판정':engine.failed?'GAME OVER':engine.survival==='warning'?'경고! 70% 이상으로 회복하세요':'70% 미만 경고 / 60% 미만 종료'}`:'20초부터 누적 획득률 70% 미만 경고 · 60% 미만 종료';
    $('score').textContent=String(active?engine.score:0).padStart(5,'0');$('combo').innerHTML=`${active?engine.combo:0}<span>×</span>`;
    const left=active?Math.max(0,DURATION-engine.time):DURATION;$('time').innerHTML=`${left.toFixed(1)}<span>s</span>`;
    $('time-fill').style.width=`${left/DURATION*100}%`;
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
    const fx=effectsLevel(),motion=!reducedMotion?.matches;
    if(fx){
      ctx.save();
      // Subtle background trails stay outside the playable lane.
      for(let i=0;i<(fx===2?24:14);i++){
        const px=((i*113+(motion?t*18:0))%(cw+60))-30;
        const py=(i*71)%Math.max(1,ch);
        if(Math.abs(py-y)<65)continue;
        ctx.strokeStyle=fx===2?'#b78cff35':'#65eaff30';ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+18+fx*9,py-8);ctx.stroke();
      }
      ctx.restore();
    }
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
    if(fx&&state==='playing'){
      ctx.save();
      if(engine.lastJudge==='hit'){
        ctx.shadowColor=fx===2?'#d690ff':'#6cf3ff';ctx.shadowBlur=motion?24:8;
        ctx.strokeStyle=fx===2?'#edc4ff':'#b0ffff';ctx.lineWidth=4;
        ctx.beginPath();ctx.arc(lineX,y,18,0,Math.PI*2);ctx.stroke();
      }
      if(motion){
        const age=engine.time-burstAt;
        if(age>=0&&age<.45){
          ctx.globalAlpha=(1-age/.45)*.6;ctx.shadowBlur=12;ctx.strokeStyle=fx===2?'#ebadff':'#84f4ff';ctx.lineWidth=2;
          ctx.beginPath();ctx.arc(lineX,y,20+age*(fx===2?170:110),0,Math.PI*2);ctx.stroke();
        }
        sparks=sparks.filter(p=>engine.time-p.born<.55);
        for(const p of sparks){
          const age=engine.time-p.born;ctx.globalAlpha=(1-age/.55)*.85;ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=8;
          const px=lineX+p.vx*age,py=y+p.vy*age+40*age*age;
          ctx.fillRect(px,py,fx===2?4:3,fx===2?4:3);
        }
      }
      ctx.restore();
    }
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
        if(engine.judgments!==lastJudgment){lastJudgment=engine.judgments;if(engine.lastJudge==='hit')hitBurst();$('judge').textContent=({hit:'빛 전달 성공!',rest:'멈춤 성공',grace:'전환 준비',miss:'흔들어 주세요',penalty:'불필요한 빛 − 감점'})[engine.lastJudge];$('judge').dataset.grade=engine.lastJudge;}
        if(engine.done)finish();
      }
    }
    renderValues();syncSound();drawTrack();requestAnimationFrame(frame);
  }
  ready();resize();requestAnimationFrame(frame);
})();
