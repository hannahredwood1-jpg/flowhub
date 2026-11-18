/* ============================================================
   ECHO x ORBIT, from the Echo x Orbit A-to-Z guide: two strategies (Echo: the rejection block, Orbit: the 3-minute OTE), one routine, and how to read the order flow
   with both. Five modules built around the order-flow reads. Both give a limit order with a stop and a target. Rules and reading only: no results, win rates or statistics.
============================================================ */
(()=>{
/* ---------- generators ---------- */
const echoContracts=numGen('Contracts',r=>{const risk=pick(r,[100,200,300,400]),st=pick(r,[10,12,15]),n=Math.floor(risk/(st*2));
  return{q:`An Echo limit has a ${st}-point stop. The most you will lose is $${risk}. MNQ is $2 a point. How many MNQ contracts, rounded down?`,ans:n,unit:'',tol:.01,why:`$${risk} ÷ (${st} × $2) = ${(risk/(st*2)).toFixed(2)}, rounded down: ${n}.`}});
const echoNums=numGen('Stop and target',r=>{const k=pick(r,[['Model 1',10,40],['Model 2 (CISD)',12,40],['Model 3 (1-minute)',10,30]]),w=pick(r,['stop','target']);
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
  {t:'Echo in plain words',h:key('<p>Echo trades a wick: price pokes past an obvious high or low, cannot stay there, and leaves a long wick.</p>','In plain words')+`<p>Price often pokes just past an obvious high or low to grab the orders sitting there, then fails to stay beyond it. That failed poke leaves a long wick (a <b>rejection block</b>). Echo marks where to place a <b>limit order at the middle of that wick</b>, with a small stop just beyond the poke, aiming for the next place price is being pulled to.</p>`+OFV.echoOrbit()},
  {t:'Orbit in plain words',h:`<p>Orbit looks at the 3-minute chart for a drop (or a rise), a <b>retrace</b> back into an area of interest, a 5-minute gap that gets closed through (an <b>inversion</b>, a sign the retrace failed), and then a <b>limit order at a smaller retrace</b>. The order of events is always: <b>tap, inversion, internal range, limit</b>. If the order changes, there is no trade.</p>`},
  {t:'The four messages',h:`<p>They are two separate strategies with two separate indicators, but both give you a limit order with a stop and a target, and both send the same four staged messages.</p>`+tblx(['Message','Meaning','What you do'],[['WATCHING','Something happened. Nothing to do yet','Get ready'],['LIMIT','The price for your limit, your stop and your target','Place the limit once a candle in your direction has formed'],['FILLED','Price reached your limit','Leave it alone: the stop and target are fixed'],['NO LONGER WATCHING','The setup ended, with a reason','Cancel any unfilled limit']])+`<p>A limit that never fills is <b>not a loss</b>. It is a trade you did not take.</p>`},
  {t:'The candle rule',h:`<p>Place your limit once a candle <b>in your direction</b> has formed: a bearish candle for a short, a bullish candle for a long. Do not place it during a run of candles going against you. This is the moment you do your order-flow check, which is what the rest of this course teaches.</p>`},
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
})();
