/* ============================================================
   INDICATOR LAB (practice page only): step-by-step walkthroughs of NYFLOW, ASIAFLOW and Confluence Master on real NQ examples.
   Prices in the examples are shifted by a fixed offset and carry no dates, so only the shape and the time of day are real.
============================================================ */
const IV={ind:'nyflow',mode:'guide',list:[],i:0,step:0,steps:[]};
const exData=ex=>{if(!ex._C){ex._C=[];for(let i=0;i<ex.b.length;i+=4)ex._C.push({o:ex.p0+ex.b[i]/4,h:ex.p0+ex.b[i+1]/4,l:ex.p0+ex.b[i+2]/4,c:ex.p0+ex.b[i+3]/4})}return ex._C};
const TRIG={cisd:['CISD','price closed beyond the last swing high or low (plus a small ATR buffer): the first sign delivery has flipped'],ifvg:['IFVG','a small gap on the 1-minute chart was closed through the other way (an inversion)'],bos:['BOS','a break of structure followed by a fresh gap in the new direction within 15 candles'],smt:['SMT','NQ made a new swing extreme that ES did not confirm'],eq:['EQ','a tiny gap formed right at the midpoint of the session range']};
const trigText=ex=>ex.trig.split('+').map(t=>`<li><b>${(TRIG[t]||[t.toUpperCase()])[0]}</b>: ${(TRIG[t]||['',''])[1]}.</li>`).join('');
const indName=ex=>ex.m==='ny'?{open:'10AM Open',tag:'10AM',model:'NYFLOW PO3',ses:'10 AM'}:{open:'6AM Open',tag:'6AM',model:'ASIAFLOW PO3',ses:'6 AM'};
function poSteps(ex){
  const C=exData(ex),L=ex.dir===1,nm=indName(ex),T=i=>hhmm(ex.hm+i),win=ex.pts>0,R=ex.R,pr=x=>fm(x),side=L?'LONG':'SHORT';
  const zoneOv=()=>{const [zn,top,bot]=ex.zone;return top===bot?[hlAt(top,zn,COL.lag,Math.max(0,ex.tp-12),{scale:true,dash:true})]:[rectAt(Math.max(0,ex.tp-12),ex.tp+3,bot,top,zn,COL.lag,{dash:true})]};
  const anchor=hlAt(ex.anchor,nm.open,COL.sig,ex.ai,{scale:true,pine:1,pcol:'#ff9800',pdash:1,pw:2,pleft:1});
  const lines=(full)=>[hlAt(ex.stop,'SL',COL.bad,ex.sg,{scale:true,pine:1,pcol:'#f23645',pdash:1,pleft:1}),hlAt(ex.entry,'retest limit (0.79)',COL.ice,ex.sg,{scale:true,pine:1,pcol:'#9db2bd',pdash:1,pleft:1}),...(full?[hlAt(ex.tgt,'TP (2R)',COL.ok,ex.sg,{scale:true,pine:1,pcol:'#00e676',pdash:1,pleft:1})]:[])];
  return[
   {upto:ex.ai+4,focus:ex.ai+4,ov:[anchor],cap:`<b>Step 1 · the anchor.</b> At <b>${nm.ses} ET</b> ${nm.model} marks the session open and draws it as a dashed line: <b>${nm.open} ${pr(ex.anchor)}</b>. Everything is judged against it. The model only looks for trades while this session is being watched.${ex.m==='ny'?' NYFLOW only fires between 9:30 AM and 4:00 PM ET.':''}`},
   {upto:ex.tp+3,focus:ex.tp,ov:[anchor,...zoneOv(),tagAt(ex.tp,C[ex.tp][L?'l':'h'],'tap',L?'below':'above',COL.sig)],cap:`<b>Step 2 · a real point of interest is tapped.</b> At <b>${T(ex.tp)}</b> price trades into a <b>${ex.zone[0]}</b>${ex.zone[1]===ex.zone[2]?` at ${pr(ex.zone[1])}`:` (${pr(ex.zone[2])} to ${pr(ex.zone[1])})`}. PO3 stays quiet until price has tapped something real on a higher time frame this session: a 4H gap, order block, breaker, rejection block, the previous high or low, a weekly opening gap or equal highs and lows. This is the "manipulation" leg: price ${ex.below&&L?'dipped below':ex.above&&!L?'pushed above':'moved away from'} the open to take stops and reach the zone.`},
   {upto:ex.sg+1,focus:ex.sg,ov:[anchor,...zoneOv(),tagAt(ex.sg,C[ex.sg][L?'h':'l'],'trigger',L?'above':'below',COL.sig),...lines(false)],cap:`<b>Step 3 · a trigger fires, so the setup is armed.</b> At <b>${T(ex.sg)}</b> a ${L?'bullish':'bearish'} trigger confirmed on a closed candle:<ul>${trigText(ex)}</ul>The indicator now fixes three levels: the <b>stop</b> at the last confirmed swing ${L?'low':'high'} (${pr(ex.stop)}), a <b>retest limit</b> at ${pr(ex.entry)} (79% of the way back from the trigger candle's close to the stop), and a target of <b>2R</b>. Nothing has printed yet: the status table says it is watching for the retest.`},
   {upto:Math.max(ex.sg+1,ex.fl-1),focus:Math.max(ex.sg+1,ex.fl-1),ov:[anchor,...lines(false)],cap:`<b>Step 4 · wait for the retest. Do not chase the signal.</b> The order only fills on a <b>later</b> candle that trades <b>1 tick through</b> ${pr(ex.entry)}. If price hits the stop first, or 40 candles pass, the setup is cancelled. A market order at the trigger would have been a worse price than the retest limit.`},
   {upto:ex.fl,focus:ex.fl,ov:[anchor,...lines(true),{...tagAt(ex.fl,C[ex.fl][L?'l':'h'],`PO3 ${side} (${nm.tag}) ${pr(ex.entry)}`,L?'below':'above',COL.sig),pine:1,bg:'#3b3b3b',tc:'#fff'}],cap:`<b>Step 5 · the label prints.</b> At <b>${T(ex.fl)}</b> price reached the limit and the indicator prints <b>PO3 ${side} (${nm.tag}) ${pr(ex.entry)}</b> on that candle. Entry ${pr(ex.entry)}, stop ${pr(ex.stop)} (${fm(R)} points of risk), target ${pr(ex.tgt)} (${fm(2*R)} points). With "Show Trade and Draws" on it also draws SL and TP lines. One trade at a time: no new signal until this one hits its stop or target.`},
   {upto:ex.ex,focus:ex.ex,ov:[anchor,...lines(true),tagAt(ex.fl,C[ex.fl][L?'l':'h'],'entry',L?'below':'above',COL.ice),tagAt(ex.ex,C[ex.ex][win?(L?'h':'l'):(L?'l':'h')],win?'target hit':'stopped out',win?(L?'above':'below'):(L?'below':'above'),win?COL.ok:COL.bad)],cap:win?`<b>Step 6 · result: a win.</b> Price ran to the target at <b>${T(ex.ex)}</b>: about <b>+${fm(Math.abs(ex.pts))} points</b> after costs (roughly +2R). The idea played out: a real zone was tapped, the trigger confirmed, and the retest gave a defined stop.`:`<b>Step 6 · result: a loss.</b> Price traded through the stop at <b>${T(ex.ex)}</b>: about <b>−${fm(Math.abs(ex.pts))} points</b>, roughly −1R. This is a valid setup that did not work, and it is built into the maths: the stop was known before the entry, so the loss is the planned size. Size so that a run of losses cannot hurt you.`}];
}

if(typeof IND_CM!=='undefined')IND_CM.forEach(e=>{e.m='cm';e.step=5});
function cmSteps(ex){
  const C=exData(ex),n=C.length,T=i=>hhmm(ex.hm+i*5),pr=x=>fm(x),zc=d=>d===1?COL.ok:COL.bad,ph=(d)=>d===1?'bullish':'bearish';
  const steps=[];
  const sess=ex.se.flatMap(s=>[hlAt(s.hi,s.n+' High',COL.ice,s.i0,{scale:true,pine:1}),hlAt(s.lo,s.n+' Low',COL.ice,s.i0,{scale:true,pine:1})]);
  const tdo=hlAt(ex.tdo[1],'True Day Open',COL.gold,ex.tdo[0],{scale:true,pine:1});
  const tapped=ex.se.flatMap(s=>[s.th!=null?`${s.n} High was taken at ${T(s.th)}`:null,s.tl!=null?`${s.n} Low was taken at ${T(s.tl)}`:null]).filter(Boolean);
  steps.push({upto:n-1,focus:n-30,ov:[...sess,tdo],cap:`<b>Step 1 · the levels.</b> These are the lines Confluence Master draws first. The <b>session highs and lows</b> (Asia 8 PM to midnight, London 2 to 5 AM, New York 7 to 10 AM, all ET) mark where stops sit. A line disappears the moment price taps it. The <b>True Day Open</b> is the midnight ET open: below it price is cheap for the day, above it expensive.${tapped.length?` In this example: ${tapped.slice(0,4).join('; ')}.`:''}`});
  const fv=[...ex.fv.filter(f=>f.flip!=null).slice(0,2),...ex.fv.filter(f=>f.flip==null).slice(0,1)].sort((a,b)=>a.i-b.i);
  fv.forEach(f=>{
    const box=rectAt(f.i,f.i+15,f.bot,f.top,'5m FVG',zc(f.dir),{pine:1,up:f.dir===1});
    steps.push({upto:f.i+2,focus:f.i,ov:[box,boxOf(C,f.c0,f.i-1,COL.ice,.2)],cap:`<b>A ${ph(f.dir)} 5m FVG.</b> At <b>${T(f.i)}</b> the three candles just before it left a gap: candle 1's ${f.dir===1?'wick high':'wick low'} and candle 3's ${f.dir===1?'wick low':'wick high'} do not overlap, between <b>${pr(f.bot)}</b> and <b>${pr(f.top)}</b>. Confluence Master draws a box ${15} candles wide with a tab saying "5m FVG" (green text for bullish, red for bearish). On a 1-minute chart it still uses 5-minute candles, so you always see real 5m structure.`});
    if(f.flip!=null)steps.push({upto:f.flip+3,focus:f.flip,ov:[rectAt(f.i,f.i+15,f.bot,f.top,'5m iFVG',f.dir===1?COL.bad:COL.ok,{pine:1,up:f.dir!==1})],cap:`<b>The gap flips to an iFVG.</b> At <b>${T(f.flip)}</b> a candle <b>closed ${f.dir===1?'below the bottom':'above the top'}</b> of that gap. It is no longer support${f.dir===1?'':' (resistance)'}: the tab changes to "5m iFVG" and the text color flips to ${f.dir===1?'red':'green'}. A close through is what counts, not a wick.`});
    else steps.push({upto:Math.min(n-1,f.i+25),focus:Math.min(n-1,f.i+15),ov:[box],cap:`<b>Still respected.</b> Price has not closed through this gap, so it keeps its original ${ph(f.dir)} tab. Gaps that hold are the ones traders watch for a reaction.`});
  });
  const r=ex.rb[0];
  if(r){const mid=(r.top+r.bot)/2,box=rectAt(r.i,r.i+15,r.bot,r.top,'RB 5m',zc(r.dir),{pine:1,mid:1,up:r.dir===1});
    steps.push({upto:r.i+3,focus:r.i,ov:[box],cap:`<b>A ${ph(r.dir)} Rejection Block.</b> At <b>${T(r.i)}</b> a large candle (more than 1.2 times the average range) had a long ${r.dir===1?'lower':'upper'} wick, at least 55% of its range. The box covers the wick area from ${pr(r.bot)} to ${pr(r.top)} and the dashed line marks its center. The wick shows price pushed there and was rejected.`});
    if(r.flip!=null)steps.push({upto:r.flip+3,focus:r.flip,ov:[rectAt(r.i,r.i+15,r.bot,r.top,'iRB 5m',r.dir===1?COL.bad:COL.ok,{pine:1,mid:1,up:r.dir!==1})],cap:`<b>The block flips to an iRB.</b> At <b>${T(r.flip)}</b> price closed ${r.dir===1?'below':'above'} the block, so the tab changes to "iRB 5m" with the opposite color. Same rule as an iFVG: a close through.`});
    else steps.push({upto:Math.min(n-1,r.i+25),focus:Math.min(n-1,r.i+15),ov:[box],cap:`<b>The block holds.</b> Price has not closed through it, so it stays a rejection block.`});}
  steps.push({upto:n-1,focus:n-30,ov:[...sess,tdo,hlAt(Math.max(...C.map(c=>c.h)),'HOD',COL.ice,ex.tdo[0],{scale:true,pine:1}),hlAt(Math.min(...C.map(c=>c.l)),'LOD',COL.ice,ex.tdo[0],{scale:true,pine:1})],cap:'<b>Putting it together.</b> Confluence Master does not give entries. It shows where orders rest and where price is likely to react: gaps and blocks (and whether they have flipped), the session extremes, the True Day Open and the live HOD and LOD. In ECHO X ORBIT you read the CISD and the fib yourself, and use these zones as the places the model looks for its rejection block and as the draw you target.'});
  return steps;
}
function indLoad(){ensureCharts();$('#v-lab').classList.remove('nochart');$$('[data-tf]').forEach(b=>b.hidden=true);$('#chartHost2').hidden=true;$('.chartcol').classList.remove('dual');TB.set('cursor')}
function indPaint(){
  const ex=IV.list[IV.i],st=IV.steps[IV.step],C=exData(ex);indLoad();CH.size();
  CH.setData(C.slice(0,st.upto+1),{k:1,t0:ex.hm,stepMin:ex.step||1,fit:true});CH.marks=[];CH.taps=new Set();CH.ov=st.ov;
  CH.count=Math.min(80,C.length+3);CH.focus(st.focus);$('#chartTf').textContent=ex.m==='cm'?'5m candles':'1m candles';$('#chartHint').textContent='Drag to pan · scroll to zoom. Prices in these examples are shifted; the shape and times are real.';CH.draw();
}
const IND_GUIDE={
 nyflow:{t:'NYFLOW',sub:'New York session. PO3 at 10 AM (and 2 PM), plus breakout models. Use the 1-minute chart.',items:[
  ['10AM Open','A dashed line at the open of the 10:00 AM candle. The reference for the PO3 model.'],
  ['PO3 LONG / SHORT (10AM) price','Printed on the candle where the retest limit fills. The number is the entry. One setup per session, one trade at a time.'],
  ['SL','Stop loss: the last confirmed swing low (long) or high (short) when the trigger fired.'],
  ['TP1 / TP2 / TP3','Optional fib-grid targets, drawn when "Show Trade and Draws" is on. The indicator\'s own target for PO3 is 2R.'],
  ['Status table','One small table showing each model\'s state (watching, armed, waiting for the retest, in a trade) and the direction. It replaces a pile of "watching" tabs.'],
  ['NY BREAKOUT LONG / SHORT','Breakout models, 1-minute chart only: the 30-minute opening range (with the 4H trend) and the overnight-range breakout. Take these at market on the alert; flat at 4:55 PM ET.'],
  ['H/L MTD','Legacy range-sweep model. Off by default in version 3.1. It is the same idea as the school\'s range, sweep and reversal module.'],
  ['Alerts','PO3 setup alerts, breakout alerts and the H/L alerts can be switched on in settings.']]},
 asiaflow:{t:'ASIAFLOW',sub:'Overnight sessions. PO3 anchored at 6 AM ET, plus A3IA at the 8 PM open. Use the 1-minute chart.',items:[
  ['6AM Open','A dashed line at the open of the 6:00 AM candle. The PO3 reference. It fires in the London and pre-New York hours.'],
  ['PO3 LONG / SHORT (6AM) price','Printed on the candle where the retest limit fills. Same mechanics as NYFLOW: tapped zone, trigger, limit at 0.79, 2R target.'],
  ['A3IA','The Asia model at the 8 PM open: a key level, the manipulation into it, and a gap close for confirmation. Version 1.8: fixed 1.5R target, 4H trend of at least 0.5, and it must trigger within 90 minutes of the open.'],
  ['SL / TP','Stop at the structural swing, and the target as configured (2R for PO3, 1.5R for A3IA).'],
  ['Status table','The state of each model and its direction.']]},
 cm:{t:'Confluence Master',sub:'The map of where price is likely to react: gaps, rejection blocks, sessions and levels.',items:[
  ['5m FVG','A fair value gap box, drawn when three candles leave a gap (candle 1\'s wick and candle 3\'s wick do not overlap). Green text: bullish. Red text: bearish. Built from 5-minute candles even on the 1-minute chart.'],
  ['5m iFVG','The same gap after price has CLOSED through it. The tab flips to the opposite color: the gap now works the other way.'],
  ['RB 5m','Rejection Block: a large candle with a long wick (at least 55% of its range, 1.2 times the average range). The box covers the wick and a dashed midline marks the center.'],
  ['iRB 5m','A rejection block that price has closed through. It flips color like an iFVG.'],
  ['FS','Failure Swing (1H and 4H charts only): price runs past the last swing high or low and closes back inside.'],
  ['EQH / EQL','Equal highs or lows (4H and daily charts only): two swing points within a small tolerance, joined by a line. Liquidity that price is often drawn to.'],
  ['Asia / London / New York High and Low','Session extremes from the last 24 hours (8 PM to midnight, 2 to 5 AM, 7 to 10 AM ET). The line disappears once price taps it.'],
  ['True Day Open','The open at midnight New York time. Below it, price is cheap for the day; above it, expensive.'],
  ['HOD / LOD','The live high and low of the current day. Reset every midnight ET.']]}};
function indPanel(){
  const box=$('#lesson'),g=IND_GUIDE[IV.ind],ex=IV.list[IV.i];
  const seg=`<div class="seg">${[['nyflow','NYFLOW'],['asiaflow','ASIAFLOW'],['cm','Confluence Master']].map(([k,t])=>`<button type="button" data-iv="${k}" class="${IV.ind===k?'on':''}">${t}</button>`).join('')}</div>`;
  let body='',foot='';
  if(IV.mode==='guide'){
    const has=IV.list.length>0||IV.ind!=='cm';
    body=`<p class="muted">${g.sub}</p><h3>What is on the chart, and what it means</h3><div>${g.items.map(([a,b])=>`<div class="rev"><p><b>${esc(a)}</b></p><p>${esc(b)}</p></div>`).join('')}</div>`;
    foot=has?`<button class="btn primary" data-ivgo="list">See real examples →</button>${IV.ind!=='cm'?'<button class="btn" data-ivgo="turn">Your turn: spot the signal</button>':''}`:'';
  }else if(IV.mode==='list'){
    body=`<p class="muted">Real NQ sessions with the indicator's logic applied. Prices are shifted and dates removed. Pick one and step through why it printed.</p><div class="kv">${IV.list.map((e,i)=>`<button type="button" class="chip" data-ivex="${i}" style="cursor:pointer">${e.m==='cm'?`Day ${i+1}`:`${i+1} · ${e.dir===1?'long':'short'} · ${e.trig.split('+')[0].toUpperCase()}`}</button>`).join('')}</div>`;
    foot=`<button class="btn" data-ivgo="guide">← Notation guide</button>`;
  }else if(IV.mode==='walk'){
    body=`<div class="hud">Example ${IV.i+1} of ${IV.list.length} · ${ex.m==='cm'?'Confluence Master · 5m':indName(ex).model+' · '+(ex.dir===1?'long':'short')}</div><div class="cap" style="margin-top:8px">${IV.steps[IV.step].cap}</div><div class="kv" style="margin-top:10px">${IV.steps.map((_,i)=>`<span class="chip ${i===IV.step?'live':i<IV.step?'ok':''}">${i+1}</span>`).join('')}</div>`;
    foot=`<button class="btn" data-ivprev ${IV.step===0?'disabled':''}>← Back</button><button class="btn ghost" data-ivgo="list">All examples</button><button class="btn primary" data-ivnext>${IV.step===IV.steps.length-1?'Next example →':'Next ▸'}</button>`;
  }
  box.innerHTML=`<div class="les-h"><div class="hud">Indicator Lab</div><div class="h">${g.t}</div><div style="margin-top:10px">${seg}</div></div><div class="les-b">${body}</div><div class="les-f">${foot}</div>`;
}
function indOpen(){
  PV='ind';$('#v-lab').classList.remove('nochart');
  IV.list=IV.ind==='cm'?(typeof IND_CM!=='undefined'?IND_CM:[]):(typeof IND_PO3!=='undefined'?IND_PO3.filter(e=>e.m==='ny'?IV.ind==='nyflow':IV.ind==='asiaflow'):[]);
  if(IV.mode==='walk'&&!IV.list.length)IV.mode='guide';
  if(IV.mode==='guide'||IV.mode==='list'){indLoad();CH.size();CH.setData([{o:100,h:100,l:100,c:100}],{k:1,t0:540,stepMin:1,fit:true});CH.ov=[];CH.draw()}
  else indPaint();
  indPanel();
}
document.addEventListener('click',e=>{
  if(typeof PV==='undefined'||PV!=='ind')return;const t=e.target;let b;
  if((b=t.closest('[data-iv]'))){IV.ind=b.dataset.iv;IV.mode='guide';return indOpen()}
  if((b=t.closest('[data-ivgo]'))){const m=b.dataset.ivgo;if(m==='turn'){PR.topic='ind';PV='tasks';setTab('tasks');return pracNext()}IV.mode=m;return indOpen()}
  if((b=t.closest('[data-ivex]'))){IV.i=+b.dataset.ivex;IV.steps=(IV.list[IV.i].m==='cm'?cmSteps:poSteps)(IV.list[IV.i]);IV.step=0;IV.mode='walk';return indOpen()}
  if(t.closest('[data-ivprev]')){IV.step=Math.max(0,IV.step-1);indPaint();return indPanel()}
  if(t.closest('[data-ivnext]')){if(IV.step<IV.steps.length-1)IV.step++;else{IV.i=(IV.i+1)%IV.list.length;IV.steps=(IV.list[IV.i].m==='cm'?cmSteps:poSteps)(IV.list[IV.i]);IV.step=0}indPaint();return indPanel()}
});
/* "Your turn" tasks built from the same examples */
function indItem(r){
  const pool=typeof IND_PO3!=='undefined'?IND_PO3:[];if(!pool.length)return null;
  const ex=pick(r,pool),C=exData(ex),L=ex.dir===1,nm=indName(ex),k=pick(r,['trig','lvl','tgt']),T=i=>hhmm(ex.hm+i);
  const anchor=hlAt(ex.anchor,nm.open,COL.sig,ex.ai,{scale:true}),zone=ex.zone[1]===ex.zone[2]?hlAt(ex.zone[1],ex.zone[0],COL.lag,Math.max(0,ex.tp-12),{scale:true,dash:true}):rectAt(Math.max(0,ex.tp-12),ex.tp+3,ex.zone[2],ex.zone[1],ex.zone[0],COL.lag,{dash:true});
  const base={t0:ex.hm,step:1};
  if(k==='trig')return{...base,kind:'tap',many:false,topic:`Indicator · ${nm.model}`,q:`${nm.model} on the 1-minute chart. Price tapped the marked ${ex.zone[0]} after the ${nm.ses} open. Click the candle where a ${L?'bullish':'bearish'} TRIGGER confirms and the setup arms (${ex.trig.split('+').map(t=>(TRIG[t]||[t])[0]).join(' + ')}).`,C:C.slice(0,ex.sg+4),ov:[anchor,zone],want:[ex.sg],
    why:`The trigger fired at ${T(ex.sg)}: ${ex.trig.split('+').map(t=>(TRIG[t]||[t,''])[0]+' ('+(TRIG[t]||['',''])[1]+')').join('; ')}. That arms the setup; the entry is a retest limit, not the trigger candle.`};
  const tolE=Math.max(0.75,ex.R*0.3);
  if(k==='lvl')return{...base,kind:'level',topic:`Indicator · ${nm.model}`,q:`The setup has armed on the marked candle. Place the RETEST LIMIT (79% of the way from the trigger candle's close back toward the stop) and the STOP (the last swing ${L?'low':'high'}).`,C:C.slice(0,ex.sg+1),ov:[anchor,zone],truth:[{p:ex.entry,tol:tolE,label:'retest limit'},{p:ex.stop,tol:tolE,label:'stop'}],
    why:`Stop ${fm(ex.stop)} is the last confirmed swing ${L?'low':'high'}. The limit ${fm(ex.entry)} = close − (close − stop) × 0.79 (for a long). Risk is ${fm(ex.R)} points.`};
  return{...base,kind:'level',topic:`Indicator · ${nm.model}`,q:`Your limit filled at ${fm(ex.entry)} with the stop at ${fm(ex.stop)} (${fm(ex.R)} points of risk). Place the TARGET at 2R.`,C:C.slice(0,ex.fl+1),ov:[anchor,hlAt(ex.entry,'entry',COL.ice,ex.fl,{scale:true}),hlAt(ex.stop,'stop',COL.bad,ex.fl,{scale:true})],truth:[{p:ex.tgt,tol:Math.max(1.5,ex.R*0.4),label:'target (2R)'}],
    why:`2R target = entry ${L?'+':'−'} 2 × ${fm(ex.R)} = ${fm(ex.tgt)}.`};
}
