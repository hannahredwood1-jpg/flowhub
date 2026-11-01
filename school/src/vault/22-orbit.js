/* ============================================================
   ORBIT vault · the curriculum, from the ORBIT A-to-Z guide: a 3-minute OTE model with a 5-minute inversion and a limit entry.
   Rules only: no results, win rates or statistics. Everything is taught for a short; a long is the exact mirror.
============================================================ */
(()=>{
const f2=x=>Math.round(x*100)/100;
const q4=x=>Math.round(x*4)/4;
/* ---------- generators ---------- */
const sideWord=l=>l?'long':'short';
const bigLevel=numGen('The big OTE',r=>{const long=r()<.5,A=q4(pick(r,[20180,21360,24480,27720,29180])),R=pick(r,[60,72,88,104,120,136]),zero=long?q4(A+R):q4(A-R),lv=q4(zero+(A-zero)*.705);
  return{q:`${long?'Long':'Short'} setup. On the 3-minute chart the 1 level is anchored at ${fm(A,2)} (the wick of the ${long?'low':'high'} the move ${long?'dropped':'dumped'} off) and the 0 level at ${fm(zero,2)} (the body of the candle with the ${long?'highest':'lowest'} wick). At what price is the 0.705 level, the line price has to tap?`,ans:lv,unit:'',tol:.3,why:`The range is ${f2(Math.abs(A-zero))} points. The 0.705 level is 0.705 of the way from the 0 level toward the 1 level: ${fm(zero,2)} ${long?'−':'+'} 0.705 × ${f2(Math.abs(A-zero))} = ${fm(lv,2)}. The area of interest runs from there to the 1 level.`}});
const intEntry=numGen('The internal OTE',r=>{const long=r()<.5,inv=q4(pick(r,[20150,21360,24480,27720,29263])),R=pick(r,[24,30,36,42,48,56,64]),b=long?q4(inv+R):q4(inv-R),lim=q4(b+(inv-b)*.705);
  return{q:`${long?'Long':'Short'} setup. The inversion ${long?'low':'high'} is ${fm(inv,2)} (anchor 1, the 1 level). After it, the lowest-wick candle on the 3-minute chart has its body at ${fm(b,2)} (anchor 2, the 0 level). Where is your limit, the internal 0.705?`,ans:lim,unit:'',tol:.3,why:`The internal range is ${f2(Math.abs(inv-b))} points. The limit is ${fm(b,2)} ${long?'−':'+'} 0.705 × ${f2(Math.abs(inv-b))} = ${fm(lim,2)}.`}});
const riskPts=numGen('Risk in points',r=>{const long=r()<.5,inv=q4(pick(r,[20150,21360,24480,27720,29263])),R=pick(r,[24,30,36,42,48,56,64]),b=long?q4(inv+R):q4(inv-R),lim=q4(b+(inv-b)*.705),risk=Math.abs(inv-lim);
  return{q:`${long?'Long':'Short'} limit at ${fm(lim,2)} with the stop at the inversion ${long?'low':'high'}, ${fm(inv,2)}. How many points is your risk (limit to the stop)?`,ans:risk,unit:'pts',tol:.3,why:`${fm(lim,2)} to ${fm(inv,2)} = ${f2(risk)} points.`}});
const tpPrice=numGen('The target',r=>{const long=r()<.5,lim=q4(pick(r,[20151.75,21362.5,24481.25,27722,29251.75]));
  return{q:`Your ${long?'long':'short'} limit is at ${fm(lim,2)}. The take profit is 40 points from the limit. At what price is the target?`,ans:lim+(long?40:-40),unit:'',tol:.3,why:`${long?'+':'−'}40 points: ${fm(lim+(long?40:-40),2)}. There is no break-even and no partial.`}});
const maxRisk=r=>{const risk=pick(r,[8,11.25,13.5,15,15.25,17,20.5,24]),ok=risk<=15;
  return mcq('Maximum risk',`The limit is worked out and the stop at the inversion high is ${risk} points away. Your maximum risk is 15 points. What do you do?`,ok?['Take the trade: the risk is within 15 points','Move the stop closer so it fits','Skip it: over the limit','Widen the target']:['No trade: the risk is over 15 points, and the stop is never moved closer to make it fit','Move the stop closer so it fits','Take it at a smaller size','Add a buffer above the high'],ok?`${risk} is not over 15 points, so the setup passes the risk rule.`:`${risk} is over 15 points. Risk over 15, no trade. You never move the stop closer to make a trade fit.`)};
const tapQ=r=>{const k=pick(r,[
 ['Price has not yet traded into the 0.705 of the big range, but a clean 5-minute inversion has just closed. What do you do?','No trade: no tap, no trade. The area of interest has to be touched first','Take the inversion anyway','Place the limit at the inversion','Wait for a retest of the gap','Taking an inversion before the area of interest has been touched is a named way to lose trades.'],
 ['Price comes within a few ticks of the 0.705 but never trades into it. What is the setup?','Not tapped: "near" is not enough, so no trade','Tapped: close enough','Tapped on the 5-minute chart','Valid with a tolerance','Nothing happens until price trades into the 0.705.'],
 ['Price trades up through the 0.705 and keeps going with no inversion. What does that tell you?','Your read of the range was wrong: the area is finished','The tap is still valid','The inversion is coming','Add a second limit','Blowing through the 0.705 with no inversion kills the area.']]);
  return mcq('The tap',k[0],[k[1],k[2],k[3],k[4]],k[5])};
const gapQ=r=>{const k=pick(r,[
 ['A bullish 5-minute gap formed hours ago from earlier price action sits near the area. Is it the one to use?','No: the gap has to come out of the same reaction','Yes: any bullish gap near the area','Yes if it is the biggest','Yes if it is a 15-minute gap','The inversion gap must be fresh and formed out of the same reaction.'],
 ['The bullish gap you were watching was already inverted earlier. What do you do?','Use the next fresh gap: it must not have been inverted before','Use it again','Trade it at double size','Skip the whole day','A gap that was inverted before is spent.'],
 ['A 5-minute candle wicks below the gap\'s lower edge but closes back inside it. Is that the inversion?','No: the candle has to close below the lower edge','Yes: a wick is enough','Yes if it is a long wick','Yes on the 1-minute','A close counts, a wick does not.'],
 ['A candle closes below the gap\'s lower edge at 4:30 PM. Does it count?','No: nothing between 4 PM and 6 PM counts','Yes: a close is a close','Yes if it is a big candle','Only in Asia','The 4 PM to 6 PM stretch is excluded.'],
 ['A bullish gap was left by the 6 PM open. Is it valid?','Yes: gaps left by the 6 PM open are valid','No: it is outside the session','No: only 5-minute opens count','Only before midnight','Gaps left by the 6 PM open are valid.']]);
  return mcq('The 5-minute inversion',k[0],[k[1],k[2],k[3],k[4]],k[5])};
const deadQ=r=>{const k=pick(r,[
 ['Price breaks the base of the move (the wick is the base). What is finished?','The whole area of interest: nothing more to trade from it','Only this entry','Nothing','Just the inversion','Breaking the base kills the area and every entry from it.'],
 ['The inversion high breaks before your limit fills. What is finished?','Only this entry attempt: the area stays alive','The whole area','Nothing: keep the limit','The day','Another entry needs a new inversion and a fresh internal OTE.'],
 ['The low of the move (the draw) is taken before you get filled. What happens?','The area is finished','Move the limit lower','Wait for a retest','Switch directions','If the draw is already taken, there is nothing left to trade toward.'],
 ['A failed entry and a failed area are different. Which one kills every entry from the area?','A failed area','A failed entry','Both equally','Neither','A failed entry does not kill the area; a failed area kills every entry from it.']]);
  return mcq('When the setup is dead',k[0],[k[1],k[2],k[3],k[4]],k[5])};
const afterFill=r=>mcq('After you are in',pick(r,['You are filled. Price moves 15 points your way. What do you do?','You are filled and price stalls halfway to the target. What do you do?','You are filled and price comes back toward your entry. What do you do?']),['Nothing: no break-even, no partials, no moving the stop. The trade ends at the stop or the 40-point target','Move the stop to break-even','Take half off','Move the stop closer to the entry'],'After you are in you do nothing. The stop and target are fixed.');
const toleranceQ=r=>{const k=pick(r,[
 ['Price turns 3 ticks before reaching your limit and never fills it. What do you do?','No trade: missed by a few ticks, no trade. Do not chase','Chase it at market','Move the limit up to the price','Add a second limit','If the 0.705 is not reached, there is no trade.'],
 ['The optional entry tolerance is about one point. What does it cost?','A point of extra risk for every point you give','Nothing','A smaller target','A wider area','Taking a fill a point early adds a point of risk.'],
 ['Price comes within a point of your limit and you decide to accept the fill. Is that allowed?','Yes, if you use the optional tolerance, which adds the same amount of risk','Never','Always','Only on news days','The method allows about one point of tolerance as an option.']]);
  return mcq('The limit entry',k[0],[k[1],k[2],k[3],k[4]],k[5])};
const orderQ=()=>({kind:'order',topic:'ORBIT',q:'Put the ORBIT steps in order.',steps:['A big move dumps off a high after choppy candles','The big OTE is drawn: the 1 level at the wick of the high, the 0 level at the body of the lowest-wick candle','Price taps the 0.705 of the big range','A fresh 5-minute bullish gap is closed through to the downside: the inversion','The internal OTE is drawn from the inversion high to the lowest-wick candle after it','A limit sell at the internal 0.705, stop at the inversion high, target 40 points'],why:'Area of interest touched, then the 5-minute inversion, then the internal 3-minute range, then the limit entry. If the order changes, there is no trade.'});
const moveQ=r=>{const k=pick(r,[
 ['What does ORBIT look for before the big move?','A stretch of choppy candles that reject both ways, mostly wicks','A smooth one-way trend','A gap up','A news candle','Then a big move closes beyond all those wicks.'],
 ['How big does the move have to be?','It is your eye: ORBIT does not set a minimum size','At least 100 points','At least 40 points','Twice the stop','What counts as big enough is your judgement.'],
 ['What is the 1 level of the big OTE (short)?','The wick of the high the move dumped off','The body of the lowest candle','The first gap','The 5-minute close','Anchor 1 is the wick of the high.'],
 ['What is the 0 level of the big OTE (short)?','The body of the candle with the lowest wick, following the low until the 0.705 is touched','The wick of the lowest candle','The close of the dump','The 50% line','Anchor 2 follows the low: each new lowest wick moves it to that candle\'s body.'],
 ['The low you want to anchor to has already been retraced into. What do you do?','Pick a different swing: the low must be untapped','Use it anyway','Take the trade at once','Draw a smaller range','The low has to be untapped.'],
 ['How many areas of interest are active at one time?','One: one drop, one AOI, one entry','Two','As many as you find','One per timeframe','Only one is active at a time.']]);
  return mcq('The move and the big OTE',k[0],[k[1],k[2],k[3],k[4]],k[5])};
const ruleThumb=r=>{const k=pick(r,[
 ['No tap.','No trade'],['No fresh gap.','No trade'],['Risk over 15 points.','No trade'],['Missed the limit by a few ticks.','No trade'],['Price moves against you after the fill.','Never move the stop'],['Price runs away without you.','Never chase']]);
  return mcq('Rules of thumb',`"${k[0]}" What is the ORBIT rule?`,[k[1],'Take it with a wider stop','Take it at half size','Wait for a retest'],'No tap, no trade. No fresh gap, no trade. Risk over 15 points, no trade. Missed by a few ticks, no trade. Never move the stop. Never chase.')};
const yourCall=r=>mcq('What stays your call',pick(r,['Who decides which move is the big move?','Who decides whether you are long or short today?','Who decides whether the market suits the model?']),['You do: ORBIT sets no size filter, no bias and no market filter','The rules do','Your broker','The news'],'Which move is the big one, your bias and direction, and whether the market suits the model all stay your call.');
const routineQ=r=>{const k=pick(r,[
 ['What do you do when the price taps the 0.705?','Nothing yet: wait for the inversion and then the limit','Enter at once','Move your stop','Switch direction','The tap is a heads-up, not an entry.'],
 ['When do you place the limit?','Once a candle in your direction has formed: bearish for a short, bullish for a long','During a run of candles against you','At the tap','Before the inversion','Do not place it during a run of candles going against you.'],
 ['You are filled. What do you do?','Leave it alone: the stop and target are fixed','Move to break-even at 1R','Take a partial','Trail the stop','Nothing after you are in.'],
 ['The setup is no longer valid and your limit is unfilled. What do you do?','Cancel it and wait for a new setup','Leave it','Move it','Double it','Cancel any unfilled limit.']]);
  return mcq('The routine',k[0],[k[1],k[2],k[3],k[4]],k[5])};
/* ---------- b01 · the idea ---------- */
quick({id:'b01',o:15,ph:5,first:true,t:'ORBIT: The Idea and the Order of Events',out:'Say what ORBIT does in one minute, the words it uses, and the order of events that has to happen.',
 ls:['ORBIT in one minute','Shorts and longs are mirrors','The order of events','The words you need','Where ORBIT stops'],
 task:'Write the ORBIT idea in four sentences: the big move, the area of interest, the 5-minute inversion and the limit. Then write the order of events from memory and say what happens if the order changes.',
 learn:[
  {t:'ORBIT in one minute',h:`<p>ORBIT waits for a big move to dump off a high, lets price retrace back up into a zone on the way, then waits for a small bullish gap on the 5-minute chart to be closed through to the downside: an <b>inversion</b>. That inversion tells you the retrace has failed. You then <b>sell with a limit order</b> at the <b>0.705</b> of a small second range drawn inside that move, put the stop above the inversion high, and take profit 40 points lower.</p>`},
  {t:'Shorts and longs are mirrors',h:`<p>Everything is written for a short. A long is the exact mirror: every "high" becomes a "low" and every "bullish" becomes "bearish".</p>`},
  {t:'The order of events',h:key('<p><b>Area of interest touched → 5-minute inversion → internal 3-minute range → limit entry.</b> If the order changes, there is no trade.</p>','Always this order')},
  {t:'The words you need',h:tblx(['Word','Plain meaning'],[['OTE','A fib-style range drawn on the 3-minute chart with only four levels: 0, 0.5, 0.705 and 1'],['AOI (area of interest)','The 0.705-to-1 part of the big range. It is where you want price to react. It is not an entry'],['Tap','Price trades up into the 0.705 of the big range. No tap, no trade'],['Fair value gap','A three-candle gap. A bullish gap is left when price rises fast'],['Inversion','A 5-minute candle closes below the bottom of a fresh bullish gap, so the gap stops acting as support'],['Inversion high','The highest point of the bullish move that was just flipped. Your stop goes here'],['Internal OTE','A second, smaller 3-minute range drawn from the inversion high down to the lowest-wick candle after it. Your entry is its 0.705']])},
  {t:'Where ORBIT stops',h:`<p>ORBIT is a complete, narrow model: one drop, one area of interest, one entry, one stop and one target. It does not tell you whether to be long or short today, and it does not manage the trade after you are filled.</p>`}],
 recall:rc('Rejection Blocks and CISD','What makes a rejection block valid?',['Price sweeps a liquidity level and the candle fails to close beyond it','A big candle and a news release','A gap and a retest','A close beyond the level'],'ORBIT also starts from a level price reacts to.'),
 steps:[['<b>The order of events.</b>',tblx(['#','Step'],[['1','Area of interest touched (the tap)'],['2','5-minute inversion'],['3','Internal 3-minute range'],['4','Limit entry']])],['<b>The four levels.</b>',tblx(['Level','Meaning'],[['0','Anchor 2: body of the lowest-wick candle'],['0.5','Halfway'],['0.705','The line price has to tap, and your entry on the internal range'],['1','Anchor 1: the wick of the high']])]],
 gens:[orderQ,tapQ,bigLevel,moveQ],
 bank:BANKS('ORBIT',[
  ['What does ORBIT wait for first?',['A big move that dumps off a high','A news release','A gap up','The open'],'Then price retraces up into a zone.'],
  ['What is an inversion in ORBIT?',['A 5-minute candle closes below the bottom of a fresh bullish gap','A wick through a gap','A new low','A news candle'],'The gap stops acting as support.'],
  ['Which chart is the OTE drawn on?',['The 3-minute chart','The daily chart','The 4-hour chart','The weekly chart'],'The inversion is read on the 5-minute.'],
  ['What four levels does the OTE have?',['0, 0.5, 0.705 and 1','0, 0.25, 0.5 and 1','0.382, 0.5, 0.618 and 1','Just 0.705'],'Only four.'],
  ['What is the AOI?',['The 0.705-to-1 part of the big range','The entry','The stop','The target'],'It is not an entry.'],
  ['What is the correct order of events?',['Area touched, inversion, internal range, limit entry','Inversion, tap, limit, range','Limit, tap, inversion, range','Range, limit, tap, inversion'],'If the order changes, there is no trade.'],
  ['Where does the stop go?',['At the inversion high','Above the news candle','At the 0.5','At the 0 level'],'No buffer.'],
  ['Does ORBIT tell you to be long or short today?',['No: that stays your call','Yes','Only on news days','Only after a win'],'Bias and direction are yours.']]),
 examDesc:'What ORBIT does, the four OTE levels, the words, and the order of events.'});
/* ---------- b02 · the move and the big OTE ---------- */
quick({id:'b02',o:16,ph:5,t:'ORBIT: The Move and the Big OTE',out:'Find the move, draw the big OTE, and wait for the tap.',
 ls:['Step 1: the move','Step 2: draw the big OTE (the AOI)','The 0 level follows the low','The low must be untapped','One area at a time','Step 3: wait for the tap'],
 task:'On a 3-minute NQ chart in replay, find three moves that dumped off a high after choppy candles. For each, draw the big OTE: the 1 level at the wick of the high, the 0 level at the body of the lowest-wick candle. Mark the 0.705 and say whether it was tapped, and whether the low was still untapped when you drew it.',
 learn:[
  {t:'Step 1: the move',h:`<p>Look for a stretch of <b>choppy candles that reject both ways</b> (mostly wicks), followed by a <b>big move that closes beyond all those wicks</b>. What counts as "big enough" is your eye: ORBIT does not set a minimum size.</p>`},
  {t:'Step 2: draw the big OTE (the AOI)',h:tblx(['Anchor','Where it goes'],[['Anchor 1: the 1 level (your stop side)','The wick of the high the move dumped off'],['Anchor 2: the 0 level','The body of the candle with the lowest wick']])+`<p>The area of interest is the part of the range from the <b>0.705 up to the 1</b>.</p>`},
  {t:'The 0 level follows the low',h:`<p>Every time a new lowest wick prints, anchor 2 moves to <b>that candle's body</b>, until the 0.705 is touched. The range stretches as the low extends.</p>`},
  {t:'The low must be untapped',h:warn('<p>The low you anchor to must be <b>untapped</b>. If price has already retraced into it, pick a different swing.</p>','A named mistake')},
  {t:'One area at a time',h:`<p>Only <b>one area of interest is active at a time</b>: one drop, one AOI, one entry. Do not stack ranges and hope one works.</p>`},
  {t:'Step 3: wait for the tap',h:key('<p>Nothing happens until price trades into the <b>0.705</b>. "Near" is not enough. Taking an inversion before the area of interest has been touched is a named way to lose trades.</p>','No tap, no trade')}],
 recall:xr('ORBIT: The Idea and the Order of Events','What is the correct order of events?',['Area touched, inversion, internal range, limit entry','Inversion, tap, limit, range','Limit, tap, inversion, range','Range, limit, tap, inversion'],'If the order changes, there is no trade.'),
 steps:[['<b>Anchors.</b>',tblx(['Level','Short setup'],[['1','The wick of the high the move dumped off'],['0','Body of the candle with the lowest wick (follows the low)'],['0.705','The tap line'],['AOI','0.705 up to 1']])],['<b>A worked range.</b>',tblx(['Item','Price'],[['1 level (wick of the high)','29,288.00'],['0 level (body of the lowest-wick candle)','29,190.00'],['Range','98.00 points'],['0.705 level','29,190.00 + 0.705 × 98.00 = 29,259.09']])]],
 gens:[bigLevel,moveQ,tapQ,orderQ],
 bank:BANKS('The big OTE',[
  ['Where is anchor 1 (the 1 level) for a short?',['The wick of the high the move dumped off','The body of the lowest candle','The first gap','The 5-minute close'],'The 1 level is on your stop side.'],
  ['Where is anchor 2 (the 0 level) for a short?',['The body of the candle with the lowest wick','The wick of the lowest candle','The news candle','The inversion'],'It follows the low.'],
  ['What happens to anchor 2 when a new lowest wick prints?',['It moves to that candle\'s body, until the 0.705 is touched','It stays','It is deleted','It moves to the wick'],'The range stretches with the low.'],
  ['What is the AOI?',['The 0.705 to 1 part of the big range','The 0 to 0.5 part','The 0.5 only','The whole range'],'Where you want price to react.'],
  ['The low you want to anchor to has been retraced into already. What do you do?',['Pick a different swing: it must be untapped','Use it anyway','Take the trade','Draw a smaller range'],'The low has to be untapped.'],
  ['How many areas of interest are active at once?',['One','Two','Three','Unlimited'],'One drop, one AOI, one entry.'],
  ['What is a "tap"?',['Price trades up into the 0.705 of the big range','Price touches the 0 level','A candle closes above the high','A news touch'],'Near is not enough.'],
  ['Price has not tapped the 0.705. A 5-minute inversion closes. What do you do?',['No trade: no tap, no trade','Take it','Place the limit','Wait for the next day'],'Taking an inversion before the tap is a named way to lose trades.']]),
 examDesc:'The move, the big OTE anchors, the 0 level following the low, the untapped low, one area, and the tap.'});
/* ---------- b03 · the 5-minute inversion ---------- */
quick({id:'b03',o:17,ph:6,t:'ORBIT: The 5-Minute Inversion',out:'Find a fresh bullish gap and the 5-minute close below it that confirms the retrace has failed.',
 ls:['Step 4: the 5-minute inversion','A fresh gap from the same reaction','Not inverted before','The close below the lower edge, after the tap','The 4 PM to 6 PM rule','Why the inversion matters'],
 task:'On a 5-minute chart in replay, find three bullish gaps inside or just below an area of interest after a tap. For each, say whether it came out of the same reaction, whether it was fresh and not inverted before, and which candle closed below its lower edge. Mark any that fall between 4 PM and 6 PM.',
 learn:[
  {t:'Step 4: the 5-minute inversion',h:`<p>On the <b>5-minute chart</b>, find a <b>bullish gap</b> inside or just below the area of interest. A 5-minute candle must <b>close below the gap's lower edge</b>, <b>after the tap</b>. That is the inversion: the gap stops acting as support.</p>`},
  {t:'A fresh gap from the same reaction',h:`<p>The gap has to be formed out of the <b>same reaction</b>, not an old gap from earlier price action.</p>`},
  {t:'Not inverted before',h:`<p>The gap must be <b>fresh</b> and must <b>not have been inverted before</b>. If it was, use the next fresh gap.</p>`},
  {t:'The close below the lower edge, after the tap',h:tblx(['What the candle does','Counts?'],[['Closes below the lower edge after the tap','Yes: the inversion'],['Wicks below but closes back inside the gap','No'],['Closes below the lower edge before the tap','No: no tap, no trade']])},
  {t:'The 4 PM to 6 PM rule',h:`<p>Nothing between <b>4 PM and 6 PM</b> counts. Gaps left by the <b>6 PM open are valid</b>.</p>`},
  {t:'Why the inversion matters',h:`<p>The inversion tells you the retrace up has failed: buyers who held the gap gave way. It is the confirmation that lets you sell, and it gives you your stop: the inversion high.</p>`}],
 recall:xr('ORBIT: The Move and the Big OTE','What is a "tap"?',['Price trades up into the 0.705 of the big range','Price touches the 0 level','A candle closes above the high','A news touch'],'Near is not enough.'),
 steps:[['<b>The inversion.</b>',tblx(['Check','Needs'],[['Gap','Bullish, on the 5-minute chart, inside or just below the AOI'],['Fresh','From the same reaction and never inverted before'],['Trigger','A 5-minute close below the lower edge, after the tap'],['Time','Not between 4 PM and 6 PM']])],['<b>What does not count.</b>',tblx(['Case','Result'],[['A wick below the gap','No inversion'],['An old gap','Not used'],['A gap that was inverted before','Use the next fresh gap']])]],
 gens:[gapQ,tapQ,orderQ,deadQ],
 bank:BANKS('The 5-minute inversion',[
  ['On which chart is the inversion read?',['The 5-minute chart','The 1-minute chart','The daily chart','The 4-hour chart'],'The OTE ranges are on the 3-minute.'],
  ['Which gap do you use?',['A fresh bullish gap formed out of the same reaction','Any old gap','A bearish gap','A 4-hour gap'],'Fresh, from the same reaction.'],
  ['The gap was inverted before. What do you do?',['Use the next fresh gap','Use it again','Skip the whole week','Double the size'],'It must not have been inverted before.'],
  ['What is the inversion?',['A 5-minute candle closes below the gap\'s lower edge after the tap','A wick below the gap','A new high','A news candle'],'A close counts, a wick does not.'],
  ['A candle closes below the gap before the tap. Does it count?',['No: the inversion has to come after the tap','Yes','Only if it is big','Only in Asia'],'No tap, no trade.'],
  ['Does anything between 4 PM and 6 PM count?',['No: nothing between 4 PM and 6 PM counts','Yes','Only the close','Only the open'],'Gaps left by the 6 PM open are valid.'],
  ['Is a gap left by the 6 PM open valid?',['Yes','No','Only on Mondays','Only on news days'],'Gaps left by the 6 PM open are valid.'],
  ['What does the inversion tell you?',['The retrace has failed','The trade is over','To buy','To move the stop'],'It is the confirmation, and it gives you your stop.']]),
 examDesc:'The fresh gap, the 5-minute close below it after the tap, and the 4 PM to 6 PM rule.'});
/* ---------- b04 · internal OTE, limit, stop, target ---------- */
quick({id:'b04',o:18,ph:6,t:'ORBIT: The Internal OTE, Limit, Stop and Target',out:'Draw the internal OTE, work out the limit, the stop and the 40-point target, and apply the 15-point risk cap.',
 ls:['Step 5: the internal OTE','Your limit: the internal 0.705','Reached, not nearly','The optional one-point tolerance','Step 6: stop and maximum risk','Take profit and after you are in'],
 task:'Take three past ORBIT setups in replay. For each, draw the internal OTE from the inversion high to the lowest-wick 3-minute candle after it, work out the limit at the 0.705, the stop, the risk in points, and the 40-point target. Say which ones pass the 15-point risk rule and which are no trade.',
 learn:[
  {t:'Step 5: the internal OTE',h:tblx(['Anchor','Where it goes'],[['Anchor 1','The inversion high'],['Anchor 2','The body of the lowest-wick 3-minute candle after it, following the low']])+`<p>Like the big range, anchor 2 follows the low as new lowest wicks print.</p>`},
  {t:'Your limit: the internal 0.705',h:`<p>Your entry is a <b>limit sell at the internal 0.705</b>. Work it out from the two anchors: the 0 level plus 0.705 of the distance up to the inversion high.</p>`},
  {t:'Reached, not nearly',h:warn('<p>The 0.705 must actually be <b>reached</b>. If price turns a few ticks early, there is <b>no trade</b>. Do not chase.</p>','Missed by a few ticks')},
  {t:'The optional one-point tolerance',h:`<p>The method allows an optional tolerance of about <b>one point</b>: if price comes within a point of the level, taking the fill is fine. This costs a point of extra risk for every point you give. The starting value is <b>0</b>.</p>`},
  {t:'Step 6: stop and maximum risk',h:tblx(['Item','Rule'],[['Stop','At the inversion high. No buffer'],['Maximum risk','15 points, measured from your limit to the inversion high. If more is needed, there is no trade. The stop is never moved closer to make it fit']])+`<p>Because the limit sits 0.705 of the way up the internal range, your risk is about 0.295 of that range. A range of about 51 points or less keeps the risk within 15.</p>`},
  {t:'Take profit and after you are in',h:tblx(['Item','Rule'],[['Take profit','40 points from the limit'],['After you are in','Nothing. No break-even, no partials, no moving the stop. The trade ends at the stop or the 40-point target']])}],
 recall:xr('ORBIT: The 5-Minute Inversion','What does the inversion tell you?',['The retrace has failed','The trade is over','To buy','To move the stop'],'It is the confirmation, and it gives you your stop.'),
 steps:[['<b>A worked short.</b>',tblx(['Item','Price'],[['Inversion high (anchor 1)','29,263.00'],['Lowest-wick candle body (anchor 2)','29,225.00'],['Internal range','38.00'],['Limit: 29,225.00 + 0.705 × 38.00','29,251.79'],['Stop','29,263.00'],['Risk','11.21 points: passes'],['Target','29,211.79 (40 points lower)']])],['<b>The 15-point cap.</b>',tblx(['Risk','Result'],[['11.25','Trade'],['15.00','Trade'],['15.25','No trade'],['20.50','No trade: never move the stop closer']])]],
 gens:[intEntry,riskPts,tpPrice,maxRisk,toleranceQ,afterFill],
 bank:BANKS('The internal OTE and the limit',[
  ['Where is anchor 1 of the internal OTE?',['The inversion high','The big range high','The 0.5','The first gap'],'The highest point of the move that was flipped.'],
  ['Where is anchor 2 of the internal OTE?',['The body of the lowest-wick 3-minute candle after the inversion, following the low','The wick of the first candle','The news candle','The 5-minute close'],'It follows the low.'],
  ['Where is your entry?',['A limit sell at the internal 0.705','At market after the inversion','At the inversion high','At the 0 level'],'The 0.705 must be reached.'],
  ['Price turns a few ticks before your limit. What do you do?',['No trade','Chase it','Move the limit up','Add a second limit'],'Missed by a few ticks, no trade.'],
  ['What is the optional entry tolerance?',['About one point, which adds a point of risk for every point you give','Five points','Always on','Free'],'The starting value is 0.'],
  ['Where does the stop go?',['At the inversion high, no buffer','Above the big range','At the 0.5','Anywhere'],'No buffer.'],
  ['What is the maximum risk?',['15 points from the limit to the inversion high','40 points','5 points','There is none'],'Over 15 points is no trade.'],
  ['The stop would need to be 20 points away. What do you do?',['No trade: the stop is never moved closer to make it fit','Move the stop closer','Take half size','Widen the target'],'Risk over 15, no trade.'],
  ['What is the take profit?',['40 points from the limit','The 1 level','1R','The big range low'],'There is no break-even and no partial.'],
  ['What do you do after you are in?',['Nothing: the stop and target are fixed','Move to break-even','Take a partial','Trail the stop'],'The trade ends at the stop or the target.']]),
 examDesc:'The internal OTE, the limit, the stop, the 15-point cap, the 40-point target and what you do after the fill.'});
/* ---------- b05 · dead setups and routine ---------- */
quick({id:'b05',o:19,ph:7,flag:'Final',t:'ORBIT: When a Setup Is Dead, and Your Routine',out:'Tell a dead area from a dead entry, know what stays your call, and run a day.',
 ls:['When the area is finished','When only this entry is dead','What stays your call','Not part of ORBIT today','Rules of thumb','The candle rule','A daily routine'],
 task:'Take a week in replay. For each ORBIT setup you find, write whether the area ended, only the entry ended, or the trade ran, and what ended it. Then write the six rules of thumb on a card and put it next to your chart.',
 learn:[
  {t:'When the area is finished',h:`<p>The area of interest is <b>finished</b> (nothing more to trade from it) when:</p><ul><li>price breaks the <b>base of the move</b> (the wick is the base);</li><li>price <b>blows through the 0.705</b> and keeps going with no inversion (your read of the range was wrong);</li><li>the <b>draw</b> (the low of the move) is already taken before you get filled.</li></ul>`},
  {t:'When only this entry is dead',h:`<p>Only <b>this entry attempt</b> is dead, and the area stays alive, when the <b>inversion high breaks</b>. Another entry then needs a <b>new inversion</b> and a <b>fresh internal OTE</b>.</p>${key('<p>A failed entry does not kill the area; a failed area kills every entry from it. The two are kept separate on purpose.</p>','Two different things')}`},
  {t:'What stays your call',h:tblx(['It stays yours','Why'],[['Which move is the big move','By eye: there is no size filter'],['Bias and direction','ORBIT does not tell you whether to be long or short today'],['Whether the market suits it','It works best after consolidation and badly in one-way expansion']])},
  {t:'Not part of ORBIT today',h:`<p>Continuation entries after a first entry, any all-time-high restriction, extra confirmations (30-second inversions, SMT, CISD blocks), and running a long and a short at the same time. These are left out until they are decided.</p>`},
  {t:'Rules of thumb',h:tblx(['Situation','Rule'],[['No tap','No trade'],['No fresh gap','No trade'],['Risk over 15 points','No trade'],['Missed by a few ticks','No trade'],['After the fill','Never move the stop'],['Price runs away','Never chase']])},
  {t:'The candle rule',h:`<p>Place the limit once <b>a candle in your direction has formed</b>: a bearish candle for a short, a bullish candle for a long. Do not place it during a run of candles going against you.</p>`},
  {t:'A daily routine',h:`<ol><li>Open the 1-minute NQ chart. Pick the move you think matters.</li><li>Wait for the tap on the 0.705. Do nothing yet.</li><li>Wait for the 5-minute inversion, then work out the limit. Check the risk is 15 points or less and the target is 40 points.</li><li>Place the limit once a candle in your direction has formed.</li><li>When filled, leave it alone. The stop and target are fixed.</li><li>If the setup becomes invalid, cancel any unfilled order.</li></ol>`}],
 recall:xr('ORBIT: The Internal OTE, Limit, Stop and Target','What is the maximum risk?',['15 points from the limit to the inversion high','40 points','5 points','There is none'],'Over 15 points is no trade.'),
 steps:[['<b>Dead area or dead entry.</b>',tblx(['Event','What ends'],[['The base of the move breaks','The area'],['Blows through the 0.705, no inversion','The area'],['The draw is taken before a fill','The area'],['The inversion high breaks','Only this entry']])],['<b>Rules of thumb.</b>',tblx(['Rule','Short'],[['No tap','No trade'],['No fresh gap','No trade'],['Risk over 15','No trade'],['Missed by ticks','No trade'],['Stop','Never move it'],['Price runs','Never chase']])]],
 gens:[deadQ,yourCall,ruleThumb,routineQ,maxRisk],
 bank:BANKS('When a setup is dead and your routine',[
  ['What happens when price breaks the base of the move?',['The area is finished','Only this entry is dead','Nothing','Take the other side'],'The wick is the base.'],
  ['The inversion high breaks before your limit fills. What is dead?',['Only this entry attempt: the area stays alive','The whole area','Nothing','The day'],'Another entry needs a new inversion and a fresh internal OTE.'],
  ['Price blows through the 0.705 with no inversion. What does that mean?',['The area is finished: your read was wrong','Wait for the tap again','The inversion is coming','Enter now'],'The area is dead.'],
  ['The draw is taken before you are filled. What happens?',['The area is finished','Move the limit','Wait','Switch directions'],'Nothing left to trade toward.'],
  ['Which of these stays your call?',['Which move is the big move, and your bias','The 0.705','The stop','The target'],'No size filter, no bias.'],
  ['When does ORBIT work best?',['After consolidation, and badly in one-way expansion','In one-way expansion','Only on news days','Only at the close'],'You decide whether the market suits it.'],
  ['Which of these is not part of ORBIT today?',['Continuation entries after a first entry','The 0.705','The 40-point target','The 15-point cap'],'They are left out until decided.'],
  ['When do you place the limit?',['Once a candle in your direction has formed','During a run of candles against you','At the tap','Before the inversion'],'Bearish candle for a short, bullish for a long.'],
  ['Which is a rule of thumb?',['No tap, no trade','Chase the first move','Move the stop to break-even','Add size after a loss'],'Never move the stop. Never chase.'],
  ['The setup becomes invalid and your limit is unfilled. What do you do?',['Cancel it','Leave it','Move it','Double it'],'Cancel any unfilled order.']]),
 examDesc:'Dead areas and dead entries, what stays your call, the rules of thumb, the candle rule and the routine.'});
})();
