(function(root){
  'use strict';
  const LEVELS={
    1:{label:'1단계',title:'관제 훈련',seconds:210,hints:true},
    2:{label:'2단계',title:'도시 복구',seconds:180,hints:false},
    3:{label:'3단계',title:'긴급 대응',seconds:135,hints:false}
  };
  const ENERGY={light:'빛',heat:'열',sound:'소리',motion:'역학적',chemical:'화학'};
  const FACILITIES={hospital:'병원',shelter:'대피소',school:'방송 센터',phone:'통신소',battery:'저장소'};
  const DEVICES={
    lamp:{name:'조명',icon:'lamp',hint:'주변을 밝히는 장치'},
    speaker:{name:'스피커',icon:'speaker',hint:'안내를 소리로 전달'},
    motor:{name:'승강기 모터',icon:'motor',hint:'승강기를 움직이는 장치'},
    heater:{name:'보온 장치',icon:'heater',hint:'물체를 따뜻하게 유지'},
    video:{name:'화면 + 스피커',icon:'phone',hint:'영상과 음성을 함께 전달'},
    vibration:{name:'진동만 켜기',icon:'phone',hint:'화면과 소리는 끄고 진동 알림'},
    screen:{name:'화면만 켜기',icon:'phone',hint:'소리와 진동 없이 화면만 사용'},
    charging:{name:'충전 회로',icon:'battery',hint:'배터리에 에너지를 저장'}
  };
  const TASKS=[
    {id:1,chapter:1,target:'hospital',source:'grid',title:'어두운 복도를 밝혀라',request:'병원 복도에 불이 꺼졌습니다. 환자가 안전하게 이동할 수 있도록 주변을 밝혀 주세요.',device:'lamp',choices:['lamp','heater','speaker'],energies:['light'],explain:'전선으로 전달된 전기 에너지가 조명에서 빛과 열로 전환됩니다. 복도를 밝힐 때 주로 이용하는 것은 빛입니다.'},
    {id:2,chapter:1,target:'school',source:'grid',title:'멀리까지 대피 안내',request:'방송 센터에서 건물 밖 사람들에게 대피 장소를 알려야 합니다. 화면을 보지 않아도 안내가 전달되어야 합니다.',device:'speaker',choices:['lamp','speaker','motor'],energies:['sound'],explain:'스피커는 전기 에너지를 소리 에너지로 전환합니다. 전선을 통해 멀리 있는 시설에도 전기 에너지를 전달할 수 있습니다.'},
    {id:3,chapter:1,target:'hospital',source:'grid',title:'환자 이동을 도와라',request:'병원 승강기가 멈췄습니다. 환자를 위층으로 이동시킬 수 있도록 승강기를 움직여 주세요.',device:'motor',choices:['speaker','motor','heater'],energies:['motion'],explain:'모터가 전기 에너지를 역학적 에너지로 전환하여 승강기를 움직입니다. 작동 중 열도 함께 발생합니다.'},
    {id:4,chapter:2,target:'shelter',source:'grid',title:'온기를 지켜라',request:'대피소의 보온 장치로 담요를 따뜻하게 유지해야 합니다. 이 임무에서 필요한 에너지 전환을 찾아 주세요.',device:'heater',choices:['motor','lamp','heater'],energies:['heat'],explain:'보온 장치는 전기 에너지를 열에너지로 전환합니다. 이 임무에서는 발생한 열 자체가 필요한 결과입니다.'},
    {id:5,chapter:2,target:'phone',source:'grid',title:'영상과 음성을 동시에',request:'통신소의 스마트폰으로 수어 영상과 음성 안내를 동시에 전달해야 합니다. 화면과 스피커를 함께 사용하는 경우를 생각해 보세요.',device:'video',choices:['screen','vibration','video'],energies:['light','sound'],explain:'스마트폰 화면에서는 빛, 스피커에서는 소리가 나옵니다. 하나의 기기에서도 여러 형태의 에너지 전환이 동시에 일어납니다.'},
    {id:6,chapter:2,target:'hospital',source:'grid',title:'전등이 따뜻해졌다?',request:'병원 조명을 켠 뒤 전등 주변이 따뜻해졌습니다. 복도를 밝히는 데 주로 이용한 에너지와, 함께 발생한 열을 구분해 보세요.',device:'lamp',choices:['heater','lamp','speaker'],energies:['light'],heatQuestion:true,explain:'조명의 주된 목적은 빛을 이용하는 것입니다. 열도 함께 발생하지만 조명 임무에서 주로 이용하는 에너지는 아닙니다. 에너지가 사라진 것은 아닙니다.'},
    {id:7,chapter:3,target:'battery',source:'grid',title:'정전 전에 에너지를 저장',request:'곧 주 전력망 점검으로 전기 공급이 끊깁니다. 아직 전기가 들어오는 지금, 저장소의 충전식 배터리를 충전해 주세요.',device:'charging',choices:['charging','motor','heater'],energies:['chemical'],explain:'충전할 때 전기 에너지가 배터리의 화학 에너지로 저장됩니다. 이후 필요할 때 다시 전기 에너지로 전환해 사용할 수 있습니다.'},
    {id:8,chapter:3,target:'hospital',source:'battery',outage:true,title:'정전! 비상등을 켜라',request:'주 전력망이 끊겼습니다. 앞서 충전한 배터리로 병원의 비상등을 켜야 합니다. 지금 이용할 수 있는 전원을 선택하세요.',device:'lamp',choices:['lamp','speaker','heater'],energies:['light'],explain:'배터리에 저장된 화학 에너지가 전기 에너지로 전환되고, 비상등에서 빛과 열로 전환됩니다. 저장한 에너지를 정전 때 이용한 것입니다.'},
    {id:9,chapter:3,target:'phone',source:'battery',outage:true,title:'소리 없이 구조 신호',request:'충전한 배터리로 통신소 스마트폰에 전기를 공급하세요. 화면과 소리는 끄고, 진동으로만 구조대에 알림을 전달해야 합니다.',device:'vibration',choices:['video','vibration','screen'],energies:['motion'],explain:'배터리의 화학 에너지가 전기 에너지로, 진동 장치에서 역학적 에너지로 전환됩니다. 진동도 물체의 운동입니다.'}
  ];
  function chain(task){return task.id===7?'전기 → 화학 에너지로 저장':`${task.source==='battery'?'화학 → ':''}전기 → ${task.energies.map(e=>ENERGY[e]).join(' + ')}`;}
  class Game{
    constructor(level=2){this.level=LEVELS[level]?Number(level):2;this.limit=LEVELS[this.level].seconds;this.remaining=this.limit;this.index=0;this.phase='connect';this.connection=null;this.selectedSource=null;this.errors=0;this.log=[];this.battery=0;this.done=false;this.paused=false;this.wrong=[];}
    get task(){return TASKS[this.index];}
    get complete(){return this.done&&this.index===TASKS.length;}
    get score(){return Math.max(0,Math.round(this.log.length*1000-this.errors*150+(this.complete?1000*this.remaining/this.limit:0)));}
    get accuracy(){return Math.round(this.log.length/(this.log.length+this.errors||1)*100);}
    mistake(message){this.errors++;this.wrong.push({task:this.task.id,message});return {ok:false,message};}
    connect(source,target){
      if(this.done||this.paused||this.phase!=='connect')return {ok:false,message:'현재 연결을 바꿀 수 없습니다.'};
      if(source==='grid'&&this.task.outage)return this.mistake('주 전력망이 끊겼어요. 충전해 둔 배터리를 전원으로 선택하세요.');
      if(source==='battery'&&this.battery===0)return this.mistake('배터리에 저장된 에너지가 없어요. 먼저 전기가 공급될 때 충전해야 합니다.');
      if(source!==this.task.source||target!==this.task.target)return this.mistake('요청한 시설과 현재 사용할 전원을 다시 확인하세요.');
      this.connection={source,target};this.phase='configure';return {ok:true,message:'전선 연결 완료! 장치와 에너지 전환을 설정하세요.'};
    }
    submit(device,energies,heat){
      if(this.done||this.paused||this.phase!=='configure')return {ok:false,message:'먼저 전원과 시설을 연결하세요.'};
      const task=this.task;
      if(device!==task.device)return this.mistake('이 장치로 요청을 해결할 수 있을까요? 장치의 기능을 살펴보세요.');
      if(!Array.isArray(energies)||new Set(energies).size!==task.energies.length||task.energies.some(e=>!energies.includes(e)))return this.mistake(task.id===7?'충전할 때 에너지는 배터리에 어떤 형태로 저장될까요?':'이 임무에서 주로 이용하는 에너지를 모두 선택하세요. 모든 기기에 열이 생길 수 있지만, 지금 필요한 결과와 구분해야 해요.');
      if(task.heatQuestion&&heat!=='secondary')return this.mistake('전등의 열도 전기 에너지가 전환된 결과입니다. 하지만 복도를 밝히는 주된 목적과는 구분해야 합니다.');
      if(task.id===7)this.battery=2;
      if(task.source==='battery')this.battery--;
      this.log.push({id:task.id,chain:chain(task)});this.phase='feedback';return {ok:true,message:task.explain};
    }
    next(){if(this.done||this.phase!=='feedback')return;this.index++;this.connection=null;this.selectedSource=null;if(this.index===TASKS.length){this.done=true;this.phase='result';}else this.phase='connect';}
    tick(seconds){if(this.done||this.paused||this.phase==='feedback'||!Number.isFinite(seconds)||seconds<=0)return;this.remaining=Math.max(0,this.remaining-seconds);if(this.remaining===0){this.done=true;this.phase='result';}}
  }
  const KEY='energy-city-today-v1';
  const localDate=()=>{const d=new Date();return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;};
  function records(storage,date=localDate()){
    const blank=()=>({date,levels:{1:[],2:[],3:[]},best:{1:0,2:0,3:0},counts:{1:0,2:0,3:0}});
    try{const d=JSON.parse(storage.getItem(KEY));if(!d||d.date!==date)return blank();
      for(const k of [1,2,3])if(!Array.isArray(d.levels[k])||d.levels[k].length>10||!Number.isInteger(d.best[k])||d.best[k]<0||d.best[k]>10000||!Number.isInteger(d.counts[k])||d.counts[k]<0||d.levels[k].some(r=>!Number.isInteger(r.score)||r.score<0||r.score>10000))return blank();return d;
    }catch{return blank();}
  }
  function save(storage,game,date=localDate()){
    const data=records(storage,date),k=game.level;data.levels[k].unshift({score:game.score,cleared:game.complete,solved:game.log.length});data.levels[k]=data.levels[k].slice(0,10);data.best[k]=Math.max(data.best[k],game.score);data.counts[k]++;
    try{storage.setItem(KEY,JSON.stringify(data));return {data,saved:true};}catch{return {data,saved:false};}
  }
  const api={LEVELS,ENERGY,FACILITIES,DEVICES,TASKS,Game,chain,records,save,KEY};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CityRescue=api;
})(typeof globalThis!=='undefined'?globalThis:this);
