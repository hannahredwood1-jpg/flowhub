/* ============================================================
   ECHO X ORBIT vault · generated scenes. Every scene is built as a LONG (a swept low, a bullish rejection) and mirrored for shorts.
   Narrative scene: a 1-hour chart with unfilled and filled gaps. Model 1: an external rejection block out of a higher-timeframe gap.
   Model 2: a CISD rejection block (a CISD level retested). Model 3: a 1-minute continuation. All numbers come from the candles.
============================================================ */
const jit=(r,a)=>(r()-.5)*2*a;
/* n candles from the last close to `to`, in a straight-ish line with small wicks */
function legC(C,r,s,to,n,wick=.4){
  let p=C.length?C[C.length-1].c:to;const st=(to-p)/n;
  for(let k=0;k<n;k++){const o=p,c=k===n-1?to:o+st+jit(r,Math.abs(st)*.22+s*.12);
    C.push(mk(o,Math.max(o,c)+r()*wick*s,Math.min(o,c)-r()*wick*s,c));p=C[C.length-1].c}
  return p}
/* no accidental gaps: every candle overlaps the candle two bars back, except the candles in `skip` */
function degap(C,skip=[]){for(let i=2;i<C.length;i++){if(skip.includes(i))continue;const a=C[i-2],c=C[i];
  if(c.l>a.h)c.l=q4(a.h-.25);else if(c.h<a.l)c.h=q4(a.l+.25)}}
/* make the last three candles a fair value gap at least `size` wide (dir 1 = bullish, -1 = bearish) */
function carveLast(C,dir,size){const n=C.length,c1=C[n-3],c2=C[n-2],c3=C[n-1];
  if(dir>0){const want=c1.h+size,d=want-c3.l;if(d>0)Object.assign(c3,{o:q4(c3.o+d),h:q4(c3.h+d),l:q4(c3.l+d),c:q4(c3.c+d)});c2.l=Math.min(c2.l,q4(c1.h-.25));c2.h=Math.max(c2.h,q4(c3.l+.25))}
  else{const want=c1.l-size,d=c3.h-want;if(d>0)Object.assign(c3,{o:q4(c3.o-d),h:q4(c3.h-d),l:q4(c3.l-d),c:q4(c3.c-d)});c2.h=Math.max(c2.h,q4(c1.l+.25));c2.l=Math.min(c2.l,q4(c3.h-.25))}}
/* every fair value gap in a series, and whether later price traded back into it */
function fvgList(C){const out=[];
  for(let i=1;i<C.length-1;i++){const a=C[i-1],c=C[i+1];
    if(c.l-a.h>=.5)out.push({i,dir:1,lo:a.h,hi:c.l});
    if(a.l-c.h>=.5)out.push({i,dir:-1,lo:c.h,hi:a.l})}
  out.forEach(g=>{g.filled=false;for(let j=g.i+2;j<C.length;j++){if(g.dir>0?C[j].l<g.hi-.5:C[j].h>g.lo+.5){g.filled=true;g.fillI=j;break}}});
  return out}
const wickMid=c=>c.c>=c.o?q4((c.o+c.l)/2):q4((c.c+c.l)/2);   /* midpoint of the LOWER wick (a long's rejection wick) */
const wickLen=c=>q4(Math.min(c.o,c.c)-c.l);
const flipP=(P)=>x=>x==null?x:q4(2*P-x);
/* mirror a long scene into a short: candles, prices, and zones (lo and hi swap) */
function mirrorScn(sc,prices,zones=[]){const f=flipP(sc.P),o={...sc,C:mirrorC(sc.C,sc.P),side:'short'};
  prices.forEach(k=>{if(sc[k]!=null)o[k]=f(sc[k])});
  zones.forEach(k=>{if(sc[k])o[k]={...sc[k],lo:f(sc[k].hi),hi:f(sc[k].lo)}});
  return o}
const sideWord=e=>e.side==='long'?'low':'high',dirWord=e=>e.side==='long'?'LONG':'SHORT';

/* ---------- narrative scene: a 1-hour chart with gaps ---------- */
function narrScn(r,{side='long'}={}){
  for(let att=0;att<40;att++){
    const u=17+r()*7,P=basePrice(r),s=u*.32,C=[],carved=[];
    C.push(mk(P,P+.35*u,P-.3*u,P+.1*u));
    legC(C,r,s,P-.2*u,3);
    legC(C,r,s,P+1.5*u,3);carveLast(C,1,.55*u);carved.push(C.length-1);const f1=C.length-2;   /* F1: a bullish gap that price later fills */
    legC(C,r,s,P+4*u,3);legC(C,r,s,P+3.7*u,2);
    legC(C,r,s,P-.7*u,4);carveLast(C,-1,.5*u);carved.push(C.length-1);const u1=C.length-2;      /* U1: a bearish gap above where price ends up */
    legC(C,r,s,P-6*u,5);legC(C,r,s,P-5.8*u,2);
    legC(C,r,s,P-5.0*u,2);carveLast(C,1,.45*u);carved.push(C.length-1);const u2=C.length-2;     /* U2: a bullish gap below where price ends up */
    legC(C,r,s,P-2*u,4);legC(C,r,s,P-2.9*u,3);
    degap(C,carved);
    const gaps=fvgList(C).filter(g=>g.hi-g.lo>=.3*u);
    const gF=gaps.find(g=>g.i===f1),gU1=gaps.find(g=>g.i===u1),gU2=gaps.find(g=>g.i===u2),cur=C[C.length-1].c;
    if(gaps.length!==3||!gF||!gU1||!gU2||!gF.filled||gU1.filled||gU2.filled||gU1.dir!==-1||gU2.dir!==1||gU1.lo<cur+u||gU2.hi>cur-u)continue;
    const hi=Math.max(...C.map(c=>c.h)),lo=Math.min(...C.map(c=>c.l)),sc={C,P,u,s,t0:18*60,step:60,tf:'60',side:'long',cur,gaps:{up:gU1,down:gU2,filled:gF},rangeHi:q4(hi),rangeLo:q4(lo),mid:q4((hi+lo)/2),zone:cur<(hi+lo)/2?'discount':'premium'};
    if(side==='long')return sc;
    const m=mirrorScn(sc,['cur','rangeHi','rangeLo','mid']),fz=g=>({...g,dir:-g.dir,lo:flipP(P)(g.hi),hi:flipP(P)(g.lo)});
    return{...m,rangeHi:flipP(P)(sc.rangeLo),rangeLo:flipP(P)(sc.rangeHi),zone:sc.zone==='discount'?'premium':'discount',gaps:{up:fz(gU2),down:fz(gU1),filled:fz(gF)}}}
  throw new Error('narrative scene failed')}

/* ---------- Model 1: the external rejection block ---------- */
function m1Scn(r,{side='long',outcome='target',decoy=false}={}){
  const s=2.7+r()*.8,P=basePrice(r),C=[];
  const size=16+Math.floor(r()*13),EL=q4(P),wA=3.5+r()*1.5,wB=10+r()*3,wC=5.5+r()*2;
  const gL=q4(Math.min(EL-.3*size,EL+1.25-wB/2-2.5)),gH=q4(gL+size),gM=q4((gL+gH)/2);
  /* lead-in: a random long wick in mid-air (nothing behind it), then a slide into the gap and equal lows */
  C.push(mk(gH+10,gH+13,gH+7,gH+11));legC(C,r,s,gH+6,3);
  let decoyI=null;if(decoy){const o=C[C.length-1].c;C.push(mk(o,o+.6*s,o-15,o-1.5));decoyI=C.length-1;legC(C,r,s,o-4,1)}
  legC(C,r,s,EL+9,7);
  legC(C,r,s,EL+1.5,2);const eq1=C.length-1;C[eq1].l=EL;C[eq1].c=Math.max(C[eq1].c,q4(EL+1));
  legC(C,r,s,EL+8,2);legC(C,r,s,EL+2,2);const eq2=C.length-1;C[eq2].l=EL;C[eq2].c=Math.max(C[eq2].c,q4(EL+1.25));
  legC(C,r,s,EL+6,1);
  /* the cluster: three attempts below the equal lows, none closes beyond them. The longest wick is the most rejected. */
  const A=mk(EL+6,EL+7,EL-wA,EL+2.5);C.push(A);const iA=C.length-1;legC(C,r,s,EL+8,1);
  const B=mk(EL+8,EL+9,EL-wB,EL+2.5);C.push(B);const iB=C.length-1;legC(C,r,s,EL+7,1);
  const Cc=mk(EL+7,EL+7.5,EL-wC,EL+3);C.push(Cc);const iC=C.length-1;
  const E=wickMid(C[iB]),stopD=10,stop=q4(E-stopD),T=q4(E+40),D2=q4(E+78);
  const swept=q4(Math.min(C[iA].l,C[iB].l,C[iC].l)),reactI0=C.length;
  legC(C,r,s,E+22,4);
  let fillI=null,exitI=null,untap=null;
  const edged=outcome==='edged',tapped=outcome==='tapped';
  if(tapped){const uH=q4(swept-3),uL=q4(uH-14);untap={lo:uL,hi:uH}}
  legC(C,r,s,edged?E+1.75:E+1,3);
  if(!edged){const k=C.length-1;C[k].l=q4(E-.75);fillI=k}else C[C.length-1].l=Math.max(C[C.length-1].l,q4(E+1.25));
  const afterFill=C.length;
  if(outcome==='target'||edged){legC(C,r,s,T+3,7);exitI=edged?null:(()=>{for(let i=afterFill;i<C.length;i++)if(C[i].h>=T)return i;return null})();
    /* the trade is over at the target; keep a little more price after it */
    if(!edged)legC(C,r,s,T+9,2)}
  else if(outcome==='stop'){legC(C,r,s,stop-.5,4);for(let i=afterFill;i<C.length;i++)if(C[i].l<=stop-.25){exitI=i;C[i].l=Math.min(C[i].l,q4(stop-.5));break};legC(C,r,s,stop-6,2)}
  else{ /* tapped: price runs down into the untapped gap, takes the stop, then does what was expected */
    legC(C,r,s,untap.hi+1,4);C[C.length-1].l=q4(untap.hi-4);for(let i=afterFill;i<C.length;i++)if(C[i].l<=stop-.25){exitI=i;break}
    legC(C,r,s,T+4,8)}
  degap(C);
  const mids=[iA,iB,iC].map(i=>({i,mid:wickMid(C[i]),len:wickLen(C[i])}));
  const draw={lo:T,hi:q4(T+14)},gap={lo:gL,hi:gH};
  let sc={C,P,s,t0:570,step:5,side:'long',outcome:tapped?'tapped':outcome,EL,eq:[eq1,eq2],cluster:[iA,iB,iC],iB,gap,gM,swept,mids,decoyI,E,stop,stopD,T,D2,draw,fillI,exitI,untap,reactI0,
    zoneI:{i0:0,i1:C.length-1},gapSize:size};
  if(side==='short')sc=mirrorScn(sc,['EL','gM','swept','E','stop','T','D2'],['gap','draw','untap']),sc.mids=mids.map(m=>({...m,mid:flipP(P)(m.mid)}));
  return sc}

/* ---------- Model 2: the CISD rejection block ---------- */
function m2Scn(r,{side='long',outcome='target',noRetest=false}={}){
  const s=2.8+r()*.8,P=basePrice(r),C=[];
  const Lr=q4(P);
  C.push(mk(Lr+6,Lr+8,Lr+4,Lr+5));legC(C,r,s,Lr+9,2);legC(C,r,s,Lr+2,2);
  C.push(mk(C[C.length-1].c,Lr+7,Lr-2,Lr+5));const rejI=C.length-1;       /* the rejection out of the higher-timeframe gap */
  const H1=q4(Lr+44+r()*8);legC(C,r,s,H1,7);const topI=C.length-1;
  /* the pullback: a couple of mixed candles, then three red candles that drove the last leg down */
  /* a short red pullback, then one green candle that closes at C0, then the three red candles: the red run is exactly those three */
  const C0=q4(H1-13-r()*3);legC(C,r,s,q4(C0-4),2);{const pl=C[C.length-1].c;C.push(mk(pl,C0+.6,pl-.5,C0))}
  const R=[];for(let k=0;k<3;k++){const o=C[C.length-1].c;const c=q4(o-(4.5+r()*2));C.push(mk(o,o+.8+r()*.8,c-(.4+r()*1.2),c));R.push(C.length-1)}
  C[R[0]].o=C0;C[R[0]].h=Math.max(C[R[0]].h,C0+.5);C[R[0]].c=Math.min(C[R[0]].c,q4(C0-4));
  const lowRun=C[R[2]].c;
  /* the CISD candle: closes above the open of the first red candle */
  const K=mk(lowRun,C0+6,lowRun-1,q4(C0+4.5+r()*1.5));C.push(K);const kI=C.length-1;
  let t1=null,fillI=null,exitI=null,E=null,stop=null,T=null,retestI=null;
  if(noRetest){legC(C,r,s,q4(C0+22),4);legC(C,r,s,q4(C0+34),9);legC(C,r,s,q4(C0+31),2)}
  else{
    legC(C,r,s,q4(C0+10),2);
    /* the retest: a wick down to the CISD level that does not close below it */
    legC(C,r,s,q4(C0+5.5),1);
    const dip=5+r()*3;C.push(mk(C[C.length-1].c,C[C.length-1].c+.8,q4(C0-dip),q4(C0+2.6)));t1=C.length-1;retestI=t1;
    E=wickMid(C[t1]);stop=q4(E-12);T=q4(E+40);
    legC(C,r,s,q4(C0+11),3);                           /* price bounces, then comes back for the limit */
    legC(C,r,s,q4(C0+4),2);C[C.length-1].l=q4(E-.75);fillI=C.length-1;     /* the fill is a wick down to the limit: the candle still closes above the CISD level */
    const afterFill=C.length;
    if(outcome==='target'){legC(C,r,s,T+3,8);for(let i=afterFill;i<C.length;i++)if(C[i].h>=T){exitI=i;break};legC(C,r,s,T+8,2)}
    else{ /* hard exit: a candle closes back through the CISD level; price would have gone on to the target anyway */
      legC(C,r,s,q4(C0+6),2);const o=C[C.length-1].c,c=q4(C0-2.5-r()*1.5);C.push(mk(o,o+.6,c-1,c));exitI=C.length-1;
      legC(C,r,s,q4(C0+8),2);legC(C,r,s,q4(T+3),7)}
  }
  degap(C);
  const lastI=C.length-1,drawZ={lo:q4((E??C0)+40),hi:q4((E??C0)+58)};
  let sc={C,P,s,t0:570,step:5,side:'long',outcome:noRetest?'noRetest':outcome,Lr,rejI,H1,topI,C0,runI:R,lowRun,kI,retestI,E,stop,T,fillI,exitI,draw:drawZ,
    gap1:{lo:q4(Lr-6),hi:q4(Lr+8)}};
  if(side==='short')sc=mirrorScn(sc,['Lr','H1','C0','lowRun','E','stop','T'],['draw','gap1']);
  return sc}

/* ---------- Model 3: the 1-minute continuation ---------- */
function m3Scn(r,{side='long',outcome='target',qualifies=true}={}){
  const s=1.7+r()*.5,P=basePrice(r),C=[];
  const gapSize=3+Math.floor(r()*3);
  C.push(mk(P,P+1.4,P-1.2,P+.5));legC(C,r,s,P+2,5);legC(C,r,s,P-1,4);
  {const pl=C[C.length-1].c;C.push(mk(pl,pl+1.4,pl-.3,q4(pl+1.25)))}      /* one green candle so the red run is exactly the three below */
  const C0=C[C.length-1].c;
  const R=[];{let p=C0;for(let k=0;k<3;k++){const o=p,c=q4(o-(1.6+r()*.9));C.push(mk(o,o+.4,c-.5,c));R.push(C.length-1);p=c}}
  C[R[0]].o=C0;C[R[0]].h=Math.max(C[R[0]].h,C0+.4);
  const lowRun=C[R[2]].c;
  /* the impulse: a small candle, a big one that closes above the CISD level, and a third that leaves a gap behind */
  const g1=mk(lowRun,q4(lowRun+2.5),lowRun-.5,q4(lowRun+1.75));C.push(g1);const iG1=C.length-1;
  const g1h=g1.h;
  const gL=q4(g1h),gH=q4(g1h+gapSize);
  const o2=g1.c,c2=q4(C0+7+r()*2);C.push(mk(o2,c2+.6,o2-.5,c2));const iG2=C.length-1;
  const c3=q4(gH+3.5);C.push(mk(c2-.5,c3+1,gH,c3));const iG3=C.length-1;
  legC(C,r,s,q4(C0+10),2);
  const wLow=qualifies?q4(C0-4.5):q4(gL+.4);
  legC(C,r,s,q4(C0+6),2);
  /* the retest: rejects out of both the gap and the CISD level (or closes through the level and does not qualify) */
  const wo=C[C.length-1].c,wc=qualifies?q4(C0+2.25):q4(C0-1.5);
  C.push(mk(wo,wo+.5,wLow,wc));const wI=C.length-1;
  const E=qualifies?wickMid(C[wI]):q4((Math.min(wo,wc)+wLow)/2),stop=q4(E-10),T=q4(E+30);
  let fillI=null,exitI=null;
  if(qualifies){
    legC(C,r,s,q4(E+9),3);legC(C,r,s,q4(E+1),2);C[C.length-1].l=q4(E-.75);fillI=C.length-1;const af=C.length;
    if(outcome==='target'){legC(C,r,s,T+2,8);for(let i=af;i<C.length;i++)if(C[i].h>=T){exitI=i;break};legC(C,r,s,T+5,2)}
    else{legC(C,r,s,stop-.5,5);for(let i=af;i<C.length;i++)if(C[i].l<=stop-.25){exitI=i;break};legC(C,r,s,stop-4,2)}
  }else{legC(C,r,s,q4(C0-9),5);legC(C,r,s,q4(C0-14),4)}
  degap(C,[iG3]);
  let sc={C,P,s,t0:570,step:1,side:'long',outcome:qualifies?outcome:'void',qualifies,C0,runI:R,lowRun,gap:{lo:gL,hi:gH,i:iG2},iG1,iG2,iG3,wI,wLow,E,stop,T,fillI,exitI,gapSize};
  if(side==='short')sc=mirrorScn(sc,['C0','lowRun','wLow','E','stop','T'],['gap']);
  return sc}
