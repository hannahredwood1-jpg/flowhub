/* ============================================================
   ECHO X ORBIT vault · the curriculum, from the Echo x Orbit playbook: rejection blocks on NQ and MNQ, three entry models, one checklist.
   Rule settings are taught. Results, win rates, profit claims and account-size examples are not. A valid setup can still lose.
============================================================ */
const chartMod=c=>MODS.push({chart:true,...c,exam:c.exam||{bank:3,gen:c.drills.slice(0,6).map((_,i)=>[i,1])}});
const xr=(from,q,o,why)=>rc(from,q,o,why);
const T_VOCAB=tblx(['Term','Meaning'],VOCAB.map(([t,d])=>[`<b>${t}</b>`,d]));

/* ---------- x01 · the idea ---------- */
quick({id:'x01',o:1,ph:0,t:'The Idea in Plain Words and the Language',out:'Say what ECHO X ORBIT is looking for, the three rules that never bend, and what the key words mean.',
 ls:['The idea in plain words','Three rules that never bend','The language','Three entry models, one checklist','What this is and is not'],
 task:'Write the idea in your own words in three sentences: what price does at an obvious high or low, what you put at the middle of the wick, and the two things that must be there before you trade.',
 learn:[
  {t:'The idea in plain words',h:`<p>Price often pokes just past an obvious high or low to grab the orders sitting there, then fails to stay beyond it. That failed poke leaves a long wick, called a <b>rejection block</b>. You place a <b>limit order at the middle of that wick</b>, with a small stop just beyond the poke, and you aim for the next place price is being pulled to.</p><p>Everything in ECHO X ORBIT exists to answer one question: <b>is this the rejection that price has to respect?</b></p>`+key('<p>This is education. The rules keep each loss small and stop you trading after a win. A valid setup can still lose, and nothing here is a promise of results.</p>','Read this first')},
  {t:'Three rules that never bend',h:`<ol><li><b>The poke must come out of a higher-timeframe gap</b> (1-hour or 4-hour). No gap behind it, no trade.</li><li><b>There must be a place for price to go</b>, called a draw on liquidity. No draw, no trade.</li><li><b>You stop for the day after one win, or after two losses.</b></li></ol>`},
  {t:'The language',h:`<p>These words are used in every module. Learn them now and the rest reads easily.</p>${T_VOCAB}`},
  {t:'Three entry models, one checklist',h:tblx(['Model','What it is','When you use it'],[['<b>Model 1</b>','The external rejection block','The main model. A sweep of external liquidity, rejected out of a higher-timeframe gap'],['<b>Model 2</b>','The CISD rejection block','Price has flipped direction and you want confirmation, or you missed the Model 1 entry'],['<b>Model 3</b>','The 1-minute continuation','A quick trend-following scalp, only when there is no nearby draw to trade into']])+`<p>All three share one checklist (module 12) and one set of daily rules.</p>`},
  {t:'What this is and is not',h:`<ul><li>It is a method for taking a rejection at a defined price, with a defined stop and target.</li><li>It is not a signal service and not a prediction. Price has to give you the setup.</li><li>The indicator marks the mechanical part. You build the narrative first (module 3), then use the indicator as a second opinion.</li><li>Where the indicator had to choose a number the source does not give, that number is an indicator default that you can change. The modules say so when it matters.</li></ul>`}],
 recall:xr('Liquidity Explained','What happens at a liquidity sweep?',['Price trades through an obvious high or low, takes the orders there, and can come back','Price breaks out and never returns','Orders are cancelled for the day','Nothing: it is only a drawing'],'A sweep takes the stops resting beyond a level. What price does next is the whole question.'),
 steps:[['<b>The idea in one picture.</b>',tblx(['Step','What happens'],[['1','Price pokes past an obvious high or low'],['2','The candle fails to close beyond it, leaving a long wick'],['3','You put a limit at the middle of the wick'],['4','Stop just beyond the poke, target at the next place price is pulled to']])],['<b>The three rules.</b>',tblx(['Rule','If it is missing'],[['A higher-timeframe gap behind the poke','No trade'],['A draw on liquidity','No trade'],['One win or two losses today','Stop for the day']])],['<b>The three models.</b>',tblx(['Model','In one line'],[['1','Sweep, rejected out of a gap'],['2','A retested CISD'],['3','A 1-minute scalp when there is no draw nearby']])]],
 gens:[vocabQ,termQ],
 bank:BANKS('The idea',[
  ['What does ECHO X ORBIT look for?',['A rejection price has to respect: a poke past a level that fails to hold','The first candle of the day','A news release','Any wick'],'The question behind every rule is whether this is the rejection price has to respect.'],
  ['Where does the limit order go?',['At the middle of the rejection wick','At the extreme of the wick','At the close of the candle','At a round number'],'The midpoint (CE) of the wick.'],
  ['What must the poke come out of?',['A higher-timeframe gap (1-hour or 4-hour)','A news candle','A 1-minute gap','The weekly open'],'No higher-timeframe gap behind it, no trade.'],
  ['What is a draw on liquidity?',['The price that is pulling the market: your target and your allowed direction','A type of order','A news event','The stop price'],'No draw, no trade.'],
  ['When do you stop trading for the day?',['After one win, or after two losses','After three trades','At noon','Only when you are up'],'One win or two losses.'],
  ['Which model is the main model?',['Model 1: the external rejection block','Model 2','Model 3','There is no main model'],'Models 2 and 3 are for confirmation, re-entry and scalps.'],
  ['When is Model 3 used?',['Only when there is no nearby draw to trade into','Always','Only on news days','Only in Asia'],'It is a quick trend-following scalp.'],
  ['Is a valid setup guaranteed to win?',['No: a valid setup can still lose','Yes if it is graded A+','Yes if there is a draw','Yes in the morning'],'The rules keep losses small. They do not remove them.'],
  ['What does the indicator do?',['Marks the mechanical part of the method and sends alerts','Predicts the day','Places the orders','Replaces your narrative'],'You build the narrative first.'],
  ['What is a rejection block?',['A wick that goes past a level holding liquidity while the candle does not close beyond it','A candle that closes beyond a level','A gap','A news candle'],'The wick is the block.']]),
 examDesc:'The idea, the three rules that never bend, the language, and the three entry models.'});

/* ---------- x02 · instruments, sessions and news ---------- */
quick({id:'x02',o:2,ph:0,t:'Instruments, Sessions and News',out:'Say what you chart, what you trade, when the models work best, and what to do around news.',
 ls:['What you chart and what you trade','The best session','News','Size against your firm\'s loss limit','The indicator\'s session windows'],
 task:'Open NQ1! and MNQ1! and ES1!. Write down which one you chart, which one you would place orders on, and which one you keep open only to read divergence. Then write the time of the next 8:30 news release this week.',
 learn:[
  {t:'What you chart and what you trade',h:tblx(['Item','Rule'],[['Chart and execute','Chart NQ, execute MNQ. 10 micros equal 1 mini. Micros let you take partial profit in clean pieces.'],['ES','Keep ES open beside NQ only to read SMT divergence.']])},
  {t:'The best session',h:`<p>The <b>New York morning, around the 9:30 open</b>, is the best session for the models. Asia and London work with the same model, but skip them when price action is bad, and do not leave limit orders overnight in bad conditions.</p>`},
  {t:'News',h:`<p>Around <b>CPI, FOMC and 8:30 data</b>, widen the stop (up to 15 points) or stand aside until price has rebalanced. News moves price fast in both directions, so a normal 10-point stop can be swept in seconds.</p>`},
  {t:'Size against your firm\'s loss limit',h:`<p>Size against <b>your firm's loss limit</b>, not the account balance. Size so that <b>two full losses in a day cannot breach the daily limit</b>. If a 10-point loss bothers you, the size is wrong.</p>`+key('<p>This course does not give a size table, because the right size depends on your own firm, account and rules. Work it out from your limit, and write it down.</p>','Your size, your rules')},
  {t:'The indicator\'s session windows',h:`<p>The source does not give exact clock times for the sessions, so the indicator uses defaults that you can change in the settings:</p>${tblx(['Window','Indicator default'],[['Asia','6 PM to 2 AM'],['London','2 AM to 7 AM'],['New York morning (optional switch)','9:30 AM to 12:00 PM']])}<p>All times are New York time. Change them if you use different times.</p>`}],
 recall:xr('The Idea in Plain Words and the Language','What must a rejection come out of?',['A 1-hour or 4-hour gap','A news candle','The weekly open','Nothing in particular'],'A higher-timeframe gap. No gap, no trade.'),
 steps:[['<b>Chart and trade.</b>',tblx(['Chart','Trade','Keep open'],[['NQ','MNQ','ES (for SMT)']])],['<b>Sessions.</b>',tblx(['Session','Use'],[['New York morning','Best: around the 9:30 open'],['Asia and London','Same model: skip when price action is bad']])],['<b>News.</b>',tblx(['Release','Action'],[['CPI, FOMC, 8:30 data','Widen the stop to up to 15 points, or stand aside until price rebalances']])]],
 gens:[instrQ,instrQ],
 bank:BANKS('Instruments and sessions',[
  ['Which contract do you place orders on?',['MNQ','ES','NQ with the biggest size','Any one'],'Chart NQ, execute MNQ.'],
  ['How many micros equal one mini?',['10','5','2','20'],'10 micros equal 1 mini.'],
  ['Why are micros useful for this method?',['They let you take partial profit in clean pieces','They are always cheaper','They never lose','They need no stop'],'Partials are part of the plan.'],
  ['What is ES open beside NQ for?',['Reading SMT divergence','Placing orders','Setting the stop','Nothing'],'Divergence at a key level favours a reversal.'],
  ['Which session is best?',['New York morning around the 9:30 open','Asia','The lunch hour','The close'],'Asia and London use the same model but need good price action.'],
  ['In bad conditions, what about limit orders overnight?',['Do not leave them','Leave them for luck','Double them','Move them closer'],'Do not leave limit orders overnight in bad conditions.'],
  ['What do you do around CPI, FOMC and 8:30 data?',['Widen the stop (up to 15 points) or stand aside until price rebalances','Tighten the stop','Add size','Ignore it'],'News can sweep a normal stop in seconds.'],
  ['What do you size against?',['Your firm\'s loss limit','The account balance','Your last trade','The gap size'],'So that two full losses in a day cannot breach the daily limit.'],
  ['The indicator\'s Asia window default is…',['6 PM to 2 AM','12 AM to 2 AM','9 PM to 4 AM','8 AM to 12 PM'],'An indicator default you can change.'],
  ['Why does the indicator use default session times?',['The source does not give exact clock times','The exchange sets them','They never change','They are required by law'],'They are marked as assumptions and can be changed.']]),
 examDesc:'Chart versus execute, the best session, news days, sizing against your firm\'s limit, and the indicator\'s session defaults.'});

/* ---------- x03 · the narrative ---------- */
chartMod({id:'x03',o:3,ph:0,t:'Step 1: Build the Narrative',out:'Mark the gaps, pick the draw, locate yourself in the range and say which direction you are allowed to trade.',
 ls:['No draw, no trade','The six steps, in order','Which gaps count','Premium and discount','External and internal','Direction rules'],
 task:'Before tomorrow\'s session, do the six steps on NQ: mark the 1H and 4H gaps, the key opens and the liquidity, pick the draw, say whether price is in premium or discount, and write the direction you are allowed to trade and why.',
 ex:()=>narrScn(rr(1303),{side:'long'}),
 learn:[
  {t:'No draw, no trade',h:key('<p>Before any entry, build the narrative. If you cannot name a draw on liquidity, there is no trade today. The narrative tells you the direction, the target and where you are in the range.</p>','The rule')},
  {t:'The six steps, in order',h:`<ol><li><b>Mark the 1H and 4H gaps.</b> Note which are unfilled above and below price. These are your narrative.</li><li><b>Mark the key opens:</b> midnight (the true day open), 6 PM, 8 PM, 10 AM (valid from 10 AM to the next day's 10 AM), 4-hour opens, and the new-week opening gap.</li><li><b>Mark liquidity:</b> prominent 1-hour highs and lows, equal highs and lows, Asia and London highs and lows, and the previous day's high and low.</li><li><b>Pick the draw.</b> The nearest unfilled 1H or 4H gap, key open or untaken high or low in your direction. It is your target and your bias.</li><li><b>Locate yourself in the range.</b> Premium favours shorts and discount favours longs. Within about 50 to 100 points of the prominent high or low you are external.</li><li><b>Read the bigger picture.</b> The higher timeframe moves in legs of 200 to 300 points. Even a strongly bearish day needs pullbacks.</li></ol>`},
  {t:'Which gaps count',h:`<p>A fair value gap is three candles where the first candle's wick and the third candle's wick do not overlap. A gap price has already traded back into is <b>filled</b> and finished. Only <b>unfilled</b> gaps are draws. On the 1-hour and 4-hour charts they are the narrative.</p>`},
  {t:'Premium and discount',h:`<p>Take the prominent high and the prominent low on the 1-hour chart and draw the 50% line. <b>Below the line is discount, which favours longs. Above it is premium, which favours shorts.</b> Where you are in the range tells you which side of the market is cheap.</p>`},
  {t:'External and internal',h:`<p><b>External</b> means at or near the prominent high or low of the range, within roughly 50 to 100 points. <b>Internal</b> means deeper inside the range. External is stronger, so sweeping the high that started the range beats sweeping a small high inside it.</p>`},
  {t:'Direction rules',h:tblx(['Rule','Why'],[['Never trade against your draw. If the draw is higher, look only for longs.','The trade needs somewhere to go.'],['If the draw has already been hit, that trade is finished. Do not enter toward a target that is gone.','Nothing is left pulling price.'],['Never short all-time highs.','Nothing is above to pull price. Use the 1-minute continuation (Model 3) there instead.'],['After a news expansion of 200 to 400 points, price must rebalance. For shorts after a dump, the best entries sit around the 70.5% to 75% level of the range drawn from the swing high to the swing low on the 5-minute chart, refined by a rejection or CISD.','Price usually comes back toward the middle of the move.']])}],
 recall:xr('Instruments, Sessions and News','Which session is best for the models?',['New York morning around the 9:30 open','Asia','The afternoon lunch hour','The close'],'The New York morning, around the 9:30 open.'),
 see:nvSee,
 sum:e=>({ov:nvZones(e)}),
 drills:[nvTap,nvUnfilled,nvBox,nvLocate,nvMid,nvDirection,dirQ,extQ,narrOrder],
 bank:[
  mcq('Narrative','What do you need before any entry?',['A draw on liquidity: no draw, no trade','A news release','A green candle','A 1-minute gap'],'The draw is your target and your bias.'),
  mcq('Narrative','Which gaps are draws?',['Unfilled 1-hour and 4-hour gaps','Every gap on every timeframe','Filled gaps','Gaps on the 1-minute chart only'],'A filled gap is finished.'),
  mcq('Narrative','Price is in discount. What does that favour?',['Longs','Shorts','Nothing','Only news trades'],'Below the 50% line is discount, which favours longs.'),
  mcq('Narrative','Price is in premium. What does that favour?',['Shorts','Longs','Nothing','Only Asia trades'],'Above the 50% line is premium, which favours shorts.'),
  mcq('Narrative','Which is stronger: sweeping the external high or a small internal one?',['The external high','The internal high','They are equal','Neither is valid'],'External beats internal.'),
  mcq('Narrative','The higher timeframe usually moves in legs of about…',['200 to 300 points','5 to 10 points','1,000 points','30 points'],'Even a strongly bearish day needs pullbacks.'),
  mcq('Narrative','The draw has already been hit. What is the status of that trade?',['Finished: do not enter toward a target that is gone','Still valid for one more hour','Valid at half size','Valid on the 5-minute chart'],'Nothing is left pulling price.'),
  mcq('Narrative','Which key opens do you mark?',['Midnight, 6 PM, 8 PM, 10 AM, 4-hour opens and the new-week gap','Only the 9:30 open','Only the daily close','Only Monday\'s high'],'Key opens act as targets and as reaction points.')],
 examDesc:'Marking gaps and key opens, filled versus unfilled, the draw, premium and discount, external and internal, and direction rules.'});

/* ---------- x04 · rejection blocks and CISD ---------- */
chartMod({id:'x04',o:4,ph:1,t:'Rejection Blocks and CISD',out:'Find a valid rejection wick, pick the most rejected one, and find a CISD and its retest.',
 ls:['The rejection block','External beats internal','Scale down for precision','Not every wick counts','The CISD','The retest, and when it never comes'],
 task:'Find three rejection wicks on a 5-minute chart in replay. For each one write: the level it swept, whether the candle closed beyond it, and where the midpoint is. Then find one CISD and its retest.',
 ex:()=>m1Scn(rr(1304),{side:'short',outcome:'target',decoy:true}),
 learn:[
  {t:'The rejection block',h:`<p>Two things make a rejection block valid: price <b>sweeps</b> a liquidity level, and the candle <b>fails to close beyond it</b>. Even one point of failure counts. The entry is the <b>midpoint of the wick</b>.</p>`},
  {t:'External beats internal',h:`<p>Sweeping the high that started the range is stronger than sweeping a small high inside it. When you have a choice, take the external rejection.</p>`},
  {t:'Scale down for precision',h:`<p>Find the rejection on the 15-minute or 1-hour chart, then look at the 5-minute and 1-minute charts and take the <b>single most rejected wick</b>: the longest wick that did not close beyond the level. Inside a gap, take the longest wick that did not close through the gap. A deeper wick that later closed through the gap is not valid.</p>`},
  {t:'Not every wick counts',h:warn('<p>A random wick late in the day with nothing behind it gets blown through. Only mark wicks that reject out of a gap and have other confluence.</p>')},
  {t:'The CISD',h:`<p>A <b>CISD</b> (change in state of delivery) is a candle that closes beyond the open of the last candle or candles of the opposite colour that drove the move.</p><ul><li><b>Bullish CISD:</b> a candle closes <b>above</b> the open of the red candle or candles that drove the last leg down. Bearish is the mirror. (Red means a down candle and green an up candle. The chart shows them as blue and white until you switch the candle colours.)</li><li>If price cannot close beyond the external candle (the one that started the range), settle for the internal CISD. It is weaker.</li><li>A CISD can be on any timeframe, but it must point toward your draw.</li></ul>`},
  {t:'The retest, and when it never comes',h:`<p>A CISD needs a <b>retest</b>: price comes back, wicks into the CISD level and does not close through it. That wick is a CISD rejection block, and you enter at its midpoint.</p><p>If there is <b>no retest within about 10 to 15 candles</b>, the CISD stops being an entry and becomes <b>liquidity</b>. Expect it to be swept, and enter at the midpoint of the wick of the candle that <i>caused</i> the CISD.</p>`}],
 recall:xr('Step 1: Build the Narrative','What do you need before any entry?',['A draw on liquidity','A news release','A green candle','A 1-minute gap'],'No draw, no trade.'),
 see:e=>{const a=m1See(e),m2=m2Scn(rr(2304),{side:'long',outcome:'target'}),b=m2See(m2);return[a[1],a[2],{...b[2],sc:m2},{...b[3],sc:m2}]},
 sum:e=>({ov:m1Ov(e)}),
 drills:[m1TapMost,wickValid,m2Level,m2Confirm,m2Retest,cisdQ],
 bank:[
  mcq('Rejection','Two things make a rejection block valid. What are they?',['Price sweeps a liquidity level and the candle fails to close beyond it','A big candle and a news release','A gap and a retest','Two green candles'],'Sweep, then fail to close beyond.'),
  mcq('Rejection','How much failure to close counts?',['Even one point','At least 10 points','At least a full candle','None: closing beyond is fine'],'Even one point of failure counts.'),
  mcq('Rejection','Which wick do you take when several reject the same level?',['The single most rejected wick: the longest that did not close beyond the level','The first wick','The shortest wick','The last wick'],'Scale down and take the most rejected wick.'),
  mcq('Rejection','Inside a gap, which wick is valid?',['The longest wick that did not close through the gap','Any deeper wick, even if it later closed through the gap','The highest wick','The wick at the open'],'A deeper wick that later closed through the gap is not valid.'),
  mcq('CISD','What is a bullish CISD?',['A candle closes above the open of the red candles that drove the last leg down','A candle wicks above a high','A gap forms','The 50% line is touched'],'The close decides, not the wick.'),
  mcq('CISD','Which CISD is stronger?',['The external one','The internal one','They are the same','Neither'],'If price cannot close beyond the external candle, settle for the internal CISD.'),
  mcq('CISD','What does a CISD need before it becomes an entry?',['A retest','A news release','A second gap','Nothing'],'Price must come back, wick into the level and not close through it.'),
  mcq('CISD','After about 10 to 15 candles with no retest, a CISD becomes…',['Liquidity: expect it to be swept','A stronger entry','Invalid forever','A target'],'Enter at the midpoint of the wick of the candle that caused it.')],
 examDesc:'Valid rejections, the most rejected wick, the CISD, its retest, and what happens when there is none.'});

/* ---------- x05 · gaps by timeframe, order blocks, SMT and key opens ---------- */
quick({id:'x05',o:5,ph:1,t:'Gaps by Timeframe, Order Blocks, SMT and Key Opens',out:'Say what role each timeframe\'s gap plays, and what stacks confluence.',
 ls:['Fair value gaps by timeframe','How big a gap needs to be treated','A gap that has been closed through','Order blocks, SMT and key opens','The invalidation rule'],
 task:'On a 1-hour chart, find one unfilled 1-hour gap. On the 15-minute chart inside it, find a smaller gap. Write which one is the narrative and which one only adds confidence.',
 learn:[
  {t:'Fair value gaps by timeframe',h:tblx(['Timeframe','Role'],[['4-hour, 1-hour','Narrative and draw. Entries are delivered out of these. Target unfilled ones.'],['15-minute, 5-minute','Confirmation only. A gap at your rejection adds confidence. Never the narrative.'],['1-minute alone','Chop. Valid only inside the 1-minute continuation (Model 3).']])+`<p>Every trade needs a higher-timeframe gap it delivers out of.</p>`},
  {t:'How big a gap needs to be treated',h:`<p>When a gap is large (7 to 10 or more points), price should <b>trade into at least its midpoint</b> before you trust the rejection. A small gap (2 to 5 points) only needs the retest wick to reject it.</p>`},
  {t:'A gap that has been closed through',h:`<p>A gap price has <b>closed through</b> flips meaning. Do not trade its original side.</p>`},
  {t:'Order blocks, SMT and key opens',h:`<p>These <b>stack confluence</b>. They never replace the gap.</p>${tblx(['Item','How it is used'],[['Order block','Consecutive aligned candles with no unfilled orders between them. Used at its 50% and never alone.'],['SMT divergence','NQ and ES disagree at a key level. It favours a reversal and needs a slightly wider stop.'],['Key opens','Act as targets and as reaction points.']])}`},
  {t:'The invalidation rule',h:key('<p>Once price <b>closes through a level on its own timeframe</b>, the level is dead. There is no "inverse rejection block" used as support afterward. If a gap\'s midpoint has already been filled and played, do not take it again.</p>','Every level')}],
 recall:xr('Rejection Blocks and CISD','What does a CISD need before it becomes an entry?',['A retest','A news release','A second gap','Nothing'],'A retest.'),
 steps:[['<b>Roles by timeframe.</b>',tblx(['Gap','Role'],[['1-hour or 4-hour','Narrative and draw'],['15-minute or 5-minute','Confirmation only'],['1-minute alone','Chop: Model 3 only']])],['<b>Big or small gap.</b>',tblx(['Gap size','What you wait for'],[['2 to 5 points','The retest wick rejects the gap'],['7 to 10 or more points','Price trades into at least its midpoint first']])],['<b>Stacking.</b>',tblx(['Confluence','Effect'],[['A 15-minute gap inside a 1-hour gap','Lifts the grade'],['SMT, order block or key open at the level','Adds confluence'],['A level closed through','Dead: do not use it']])]],
 gens:[tfRole,gapSize,wickValid],
 bank:BANKS('Gaps and confluence',[
  ['What role do 4-hour and 1-hour gaps play?',['Narrative and draw','Confirmation only','Chop','None'],'Entries are delivered out of them and unfilled ones are targets.'],
  ['What role do 15-minute and 5-minute gaps play?',['Confirmation only','The narrative','The draw','They are ignored'],'They add confidence at your rejection and are never the narrative.'],
  ['When is a 1-minute gap on its own valid?',['Only inside the 1-minute continuation (Model 3)','Always','Never','Only on Monday'],'On its own it is chop.'],
  ['A gap is large (7 to 10+ points). What do you wait for?',['Price to trade into at least its midpoint','Nothing','A second candle','The close'],'Then you trust the rejection.'],
  ['A gap price has closed through…',['Flips meaning: do not trade its original side','Is stronger','Is a target','Is the draw'],'The level is dead.'],
  ['How is an order block used?',['At its 50% and never alone','Alone at its high','As the narrative','As the stop'],'It stacks confluence.'],
  ['What does SMT divergence suggest?',['A reversal, so leave a slightly wider stop','A continuation','No trade','A smaller target'],'NQ and ES disagree at a key level.'],
  ['What do key opens act as?',['Targets and reaction points','Stops','Orders','Nothing'],'They also raise the grade.'],
  ['A gap\'s midpoint was already filled and played. Do you take it again?',['No','Yes at half size','Yes on the 1-minute','Only on news days'],'Never re-take a level that already played.'],
  ['After price closes through a level on its own timeframe, the level is…',['Dead','Stronger','A draw','A stop'],'There is no inverse rejection block used as support afterward.']]),
 examDesc:'Gap roles by timeframe, gap size, closed-through gaps, order blocks, SMT, key opens and the invalidation rule.'});

/* ---------- x06 · Model 1 ---------- */
chartMod({id:'x06',o:6,ph:2,t:'Model 1: The External Rejection Block',out:'Take a Model 1 setup from the sweep to the limit, stop and target, and know the three ways it can go.',
 ls:['The conditions','The execution','An untapped gap just beyond','Choosing the exact entry','The escalation ladder'],
 task:'Find one Model 1 setup on a 5-minute chart in replay: a sweep of external liquidity out of a 1-hour gap. Write the swept level, the wick midpoint you would use, the stop, the first draw, and what the price did next.',
 ex:()=>m1Scn(rr(1306),{side:'short',outcome:'target'}),
 learn:[
  {t:'The conditions',h:`<p>Model 1 is the main model: a sweep of external liquidity, out of a higher-timeframe gap, entered at the midpoint of the most rejected wick. The example is a short. Reverse everything for a long.</p><ol><li>Price is in premium and pushes into a 1H or 4H gap (ideally with an order block or key open there).</li><li>Price sweeps a liquidity pool (equal highs, a session high, the external high) with a wick.</li><li>The candle fails to close above the swept high. A second failed attempt is even better.</li><li>There is a draw below: an unfilled 1H or 4H gap, the midnight open, or a prominent low.</li></ol>`},
  {t:'The execution',h:`<ol><li>Spot the rejection on the 15-minute or 1-hour chart.</li><li>Scale down to the 5-minute, then the 1-minute, and find the single most rejected wick.</li><li>Put a limit order at that wick's midpoint while price is still in the area.</li><li>Stop: 10 points is standard. Use 12 to 12.5 if an SMT sweep of the high is likely, and up to 15 on news days.</li><li>Target: the first draw on liquidity (the default is 40 points, 1:4). Take half there and run the rest to the next draw.</li></ol>`},
  {t:'An untapped gap just beyond',h:`<p>If an untapped higher-timeframe gap sits just beyond your rejection, price often runs up to tap it and takes your stop. Either <b>wait for the gap to be tapped</b> and take a CISD rejection out of it (preferred), or <b>scale down the wick so your stop sits inside the gap</b>.</p>`},
  {t:'Choosing the exact entry',h:`<p>The best entry is the rejection wick midpoint that sits <b>closest to the midpoint of the higher-timeframe gap</b> you are trading out of. When the two sit together, the rejection is concentrated in one spot.</p><ol><li>Mark the midpoint of the 1H or 4H gap that gives you the idea.</li><li>Mark the midpoint of the higher-timeframe rejection wick.</li><li>Scale down: the 15-minute rejection wick midpoint, then the 5-minute, then the 1-minute.</li><li>Use the one closest to the gap midpoint.</li></ol><p>If they do not line up, you have three choices, based on how much room your account has: the most external entry deepest in the gap (most precise, may not fill), fade the trade, or take the higher-timeframe midpoint with less conviction and a smaller size.</p>`},
  {t:'The escalation ladder',h:`<ol><li>The higher-timeframe midpoint out of the gap, when price action is good and a CISD backs it.</li><li>If it has already played, been edged, or price action is bad: the 15-minute rejection midpoint inside the wick.</li><li>If that fails: the 5-minute rejection midpoint, the most external point, leaving room to sweep the extreme and still reach the target.</li></ol>`}],
 recall:xr('Rejection Blocks and CISD','Which wick do you take when several reject the same level?',['The single most rejected wick','The first wick','The shortest wick','The last wick'],'The longest wick that did not close beyond the level.'),
 see:m1See,
 sum:e=>({ov:[...m1Ov(e),m1Draw(e),...m1Trade(e,e.iB+1)]}),
 drills:[m1TapMost,m1Limit,m1Closest,m1StopTarget,m1Outcome,m1Untapped],
 bank:[
  mcq('Model 1','What is Model 1?',['A sweep of external liquidity, rejected out of a higher-timeframe gap, entered at the midpoint of the most rejected wick','A 1-minute scalp','A CISD retest','A news trade'],'It is the main model and the cleanest way to catch a top or bottom.'),
  mcq('Model 1','Where does the limit order go?',['At the midpoint of the most rejected wick','At the extreme of the wick','At the close of the candle','At the gap\'s far edge'],'Wick midpoint (CE).'),
  mcq('Model 1','What is the standard stop?',['10 points','3 points','30 points','There is no stop'],'12 to 12.5 for a likely SMT sweep, up to 15 on news days.'),
  mcq('Model 1','What is the default target?',['The first draw on liquidity (40 points, 1:4)','The previous day\'s high','Always 100 points','The entry plus the stop'],'Take half at the first draw and run the rest to the next draw.'),
  mcq('Model 1','An untapped higher-timeframe gap sits just beyond your rejection. What is preferred?',['Wait for the gap to be tapped, then take a CISD rejection out of it','Enter anyway with the standard stop','Skip the whole week','Remove the stop'],'Or scale down the wick so the stop sits inside the gap.'),
  mcq('Model 1','Which wick midpoint makes the best entry?',['The one closest to the midpoint of the higher-timeframe gap','The highest one','The lowest one','The first one'],'The rejection is concentrated in one spot.'),
  mcq('Model 1','The 1H or 4H gap midpoint and the wick midpoint do not line up. Which is NOT one of the choices?',['Remove the stop','The most external entry deepest in the gap','Fade the trade','The higher-timeframe midpoint with less conviction and a smaller size'],'Never remove the stop.'),
  mcq('Model 1','Price came within 2 points of your limit, turned, and never filled it. What is that called?',['Being edged','A stop-out','A partial','A hard exit'],'After being edged, refine to the aligned entry and use 40, not 45.')],
 examDesc:'Model 1 conditions, picking the wick, the limit, stop and target, an untapped gap beyond, and the three outcomes.'});

/* ---------- x07 · Model 2 ---------- */
chartMod({id:'x07',o:7,ph:2,t:'Model 2: The CISD Rejection Block',out:'Take a Model 2 setup: a CISD, its retest, the limit, and the hard exit.',
 ls:['When you use it','The conditions','The execution','Which timeframe to enter on','The hard exit','When the retest never comes'],
 task:'Find a CISD on the 5-minute chart in replay that points at an unfilled higher-timeframe gap. Mark the CISD level, find the retest wick, and write the limit, the stop and the exit rule.',
 ex:()=>m2Scn(rr(1307),{side:'long',outcome:'target'}),
 learn:[
  {t:'When you use it',h:`<p>Use Model 2 when price has <b>flipped direction</b> and you want confirmation, or when you <b>missed the Model 1 entry</b> and want a re-entry into the same move. The example is a long. Reverse everything for a short.</p>`},
  {t:'The conditions',h:`<ol><li>Price has rejected out of a higher-timeframe gap (or rejection block, or order block) toward your draw. You may have missed that entry.</li><li>On the way back, price failed to create the opposite CISD: the bullish leg still holds structure.</li><li>A bullish CISD forms. Prefer the external one.</li><li>Price retests the CISD level and does <b>not</b> close below it. Several wicks into it with no close are even better.</li><li>Your draw is above, for example an unfilled 4-hour gap.</li></ol>`},
  {t:'The execution',h:`<ol><li>Mark the wick that retested the CISD and place a limit at its midpoint.</li><li>Stop about 10 to 12 points, beyond the CISD and the wick. A CISD stop is usually wider than a pure rejection block stop.</li><li><b>Hard exit:</b> if the next candle closes back through the CISD level, close the trade immediately, wherever price is. Even if it would have hit the target later, the rule stands.</li><li>Target the draw, and take a partial at the first one.</li></ol>`},
  {t:'Which timeframe to enter on',h:tblx(['Situation','Rule'],[['1-hour rejection off a 1-hour CISD retest','Enter at the midpoint of the 1-hour wick. Scaling to the 5-minute here often misses the exact turn.'],['1-hour rejection out of a 1-hour gap with no CISD (it just rejected)','Scale down to the 5-minute rejection block for the entry.'],['15-minute and 5-minute','Same logic: a retested CISD on that timeframe means enter at that timeframe\'s midpoint.']])},
  {t:'The hard exit',h:key('<p>A close back through the CISD level means the level that justified the trade is gone. You exit at once. It is a rule, not a prediction about what price does next.</p>','Why it is a rule')},
  {t:'When the retest never comes',h:`<p>If the CISD is never retested after about 10 to 15 candles, it stops being an entry and becomes liquidity. Use the midpoint of the wick of the candle that caused it, and expect it to be swept. When many confluences stack, a half-size entry at the first level and a full-size add at the deeper level is acceptable, because the loss is small if the level fails.</p>`}],
 recall:xr('Model 1: The External Rejection Block','What is the standard stop for Model 1?',['10 points','3 points','30 points','There is no stop'],'10 points is the standard; Model 2 is usually wider.'),
 see:m2See,
 sum:e=>({ov:[...m2Ov(e),m2Cis(e,e.runI[0])]}),
 drills:[m2Level,m2Confirm,m2Retest,m2Limit,m2Exit,m2NoRetest],
 bank:[
  mcq('Model 2','When do you use Model 2?',['When price has flipped direction and you want confirmation, or you missed the Model 1 entry','Only at all-time highs','Only on news days','Only on the 1-minute chart'],'It is a confirmation and re-entry model.'),
  mcq('Model 2','What must happen at the CISD level on the retest?',['Price wicks into it and does not close through it','Price closes through it','Price gaps over it','Nothing'],'Several wicks with no close are even better.'),
  mcq('Model 2','Where does the limit go?',['At the midpoint of the wick that retested the CISD','At the CISD level exactly','At the top of the leg','At the stop'],'Wick midpoint.'),
  mcq('Model 2','About how wide is a CISD stop?',['About 10 to 12 points, beyond the CISD and the wick','2 points','30 points','No stop'],'Usually wider than a pure rejection block stop.'),
  mcq('Model 2','What is the hard exit?',['If the next candle closes back through the CISD level, close the trade immediately','Move the stop to 5 points','Add to the trade','Wait for the target'],'Even if it would have hit target later, the rule stands.'),
  mcq('Model 2','You enter on a 1-hour rejection off a 1-hour CISD retest. Which midpoint?',['The 1-hour wick midpoint','The 5-minute midpoint','The 1-minute midpoint','The 4-hour midpoint'],'Scaling to the 5-minute here often misses the exact turn.'),
  mcq('Model 2','A 1-hour rejection out of a gap with no CISD. Which timeframe for the entry?',['Scale down to the 5-minute rejection block','Stay on the 1-hour midpoint','The 4-hour midpoint','The daily open'],'Same entry logic, different timeframe.'),
  mcq('Model 2','The CISD is never retested after 10 to 15 candles. It is now…',['Liquidity: use the midpoint of the wick of the candle that caused it','A stronger entry','Void with no use','The target'],'Expect it to be swept.')],
 examDesc:'Model 2 conditions, the CISD level, the retest, the limit, the hard exit, and no retest.'});
