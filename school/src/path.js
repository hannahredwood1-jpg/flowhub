/* ============================================================
   LEARNING PATH: every student says where they are. What they already know they do the short way ("express": just the three practice tasks, no lesson);
   everything else is learned the normal way. There are no exams. Every module is finished only by passing its practice tasks.
   Stored modes keep the old names: 'prove' = express, 'learn' = teach me. Mirrors src/lib/schoolPath.ts (a test keeps the list below in step).
============================================================ */
const NO_PROOF=['m50'];
let PATH=null,PATH_READY=false,PATH_STAFF=false,PATH_OV=null;
const pathOn=()=>!!TRACK&&TRACK.id==='fundamentals';
const provableMod=m=>!NO_PROOF.includes(m.id);
/* Until a student has built their path, the school is closed. Coaches are never locked out. */
const pathGate=()=>pathOn()&&LIVE&&PATH_READY&&!PATH&&!PATH_STAFF;
const proofPending=m=>false;
/* express: the lesson is skipped, the practice tasks still have to be passed */
const expressMod=m=>pathOn()&&!!PATH&&PATH.modes[m.id]==='prove'&&!pm(m.id).p;
const EXPRESS_MIN=5;
const wordsOf=m=>(m.learn||[]).reduce((a,l)=>a+String(l.h||'').replace(/<[^>]+>/g,' ').split(/\s+/).filter(Boolean).length,0);
const teachMin=m=>Math.max(15,Math.round((wordsOf(m)/220+11)/5)*5);
const modMin=m=>pm(m.id).p?0:expressMod(m)&&!stepsDone(m)?EXPRESS_MIN:Math.max(5,Math.round(teachMin(m)*(1-stepsDone(m)/3)/5)*5);
const minsLeft=()=>MODS.reduce((a,m)=>a+modMin(m),0);
const fmtHrs=n=>n<90?n+' min':(n/60).toFixed(1).replace(/\.0$/,'')+' hours';
function pathAfterPull(j){
  if(!pathOn())return;PATH=j.path||null;PATH_STAFF=!!j.staff;PATH_READY=true;
  const pr=j.proofs||{};
  Object.entries(pr).forEach(([id,r])=>{const p=pm(id);p.po=1;if(r.pass){p.t=1;if(!p.p){p.p=1;p.sc=r.sc|0;p.at=r.at|0}}});
  persist(false)}
/* How far along the Fundamentals certificate is: every module, learned or proved. */
function pathStats(){
  const req=MODS,done=req.filter(m=>pm(m.id).p),tested=done.filter(m=>pm(m.id).t).length;
  const ex=req.filter(m=>expressMod(m)).length;
  return{need:req.length,done:done.length,tested,completed:done.length-tested,express:ex,learn:req.length-done.length-ex}}
function pathCard(){
  if(!pathOn()||!PATH_READY)return'';
  if(!PATH)return PATH_STAFF?`<div class="card pace-card"><div class="hud">Your path</div><p class="muted" style="font-size:13.5px;margin:6px 0 10px">Students build a path before they start. You can build one too.</p><button class="btn sm" data-path-open>Build a path</button></div>`:'';
  const s=pathStats(),s0=s,pct=s.need?Math.round(s.done/s.need*100):100;
  return`<div class="card pace-card"><div class="hud" style="display:flex;justify-content:space-between">Your path <span class="chip live">${s0.done>=s0.need?'Done':'About '+fmtHrs(minsLeft())+' left'}</span></div>
  <div class="h" style="font-size:17px;margin:6px 0 8px">To earn your certificate</div><div class="pbar"><i style="width:${pct}%"></i></div>
  <p class="muted" style="font-size:13.5px;margin-top:8px"><b>${s.done} of ${s.need}</b> complete${s.express?` · ${s.express} express`:''}${s.learn?` · ${s.learn} to learn`:''}</p>
  <p class="muted" style="font-size:12.5px;margin-top:6px">Understanding GEX Levels is always learned in full.</p>
  <button class="btn sm" data-path-open style="margin-top:10px">Edit your path</button></div>`}
document.addEventListener('click',e=>{if(e.target.closest('[data-path-open]'))openPath(PATH?'edit':'first')});
function pathMaybeFirst(){if(pathGate()&&!PATH_OV)openPath('first');return pathGate()}

const PATH_START=[
 {id:'new',n:"I'm brand new",d:"Teach me everything from the start.",prove:[]},
 {id:'traded',n:"I've traded before",d:'I know the basics, my platform and the habits. Express those.',prove:[0,1,2]},
 {id:'experienced',n:"I'm experienced",d:'I already trade with a method and manage risk. Express most of it.',prove:[0,1,2,3,4,5,6]}];
function openPath(mode){
  if(PATH_OV)return;const first=mode==='first',view=false;
  const rem=MODS.filter(m=>provableMod(m)&&!pm(m.id).p);
  const phases=[...new Set(rem.map(m=>m.ph))].sort((a,b)=>a-b);
  const modes={};rem.forEach(m=>{modes[m.id]=PATH&&PATH.modes[m.id]==='prove'?'prove':'learn'});
  const ans={start:(PATH&&PATH.answers&&PATH.answers.start)||'',prop:(PATH&&PATH.answers&&PATH.answers.prop)||''};
  const ov=document.createElement('div');ov.className='pace-ov pb-ov';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.setAttribute('aria-label','Build your learning path');
  const fullN=MODS.filter(m=>NO_PROOF.includes(m.id)).length;
  const build=()=>{
    const nP=rem.filter(m=>modes[m.id]==='prove').length,nL=rem.length-nP;
    const mins=MODS.filter(m=>!pm(m.id).p).reduce((a,m)=>a+(modes[m.id]==='prove'&&!stepsDone(m)?EXPRESS_MIN:teachMin(m)),0);
    ov.innerHTML=`<div class="pace-in pb-in">
    <div class="pace-hero"><div class="hud pace-k">${first?'Welcome to the Trading School':view?'Your path':'Edit your path'}</div>
      <h2 class="h pace-h" style="opacity:1;transform:none">Where are you starting?</h2>
      <p class="pace-p" style="opacity:1;transform:none">Tell us where you are. Anything you already know you do the short way: <b>express</b> is just the three practice tasks, no lesson. Everything else you learn the normal way. There are no exams, but every module is finished only when its practice tasks are right, so nothing can be clicked through.</p></p></div>
    ${view?'':`<div class="pb-start">${PATH_START.map(o=>`<button type="button" class="pb-card ${ans.start===o.id?'sel':''}" data-start="${o.id}"><b>${o.n}</b><span>${o.d}</span></button>`).join('')}</div>
    <div class="pb-prop"><span>Have you used a prop firm account before?</span><div class="seg" role="group" aria-label="Prop firm experience"><button type="button" class="${ans.prop==='no'?'on':''}" data-prop="no">No</button><button type="button" class="${ans.prop==='yes'?'on':''}" data-prop="yes">Yes</button></div></div>`}
    <h3 class="h" style="font-size:18px;margin:22px 0 10px">Your path, phase by phase</h3>
    <div class="pb-rows">${phases.length?phases.map(ph=>{const ms=rem.filter(m=>m.ph===ph),allP=ms.every(m=>modes[m.id]==='prove'),allL=ms.every(m=>modes[m.id]==='learn');
      return`<div class="pb-row"><div class="pb-rh"><div><b>${PH[ph].n}</b><small>${ms.length} module${ms.length>1?'s':''}${!allP&&!allL?' · mixed':''}</small></div>
        ${view?`<span class="chip ${allP?'live':''}">${allP?'Express':allL?'Learn it':'Mixed'}</span>`:`<div class="seg" role="group" aria-label="${esc(PH[ph].n)}"><button type="button" class="${allL?'on':''}" data-pset="${ph}:learn">Teach me</button><button type="button" class="${allP?'on':''}" data-pset="${ph}:prove">Express</button></div>`}</div>
        <details class="pb-mods" ${view?'open':''}><summary>${view?'Modules':'Choose module by module'}</summary>${ms.map(m=>`<label class="pb-m"><input type="checkbox" data-m="${m.id}" ${modes[m.id]==='prove'?'checked':''} ${view?'disabled':''}><span>${m.n}. ${esc(m.t)}</span><em>${modes[m.id]==='prove'?'Express':'Learn it'}</em></label>`).join('')}</details></div>`}).join(''):'<p class="muted">Everything you can test out of is already done.</p>'}
      <div class="pb-row pb-full"><div class="pb-rh"><div><b>Always learned in full</b><small>${fullN} module</small></div><span class="chip">Learn it</span></div><p class="muted" style="font-size:13.5px;margin-top:6px">Understanding GEX Levels is always learned in full.</p></div></div>
    <div class="card pb-sum"><div class="hud">Your path</div><p style="margin:4px 0 10px"><b>${nP}</b> express · <b>${nL}</b> to learn · <b>${fullN}</b> always in full · about <b>${fmtHrs(mins)}</b></p>
      <ul class="pb-rules"><li><b>Express</b> skips the lesson. You still have to get the three practice tasks right the first time. You can open the lesson whenever you want.</li><li>Every module, express or not, is complete only when its practice tasks are passed. There are no exams.</li><li>When every module is complete you earn your Fundamentals certificate. The certificate opens the INVERTIX page.</li><li>You can change your path at any time.</li></ul>
      <div class="pace-act">${view?'<button class="btn primary" id="pbClose">Close</button>':`<button class="btn primary" id="pbGo">${first?'Lock in my path →':'Save my path'}</button>${first?'<a class="btn ghost" href="/">← FLOWHUB home</a>':'<button class="btn ghost" id="pbClose">Cancel</button>'}`}</div></div></div>`;
    bind()};
  const bind=()=>{
    $$('[data-start]',ov).forEach(b=>b.onclick=()=>{const o=PATH_START.find(x=>x.id===b.dataset.start);ans.start=o.id;rem.forEach(m=>{modes[m.id]=o.prove.includes(m.ph)?'prove':'learn'});redraw()});
    $$('[data-prop]',ov).forEach(b=>b.onclick=()=>{ans.prop=b.dataset.prop;redraw()});
    $$('[data-pset]',ov).forEach(b=>b.onclick=()=>{const [ph,v]=b.dataset.pset.split(':');rem.filter(m=>m.ph===+ph).forEach(m=>{modes[m.id]=v});redraw()});
    $$('[data-m]',ov).forEach(b=>b.onchange=()=>{modes[b.dataset.m]=b.checked?'prove':'learn';redraw()});
    const go=$('#pbGo');
    const cl=$('#pbClose');if(cl)cl.onclick=close;
    if(go)go.onclick=save};
  const redraw=()=>{const open=$$('.pb-mods',ov).map(d=>d.open),top=ov.scrollTop;build();$$('.pb-mods',ov).forEach((d,i)=>{d.open=open[i]});ov.scrollTop=top};
  const close=()=>{ov.classList.remove('on');document.body.style.overflow='';document.removeEventListener('keydown',onKey);setTimeout(()=>{ov.remove();PATH_OV=null},300)};
  const onKey=e=>{if(e.key==='Escape'&&!first)close()};
  const save=async()=>{const go=$('#pbGo');go.disabled=true;
    try{const r=await fetch('/api/school/path',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({modes,answers:{start:ans.start,prop:ans.prop}})});
      if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error(j.error||'')}
      const j=await r.json();PATH=j.path;close();render();toast(first?'Your path is set. Your school is open.':'Path saved.')}
    catch(e){go.disabled=false;toast(e.message||'Could not save your path. Try again.')}};
  document.body.append(ov);PATH_OV=ov;document.body.style.overflow='hidden';document.addEventListener('keydown',onKey);
  build();requestAnimationFrame(()=>ov.classList.add('on'))}
