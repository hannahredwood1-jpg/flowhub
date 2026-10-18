/* ============================================================
   ECHO X ORBIT vault · generated 1-minute scenarios: a level is swept, price reacts, a candle closes back through the start of the run,
   then the trade is managed to its exit. Built as a long (a swept LOW) and mirrored for shorts.
============================================================ */
function exoScn(r,{side='long',fast=true,out='target',align='gap',level='1H'}={}){
  const s=2.4+r()*1.4,P=basePrice(r),C=[];
  let p=P;
  const push=c=>{C.push(c);p=c.c};
  /* the range before: a quiet chop that stays above the level */
  const LV=q4(P-9*s);
  for(let i=0;i<16;i++){const o=p,c=P+(r()-.5)*3.2*s,h=Math.max(o,c)+r()*.7*s,l=Math.max(LV+1.6*s,Math.min(o,c)-r()*.7*s);push(mk(o,h,l,c))}
  /* the delivery run: 4 to 6 candles pushing down into the level; its opening price is the CISD line */
  const nrun=4+Math.floor(r()*3),R0=q4(p),runI=C.length;
  const step=(R0-(LV+1.2*s))/nrun;
  for(let i=0;i<nrun;i++){const o=p,c=o-step*(.85+r()*.3),h=o+r()*.25*s,l=c-r()*.35*s;push(mk(o,h,Math.max(l,LV+.4*s),c))}
  /* the sweep candle: trades beyond the level by a few points, closes near it */
  const sweepD=1.5+r()*1.8,swLow=q4(LV-sweepD),sweepI=C.length;
  push(mk(p,p+.2*s,swLow,LV+.6*s));
  /* the reaction: fast = one or two candles, slow = a longer, choppy wait */
  const wait=fast?Math.floor(r()*2):5+Math.floor(r()*5);
  for(let i=0;i<wait;i++){const o=p,c=o+(r()-.35)*1.1*s,h=Math.max(o,c)+r()*.5*s,l=Math.max(swLow+.1,Math.min(o,c)-r()*.5*s);push(mk(o,h,l,c))}
  /* the confirmation: a strong candle that closes back above the CISD line */
  const confI=C.length,cc=q4(R0+.8*s+r()*1.2*s);
  push(mk(p,cc+.3*s,Math.min(p,cc)-.2*s,cc));
  const E=q4(cc),stop=q4(swLow-1),Rr=q4(E-stop);
  /* the range the level came from: its far end plus half its size is the target */
  const need=(E-LV+1.3*Rr)/1.5,rng=Math.max(60,Math.ceil(need*(1+r()*.5)/5)*5),H1=q4(LV+rng),tgt=q4(H1+.5*rng),be=q4(E+.25*Rr);
  /* the trade (entry = open of the next candle) */
  const entryI=C.length;
  const exitPath=()=>{
    if(out==='target'){let q=E,guard=0;push(mk(E,E+.4*s,E-.3*s,E+.5*s));while(q<tgt&&guard++<90){const o=p,c=Math.min(tgt+.5,o+(1+r()*1.1)*s*1.4);push(mk(o,c+.3*s*r(),Math.max(E+.1,o-.3*s*r()),c));q=C[C.length-1].h}return C.length-1}
    if(out==='scratch'){let g=0;while(C[C.length-1].h<be+.25&&g++<40){const o=p,c=o+(.5+r())*s;push(mk(o,c+.2*s*r(),o-.2*s*r(),c))}
      for(let i=0;i<3;i++){const o=p,c=o-(.6+r()*.4)*s*1.6;push(mk(o,o+.15*s,Math.max(c-.2*s,E-.6),c))}
      push(mk(p,p+.1*s,E-.5,E-.25));return C.length-1}
    /* stop */
    push(mk(E,E+.5*s,E-.5*s,E-.2*s));let g=0;while(C[C.length-1].l>stop-.5&&g++<40){const o=p,c=o-(.5+r())*s;push(mk(o,o+.2*s*r(),c-.3*s*r(),c))}
    push(mk(p,p+.1*s,stop-.5,stop-.25));return C.length-1};
  push(mk(cc,cc+.35*s,cc-.2*s,E+.1));
  const exitI=exitPath();
  const beI=out==='stop'?null:(()=>{for(let i=entryI;i<C.length;i++)if(C[i].h>=be)return i;return null})();
  /* alignment: the sweep extreme sits inside an unfilled gap (or not) */
  const al={kind:align,lo:q4(swLow-2.5*s),hi:q4(LV+3*s),i0:Math.max(0,runI-9)};
  let out0={C,s,P,t0:570,step:1,side:'long',level:LV,levelKind:level,R0,runI,sweepI,swLow,confI,wait,fast,entryI,E,stop,R:Rr,be,beI,tgt,exitI,out,rng,H1,Lrange:LV,align:al,
    ok:{inside:true,fast,big:level!=='15m'}};
  if(side==='short'){const f=x=>2*P-x;
    out0={...out0,C:mirrorC(C,P),side:'short',level:f(LV),R0:f(R0),swLow:f(swLow),E:f(E),stop:f(stop),be:f(be),tgt:f(tgt),H1:f(H1),Lrange:f(LV),align:{...al,lo:f(al.hi),hi:f(al.lo)}}}
  return out0}
/* overlay builders */
const exLvl=e=>hlAt(e.level,e.levelKind==='15m'?'previous 15m '+(e.side==='long'?'low':'high'):e.levelKind==='1H'?'previous 1H '+(e.side==='long'?'low':'high'):'previous-day '+(e.side==='long'?'low':'high'),COL.ice,0,{scale:true});
const exCisd=e=>hlAt(e.R0,'CISD line',COL.gold,e.runI,{scale:true,dash:true});
const exAlign=e=>e.align.kind==='none'?null:rectAt(e.align.i0,e.sweepI+12,Math.min(e.align.lo,e.align.hi),Math.max(e.align.lo,e.align.hi),e.align.kind==='gap'?(e.side==='long'?'15m bullish gap':'15m bearish gap'):(e.side==='long'?'15m bullish rejection block':'15m bearish rejection block'),COL.lag,{dash:true});
const exTrade=(e,i1)=>[hlAt(e.E,'entry',COL.ice,e.entryI,{scale:true,pine:1,pcol:'#9db2bd',pleft:1,i1}),hlAt(e.stop,'stop',COL.bad,e.entryI,{scale:true,pine:1,pcol:'#f23645',pleft:1,i1}),hlAt(e.be,'break-even step (+0.25R)',COL.gold,e.entryI,{scale:true,pine:1,pcol:'#9aa0ad',pdot:1,pleft:1,i1}),hlAt(e.tgt,'target',COL.ok,e.entryI,{scale:true,pine:1,pcol:'#00e676',pleft:1,i1})];
const exWatch=e=>({...tagAt(e.sweepI,e.side==='long'?e.C[e.sweepI].l:e.C[e.sweepI].h,'WATCHING 1/3',e.side==='long'?'below':'above',COL.ice),pine:1,bg:'rgba(75,82,96,.85)',tc:'#fff',tiny:1});
const exEntryTab=e=>({...tagAt(e.entryI,e.side==='long'?e.C[e.entryI].l:e.C[e.entryI].h,`ExO · ${e.side==='long'?'LONG':'SHORT'} ${fm(e.E)} · 3/3`,e.side==='long'?'below':'above',COL.ice),pine:1,bg:'rgba(41,98,255,.85)',tc:'#fff',tiny:1});
const exX=(it,e)=>({t0:e.t0,step:1,...it});
/* ---------- chart drills ---------- */
const exTapSweep=r=>{const e=exoScn(r,{side:pick(r,['long','short']),fast:r()<.6,level:pick(r,['1H','1H','15m','day'])}),L=e.side==='long';
  return exX({kind:'tap',many:false,topic:'ExO · the sweep',q:`The ${e.levelKind==='15m'?'previous 15-minute':e.levelKind==='1H'?'previous 1-hour':'previous-day'} ${L?'low':'high'} is marked. Click the candle that SWEEPS it: the first to trade through it.`,C:e.C.slice(0,e.sweepI+3),ov:[exLvl(e)],want:[e.sweepI],why:`The candle at ${hhmm(e.t0+e.sweepI)} is the first to trade ${L?'below':'above'} ${fm(e.level)}, by ${fm(Math.abs(e.swLow-e.level),1)} points. A grey WATCHING tab would appear on its wick. Nothing to enter yet.`},e)};
const exCisdLine=r=>{const e=exoScn(r,{side:pick(r,['long','short']),fast:r()<.6}),L=e.side==='long';
  return exX({kind:'level',topic:'ExO · the CISD line',q:`Price swept the ${L?'low':'high'} at ${fm(e.level)}. The candles that pushed price into the level are the delivery run. Place a line at the price a candle must CLOSE through to confirm: the opening price of the run.`,C:e.C.slice(0,e.sweepI+1),ov:[exLvl(e)],truth:[{p:e.R0,tol:Math.max(1.6,e.s*.8),label:'CISD line'}],why:`The run that pushed into the level opened at ${fm(e.R0)}: that is the CISD line. A candle that closes ${L?'above':'below'} it says the push has been overturned.`},e)};
const exTapConfirm=r=>{const e=exoScn(r,{side:pick(r,['long','short']),fast:r()<.5}),L=e.side==='long';
  return exX({kind:'tap',many:false,topic:'ExO · the confirmation',q:`The dotted line is the CISD line. Click the candle that CONFIRMS: the first to close ${L?'above':'below'} it.`,C:e.C.slice(0,e.confI+3),ov:[exLvl(e),exCisd(e)],want:[e.confI],why:`The candle at ${hhmm(e.t0+e.confI)} is the first to close ${L?'above':'below'} ${fm(e.R0)} (and back inside the swept level). A wick through the line does nothing; the close is what counts. The entry is the open of the next candle.`},e)};
const exCount=r=>{const e=exoScn(r,{side:pick(r,['long','short']),fast:r()<.5}),n=e.confI-e.sweepI;
  return exX({kind:'num',topic:'ExO · fast or slow',q:`Count the candles from the sweep candle to the confirmation candle (the sweep candle is candle 0; the confirmation candle counts). How many?`,C:e.C.slice(0,e.confI+2),ov:[exLvl(e),exCisd(e),exWatch(e)],ans:n,unit:'candles',tol:.01,why:`The sweep is candle 0 and the confirmation is candle ${n}. ${n<=3?'That is within 3 candles: a fast reaction (check 2 passes).':'That is more than 3 candles: a slow turn (check 2 fails), a B setup.'}`},e)};
const exStopLine=r=>{const e=exoScn(r,{side:pick(r,['long','short']),fast:true}),L=e.side==='long';
  return exX({kind:'level',topic:'ExO · stop and break-even',q:`You enter at ${fm(e.E)}, the open of the candle after the confirmation. Place the STOP (one point beyond the sweep extreme) and the BREAK-EVEN step (a quarter of the way to your risk, +0.25R).`,C:e.C.slice(0,e.entryI+1),ov:[exLvl(e),hlAt(e.E,'entry',COL.ice,e.entryI,{scale:true,pine:1,pcol:'#9db2bd',pleft:1})],truth:[{p:e.stop,tol:Math.max(1.2,e.R*.08),label:'stop'},{p:e.be,tol:Math.max(1.4,e.R*.08),label:'break-even step'}],why:`The sweep extreme is ${fm(e.swLow)}, so the stop is one point beyond it: ${fm(e.stop)} (${fm(e.R,1)} points of risk). +0.25R is ${fm(e.R*.25,1)} points in your favour: ${fm(e.be)}. When price reaches it, the stop moves to the entry.`},e)};
const exTarget=r=>{const e=exoScn(r,{side:pick(r,['long','short']),fast:true}),L=e.side==='long',far=e.H1;
  return exX({kind:'num',topic:'ExO · the target',q:`The ${e.levelKind==='15m'?'15-minute':e.levelKind==='1H'?'1-hour':'day'} candle you swept ranged from ${fm(L?e.level:far)} to ${fm(L?far:e.level)} (${fm(e.rng,0)} points). The target is half that size beyond the far end of the range. What is the target price?`,ans:e.tgt,unit:'',tol:.3,why:`Half of ${fm(e.rng,0)} is ${fm(e.rng/2,1)}. The far end of the range is ${fm(far)}, so the target is ${fm(far)} ${L?'+':'−'} ${fm(e.rng/2,1)} = ${fm(e.tgt)}.`},e)};
const exAlignQ=r=>{const al=pick(r,['gap','rb','none']),e=exoScn(r,{side:pick(r,['long','short']),align:al}),L=e.side==='long';
  const a=exAlign(e);
  return exX(mcq('ExO · alignment',`The sweep extreme (${fm(e.swLow)}) is marked. ${a?'The shaded zone is a 15-minute zone of the opposite side.':'There is no 15-minute or 1-hour gap or rejection block around it.'} How do you grade this setup?`,al==='none'?['Aligned with nothing: skip unless there is a very specific reason','Highest quality: take it at full risk','Normal setup','Always take it']:al==='gap'?['Aligned with a gap: a normal setup (two kinds of alignment would be the best)','Aligned with nothing: skip','Skip: a gap is a warning','Take it twice the size']:['Aligned with a rejection block: a normal setup','Aligned with nothing: skip','Skip: a rejection block is a warning','Take it twice the size'],al==='none'?'Not sitting inside a 15m or 1h gap or rejection block means the other side was not already waiting there. Skip unless you can name a very specific reason.':`The sweep extreme sits inside ${al==='gap'?'an unfilled gap':'the wick zone of a rejection block'} of the right side: price was delivered into an area where the other side was already waiting. Aligned with one is a normal setup; aligned with a gap and a rejection block is the highest quality.`,{ov:a?[a]:[],C:e.C.slice(0,e.sweepI+6)}),e)};
const exReplayLike=r=>{const out=pick(r,['target','scratch','stop']),e=exoScn(r,{side:pick(r,['long','short']),fast:true,out}),L=e.side==='long';
  const lab={target:'target',scratch:'scratch (stopped at the entry after break-even)',stop:'full stop'};
  return exX(mcq('ExO · the outcome',`After the entry the chart shows what happened. Which outcome is it?`,[lab[out],...Object.values(lab).filter(x=>x!==lab[out])].slice(0,3).concat(['time exit after 120 minutes']),out==='target'?'Price reached the target line.':out==='scratch'?'Price reached the +0.25R step (the stop moved to the entry) and then came back to the entry: a scratch. It costs about the trading costs and is not a win.':'Price traded back through the stop: a full loss at the planned risk.',{C:e.C.slice(0,e.exitI+3),ov:[...exTrade(e,e.exitI+2)]}),e)};
/* the three checks, as a question */
const exChecks=r=>{const inside=r()<.75,fast=r()<.6,big=r()<.7,n=(inside?1:0)+(fast?1:0)+(big?1:0);
  const lvl=big?pick(r,['previous 1-hour','previous-day']):'previous 15-minute';
  return mcq('ExO · the checks',`A setup: the ${lvl} ${pick(r,['high','low'])} is swept. The confirmation candle ${inside?'closes back inside the swept level':'closes through the CISD line but not back inside the swept level'}, and it arrives ${fast?'2':'7'} candles after the sweep. How many of the three checks pass, and what does the playbook say?`,[`${n}/3: ${n===3?'the base case, take it':n===2?'needs a reason you can write down':'usually a skip'}`,`${(n+1)%4}/3: ${((n+1)%4)===3?'the base case, take it':'usually a skip'}`,`${(n+2)%4}/3: ${((n+2)%4)===3?'the base case, take it':'usually a skip'}`,`${(n+3)%4}/3: ${((n+3)%4)===3?'the base case, take it':'usually a skip'}`],`The three checks: closed back inside the swept level (${inside?'yes':'no'}), reacted within 3 candles (${fast?'yes':'no'}), swept the previous 1H or previous-day level (${big?'yes':'no'}). That is ${n}/3. 3/3 is the base case, 2/3 needs a reason you can write down, 1/3 or lower is usually a skip.`)};
