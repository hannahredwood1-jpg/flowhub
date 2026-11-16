/* ============================================================
   PRACTICE (practice page only): the trade simulator. A footprint scenario builds on your screen. You read it (guided questions), make the call
   (buy, sell or skip), place a stop and a target by clicking on the chart, then watch what happens candle by candle. The debrief says what the flow was
   showing, whether your call, stop and target fit it, and what to fix. Made-up data, never a signal.
============================================================ */
(()=>{
const R=18,BASE=21480,C=EXC,price=r=>BASE-r,rh=22,top=14,Lx=78,W=950,N=9,CW=(800-Lx-14)/N;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
/* a candle's footprint rows from a small spec: a/b = top/bottom row, bias -1..1 (buyers +), s = size, stack [from,to,'buy'|'sell'], thin = tiny volume at the top, hot [row, multiple, askShare] */
function candle(sp,r){
  const rows=Array.from({length:R},()=>[0,0]);
  for(let i=sp.a;i<=sp.b;i++){const mid=(sp.a+sp.b)/2,bell=1-Math.abs(i-mid)/((sp.b-sp.a)/2+1)*.6;let v=Math.max(4,Math.round(sp.s*bell*(.75+.5*r())));let sh=clamp(.5+.5*sp.bias+(r()-.5)*.1,.1,.9);
    if(sp.stack&&i>=sp.stack[0]&&i<=sp.stack[1])sh=sp.stack[2]==='buy'?.86:.14;
    if(sp.thin&&i<=sp.a+1)v=Math.max(3,Math.round(v*.16));
    if(sp.hot&&i===sp.hot[0]){v=Math.round(v*sp.hot[1]);sh=sp.hot[2]}
    const ask=Math.round(v*sh);rows[i]=[v-ask,ask]}
  const up=sp.up??sp.bias>=0;
  return{rows,a:sp.a,b:sp.b,big:sp.big,up,open:sp.o??(up?sp.b-1:sp.a+1),close:sp.c??(up?sp.a+1:sp.b-1)}}

/* the five scenarios. Rows count down from the top (row 0 = 21,480). inv = the row that proves the idea wrong; tgt = sensible target rows. */
const SCN=[
 {id:'absorb',name:'Selling into a low',ideal:'long',ok:[],inv:{long:13},tgt:{long:[3,5]},decideAt:5,
  intro:'NQ has been falling. You are watching the footprint for a reason to buy, a reason to sell, or a reason to stay out. Read the first five candles.',
  c:[{a:3,b:7,bias:-.45,s:90},{a:6,b:10,bias:-.5,s:100},{a:9,b:12,bias:-.55,s:110},{a:11,b:14,bias:-.2,s:120,up:true,hot:[14,3.2,.18],o:13,c:11},{a:9,b:12,bias:.5,s:75,stack:[10,11,'buy']},
     {a:7,b:11,bias:.5,s:80,stack:[8,9,'buy']},{a:5,b:9,bias:.5,s:85},{a:6,b:9,bias:-.1,s:35},{a:3,b:8,bias:.5,s:90,stack:[4,6,'buy']}],
  qs:[['Candle 4 pushed to the lowest price so far on the most volume yet, but it closed well above its low. What does that suggest?',['Big buyers soaked up the selling: absorption','Sellers are speeding up','Nothing: volume does not matter','The market is closed'],'Heavy selling hit that price, yet price could not fall further. Someone passive was buying all of it. That is absorption.'],
      ['Look at candle 5. What changed in the delta row under it?',['Delta turned positive: buyers took over','Delta got more negative','Delta stayed exactly the same','There is no delta'],'After the absorption, buyers became the aggressive side. The green stacked cells and the positive delta show it.'],
      ['Where would a buy idea be proven wrong?',['Just below the absorption low (the low of candle 4)','Anywhere above the entry','At the top of candle 1','There is no wrong place'],'The idea is "sellers were absorbed at that low". If price trades below the low, the idea is wrong, so the stop goes just beyond it.']],
  facts:['Candle 4 traded the most volume at the lowest price, then closed off the low: sellers were absorbed.','Candle 5 flipped delta positive with stacked buy imbalances: buyers took over.','The low of candle 4 gave a clear place to be proven wrong.'],
  whyCall:{long:'A buy fits: absorption at the low, then buyers took control.',short:'Selling here is selling into an absorbed low: the sellers had just been absorbed.',skip:'Staying out is not wrong, but the flow gave a clear reason to buy and a clear place for a stop.'},
  notes:['Buyers keep lifting the ask: stacked buy cells again.','Price runs into the area where candle 1 started.','A quiet pause with little selling.','Buyers press again and price reaches the earlier highs.'],
  next:'Look for the candle that traded heavy volume at an extreme and failed to follow through. Then wait for the flow to flip before you act.'},
 {id:'exhaust',name:'A push that runs out of fuel',ideal:'short',ok:['skip'],inv:{short:4},tgt:{short:[11,14]},decideAt:5,
  intro:'NQ has been rising. You are watching the footprint for a reason to buy, sell or stay out. Read the first five candles.',
  c:[{a:13,b:16,bias:.5,s:100,stack:[14,15,'buy']},{a:10,b:14,bias:.45,s:90},{a:7,b:11,bias:.35,s:70},{a:4,b:8,bias:.15,s:40,thin:true},{a:4,b:7,bias:-.15,s:28,up:false},
     {a:5,b:10,bias:-.5,s:80,stack:[6,8,'sell']},{a:9,b:13,bias:-.5,s:85},{a:10,b:12,bias:.1,s:35},{a:11,b:15,bias:-.45,s:80}],
  qs:[['Candle 4 made a new high, but the cells at the top are tiny. What does that suggest?',['Few traders were willing to buy up there: the push is running out of fuel','Buyers are stronger than ever','A news event','Nothing'],'A new high with almost no business done at the top means very few were willing to pay those prices. That is exhaustion.'],
      ['Compare the delta of candles 1 to 4. What is happening?',['Delta is shrinking: less and less buying behind each push','Delta is growing each time','Delta is negative every time','Delta is identical'],'Each push has less buying behind it. Price can still drift up for a while, but the energy is fading.'],
      ['Where would a sell idea be proven wrong?',['Just above the high of candle 4','Below the start of the move','At the middle of candle 2','There is no wrong place'],'If price pushes above that high with real buying, the idea that the push is exhausted is wrong.']],
  facts:['Candle 4 made a new high on tiny volume at the top: exhaustion.','Delta shrank candle after candle: each push had less behind it.','Candle 5 stalled with negative delta at the top.'],
  whyCall:{short:'A sell fits: the push ran out of fuel and candle 5 stalled at the top.',long:'Buying here is buying the last, weakest push: the flow showed fading energy.',skip:'Staying out is reasonable: exhaustion is a clue, and the move had not turned yet.'},
  notes:['Sellers take over: stacked red cells.','Price gives back the whole last push.','A weak bounce on little volume.','Sellers press again.'],
  next:'When a high comes on thin volume, wait for the first sign that sellers have taken over before you act.'},
 {id:'stack',name:'Buyers in control, then a pullback',ideal:'long',ok:[],inv:{long:12},tgt:{long:[1,4]},decideAt:5,
  intro:'NQ has been rising and has just pulled back. You are watching the footprint. Read the first five candles.',
  c:[{a:14,b:17,bias:.55,s:95,stack:[15,16,'buy']},{a:11,b:15,bias:.6,s:100,stack:[12,14,'buy']},{a:8,b:12,bias:.55,s:95,stack:[9,11,'buy']},{a:9,b:12,bias:-.2,s:30,up:false},{a:8,b:11,bias:.4,s:50},
     {a:5,b:9,bias:.5,s:85,stack:[6,8,'buy']},{a:2,b:6,bias:.55,s:90,stack:[3,5,'buy']},{a:3,b:6,bias:-.1,s:30},{a:0,b:4,bias:.5,s:95,stack:[1,3,'buy']}],
  qs:[['Candles 1 to 3 each show green stacked cells. What does a stack of buy imbalances tell you?',['Buyers are aggressive across several prices in a row: they are in control','Sellers are in control','The candle will reverse for sure','Nothing'],'A stack is one side clearly outnumbering the other at several neighbouring prices. Here it is buyers.'],
      ['Candle 4 pulled back. Look at its volume and cells. What kind of pullback is it?',['A quiet one: little selling and no red stacks','A heavy-selling reversal','A news spike','It cannot be read'],'Small volume and no red stacks means the sellers did not show up. Buyers can step back in.'],
      ['Where would a buy idea be proven wrong?',['Below the low of the pullback (candle 4)','Above the high of candle 3','At the top of the chart','There is no wrong place'],'If price trades below the pullback low, the quiet-pullback idea is wrong.']],
  facts:['Candles 1 to 3 showed stacked buy imbalances: buyers were in control.','Candle 4 was a quiet pullback: little volume, no red stacks.','Candle 5 turned back up with buyers returning.'],
  whyCall:{long:'A buy fits: buyers were in control and the pullback was quiet.',short:'Selling here fights stacked buyers: do not bet against a stack just because it looks stretched.',skip:'Staying out is safe, but the flow gave a clear continuation and a clear stop.'},
  notes:['Buyers push again with stacked cells.','Another stacked push to new highs.','A quiet pause, still no sellers.','A last push to the top of the grid.'],
  next:'When buyers are stacking, wait for a quiet pullback and place your stop beyond its low.'},
 {id:'trap',name:'A breakout that looks strong',ideal:'skip',ok:['short'],inv:{short:4},tgt:{short:[9,14]},decideAt:5,
  intro:'NQ has just broken above recent highs. You are watching the footprint for a reason to buy, sell or stay out. Read the first five candles.',
  c:[{a:9,b:13,bias:.4,s:70},{a:10,b:13,bias:-.2,s:40,up:false},{a:8,b:12,bias:.3,s:60},{a:8,b:11,bias:0,s:45},{a:4,b:9,bias:-.15,s:125,up:true,stack:[4,6,'sell'],o:8,c:5},
     {a:5,b:9,bias:-.5,s:90,stack:[6,8,'sell']},{a:8,b:13,bias:-.55,s:100},{a:11,b:15,bias:-.5,s:90},{a:12,b:14,bias:.1,s:35}],
  qs:[['Candle 5 broke above the earlier highs and looks strong. Look at the red highlighted cells near its top. What are they?',['Sell imbalances: sellers hit the bid hard right where price broke out','Buy imbalances','Nothing important','The close'],'Red highlighted cells at the top of a breakout candle show sellers hitting aggressively exactly where buyers expected follow-through.'],
      ['Candle 5 is green, but its delta is negative. What does that mean?',['Price went up, yet more contracts were sold aggressively than bought: the breakout had no real buyers behind it','Buyers were very strong','The data is wrong','The candle is a doji'],'A move that price makes without the aggression behind it is a divergence. It is a reason for caution, not a trigger by itself.'],
      ['Given this, what is the safest call?',['Do not buy the breakout: skip, or look for a short only with a clear stop','Buy because the candle is green','Buy twice as much','Buy after the next candle for sure'],'A breakout that sellers are absorbing is a classic trap. Not buying it is a decision.']],
  facts:['Candle 5 broke out but showed stacked sell imbalances at its top: sellers absorbed the buyers.','Its delta was negative on a green candle: a divergence.','A long here buys right into the sellers.'],
  whyCall:{skip:'Skipping is the best call: the breakout was being absorbed and the entry would be late.',short:'A sell can work, but the move is already underway and the stop has to go above the breakout high. Skipping was cleaner.',long:'Buying here buys into stacked sellers at the exact spot the breakout failed: a trap.'},
  notes:['Sellers keep hitting: stacked red cells and price is back inside the range.','The breakout is fully reversed.','Price slides toward the base of the range.','A small bounce, nothing more.'],
  next:'Before you buy a breakout, check the delta and the cells at its top. If sellers are stacked there, stand aside.'},
 {id:'fail',name:'A bounce with nobody behind it',ideal:'skip',ok:['short'],inv:{short:10},tgt:{short:[15,17]},decideAt:5,late:true,
  intro:'NQ has been falling and has tried to bounce. You are watching the footprint for a reason to buy, sell or stay out. Read the first five candles.',
  c:[{a:3,b:7,bias:-.4,s:85},{a:6,b:10,bias:-.45,s:95},{a:9,b:12,bias:-.5,s:105,stack:[10,11,'sell']},{a:10,b:13,bias:-.1,s:55,up:true,o:12,c:10},{a:11,b:14,bias:-.55,s:100,stack:[12,13,'sell'],up:false},
     {a:13,b:16,bias:-.5,s:90,stack:[14,15,'sell']},{a:13,b:15,bias:.1,s:30},{a:15,b:17,bias:-.4,s:70},{a:15,b:17,bias:.05,s:30}],
  qs:[['Candles keep making lower lows on red stacked cells. Who is in control?',['Sellers','Buyers','Nobody','It cannot be told'],'Stacked sell imbalances on candle after candle show sellers hitting aggressively across several prices.'],
      ['Candle 4 tried to bounce. Did it show stacked green cells (buyers coming in)?',['No: the bounce had no real buying behind it','Yes, strongly','It is not possible to tell','There was no candle 4'],'A bounce with no buy stacks is just a pause. Nobody is defending the low.'],
      ['What is the main risk of buying here?',['Buying into sellers who are still in control','Missing the top','The spread','There is no risk'],'Buyers have not shown up. Buying a falling market without a reason is hoping.']],
  facts:['Sell stacks on candles 3 and 5: sellers were in control.','The bounce on candle 4 had no buyers behind it.','Selling now would be chasing: the move had already travelled a long way.'],
  whyCall:{skip:'Skipping is right: buying is wrong, and selling now is late, with the stop far away and little room left.',short:'A sell goes with the flow, but it is late: the move has already run and the stop has to go above the bounce.',long:'Buying here has no reason behind it: the low was not defended and sellers were still stacked.'},
  notes:['Sellers press again: another stack.','A weak bounce on little volume.','Sellers push to new lows.','Price stalls near the lows.'],
  next:'If buyers have not shown up with stacks and a delta flip, do not buy a falling market. Late entries need a better price.'}
 ,{id:'cvd',name:'A new low that sellers could not push',ideal:'long',ok:[],inv:{long:14},tgt:{long:[3,6]},decideAt:5,
  intro:'NQ has been falling and has just made another low. You are watching the footprint and the cumulative delta (CVD) row. Read the first five candles.',
  c:[{a:3,b:7,bias:-.5,s:100},{a:6,b:10,bias:-.5,s:100},{a:9,b:13,bias:-.55,s:105},{a:10,b:12,bias:.45,s:70,up:true},{a:11,b:15,bias:-.12,s:55,up:false,o:12,c:13},
     {a:8,b:13,bias:.5,s:85,stack:[10,12,'buy']},{a:6,b:10,bias:.5,s:85},{a:7,b:10,bias:0,s:30},{a:3,b:8,bias:.5,s:95,stack:[4,6,'buy']}],
  qs:[['Candle 5 made a LOWER low than candle 3. Look at the CVD line under the candles. What did the CVD do?',['It made a higher low: sellers pushed less hard this time (a divergence)','It made a lower low too','It went up forever','It cannot be read'],'Price made a new low, but the running total of aggressive selling did not. That mismatch is a CVD divergence: the move is running low on fuel.'],
      ['Is a divergence a reason to buy on its own?',['No: it is a flag. Wait for buyers to show up','Yes, always','Yes, with a bigger size','It means price will go up for sure'],'A divergence says the push is tiring. It does not say who takes over. Wait for the flow to flip, then use the strategy\'s own entry.'],
      ['Where would a buy idea be proven wrong?',['Just below the low of candle 5','Above the high of candle 1','At the middle of candle 2','There is no wrong place'],'If price trades below that low, the idea that sellers ran out of fuel is wrong.']],
  facts:['Price made a lower low on candle 5, but the CVD made a higher low: a divergence.','The delta on candle 5 was only slightly negative after a quiet bounce.','Candle 6 then showed stacked buy imbalances: buyers took over.','The low of candle 5 gave a clear place to be proven wrong.'],
  whyCall:{long:'A buy fits: a divergence at the low, then buyers took over with stacked cells.',short:'Selling the new low sells into a move that was already running out of fuel.',skip:'Staying out is not wrong, but the divergence and the flip gave a clear reason and a clear stop.'},
  notes:['Buyers take over: stacked green cells.','Price reaches the area where candle 2 traded.','A quiet pause with little selling.','Buyers press again.'],
  next:'When price makes a new low but the CVD does not, mark it, then wait for buyers to show up before you act.'},
 {id:'sweep',name:'A sweep of yesterday\'s low',ideal:'long',ok:[],inv:{long:12},tgt:{long:[2,5]},decideAt:5,levels:[{row:11,label:'Yesterday low (SSL)'}],
  intro:'NQ is trading near yesterday\'s low. The dashed gold line marks it: sell-side liquidity (SSL). Read the first five candles.',
  c:[{a:4,b:8,bias:.1,s:70},{a:6,b:10,bias:-.35,s:75},{a:8,b:11,bias:-.3,s:60},{a:9,b:13,bias:-.2,s:125,up:true,o:12,c:10,hot:[12,3.2,.16],big:[12,52,'sell']},{a:8,b:12,bias:.5,s:80,stack:[10,11,'buy'],o:12,c:10,up:true},
     {a:5,b:10,bias:.5,s:80,stack:[6,8,'buy']},{a:3,b:7,bias:.5,s:85},{a:4,b:7,bias:-.1,s:30},{a:0,b:5,bias:.5,s:95,stack:[1,3,'buy']}],
  qs:[['Candle 4 traded below yesterday\'s low and then closed back above it. What is that called?',['A sweep: the stops under the low were taken and price came back','A breakout that is confirmed','A gap','Nothing'],'Price ran through the low, took the stops resting there, and returned. That is a sweep.'],
      ['The gold diamond on candle 4 is a big print: one large sell. Price did not fall after it. What does that suggest?',['The big seller was absorbed: buyers took everything offered','Sellers are about to win','The data is wrong','Nothing'],'A big aggressive print that does not move price is absorbed. Sellers used their size and did not get a result.'],
      ['Where would a buy idea be proven wrong?',['Just below the low of candle 4 (the low of the sweep)','Above yesterday\'s low line','At the top of the chart','There is no wrong place'],'If price trades below the sweep low, the sweep idea has failed.']],
  facts:['Candle 4 swept yesterday\'s low and closed back above it.','A big sell print hit near the low and price did not fall: absorbed.','Candle 5 showed stacked buy imbalances: buyers took over after the sweep.','The sweep low gave a clear place to be proven wrong.'],
  whyCall:{long:'A buy fits: a sweep, a big print that was absorbed, then buyers took control.',short:'Selling after a sweep and an absorbed print fights the flow.',skip:'Staying out is safe, but the flow gave a clear reason to buy and a clear stop.'},
  notes:['Buyers keep lifting the ask: stacked buy cells.','Price climbs back toward where it fell from.','A quiet pause.','Buyers press again.'],
  next:'A sweep is only a flag. Wait for the big print to be absorbed and for buyers to flip the delta, then place the stop beyond the sweep low.'},
 {id:'lvn',name:'A thin path ahead',ideal:'long',ok:[],inv:{long:11},tgt:{long:[3,6]},decideAt:5,
  intro:'NQ has been balancing and then pushed up. Look at the volume profile on the right (gold boxes are thin spots, blue boxes are busy spots). Read the first five candles.',
  c:[{a:11,b:15,bias:.1,s:100},{a:12,b:16,bias:-.1,s:105},{a:11,b:15,bias:.15,s:100},{a:6,b:12,bias:.55,s:34,stack:[7,10,'buy'],up:true},{a:8,b:11,bias:0,s:28,up:false},
     {a:6,b:10,bias:.5,s:40,stack:[7,9,'buy']},{a:3,b:8,bias:.5,s:42,stack:[4,6,'buy']},{a:2,b:5,bias:.1,s:80},{a:2,b:4,bias:-.1,s:90}],
  qs:[['Look at the volume profile on the right. Where is the thin spot (few contracts traded, gold box) above the balance area?',['Between the balance area and the recent high, where price moved fast','Inside the balance area','Below the balance area','There is none'],'Price jumped through those prices quickly, so little business was done there. A low-volume node (LVN) is a thin spot.'],
      ['What does a thin spot usually mean for price when it comes back to it?',['Price tends to move through it quickly','Price always stops there','It is a guaranteed target','Nothing'],'Little trading means little to slow price down. It is not a guarantee, just a smoother path.'],
      ['Where would a buy idea be proven wrong?',['Below the quiet pullback (candle 5) low','At the top of candle 1','Above candle 4','There is no wrong place'],'If price falls back below the pullback low and into the balance area, the idea of a thin path up is wrong.']],
  facts:['The profile showed a heavy balance area below and a thin spot above it.','Candle 4 pushed through the thin spot on stacked buy imbalances.','Candle 5 was a quiet pullback, a clean place to define the stop.','Price then moved through the thin area quickly. Heavy trading returned near the top, where a target makes sense.'],
  whyCall:{long:'A buy fits: buyers pushed through the thin spot, the pullback was quiet, and the path ahead was thin.',short:'Selling here fights a thrust through a thin spot and a quiet pullback.',skip:'Staying out is safe, but the flow and the profile gave a clear idea and a clear stop.'},
  notes:['Price runs through the thin area.','Another stacked push.','Heavy trading returns: price is slowing down.','Price stalls where the volume is heavy.'],
  next:'Check the profile: a thin path to your target is friendlier than a heavy node in front of it. Put your target before the heavy node.'}

];

const wrapSvg=(inner,h)=>`<svg class="xsvg sim-svg" viewBox="0 0 ${W} ${h}" role="img" aria-label="A footprint chart you are practising on">${inner}</svg>`;
/* the chart: candles up to `vis`, the entry / stop / target lines, and optional click rows */
function chartSvg(it,st,vis,pick){
  const cs=it.cands,stt=it.stats,cw=CW,h=top+R*rh+98,imb=st.imb!==false,showProf=st.prof!==false;let s=`<rect width="${W}" height="${h}" rx="10" fill="${C.bg}"/>`;
  for(let i=0;i<R;i++)s+=`<line x1="${Lx}" x2="${W-8}" y1="${top+i*rh}" y2="${top+i*rh}" stroke="${C.grid}"/>`+exT(Lx-8,top+i*rh+rh*.68,exN(price(i)),{a:'end',s:10});
  const mx=Math.max(...cs.flatMap(c=>c.rows.map(x=>x[0]+x[1])));
  (it.levels||[]).forEach(l=>{const y=top+l.row*rh+rh/2;s+=`<line x1="${Lx}" x2="${Lx+N*cw}" y1="${y}" y2="${y}" stroke="${C.gold}" stroke-width="1.4" stroke-dasharray="2 5"/>`+exT(Lx+4,y-4,l.label,{s:10,c:C.gold})});
  if(showProf){const pr=Array(R).fill(0);for(let k=0;k<Math.min(vis,cs.length);k++)cs[k].rows.forEach((x,i)=>{pr[i]+=x[0]+x[1]});const pm=Math.max(1,...pr),tr=pr.map((v,i)=>v>0?i:-1).filter(i=>i>=0),lo=Math.min(...tr),hi=Math.max(...tr),X0=Lx+N*cw+8,PW=80;
    for(let i=0;i<R;i++){const v=pr[i],y=top+i*rh,inR=tr.length&&i>=lo&&i<=hi,lvn=inR&&v<.35*pm,hvn=v>.7*pm;
      if(v>0||lvn)s+=`<rect x="${X0+PW-(v/pm)*PW}" y="${y+3}" width="${Math.max(1,(v/pm)*PW)}" height="${rh-6}" rx="1.5" fill="${hvn?C.blue:C.dim}" fill-opacity="${hvn?.7:.55}"/>`;
      if(lvn)s+=`<rect x="${X0}" y="${y+1}" width="${PW}" height="${rh-2}" rx="2" fill="none" stroke="${C.gold}" stroke-width="1.4"/>`}
    s+=exT(X0+PW/2,top+R*rh+14,'Volume at price',{a:'middle',s:10,c:C.dim})}
  for(let k=0;k<Math.min(vis,cs.length);k++){const c=cs[k],q=stt[k],x0=Lx+k*cw;
    c.rows.forEach((x,i)=>{const v=x[0]+x[1];if(!v)return;const y=top+i*rh,bi=imb&&q.buy[i],si=imb&&q.sell[i];
      s+=`<rect x="${x0+5}" y="${y+1}" width="${cw-8}" height="${rh-2}" rx="2" fill="${bi?C.up:si?C.dn:C.blue}" fill-opacity="${bi||si?.42:.06+.3*v/mx}"/>`+exT(x0+cw/2+1,y+rh*.7,`<tspan fill="${si?'#ff8a85':C.txt}"${si?' font-weight="700"':''}>${x[0]}</tspan><tspan fill="${C.dim}"> x </tspan><tspan fill="${bi?'#6ee0cf':C.txt}"${bi?' font-weight="700"':''}>${x[1]}</tspan>`,{a:'middle',s:9.5})});
    s+=`<rect x="${x0+1.5}" y="${top+c.a*rh+1}" width="2.6" height="${(c.b-c.a+1)*rh-2}" fill="${c.up?C.up:C.dn}"/>`+exT(x0+cw/2,top+R*rh+14,String(k+1),{a:'middle',s:10,c:C.dim})+
      `<rect x="${x0+cw/2-cw*.34}" y="${top+R*rh+22}" width="${cw*.68}" height="17" rx="2" fill="${q.delta>=0?C.up:C.dn}" fill-opacity=".85"/>`+exT(x0+cw/2,top+R*rh+35,(q.delta>0?'+':'')+q.delta,{a:'middle',s:11,c:'#fff',w:600});
    if(c.big){const by=top+c.big[0]*rh+rh/2,bx=x0+cw-13;s+=`<path d="M${bx} ${by-8}L${bx+8} ${by}L${bx} ${by+8}L${bx-8} ${by}Z" fill="${C.gold}" stroke="#000" stroke-opacity=".4"/>`+exT(bx,by+3,String(c.big[1]),{a:'middle',s:7.5,c:'#111',w:800})}}
  s+=exT(Lx-8,top+R*rh+35,'Delta',{a:'end',s:10,c:C.dim});
  {const cum=[];let t=0;stt.forEach(q=>{t+=q.delta;cum.push(t)});const lo=Math.min(0,...cum),hi=Math.max(0,...cum),by=top+R*rh+48,bh=34,yy=v=>by+bh-((v-lo)/Math.max(1,hi-lo))*bh;
    s+=`<rect x="${Lx}" y="${by}" width="${N*cw}" height="${bh}" rx="3" fill="${C.grid}" fill-opacity=".35"/><line x1="${Lx}" x2="${Lx+N*cw}" y1="${yy(0)}" y2="${yy(0)}" stroke="${C.dim}" stroke-dasharray="2 3"/>`+exT(Lx-8,by+bh/2+4,'CVD',{a:'end',s:10,c:C.dim});
    const pts=cum.slice(0,Math.min(vis,cs.length)).map((v,k)=>[Lx+k*cw+cw/2,yy(v),v]);
    if(pts.length>1)s+=`<polyline points="${pts.map(p=>p[0]+','+p[1]).join(' ')}" fill="none" stroke="${C.blue}" stroke-width="2"/>`;
    pts.forEach(p=>{s+=`<circle cx="${p[0]}" cy="${p[1]}" r="2.6" fill="${C.blue}"/>`});
    if(pts.length)s+=exT(pts[pts.length-1][0]+7,Math.min(by+bh-2,Math.max(by+9,pts[pts.length-1][1]+3)),(pts[pts.length-1][2]>0?'+':'')+pts[pts.length-1][2],{s:9,c:C.txt})}
  if(vis>it.decideAt)s+=`<line x1="${Lx+it.decideAt*cw}" x2="${Lx+it.decideAt*cw}" y1="${top-6}" y2="${top+R*rh}" stroke="${C.gold}" stroke-dasharray="3 4"/>`+exT(Lx+it.decideAt*cw+5,top+8,'you decided here',{s:10,c:C.gold});
  const line=(row,col,label)=>row==null?'':`<line x1="${Lx}" x2="${W-8}" y1="${top+row*rh+rh/2}" y2="${top+row*rh+rh/2}" stroke="${col}" stroke-width="1.8" stroke-dasharray="6 4"/><rect x="${W-66}" y="${top+row*rh+3}" width="60" height="${rh-6}" rx="3" fill="${col}"/>`+exT(W-36,top+row*rh+rh*.68,label,{a:'middle',s:10,c:'#fff',w:700});
  if(st.call&&st.call!=='skip'){const E=cs[it.decideAt-1].close;s+=line(E,C.blue,'ENTRY')+line(st.stop,C.dn,'STOP')+line(st.target,C.up,'TARGET')}
  if(pick)for(let i=0;i<R;i++)s+=`<rect class="xh" data-row="${i}" x="${Lx}" y="${top+i*rh}" width="${W-Lx-70}" height="${rh}" fill="transparent"/>`;
  return wrapSvg(s,h)}

/* ----- the trade: outcome and judgement ----- */
function outcome(it,st){
  const cs=it.cands,E=cs[it.decideAt-1].close,long=st.call==='long',risk=Math.abs(st.stop-E),rew=Math.abs(E-st.target);let end=null;
  for(let k=it.decideAt;k<cs.length&&!end;k++){const c=cs[k],hitS=long?c.b>=st.stop:c.a<=st.stop,hitT=long?c.a<=st.target:c.b>=st.target;if(hitS)end={k,kind:'stop'};else if(hitT)end={k,kind:'target'}}
  if(!end){const last=cs[cs.length-1].close;end={k:cs.length-1,kind:'open',r:risk?((long?E-last:last-E)*-1)/risk:0}}
  end.r=end.kind==='stop'?-1:end.kind==='target'?(risk?rew/risk:0):end.r;end.E=E;end.risk=risk;end.rew=rew;return end}
function judge(it,st){
  const call=st.call,callQ=call===it.ideal?'ideal':it.ok.includes(call)?'ok':'wrong';let stopQ='na',tgtQ='na',out=null,sMsg='',tMsg='';
  if(call!=='skip'){
    const E=it.cands[it.decideAt-1].close,inv=it.inv[call]??(call==='long'?13:4),long=call==='long',bad=long?st.stop<=E:st.stop>=E,badT=long?!(st.target<E):!(st.target>E);
    if(!bad){const gap=long?st.stop-inv:inv-st.stop;stopQ=gap<=0?'tight':gap>5?'wide':'good';
      sMsg=stopQ==='tight'?`Your stop is inside the structure (it is not beyond ${long?'the low':'the high'} that proves the idea wrong). Normal wicks can hit it before the idea is wrong.`:stopQ==='wide'?`Your stop is far beyond the level that proves the idea wrong. You risk much more than the idea needs.`:`Your stop is just beyond the level that proves the idea wrong. That is the right place.`}
    const rr=Math.abs(E-st.target)/Math.max(1,Math.abs(st.stop-E)),tr=it.tgt[call]||[0,R-1];
    if(!badT){tgtQ=rr<1.2?'near':long?(st.target<tr[0]?'far':st.target>tr[1]?'near':'good'):(st.target>tr[1]?'far':st.target<tr[0]?'near':'good');
      tMsg=tgtQ==='near'?`Your target is too close: it pays ${rr.toFixed(1)}× what you risk, or stops short of where the move had room to go.`:tgtQ==='far'?`Your target is beyond where the move had room to go. Take profit where the next level is.`:`Your target is at a sensible level and pays ${rr.toFixed(1)}× what you risk.`}
    if(!bad&&!badT)out=outcome(it,st);
    if(bad)sMsg=`A ${call==='long'?'buy':'sell'} needs the stop ${call==='long'?'below':'above'} your entry.`;
  }
  const ok=callQ!=='wrong'&&(call==='skip'||(stopQ!=='tight'&&stopQ!=='na'&&tgtQ!=='near'&&tgtQ!=='na'));
  return{call,callQ,stopQ,tgtQ,sMsg,tMsg,out,ok}}

/* the 3-minute check: delta over the three candles after the entry, against the trade's direction */
function threeMin(it,st){
  if(!st.call||st.call==='skip')return null;
  const sg=st.call==='long'?1:-1,a=it.decideAt,b=Math.min(it.cands.length,a+3);let sum=0;for(let k=a;k<b;k++)sum+=it.stats[k].delta;
  const v=sg*sum,txt=(sum>0?'+':'')+sum;
  return{n:b-a,sum,txt,lean:v>0?'with':v<0?'against':'mixed'}}
const leanMsg=t=>t.lean==='with'?`Delta over the first three candles is <b>${t.txt}</b>: it is leaning <b>with</b> your trade.`:t.lean==='against'?`Delta over the first three candles is <b>${t.txt}</b>: it is leaning <b>against</b> your trade. That is a warning, not an exit. Your stop and target do not move.`:`Delta over the first three candles is flat: <b>mixed</b>.`;
/* ----- the panel view for each stage ----- */
const btn=(a,t,cls='btn')=>`<button type="button" class="${cls}" data-s="${a}">${t}</button>`;
const callName={long:'Buy',short:'Sell',skip:'Skip'};
function view(it,st,final){
  if(final)st.stage=4;
  const st4=st.stage===4,vis=st.stage<=2?it.decideAt:st.stage===3?it.decideAt+st.step:it.cands.length;
  const imbBox=`<label class="sim-opt"><input type="checkbox" data-s="imb" ${st.imb!==false?'checked':''}> Highlight imbalances <span class="dim">(green: buyers 3x the sellers below · red: sellers 3x the buyers above)</span></label><label class="sim-opt"><input type="checkbox" data-s="prof" ${st.prof!==false?'checked':''}> Show volume at price <span class="dim">(gold boxes: thin spots · blue: busy spots)</span></label>`;
  const legend=`<p class="muted" style="font-size:12.5px;margin:6px 2px">Under the candles: delta for each candle, then the cumulative delta (CVD) line. Gold diamond = a big print (one large trade, with its size). Gold dashed line = a level where stops sit.</p>`;
  let body='';
  if(st.stage===0){const q=it.qs[st.qi],a=st.qa[st.qi];
    body=`<div class="sim-step"><div class="hud">Step 1 of 4 · read the flow · question ${st.qi+1} of ${it.qs.length}</div><p class="sim-q">${q.q}</p><div class="opts">${q.ord.map(i=>`<button type="button" class="opt ${a!=null?(i===0?'right':a===i?'wrong':''):''}" data-s="ans" data-i="${i}" ${a!=null?'disabled':''}>${q.o[i]}</button>`).join('')}</div>${a!=null?`<div class="fb ${a===0?'ok':'no'}"><b>${a===0?'Right.':'Not quite.'}</b> ${q.why}</div>${btn('qnext',st.qi+1<it.qs.length?'Next question →':'Make the call →','btn primary')}`:''}</div>`}
  else if(st.stage===1){body=`<div class="sim-step"><div class="hud">Step 2 of 4 · make the call</div><p class="sim-q">You have read five candles. What do you do? <span class="dim">Skipping is a real decision. The flow is a clue, never a guarantee.</span></p><div class="row">${btn('call:long','Buy (go long)')}${btn('call:short','Sell (go short)')}${btn('call:skip','Skip: stand aside')}</div></div>`}
  else if(st.stage===2){const E=it.cands[it.decideAt-1].close,long=st.call==='long',have=st.stop!=null&&st.target!=null,okSide=have&&(long?st.stop>E&&st.target<E:st.stop<E&&st.target>E);
    const risk=have?Math.abs(st.stop-E):0,rew=have?Math.abs(E-st.target):0;
    body=`<div class="sim-step"><div class="hud">Step 3 of 4 · place your trade</div><p class="sim-q">You ${long?'buy':'sell'} at the next open, near <b>${exN(price(E))}</b>. <b>Click on the chart</b> to set ${st.stop==null?'your <b>stop</b>: the price where the idea is proven wrong':st.target==null?'your <b>target</b>: where you take profit':'a new level (click a row to move the '+(st.mode==='target'?'target':'stop')+')'}.</p>
      <div class="row">${btn('mode:stop','Place stop',st.mode==='stop'?'btn primary':'btn')}${btn('mode:target','Place target',st.mode==='target'?'btn primary':'btn')}</div>
      <p class="muted" style="font-size:13.5px">${have?`Risk ${risk} price points (about ${usd(risk*2)} per MNQ) · reward ${rew} points · ${(rew/Math.max(1,risk)).toFixed(1)} to 1${okSide?'':' <b style="color:var(--loss)">· a '+(long?'buy needs the stop below and the target above':'sell needs the stop above and the target below')+' your entry</b>'}`:'Both lines are needed before the replay.'}</p>
      ${btn('go','Start the replay →','btn primary')}</div>`.replace('data-s="go"',`data-s="go" ${have&&okSide?'':'disabled'}`)}
  else if(st.stage===3){const k=Math.min(st.step,it.cands.length-it.decideAt),note=k>0?it.notes[Math.min(k-1,it.notes.length-1)]:'';
    const tm=threeMin(it,st),tmBox=tm?(k>=3?`<div class="callout key"><span class="hud">The 3-minute check</span><p>${leanMsg(tm)}</p><p class="dim">Log it in your trade journal after real trades: With me / Against me.</p></div>`:`<p class="dim">3-minute check: watching the first three candles after your entry…</p>`):'';
    body=`<div class="sim-step"><div class="hud">Step 4 of 4 · the replay</div><p class="sim-q">${note||'The next candle is about to print…'}</p>${tmBox}<div class="row">${btn('skipplay','Jump to the end','btn')}</div></div>`}
  else{const j=judge(it,st);st.j=j;const o=j.out;
    const tag=(t,c)=>`<span class="chip ${c}">${t}</span>`;
    body=`<div class="sim-debrief"><div class="hud">Your debrief</div>
      <div class="sim-row"><b>The call</b>${tag(callName[j.call]||'',j.callQ==='ideal'?'ok':j.callQ==='ok'?'live':'bad')}<p>${it.whyCall[j.call]}</p></div>
      <div class="sim-row"><b>What the flow was showing</b><ul>${it.facts.map(f=>`<li>${f}</li>`).join('')}</ul></div>
      ${j.call!=='skip'&&j.callQ==='wrong'?`<div class="sim-row"><b>Your stop and target</b><p>Because the call itself did not fit the flow, the stop and target are not the problem here: fix the decision first.${o?` Price ${o.kind==='stop'?'reached your stop':o.kind==='target'?'reached your target':'did not reach either level'}${o.kind==='target'?'. <b>You got lucky:</b> a good result from a bad decision teaches the wrong habit.':'.'}`:''}</p></div>`:j.call!=='skip'?`<div class="sim-row"><b>Your stop</b>${tag(j.stopQ==='good'?'Good':j.stopQ==='tight'?'Too tight':j.stopQ==='wide'?'Too wide':'Wrong side',j.stopQ==='good'?'ok':'bad')}<p>${j.sMsg}</p></div>
      <div class="sim-row"><b>Your target</b>${tag(j.tgtQ==='good'?'Good':j.tgtQ==='near'?'Too small':j.tgtQ==='far'?'Too far':'Wrong side',j.tgtQ==='good'?'ok':'bad')}<p>${j.tMsg||'A target needs to be on the other side of your entry.'}</p></div>
      ${o?`<div class="sim-row"><b>What happened</b>${tag(o.kind==='target'?`Target hit · +${o.r.toFixed(1)}R`:o.kind==='stop'?'Stopped out · -1R':'Still open at the end',o.kind==='target'?'ok':o.kind==='stop'?'bad':'live')}<p>${o.kind==='target'?'Price reached your target.':o.kind==='stop'?'Price reached your stop first.':'Neither level was reached in the replay.'} ${j.callQ==='wrong'&&o.kind==='target'?'<b>You got lucky:</b> the call did not fit the flow. A good result from a bad decision still teaches the wrong habit.':j.callQ!=='wrong'&&o.kind==='stop'?'<b>A good decision can still lose.</b> Judge the decision against the flow, not only the result.':''}</p></div>`:''}`:`<div class="sim-row"><b>What would have happened</b><p>Standing aside ${it.ideal==='skip'?'was the best call here.':'meant missing the idea the flow gave. That costs nothing, but look at the facts above and ask what you were waiting for.'}</p></div>`}
      ${(()=>{const tm=threeMin(it,st);return tm?`<div class="sim-row"><b>The 3-minute check</b>${tag(tm.lean==='with'?'Leaning with you':tm.lean==='against'?'Leaning against you':'Mixed',tm.lean==='with'?'ok':tm.lean==='against'?'bad':'live')}<p>${leanMsg(tm)} In real trades, log this in your journal and look at your own results over time. It never moves your stop or target.</p></div>`:''})()}
      <div class="sim-row"><b>Next time</b><p>${it.next}</p></div></div>`}
  return `<div class="sim">${st.stage<4?imbBox:''}${chartSvg(it,st,vis,st.stage===2)}${legend}${body}</div>`}

const K_SIM={chart:false,auto:true,
  html(it,st,o={}){if(!st.stage&&st.stage!==0)Object.assign(st,{stage:0,qi:0,qa:[],call:null,stop:null,target:null,mode:'stop',step:0,imb:true});return view(it,st,!!o.res)},
  bind(root,it,st,chg,ch,rerender,finish){
    const box=()=>$('.sim',root),paint=()=>{const b=box();if(b)b.outerHTML=view(it,st,false)};
    const stop=()=>{if(st._t){clearInterval(st._t);st._t=null}};
    const end=()=>{stop();finish()};
    const play=()=>{stop();st.stage=3;st.step=0;paint();st._t=setInterval(()=>{const total=it.cands.length-it.decideAt;if(st.step<total){st.step++;paint()}if(st.step>=total){stop();setTimeout(end,900)}},950)};
    root.addEventListener('click',e=>{
      const r=e.target.closest('[data-row]');
      if(r&&st.stage===2){const row=+r.dataset.row;if(st.stop==null)st.stop=row;else if(st.target==null)st.target=row;else if(st.mode==='target')st.target=row;else st.stop=row;if(st.stop!=null&&st.target==null)st.mode='target';paint();return}
      const b=e.target.closest('[data-s]');if(!b||b.disabled)return;const a=b.dataset.s;
      if(a==='ans'){st.qa[st.qi]=+b.dataset.i;paint()}
      else if(a==='qnext'){if(st.qi+1<it.qs.length){st.qi++}else st.stage=1;paint()}
      else if(a.startsWith('call:')){st.call=a.slice(5);if(st.call==='skip'){st.stage=3;st.step=0;play();return}st.stage=2;st.stop=null;st.target=null;st.mode='stop';paint()}
      else if(a.startsWith('mode:')){st.mode=a.slice(5);paint()}
      else if(a==='go'){play()}
      else if(a==='skipplay'){stop();st.step=it.cands.length-it.decideAt;paint();setTimeout(end,500)}});
    root.addEventListener('change',e=>{if(e.target.dataset&&e.target.dataset.s==='imb'){st.imb=e.target.checked;paint()}else if(e.target.dataset&&e.target.dataset.s==='prof'){st.prof=e.target.checked;paint()}})},
  has:(it,st)=>st.stage===4||st.call!=null,
  grade:(it,st)=>{const j=judge(it,st);return{ok:j.ok,j}},
  correct:it=>callName[it.ideal],
  fb:(it,st,g)=>g.ok?'':`<p>Check the debrief above: it shows what to change.</p>`};
K.sim=K_SIM;

/* one scenario per task, built fresh with new volumes every time */
const simDrill=r=>{
  const sc=SCN[Math.floor(r()*SCN.length)],cands=sc.c.map(sp=>candle(sp,r));
  const it={kind:'sim',topic:'Trade simulator',q:sc.intro,why:`<b>${sc.name}.</b> ${sc.next}`,...sc,cands};
  it.stats=exFpStats(cands.map(c=>({rows:c.rows})));
  it.qs=sc.qs.map(([q,o,why])=>({q,o,why,ord:shuf(o.map((_,i)=>i))}));
  return it};
MODS.push({id:'px3',n:MODS.length+1,ph:0,t:'Trade simulator: practise the flow on your screen',out:'Read the flow, make the call, place your trade and see what happens.',learn:[],bank:[],drills:[simDrill]});
})();
