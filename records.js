(function(root){
  'use strict';
  const KEY = 'light-signal-60s-v1';
  const MODES = ['easy','medium','hard','expert','master','lightning','ultimate'];
  function localDate(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function blank(date) { return {version:1,date,modes:Object.fromEntries(MODES.map(k=>[k,{count:0,best:0,bestCombo:0,recent:[]}]))}; }
  const integer = (n,max) => Number.isInteger(n) && n>=0 && n<=max;
  function validRecord(r) { return r && integer(r.score,10000) && integer(r.accuracy,100) && integer(r.combo,600); }
  function validData(d,date) {
    return d && d.version===1 && d.date===date && d.modes && MODES.every(k=> {
      const m=d.modes[k];
      return m && integer(m.count,Number.MAX_SAFE_INTEGER) && integer(m.best,10000) && integer(m.bestCombo,600) && Array.isArray(m.recent) && m.recent.length<=10 && m.recent.length<=m.count && m.recent.every(r=>validRecord(r)&&typeof r.time==='string'&&Number.isFinite(Date.parse(r.time))&&r.score<=m.best&&r.combo<=m.bestCombo);
    });
  }
  function createStore(storage, now=()=>new Date()) {
    let available = true, data;
    function persist() { try { storage.setItem(KEY,JSON.stringify(data)); } catch { available=false; } }
    function refresh() {
      const date=localDate(now());
      if (available) {
        try {
          const saved=storage.getItem(KEY),raw=JSON.parse(saved);
          // Extend existing daily records; never discard levels 1–5 for missing new keys.
          if(raw&&raw.version===1&&raw.date===date&&raw.modes){
            for(const k of ['lightning','ultimate'])if(!Object.prototype.hasOwnProperty.call(raw.modes,k))raw.modes[k]={count:0,best:0,bestCombo:0,recent:[]};
          }
          if(validData(raw,date))data=raw;
          else {
            data=blank(date);

            persist();
          }
        }
        catch(error) { if(!(error instanceof SyntaxError))available=false; data=data&&data.date===date?data:blank(date);persist(); }
      } else if(!data||data.date!==date){data=blank(date);}
    }
    return {
      get available(){return available;},
      read(){refresh();return JSON.parse(JSON.stringify(data));},
      add(mode,record){
        if(!MODES.includes(mode)||!validRecord(record))throw new TypeError('Invalid result');
        refresh();const m=data.modes[mode];m.count++;m.best=Math.max(m.best,record.score);m.bestCombo=Math.max(m.bestCombo,record.combo);
        m.recent.unshift({...record,time:now().toISOString()});m.recent=m.recent.slice(0,10);persist();
        return this.read();
      }
    };
  }
  const api={createStore,localDate,KEY};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LightRecords=api;
})(typeof globalThis!=='undefined'?globalThis:this);
