/* ---------- 23 · Trade management & spot the mistake (chart) ---------- */
(()=>{
const lines=m=>[hlAt(m.entry,'entry',COL.ice,m.e,{scale:true}),hlAt(m.stop,'stop',COL.bad,m.e,{scale:true}),hlAt(m.target,'target',COL.ok,m.e,{scale:true})];
const tol=m=>Math.max(1.1,m.s*.45);
const beTap=r=>{const m=mgmtScn(r,{kind:'be',short:r()<.5});
  return{kind:'tap',many:false,topic:'Breakeven at 1:1',q:`You are ${m.short?'short':'long'} from ${fm(m.entry)} with a ${fm(m.R)}-point stop. Click the first candle that reaches 1:1: price ${fm(m.R)} points in your favour (${fm(m.oneR)}).`,C:m.C.slice(0,m.oneI+2),t0:540,ov:[...lines(m),hlAt(m.oneR,'1:1',COL.gold,m.e,{scale:true})],want:[m.oneI],
   why:`The candle at ${hhmm(540+m.oneI*5)} is the first to trade to ${fm(m.oneR)}. At 1:1 the plan says move the stop to breakeven.`}};
const beLevel=r=>{const m=mgmtScn(r,{kind:'be',short:r()<.5});
  return{kind:'level',topic:'Breakeven at 1:1',q:'Price has just reached 1:1. Place a line where your stop goes now.',C:m.C.slice(0,m.oneI+2),t0:540,ov:[hlAt(m.entry,'entry',COL.ice,m.e,{scale:true}),hlAt(m.target,'target',COL.ok,m.e,{scale:true}),hlAt(m.oneR,'1:1 reached',COL.gold,m.e,{scale:true})],truth:[{p:m.entry,tol:tol(m),label:'new stop (breakeven)'}],
   why:`At 1:1 the stop moves to the entry, ${fm(m.entry)}: the worst case is now $0. A stop only ever moves toward profit.`}};
const trail=r=>{const m=mgmtScn(r,{kind:'trail',short:r()<.5}),l=m.lastLow;
  return{kind:'level',topic:'Trailing behind structure',q:`The trade is in profit with the stop at breakeven. Trail the stop ${m.short?'above the last lower high':'under the last higher low'} (the swing before the current leg).`,C:m.C,t0:540,ov:[hlAt(m.entry,'entry',COL.ice,m.e,{scale:true})],truth:[{p:l.p,tol:Math.max(1.4,m.s*.6),label:'trailing stop'}],
   why:`Trail behind structure, not tick by tick: the last ${m.short?'lower high':'higher low'} is at ${fm(l.p)}. Price should not revisit it if the idea is still right, and a looser trail will not choke you out of the move.`}};
const stall=r=>{const m=mgmtScn(r,{kind:'stall',short:false});
  return{kind:'tap',many:false,topic:'Stalling under a high',q:'Your stop is at breakeven and price keeps stalling just under an old high. Click the candle that makes that old high.',C:m.C.slice(0,m.stallI+3),t0:540,ov:[...lines(m)],want:[m.stallI],
   why:`The candle at ${hhmm(540+m.stallI*5)} wicks to ${fm(m.oldHigh)} and fails. Old highs are where price often stalls, so taking a partial or trailing under the last higher low is part of the model. Do not squeeze the last point.`}};
const MIS=[
 ['The moved stop','You entered long at 100 with a stop at 85. Price fell to 90 and you moved the stop to 75. It lost 25 points. Where did it go wrong?',['Moving the stop from 85 to 75','The entry at 100','The exit','Using a stop at all'],'A planned -15 became -25. A stop only ever moves toward profit.'],
 ['The chase','Your limit at 101 missed by 1.5 points and price ran. You bought at 125 anyway and were stopped. Where was the mistake?',['Chasing at 125','Using a limit order','Taking the stop','Placing a stop at all'],'A missed trade is a $0 trade. Chasing turns it into a loss, far from any level.'],
 ['The revenge trade','A+ long, stopped for -15. Two minutes later you went long again at double size with no setup and lost more. Where did it go wrong?',['The re-entry: revenge trading','The first trade','Stopping for the day','Using a stop'],'After a loss the next trade needs a full setup and the same size. Two losses means done for the day.'],
 ['The news spike','At 8:20 you leave a limit working. CPI comes out at 8:30, one candle fills you and blows through the stop. Where is the mistake?',['Leaving the order working into the news','The stop being too tight','The limit price','The side of the trade'],'Cancel working orders and stay flat into red-folder news. Spikes can skip past stops.']];
const mistake=r=>{const [t,q,o,why]=pick(r,MIS);return mcq(t,q,o,why)};
const MG=BANKS('Managing',[
 ['Price hits 1:1. The rule?',['Move the stop to breakeven','Close it all','Add size','Move the stop away'],'Breakeven at 1:1.'],
 ['Price drops fast toward your stop. Best action?',['Nothing: the stop is the plan','Move the stop lower','Add to it','Close in fear'],'The hardest one is doing nothing.'],
 ['Moving your stop further away after entry is…',['A classic account killer','Smart flexibility','Required','Harmless'],'It turns small losses into big ones.'],
 ['Chasing a candle that already ran means…',['A bigger stop and worse R','A better entry','No risk','A guaranteed win'],'Late entries pay for it in the stop.'],
 ['A revenge trade is…',['A trade taken to win back a loss','A planned A+ setup','A hedge','A partial'],'It is emotion, not a setup.'],
 ['Holding a fresh entry into 8:30 news is…',['A gamble with your stop','Fine','Required','Safe with a tight stop'],'Spikes blow through stops.'],
 ['Trail your stop behind…',['Structure and PD-arrays','Every candle','A random number','The last candle close'],'Places price should not revisit if you are right.'],
 ['You are up +33 with the stop at breakeven, stalling under an old high. A valid choice is…',['Take a partial or trail under the last higher low','Move the stop to -15','Add size','Cancel the stop'],'Taking something off along the way is part of the model.'],
 ['Closing every winner at 1:1 turns a 2.7R system into…',['A 1R system, which the maths does not support','A safer 3R system','The same system','A winning system always'],'The math needs the winners to run.']]);
MODS.push({id:'m23',o:14.5,ph:4,chart:true,t:'Trade Management & Spot the Mistake',out:'Manage a trade after entry, and recognise the four classic ways accounts die.',
 ls:['Breakeven at 1:1','Stalling under an old high: partials and trailing','A fast move against you: leave the stop','The moved stop, the chase, the revenge trade, the news spike'],
 task:'Replay five of your recent trades in Bar Replay. For each, mark the 1:1 point, where the stop should have moved to breakeven, and the last higher low (or lower high) you would have trailed behind. Note any moment you broke the plan and which of the four classic mistakes it was.',
 ex:()=>mgmtScn(rr(311),{kind:'be'}),
 learn:[
  {t:'At 1:1: breakeven',h:`<p>Once price has moved as far in profit as your stop is away (<b>1:1</b>), move the stop to <b>breakeven</b>. The worst case is $0 and you can let the trade work. A pullback that holds above breakeven cannot hurt you.</p>`+warn('<p>Closing every winner at 1:1 turns a 2.7R system into a 1R one, and that math does not work.</p>','Do not cut it short')},
  {t:'Stalling and trailing',h:`<p>If you are well in profit and price struggles under an <b>old high</b>, you can take a <b>partial</b> (something off along the way is part of the model), <b>trail the stop under the last higher low</b>, or close. Trail behind structure, not tick by tick, so you keep most of the move without being choked out. Do not squeeze the last point.</p>`},
  {t:'A fast move against you',h:`<p>Right after entry price drops fast toward the stop and your heart rate is up. The right call is to do nothing: you set the risk when you were calm. Moving the stop down turns a planned -15 into -25 or worse; closing in fear every time kills the trades that would have worked.</p>`},
  {t:'Four ways accounts die',h:tblx(['Mistake','What happens','The rule'],[['The moved stop','A planned -15 becomes -25','A stop only moves toward profit'],['The chase','Buying far from your level after a missed limit','A missed trade is $0; wait for the next setup'],['The revenge trade','Double size, no setup after a loss','Full setup, same size; two losses means done'],['The news spike','Working order into 8:30 data, blown through the stop','Cancel and stay flat into red-folder news']])}],
 recall:rc('Orders & Your First Trade','At 1:1 in profit the plan says…',['Move the stop to breakeven','Add size','Close everything','Move the stop lower'],'This module is about everything after that point.'),
 see:m=>{const r=mgmtScn(rr(312),{kind:'trail'});return[
  {focus:m.oneI,ov:lines(m),cap:`<b>The trade.</b> Long from <b>${fm(m.entry)}</b>, stop ${fm(m.stop)} (${fm(m.R)} points), target ${fm(m.target)}. Risk 1R to make about 2.7R.`},
  {focus:m.oneI,ov:[...lines(m),hlAt(m.oneR,'1:1',COL.gold,m.e,{scale:true}),boxOf(m.C,m.oneI,m.oneI,COL.sig,.5)],cap:`<b>1:1.</b> This candle is the first to reach ${fm(m.oneR)}. The stop moves to the entry.`},
  {focus:m.endI,ov:[hlAt(m.entry,'stop at breakeven',COL.sig,m.oneI,{dash:false,scale:true}),hlAt(m.target,'target',COL.ok,m.e,{scale:true})],cap:`<b>The pullback is harmless.</b> Price dips back toward the entry but holds above breakeven, then runs to the target. With the stop at breakeven that dip could not hurt you.`}]},
 sum:m=>({ov:lines(m)}),
 explain:{prompts:['Explain what you do at 1:1 and why, and what you do when price stalls under an old high while you are well in profit.','Name the four classic ways accounts die and say the rule that prevents each.'],
  ideas:['At 1:1 move the stop to breakeven so the trade cannot lose','A stop only ever moves toward profit','Closing every winner at 1:1 deletes the edge','When stalling take a partial or trail under the last higher low','Trail behind structure, not tick by tick','Leave the stop alone in a fast move against you: it is the plan','A missed trade is $0: never chase','After a loss use a full setup and the same size; two losses is done','Cancel orders and stay flat into red-folder news']},
 drills:[beTap,beLevel,trail,stall,mistake],
 bank:[...MG,...BANKS('Spot the mistake',MIS.map(([t,q,o,why])=>[q,o,why]))],
 exam:{bank:5,gen:[[0,1],[1,2],[2,2],[3,1],[4,2]]},examDesc:'Finding 1:1 on a chart, placing the breakeven and trailing stops, and spotting the mistake in a trade.'});
})();
