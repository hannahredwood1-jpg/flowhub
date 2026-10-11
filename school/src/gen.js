/* ============================================================
   candles + scenario generators (every scenario carries its own ground truth)
============================================================ */
/* robust OHLC: whatever order h and l are passed in, the high is the highest value and the low the lowest */
const mk=(o,h,l,c)=>{const H=Math.max(o,h,l,c),L=Math.min(o,h,l,c);return{o:q4(o),h:q4(H),l:q4(L),c:q4(c)}};
const mirrorC=(cs,M)=>cs.map(c=>mk(2*M-c.o,2*M-c.l,2*M-c.h,2*M-c.c));
const agg=(C,k)=>{const o=[];for(let i=0;i<C.length;i+=k){const s=C.slice(i,i+k);o.push({o:s[0].o,c:s[s.length-1].c,h:Math.max(...s.map(x=>x.h)),l:Math.min(...s.map(x=>x.l))})}return o};
const ov1=(a0,a1,b0,b1)=>{const lo=Math.max(a0,b0),hi=Math.min(a1,b1),u=Math.max(a1,b1)-Math.min(a0,b0);return u>0?Math.max(0,hi-lo)/u:0};
const basePrice=r=>q4(21300+r()*500);

/* swing highs / lows: a candle whose high (low) is beyond both neighbours */
function swings(C){const hi=[],lo=[];for(let i=1;i<C.length-1;i++){if(C[i].h>C[i-1].h&&C[i].h>C[i+1].h)hi.push(i);if(C[i].l<C[i-1].l&&C[i].l<C[i+1].l)lo.push(i)}return{hi,lo}}

/* directional legs. Highs and lows strictly rise (fall) inside a leg, so every leg end is an exact swing. */
function legsBuild(r,P,s,legs){
  const C=[],piv=[];let p=P;
  legs.forEach((lg,k)=>{
    const n=lg.n,st=lg.mag/n,d=lg.d;
    for(let j=0;j<n;j++){
      const w=r()*.16*st,v=r()*.05*st,b=k>0?.18*st:0;let o,h,l,c;
      if(d>0){l=p+b+j*st+v;h=p+(j+1)*st+w;o=l+(.12+r()*.12)*st;c=h-(.1+r()*.1)*st;if(c<=o)c=o+.2*st}
      else{h=p-b-j*st-v;l=p-(j+1)*st-w;o=h-(.12+r()*.12)*st;c=l+(.1+r()*.1)*st;if(c>=o)c=o-.2*st}
      C.push(mk(o,h,l,c));
    }
    const last=C[C.length-1];p=d>0?last.h:last.l;piv.push({i:C.length-1,p,t:d>0?'h':'l'});
  });
  return{C,piv};
}
const flipPiv=(piv,M)=>piv.map(x=>({i:x.i,p:2*M-x.p,t:x.t==='h'?'l':'h'}));
/* noise candles that never leave an accidental gap against the candle two bars back */
function noiseC(C,r,s,n,p){for(let k=0;k<n;k++){const o=p,body=(.15+r()*.75)*s*(r()<.5?-1:1),c=o+body;let h=Math.max(o,c)+r()*.45*s,l=Math.min(o,c)-r()*.45*s;const a=C[C.length-2];
  if(a){if(l>a.h)l=a.h-r()*.2*s;if(h<a.l)h=a.l+r()*.2*s}C.push(mk(o,h,l,c));p=C[C.length-1].c}return p}
/* candles that stay inside [lo,hi]; touch both edges exactly once */
function rangeC(C,r,s,n,lo,hi,startP){
  lo=q4(lo);hi=q4(hi);const R=hi-lo;let p=startP??(lo+R/2);const i0=C.length,a=Math.floor(r()*Math.max(1,n/3)),b=Math.floor(n/2+r()*(n/2-.01));
  for(let k=0;k<n;k++){const o=p,c=lo+R*(.15+r()*.7);let h=Math.min(hi,Math.max(o,c)+r()*.3*s),l=Math.max(lo,Math.min(o,c)-r()*.3*s);
    if(k===a)h=hi;if(k===b&&b!==a)l=lo;C.push(mk(o,h,l,c));p=C[C.length-1].c}
  return{p,iHi:i0+a,iLo:i0+(b===a?Math.min(n-1,b+1):b)};
}
const upC=(C,r,s,n,p,mag)=>{for(let k=0;k<n;k++){const o=p,c=o+mag*(.8+r()*.4);C.push(mk(o,c+r()*.2*s,o-r()*.15*s,c));p=C[C.length-1].c}return p};

/* ---- trend: swings come out exact ---- */
function trendScn(r,kind,opt={}){
  const s=opt.s||(4+r()*3),P=basePrice(r),n=()=>3+Math.floor(r()*3);let legs=[];
  if(kind==='range'){const R=(opt.R||4)*s*(1+r()*.2);for(let i=0;i<(opt.legs||5);i++)legs.push({d:i%2?-1:1,n:n(),mag:R*(.95+r()*.1)})}
  else{let U=n()*s*(.9+r()*.25),D;legs.push({d:1,n:n(),mag:U});
    for(let i=1;i<(opt.legs||5);i++){if(i%2){D=U*(.4+.2*r());legs.push({d:-1,n:n(),mag:D})}else{U=D+U*(.45+.3*r())*.9;legs.push({d:1,n:n(),mag:U})}}}
  let {C,piv}=legsBuild(r,P,s,legs);
  if(kind==='down'){C=mirrorC(C,P);piv=flipPiv(piv,P)}
  return{C,piv,kind,s,P};
}

/* ---- liquidity sweep vs breakout above a swing high ---- */
function sweepScn(r,{kind='sweep',side='high'}={}){
  const s=4+r()*3,P=basePrice(r),U=4*s*(1+r()*.25);
  const {C,piv}=legsBuild(r,P,s,[{d:1,n:4,mag:U},{d:-1,n:3,mag:U*.55},{d:1,n:3,mag:U*.55*.8}]);
  const H=piv[0].p,hi=piv[0].i,last=C[C.length-1];let sw,p;
  if(kind==='sweep'){sw=mk(last.c,H+(.35+r()*.5)*s,last.c-.15*s,H-(.15+r()*.25)*s);C.push(sw);p=sw.c;
    for(let k=0;k<5;k++){const o=p,c=p-(1+r()*.6)*s;C.push(mk(o,o+.15*s*r(),c-.2*s*r(),c));p=C[C.length-1].c}}
  else{sw=mk(last.c,H+.8*s,last.c-.1*s,H+(.45+r()*.3)*s);C.push(sw);p=sw.c;
    for(let k=0;k<3;k++){const o=p,c=p+(.5+r()*.5)*s;C.push(mk(o,c+.2*s*r(),o-.1*s*r(),c));p=C[C.length-1].c}}
  const sweepI=C.indexOf(sw),opp={p:piv[1].p,i:piv[1].i};
  let bosI=-1;if(kind==='sweep'){for(let k=sweepI+1;k<C.length;k++)if(C[k].c<opp.p){bosI=k;break}}
  let out={C,level:{p:H,i:hi},opp,bosI,sweepI,kind,side,s,P};
  if(side==='low'){out={...out,C:mirrorC(C,P),level:{p:2*P-H,i:hi},opp:{p:2*P-opp.p,i:opp.i}}}
  return out;
}
/* ---- break of structure: close vs wick ---- */
function bosScn(r,{dir='bear',kind='close'}={}){
  const s=4+r()*3,P=basePrice(r),U1=4*s*(1+r()*.2),D1=U1*(.4+.15*r()),U2=D1+U1*(.5+.25*r()),D2=U2*(.4+.12*r()),U3=D2+U2*(.5+.25*r());
  const {C,piv}=legsBuild(r,P,s,[{d:1,n:4,mag:U1},{d:-1,n:3,mag:D1},{d:1,n:4,mag:U2},{d:-1,n:3,mag:D2},{d:1,n:4,mag:U3}]);
  const L1=piv[1],L2=piv[3],H3=piv[4],gap=H3.p-L2.p;let q=C[C.length-1].c,bosI=-1,wickI=-1;
  const push=(o,h,l,c)=>{C.push(mk(o,h,l,c));q=C[C.length-1].c};
  push(q,q+.1*s,q-.4*gap,q-.35*gap);
  push(q,q+.1*s,q-.3*gap,q-.27*gap);
  push(q,q+.1*s,L2.p+.55*s,L2.p+.9*s);
  if(kind==='close'){const bc=L2.p-(.3+r()*.35)*s;push(q,q+.1*s,bc-.25*s,bc);bosI=C.length-1;
    push(q,q+.1*s,q-.4*s,q-.3*s);push(q,q+.15*s,q-.3*s,q-.2*s)}
  else{push(q,q+.15*s,L2.p-(.45+r()*.4)*s,L2.p+(.35+r()*.3)*s);wickI=C.length-1;upC(C,r,s,3,C[C.length-1].c,.8*s)}
  let out={C,level:{p:L2.p,i:L2.i},older:{p:L1.p,i:L1.i},top:{p:H3.p,i:H3.i},bosI,wickI,kind,dir,s,P};
  if(dir==='bull'){out={...out,C:mirrorC(C,P),level:{p:2*P-L2.p,i:L2.i},older:{p:2*P-L1.p,i:L1.i},top:{p:2*P-H3.p,i:H3.i}}}
  return out;
}
/* ---- opening gaps (day / week) ---- */
function gapScn(r,{dir=1,filled=true,kind='day'}={}){
  const s=5+r()*3,P=basePrice(r),C=[];let p=P;
  const walk=n=>{for(let k=0;k<n;k++){const o=p,c=o+(.15+r()*.7)*s*(r()<.5?-1:1);C.push(mk(o,Math.max(o,c)+r()*.4*s,Math.min(o,c)-r()*.4*s,c));p=C[C.length-1].c}};
  walk(16);const X=p,g=(kind==='week'?4+r()*3:kind==='candle'?.7+r()*.5:2+r()*2)*s;p=q4(X+g);const breakI=C.length;
  for(let k=0;k<3;k++){const o=p,c=o+(.3+r()*.5)*s;C.push(mk(o,c+.2*s*r(),(k?o:Math.max(o-.3*s*r(),X+g*.55)),c));p=C[C.length-1].c}
  let filledI=-1;
  for(let k=0;k<4;k++){const o=p,c=o-(.6+r()*.5)*s;let l=c-.15*s*r();
    if(k===3){if(filled){l=X-.25*s;filledI=C.length}else l=Math.max(l,X+.7*s)}
    C.push(mk(o,o+.15*s*r(),l,Math.max(c,l+.2*s)));p=C[C.length-1].c;if(!filled&&p<X+.9*s)p=X+1.1*s}
  for(let k=0;k<3;k++){const o=p,c=o+(.2+r()*.5)*s;C.push(mk(o,c+.2*s*r(),Math.max(o-.2*s*r(),filled?-1e9:X+.7*s),c));p=C[C.length-1].c}
  const tf=kind==='day'?'15':kind==='week'?'60':'5';
  const labels=kind==='day'?(i=>i<breakI?hhmm(1005-(breakI-1-i)*15):hhmm(1080+(i-breakI)*15)):kind==='week'?(i=>i<breakI?'Fri '+hhmm(1020-(breakI-i)*60):'Sun '+hhmm(1080+(i-breakI)*60)):null;
  let out={C,X,gap:{lo:X,hi:q4(X+g)},breakI,filledI,filled,kind,dir,s,P,tf,labels};
  if(dir<0)out={...out,C:mirrorC(C,P),X:2*P-X,gap:{lo:2*P-q4(X+g),hi:2*P-X}};
  return out;
}
/* ---- fair value gap triple + scenarios ---- */
function tri(P,s,gap,flip){
  const c1=mk(P-.2*s,P+1*s,P-.6*s,P+.7*s),c2=mk(P+.6*s,P+2.9*s,P+.5*s,P+2.7*s),l3=c1.h+gap*s,c3=mk(l3+.3*s,l3+1*s,l3,l3+.7*s);
  const cs=[c1,c2,c3];return flip?mirrorC(cs,P):cs;
}
function findFVGs(C){const out=[];for(let i=1;i<C.length-1;i++){const a=C[i-1],c=C[i+1];
  if(c.l>a.h)out.push({type:'bull',i0:i-1,i1:i+1,lo:a.h,hi:c.l});else if(c.h<a.l)out.push({type:'bear',i0:i-1,i1:i+1,lo:c.h,hi:a.l})}return out}
function fvgScn(r,plan){
  let last;
  for(let tries=0;tries<120;tries++){
    const s=5+r()*3;let p=basePrice(r);const C=[],inj=[];
    p=noiseC(C,r,s,3+Math.floor(r()*3),p);
    for(const kind of plan){const flip=kind==='bear'||(kind==='decoy'&&r()<.5),gap=kind==='decoy'?-(.2+r()*.4):.45+r()*.65;
      inj.push({kind,i0:C.length});C.push(...tri(p,s,gap,flip));p=C[C.length-1].c;p=noiseC(C,r,s,3+Math.floor(r()*3),p)}
    const truth=findFVGs(C),want=plan.filter(k=>k!=='decoy'),cnt=(a,t)=>a.filter(x=>(x.type||x)===t).length;last={C,truth,inj,s};
    if(truth.length===want.length&&cnt(truth,'bull')===cnt(want,'bull')&&cnt(truth,'bear')===cnt(want,'bear'))return last;
  }
  return last;
}
/* ---- inverse FVG: gap closed through (disrespected) vs respected ---- */
function ifvgScn(r,{kind='inverse',dir='bull'}={}){
  const s=5+r()*3,C=[];let p=basePrice(r);p=noiseC(C,r,s,4,p);
  const i0=C.length,t=tri(p,s,.7+r()*.3,false);C.push(...t);const zone={lo:t[0].h,hi:t[2].l},H=zone.hi-zone.lo;p=t[2].c;
  p=upC(C,r,s,2,p,.5*s);
  const push=(o,h,l,c)=>{C.push(mk(o,h,l,c));p=C[C.length-1].c};
  push(p,p+.1*s,zone.hi+.15*s,zone.hi+.45*s);
  push(p,p+.1*s,zone.lo+.1*H-.1*s,zone.hi-.3*H);
  let closeI=-1,retestI=-1,touchI=-1;
  if(kind==='inverse'){push(p,p+.1*s,zone.lo-(1.0+r()*.4)*s,zone.lo-(.6+r()*.4)*s);closeI=C.length-1;
    push(p,p+.1*s,p-.9*s,p-.7*s);push(p,p+.3*s,p-.2*s,p+.3*s);
    push(p,zone.lo+.5*H,p-.1*s,zone.lo-.25*s);retestI=C.length-1;
    push(p,p+.1*s,p-1.1*s,p-.9*s);push(p,p+.1*s,p-.9*s,p-.7*s)}
  else{push(p,p+.2*s,zone.lo-.3*s,zone.lo+.45*H);touchI=C.length-1;upC(C,r,s,3,p,.9*s)}
  const baseLo=t[0].l;let bosI=-1;
  if(kind==='inverse'){for(let k=i0+3;k<C.length;k++)if(C[k].c<baseLo){bosI=k;break}
    if(bosI<0){push(p,p+.1*s,baseLo-1.2*s,baseLo-.8*s);bosI=C.length-1}}
  let out={C,zone,i0,i2:i0+2,closeI,retestI,touchI,bosI,baseLo,kind,dir,s};
  if(dir==='bear'){const M=C[i0].o;out={...out,C:mirrorC(C,M),zone:{lo:2*M-zone.hi,hi:2*M-zone.lo},baseLo:2*M-baseLo}}
  return out;
}
/* ---- Balanced Price Range: a bullish FVG and a bearish FVG that overlap ---- */
function bprScn(r,{first='bull'}={}){
  for(let tries=0;tries<200;tries++){
    const s=5+r()*3,C=[];let p=basePrice(r);p=noiseC(C,r,s,4,p);
    const i0=C.length,t=tri(p,s,.8+r()*.5,false);C.push(...t);const z1={lo:t[0].h,hi:t[2].l};p=t[2].c;
    const pc=z1.hi+(.8+r()*.9)*s;C.push(mk(p,pc+.2*s,p-.1*s,pc));
    const j0=C.length,P2=pc-.2*s,t2=tri(P2,s,.7+r()*.6,true);C.push(...t2);
    noiseC(C,r,s,3,C[C.length-1].c);
    const f=findFVGs(C),b=f.find(x=>x.type==='bull'&&x.i0===i0),d=f.find(x=>x.type==='bear'&&x.i0===j0);
    if(!b||!d)continue;
    const lo=Math.max(b.lo,d.lo),hi=Math.min(b.hi,d.hi);if(hi-lo<.45*Math.min(b.hi-b.lo,d.hi-d.lo))continue;
    const out={C,z1:{lo:b.lo,hi:b.hi,i0:b.i0,i1:b.i1},z2:{lo:d.lo,hi:d.hi,i0:d.i0,i1:d.i1},bpr:{lo,hi,i0:b.i0,i1:d.i1},s,first};
    if(first==='bear'){const M=C[i0].o;const m=z=>({...z,lo:2*M-z.hi,hi:2*M-z.lo});return{...out,C:mirrorC(C,M),z1:m(out.z1),z2:m(out.z2),bpr:m(out.bpr)}}
    return out;
  }
  return null;
}
/* ---- equilibrium: premium vs discount inside the most recent swing ---- */
function eqScn(r,{where='discount',dir='up'}={}){
  const s=4+r()*3,P=basePrice(r),R=22*s*(1+r()*.2),old=R*(.7+r()*.2);
  const wh=dir==='down'?(where==='discount'?'premium':'discount'):where,frac=wh==='discount'?.62+r()*.15:.22+r()*.14;
  const legs=[{d:-1,n:3,mag:3*s},{d:1,n:5,mag:old},{d:-1,n:4,mag:old*.35},{d:1,n:5,mag:R},{d:-1,n:4,mag:R*frac}];
  const {C,piv}=legsBuild(r,P,s,legs);
  const Lold=piv[0],Lrec=piv[2],Hrec=piv[3],cur=C[C.length-1].c,lo=Lrec.p,hi=Hrec.p,eq=(lo+hi)/2;
  let out={C,lo,hi,eq,oldLow:Lold.p,Lrec:Lrec.i,Hrec:Hrec.i,cur,where:cur<eq?'discount':'premium',dir,s,P};
  if(dir==='down'){const M=P;out={...out,C:mirrorC(C,M),lo:2*M-hi,hi:2*M-lo,eq:2*M-eq,oldLow:2*M-Lold.p,cur:2*M-cur,where:cur<eq?'premium':'discount',Lrec:Hrec.i,Hrec:Lrec.i}}
  return out;
}
/* ---- two correlated indices: SMT divergence ---- */
function smtScn(r,{type='bearish',lead='ES'}={}){
  const s=5+r()*3,P=basePrice(r),U=14*s,a=(.22+r()*.12)*U,b=(.18+r()*.1)*U,k=.28;
  const build=(scale,P0,extra)=>{const sc=scale,rs=mulberry(Math.floor(r()*1e9));
    return legsBuild(rs,P0,s*sc,[{d:1,n:5,mag:U*sc},{d:-1,n:4,mag:U*.5*sc},{d:1,n:5,mag:(U*.5+extra)*sc},{d:-1,n:5,mag:U*.8*sc}])};
  const nqX=lead==='ES'?a:-b,esX=lead==='ES'?-b:a;     // lagging index takes the high (+), the leading one fails (−)
  const N=build(1,P,nqX),E=build(k,q4(P*k),esX);
  let out={nq:N.C,es:E.C,nqPiv:N.piv,esPiv:E.piv,type,lead,lag:lead==='ES'?'NQ':'ES',s,P};
  if(type==='bullish'){out={...out,nq:mirrorC(N.C,P),es:mirrorC(E.C,q4(P*k)),nqPiv:flipPiv(N.piv,P),esPiv:flipPiv(E.piv,q4(P*k))}}
  return out;
}
/* ---- time of day: the New York open (9:00 → 11:00, 5-minute candles) ---- */
function openScn(r,{dir='up'}={}){
  const s=5+r()*3,P=basePrice(r),C=[];let p=P;
  const R=6*s;const o1=rangeC(C,r,s,6,P-R/2,P+R/2,P);p=o1.p;            // 09:00–09:25 pre-open range
  const lo=q4(P-R/2);
  for(let k=0;k<4;k++){const o=p,c=lo-(.5+k*.7+r()*.3)*s;C.push(mk(o,o+.2*s*r(),c-.3*s*r(),c));p=C[C.length-1].c}   // 09:30–09:45 manipulation (sweeps the low)
  for(let k=0;k<4;k++){const o=p,c=o+(1.6+r()*.8)*s;C.push(mk(o,c+.2*s*r(),o-.15*s*r(),c));p=C[C.length-1].c}   // 09:50–10:05 the entry window (reversal)
  for(let k=0;k<12;k++){const o=p,c=o+(r()-.5)*1.1*s;C.push(mk(o,Math.max(o,c)+.35*s*r(),Math.min(o,c)-.35*s*r(),c));p=C[C.length-1].c}   // after 10:10: the edge fades
  let out={C,t0:540,s,P,manip:[6,9],entry:[10,13],lo,dir};
  if(dir==='down')out={...out,C:mirrorC(C,P),lo:2*P-(P+R/2)};
  return out;
}
/* ---- the full order-flow model on one chart: potential → confirmation → continuation → exit (short setup; 'low' side is mirrored) ---- */
function modelScn(r,{side='high'}={}){
  const s=5+r()*3,P=basePrice(r);
  const {C,piv}=legsBuild(r,P,s,[{d:1,n:5,mag:8*s},{d:-1,n:4,mag:6.5*s},{d:1,n:4,mag:3.2*s},{d:-1,n:3,mag:1.6*s},{d:1,n:5,mag:4.6*s}]);
  const H0=piv[0].p,L0=piv[1].p,B=piv[3].p,last=C[C.length-1];
  const push=c=>C.push(c);
  push(mk(last.c,H0+(.35+r()*.3)*s,last.c-.1*s,H0-.3*s));const sweepI=C.length-1,sweepH=C[sweepI].h;                // 1 · potential: sweeps the high
  const o1=C[sweepI].c;push(mk(o1,o1+.1*s,o1-.9*s,o1-.7*s));const c1=C[C.length-1];
  push(mk(c1.c,c1.c+.1*s,B-.6*s,B-.5*s));const bosI=C.length-1;                                                      // 2 · confirmation: closes below the swing low
  const c2=C[bosI];push(mk(c2.c,Math.min(c1.l-.9*s,c2.c+.9*s),Math.max(L0+.35*s,c2.c-.8*s),Math.max(L0+.45*s,c2.c-.45*s)));
  const fvg={lo:C[bosI+1].h,hi:c1.l,i0:bosI-1,i1:bosI+1};                                                              // bearish FVG left by the move
  const q=C[C.length-1].c;
  push(mk(q,q+(fvg.lo-q)*.5+.2*s,q-.05*s,q+(fvg.lo-q)*.55));
  push(mk(C[C.length-1].c,fvg.lo+.5*(fvg.hi-fvg.lo),C[C.length-1].c-.05*s,fvg.lo+.3*(fvg.hi-fvg.lo)));
  push(mk(C[C.length-1].c,fvg.hi-.15*(fvg.hi-fvg.lo),C[C.length-1].c-.1*s,fvg.lo-.25*s));const rejI=C.length-1;     // 3 · continuation: taps the gap and is rejected
  let p=C[C.length-1].c;
  for(let k=0;k<4;k++){const o=p,c=o-(.8+r()*.5)*s;push(mk(o,o+.15*s*r(),c-.2*s*r(),c));p=C[C.length-1].c}
  const exitI=C.findIndex((c,i)=>i>rejI&&c.l<=L0);
  const entry=q4((fvg.lo+fvg.hi)/2),stop=q4(fvg.hi+.3*s),target=L0,rr=(entry-target)/(stop-entry);
  let out={C,sweepI,bosI,fvg,rejI,exitI:exitI<0?C.length-1:exitI,H0,L0,B,entry,stop,target,rr,s,P,side};
  if(side==='low'){const M=P,f=x=>2*M-x;out={...out,C:mirrorC(C,M),H0:f(H0),L0:f(L0),B:f(B),fvg:{...fvg,lo:f(fvg.hi),hi:f(fvg.lo)},entry:f(entry),stop:f(stop),target:f(target)}}
  return out;
}
/* ---- session highs / lows: 15-minute candles from 18:00 to 09:30 (Asia, London, New York pre-market).
        London opens by sweeping the Asia low, then rallies through the Asia high. ---- */
function sessScn(r){
  const s=6+r()*3,P=basePrice(r),C=[],R=[],aLo=q4(P-5*s),aHi=q4(P+5*s);
  let p=rangeC(C,r,s,36,aLo,aHi,P).p;R.push([0,35]);
  const l0=C.length,t1=aLo-1.3*s,t2=aHi+1.6*s;
  for(let k=0;k<8;k++){const o=p,c=o+(t1-o)/(8-k)+(r()-.5)*.3*s;C.push(mk(o,Math.max(o,c)+r()*.3*s,Math.min(o,c)-r()*.3*s,c));p=C[C.length-1].c}
  for(let k=0;k<14;k++){const o=p,c=o+(t2-o)/(14-k)+(r()-.5)*.3*s;C.push(mk(o,Math.max(o,c)+r()*.3*s,Math.min(o,c)-r()*.3*s,c));p=C[C.length-1].c}
  R.push([l0,C.length-1]);const n0=C.length;
  for(let k=0;k<4;k++){const o=p,c=o+(r()-.7)*.6*s;C.push(mk(o,Math.max(o,c)+r()*.3*s,Math.min(o,c)-r()*.3*s,c));p=C[C.length-1].c}
  R.push([n0,C.length-1]);
  const hl=([a,b])=>{let h=-1e9,l=1e9,hi=a,li=a;for(let i=a;i<=b;i++){if(C[i].h>h){h=C[i].h;hi=i}if(C[i].l<l){l=C[i].l;li=i}}return{h,l,hi,li,i0:a,i1:b}};
  return{C,asia:hl(R[0]),london:hl(R[1]),ny:hl(R[2]),t0:1080,step:15,s,P};
}
/* ---- daily candles: the previous day's high and low (PDH / PDL) ---- */
function dailyScn(r,{sweep='low'}={}){
  const s=40+r()*20,C=[];let p=basePrice(r);
  for(let k=0;k<11;k++){const o=p,c=o+(r()-.5)*2.4*s;C.push(mk(o,Math.max(o,c)+(.3+r()*.7)*s,Math.min(o,c)-(.3+r()*.7)*s,c));p=C[C.length-1].c}
  const y=C[10];let t;
  if(sweep==='low')t=mk(y.c,y.c+.3*s,y.l-.5*s,y.l+.6*s);
  else if(sweep==='high')t=mk(y.c,y.h+.5*s,y.c-.3*s,y.h-.6*s);
  else t=mk(y.c,Math.min(y.c+.4*s,y.h-.1*s),Math.max(y.c-.4*s,y.l+.1*s),y.c+(y.h-y.c)*.1);
  C.push(t);return{C,pdh:y.h,pdl:y.l,yi:10,ti:11,sweep,s,labels:'day'};
}
/* ---- relative equal highs (several swing highs stacked at nearly the same price) ---- */
function equalScn(r,{n=2,decoy=false}={}){
  const s=5+r()*3,P=basePrice(r),U=7*s,legs=decoy?[{d:1,n:3,mag:U*.5},{d:-1,n:3,mag:U*.35},{d:1,n:4,mag:U}]:[{d:1,n:4,mag:U}];
  for(let k=1;k<n;k++){const d=U*(.35+r()*.1);legs.push({d:-1,n:3,mag:d});legs.push({d:1,n:3,mag:d+(r()-.5)*.2*s})}
  legs.push({d:-1,n:4,mag:U*.7});
  const {C,piv}=legsBuild(r,P,s,legs),highs=piv.filter(x=>x.t==='h').slice(decoy?1:0,(decoy?1:0)+n);
  return{C,highs,P,s,n,top:Math.max(...highs.map(h=>h.p)),sw:swings(C)};
}
const gradeLevels=(marks,truth)=>{const hl=marks.filter(m=>m.t==='hline'),used=new Set(),found=[],missed=[];
  for(const z of truth){let hit=-1,best=1e9;hl.forEach((m,k)=>{if(used.has(k))return;const d=Math.abs(m.p-z.p);if(d<=z.tol&&d<best){best=d;hit=k}});
    if(hit>=0){used.add(hit);found.push(z)}else missed.push(z)}
  const extra=hl.filter((_,k)=>!used.has(k));return{found,missed,extra,ok:!missed.length&&!extra.length}};
function gradeMarks(marks,truth,minIoU=.5){
  const rects=marks.filter(m=>m.t==='rect'),used=new Set(),found=[],missed=[];
  for(const z of truth){let hit=-1;rects.forEach((m,k)=>{if(hit>=0||used.has(k))return;
    if(m.i1>=z.i0&&m.i0<=z.i1&&ov1(m.lo,m.hi,z.lo,z.hi)>=minIoU)hit=k});
    if(hit>=0){used.add(hit);found.push(z)}else missed.push(z)}
  const extra=rects.filter((_,k)=>!used.has(k));
  return{found,missed,extra,ok:!missed.length&&!extra.length}
}
const setEq=(a,b)=>a.length===b.length&&a.every(x=>b.includes(x));
