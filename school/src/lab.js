/* ============================================================
   EVAL & FUNDED LAB (practice page only). Replays real NQ mornings (09:00-12:00 ET, 1-minute candles, prices shifted, dates removed)
   against the firm rules in FLOWHUB's catalog. Costs and slippage are charged on every trade; the lab never shows a win rate.
============================================================ */
const LI={MNQ:{pv:2,fee:1.4,name:'Micro E-mini Nasdaq (MNQ)',cap:'maxMicros'},NQ:{pv:20,fee:4.5,name:'E-mini Nasdaq (NQ)',cap:'maxMinis'}};
const LTICK=.25,LSTART=29,LEND=179;
const LDEF=[{firm:'Example firm',plan:'50K eval (default rules)',sizes:[{id:'x',accountSize:50000,profitTarget:3000,maxLoss:2000,dailyLossLimit:1200,drawdownModel:'EOD_TRAILING',consistencyPct:50,minDays:2,maxMinis:5,maxMicros:50,profitSplit:'90%',drawdownNote:'End-of-day trailing',dataStatus:'VERIFY'}]}];
const LB={scr:'setup',tour:0,cat:null,sel:0,inst:'MNQ',q:1,sp:20,tp:40,ind:{esc:1,o930:0,pd:0},t:null,firm:'',stage:'eval',a:null,d:null,used:[],msg:'',last:null};
const money=(x,s)=>(x<0?'−':s&&x>0?'+':'')+'$'+fm(Math.abs(x),0);
const m2=(x,s)=>(x<0?'−':s&&x>0?'+':'')+'$'+fm(Math.abs(x),2);
function labFlat(){const out=[];for(const f of LB.cat||LDEF)for(const p of f.plans||f.plan&&[{plan:f.plan,sizes:f.sizes}]||[])for(const s of p.sizes)out.push({firm:f.firm,plan:p.plan,...s});return out}
async function labLoadCat(){
  if(LB.cat)return;LB.cat=LDEF;
  try{const r=await fetch('/api/catalog',{credentials:'same-origin'});if(r.ok){const j=await r.json();if(Array.isArray(j)&&j.some(f=>f.plans&&f.plans.length)){LB.cat=j;const L=labFlat(),lu=L.findIndex(x=>/lucid/i.test(x.firm)&&x.accountSize===50000);LB.sel=Math.max(0,lu)}}}catch(e){}
  if(PV==='lab')labPanel()}
const labTpl=()=>{const x=labFlat()[LB.sel]||labFlat()[0];return{id:x.id,firm:x.firm,plan:x.plan,size:x.accountSize,target:x.profitTarget,maxLoss:x.maxLoss,dll:x.dailyLossLimit,model:x.drawdownModel||'EOD_TRAILING',cons:x.consistencyPct,minDays:x.minDays||0,maxMinis:x.maxMinis||5,maxMicros:x.maxMicros||50,split:x.profitSplit,note:x.drawdownNote||'',status:x.dataStatus}};
const modelName=m=>m==='INTRADAY_TRAILING'?'Intraday trailing':m==='STATIC'?'Static':'End-of-day trailing';
const labCap=()=>LB.t[LI[LB.inst].cap]||10;
const labFloorOf=(a,t,peak)=>t.model==='STATIC'?a.start-t.maxLoss:Math.min(a.start,Math.max(a.start-t.maxLoss,peak-t.maxLoss));
function labNewAcct(stage){const t=LB.t;return{start:t.size,bal:t.size,hwm:t.size,peak:t.size,floor:t.size-t.maxLoss,days:0,dp:[],paid:0,status:'run',stage}}
function labDay(){
  const pool=LAB_DAYS.map((_,i)=>i).filter(i=>!LB.used.includes(i));if(!pool.length){LB.used=[];return labDay()}
  const k=pool[Math.floor(Math.random()*pool.length)];LB.used.push(k);const src=LAB_DAYS[k];
  if(!src._C){src._C=[];for(let i=0;i<src.b.length;i+=4)src._C.push({o:src.p0+src.b[i]/4,h:src.p0+src.b[i+1]/4,l:src.p0+src.b[i+2]/4,c:src.p0+src.b[i+3]/4})}
  const a=LB.a;return{src,C:src._C,i:LSTART,pos:null,real:0,trades:[],start:a.bal,minPnl:0,ended:false,why:'',n:a.days+1,pk:a.bal}
}
const labQ=()=>Math.max(1,Math.min(labCap(),Math.round(LB.q)||1));
const labEq=(px)=>{const d=LB.d,p=d.pos;return LB.a.bal+(p?p.dir*(px-p.fill)*LI[LB.inst].pv*p.q-LI[LB.inst].fee*p.q:0)};
function labClose(raw,reason,slip){
  const d=LB.d,p=d.pos,I=LI[LB.inst],ex=raw-p.dir*(slip?LTICK:0);
  const gross=p.dir*(raw-p.raw)*I.pv*p.q,sl=(p.slip+(slip?1:0))*LTICK*I.pv*p.q,fee=I.fee*p.q,net=gross-sl-fee;
  const tr={dir:p.dir,q:p.q,t0:p.t0,t1:d.i,entry:p.fill,exit:ex,raw:gross,slip:sl,fee,net,reason,stop:p.stop,tgt:p.tgt,i0:p.i0,i1:d.i};
  LB.a.bal+=net;d.real+=net;d.trades.push(tr);d.pos=null;LB.last=tr;return tr}
/* process candle d.i for an open position. Adverse levels (stop, daily limit, account floor) are checked before the target: a candle that touches both counts as a loss. */
function labBar(){
  const d=LB.d,a=LB.a,t=LB.t,I=LI[LB.inst],c=d.C[d.i],p=d.pos;
  if(p){const dir=p.dir,fee=I.fee*p.q,k=I.pv*p.q;
    const lvl=(delta)=>p.fill+dir*delta/k;           // price where open P&L reaches `delta` dollars
    const cand=[];cand.push([p.stop,'stop']);
    if(t.dll)cand.push([lvl(-t.dll-d.real+fee),'dll']);
    const fl=labFloorOf(a,t,Math.max(a.hwm,a.peak));cand.push([lvl(fl-a.bal+fee),'floor']);
    cand.sort((x,y)=>dir*(y[0]-x[0]));const first=cand[0];                       // closest to entry in the adverse direction
    const adv=dir===1?c.l:c.h,fav=dir===1?c.h:c.l;
    const o=c.o,gapped=dir===1?o<=first[0]:o>=first[0];
    if(gapped||(dir===1?adv<=first[0]:adv>=first[0])){const px=gapped?o:first[0];labClose(px,first[1],true);if(first[1]==='dll'){d.ended=true;d.why='Daily loss limit reached. The firm stops you for the day.'}if(first[1]==='floor'){a.status='blown';d.ended=true;d.why='Your balance hit the account floor.'}}
    else if(p.tgt&&(dir===1?fav>=p.tgt+LTICK:fav<=p.tgt-LTICK))labClose(p.tgt,'target',false);
    else if(t.model==='INTRADAY_TRAILING'){a.peak=Math.max(a.peak,a.bal+dir*(fav-p.fill)*k-fee)}
  }
  const lowEq=labEq(d.pos?(d.pos.dir===1?c.l:c.h):c.c);d.minPnl=Math.min(d.minPnl,lowEq-d.start);
  if(t.model==='INTRADAY_TRAILING')a.peak=Math.max(a.peak,a.bal)
}
function labStep(){const d=LB.d;if(d.ended)return;d.i++;labBar();if(!d.ended&&d.i>=LEND){if(d.pos)labClose(d.C[d.i].c,'close',true);d.ended=true;d.why=d.why||'Session over (12:00 ET). Open positions are closed.'}}
function labRun(n){const d=LB.d;let k=0;const had=!!d.pos;while(k<n&&!d.ended){labStep();k++;if(had&&!d.pos)break}}
function labOrder(dir){
  const d=LB.d,I=LI[LB.inst];LB.msg='';if(d.ended)return;if(d.pos){LB.msg='You already have a position. One at a time. Flatten first.';return}
  const q=labQ(),sp=Math.max(2,+LB.sp||0),tp=Math.max(0,+LB.tp||0);
  if(d.i>=LEND-1){LB.msg='Too late in the session for a new trade.';return}
  d.i++;const c=d.C[d.i],raw=c.o,fill=raw+dir*LTICK,stop=fill-dir*sp;
  d.pos={dir,q,raw,fill,slip:1,stop,tgt:tp?fill+dir*tp:0,i0:d.i,t0:d.i};
  labBar();
  if(!d.ended&&d.i>=LEND){if(d.pos)labClose(d.C[d.i].c,'close',true);d.ended=true;d.why='Session over (12:00 ET). Open positions are closed.'}
}
function labFlatten(){const d=LB.d;if(d.pos){labClose(d.C[d.i].c,'flat',true)}}
function labEndDay(){
  const a=LB.a,t=LB.t,d=LB.d;if(d.pos)labClose(d.C[d.i].c,'flat',true);
  const pnl=a.bal-d.start;a.days++;a.dp.push(pnl);a.hwm=Math.max(a.hwm,a.bal);a.peak=Math.max(a.peak,a.hwm);
  const f0=a.floor;a.floor=Math.max(a.floor,labFloorOf(a,t,a.hwm));
  const prof=a.bal-a.start,best=Math.max(0,...a.dp),consOk=!(a.stage==='eval'&&t.cons)||prof<=0||best<=prof*t.cons/100;
  const dayCl={pnl,f0,f1:a.floor,minPnl:d.minPnl,consOk,best,prof};
  d.sum=dayCl;
  if(a.status==='blown'){LB.scr='over';return}
  if(a.stage==='eval'&&t.target!=null&&prof>=t.target&&a.days>=t.minDays&&consOk){a.status='passed';LB.scr='over';return}
  LB.scr='dayend'}
/* ---------- chart ---------- */
/* ESC VLCTY on a lab day: the anchor is the previous 16:00 close, U the average range of the last 10 sessions. NY checks run at the close of 09:44, 09:59 ... 14:44. */
function labEsc(d){
  const sr=d.src,A=sr.p0+sr.anc/4,U=sr.u,C=d.C;
  for(let h=584;h<=884;h+=15){const k=h-540;if(k>d.i||!C[k])break;const x=(C[k].c-A)/U;if(x>=.40||x<=-.20){const dir=x>0?1:-1,st=dir>0?.13:.08,rr=dir>0?2:1.5,R=st*U,en=C[k+1]&&k+1<=d.i?C[k+1].o+dir*LTICK:null;return{k,x,dir,A,U,R,rr,en,stop:en==null?null:en-dir*R,tgt:en==null?null:en+dir*rr*R,w:dir>0?1:.25}}}
  return{A,U,k:null}}
function labOv(){
  const d=LB.d,C=d.C,i=d.i,ov=[],s=LB.ind,P=(p,tx,col,x={})=>hlAt(p,tx,col,x.i0==null?30:x.i0,{scale:!!x.scale,pine:1,pcol:col,pdash:x.dash,pdot:x.dot,pleft:1});
  if(s.o930)ov.push(P(C[30].o,'9:30 Open','#e6e9f0',{i0:30}));
  if(s.esc){const E=labEsc(d);ov.push(P(E.A,'16:00 close (anchor)','#9aa0ad',{i0:0,dash:1}),P(E.A+.4*E.U,'LONG ≥ +0.40 U','#9aa0ad',{i0:30,dot:1}),P(E.A-.2*E.U,'SHORT ≤ −0.20 U','#9aa0ad',{i0:30,dot:1}));
    if(E.k!=null){const dd=(C[E.k].c-E.A)/E.U;ov.push({...rectAt(30,E.k,Math.min(E.A,C[E.k].c),Math.max(E.A,C[E.k].c),`NY ${dd>=0?'+':'−'}${Math.abs(dd).toFixed(2)} U ✓`,COL.ice,{pine:1,pfill:1,pcol:'#9aa0ad'}),tab:'#2a2e39'});
      if(E.en!=null){const k1=E.k+1;ov.push(hlAt(E.en,'ESC entry',COL.ice,k1,{pine:1,pcol:'#2962ff',pdash:1,pleft:1,i1:k1+3}),hlAt(E.stop,'ESC stop',COL.bad,k1,{pine:1,pcol:'#f23645',pdot:1,pleft:1,i1:k1+3}),hlAt(E.tgt,'ESC target',COL.ok,k1,{pine:1,pcol:'#089981',pdot:1,pleft:1,i1:k1+3}))}}}
  if(s.pd){const sr=d.src;ov.push(P(sr.p0+sr.pdh/4,'Prior day high','#8cc4ff',{i0:0,dash:1}),P(sr.p0+sr.pdl/4,'Prior day low','#8cc4ff',{i0:0,dash:1}))}
  const p=d.pos;
  if(p){ov.push(hlAt(p.fill,'entry '+fm(p.fill),COL.ice,p.i0,{scale:true,pine:1,pcol:'#9db2bd',pleft:1}),hlAt(p.stop,'stop',COL.bad,p.i0,{scale:true,pine:1,pcol:'#f23645',pdash:1,pleft:1}));
    if(p.tgt)ov.push(hlAt(p.tgt,'target',COL.ok,p.i0,{scale:true,pine:1,pcol:'#00e676',pdash:1,pleft:1}))}
  const lt=LB.last;if(lt&&lt.i1<=i&&d.trades.includes(lt)){ov.push({...tagAt(lt.i1,lt.exit,(lt.net>=0?'+':'−')+'$'+fm(Math.abs(lt.net),2)+' net',lt.dir===1?(lt.net>=0?'above':'below'):(lt.net>=0?'below':'above'),lt.net>=0?COL.ok:COL.bad),pine:1,bg:lt.net>=0?'#0e5a35':'#6a1b24',tc:'#fff'})}
  return ov}
function labPaint(fit){
  const d=LB.d;indLoad();CH.size();
  CH.setData(d.C.slice(0,d.i+1),{k:1,t0:540,stepMin:1,fit:!!fit});CH.marks=[];CH.taps=new Set();CH.ov=labOv();
  if(fit)CH.count=70;CH.from=d.i-CH.count+14;
  $('#chartTf').textContent='1m candles · NQ';$('#chartHint').textContent='Replay of a real NQ morning. Prices shifted, date hidden. MNQ and NQ move the same; only the dollar value of a point differs.';CH.draw()}
/* ---------- panel ---------- */
const lbRow=(a,b,x='')=>`<div style="display:flex;justify-content:space-between;gap:10px;padding:4px 0;border-bottom:1px solid var(--line)"><span class="muted">${a}</span><b ${x}>${b}</b></div>`;
function labRules(){const t=LB.t,I=LI[LB.inst];return`<div style="margin:6px 0">${lbRow('Account',`${esc(t.firm)} · ${esc(t.plan)} · ${money(t.size)}`)}${lbRow('Profit target',t.target!=null?money(t.target):'none')}${lbRow('Max loss (drawdown)',`${money(t.maxLoss)} · ${modelName(t.model)}`)}${lbRow('Daily loss limit',t.dll?money(t.dll):'none')}${lbRow('Consistency',t.cons?`best day ≤ ${t.cons}% of profit`:'none')}${lbRow('Minimum days',t.minDays||'none')}${lbRow('Contract limit',`${labCap()} ${LB.inst}`)}</div>`}
function labPanelSetup(){
  const L=labFlat(),t=labTpl();LB.t=t;
  const opts=L.map((x,i)=>`<option value="${i}" ${i===LB.sel?'selected':''}>${esc(x.firm)} · ${esc(x.plan)} · ${money(x.accountSize)}</option>`).join('');
  return{body:`<p class="muted">Practice a prop-firm evaluation and then the funded account on real NQ mornings. You place the trades, the lab charges costs and slippage and tracks every rule. There is no real money, and prices are shifted so you cannot look the day up.</p>
   <h3>1. Pick the account</h3><select data-lbin="sel" style="width:100%;padding:9px;background:var(--panel2);color:var(--ink);border:1px solid var(--line2);border-radius:8px">${opts}</select>
   <h3>2. Pick the contract</h3><div class="seg">${Object.keys(LI).map(k=>`<button type="button" data-lb="inst" data-v="${k}" class="${LB.inst===k?'on':''}">${k}</button>`).join('')}</div>
   <p class="muted" style="margin-top:8px">${LI[LB.inst].name}: <b>$${LI[LB.inst].pv}</b> per point, <b>$${LI[LB.inst].pv*LTICK}</b> per tick. NQ and MNQ track the same index; MNQ is one-tenth the size, so the same stop costs one-tenth as much.</p>
   <h3>The rules you will play by</h3>${labRules()}<p class="muted" style="font-size:12.5px">Rules come from the FLOWHUB catalog (${esc(t.status==='OFFICIAL'?'official source':t.status==='SECONDARY'?'secondary source':'verify with the firm')}). Always confirm with the firm before you buy an evaluation.</p>`,
   foot:`<button class="btn primary" data-lb="start">Start the walkthrough →</button>`}}
function labTour(){
  const t=LB.t,I=LI[LB.inst],stopEx=20,riskEx=stopEx*I.pv+I.fee+I.pv*LTICK*2;
  const cards=[
   [`Step 1 · the rules`,`<p>An evaluation is a test with three jobs: <b>reach the profit target</b>${t.target!=null?` (${money(t.target)})`:''}, <b>never break the loss rules</b>, and <b>do it like a trader, not a gambler</b> (minimum days${t.cons?`, and the consistency rule: no single day can be more than ${t.cons}% of your total profit`:''}).</p><p>The one that ends most attempts is the <b>drawdown</b>. Yours is ${modelName(t.model)}: your <b>floor</b> starts at ${money(t.size-t.maxLoss)} (${money(t.maxLoss)} below the start). ${t.model==='STATIC'?'It never moves.':t.model==='INTRADAY_TRAILING'?'It follows your highest balance <b>including open profit</b>, so a trade that goes your way and comes back still raises your floor.':'It follows your highest <b>end-of-day</b> balance, and does not move during the day.'} It stops rising when it reaches your starting balance. If your balance touches the floor, the account is over.</p>${t.dll?`<p>The <b>daily loss limit</b> is ${money(t.dll)}: lose that much in one day and you are done for the day.</p>`:''}`],
   [`Step 2 · what a trade really costs`,`<p>Every trade pays two things on top of the market moving against you:</p><ul><li><b>Commission and fees:</b> about <b>${m2(I.fee)}</b> per ${LB.inst} round trip.</li><li><b>Slippage:</b> your market entry and your stop each fill about one tick (${m2(I.pv*LTICK)}) worse than the line you drew. A stop on a fast candle can be worse.</li></ul><p>So a ${stopEx}-point stop on 1 ${LB.inst} does not risk ${money(stopEx*I.pv)}. It risks about <b>${m2(riskEx)}</b>. Targets fill only when price trades one tick <b>through</b> them, so a candle that just touches your target does not pay you.</p>`],
   [`Step 3 · size from the floor, not from hope`,`<p>Your loss room is ${money(t.maxLoss)}${t.dll?` and your day limit is ${money(t.dll)}`:''}. At 1 ${LB.inst} and a ${stopEx}-point stop each loss is about ${m2(riskEx)}, so you can take roughly <b>${Math.floor(t.maxLoss/riskEx)}</b> straight stop-outs before the account is over. At 3 contracts that drops to about <b>${Math.floor(t.maxLoss/(riskEx*3))}</b>.</p><p>The lab shows this number live for the trade you are about to place. Learn to read it before you click.</p>`],
   [`Step 4 · how a day works`,`<p>Each day is a real NQ morning replayed one 1-minute candle at a time, from <b>9:30 to 12:00 ET</b>. The chart opens with the earlier candles so you can read the context, and the ESC VLCTY lines can be switched on: the 16:00 close (the anchor) and the +0.40 U and −0.20 U trigger lines, plus the signal and its stop and target once a check fires. Reading them is the practice.</p><ul><li><b>Buy / Sell</b> fills on the <b>next candle's open</b> plus slippage, with your stop and optional target attached.</li><li><b>Next candle</b>, <b>+5</b> and <b>+15</b> move time forward. Stops, targets and the rules are checked on every candle.</li><li>A candle that touches both your stop and your target counts as the stop.</li><li>At 12:00 any open trade is closed and the day is scored.</li></ul><p>After each day you see <b>what actually happened</b> to your money and your room.</p>`]];
  const [h,b]=cards[LB.tour];
  return{body:`<div class="hud">Walkthrough ${LB.tour+1} of ${cards.length}</div><div class="cap" style="margin-top:8px"><b>${h}</b>${b}</div>`,
   foot:`<button class="btn" data-lb="tback">← ${LB.tour?'Back':'Setup'}</button><button class="btn primary" data-lb="${LB.tour===cards.length-1?'go':'tnext'}">${LB.tour===cards.length-1?'Start day 1 ▸':'Next ▸'}</button>`}}
function labPanelDay(){
  const a=LB.a,t=LB.t,d=LB.d,I=LI[LB.inst],c=d.C[d.i],p=d.pos;
  const open=p?p.dir*(c.c-p.fill)*I.pv*p.q-I.fee*p.q:0,eq=a.bal+open,fl=Math.max(a.floor,labFloorOf(a,t,Math.max(a.hwm,a.peak)));
  const dayP=a.bal-d.start+open,prof=a.bal-a.start;
  const bar=t.target&&a.stage==='eval'?`<div style="height:8px;border-radius:5px;background:var(--panel2);margin:6px 0 2px"><div style="height:8px;border-radius:5px;background:var(--signal);width:${Math.max(0,Math.min(100,prof/t.target*100)).toFixed(0)}%"></div></div>`:'';
  const q=labQ(),sp=Math.max(2,+LB.sp||0),risk=sp*I.pv*q+I.fee*q+2*LTICK*I.pv*q,room=eq-fl;
  const rsk=`<p class="muted" style="font-size:13px">If this trade is stopped: about <b>${m2(risk)}</b> (${sp} pts + fees + slippage). That is <b>${Math.min(999,risk/room*100).toFixed(0)}%</b> of your room to the floor${t.dll?` and <b>${Math.min(999,risk/Math.max(1,t.dll+Math.min(0,dayP))*100).toFixed(0)}%</b> of what is left of today's limit`:''}. About <b>${Math.max(0,Math.floor(room/risk))}</b> such losses would end the account.</p>`;
  const tog=[['esc','ESC VLCTY lines'],['o930','9:30 open'],['pd','Prior day high / low']].map(([k,n])=>`<button type="button" class="chip" data-lb="tog" data-v="${k}" style="cursor:pointer;${LB.ind[k]?'border-color:var(--signal);color:var(--signal)':''}">${n}</button>`).join('');
  const inp=(k,l,w=64)=>`<label style="display:flex;flex-direction:column;font-size:12px;color:var(--ink2);gap:3px">${l}<input data-lbin="${k}" type="number" value="${LB[k]}" min="0" style="width:${w}px;padding:7px;background:var(--panel2);color:var(--ink);border:1px solid var(--line2);border-radius:7px"></label>`;
  const lt=LB.last&&d.trades.includes(LB.last)?LB.last:null;
  const why={stop:'Stopped out. The stop line is where it triggered; the fill was one tick worse.',target:'Target filled (price traded one tick through it).',dll:'Daily loss limit reached; the lab closed your trade.',floor:'The account floor was reached.',close:'Closed at the end of the session.',flat:'Closed by you at the market (one tick of slippage).'};
  const card=lt?`<div class="rev" style="margin-top:10px"><p><b>Last trade: ${lt.dir===1?'long':'short'} ${lt.q} · ${hhmm(540+lt.i0)} → ${hhmm(540+lt.i1)}</b></p><p>${why[lt.reason]}</p>${lbRow('Price move',m2(lt.raw,1))}${lbRow('Slippage',m2(-lt.slip))}${lbRow('Fees',m2(-lt.fee))}${lbRow('Net',m2(lt.net,1),`style="color:var(--${lt.net>=0?'win':'loss'})"`)}</div>`:'';
  const body=`<div class="hud">${a.stage==='eval'?'Evaluation':'Funded'} · day ${d.n} · ${hhmm(540+d.i)} ET · ${LB.inst}</div>
   <div style="margin-top:8px">${lbRow('Balance',money(a.bal))}${lbRow('Open P&L',m2(open,1),`style="color:var(--${open>=0?'win':'loss'})"`)}${lbRow('Today',m2(dayP,1),`style="color:var(--${dayP>=0?'win':'loss'})"`)}${lbRow(`Account floor (${modelName(t.model).toLowerCase()})`,`${money(fl)} · ${money(eq-fl)} away`)}${t.dll?lbRow('Daily limit left',money(Math.max(0,t.dll+Math.min(0,dayP)))):''}${a.stage==='eval'&&t.target!=null?lbRow('Profit target',`${money(Math.max(0,prof))} of ${money(t.target)}`)+bar:lbRow('Profit above start',money(prof))}${a.stage==='eval'&&t.cons&&prof>0?lbRow('Best day vs limit',`${money(Math.max(0,...a.dp))} / ${money(prof*t.cons/100)}`):''}</div>
   <h3>Indicator lines</h3><div class="kv">${tog}</div>${LB.ind.esc?(()=>{const E=labEsc(d),x=(c.c-E.A)/E.U;return`<p class="muted" style="font-size:13px">Price is <b>${x>=0?'+':'−'}${Math.abs(x).toFixed(2)} U</b> from the anchor (U = ${fm(E.U,0)} points). A New York check fires at +0.40 U or −0.20 U, at the close of the 09:44, 09:59 ... 14:44 candles.${E.k!=null?` <b>A ${E.dir>0?'long':'short'} fired at ${hhmm(540+E.k)}.</b>`:''}</p>`})():''}
   <h3>Order ticket</h3>${p?`<p><b>${p.dir===1?'Long':'Short'} ${p.q} ${LB.inst}</b> from ${fm(p.fill)} · stop ${fm(p.stop)}${p.tgt?` · target ${fm(p.tgt)}`:''}</p>`:`<div style="display:flex;gap:10px;flex-wrap:wrap">${inp('q','Contracts (max '+labCap()+')')}${inp('sp','Stop (points)')}${inp('tp','Target (points, 0 = none)',110)}</div>${rsk}`}
   ${LB.msg?`<p style="color:var(--loss)">${esc(LB.msg)}</p>`:''}${d.ended?`<div class="cap"><b>${esc(d.why)}</b></div>`:''}${card}`;
  const foot=d.ended?`<button class="btn primary" data-lb="endday">See what happened today →</button>`:
   `${p?`<button class="btn" data-lb="flat">Flatten</button>`:`<button class="btn" data-lb="buy" style="border-color:var(--win)">Buy</button><button class="btn" data-lb="sell" style="border-color:var(--loss)">Sell</button>`}<button class="btn" data-lb="run" data-v="1">Next candle</button><button class="btn" data-lb="run" data-v="5">+5</button><button class="btn" data-lb="run" data-v="15">+15</button><button class="btn ghost" data-lb="run" data-v="999">${p?'Run it':'Skip day'}</button>`;
  return{body,foot}}
function labPanelDayEnd(){
  const a=LB.a,t=LB.t,d=LB.d,s=d.sum,I=LI[LB.inst];
  const T=d.trades,raw=T.reduce((x,y)=>x+y.raw,0),sl=T.reduce((x,y)=>x+y.slip,0),fee=T.reduce((x,y)=>x+y.fee,0),gw=T.filter(x=>x.raw>0).reduce((x,y)=>x+y.raw,0);
  const lossEach=T.length?Math.max(1,-Math.min(...T.map(x=>x.net),-I.fee)):(20*I.pv+I.fee),stops=Math.floor((a.bal-a.floor)/lossEach);
  const list=T.length?T.map(x=>`<div style="padding:5px 0;border-bottom:1px solid var(--line)"><b>${x.dir===1?'Long':'Short'} ${x.q}</b> ${hhmm(540+x.i0)}→${hhmm(540+x.i1)} · ${fm(x.entry)} → ${fm(x.exit)} · <b style="color:var(--${x.net>=0?'win':'loss'})">${m2(x.net,1)}</b> <span class="muted">(${x.reason==='target'?'target':x.reason==='stop'?'stop':x.reason==='dll'?'daily limit':x.reason==='floor'?'floor':'closed'})</span></div>`).join(''):'<p class="muted">You did not trade today. That is a legitimate day: no risk taken, and it still counts as a trading day if the firm requires one.</p>';
  const body=`<div class="hud">Day ${d.n} result</div><div class="cap" style="margin-top:8px"><b>${m2(s.pnl,1)}</b> net today. Balance <b>${money(a.bal)}</b>.${s.pnl===0?'':s.pnl>0?' Read the two panels below before the next day.':' The loss was planned size, if you sized from the floor.'}</div>
   <h3>What actually happened to your money</h3>${lbRow('Market move on your trades',m2(raw,1))}${lbRow('Slippage',m2(-sl))}${lbRow('Fees',m2(-fee))}${lbRow('Net',m2(s.pnl,1),`style="color:var(--${s.pnl>=0?'win':'loss'})"`)}
   ${gw>0?`<p class="muted">Costs took <b>${(Math.min(999,(sl+fee)/gw*100)).toFixed(0)}%</b> of what your winning trades earned before costs. This is why tiny targets and over-trading do not survive.</p>`:T.length?`<p class="muted">Costs today: ${m2(sl+fee)}. They are charged on winners and losers alike.</p>`:''}
   <h3>What actually happened to your room</h3>${lbRow('Floor',`${money(s.f0)} → ${money(s.f1)}`)}${lbRow('Room above the floor',money(a.bal-a.floor))}${lbRow('Worst moment today',m2(s.minPnl,1))}${t.dll?lbRow('Daily limit used at worst',Math.min(100,Math.max(0,-s.minPnl)/t.dll*100).toFixed(0)+'%'):''}
   <p class="muted">${t.model==='STATIC'?'Your floor is static, so it did not move.':s.f1>s.f0?`Your floor <b>rose ${money(s.f1-s.f0)}</b> because you closed at a new high. Your room did not grow; it shifted up with you. That is how a trailing drawdown quietly takes profit back as a loss buffer.`:t.model==='INTRADAY_TRAILING'?'Your floor trails your best moment of the day, including open profit. Giving back open profit does not lower it.':'The floor only moves when you finish a day at a new high balance.'} At roughly today's loss size, about <b>${Math.max(0,stops)}</b> more losses would end the account.</p>
   ${a.stage==='eval'&&t.target!=null?`${lbRow('Progress to target',`${money(Math.max(0,s.prof))} of ${money(t.target)}`)}${a.days<t.minDays?`<p class="muted">Minimum days: ${a.days} of ${t.minDays} done.</p>`:''}${s.prof>=t.target&&!s.consOk?`<div class="cap"><b>You are past the target but not passing yet.</b> Your best day (${money(s.best)}) is more than ${t.cons}% of your profit. Under the consistency rule you now need more profit from other days; one big day cannot carry an evaluation.</div>`:''}`:''}
   <h3>Today's trades</h3>${list}`;
  return{body,foot:`<button class="btn primary" data-lb="next">Next day ▸</button>`}}
function labPanelOver(){
  const a=LB.a,t=LB.t,I=LI[LB.inst],d=LB.d,prof=a.bal-a.start;let body,foot;
  if(a.status==='blown'){body=`<div class="cap"><b>Account over.</b> ${esc(d.why||'The balance reached the account floor.')} In a real ${a.stage==='eval'?'evaluation you would pay to reset and start again':'funded account you would lose it'}.</div>
    ${lbRow('Days traded',a.days)}${lbRow('Final balance',money(a.bal))}${lbRow('Floor at the end',money(a.floor))}
    <h3>What actually happened</h3><p class="muted">The loss rules are checked on every candle, not only when you look. The usual causes are size that is too big for the room, moving a stop, or adding after a loss. Try again with fewer contracts, then compare how many losses the account can now absorb.</p>`;
    foot=`<button class="btn primary" data-lb="restart">Try again</button>`}
  else if(a.stage==='eval'){body=`<div class="cap"><b>Evaluation passed in ${a.days} day${a.days>1?'s':''}.</b> You reached ${money(prof)} of profit without breaking a rule. The funded account is the real exam: no profit target, same loss rules, and now the goal is to keep the account alive and take payouts.</div>${lbRow('Final balance',money(a.bal))}${lbRow('Best day',money(Math.max(...a.dp)))}${lbRow('Floor',money(a.floor))}`;
    foot=`<button class="btn" data-lb="restart">Start over</button><button class="btn primary" data-lb="funded">Go funded ▸</button>`}
  else{body='';foot=''}
  return{body,foot}}
function labPanel(){
  const box=$('#lesson');let r;
  if(LB.scr==='setup')r=labPanelSetup();else if(LB.scr==='tour')r=labTour();else if(LB.scr==='day')r=labPanelDay();else if(LB.scr==='dayend')r=labPanelDayEnd();else r=labPanelOver();
  if(LB.a&&LB.a.stage==='funded'&&(LB.scr==='dayend'||LB.scr==='day')){
    const a=LB.a,prof=a.bal-a.start;if(LB.scr==='dayend'){const can=prof>=500,pay=Math.floor(prof*.5/100)*100,sp=parseFloat(LB.t.split)||0,net=sp?pay*sp/100:pay;
      r.body+=`<h3>Payouts</h3>${lbRow('Profit above start',money(prof))}${lbRow('Paid out so far',money(a.paid))}<p class="muted">${can?`You can request a payout. Example rule: take up to half of the profit above your start, and only once you have at least $500. A request of <b>${money(pay)}</b> would pay you about <b>${money(net)}</b>${sp?` after the ${esc(LB.t.split)} split`:''}. Taking money out lowers your balance but <b>does not lower your floor</b>, so each payout makes the account riskier.`:'A payout needs at least $500 of profit above your start (example rule: confirm the real one with your firm).'}</p>`;
      if(can)r.foot=`<button class="btn" data-lb="payout">Request ${money(pay)} payout</button>`+r.foot}}
  box.innerHTML=`<div class="les-h"><div class="hud">Eval &amp; Funded Lab</div><div class="h">${LB.a&&LB.a.stage==='funded'?'Funded account':'Evaluation'}${LB.t&&LB.scr!=='setup'?' · '+esc(LB.t.firm):''}</div></div><div class="les-b">${r.body}</div><div class="les-f">${r.foot}</div>`}
function labOpen(){
  PV='lab';$('#v-lab').classList.remove('nochart');labLoadCat();
  if(LB.scr==='day'){labPaint(true)}else{indLoad();CH.size();CH.setData([{o:100,h:100,l:100,c:100}],{k:1,t0:540,stepMin:1,fit:true});CH.ov=[];CH.draw()}
  labPanel()}
function labBegin(){LB.a=labNewAcct(LB.stage);LB.d=labDay();LB.scr='day';LB.last=null;LB.msg='';labPaint(true);labPanel()}
document.addEventListener('change',e=>{
  if(PV!=='lab')return;const el=e.target.closest('[data-lbin]');if(!el)return;const k=el.dataset.lbin;
  if(k==='sel'){LB.sel=+el.value;LB.t=labTpl();return labPanel()}
  LB[k]=Math.max(k==='tp'?0:1,+el.value||0);if(k==='q')LB.q=labQ();if(LB.scr==='day')labPanel()});
document.addEventListener('input',e=>{if(PV!=='lab')return;const el=e.target.closest('[data-lbin]');if(el&&el.type==='number'){LB[el.dataset.lbin]=+el.value}});
document.addEventListener('click',e=>{
  if(typeof PV==='undefined'||PV!=='lab')return;const b=e.target.closest('[data-lb]');if(!b)return;const k=b.dataset.lb,v=b.dataset.v;
  if(k==='inst'){LB.inst=v;LB.q=labQ();LB.t=labTpl();return labPanel()}
  if(k==='start'){LB.t=labTpl();LB.q=Math.min(LB.q,labCap());LB.tour=0;LB.scr='tour';return labPanel()}
  if(k==='tnext'){LB.tour++;return labPanel()}
  if(k==='tback'){if(LB.tour)LB.tour--;else LB.scr='setup';return labPanel()}
  if(k==='go'){LB.stage='eval';return labBegin()}
  if(k==='tog'){LB.ind[v]=LB.ind[v]?0:1;labPaint();return labPanel()}
  if(k==='buy'||k==='sell'){LB.q=labQ();labOrder(k==='buy'?1:-1);labPaint();return labPanel()}
  if(k==='run'){LB.msg='';labRun(+v);labPaint();return labPanel()}
  if(k==='flat'){labFlatten();labPaint();return labPanel()}
  if(k==='endday'){labEndDay();labPaint();return labPanel()}
  if(k==='next'){LB.d=labDay();LB.scr='day';LB.last=null;LB.msg='';labPaint(true);return labPanel()}
  if(k==='restart'){LB.scr='setup';LB.stage='eval';LB.a=null;return labOpen()}
  if(k==='funded'){LB.stage='funded';LB.t=labTpl();LB.t.target=null;LB.t.cons=null;return labBegin()}
  if(k==='payout'){const a=LB.a,pay=Math.floor((a.bal-a.start)*.5/100)*100;if(pay>0){a.bal-=pay;a.paid+=pay}return labPanel()}
});
