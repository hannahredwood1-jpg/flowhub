/* ============================================================
   INDICATOR LAB (practice page only): step-by-step walkthroughs of ESC VLCTY and Confluence Master on real NQ sessions.
   Prices in the examples are shifted by a fixed offset and carry no dates, so only the shape and the time of day are real.
   ESC VLCTY examples are drawn on 5-minute candles so a whole session fits; the signal times (09:44, 09:59 ... and 18:29) are all 5-minute closes.
============================================================ */
const IV={ind:'esc',mode:'guide',list:[],i:0,step:0,steps:[]};
const exData=ex=>{if(!ex._C){ex._C=[];for(let i=0;i<ex.b.length;i+=4)ex._C.push({o:ex.p0+ex.b[i]/4,h:ex.p0+ex.b[i+1]/4,l:ex.p0+ex.b[i+2]/4,c:ex.p0+ex.b[i+3]/4})}return ex._C};
const ESCOL={line:'#9aa0ad',ent:'#2962ff',sl:'#f23645',tp:'#089981'};
const sgn=d=>(d>=0?'+':'−')+Math.abs(d).toFixed(2);
const escAdd=ex=>ex.m==='cm'?null:ex;
const escName=ex=>({sess:ex.m==='ny'?'New York':'Asia',tag:ex.m==='ny'?'NY':'ASIA',side:ex.dir===1?'LONG':ex.dir===-1?'SHORT':''});
const escT=(ex,i)=>hhmm(ex.hm+i*5),escC=(ex,i)=>hhmm(ex.hm+i*5+4);
const escTrig=ex=>ex.m==='ny'?{L:.40,S:.20}:{L:.04,S:.10};
const escSize=(ex,risk=500)=>{const n=Math.max(1,Math.floor(risk*ex.w/(ex.R*2)));return{n,risk:n*ex.R*2}};
const escAnchor=ex=>hlAt(ex.anc,'16:00 close (anchor)',COL.ice,0,{scale:true,pine:1,pcol:ESCOL.line,pdash:1,pleft:1});
const escTrigLines=ex=>{const t=escTrig(ex),i0=ex.m==='ny'?12:0,u=ex.U;return[hlAt(ex.anc+t.L*u,'LONG ≥ +'+t.L.toFixed(2)+' U',COL.ice,i0,{scale:true,pine:1,pcol:ESCOL.line,pdot:1}),hlAt(ex.anc-t.S*u,'SHORT ≤ −'+t.S.toFixed(2)+' U',COL.ice,i0,{scale:true,pine:1,pcol:ESCOL.line,pdot:1})]};
const escBox=(ex,C,ok,upto)=>{const c=C[upto].c,i0=ex.m==='ny'?12:0,d=(c-ex.anc)/ex.U,tx=ex.m==='ny'?`NY ${sgn(d)} U ${ok?'✓':'✗'}`:`ASIA gap ${sgn(ex.gap)} U ${ok?'✓':'✗ no trade'}`;
  return{...rectAt(i0,upto,Math.min(ex.anc,c),Math.max(ex.anc,c),tx,COL.ice,{pine:1,pfill:1,pcol:ESCOL.line}),tab:'#2a2e39'}};
const escLabel=(ex,i,res)=>{const n=escName(ex),z=escSize(ex);return{t:'lab',i,p:ex.e,al:'right',bg:'rgba(41,98,255,.85)',tc:'#fff',lines:[`${n.tag} ${n.side}  ·  ${Math.round(ex.w*100)}% size`,`E ${fm(ex.e)}  SL ${fm(ex.stop)}  TP ${fm(ex.tgt)}  ·  R:R ${ex.rr.toFixed(2)}`,`${z.n} MNQ · risk $${fm(z.risk,0)}  ·  ${res||'LIVE'}`]}};
const escRes=ex=>`${ex.how==='target'?'TARGET':ex.how==='stop'?'STOP':'TIME'} ${ex.rm>=0?'+':''}${ex.rm.toFixed(2)}R  ($${ex.rm>=0?'+':'−'}${fm(Math.abs(ex.rm*ex.R*2*escSize(ex).n),0)})`;
const escLines=(ex,i1)=>[hlAt(ex.e,'entry',COL.ice,ex.en,{scale:true,pine:1,pcol:ESCOL.ent,pdash:1,pleft:1,i1}),hlAt(ex.stop,'stop',COL.bad,ex.en,{scale:true,pine:1,pcol:ESCOL.sl,pdot:1,pleft:1,i1}),hlAt(ex.tgt,'target',COL.ok,ex.en,{scale:true,pine:1,pcol:ESCOL.tp,pdot:1,pleft:1,i1})];
function escSteps(ex){
  const C=exData(ex),n=escName(ex),NY=ex.m==='ny',t=escTrig(ex),u=ex.U,st=[],pr=fm,fx=(x,d=1)=>fm(x,d);
  const first=NY?13:1,box=()=>escBox(ex,C,ex.k!=='none',ex.sg!=null?ex.sg:C.length-1);
  st.push({upto:first,focus:first,ov:[escAnchor(ex)],cap:`<b>Step 1 · the anchor and U.</b> Everything is measured from the <b>previous 16:00 New York close</b>: <b>${pr(ex.anc)}</b> (the dashed line). <b>U</b> is the average high-to-low range of the last 10 daily sessions: here <b>${fx(u)} points</b>. Every distance and every stop is a fraction of U, so 0.10 U is ${fx(u*.1)} points, 0.40 U is ${fx(u*.4)} and so on.`});
  st.push({upto:first,focus:first,ov:[escAnchor(ex),...escTrigLines(ex)],cap:NY?`<b>Step 2 · the trigger lines.</b> From 09:30 the indicator draws two dotted lines. <b>Long</b> if price is at least <b>+0.40 U</b> above the anchor (<b>${pr(ex.anc+.4*u)}</b>). <b>Short</b> if it is at least <b>0.20 U</b> below (<b>${pr(ex.anc-.2*u)}</b>). Between the two lines nothing qualifies.`:`<b>Step 2 · the gap lines.</b> At 18:00 the session reopens. The indicator draws a <b>long line at +0.04 U</b> (${pr(ex.anc+.04*u)}) and a <b>short line at −0.10 U</b> (${pr(ex.anc-.1*u)}). The <b>gap</b> is where the 18:00 open sits against the 16:00 close, here <b>${sgn(ex.gap)} U</b>. It only decides at the close of the 18:29 candle.`});
  if(ex.k==='none'){
    const last=NY?C.length-1:5;
    st.push({upto:last,focus:NY?last-20:last,ov:[escAnchor(ex),...escTrigLines(ex),...(NY?[]:[escBox(ex,C,false,5)]),...(NY?ex.chk.map(([h,d])=>{const k=Math.floor((h-ex.hm)/5);return{...tagAt(k,C[k].c,sgn(d)+' U',d>=0?'above':'below',COL.ice),pine:1,bg:'#2a2e39',tc:'#fff',tiny:1}}):[])],
      cap:NY?`<b>Step 3 · every check, no trade.</b> The 21 checks (09:44, 09:59 ... 14:44) all read between the two lines. The highest was ${sgn(Math.max(...ex.chk.map(c=>c[1])))} U and the lowest ${sgn(Math.min(...ex.chk.map(c=>c[1])))} U, so <b>nothing qualified and the New York half takes no trade today</b>. About ten percent of days have no trade at all, and that is normal.`:`<b>Step 3 · the 18:29 decision: no trade.</b> The gap is <b>${sgn(ex.gap)} U</b>: less than +0.04 U up and less than 0.10 U down, so the label reads <b>"ASIA gap ${sgn(ex.gap)} U ✗ no trade"</b>. Many Asia nights show that cross.`});
    st.push({upto:last,focus:NY?last-20:last,ov:[escAnchor(ex),...escTrigLines(ex)],cap:'<b>Step 4 · what to do.</b> Nothing. The plan has no discretion: no signal, no trade. Do not invent a setup because the chart looks active, and do not force a trade to "make the day count". Skipping is part of the system.'});
    return st}
  const ck=NY?ex.chk.map(([h,d])=>{const k=Math.floor((h-ex.hm)/5);return{...tagAt(k,C[k].c,sgn(d)+' U'+(k===ex.sg?' ✓':''),d>=0?'above':'below',COL.ice),pine:1,bg:k===ex.sg?'#0e5a35':'#2a2e39',tc:'#fff',tiny:1}}):[];
  const thr=NY?(ex.dir===1?'+0.40 U':'−0.20 U'):(ex.dir===1?'+0.04 U':'−0.10 U'),d3=NY?ex.chk[ex.chk.length-1][1]:ex.gap;
  st.push({upto:ex.sg,focus:ex.sg,ov:[escAnchor(ex),...escTrigLines(ex),box(),...ck],cap:NY?`<b>Step 3 · the check fires.</b> At the close of the <b>${escC(ex,ex.sg)}</b> candle (checks run every 15 minutes) price is <b>${sgn(d3)} U</b> from the anchor. ${ex.chk.length>1?`The earlier check${ex.chk.length>2?'s':''} read ${ex.chk.slice(0,-1).map(c=>sgn(c[1])+' U').join(', ')}, none far enough. `:'It is the first check of the day. '}This is the <b>first check to reach ${thr}</b>, so it takes the ${n.side.toLowerCase()}. The grey box shows how far price travelled: <b>"NY ${sgn(d3)} U ✓"</b>.`:`<b>Step 3 · the 18:29 decision.</b> At the close of the 18:29 candle the gap is <b>${sgn(ex.gap)} U</b>, ${ex.dir===1?`at least +0.04 U: a <b>long</b>${ex.w===1?' at full size (the gap is +0.10 U or more)':' at <b>half size</b> (the gap is under +0.10 U)'}`:'at least 0.10 U down: a <b>short</b> at a quarter of the size'}. The box labels the night <b>"ASIA gap ${sgn(ex.gap)} U ✓"</b>.`});
  const z=escSize(ex);
  st.push({upto:ex.en,focus:ex.en,from:Math.max(-1,ex.en-14),ov:[escAnchor(ex),box(),...escLines(ex,ex.en+2),escLabel(ex,ex.en+2)],cap:`<b>Step 4 · the order.</b> The signal candle had to close first, so the entry is at the <b>open of the next candle</b>, a <b>market order</b>, plus one tick of slippage: <b>${pr(ex.e)}</b>. The <b>stop</b> is ${ex.st} U = <b>${fx(ex.R)} points</b> away (${pr(ex.stop)}) and the <b>target</b> is ${ex.rr} × the stop = <b>${fx(ex.R*ex.rr)} points</b> (${pr(ex.tgt)}). Size is <b>${Math.round(ex.w*100)}%</b> of full risk${ex.w<1?' because '+(ex.dir===-1?'shorts carry less edge':'the gap was small'):''}: with $500 of full risk on MNQ that is <b>${z.n} contract${z.n>1?'s':''}</b> (about $${fm(z.risk,0)}).`});
  const hit=ex.how==='target'?`<b>Step 5 · the target fills.</b> Price traded one tick through <b>${pr(ex.tgt)}</b> at ${escT(ex,ex.ex)}. Result <b>${escRes(ex)}</b>. The target is ${ex.rr} × the stop, so a winner pays more than a loser costs.`:ex.how==='stop'?`<b>Step 5 · the stop is hit.</b> Price traded through <b>${pr(ex.stop)}</b> at ${escT(ex,ex.ex)} and the stop filled one tick worse. Result <b>${escRes(ex)}</b>. That is a normal losing trade: the signal was valid, the loss was the planned 1 R (a little more with slippage and costs), and the plan does nothing different afterwards.`:`<b>Step 5 · the time exit.</b> Neither the stop nor the target was hit by ${NY?'15:54':'02:59'}, so the trade is closed flat at the close of that candle. Result <b>${escRes(ex)}</b>. ${NY?'':'Asia trades often end like this: they run for hours and the clock closes them.'}`;
  st.push({upto:ex.ex,focus:ex.ex,from:Math.max(-1,ex.en-8),count:Math.max(70,Math.min(125,ex.ex-ex.en+18)),ov:[escAnchor(ex),box(),...escLines(ex,ex.ex),escLabel(ex,ex.en+2,escRes(ex)),{...tagAt(ex.ex,ex.px,ex.how==='target'?'TARGET':ex.how==='stop'?'STOP':'TIME',ex.dir===1?(ex.px>=ex.e?'above':'below'):(ex.px<=ex.e?'below':'above'),COL.ok),pine:1,bg:ex.rm>=0?'#0e5a35':'#6a1b24',tc:'#fff'}],cap:hit});
  st.push({upto:ex.ex,focus:ex.ex,from:Math.max(-1,ex.en-8),count:Math.max(70,Math.min(125,ex.ex-ex.en+18)),ov:[escAnchor(ex),box(),...escLines(ex,ex.ex)],cap:`<b>Step 6 · what to take from it.</b> ${NY?'A New York trade':'An Asia trade'} is the same four steps every time: <b>measure from the anchor, scale by U, enter at market on the next open, stop in at once</b>, then let the stop, the target or the clock end it. ${ex.dir===-1?'Shorts are traded small on purpose.':ex.w<1?'Smaller gaps get smaller size.':''} Journal the signal time, the fill and the result, so you can compare your real fills with the chart.`});
  return st}

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
  CH.setData(C.slice(0,st.upto+1),{k:1,t0:ex.hm,stepMin:5,fit:true});CH.marks=[];CH.taps=new Set();CH.ov=st.ov;
  CH.count=st.count||Math.min(70,C.length+3);CH.focus(st.focus);if(ex.m!=='cm')CH.from=st.from!=null?st.from:Math.max(-1,st.focus-CH.count*.62);$('#chartTf').textContent='5m candles';$('#chartHint').textContent='Drag to pan · scroll to zoom. Prices in these examples are shifted; the shape and times are real.';CH.draw();
}
const IND_GUIDE={
 esc:{t:'ESC VLCTY',sub:'One indicator for New York and Asia, measured from the previous 16:00 close. On TradingView use the 1-minute chart. The examples here are drawn on 5-minute candles so a whole session fits.',items:[
  ['16:00 close','A dashed grey line: the previous 16:00 New York close, the anchor everything is measured from.'],
  ['LONG ≥ +0.40 U / SHORT ≤ −0.20 U','Dotted trigger lines for New York, drawn at 09:30. U is the average daily range of the last 10 sessions.'],
  ['LONG ≥ +0.04 U / SHORT ≤ −0.10 U','The Asia gap lines, drawn at 18:00. The Asia half decides once, at the close of the 18:29 candle.'],
  ['The grey box and its tab','The measuring box. "NY +0.45 U ✓" is how far price travelled from the anchor at the signal candle. "ASIA gap +0.12 U ✓" is a trade; "✗ no trade" means the gap was too small.'],
  ['Blue dashed / red dotted / green dotted','The entry, the stop and the target. The entry is a market order on the open of the candle after the signal.'],
  ['The trade label','Direction, size (% of full risk), entry, stop, target and R:R, then contracts and dollars at risk, a live P&L, and finally the result: TARGET, STOP or TIME.'],
  ['⚠ above your $X','Even one contract risks more than the amount you chose (typical on NQ with a small account). Use MNQ, a bigger mode knowingly, or skip.'],
  ['VWAP and bands','Drawn from the 18:00 open for reference only. They never change a trade.'],
  ['Alerts','One alert covers both sessions: a message when a trade starts (direction, stop, target, contracts) and when it ends.']]},
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
const indSteps=ex=>ex.m==='cm'?cmSteps(ex):escSteps(ex);
const indTitle=e=>e.m==='cm'?'Confluence Master · 5m':`ESC VLCTY · ${escName(e).sess}${e.k==='none'?' · no trade':' '+(e.dir===1?'long':'short')}`;
function indPanel(){
  const box=$('#lesson'),g=IND_GUIDE[IV.ind],ex=IV.list[IV.i];
  const seg=`<div class="seg">${[['esc','ESC VLCTY'],['cm','Confluence Master']].map(([k,t])=>`<button type="button" data-iv="${k}" class="${IV.ind===k?'on':''}">${t}</button>`).join('')}</div>`;
  let body='',foot='';
  if(IV.mode==='guide'){
    body=`<p class="muted">${g.sub}</p><h3>What is on the chart, and what it means</h3><div>${g.items.map(([a,b])=>`<div class="rev"><p><b>${esc(a)}</b></p><p>${esc(b)}</p></div>`).join('')}</div>`;
    foot=`<button class="btn primary" data-ivgo="list">See real examples →</button>${IV.ind==='esc'?'<button class="btn" data-ivgo="turn">Your turn: read the signal</button>':''}`;
  }else if(IV.mode==='list'){
    body=`<p class="muted">Real NQ sessions with the indicator's rules applied. Prices are shifted and dates removed. Pick one and step through why it printed, or why it stayed quiet.</p><div class="kv">${IV.list.map((e,i)=>`<button type="button" class="chip" data-ivex="${i}" style="cursor:pointer">${e.m==='cm'?`Day ${i+1}`:`${i+1} · ${escName(e).tag} ${e.k==='none'?'no trade':e.dir===1?'long':'short'}`}</button>`).join('')}</div>`;
    foot=`<button class="btn" data-ivgo="guide">← Notation guide</button>`;
  }else if(IV.mode==='walk'){
    body=`<div class="hud">Example ${IV.i+1} of ${IV.list.length} · ${indTitle(ex)}</div><div class="cap" style="margin-top:8px">${IV.steps[IV.step].cap}</div><div class="kv" style="margin-top:10px">${IV.steps.map((_,i)=>`<span class="chip ${i===IV.step?'live':i<IV.step?'ok':''}">${i+1}</span>`).join('')}</div>`;
    foot=`<button class="btn" data-ivprev ${IV.step===0?'disabled':''}>← Back</button><button class="btn ghost" data-ivgo="list">All examples</button><button class="btn primary" data-ivnext>${IV.step===IV.steps.length-1?'Next example →':'Next ▸'}</button>`;
  }
  box.innerHTML=`<div class="les-h"><div class="hud">Indicator Lab</div><div class="h">${g.t}</div><div style="margin-top:10px">${seg}</div></div><div class="les-b">${body}</div><div class="les-f">${foot}</div>`;
}
function indOpen(){
  PV='ind';$('#v-lab').classList.remove('nochart');
  IV.list=IV.ind==='cm'?(typeof IND_CM!=='undefined'?IND_CM:[]):(typeof IND_ESC!=='undefined'?IND_ESC:[]);
  if(IV.mode==='walk'&&!IV.list.length)IV.mode='guide';
  if(IV.mode==='guide'||IV.mode==='list'){indLoad();CH.size();CH.setData([{o:100,h:100,l:100,c:100}],{k:1,t0:540,stepMin:1,fit:true});CH.ov=[];CH.draw()}
  else indPaint();
  indPanel();
}
document.addEventListener('click',e=>{
  if(typeof PV==='undefined'||PV!=='ind')return;const t=e.target;let b;
  if((b=t.closest('[data-iv]'))){IV.ind=b.dataset.iv;IV.mode='guide';return indOpen()}
  if((b=t.closest('[data-ivgo]'))){const m=b.dataset.ivgo;if(m==='turn'){PR.topic='ind';PV='tasks';setTab('tasks');return pracNext()}IV.mode=m;return indOpen()}
  if((b=t.closest('[data-ivex]'))){IV.i=+b.dataset.ivex;IV.steps=indSteps(IV.list[IV.i]);IV.step=0;IV.mode='walk';return indOpen()}
  if(t.closest('[data-ivprev]')){IV.step=Math.max(0,IV.step-1);indPaint();return indPanel()}
  if(t.closest('[data-ivnext]')){if(IV.step<IV.steps.length-1)IV.step++;else{IV.i=(IV.i+1)%IV.list.length;IV.steps=indSteps(IV.list[IV.i]);IV.step=0}indPaint();return indPanel()}
});
/* "Your turn" tasks built from the same examples */
function indItem(r){
  const pool=typeof IND_ESC!=='undefined'?IND_ESC:[];if(!pool.length)return null;
  const ex=pick(r,pool),C=exData(ex),n=escName(ex),NY=ex.m==='ny',base={t0:ex.hm,step:5},topic='Indicator · ESC VLCTY',T=i=>escT(ex,i);
  const kinds=ex.k==='none'?['call']:NY?['tap','dist','call','lvl','size']:['dist','call','lvl','size'],k=pick(r,kinds);
  const upto=NY?ex.sg:5,anchor=escAnchor(ex),trig=escTrigLines(ex);
  if(k==='tap'&&NY)return{...base,kind:'tap',many:false,topic,q:`New York on the 1-minute chart (drawn on 5-minute candles). The indicator checks at the close of the 09:44, 09:59, 10:14 ... candles. Click the check candle where the FIRST ${n.side.toLowerCase()} signal fires.`,C:C.slice(0,Math.min(C.length,ex.sg+10)),ov:[anchor,...trig],want:[ex.sg],
    why:`The check at ${escC(ex,ex.sg)} reads ${sgn(ex.chk[ex.chk.length-1][1])} U from the anchor, the first check to reach ${ex.dir===1?'+0.40 U':'−0.20 U'}. The first qualifying check takes the trade; the entry is the open of the next candle.`};
  if(k==='dist'){const c=C[upto].c,d=(c-ex.anc)/ex.U;
    return{...base,kind:'num',topic,q:NY?`The check candle at ${escC(ex,ex.sg)} closed at ${fm(c)}. The 16:00 close (anchor) was ${fm(ex.anc)} and U is ${fm(ex.U)} points. How far from the anchor is price, in U (two decimals, minus if below)?`:`The 18:00 open was ${fm(C[0].o)}. The 16:00 close (anchor) was ${fm(ex.anc)} and U is ${fm(ex.U)} points. What is the gap in U (two decimals, minus if below)?`,
      ans:NY?Math.round(d*100)/100:ex.gap,unit:'U',tol:.02,why:NY?`(${fm(c)} − ${fm(ex.anc)}) ÷ ${fm(ex.U)} = ${sgn(d)} U.`:`(${fm(C[0].o)} − ${fm(ex.anc)}) ÷ ${fm(ex.U)} = ${sgn(ex.gap)} U.`}}
  if(k==='call'){const d=NY?(ex.chk?ex.chk[ex.chk.length-1][1]:0):ex.gap,L=NY?.40:.04,S=NY?.20:.10,ans=ex.k==='none'?'No trade':d>=L?(NY||ex.w===1?'Long':'Long, half size'):'Short, quarter size';
    const opts=NY?['Long','Short, quarter size','No trade']:['Long','Long, half size','Short, quarter size','No trade'];
    return{...base,kind:'mcq',topic,q:NY?`New York check at ${NY&&ex.k==='none'?'14:44, the last check of the day':escC(ex,ex.sg)}: price is ${sgn(d)} U from the anchor. Earlier checks ${ex.k==='none'?'also stayed between the lines':'did not qualify'}. What does the New York half do?`:`Asia 18:29 close: the gap is ${sgn(d)} U (long ≥ +0.04 U, short ≤ −0.10 U, +0.10 U or more is full size). What does the Asia half do?`,
      o:[ans,...opts.filter(x=>x!==ans)],why:NY?(ex.k==='none'?`Between −0.20 U and +0.40 U nothing qualifies, so there is no New York trade.`:`${sgn(d)} U is ${d>=L?'at least +0.40 U: a long':'at least 0.20 U below: a short (quarter size)'}.`):(ex.k==='none'?`The gap is smaller than +0.04 U up and 0.10 U down: no trade tonight.`:`${d>=L?(ex.w===1?'+0.10 U or more: a full-size long.':'At least +0.04 U but under +0.10 U: a half-size long.'):'0.10 U or more down: a quarter-size short.'}`)}}
  if(k==='lvl'){const tol=Math.max(1.5,ex.R*.2);
    return{...base,kind:'level',topic,q:`${n.tag} ${n.side} fired. Entry (market) was ${fm(ex.e)} and U is ${fm(ex.U)} points. Place the STOP (${ex.st} U from the entry) and the TARGET (${ex.rr} × the stop).`,C:C.slice(0,ex.en+1),ov:[anchor,hlAt(ex.e,'entry',COL.ice,ex.en,{scale:true,pine:1,pcol:ESCOL.ent,pdash:1,pleft:1})],truth:[{p:ex.stop,tol,label:'stop'},{p:ex.tgt,tol,label:'target'}],
      why:`Stop = ${ex.st} × ${fm(ex.U)} = ${fm(ex.R)} points from ${fm(ex.e)}: ${fm(ex.stop)}. Target = ${ex.rr} × ${fm(ex.R)} = ${fm(ex.R*ex.rr)} points: ${fm(ex.tgt)}.`}}
  const risk=pick(r,[200,375,500,750]),z=Math.max(1,Math.floor(risk*ex.w/(ex.R*2)));
  return{...base,kind:'num',topic,q:`${n.tag} ${n.side}: the stop is ${fm(ex.R)} points and this trade is ${Math.round(ex.w*100)}% of full size. Your full-size risk is $${risk} on MNQ ($2 a point). How many contracts, rounded down (minimum 1)?`,ans:z,unit:'',tol:.01,
    why:`$${risk} × ${ex.w} ÷ (${fm(ex.R)} × $2) = ${(risk*ex.w/(ex.R*2)).toFixed(2)}, rounded down to ${z}${z===1&&risk*ex.w/(ex.R*2)<1?' (the minimum is 1; the indicator warns if that is more than you wanted)':''}.`};
}
