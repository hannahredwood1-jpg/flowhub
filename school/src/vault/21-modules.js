/* ============================================================
   ECHO X ORBIT vault · the curriculum, continued: Model 3, grading, stops and targets, why trades lose, the daily rules,
   the indicator, and the final call.
============================================================ */

/* ---------- x08 · Model 3 ---------- */
chartMod({id:'x08',o:8,ph:2,t:'Model 3: The 1-Minute Continuation',out:'Say when the 1-minute continuation is allowed, and take it with its own stop and target.',
 ls:['When it is allowed','The rules','Stop, target and what not to do','Which retests qualify'],
 task:'On a 1-minute chart at an all-time high or a trending day in replay, find a 1-minute gap and a 1-minute CISD. Write whether price rejected both, where the limit goes, and the stop and target.',
 ex:()=>m3Scn(rr(1308),{side:'long',outcome:'target'}),
 learn:[
  {t:'When it is allowed',h:`<p>Model 3 is a quick 1:2 trend-following scalp. It is used <b>only</b> when there is no nearby draw to trade into. Breaking any one rule voids the setup.</p>${tblx(['Allowed when (at least one)','Not allowed when'],[['Price is at an all-time high (no draw above)<br>The draw is very far away (100 to 200+ points) and price is trending to it<br>You missed the main move and want to join the trend','There are unfilled 1H or 4H gaps or other draws nearby on either side (then trade Models 1 and 2)<br>The draw is about to be hit']])}`},
  {t:'The rules',h:`<p>The example is a long. Reverse everything for a short.</p><ol><li><b>1-minute chart only.</b> Do not pair it with higher timeframes.</li><li>Price creates a bullish 1-minute gap <b>and</b> a bullish 1-minute CISD (internal or external).</li><li>Price comes back and rejects out of <b>both</b> the gap and the CISD with no close through either. Rejecting only one does not qualify.</li><li>Small gap (2 to 5 points): the retest wick must reject the gap. Large gap (7 to 10+ points): price must trade into at least the gap's midpoint and close back above it.</li><li>Place the limit at the midpoint of the wick that retested both.</li></ol>`},
  {t:'Stop, target and what not to do',h:`<p><b>Stop 10 points (15 to be safe), target 30 points (1:2).</b> Take it and call it a day.</p><ul><li>Do not re-use the same 1-minute midpoint after it has played. The 1-minute is choppy.</li><li>Do not take a later retest of a 1-minute continuation level. That is just a CISD rejection block and needs higher-timeframe backing.</li></ul>`},
  {t:'Which retests qualify',h:tblx(['The retest candle','Qualifies?'],[['Wicks into the gap and through the CISD level, closes back above both','Yes'],['Wicks into the gap but closes below the CISD level','No: it only rejected one'],['Touches only the CISD level and never reaches the gap','No: it only rejected one']])}],
 recall:xr('Model 2: The CISD Rejection Block','What is the hard exit?',['If the next candle closes back through the CISD level, close the trade immediately','Move the stop to 5 points','Add to the trade','Wait for the target'],'Even if it would have hit target later, the rule stands.'),
 see:m3See,
 sum:e=>({ov:m3Ov(e)}),
 drills:[m3TapGap,m3Cisd,m3Qual,m3Limit,m3StopTarget,dirQ],
 bank:[
  mcq('Model 3','When is Model 3 used?',['Only when there is no nearby draw to trade into','Whenever you like','Only with a 4-hour gap','Only in Asia'],'It is a quick trend-following scalp.'),
  mcq('Model 3','Which situation allows it?',['Price is at an all-time high with no draw above','Unfilled 1-hour gaps sit nearby on both sides','The draw is about to be hit','You want to short an all-time high'],'At least one of the allowed conditions must be present.'),
  mcq('Model 3','Which chart is Model 3 on?',['The 1-minute chart only','The 4-hour chart','The daily chart','Any chart'],'Do not pair it with higher timeframes.'),
  mcq('Model 3','What must price create first?',['A 1-minute gap and a 1-minute CISD','A 4-hour gap','A news candle','An order block'],'Both, in the trade direction.'),
  mcq('Model 3','What must the retest do?',['Reject out of both the gap and the CISD with no close through either','Reject only the gap','Reject only the CISD','Close through both'],'Rejecting only one does not qualify.'),
  mcq('Model 3','What are the stop and target?',['10 points (15 to be safe) and 30 points','10 points and 100 points','30 points and 10 points','There is none'],'About 1:2.'),
  mcq('Model 3','The 1-minute midpoint has already played. Do you re-use it?',['No: the 1-minute is choppy','Yes, twice','Yes at double size','Only on Friday'],'Do not re-use the same 1-minute midpoint after it has played.'),
  mcq('Model 3','A later retest of a 1-minute continuation level is…',['Just a CISD rejection block that needs higher-timeframe backing','A new Model 3','A Model 1','Always valid'],'It is Model 2 territory.')],
 examDesc:'When Model 3 is allowed, its rules, which retests qualify, and its stop and target.'});

/* ---------- x09 · grading ---------- */
quick({id:'x09',o:9,ph:3,t:'Grading: Is It Worth the Risk?',out:'Grade a setup element by element, and know what is an automatic no-trade.',
 ls:['Grade before you risk anything','The seven elements','Automatic no-trade','The most reliable setup'],
 task:'Take three past setups from your replay. Grade each of the seven elements as Good, Great or Perfect, and write which element, if any, falls below Good.',
 learn:[
  {t:'Grade before you risk anything',h:`<p>Grade the setup first. <b>Below "Good" is a no-trade.</b> The more elements that reach Great or Perfect, the stronger the setup, and the grade on the indicator's tab (A+, A++, A+++) reflects that.</p>`},
  {t:'The seven elements',h:tblx(['Element','Good (minimum)','Great (A+ / A++)','Perfect (A+++)'],GRADE.map(([n,a,b,c])=>[`<b>${n}</b>`,a,b,c]))},
  {t:'Automatic no-trade',h:warn(`<p>Whatever the grade:</p><ul><li>no higher-timeframe gap behind it;</li><li>no draw, or the draw is already hit;</li><li>the level was closed through, or its midpoint already played;</li><li>trading against the draw, or shorting all-time highs;</li><li>you have already hit your daily trade limit.</li></ul>`,'No trade, whatever the grade')},
  {t:'The most reliable setup',h:`<p>The most reliable setup in the source is the <b>1-hour rejection out of a 1-hour gap, backed by a 1-hour CISD rejection block</b>: a one-hour CISD rejection off a CISD out of a one-hour gap. That is a description of quality, not a promise: it can still lose.</p>`}],
 recall:xr('Model 3: The 1-Minute Continuation','What must the retest do?',['Reject out of both the gap and the CISD with no close through either','Reject only the gap','Reject only the CISD','Close through both'],'Rejecting only one does not qualify.'),
 steps:[['<b>Grade each element.</b>',tblx(['Element','Level'],[['Gap delivery','Great: a 1-hour gap'],['Rejection','Great: external sweep, no close'],['CISD','Good: not required'],['Midpoint alignment','Great: within a few points'],['Draw','Great: unfilled 1-hour gap'],['Extra confluence','Good: none'],['Context','Great: right side of the range']])],['<b>Check the no-trades.</b>',tblx(['Question','Answer'],[['Higher-timeframe gap behind it?','Yes'],['Draw open and in direction?','Yes'],['Level closed through or played?','No'],['Against the draw or shorting an all-time high?','No'],['Daily limit already hit?','No']])]],
 gens:[gradeLevelQ,noTradeQ,fineQ,worstGrade],
 bank:BANKS('Grading',[
  ['What does a grade below "Good" on any element mean?',['A no-trade','A smaller target','A wider stop','Nothing'],'Below Good is a no-trade.'],
  ['Which gap delivery is Perfect?',['A 1-hour or 4-hour gap with a 15-minute gap stacked inside','A 15-minute gap alone','No gap','A 5-minute gap'],'Stacking lifts the grade.'],
  ['Which rejection is Perfect?',['An external sweep with two failures to close and the longest wick with no closure through the gap','A wick with a close beyond the level','Any wick','A wick at the open'],'Two failures to close is the strongest.'],
  ['Is a CISD required for the minimum grade?',['No: it is not required','Yes, always','Only on Monday','Only in London'],'A higher-timeframe CISD that has been retested is Perfect.'],
  ['What midpoint alignment is Perfect?',['About 1 point or less from the gap midpoint','Inside the gap anywhere','Within 20 points','There is none'],'Good is inside the gap, Great is within a few points.'],
  ['Which context is Perfect?',['New York morning, a good price-action week and no conflicting news','Any morning','A news day','Asia only'],'Good is simply not against the bias.'],
  ['A great-looking setup, but you have already hit your daily trade limit. What is the call?',['No trade','Take it at half size','Take it at full size','Take it on the 1-minute'],'You have hit your daily limit: no trade, whatever the grade.'],
  ['Which is the most reliable setup in the source?',['A 1-hour rejection out of a 1-hour gap, backed by a 1-hour CISD rejection block','A 5-minute rejection alone','A 1-minute gap','A random wick'],'It is a description of quality, not a promise.']]),
 examDesc:'The seven grading elements, what lifts a grade, and the automatic no-trades.'});

/* ---------- x10 · stops, targets, partials and break-even ---------- */
chartMod({id:'x10',o:10,ph:3,t:'Stops, Targets, Partials and Break-even',out:'Choose the stop for the situation, place the target at the real draw, and manage the partial and break-even.',
 ls:['The stop for each situation','Stop placement','The target is the next draw','Partials','Break-even'],
 task:'For three past setups, write the stop you would use and why (standard, SMT, CISD, news), the first draw, the partial level, and the exact moment you would move the rest to break-even.',
 ex:()=>m1Scn(rr(1310),{side:'long',outcome:'target'}),
 learn:[
  {t:'The stop for each situation',h:tblx(['Situation','Stop','Target'],STOPS.map(([s,st,tg])=>[s.charAt(0).toUpperCase()+s.slice(1),st,tg+' points'+(tg===30?' (1:2)':'')]))},
  {t:'Stop placement',h:`<p>Put the stop <b>beyond the swept high or low</b>, not at a round number. If an untapped higher-timeframe gap sits just beyond, put the stop <b>inside that gap</b> so a tap of it does not take you out.</p>`},
  {t:'The target is the next draw',h:`<p>The real target is always the <b>next draw</b>. 40 points is the default because price kept turning at 40 and edging the 45, so 45 was moved to 40. After being edged, use 40 and remove limits.</p>`},
  {t:'Partials',h:`<p>Take <b>50% at the first draw</b> (or at 1:4), then move the rest to break-even and let it run to the next draw. At market, click the opposite side for the quantity you want off. Or place an opposite-side limit for half the size. Choose a size where your partial level is a clean number of contracts.</p><p>Partials can also stop overtrading: enter 10 MNQ, take 9 off at the target, and move the last one to break-even. While you hold it, you cannot take another trade.</p>`},
  {t:'Break-even',h:warn('<p>Do not move to break-even just because a trade is 10 to 20 points up. Valid trades often chop back near entry. Move it <b>after the partial is taken</b>.</p>')}],
 recall:xr('Model 3: The 1-Minute Continuation','What are the stop and target for Model 3?',['10 points (15 to be safe) and 30 points','10 points and 100 points','30 points and 10 points','There is none'],'About 1:2.'),
 see:e=>m1See(e).slice(3),
 sum:e=>({ov:[...m1Ov(e),m1Draw(e),...m1Trade(e,e.iB+1)]}),
 drills:[m1StopTarget,m3StopTarget,stopQ,stopPriceQ,rrQ,partialQ,beQ,targetQ,stopPlace],
 exam:{bank:2,gen:[[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[7,1],[8,1]]},
 bank:[
  mcq('Stops','What is the standard stop for a rejection block?',['10 points','2 points','50 points','No stop'],'12 to 12.5 for SMT, about 12 for CISD, up to 15 on news days.'),
  mcq('Stops','Where does the stop go?',['Beyond the swept high or low, not at a round number','At a round number','At the entry','Wherever risks the same dollars'],'Inside an untapped higher-timeframe gap if one sits just beyond.'),
  mcq('Targets','What is the real target?',['The next draw on liquidity','Always 100 points','Always the entry plus 10','The previous day\'s high'],'40 points is the default.'),
  mcq('Targets','Why 40 points and not 45?',['Price kept turning at 40 and edging the 45','45 is too small','40 is a law','45 is only for shorts'],'After being edged, use 40.'),
  mcq('Partials','What do you do at the first draw?',['Take 50%, then move the rest to break-even and run it to the next draw','Close everything','Add more','Move the stop away'],'The partial is part of the plan.'),
  mcq('Break-even','When do you move to break-even?',['After the partial is taken','As soon as the trade is 10 points up','Before the fill','Never'],'Valid trades often chop back near entry.'),
  mcq('Partials','How can partials help stop overtrading?',['While you still hold the last contract you cannot take another trade','They give you more orders','They remove the stop','They replace the target'],'Enter 10 MNQ, take 9 off at target, move the last to break-even.'),
  mcq('Stops','On a news day the stop can be…',['Up to 15 points','Exactly 1 point','Removed','Always 40'],'Or you stand aside until price has rebalanced.')],
 examDesc:'The stop for each situation, stop placement, the target at the real draw, partials and break-even.'});

/* ---------- x11 · why trades lose, adapting to conditions ---------- */
quick({id:'x11',o:11,ph:3,t:'Why Trades Lose, and Adapting to Conditions',out:'Name the cause of a loss, know its fix, and adapt the timeframe when conditions are bad.',
 ls:['Name the cause after every loss','The fifteen causes and their fixes','Adapting to market conditions','Forward-test on Monday','The two-failure rule'],
 task:'Take your last five losing trades. For each one, name the cause from the table and write the fix. If you cannot name the cause, journal it until you can.',
 learn:[
  {t:'Name the cause after every loss',h:`<p>Name the cause after every loss. If you cannot, journal it until you can. Every row in the table below is a cause that has a prevention.</p>`},
  {t:'The fifteen causes and their fixes',h:tblx(['Cause','What it looks like','Prevention'],LOSE.map(([c,l,p])=>[`<b>${c.charAt(0).toUpperCase()+c.slice(1)}</b>`,l.charAt(0).toUpperCase()+l.slice(1),p.charAt(0).toUpperCase()+p.slice(1)]))},
  {t:'Adapting to market conditions',h:`<p><b>The entry model never changes. The timeframe you execute it on does.</b></p>${tblx(['Question','Good price action','Bad price action'],COND.map(([q,g,b])=>[q,g,b]))}`},
  {t:'Forward-test on Monday',h:`<p>On a no-news Monday (or after your win), paper-trade every higher-timeframe rejection out of a higher-timeframe gap. It tells you how the week is likely to treat higher-timeframe setups.</p>`},
  {t:'The two-failure rule',h:`<p>If you lose two higher-timeframe trades, stop taking them at face value. Use the higher timeframe only to find the trade, then enter on the 15-minute rejection inside the higher-timeframe wick. If that is edged, stopped or played, use the 5-minute, the most external entry as close to the gap midpoint as possible.</p><p>In bad conditions skip Asia and London, trade only the New York morning, leave no limits overnight, and remove a limit once you are edged.</p>`}],
 recall:xr('Stops, Targets, Partials and Break-even','When do you move to break-even?',['After the partial is taken','As soon as the trade is 10 points up','Before the fill','Never'],'Valid trades often chop back near entry.'),
 steps:[['<b>Cause, then fix.</b>',tblx(['What you see','Cause','Fix'],[['The entry is valid but price has nowhere to go','The draw was already taken','Confirm the draw is still open'],['A third or fourth trade after a loss','Overtrading or revenge trading','Two-trade cap and stop after one win']])],['<b>Adapt the timeframe.</b>',tblx(['Conditions','What changes'],[['Good price action','Nothing: trade the models as normal'],['Bad price action','The execution timeframe moves down to the 15-minute or 5-minute']])]],
 gens:[loseCause,loseFix,condQ],
 bank:BANKS('Why trades lose',[
  ['After a loss, what do you do first?',['Name the cause, and journal it until you can','Take another trade right away','Double the size','Change the model'],'Every cause has a prevention.'],
  ['A wick that looked like a rejection got blown through. Likely cause?',['No higher-timeframe gap behind the rejection','A news release','A wide stop','A partial'],'Only trade rejections delivering out of a 1-hour or 4-hour gap.'],
  ['Price runs off with no fill, missing your entry by 1 to 3 points. What is that?',['Getting edged','A hard exit','A scratch','A partial'],'Refine to the aligned entry, use 40 not 45, remove limits after being edged.'],
  ['What changes in bad conditions?',['The timeframe you execute on, not the entry model','The entry model','The stop to zero','The daily limit'],'The entry model never changes.'],
  ['You lose two higher-timeframe trades. What now?',['Use the higher timeframe only to find the trade, then enter on the 15-minute rejection inside the wick','Double the size','Stop trading forever','Remove the stop'],'This is the two-failure rule.'],
  ['What is the Monday forward-test?',['Paper-trade every higher-timeframe rejection out of a gap on a no-news Monday','Trade full size on Monday','Skip Monday','Trade only Asia'],'It tells you how the week is likely to treat higher-timeframe setups.'],
  ['In bad conditions, what about Asia and London?',['Skip them and trade only the New York morning','Trade them with double size','Trade them only on news','Nothing changes'],'Leave no limits overnight, and remove a limit once you are edged.'],
  ['A candle closes back through your CISD and you hold. Which cause is that?',['Breaking the exit rule','News volatility','A used level','An SMT sweep'],'Close immediately on a close through your key level.']]),
 examDesc:'Naming the cause of a loss, its prevention, adapting to market conditions, the forward-test and the two-failure rule.'});

/* ---------- x12 · daily rules and the pre-trade checklist ---------- */
quick({id:'x12',o:12,ph:3,t:'Daily Rules and the Pre-Trade Checklist',out:'Say when you are done for the day, and run the checklist before every trade.',
 ls:['The daily rules','Discipline','The checklist: before the session','The must-haves','Precision, grade boosters and after the trade'],
 task:'Write the daily rules and the must-have checklist on a card and put it where you can see it. Before tomorrow\'s session fill in the "before the session" list, and after each trade fill in "after the trade".',
 learn:[
  {t:'The daily rules',h:tblx(['Result today','What you do'],[['One win','Done for the day, however good the next setup looks'],['Two losses','Done'],['One loss, then one win','Done'],['Already up on the day','Do not take a second trade. Partial and go to break-even instead']])},
  {t:'Discipline',h:`<ul><li>Write your rules down and keep them where you can see them.</li><li>Accept the risk before you enter. If 10 points of loss bothers you, the size is wrong.</li><li>Patience makes the money. Do not stare at charts without an entry model: that is how setups get invented.</li><li>Skipping a session when you feel off is a valid decision. No-trade days are part of the plan.</li><li>Fund live accounts from prop payouts rather than savings, and withdraw small amounts at a time.</li></ul>`},
  {t:'The checklist: before the session',h:`<ul><li>Mark the 1H and 4H gaps (unfilled ones highlighted), the key opens, session highs and lows and equal highs and lows.</li><li>Pick the draw and the bias.</li><li>Check the economic calendar for news times.</li><li>Judge price action: are higher-timeframe levels being respected this week?</li></ul>`},
  {t:'The must-haves',h:`<p><b>Any unchecked box in this group means no trade.</b></p>`+tblx(['Must-have','Passes when'],MUST.map(([m,p])=>[`<b>${m}</b>`,p]))},
  {t:'Precision, grade boosters and after the trade',h:`<p><b>Precision:</b></p>${tblx(['Item','Rule'],PRECISION.map(([a,b])=>[a,b]))}<p><b>Grade boosters:</b> an external sweep, SMT with ES, an order block at the level, a key open at the level, a 15-minute gap stacked inside the higher-timeframe gap, and the New York morning session.</p><p><b>After the trade:</b></p><ol><li>If a candle closes through your key level, exit immediately.</li><li>Partial 50% at the first draw, stop to break-even, run the rest.</li><li>Win: stop for the day. Loss: name the cause from the table and journal it.</li></ol>`}],
 recall:xr('Why Trades Lose, and Adapting to Conditions','What changes in bad conditions?',['The timeframe you execute on, not the entry model','The entry model','The stop to zero','The daily limit'],'The entry model never changes.'),
 steps:[['<b>The day, in order.</b>',tblx(['Step','Do'],[['Before the session','Gaps, key opens, liquidity, draw and bias, calendar, price action'],['Before the order','All must-haves checked, precision done'],['After the trade','Exit on a close through your level, partial at the first draw, journal the cause of any loss']])],['<b>When you are done.</b>',tblx(['What happened','Done?'],[['One win','Yes'],['Two losses','Yes'],['One loss then one win','Yes'],['One loss only','No: one more valid setup is allowed']])]],
 gens:[dayQ,checkQ,precQ],
 bank:BANKS('Daily rules',[
  ['You take a win in the first trade of the day. What now?',['You are done for the day','Take one more','Double the size','Keep going until noon'],'One win and you stop.'],
  ['Two losses today. What now?',['Done for the day','Take a third to recover','Switch models','Add size'],'Two losses and you stop.'],
  ['One loss, then one win. What now?',['Done','Take another','Keep trading','Wait an hour'],'You are done.'],
  ['You are already up on the day. A new setup appears. What do you do?',['Do not take a second trade: partial and go to break-even instead','Take it at double size','Take it on the 1-minute','Swap models'],'Protect the day.'],
  ['One unchecked box in the must-haves means…',['No trade','A smaller trade','A wider stop','A different model'],'Any unchecked box in the must-have group.'],
  ['What do you do if 10 points of loss bothers you?',['The size is wrong: reduce it','Widen the stop','Skip the stop','Use a different broker'],'Accept the risk before you enter.'],
  ['How should you fund live accounts?',['From prop payouts rather than savings, and withdraw small amounts','From all your savings at once','From a loan','There is no rule'],'A discipline rule from the source.'],
  ['You feel off before a session. What is a valid decision?',['Skip the session: no-trade days are part of the plan','Trade bigger to feel better','Remove the stop','Take every setup'],'Skipping is a valid decision.']]),
 examDesc:'When you are done for the day, discipline rules, the before-session list, the must-haves and the precision items.'});

/* ---------- x13 · the indicator ---------- */
quick({id:'x13',o:13,ph:4,t:'The Echo x Orbit Indicator',out:'Read the indicator\'s tabs, lines and alerts, know its key settings, and know what it cannot see.',
 ls:['What it draws','The alert flow','Reviewer colours','Settings worth knowing','What to put on the chart beside it','Honest limits'],
 task:'Add the indicator to a 1-minute NQ or MNQ chart. Find one tab, read its model, direction, limit price and grade out loud, then match each line colour to the stop, the target and the first draw.',
 learn:[
  {t:'What it draws',h:`<p>Put it on a <b>1-minute NQ or MNQ chart</b>. It finds the setups of the three models separately, draws the limit, stop and target, and sends alerts. It does not place orders, and it cannot judge your narrative: build the narrative first, then use the indicator as a second opinion.</p>${tblx(['On the chart','Meaning'],[['A tab on the right, such as "M1 SHORT 29,150.00 · A+"','A Model 1 setup: direction, limit price (the wick midpoint) and grade. Hover the tab for the full explanation.'],['"M2" and "M3" tabs','Model 2 (a CISD retest) and Model 3 (a 1-minute continuation), same layout'],['Blue line','Your limit price'],['Red dashed line','Stop'],['Green dashed line','Target (40 points for Models 1 and 2, 30 for Model 3)'],['Grey dotted line','The first draw on liquidity, where you take the partial'],['Grey boxes','Open 1H and 4H gaps (switch "Draw the 1H / 4H gaps")'],['Grey lines','Untaken liquidity levels (switch "Draw untaken liquidity levels")'],['Tab suffix: FILLED, TOO LATE, CANCELLED or EXPIRED','Where the limit order stands. Tabs update as price moves.']])}`},
  {t:'The alert flow',h:tblx(['Stage','Message','What it means for you'],[['1 · Heads-up','"WATCHING FOR SHORTS" (or longs) with the reason','A rejection formed and this is why we now look for that direction. It is not an entry: get your chart ready.'],['2 · Limit setup','The limit price, stop, target, first draw and grade','Place the limit now. It also tells you when the setup is cancelled and the rules for cancelling.'],['3 · Filled','Price traded through your limit','You are in. Manage with the stop and partial rules.'],['4 · Too late or no longer valid','With the reason','Price ran about 5 points past the limit before filling, the swept level was closed through, the first draw was hit before the fill, or the limit expired. Remove the limit.'],['Limit moved','Sent at most twice per setup','The rejection wick kept growing, so the midpoint moved. Move your order.']])},
  {t:'Reviewer colours',h:`<p>Each limit setup also gets a Reviewer note. It also says how far price is from your limit and whether the rejection is still holding on the chart. It is a quick check, not advice.</p>${tblx(['Colour','Meaning'],REV.map(([a,b])=>[a,b]))}`},
  {t:'Settings worth knowing',h:tblx(['Setting','Default','Note'],[['Mark Model 1 / 2 / 3','On','Each model has its own switch'],['Stop and target','M1 10 and 40, M2 12 and 40, M3 10 and 30','Guide defaults. Change them for news days or SMT'],['Smallest draw that counts','10 points','An assumption: the source gives no minimum distance'],['1H gaps / 4H gaps count','On / On','15-minute gaps are used only with Switch B'],['Only 9:30 to 12:00','Off','An assumption: the source gives no end time for the New York morning'],['Too late when price runs past the limit','5 points','Your rule. Before a fill it counts as price running away in your direction'],['Model 1 limit valid for','240 minutes','An assumption: no order life in the source'],['Model 3 limit valid for','15 minutes','An assumption'],['Switch A: judge the sweep by the 15m / 1H candle\'s final close','Off','Follows the guide wording exactly. The limit appears on the wick and is cancelled if the candle closes beyond. More setups, later confirmation'],['Switch B: accept 15m gaps as the delivery gap','Off','The guide lists a 15-minute gap as the "Good" minimum. More setups, lower grade']])},
  {t:'What to put on the chart beside it',h:`<p>The indicator already draws open 1H and 4H gaps and untaken liquidity. To see a trade develop, add the items below. Each maps to a question in your checklist.</p>${tblx(['Add this','What it answers'],BESIDE.map(([a,b])=>[a.charAt(0).toUpperCase()+a.slice(1),b.charAt(0).toUpperCase()+b.slice(1)]))}<p>Keep it readable: one colour family per object type, midpoints as thin lines, and only the gaps and levels near price. If the chart gets crowded, drop the 5-minute and 15-minute items first.</p>`},
  {t:'Honest limits',h:warn('<p>The indicator marks the mechanical part of the method. It cannot see whether your draw has already been hit, whether this week\'s price action is respecting higher-timeframe levels, or whether big news is about to land. Several details are its best reading of the source and are marked as assumptions. If a setup looks wrong, note the time and report it.</p>','What it cannot do')}],
 recall:xr('Daily Rules and the Pre-Trade Checklist','One unchecked box in the must-haves means…',['No trade','A smaller trade','A wider stop','A different model'],'Any unchecked box in the must-have group.'),
 steps:[['<b>Read a tab.</b>',tblx(['Tab','Reads as'],[['M1 SHORT 21,450.00 · A+','Model 1, a short limit at 21,450.00, graded A+'],['M2 LONG 21,380.25 · A++ · FILLED','Model 2, a long limit at 21,380.25, graded A++, and the order has filled']])],['<b>Read the alerts.</b>',tblx(['Stage','You'],[['Heads-up','Get ready'],['Limit setup','Place the limit'],['Filled','Manage the trade'],['Too late or no longer valid','Remove the limit']])],['<b>Read the lines.</b>',tblx(['Line','Meaning'],[['Blue','Limit'],['Red dashed','Stop'],['Green dashed','Target'],['Grey dotted','First draw: take the partial']])]],
 gens:[tabQ,alertQ,drawQ,revQ,settQ,besideQ],
 bank:BANKS('The indicator',[
  ['Which chart does the indicator run on?',['A 1-minute NQ or MNQ chart','The daily chart','The 4-hour chart','Any chart'],'It finds the setups of the three models separately.'],
  ['Does the indicator place orders?',['No','Yes','Only on news days','Only for Model 3'],'It draws the limit, stop and target and sends alerts.'],
  ['What does the blue line show?',['Your limit price','The stop','The target','The first draw'],'Red dashed is the stop and green dashed is the target.'],
  ['What is a "Heads-up" alert?',['A rejection formed and why we now look for that direction: not an entry','The order has filled','The trade is over','A news alert'],'Get your chart ready.'],
  ['What does a "TOO LATE" tab mean?',['Price ran away before the fill: remove the limit','The trade won','Move the stop','Add size'],'It can also mean the swept level was closed through or the limit expired.'],
  ['What does a Red Reviewer note mean?',['Skip it: the first minutes after the open or the Fed announcement window','Nothing is working against it','Take it at double size','The target is hit'],'It is a quick check, not advice.'],
  ['Which indicator numbers are assumptions you can change?',['Session windows, smallest draw, Model 1 and 3 limit life','The idea of a rejection block','The daily rules','The stop must be beyond the swept level'],'The source does not give them, so they are marked.'],
  ['What can the indicator NOT see?',['Whether your draw has already been hit, how this week is treating higher-timeframe levels, and incoming news','Gaps','Wicks','Candles'],'Build your narrative first.']]),
 examDesc:'Reading tabs, the lines, the four alert stages, Reviewer colours, key settings, what to add to the chart, and the honest limits.'});

/* ---------- x14 · the call ---------- */
chartMod({id:'x14',o:14,ph:4,flag:'Final',t:'Make the Call: ECHO X ORBIT',out:'Take or skip a setup, name the model, place the limit, stop and target, and run the checklist on fresh charts.',
 ls:['Name the model','Run the must-haves','Place the limit, stop and target','Read the outcome'],
 task:'Take a past week in replay. For every rejection you can find, write the model, the grade, the must-haves, the limit, stop and target, and whether you take or skip it. Then compare with what price did.',
 ex:()=>m1Scn(rr(1314),{side:'short',outcome:'stop'}),
 learn:[
  {t:'The call, in order',h:`<ol><li><b>Narrative:</b> where is the draw, which direction are you allowed to trade, and are you in premium or discount?</li><li><b>Model:</b> is it a sweep rejected out of a higher-timeframe gap (Model 1), a retested CISD (Model 2), or a 1-minute gap and CISD with no draw nearby (Model 3)?</li><li><b>Must-haves:</b> any unchecked box means no trade.</li><li><b>Grade:</b> every element at least Good.</li><li><b>Levels:</b> the limit at the wick midpoint, the stop for the situation, the first draw as the target.</li><li><b>Rules:</b> one win or two losses ends the day.</li></ol>`},
  {t:'The three models side by side',h:tblx(['','Model 1','Model 2','Model 3'],[['Name','External rejection block','CISD rejection block','1-minute continuation'],['Entry','Midpoint of the most rejected wick','Midpoint of the wick that retested the CISD','Midpoint of the wick that retested both the gap and the CISD'],['Stop','10 (12 to 12.5 for SMT, up to 15 on news)','About 10 to 12, beyond the CISD and the wick','10 (15 to be safe)'],['Target','First draw, 40 by default','The draw, partial at the first','30'],['Needs','A higher-timeframe gap and a draw','A retested CISD toward the draw. Hard exit on a close through the level','No nearby draw. 1-minute chart only']])},
  {t:'Then it runs itself',h:`<p>Once the limit is placed, the plan runs: the stop stays where it is, you take the partial at the first draw, move the rest to break-even and let it run, and you exit at once on a close through your key level. A valid setup can still lose. You name the cause and journal it.</p>`}],
 recall:xr('The Echo x Orbit Indicator','What does a "TOO LATE" tab mean?',['Price ran away before the fill: remove the limit','The trade won','Move the stop','Add size'],'Remove the limit.'),
 see:e=>{const m2=m2Scn(rr(2314),{side:'short',outcome:'hardexit'}),m3=m3Scn(rr(3314),{side:'long',outcome:'target'}),a=m1See(e),b=m2See(m2),c=m3See(m3);return[a[0],a[3],{...b[3],sc:m2},{...b[5],sc:m2},{...c[1],sc:m3},{...c[2],sc:m3}]},
 sum:e=>({ov:[...m1Ov(e),m1Draw(e),...m1Trade(e,e.iB+1)]}),
 drills:[callItem,callItem,m1TapMost,m1Limit,m1StopTarget,m2Retest,m2Limit,m2Exit,m3Qual,m3Limit,checkQ,gradeLevelQ],
 exam:{bank:2,gen:[[0,3],[2,1],[3,1],[4,1],[5,1],[7,1],[8,1],[9,1],[10,1],[11,1]]},
 bank:[
  mcq('Call','What is the first thing you build before any entry?',['The narrative: the draw, the direction and where you are in the range','The stop','The target','The size'],'No draw, no trade.'),
  mcq('Call','A sweep is rejected out of a 1-hour gap toward an unfilled draw. Which model?',['Model 1','Model 2','Model 3','None'],'External sweep, rejection, higher-timeframe gap.'),
  mcq('Call','A retested CISD that held, pointing at your draw. Which model?',['Model 2','Model 1','Model 3','None'],'A CISD rejection block.'),
  mcq('Call','A 1-minute gap and CISD, both rejected, with no draw nearby. Which model?',['Model 3','Model 1','Model 2','None'],'It is used only when there is no nearby draw.'),
  mcq('Call','The retest closed through the CISD level. What do you do?',['Skip it: it only rejected one','Take it at full size','Take it at half size','Wait for a bigger gap'],'Model 3 needs both.'),
  mcq('Call','You have already taken a win today and a new setup appears. What do you do?',['Stop for the day','Take it','Take it at half size','Take it on the 1-minute'],'One win and you stop.'),
  mcq('Call','Price is at an all-time high and you want a short. What do you do?',['Never short it: use Model 3 with the trend','Short at the first wick','Short at half size','Use a wider stop'],'There is no draw above to pull price.'),
  mcq('Call','Which of these can still lose?',['Every valid setup','Only B-grade setups','Only Model 3','Only news days'],'The rules keep each loss small. They do not remove losses.')],
 examDesc:'Take-or-skip calls across the three models, the limit, stop and target, the hard exit, grading and the checklist, on fresh charts.'});
