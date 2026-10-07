/* ============================================================
   MODULE 10 · SMT DIVERGENCE
============================================================ */
(()=>{
const pair=(m)=>({charts:[{C:m.nq,sym:'NQ1!'},{C:m.es,sym:'ES1!'}]});
const piv2=(m,sym)=>{const pv=sym==='NQ1!'?m.nqPiv:m.esPiv,t=m.type==='bearish'?'h':'l';return pv.filter(x=>x.t===t)};
const secondIdx=(m,sym)=>piv2(m,sym)[1].i;
const divTags=(m)=>{const mk2=(sym,pv)=>{const ps=piv2(m,sym),C=sym==='NQ1!'?m.nq:m.es,bear=m.type==='bearish',lead=(m.lead==='ES'?'ES1!':'NQ1!')===sym;
  return[tagAt(ps[0].i,ps[0].p,'first '+(bear?'high':'low'),bear?'above':'below',COL.ice),tagAt(ps[1].i,ps[1].p,lead?(bear?'lower high (leads)':'higher low (leads)'):(bear?'higher high (lags)':'lower low (lags)'),bear?'above':'below',lead?COL.ok:COL.sig),hlAt(ps[0].p,'',COL.ice,ps[0].i,{scale:true})]};
  return{ov:mk2('NQ1!'),ov2:mk2('ES1!')}};
const mkQ=(m)=>{const bear=m.type==='bearish',lead=m.lead,lag=m.lag;
  const o=[`${bear?'Bearish':'Bullish'} SMT: ${lead} leads (${bear?'lower high':'higher low'}), ${lag} lags (${bear?'higher high':'lower low'})`,`${bear?'Bearish':'Bullish'} SMT: ${lag} leads, ${lead} lags`,`${bear?'Bullish':'Bearish'} SMT: ${lead} leads (${bear?'higher low':'lower high'}), ${lag} lags`,'No divergence: both indices did the same thing'];return o};
const smtRead=r=>{const m=smtScn(r,{type:pick(r,['bearish','bullish']),lead:pick(r,['ES','NQ'])});
  return{kind:'mcq',topic:'Reading SMT',q:'The top chart is NQ and the bottom chart is ES, side by side. At the second turn, what does the pair show?',o:mkQ(m),...pair(m),...divTags(m),
   why:`${m.lead} made a ${m.type==='bearish'?'lower high':'higher low'} and ${m.lag} made a ${m.type==='bearish'?'higher high':'lower low'} at the same moment. The one failing to confirm (${m.lead}) is the leading index: it is already showing the ${m.type==='bearish'?'weakness':'strength'}. ${m.type==='bearish'?'Bearish':'Bullish'} for both.`}};
const smtEntry=r=>{const m=smtScn(r,{type:pick(r,['bearish','bullish']),lead:pick(r,['ES','NQ'])});
  return{kind:'mcq',topic:'Where to trade it',q:`This is a ${m.type} SMT divergence at a higher-time-frame liquidity sweep. Which index do you take the ${m.type==='bearish'?'short':'long'} on?`,o:[`${m.lead}: the leading index, already showing the reversal`,`${m.lag}: the lagging index, it has further to catch up`,'Either: it makes no difference','Neither: SMT is not for entries'],...pair(m),...divTags(m),
   why:`Take the trade on the leading index. ${m.lead} is the one already showing the ${m.type==='bearish'?'lower high':'higher low'}; ${m.lag} is expected to follow it.`}};
const smtTap=r=>{const m=smtScn(r,{type:pick(r,['bearish','bullish']),lead:pick(r,['ES','NQ'])}),bear=m.type==='bearish';
  return{kind:'tap',many:false,topic:'Finding the divergence',q:`On the TOP chart (NQ), click the candle that makes the SECOND ${bear?'high':'low'}: the turn where the two indices disagree.`,...pair(m),want:[secondIdx(m,'NQ1!')],
   why:`NQ's second ${bear?'high':'low'} is at ${hhmm(510+secondIdx(m,'NQ1!')*5)}. At that moment ${m.lead==='NQ'?'NQ made a '+(bear?'lower high':'higher low')+' (it leads)':'NQ made a '+(bear?'higher high':'lower low')+' (it lags)'}.`}};
const ctxQ=r=>{const s=pick(r,[
  ['A divergence appears in the middle of a quiet range, far from any significant high or low. How much weight does it deserve?','Very little: divergences happen constantly and mean little outside a significant draw on liquidity','A lot: any divergence is a strong signal','It replaces the need for confirmation','It means the trend has reversed'],
  ['A divergence appears right as price sweeps the previous day\'s high. How does that change its value?','It is far more powerful: SMT is most useful at a significant draw on liquidity','It makes no difference','It cancels the divergence','It means price will keep rising'],
  ['A student trades forex only. How relevant is SMT as taught here?','Less relevant: this module is specific to index/futures traders (ES and NQ)','Fully relevant: same indices','Required for all markets','Only relevant on weekends']]);
  return mcq('Context',s[0],s.slice(1),s[0].includes('forex')?'The module is specific to index/futures traders, and flagged as less relevant for forex/commodities-only students.':'SMT matters most at a significant draw on liquidity (Modules 3–4). Outside that context divergences happen constantly and mean little.')};
MODS.push({id:'m10',ph:3,chart:true,t:'SMT Divergence',out:'Read two correlated indices against each other.',flag:'Index / futures',
 ls:['Comparing ES and NQ at the same moment','Bearish SMT divergence','Bullish SMT divergence','Why it only matters at a real liquidity draw','Trade the leading index'],
 task:'Pull up ES and NQ side by side (or SPX and NDX). Find 2 bearish and 2 bullish SMT divergences occurring at a higher-time-frame liquidity sweep, and note which index led each time.',
 ex:()=>{const m=smtScn(rr(71),{type:'bearish',lead:'ES'});return{...m,...pair(m),noTf:true}},
 learn:[
  {t:'What SMT is',h:def('<p><b>SMT</b> (smart money technique / divergence) means comparing two <b>correlated instruments\'</b> highs and lows at the same moment in time, to spot a divergence between them. For example S&P 500 futures (ES) and Nasdaq futures (NQ).</p>')+warn('<p>This module is specific to <b>index and futures traders</b>. It is less relevant for forex or commodities-only students.</p>','Note')},
  {t:'Bearish SMT divergence',h:`<p>At the same moment, one instrument makes a <b>lower high</b> (the "<b>leading</b>" index) while the other makes a <b>higher high</b> (the "<b>lagging</b>" index). This is bearish for <b>both</b>: the lagging index is expected to follow the leading index lower.</p>`},
  {t:'Bullish SMT divergence',h:`<p>The mirror image: one instrument makes a <b>higher low</b> (leading) while the other makes a <b>lower low</b> (lagging) at the same time. Bullish for both.</p>`},
  {t:'Why it matters',h:`<p>It gives you an <b>early signal</b>, sometimes before a break of structure or an inverse FVG shows up on either chart on its own.</p>${warn('<p>It is most powerful specifically at a <b>significant draw on liquidity</b> (Modules 3 and 4). Outside that context, divergences happen constantly and mean little.</p>','Context matters')}`},
  {t:'How to use it for entries',h:key('<p>Take the trade on the <b>leading</b> index: the one already showing the reversal. Not the lagging one.</p>')}
 ],
 recall:rc('Module 4','Which is a stronger draw on liquidity?',['Relative equal highs: orders doubled up at one precise spot','A single isolated high','A candle body','A random price level'],'Several sets of orders stacked in one spot.'),
 see:sc=>{const bu=smtScn(rr(72),{type:'bullish',lead:'NQ'}),m=sc,t1=divTags(m);return[
  {ov:[],ov2:[],cap:'<b>Two correlated indices.</b> The top chart is Nasdaq (NQ) and the bottom is S&P (ES). They usually move together, so their highs and lows should usually line up. SMT compares them at the same moment.'},
  {ov:[tagAt(piv2(m,'NQ1!')[0].i,piv2(m,'NQ1!')[0].p,'first high','above'),hlAt(piv2(m,'NQ1!')[0].p,'',COL.ice,piv2(m,'NQ1!')[0].i,{scale:true})],ov2:[tagAt(piv2(m,'ES1!')[0].i,piv2(m,'ES1!')[0].p,'first high','above'),hlAt(piv2(m,'ES1!')[0].p,'',COL.ice,piv2(m,'ES1!')[0].i,{scale:true})],cap:'<b>Both make a first high.</b> Each chart has a swing high, and a level above it where buy orders rest.'},
  {...t1,cap:`<b>Then they disagree.</b> NQ pushes to a <b>higher high</b> (it sweeps the first high) while ES makes only a <b>lower high</b>. ES is the <b>leading</b> index here: it already shows the weakness. NQ is the <b>lagging</b> index.`},
  {...t1,cap:'<b>This is a bearish SMT divergence.</b> A lower high on one index while the other makes a higher high is bearish for both: the lagging index (NQ) is expected to follow the leading one (ES) lower.'},
  {...t1,focus:null,cap:'<b>Take the trade on the leading index.</b> ES is already showing the reversal, so that is the chart to trade. Both fell afterwards.'},
  {sc:{...bu,...pair(bu),noTf:true},...divTags(bu),cap:'<b>The bullish mirror.</b> One index makes a <b>higher low</b> (leading) while the other makes a <b>lower low</b> (lagging). Bullish for both.'},
  {...t1,cap:'<b>Context is everything.</b> The divergence matters because it came at a high that was a draw on liquidity. The same pattern in a quiet range, far from any significant high or low, would mean very little.',html:key('<p>Always ask: did the divergence happen at a significant draw on liquidity (session high, previous day high, stacked highs)?</p>')}]},
 sum:sc=>divTags(sc),
 explain:{prompts:['Describe a bearish SMT divergence between ES and NQ. Which index is leading, which is lagging, and which do you trade?','Why does SMT only matter at certain places, and why is it flagged as specific to index and futures traders?'],
  ideas:['SMT compares two correlated instruments at the same moment','Bearish: one index makes a lower high while the other makes a higher high','Bullish: one makes a higher low while the other makes a lower low','The index showing the reversal first is the leading index','The lagging index is expected to follow the leading one','It can give an early signal, sometimes before a break of structure or inverse FVG','It is most powerful at a significant draw on liquidity','It is specific to index/futures traders, and you trade the leading index']},
 drills:[smtRead,smtEntry,smtTap,ctxQ],
 bank:[
  mcq('Definition','What does SMT divergence compare?',['Two correlated instruments\' highs and lows at the same moment','Two time frames of the same chart','Two sessions','Two moving averages'],'Correlated instruments such as ES and NQ.'),
  mcq('Definition','Which pair of instruments is the standard example?',['ES (S&P 500 futures) and NQ (Nasdaq futures)','EUR/USD and gold','Bitcoin and ETH','Oil and gas'],'Correlated US index futures.'),
  mcq('Bearish','In a bearish SMT divergence, the leading index makes…',['A lower high','A higher high','A lower low','A higher low'],'The leading index fails to confirm the high.'),
  mcq('Bearish','In a bearish SMT divergence, the lagging index makes…',['A higher high','A lower high','A lower low','No high'],'The lagging index took the high.'),
  mcq('Bullish','In a bullish SMT divergence, the leading index makes…',['A higher low','A lower low','A higher high','A lower high'],'The mirror image.'),
  mcq('Bullish','In a bullish SMT divergence, the lagging index makes…',['A lower low','A higher low','A higher high','No low'],'The lagging index took the low.'),
  mcq('Use','A bearish SMT divergence is bearish for…',['Both indices: the lagging one is expected to follow','Only the leading index','Only the lagging index','Neither'],'The lagging index is expected to follow the leading index lower.'),
  mcq('Use','Which index do you take the entry on?',['The leading index, already showing the reversal','The lagging index','Whichever is cheaper','Both at once with double size'],'Trade the leader.'),
  mcq('Context','Where is SMT divergence most powerful?',['At a significant draw on liquidity','Anywhere on the chart','In the middle of a range','Only on the weekend'],'Outside that context divergences happen constantly and mean little.'),
  mcq('Context','Why does SMT help?',['It can give an early signal, sometimes before a break of structure or inverse FVG appears','It replaces all other confluences','It predicts news','It always gives a 1:5'],'An early clue.'),
  mcq('Context','For which traders is this module less relevant?',['Forex or commodities-only students','Index futures traders','Everyone equally','Funded traders only'],'It is specific to index/futures traders.')
 ],
 exam:{bank:4,gen:[[0,3],[1,1],[2,2]]},examDesc:'Reading SMT divergence on side-by-side ES and NQ charts, picking the leading index, and judging context.'});
})();

/* ============================================================
   MODULE 11 · TIME THEORY / SESSION TIMING
============================================================ */
(()=>{
const T0=540;
const winBands=sc=>[{t:'band',i0:0,i1:5,col:COL.lag,a:.06,text:'pre-open range'},{t:'band',i0:6,i1:9,col:COL.bad,a:.1,text:'9:30–9:50 manipulation'},{t:'band',i0:10,i1:13,col:COL.ok,a:.1,text:'9:50–10:10 macro / entry'},{t:'vline',i:18,col:COL.gold,text:'~10:30'}];
const openMk=r=>sc=>({});
const windowQ=(topic,q,a,b,why)=>({kind:'time',topic,q,range:[8*60,12*60],tick:30,snap:5,truth:{a,b},tol:5,why});
const winManip=r=>windowQ('The manipulation window','Select the New York open "manipulation window": when some form of manipulation or fakeout is expected as new money enters at the open.',9*60+30,9*60+50,'9:30–9:50 AM: expect some form of manipulation or fakeout in this window as new money enters at the open.');
const winMacro=r=>windowQ('The macro / entry window','Select the "macro" window: typically where the highest-quality entries following the manipulation window occur.',9*60+50,10*60+10,'9:50–10:10 AM: this is typically where the highest-quality entries following the manipulation window occur.');
const openTapA=r=>{const sc=openScn(r,{dir:pick(r,['up','down'])}),up=sc.dir==='up',C=sc.C,i=C.findIndex((c,k)=>k>=6&&(up?c.l<sc.lo:c.h>sc.lo));
  return{kind:'tap',many:false,topic:'Manipulation',q:`The shaded bands show the New York open windows. Click the first candle that sweeps the pre-open range's ${up?'low':'high'}: the start of the manipulation.`,C,t0:sc.t0,ov:winBands(sc),want:[i],
   why:`At ${hhmm(sc.t0+i*5)} price trades through the pre-open ${up?'low':'high'} (${fm(sc.lo)}) as the open's new money sweeps the resting orders. That is the manipulation, inside 9:30–9:50.`}};
const openTapB=r=>{const sc=openScn(r,{dir:pick(r,['up','down'])}),up=sc.dir==='up',C=sc.C,i=C.findIndex((c,k)=>k>=10&&(up?c.c>c.o:c.c<c.o));
  return{kind:'tap',many:false,topic:'Entry window',q:`After the manipulation, click the first candle of the reversal move: the start of the macro / entry window.`,C,t0:sc.t0,ov:winBands(sc),want:[i],
   why:`The reversal begins at ${hhmm(sc.t0+i*5)}, inside the 9:50–10:10 macro window, after the manipulation took the orders.`}};
const pool=[
 ['It is 10:45 AM and no clean setup has appeared. What does the rule of thumb suggest?','Stop looking for the day: the edge drops off as the session matures','Force a trade before lunch','Double your size to catch up','Wait for the Asia session to trade it'],
 ['A fakeout sweep happens at 9:41 AM. Where does it sit in the New York open framework?','Inside the 9:30–9:50 manipulation window, as expected','Outside any window, so ignore everything','In the macro/entry window','Before the session map starts'],
 ['A clean entry appears at 10:00 AM after a sweep at 9:38 AM. Which window is it in?','The 9:50–10:10 macro / entry window','The manipulation window','The Asia session','No window: windows are hard limits'],
 ['A setup completes at 10:20 AM, a little after the macro window. What does the framework say?','The windows are typical, not hard rules: it can still be valid, but pay closest attention in the core windows','Reject it, windows are hard rules','Trade it twice the size','It is an Asia setup'],
 ['Which session\'s highs and lows is the New York open mainly working on?','The prior session\'s (London and the New York pre-market)','Its own, only','The weekly open only','None'],
 ['What time does the New York session itself begin (after the 8:30 AM pre-market)?','9:30 AM','8:00 AM','10:00 AM','11:00 AM']];
const poolQ=r=>{const p=pick(r,pool);return mcq('Applying the windows',p[0],p.slice(1),p[0].includes('10:45')?'If no clean trade has set up by about 10:30 AM, many traders stop looking for the day: the edge drops off as the session matures.':p[0].includes('10:20')?'These are typical windows, not hard rules. The value is knowing roughly when to pay closest attention.':'Session map (New York time): Asia 6:00 PM–3:00 AM, London 3:00–8:30 AM, New York pre-market 8:30–9:30 AM, New York session from 9:30 AM. The open\'s new money works on the prior session\'s highs and lows.')};
MODS.push({id:'m11',ph:3,chart:true,t:'Time Theory & Session Timing',out:'Know roughly when the setups tend to play out.',
 ls:['The session map in New York time','The 9:30–9:50 manipulation window','The 9:50–10:10 macro / entry window','The ~10:30 rule of thumb','Windows are guides, not rules'],
 task:'Watch the 9:30–10:30 AM price action (live or on replay) over enough mornings to see the pattern repeat. For each morning, log what time the manipulation happened and what time the entry opportunity followed.',
 ex:()=>openScn(rr(81),{dir:'up'}),
 learn:[
  {t:'When the concepts actually play out',h:`<p>Modules 3 to 10 told you <i>what</i> to look for. This module is about <i>when</i> during the day those concepts are most likely to play out (for US index and futures trading).</p>`},
  {t:'The session map (New York time)',h:tblx(['Session','Time (ET)'],[['Asia','6:00 PM – 3:00 AM'],['London','3:00 AM – 8:30 AM'],['New York pre-market','8:30 AM – 9:30 AM'],['New York session','9:30 AM onward']])+`<p>Each session's new money tends to manipulate the prior session's highs and lows. It ties directly back to Module 4.</p>`},
  {t:'The New York open "manipulation window"',h:def('<p><b>9:30–9:50 AM.</b> Expect some form of manipulation or fakeout in this window as new money enters at the open.</p>')},
  {t:'The "macro" / entry window',h:def('<p><b>9:50–10:10 AM.</b> This is typically where the highest-quality entries following the manipulation window occur.</p>')},
  {t:'A rule of thumb',h:`<p>If no clean trade has set up by about <b>10:30 AM</b>, many traders (including in this framework) stop looking for the day. The edge drops off as the session matures.</p>`},
  {t:'Flexibility',h:warn('<p>These are <b>typical windows, not hard rules</b>. Manipulation and entries can happen a little earlier or later. The value is knowing <b>roughly</b> when to pay the closest attention.</p>','Remember')}
 ],
 recall:rc('Module 4','Which session runs from 3:00 AM to 8:30 AM New York time?',['London','Asia','New York','The spread hour'],'London is 3:00 to 8:30 AM Eastern.'),
 see:sc=>{const C=sc.C,lo=sc.lo,mi=C.findIndex((c,k)=>k>=6&&c.l<lo),ei=10;return[
  {focus:12,ov:[{t:'band',i0:0,i1:5,col:COL.lag,a:.06,text:'09:00–09:25 pre-open range'}],cap:'<b>Before the open.</b> Price builds a small range into the New York open. The range\'s low is a level where sell orders are resting (Module 3).'},
  {focus:12,ov:[{t:'band',i0:0,i1:5,col:COL.lag,a:.06,text:'pre-open range'},hlAt(lo,'range low',COL.ice,0),{t:'band',i0:6,i1:9,col:COL.bad,a:.1,text:'9:30–9:50 manipulation'}],cap:'<b>9:30–9:50: the manipulation window.</b> New money arrives at the open. Expect a fakeout: price is pushed through one side of the range.'},
  {focus:12,ov:[{t:'band',i0:6,i1:9,col:COL.bad,a:.1,text:'manipulation'},hlAt(lo,'range low',COL.ice,0),boxOf(C,mi,mi,COL.sig,.5),tagAt(mi,C[mi].l,'sweeps the low','below',COL.sig)],cap:`<b>The sweep.</b> At ${hhmm(T0+mi*5)} price trades below the range low, taking the resting sell orders. That is the manipulation.`},
  {focus:14,ov:[{t:'band',i0:6,i1:9,col:COL.bad,a:.07,text:'manipulation'},{t:'band',i0:10,i1:13,col:COL.ok,a:.1,text:'9:50–10:10 macro / entry'},tagAt(ei,C[ei].l,'reversal starts','below',COL.ok)],cap:'<b>9:50–10:10: the macro / entry window.</b> This is typically where the highest-quality entries come, after the manipulation has taken the orders. Price reverses sharply.'},
  {focus:20,ov:winBands(sc),cap:'<b>After about 10:30 the edge fades.</b> Look how the candles shrink and chop. If no clean trade has set up by then, many traders stop looking for the day.'},
  {focus:20,ov:winBands(sc),cap:'<b>Remember: windows, not rules.</b> The manipulation might come a few minutes earlier or later. The value is knowing roughly when to pay the closest attention.',html:tblx(['Window','Time (ET)','What to expect'],[['Manipulation','9:30–9:50 AM','A fakeout as new money enters'],['Macro / entry','9:50–10:10 AM','Highest-quality entries'],['Rule of thumb','~10:30 AM','Edge drops off: stop looking if nothing has set up']])}]},
 sum:sc=>({ov:winBands(sc)}),
 explain:{prompts:['Walk through the New York open as a sequence of windows: what do you expect at each, and why?','Why are these windows described as guides rather than rules, and what does the rule of thumb about 10:30 AM mean?'],
  ideas:['Asia 6:00 PM–3:00 AM, London 3:00–8:30 AM, New York pre-market 8:30–9:30 AM, New York session from 9:30 AM','Each session\'s new money tends to manipulate the prior session\'s highs and lows','9:30–9:50 AM is the manipulation window: expect a fakeout as new money enters','9:50–10:10 AM is the macro / entry window: the highest-quality entries','If no clean trade has set up by about 10:30 AM, many traders stop looking for the day','The edge drops off as the session matures','They are typical windows, not hard rules','The value is knowing roughly when to pay the closest attention']},
 drills:[winManip,winMacro,openTapA,openTapB,poolQ],
 bank:[
  mcq('Session map','When does the New York pre-market run (New York time)?',['8:30 AM – 9:30 AM','9:30 AM – 4:00 PM','3:00 AM – 8:30 AM','6:00 PM – 3:00 AM'],'8:30 to 9:30, then the New York session from 9:30.'),
  mcq('Session map','Each session\'s new money tends to…',['Manipulate the prior session\'s highs and lows','Ignore earlier sessions','Trade only at its own highs','Close all positions'],'It ties back to Module 4.'),
  mcq('Windows','What is expected in the 9:30–9:50 AM window?',['Some form of manipulation or fakeout as new money enters','The cleanest, highest-quality entries','Nothing, markets are closed','A guaranteed trend day'],'The manipulation window.'),
  mcq('Windows','What is the 9:50–10:10 AM window typically known for?',['The highest-quality entries following the manipulation window','Manipulation','The close','Asia\'s high'],'The macro / entry window.'),
  mcq('Windows','The New York open "manipulation window" runs…',['9:30–9:50 AM','9:50–10:10 AM','10:30–11:00 AM','8:30–9:00 AM'],'9:30 to 9:50.'),
  mcq('Windows','The "macro" / entry window runs…',['9:50–10:10 AM','9:30–9:50 AM','10:30–11:30 AM','8:00–8:30 AM'],'9:50 to 10:10.'),
  mcq('Rule of thumb','If no clean trade has set up by about 10:30 AM, many traders…',['Stop looking for the day','Double their size','Switch to the Asia session','Trade anything that moves'],'The edge drops off.'),
  mcq('Rule of thumb','Why stop looking after about 10:30 AM?',['The edge drops off as the session matures','Markets close at 10:30','Brokers disable trading','News always hits then'],'The edge fades.'),
  mcq('Flexibility','Are these windows hard rules?',['No: typical windows; manipulation and entries can happen a bit earlier or later','Yes: never trade outside them','Only for forex','Only on Fridays'],'The value is knowing roughly when to pay closest attention.'),
  mcq('Flexibility','What is the value of knowing the windows?',['Knowing roughly when to pay the closest attention','Predicting exact entry times','Replacing the need for confirmation','Avoiding the open entirely'],'They are a guide to attention.'),
  mcq('Session map','Which session runs 6:00 PM to 3:00 AM New York time?',['Asia','London','New York','The spread hour'],'Asia.')
 ],
 exam:{bank:3,gen:[[0,1],[1,1],[2,2],[3,1],[4,2]]},examDesc:'The session map, the open\'s manipulation and macro windows (including selecting them on a timeline), and finding them on a chart.'});
})();
