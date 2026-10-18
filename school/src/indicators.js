/* ============================================================
   INDICATOR LAB (practice page only): step-by-step walkthroughs of Confluence Master, INVERTIX and Eval Sniper on real NQ sessions.
   Prices in the examples are shifted by a fixed offset and carry no dates, so only the shape and the time of day are real.
============================================================ */
const IV={ind:'inv',mode:'guide',list:[],i:0,step:0,steps:[]};
const exData=ex=>{if(!ex._C){ex._C=[];for(let i=0;i<ex.b.length;i+=4)ex._C.push({o:ex.p0+ex.b[i]/4,h:ex.p0+ex.b[i+1]/4,l:ex.p0+ex.b[i+2]/4,c:ex.p0+ex.b[i+3]/4})}return ex._C};
const sgn=d=>(d>=0?'+':'−')+Math.abs(d).toFixed(2);
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

/* ---------- INVERTIX (matches INVERTIX 3.4): grey key-level box, WATCHING and ACTIVE SIGNAL tabs, one-line entry tab, text beside each line, STEP lines (1-minute candles) ---------- */
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
const invTab=(ex,C,i,txt)=>({...tagAt(i,ex.dir===1?C[i].l:C[i].h,txt,ex.dir===1?'below':'above',COL.ice),pine:1,bg:'rgba(75,82,96,.8)',tc:'#fff',tiny:1});
const invWatchTab=(ex,C)=>invTab(ex,C,ex.ti,`WATCHING ${ex.dir===1?'LONG':'SHORT'}`);
const invSignalTab=(ex,C)=>invTab(ex,C,ex.fi,`ACTIVE SIGNAL · ENTER ${ex.dir===1?'LONG':'SHORT'} ~${fm(ex.e)}`);
/* what the Eval lab draws at replay candle i */
function invLive(q,i,C){const ov=[];
  if(i>=q.ti)ov.push(invKbox(q,Math.min(i,q.ti+45)),invWatchTab(q,C));
  if(i>=q.fi)ov.push(invSignalTab(q,C));
  if(i>=q.en){ov.push(...invLevels(q,Math.min(i,q.en+90),false,Math.min(i,q.en+3)),invEntryLab(q))}
  return ov}
function invSteps(ex){
  const C=exData(ex),d=ex.dir,L=d===1,T=i=>hhmm(ex.hm+i),pr=fm,st=[],n=invSize(ex),kg=ex.kg,sg=ex.sg,sw=ex.sw,risk=n*ex.R*2,tp=invTp(ex),m=sg.tf,plan=ex.plan!=null?ex.plan:Math.abs(tp-ex.e)/ex.R,A=plan>=1.5;
  const kbox=()=>invKbox(ex,ex.ti+45);
  const sbox=(i1)=>rectAt(Math.max(0,sg.i0),i1,sg.lo,sg.hi,sg.tf+'m gap',COL.ice,{pine:1,pcol:'rgba(154,160,173,.8)',up:!L});
  const swLine=()=>hlAt(sw[1],L?'swing high':'swing low',COL.ice,sw[0],{scale:true,pine:1,pcol:'#9aa0ad',pdot:1,pleft:1,i1:ex.ti});
  const view=(a,b)=>({from:Math.max(-1,a),count:Math.max(60,Math.min(150,b-a+10))});
  const v1=view(sw[0]-25,ex.ti+25);
  /* the flip candle: the m one-minute candles that make the inverting candle */
  const seg=C.slice(Math.max(0,ex.fi-m+1),ex.fi+1),hh=Math.max(...seg.map(c=>c.h)),ll=Math.min(...seg.map(c=>c.l)),rg=Math.max(hh-ll,.25),body=d*(seg[seg.length-1].c-seg[0].o),far=L?hh-seg[seg.length-1].c:seg[seg.length-1].c-ll,bp=Math.round(Math.max(0,body)/rg*100),wp=Math.round(Math.max(0,far)/rg*100);
  st.push({upto:ex.ti,focus:ex.ti,...v1,ov:[swLine(),kbox(),invWatchTab(ex,C)],cap:`<b>The key level.</b> At <b>${T(ex.ti)}</b> price runs ${L?'down':'up'} into an unfilled ${L?'bullish':'bearish'} <b>${kg.name}</b> (${pr(kg.lo)} to ${pr(kg.hi)}). The indicator draws an <b>outline box with the level's name inside</b> and a <b>WATCHING ${L?'LONG':'SHORT'}</b> tab: get ready, nothing to enter yet. The ${L?'last swing high':'last swing low'} (dotted line) is where the manipulation started. The key level is a place, not the signal. It must be within about 300 minutes of the swing, and the flip has to come within 120 minutes.`});
  st.push({upto:ex.ti,focus:ex.ti,...v1,ov:[swLine(),kbox(),invWatchTab(ex,C),sbox(ex.ti)],cap:`<b>The leg and its small gap.</b> The <b>manipulation leg</b> runs from the ${L?'swing high':'swing low'} (${pr(sw[1])}) into the key level. Inside it, price left small ${L?'bearish':'bullish'} gaps (3-minute and 5-minute). The one to be inverted is the <b>highest-timeframe</b> open gap in the leg: here a <b>${m}-minute gap</b> at ${pr(sg.lo)} to ${pr(sg.hi)}. (The indicator does not draw this gap; it is shown here to explain.)`});
  const v4=view(sw[0]-15,ex.fi+20);
  st.push({upto:ex.fi,focus:ex.fi,...v4,ov:[swLine(),kbox(),sbox(ex.fi),boxOf(C,ex.fi,ex.fi,COL.sig,.5)],cap:`<b>The flip.</b> At <b>${T(ex.fi)}</b> the ${m}-minute candle closes <b>${L?'above':'below'}</b> that small gap. That is the inversion: the gap changes role and ${L?'buyers':'sellers'} have taken control. The candle is strong: a body of about <b>${bp}%</b> of its range (at least 55% needed) and a far-side wick of about <b>${wp}%</b> (at most 20% allowed). It has to be a close, and it has to happen inside the ${ex.m} window.`});
  const v5=view(ex.fi-48,ex.ex+24);
  st.push({upto:ex.en,focus:ex.en,...v5,ov:[kbox(),invSignalTab(ex,C),...invLevels(ex,ex.en+3,false),invEntryLab(ex)],cap:`<b>The signal and the order.</b> The flip candle closed and every rule passed, so the tab reads <b>ACTIVE SIGNAL · ENTER ${L?'LONG':'SHORT'} ~${pr(ex.e)}</b>. The entry is the <b>open of the next candle</b> (market, or a limit at the price shown): <b>${pr(ex.e)}</b>. The <b>stop</b> is one point beyond the leg's extreme${ex.cap?', tightened to the <b>60-point maximum</b>':''}: <b>${pr(ex.stop)}</b>, ${fm(ex.R,1)} points away. <b>TP1 ${pr(tp)}</b> is ${ex.tk==='gap'?'the near edge of the nearest unfilled 5-minute or 15-minute gap in your direction':'the target line'}. The dotted lines are the STEP lines of the stop guide: touch one and you move your real stop. With $500 of risk on MNQ that is <b>${n} contract${n>1?'s':''}</b>.`});
  st.push({upto:ex.en,focus:ex.en,...v5,ov:[kbox(),invSignalTab(ex,C),...invLevels(ex,ex.en+3,false),invEntryLab(ex)],cap:`<b>The ticket.</b> Run the five checks. <b>1)</b> Inside a window you trade: yes (${ex.m}). <b>2)</b> Stop between 30 and 60 points: yes (${fm(ex.R,1)}). <b>3)</b> Distance to TP1 ÷ distance to SL: ${fm(Math.abs(tp-ex.e),1)} ÷ ${fm(ex.R,1)} = <b>${plan.toFixed(1)}R</b>${A?', which is 1.5R or more: an <b>A trade</b>':', under 1.5R: a normal trade'}. <b>4)</b> Still OK to join (not past 0.5R). <b>5)</b> Inside your own loss limits. Items 1, 2, 4 and 5 decide whether you can take it; item 3 only tells you whether it is an A trade.`});
  const mv=ex.moves||[];
  const why={target:`Price traded a tick through TP1 at ${T(ex.ex)} and the trade closed there.${mv.length?' On the way the stop guide moved the stop: the stop text shows where it ended up, and the step text reads "✓ STEP … done".':''}`,stop:`Price traded through the stop at ${T(ex.ex)}. A normal losing trade: the signal was valid and the loss was the planned 1R, a little more with costs and slippage.`,be:`Price first reached +1R, so the guide moved the stop to break-even: the stop text changes to "SL moved to BREAK-EVEN". Then price came back and stopped the trade at about the entry at ${T(ex.ex)}: close to zero.`,lock:`Price reached +1.5R, so the guide moved the stop to +0.5R locked. It then pulled back and the trade closed with a small profit at ${T(ex.ex)}.`,time:`Neither the stop nor TP1 was hit, so the trade closed on the 180-minute time exit at ${T(ex.ex)}.`}[ex.how];
  st.push({upto:ex.ex,focus:ex.ex,...v5,ov:[kbox(),invSignalTab(ex,C),...invLevels(ex,ex.ex,true),invEntryLab(ex)],cap:`<b>The result.</b> ${why} Result: <b>${invRes(ex)}</b>. The indicator moves the line texts to the exit candle and updates them; log the result yourself, in R. The stop-guide moves are made by <b>you</b> on your real order: the indicator only moves its line and alerts you.`});
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
 inv:{t:'INVERTIX',sub:'The first trading model, the IFVG model: a key level, the manipulation leg into it, a flip and a defined entry, stop and target. On TradingView use the 1-minute chart; these examples are 1-minute candles.',items:[
  ['Outline box with a name inside','The key level price traded into, for example "15m FVG": an unfilled gap from 15 minutes up, a rejection block or an IML.'],
  ['WATCHING LONG / SHORT tab','A key level was touched or swept and INVERTIX is waiting for the flip. Get ready: nothing to enter yet.'],
  ['ACTIVE SIGNAL · ENTER LONG ~price','The flip candle closed and every rule passed. The entry is the open of the next candle.'],
  ['Entry tab with LIVE +xR','The trade is filled. It shows how far you are in profit and "still OK to join" or "TOO LATE to join" (past 0.5R: skip it).'],
  ['Solid light line "SL …"','Your stop, with the points and the dollars at risk. It moves when a STEP line is reached.'],
  ['Line "TP1 …"','The target (the nearest unfilled 5m or 15m gap by default), with its price, R and dollars.'],
  ['Dotted line "STEP 1 …"','The moment price touches it, move your real stop to the price written there. Step 1 is break-even at +1R, step 2 is +0.5R at +1.5R.'],
  ['NO TRADE / EXPIRED tabs','A setup was skipped (weak flip candle, stop too small or too wide, outside a window) or never flipped within 120 minutes. Nothing to do.'],
  ['SIGNAL · not tracked','A second flip formed while a trade was open. INVERTIX tracks one trade at a time: your call.']]},
 sn:{t:'Eval Sniper',sub:'News-candle stop orders for jobs-report and CPI mornings. On TradingView use the 1-minute chart. The examples here are first-Friday (jobs report) mornings, 08:15 to 09:05 New York time.',items:[
  ['Buy Stop (price)','A dotted line a set distance above the current price (30 points by default). Place a buy stop order at it.'],
  ['Sell Stop (price)','A dotted line the same distance below the current price. Place a sell stop order at it. The two lines follow the latest candle.'],
  ['Buy TP / Sell TP','Dashed take-profit lines for each stop order. The label shows the price, the dollars and the points. Choose the target in dollars or points; the dollars are split over your contracts.'],
  ['The countdown timer','Shown at the top of the chart inside the news window (08:28 to 08:30 New York time by default), counting down to the end. The default text is "2 minute war".'],
  ['Distance and contract','Distance (points) sets how far the stops sit from price. Contract (NQ $20 or MNQ $2 a point) and Number of contracts turn a dollar target into points.'],
  ['What it does not do','It does not place orders or manage them, and it prints no results. It draws the levels and the timer for the last candle only.']]},
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
const indSteps=ex=>ex.sn?snSteps(ex):ex.m==='cm'?cmSteps(ex):invSteps(ex);
const indTitle=e=>e.sn?'Eval Sniper · jobs report morning':e.m==='cm'?'Confluence Master · 5m':`INVERTIX · ${e.m} ${e.dir===1?'long':'short'}`;
function indPanel(){
  const box=$('#lesson'),g=IND_GUIDE[IV.ind],ex=IV.list[IV.i];
  const seg=`<div class="seg">${[['inv','INVERTIX'],['sn','Eval Sniper'],['cm','Confluence Master']].map(([k,t])=>`<button type="button" data-iv="${k}" class="${IV.ind===k?'on':''}">${t}</button>`).join('')}</div>`;
  let body='',foot='';
  if(IV.mode==='guide'){
    body=`<p class="muted">${g.sub}</p><h3>What is on the chart, and what it means</h3><div>${g.items.map(([a,b])=>`<div class="rev"><p><b>${esc(a)}</b></p><p>${esc(b)}</p></div>`).join('')}</div>`;
    foot=`<button class="btn primary" data-ivgo="list">See real examples →</button>${IV.ind!=='cm'?'<button class="btn" data-ivgo="turn">Your turn: read the signal</button>':''}`;
  }else if(IV.mode==='list'){
    body=`<p class="muted">Real NQ sessions with the indicator's rules applied. Prices are shifted and dates removed. Pick one and step through why it printed, or why it stayed quiet.</p><div class="kv">${IV.list.map((e,i)=>`<button type="button" class="chip" data-ivex="${i}" style="cursor:pointer">${e.sn?`${i+1} · ${e.side==='buy'||e.side==='sell'?e.side+' stop filled':e.side==='both'?'both stops touched':'no fill'}`:e.m==='cm'?`Day ${i+1}`:`${i+1} · ${e.m} ${e.dir===1?'long':'short'}`}</button>`).join('')}</div>`;
    foot=`<button class="btn" data-ivgo="guide">← Notation guide</button>`;
  }else if(IV.mode==='walk'){
    body=`<div class="hud">Example ${IV.i+1} of ${IV.list.length} · ${indTitle(ex)}</div><div class="cap" style="margin-top:8px">${IV.steps[IV.step].cap}</div><div class="kv" style="margin-top:10px">${IV.steps.map((_,i)=>`<span class="chip ${i===IV.step?'live':i<IV.step?'ok':''}">${i+1}</span>`).join('')}</div>`;
    foot=`<button class="btn" data-ivprev ${IV.step===0?'disabled':''}>← Back</button><button class="btn ghost" data-ivgo="list">All examples</button><button class="btn primary" data-ivnext>${IV.step===IV.steps.length-1?'Next example →':'Next ▸'}</button>`;
  }
  box.innerHTML=`<div class="les-h"><div class="hud">Indicator Lab</div><div class="h">${g.t}</div><div style="margin-top:10px">${seg}</div></div><div class="les-b">${body}</div><div class="les-f">${foot}</div>`;
}
function indOpen(){
  PV='ind';$('#v-lab').classList.remove('nochart');
  IV.list=IV.ind==='sn'?(typeof IND_SNIPER!=='undefined'?IND_SNIPER:[]):IV.ind==='cm'?(typeof IND_CM!=='undefined'?IND_CM:[]):(typeof IND_INV!=='undefined'?IND_INV:[]);
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
  const o=['The key level','The flip','The order','The result'],i=pick(r,[0,1,2]);const txt=[`Price runs ${L?'down':'up'} into an unfilled ${ex.kg.name}.`,`A strong candle closes ${L?'above':'below'} the highest-timeframe small ${L?'bearish':'bullish'} gap inside the leg.`,`Market entry at the next open, stop one point beyond the leg's extreme, target the nearest unfilled gap.`][i];
  return{...base,kind:'mcq',topic,q:`Which INVERTIX step is this? "${txt}"`,o:[o[i],...o.filter(x=>x!==o[i]).slice(0,3)],why:'The key level, then the leg and the flip (the signal), then the order. The key level starts the setup; the flip is the signal.'}}
function snItem(r){
  const ex=pick(r,IND_SNIPER),C=exData(ex),base={t0:ex.hm,step:1},topic='Indicator · Eval Sniper',b=ex.X+SN_DIST,sl=ex.X-SN_DIST,k=pick(r,['lvl','tp','price','tap']);
  if(k==='lvl')return{...base,kind:'level',topic,q:`Eval Sniper with the default distance of ${SN_DIST} points. The last candle before the news closed at ${fm(ex.X)}. Place the BUY STOP and the SELL STOP.`,C:C.slice(0,ex.k0+1),ov:[snWin()],truth:[{p:b,tol:2,label:'buy stop'},{p:sl,tol:2,label:'sell stop'}],why:`Buy Stop = ${fm(ex.X)} + ${SN_DIST} = ${fm(b)}. Sell Stop = ${fm(ex.X)} − ${SN_DIST} = ${fm(sl)}.`};
  if(k==='tp'){const q=pick(r,[['NQ',20,1,1500],['NQ',20,2,1000],['MNQ',2,5,1500],['MNQ',2,10,1000],['NQ',20,1,1000],['MNQ',2,20,2000]]),pts=q[3]/(q[1]*q[2]);
    return{kind:'num',topic,q:`Eval Sniper's profit target is set to $${fm(q[3],0)} with ${q[2]} ${q[0]} ($${q[1]} a point per contract). How many points is the take-profit from each stop?`,ans:pts,unit:'pts',tol:.01,why:`$${fm(q[3],0)} ÷ ($${q[1]} × ${q[2]}) = ${pts} points. The dollar target is split over your contracts.`}}
  if(k==='price'){const buy=r()<.5,pts=SN_PTS;return{...base,kind:'num',topic,q:`The last candle before the news closed at ${fm(ex.X)}. With a ${SN_DIST}-point distance and a ${pts}-point target, what price is the ${buy?'Buy':'Sell'} TP?`,ans:buy?b+pts:sl-pts,unit:'',tol:.3,why:buy?`Buy Stop ${fm(b)} + ${pts} = ${fm(b+pts)}.`:`Sell Stop ${fm(sl)} − ${pts} = ${fm(sl-pts)}.`}}
  if(ex.ei!=null&&(ex.side==='buy'||ex.side==='sell')){const L=ex.side==='buy';return{...base,kind:'tap',many:false,topic,q:`The orders were placed from the last candle before the news (the lines are drawn). Click the first candle that fills a stop order.`,C:C.slice(0,Math.min(C.length,ex.ei+6)),ov:[snWin(),...snLevels(ex,ex.ei+5,false)],want:[ex.ei],why:`The candle at ${hhmm(ex.hm+ex.ei)} is the first to trade ${L?'up through the Buy Stop':'down through the Sell Stop'} (${fm(L?b:sl)}).`}}
  return{kind:'mcq',topic,q:'When does Eval Sniper show its countdown timer, by default?',o:['Inside the news window, 08:28 to 08:30 New York time','All day','Only after an order fills','At the market open'],why:'The timer appears only inside the news window and counts down to its end. You can change the window in the settings.'}}
function indItem(r){
  if(typeof IND_SNIPER!=='undefined'&&IND_SNIPER.length&&r()<.3)return snItem(r);
  if(typeof IND_INV!=='undefined'&&IND_INV.length)return invItem(r);
  return null}
