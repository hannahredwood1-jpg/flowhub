/* ============================================================
   ECHO X ORBIT vault · generated questions for the modules without a chart: vocabulary, directions, grading, stops and targets,
   why trades lose, the daily rules and checklist, and the trade plan. Rule settings only: no results, no account sizes.
============================================================ */
const mc=(topic,q,good,bad,why)=>mcq(topic,q,[good,...bad],why);
const fm0=n=>fm(n,0);

/* ---------- x01 vocabulary ---------- */
const VOCAB=[
 ['rejection block (rejection wick)','A candle wick that goes past a level holding liquidity, but the candle does not close beyond that level. The wick is the block.'],
 ['CE (midpoint)','The 50% point of a wick, gap or candle. This is where the limit order goes.'],
 ['fair value gap (FVG)','Three candles in a row where the first candle\'s wick and the third candle\'s wick do not overlap. The empty space between them is the gap.'],
 ['unfilled gap','A gap price has not traded back into or closed through. Unfilled gaps are the main targets.'],
 ['inverted level','A level price has closed through. For its original direction it is finished.'],
 ['CISD (change in state of delivery)','A candle closes beyond the open of the last candle or candles of the opposite colour that drove the move. It signals that the direction has flipped.'],
 ['external level','A level at or near the prominent high or low of the range, within roughly 50 to 100 points. External is stronger than internal.'],
 ['internal level','A level deeper inside the range, away from the prominent high or low. It is weaker than an external one.'],
 ['CISD rejection block','A wick that comes back to a CISD level and does not close through it. The entry is at that wick\'s midpoint.'],
 ['draw on liquidity (the draw)','The price that is pulling the market: an unfilled 1H or 4H gap, a prominent high or low, or a key open. It is your target and tells you which direction you may trade.'],
 ['liquidity pool','Where stops sit: equal highs or lows, Asia and London highs and lows, the previous day\'s high and low, and prominent 1-hour highs and lows.'],
 ['key opens','Midnight (the true day open), the 6 PM open, the 8 PM open, the 10 AM open, 4-hour candle opens and the new-week opening gap.'],
 ['premium and discount','Take the prominent high and low on the 1-hour chart. Below the 50% line is discount, which favours longs. Above it is premium, which favours shorts.'],
 ['edged','Price comes within a few points of your entry or target, turns, and never fills it.'],
 ['SMT divergence','NQ and ES disagree at a key level: one takes the high and the other does not. It favours a reversal, so you leave extra room in the stop.'],
 ['HTF and LTF','Higher timeframes (1-hour and 4-hour) and lower timeframes (15-minute, 5-minute and 1-minute).']];
const vocabQ=r=>{const [t,d]=pick(r,VOCAB);const others=pickN(r,VOCAB.filter(x=>x[0]!==t),3);
  return mcq('ExO · the language',`What does "${t}" mean?`,[d,...others.map(x=>x[1])],`${t}: ${d}`)};
const termQ=r=>{const [t,d]=pick(r,VOCAB);const others=pickN(r,VOCAB.filter(x=>x[0]!==t),3);
  return mcq('ExO · the language',`Which term fits this: "${d}"`,[t,...others.map(x=>x[0])],`${t}: ${d}`)};

/* ---------- x03 direction rules and where you are in the range ---------- */
const DIRS=[
 ['The draw is above price.','Look only for longs.','The trade needs somewhere to go, so you never trade against the draw.'],
 ['The draw is below price.','Look only for shorts.','Never trade against your draw.'],
 ['The draw has already been hit.','That trade is finished. Do not enter toward a target that is gone.','Nothing is left pulling price.'],
 ['Price is at an all-time high.','Never short it. Use the 1-minute continuation (Model 3) to go with the trend.','At an all-time high nothing sits above to pull price, so a short has no draw behind it.'],
 ['Price has just expanded 200 to 400 points on news.','Expect it to rebalance. After a dump the best short entries sit around the 70.5% to 75% level of the range drawn from the swing high to the swing low on the 5-minute chart, refined by a rejection or CISD.','After a news expansion price must rebalance, and it usually comes back toward the middle of the move.']];
const dirQ=r=>{const [a,b,why]=pick(r,DIRS),wrong=pickN(r,DIRS.filter(x=>x[1]!==b),3).map(x=>x[1]);
  return mcq('ExO · direction rules',`Situation: ${a} What does the playbook say?`,[b,...wrong],why)};
const extQ=r=>{const ext=r()<.5,d=ext?pick(r,[20,35,50,60,75,85,95,100]):pick(r,[130,150,170,200,230,260]),hl=pick(r,['high','low']);
  return mcq('ExO · external or internal',`Price is ${d} points from the prominent ${hl} of the range. Is that external or internal?`,
   ext?['External: close to the prominent '+hl+' (within roughly 100 points)','Internal: it is deep inside the range','Neither: only the 50% line matters','External only if it is more than 150 points away']:['Internal: it is deep inside the range, more than about 100 points from the prominent '+hl,'External: any level counts as external','External: because it is on the right side of the 50% line','Neither: only the draw matters'],
   ext?'Within roughly 100 points of the prominent high or low (the playbook says about 50 to 100) counts as external, which is stronger.':'Beyond roughly 100 points from the prominent high or low you are internal, which is weaker.')};

/* ---------- x04 / x05: rejection blocks, CISD, gaps by timeframe ---------- */
const tfRole=r=>{const base=[['4-hour gaps',0],['1-hour gaps',0],['15-minute gaps',1],['5-minute gaps',1],['1-minute gaps on their own',2]],it=pickN(r,base,4);
  return{kind:'sort',topic:'ExO · gaps by timeframe',q:'Sort each gap by the role the playbook gives it.',buckets:['Narrative and draw','Confirmation only','Chop (valid only in Model 3)'],items:it.map(([t,b])=>({t,b})),
   why:'4-hour and 1-hour gaps are the narrative and the draw: entries are delivered out of them and unfilled ones are targets. 15-minute and 5-minute gaps only add confidence at your rejection and are never the narrative. A 1-minute gap on its own is chop, valid only inside the 1-minute continuation.'}};
const WV=[
 ['A wick sweeps the equal highs and the candle closes above them.','Not a rejection: the candle closed beyond the level.','A rejection block needs the candle to fail to close beyond the level.'],
 ['A wick sweeps a prominent high, and the candle closes back below it.','A valid rejection: it swept the level and failed to close beyond it.','Even one point of failure counts.'],
 ['A long wick forms late in the day with no gap, pool or other level behind it.','Not worth marking: a random wick with nothing behind it gets blown through.','Only mark wicks that reject out of a gap with other confluence.'],
 ['Two wicks sweep the same low, neither closes beyond it, and one is longer.','Take the longer one: the most rejected wick is the more precise entry.','Scale down and take the single most rejected wick.']];
const wickValid=r=>{const Q=pick(r,WV),all=WV.map(x=>x[1]);return mcq('ExO · rejection block',`${Q[0]} What is it?`,[Q[1],...pickN(r,all.filter(x=>x!==Q[1]),3)],Q[2])};
const CQ=[
 ['Price has made a bullish CISD and then runs away without coming back for 14 candles.','It is liquidity now: expect it to be swept, and enter at the midpoint of the wick of the candle that caused the CISD.','A CISD needs a retest. With none within about 10 to 15 candles it stops being an entry.'],
 ['A bullish CISD forms, price comes back, wicks into the level and closes above it.','That wick is a CISD rejection block: enter at its midpoint.','The retest held: it wicked into the level and did not close through it.'],
 ['Price cannot close beyond the external candle that started the range.','Settle for the internal CISD. It is weaker.','The external CISD is stronger, but the internal one is acceptable when the external is out of reach.']];
const cisdQ=r=>{const Q=pick(r,CQ),all=CQ.map(x=>x[1]).concat(['Chase it at market','Ignore it: a CISD never matters']);return mcq('ExO · CISD',`${Q[0]} What do you do?`,[Q[1],...pickN(r,all.filter(x=>x!==Q[1]),3)],Q[2])};
const gapSize=r=>{const big=r()<.5,g=big?pick(r,[7,8,9,10,12]):pick(r,[2,3,4,5]);
  return mcq('ExO · gap size',`The gap you are trading out of is ${g} points wide. What do you wait for before trusting the rejection?`,
   big?['Price to trade into at least the gap\'s midpoint and close back out','Nothing: any touch is enough','A second gap on the 1-minute chart','The next day\'s open']:['The retest wick must reject the gap (a small gap needs no deeper trade into it)','Price to trade through the whole gap','A close beyond the gap','Two days of confirmation'],
   big?'A large gap (7 to 10 or more points) should be traded into at least to its midpoint before you trust the rejection.':'With a small gap (2 to 5 points) the retest wick must simply reject the gap.')};

/* ---------- x09 grading ---------- */
const GRADE=[
 ['Gap delivery','a 15-minute gap or a higher-timeframe gap nearby','a 1-hour or 4-hour gap','a 1-hour or 4-hour gap with a 15-minute gap stacked inside it'],
 ['Rejection','a valid wick with no close through the level','an external sweep with no close, scaled down to the most rejected wick','an external sweep, two failures to close, and the longest wick with no closure through the gap'],
 ['CISD','not required','a CISD is present','a higher-timeframe CISD that has been retested'],
 ['Midpoint alignment','the entry is inside the gap','the entry is within a few points of the gap midpoint','the entry is about 1 point or less from the gap midpoint'],
 ['Draw','a clear draw in the trade direction','an unfilled 1-hour or 4-hour gap as the draw','an unfilled higher-timeframe gap plus a key open, far enough away for 1:4'],
 ['Extra confluence','none','one of: SMT, an order block, a key open','two or more of: SMT, an order block, a key open, a liquidity pool'],
 ['Context','not against the bias','on the right side of premium and discount','New York morning, a good price-action week and no conflicting news']];
const GL=['Good (the minimum)','Great (A+ or A++)','Perfect (A+++)'];
const gradeLevelQ=r=>{const row=pick(r,GRADE),k=pick(r,[0,1,2]);
  return mcq('ExO · grading',`Element: ${row[0]}. Description: ${row[k+1]}. Which level is this?`,[GL[k],...GL.filter((_,i)=>i!==k),'Below the minimum: no trade'],
   `For ${row[0]}: Good is ${row[1]}; Great is ${row[2]}; Perfect is ${row[3]}.`)};
const NOTRADE=['There is no higher-timeframe gap behind the rejection','There is no draw, or the draw has already been hit','The level was closed through, or its midpoint has already played','You would be trading against the draw or shorting an all-time high','You have already hit your daily trade limit'];
const FINE=['A 15-minute gap stacked inside a 1-hour gap','A retested higher-timeframe CISD behind a rejection','An unfilled 4-hour gap as the draw','Two or more confluences such as SMT and a key open','An external sweep that failed to close beyond the level twice'];
const noTradeQ=r=>mcq('ExO · automatic no-trade',`Which of these is an automatic no-trade, whatever else the setup has going for it?`,[pick(r,NOTRADE),...pickN(r,FINE,3)],'Whatever the grade, a missing higher-timeframe gap, no draw (or a draw already hit), a level already closed through or played, trading against the draw or shorting an all-time high, or a hit daily limit means no trade.');
const fineQ=r=>mcq('ExO · what lifts the grade',`Which of these makes a setup stronger?`,[pick(r,FINE),...pickN(r,NOTRADE,3)],'A stacked gap, a retested CISD, an unfilled higher-timeframe draw, extra confluence and a double failure all lift the grade. The others are automatic no-trades.');
const worstGrade=r=>{const row=pick(r,GRADE);return mcq('ExO · grading',`Any element that falls below "Good" does what to the trade?`,['It makes it a no-trade, whatever the other elements say','It lowers the grade by one step and you take it anyway','It only matters on news days','It only matters in the Asia session'],'Below Good is a no-trade.')};

/* ---------- x10 stops, targets, partials and break-even ---------- */
const STOPS=[
 ['a standard rejection block','10 points',40,'a'],
 ['a very premium rejection block with high conviction','5 to 8 points',40,'b'],
 ['a rejection where an SMT sweep of the high is likely','12 to 12.5 points, beyond the high',40,'c'],
 ['a CISD-based entry','about 12 points',40,'c'],
 ['a news day or high volatility','up to 15 points',40,'d'],
 ['a 1-minute continuation','10 points (15 to be safe)',30,'a']];
const stopQ=r=>{const [s,st,tg,g]=pick(r,STOPS),others=pickN(r,STOPS.filter(x=>x[3]!==g),3).map(x=>x[1]);
  return mcq('ExO · stops',`Situation: ${s}. What stop does the playbook use?`,[st,...others],`${s}: stop ${st}, target ${tg} points.`)};
const targetQ=r=>{const [s,st,tg]=pick(r,STOPS),opts=[30,40,45,60,50].filter(x=>x!==tg);
  return mcq('ExO · targets',`Situation: ${s}. What is the default target?`,[`${tg} points`,...pickN(r,opts,3).map(x=>x+' points')],`${s}: stop ${st}, target ${tg} points. The real target is always the next draw. 40 is the default for Models 1 and 2 because price kept turning at 40 and edging the 45; Model 3 is a 30-point scalp.`)};
const stopPriceQ=r=>{const short=r()<.5,kind=pick(r,[['the standard stop',10],['the stop for a setup where an SMT sweep of the high is likely',12.5],['the stop on a news day',15],['the stop for a CISD-based entry',12]]),E=Math.round(21000+r()*900);
  const ans=short?E+kind[1]:E-kind[1];
  return{kind:'num',topic:'ExO · the stop price',q:`You are ${short?'short':'long'} from a limit at ${fm0(E)}. What is ${kind[0]} price (${kind[1]} points ${short?'above':'below'} the entry)?`,ans,unit:'',tol:.3,why:`${fm0(E)} ${short?'+':'−'} ${kind[1]} = ${fm(ans,kind[1]%1?1:0)}. A short's stop goes above the entry and a long's goes below.`}};
const rrQ=r=>{const [s,t]=pick(r,[[10,40],[10,30],[15,30],[5,40],[12.5,50],[12,36]]);const ans=t/s;
  return{kind:'num',topic:'ExO · reward to risk',q:`Stop ${s} points, target ${t} points. How many points of reward for every 1 point risked (the second number in 1:?)?`,ans,unit:'',tol:.06,why:`${t} ÷ ${s} = ${fm(ans,2)}. A 10-point stop with a 40-point target is 1:4.`}};
const partialQ=r=>{const n=pick(r,[4,6,8,10,12,20]);
  return{kind:'num',topic:'ExO · the partial',q:`You hold ${n} MNQ and take 50% off at the first draw, then move the stop on the rest to break-even. How many contracts do you close at the first draw?`,ans:n/2,unit:'contracts',tol:.01,why:`50% of ${n} is ${n/2}. The other ${n/2} stay on with the stop at break-even, aiming for the next draw.`}};
const pointsQ=r=>{const short=r()<.5,E=Math.round(21000+r()*800),d=pick(r,[40,40,40,30,25,55]),D=short?E-d:E+d;
  return{kind:'num',topic:'ExO · points to the draw',q:`You are ${short?'short':'long'} from ${fm0(E)} and the first draw is at ${fm0(D)}. How many points to the draw?`,ans:d,unit:'points',tol:.01,why:`|${fm0(E)} − ${fm0(D)}| = ${d} points.`}};
const beQ=r=>mcq('ExO · break-even',pick(r,['When do you move the stop to break-even?','Price is 15 points in profit. Do you move the stop to break-even?','After the partial at the first draw, what happens to the stop on the rest?']),
 ['After the partial is taken: the rest goes to break-even and runs to the next draw','As soon as the trade is 10 to 20 points up','Never: break-even always costs you winners','Before the limit even fills'],'Do not move to break-even just because a trade is 10 to 20 points up: valid trades often chop back near entry. Move it after the partial is taken.');
const stopPlace=r=>mcq('ExO · stop placement',pick(r,['Where does the stop go?','You are choosing the exact stop price. What is the rule?']),['Beyond the swept high or low, not at a round number; inside an untapped higher-timeframe gap just beyond','At the nearest round number','At the exact wick extreme, no further','Wherever risks the same dollars every time'],'Beyond the swept high or low, not at a round number. If an untapped higher-timeframe gap sits just beyond, put the stop inside that gap so a tap of it does not take you out.');

/* ---------- x11 why trades lose, adapting to conditions ---------- */
const LOSE=[
 ['no higher-timeframe gap behind the rejection','a wick that looks like a rejection gets blown through','only trade rejections delivering out of a 1-hour or 4-hour gap (at minimum a 15-minute gap)'],
 ['an untapped higher-timeframe gap just beyond the level','you are stopped by a few points, then price reverses exactly as planned','wait for the gap to be tapped and take a CISD rejection out of it, or scale down so the stop sits inside the gap'],
 ['an SMT sweep','NQ and ES run one high, take your stop, then dump','use 12 to 12.5 point stops when the high can be swept'],
 ['trading a used level','the level reacted earlier and now it fails','never re-take a midpoint that already played, or a level that was closed through'],
 ['the draw was already taken','the entry is valid but price has nowhere to go','confirm the draw is still open before every entry'],
 ['trading against the draw or shorting an all-time high','shorts at all-time highs, or against an unfilled gap above','trade only toward the draw, and use the continuation at all-time highs'],
 ['a CISD with no retest','an entry at an unconfirmed flip, then price sweeps it','require a retest; with none after 10 to 15 candles use the causing candle\'s wick'],
 ['the wrong timeframe for the entry','a 1-hour midpoint run through on a rejection with no CISD, or a 5-minute entry that misses the 1-hour turn','1H CISD retest means the 1H midpoint; 1H out of a gap with no CISD means scale down to 5m'],
 ['a bad price-action week','higher-timeframe rejections fail day after day','after two higher-timeframe failures, scale down to the 15m or 5m inside the higher-timeframe wick'],
 ['a random wick with no confluence','a late-session wick taken on its own','mark only wicks that reject out of a gap with stacked confluence'],
 ['breaking the exit rule','a candle closes back through the CISD and you hold','close immediately on a close through your key level'],
 ['news volatility','a normal 10-point stop is swept within seconds','stand aside, or use up to 15 points, and wait for the post-news rebalance'],
 ['overtrading or revenge trading','a third or fourth trade after a loss','a two-trade daily cap, and stop after one win'],
 ['forcing a setup','a 5-minute signal in chop with no gaps','no gaps, no trade: walk away from the screen'],
 ['getting edged','price misses your entry or target by 1 to 3 points','refine to the aligned entry, use 40 not 45, and remove limits after being edged']];
const loseCause=r=>{const [c,l,p]=pick(r,LOSE),o=pickN(r,LOSE.filter(x=>x[0]!==c),3).map(x=>x[0]);
  return mcq('ExO · why trades lose',`After a loss you see this: ${l}. What is the cause?`,[c,...o],`${c}: ${l}. The fix: ${p}.`)};
const loseFix=r=>{const [c,l,p]=pick(r,LOSE),o=pickN(r,LOSE.filter(x=>x[0]!==c),3).map(x=>x[2]);
  return mcq('ExO · the fix',`The cause of the loss was: ${c}. What prevents it next time?`,[p,...o],`${c}: ${l}. The fix: ${p}.`)};
const COND=[
 ['Is price targeting its normal draws?','It runs to unfilled gaps and highs or lows','It runs away from them'],
 ['Are 1-hour and 4-hour gaps respected?','Rejections at their midpoints hold','Higher-timeframe midpoints fail repeatedly'],
 ['Are key opens retested before price continues?','The 10 AM and midnight opens get rebalanced','They are left behind untested'],
 ['What does the session look like?','Clean New York morning delivery','The morning consolidates and the afternoon expands, ignoring levels'],
 ['What is the backdrop?','Normal news flow','Fear-driven headlines with both sides manipulated']];
const condQ=r=>{const [q,g,b]=pick(r,COND),good=r()<.5;
  return mcq('ExO · market conditions',`${q} You see: "${good?g:b}". Is that good or bad price action, and what do you do?`,
   good?['Good price action: trade the models as normal','Bad price action: skip the whole week','Bad price action: the entry model changes','It makes no difference to the plan']:['Bad price action: keep the same entry models but execute on a lower timeframe (15-minute or 5-minute)','Good price action: take every setup you see','Bad price action: switch to a different entry model','It makes no difference to the plan'],
   good?'Normal draws, respected gaps and clean delivery are good price action.':'When price ignores normal draws or fails at higher-timeframe midpoints, conditions are bad. The entry model never changes: the timeframe you execute it on does.')};

/* ---------- x12 daily rules and the pre-trade checklist ---------- */
const dayQ=r=>{const S=[
 [['a win'],'You are done for the day, however good the next setup looks.'],
 [['a loss','a loss'],'You are done for the day.'],
 [['a loss','a win'],'You are done for the day.'],
 [['a loss'],'You may take one more trade if it is a valid setup. A second loss, or a win, ends the day.']],[seq,ans]=pick(r,S);
  const all=['You are done for the day, however good the next setup looks.','You are done for the day.','You may take one more trade if it is a valid setup. A second loss, or a win, ends the day.','Keep trading until you are up','Take a third trade to win it back'];
  return mcq('ExO · daily rules',`So far today you have taken: ${seq.join(', then ')}. What now?`,[ans,...pickN(r,all.filter(x=>x!==ans&&!(ans.startsWith('You are done')&&x.startsWith('You are done'))),3)],'One win and you stop. Two losses and you stop. A loss then a win stops you too. Already up on the day, do not take a second trade: partial and go to break-even instead.')};
const MUST=[
 ['Delivering out of a higher-timeframe gap','The rejection comes out of a 1-hour gap','There is no 1-hour or 4-hour gap behind the rejection'],
 ['A valid rejection or a retested CISD','The wick swept the level and did not close beyond it','The candle closed beyond the swept level'],
 ['A draw that is still open and in the trade direction','An unfilled 1-hour gap sits ahead in your direction','The draw ahead was already hit this morning'],
 ['The level not closed through, and its midpoint not already played','The level has not been closed through and the midpoint has not been touched since','The midpoint of this gap was already filled and played earlier'],
 ['Not shorting an all-time high, and not against the draw','Price is not at an all-time high and the trade goes toward the draw','You would be shorting an all-time high'],
 ['Under the daily limit','No win yet today and fewer than two losses','You have already taken a win today']];
const checkQ=r=>{const f=Math.floor(r()*MUST.length),facts=MUST.map((m,i)=>i===f?m[2]:m[1]);
  return mcq('ExO · the checklist',`Before you place the limit you check the must-haves. The facts: ${facts.map((x,i)=>`(${i+1}) ${x}`).join('. ')}. Which must-have is unchecked, so the answer is no trade?`,[MUST[f][0],...pickN(r,MUST.filter((_,i)=>i!==f),3).map(m=>m[0])],`Any unchecked box in the must-have group means no trade. Here: ${MUST[f][0].toLowerCase()} fails because ${MUST[f][2].toLowerCase()}.`)};
const PRECISION=[
 ['Entry model chosen','Rejection block, CISD rejection block or 1-minute continuation'],
 ['Right timeframe','1H CISD retest means the 1H midpoint; 1H with no CISD means 5m; bad price action means 15m or 5m'],
 ['Entry midpoint','The one closest to the gap midpoint'],
 ['Stop sized for the situation','10, 12.5 for SMT, 15 for news, and beyond any untapped gap'],
 ['Partial and final target set','Set before the order is placed']];
const precQ=r=>{const [a,b]=pick(r,PRECISION);return mcq('ExO · precision',`On the precision part of the checklist: "${a}". What does it mean?`,[b,...pickN(r,PRECISION.filter(x=>x[0]!==a),3).map(x=>x[1])],`${a}: ${b}.`)};

/* ---------- x13 the trade plan ---------- */
const priceTxt=r=>fm(Math.round((21000+r()*900)*4)/4,2);
const tabQ=r=>{const n=pick(r,[1,2,3]),s=pick(r,['SHORT','LONG']),p=priceTxt(r),g=pick(r,['A+','A++','A+++']),[suf,txt]=pick(r,[['',''],['',''],[' · FILLED','. The limit order has filled'],[' · TOO LATE','. Price ran away before the fill, so remove the limit']]);
  const t=`M${n} ${s} ${p} · ${g}${suf}`,good=`Model ${n}: a ${s.toLowerCase()} limit at ${p}, graded ${g}${txt}`,
   wrong=[`Model ${n}: a ${s==='SHORT'?'long':'short'} limit at ${p}, graded ${g}${txt}`,`Model ${n===3?1:n+1}: a ${s.toLowerCase()} limit at ${p}, graded ${g}${txt}`,`Model ${n}: a ${s.toLowerCase()} market order at ${p}, graded ${g}${txt}`];
  return mcq('ExO · reading a note',`A trade note on your chart reads "${t}". What does it say?`,[good,...wrong],'The note shows the model (M1, M2 or M3), the direction, the limit price (the wick midpoint) and the grade. A suffix shows where the order stands: FILLED, TOO LATE, CANCELLED or EXPIRED.')};
const ALERTS=[
 ['1 · Heads-up (watching for shorts or longs, with the reason)','A rejection formed and this is why you now look for that direction. It is not an entry: get your chart ready.'],
 ['2 · Limit setup (limit price, stop, target, first draw and grade)','Place the limit now. Write down when the setup is cancelled and the rules for cancelling.'],
 ['3 · Filled (price traded through your limit)','You are in. Manage the trade with the stop and partial rules.'],
 ['4 · Too late or no longer valid (with the reason)','Price ran about 5 points past the limit before filling, the swept level was closed through, the first draw was hit before the fill, or the limit expired. Remove the limit.'],
 ['Limit moved (sent at most twice per setup)','The rejection wick kept growing, so the midpoint moved. Move your order.']];
const alertQ=r=>{const [a,b]=pick(r,ALERTS);return mcq('ExO · the order stages',`Your order is at this stage: ${a}. What does it mean for you?`,[b,...pickN(r,ALERTS.filter(x=>x[1]!==b),3).map(x=>x[1])],`${a}: ${b}`)};
const DRAW=[['The blue line','Your limit price'],['The red dashed line','The stop'],['The green dashed line','The target (40 points for Models 1 and 2, 30 for Model 3)'],['The grey dotted line','The first draw on liquidity, where you take the partial'],['Grey boxes','Open 1-hour and 4-hour gaps'],['Grey lines','Untaken liquidity levels']];
const drawQ=r=>{const [a,b]=pick(r,DRAW);return mcq('ExO · what is drawn',`In your chart layout, what does ${a.toLowerCase()} stand for?`,[b,...pickN(r,DRAW.filter(x=>x[1]!==b),3).map(x=>x[1])],`${a}: ${b}.`)};
const SETT=[
 ['Stop and target starting values','Model 1 is 10 and 40, Model 2 is 12 and 40, Model 3 is 10 and 30 (starting values: change them for news days or SMT)'],
 ['Model 1 limit life','240 minutes (an assumption you can change)'],
 ['Model 3 limit life','15 minutes (an assumption you can change)'],
 ['Too late when price runs past the limit by','5 points before a fill'],
 ['Smallest draw that counts','10 points (an assumption: the source gives no minimum distance)'],
 ['Trade only 9:30 to 12:00','Optional: use it to trade the New York morning only'],
 ['Asia and London session windows','Asia 6 PM to 2 AM and London 2 AM to 7 AM (assumptions you can change)']];
const settQ=r=>{const [a,b]=pick(r,SETT);return mcq('ExO · numbers',`In your plan, what is a sensible starting value for: ${a}?`,[b,...pickN(r,SETT.filter(x=>x[1]!==b),3).map(x=>x[1])],`${a}: ${b}.`)};
const BESIDE=[
 ['1-hour and 4-hour fair value gaps','the gap the rejection delivers out of, and the draws above and below'],
 ['15-minute and 5-minute fair value gaps','stacking one inside a higher-timeframe gap lifts the grade'],
 ['rejection wicks on the 15m, 1H and 4H','which wick your limit comes from, and whether another midpoint sits closer to the gap midpoint'],
 ['CISD levels with their taps','the level a Model 2 retest must hold, and the hard-exit line'],
 ['1-minute gaps and CISD lines','what Model 3 needs to reject at the same time'],
 ['key opens','targets and reaction points that raise the grade'],
 ['session highs and lows and the previous day\'s high and low','the liquidity being swept, and the draws'],
 ['a premium and discount line (50% of the 1H range)','which side to favour'],
 ['ES on a second chart','divergence at a key level: a grade booster and a reason for a wider stop'],
 ['an economic calendar','when to stand aside or widen the stop (CPI, FOMC, 8:30 data)']];
const besideQ=r=>{const [a,b]=pick(r,BESIDE);return mcq('ExO · on the chart',`You add "${a}" to the chart. What question does it answer?`,[b,...pickN(r,BESIDE.filter(x=>x[1]!==b),3).map(x=>x[1])],`${a}: ${b}.`)};
const limitsQ=r=>mcq('ExO · honest limits',pick(r,['Can the rules judge your narrative?','Do the rules place the orders for you?','Do the rules tell you whether your draw has already been hit?']),['No: they cover the mechanical part of the method, and you build the narrative first','Yes: they read the draw and the news for you','Yes: they place and manage the orders','Yes: they know how the week is treating higher-timeframe levels'],'The rules cover the mechanical part of the method: the limit, stop and target. They cannot judge your narrative, whether the draw is already hit, how the week is behaving, or whether news is about to land.');

/* ---------- x02 instruments, sessions and news ---------- */
const INSTR=[
 ['Which contract do you chart and which do you execute on?','Chart NQ and execute MNQ','Chart MNQ and execute ES','Chart ES and execute NQ','Chart and execute only ES','10 micros equal 1 mini, and micros let you take partial profit in clean pieces.'],
 ['What is ES open beside NQ for?','To read SMT divergence','To place the orders','To set the stop','To replace the NQ chart','Divergence at a key level (one takes the high, the other does not) favours a reversal and is a grade booster.'],
 ['Which session is best for the models?','New York morning, around the 9:30 open','Asia','The afternoon lunch hour','The 4:00 PM close','Asia and London work with the same model, but New York morning is the best session.'],
 ['What do you do with Asia and London trades when price action is bad?','Skip them, and do not leave limit orders overnight','Take them with double size','Trade them only on news days','Switch models','In bad conditions skip Asia and London, trade only the New York morning, leave no limits overnight, and remove a limit once you are edged.'],
 ['What do you do around CPI, FOMC and 8:30 data?','Widen the stop (up to 15 points) or stand aside until price has rebalanced','Tighten the stop to 5 points','Add size','Ignore the calendar','News moves price fast in both directions, so you give the trade room or wait.'],
 ['What do you size your trades against?','Your firm\'s loss limit, not the account balance','The account balance','Your last winning trade','The size of the gap','Size so that two full losses in a day cannot breach the daily limit.'],
 ['How many micros make one mini?','10','5','2','100','10 micro contracts equal one mini contract.']];
const instrQ=r=>{const [q,g,a,b,c,why]=pick(r,INSTR);return mcq('ExO · instruments and sessions',q,[g,a,b,c],why)};

/* ---------- x03 the narrative steps ---------- */
const NARR=['Mark the 1H and 4H gaps (note which are unfilled above and below)','Mark the key opens','Mark the liquidity','Pick the draw','Locate yourself in the range','Read the bigger picture'];
const narrOrder=r=>({kind:'order',topic:'ExO · the narrative',q:'Put the six steps of building the narrative in order, before any entry.',steps:NARR,why:'Mark the gaps, mark the key opens, mark the liquidity, pick the draw, locate yourself in the range, then read the bigger picture: the higher timeframe moves in 200 to 300 point legs, so even a strongly bearish day needs pullbacks. No draw, no trade.'});
