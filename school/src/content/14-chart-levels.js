/* ============================================================
   Chart tasks for Extended Learning (m22) and PO3 in Asia (m26)
============================================================ */
(()=>{
const tol=(s,f=.45,m=1.1)=>Math.max(m,s*f);
const xt=(it,e)=>({t0:e.t0,...(e.step?{step:e.step}:{}),...it});
const sd=r=>pick(r,['long','short']);
/* ----- Extended Learning ----- */
const gapBox=(p,i1)=>rectAt(p.gap.i0,i1,p.gap.lo,p.gap.hi,p.side==='long'?'bullish FVG':'bearish FVG',COL.lag,{dash:true});
const plcTap=r=>{const p=plcScn(r,{side:sd(r)}),L=p.side==='long';
  return xt({kind:'tap',many:false,topic:`${L?'PLC':'PHC'} · the catalyst`,q:`The marked zone is a ${L?'bullish':'bearish'} fair value gap. Click the swing ${L?'low':'high'} that formed INSIDE it and held: the ${L?'Protected Low Catalyst (PLC)':'Protected High Catalyst (PHC)'}.`,C:p.C.slice(0,p.plcI+4),ov:[gapBox(p,p.plcI+3)],want:[p.plcI],
   why:`The candle at ${hhmm(360+p.plcI*60)} makes a swing ${L?'low':'high'} at ${fm(p.plc)}, inside the ${fm(p.gap.lo)}–${fm(p.gap.hi)} gap, and price never closed through the gap. That is a ${L?'PLC':'PHC'}: a draw price is expected to come back and take. Your level for a ${L?'long sits BELOW':'short sits ABOVE'} it, so price sweeps the catalyst first.`},p)};
const plcRect=r=>{const p=plcScn(r,{side:sd(r)}),L=p.side==='long';
  return xt({kind:'rect',topic:`${L?'PLC':'PHC'} · the fair value gap`,q:`A strong move left a ${L?'bullish':'bearish'} fair value gap on the 1-hour chart. Mark it: the zone a ${L?'PLC':'PHC'} forms inside.`,C:p.C.slice(0,p.plcI+4),ov:[],truth:[{i0:p.gap.i0,i1:p.gap.i1,lo:p.gap.lo,hi:p.gap.hi}],
   why:`The gap spans ${fm(p.gap.lo)}–${fm(p.gap.hi)}: between the first displacement candle's ${L?'high':'low'} and the third candle's ${L?'low':'high'}.`},p)};
const rsLines=rs=>[hlAt(rs.RS,'Range Settlement',COL.lag,0,{scale:true}),{t:'vline',i:rs.openI,col:COL.ice,text:'9:30 open'}];
const rsFill=r=>{const rs=rsScn(r,{dir:pick(r,['up','down'])}),up=rs.dir==='up';
  return xt({kind:'tap',many:false,topic:'Range Settlement · the fill',q:`Price opened at 9:30 ${up?'below':'above'} Range Settlement (marked). Click the first candle that fills RS: the first to trade to it after the open.`,C:rs.C.slice(0,rs.fillI+3),ov:rsLines(rs),want:[rs.fillI],
   why:`Open ${up?'below':'above'} RS means the AM draw is ${up?'up':'down'}. The candle at ${hhmm(480+rs.fillI*5)} is the first to trade to ${fm(rs.RS)}: price was pulled to the orders left behind overnight. RS is a draw, not an entry.`},rs)};
const rsDir=r=>{const rs=rsScn(r,{dir:pick(r,['up','down'])}),up=rs.dir==='up';
  return xt(mcq('Range Settlement · the draw',`At 9:30 price opens (marked) relative to Range Settlement (the line). Which way does that favour for the AM session?`,up?['Longs: the draw is up toward RS','Shorts: the draw is down','Nothing: RS applies overnight','No trade ever']:['Shorts: the draw is down toward RS','Longs: the draw is up','Nothing: RS applies overnight','No trade ever'],`The open is ${up?'below':'above'} RS (${fm(rs.RS)}), so the AM draw is ${up?'up':'down'}. It only applies after 9:30, never overnight.`,{C:rs.C.slice(0,rs.openI+2),ov:rsLines(rs)}),rs)};
const extSee=p=>{const rs=rsScn(rr(422),{dir:'up'}),L=p.side==='long',C=p.C;return[
 {focus:p.gap.i1,ov:[gapBox(p,p.gap.i1+3)],cap:`<b>Step 1 · the map.</b> On the 1-hour chart a strong move left a bullish fair value gap (${fm(p.gap.lo)}–${fm(p.gap.hi)}). Price respecting it is the setup for a catalyst.`},
 {focus:p.plcI,ov:[gapBox(p,p.plcI+3),boxOf(C,p.plcI,p.plcI,COL.sig,.5),tagAt(p.plcI,C[p.plcI].l,'PLC','below',COL.sig)],cap:`<b>Step 2 · the PLC.</b> The swing low at <b>${fm(p.plc)}</b> formed inside the gap and held: a Protected Low Catalyst. It is a draw: price is expected to come back and take it.`},
 {focus:p.plcI,ov:[gapBox(p,p.plcI+3),hlAt(p.plc,'PLC',COL.sig,p.plcI,{scale:true}),rectAt(Math.max(0,p.plcI-1),p.plcI+3,q4(p.plc-3*p.s),q4(p.plc-1*p.s),'your level (below the PLC)',COL.ok,{dash:true})],cap:'<b>Step 3 · the level.</b> For a long, the level sits <b>below</b> the PLC, so price has to sweep the catalyst to reach it. That sweep is the fuel. Then refine the level down: 4H, 1H, 15m.'},
 {sc:rs,focus:rs.openI,ov:rsLines(rs),cap:`<b>Range Settlement.</b> At 9:30 price opens below RS (<b>${fm(rs.RS)}</b>). Orders were left behind overnight, so the AM draw is up toward the line.`},
 {sc:rs,focus:rs.fillI,ov:[...rsLines(rs),boxOf(rs.C,rs.fillI,rs.fillI,COL.sig,.5)],cap:`<b>The fill.</b> This candle trades to RS: price was pulled there. RS is a draw, not an entry, and it only applies after 9:30.`}]};
/* ----- PO3 in Asia ----- */
const kBox=(a,i1)=>rectAt(a.KL.i0,i1,a.KL.lo,a.KL.hi,'key level',COL.lag,{dash:true});
const ifgBox=(a,i1)=>rectAt(a.ifg.i0,i1,a.ifg.lo,a.ifg.hi,'IFG',COL.gold,{dash:true});
const aRect=r=>{const a=asiaScn(r,{side:sd(r)}),L=a.side==='long';
  return xt({kind:'rect',topic:'Asia · the key level',q:`The draw is ${L?'above':'below'}. Mark the key level: the ${L?'bullish':'bearish'} fair value gap price can ${L?'dip':'push'} into before it goes the other way.`,C:a.C.slice(0,a.KL.i1+6),ov:[],truth:[{i0:a.KL.i0,i1:a.KL.i1,lo:a.KL.lo,hi:a.KL.hi}],
   why:`The gap spans ${fm(a.KL.lo)}–${fm(a.KL.hi)}. It lines up with the draw: the manipulation will ${L?'dip':'push'} into it first.`},a)};
const aTapLow=r=>{const a=asiaScn(r,{side:sd(r)}),L=a.side==='long';
  return xt({kind:'tap',many:false,topic:'Asia · the manipulation',q:`The key level is marked. Click the candle that makes the ${L?'low':'high'} of the manipulation: the one that ${L?'dips':'pushes'} deepest INTO it.`,C:a.C.slice(0,a.lowI+3),ov:[kBox(a,a.lowI+2)],want:[a.lowI],
   why:`The candle at ${hhmm(1200+a.lowI*5)} reaches ${fm(L?a.C[a.lowI].l:a.C[a.lowI].h)}, inside the key level. Touching the level is step 3, not the entry: you still wait for the IFG close. For a ${L?'long':'short'} the 8 PM candle ideally goes ${L?'Open → Low → High → Close':'Open → High → Low → Close'}.`},a)};
const aTapInv=r=>{const a=asiaScn(r,{side:sd(r)}),L=a.side==='long';
  return xt({kind:'tap',many:false,topic:'Asia · the IFG close',q:`The drop into the key level left a small gap (marked). Click the candle that closes back ${L?'above':'below'} it: the IFG confirmation.`,C:a.C.slice(0,a.invI+3),ov:[kBox(a,a.invI),ifgBox(a,a.invI)],want:[a.invI],
   why:`The candle at ${hhmm(1200+a.invI*5)} is the first to close ${L?'above':'below'} ${fm(L?a.ifg.hi:a.ifg.lo)}. That is the green light: enter, ${L?'stop under the swing low':'stop over the swing high'}.`},a)};
const aLevels=r=>{const a=asiaScn(r,{side:sd(r)}),L=a.side==='long';
  return xt({kind:'level',topic:'Asia · stop and 1:1 target',q:`You enter on the IFG close (${fm(a.entry)}). Place the STOP at the swing ${L?'low':'high'} of the manipulation and the TARGET at the default 1:1.`,C:a.C.slice(0,a.invI+1),ov:[hlAt(a.entry,'entry',COL.ice,a.invI,{scale:true}),kBox(a,a.invI)],truth:[{p:a.stop,tol:tol(a.s,.4),label:'stop'},{p:a.target,tol:tol(a.s,.4),label:'1:1 target'}],
   why:`Stop ${fm(a.stop)}, just past the swing ${L?'low':'high'}. The default target is 1:1: the same distance as the stop (${fm(Math.abs(a.entry-a.stop))} points), at ${fm(a.target)}. Up to 1:3 only when everything lines up.`},a)};
const asiaSee=a=>{const L=a.side==='long',C=a.C;return[
 {focus:a.KL.i1,ov:[kBox(a,a.KL.i1+4)],cap:`<b>The draw and the key level.</b> The draw is above (the new week opening gap, say). Below price sits a bullish gap at <b>${fm(a.KL.lo)}–${fm(a.KL.hi)}</b>: a key level that lines up with it.`},
 {focus:a.lowI,ov:[kBox(a,a.lowI+2),boxOf(C,a.lowI,a.lowI,COL.sig,.5),tagAt(a.lowI,C[a.lowI].l,'manipulation','below',COL.sig)],cap:'<b>The manipulation.</b> Price drops into the key level: the dip of the 8 PM candle (Open → Low → High → Close for a long). Touching the level is not the entry.'},
 {focus:a.invI,ov:[kBox(a,a.invI),ifgBox(a,a.invI),boxOf(C,a.invI,a.invI,COL.sig,.5),tagAt(a.invI,C[a.invI].c,'IFG close','above',COL.sig)],cap:`<b>The IFG close.</b> The drop left a small bearish gap. This candle closes back <b>through</b> it: confirmation.`},
 {focus:a.invI,ov:[kBox(a,a.invI),hlAt(a.entry,'entry',COL.ice,a.invI,{scale:true}),hlAt(a.stop,'stop',COL.bad,a.invI,{scale:true}),hlAt(a.target,'1:1 target',COL.ok,a.invI,{scale:true})],cap:`<b>Stop and target.</b> Stop at the swing low (${fm(a.stop)}), default 1:1 target (${fm(a.target)}), maximum 1:3. One win and you are done; two losses and you are done.`}]};
const patch=(id,ex,see,sum,chartDrills,nOld,descr)=>{const m=MODS.find(x=>x.id===id),n=chartDrills.length;
  Object.assign(m,{chart:true,ex,see,sum,drills:[...chartDrills,...m.drills],exam:{bank:3,gen:Array.from({length:n+nOld},(_,i)=>[i,1])},examDesc:descr});delete m.steps};
patch('m22',()=>plcScn(rr(421),{side:'long'}),extSee,p=>({ov:[gapBox(p,p.plcI+3)]}),[plcTap,plcRect,rsFill,rsDir],4,'Finding the PLC and its gap and the Range Settlement fill on generated charts, plus refining numbers, opening-price bias and limit-versus-confirmation decisions.');
patch('m26',()=>asiaScn(rr(431),{side:'long'}),asiaSee,a=>({ov:[kBox(a,a.invI)]}),[aRect,aTapLow,aTapInv,aLevels],4,'Marking the Asia key level, the manipulation, the IFG close, and the stop and 1:1 target on generated charts, plus the two filters and the 8 PM candle.');
})();
