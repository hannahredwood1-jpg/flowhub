/* ============================================================
   Chart tasks for Echo (m28) and Orbit (m29): generated charts with ground truth
============================================================ */
(()=>{
const tol=(s,f=.45,m=1.1)=>Math.max(m,s*f);
const xt=(it,e)=>({t0:e.t0,...it});
/* ----- Echo ----- */
const eLvl=e=>hlAt(e.lvl,e.side==='long'?'old low':'old high',COL.ice,0,{scale:true});
const eFvgBox=(e,i1)=>rectAt(e.fvg.i0,i1,e.fvg.lo,e.fvg.hi,'FVG',COL.lag,{dash:true});
const eTapSweep=r=>{const e=echoScn(r,{side:pick(r,['long','short'])}),L=e.side==='long';
  return xt({kind:'tap',many:false,topic:'Echo · the sweep',q:`The old ${L?'low':'high'} is marked. Click the candle that SWEEPS it: the first to trade through it.`,C:e.C.slice(0,e.sweepI+3),ov:[eLvl(e)],want:[e.sweepI],
   why:`The candle at ${hhmm(540+e.sweepI*5)} is the first to trade ${L?'below':'above'} ${fm(e.lvl)}, taking the stops resting there. A sweep alone is not an entry: you still need the CISD.`},e)};
const eTapCisd=r=>{const e=echoScn(r,{side:pick(r,['long','short'])}),L=e.side==='long';
  return xt({kind:'tap',many:false,topic:'Echo · the CISD',q:`Price swept the ${L?'low':'high'}. The dashed line is the open of the ${L?'down':'up'}-move that made the sweep. Click the candle that closes back ${L?'above':'below'} it: the CISD.`,C:e.C.slice(0,e.cisdI+3),ov:[eLvl(e),hlAt(e.cisdLevel,`open of the ${L?'down':'up'}-move`,COL.gold,e.cisdFrom,{scale:true})],want:[e.cisdI],
   why:`The candle at ${hhmm(540+e.cisdI*5)} is the first to close ${L?'above':'below'} ${fm(e.cisdLevel)}. Delivery changed direction. Confluence Master does not mark the CISD: you read it by eye.`},e)};
const eRect=r=>{const e=echoScn(r,{side:pick(r,['long','short'])});
  return xt({kind:'rect',topic:'Echo · the FVG',q:'The displacement after the sweep left a fair value gap. Mark it: the zone price will come back to.',C:e.C.slice(0,e.rbI),ov:[eLvl(e)],truth:[{i0:e.fvg.i0,i1:e.fvg.i1,lo:e.fvg.lo,hi:e.fvg.hi}],
   why:`The gap spans ${fm(e.fvg.lo)}–${fm(e.fvg.hi)}: between the first displacement candle's ${e.side==='long'?'high':'low'} and the third candle's ${e.side==='long'?'low':'high'}. The rejection block has to sit inside it.`},e)};
const eTapRb=r=>{const e=echoScn(r,{side:pick(r,['long','short'])}),L=e.side==='long';
  return xt({kind:'tap',many:false,topic:'Echo · the rejection block',q:`Price returned to the FVG. Click the candle that wicks INTO the gap and is rejected out of it: the rejection block.`,C:e.C.slice(0,e.rbI+3),ov:[eLvl(e),eFvgBox(e,e.rbI+2)],want:[e.rbI],
   why:`The candle at ${hhmm(540+e.rbI*5)} wicks to ${fm(L?e.rb.lo:e.rb.hi)}, inside the FVG, and closes back ${L?'above':'below'} it. That wick is the rejection block, and it is the Echo entry.`},e)};
const eLevels=r=>{const e=echoScn(r,{side:pick(r,['long','short'])}),L=e.side==='long';
  return xt({kind:'level',topic:'Echo · stop and draw',q:`You enter at the rejection block (${fm(e.entry)}). Place the STOP just past the rejection wick and the TARGET at the draw: the old ${L?'high':'low'} on the left.`,C:e.C.slice(0,e.rbI+1),ov:[hlAt(e.entry,'entry',COL.ice,e.rbI,{scale:true}),eFvgBox(e,e.rbI)],truth:[{p:e.stop,tol:tol(e.s,.4),label:'stop'},{p:e.draw,tol:tol(e.s,.55,1.3),label:'draw'}],
   why:`Stop ${fm(e.stop)}: just past the wick, because if price trades back through it the rejection was not real. Target ${fm(e.draw)}: the draw on liquidity, ${(Math.round(e.ratio*10)/10).toFixed(1)}× the stop distance.`},e)};
const eValid=r=>{const ok=r()<.5,e=echoScn(r,{side:pick(r,['long','short']),draw:ok?'ok':'near'}),x=(Math.round(e.ratio*10)/10).toFixed(1);
  return xt(mcq('Echo · valid or not?',`Sweep, CISD and a rejection block inside the FVG are all there, with the 4H trend. The entry, stop and draw are marked. Take it?`,ok?[`Yes: the draw is ${x}× the stop`,`No: the draw is under 2× the stop`,'No: the sweep was too small','Yes, but only at half size']:[`No: the draw is only ${x}× the stop, under 2×`,`Yes: the pattern is perfect`,'Yes, with a wider stop','Yes, with a bigger target'],ok?`The draw is ${fm(Math.abs(e.draw-e.entry))} points away against a ${fm(Math.abs(e.entry-e.stop))}-point stop: ${x}×, at least 2×, so it is valid.`:`The draw is ${fm(Math.abs(e.draw-e.entry))} points away against a ${fm(Math.abs(e.entry-e.stop))}-point stop: only ${x}×. Every other box can be ticked and the 2× rule still says no.`,{C:e.C.slice(0,e.rbI+1),ov:[eLvl(e),eFvgBox(e,e.rbI),hlAt(e.entry,'entry',COL.ice,e.rbI,{scale:true}),hlAt(e.stop,'stop',COL.bad,e.rbI,{scale:true}),hlAt(e.draw,'draw',COL.ok,0,{scale:true})]}),e)};
const echoSee=e=>{const L=e.side==='long',C=e.C;return[
 {focus:e.lvlI,ov:[eLvl(e)],cap:`<b>Liquidity.</b> An old ${L?'low':'high'} at <b>${fm(e.lvl)}</b>. Stops sit just ${L?'under':'over'} it: liquidity Echo expects price to go and take first.`},
 {focus:e.sweepI,ov:[eLvl(e),boxOf(C,e.sweepI,e.sweepI,COL.sig,.5),tagAt(e.sweepI,L?C[e.sweepI].l:C[e.sweepI].h,'sweep',L?'below':'above',COL.sig)],cap:`<b>The sweep.</b> Price trades ${L?'below':'above'} the old ${L?'low':'high'} and takes the stops. A sweep alone is <b>not</b> an entry.`},
 {focus:e.fvg.i0+1,ov:[eLvl(e),eFvgBox(e,e.fvg.i1+2)],cap:`<b>Displacement and the FVG.</b> A strong move away from the sweep leaves a fair value gap (${fm(e.fvg.lo)}–${fm(e.fvg.hi)}). Price will be drawn back to it.`},
 {focus:e.cisdI,ov:[eLvl(e),hlAt(e.cisdLevel,`open of the ${L?'down':'up'}-move`,COL.gold,e.cisdFrom,{scale:true}),boxOf(C,e.cisdI,e.cisdI,COL.sig,.5),tagAt(e.cisdI,C[e.cisdI].c,'CISD',L?'above':'below',COL.sig)],cap:`<b>The CISD.</b> This candle closes ${L?'above':'below'} the open of the ${L?'down':'up'}-move that made the sweep. Sellers were delivering price; now ${L?'buyers':'sellers'} are.`},
 {focus:e.rbI,ov:[eLvl(e),eFvgBox(e,e.rbI+1),boxOf(C,e.rbI,e.rbI,COL.sig,.5),tagAt(e.rbI,L?C[e.rbI].l:C[e.rbI].h,'rejection block',L?'below':'above',COL.sig)],cap:'<b>The rejection block.</b> Price returns <b>into the FVG</b> and is rejected, leaving a long wick. That wick is the Echo entry, taken in the direction of the 4H trend.'},
 {focus:e.rbI,ov:[eLvl(e),hlAt(e.entry,'entry',COL.ice,e.rbI,{scale:true}),hlAt(e.stop,'stop',COL.bad,e.rbI,{scale:true}),hlAt(e.draw,'draw',COL.ok,0,{scale:true})],cap:`<b>Entry, stop and the draw.</b> Stop just past the wick (${fm(e.stop)}). Target the next liquidity (${fm(e.draw)}): ${(Math.round(e.ratio*10)/10).toFixed(1)}× the stop distance, so the trade is valid.`}]};
/* ----- Orbit ----- */
const oFibLines=o=>[0,.5,.62,.79,1].map(x=>hlAt(o.fib(x),String(x),x===.62||x===.79?COL.sig:COL.ice,o.aI,{scale:true,dash:true}));
const oBand=o=>rectAt(o.aI,o.C.length-1,Math.min(o.fib(.62),o.fib(.79)),Math.max(o.fib(.62),o.fib(.79)),'OTE 0.62–0.79',COL.sig,{dash:true});
const oGapBox=(o,i1)=>rectAt(o.gap.i0,i1,o.gap.lo,o.gap.hi,'gap',COL.lag,{dash:true});
const oTapSwing=r=>{const o=orbitScn(r,{side:pick(r,['long','short'])}),L=o.side==='long';
  return xt({kind:'tap',many:false,topic:'Orbit · the big swing',q:`Orbit starts with a big, obvious move. Click the candle that makes the swing ${L?'low':'high'}: where the big move STARTED.`,C:o.C.slice(0,o.bI+2),ov:[],want:[o.aI],
   why:`The candle at ${hhmm(540+o.aI*5)} makes the ${L?'low':'high'} at ${fm(o.A)}, where the big ${L?'up':'down'}-move started. You anchor the fib here and drag to the end of the move (${fm(o.B)}).`},o)};
const oFib=r=>{const o=orbitScn(r,{side:pick(r,['long','short'])});
  return xt({kind:'level',topic:'Orbit · the OTE zone',q:`The swing runs from ${fm(o.A)} to ${fm(o.B)}. Place a line at the 0.62 and another at the 0.79 retracement: the edges of the OTE zone.`,C:o.C.slice(0,o.gap.i1+1),ov:[hlAt(o.A,'swing start',COL.ice,o.aI,{scale:true}),hlAt(o.B,'swing end',COL.ice,o.bI,{scale:true})],truth:[{p:o.fib(.62),tol:tol(o.s,.5),label:'0.62'},{p:o.fib(.79),tol:tol(o.s,.5),label:'0.79'}],
   why:`Draw the fib from the swing start (0 is the swing end, 1 the start). 0.62 sits at ${fm(o.fib(.62))} and 0.79 at ${fm(o.fib(.79))}: the swing is ${fm(Math.abs(o.B-o.A))} points, so ${fm(Math.abs(o.B-o.A)*.62)} and ${fm(Math.abs(o.B-o.A)*.79)} back from the end. Orbit only looks for entries inside this band.`},o)};
const oInv=r=>{const o=orbitScn(r,{side:pick(r,['long','short'])}),L=o.side==='long';
  return xt({kind:'tap',many:false,topic:'Orbit · the inversion',q:`Price pulled back into the OTE zone, leaving a gap on the way in. Click the candle that INVERTS the gap: the first to close ${L?'above':'below'} it.`,C:o.C.slice(0,o.invI+3),ov:[oBand(o),oGapBox(o,o.invI)],want:[o.invI],
   why:`The candle at ${hhmm(540+o.invI*5)} is the first to close ${L?'above':'below'} ${fm(L?o.gap.hi:o.gap.lo)}: the gap is inverted, so the pullback is done and price is heading back to the draw.`},o)};
const oGap=r=>{const o=orbitScn(r,{side:pick(r,['long','short'])});
  return xt({kind:'rect',topic:'Orbit · the leg-in gap',q:'The fast drop into the OTE zone left a fair value gap. Mark it: this is the gap whose inversion confirms the entry.',C:o.C.slice(0,o.gap.i1+2),ov:[oBand(o)],truth:[{i0:o.gap.i0,i1:o.gap.i1,lo:o.gap.lo,hi:o.gap.hi}],
   why:`The gap spans ${fm(o.gap.lo)}–${fm(o.gap.hi)}, formed out of the area of interest on the leg in. A fresh gap like this counts; an old one or one already inverted does not.`},o)};
const oLevels=r=>{const o=orbitScn(r,{side:pick(r,['long','short'])}),L=o.side==='long';
  return xt({kind:'level',topic:'Orbit · stop and draw',q:`You enter after the inversion (${fm(o.entry)}). Place the STOP ${L?'under':'over'} the low of the leg in, and the TARGET at the end of the swing: the draw.`,C:o.C.slice(0,o.invI+1),ov:[hlAt(o.entry,'entry',COL.ice,o.invI,{scale:true}),oBand(o)],truth:[{p:o.stop,tol:tol(o.s,.4),label:'stop'},{p:o.draw,tol:tol(o.s,.55,1.3),label:'draw'}],
   why:`Stop ${fm(o.stop)}, just past the leg-in ${L?'low':'high'} (${fm(o.low)}). Target ${fm(o.draw)}: the swing end, ${(Math.round(o.ratio*10)/10).toFixed(1)}× the stop distance, so it is valid.`},o)};
const oShallow=r=>{const o=orbitScn(r,{side:pick(r,['long','short']),rho:.38});
  return xt(mcq('Orbit · reached the zone?',`The marked band is the OTE zone (0.62–0.79). The pullback only reached the 0.38 level and a gap just inverted. Is this an Orbit entry?`,['No: price has not reached the OTE zone','Yes: a gap inverted','Yes, with a smaller size','Yes, with a wider stop'],`The pullback reached only about ${(Math.round(o.rho*100)/100).toFixed(2)} of the swing. Nothing counts until price is actually INTO the 0.62–0.79 band. Jumping the gun is the number one Orbit loss.`,{C:o.C.slice(0,o.invI+1),ov:[oBand(o),hlAt(o.fib(.38),'0.38',COL.ice,o.aI,{scale:true,dash:true})]}),o)};
const orbitSee=o=>{const L=o.side==='long',C=o.C;return[
 {focus:o.bI,ov:[tagAt(o.aI,L?C[o.aI].l:C[o.aI].h,'swing start',L?'below':'above',COL.ice),tagAt(o.bI,L?C[o.bI].h:C[o.bI].l,'swing end',L?'above':'below',COL.ice)],cap:`<b>Find the big swing.</b> A large, obvious move from <b>${fm(o.A)}</b> to <b>${fm(o.B)}</b>. Small wiggles do not count.`},
 {focus:o.bI,ov:oFibLines(o),cap:'<b>Draw the fib.</b> Drag from the swing start to the swing end. You draw this yourself: Confluence Master does not. Add the 0.62 and 0.79 levels.'},
 {focus:o.gap.i1,ov:[...oFibLines(o),oBand(o)],cap:`<b>The OTE zone.</b> The band between 0.62 (${fm(o.fib(.62))}) and 0.79 (${fm(o.fib(.79))}). Orbit ignores shallow pullbacks and waits for price deep in this band: here it reaches ${fm(o.low)}.`},
 {focus:o.gap.i1,ov:[oBand(o),oGapBox(o,o.gap.i1+2)],cap:'<b>The leg in leaves a gap.</b> The fast move into the zone is fast enough to leave its own fair value gap. Watch that gap.'},
 {focus:o.invI,ov:[oBand(o),oGapBox(o,o.invI),boxOf(C,o.invI,o.invI,COL.sig,.5),tagAt(o.invI,C[o.invI].c,'inverted',L?'above':'below',COL.sig)],cap:`<b>Inversion.</b> This candle closes ${L?'above':'below'} the gap. It is inverted: the pullback is finished and price is heading back to the draw.`},
 {focus:o.invI,ov:[oBand(o),hlAt(o.entry,'entry',COL.ice,o.invI,{scale:true}),hlAt(o.stop,'stop',COL.bad,o.invI,{scale:true}),hlAt(o.draw,'draw',COL.ok,o.bI,{scale:true})],cap:`<b>Entry, stop and the draw.</b> Enter after the inversion (${fm(o.entry)}), stop past the leg-in ${L?'low':'high'} (${fm(o.stop)}), target the swing end (${fm(o.draw)}): ${(Math.round(o.ratio*10)/10).toFixed(1)}× the stop, so it is valid.`}]};
const patch=(id,ex,see,sum,chartDrills,examGen,descr)=>{const m=MODS.find(x=>x.id===id),old=m.drills;
  Object.assign(m,{chart:true,ex,see:sc=>see(sc).map(s=>s),sum,drills:[...chartDrills,...old],exam:{bank:3,gen:examGen},examDesc:descr});
  delete m.steps};
const nC=5;
patch('m28',()=>echoScn(rr(401),{side:'long'}),echoSee,e=>({ov:[eLvl(e),eFvgBox(e,e.rbI+1)]}),[eTapSweep,eTapCisd,eRect,eTapRb,eLevels,eValid],[[0,1],[1,1],[2,1],[3,1],[4,1],[5,2],[6,1]],'Finding the sweep, CISD, FVG and rejection block on generated charts, placing the stop and the draw, and valid-or-not calls.');
patch('m29',()=>orbitScn(rr(411),{side:'long'}),orbitSee,o=>({ov:[oBand(o)]}),[oTapSwing,oFib,oInv,oGap,oLevels,oShallow],[[0,1],[1,1],[2,1],[3,1],[4,1],[5,2],[6,1]],'Finding the swing and the inversion on generated charts, placing the OTE edges, the stop and the draw, and judging a pullback that has not reached the zone.');
})();
