/* ============================================================
   progress: saved in this browser and synced to your FLOWHUB account
============================================================ */
const LS='fh-school-v2',LSX='fh-school-v2-txt';
let PROG={m:{}},TXT={},UNLOCKS=[],LIVE=false,WHO='';
const BLANK=()=>({s:[0,0,0,0],p:0,sc:0,a:1,n:0,at:0});
const pm=id=>PROG.m[id]||(PROG.m[id]=BLANK());
try{const j=JSON.parse(localStorage.getItem(LS)||'null');if(j&&j.m)PROG=j}catch(e){}
try{TXT=JSON.parse(localStorage.getItem(LSX)||'{}')||{}}catch(e){TXT={}}
const compact=()=>({m:Object.fromEntries(Object.entries(PROG.m).map(([k,v])=>[k,{s:v.s.join(''),p:v.p?1:0,sc:v.sc|0,a:v.a|0,n:v.n|0,at:v.at|0}]))});
function mergeServer(v2){
  if(!v2||!v2.m)return;
  for(const [id,s] of Object.entries(v2.m)){const l=pm(id),bits=String(s.s||'0000').split('').map(Number),a=s.a|0||1;
    if(a>l.a){l.a=a;l.s=bits;l.n=Math.max(l.n,s.n|0)}else if(a===l.a){l.s=l.s.map((x,i)=>x||bits[i]||0);l.n=Math.max(l.n,s.n|0)}
    if(s.p&&!l.p){l.p=1;l.sc=s.sc|0;l.at=s.at|0}else if(s.p&&l.p){l.sc=Math.max(l.sc,s.sc|0)}}
  persist(false)}
function persist(sync=true){try{localStorage.setItem(LS,JSON.stringify(PROG))}catch(e){}if(sync)syncSoon()}
function saveTxt(){try{localStorage.setItem(LSX,JSON.stringify(TXT))}catch(e){}}
let syncT=null;
const syncSoon=()=>{clearTimeout(syncT);syncT=setTimeout(push,900)};
async function push(){if(!LIVE)return;try{await fetch('/api/school',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({v2:compact()})})}catch(e){}}
async function pull(){try{const r=await fetch('/api/school',{headers:{Accept:'application/json'}});if(!r.ok)return;const j=await r.json();LIVE=true;WHO=j.name||'';UNLOCKS=j.unlocks||[];mergeServer(j.state&&j.state.v2);const w=$('#who');if(w)w.textContent=WHO;if(PENDING){const h=PENDING;PENDING=null;location.hash=h}else render()}catch(e){}}
async function logAttempt(id,score,total,pass){if(!LIVE)return;try{await fetch('/api/school/attempt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'ex',ref:id,score,total,pass})})}catch(e){}}

/* ---------- module helpers ---------- */
const modIdx=id=>MODS.findIndex(m=>m.id===id);
const modUnlocked=i=>i===0||pm(MODS[i-1].id).p||UNLOCKS.includes(MODS[i].id)||UNLOCKS.includes('all');
const modStatus=i=>pm(MODS[i].id).p?'done':modUnlocked(i)?'active':'locked';
const stepsDone=m=>pm(m.id).s.filter(Boolean).length;
const currentIdx=()=>{const i=MODS.findIndex((m,k)=>!pm(m.id).p&&modUnlocked(k));return i<0?MODS.length-1:i};
const STEPS=['Learn','See it','Mark it','Explain','Exam'],STEP_KEYS=['learn','see','mark','explain','ready'];
const PASS=.8;
const passNeeded=n=>Math.ceil(n*PASS-1e-9);

/* ---------- router (hash) ---------- */
let VIEW='map',CUR=null,PENDING=null;
function route(){
  const h=location.hash.replace(/^#\/?/,'').split('/').filter(Boolean);
  if(!h.length){VIEW='map';CUR=null}
  else{const i=modIdx(h[0]);if(i<0||!modUnlocked(i)){VIEW='map';CUR=null;if(h[0]){if(i>=0&&!LIVE)PENDING=location.hash;history.replaceState(null,'','#/')}}
    else{CUR=MODS[i];if(h[1]==='exam')VIEW='exam';else{VIEW='lab';const k=STEP_KEYS.indexOf(h[1]);LAB=newLab(CUR,k>=0?k:firstOpenStep(CUR))}}}
  render();
}
const nav=p=>{location.hash=p};
function render(){
  $$('main.view').forEach(m=>m.hidden=m.id!=='v-'+VIEW);window.scrollTo(0,0);
  if(VIEW!=='exam')stopExam();
  if(VIEW==='map')renderMap();else if(VIEW==='lab')renderLab();else renderExam();
}
window.addEventListener('hashchange',route);

/* ============================================================
   COURSE MAP
============================================================ */
let OPEN=null;
function renderMap(){
  const done=MODS.filter(m=>pm(m.id).p),scs=done.map(m=>pm(m.id).sc),avg=scs.length?Math.round(scs.reduce((a,b)=>a+b,0)/scs.length):0,cur=MODS[currentIdx()];
  const finished=done.length===MODS.length;
  $('#stats').innerHTML=`<div class="card stat"><b>${done.length}<span class="dim">/${MODS.length}</span></b><span>modules passed</span></div><div class="card stat"><b>${done.length?avg+'%':'–'}</b><span>average exam score</span></div>`;
  if(OPEN==null)OPEN=cur.id;
  let html='',ph=-1;
  MODS.forEach((m,i)=>{
    if(m.ph!==ph){if(ph>=0)html+='</div></section>';ph=m.ph;const P=PH[ph];html+=`<section class="phase"><div class="phase-h"><span class="pn">PHASE ${ph+1}</span><h2 class="h">${P.n}</h2><p>${P.d}</p></div><div class="mods">`}
    html+=modRow(m,i)});
  html+='</div></section>';
  $('#phases').innerHTML=(pm('m30').p?gradCard():'')+(finished?`<div class="finish"><h2 class="h" style="font-size:22px;margin-bottom:6px">Course complete.</h2><p class="muted">You passed every module exam. The next step is a demo account: apply the full model, journal every trade, and let your own numbers show whether the strategy and your risk plan hold up before any real or funded capital.</p></div>`:'')+html;
  $('#aside').innerHTML=`<div class="card next-card"><div class="hud">${finished?'All modules passed':'Up next'}</div><div class="h">${cur.n}. ${cur.t}</div>
    <p class="muted" style="font-size:14px">${finished?'You can review any lesson.':`Step <b>${Math.min(stepsDone(cur)+1,5)}</b> of 5: ${STEPS[Math.min(stepsDone(cur),4)]}`}</p>
    <div class="pbar" style="margin:10px 0 14px"><i style="width:${finished?100:stepsDone(cur)/5*100}%"></i></div>
    <a class="btn primary" href="#/${cur.id}">${finished?'Review lessons':stepsDone(cur)?'Continue':'Start'} →</a></div>
  <div class="card"><h3 class="h">What a pass means</h3><ul><li>Every lesson step completed, including a chart task you did yourself</li><li>Your own written explanation submitted</li><li>An exam of ${PASS*100}% or better on a set you've never seen</li><li>Phase checks later pull questions from earlier modules</li></ul></div>
  <div class="card"><h3 class="h">Practice, not real money</h3><p class="muted" style="font-size:13.5px">Nothing in the school uses real money. Before real or funded capital, the strategy gets proven on a demo account, in your journal, with your own numbers.</p></div>`;
}
function modRow(m,i){
  const st=modStatus(i),P=PH[m.ph],open=OPEN===m.id,p=pm(m.id);let chip;
  if(st==='done')chip=`<span class="chip ok">✓ Passed · ${p.sc}%</span>`;
  else if(st==='active')chip=`<span class="chip live">${p.a>1&&!stepsDone(m)?'Restarted · ':''}${stepsDone(m)}/4 steps</span>`;
  else chip=`<span class="chip"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>Locked</span>`;
  const prev=MODS[i-1]?MODS[i-1].t:'';let act;
  if(st==='locked')act=`<div class="pcheck">Unlocks when you pass the Module ${i} exam (${esc(prev)}).</div>`;
  else act=`<a class="btn primary" href="#/${m.id}">${st==='done'?'Review lesson':stepsDone(m)?'Continue lesson':'Start lesson'} →</a>${p.a>1&&st!=='done'?`<span class="chip bad">Attempt ${p.a}: new exam set</span>`:''}`;
  const hist=p.n?`<div style="grid-column:1/-1"><span class="hud">Exam attempts: ${p.n}</span></div>`:'';
  return `<article class="mod ${st}" data-id="${m.id}"><button class="mod-h" data-tog="${m.id}" aria-expanded="${open}">
    <span class="num">${String(m.n).padStart(2,'0')}</span><span class="mod-t"><b>${m.t}</b><small>${m.out}</small></span>
    <span class="mod-m">${m.flag?`<span class="chip">${m.flag}</span>`:''}${chip}</span></button>
    <div class="mod-b" ${open?'':'hidden'}>
      <div><h4 class="hud">What you'll learn</h4><ul>${m.ls.map(x=>`<li>${x}</li>`).join('')}</ul></div>
      <div><h4 class="hud">Practice on your own chart</h4><p>${m.task}</p><h4 class="hud" style="margin-top:14px">Then prove it</h4><p>A written explanation, then an exam with fresh charts and numbers each attempt. ${PASS*100}% to pass.</p></div>
      ${hist}<div class="act">${act}</div></div></article>`;
}
$('#v-map').addEventListener('click',e=>{const b=e.target.closest('[data-tog]');if(!b)return;OPEN=OPEN===b.dataset.tog?null:b.dataset.tog;renderMap()});

/* ============================================================
   LESSON WORKSPACE
============================================================ */
let LAB=null,CH=null,CH2=null,TB=null;
const firstOpenStep=m=>{const s=pm(m.id).s,i=s.findIndex(x=>!x);return i<0?4:i};
function newLab(m,step){const t=TXT[m.id]||{};return{m,step,see:0,recall:null,dn:0,dd:0,drill:null,t:t.t||['',''],sub:!!t.sub,ticks:t.ticks||{},tf:1,sc:null}}
const storeTxt=()=>{TXT[LAB.m.id]={t:LAB.t,sub:LAB.sub,ticks:LAB.ticks};saveTxt()};
function ensureCharts(){
  if(CH)return;
  CH=new Chart($('#chartHost'));CH2=new Chart($('#chartHost2'));TB=toolbar(CH,['cursor','tap','rect','hline','erase']);$('#tvLeft').append(TB);
  CH.onmarks=()=>{};
  $$('[data-tf]').forEach(b=>b.addEventListener('click',()=>{if(LAB&&LAB.step===2)return toast('The time frame is locked during a chart task.');LAB.tf=+b.dataset.tf;paintChart(true)}));
  $('#candleBtn').onclick=()=>{CH.neutral=!CH.neutral;CH2.neutral=CH.neutral;$('#candleBtn').textContent='Candles: '+(CH.neutral?'neutral':'green / red');CH.draw();CH2.draw()};
}
function scenarioOf(m){if(!m._sc)m._sc=m.chart?m.ex():null;return m._sc}
function renderLab(){
  const m=LAB.m;ensureCharts();
  $('#v-lab').classList.toggle('nochart',!m.chart);
  $('#crumb').innerHTML=`<a href="#/" class="btn ghost sm">← Course map</a><span>Module ${m.n} of ${MODS.length}</span><b>${m.t}</b>`;
  renderLesson();if(m.chart)setTimeout(()=>{CH.size();CH2.size();paintChart(true)},20);
}
function paintChart(refit){
  const L=LAB,m=L.m;if(!m.chart)return;const sc=scenarioOf(m);let it=null;
  const mark=L.step===2&&L.drill&&chartsOf(L.drill.item).length;
  const ss=L.step===1&&m.see?seeSteps(m,sc):null,stp=ss?ss[L.see]:null,use=stp&&stp.sc?stp.sc:sc;
  const two=mark?chartsOf(L.drill.item).length>1:(chartsOf(use).length>1);
  $('#chartHost2').hidden=!two;
  $('.chartcol').classList.toggle('dual',two);
  const tfOK=!mark&&!use.noTf&&!use.labels&&(use.step||5)===5&&!two&&!use.charts;
  $$('[data-tf]').forEach(b=>{b.hidden=!tfOK;b.classList.toggle('on',+b.dataset.tf===(tfOK?L.tf:1))});
  const k=tfOK?L.tf:1;
  if(mark){it=L.drill.item;const cs=chartsOf(it);
    loadChart(CH,it,0);if(cs.length>1)loadChart(CH2,it,1);
    const kind=K[it.kind];CH.marks=[];CH.taps=new Set();
    if(kind.attach)kind.attach(CH,it,L.drill.st,()=>{const b=$('[data-check]');if(b)b.disabled=!itemHasAnswer(it,L.drill.st)});
    if(kind.tool)TB.set(kind.tool);else TB.set('cursor');
    $('#chartHint').textContent=kind.chart?'Use the tool selected on the left to answer. Scroll to zoom, drag with the cursor tool to pan.':'Read the chart, then answer in the panel.';
    CH.fit();if(cs.length>1)CH2.fit();
    if(L.drill.revealed&&kind.reveal)kind.reveal(CH,it);
  } else {
    const cs=chartsOf(use);const ld=(c,j)=>{const ch=j?CH2:CH;ch.setData(c.C,{k,t0:c.t0??use.t0,stepMin:c.step??use.step,labels:c.labels??use.labels,sym:c.sym,tf:c.tf??use.tf,fit:refit!==false});ch.marks=[];ch.taps=new Set();ch.ov=[]};
    cs.forEach(ld);
    if(stp){CH.ov=stp.ov||[];if(two)CH2.ov=stp.ov2||[];if(stp.focus!=null&&k===1)CH.focus(stp.focus)}
    else if(L.step>=3&&m.sum){const o=m.sum(sc);CH.ov=o.ov||[];if(two)CH2.ov=o.ov2||[]}
    TB.set('cursor');$('#chartHint').textContent='Drag to pan · scroll to zoom · double-click to reset';
  }
  $('#chartTf').textContent=(CH.tfName?(CH.tfName==='D'?'Daily':CH.tfName==='60'?'1-hour':CH.tfName+'-minute')+' candles':CH.labelFn?'Daily candles':(CH.stepMin*CH.k>=60?(CH.stepMin*CH.k/60)+'-hour candles':`${CH.stepMin*CH.k}m candles`));
  CH.draw();CH2.draw();
}
const seeSteps=(m,sc)=>{if(!m._see)m._see=m.see(sc).map(s=>({...s,cap:refx(s.cap),html:refx(s.html)}));return m._see};

function stepper(){const m=LAB.m,s=pm(m.id).s;return `<div class="steps">${STEPS.map((x,i)=>`<button type="button" data-step="${i}" class="${LAB.step===i?'on':''} ${i<4&&s[i]?'done':''}"><i></i>${x}</button>`).join('')}</div>`}
function renderLesson(){
  const L=LAB,m=L.m,p=pm(m.id);let body='',foot='';
  const learnDone=p.s[0];
  if(L.step===0){
    const rc=m.recall;
    body=(rc?`<div class="callout key"><span class="hud">Recall · ${rc.from}</span><p><b>${rc.q}</b></p><div class="opts" id="rc">${rc.order.map(k=>`<button class="opt ${L.recall==null?'':k===0?'right':k===L.recall?'wrong':''}" data-rc="${k}" ${L.recall!=null?'disabled':''}>${rc.o[k]}</button>`).join('')}</div>
      ${L.recall==null?'':`<div class="fb ${L.recall===0?'ok':'no'}"><b>${L.recall===0?'Right.':'Not quite.'}</b><p>${rc.why}</p></div>`}</div>`:'')+m.learn.map(s=>`<h3>${s.t}</h3>${s.h}`).join('');
    const need=rc&&L.recall==null&&!learnDone;
    foot=`<span class="dim" style="font-size:13px">${need?'Answer the recall question first.':m.chart?'Next: see it worked on a chart.':'Next: see a worked example.'}</span><button class="btn primary" data-next ${need?'disabled':''}>${m.chart?'Show me on the chart':'See a worked example'} →</button>`;
  }
  if(L.step===1){
    const sc=scenarioOf(m),ss=seeSteps(m,sc),s=ss[L.see];
    body=`<h3>Worked example · step ${L.see+1} of ${ss.length}</h3><div class="cap">${s.cap}</div>${s.html||''}
    <div class="kv">${ss.map((_,i)=>`<span class="chip ${i===L.see?'live':i<L.see?'ok':''}">${i+1}</span>`).join('')}</div>
    ${m.chart?'<p class="muted" style="font-size:13.5px">Hover the chart to read each candle in the legend. Pan and zoom to look closer.</p>':''}`;
    foot=`<button class="btn" data-seep ${L.see===0?'disabled':''}>← Back</button><button class="btn primary" data-seen>${L.see===ss.length-1?'Now you try →':'Next ▸'}</button>`;
  }
  if(L.step===2){
    if(!L.drill&&L.dd<3)newDrill();
    body=`<div id="markBody"></div>`;
    foot=`<button class="btn" data-prev>← Back</button><button class="btn primary" data-next ${p.s[2]?'':'disabled'}>Explain it →</button>`;
  }
  if(L.step===3){
    const ex=m.explain,ok=L.t.every(t=>words(t)>=20),need=Math.ceil(ex.ideas.length*.75),tk=Object.values(L.ticks).filter(Boolean).length;
    body=`<h3>Say it in your own words</h3><p>Write what you'd tell someone who has never seen a chart. No copied definitions. At least 20 words each.</p>
    ${ex.prompts.map((q,i)=>`<p><b>${i+1}. ${q}</b></p><textarea id="t${i}" rows="4" placeholder="…" ${L.sub?'disabled':''}>${esc(L.t[i]||'')}</textarea><div class="wc" data-wc="${i}">${words(L.t[i]||'')} words</div>`).join('')}
    ${L.sub?`<div class="callout key"><span class="hud">Check yourself</span><p>Tick the ideas your answers <b>actually contained</b>. Be honest, this is for you. Fewer than ${need} ticks means a re-read of <b>Learn</b> before the exam.</p>
      ${ex.ideas.map((t,k)=>`<label class="chk"><input type="checkbox" data-tick="${k}" ${L.ticks[k]?'checked':''}><span>${t}</span></label>`).join('')}
      <p class="num" style="font-size:12px">${tk} / ${ex.ideas.length} ticked (${need} needed)</p></div>`:`<button class="btn primary" data-sub ${ok?'':'disabled'}>Submit my explanation</button>`}
    <div class="callout def"><span class="hud">Then, on your own chart</span><p>${m.task}</p></div>`;
    foot=`<button class="btn" data-prev>← Back</button><button class="btn primary" data-next ${p.s[3]?'':'disabled'}>Exam checklist →</button>`;
  }
  if(L.step===4){
    const items=[['Learn: lesson read',p.s[0]],['See it: worked example complete',p.s[1]],['Mark it: chart tasks done correctly',p.s[2]],['Explain it: written answers submitted and self-checked',p.s[3]]],all=items.every(x=>x[1]),n=examSize(m);
    body=`<h3>Ready for the exam?</h3><ul class="req">${items.map(([t,o])=>`<li class="${o?'ok':''}"><span class="tick">${o?'✓':''}</span>${t}</li>`).join('')}</ul>
    <div class="callout key"><span class="hud">Exam format</span><p><b>${n} questions</b> · <b>${PASS*100}% to pass</b> (${passNeeded(n)} of ${n})</p><p>${m.examDesc||'A mix of concept questions and chart tasks, with fresh charts and numbers every attempt.'}</p></div>
    <p class="muted">There are no hints and no feedback until you submit. If you don't pass, <b>this module restarts</b>: the lessons re-open and the exam changes.</p>
    ${p.a>1?`<div class="fb no"><b>Attempt ${p.a}.</b> The practice tasks and the exam are a fresh set.</div>`:''}
    ${p.p?`<div class="fb ok"><b>Passed · ${p.sc}%.</b> You can review the lessons any time.</div>`:''}`;
    foot=`<button class="btn" data-prev>← Back</button><button class="btn primary" data-exam ${all&&!p.p?'':'disabled'}>Start exam →</button>`;
  }
  $('#lesson').innerHTML=`<div class="les-h"><div class="hud">Module ${m.n} · Phase ${m.ph+1} · ${PH[m.ph].n}</div><div class="h">${m.t}</div>${stepper()}</div><div class="les-b">${body}</div><div class="les-f">${foot}</div>`;
  if(L.step===2)updateMarkPanel();
}
function newDrill(){
  const m=LAB.m,f=m.drills[LAB.dn++%m.drills.length],r=mulberry(Math.floor(Math.random()*1e9));
  LAB.drill={item:fin(f(r),r),st:{},fb:null,checked:false,revealed:false};
}
function updateMarkPanel(){
  const L=LAB,box=$('#markBody');if(!box)return;
  if(!L.drill){box.innerHTML=`<h3>Chart tasks</h3><div class="fb ok"><b>Done.</b> You got three tasks right on the first try. Keep practising if you like, or continue to Explain.</div><button class="btn" data-more>Try another task</button>`;return}
  const d=L.drill,it=d.item,kd=K[it.kind],g=d.fb;
  box.innerHTML=`<div class="kv" style="margin-top:0">${[0,1,2].map(i=>`<span class="chip ${i<L.dd?'ok':i===L.dd?'live':''}">${i<L.dd?'✓':i+1}</span>`).join('')}<span class="chip">${esc(it.topic||'Task')}</span></div>
    <p style="color:var(--ink);margin-top:10px"><b>${it.q}</b></p>${it.table&&it.kind!=='num'?`<table class="dw">${it.table}</table>`:''}${kd.html(it,d.st,{res:d.checked})}
    ${g?`<div class="fb ${g.ok?'ok':'no'}"><b>${g.ok?'Right.':'Not quite.'}</b>${kd.fb?kd.fb(it,d.st,g):''}<p>${it.why}</p></div>`:''}
    <div class="row">${g?(g.ok?`<button class="btn primary" data-nextdrill>${L.dd>=3?'Finish':'Next task'} →</button>`:`${kd.reveal&&!d.revealed?'<button class="btn" data-reveal>Show me</button>':''}<button class="btn primary" data-skip>Try a new task</button>`)
        :`<button class="btn primary" data-check ${itemHasAnswer(it,d.st)?'':'disabled'}>Check my answer</button><button class="btn ghost" data-skip>Skip</button>`}</div>
    ${g&&!g.ok?'<p class="dim" style="font-size:13px">A task counts when it is right on the first check, so read the feedback, then try a new one.</p>':''}`;
  if(!d.checked&&kd.bind)kd.bind(box,it,d.st,()=>{const b=$('[data-check]',box);if(b)b.disabled=!itemHasAnswer(it,d.st)},CH,()=>updateMarkPanel());
}
const renderStepsOnly=()=>{const s=$('.steps');if(s)s.outerHTML=stepper()};
function complete(i,msg){const p=pm(LAB.m.id);if(!p.s[i]){p.s[i]=1;persist();toast(msg)}renderStepsOnly()}
function go(step){LAB.step=step;if(step===2&&!LAB.drill&&LAB.dd<3)newDrill();renderLesson();paintChart(true);history.replaceState(null,'',`#/${LAB.m.id}/${STEP_KEYS[step]}`);$('.les-b').scrollTop=0}
$('#lesson').addEventListener('click',e=>{
  const L=LAB,t=e.target;let b;if(!L)return;const m=L.m,p=pm(m.id);
  if((b=t.closest('[data-step]')))return go(+b.dataset.step);
  if((b=t.closest('[data-rc]'))){L.recall=+b.dataset.rc;return renderLesson()}
  if(t.closest('[data-next]')){if(L.step===0)complete(0,'Lesson read');if(L.step===3&&!p.s[3])return;return go(L.step+1)}
  if(t.closest('[data-prev]'))return go(L.step-1);
  if(t.closest('[data-seep]')){L.see--;renderLesson();return paintChart(false)}
  if(t.closest('[data-seen]')){const n=seeSteps(m,scenarioOf(m)).length;if(L.see<n-1){L.see++;renderLesson();return paintChart(false)}complete(1,'Worked example complete');return go(2)}
  if(t.closest('[data-check]')){const d=L.drill;if(d.checked)return;d.checked=true;d.fb=gradeItem(d.item,d.st);
    if(d.fb.ok){L.dd++;if(L.dd>=3&&!p.s[2]){p.s[2]=1;persist();toast('Chart tasks complete');renderStepsOnly();const nb=$('.les-f [data-next]');if(nb)nb.disabled=false}if(K[d.item.kind].reveal&&CH)K[d.item.kind].reveal(CH,d.item)}
    return updateMarkPanel()}
  if(t.closest('[data-reveal]')){const d=L.drill;d.revealed=true;K[d.item.kind].reveal(CH,d.item);return updateMarkPanel()}
  if(t.closest('[data-nextdrill]')){if(L.dd>=3){L.drill=null;return updateMarkPanel()}newDrill();paintChart(true);return updateMarkPanel()}
  if(t.closest('[data-skip]')){newDrill();paintChart(true);return updateMarkPanel()}
  if(t.closest('[data-more]')){newDrill();paintChart(true);return updateMarkPanel()}
  if(t.closest('[data-sub]')){L.sub=true;storeTxt();return renderLesson()}
  if((b=t.closest('[data-tick]'))){L.ticks[b.dataset.tick]=b.checked;storeTxt();const need=Math.ceil(m.explain.ideas.length*.75);if(Object.values(L.ticks).filter(Boolean).length>=need){complete(3,'Explanation complete')}else{p.s[3]=0;persist()}return renderLesson()}
  if(t.closest('[data-exam]'))return nav(`/${m.id}/exam`);
  if(t.closest('[data-plan-check]'))return planCheck();
});
$('#lesson').addEventListener('input',e=>{const L=LAB;if(!L)return;const id=e.target.id;if(id==='t0'||id==='t1'){const i=+id[1];L.t[i]=e.target.value;storeTxt();$$('[data-wc]').forEach(w=>w.textContent=words(L.t[+w.dataset.wc]||'')+' words');const sb=$('[data-sub]');if(sb)sb.disabled=!L.t.every(t=>words(t)>=20)}});

/* ============================================================
   EXAM
============================================================ */
let X=null,xcharts=[];
function stopExam(){xcharts.forEach(c=>c.destroy());xcharts=[]}
const examSize=m=>m.exam.bank+m.exam.gen.reduce((a,[,n])=>a+n,0);
function buildExam(m,seed){
  const r=mulberry(seed),items=[];
  const bank=shuf(m.bank,r).slice(0,m.exam.bank).map(b=>typeof b==='function'?b(r):{...b});
  bank.forEach(b=>items.push(fin(b.kind?b:{kind:'mcq',...b},r)));
  m.exam.gen.forEach(([fi,n])=>{for(let k=0;k<n;k++){const rr=mulberry(Math.floor(r()*1e9));items.push(fin(m.drills[fi](rr),rr))}});
  return shuf(items,r);
}
function renderExam(keep){
  stopExam();
  const m=CUR;if(!m)return;
  if(X&&X.m!==m)X=null;
  if(!X)return examIntro();
  if(X.done)return examResult();
  showQ(X.i);
}
function examIntro(){
  const m=CUR,p=pm(m.id),n=examSize(m),ready=p.s.every(Boolean);
  $('#exBody').innerHTML=`<div class="ex-intro"><div>
    <div class="hud" style="margin-bottom:8px">Module ${m.n} · ${m.t} · Attempt ${p.a}</div>
    <h1 class="h">Module exam</h1>
    <p class="muted" style="margin:12px 0 18px;max-width:56ch">This tests whether you can do it, not whether you remember it. ${m.examDesc||'Concept questions and chart tasks, with fresh charts and numbers every attempt.'}</p>
    ${p.a>1?`<div class="fb no" style="max-width:56ch"><b>New set.</b> After your last attempt this module restarted. These questions, charts and numbers are different from the ones you saw.</div>`:''}
    <button class="btn primary" id="startEx" ${ready&&!p.p?'':'disabled'}>Begin exam →</button>
    ${p.p?'<p class="dim" style="margin-top:10px;font-size:13.5px">You already passed this module.</p>':ready?'':`<p class="dim" style="margin-top:10px;font-size:13.5px">Finish all four lesson steps first (${stepsDone(m)}/4 done). <a href="#/${m.id}" style="color:var(--ice)">Back to the lesson</a></p>`}
  </div><div class="card"><div class="hud" style="margin-bottom:6px">Before you start</div><ol class="rules">
    <li><span><b>${n} questions.</b></span></li>
    <li><span><b>${PASS*100}% to pass</b>, so ${passNeeded(n)} of ${n}.</span></li>
    <li><span><b>No hints, no feedback</b> until you submit. You can change answers and flag questions first.</span></li>
    <li><span><b>Charts and numbers are generated for you.</b> The next exam will differ from this one.</span></li>
    <li><span><b>Don't pass and the module restarts.</b> Lessons re-open and you get a different exam.</span></li>
  </ol></div></div>`;
  const b=$('#startEx');if(b)b.onclick=()=>{X={m,items:buildExam(m,Date.now()%2147483647),st:[],flag:{},i:0,done:false};X.st=X.items.map(()=>({}));showQ(0);window.scrollTo(0,0)};
}
function showQ(i){
  stopExam();X.i=i;const it=X.items[i],st=X.st[i],n=X.items.length,kd=K[it.kind],cs=chartsOf(it);
  const un=X.items.filter((_,k)=>!itemHasAnswer(X.items[k],X.st[k])).length;
  $('#exBody').innerHTML=`<div class="ex-head"><div class="hud">Module ${X.m.n} · ${X.m.t} · Attempt ${pm(X.m.id).a}</div><div class="h">Exam</div></div>
   <div class="ex-grid"><div><div class="card exq"><div class="exq-h"><span class="hud">Question ${i+1} of ${n}</span><span class="chip">${TYPE_LABEL[it.kind]}</span><button class="flag ${X.flag[i]?'on':''}" id="flagBtn">${X.flag[i]?'Flagged':'Flag for review'}</button></div>
     <p class="exq-t">${it.q}</p>
     ${cs.map((c,k)=>`<div id="qc${k}" class="tvc ${kd.chart&&cs.length===1?'tall':''}" style="${cs.length>1?'height:200px;margin-bottom:10px':''}"></div>`).join('')}
     ${kd.chart?'<div class="row" style="align-items:center;margin:12px 0 8px"><span id="tbSlot"></span></div>':''}
     ${it.table&&it.kind!=='num'?`<table class="dw">${it.table}</table>`:''}
     <div id="qui">${kd.html(it,st)}</div></div>
    <div class="ex-nav"><button class="btn" id="exPrev" ${i===0?'disabled':''}>← Previous</button><button class="btn" id="exNext" ${i===n-1?'disabled':''}>Next →</button><span style="flex:1"></span><button class="btn primary" id="exSubmit">Submit exam</button></div></div>
    <aside class="card" style="padding:16px 18px"><div class="hud">Question navigator</div><div class="nav">${X.items.map((_,k)=>`<button data-q="${k}" class="${itemHasAnswer(X.items[k],X.st[k])?'ans':''} ${k===i?'cur':''} ${X.flag[k]?'fl':''}">${k+1}</button>`).join('')}</div>
      <p class="muted" style="font-size:13px">${un?`${un} unanswered`:'All answered'} · ${Object.values(X.flag).filter(Boolean).length} flagged</p>
      <p class="dim" style="font-size:12.5px;margin-top:10px">Answers aren't marked until you submit.</p></aside></div>`;
  cs.forEach((c,k)=>{const host=$('#qc'+k),small=c.C.length<=6;
    const ch=new Chart(host,{fixed:small&&!kd.chart,view:small?[-1.5,c.C.length+3]:null});loadChart(ch,it,k);ch.neutral=true;xcharts.push(ch);
    if(small&&!ch.o.view)ch.fit();ch.draw()});
  if(kd.chart&&xcharts[0]){const ch=xcharts[0],tools=[kd.tool,'cursor','erase'];const tb=toolbar(ch,tools,'h');$('#tbSlot').append(tb);
    kd.attach(ch,it,st,()=>refreshNav());if(it.kind==='tap'){ch.taps=new Set(st.a||[])}else{ch.marks=st.a||(st.a=[])}ch.draw();}
  kd.bind&&kd.bind($('#qui'),it,st,()=>refreshNav(),xcharts[0],()=>{$('#qui').innerHTML=kd.html(it,st);kd.bind($('#qui'),it,st,()=>refreshNav(),xcharts[0],()=>{})});
}
function refreshNav(){$$('.nav button').forEach(b=>{const k=+b.dataset.q;b.classList.toggle('ans',itemHasAnswer(X.items[k],X.st[k]))})}
$('#exBody').addEventListener('click',e=>{
  if(!X||X.done)return;const t=e.target;let b;
  if((b=t.closest('[data-q]')))return showQ(+b.dataset.q);
  if(t.closest('#exPrev'))return showQ(X.i-1);if(t.closest('#exNext'))return showQ(X.i+1);
  if(t.closest('#flagBtn')){X.flag[X.i]=!X.flag[X.i];return showQ(X.i)}
  if(t.closest('#exSubmit'))return confirmSubmit();
});
function confirmSubmit(){
  const un=X.items.filter((_,k)=>!itemHasAnswer(X.items[k],X.st[k])).length,n=X.items.length;
  $('#dlgBody').innerHTML=`<h2 class="h">Submit your exam?</h2><p>${un?`<b>${un} question${un>1?'s are':' is'} unanswered</b> and will count as wrong. `:'All questions are answered. '}You can't change anything after this, and nothing is shown until you submit.</p>
   <p>Scoring under ${PASS*100}% (fewer than ${passNeeded(n)} of ${n}) restarts the module.</p><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px"><button class="btn" id="dNo">Keep working</button><button class="btn primary" id="dYes">Submit</button></div>`;
  const d=$('#dlg');d.showModal();$('#dNo').onclick=()=>d.close();$('#dYes').onclick=()=>{d.close();finishExam()};
}
function finishExam(){
  stopExam();const m=X.m,p=pm(m.id);X.done=true;
  const res=X.items.map((it,i)=>gradeItem(it,X.st[i]).ok),score=res.filter(Boolean).length,total=X.items.length,pass=score>=passNeeded(total);
  Object.assign(X,{res,score,pass});
  const topics={};X.items.forEach((it,i)=>{const t=topics[it.topic||'General']||(topics[it.topic||'General']={c:0,n:0});t.n++;if(res[i])t.c++});X.topics=topics;
  p.n++;p.at=Date.now();
  if(pass){p.p=1;p.sc=Math.round(score/total*100)}
  else{p.a++;p.s=[0,0,0,0];delete TXT[m.id];saveTxt();m._sc=null;m._see=null}
  persist();logAttempt(m.id,score,total,pass);examResult();window.scrollTo(0,0);
}
function examResult(){
  const m=X.m,{score,pass,res,topics}=X,total=X.items.length,pct=Math.round(score/total*100),miss=X.items.map((it,i)=>({it,i})).filter(o=>!res[o.i]),i=modIdx(m.id),next=MODS[i+1];
  $('#exBody').innerHTML=`
   <div class="card res-top"><div><div class="score" style="color:${pass?'var(--win)':'var(--loss)'}">${score}<small> / ${total}</small></div><div class="muted" style="margin-top:4px">${pct}% · needed ${PASS*100}%</div></div>
    <div><span class="chip ${pass?'ok':'bad'}">${pass?'Module passed':'Not yet'}</span>
    <h1 class="h" style="font-size:30px;margin:8px 0 6px">${pass?`Module ${m.n} complete.`:'Not this time.'}</h1>
    <p class="muted">${pass?`You've shown you can do it, not just recognise it.${next?` <b>Module ${next.n}: ${next.t}</b> is now unlocked.`:' That was the last module.'}`:`That's useful: it shows exactly which ideas haven't landed yet. Use it.`}</p></div></div>
   <div class="ex-grid"><div>
    <div class="card" style="padding:18px 22px"><div class="hud" style="margin-bottom:8px">Score by topic</div>
      ${Object.entries(topics).map(([t,o])=>{const p=o.c/o.n;return `<div class="topic"><span>${esc(t)}</span><div class="pbar"><i style="width:${p*100}%;background:${p<.7?'var(--loss)':'var(--win)'}"></i></div><span class="num">${o.c}/${o.n}</span></div>`}).join('')}
      ${pass?'':`<p class="muted" style="margin-top:12px;font-size:14px"><b>Focus on:</b> ${Object.entries(topics).filter(([,o])=>o.c/o.n<.7).map(([t])=>esc(t)).join(' · ')||'a careful re-read of the whole lesson'}</p>`}</div>
    ${miss.length?`<div class="hud" style="margin:22px 0 4px">Review${pass?'':': shown once. Your next exam is a different set.'}</div>${miss.map(({it,i})=>`<div class="rev"><p><b>Q${i+1} · ${TYPE_LABEL[it.kind]}</b></p><p>${it.q}</p><p>Correct: <b>${K[it.kind].correct(it)}</b></p><p>${it.why}</p></div>`).join('')}`:'<p class="muted" style="margin-top:18px">No missed questions.</p>'}
   </div><aside>
    ${pass?`<div class="card next-card" style="padding:18px"><div class="hud">${next?'Unlocked':'Finished'}</div><div class="h" style="font-size:21px;margin:4px 0 8px">${next?`${next.n}. ${next.t}`:'Course complete'}</div><p class="muted" style="font-size:14px">${next?next.out:'You passed every module.'}</p><a class="btn primary" href="#/" style="margin-top:12px">Back to the course map</a></div>`:
    `<div class="reset"><div class="hud" style="color:var(--loss)">Module restarted</div><h3 class="h" style="font-size:20px;margin:6px 0">Back to the lesson</h3><p class="muted" style="font-size:14px">Under ${PASS*100}% means a re-learn, not a re-roll. The lessons have re-opened, the practice tasks are new, and the exam will be a <b>different set</b>: different charts, numbers and questions.</p>
     <button class="btn primary" id="restartBtn" style="margin-top:12px;white-space:normal;text-align:left">Restart Module ${m.n} · attempt ${pm(m.id).a}</button></div>`}
   </aside></div>`;
  const r=$('#restartBtn');if(r)r.onclick=()=>{X=null;nav(`/${m.id}/learn`)};
}


/* ============================================================
   PLAN CHECK + GRADUATION (certificate and the ECHO X ORBIT bot reward)
============================================================ */
async function planCheck(){
  const fb=$('[data-plan-fb]');if(!fb)return;
  if(!LIVE){fb.innerHTML='<div class="fb ok"><b>Preview.</b> In FLOWHUB this checks your saved plan.</div>';return}
  try{const r=await fetch('/api/plan',{credentials:'same-origin'}),j=r.ok?await r.json():null;
    fb.innerHTML=j&&j.plan&&j.plan.done?'<div class="fb ok"><b>Plan found.</b> Your plan card is saved. It shows on your dashboard and feeds your pre-trade checklist.</div>':'<div class="fb no"><b>No plan yet.</b> Finish all 6 steps in Trading Plan, save it, then check again.</div>'}
  catch(e){fb.innerHTML='<div class="fb no"><b>Could not check.</b> Try again in a moment.</div>'}
}
const BOOK_MSG='Hi Hannah! I finished the FLOWMTD Trading School and passed the ECHO X ORBIT exam. I\'d like to book a Zoom call to set up the ECHO X ORBIT bot and private indicator.\n\nTradingView username: \nProp firm / account: \nTime zone + best times for a call: ';
function drawCertificate(name){
  const W=1600,H=1130,cv=document.createElement('canvas');cv.width=W;cv.height=H;const c=cv.getContext('2d');
  c.fillStyle='#030405';c.fillRect(0,0,W,H);c.strokeStyle='#28313e';c.lineWidth=2;c.strokeRect(48,48,W-96,H-96);c.strokeStyle='#ff6a00';c.lineWidth=4;c.beginPath();c.moveTo(48,120);c.lineTo(48,48);c.lineTo(120,48);c.stroke();c.beginPath();c.moveTo(W-48,H-120);c.lineTo(W-48,H-48);c.lineTo(W-120,H-48);c.stroke();
  c.textAlign='center';c.fillStyle='#e6ebf2';c.font='900 46px Archivo, Arial Black, sans-serif';c.fillText('FLOWHUB',W/2,170);c.fillStyle='#ff6a00';c.font='600 20px Inter, sans-serif';c.fillText('Certificate of completion',W/2,215);
  c.fillStyle='#929fb2';c.font='400 26px Inter, sans-serif';c.fillText('This certifies that',W/2,400);
  let fs=96;c.font=`700 ${fs}px Inter, sans-serif`;while(c.measureText(name).width>W-300&&fs>40){fs-=4;c.font=`700 ${fs}px Inter, sans-serif`}c.fillStyle='#e6ebf2';c.fillText(name,W/2,520);
  c.strokeStyle='#ff6a00';c.lineWidth=2;c.beginPath();c.moveTo(W/2-300,560);c.lineTo(W/2+300,560);c.stroke();
  c.fillStyle='#c9d3e1';c.font='400 30px Inter, sans-serif';c.fillText('has completed the FLOWMTD Trading School and passed every module exam,',W/2,660);c.fillText('including the ECHO X ORBIT model.',W/2,704);
  const d=new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});let h=7;for(const ch of name+d)h=(h*31+ch.charCodeAt(0))>>>0;
  c.textAlign='left';c.fillStyle='#66717f';c.font='500 18px JetBrains Mono, monospace';c.fillText('DATE',150,930);c.fillStyle='#e6ebf2';c.font='500 26px JetBrains Mono, monospace';c.fillText(d,150,968);c.fillStyle='#66717f';c.font='500 18px JetBrains Mono, monospace';c.fillText('CERTIFICATE ID',150,1020);c.fillStyle='#e6ebf2';c.font='500 22px JetBrains Mono, monospace';c.fillText('FMTD-'+h.toString(36).toUpperCase().padStart(7,'0'),150,1054);
  c.textAlign='center';c.fillStyle='#66717f';c.font='400 15px Inter, sans-serif';c.fillText('Educational certificate of course completion. Not a trading license, qualification or financial advice.',W/2,H-72);
  return cv}
function gradCard(){
  return `<div class="card" style="padding:22px 24px;margin-bottom:24px;border-color:color-mix(in srgb,var(--signal) 40%,var(--line))"><div class="hud" style="color:var(--signal)">Trading School complete</div><h2 class="h" style="font-size:24px;margin:6px 0 8px">You passed every module, including ECHO X ORBIT.</h2>
   <p class="muted" style="max-width:62ch">Download your certificate, then read how to claim the ECHO X ORBIT private indicator and bot: set up with you on a one-on-one Zoom call.</p>
   <div class="row" style="align-items:center;margin-top:14px"><input class="in" id="certName" placeholder="Your name for the certificate" maxlength="40" value="${esc(WHO||'')}" style="max-width:300px"><button class="btn primary" id="certBtn">Download certificate</button></div>
   <h3 class="h" style="font-size:17px;margin:22px 0 6px">Your reward: the ECHO X ORBIT private indicator and bot</h3>
   <p class="muted" style="max-width:66ch;font-size:14px">The <b>private indicator</b> runs on your own TradingView chart and marks setups as they form. The <b>bot</b> places that same order in your connected accounts with the stop and target attached, then applies <b>your</b> safety limits: daily loss and profit caps, max contracts, sessions, and when to be flat. You start on Paper and move to Live when you are ready. It is yours, not shared.</p>
   <p style="margin-top:10px;font-size:14px"><b>Have ready for the call:</b></p><ul class="muted" style="font-size:14px;margin:4px 0 0 18px"><li>A TradingView paid plan that supports webhook alerts, and your TradingView username</li><li>A PickMyTrade account</li><li>Your prop firm or broker account ready to connect (you log in yourself: never send a password in Discord)</li><li>Your firm's daily loss limit and max contracts, and its rules on automation</li><li>Zoom installed on a computer</li></ul>
   <p style="margin-top:12px;font-size:14px"><b>Book it:</b> send Hannah a DM on Discord with the message below.</p><textarea class="in" id="bookMsg" readonly rows="6" style="margin-top:6px">${esc(BOOK_MSG)}</textarea>
   <div class="row" style="margin-top:8px"><button class="btn" id="copyBook">Copy message</button><a class="btn" href="https://discord.com/channels/@me" target="_blank" rel="noopener">Open Discord</a></div></div>`}
document.addEventListener('click',e=>{
  if(e.target.closest('#certBtn')){const n=($('#certName').value||'').trim();if(!n){toast('Type your name for the certificate.');return}
    const run=()=>{const a=document.createElement('a');a.download='FLOWMTD-certificate-'+n.replace(/[^a-z0-9]+/gi,'-')+'.png';a.href=drawCertificate(n).toDataURL('image/png');document.body.append(a);a.click();a.remove()};
    (document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(run)}
  if(e.target.closest('#copyBook')){const b=e.target.closest('#copyBook');try{navigator.clipboard.writeText(BOOK_MSG).then(()=>{b.textContent='Copied'},()=>{b.textContent='Select and copy above'})}catch(x){b.textContent='Select and copy above'}}
});

/* ============================================================
   boot
============================================================ */
$('#v-exam').addEventListener('click',()=>{});
$('#notesBtn')&&($('#notesBtn').onclick=()=>$('#notes').showModal());
window.addEventListener('keydown',e=>{if(e.key==='Escape')$$('dialog[open]').forEach(d=>d.close())});
route();pull();
