/* ============================================================
   Usage tracker: how long a signed-in member spends in each section of the school and practice pages.
   Counts only while the tab is visible and the member has done something in the last 90 seconds.
============================================================ */
(()=>{
const area=window.INV?'invertix':window.VAULT?'vault':window.PRACTICE?'practice':'school',sid=(window.crypto&&crypto.randomUUID?crypto.randomUUID():(Math.random().toString(36).slice(2)+Date.now().toString(36)+'0000000000')).slice(0,40);
let act=Date.now(),at=Date.now(),buf={};
['pointerdown','keydown','wheel','touchstart','mousemove'].forEach(e=>addEventListener(e,()=>{act=Date.now()},{passive:true}));
const section=()=>{try{
  if(window.PRACTICE){const pv=typeof PV!=='undefined'?PV:'tasks';
    if(pv==='lab')return 'Eval lab';
    return 'Practice tasks'}
  if(typeof VIEW==='undefined')return 'Trading School';
  if(VIEW==='map')return window.INV?'INVERTIX map':window.VAULT?'Vault map':'Course map';
  if(!CUR)return 'Trading School';
  const m=`Module ${CUR.n} · ${CUR.t}`;return VIEW==='exam'?m+' · Exam':m}catch(e){return 'Trading School'}};
const send=(sec,secs,beacon)=>{const body=JSON.stringify({sid,area,section:sec,secs:Math.round(secs)});
  try{if(beacon&&navigator.sendBeacon)return navigator.sendBeacon('/api/usage',new Blob([body],{type:'application/json'}));
    fetch('/api/usage',{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true,credentials:'same-origin'}).catch(()=>{})}catch(e){}};
const flush=beacon=>{for(const k of Object.keys(buf)){if(buf[k]>=1){send(k,Math.min(120,buf[k]),beacon);buf[k]=0}}};
setInterval(()=>{const now=Date.now(),dt=Math.min(10,(now-at)/1000);at=now;if(document.visibilityState==='visible'&&now-act<90000){const s=section();buf[s]=(buf[s]||0)+dt}},5000);
setInterval(()=>flush(false),30000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush(true)});
addEventListener('pagehide',()=>flush(true));
send(section(),0,false); /* registers the visit (the log-in time) */
})();
