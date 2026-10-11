/* ============================================================
   Classic school lessons in the new format: the maths, a day and your plan, and the trade-management drills.
============================================================ */
const BANKS=(topic,rows)=>rows.map(([q,o,why])=>mcq(topic,q,o,why));
const drillBank=bank=>r=>{const b=pick(r,bank);return{...b,o:[...b.o]}};
const numGen=(topic,f)=>r=>({kind:'num',topic,...f(r)});
const quick=(c)=>MODS.push({chart:false,examDesc:c.examDesc,...c,
  see:()=>c.steps.map(([cap,html])=>({cap,html:html||''})),
  drills:[...c.gens,drillBank(c.bank),drillBank(c.bank)],
  exam:{bank:c.eb||Math.min(6,c.bank.length-3),gen:[...c.gens.map((_,i)=>[i,c.gens.length>2?1:2]),[c.gens.length,2]]}});

/* ---------- 24 · Why the math works ---------- */
(()=>{
const be=numGen('Break-even',r=>{const [s,t]=pick(r,[[15,40],[10,30],[20,40],[12,36]]),v=Math.round(s/(s+t)*1000)/10;return{q:`With a ${s}-point stop and a ${t}-point target, what win rate (in %, one decimal) breaks even?`,ans:v,unit:'%',tol:.06,why:`Break-even win rate = risk ÷ (risk + reward) = ${s} ÷ ${s+t} = ${v}%.`}});
const ev=numGen('Expectancy',r=>{const w=pick(r,[30,35,40,45,50]),[s,t]=pick(r,[[15,40],[10,30],[20,40]]),v=Math.round((w/100*t-(1-w/100)*s)*100)/100;return{q:`You win ${w}% of trades with a ${t}-point target and lose the rest at a ${s}-point stop. What is your expectancy in points per trade?`,ans:v,unit:'pts',tol:.011,why:`${w/100} × ${t} − ${1-w/100} × ${s} = ${v} points per trade.`}});
const pays=numGen('One win pays for',r=>{const [s,t]=pick(r,[[15,40],[10,35],[12,30],[20,50]]),v=Math.round(t/s*10)/10;return{q:`With a ${s}-point stop and a ${t}-point target, one win pays for how many losses (one decimal)?`,ans:v,unit:'losses',tol:.06,why:`${t} ÷ ${s} = ${v}.`}});
const streak=numGen('Losing streaks',r=>{const w=pick(r,[.4,.5,.6]),n=pick(r,[3,4,5]),v=Math.round(Math.pow(1-w,n)*1000)/10;return{q:`A system wins ${w*100}% of trades. What is the chance that a given run of ${n} trades are all losses (in %, one decimal)?`,ans:v,unit:'%',tol:.06,why:`(1 − ${w})^${n} = ${v}%. Even with a real edge, runs of losses are normal over many trades.`}});
const simQ=r=>{const [s,t]=pick(r,[[15,40],[10,30],[20,40]]),w=pick(r,[.35,.4,.45]),res=Array.from({length:40},()=>r()<w),k=pick(r,['streak','wins','net']);
  let best=0,run=0;res.forEach(x=>{run=x?0:run+1;best=Math.max(best,run)});const wins=res.filter(Boolean).length,rows=[0,1,2,3].map(i=>`<tr>${res.slice(i*10,i*10+10).map(x=>`<td class="${x?'sw':'sl'}">${x?'W':'L'}</td>`).join('')}</tr>`).join('');
  const q=k==='streak'?'Here are 40 trades in order. What is the longest run of losses in a row?':k==='wins'?'Here are 40 trades in order. How many were wins?':`Here are 40 trades in order. Each win made ${t} points and each loss lost ${s} points. What was the net result in points?`;
  const ans=k==='streak'?best:k==='wins'?wins:wins*t-(40-wins)*s;
  return{kind:'num',topic:'Reading a run of trades',q,table:rows,ans,unit:k==='net'?'pts':'',tol:.01,why:k==='streak'?`The longest unbroken run of Ls is ${best}. Streaks like this are normal even with a real edge.`:k==='wins'?`Count the Ws: ${wins} of 40, a ${wins*2.5}% win rate.`:`${wins} wins × ${t} − ${40-wins} losses × ${s} = ${ans} points.`}};
quick({id:'m24',o:14.6,ph:4,t:'Why the Math Works',out:'See why you do not need to win every trade, and why losing streaks are normal.',
 ls:['Risk-to-reward and the break-even win rate','Expectancy','Why losing streaks are normal','The cost of cutting winners'],
 task:'Take your last 20 trades (paper or real) from your journal. Work out your win rate, your average win and loss in points, and your expectancy per trade. Find your longest losing streak and write how it compared to what the maths says you should expect.',
 learn:[
  {t:'One win pays for several losses',h:`<p>With the FLOWMTD default <b>15-point stop and 40-point target</b>, one win pays for <b>2.7 losses</b> (40 ÷ 15). So you do not need to win most trades. The break-even win rate is <b>risk ÷ (risk + reward)</b> = 15 ÷ 55 ≈ <b>27%</b>.</p>`},
  {t:'Expectancy',h:key('<p><b>Expectancy = win rate × average win − loss rate × average loss.</b> It is the average result per trade over many trades. A positive expectancy is an edge, and it only shows up over many trades.</p>','The formula')},
  {t:'Losing streaks are normal',h:`<p>Five losses in a row feels like the model is broken. Usually it is not: even traders with a <b>real</b> edge meet streaks, and a 100-trade simulation shows ugly stretches too. Simulating many trades is how you stop being shocked into abandoning a good plan.</p>`},
  {t:'The cost of cutting winners',h:warn('<p>Fear-closing a winner at +15 "to be safe" feels harmless. Over time you keep the losses full size and shrink the wins, which quietly deletes your edge.</p>','Quiet leak')}],
 recall:rc('Orders & Your First Trade','Risk = ?',['Stop points × $ per point × contracts','Target × contracts','Win rate × R:R','Account ÷ contracts'],'The same risk you computed before you clicked.'),
 steps:[['<b>15/40.</b> One win pays for 2.7 losses.',tblx(['Wins','Losses','Net points'],[['1','2','+10'],['1','3','−5'],['2','5','+5']])],['<b>Break-even win rate.</b>',tblx(['Stop / target','Break-even'],[['15 / 40','27.3%'],['10 / 30','25.0%'],['20 / 40','33.3%']])],['<b>Expectancy.</b> 40% wins on 15/40.',tblx(['','Calculation'],[['Wins','0.40 × 40 = 16'],['Losses','0.60 × 15 = 9'],['Expectancy','+7 points per trade']])],['<b>Run 100 trades.</b> Move the win rate, press run, and watch the equity curve, the streaks and the drawdown. Run it several times.','<div class="sim" data-sim data-w="40" data-s="15" data-t="40"></div>']],
 explain:{prompts:['Explain why a system with a 15-point stop and a 40-point target does not need to win most of its trades, and how to work out the win rate it needs.','Explain what expectancy is and why a losing streak does not mean a system is broken.'],
  ideas:['One win on 15/40 pays for 2.7 losses','Break-even win rate is risk ÷ (risk + reward), about 27% on 15/40','Expectancy is win rate × average win minus loss rate × average loss','Positive expectancy only shows over many trades','Losing streaks happen even with a real edge','Simulating many trades prepares you for ugly stretches','Cutting winners early shrinks the wins but not the losses, deleting the edge']},
 gens:[be,ev,pays,streak,simQ],
 bank:BANKS('The maths',[
  ['With 15/40, roughly how many losses does one win pay for?',['2.7','1','5','10'],'40 ÷ 15 ≈ 2.7.'],
  ['The break-even win rate on 15/40 is about…',['27%','50%','80%','10%'],'15 ÷ (15 + 40) ≈ 27%.'],
  ['Five losses in a row on a good system means…',['Probably normal variance','The system is broken','Double the size','Stop for good'],'Streaks happen even with a real edge.'],
  ['Cutting winners at +15 every time…',['Quietly deletes your edge','Is always safe','Raises your R','Lowers risk to zero'],'You keep the losses full size and cut the wins.'],
  ['Expectancy is…',['The average result per trade over many trades','Your best trade','Your win rate','Your largest loss'],'Win rate × win − loss rate × loss.'],
  ['Why simulate 100 trades?',['To see how ugly normal stretches can be','To predict tomorrow','For fun only','To find the best trade'],'So drawdowns do not shock you out of a good plan.'],
  ['A positive expectancy means…',['An edge that shows over many trades','You win every trade','No losing streaks','A guaranteed day'],'It is an average, not a promise.'],
  ['Which needs a higher win rate to break even?',['A 1:1 reward-to-risk system','A 1:3 system','They are the same','Neither'],'The less reward per risk, the higher the win rate you need.']]),
 examDesc:'Break-even win rate, expectancy, how many losses a win pays for, and losing-streak odds.'});
})();

/* ---------- 25 · A day in the life & your plan ---------- */
(()=>{
const dayOrder=()=>({kind:'order',topic:'A day',q:'Put a trading day in order.',steps:['Before the session: news calendar, levels, model for today, bracket preset, daily stop','The range builds and the sweep happens','Wait for the flip, then place the trade with its full bracket','Stop to breakeven at 1:1','Log the trade honestly in your journal','Close the charts if the plan says you are done'],why:'Checklist first, then the plan: range, sweep, flip, trade, management, journal, and stop when the plan says so.'});
const jr=r=>({kind:'sort',topic:'The journal',q:'Which belong in an honest journal entry, and which do not?',buckets:['Log it','Leave out'],items:shuf([{t:'Which model and session',b:0},{t:'Entry, stop and target',b:0},{t:'The final result in R',b:0},{t:'Whether I followed the plan',b:0},{t:'Only the winners',b:1},{t:'A flattering rewrite of a bad entry',b:1}],r).slice(0,5),why:'Log fresh and true, wins and losses, including whether the plan was followed. The journal only helps if it is honest.'});
const after=r=>pick(r,[
 mcq('After the trade','It is 10:40, you are +$80 on one clean A+ trade and another setup is forming. What does the plan say?',['Done for the day: close the charts','Take it, you are in the zone','Take it at double size with house money','Remove your stop'],'One clean win is a great day. Most giveback happens after the best trade. There is no house money.'),
 mcq('Plan','When should you decide your max losses for the day?',['Before the session, in your plan','After the first loss','When you feel it','At the end of the day'],'Rules made in the moment are made by the emotion of the moment.'),
 mcq('Plan','What makes a trading plan useful?',['It is specific and you check it before every trade','It is long','It is secret','It changes every day'],'Specific rules you can check in two seconds.')]);
const dayNum=numGen('Daily stop',r=>{const n=pick(r,[1,2,3]),sp=pick(r,[12,15,20]),c=pick(r,[1,2,3]);return{q:`Your daily stop is 2 losses. Each trade risks a ${sp}-point stop on ${c} MNQ. What is the most you can lose in a day, in dollars?`,ans:2*sp*2*c,unit:'$',tol:.01,why:`2 losses × ${sp} × $2 × ${c} = $${2*sp*2*c}. Your daily stop ends the day well before a prop firm's daily limit can.`}});
quick({id:'m25',o:15.5,ph:4,t:'A Day in the Life & Your Trading Plan',out:'Run one full session from checklist to journal, and write your plan down.',
 ls:['The pre-session checklist','The session: range, sweep, flip, trade','Journaling honestly','Why a written plan, and what goes in it'],
 task:'Open the Trading Plan tab and build your plan: when you trade, which models, how you enter and exit, your risk and limits, and your numbers. Save it, then come back and press the check below.',
 learn:[
  {t:'Before the session',h:`<p>Coffee, then the checklist. No chart clicking until it is done: <b>news calendar checked, opening prices and levels marked, today's model known, bracket preset selected, daily stop known</b> (default: 2 losses = done).</p>`},
  {t:'The session',h:`<p>The range builds, price sweeps one side, a gap flips, you take the trade with the full bracket set before you click. At 1:1 the stop goes to breakeven. After one clean win, the plan was one A+ trade: protect it. There is no "house money".</p>`},
  {t:'Log it',h:`<p>Journal right after the trade while it is fresh: model, session, entry, stop, target, result in R, and whether you followed the plan. Log losses too: patterns show up in losses. The journal only helps if it is true.</p>`},
  {t:'Your written plan',h:`<p>Every decision made before the session is one you do not have to make under pressure. Your plan answers <b>when</b> you trade, <b>which models</b>, <b>how you enter and exit</b>, your <b>risk and limits</b>, and <b>the numbers</b> you are working toward. Build it in <b>Trading Plan → Build your plan</b>, go through the 6 steps and save. It then shows on your dashboard and feeds your pre-trade checklist.</p><p><a class="btn" href="/#plan">Open Trading Plan →</a> <button type="button" class="btn" data-plan-check>I built it: check</button></p><div data-plan-fb></div>`}],
 recall:rc('Risk Management','Contracts = ?',['(Account × risk %) ÷ (stop points × value per point)','Target ÷ stop','Win rate × account','Stop × 2'],'Sizing from the stop.'),
 steps:[['<b>7:00 AM.</b> The checklist before any chart clicking.',tblx(['Check','Done'],[['News calendar','✓'],['Opening prices and levels','✓'],['Model for today','✓'],['Bracket preset','✓'],['Daily stop known','✓']])],['<b>The session.</b> Range, sweep, flip, trade.',tblx(['Time','Event'],[['7:00–9:25','Range builds'],['9:30–10:00','Sweep and flip (A+ window)'],['Entry','15/40 bracket'],['+15 pts','Stop to breakeven']])],['<b>After.</b> One clean win by 10:40: done. Journal it.',tblx(['Field','Example'],[['Model','ESC VLCTY (New York)'],['Result','+2.7R'],['Followed plan','Yes']])]],
 explain:{prompts:['Describe one full trading day from the pre-session checklist to the journal, and say why you stop after one clean win.','Explain what goes in your written trading plan, and why it is written before the session.'],
  ideas:['Run a checklist before touching the chart: news, levels, model, bracket, daily stop','Set the full bracket before you click','Move the stop to breakeven at 1:1','One clean A+ win is a good day: protect it','Journal fresh and honestly, including losses','The plan covers when, which models, entries and exits, risk and limits, and numbers','Decisions made before the session are not made under pressure']},
 gens:[dayOrder,jr,dayNum],
 bank:BANKS('A day',[
  ['What comes first before the session?',['The checklist: news, levels, model, bracket, daily stop','Open a trade','Social media','The first setup you see'],'No chart clicking until it is done.'],
  ['One clean win by 10:40. What now?',['Done. Protect the day','Take more','Double size','Remove the stop'],'Most giveback happens after the best trade.'],
  ['When do you journal?',['Right after the trade, honestly','Next week','Only wins','Never'],'Fresh and true.'],
  ['Why journal losses too?',['Patterns show up in losses','They do not matter','For the firm','To feel bad'],'Your journal is where mistakes become visible.'],
  ['Your plan card lives in…',['The Trading Plan tab and your dashboard','Nowhere','Discord DMs','Your broker'],'It also feeds your pre-trade checklist.'],
  ['A written plan helps because…',['Decisions are made before the pressure','It looks good','Coaches require it','It removes risk'],'Fewer decisions in the moment.'],
  ['Two losses in the morning and a perfect setup appears. You…',['Are done for the day','Take it small','Take it at full size','Take it with a wider stop'],'The daily stop is a rule, not a suggestion.']]),
 gensExtra:after,examDesc:'Ordering a trading day, journal contents, daily-stop dollars and plan decisions.'});
})();
