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
