/* ============================================================
   more scenario generators (modules 19–30): order tickets, trade management, levels, Asia, Echo and Orbit
============================================================ */

/* ---- a pullback with a support below and a resistance above, for order-ticket tasks. 5-minute candles from 09:00 ---- */
function ticketScn(r,{flip=false}={}){
  const s=5+r()*3,P=basePrice(r);
  const {C,piv}=legsBuild(r,P,s,[{d:1,n:5,mag:7*s},{d:-1,n:4,mag:4.2*s},{d:1,n:3,mag:2.4*s}]);
  let out={C,res:piv[0].p,supp:piv[1].p,mkt:C[C.length-1].c,s,P,t0:540,step:5};
  if(flip){const M=P,f=x=>2*M-x;out={...out,C:mirrorC(C,M),res:f(piv[1].p),supp:f(piv[0].p),mkt:f(C[C.length-1].c)}}
  out.mkt=q4(out.mkt);out.res=q4(out.res);out.supp=q4(out.supp);
  return out;
}

/* ---- a long trade that is managed after entry. kind: 'be' (to 1:1, dips, then the target), 'trail' (steady higher lows),
        'drop' (straight to the stop), 'stall' (stalls under an old high, then falls back to breakeven).
        risk R points; entry at index e. Mirrored for shorts. ---- */
function mgmtScn(r,{kind='be',short=false}={}){
  const s=4+r()*2,P=basePrice(r),R=q4(10+Math.floor(r()*4)*2.5),tpPts=q4(R*2.7),C=[];let p=P;
  const pre=legsBuild(r,P,s,[{d:-1,n:3,mag:3*s},{d:1,n:2,mag:1.8*s}]);pre.C.forEach(c=>C.push(c));p=C[C.length-1].c;
  const e=C.length-1,entry=q4(C[e].c),stop=q4(entry-R),target=q4(entry+tpPts),oneR=q4(entry+R);
  const step=(o,c,w1=.15,w2=.15)=>{C.push(mk(o,Math.max(o,c)+w1*s*r(),Math.min(o,c)-w2*s*r(),c));p=C[C.length-1].c};
  const out={entry,stop,target,oneR,R,tpPts,e,s,P,kind,short};
  if(kind==='be'){
    while(p<oneR-.8*s)step(p,Math.min(oneR-.4*s,p+(1+r())*s));
    step(p,oneR+.6*s);out.oneI=C.length-1;                                             // first candle to reach 1:1
    step(p,entry+.45*R);step(p,entry+.3*R,.1,.1);                                      // pulls back, holds above entry
    out.pullLow=q4(Math.min(C[C.length-1].l,C[C.length-2].l));
    while(p<target-.5*s)step(p,Math.min(target+.3*s,p+(1.2+r())*s));
    step(p,target+.4*s);out.endI=C.length-1;
  } else if(kind==='trail'){
    let lo=entry;const lows=[];
    for(let k=0;k<5;k++){step(p,p+(1.6+r())*s);step(p,p+(1.4+r())*s);const c=p;step(p,p-(.8+r()*.4)*s,.1,.1);lows.push({i:C.length-1,p:q4(C[C.length-1].l)});step(p,c+.3*s)}
    out.lows=lows;out.endI=C.length-1;out.lastLow=lows[lows.length-2];
  } else if(kind==='drop'){
    for(let k=0;k<3;k++)step(p,p-(.5+k*.8+r()*.3)*s);
    while(p>stop+.2*s)step(p,Math.max(stop-.4*s,p-(1.2+r())*s));
    step(p,stop-.6*s,.05,.4);out.stopI=C.findIndex((c,i)=>i>e&&c.l<=stop);for(let k=0;k<3;k++)step(p,p-(.5+r())*s);out.endI=C.length-1;
  } else { // stall
    const hi=q4(entry+tpPts*.82);while(p<hi-.6*s)step(p,Math.min(hi-.2*s,p+(1.1+r())*s));
    step(p,hi,.3,.1);out.oldHigh=q4(C[C.length-1].h);out.stallI=C.length-1;
    for(let k=0;k<3;k++)step(p,Math.min(hi-.5*s,p+(r()-.5)*.8*s),.05,.15);
    while(p>entry+.2*s)step(p,Math.max(entry,p-(1+r())*s));
    out.endI=C.length-1;
  }
  if(short){const M=P,f=x=>2*M-x;out.C=mirrorC(C,M);['entry','stop','target','oneR','pullLow','oldHigh'].forEach(k=>{if(out[k]!=null)out[k]=f(out[k])});if(out.lows)out.lows=out.lows.map(l=>({...l,p:f(l.p)}));if(out.lastLow)out.lastLow={...out.lastLow,p:f(out.lastLow.p)}}
  else out.C=C;
  return out;
}

/* ---- ECHO: old low → sweep → displacement (FVG) → CISD → rejection block inside the FVG → the draw (old high).
        draw:'near' puts the only draw under 2× the stop. side:'short' is the mirror image. ---- */
function echoScn(r,{side='long',draw='ok'}={}){
  const s=4.5+r()*2,P=basePrice(r),D=(draw==='ok'?10:6)*s;
  const {C,piv}=legsBuild(r,P,s,[{d:1,n:3,mag:4*s},{d:-1,n:5,mag:D},{d:1,n:3,mag:3*s},{d:-1,n:3,mag:3.5*s}]);
  const oldHigh=piv[0].p,L0=piv[1].p,lvlI=piv[1].i,leg4=piv[2].i+1,sweepI=C.length-1,dm0=C[leg4].o,S=C[sweepI];
  const push=c=>C.push(c);
  const d1=mk(S.c,S.c+2.2*s,S.c-.1*s,S.c+2.1*s);push(d1);
  const d2=mk(d1.c,d1.c+2.8*s,d1.c-.1*s,d1.c+2.6*s);push(d2);
  const d3=mk(d2.c,d2.c+.85*s,d2.c-.05*s,d2.c+.6*s);push(d3);
  const fvg={lo:d1.h,hi:d3.l,i0:sweepI+1,i1:sweepI+3};
  const a1=mk(d3.c,d3.c+.1*s,d3.c-.5*s,d3.c-.3*s);push(a1);
  const rb=mk(a1.c,a1.c+.15*s,fvg.lo+(fvg.hi-fvg.lo)*.35,fvg.hi+.3*s);push(rb);const rbI=C.length-1;
  const entry=q4(rb.c),stop=q4(rb.l-.3*s);let p=rb.c;
  for(let k=0;k<30&&C[C.length-1].h<oldHigh;k++){const o=p,c=Math.min(oldHigh+.3*s,o+(1.2+r()*.6)*s);push(mk(o,c+.2*s*r(),o-.15*s*r(),c));p=C[C.length-1].c}
  const cisdI=C.findIndex((c,i)=>i>sweepI&&c.c>dm0);
  let out={C,t0:540,s,P,side:'long',lvl:L0,lvlI,sweepI,cisdLevel:dm0,cisdFrom:leg4,cisdI,fvg,rbI,rb:{lo:rb.l,hi:fvg.hi},entry,stop,draw:oldHigh,ratio:(oldHigh-entry)/(entry-stop),ok:(oldHigh-entry)/(entry-stop)>=2};
  if(side==='short'){const f=x=>2*P-x;out={...out,C:mirrorC(C,P),side:'short',lvl:f(L0),cisdLevel:f(dm0),fvg:{...fvg,lo:f(fvg.hi),hi:f(fvg.lo)},rb:{lo:f(out.rb.hi),hi:f(out.rb.lo)},entry:f(entry),stop:f(stop),draw:f(oldHigh)}}
  return out;
}

/* ---- ORBIT: a big swing, the fib, a pullback into the 0.62–0.79 zone, a gap on the leg in, its inversion, then the draw (the swing end).
        rho: pass a shallow value (e.g. .38) for a pullback that never reaches the zone. A = swing start, B = swing end, fib(x) = B+(A−B)x. ---- */
function orbitScn(r,{side='long',rho=null}={}){
  for(let t=0;t<30;t++){const o=orbitTry(r,side,rho);if(o)return o}
  return orbitTry(r,side,rho,true);
}
function orbitTry(r,side,rho0,force){
  const s=4.5+r()*2,P=basePrice(r),U=20*s,rho=rho0??(.68+r()*.06),k=s,m1=Math.max(1.2*s,rho*U-4.5*k);
  const {C,piv}=legsBuild(r,P,s,[{d:-1,n:3,mag:2*s},{d:1,n:8,mag:U},{d:-1,n:4,mag:m1}]);
  const A=piv[0].p,B=piv[1].p,aI=piv[0].i,bI=piv[1].i,push=c=>C.push(c),last=C[C.length-1];
  const b1=mk(last.c,last.c+.1*k,last.c-1.3*k,last.c-1.2*k);push(b1);
  const b2=mk(b1.c,b1.c+.1*k,b1.c-2.5*k,b1.c-2.4*k);push(b2);
  const b3=mk(b2.c,b2.c+.1*k,b2.c-.9*k,b2.c-.8*k);push(b3);
  const gap={lo:b3.h,hi:b1.l,i0:C.length-3,i1:C.length-1},low=b3.l,Ux=B-A,got=(B-low)/Ux;
  if(!force&&(rho0==null?(got<.63||got>.78):Math.abs(got-rho0)>.04))return null;
  const x=mk(b3.c,b3.c+.4*k,b3.c-.1*k,b3.c+.3*k);push(x);
  const inv=mk(x.c,gap.hi+.7*k,x.c-.05*k,gap.hi+.5*k);push(inv);const invI=C.length-1;
  const entry=q4(inv.c),stop=q4(low-.3*k);let p=inv.c;
  for(let q=0;q<30&&C[C.length-1].h<B;q++){const o=p,c=Math.min(B+.3*s,o+(1.4+r()*.6)*s);push(mk(o,c+.2*s*r(),o-.15*s*r(),c));p=C[C.length-1].c}
  const ratio=(B-entry)/(entry-stop);if(!force&&rho0==null&&ratio<2.05)return null;
  let out={C,t0:540,s,P,side:'long',A,B,aI,bI,low,gap,invI,entry,stop,draw:B,ratio,rho:got,U:Ux};
  if(side==='short'){const f=x=>2*P-x;out={...out,C:mirrorC(C,P),side:'short',A:f(A),B:f(B),low:f(low),gap:{...gap,lo:f(gap.hi),hi:f(gap.lo)},entry:f(entry),stop:f(stop),draw:f(B)}}
  out.fib=x=>out.B+(out.A-out.B)*x;
  return out;
}

/* ---- PLC: a bullish FVG, then a pullback whose swing low sits INSIDE the gap and holds. 1-hour candles from 06:00. short = mirror (PHC) ---- */
function plcScn(r,{side='long'}={}){
  const s=4.5+r()*2,P=basePrice(r),{C}=legsBuild(r,P,s,[{d:-1,n:4,mag:3*s}]),L=C[C.length-1],push=c=>C.push(c);
  const k1=mk(L.c,L.c+1.0*s,L.c-.2*s,L.c+.8*s);push(k1);const k2=mk(k1.c,k1.c+3.0*s,k1.c-.1*s,k1.c+2.8*s);push(k2);const k3=mk(k2.c,k2.c+.8*s,k2.c-.1*s,k2.c+.6*s);push(k3);
  const gap={lo:k1.h,hi:k3.l,i0:C.length-3,i1:C.length-1};
  const p1=mk(k3.c,k3.c+.1*s,gap.lo+(gap.hi-gap.lo)*.3,gap.lo+(gap.hi-gap.lo)*.75);push(p1);const plcI=C.length-1,plc=p1.l;
  let p=p1.c;for(let k=0;k<6;k++){const o=p,c=o+(.7+r()*.6)*s;push(mk(o,c+.2*s*r(),o-.1*s*r(),c));p=C[C.length-1].c}
  let out={C,t0:360,step:60,s,P,side:'long',gap,plcI,plc};
  if(side==='short'){const f=x=>2*P-x;out={...out,C:mirrorC(C,P),side:'short',gap:{...gap,lo:f(gap.hi),hi:f(gap.lo)},plc:f(plc)}}
  return out;
}
/* ---- Range Settlement: 08:00–09:25 range, the 9:30 open below RS (dir 'up' = draw up), price is pulled to RS, then fades ---- */
function rsScn(r,{dir='up'}={}){
  const s=4.5+r()*2,P=basePrice(r),C=[],RS=q4(P+9*s);let p=rangeC(C,r,s,18,P-3*s,P+3*s,P).p;
  for(let k=0;k<30&&C[C.length-1].h<RS;k++){const o=p,c=Math.min(RS+.2*s,o+(1+r()*.8)*s);C.push(mk(o,c+.2*s*r(),o-.15*s*r(),c));p=C[C.length-1].c}
  const fillI=C.findIndex((c,i)=>i>=18&&c.h>=RS);
  for(let k=0;k<4;k++){const o=p,c=o-(.3+r()*.7)*s;C.push(mk(o,o+.1*s*r(),c-.2*s*r(),c));p=C[C.length-1].c}
  let out={C,t0:480,s,P,RS,openI:18,fillI,dir:'up'};
  if(dir==='down'){const f=x=>2*P-x;out={...out,C:mirrorC(C,P),RS:f(RS),dir:'down'}}
  return out;
}
/* ---- Asia PO3 (long): a bullish key-level gap, drift up, a drop into the key level (small bearish gap = IFG), the close back through it, then 1:1. 5-minute candles from 20:00 ---- */
function asiaScn(r,{side='long'}={}){
  const s=4.5+r()*2,P=basePrice(r),{C}=legsBuild(r,P,s,[{d:-1,n:3,mag:2.5*s}]),L=C[C.length-1],push=c=>C.push(c);
  const k1=mk(L.c,L.c+1.0*s,L.c-.2*s,L.c+.8*s);push(k1);const k2=mk(k1.c,k1.c+3.0*s,k1.c-.1*s,k1.c+2.8*s);push(k2);const k3=mk(k2.c,k2.c+.8*s,k2.c-.1*s,k2.c+.6*s);push(k3);
  const KL={lo:k1.h,hi:k3.l,i0:C.length-3,i1:C.length-1};let p=k3.c;
  for(let k=0;k<4;k++){const o=p,c=o+.8*s;push(mk(o,c+.15*s,o-.1*s,c));p=C[C.length-1].c}
  const m1=mk(p,p+.1*s,p-1.1*s,p-1.0*s);push(m1);const m2=mk(m1.c,m1.c+.1*s,m1.c-2.3*s,m1.c-2.2*s);push(m2);const m3=mk(m2.c,m2.c+.1*s,m2.c-.9*s,m2.c-.6*s);push(m3);const lowI=C.length-1;
  const ifg={lo:m3.h,hi:m1.l,i0:lowI-2,i1:lowI};
  const x=mk(m3.c,m3.c+.4*s,m3.c-.1*s,m3.c+.3*s);push(x);const inv=mk(x.c,ifg.hi+.7*s,x.c-.05*s,ifg.hi+.5*s);push(inv);const invI=C.length-1;
  const entry=q4(inv.c),stop=q4(m3.l-.3*s),target=q4(entry+(entry-stop));p=inv.c;
  for(let k=0;k<20&&C[C.length-1].h<target;k++){const o=p,c=Math.min(target+.3*s,o+(1.2+r()*.5)*s);push(mk(o,c+.2*s*r(),o-.15*s*r(),c));p=C[C.length-1].c}
  let out={C,t0:1200,s,P,side:'long',KL,lowI,ifg,invI,entry,stop,target,low:m3.l};
  if(side==='short'){const f=y=>2*P-y;out={...out,C:mirrorC(C,P),side:'short',KL:{...KL,lo:f(KL.hi),hi:f(KL.lo)},ifg:{...ifg,lo:f(ifg.hi),hi:f(ifg.lo)},entry:f(entry),stop:f(stop),target:f(target),low:f(out.low)}}
  return out;
}
