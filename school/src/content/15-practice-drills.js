/* ============================================================
   PRACTICE (practice page only): hands-on chart drills. Each task puts a chart on screen and asks you to click the answer on the chart itself:
   the imbalance cells in a footprint, the busiest candle, the point of control, the big resting order on a heatmap, the candle with the most selling.
   Fresh generated data every time, instant feedback, correct answers shown in green on the chart. Styled like the explorers in the lessons.
============================================================ */
(()=>{
const C=EXC;
const rowsOf=n=>Array.from({length:n},(_,i)=>i);
const hit=(id,x,y,w,h)=>`<rect data-id="${id}" class="xh" x="${x}" y="${y}" width="${w}" height="${h}" fill="transparent"/>`;
/* colour a clickable thing: chosen (before checking) or right / wrong / missed (after) */
const mark=(id,sel,ans,res)=>{const on=sel.includes(id),want=ans.includes(id);if(!res)return on?'sel':'';return on&&want?'ok':on?'bad':want?'miss':''};
const stroke=(m)=>m==='sel'?`stroke="${C.sig}" stroke-width="2.2"`:m==='ok'?`stroke="${C.up}" stroke-width="2.6"`:m==='bad'?`stroke="${C.dn}" stroke-width="2.6"`:m==='miss'?`stroke="${C.gold}" stroke-width="2.4" stroke-dasharray="4 3"`:'';

/* ---- 1. footprint: click every imbalance cell ---- */
function fpDrill(r){
  const R=9,n=3,cs=exFpData(Math.floor(r()*1e9)).slice(0,3),st=exFpStats(cs),ans=[];
  cs.forEach((c,k)=>c.rows.forEach((x,i)=>{if(st[k].buy[i]||st[k].sell[i])ans.push(k+'-'+i)}));
  if(!ans.length){const k=0,i=cs[0].rows.findIndex(x=>x[0]+x[1]>0);cs[0].rows[i]=[6,60];if(cs[0].rows[i+1])cs[0].rows[i+1]=[8,20];const st2=exFpStats(cs);cs.forEach((c,kk)=>c.rows.forEach((x,ii)=>{if(st2[kk].buy[ii]||st2[kk].sell[ii])ans.push(kk+'-'+ii)}));}
  const W=800,Lx=74,cw=(W-Lx-30)/n,rh=29,top=14,H=top+R*rh+12;
  const draw=(sel,res)=>{let s=`<svg class="xsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="A footprint chart: click the imbalance cells"><rect width="${W}" height="${H}" rx="10" fill="${C.bg}"/>`;
    for(let i=0;i<R;i++)s+=`<line x1="${Lx}" x2="${Lx+n*cw}" y1="${top+i*rh}" y2="${top+i*rh}" stroke="${C.grid}"/>`+exT(Lx-8,top+i*rh+rh*.65,exN(21470-i),{a:'end',s:11});
    cs.forEach((c,k)=>c.rows.forEach((x,i)=>{if(!(x[0]+x[1]))return;const id=k+'-'+i,m=mark(id,sel,ans,res),x0=Lx+k*cw,y=top+i*rh;
      s+=`<g class="xcell ${m}"><rect x="${x0+9}" y="${y+1.5}" width="${cw-14}" height="${rh-3}" rx="3" fill="${C.blue}" fill-opacity=".14" ${stroke(m)}/>`+exT(x0+cw/2+2,y+rh*.66,`${x[0]}<tspan fill="${C.dim}"> × </tspan>${x[1]}`,{a:'middle',s:12,c:C.txt})+hit(id,x0+9,y+1.5,cw-14,rh-3)+'</g>'}));
    return s+'</svg>'};
  return {kind:'xclick',topic:'Footprint',multi:true,q:'<b>Click every imbalance cell.</b> A <b>buy imbalance</b> is a buyers number (right) at least 3 times the sellers number one row below it. A <b>sell imbalance</b> is a sellers number (left) at least 3 times the buyers number one row above it. Ignore tiny numbers.',draw,ans,
   why:'An imbalance is one side clearly outnumbering the other at neighbouring prices. Buy: ask here ≥ 3× the bid one row below. Sell: bid here ≥ 3× the ask one row above.',hint:'Pick a cell on the right side (buyers) and compare it with the left number one row down. For sellers compare the left number with the right number one row up.'}}

/* ---- 2. volume: click the busiest / quietest candle ---- */
function volDrill(r){
  const cs=exVolData(Math.floor(r()*1e9)).slice(0,24),n=cs.length,busy=r()<.65;
  const avg=cs.map((c,i)=>i<5?0:cs.slice(Math.max(0,i-20),i).reduce((a,x)=>a+x.v,0)/Math.min(20,i));
  const score=cs.map((c,i)=>avg[i]?c.v/avg[i]:busy?-1:99);
  let idx=0;score.forEach((v,i)=>{if(busy?v>score[idx]:v<score[idx])idx=i});if(!avg[idx])idx=busy?cs.reduce((b,c,i)=>c.v>cs[b].v?i:b,0):cs.reduce((b,c,i)=>c.v<cs[b].v?i:b,0);
  const ans=[String(idx)],W=800,H=330,L=16,R=784,dx=(R-L)/n,pt=14,pb=210,vt=226,vb=312,lo=Math.min(...cs.map(c=>c.l))-1,hi=Math.max(...cs.map(c=>c.h))+1,Y=p=>pb-(p-lo)/(hi-lo)*(pb-pt),vm=Math.max(...cs.map(c=>c.v))*1.08,VY=v=>vb-v/vm*(vb-vt),X=i=>L+dx*(i+.5);
  const draw=(sel,res)=>{let s=`<svg class="xsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Candles with volume bars: click a candle"><rect width="${W}" height="${H}" rx="10" fill="${C.bg}"/><line x1="${L}" x2="${R}" y1="${vt-8}" y2="${vt-8}" stroke="${C.line}"/>`+exT(L+4,vt+2,'Volume',{c:C.dim,s:10});
    cs.forEach((c,i)=>{const id=String(i),m=mark(id,sel,ans,res),up=c.c>=c.o,col=up?C.up:C.dn,x=X(i);
      if(m)s+=`<rect x="${x-dx/2+1}" y="${pt-6}" width="${dx-2}" height="${vb-pt+10}" rx="4" fill="${m==='ok'?C.up:m==='bad'?C.dn:m==='miss'?C.gold:C.sig}" fill-opacity=".14" ${stroke(m)}/>`;
      s+=`<line x1="${x}" x2="${x}" y1="${Y(c.h)}" y2="${Y(c.l)}" stroke="${col}"/><rect x="${x-dx*.3}" y="${Y(Math.max(c.o,c.c))}" width="${dx*.6}" height="${Math.max(1.5,Math.abs(Y(c.o)-Y(c.c)))}" fill="${col}"/><rect x="${x-dx*.3}" y="${VY(c.v)}" width="${dx*.6}" height="${vb-VY(c.v)}" fill="${col}" fill-opacity=".6"/>`+hit(id,x-dx/2,pt-6,dx,vb-pt+10)});
    return s+'</svg>'};
  return {kind:'xclick',topic:'Volume',q:busy?'<b>Click the busiest candle:</b> the one whose volume bar is the biggest compared with the candles before it.':'<b>Click the quietest candle:</b> the one whose volume bar is the smallest compared with the candles before it.',draw,ans,
   why:busy?'A busy candle is one with much more volume than normal. It shows where a lot of people showed up. Compare each bar with the recent average, not with the whole chart.':'A quiet candle has far less volume than normal: little interest. Compare each bar with the recent average.',hint:'Look at the bars under the candles and find the tallest (or shortest) one compared with the bars just before it.'}}

/* ---- 3. profile: click the point of control / thin spot ---- */
function profDrill(r){
  const cs=exVolData(Math.floor(r()*1e9)).slice(0,40),bins=exBins(cs,cs.length),va=exVA(bins),ks=va.ks.slice().sort((a,b)=>b-a),mx=Math.max(...ks.map(k=>bins[k])),which=r()<.6?'poc':'lvn';
  let ans;if(which==='poc')ans=[String(va.poc)];else{const inner=ks.slice(2,-2),mn=Math.min(...inner.map(k=>bins[k]));ans=[String(inner.find(k=>bins[k]===mn))]}
  const W=800,rh=Math.min(24,300/ks.length),H=ks.length*rh+24,x0=74;
  const draw=(sel,res)=>{let s=`<svg class="xsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="A volume profile: click a price row"><rect width="${W}" height="${H}" rx="10" fill="${C.bg}"/>`;
    ks.forEach((k,i)=>{const id=String(k),m=mark(id,sel,ans,res),y=12+i*rh,w=Math.max(3,bins[k]/mx*(W-x0-40));
      s+=exT(x0-8,y+rh*.66,exN(k),{a:'end',s:10.5})+`<rect x="${x0}" y="${y+2}" width="${w}" height="${rh-4}" rx="2" fill="${C.blue}" fill-opacity=".5" ${stroke(m)}/>`+hit(id,x0-6,y,W-x0-10,rh)});
    return s+'</svg>'};
  return {kind:'xclick',topic:'Volume profile',q:which==='poc'?'<b>Click the point of control (POC):</b> the price with the most volume, the longest bar.':'<b>Click the thinnest spot inside the busy part of the profile</b> (a low volume node): a price where very little traded, so price tends to move through it fast.',draw,ans,
   why:which==='poc'?'The POC is the longest bar: the price where the most business was done.':'A low volume node is a thin spot in the profile. Price tends to slice through it quickly because little business was done there.',hint:which==='poc'?'Find the longest bar.':'Skip the thin edges at the very top and bottom. Look for the shortest bar between the big ones.'}}

/* ---- 4. heatmap: click the big resting order ---- */
function heatDrill(r){
  const T=60,R=24,L=Array.from({length:T},()=>Array(R).fill(0));
  for(let rr=0;rr<R;rr++){let t=Math.floor(r()*10);while(t<T){const len=5+Math.floor(r()*20),s=.06+r()*.22;if(r()<.55)for(let u=t;u<Math.min(T,t+len);u++)L[u][rr]=Math.max(L[u][rr],s*(.85+r()*.3));t+=len+Math.floor(r()*10)}}
  const wall=3+Math.floor(r()*(R-6)),side=r()<.5?-1:1;
  for(let t=4;t<T-4;t++){L[t][wall]=Math.max(L[t][wall],.9+r()*.08);L[t][wall-1]=Math.max(L[t][wall-1],.45);L[t][wall+1]=Math.max(L[t][wall+1],.42)}
  const ans=[String(wall)],W=800,H=330,x0=64,x1=784,pt=10,pb=318,cw=(x1-x0)/T,rh=(pb-pt)/R;
  const draw=(sel,res)=>{let s=`<svg class="xsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="A heatmap of resting orders: click the price with the biggest order"><rect width="${W}" height="${H}" rx="10" fill="#0b1220"/>`;
    for(let t=0;t<T;t++)for(let rr=0;rr<R;rr++){const c=exHeatCol(L[t][rr]);if(c)s+=`<rect x="${x0+t*cw}" y="${pt+rr*rh}" width="${cw+.4}" height="${rh+.4}" fill="${c}"/>`}
    for(let rr=0;rr<R;rr+=3)s+=exT(x0-8,pt+rr*rh+rh*.7,exN(21470-rr),{a:'end',s:10});
    for(let rr=0;rr<R;rr++){const id=String(rr),m=mark(id,sel,ans,res);if(m)s+=`<rect x="${x0}" y="${pt+rr*rh}" width="${x1-x0}" height="${rh}" fill="none" ${stroke(m)}/>`;s+=hit(id,x0,pt+rr*rh,x1-x0,rh)}
    return s+'</svg>'};
  return {kind:'xclick',topic:'Heatmap',q:'<b>Click the price with the biggest resting order.</b> On a heatmap, the brighter the colour, the more orders are waiting at that price. Look for the hottest band.',draw,ans,
   why:'A heatmap shows resting orders over time. The hottest, longest band is a big order waiting at that price. It is a clue about where people are waiting, never a promise that price will stop there: orders can be cancelled at any moment.',hint:'Look for the brightest, longest horizontal band (orange or yellow).'}}

/* ---- 5. delta: click the candle with the most selling ---- */
function deltaDrill(r){
  const cs=exFpData(Math.floor(r()*1e9)),st=exFpStats(cs),n=cs.length,most=r()<.6?'sell':'buy';
  let idx=0;st.forEach((q,k)=>{if(most==='sell'?q.delta<st[idx].delta:q.delta>st[idx].delta)idx=k});
  const ans=[String(idx)],W=800,H=300,Lx=40,cw=(W-Lx-20)/n,base=118,mxd=Math.max(1,...st.map(q=>Math.abs(q.delta)));
  const draw=(sel,res)=>{let s=`<svg class="xsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Candles with delta bars: click a candle"><rect width="${W}" height="${H}" rx="10" fill="${C.bg}"/>`+exT(Lx,22,'Each column is one candle. Green bar: buyers won (positive delta). Red bar: sellers won (negative delta).',{c:C.dim,s:11});
    st.forEach((q,k)=>{const id=String(k),m=mark(id,sel,ans,res),x=Lx+k*cw+cw/2,h=Math.abs(q.delta)/mxd*82,up=cs[k].up;
      if(m)s+=`<rect x="${x-cw/2+6}" y="36" width="${cw-12}" height="${H-48}" rx="6" fill="${m==='ok'?C.up:m==='bad'?C.dn:m==='miss'?C.gold:C.sig}" fill-opacity=".12" ${stroke(m)}/>`;
      s+=`<line x1="${x}" x2="${x}" y1="52" y2="92" stroke="${up?C.up:C.dn}" stroke-width="2"/><rect x="${x-9}" y="${up?60:70}" width="18" height="22" fill="${up?C.up:C.dn}"/>`+
        `<line x1="${Lx}" x2="${W-20}" y1="${base+86}" y2="${base+86}" stroke="${C.line}"/><rect x="${x-cw*.28}" y="${q.delta>=0?base+86-h:base+86}" width="${cw*.56}" height="${Math.max(2,h)}" fill="${q.delta>=0?C.up:C.dn}" fill-opacity=".85"/>`+
        exT(x,q.delta>=0?base+86-h-6:base+86+h+14,(q.delta>0?'+':'')+q.delta,{a:'middle',s:12,c:C.txt,w:600})+hit(id,x-cw/2+6,36,cw-12,H-48)});
    return s+'</svg>'};
  return {kind:'xclick',topic:'Delta',q:most==='sell'?'<b>Click the candle with the most selling:</b> the most negative delta (the longest red bar).':'<b>Click the candle with the most buying:</b> the most positive delta (the longest green bar).',draw,ans,
   why:'Delta is buyers minus sellers for one candle. The longest red bar is the candle where sellers were the most aggressive. The longest green bar is where buyers were.',hint:'Compare the length of the bars under the candles, not the colour of the candle itself.'}}

/* ---- the click-on-the-chart answer kind ---- */
K.xclick={chart:false,
  html(it,st,o={}){return `<div class="xc ${o.res?'done':''}">${it.draw(st.a||[],!!o.res)}</div><p class="dim" style="font-size:13px">${it.multi?'Click every cell that fits, click again to undo, then check.':'Click your answer on the chart, then check.'}${o.res?' Green is right, red is a wrong pick, dashed gold is one you missed.':''}</p>`},
  bind(root,it,st,chg){root.addEventListener('click',e=>{const box=$('.xc',root);if(!box||box.classList.contains('done'))return;const g=e.target.closest('[data-id]');if(!g)return;const id=g.dataset.id,a=st.a||(st.a=[]);
    if(it.multi){const i=a.indexOf(id);if(i>=0)a.splice(i,1);else a.push(id)}else st.a=[id];box.innerHTML=it.draw(st.a,false);chg()})},
  has:(it,st)=>(st.a||[]).length>0,
  grade:(it,st)=>{const a=st.a||[],w=it.ans,ok=a.length===w.length&&w.every(x=>a.includes(x));return{ok,missed:w.filter(x=>!a.includes(x)).length,extra:a.filter(x=>!w.includes(x)).length}},
  correct:it=>it.ans.join(', '),
  fb(it,st,g){return g.ok?'':`<p>${g.missed?`You missed ${g.missed}. `:''}${g.extra?`${g.extra} of your picks did not fit. `:''}The right answer is marked on the chart.</p>`}};

MODS.push({id:'px2',n:MODS.length+1,ph:0,t:'Chart drills: click the answer on the chart',out:'Read the chart and click the answer on it.',learn:[],bank:[],
 drills:[fpDrill,volDrill,volDrill,profDrill,heatDrill,deltaDrill]});
})();
