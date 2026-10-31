/* ============================================================
   PACE: the first-visit "set your pace" journey, and the "Your pace" card.
   A student picks modules a week; the finish date, on-track status and reminder emails all come from that.
   Mirrors src/lib/pace.ts (a test keeps the presets in step).
============================================================ */
/* the fundamentals have no exams, so a module takes much less time and the presets are faster there */
const PACE_INFO=NOEX?[{id:'sprint',n:'Sprint',w:14,d:'Two modules a day'},{id:'steady',n:'Steady',w:7,d:'About a module a day'},{id:'relaxed',n:'Relaxed',w:3,d:'A few modules a week'}]:[{id:'sprint',n:'Sprint',w:10,d:'A module or two a day'},{id:'steady',n:'Steady',w:4,d:'A few sessions a week'},{id:'relaxed',n:'Relaxed',w:2,d:'A couple of modules a week'}];
const PACE_PRESETS=Object.fromEntries(PACE_INFO.map(p=>[p.id,p.w]));
let PACE=null,PACE_EMAIL=false,PACE_READY=false,PACE_OV=null;
const paceOn=()=>!!TRACK;
const paceClamp=n=>Math.max(1,Math.min(14,Math.round(+n||4)));
const passedCount=()=>COURSE().filter(m=>pm(m.id).p).length;
const paceDate=(w,from=new Date())=>{const left=COURSE().length-passedCount();return new Date(from.getTime()+(left<=0?0:left/paceClamp(w)*7*864e5))};
const fmtDay=d=>d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
const paceWeeks=w=>{const left=COURSE().length-passedCount();return left<=0?0:Math.max(1,Math.round(left/paceClamp(w)))};
const paceName=w=>(PACE_INFO.find(p=>p.w===w)||{n:'Custom'}).n;
function paceStatus(){
  if(!PACE)return null;const total=COURSE().length,passed=passedCount();if(passed>=total)return'done';
  const weeks=Math.max(0,Date.now()-new Date(PACE.startedAt).getTime())/(7*864e5),exp=Math.min(total,(PACE.baseline|0)+Math.floor(PACE.perWeek*weeks));
  return passed>exp?'ahead':passed>=exp-1?'on':'behind'}
const PACE_CHIP={done:['ok','Finished'],ahead:['ok','Ahead of pace'],on:['live','On pace'],behind:['bad','Behind pace']};
function paceCard(){
  if(!paceOn()||!PACE_READY)return'';
  if(!PACE)return`<div class="card pace-card"><div class="hud">Your pace</div><div class="h" style="font-size:17px;margin:4px 0 6px">Set how fast you want to go</div><p class="muted" style="font-size:13.5px">Pick a pace and we show you your finish date.</p><button class="btn primary sm" data-pace-open style="margin-top:10px">Set my pace →</button></div>`;
  const st=paceStatus(),c=PACE_CHIP[st],left=COURSE().length-passedCount();
  return`<div class="card pace-card"><div class="hud" style="display:flex;justify-content:space-between;align-items:center">Your pace <span class="chip ${c[0]}">${c[1]}</span></div>
  <div class="h" style="font-size:17px;margin:6px 0 2px">${paceName(PACE.perWeek)} · ${PACE.perWeek} a week</div>
  <p class="muted" style="font-size:13.5px">${left<=0?'You finished every module.':`${left} to go. At this pace you finish about <b>${fmtDay(paceDate(PACE.perWeek))}</b>.`}</p>
  <button class="btn sm" data-pace-open style="margin-top:10px">Change pace</button></div>`}
document.addEventListener('click',e=>{if(e.target.closest('[data-pace-open]'))openPace('edit')});

/* The journey: a path with one node per phase, and a comet that travels it faster the faster the pace. */
const PACE_PATH='M46 232 C 170 236, 196 92, 330 108 S 500 250, 626 178 S 820 52, 954 76';
/* one milestone per phase; a track with fewer than three phases (INVERTIX has one) gets one per module instead */
const paceNodes=()=>PH.length>2?PH.length:Math.max(3,COURSE().length);
function paceSVG(){
  const nodes=Array.from({length:paceNodes()},(_,i)=>`<g class="pn" data-i="${i}"><circle r="9"/><text y="3.6">${i+1}</text></g>`).join('');
  return`<svg class="pace-svg" viewBox="0 0 1000 290" aria-hidden="true"><defs><linearGradient id="pg" x1="0" x2="1"><stop offset="0" stop-color="#8cc4ff"/><stop offset="1" stop-color="#ff6a00"/></linearGradient><filter id="pglow"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
  <path d="${PACE_PATH}" class="pp-ghost"/><path d="${PACE_PATH}" class="pp-draw" id="ppDraw"/>${nodes}
  <g class="pflag"><text x="46" y="268" text-anchor="middle">Day 1</text></g>
  <g class="pseal"><circle cx="954" cy="76" r="17"/><text x="954" y="38" text-anchor="middle" class="pseal-t">${TRACK.short} certificate</text></g>
  <g id="pcomet" filter="url(#pglow)"></g></svg>`}
function openPace(mode){
  if(PACE_OV)return;const first=mode==='first',total=COURSE().length;
  let w=PACE?PACE.perWeek:(NOEX?7:4),email=PACE?PACE.emails:true,raf=0,t0=performance.now(),trail=[];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ov=document.createElement('div');ov.className='pace-ov'+(first?' first':'');ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.setAttribute('aria-label','Set your pace');
  ov.innerHTML=`<div class="pace-in">
    <div class="pace-hero"><div class="hud pace-k">${first?(TRACK.id==='fundamentals'?'Welcome to the Trading School':'Welcome to '+TRACK.name):'Your pace'}</div><h2 class="h pace-h">${first?'Before you start, set your pace.':'Change your pace'}</h2>
    <p class="pace-p">${first?`There are <b>${total} modules</b> ${TRACK.endText}. Tell us how fast you want to go and we will show you where that lands.`:'This only changes your finish date and your reminders. Your progress stays exactly as it is.'}</p></div>
    ${paceSVG()}
    <div class="pace-card2"><div class="pace-pre">${PACE_INFO.map(p=>`<button type="button" class="pre" data-w="${p.w}"><b>${p.n}</b><span>${p.d}</span><i>${p.w} a week</i></button>`).join('')}</div>
      <div class="pace-slide"><label for="paceR">Fine-tune: <b id="paceV"></b> modules a week</label><input type="range" id="paceR" min="1" max="14" step="1"></div>
      <div class="pace-out"><div><span class="hud">You finish around</span><div class="pace-date" id="paceD"></div></div><div class="pace-wk"><b id="paceW">0</b><span>weeks</span></div></div>
      <p class="pace-note" id="paceN"></p>
      ${PACE_EMAIL?`<label class="pace-mail"><input type="checkbox" id="paceM" ${email?'checked':''}> Email me a short nudge if I fall behind my pace</label>`:''}
      <div class="pace-act"><button class="btn primary" id="paceGo">${first?'Start my journey →':'Save pace'}</button><button class="btn ghost" id="paceSkip">${first?'Set this later':'Cancel'}</button></div></div></div>`;
  document.body.append(ov);PACE_OV=ov;document.body.style.overflow='hidden';
  const path=ov.querySelector('#ppDraw'),L=path.getTotalLength();path.style.strokeDasharray=L;if(!reduced)path.style.strokeDashoffset=L;
  ov.querySelectorAll('.pn').forEach((g,i)=>{const p=path.getPointAtLength(L*i/(paceNodes()-1));g.setAttribute('transform',`translate(${p.x} ${p.y})`);g.style.setProperty('--d',(reduced?0:.5+i*.2)+'s')});
  if(reduced)ov.classList.add('still');
  requestAnimationFrame(()=>{ov.classList.add('on');if(!reduced){path.style.transition='stroke-dashoffset 2.2s cubic-bezier(.5,.1,.2,1) .3s';path.style.strokeDashoffset=0}});
  const comet=ov.querySelector('#pcomet');
  const frame=now=>{const dur=Math.max(2600,Math.min(16000,14000*4/w)),f=(((now-t0)/dur)%1),p=path.getPointAtLength(L*f);
    trail.unshift(p);trail.length=Math.min(trail.length,16);
    comet.innerHTML=trail.map((q,i)=>`<circle cx="${q.x}" cy="${q.y}" r="${(6-i*.33).toFixed(2)}" fill="${i?'#ffb27a':'#fff'}" opacity="${(1-i/16).toFixed(2)}"/>`).join('');raf=requestAnimationFrame(frame)};
  if(!reduced)setTimeout(()=>{if(PACE_OV===ov)raf=requestAnimationFrame(frame)},first?2200:600);
  else{const p=path.getPointAtLength(L*.4);comet.innerHTML=`<circle cx="${p.x}" cy="${p.y}" r="6" fill="#fff"/>`}
  let shown=0;
  const tween=(el,to)=>{const from=shown;shown=to;if(reduced||from===to){el.textContent=to;return}const s=performance.now();const st=n=>{const k=Math.min(1,(n-s)/420);el.textContent=Math.round(from+(to-from)*(1-Math.pow(1-k,3)));if(k<1)requestAnimationFrame(st)};requestAnimationFrame(st)};
  const paint=()=>{ov.querySelectorAll('.pre').forEach(b=>b.classList.toggle('sel',+b.dataset.w===w));ov.querySelector('#paceR').value=w;ov.querySelector('#paceV').textContent=w;
    const left=total-passedCount();ov.querySelector('#paceD').textContent=left<=0?'Already done':fmtDay(paceDate(w));tween(ov.querySelector('#paceW'),paceWeeks(w));
    const done=passedCount();ov.querySelector('#paceN').textContent=left<=0?'':done?`You have already passed ${done} of ${total}, so ${left} to go.`:`${total} modules at ${w} a week.`};
  ov.querySelectorAll('.pre').forEach(b=>b.onclick=()=>{w=+b.dataset.w;paint()});
  ov.querySelector('#paceR').oninput=e=>{w=paceClamp(e.target.value);paint()};
  const close=()=>{cancelAnimationFrame(raf);ov.classList.remove('on');document.body.style.overflow='';setTimeout(()=>{ov.remove();if(PACE_OV===ov)PACE_OV=null},320)};
  const onKey=e=>{if(e.key==='Escape'){document.removeEventListener('keydown',onKey);skip()}};document.addEventListener('keydown',onKey);
  const skip=()=>{try{sessionStorage.setItem('fh-pace-skip-'+TRACK.id,'1')}catch(e){}document.removeEventListener('keydown',onKey);close()};
  ov.querySelector('#paceSkip').onclick=skip;
  ov.querySelector('#paceGo').onclick=async()=>{const b=ov.querySelector('#paceGo');b.disabled=true;
    const m=ov.querySelector('#paceM');
    try{const r=await fetch('/api/school/pace',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({track:TRACK.id,perWeek:w,preset:(PACE_INFO.find(p=>p.w===w)||{id:'custom'}).id,emails:m?m.checked:true})});
      if(!r.ok)throw 0;const j=await r.json();PACE=j.pace;document.removeEventListener('keydown',onKey);close();render();toast(first?'Pace set. Your first module is ready.':'Pace updated.')}
    catch(e){b.disabled=false;toast('Could not save your pace. Try again.')}};
  paint();
}
function paceAfterPull(j){if(!paceOn())return;PACE=j.pace||null;PACE_EMAIL=!!j.hasEmail;PACE_READY=true}
/* The welcome only shows on the course map (called from renderMap), never on the GEX levels page or inside a lesson. */
function paceMaybeFirst(){
  if(!paceOn()||!PACE_READY||PACE||PACE_OV)return;
  let skipped=false;try{skipped=sessionStorage.getItem('fh-pace-skip-'+TRACK.id)==='1'}catch(e){}
  if(!skipped)openPace('first')}
function gexCard(){return gexOn()?`<div class="card pace-card"><div class="hud">Every morning</div><div class="h" style="font-size:17px;margin:4px 0 6px">Daily GEX levels</div><p class="muted" style="font-size:13.5px">Today's call wall, put wall and gamma flip for NQ, with a one-click copy for the indicator.</p><a class="btn sm" href="#/gex" style="margin-top:10px">Open today's levels →</a></div>`:''}
