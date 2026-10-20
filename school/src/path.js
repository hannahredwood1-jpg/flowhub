/* ============================================================
   LEARNING PATH: every student says where they are. Anything they say they can already do is proved with a one-attempt "proof exam"
   (no lesson). Everything else is learned the normal way. INVERTIX (and the certificate) needs every earlier module learned or proved.
   Mirrors src/lib/schoolPath.ts (a test keeps the list below in step).
============================================================ */
const NO_PROOF=['m50','m43','m44','m45','m46','m47','m16'];
let PATH=null,PATH_READY=false,PATH_STAFF=false,PATH_OV=null;
const pathOn=()=>!window.VAULT&&!window.PRACTICE;
const provableMod=m=>!NO_PROOF.includes(m.id);
/* Until a student has built their path, the school is closed. Coaches are never locked out. */
const pathGate=()=>pathOn()&&LIVE&&PATH_READY&&!PATH&&!PATH_STAFF;
const proofPending=m=>pathOn()&&!!PATH&&PATH.modes[m.id]==='prove'&&!pm(m.id).po&&!pm(m.id).p;
function pathAfterPull(j){
  if(!pathOn())return;PATH=j.path||null;PATH_STAFF=!!j.staff;PATH_READY=true;
  const pr=j.proofs||{};
  Object.entries(pr).forEach(([id,r])=>{const p=pm(id);p.po=1;if(r.pass){p.t=1;if(!p.p){p.p=1;p.sc=r.sc|0;p.at=r.at|0}}});
  if(PATH&&Object.keys(pr).length)PATH.locked=true;
  persist(false)}
/* How far along "unlock INVERTIX and the certificate" is: every module before INVERTIX, learned or proved. */
function pathStats(){
  const inv=MODS.findIndex(m=>m.id==='m43'),req=MODS.slice(0,inv<0?MODS.length:inv),done=req.filter(m=>pm(m.id).p),tested=done.filter(m=>pm(m.id).t).length;
  return{need:req.length,done:done.length,tested,completed:done.length-tested,prove:req.filter(proofPending).length,learn:req.length-done.length-req.filter(proofPending).length}}
function pathCard(){
  if(!pathOn()||!PATH_READY)return'';
  if(!PATH)return PATH_STAFF?`<div class="card pace-card"><div class="hud">Your path</div><p class="muted" style="font-size:13.5px;margin:6px 0 10px">Students build a path before they start. You can build one too.</p><button class="btn sm" data-path-open>Build a path</button></div>`:'';
  const s=pathStats(),pct=s.need?Math.round(s.done/s.need*100):100;
  return`<div class="card pace-card"><div class="hud" style="display:flex;justify-content:space-between">Your path <span class="chip ${PATH.locked?'':'live'}">${PATH.locked?'Locked':'Open to edit'}</span></div>
  <div class="h" style="font-size:17px;margin:6px 0 8px">To unlock INVERTIX</div><div class="pbar"><i style="width:${pct}%"></i></div>
  <p class="muted" style="font-size:13.5px;margin-top:8px"><b>${s.done} of ${s.need}</b> done · ${s.tested} tested out · ${s.completed} completed${s.prove?` · ${s.prove} to prove`:''}${s.learn?` · ${s.learn} to learn`:''}</p>
  <p class="muted" style="font-size:12.5px;margin-top:6px">Gamma Levels, INVERTIX and the final read are always learned in full.</p>
  <button class="btn sm" data-path-open style="margin-top:10px">${PATH.locked?'View your path':'Edit your path'}</button></div>`}
document.addEventListener('click',e=>{if(e.target.closest('[data-path-open]'))openPath(PATH?(PATH.locked?'view':'edit'):'first')});
function pathMaybeFirst(){if(pathGate()&&!PATH_OV)openPath('first');return pathGate()}

const PATH_START=[
 {id:'new',n:"I'm brand new",d:"I'll learn everything from the start.",prove:[]},
 {id:'traded',n:"I've traded before",d:'I know the basics, my platform and the habits. I will prove it.',prove:[0,1,2]},
 {id:'experienced',n:"I'm experienced",d:'I already trade with a method and manage risk. I will prove it.',prove:[0,1,2,3,4,5,6]}];
function openPath(mode){
  if(PATH_OV)return;const first=mode==='first',view=mode==='view';
  const rem=MODS.filter(m=>provableMod(m)&&!pm(m.id).p&&!pm(m.id).po);
  const phases=[...new Set(rem.map(m=>m.ph))].sort((a,b)=>a-b);
  const modes={};rem.forEach(m=>{modes[m.id]=PATH&&PATH.modes[m.id]==='prove'?'prove':'learn'});
  const ans={start:(PATH&&PATH.answers&&PATH.answers.start)||'',prop:(PATH&&PATH.answers&&PATH.answers.prop)||''};
  const ov=document.createElement('div');ov.className='pace-ov pb-ov';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.setAttribute('aria-label','Build your learning path');
  const fullN=MODS.filter(m=>NO_PROOF.includes(m.id)).length;
  const build=()=>{
    const nP=rem.filter(m=>modes[m.id]==='prove').length,nL=rem.length-nP;
    ov.innerHTML=`<div class="pace-in pb-in">
    <div class="pace-hero"><div class="hud pace-k">${first?'Welcome to the Trading School':view?'Your path':'Edit your path'}</div>
      <h2 class="h pace-h" style="opacity:1;transform:none">${view?'Your learning path':'Where are you starting?'}</h2>
      <p class="pace-p" style="opacity:1;transform:none">${view?'You started proof exams, so your path is locked. If something needs to change, ask a coach.':`Tell us where you are. Anything you say you can already do, you will show with a short <b>proof exam</b>: one attempt, no lesson. Everything else you learn the normal way. Either way the finish line is the same: every module before INVERTIX learned or proved.`}</p></div>
    ${view?'':`<div class="pb-start">${PATH_START.map(o=>`<button type="button" class="pb-card ${ans.start===o.id?'sel':''}" data-start="${o.id}"><b>${o.n}</b><span>${o.d}</span></button>`).join('')}</div>
    <div class="pb-prop"><span>Have you used a prop firm account before?</span><div class="seg" role="group" aria-label="Prop firm experience"><button type="button" class="${ans.prop==='no'?'on':''}" data-prop="no">No</button><button type="button" class="${ans.prop==='yes'?'on':''}" data-prop="yes">Yes</button></div></div>`}
    <h3 class="h" style="font-size:18px;margin:22px 0 10px">${view?'What you chose':'Your path, phase by phase'}</h3>
    <div class="pb-rows">${phases.length?phases.map(ph=>{const ms=rem.filter(m=>m.ph===ph),allP=ms.every(m=>modes[m.id]==='prove'),allL=ms.every(m=>modes[m.id]==='learn');
      return`<div class="pb-row"><div class="pb-rh"><div><b>${PH[ph].n}</b><small>${ms.length} module${ms.length>1?'s':''}${!allP&&!allL?' · mixed':''}</small></div>
        ${view?`<span class="chip ${allP?'live':''}">${allP?'Prove it':allL?'Learn it':'Mixed'}</span>`:`<div class="seg" role="group" aria-label="${esc(PH[ph].n)}"><button type="button" class="${allL?'on':''}" data-pset="${ph}:learn">Teach me</button><button type="button" class="${allP?'on':''}" data-pset="${ph}:prove">I can prove it</button></div>`}</div>
        <details class="pb-mods" ${view?'open':''}><summary>${view?'Modules':'Choose module by module'}</summary>${ms.map(m=>`<label class="pb-m"><input type="checkbox" data-m="${m.id}" ${modes[m.id]==='prove'?'checked':''} ${view?'disabled':''}><span>${m.n}. ${esc(m.t)}</span><em>${modes[m.id]==='prove'?'Prove it':'Learn it'}</em></label>`).join('')}</details></div>`}).join(''):'<p class="muted">Everything you can test out of is already done.</p>'}
      <div class="pb-row pb-full"><div class="pb-rh"><div><b>Always learned in full</b><small>${fullN} modules · no proof exam</small></div><span class="chip">Learn it</span></div><p class="muted" style="font-size:13.5px;margin-top:6px">Understanding GEX Levels, the five INVERTIX modules and Putting It All Together are never tested out.</p></div></div>
    <div class="card pb-sum"><div class="hud">Your path</div><p style="margin:4px 0 10px"><b>${nP}</b> to prove · <b>${nL}</b> to learn · <b>${fullN}</b> always in full</p>
      <ul class="pb-rules"><li>A proof exam is <b>one attempt</b>. Pass it and that module counts as complete.</li><li>If it does not go your way, no problem: you learn that module with the full lesson. There is no restart and no penalty.</li><li>To unlock INVERTIX and your certificate, every module before it has to be learned or proved.</li><li>${view?'Your path is locked.':'You can change your path until your first proof exam. After that a coach can reset it.'}</li></ul>
      ${view?'':`<label class="pace-mail" style="margin:12px 0 0"><input type="checkbox" id="pbOk"> I understand how proof exams work</label>`}
      <div class="pace-act">${view?'<button class="btn primary" id="pbClose">Close</button>':`<button class="btn primary" id="pbGo" disabled>${first?'Lock in my path →':'Save my path'}</button>${first?'<a class="btn ghost" href="/">← FLOWHUB home</a>':'<button class="btn ghost" id="pbClose">Cancel</button>'}`}</div></div></div>`;
    bind()};
  const keepOk=()=>{const o=$('#pbOk');return o&&o.checked};
  const bind=()=>{
    $$('[data-start]',ov).forEach(b=>b.onclick=()=>{const o=PATH_START.find(x=>x.id===b.dataset.start);ans.start=o.id;rem.forEach(m=>{modes[m.id]=o.prove.includes(m.ph)?'prove':'learn'});redraw()});
    $$('[data-prop]',ov).forEach(b=>b.onclick=()=>{ans.prop=b.dataset.prop;redraw()});
    $$('[data-pset]',ov).forEach(b=>b.onclick=()=>{const [ph,v]=b.dataset.pset.split(':');rem.filter(m=>m.ph===+ph).forEach(m=>{modes[m.id]=v});redraw()});
    $$('[data-m]',ov).forEach(b=>b.onchange=()=>{modes[b.dataset.m]=b.checked?'prove':'learn';redraw()});
    const ok=$('#pbOk'),go=$('#pbGo');if(ok&&go){ok.onchange=()=>{go.disabled=!ok.checked};go.disabled=!ok.checked}
    const cl=$('#pbClose');if(cl)cl.onclick=close;
    if(go)go.onclick=save};
  const redraw=()=>{const checked=keepOk(),open=$$('.pb-mods',ov).map(d=>d.open),top=ov.scrollTop;build();$$('.pb-mods',ov).forEach((d,i)=>{d.open=open[i]});const o=$('#pbOk');if(o&&checked){o.checked=true;$('#pbGo').disabled=false}ov.scrollTop=top};
  const close=()=>{ov.classList.remove('on');document.body.style.overflow='';document.removeEventListener('keydown',onKey);setTimeout(()=>{ov.remove();PATH_OV=null},300)};
  const onKey=e=>{if(e.key==='Escape'&&!first)close()};
  const save=async()=>{const go=$('#pbGo');go.disabled=true;
    try{const r=await fetch('/api/school/path',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({modes,answers:{start:ans.start,prop:ans.prop}})});
      if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error(j.error||'')}
      const j=await r.json();PATH=j.path;close();render();toast(first?'Your path is set. Your school is open.':'Path saved.')}
    catch(e){go.disabled=false;toast(e.message||'Could not save your path. Try again.')}};
  document.body.append(ov);PATH_OV=ov;document.body.style.overflow='hidden';document.addEventListener('keydown',onKey);
  build();requestAnimationFrame(()=>ov.classList.add('on'))}
