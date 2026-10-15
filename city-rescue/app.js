(function(){
 'use strict';
 const C=window.CityRescue,$=id=>document.getElementById(id);
 let game=null,screen='intro',selectedSource=null,finished=false,last=performance.now(),sound=false,audio=null;
 let storage=null;try{storage=window.localStorage;}catch{}
 const facilities=[...document.querySelectorAll('[data-target]')],sources=[...document.querySelectorAll('[data-source]')];
 const coords={hospital:[370,174],school:[790,174],shelter:[370,453],phone:[580,341],battery:[800,471]};
 const symbols={light:'☀',heat:'♨',sound:'♫',motion:'↕',chemical:'▰'};
 function setScreen(name){screen=name;for(const id of ['intro','game','result'])$(id).hidden=id!==name;window.scrollTo({top:0,behavior:'instant'});}
 function tell(text,error=false){$('message').textContent=text;$('message').classList.toggle('error',error);}
 function initSound(){
  if(!sound)return;
  try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error();if(!audio)audio=new Audio();if(audio.state==='suspended')audio.resume().catch(()=>{sound=false;updateSound();});}catch{sound=false;updateSound();}
 }
 function updateSound(){$('sound').textContent=sound?'소리 켜짐':'소리 꺼짐';$('sound').setAttribute('aria-pressed',String(sound));}
 function chime(ok){
  if(!sound||!audio||audio.state!=='running')return;
  const t=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.setValueAtTime(ok?660:220,t);if(ok)osc.frequency.setValueAtTime(880,t+.1);gain.gain.setValueAtTime(.045,t);gain.gain.exponentialRampToValueAtTime(.001,t+.23);osc.connect(gain);gain.connect(audio.destination);osc.start(t);osc.stop(t+.24);
 }
 $('sound').addEventListener('click',()=>{sound=!sound;updateSound();if(sound)initSound();else if(audio)audio.suspend().catch(()=>{});});
 function showRecords(){const d=C.records(storage),level=$('level').value;$('today-record').textContent=d.counts[level]?`오늘 ${level}단계 · 최고 ${d.best[level].toLocaleString()}점 · ${d.counts[level]}회 도전`:`오늘 ${level}단계 · 아직 도전 기록이 없어요.`;}
 $('level').addEventListener('change',showRecords);
 function begin(level){
  game=new C.Game(level);finished=false;selectedSource=null;last=performance.now();initSound();setScreen('game');renderTask();
 }
 $('begin').addEventListener('click',()=>begin($('level').value));
 function hud(){
  if(!game)return;
  $('time').textContent=`${Math.ceil(game.remaining)}s`;$('time').classList.toggle('low-time',game.remaining<=25);
  $('score').textContent=game.score.toLocaleString();$('progress').textContent=`${Math.min(game.index+1,9)} / 9`;
  $('battery-state').textContent=game.battery?` 비상 사용 ${game.battery}회`:'미충전 / 소진';
  $('reserve-note').textContent=game.battery?`비상 에너지 남음 · 사용 ${game.battery}회`:'배터리: 사용 가능한 에너지 없음';
 }
 function renderTask(){
  if(game.done){finish();return;}
  const task=game.task;selectedSource=null;
  $('chapter-label').textContent=`CHAPTER 0${task.chapter} / ${['','전달과 에너지 전환','같은 기기, 여러 에너지','충전과 정전 대응'][task.chapter]}`;
  $('mission-title').textContent=task.title;$('mission-request').textContent=task.request;
  $('configuration').hidden=true;$('feedback').hidden=true;$('connection-guide').hidden=false;
  $('step-label').textContent='01 / 전원 연결';$('map-help').textContent='전원 → 요청한 시설 순서로 터치하세요.';
  $('hint').textContent=C.LEVELS[game.level].hints?`힌트: ${task.source==='grid'?'주 전력망':'비상 배터리'}에서 ${C.FACILITIES[task.target]}로 연결해 보세요.`:'';
  $('grid-status').textContent=task.outage?'● 주 전력망 정전':'● 주 전력망 공급 중';$('grid-status').style.color=task.outage?'var(--red)':'var(--mint)';
  $('grid-source').classList.toggle('offline',!!task.outage);
  $('wire').setAttribute('d','');$('wire-end').setAttribute('visibility','hidden');
  sources.forEach(b=>{b.disabled=false;b.classList.remove('selected');b.setAttribute('aria-pressed','false');});
  facilities.forEach(b=>{
   const requested=b.dataset.target===task.target,restored=!task.outage&&game.log.some(l=>C.TASKS.find(t=>t.id===l.id).target===b.dataset.target);
   b.disabled=false;b.classList.toggle('requested',requested);b.classList.toggle('restored',restored);b.classList.remove('active-effect','motion-effect','heat-effect');
   b.querySelector('.facility-state').textContent=requested?'요청 도착':restored?'복구 이력 있음':'대기';b.querySelector('.facility-effect').textContent='';
   b.setAttribute('aria-label',`${C.FACILITIES[b.dataset.target]}${requested?' · 요청한 시설':''}`);
  });
  $('configuration').reset();buildOptions();tell(task.outage?'정전 발생! 충전해 둔 에너지를 활용하세요.':'전기를 보낼 전원과 시설을 연결하세요.');hud();
 }
 function buildOptions(){
  const task=game.task;$('device-options').replaceChildren();
  for(const key of task.choices){
   const d=C.DEVICES[key],label=document.createElement('label');label.className='choice';
   label.innerHTML=`<input type="radio" name="device" value="${key}" required><svg aria-hidden="true"><use href="#icon-${d.icon}"/></svg><span>${d.name}</span>`;
   if(C.LEVELS[game.level].hints)label.title=d.hint;
   $('device-options').append(label);
  }
  $('energy-options').replaceChildren();
  for(const [key,name] of Object.entries(C.ENERGY)){
   const label=document.createElement('label');label.className='choice';label.innerHTML=`<input type="checkbox" name="energy" value="${key}"><span class="energy-symbol" aria-hidden="true">${symbols[key]}</span><span>${name}</span>`;$('energy-options').append(label);
  }
  $('energy-question').textContent=task.id===7?'2. 배터리에 어떤 에너지로 저장될까요?':'2. 이 임무에서 주로 이용할 에너지를 모두 선택하세요.';
  $('heat-question').hidden=!task.heatQuestion;
  document.querySelectorAll('input[name="heat"]').forEach(e=>{e.required=!!task.heatQuestion;e.disabled=!task.heatQuestion;});
 }
 for(const button of sources)button.addEventListener('click',()=>{
  if(!game||game.done||game.paused||game.phase!=='connect')return;
  selectedSource=button.dataset.source;sources.forEach(b=>{const yes=b===button;b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',String(yes));});
  tell(`${selectedSource==='grid'?'주 전력망':'비상 배터리'} 선택. 요청한 시설을 터치하세요.`);
 });
 for(const button of facilities)button.addEventListener('click',()=>{
  if(!game||game.done||game.paused||game.phase!=='connect')return;
  if(!selectedSource){tell('먼저 지도 왼쪽에서 전원을 선택하세요.',true);return;}
  const response=game.connect(selectedSource,button.dataset.target);tell(response.message,!response.ok);hud();
  if(!response.ok){chime(false);return;}
  const [x,y]=coords[button.dataset.target],sy=selectedSource==='grid'?186:446;
  $('wire').setAttribute('d',`M100 ${sy} H${x-60} V${y} H${x}`);$('wire-end').removeAttribute('hidden');$('wire-end').setAttribute('visibility','visible');$('wire-end').setAttribute('cx',x);$('wire-end').setAttribute('cy',y);
  sources.forEach(b=>b.disabled=true);facilities.forEach(b=>b.disabled=true);
  $('connection-guide').hidden=true;$('configuration').hidden=false;$('step-label').textContent='02 / 장치와 전환 선택';$('map-help').textContent='전선 연결 완료 · 제어판에서 장치와 에너지를 선택하세요.';
  if(window.innerWidth<=760)$('control-title').scrollIntoView({block:'start',behavior:'smooth'});
 });
 $('configuration').addEventListener('submit',e=>{
  e.preventDefault();if(!game||game.done||game.paused)return;
  const data=new FormData(e.currentTarget),energies=data.getAll('energy');
  if(!energies.length){tell('이용할 에너지를 하나 이상 선택하세요.',true);return;}
  const response=game.submit(data.get('device'),energies,data.get('heat'));tell(response.message,!response.ok);hud();chime(response.ok);
  if(!response.ok)return;
  $('configuration').hidden=true;$('feedback').hidden=false;$('energy-chain').textContent=C.chain(game.task);$('explanation').textContent=game.task.explain;
  $('step-label').textContent='03 / 복구 성공';$('next').textContent=game.index===8?'작전 결과 확인 →':game.index===5?'정전에 대비하기 →':'다음 요청 받기 →';tell('임무 해결 +1,000점 · 설명을 읽고 다음 요청으로 이동하세요.');
  const facility=facilities.find(b=>b.dataset.target===game.task.target);facility.classList.add('restored','active-effect');facility.classList.remove('requested');facility.querySelector('.facility-state').textContent=game.task.id===7?'충전 완료':'작동 성공';
  facility.querySelector('.facility-effect').textContent=game.task.energies.map(x=>symbols[x]).join(' ');
  facility.classList.toggle('motion-effect',game.task.energies.includes('motion'));facility.classList.toggle('heat-effect',game.task.energies.includes('heat'));
 });
 $('next').addEventListener('click',()=>{if(!game||game.paused)return;game.next();last=performance.now();renderTask();});
 function pause(){if(screen!=='game'||!game||game.done)return;game.paused=true;if(!$('pause-dialog').open)$('pause-dialog').showModal();}
 $('pause').addEventListener('click',pause);
 function resume(){if(!game)return;game.paused=false;last=performance.now();$('pause-dialog').close();initSound();}
 $('resume').addEventListener('click',resume);$('pause-dialog').addEventListener('cancel',e=>{e.preventDefault();resume();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else last=performance.now();});
 $('quit').addEventListener('click',()=>{$('pause-dialog').close();game=null;setScreen('intro');showRecords();});
 function finish(){
  if(finished||!game?.done)return;finished=true;const result=C.save(storage,game);setScreen('result');
  $('result-symbol').textContent=game.complete?'✦':'◷';$('result-title').textContent=game.complete?'도시가 다시 움직입니다.':'이번 작전은 여기까지.';
  $('result-summary').textContent=game.complete?'전달 · 전환 · 저장, 아홉 개의 연결을 모두 복구했어요.':`${game.log.length}개의 임무를 해결했어요. 에너지 전환 지도를 보고 다시 도전해 보세요.`;
  $('result-score').textContent=game.score.toLocaleString();$('result-count').textContent=`${game.log.length} / 9`;$('result-accuracy').textContent=`${game.accuracy}%`;
  $('saved-note').textContent=result.saved?`오늘 ${game.level}단계 최고 ${result.data.best[game.level].toLocaleString()}점 · 이 브라우저에 기록했어요. 정확도는 해결 수 ÷ (해결 수 + 오답 수)입니다.`:'기록 저장을 사용할 수 없어요. 현재 결과 화면에서 점수를 확인하세요.';
  const map=$('conversion-map');map.replaceChildren();
  for(const task of C.TASKS){const solved=game.log.some(l=>l.id===task.id),card=document.createElement('article');card.className=`conversion-card${solved?'':' pending'}`;
   const label=document.createElement('span');label.className='num';label.textContent=`0${task.id} / ${solved?'복구 완료':'다음 도전에서 복구'}`;
   const title=document.createElement('h3');title.textContent=`${C.FACILITIES[task.target]} · ${C.DEVICES[task.device].name}`;const chain=document.createElement('strong');chain.textContent=C.chain(task);const explanation=document.createElement('p');explanation.textContent=task.explain;card.append(label,title,chain,explanation);map.append(card);
  }
  const review=$('review-errors');review.replaceChildren();
  for(const id of [...new Set(game.wrong.map(w=>w.task))].slice(0,3)){const p=document.createElement('p');p.className='review-note';p.textContent=`다시 생각하기 · ${C.TASKS[id-1].title}: ${C.TASKS[id-1].explain}`;review.append(p);}
  $('result').focus();
 }
 $('again').addEventListener('click',()=>begin(game?.level||2));$('home').addEventListener('click',()=>{game=null;setScreen('intro');showRecords();});
 function frame(now){const elapsed=(now-last)/1000;last=now;if(screen==='game'&&game&&!game.done&&!game.paused){game.tick(elapsed);hud();if(game.done)finish();}requestAnimationFrame(frame);}
 showRecords();requestAnimationFrame(frame);
})();
