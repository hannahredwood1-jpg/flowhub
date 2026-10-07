/* ============================================================
   Replays (module 30): the chart plays forward and you make every call
============================================================ */
(()=>{
const x1=n=>(Math.round(n*10)/10).toFixed(1);
const lvl=e=>hlAt(e.lvl,e.side==='long'?'old low':'old high',COL.ice,0,{scale:true});
const echoReplay=(r,ok)=>{const e=echoScn(r,{side:pick(r,['long','short']),draw:ok?'ok':'near'}),L=e.side==='long',dir=L?'long':'short',x=x1(e.ratio);
  const fb=hlAt(e.cisdLevel,`open of the ${L?'down':'up'}-move`,COL.gold,e.cisdFrom,{scale:true}),fv=rectAt(e.fvg.i0,e.rbI,e.fvg.lo,e.fvg.hi,'FVG',COL.lag,{dash:true});
  return{kind:'replay',topic:`Replay · Echo ${ok?'to take':'to skip'}`,q:`Echo replay (5-minute chart, 4H trend ${L?'up':'down'}). The chart plays forward: make each call. Every decision has to be right.`,t0:e.t0,C:e.C.slice(0,e.sweepI+1),full:e.C,ov:[lvl(e)],
   stops:[
    {at:e.sweepI,q:`Price just ran ${L?'below':'above'} the old ${L?'low':'high'}. ${L?'Buy':'Sell'} now?`,o:['No: a sweep alone is not an entry; wait for the CISD',`Yes, ${L?'buy':'sell'} the sweep`,`${L?'Sell':'Buy'} the breakout`],why:'Without a CISD the level can keep running.',ov:[]},
    {at:e.cisdI,q:`A candle closed back ${L?'above':'below'} the open of the move that made the sweep and left a gap. What is it?`,o:['A CISD with an FVG: the Echo is forming. Wait for price to return to the gap','A reason to enter at market now','Nothing important'],why:'Chasing the displacement gives you a big stop. Let it come back.',ov:[fb]},
    {at:e.rbI,q:`Price returned into the FVG and was rejected, leaving a long wick. It is with the 4H trend. The draw (marked) is ${x}× your stop. Your call?`,o:ok?[`Take the ${dir} from the rejection block, stop past the wick, target the draw`,'Skip: it is too late','Take it with no stop']:[`Skip: the draw is only ${x}× the stop, under 2×`,'Take it: everything else lines up','Take it with a bigger target'],why:ok?'RB inside the FVG with a valid draw is the Echo entry.':'No valid draw, no trade. The draw is a requirement, not a confluence.',ov:[fv,hlAt(e.entry,'entry',COL.ice,e.rbI,{scale:true}),hlAt(e.stop,'stop',COL.bad,e.rbI,{scale:true}),hlAt(e.draw,'draw',COL.ok,0,{scale:true})]}],
   why:'Sweep → CISD → rejection block in the FVG → a draw at least 2× the stop.'}};
const orbitReplay=r=>{const o=orbitScn(r,{side:pick(r,['long','short'])}),L=o.side==='long',x=x1(o.ratio),endI=o.C.length-1;
  const ote=rectAt(o.aI,endI,Math.min(o.fib(.62),o.fib(.79)),Math.max(o.fib(.62),o.fib(.79)),'OTE 0.62–0.79',COL.sig,{dash:true});
  return{kind:'replay',topic:'Replay · Orbit',q:`Orbit replay (5-minute chart, 4H trend ${L?'up':'down'}). The chart plays forward: make each call. Every decision has to be right.`,t0:o.t0,C:o.C.slice(0,o.gap.i1+1),full:o.C,ov:[ote,hlAt(o.A,'swing start',COL.ice,o.aI,{scale:true}),hlAt(o.B,'swing end',COL.ice,o.bI,{scale:true})],
   stops:[
    {at:o.gap.i1,q:`Price pulled back into the marked OTE zone, leaving a fast gap on the leg in. Nothing has inverted yet. Your move?`,o:['Wait for the inversion of the gap','Enter now: it is in the zone',`${L?'Sell':'Buy'} the pullback`],why:'The inversion is your sign the leg in is finished. Orbit tells you where; the confirmation tells you when.',ov:[rectAt(o.gap.i0,o.gap.i1,o.gap.lo,o.gap.hi,'gap',COL.lag,{dash:true})]},
    {at:o.invI,q:`A candle closed back ${L?'above':'below'} the gap. The draw (the swing end, marked) is ${x}× the stop, with the 4H trend. Your call?`,o:[`Take the ${L?'long':'short'}: stop past the leg-in ${L?'low':'high'}, target the swing end`,'Skip: it already moved','Take it with no stop'],why:'A fresh gap inverted inside the OTE zone, with a valid draw and the trend: that is the Orbit entry.',ov:[hlAt(o.entry,'entry',COL.ice,o.invI,{scale:true}),hlAt(o.stop,'stop',COL.bad,o.invI,{scale:true}),hlAt(o.draw,'draw',COL.ok,o.bI,{scale:true})]},
    {at:endI,q:'The trade hit the draw and you were out. Price then ran another 100 points. What is the right view?',o:['Right: the target is fixed at the draw. Many modest wins, not chasing runners','You should have held for the run','Move your targets further next time'],why:'ECHO X ORBIT is not built to catch the 100-point move, and it does not need to: the winners are bigger than the losers, and that adds up.',ov:[]}],
   why:'Wait for the inversion, take it with a valid draw, and let the target be the target.'}};
const rpE=r=>echoReplay(r,true),rpS=r=>echoReplay(r,false),rpO=orbitReplay;
const m=MODS.find(x=>x.id==='m30'),n=3;
Object.assign(m,{chart:true,ex:()=>echoScn(rr(441),{side:'long'}),
 see:e=>[{focus:e.sweepI,ov:[lvl(e),hlAt(e.cisdLevel,'open of the down-move',COL.gold,e.cisdFrom,{scale:true}),rectAt(e.fvg.i0,e.rbI,e.fvg.lo,e.fvg.hi,'FVG',COL.lag,{dash:true})],cap:'<b>A short, taken, and a setup skipped.</b> Run the checklist in order on every call: with the 4H trend, engine identified, a draw at least 2× the stop. This chart is a valid Echo: sweep, CISD, FVG.'},
  {focus:e.rbI,ov:[lvl(e),rectAt(e.fvg.i0,e.rbI,e.fvg.lo,e.fvg.hi,'FVG',COL.lag,{dash:true}),hlAt(e.entry,'entry',COL.ice,e.rbI,{scale:true}),hlAt(e.stop,'stop',COL.bad,e.rbI,{scale:true}),hlAt(e.draw,'draw',COL.ok,0,{scale:true})],cap:`<b>The draw decides.</b> Here the draw is ${x1(e.ratio)}× the stop, so the trade is valid. If the only liquidity were about 1× the stop away, every box could be ticked and the answer would still be skip.`}],
 sum:e=>({ov:[lvl(e)]}),drills:[rpE,rpS,rpO,...m.drills],exam:{bank:3,gen:[[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[7,1]]},
 examDesc:'Three replays where you make every call (one Echo to take, one Echo to skip, one Orbit), plus take-or-skip decisions and ordering the engines.'});
delete m.steps;
})();
