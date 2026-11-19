/* ============================================================
   ECHO x ORBIT, from the Echo x Orbit A-to-Z guide: two strategies (Echo: the rejection block, Orbit: the 3-minute OTE), one routine, and how to read the order flow
   with both. Five modules built around the order-flow reads. Both give a limit order with a stop and a target. Rules and reading only: no results, win rates or statistics.
============================================================ */
(()=>{
/* which path the student is on decides how the shared lessons read */
const BP=window.LEARN_PATH==='basic';
const pathBanner=BP?`<div class="callout key"><span class="hud">Your path: Basic Path</span><p>You trade this strategy on <b>TradingView only</b>: the candles, the volume bars and the indicator. It is easier to follow and quicker to learn than the Orderflow Path, and not as precise, because you read what price did, not who was trading.</p></div>`:`<div class="callout key"><span class="hud">Your path: Orderflow Path</span><p>You trade this strategy with an <b>orderflow platform</b> such as ATAS, DeepCharts or Bookmap beside TradingView, so you can see who is buying and selling. It is the more precise and accurate way, and it is more intricate.</p></div>`;
/* ---------- generators ---------- */
const echoContracts=numGen('Contracts',r=>{const risk=pick(r,[100,200,300,400]),st=pick(r,[10,15]),n=Math.floor(risk/(st*2));
  return{q:`An Echo limit has a ${st}-point stop. The most you will lose is $${risk}. MNQ is $2 a point. How many MNQ contracts, rounded down?`,ans:n,unit:'',tol:.01,why:`$${risk} ÷ (${st} × $2) = ${(risk/(st*2)).toFixed(2)}, rounded down: ${n}.`}});
const echoNums=numGen('Stop and target',r=>{const k=pick(r,[['Model 1 (sweep)',15,40],['Model 2 (CISD retest)',15,40],['Model 3 (1-minute continuation)',10,30]]),w=pick(r,['stop','target']);
  return{q:`Echo ${k[0]} uses a ${k[1]}-point stop and a ${k[2]}-point target by default. How many points is the ${w}?`,ans:w==='stop'?k[1]:k[2],unit:'pts',tol:.01,why:`${k[0]}: stop ${k[1]} points, target ${k[2]} points.`}});
const oteEntry=numGen('The internal OTE',r=>{const R=pick(r,[28,34,40,46,52,60]),lo=pick(r,[21210,24480,27930,29180]),hi=lo+R,e=Math.round((lo+.705*R)*4)/4,risk=Math.round((hi-e)*100)/100;
  return{q:`On a short, the internal 3-minute range runs from the inversion high ${fm(hi,2)} (the 1 level) down to ${fm(lo,2)} (the 0 level). Your entry is a limit sell at the 0.705 of that range, measured up from the 0. What price is the limit? (Round to the nearest 0.25.)`,ans:e,unit:'',tol:.13,why:`The range is ${R} points. 0.705 × ${R} = ${(.705*R).toFixed(2)}, so the limit is ${fm(lo,2)} + ${(.705*R).toFixed(2)} ≈ ${fm(e,2)}. The stop is the inversion high ${fm(hi,2)}, so the risk is about ${risk} points.`}});
const orbitRisk=r=>{const R=pick(r,[30,40,48,52,60,70]),risk=Math.round(R*.295*100)/100,ok=risk<=15;
  return mcq('ORBIT risk',`The internal range is ${R} points, so the distance from the limit to the inversion high (your stop) is about ${risk} points. ORBIT\'s maximum risk is 15 points. What do you do?`,[ok?'Take it: the risk fits':'No trade: the risk is over 15 points',ok?'No trade: it is too small':'Take it with a wider stop','Move the stop closer to make it fit','Take it at double size'],`${R} × 0.295 ≈ ${risk}. ${ok?'That is within 15 points.':'Over 15 points means no trade, and the stop is never moved closer to make it fit.'}`)};
const stageQ=r=>{const k=pick(r,[
 ['WATCHING','Something happened and nothing is to be done yet: get ready','Place your limit now','Close your trade','Move your stop'],
 ['LIMIT','Here is the price for your limit, your stop and your target: place the limit once a candle in your direction has formed','Enter at market','Ignore it','Cancel everything'],
 ['FILLED','Your limit would have filled: the trade is on, the stop and target are fixed','Add a second limit','Move the stop to break-even at once','Cancel it'],
 ['NO LONGER WATCHING','Cancel any unfilled limit and wait for the next setup','Keep the limit anyway','Double the size','Move the stop']]);
  return mcq('The four messages',`You receive a "${k[0]}" message. What does it mean?`,[k[1],k[2],k[3],k[4]],'Watching, limit, filled, no longer watching: four stages. A limit that never fills is a trade you did not take, not a loss.')};
const stageOrder=()=>({kind:'order',topic:'The four messages',q:'Put the four messages in the order they arrive.',steps:['WATCHING: something happened, nothing to do yet','LIMIT: the price for your limit, your stop and your target','FILLED: price reached your limit','NO LONGER WATCHING, with a reason: cancel any unfilled limit'],why:'Watching, then the limit, then filled, and a no-longer-watching message cancels what is left.'});
const orbitOrder=()=>({kind:'order',topic:'ORBIT\'s order of events',q:'Put ORBIT\'s order of events in order.',steps:['A big move off a high, then a retrace up into the area of interest (the tap)','A 5-minute bullish gap is closed through to the downside (the inversion)','A smaller internal 3-minute range is drawn from the inversion high','A limit sell at the internal 0.705, with the stop at the inversion high'],why:'Tap, inversion, internal range, limit. If the order changes there is no trade.'});
const echoRead=ofSceneQ('Reading the wick',['e_failed','e_absorb','e_notrej','e_div'],'Echo\'s limit sits at the middle of a rejection wick. Read the footprint of the candles around the sweep.','read');
const echoAct=ofSceneQ('Echo: keep or cancel',['e_failed','e_absorb','e_notrej','e_div'],'Echo has marked a limit at the middle of a wick. You read the footprint around the sweep. What do you do?','trade');
const limitQ=ofSceneQ('Your limit order',['l_slow','l_surge'],'Price is coming back to your limit order. What do you do?','limit');
const tapQ=ofSceneQ('ORBIT: the tap',['o_tap','o_through'],'ORBIT is WATCHING: price has tapped the 0.705 of the big range and you are looking for shorts. What does the flow say?','trade');
const invQ=ofSceneQ('ORBIT: the inversion',['o_inv','o_invweak'],'A 5-minute gap has just been closed through (the inversion). What does the flow say?','trade');
const mixQ=ofSceneQ('Green, yellow, red',['e_failed','e_notrej','e_absorb','o_tap','o_through','o_inv','o_invweak'],'Echo or Orbit has marked a setup and you check the flow. What do you do?','trade');
const togetherQ=r=>{const k=pick(r,[
 ['Echo and Orbit give limits in opposite directions at the same time. What do you do?','Take one idea at a time: pick the one that matches your plan for the day, or skip','Take both','Take the bigger one','Take neither and add size later'],
 ['Price runs away from your limit without filling. What do you do?','Cancel it: a limit that never fills is a trade you did not take','Chase it at market','Move the limit','Double the size'],
 ['Big news is about to come out. What do you do?','Stay out: spreads and spikes break limit-order setups','Place bigger limits','Trade the spike','Ignore the calendar']]);
  return mcq('Using them together',k[0],[k[1],k[2],k[3],k[4]],'Take one idea at a time, a limit is a request not a command, and stay out around big news.')};
const neverQ=r=>{const k=pick(r,[
 ['Can order flow make you take a trade the indicator did not mark?','Never: it can only make you skip, cancel or take half size','Yes, when it looks great','Yes, on a quiet day','Yes, once a week'],
 ['Can order flow move your stop?','Never','Yes, if the flow turns red','Yes, if it is yellow','Yes, at the open'],
 ['Can order flow add a partial or change the 40-point or draw target?','Never','Yes, if it is green','Yes, if it is yellow','Yes, on news days'],
 ['You cannot read the footprint calmly in the time you have. What do you do?','Ignore it: follow the indicator at your normal size, or skip the trade','Guess','Double size','Skip your stop']]);
  return mcq('The rules that never change',k[0],[k[1],k[2],k[3],k[4]],'Order flow can make you skip, cancel or take half size. It never makes you take a trade the indicator did not mark, never moves a stop, never adds a partial and never changes the target. A missed trade costs nothing.')};
/* ---------- e01 · two strategies, one flow of messages ---------- */
quick({id:'e01',o:20.1,ph:0,t:'Two Strategies, One Flow of Messages',out:'Say what Echo and Orbit look for, and what each of the four messages means.',
 ls:['Echo in plain words','Orbit in plain words','The four messages','The candle rule','What a limit order is'],
 task:'Write one line on Echo and one line on Orbit in your own words. Then write the four messages in the order they arrive and what you do at each.',
 learn:[
  {t:'Echo in plain words',h:pathBanner+key('<p>Echo trades a wick: price pokes past an obvious high or low, cannot stay there, and leaves a long wick.</p>','In plain words')+`<p>Price often pokes just past an obvious high or low to grab the orders sitting there, then fails to stay beyond it. That failed poke leaves a long wick (a <b>rejection block</b>). Echo marks where to place a <b>limit order at the middle of that wick</b>, with a small stop just beyond the poke, aiming for the next place price is being pulled to.</p>`+OFV.echoOrbit()},
  {t:'Orbit in plain words',h:`<p>Orbit looks at the 3-minute chart for a drop (or a rise), a <b>retrace</b> back into an area of interest, a 5-minute gap that gets closed through (an <b>inversion</b>, a sign the retrace failed), and then a <b>limit order at a smaller retrace</b>. The order of events is always: <b>tap, inversion, internal range, limit</b>. If the order changes, there is no trade.</p>`},
  {t:'The four messages',h:`<p>They are two separate strategies with two separate indicators, but both give you a limit order with a stop and a target, and both send the same four staged messages.</p>`+tblx(['Message','Meaning','What you do'],[['WATCHING','Something happened. Nothing to do yet','Get ready'],['LIMIT','The price for your limit, your stop and your target','Place the limit once a candle in your direction has formed'],['FILLED','Price reached your limit','Leave it alone: the stop and target are fixed'],['NO LONGER WATCHING','The setup ended, with a reason','Cancel any unfilled limit']])+`<p>A limit that never fills is <b>not a loss</b>. It is a trade you did not take.</p>`},
  {t:'The candle rule',h:`<p>Place your limit once a candle <b>in your direction</b> has formed: a bearish candle for a short, a bullish candle for a long. Do not place it during a run of candles going against you. ${BP?'The Basic Path lessons that follow show you how to read the setup on TradingView.':'This is the moment you do your order-flow check, which is what the rest of this course teaches.'}</p>`},
  {t:'What a limit order is',h:key('<p>A limit order is a request, not a command: "buy or sell only at this price or better". If price never reaches it, nothing happens.</p>')}],
 recall:rc('Orderflow: Putting Flow Beside the Strategies','What can flow do?',['Make you skip, cancel or take half size','Give a trigger','Move your stop','Change your target'],'It never replaces the rules.'),
 steps:[['<b>Echo.</b>',OFV.echoOrbit()],['<b>The four messages.</b>',tblx(['1','2','3','4'],[['WATCHING','LIMIT','FILLED','NO LONGER WATCHING']])],['<b>The candle rule.</b>',`<p>Bearish candle for a short, bullish candle for a long, before you place the limit.</p>`]],
 gens:[stageQ,stageOrder,echoContracts,echoNums],
 bank:BANKS('Echo and Orbit',[
  ['What does Echo look for?',['A rejection wick: price pokes past a high or low and fails to stay','A news spike','A zone tap','A gap only'],'A failed poke.'],
  ['Where does Echo place its limit?',['At the middle of the wick','At the high','At the open','At market'],'The midpoint.'],
  ['What does Orbit look for?',['A retrace into an area, a 5-minute inversion, then a limit at a smaller retrace','A news spike','A wick only','A zone tap'],'Tap, inversion, internal range, limit.'],
  ['What is an inversion?',['A 5-minute candle closes through a fresh gap, so the retrace has failed','A new high','A news candle','A zone tap'],'It tells you the retrace failed.'],
  ['What does a WATCHING message mean?',['Something happened: nothing to do yet','Place your limit','The trade is over','Move the stop'],'Get ready.'],
  ['What does a LIMIT message give you?',['The price for your limit, your stop and your target','A market entry','A target only','Nothing'],'Place the limit.'],
  ['Is a limit that never fills a loss?',['No: it is a trade you did not take','Yes','Yes, a small one','Only on news days'],'A missed trade costs nothing.'],
  ['What does NO LONGER WATCHING mean?',['Cancel any unfilled limit','Keep waiting','Add size','Move the stop'],'The setup ended.'],
  ['What is the candle rule?',['Place the limit once a candle in your direction has formed','Place it at once','Place it during a counter run','Never place it'],'Bearish for shorts, bullish for longs.'],
  ['What is a limit order?',['A request to trade only at a price or better','An order that fills right now','A stop','A news order'],'It may never fill.'],
  ['Do Echo and Orbit use the same four messages?',['Yes','No, only Echo','No, only Orbit','Neither'],'The same pattern.']]),
 examDesc:'What Echo and Orbit look for, the four messages, the candle rule and limit orders.'});
/* ---------- e02 · Echo: is the rejection real ---------- */
quick({id:'e02',o:20.2,ph:0,t:'Echo: Is the Rejection Real?',out:'Read the flow around a rejection wick and decide whether to keep the limit.',
 ls:['The question order flow answers','The gap and the thin spot','Green: a real rejection','Red: not rejected yet'],
 task:'Find a rejection wick on a footprint chart. Write down: was there heavy aggressive volume into the level? Did the delta flip when price came back inside? Did the next candles hold beyond the wick?',
 learn:[
  {t:'The question order flow answers',h:key('<p>Echo\'s limit sits at the middle of a wick. Order flow answers one question: is this rejection real?</p>','In plain words')+`<p>Read the candle of the wick, and the candles around the sweep. A <b>failed auction</b> is when price pushed past a level, could not stay, and the buyers (for a high) or sellers (for a low) who pushed it got trapped.</p>`},
  {t:'The gap and the thin spot',h:`<p>A fair value gap (FVG) is where one side was far more aggressive: the candles did not trade evenly. Profile the leg that made it and you will find the thin spot inside it. That is why a rejection block sitting in a clear gap is a stronger picture than one with no gap behind it.</p>`+key('<p>The gap, the thin spot and a rejection all describe the same thing: one side was in charge there.</p>','In plain words')+OFV.lab('lvn','fvg')},
  {t:'Green: a real rejection',h:tblx(['What you see','Reading','Action'],[['Heavy aggressive volume into the level, then delta flipped and price came back inside the range','A failed auction: the buyers got trapped','Green: keep the limit'],['Volume at the extreme of the wick is large, but price made no progress','Absorption: the level is being defended','Green'],['CVD diverges at the sweep extreme: price makes a new high, CVD does not','Fewer aggressive buyers pushed the high','Green']])+OFV.scene('e_failed')+OFV.scene('e_absorb')+OFV.scene('e_div')},
  {t:'Red: not rejected yet',h:`<p>Delta keeps pushing in the sweep direction after the wick, stacked imbalances continue, and the next candles hold beyond the wick. The sweep is <b>not rejected yet</b>. <b>Cancel the limit or skip.</b></p>`+OFV.scene('e_notrej')}],
 recall:rc('Two Strategies, One Flow of Messages','Is a limit that never fills a loss?',['No: it is a trade you did not take','Yes','Yes, a small one','Only on news days'],'A missed trade costs nothing.'),
 steps:[['<b>A real rejection.</b>',OFV.scene('e_failed')],['<b>Absorption.</b>',OFV.scene('e_absorb')],['<b>Not rejected yet.</b>',OFV.scene('e_notrej')]],
 gens:[echoAct,echoAct,echoRead,echoRead],
 bank:BANKS('Is the rejection real',[
  ['What is a fair value gap in flow terms?',['A place where one side was far more aggressive','A random gap','A news level','A level that always holds'],'The thin spot inside it shows the same thing.'],

  ['What question does order flow answer for Echo?',['Is the rejection real?','What is the news?','Where is the stop?','Which day is it?'],'That is the check.'],
  ['What is a failed auction?',['Price pushed past a level but could not stay, so the pushers were trapped','A news spike','A gap','A trend'],'A real rejection.'],
  ['Heavy volume into the level, then delta flipped and price came back inside. What colour?',['Green: keep the limit','Red','Yellow','None'],'The buyers got trapped.'],
  ['Large volume at the wick extreme but no progress. What is it?',['Absorption: the level is being defended','A breakout','A gap','A news spike'],'Green.'],
  ['Price makes a new high but CVD does not. What is it?',['Divergence: fewer aggressive buyers','Buyers in control','A gap','A news candle'],'Green.'],
  ['Delta keeps pushing in the sweep direction and the next candles hold beyond the wick. What colour?',['Red: cancel or skip','Green','Yellow','None'],'Not rejected yet.'],
  ['What do you do on red?',['Cancel the limit or skip','Keep it','Add size','Move the stop'],'Never size up.'],
  ['Does the flow place the limit for you?',['No: Echo marks it','Yes','Sometimes','Only at night'],'The indicator marks the setup.'],
  ['Can you take a wick Echo did not mark because the footprint looks good?',['Never','Yes','Yes if green','Yes at night'],'It never makes you take an unmarked trade.'],
  ['What does stacked buy imbalances continuing after a high-sweep mean?',['The sweep is not rejected yet','A real rejection','A gap','Nothing'],'Red.'],
  ['What do you check first?',['The candle of the wick and the candles around the sweep','The news','The weather','Your broker'],'Read the sweep.']]),
 examDesc:'Reading a rejection wick in the flow: failed auction, absorption, divergence, and not rejected yet.'});
/* ---------- e03 · when price returns to your limit ---------- */
quick({id:'e03',o:20.3,ph:0,t:'When Price Returns to Your Limit',out:'Tell a slow, fading return from a fast, heavy one, and cancel when you should.',
 ls:['Slow and fading','Fast, heavy and one-sided','Watch the return yourself','Cancelling is allowed'],
 task:'Watch price come back to a limit level on a footprint chart. Write down: was the volume thin or heavy? Was the delta fading or surging toward your stop?',
 learn:[
  {t:'Slow and fading',h:key('<p>If price drifts back to your limit quietly, with fading volume, the level is probably holding.</p>','In plain words')+`<p>When price comes back to your limit, how it arrives matters. If it arrives <b>slowly with fading volume</b>, and the delta is fading against your trade, <b>leave the limit in</b>.</p>`+OFV.scene('l_slow')},
  {t:'Fast, heavy and one-sided',h:`<p>If price arrives with a <b>fast, heavy, one-sided surge</b> (large delta and stacked imbalances in the direction that would take your stop), that is the market telling you the level may fail.</p>`+OFV.scene('l_surge')},
  {t:'Watch the return yourself',h:`<p>You have a limit order waiting. How price <b>arrives</b> tells you whether to leave it. Switch between the two cases below and watch the candles, the volume and the delta bars.</p>`+key('<p>Slow and fading: leave it. Fast, heavy and stacked against you: cancelling is allowed.</p>','In plain words')+OFV.lab('ret')},
  {t:'Cancelling is allowed',h:`<p><b>Cancelling the limit is allowed.</b> A limit that never fills is not a loss. Order flow can make you cancel, but it never moves your stop or changes the target.</p>`}],
 recall:rc('Echo: Is the Rejection Real?','What do you do on red?',['Cancel the limit or skip','Keep it','Add size','Move the stop'],'Never size up.'),
 steps:[['<b>Slow.</b>',OFV.scene('l_slow')],['<b>Surge.</b>',OFV.scene('l_surge')],['<b>Cancel.</b>',`<p>Cancelling is allowed. A missed trade costs nothing.</p>`]],
 gens:[limitQ,limitQ,echoAct,neverQ],
 bank:BANKS('Returning to the limit',[
  ['The return to your limit is slow with shrinking volume and delta. You...',['Leave the limit in','Cancel it','Move it lower','Double it'],'Little is pushing price down.'],
  ['The return is fast with volume climbing and delta stacked against you. You...',['Can cancel the limit','Must leave it in','Add more','Move the stop wider'],'Cancelling is allowed.'],

  ['Price drifts back to your limit slowly on fading volume. What do you do?',['Leave the limit in','Cancel it','Add size','Move the stop'],'The level is probably holding.'],
  ['Price rushes to your limit with large delta and stacked imbalances toward your stop. What do you do?',['Cancel the limit','Leave it','Add size','Move the stop'],'The level may fail.'],
  ['Is cancelling a limit allowed?',['Yes','No','Only on news days','Only at night'],'It is allowed.'],
  ['Does the limit that never fills cost anything?',['No','A fee','A loss','Your stop'],'A missed trade costs nothing.'],
  ['What does a fast, heavy, one-sided surge tell you?',['The level may fail','The level holds','Nothing','A gap'],'Red.'],
  ['Can the flow move your stop?',['Never','Yes if red','Yes if green','Yes at night'],'The stop is fixed.'],
  ['What does fading delta against your trade mean?',['The return is losing energy','The return is strong','Nothing','A gap'],'Green.'],
  ['What do you do if you cannot read the footprint calmly in time?',['Ignore it: follow the indicator at normal size, or skip','Guess','Double size','Move the stop'],'A missed trade costs nothing.'],
  ['What is the green return like?',['Slow, fading volume','Fast and heavy','Gap','News'],'Thin and quiet.'],
  ['What is the red return like?',['Fast, heavy, one-sided','Slow','Thin','Gap'],'The market is telling you it may fail.'],
  ['Order flow can make you…',['Skip, cancel or take half size','Take unmarked trades','Move the stop','Change the target'],'Never more than that.']]),
 examDesc:'How price arrives at your limit: slow and fading versus fast and heavy, and cancelling.'});
/* ---------- e04 · Orbit ---------- */
quick({id:'e04',o:20.4,ph:0,t:'Orbit: The Tap, the Inversion and the Limit',out:'Read the flow at each of Orbit\'s three moments, and work out the limit and the risk.',
 ls:['Orbit\'s order of events','The tap','The inversion','When the inversion traps traders','Your limit at the small 0.705','The numbers'],
 task:'Take any short setup from Orbit (or invent one). Write the order of events, the internal range, your limit at the 0.705 of that range, and the risk to the inversion high. Is it 15 points or less?',
 learn:[
  {t:'Orbit\'s order of events',h:key('<p>Orbit always goes in the same order. If the order changes, there is no trade.</p>','In plain words')+`<ol><li><b>Tap:</b> price trades up into the 0.705 of a big range (the area of interest). No tap, no trade.</li><li><b>Inversion:</b> a 5-minute candle closes below the bottom of a fresh bullish gap. It tells you the retrace has failed.</li><li><b>Internal range:</b> a smaller 3-minute range from the inversion high down to the lowest-wick candle after it.</li><li><b>Limit:</b> a limit sell at its 0.705, stop at the inversion high, target 40 points. Maximum risk 15 points.</li></ol>`},
  {t:'The tap',h:`<p>Green: buyers (for shorts) push up into the 0.705 on <b>slowing volume</b>, delta fades, and there is absorption at the level. Yellow or red: the tap comes with <b>stacked buy imbalances</b> and price shoots through the top of the large range. The idea fails.</p>`+OFV.scene('o_tap')+OFV.scene('o_through')},
  {t:'The inversion',h:`<p>Green: the closing candle has <b>strong delta in the new direction</b> and clear volume, and the inversion high holds. Yellow or red: weak or opposite delta, or price is pushed straight back above the inversion high.</p>`+OFV.scene('o_inv')+OFV.scene('o_invweak')},
  {t:'When the inversion traps traders',h:`<p>The inversion works when traders who bought the first move get trapped. They have to get out, and their exits add to the move back. That is a squeeze: the forced exit of the people on the wrong side.</p>`+key('<p>The inversion is a failed move. The trapped traders are what gives the move back its speed.</p>','In plain words')+OFV.lab('sq')},
  {t:'Your limit at the small 0.705',h:`<p>Green: price returns on <b>thin volume</b> with the delta fading against the trade, and stalls. Red: it returns with a strong one-sided push toward the stop. <b>Cancel.</b></p>`+OFV.scene('l_slow')},
  {t:'The numbers',h:warn('<p>Your limit is at the 0.705 of the internal range, measured up from its 0. The stop is the inversion high with no buffer. If the risk from the limit to the inversion high is more than 15 points, there is <b>no trade</b>, and you never move the stop closer to make it fit. After you are in: nothing. No break-even, no partials.</p>','Orbit\'s numbers')}],
 recall:rc('Echo: Is the Rejection Real?','Can the flow place the limit for you?',['No: Echo marks it','Yes','Sometimes','Only at night'],'The indicator marks the setup.'),
 steps:[['<b>Order of events.</b>',tblx(['1','2','3','4'],[['Tap','Inversion','Internal range','Limit']])],['<b>The inversion.</b>',OFV.scene('o_inv')],['<b>The limit.</b>',OFV.scene('l_slow')]],
 gens:[orbitOrder,tapQ,invQ,oteEntry,orbitRisk],eb:5,
 bank:BANKS('Orbit',[
  ['Why can the move back after an inversion be fast?',['The trapped traders have to exit, adding to the move','It is random','News','Low volume only'],'Forced exits push price the way they did not want it to go.'],

  ['What is the first step in Orbit?',['The tap into the 0.705 of the big range','The inversion','The limit','The stop'],'No tap, no trade.'],
  ['What is an inversion?',['A 5-minute candle closing through a fresh gap, so the retrace has failed','A new high','A news candle','A tap'],'It tells you the retrace failed.'],
  ['Where is the stop?',['At the inversion high, no buffer','10 points away','At the open','At the 0.5'],'Fixed.'],
  ['What is the maximum risk?',['15 points','40 points','5 points','There is none'],'Over 15 means no trade.'],
  ['What is the take profit?',['40 points from the limit','15 points','100 points','There is none'],'Fixed.'],
  ['After you are in, what do you do?',['Nothing: no break-even, no partials, no moving the stop','Move the stop to break-even','Take a partial','Add size'],'The trade ends at the stop or the target.'],
  ['A healthy tap looks like…',['Buyers pushing up into it on slowing volume, delta fading, absorption','Stacked buy imbalances through the top','A gap','A news spike'],'Green.'],
  ['A strong inversion looks like…',['Strong delta in the new direction on clear volume, inversion high holds','Weak delta','Price back above the inversion high','A gap'],'Green.'],
  ['What do you do if the limit return is a strong one-sided push toward the stop?',['Cancel','Leave it','Add size','Move the stop'],'Red.'],
  ['Where do you measure the 0.705 from?',['From the 0 (the lowest point) up toward the 1','From the high down','From the open','From the close'],'For a short.'],
  ['Risk over 15 points. What do you do?',['No trade','Take it with a wider stop','Move the stop closer','Take half size'],'The stop never moves to make it fit.']]),
 examDesc:'Orbit\'s order of events, the flow at the tap, the inversion and the limit, and the numbers.'});
/* ---------- e05 · together and the rules ---------- */
quick({id:'e05',o:20.5,ph:0,t:'Using Them Together, and the Rules That Never Change',out:'Use Echo and Orbit together, run your day, and know what order flow never does.',
 ls:['Take one idea at a time','The lock: out of balance first','The rules that never change','Footprint settings to start with','Extra flow checks (second opinion)','The one to watch: the first 3 minutes','A daily routine'],
 task:'Write the five rules of this course on one card: one idea at a time, a limit is a request, size from the stop, stay out around news, and the rules that never change.',
 learn:[
  {t:'Take one idea at a time',h:key('<p>Echo and Orbit are two separate ideas. Take one at a time.</p>','In plain words')+tblx(['','Echo','Orbit'],[['Looks for','A wick that rejected a liquidity level','A retrace, a 5-minute gap closed through, then a small retrace'],['Order','Limit at the wick\'s midpoint','Limit at the 0.705 of a small 3-minute range'],['Stop','Just beyond the wick, small','At the inversion high, never more than 15 points'],['Target','The next draw on liquidity','40 points from the limit'],['Stop moves','None','None: no break-even, no partials']])+`<ul><li>If both give a limit in opposite directions, do not take both. Pick the one that matches your plan for the day, or skip.</li><li>A limit is a request, not a command. If price runs away without filling, cancel it.</li><li><b>Size from the stop:</b> contracts = the dollars you will lose ÷ (stop in points × $2 for MNQ), rounded down.</li><li>Stay out around big news: spreads and spikes break limit-order setups.</li></ul>`},
  {t:'The lock: out of balance first',h:`<p>Echo and Orbit work best when price is already moving out of balance. The bigger-picture trend check you use before an idea is how you know. Inside a balanced day, a rejection block has little room to run.</p>`+key('<p>Out of balance first. The trend check is how you know.</p>','In plain words')+OFV.lab('bal')},
  {t:'The rules that never change',h:`<ol><li>Order flow can make you <b>skip, cancel, or take half size</b>. It never makes you take a trade the indicator did not mark.</li><li>It never moves a stop, adds a partial, or changes the 40-point or draw-on-liquidity target.</li><li>If you cannot read the footprint calmly in the time you have, <b>ignore it</b> and follow the indicator at your normal size, or skip the trade. A missed trade costs nothing.</li></ol>`+OFV.scene('e_failed')},
  {t:'Footprint settings to start with',h:`<p>On a footprint platform (such as DeepCharts): a <b>1-minute footprint</b> with bid and ask volume and delta, an <b>imbalance ratio of about 300%</b>, a <b>cumulative delta panel reset at the 6 PM open</b>, and a daily or session volume profile.</p>`},
  {t:'Extra flow checks (second opinion)',h:FLOWX.words()+FLOWX.echo()},
  {t:'The one to watch: the first 3 minutes',h:FLOWX.watch()},
  {t:'A daily routine',h:`<ol><li>Open the 1-minute NQ chart with Echo and Orbit on.</li><li>Wait for WATCHING. It is not an entry. Read the reason.</li><li>Wait for the LIMIT message. Check the stop, the target and that the risk fits.</li><li>Place the limit once a candle in your direction has formed, then do the flow check.</li><li>If filled, leave it alone. If cancelled or expired, cancel the order and wait.</li><li>Name the cause of every loss. If you cannot, journal it until you can.</li></ol>`+warn('<p>These strategies are decision aids, not a promise of profit. A valid setup can still lose. Losing streaks are normal. Trade only money you can afford to lose.</p>')}],
 recall:rc('Orbit: The Tap, the Inversion and the Limit','Risk over 15 points. What do you do?',['No trade','Take it with a wider stop','Move the stop closer','Take half size'],'The stop never moves to make it fit.'),
 steps:[['<b>One at a time.</b>',`<p>Pick the idea that matches your plan, or skip.</p>`],['<b>The never list.</b>',`<p>No unmarked trades, no stop moves, no partials, no target changes.</p>`],['<b>A picture.</b>',OFV.scene('e_failed')]],
 gens:[togetherQ,neverQ,mixQ,mixQ],
 bank:BANKS('Together and the rules',[
  ['Echo and Orbit work best when price is...',['Already moving out of balance','Stuck in the middle of a range','Closed','Gapping every minute'],'A balanced day gives a rejection block little room.'],

  ['Echo and Orbit give limits in opposite directions. What do you do?',['Take one, or skip','Take both','Add size','Move the stop'],'One idea at a time.'],
  ['What is a limit?',['A request, not a command','An order that fills at once','A stop','A target'],'Cancel it if price runs away.'],
  ['How do you size?',['From the stop: dollars ÷ (stop × $2), rounded down','From a feeling','Always 1','Always max'],'MNQ is $2 a point.'],
  ['What do you do around big news?',['Stay out','Trade bigger','Ignore it','Add limits'],'Spreads and spikes break limit setups.'],
  ['Can order flow make you take an unmarked trade?',['Never','Yes','Yes if green','Yes at night'],'It can only reduce.'],
  ['Can order flow move your stop?',['Never','Yes','Yes if red','Yes at night'],'The stop is fixed.'],
  ['Can order flow add a partial?',['Never','Yes','Yes if green','Yes at night'],'No partials.'],
  ['What do you do if you cannot read the footprint calmly?',['Ignore it: follow the indicator or skip','Guess','Double size','Move the stop'],'A missed trade costs nothing.'],
  ['What do you do after a loss you cannot explain?',['Journal it until you can name the cause','Double size','Stop learning','Change every rule'],'Name the cause.'],
  ['What imbalance ratio do you start with?',['About 300%','10%','50%','1000%'],'A common starting setting.'],
  ['These strategies are…',['Decision aids, not a promise of profit','Guarantees','Free money','Always right'],'Losing streaks are normal.']]),
 examDesc:'Using Echo and Orbit together, the rules that never change, and the daily routine.'});
/* ===== BASIC PATH · ECHO x ORBIT on TradingView only. ===== */
const bNote=warn('<p>On the Basic Path you trade on TradingView only. The chart shows <b>what price did</b>, not <b>who was trading</b>. Orderflow software shows both, which is why the Orderflow Path is more precise. The Basic Path is easier to follow and quicker to learn, and the rules make up for what you cannot see.</p>','Be honest about what you can see');
quick({id:'be1',o:20.6,ph:0,bonly:1,t:'Echo on TradingView: Is the Rejection Clean?',out:'Read a rejection wick and the gap behind it from the candles alone, and know the stop and target for each Echo model.',
 ls:['The wick: poke and fail','The gap behind it','The limit, the stop and the target','What you cannot see'],
 task:'Find an obvious high or low that price poked past and failed to hold. Write where the candle closed and whether a gap (FVG) sits behind the wick.',
 learn:[
  {t:'The wick: poke and fail',h:key('<p>A clean rejection is a poke past an obvious level, a wick, and a close back inside.</p>','In plain words')+`<p>Price often pokes just past an obvious high or low to grab the orders sitting there, then fails to stay beyond it. The <b>close</b> tells you whether it failed: a close back inside means rejection. A close beyond the level means it did not fail yet. Echo marks the rejection block and your limit at the middle of the wick.</p>`+OFV.lab('bbrk')},
  {t:'The gap behind it',h:`<p>A <b>fair value gap (FVG)</b> is where the candles moved so fast that one side was clearly in charge. A rejection block sitting in a clear gap is a stronger picture than one with no gap behind it. You can see the gap on any TradingView chart.</p>`+OFV.lab('bfvg','fvg')},
  {t:'The limit, the stop and the target',h:tblx(['Model','Stop','Target'],[['Model 1 (sweep)','15 points','40 points'],['Model 2 (CISD retest)','15 points','40 points'],['Model 3 (1-minute continuation, off by default)','10 points','30 points']])+`<p>Place your limit order at the middle of the wick once a candle <b>in your direction</b> has formed (bearish for a short, bullish for a long). The four messages are WATCHING, LIMIT, FILLED and NO LONGER WATCHING. A limit that never fills is a trade you did not take, not a loss.</p>`},
  {t:'What you cannot see',h:bNote+`<p>Because you cannot see who is trading, be strict about the picture: if the close did not clearly come back inside, or the setup is unclear, <b>skip it</b>.</p>`}],
 recall:rc('Two Strategies, One Flow of Messages','Is a limit that never fills a loss?',['No: it is a trade you did not take','Yes','Yes, a small one','Only on news days'],'A missed trade costs nothing.'),
 steps:[['<b>The wick.</b>',OFV.lab('bbrk')],['<b>The gap.</b>',OFV.lab('bfvg','fvg')],['<b>The numbers.</b>',tblx(['Model','Stop','Target'],[['1','15','40'],['2','15','40'],['3','10','30']])]],
 gens:[stageQ,echoNums,echoContracts],
 bank:BANKS('Echo on TradingView',[
  ['What does a clean rejection look like?',['A poke past an obvious level, a wick, and a close back inside','A close beyond the level','A gap','A news spike'],'The close back inside is the key.'],
  ['Price closes beyond the level. Has it been rejected?',['Not yet','Yes','Always','Only at night'],'It did not fail yet.'],
  ['What is a fair value gap?',['A place where one side was clearly in charge and price moved fast','A random gap','A news level','A level that always holds'],'A stronger picture when a block sits in one.'],
  ['Where does Echo place the limit?',['At the middle of the rejection wick','At the high','At the open','At market'],'The middle of the wick.'],
  ['What is the stop for Echo Model 1?',['15 points','40 points','5 points','There is none'],'The indicator uses a fixed 15-point stop.'],
  ['What is the target for Echo Model 3 (1-minute continuation)?',['30 points','40 points','10 points','100 points'],'Model 3 is 30.'],
  ['When do you place your limit?',['Once a candle in your direction has formed','During a run against you','At market','Never'],'The candle rule.'],
  ['A limit never fills. What is it?',['A trade you did not take','A loss','A small loss','A mistake'],'It costs nothing.'],
  ['What can you NOT see on TradingView alone?',['Who is buying and selling','The wick','The gap','The close'],'That is what orderflow software shows.'],
  ['The setup is unclear. What do you do?',['Skip it','Take it anyway','Double size','Move the stop'],'A skipped trade costs nothing.']]),
 examDesc:'A clean rejection, the gap behind it, and the stop and target for each Echo model.'});
quick({id:'be2',o:20.7,ph:0,bonly:1,t:'The Return to Your Limit, on TradingView',out:'Tell a slow, fading return from a fast, heavy one using candles and volume bars, and cancel when you should.',
 ls:['Slow or fast?','The candle rule','Cancelling is allowed'],
 task:'Next time price comes back to a limit order, note the size of the candles and whether the volume bars are shrinking or climbing. Write what you did.',
 learn:[
  {t:'Slow or fast?',h:key('<p>Small candles and shrinking volume: leave it. Big candles and climbing volume: cancelling is allowed.</p>','In plain words')+`<p>You have a limit order waiting. How price <b>arrives</b> tells you whether to leave it. Switch between the two cases and watch the candles and the volume bars.</p>`+OFV.lab('bret')},
  {t:'The candle rule',h:`<p>Place your limit once a candle <b>in your direction</b> has formed: a bearish candle for a short, a bullish candle for a long. Do not place it during a run of candles going against you.</p>`},
  {t:'Cancelling is allowed',h:`<p>A limit order is a request, not a command. If price is coming back fast with big candles and rising volume, you can cancel it. If the indicator sends NO LONGER WATCHING, cancel any unfilled limit. A missed trade costs nothing.</p>`+warn('<p>Cancelling never means moving your stop or changing your target. Once you are filled, the stop and target are fixed.</p>','The rules that never change')}],
 recall:rc('Echo on TradingView: Is the Rejection Clean?','Where does Echo place the limit?',['At the middle of the rejection wick','At the high','At the open','At market'],'The middle of the wick.'),
 steps:[['<b>Slow or fast.</b>',OFV.lab('bret')],['<b>The candle rule.</b>',`<p>Bearish candle for a short, bullish candle for a long, before you place the limit.</p>`],['<b>Cancelling.</b>',`<p>Allowed. A missed trade costs nothing.</p>`]],
 gens:[stageOrder,echoContracts,togetherQ],
 bank:BANKS('Returning to the limit on TradingView',[
  ['The return is slow with small candles and shrinking volume. What do you do?',['Leave the limit in','Cancel it','Move it lower','Double it'],'Little is pushing price down.'],
  ['The return is fast with big candles and climbing volume. What do you do?',['You can cancel the limit','Must leave it in','Add more','Move the stop wider'],'Cancelling is allowed.'],
  ['When do you place your limit?',['Once a candle in your direction has formed','During a run against you','At market','Never'],'The candle rule.'],
  ['The indicator sends NO LONGER WATCHING. What do you do?',['Cancel any unfilled limit','Keep it','Add size','Move the stop'],'The setup ended.'],
  ['Once you are filled, can you move the stop?',['No: the stop and target are fixed','Yes','Yes at break-even','Yes if it looks bad'],'Fixed.'],
  ['A limit order is...',['A request, not a command','A guarantee','A market order','A stop'],'It only fills at your price or better.'],
  ['Price runs away from your limit without filling. What do you do?',['Cancel it: a limit that never fills is a trade you did not take','Chase it at market','Move the limit','Double the size'],'A missed trade costs nothing.'],
  ['Echo and Orbit give limits in opposite directions at the same time. What do you do?',['Take one idea at a time, or skip','Take both','Take the bigger one','Add size'],'One idea at a time.'],
  ['Big news is about to come out. What do you do?',['Stay out','Place bigger limits','Trade the spike','Ignore the calendar'],'Spreads and spikes break limit setups.'],
  ['What do the volume bars show on TradingView?',['How much traded in each candle','Who was buying','The stop','The target'],'They show amount, not who.']]),
 examDesc:'Telling a slow return from a fast one, the candle rule, and when to cancel.'});
quick({id:'be3',o:20.8,ph:0,bonly:1,t:'Orbit Step 3: The Internal Range and Your Limit',out:'Put the limit at the 0.705 of the internal range, check the risk is within 15 points, and know what to do after you are in.',
 ls:['Orbit\'s order of events','Find your 0.705','The numbers'],
 task:'On a 3-minute NQ chart, draw the internal range from the inversion high to the lowest point after it. Mark the 0.705 measured up from the 0 and write the limit price and the risk.',
 learn:[
  {t:'Orbit\'s order of events',h:key('<p>Orbit always goes in the same order. If the order changes, there is no trade.</p>','In plain words')+`<ol><li><b>Tap:</b> price trades up into the 0.705 of a big range (the area of interest). No tap, no trade.</li><li><b>Inversion:</b> a 5-minute candle closes below the bottom of a fresh bullish gap. It tells you the retrace has failed.</li><li><b>Internal range:</b> a smaller 3-minute range from the inversion high down to the lowest-wick candle after it.</li><li><b>Limit:</b> a limit sell at its 0.705, stop at the inversion high, target 40 points. Maximum risk 15 points.</li></ol>`},
  {t:'Find your 0.705',h:`<p>For a short, measure the 0.705 <b>up from the 0</b> (the lowest point) toward the 1 (the inversion high). Play the figure to the end, then click where your limit sell goes.</p>`+OFV.lab('bote')},
  {t:'The numbers',h:warn('<p>Your limit is at the 0.705 of the internal range. The stop is the inversion high with no buffer. If the risk from the limit to the inversion high is more than 15 points, there is <b>no trade</b>, and you never move the stop closer to make it fit. After you are in: nothing. No break-even, no partials.</p>','Orbit\'s numbers')+bNote}],
 recall:rc('The Return to Your Limit, on TradingView','What do you do when the return is fast with climbing volume?',['You can cancel the limit','Must leave it in','Add more','Move the stop'],'Cancelling is allowed.'),
 steps:[['<b>Order of events.</b>',tblx(['1','2','3','4'],[['Tap','Inversion','Internal range','Limit']])],['<b>The 0.705.</b>',OFV.lab('bote')],['<b>The numbers.</b>',`<p>Stop at the inversion high, target 40 points, risk 15 points at most, then nothing after you are in.</p>`]],
 gens:[orbitOrder,oteEntry,orbitRisk],eb:5,
 bank:BANKS('Orbit on TradingView',[
  ['What is the first step in Orbit?',['The tap into the 0.705 of the big range','The inversion','The limit','The stop'],'No tap, no trade.'],
  ['What is an inversion?',['A 5-minute candle closing through a fresh gap, so the retrace has failed','A new high','A news candle','A tap'],'It tells you the retrace failed.'],
  ['Where is the stop?',['At the inversion high, no buffer','10 points away','At the open','At the 0.5'],'Fixed.'],
  ['What is the maximum risk?',['15 points','40 points','5 points','There is none'],'Over 15 means no trade.'],
  ['What is the take profit?',['40 points from the limit','15 points','100 points','There is none'],'Fixed.'],
  ['After you are in, what do you do?',['Nothing: no break-even, no partials, no moving the stop','Move the stop to break-even','Take a partial','Add size'],'The trade ends at the stop or the target.'],
  ['Where do you measure the 0.705 from on a short?',['From the 0 (the lowest point) up toward the 1','From the high down','From the open','From the close'],'For a short.'],
  ['Risk over 15 points. What do you do?',['No trade','Take it with a wider stop','Move the stop closer','Take half size'],'The stop never moves to make it fit.'],
  ['What order do the steps come in?',['Tap, inversion, internal range, limit','Limit, tap, inversion, range','Inversion, tap, limit, range','Any order'],'If the order changes there is no trade.'],
  ['What can you NOT see on TradingView alone?',['Who is buying and selling','The range','The gap','The price'],'That is what orderflow software shows.']]),
 examDesc:'Orbit\'s order of events, finding the 0.705, and the numbers.'});

/* ===== BASIC PATH · ECHO x ORBIT, the rest of the course (TradingView only) ===== */
quick({id:'be4',o:20.9,ph:0,bonly:1,t:'Echo Step 1: Build the Narrative',out:'Mark the gaps, the key opens and the liquidity pools before the session, and pick your draw on liquidity.',
 ls:['No draw, no trade','Marking your chart','Premium and discount','Pick the draw'],
 task:'Before the next New York open, mark the unfilled 1-hour and 4-hour gaps, the midnight and 10 AM opens, and the previous day\'s high and low. Write your draw on liquidity and which way it points.',
 learn:[
  {t:'No draw, no trade',h:pathBanner+key('<p>Before any entry, you need to know where the trade pays. That place is called the draw on liquidity.</p>','In plain words')+`<p>The market keeps rebalancing. Price sweeps liquidity, rejects, and runs to the next pool. Your job is to mark where a rejection is most likely, get in at the most precise point, and be wrong small. <b>If there is no draw, there is no trade.</b></p>`},
  {t:'Marking your chart',h:tblx(['Mark','Why'],[['Unfilled 1-hour and 4-hour gaps','They are where price is likely headed: your draws'],['Key opens: midnight, 6 PM, 8 PM, 10 AM, and the new week gap','They act as targets and reaction points'],['Liquidity pools: equal highs and lows, session highs and lows, previous day high and low','They are where stops sit: price is drawn to them']])+`<p>The 10 AM open is only valid from 10 AM until the next day's 10 AM, and it is a New York morning level.</p>`},
  {t:'Premium and discount',h:`<p>Zoom out to the 1-hour and take the prominent high and low. <b>Below 50%</b> is discount: favour longs. <b>Above 50%</b> is premium: favour shorts. Within roughly 50 to 100 points of the prominent high or low you are <b>external</b>; deeper inside you are <b>internal</b>.</p><p>Never trade against your draw. If the draw is higher, only look for longs. If the draw has already been hit, that idea is done.</p>`},
  {t:'Pick the draw',h:`<p>Play the figure to the end. Price has climbed far above an unfilled gap and swept equal highs. You are looking for a short. Click your draw on liquidity.</p>`+OFV.lab('bnarr')}],
 recall:rc('Echo on TradingView: Is the Rejection Clean?','Where does Echo place the limit?',['At the middle of the rejection wick','At the high','At the open','At market'],'The middle of the wick.'),
 steps:[['<b>Mark the chart.</b>',tblx(['Gaps','Opens','Pools'],[['1H and 4H, unfilled','Midnight, 10 AM, 6 PM, 8 PM','Equal highs and lows, session highs and lows']])],['<b>Premium or discount.</b>',`<p>Above 50% of the range favours shorts; below favours longs.</p>`],['<b>The draw.</b>',OFV.lab('bnarr')]],
 gens:[stageQ,echoContracts,togetherQ],
 bank:BANKS('Echo: the narrative',[
  ['What is a draw on liquidity?',['The place the trade pays: an unfilled gap, a key open or an untaken high or low','Any support line','A moving average','The open'],'It is your target and your bias.'],
  ['There is no draw. What do you do?',['No trade','Take it smaller','Take it anyway','Add size'],'No draw, no trade.'],
  ['Which gaps are your narrative?',['Unfilled 1-hour and 4-hour gaps','Every 1-minute gap','Gaps from last month','Gaps already filled'],'They are where price is likely headed.'],
  ['The draw is above price. Which trades are you allowed?',['Only longs','Only shorts','Both','None'],'Never trade against your draw.'],
  ['The draw has already been hit. What do you do?',['The idea is done: do not take a new entry toward a target that is gone','Take another entry','Double size','Move the stop'],'The target is gone.'],
  ['Price is above 50% of the 1-hour range. Which side do you favour?',['Shorts: premium','Longs: discount','Neither','Both'],'Above 50% is premium.'],
  ['Which key open is only valid from 10 AM until the next day\'s 10 AM?',['The 10 AM open','The midnight open','The week open','The 6 PM open'],'A New York morning level.'],
  ['What are equal highs?',['A liquidity pool where stops sit','A gap','A news level','A moving average'],'Price is drawn to them.'],
  ['What does it mean to be external?',['Near the prominent high or low of the range','In the middle of the range','Outside the market','In the Asian session'],'Within roughly 50 to 100 points.'],
  ['How far away should the draw be?',['At least 2 times your stop','Right next to your entry','Anywhere','Exactly 10 points'],'It has to pay.']]),
 examDesc:'Building the narrative: gaps, opens, pools, premium and discount, and the draw.'});
quick({id:'be5',o:20.91,ph:0,bonly:1,t:'Echo Step 2: Delivery Out of a Gap',out:'Check that price has tapped a gap, key open or pool and failed to close through it before you trust a rejection.',
 ls:['The rule most people skip','Tapped, and failed to close through','Do not catch a falling knife','Your checklist before the limit'],
 task:'Find a rejection wick on a 5-minute chart. Write what higher-timeframe gap, key open or pool price had just tapped, and whether any candle closed through it.',
 learn:[
  {t:'The rule most people skip',h:pathBanner+key('<p>Before a rejection counts, price must first tap a higher-timeframe gap, a key open or a liquidity pool, and fail to close through it.</p>','In plain words')+`<p>This is called <b>delivery out of a PD array</b> (premium and discount reference: a gap, a rejection block or an order block). Without it, a wick that looks like a rejection often just gets blown through.</p>`},
  {t:'Tapped, and failed to close through',h:`<p>Switch between the two cases. The first shows price tapping a 1-hour gap and failing to close through it. The second shows a wick with nothing tapped.</p>`+OFV.lab('bdeliv')},
  {t:'Do not catch a falling knife',h:`<p>If price has not swept or tapped anything yet, <b>wait</b>. Let it tap the level, distribute out of it, then find the entry on the way out. Also, the draw has to be <b>at least 2 times your stop away</b>, and an unfilled higher-timeframe gap just beyond your level can run your stop first.</p>`},
  {t:'Your checklist before the limit',h:tblx(['Check','Must be true'],[['Delivery','Price tapped a gap, key open or pool and did not close through it'],['Higher-timeframe gap','The rejection sits in or out of a 1-hour or 4-hour gap (a 15-minute gap at least)'],['Draw','Still open, in the direction, at least 2 times the stop away'],['Level','Not closed through, and its middle (CE) not already played']])+warn('<p>If any box is unticked, there is no trade.</p>','Remember')}],
 recall:rc('Echo Step 1: Build the Narrative','There is no draw. What do you do?',['No trade','Take it smaller','Take it anyway','Add size'],'No draw, no trade.'),
 steps:[['<b>Delivery.</b>',OFV.lab('bdeliv')],['<b>The draw.</b>',`<p>At least 2 times your stop away.</p>`],['<b>The level.</b>',`<p>Not closed through, and not already played.</p>`]],
 gens:[stageOrder,echoNums,echoContracts],
 bank:BANKS('Echo: delivery out of a gap',[
  ['What must price do before a rejection counts?',['Tap a higher-timeframe gap, key open or pool and fail to close through it','Close above the high','Make a new low','Gap up'],'Delivery out of a PD array.'],
  ['Price has not tapped anything but shows a long wick. What do you do?',['Wait: do not catch a falling knife','Take it now','Double size','Place the limit anyway'],'A wick alone is not enough.'],
  ['How far away must the draw be?',['At least 2 times your stop','Right next to the entry','Exactly 10 points','It does not matter'],'It has to pay.'],
  ['An unfilled 4-hour gap sits just beyond your level. What can happen?',['Price taps it first and runs your stop','Nothing','The trade always wins','The gap disappears'],'Wait for the tap, or scale in so your stop sits inside the gap.'],
  ['The candle closes through the level. Is it still valid?',['No: a close through ends it','Yes','Only at night','Only on news'],'The level is dead.'],
  ['The middle (CE) of the level already played once. Do you take it again?',['No','Yes','Only twice','At double size'],'Do not re-take a level that already played.'],
  ['What is a PD array?',['A gap, rejection block or order block that price reacts from','A moving average','The daily open','A news release'],'A premium and discount reference.'],
  ['Which is the minimum gap behind a rejection?',['A 15-minute gap','No gap','A 1-minute gap','A weekly gap'],'A 1-hour or 4-hour gap is better.'],
  ['What do you do if any checklist box is unticked?',['No trade','Take half size','Take it anyway','Move the stop'],'Every box is required.'],
  ['What is the main danger of entering before delivery?',['Catching a falling knife','Nothing','Too much profit','The spread'],'Wait for the tap first.']]),
 examDesc:'Delivery out of a gap, the draw, and the checklist before the limit.'});
quick({id:'be6',o:20.92,ph:0,bonly:1,t:'CISD and the Rejection Retest',out:'Read a change in state of delivery, the retest, and what to do when there is no retest or a close back through.',
 ls:['What a CISD is','External and internal','The retest','No retest, or a close back through'],
 task:'On a 5-minute chart, find a bearish CISD (a candle closing below the open of the last up candle of a rally). Mark the level and write whether price retested it without closing through.',
 learn:[
  {t:'What a CISD is',h:pathBanner+key('<p>A CISD (change in state of delivery) is a candle that closes beyond the open of the last opposite candle of a leg. It signals a flip.</p>','In plain words')+`<p>A <b>bearish CISD</b> is a candle that closes <b>below the open</b> of the last up candle that drove the rally. A bullish CISD is the mirror. It can be found on any timeframe: 15-minute, 5-minute or 1-minute.</p>`},
  {t:'External and internal',h:`<p><b>External</b> means the CISD is measured from the candle that started the whole leg. <b>Internal</b> means it is measured from a lesser candle inside it. External is stronger. For a higher-timeframe CISD (15-minute), require a close of 15 minutes or more: 1-minute closes do not count.</p>`},
  {t:'The retest',h:`<p>A CISD with no retest is just a candle closing. You want price to come back, wick into the CISD level and <b>fail to close through it</b>. That wick is the rejection: your limit goes at its CE (middle). Switch between the three cases.</p>`+OFV.lab('bcisd')},
  {t:'No retest, or a close back through',h:tblx(['What happens','What you do'],[['Retest, no close through','Limit at the CE of the retest wick'],['No retest after about 10 to 15 candles','The CISD becomes liquidity: use the CE of the wick of the candle that caused the CISD'],['A candle closes back through the CISD level','Exit at once, wherever price is']])+warn('<p>The exit rule is a hard rule: a close through the CISD level ends the idea.</p>','Remember')}],
 recall:rc('Echo Step 2: Delivery Out of a Gap','What must price do before a rejection counts?',['Tap a higher-timeframe gap, key open or pool and fail to close through it','Close above the high','Make a new low','Gap up'],'Delivery out of a PD array.'),
 steps:[['<b>The CISD.</b>',OFV.lab('bcisd')],['<b>The retest.</b>',`<p>Wick into the level, no close through it.</p>`],['<b>The exit rule.</b>',`<p>A close back through the CISD level: exit.</p>`]],
 gens:[stageQ,echoNums,echoContracts],
 bank:BANKS('Echo: CISD and the retest',[
  ['What is a bearish CISD?',['A candle closing below the open of the last up candle of a rally','A candle closing above a high','A gap','A news spike'],'It signals a flip.'],
  ['Which is stronger, external or internal?',['External','Internal','Neither','Both the same'],'External is measured from where the whole leg started.'],
  ['Where does the limit go on a CISD retest?',['At the CE of the wick that retested it','At the CISD level','At the high','At market'],'The middle of the rejection wick.'],
  ['What makes a CISD a confirmed entry?',['Price retests it and fails to close through it','A single candle close','A news spike','A gap'],'A retest is required.'],
  ['No retest after 10 to 15 candles. What is the CISD now?',['Liquidity: use the wick of the candle that caused it','A sure entry','Dead for ever','A news level'],'Price often sweeps it first.'],
  ['A candle closes back through the CISD level. What do you do?',['Exit at once','Hold','Add size','Move the stop wider'],'A hard rule.'],
  ['Do 1-minute closes count for a 15-minute CISD?',['No: a 15-minute CISD needs a 15-minute close at least','Yes','Only at night','Always'],'Use the same timeframe.'],
  ['Can a CISD be found on a 5-minute chart?',['Yes: on any timeframe','No: only daily','Only on 1-hour','Only on weekends'],'Keep it fractal.'],
  ['What is the stop on a CISD retest trade?',['15 points by default','5 points','50 points','None'],'The indicator uses 15.'],
  ['The CISD must point toward what?',['Your draw on liquidity','The open','The previous low','A news level'],'Never against the draw.']]),
 examDesc:'Reading a CISD, the retest, the unretested CISD and the exit rule.'});
quick({id:'be7',o:20.93,ph:0,bonly:1,t:'Grading a Setup: A, A+ and A++',out:'Grade a rejection from the gap behind it, know the confluences that add weight, and recognise the automatic no-trades.',
 ls:['The three grades','Confluences that add weight','Automatic no-trades','Grade it yourself'],
 task:'Find three rejection wicks on a 15-minute chart. For each, write which gap it overlaps (15-minute, 1-hour, 4-hour), how close the entry is to that gap\'s CE, and the grade.',
 learn:[
  {t:'The three grades',h:pathBanner+tblx(['Grade','What it means'],[['A','The rejection wick overlaps a 15-minute gap'],['A+','The wick overlaps a 1-hour or 4-hour gap'],['A++','An A+ with the entry within about 4 points of that gap\'s middle (CE)']])+`<p>The indicator shows <b>A+ and higher</b> by default, because 15-minute-only gaps are lower quality. Below a good grade, the setup is not worth the risk.</p>`},
  {t:'Confluences that add weight',h:`<p>A confluence is a reason, not a strategy. Stack them at one level.</p>`+tblx(['Confluence','What it is'],[['SMT divergence','NQ and ES disagree at the level'],['A key open','Midnight, 10 AM, 6 PM or 8 PM at the level'],['An order block','Consecutive aligned candles at the level, used at its middle'],['A liquidity pool','Equal highs or lows, session highs or lows'],['New York morning','The highest-quality session for the model']])},
  {t:'Automatic no-trades',h:`<ul><li>No higher-timeframe gap behind it.</li><li>No draw, or the draw is already hit.</li><li>The level or its CE was closed through or already played.</li><li>Trading against the draw, or shorting at all-time highs.</li><li>You have hit your daily trade limit.</li></ul>`},
  {t:'Grade it yourself',h:`<p>Tick what is true for a setup and see the grade and whether it is tradeable.</p>`+OFV.grader()}],
 recall:rc('CISD and the Rejection Retest','Where does the limit go on a CISD retest?',['At the CE of the wick that retested it','At the CISD level','At the high','At market'],'The middle of the rejection wick.'),
 steps:[['<b>The grades.</b>',tblx(['A','A+','A++'],[['15-minute gap','1-hour or 4-hour gap','Within about 4 points of the CE']])],['<b>The confluences.</b>',`<p>SMT, a key open, an order block, a liquidity pool, and the New York morning.</p>`],['<b>Grade one.</b>',OFV.grader()]],
 gens:[echoNums,echoContracts,togetherQ],
 bank:BANKS('Echo: grading a setup',[
  ['What makes a rejection grade A?',['The wick overlaps a 15-minute gap','It overlaps a 4-hour gap','Nothing','It overlaps a key open'],'A is a 15-minute gap.'],
  ['What makes a rejection grade A+?',['The wick overlaps a 1-hour or 4-hour gap','A 15-minute gap only','A news spike','A big wick'],'A higher-timeframe gap.'],
  ['What makes it A++?',['An A+ with the entry within about 4 points of the gap\'s CE','Any A','A long wick','A gap fill'],'Close to the gap\'s middle.'],
  ['What does the indicator show by default?',['A+ and higher','Every wick','Only A','Nothing'],'15-minute-only gaps are lower quality.'],
  ['Is a confluence a strategy on its own?',['No: it is a reason, stacked with others','Yes','Only SMT','Only key opens'],'Stack them.'],
  ['What is SMT divergence?',['NQ and ES disagree at the level','A news spike','A gap','A key open'],'One makes a new high, the other does not.'],
  ['There is no higher-timeframe gap behind the wick. What do you do?',['No trade','Take half size','Take it anyway','Double size'],'An automatic no-trade.'],
  ['The draw has already been hit. What do you do?',['No trade','Take it','Add size','Move the stop'],'An automatic no-trade.'],
  ['Are you allowed to short at all-time highs?',['No','Yes','Only at open','Only on news'],'There is no draw above.'],
  ['Which session is highest quality for the model?',['New York morning','Lunch','Late afternoon','Weekend'],'The 9:30 open is the main window.']]),
 examDesc:'The three grades, the confluences, and the automatic no-trades.'});
quick({id:'be8',o:20.94,ph:0,bonly:1,t:'Why Echo Trades Lose, and the Daily Rules',out:'Name why a trade lost, and follow the daily rules that keep you from overtrading.',
 ls:['Name the cause','The daily limits','All-time highs','When price action is bad'],
 task:'Look at your last three Echo losses (or any losses). For each, name the cause from the list and write what would have prevented it.',
 learn:[
  {t:'Name the cause',h:pathBanner+key('<p>Almost every loss traces to one cause. Name it after every loss. If you cannot, journal it until you can.</p>','In plain words')+OFV.reveal('Why did it lose?',[['A wick that looked like a rejection got blown through','<b>No higher-timeframe gap behind it.</b> Only trade rejections delivering out of a 1-hour or 4-hour gap (a 15-minute gap at least).'],['Stopped by a few points, then price reversed exactly as planned','<b>An untapped higher-timeframe gap just beyond the level.</b> Wait for the tap, or place the stop so it sits inside the gap.'],['The level reacted earlier, now it fails','<b>A used level.</b> Never re-take a CE that already played or a level that was closed through.'],['The entry was valid but price had nowhere to go','<b>The draw was already taken.</b> Confirm it is still open before every entry.'],['Entered at a flip with no retest, and price swept it','<b>A CISD with no retest.</b> Require a retest, or use the causing candle\'s wick.'],['A third and fourth trade after a loss','<b>Overtrading or revenge.</b> Keep to the daily limits.']])},
  {t:'The daily limits',h:tblx(['Situation','What you do'],[['One win','Done for the day, no matter how good the next setup looks'],['Two losses','Done for the day'],['One loss, then one win','Done for the day'],['Already up on the day','Do not take a second trade']])+`<p>Ask after any loss: would I rather be down one trade, or at my daily loss limit? Size so two full losses in a day cannot breach your limit.</p>`},
  {t:'All-time highs',h:`<p>At or near all-time highs (within about 60 points on the daily chart) there is no gap or old high above to draw to. <b>Never short all-time highs.</b> Longs treat price discovery as the draw. A 1-minute continuation (Model 3: stop 10, target 30) is the entry there; it is off by default and runs automatically only in this zone.</p>`},
  {t:'When price action is bad',h:`<p>If you lose two higher-timeframe trades, or higher-timeframe rejections keep failing day after day, stop taking them at face value. Use the higher timeframe only to identify the trade, then scale down to the 15-minute and 5-minute rejection inside it. Skip Asia and London, trade New York morning only, and leave no limits overnight.</p>`+warn('<p>Skipping a session when you feel off is a valid decision. No-trade days are part of the plan.</p>','Remember')}],
 recall:rc('Grading a Setup: A, A+ and A++','There is no higher-timeframe gap behind the wick. What do you do?',['No trade','Take half size','Take it anyway','Double size'],'An automatic no-trade.'),
 steps:[['<b>Name the cause.</b>',`<p>No gap, an untapped gap beyond, a used level, a hit draw, no retest, or overtrading.</p>`],['<b>The limits.</b>',tblx(['One win','Two losses'],[['Done','Done']])],['<b>All-time highs.</b>',`<p>Never short them.</p>`]],
 gens:[togetherQ,echoContracts,stageOrder],
 bank:BANKS('Why Echo trades lose',[
  ['A wick looked like a rejection but got blown through. What was missing?',['A higher-timeframe gap behind it','A bigger stop','More size','A news spike'],'Only trade rejections delivering out of a gap.'],
  ['You were stopped by a few points, then price reversed as planned. What was the likely cause?',['An untapped higher-timeframe gap just beyond the level','Bad luck only','Too small a size','The spread'],'Wait for the tap.'],
  ['What is the daily limit after one win?',['Done for the day','Two more trades','Unlimited','One more'],'One win, done.'],
  ['What is the daily limit after two losses?',['Done for the day','One more trade','Double size','Unlimited'],'Two losses, done.'],
  ['You are already up on the day. Do you take a second trade?',['No','Yes','At double size','Only after 3 PM'],'Protect the day.'],
  ['Can you short at all-time highs?',['No','Yes','Only on news','Only at night'],'There is no draw above.'],
  ['What is the 1-minute continuation (Model 3) stop and target?',['10 points and 30 points','15 and 40','5 and 15','None'],'Off by default.'],
  ['You lost two higher-timeframe trades. What do you do?',['Scale down to the 15-minute and 5-minute rejection inside the higher timeframe','Double size','Take the same trade again','Stop journalling'],'Do not take it at face value.'],
  ['In bad price action, which sessions do you skip?',['Asia and London','New York morning','All of them','None'],'Trade New York morning only.'],
  ['A third trade after a loss is called what?',['Overtrading or revenge','A good plan','Scaling in','A partial'],'Keep to the daily limits.']]),
 examDesc:'Why trades lose, the daily limits, all-time highs, and bad price action.'});
quick({id:'bo1',o:20.95,ph:0,bonly:1,t:'Orbit Step 1: The Area of Interest',out:'Draw the 3-minute range after a big move, find the 0.705, and know where to start looking for an entry.',
 ls:['The one-line model','Drawing the range','The area of interest','One area at a time'],
 task:'On a 3-minute chart, find a big drop out of a consolidation. Draw the range with the fib tool (0, 0.5, 0.705, 1). Mark the 0.705 and write where the area of interest begins.',
 learn:[
  {t:'The one-line model',h:pathBanner+key('<p>Orbit trades a piece of the move: a retrace into an area of interest, a 5-minute inversion, then an entry on a smaller internal range.</p>','In plain words')+`<p>Orbit is a <b>retracement model</b>. After a big displacement, wait for price to retrace into the 0.705, confirm the turn with a 5-minute inversion, then enter on a smaller internal 3-minute range. It works best in consolidating, two-sided markets. In a straight run to new highs there are no retracements, so there are few or no entries.</p>`},
  {t:'Drawing the range',h:tblx(['Setup','Anchor 1 (the wick)','Anchor 2 (the body)','Entry'],[['Short after a drop','The highest wick of the high that started the drop','The bottom of the body of the candle with the lowest wick','The 0.705 retrace up'],['Long after a rally','The lowest wick of the swing low','The top of the body of the candle with the highest wick','The 0.705 retrace down']])+`<p>Always draw on the <b>3-minute chart</b>, with the fib levels 0, 0.5, 0.705 and 1 only. The extreme you anchor to must be untapped. As new lowest wicks print, move anchor 2 to that candle's body.</p>`},
  {t:'The area of interest',h:`<p>The best area of interest is the <b>untapped 3-minute 0.705 to 1 zone</b> of a large displacement that came out of a long consolidation. Nothing happens until price reaches the 0.705. Play the figure to the end, then click where the area of interest begins.</p>`+OFV.lab('baoi')},
  {t:'One area at a time',h:`<p>One drop-off, one area of interest, one entry. If you are juggling several, you are looking for reasons to trade. If price hits an OTE level and blows straight through with no inversion, your bias or your range was wrong: zoom out and redraw.</p>`}],
 recall:rc('Orbit on TradingView: the Tap, the Inversion and the Limit','What is the first step in Orbit?',['The tap into the 0.705 of the big range','The inversion','The limit','The stop'],'No tap, no trade.'),
 steps:[['<b>The anchors.</b>',tblx(['Wick','Body'],[['Stop side','Target side']])],['<b>The area of interest.</b>',OFV.lab('baoi')],['<b>One at a time.</b>',`<p>One area of interest, one entry.</p>`]],
 gens:[orbitOrder,oteEntry,orbitRisk],eb:5,
 bank:BANKS('Orbit: the area of interest',[
  ['Which chart do you draw the Orbit range on?',['The 3-minute chart','The daily chart','The 4-hour chart','Any chart'],'The 3-minute, even for a higher-timeframe move.'],
  ['Which fib levels does Orbit use?',['0, 0.5, 0.705 and 1','0.382 and 0.618','0.786 only','All of them'],'Nothing else.'],
  ['For a short, where is anchor 1?',['The highest wick of the high that started the drop','The lowest body','The open','The close'],'The stop side is the wick.'],
  ['For a short, where is anchor 2?',['The bottom of the body of the candle with the lowest wick','The lowest wick','The high','The open'],'The target side is the body.'],
  ['Where does the area of interest begin?',['At the 0.705 and runs to the 1','At the 0','At the 0.5 only','At the 0.382'],'0.705 to 1.'],
  ['What is the best area of interest?',['The untapped 0.705 to 1 zone of a big displacement out of a long consolidation','A random wick','A news level','The open'],'The bigger the time range behind it, the more it is worth.'],
  ['Price blows through the 0.705 with no inversion. What does it mean?',['Your bias or your range was wrong: zoom out and redraw','Add size','Wait for the open','Nothing'],'Redraw.'],
  ['How many areas of interest at a time?',['One','Three','As many as you can find','None'],'One drop-off, one area, one entry.'],
  ['In a straight run to new highs, how many Orbit entries do you expect?',['Few or none','Many','One every hour','Ten'],'No retracements.'],
  ['Which markets does Orbit shine in?',['Consolidating, two-sided markets','Straight trends','Closed markets','News-only days'],'It needs retracements.']]),
 examDesc:'Orbit\'s model, drawing the range, the area of interest, and one at a time.'});
quick({id:'bo2',o:20.96,ph:0,bonly:1,t:'Orbit Step 2: The 5-Minute Inversion',out:'Spot a real 5-minute inversion, and know which gaps do not count.',
 ls:['What an inversion is','Which gaps count','Why it matters','What to do next'],
 task:'On a 5-minute chart inside an area of interest, find a fresh bullish gap and a bearish candle that closes below its bottom. Write the time of the inversion and the high it came from.',
 learn:[
  {t:'What an inversion is',h:pathBanner+key('<p>An inversion is a candle closing through a fair value gap from the other side. For a short, a bearish candle closes below a fresh bullish gap.</p>','In plain words')+`<p>A <b>fair value gap</b> is three candles where the first and third candles' wicks leave a gap around the middle candle. Switch between the two cases.</p>`+OFV.lab('binv')},
  {t:'Which gaps count',h:tblx(['Counts','Does not count'],[['A gap formed out of the area of interest','An old gap from before'],['A fresh gap','A gap already inversed earlier: use the next fresh gap'],['Even a tiny real three-candle gap','Gaps and inversions during the 4 PM to 6 PM close'],['A gap left by the 6 PM open','A candle that only dips into the gap and closes back above it']])},
  {t:'Why it matters',h:`<p>The inversion is the confirmation. Until a 5-minute candle closes through the gap, the retrace has not failed, and there is no trade. It tells you the turn has started and gives you the high that becomes the top of your internal range, and your stop.</p>`},
  {t:'What to do next',h:`<p>Once the inversion prints, go back to the 3-minute chart and draw the internal range: anchor 1 is the high of the move that made the inversion, anchor 2 is the body of the candle with the lowest wick after it. That is the next lesson.</p>`}],
 recall:rc('Orbit Step 1: The Area of Interest','Where does the area of interest begin?',['At the 0.705 and runs to the 1','At the 0','At the 0.5 only','At the 0.382'],'0.705 to 1.'),
 steps:[['<b>A fresh gap.</b>',OFV.lab('binv')],['<b>Closed through.</b>',`<p>A candle must close through the gap.</p>`],['<b>Then the internal range.</b>',`<p>Drawn on the 3-minute chart from the inversion high.</p>`]],
 gens:[orbitOrder,orbitRisk,oteEntry],eb:5,
 bank:BANKS('Orbit: the inversion',[
  ['What is an inversion?',['A candle closing through a fair value gap from the other side','A new high','A news candle','A tap'],'It confirms the turn.'],
  ['For a short, what closes through what?',['A bearish candle closes below a fresh bullish gap','A bullish candle closes above a gap','A wick touches a gap','A gap closes the day'],'The mirror of a long.'],
  ['What is a fair value gap?',['Three candles where the first and third wicks leave a gap around the middle','Any big candle','A news release','A moving average'],'An imbalance.'],
  ['Price dips into the gap but the candle closes back above it. Is it an inversion?',['No: it must close through','Yes','Yes at night','Only on high volume'],'A close, not a dip.'],
  ['A gap was already inversed earlier. Can you use it?',['No: use the next fresh gap','Yes','Only twice','At half size'],'It must be fresh.'],
  ['Do gaps in the 4 PM to 6 PM close count?',['No','Yes','Only some','Always'],'Ignore that window.'],
  ['Do gaps left by the 6 PM open count?',['Yes','No','Only on Sundays','Never'],'They are valid.'],
  ['Where must the gap be formed?',['Out of the area of interest','Anywhere','On the daily chart','From last week'],'Not an old gap.'],
  ['What do you do after the inversion?',['Draw the internal 3-minute range','Enter at market','Add size','Close the chart'],'The next step.'],
  ['What does the inversion high become?',['The top of your internal range and your stop','Your target','The open','Nothing'],'The stop goes there.']]),
 examDesc:'The 5-minute inversion: what counts and what does not.'});
quick({id:'bo3',o:20.97,ph:0,bonly:1,t:'Orbit Step 4: Your Orbit Day',out:'Run Orbit from the area of interest to the exit, including missed entries, continuation entries and the rules that never change.',
 ls:['The whole sequence','Continuation entries','Missed entries','The rules that never change'],
 task:'Write Orbit\'s four steps in order, then list the three numbers that never change (limit, stop, target) and the maximum risk.',
 learn:[
  {t:'The whole sequence',h:pathBanner+tblx(['Step','What happens'],[['1. Area of interest','Price retraces into the 0.705 to 1 of the big 3-minute range'],['2. Inversion','A 5-minute candle closes through a fresh gap'],['3. Internal range','Drawn on the 3-minute from the inversion high to the lowest-wick body'],['4. Entry','A limit at the 0.705 of the internal range, stop above its high, target 40 points']])+`<p>The limit has to be hit: if price turns three ticks early, there is no trade. You trade the internal range, a piece of the move, not the whole move.</p>`},
  {t:'Continuation entries',h:`<p>After an entry plays, the entry candle's high becomes anchor 1 for the next internal range. Repeat the steps down to the draw. Wait for the next full setup rather than chasing.</p>`},
  {t:'Missed entries',h:`<p>If you miss the entry, <b>let it go</b>. Each later range you chase as price runs away is a watered-down version of the setup. A good setup can take many hours to form. Wait for the next one. A limit that never fills is a trade you did not take.</p>`},
  {t:'The rules that never change',h:warn('<p>The limit is at the 0.705 of the internal range. The stop is the inversion high, with no buffer. The maximum risk is 15 points: over that, there is <b>no trade</b>, and you never move the stop closer to make it fit. The target is 40 points. After you are in, you do nothing: no break-even, no partials. Never short at all-time highs.</p>','Orbit\'s numbers')+OFV.lab('bote')}],
 recall:rc('Orbit Step 2: The 5-Minute Inversion','For a short, what closes through what?',['A bearish candle closes below a fresh bullish gap','A bullish candle closes above a gap','A wick touches a gap','A gap closes the day'],'The mirror of a long.'),
 steps:[['<b>The sequence.</b>',tblx(['1','2','3','4'],[['Area of interest','Inversion','Internal range','Limit']])],['<b>The 0.705.</b>',OFV.lab('bote')],['<b>The numbers.</b>',`<p>Stop at the inversion high, target 40, maximum risk 15, nothing after you are in.</p>`]],
 gens:[orbitOrder,oteEntry,orbitRisk],eb:5,
 bank:BANKS('Your Orbit day',[
  ['What is the first step in Orbit?',['The area of interest is tapped','The inversion','The limit','The stop'],'Nothing happens until the 0.705 of the area of interest.'],
  ['Where is the entry?',['A limit at the 0.705 of the internal range','At market','At the 0','At the high'],'The 0.705 must be hit.'],
  ['Where is the stop?',['At the inversion high, no buffer','10 points away','At the open','At the 0.5'],'Fixed.'],
  ['What is the maximum risk?',['15 points','40 points','5 points','There is none'],'Over 15 means no trade.'],
  ['What is the target?',['40 points','15 points','100 points','There is none'],'Fixed.'],
  ['Price turns three ticks before the 0.705. What do you do?',['No trade: the limit was not hit','Chase it','Move the limit','Add size'],'The 0.705 must be hit.'],
  ['After you are in, what do you do?',['Nothing','Move to break-even','Take a partial','Add size'],'The trade ends at the stop or the target.'],
  ['You missed the entry. What do you do?',['Let it go and wait for the next full setup','Chase it','Double the next size','Move the stop'],'A missed trade costs nothing.'],
  ['After an entry plays, what becomes anchor 1 for the next internal range?',['The entry candle\'s high','The open','The low','The close'],'Repeat down to the draw.'],
  ['Can you take Orbit shorts at all-time highs?',['No','Yes','Only on news','Only at night'],'There is no draw above.']]),
 examDesc:'Running Orbit from the area of interest to the exit, and the rules that never change.'});

})();
