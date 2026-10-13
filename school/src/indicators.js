/* ============================================================
   INDICATOR LAB (practice page only): step-by-step walkthroughs of ESC VLCTY and Confluence Master on real NQ sessions.
   Prices in the examples are shifted by a fixed offset and carry no dates, so only the shape and the time of day are real.
   ESC VLCTY examples are drawn on 5-minute candles so a whole session fits; the signal times (09:44, 09:59 ... and 18:29) are all 5-minute closes.
============================================================ */
const IV={ind:'inv',mode:'guide',list:[],i:0,step:0,steps:[]};
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

/* ---------- INVERTIX (matches INVERTIX 3.0): grey sponsor box, FLIP tab, one-line entry tab, text beside each line, STEP lines (1-minute candles) ---------- */
const INVC={ent:'#4b5260',sl:'#e0e3eb',tp:'#9aa1af',be:'#7d8492',cisd:'#a8b3c4',key:'#7d8da3'};
const invSize=(ex,risk=500)=>Math.max(1,Math.floor(risk/(ex.R*2)));
const invHow={target:'TARGET',stop:'STOP',be:'BREAK-EVEN',lock:'LOCKED PROFIT',time:'TIME'};
const invRes=ex=>{const n=invSize(ex);return `${invHow[ex.how]} ${ex.rm>=0?'+':''}${ex.rm.toFixed(2)}R (${ex.rm>=0?'+':'−'}$${fm(Math.abs(ex.rm*ex.R*2*n),0)})`};
const invTp=ex=>ex.tp!=null?ex.tp:ex.e+ex.dir*ex.R;
const invTxt=(i,p,t,c)=>({t:'lab',i,p,al:'right',bg:'rgba(0,0,0,0)',tc:c,tiny:1,lines:[t]});
const invStepTxt=(ex,q,lv,trig,done,last)=>{const lr=Math.abs(lv-ex.e)/ex.R,mv=lr<.01?'break-even':'+'+(Math.round(lr*100)/100)+'R';return done?`✓ STEP ${q} done · stop now ${fm(last)}`:`STEP ${q} · ${fm(trig)} · touch it and MOVE YOUR STOP to ${mv} (${fm(lv)})`};
/* lines and the text beside them; x = where the texts sit (3 candles after the entry while the trade is live, the exit candle once it has finished) */
const invLevels=(ex,i1,final,xo)=>{const L=ex.dir===1,R=ex.R,n=invSize(ex),risk=n*R*2,mv=ex.moves||[],e=ex.e,x=xo!=null?xo:final?ex.ex:ex.en+3,fx=(v)=>fm(v),tp=invTp(ex);
  const P=(p,c,w,x2={})=>hlAt(p,'',COL.ice,ex.en,{scale:true,pine:1,pcol:c,pleft:1,i1,pw:w,...x2}),out=[];
  const moved=mv.length&&final,last=moved?mv[mv.length-1]:null,slp=moved?last[1]:ex.stop,slc=moved?(Math.abs(last[1]-e)<.3?INVC.be:INVC.tp):INVC.sl;
  out.push(P(e,INVC.ent,1),P(slp,slc,2));
  out.push(invTxt(x,slp,moved?(Math.abs(last[1]-e)<.3?'SL moved to BREAK-EVEN ':'SL moved to +'+(Math.round(Math.abs(last[1]-e)/R*100)/100)+'R ')+fx(slp):`SL ${fx(ex.stop)} · ${fm(R,1)} pts · −$${fm(risk,0)}`,INVC.sl));
  const steps=[[1,0],[1.5,.5]].map(([t,l],k)=>({q:k+1,trig:e+ex.dir*t*R,lv:e+ex.dir*l*R,done:final&&mv.length>k}));
  const rr=Math.abs(tp-e)/R;let tx=`TP1 ${fx(tp)} · +${(Math.round(rr*100)/100)}R · +$${fm(rr*risk,0)} · exit here`;
  out.push(P(tp,INVC.tp,2));
  steps.forEach(s=>{const sameTp=Math.abs(s.trig-tp)<1;out.push(P(s.trig,INVC.be,2,{pdot:1}));
    if(sameTp)tx+='  >>  '+invStepTxt(ex,s.q,s.lv,s.trig,s.done,s.done?mv[s.q-1][1]:0);else out.push(invTxt(x,s.trig,invStepTxt(ex,s.q,s.lv,s.trig,s.done,s.done?mv[s.q-1][1]:0),INVC.be))});
  out.push(invTxt(x,tp,tx,INVC.tp));
  return out};
const invEntryLab=(ex)=>({t:'lab',i:ex.en,p:ex.e,al:'left',bg:INVC.ent,tc:'#fff',tiny:1,lines:[`${ex.dir===1?'LONG':'SHORT'} ${fm(ex.e)} · ${invSize(ex)} MNQ`]});
const invKbox=(ex,iEnd)=>rectAt(Math.max(0,ex.kg.i0),iEnd,ex.kg.lo,ex.kg.hi,ex.kg.name,COL.ice,{pine:1,pcol:INVC.key,inner:1,pfillc:1});
const invFlipTab=(ex,C)=>({...tagAt(ex.fi,ex.dir===1?C[ex.fi].l:C[ex.fi].h,`FLIP ${ex.sg?ex.sg.tf:ex.tf}m gap · ${ex.m.toUpperCase()}`,ex.dir===1?'below':'above',COL.ice),pine:1,bg:'rgba(75,82,96,.8)',tc:'#fff',tiny:1});
/* what the Eval lab draws at replay candle i */
function invLive(q,i,C){const ov=[];
  if(i>=q.ti)ov.push(invKbox(q,Math.min(i,q.ti+45)));
  if(i>=q.fi)ov.push(invFlipTab(q,C));
  if(i>=q.en){ov.push(...invLevels(q,Math.min(i,q.en+90),false,Math.min(i,q.en+3)),invEntryLab(q))}
  return ov}
function invSteps(ex){
  const C=exData(ex),d=ex.dir,L=d===1,T=i=>hhmm(ex.hm+i),pr=fm,st=[],n=invSize(ex),kg=ex.kg,sg=ex.sg,sw=ex.sw,risk=n*ex.R*2,tp=invTp(ex),m=sg.tf;
  const cisdAll=()=>(ex.cisdAll||[]).filter(c=>c[0]<ex.fi+90).map(c=>[hlAt(c[1],'',COL.ice,Math.max(0,c[0]),{pine:1,pcol:'rgba(168,179,196,.6)',pdot:1,pleft:1,i1:c[0]+90}),invTxt(c[0]+90,c[1],c[2]?'CISD 5m ▲':'CISD 5m ▼',INVC.cisd)]).flat();
  const kbox=()=>invKbox(ex,ex.ti+45);
  const cisdUsed=()=>ex.cisd?[hlAt(ex.cisd.lvl,'',COL.ice,Math.max(0,ex.cisd.i0),{scale:true,pine:1,pcol:INVC.cisd,pw:2,pleft:1,i1:ex.ti+30}),invTxt(ex.ti+30,ex.cisd.lvl,'CISD 5m (used)',INVC.cisd)]:[];
  const sbox=(i1)=>rectAt(Math.max(0,sg.i0),i1,sg.lo,sg.hi,sg.tf+'m gap',COL.ice,{pine:1,pcol:'rgba(154,160,173,.8)',up:!L});
  const swLine=()=>hlAt(sw[1],L?'swing high':'swing low',COL.ice,sw[0],{scale:true,pine:1,pcol:'#9aa0ad',pdot:1,pleft:1,i1:ex.ti});
  const flipTab=()=>invFlipTab(ex,C);
  const o15=()=>ex.o15?[hlAt(ex.o15.p,'15-minute candle open',COL.ice,ex.o15.i0,{scale:true,pine:1,pcol:'#9aa0ad',pdash:1,pleft:1,i1:ex.fi+12}),hlAt(ex.o15.x,'',COL.ice,ex.o15.i0,{scale:true,pine:1,pcol:'rgba(154,160,173,.6)',pdot:1,pleft:1,i1:ex.fi})]:[];
  const view=(a,b)=>({from:Math.max(-1,a),count:Math.max(60,Math.min(150,b-a+10))});
  const v1=view(sw[0]-25,ex.ti+25),base=()=>[...cisdAll()];
  /* displacement numbers for the caption: the m one-minute candles that make the inverting candle */
  const seg=C.slice(Math.max(0,ex.fi-m+1),ex.fi+1),hh=Math.max(...seg.map(c=>c.h)),ll=Math.min(...seg.map(c=>c.l)),rg=Math.max(hh-ll,.25),body=d*(seg[seg.length-1].c-seg[0].o),far=L?hh-seg[seg.length-1].c:seg[seg.length-1].c-ll,bp=Math.round(Math.max(0,body)/rg*100),wp=Math.round(Math.max(0,far)/rg*100);
  st.push({upto:Math.max(sw[0]+2,ex.ti-15),focus:sw[0]+2,...v1,ov:[...base(),swLine()],cap:`<b>Narrative.</b> INVERTIX first reads which way gaps are being respected on the Daily, 4-hour and 1-hour charts: that <b>automatic bias</b> decides which direction may print. On top of it sits your own <b>Today's bias</b> (Bullish, Bearish or Neutral). Here Today's bias is <b>Neutral</b>, so it adds no filter, and a ${L?'long':'short'} setup is allowed. The ${L?'last swing high':'last swing low'} (dotted line) is where the manipulation starts: it is the start of the leg.`});
  st.push({upto:ex.ti,focus:ex.ti,...v1,ov:[...base(),swLine(),kbox(),...cisdUsed()],cap:`<b>Sponsor.</b> At <b>${T(ex.ti)}</b> price runs ${L?'down':'up'} into an unfilled ${L?'bullish':'bearish'} <b>${kg.name}</b> (${pr(kg.lo)} to ${pr(kg.hi)}). The indicator draws an <b>outline box with the level's name inside</b>${ex.cisd?', plus a solid "CISD 5m (used)" line':''}${ex.cisdAll&&ex.cisdAll.length?'. The dotted "CISD 5m" lines are CISD zones it found along the way':''}. This is the "true manipulation": price took liquidity and tapped a level that can sponsor a move back. It is a place, not the signal. It must fall within about 300 minutes of the swing, and the flip has to come within 120 minutes.`});
  st.push({upto:ex.ti,focus:ex.ti,...v1,ov:[...base(),swLine(),kbox(),...cisdUsed(),sbox(ex.ti)],cap:`<b>The leg and its small gap.</b> The <b>leg</b> runs from the ${L?'swing high':'swing low'} (${pr(sw[1])}) to the sponsor. Inside it, price left small ${L?'bearish':'bullish'} gaps (the 5-minute is on by default). The one to be inverted is the <b>highest-timeframe</b> open gap in the leg: here a <b>${m}-minute gap</b> at ${pr(sg.lo)} to ${pr(sg.hi)}. (The indicator does not draw this gap; it is shown here to explain.)`});
  const v4=view(sw[0]-15,ex.fi+20);
  st.push({upto:ex.fi,focus:ex.fi,...v4,ov:[...base(),swLine(),kbox(),...cisdUsed(),sbox(ex.fi),flipTab()],cap:`<b>The flip.</b> At <b>${T(ex.fi)}</b> the ${m}-minute candle closes <b>${L?'above':'below'}</b> that small gap. That is the inversion: the gap changes role and ${L?'buyers':'sellers'} have taken control. The indicator marks it with the small tab <b>"FLIP ${m}m gap · ${ex.m.toUpperCase()}"</b>. It has to be a close, and it has to happen inside the ${ex.m} window. But it only becomes a trade if the two checks below pass.`});
  st.push({upto:ex.fi,focus:ex.fi,...v4,ov:[...base(),swLine(),kbox(),sbox(ex.fi),flipTab(),...o15()],cap:`<b>The two checks.</b> <b>PO3:</b> the 15-minute candle that contains the flip opened at <b>${pr(ex.o15?ex.o15.p:0)}</b>, swept ${L?'below':'above'} it (to ${pr(ex.o15?ex.o15.x:0)}) and price has now reclaimed the open: you are trading with that candle. <b>Displacement:</b> the inverting candle has a body of about <b>${bp}%</b> of its range (at least 60% needed) and a far-side wick of about <b>${wp}%</b> (at most 20% allowed). Both pass, so the setup prints. Nothing extra is drawn for these checks: the signal only appears if they are true.`});
  const v5=view(ex.fi-48,ex.ex+24);
  st.push({upto:ex.en,focus:ex.en,...v5,ov:[kbox(),...cisdUsed(),flipTab(),...invLevels(ex,ex.en+3,false),invEntryLab(ex)],cap:`<b>The order.</b> The entry is at the <b>open of the next candle</b>, a market order: <b>${pr(ex.e)}</b>, shown on the entry tab. The <b>stop</b> is one point beyond the leg's extreme${ex.cap?', tightened to the <b>60-point maximum</b>':''}: <b>${pr(ex.stop)}</b>, ${fm(ex.R,1)} points away. <b>TP1 ${pr(tp)}</b> is ${ex.tk==='gap'?'the near edge of the nearest unfilled 5-minute or 15-minute gap in your direction':'1R, because there was no usable gap in the way (none, or under 3 points away)'}. The dotted lines are the STEP lines of the stop guide: touch one and you move your real stop. With $500 of risk on MNQ that is <b>${n} contract${n>1?'s':''}</b>. (A setup whose stop would be under 30 points is skipped, so every stop is between 30 and 60 points.)`});
  const mv=ex.moves||[];
  const why={target:`Price traded a tick through TP1 at ${T(ex.ex)} and the trade closed there.${mv.length?' On the way the stop guide moved the stop: the stop text shows where it ended up, and the step text reads "✓ STEP … done".':''}`,stop:`Price traded through the stop at ${T(ex.ex)}. A normal losing trade: the signal was valid and the loss was the planned 1R, a little more with costs and slippage.`,be:`Price first reached +1R, so the guide moved the stop to break-even: the stop text changes to "SL moved to BREAK-EVEN". Then price came back and stopped the trade at about the entry at ${T(ex.ex)}: close to zero.`,lock:`Price reached +1.5R, so the guide moved the stop to +0.5R locked. It then pulled back and the trade closed with a small profit at ${T(ex.ex)}.`,time:`Neither the stop nor TP1 was hit, so the trade closed on the 180-minute time exit at ${T(ex.ex)}.`}[ex.how];
  st.push({upto:ex.ex,focus:ex.ex,...v5,ov:[kbox(),...cisdUsed(),flipTab(),...invLevels(ex,ex.ex,true),invEntryLab(ex)],cap:`<b>The result.</b> ${why} Result: <b>${invRes(ex)}</b>. When a trade ends the indicator moves the line texts to the exit candle and updates them; it does <b>not</b> print a win or loss tab, so you log the result yourself, in R. The stop-guide moves are made by <b>you</b> on your real order: the indicator only moves its line and alerts you.`});
  return st}
function indLoad(){ensureCharts();$('#v-lab').classList.remove('nochart');$$('[data-tf]').forEach(b=>b.hidden=true);$('#chartHost2').hidden=true;$('.chartcol').classList.remove('dual');TB.set('cursor')}
function indPaint(){
  const ex=IV.list[IV.i],st=IV.steps[IV.step],C=exData(ex);indLoad();CH.size();
  CH.setData(C.slice(0,st.upto+1),{k:1,t0:ex.hm,stepMin:(ex.inv||ex.sn)?1:5,fit:true});CH.marks=[];CH.taps=new Set();CH.ov=st.ov;
  CH.count=st.count||Math.min(70,C.length+3);CH.focus(st.focus);if(ex.m!=='cm')CH.from=st.from!=null?st.from:Math.max(-1,st.focus-CH.count*.62);$('#chartTf').textContent=(ex.inv||ex.sn)?'1m candles':'5m candles';$('#chartHint').textContent='Drag to pan · scroll to zoom. Prices in these examples are shifted; the shape and times are real.';CH.draw();
}
/* ---------- EVAL SNIPER 2.0: buy stop and sell stop a set distance from the current price, take-profit lines for both, and the 08:28 to 08:30 timer (1-minute candles, jobs-report mornings) ---------- */
const SNC={st:'#6b7280',tp:'#9aa1af'};
const SN_DIST=30,SN_USD=1500,SN_PTS=75;
const snLine=(ex,p,col,i1,x2={})=>hlAt(p,'',COL.ice,ex.k0,{scale:true,pine:1,pcol:col,pleft:1,i1,pw:1,...x2});
const snLab=(ex,p,t,c,i=ex.k0+4)=>({t:'lab',i,p,al:'left',bg:'#070a10',tc:c,tiny:1,lines:[t]});
const snLevels=(ex,i1,tpToo)=>{const b=ex.X+SN_DIST,s=ex.X-SN_DIST,out=[snLine(ex,b,SNC.st,i1,{pdot:1}),snLine(ex,s,SNC.st,i1,{pdot:1}),snLab(ex,b,`Buy Stop (${fm(b)})`,SNC.st,i1+1),snLab(ex,s,`Sell Stop (${fm(s)})`,SNC.st,i1+1)];
  if(tpToo){out.push(snLine(ex,b+SN_PTS,SNC.tp,i1,{pdash:1}),snLine(ex,s-SN_PTS,SNC.tp,i1,{pdash:1}),snLab(ex,b+SN_PTS,`Buy TP (${fm(b+SN_PTS)}) · +$${fm(SN_USD,0)} · ${SN_PTS} pts`,SNC.tp,i1+1),snLab(ex,s-SN_PTS,`Sell TP (${fm(s-SN_PTS)}) · +$${fm(SN_USD,0)} · ${SN_PTS} pts`,SNC.tp,i1+1))}
  return out};
const snWin=()=>({t:'band',i0:13,i1:15,col:COL.lag,a:.08,text:'08:28–08:30 · "2 minute war"'});
function snSteps(ex){
  const C=exData(ex),T=i=>hhmm(ex.hm+i),pr=fm,st=[],b=ex.X+SN_DIST,s=ex.X-SN_DIST,view=(a,c)=>({from:Math.max(-1,a),count:Math.max(40,Math.min(70,c-a+8))});
  const end=ex.xi!=null?ex.xi:Math.min(C.length-1,ex.ei!=null?ex.ei+8:ex.k0+25);
  st.push({upto:ex.k0,focus:ex.k0,...view(0,ex.k0+16),ov:[snWin(),...snLevels(ex,ex.k0+3,false)],cap:`<b>Before the news.</b> Eval Sniper draws two lines from the <b>current price</b> (${pr(ex.X)} at ${T(ex.k0)}): a <b>Buy Stop</b> ${SN_DIST} points above (${pr(b)}) and a <b>Sell Stop</b> ${SN_DIST} points below (${pr(s)}). The distance is the first setting (Distance, in points). The lines are redrawn from the latest candle, so they follow price until the news. During the news window (08:28 to 08:30 New York time by default) a countdown timer shows at the top of the chart: the default text is "2 minute war".`});
  st.push({upto:ex.k0,focus:ex.k0,...view(0,ex.k0+16),ov:[snWin(),...snLevels(ex,ex.k0+3,true)],cap:`<b>The profit target.</b> The dashed <b>Buy TP</b> and <b>Sell TP</b> lines show where to put your take-profit for each stop order. Choose the target in <b>dollars</b> or <b>points</b>. With the defaults, $${fm(SN_USD,0)} on 1 NQ ($20 a point) is <b>${SN_PTS} points</b>, so Buy TP is ${pr(b)} + ${SN_PTS} = <b>${pr(b+SN_PTS)}</b> and Sell TP is ${pr(s)} − ${SN_PTS} = <b>${pr(s-SN_PTS)}</b>. The dollar target is split over your contracts: 5 MNQ ($2 a point) and $1,500 would be 150 points. TradingView cannot let a script's line be dragged, so the lines show the exact price to type or drag your take-profit to on the order tool.`});
  st.push({upto:ex.k0+1,focus:ex.k0+1,...view(0,ex.k0+16),ov:[snWin(),...snLevels(ex,ex.k0+3,true)],cap:`<b>The news candle.</b> At 08:30 the report comes out and the 1-minute candle can be 50 points or more. Your orders were placed before it, from the last price you saw. The indicator does not place orders: you place a buy stop and a sell stop yourself, at the lines, and set each take-profit at its TP line.`});
  const ev=ex.side==='buy'||ex.side==='sell',L=ex.side==='buy',ent=L?b:s,tp=L?b+SN_PTS:s-SN_PTS;
  const trig=ev?[snLevels(ex,ex.ei+6,true),{...tagAt(ex.ei,L?C[ex.ei].h:C[ex.ei].l,L?'buy stop filled':'sell stop filled',L?'above':'below',COL.ice),pine:1,bg:'rgba(75,82,96,.8)',tc:'#fff',tiny:1}].flat():snLevels(ex,ex.k0+3,true);
  const capTrig=ev?`<b>One stop fills.</b> At <b>${T(ex.ei)}</b> price trades ${L?'up through':'down through'} the ${L?'Buy':'Sell'} Stop at <b>${pr(ent)}</b>, so that order is filled. Place the two stops as a pair where one cancels the other (OCO), so the other stop is removed when this one fills. In a fast candle a stop order can fill beyond the line: expect slippage.`:ex.side==='both'?`<b>Both stops get touched.</b> In the ${T(ex.ei)} candle price runs ${SN_DIST} points ${'both ways'}: it reaches the Buy Stop (${pr(b)}) and the Sell Stop (${pr(s)}) within the same candle. This is the risk of a news candle that whips both ways: the indicator draws the lines, it cannot tell you which side will be right.`:`<b>Nothing fills.</b> Price stayed between the two stops for the next 35 minutes: neither the Buy Stop (${pr(b)}) nor the Sell Stop (${pr(s)}) was touched. No trade, and the orders are cancelled.`;
  st.push({upto:ev||ex.side==='both'?ex.ei:Math.min(C.length-1,ex.k0+30),focus:ev||ex.side==='both'?ex.ei:ex.k0+20,...view(0,(ev?ex.ei:ex.k0)+16),ov:[snWin(),...trig],cap:capTrig});
  if(ev){const why={tp:`Price kept going and traded through the ${L?'Buy':'Sell'} TP at <b>${pr(tp)}</b> at <b>${T(ex.xi)}</b>: the take-profit was reached.`,rev:`Price reversed and traded back through the opposite stop level (${pr(L?s:b)}) at <b>${T(ex.xi)}</b>, ${2*SN_DIST} points from the entry, before reaching the TP. A move like this is why the size and the stop matter.`,open:`Neither the TP (${pr(tp)}) nor the opposite stop level (${pr(L?s:b)}) was reached in the next 35 minutes.`}[ex.res];
    st.push({upto:end,focus:end,...view(0,end+6),ov:[snWin(),...snLevels(ex,end,true)],cap:`<b>What happened next.</b> ${why} Eval Sniper itself prints no win or loss: it only draws the lines, and you manage the order.`})}
  st.push({upto:Math.min(C.length-1,end),focus:Math.min(C.length-1,end),...view(0,end+6),ov:[snWin(),...snLevels(ex,end,true)],cap:`<b>What to remember.</b> The lines and the timer exist only on the <b>last candle</b> of the chart and move with it, so set your orders inside the window, from the lines you see. Check the news time and your prop firm's news rule first: some firms block orders or trades around the release. A stop order at the news can slip, so size for the stop you would really take.`});
  return st}
const IND_GUIDE={
 inv:{t:'INVERTIX',sub:'The first trading model, the IFVG model: a narrative, a sponsor, PO3, a flip and a defined entry. On TradingView use the 1-minute chart; these examples are 1-minute candles.',items:[
  ['Outline box with a name inside','The sponsor price traded into to start the setup, for example "15m FVG": an unfilled gap from 15 minutes up, a rejection block or a 5-minute CISD zone.'],
  ['Dotted line "CISD 5m ▲/▼"','A 5-minute CISD zone found on the chart. A solid line with "(used)" is the one a setup is using.'],
  ['Small tab "FLIP 5m gap · NY AM"','The candle that closed through the highest-timeframe small gap inside the leg with displacement: the flip, and the signal.'],
  ['Entry tab (one line)','LONG or SHORT, the entry price and the number of contracts for your risk. While the trade is open it adds the live R and "still OK to enter" or "TOO LATE to enter now (skip it)".'],
  ['Solid light line "SL …"','Your stop, with the points and the dollars at risk. It moves when a STEP line is reached.'],
  ['Line "TP1 …"','The target (the nearest unfilled 5m or 15m gap by default), with its price, R and dollars. The trade closes here.'],
  ['Dotted line "STEP 1 …"','The moment price touches it, move your real stop to the price written there. Step 1 is break-even at +1R, step 2 is +0.5R at +1.5R. If it sits on the target, its text is added to the target label.'],
  ['Today\'s bias','The first setting. Bullish prints longs only, Bearish shorts only, Neutral both. Changing it redraws the whole chart.'],
  ['What it does not show','Win or loss results are not printed on the chart. You log them yourself, in R.']]},
 sn:{t:'Eval Sniper',sub:'News-candle stop orders for jobs-report and CPI mornings. On TradingView use the 1-minute chart. The examples here are first-Friday (jobs report) mornings, 08:15 to 09:05 New York time.',items:[
  ['Buy Stop (price)','A dotted line a set distance above the current price (30 points by default). Place a buy stop order at it.'],
  ['Sell Stop (price)','A dotted line the same distance below the current price. Place a sell stop order at it. The two lines follow the latest candle.'],
  ['Buy TP / Sell TP','Dashed take-profit lines for each stop order. The label shows the price, the dollars and the points. Choose the target in dollars or points; the dollars are split over your contracts.'],
  ['The countdown timer','Shown at the top of the chart inside the news window (08:28 to 08:30 New York time by default), counting down to the end. The default text is "2 minute war".'],
  ['Distance and contract','Distance (points) sets how far the stops sit from price. Contract (NQ $20 or MNQ $2 a point) and Number of contracts turn a dollar target into points.'],
  ['What it does not do','It does not place orders or manage them, and it prints no results. It draws the levels and the timer for the last candle only.']]},
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
const indSteps=ex=>ex.sn?snSteps(ex):ex.m==='cm'?cmSteps(ex):ex.inv?invSteps(ex):escSteps(ex);
const indTitle=e=>e.sn?'Eval Sniper · jobs report morning':e.m==='cm'?'Confluence Master · 5m':e.inv?`INVERTIX · ${e.m} ${e.dir===1?'long':'short'}`:`ESC VLCTY · ${escName(e).sess}${e.k==='none'?' · no trade':' '+(e.dir===1?'long':'short')}`;
function indPanel(){
  const box=$('#lesson'),g=IND_GUIDE[IV.ind],ex=IV.list[IV.i];
  const seg=`<div class="seg">${[['inv','INVERTIX'],['esc','ESC VLCTY'],['sn','Eval Sniper'],['cm','Confluence Master']].map(([k,t])=>`<button type="button" data-iv="${k}" class="${IV.ind===k?'on':''}">${t}</button>`).join('')}</div>`;
  let body='',foot='';
  if(IV.mode==='guide'){
    body=`<p class="muted">${g.sub}</p><h3>What is on the chart, and what it means</h3><div>${g.items.map(([a,b])=>`<div class="rev"><p><b>${esc(a)}</b></p><p>${esc(b)}</p></div>`).join('')}</div>`;
    foot=`<button class="btn primary" data-ivgo="list">See real examples →</button>${IV.ind!=='cm'?'<button class="btn" data-ivgo="turn">Your turn: read the signal</button>':''}`;
  }else if(IV.mode==='list'){
    body=`<p class="muted">Real NQ sessions with the indicator's rules applied. Prices are shifted and dates removed. Pick one and step through why it printed, or why it stayed quiet.</p><div class="kv">${IV.list.map((e,i)=>`<button type="button" class="chip" data-ivex="${i}" style="cursor:pointer">${e.sn?`${i+1} · ${e.side==='buy'||e.side==='sell'?e.side+' stop filled':e.side==='both'?'both stops touched':'no fill'}`:e.m==='cm'?`Day ${i+1}`:e.inv?`${i+1} · ${e.m} ${e.dir===1?'long':'short'}`:`${i+1} · ${escName(e).tag} ${e.k==='none'?'no trade':e.dir===1?'long':'short'}`}</button>`).join('')}</div>`;
    foot=`<button class="btn" data-ivgo="guide">← Notation guide</button>`;
  }else if(IV.mode==='walk'){
    body=`<div class="hud">Example ${IV.i+1} of ${IV.list.length} · ${indTitle(ex)}</div><div class="cap" style="margin-top:8px">${IV.steps[IV.step].cap}</div><div class="kv" style="margin-top:10px">${IV.steps.map((_,i)=>`<span class="chip ${i===IV.step?'live':i<IV.step?'ok':''}">${i+1}</span>`).join('')}</div>`;
    foot=`<button class="btn" data-ivprev ${IV.step===0?'disabled':''}>← Back</button><button class="btn ghost" data-ivgo="list">All examples</button><button class="btn primary" data-ivnext>${IV.step===IV.steps.length-1?'Next example →':'Next ▸'}</button>`;
  }
  box.innerHTML=`<div class="les-h"><div class="hud">Indicator Lab</div><div class="h">${g.t}</div><div style="margin-top:10px">${seg}</div></div><div class="les-b">${body}</div><div class="les-f">${foot}</div>`;
}
function indOpen(){
  PV='ind';$('#v-lab').classList.remove('nochart');
  IV.list=IV.ind==='sn'?(typeof IND_SNIPER!=='undefined'?IND_SNIPER:[]):IV.ind==='cm'?(typeof IND_CM!=='undefined'?IND_CM:[]):IV.ind==='inv'?(typeof IND_INV!=='undefined'?IND_INV:[]):(typeof IND_ESC!=='undefined'?IND_ESC:[]);
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
function invItem(r){
  const ex=pick(r,IND_INV),C=exData(ex),L=ex.dir===1,T=i=>hhmm(ex.hm+i),base={t0:ex.hm,step:1},topic='Indicator · INVERTIX',n=invSize(ex),k=pick(r,['tap','lvl','size','stage','tp']),tp=invTp(ex);
  const kb=invKbox(ex,ex.ti+45),sb=rectAt(Math.max(0,ex.sg.i0),ex.fi,ex.sg.lo,ex.sg.hi,ex.sg.tf+'m gap',COL.ice,{pine:1,pcol:'rgba(154,160,173,.8)',up:!L});
  if(k==='tap')return{...base,kind:'tap',many:false,topic,q:`INVERTIX ${L?'long':'short'} setup (1-minute candles). Price ran ${L?'down':'up'} into the marked ${ex.kg.name} and the small ${L?'bearish':'bullish'} ${ex.sg.tf}-minute gap is marked inside the leg. Click the candle that is the FLIP: the first close ${L?'above':'below'} that small gap.`,C:C.slice(0,Math.min(C.length,ex.fi+12)),ov:[kb,sb],want:[ex.fi],why:`The candle at ${T(ex.fi)} is the first to close ${L?'above':'below'} the small gap (${fm(L?ex.sg.hi:ex.sg.lo)}), with a strong body. A wick through it would not count. The entry is the open of the next candle.`};
  if(k==='lvl'){const tol=Math.max(2,ex.R*.2);return{...base,kind:'level',topic,q:`INVERTIX ${L?'long':'short'} entered at ${fm(ex.e)}. The stop is ${fm(ex.R,1)} points away (one point beyond the leg's extreme${ex.cap?', tightened to the 60-point cap':''}) and TP1 is ${ex.tk==='gap'?'the near edge of the nearest unfilled gap':'1R, because no usable gap is in the way'}, ${fm(Math.abs(tp-ex.e),1)} points from the entry. Place the STOP and TP1.`,C:C.slice(0,ex.en+1),ov:[kb,sb,hlAt(ex.e,'entry',COL.ice,ex.en,{scale:true,pine:1,pcol:'#7d8492',pleft:1})],truth:[{p:ex.stop,tol,label:'stop'},{p:tp,tol:Math.max(tol,Math.abs(tp-ex.e)*.06),label:'TP1'}],why:`Stop = entry ${L?'−':'+'} ${fm(ex.R,1)} = ${fm(ex.stop)}. TP1 = ${fm(tp)}: ${ex.tk==='gap'?'the near edge of the nearest untouched 5m or 15m gap':'entry '+(L?'+':'−')+' 1R'}.`}}
  if(k==='tp')return{...base,kind:'num',topic,q:`INVERTIX ${L?'long':'short'} entered at ${fm(ex.e)} with a stop at ${fm(ex.stop)}. TP1 sits at ${fm(tp)}. How many R is TP1 (one decimal)?`,ans:Math.round(Math.abs(tp-ex.e)/ex.R*10)/10,unit:'R',tol:.06,why:`Stop distance = ${fm(ex.R,1)} points. TP1 is ${fm(Math.abs(tp-ex.e),1)} points away, so ${fm(Math.abs(tp-ex.e),1)} ÷ ${fm(ex.R,1)} = ${(Math.abs(tp-ex.e)/ex.R).toFixed(1)}R.`};
  if(k==='size'){const risk=pick(r,[375,500,750,1000]),z=Math.max(1,Math.floor(risk/(ex.R*2)));return{...base,kind:'num',topic,q:`INVERTIX ${L?'long':'short'}: the stop is ${fm(ex.R,1)} points. Your risk is $${risk} on MNQ ($2 a point). How many contracts, rounded down (minimum 1)?`,ans:z,unit:'',tol:.01,why:`$${risk} ÷ (${fm(ex.R,1)} × $2) = ${(risk/(ex.R*2)).toFixed(2)}, rounded down to ${z}${z===1&&risk/(ex.R*2)<1?' (the minimum of 1; the tab warns if it is more than you wanted)':''}.`}}
  const o=['The sponsor','The flip','The order','The result'],i=pick(r,[0,1,2]);const txt=[`Price runs ${L?'down':'up'} into an unfilled ${ex.kg.name}.`,`A strong candle closes ${L?'above':'below'} the highest-timeframe small ${L?'bearish':'bullish'} gap inside the leg.`,`Market entry at the next open, stop one point beyond the leg's extreme, target the nearest unfilled gap.`][i];
  return{...base,kind:'mcq',topic,q:`Which INVERTIX step is this? "${txt}"`,o:[o[i],...o.filter(x=>x!==o[i]).slice(0,3)],why:'Narrative, then the sponsor, then PO3 and the flip (the signal), then the order. The sponsor starts the setup; the flip is the signal.'}}
function snItem(r){
  const ex=pick(r,IND_SNIPER),C=exData(ex),base={t0:ex.hm,step:1},topic='Indicator · Eval Sniper',b=ex.X+SN_DIST,sl=ex.X-SN_DIST,k=pick(r,['lvl','tp','price','tap']);
  if(k==='lvl')return{...base,kind:'level',topic,q:`Eval Sniper with the default distance of ${SN_DIST} points. The last candle before the news closed at ${fm(ex.X)}. Place the BUY STOP and the SELL STOP.`,C:C.slice(0,ex.k0+1),ov:[snWin()],truth:[{p:b,tol:2,label:'buy stop'},{p:sl,tol:2,label:'sell stop'}],why:`Buy Stop = ${fm(ex.X)} + ${SN_DIST} = ${fm(b)}. Sell Stop = ${fm(ex.X)} − ${SN_DIST} = ${fm(sl)}.`};
  if(k==='tp'){const q=pick(r,[['NQ',20,1,1500],['NQ',20,2,1000],['MNQ',2,5,1500],['MNQ',2,10,1000],['NQ',20,1,1000],['MNQ',2,20,2000]]),pts=q[3]/(q[1]*q[2]);
    return{kind:'num',topic,q:`Eval Sniper's profit target is set to $${fm(q[3],0)} with ${q[2]} ${q[0]} ($${q[1]} a point per contract). How many points is the take-profit from each stop?`,ans:pts,unit:'pts',tol:.01,why:`$${fm(q[3],0)} ÷ ($${q[1]} × ${q[2]}) = ${pts} points. The dollar target is split over your contracts.`}}
  if(k==='price'){const buy=r()<.5,pts=SN_PTS;return{...base,kind:'num',topic,q:`The last candle before the news closed at ${fm(ex.X)}. With a ${SN_DIST}-point distance and a ${pts}-point target, what price is the ${buy?'Buy':'Sell'} TP?`,ans:buy?b+pts:sl-pts,unit:'',tol:.3,why:buy?`Buy Stop ${fm(b)} + ${pts} = ${fm(b+pts)}.`:`Sell Stop ${fm(sl)} − ${pts} = ${fm(sl-pts)}.`}}
  if(ex.ei!=null&&(ex.side==='buy'||ex.side==='sell')){const L=ex.side==='buy';return{...base,kind:'tap',many:false,topic,q:`The orders were placed from the last candle before the news (the lines are drawn). Click the first candle that fills a stop order.`,C:C.slice(0,Math.min(C.length,ex.ei+6)),ov:[snWin(),...snLevels(ex,ex.ei+5,false)],want:[ex.ei],why:`The candle at ${hhmm(ex.hm+ex.ei)} is the first to trade ${L?'up through the Buy Stop':'down through the Sell Stop'} (${fm(L?b:sl)}).`}}
  return{kind:'mcq',topic,q:'When does Eval Sniper show its countdown timer, by default?',o:['Inside the news window, 08:28 to 08:30 New York time','All day','Only after an order fills','At the market open'],why:'The timer appears only inside the news window and counts down to its end. You can change the window in the settings.'}}
function indItem(r){
  if(typeof IND_SNIPER!=='undefined'&&IND_SNIPER.length&&r()<.25)return snItem(r);
  if(typeof IND_INV!=='undefined'&&IND_INV.length&&(typeof IND_ESC==='undefined'||r()<.5))return invItem(r);
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
