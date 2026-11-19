/* ============================================================
   LUMEN, from the LUMEN A-to-Z guide (zone tap, structure break, and how to read the order flow with it; NQ / MNQ, 1-minute chart).
   Five modules built around the 30-second order-flow check at LUMEN's three moments. Valid in every session. Rules and reading only: no results, win rates or statistics.
============================================================ */
(()=>{
/* which path the student is on decides how the shared lessons read */
const BP=window.LEARN_PATH==='basic';
const pathBanner=BP?`<div class="callout key"><span class="hud">Your path: Basic Path</span><p>You trade this strategy on <b>TradingView only</b>: the candles, the volume bars and the indicator. It is easier to follow and quicker to learn than the Orderflow Path, and not as precise, because you read what price did, not who was trading.</p></div>`:`<div class="callout key"><span class="hud">Your path: Orderflow Path</span><p>You trade this strategy with an <b>orderflow platform</b> such as ATAS, DeepCharts or Bookmap beside TradingView, so you can see who is buying and selling. It is the more precise and accurate way, and it is more intricate.</p></div>`;
const MOD={A:[30,'1:6',6],B:[70,'1:6',6],C:[30,'1:6',6],D:[80,'1:6',6],E:[70,'1:4',4],G:[60,'1:6',6],M:[40,'1:6',6]};
/* ---------- generators ---------- */
const stopTarget=numGen('Stop and target',r=>{const k=pick(r,Object.keys(MOD)),m=MOD[k],what=pick(r,['target','stop']);
  return{q:`LUMEN model ${k} uses a ${m[0]}-point stop and a ${m[1]} target (the target is ${m[2]} times the stop). How many points is the ${what}?`,ans:what==='stop'?m[0]:m[0]*m[2],unit:'pts',tol:.01,why:what==='stop'?`The stop is ${m[0]} points.`:`${m[2]} × ${m[0]} = ${m[0]*m[2]} points.`}});
const contracts=numGen('Contracts',r=>{const risk=pick(r,[150,250,400,500]),st=pick(r,[30,40,60,70,80]),n=Math.floor(risk/(st*2));
  return{q:`Your risk per trade is $${risk} and the LUMEN stop is ${st} points. MNQ is $2 a point. How many MNQ contracts, rounded down? (0 means skip.)`,ans:n,unit:'',tol:.01,why:`$${risk} ÷ (${st} × $2) = ${(risk/(st*2)).toFixed(2)}, rounded down: ${n}.${n===0?' Even one is too much risk, so you skip.':''}`}});
const opensQ=r=>{const names=['1-hour','4-hour','day','week'],long=r()<.5,above=names.map(()=>r()<.55),n=above.filter(Boolean).length,agree=long?n:4-n,need=3,ok=agree>=need;
  return mcq('Opens that agree',`A LUMEN ${long?'long':'short'} is being looked at. Price is ${names.map((x,i)=>`${above[i]?'above':'below'} the ${x} open`).join(', ')}. LUMEN needs at least 3 of the 4 opens to agree with the trade. Does it pass?`,[ok?`Yes: ${agree} of 4 agree`:`No: only ${agree} of 4 agree`,ok?`No: only ${Math.max(0,agree-1)} of 4 agree`:`Yes: ${agree+1} of 4 agree`,'Yes: the opens do not matter','No: LUMEN never uses the opens'],`For a ${long?'long':'short'}, an open agrees when price is ${long?'above':'below'} it. ${agree} agree, and 3 are needed.`)};
const orderQ=()=>({kind:'order',topic:'The three steps',q:'Put LUMEN\'s three steps in order.',steps:['A 15-minute zone gets tapped and turns orange: it is armed for an hour','Price breaks away: a 3- or 5-minute candle closes beyond the last 8 candles\' swing, away from the zone','At least 3 of the 4 key opens agree with the trade','The 30-second flow check, then entry at the next 1-minute open with the stop placed at once'],why:'Tap, break, opens agree, then you check the flow and enter. If any step is missing there is no trade.'});
const tapQ=ofSceneQ('Moment 1: the tap',['z_absorb','z_slice'],'Price has just tapped a LUMEN demand zone (the orange box) and you are watching for a long. Below is the footprint. What is your move?','trade');
const breakQ=ofSceneQ('Moment 2: the break',['b_good','b_weak','b_absorbed'],'LUMEN has marked a break away from the zone (the big candle is the third column). What is your move?','trade');
const afterQ=ofSceneQ('Moment 3: after entry',['a_fed','a_div','a_opp'],'You are in a LUMEN long. Read the footprint since you entered.','read');
const mixQ=ofSceneQ('The 30-second check',['z_absorb','z_slice','b_good','b_weak','b_absorbed','a_fed','a_div'],'LUMEN has a signal and you do the 30-second flow check. What is your move?','trade');
const nightQ=r=>{const k=pick(r,[
 ['Night-session volume is thin. How much weight do you give order flow?','Less weight, and keep the size small','More weight, because it is cleaner','The same as the day session','None, and size up'],
 ['A few large orders can distort delta at night. What do you do?','Give flow less weight and keep size small','Double size','Move the stop','Ignore LUMEN']]);
  return mcq('The night session',k[0],[k[1],k[2],k[3],k[4]],'Thin night-session volume lets a few big orders distort delta. Give flow less weight and keep the size small.')};
const lateQ=r=>mcq('Late entries',pick(r,['You missed the entry and price has already run well past it. What do you do?','The entry message arrived while you were away and price has run far. What now?']),['Skip it: chasing makes the stop big relative to the reward','Chase it with a wider stop','Add size to catch up','Move the target'],'There will be another setup.');
/* ---------- l01 · the idea ---------- */
quick({id:'l01',o:15.71,ph:0,t:'LUMEN in Plain Words',out:'Say what LUMEN waits for, in order, and what the model tags and hour tags mean.',
 ls:['The idea in plain words','The three steps, in order','Words you need','The models and the tags','What it feels like'],
 task:'Open a 1-minute NQ chart with LUMEN on (or the picture in this lesson). Find a zone, a tap and a break. Write the three steps in your own words, in order.',
 learn:[
  {t:'The idea in plain words',h:pathBanner+key('<p>Big moves leave behind the last opposite candle before they started. Price often comes back to touch it, and then continues.</p>','In plain words')+`<p>LUMEN waits for <b>three things, one after another</b>. If all three line up, it marks an entry. ${BP?'The other Basic Path lessons show you how to read the tap and the break on TradingView.':'The rest of this course is about the order-flow check you do before you act on it.'}</p>`+(BP?OFV.lab('btap'):OFV.lumenFlow())},
  {t:'The three steps, in order',h:`<ol><li><b>A zone gets touched.</b> A 15-minute supply or demand zone is tapped. It turns orange: it is armed for the next hour.</li><li><b>Price breaks away from it.</b> A candle on the 3- or 5-minute chart closes beyond the last 8 candles\' swing, in the direction away from the zone.</li><li><b>The bigger picture agrees.</b> Price is on the trade\'s side of at least <b>3 of the 4 key opens</b> (1-hour, 4-hour, day, week).</li></ol><p>If all three line up, the entry is the next 1-minute open, with a fixed stop and a target six times the stop (four times for one model). The trade is closed at 15:55 New York time if it is still open.</p>`},
  {t:'Words you need',h:tblx(['Word','Plain meaning'],[['Supply zone','The last up candle before a strong drop. Price may fall again when it returns'],['Demand zone','The last down candle before a strong rise. Price may rise again when it returns'],['Tapped / armed','Price traded into the zone. LUMEN is now watching for the break for an hour'],['Structure break','A candle closes beyond the high (longs) or low (shorts) of the last 8 candles'],['Opens','The price at the start of each period (1-hour, 4-hour, day, week). Above them means buyers are in control of that period'],['R','One unit of risk. A stop is −1R']])},
  {t:'The models and the tags',h:tblx(['Model','Trigger','Stop','Target'],[['A Core','5-minute','30 pts','1:6'],['B Selective','3-minute, big candle and volume','70 pts','1:6'],['C Mid','5-minute, big candle','30 pts','1:6'],['D Wide','5-minute, big candle and volume','80 pts','1:6'],['E Early','3-minute, big candle and volume','70 pts','1:4'],['G Daily','5-minute, big candle, no opens test','60 pts','1:6'],['M Micro','1-minute, 8:30 to 10:00 AM only','40 pts','1:6']])+`<p>You do not need to learn each model. The <b>tag</b> on the entry is what matters. <b>PRIME</b> (a star) and <b>GOOD HRS</b> (entries during the night or the lunch hour) are labels only: they never block a trade. LUMEN is valid in every session.</p>`},
  {t:'What it feels like',h:warn('<p>Most trades are stopped out. A few run a long way, and many of the profitable ones are simply still open and winning at the 15:55 close. So it feels like many small losses, then occasional big days. Long losing streaks are normal. Size small and judge it over many trades, not a week.</p>','Honest note')}],
 recall:rc('Orderflow: Orderflow at Highs, Lows and Zones','Is a sweep with agreeing flow a trigger?',['No: it is a flag, the strategy gives the trigger','Yes','Yes on news days','Yes in the morning'],'Flow adds or removes confidence.'),
 steps:[['<b>1. The tap.</b>',BP?OFV.lab('btap'):OFV.lumenFlow()],['<b>2. The break.</b>',`<p>A 3- or 5-minute candle closes beyond the last 8 candles\' swing, away from the zone.</p>`],['<b>3. The opens agree.</b>',`<p>At least 3 of the 4 opens (1-hour, 4-hour, day, week) are on the trade\'s side.</p>`]],
 gens:[orderQ,opensQ,stopTarget,contracts],
 bank:BANKS('LUMEN',[
  ['How many things does LUMEN wait for?',['Three, one after another','One','Five at once','None'],'Tap, break, opens agree.'],
  ['What does an orange zone mean?',['Price tapped it: it is armed for the next hour','The trade is over','A news day','Price broke it'],'LUMEN is now watching for the break.'],
  ['What counts as a structure break?',['A candle closing beyond the high or low of the last 8 candles, away from the zone','Any big candle','A wick','The open'],'The close matters.'],
  ['How many of the 4 opens must agree?',['At least 3','All 4 always','1','None'],'The default is 3 of 4.'],
  ['Which opens does LUMEN use?',['1-hour, 4-hour, day and week','Only the day','Only the week','Only the 1-hour'],'Four opens.'],
  ['Where is the entry?',['The next 1-minute open','At the zone','At the close of the day','At a retest'],'After all three steps.'],
  ['When is the trade closed if still open?',['15:55 New York time','9:30 AM','4:00 PM sharp','Never'],'The indicator is built around that close.'],
  ['What is a supply zone?',['The last up candle before a strong drop','The last down candle before a rise','A gap','A news candle'],'Price may fall again when it returns.'],
  ['Do PRIME and GOOD HRS block a trade?',['No: they are labels only','Yes','Only at night','Only at lunch'],'Labels only.'],
  ['What does LUMEN feel like?',['Many small losses, then occasional big days','Mostly wins','Every trade runs far','No losses'],'Long losing streaks are normal.'],
  ['Which sessions is LUMEN valid in?',['All of them','Only New York','Only Asia','Only London'],'Valid in every session.']]),
 examDesc:'The three steps in order, the opens, the model tags, and what LUMEN feels like.'});
/* ---------- l02 · the tap ---------- */
quick({id:'l02',o:15.72,ph:0,t:'Moment 1: The Zone Tap',out:'Read a zone tap in the flow: is the zone defending itself or being run over?',
 ls:['What you want to see','What is a warning','The leg behind the zone','Night-session volume is thin'],
 task:'Find a LUMEN zone tap on a footprint chart (or use the pictures here). Write down: did price meet heavy aggressive volume against your direction at the zone? Did it make progress through the zone?',
 learn:[
  {t:'What you want to see',h:key('<p>A zone that is working shows heavy trading that cannot get through it. That is absorption.</p>','In plain words')+`<p>When the zone is tapped, the question is: <b>is the zone defending itself?</b> Price pokes into a demand zone with heavy aggressive volume against your direction (sells into a demand zone, buys into a supply zone) but <b>cannot make progress</b>. The delta may swing hard against price and then stall. That is a green.</p>`+OFV.scene('z_absorb')},
  {t:'What is a warning',h:`<p>Price <b>slices through the zone</b> with stacked imbalances and one-sided delta, and the next candle opens beyond the zone\'s far edge. A 15-minute close through the zone also kills it on the chart. That is a red.</p>`+OFV.scene('z_slice')},
  {t:'The leg behind the zone',h:`<p>A LUMEN zone is the last opposite candle before a strong move. That strong move is the leg where one side was far more aggressive. If you profile that leg, the thin spots inside it show you where price may react when it comes back to the zone.</p>`+key('<p>The zone is where the aggression started. The thin spots are the same story seen in the profile.</p>','In plain words')+OFV.lab('lvn','zone')},
  {t:'Night-session volume is thin',h:warn('<p>A few large orders can distort delta at night. Give order flow less weight in Asia and keep the size small.</p>')}],
 recall:rc('LUMEN in Plain Words','How many of the 4 opens must agree?',['At least 3','All 4 always','1','None'],'The default is 3 of 4.'),
 steps:[['<b>A healthy tap.</b>',OFV.scene('z_absorb')],['<b>A failing zone.</b>',OFV.scene('z_slice')],['<b>At night.</b>',`<p>Thin volume: give flow less weight, keep the size small.</p>`]],
 gens:[tapQ,tapQ,nightQ,lateQ],
 bank:BANKS('The zone tap',[
  ['A LUMEN zone is the last opposite candle before a strong move. What do the thin spots in that leg show?',['Where price may react when it returns','A guaranteed target','Where to move the stop','Nothing'],'Thin spots are where one side was far more aggressive.'],

  ['At a tap, what is the question?',['Is the zone defending itself or being run over?','Is it Monday?','What is the news?','Where is the stop?'],'Absorption or a slice-through.'],
  ['Heavy selling pushes into a demand zone but cannot make progress. What is it?',['Absorption: green','A failing zone','A news spike','A gap'],'The zone is defending itself.'],
  ['What does a sliced-through zone look like?',['Stacked imbalances, one-sided delta, and the next candle opens beyond the far edge','Heavy volume that stalls','Thin volume','A doji'],'Red.'],
  ['A 15-minute close through the zone does what?',['Kills it on the chart','Arms it','Makes it stronger','Nothing'],'The zone is finished.'],
  ['What colour is absorption at the tap?',['Green','Red','Yellow','None'],'You want to see it.'],
  ['What colour is a slice-through?',['Red: skip','Green','Yellow','Always green'],'The zone is failing.'],
  ['How do you treat order flow at night?',['Less weight, small size','More weight','Double size','Ignore LUMEN'],'Thin volume distorts delta.'],
  ['The delta swings hard against price and then stalls at the zone. What is it?',['A sign the zone is working','A sign it is failing','Nothing','A news candle'],'It may swing, then stall.'],
  ['Can the tap alone be an entry?',['No: it only arms the zone','Yes','Yes at night','Yes at lunch'],'Wait for the break.'],
  ['What do you do if you missed the entry and price ran?',['Skip it','Chase','Add size','Move the stop'],'There will be another.'],
  ['Heavy aggressive volume against your direction, but price makes no progress, means…',['Someone is soaking it up','Price will break out','The market is closed','The news is out'],'Absorption.']]),
 examDesc:'Reading a zone tap: absorption versus a slice-through, and the night session.'});
/* ---------- l03 · the break ---------- */
quick({id:'l03',o:15.73,ph:0,t:'Moment 2: The Break Candle',out:'Read the break candle in the flow: who pushed it?',
 ls:['What you want to see','Warning signs','Close, not wick','LUMEN checks size, you check who'],
 task:'Find the break candle of a LUMEN entry on a footprint chart. Write down its delta, whether volume was clearly higher than the candles before, and whether stacked imbalances piled up in the break direction.',
 learn:[
  {t:'What you want to see',h:key('<p>A good break is pushed by the side it breaks toward. The delta agrees with the candle and the volume is clearly higher.</p>','In plain words')+`<p>The delta of the break candle <b>agrees with its direction</b>. The break happens on clearly higher volume than the candles before, and imbalances pile up in the direction of the break.</p>`+OFV.scene('b_good')},
  {t:'Warning signs',h:`<p>A big break candle with <b>weak or opposite delta</b>: the candle closed up but sellers were the aggressors. Or volume jumps but price barely follows: <b>absorption on the wrong side</b>.</p>`+OFV.scene('b_weak')+OFV.scene('b_absorbed')},
  {t:'Close, not wick',h:`<p>LUMEN's break is a candle that <b>closes</b> beyond the last 8 candles' swing. The same idea applies to the flow: a wick through a level is not a break, and a close still inside the cluster of big prints is not either.</p>`+key('<p>The close is what counts. A touch is not a break.</p>','In plain words')+OFV.lab('brk')},
  {t:'LUMEN checks size, you check who',h:`<p>Some models need a big candle and a volume filter. LUMEN checks the <b>size</b>. You check <b>who pushed it</b>. A big candle can still be a bad break.</p>`}],
 recall:rc('Moment 1: The Zone Tap','What colour is a slice-through?',['Red: skip','Green','Yellow','Always green'],'The zone is failing.'),
 steps:[['<b>A clean break.</b>',OFV.scene('b_good')],['<b>Weak delta.</b>',OFV.scene('b_weak')],['<b>Absorbed.</b>',OFV.scene('b_absorbed')]],
 gens:[breakQ,breakQ,tapQ,mixQ],
 bank:BANKS('The break candle',[
  ['Price pokes through a level but the candle closes back inside. Is it a break?',['No: a wick is not a break','Yes','Only at night','Only with big volume'],'The close counts, not the touch.'],

  ['What do you check about the break candle?',['Whether its delta agrees with its direction','Only its colour','Only its size','The news'],'Who pushed it.'],
  ['The break candle closed up but its delta is negative. What colour is it?',['Red: skip','Green','Yellow','Always green'],'Sellers were the aggressors.'],
  ['What does a clean break show?',['Delta agrees, volume clearly higher, imbalances pile up in the break direction','Delta against it','Low volume','A gap'],'Green.'],
  ['Volume jumps but price barely follows. What is it?',['Absorption on the wrong side','A clean break','A gap','Exhaustion'],'Red.'],
  ['What does LUMEN check about the break?',['The size and volume filter','The delta','The footprint','Who pushed it'],'You check who.'],
  ['What do you check that LUMEN does not?',['Who pushed the candle','The size','The close','The open'],'The flow.'],
  ['Stacked imbalances in the break direction mean…',['One side is in control','The break is fake','Nothing','Low volume'],'Green.'],
  ['A big candle with opposite delta is…',['A warning','A strong signal','A gap','Normal'],'The close and the aggression disagree.'],
  ['Which is a green break?',['Delta agrees and volume is clearly higher','Delta against','Low volume','A tiny candle'],'Green.'],
  ['Can order flow make you take a break LUMEN did not mark?',['Never','Yes','Yes if green','Yes at night'],'It never makes you take an unmarked trade.'],
  ['How much time do you have to check?',['About 30 seconds before the next open','An hour','None','All day'],'A quick check.']]),
 examDesc:'Reading the break candle: delta agrees, volume, imbalances, and the warning signs.'});
/* ---------- l04 · after entry ---------- */
quick({id:'l04',o:15.74,ph:0,t:'Moment 3: After You Are In',out:'Read what the flow says once you are in, and what it never changes.',
 ls:['What you want to see','Warning signs','What never changes'],
 task:'On a footprint chart, watch the cumulative delta after an entry. Does it keep rising for a long (falling for a short) as price advances? Do the pullbacks come on thin volume?',
 learn:[
  {t:'What you want to see',h:key('<p>If the trade is being fed, the cumulative delta keeps moving your way and pullbacks are thin.</p>','In plain words')+`<p>For a long, the cumulative delta (CVD) keeps <b>rising</b> as price advances, and pullbacks come on <b>thin volume</b>. For a short, the mirror.</p>`+OFV.scene('a_fed')},
  {t:'Warning signs',h:`<p>Price makes a new high but the CVD makes a <b>lower high</b>: buyers are fading. Or heavy opposite volume stacks up on your stop side.</p>`+OFV.scene('a_div')+OFV.scene('a_opp')},
  {t:'What never changes',h:warn('<p>Order flow never moves your stop, never changes the target, and never adds a partial. Do not move the stop closer. The indicator closes the idea at 15:55: close yours then too if it is still open.</p>','The rules')}],
 recall:rc('Moment 2: The Break Candle','Can order flow make you take a break LUMEN did not mark?',['Never','Yes','Yes if green','Yes at night'],'It never makes you take an unmarked trade.'),
 steps:[['<b>Being fed.</b>',OFV.scene('a_fed')],['<b>Fading.</b>',OFV.scene('a_div')],['<b>Pressure at the stop.</b>',OFV.scene('a_opp')]],
 gens:[afterQ,afterQ,mixQ,lateQ],
 bank:BANKS('After entry',[
  ['What does a long that is being fed look like?',['CVD keeps rising and pullbacks are thin','CVD falls','Heavy opposite volume','No volume'],'Green.'],
  ['Price makes a new high but the CVD makes a lower high. What is it?',['Buyers fading: a warning','Buyers in control','A gap','A news candle'],'A warning, not a reason to move the stop.'],
  ['Heavy opposite volume at your stop side is…',['Pressure against the trade: red','A good sign','Nothing','A gap'],'Watch it.'],
  ['Can order flow move your stop?',['Never','Yes if it looks red','Yes if green','Yes at night'],'The stop does not move.'],
  ['Can order flow change the target?',['Never','Yes','Yes if green','Yes at night'],'The target is fixed.'],
  ['What do you do at 15:55 if the trade is still open?',['Close it','Hold overnight','Add size','Move the stop'],'The indicator closes the idea then.'],
  ['What does CVD mean?',['Cumulative delta: the running total of delta','A candle type','A news item','A stop'],'The running score.'],
  ['What do thin pullbacks tell you?',['The move is being fed','The move is over','Nothing','A gap'],'Green.'],
  ['For a short, what does a healthy CVD do?',['Keeps falling','Rises','Flat','Disappears'],'The mirror.'],
  ['Do you add a partial because the flow looks good?',['Never','Yes','Yes if green','Yes at night'],'Order flow never adds a partial.'],
  ['What is the most important rule after entry?',['Leave it alone: do not move the stop closer','Add size','Chase','Move the target'],'The plan is fixed.']]),
 examDesc:'Reading the flow after entry: being fed, fading, pressure at the stop, and what never changes.'});
/* ---------- l05 · act and routine ---------- */
quick({id:'l05',o:15.75,ph:0,t:'How to Act, and Your Routine',out:'Turn the three checks into one decision, size small, and run a LUMEN day.',
 ls:['How to act on it','Footprint settings to start with','Why trades lose','The opens are your balance check','Extra flow checks (second opinion)','The one to watch: the first 3 minutes','A daily routine'],
 task:'Write your own 30-second check card: one line for the tap, one for the break, one for after entry, and your rule for green, yellow and red.',
 learn:[
  {t:'How to act on it',h:key('<p>All green: planned size. One yellow: half size, or wait one candle. Red: skip.</p>','In plain words')+tblx(['Moment','Green','Warning (yellow or red)'],[['1. The tap','Absorption: heavy volume against you but no progress','Sliced through with stacked imbalances; the next candle opens beyond the far edge'],['2. The break','Delta agrees, volume clearly higher, imbalances pile up','Big candle with weak or opposite delta; volume jumps but price does not follow'],['3. After entry','CVD keeps moving your way, thin pullbacks','New high with a lower CVD high; heavy opposite volume at your stop']])+`<ul><li><b>All green:</b> take the trade at your planned size.</li><li><b>One yellow:</b> take half size, or wait one candle to see if it clears.</li><li><b>Red:</b> skip it.</li><li>Never size up because the flow looks great.</li></ul>`+OFV.scene('b_good')},
  {t:'Footprint settings to start with',h:`<p>On a footprint platform (such as DeepCharts): a <b>1-minute (or 3-minute) footprint</b> with bid and ask volume and delta, an <b>imbalance ratio of about 300%</b>, a <b>cumulative delta panel reset at the 6 PM open</b>, and the volume profile of the current session. Keep the footprint on a second chart or monitor if your main chart gets crowded.</p>`},
  {t:'Why trades lose',h:tblx(['What happened','What to do'],[['Stopped out right after a zone tap','Normal. Most trades are stopped. Keep risk small'],['Several losses in a row','Expected. Do not increase size to win it back. Reduce size after a bad week if it affects your decisions'],['Too many trades open together','Lower the max-open setting. Overlapping trades are not independent'],['A break-even-hours trade went nowhere','Stick to PRIME or GOOD HRS tags'],['Entered late, after price ran','Skip late entries']])},
  {t:'The opens are your balance check',h:`<p>LUMEN's third step (price on the trade's side of at least 3 of the 4 opens) is its version of <b>waiting for out-of-balance</b>. Inside a balanced day, a zone tap and a break stall. Once price is clearly away from the opens, the same pattern has room.</p>`+key('<p>The opens check is the lock: price has to be out of balance before the pattern is worth acting on.</p>','In plain words')+OFV.lab('bal')},
  {t:'Extra flow checks (second opinion)',h:FLOWX.words()+FLOWX.lumen()},
  {t:'The one to watch: the first 3 minutes',h:FLOWX.watch()},
  {t:'A daily routine',h:`<ol><li><b>Before the session:</b> check the day\'s news and the 1-hour, 4-hour, day and week opens. Know which way price sits against them.</li><li>Check your alert is active. TradingView alerts expire: re-create it when needed.</li><li><b>When a message arrives:</b> read the tab, do the 30-second check, decide.</li><li><b>After the session:</b> write down each trade, its model tag, your flow colours and how it ended. Review weekly.</li></ol>`+warn('<p>LUMEN is a decision aid, not a promise of profit. Losing streaks are normal. Trade only money you can afford to lose.</p>')}],
 recall:rc('Moment 3: After You Are In','What do you do at 15:55 if the trade is still open?',['Close it','Hold overnight','Add size','Move the stop'],'The indicator closes the idea then.'),
 steps:[['<b>The decision.</b>',tblx(['Result','You do'],[['All green','Planned size'],['One yellow','Half size, or wait one candle'],['Red','Skip']])],['<b>One picture.</b>',OFV.scene('b_good')],['<b>The routine.</b>',`<p>Opens in the morning, alert on, check at each message, journal at the end.</p>`]],
 gens:[mixQ,mixQ,contracts,orderQ],
 bank:BANKS('Acting on the check',[
  ['LUMEN\'s 3-of-4 opens step is like...',['Waiting for price to be out of balance','A news filter','A time filter','A size filter'],'Price has to be away from the opens for the pattern to have room.'],

  ['All three moments green. What do you do?',['Take the trade at your planned size','Double size','Skip','Move the stop'],'Never more.'],
  ['One yellow. What do you do?',['Half size, or wait one candle','Double size','Skip always','Move the stop'],'Part of the picture is off.'],
  ['Red. What do you do?',['Skip it','Take it anyway','Add size','Move the stop'],'Skipping costs nothing.'],
  ['What imbalance ratio do you start with?',['About 300%','10%','50%','1000%'],'A common starting setting.'],
  ['When is the CVD panel reset?',['At the 6 PM open','At 9:30 AM','Never','At noon'],'The session open.'],
  ['What do you do after several losses in a row?',['Do not increase size to win it back','Double size','Stop reading','Change every rule'],'Expected. Keep size small.'],
  ['What do you do if you entered late?',['Skip late entries','Chase','Add size','Move the stop'],'There will be another setup.'],
  ['Which tags are best to take?',['PRIME or GOOD HRS','Any','None','Only break-even hours'],'Stick to them as a beginner.'],
  ['When should you review your trades?',['Weekly, with model tag, flow colours and result','Never','Only after a win','Only after a loss'],'Build your own record.'],
  ['What happens to TradingView alerts?',['They expire: re-create when needed','They last forever','They never work','They trade for you'],'Check them.'],
  ['LUMEN is…',['A decision aid, not a promise of profit','A guarantee','Free money','Always right'],'Losing streaks are normal.']]),
 examDesc:'Turning the three checks into a decision, the footprint settings, why trades lose, and the routine.'});
/* ===== BASIC PATH · LUMEN on TradingView only: the same rules, read from candles and the volume bars. No order-flow software. ===== */
const bNote=warn('<p>On the Basic Path you trade on TradingView only. The chart shows <b>what price did</b>, not <b>who was trading</b>. Orderflow software shows both, which is why the Orderflow Path is more precise. The Basic Path is easier to follow and quicker to learn, and the rules below make up for what you cannot see.</p>','Be honest about what you can see');
quick({id:'bl1',o:15.76,ph:0,bonly:1,t:'Reading the Tap and the Break on TradingView',out:'Read a LUMEN zone tap and break from the candles and the volume bars alone, and know when to skip.',
 ls:['What you have on TradingView','The tap: holds or fails','The break: close, not wick','The zone, and where it comes from','What you cannot see'],
 task:'Open a 1-minute NQ chart with LUMEN. Find a zone tap and the break after it. Write what the candle did at the tap (closed back out, or closed through) and whether the break candle closed beyond the swing.',
 learn:[
  {t:'What you have on TradingView',h:key('<p>Your whole toolkit is the candles, the volume bars under the chart, and the levels LUMEN draws.</p>','In plain words')+`<p>You do not need any extra software. LUMEN marks the zone, the tap and the break on your chart. Your job is to read three things yourself: <b>where the candle closed</b>, <b>how big the candle is</b> compared with the ones before it, and <b>whether the volume bar is bigger</b> than recent ones.</p>`+tblx(['You look at','It tells you'],[['Where the candle closed','Whether price was rejected or pushed through'],['The size of the body','How strongly one side pushed'],['The volume bar under it','Whether more trading happened than usual'],['The 4 opens','Which side of the bigger picture price is on']])},
  {t:'The tap: holds or fails',h:`<p><b>Good:</b> a candle pokes into the zone and <b>closes back outside it</b>, with a wick into the zone, often on a jump in volume. The zone is defending itself.</p><p><b>Warning:</b> a big candle <b>closes beyond the far edge</b> of the zone. The zone is failing. Skip it.</p>`+OFV.lab('btap')},
  {t:'The break: close, not wick',h:`<p>LUMEN's break is a candle that <b>closes</b> beyond the last 8 candles' swing, away from the zone. A wick through the level is not a break. A good break candle has a <b>solid body</b> (not mostly wick) and a volume bar bigger than the ones before it.</p>`+OFV.lab('bbrk')},
  {t:'The zone, and where it comes from',h:`<p>A LUMEN zone is the last opposite candle before a strong move. That strong move is the shaded area below: big candles all one way. When price comes back to the zone, you check the tap with the candles, as above.</p>`+OFV.lab('bfvg','zone')},
  {t:'What you cannot see',h:bNote+`<p>Because you cannot see who is trading, use the chart evidence more strictly: if the tap or the break looks unclear, <b>skip it</b>. A skipped trade costs nothing.</p>`}],
 recall:rc('LUMEN in Plain Words','How many of the 4 opens must agree?',['At least 3','All 4 always','1','None'],'The default is 3 of 4.'),
 steps:[['<b>The tap.</b>',OFV.lab('btap')],['<b>The break.</b>',OFV.lab('bbrk')],['<b>The zone.</b>',OFV.lab('bfvg','zone')]],
 gens:[orderQ,opensQ,stopTarget],
 bank:BANKS('LUMEN on TradingView',[
  ['At a tap, a candle pokes into the zone and closes back outside it. What does that say?',['The zone is defending itself: a good tap','The zone failed','Nothing','Sell'],'A close back outside shows price was rejected.'],
  ['A big candle closes beyond the far edge of the zone. What do you do?',['Skip: the zone is failing','Buy anyway','Add size','Move the stop'],'The zone did not hold.'],
  ['What counts as a LUMEN break?',['A candle that closes beyond the last 8 candles\' swing, away from the zone','Any wick through the level','Any big candle','The open'],'The close matters.'],
  ['Price wicks through a level and the candle closes back inside. Is it a break?',['No: a wick is not a break','Yes','Only at night','Only on high volume'],'A touch is not a break.'],
  ['What makes a good break candle on TradingView?',['A solid body and a volume bar bigger than the recent ones','A long wick','A tiny body','A gap'],'Strong push, more trading.'],
  ['What is a LUMEN zone?',['The last opposite candle before a strong move','Any support line','A moving average','The daily high'],'It marks where the strong move started.'],
  ['What can you NOT see on TradingView alone?',['Who is buying and selling','The price','The candle size','The volume bar'],'That is what orderflow software shows.'],
  ['The tap or the break looks unclear. What do you do?',['Skip it','Take it anyway','Double the size','Move the stop'],'A skipped trade costs nothing.'],
  ['How many of the 4 opens must agree by default?',['At least 3','All 4','1','None'],'3 of 4.'],
  ['What is the LUMEN entry once all three steps line up?',['The next 1-minute open','A limit at the zone','Any time','The close of the day'],'Then a fixed stop and a target.']]),
 examDesc:'Reading the tap and the break from candles and volume bars, and when to skip.'});
quick({id:'bl2',o:15.77,ph:0,bonly:1,t:'Your LUMEN Day on TradingView: Size, Checklist and Routine',out:'Turn a stop into contracts, run a chart-only checklist, and run a LUMEN day.',
 ls:['Size from the stop','The chart checklist','Why trades lose','A daily routine'],
 task:'Write down the most you would risk on one LUMEN trade. For a 30-point stop, work out how many MNQ contracts that is. If the answer is zero, write "skip".',
 learn:[
  {t:'Size from the stop',h:key('<p>Decide your size from the stop, not from how good the trade looks.</p>','In plain words')+`<p>LUMEN's stops are fixed by the model (for example 30 points for the core model). One MNQ point is $2. Use the sliders to see what you can trade.</p>`+OFV.calc()},
  {t:'The chart checklist',h:tblx(['Check','Green','Yellow or red'],[['The tap','A candle closed back outside the zone','A big candle closed beyond the far edge: skip'],['The break','A closed candle with a solid body and bigger volume','A wick only, or a weak body: wait or skip'],['The opens','3 of 4 agree','Fewer agree: skip'],['The bigger picture','Price has room before the next obvious level','A level is right in front of you: half size or skip']])+`<ul><li><b>All green:</b> take your planned size.</li><li><b>One yellow:</b> half size, or wait one candle.</li><li><b>Red:</b> skip.</li><li>Never size up because the chart looks great.</li></ul>`},
  {t:'Why trades lose',h:tblx(['What happened','What to do'],[['Stopped out right after a zone tap','Normal. Most trades are stopped. Keep risk small'],['Several losses in a row','Expected. Do not increase size to win it back'],['Too many trades open together','Keep to the maximum open trades'],['Entered late, after price ran','Skip late entries']])+warn('<p>LUMEN is a decision aid, not a promise of profit. Losing streaks are normal. Trade only money you can afford to lose.</p>')},
  {t:'A daily routine',h:`<ol><li><b>Before the session:</b> check the day's news and the 1-hour, 4-hour, day and week opens.</li><li>Check your alert is active. TradingView alerts expire: re-create it when needed.</li><li><b>When a message arrives:</b> read the chart checklist, decide.</li><li><b>After the session:</b> write down each trade, its model tag, and how it ended. Review weekly.</li></ol>`}],
 recall:rc('Reading the Tap and the Break on TradingView','What do you do when the tap or the break looks unclear?',['Skip it','Take it anyway','Double size','Move the stop'],'A skipped trade costs nothing.'),
 steps:[['<b>Size from the stop.</b>',OFV.calc()],['<b>The checklist.</b>',tblx(['Result','Action'],[['All green','Planned size'],['One yellow','Half size'],['Red','Skip']])],['<b>The routine.</b>',`<p>Opens and news first, alert on, read the checklist, act or skip, log.</p>`]],
 gens:[contracts,stopTarget,orderQ],
 bank:BANKS('Your LUMEN day on TradingView',[
  ['How much is one point on MNQ?',['$2','$20','$0.50','$5'],'NQ is $20.'],
  ['How do you work out contracts?',['The most you will lose ÷ (stop in points × $2)','The account size ÷ 100','Always 1','Whatever looks good'],'Round down.'],
  ['What do you do if even one MNQ risks too much?',['Skip the trade','Trade it anyway','Move the stop','Add a contract'],'Never size past your risk.'],
  ['All checks green. What size?',['Your planned size, never more','Double','Half','Skip'],'Never size up because it looks great.'],
  ['One check is yellow. What do you do?',['Half size, or wait one candle','Double size','Move the stop','Ignore it'],'Slow down.'],
  ['A check is red. What do you do?',['Skip','Take it anyway','Add size','Move the stop'],'Red means skip.'],
  ['Several losses in a row. What do you do?',['Do not increase size to win it back','Double size','Move the stop','Stop journalling'],'Losing streaks are normal.'],
  ['Why do TradingView alerts need checking?',['They can expire','They are always on','They cost money','They show profit'],'Re-create them when needed.'],
  ['What do you do after the session?',['Write down each trade and review weekly','Nothing','Delete the chart','Add size'],'Build your own record.'],
  ['What do you do with a late entry after price has already run?',['Skip it','Chase it','Add size','Move the stop'],'Late entries cost more than they give.']]),
 examDesc:'Turning a stop into contracts, the chart checklist, why trades lose and the daily routine.'});

})();
