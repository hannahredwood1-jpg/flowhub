/* ============================================================
   DAILY GEX LEVELS: today's call wall, put wall and gamma flip for NQ (worked out from NDX options by the server at 8:30 AM ET),
   with the one-line copy for the indicator. Open to every student, outside the module order.
============================================================ */
let GX=null,GEX_MODE='all',GEX_LOADING=false;
const gexOn=()=>!!TRACK&&TRACK.id==='fundamentals';
const FLOWGEX_URL='https://www.tradingview.com/script/HMDYxbPq-FLOWGEX/';
async function gexLoad(){
  GEX_LOADING=true;
  try{const r=await fetch('/api/gex/latest',{headers:{Accept:'application/json'}});GX=r.ok?await r.json():{error:true}}catch(e){GX={error:true}}
  GEX_LOADING=false;if(VIEW==='gex')paintGex()}
function renderGex(){if(!GX&&!GEX_LOADING)gexLoad();paintGex()}
const gexN=v=>v?Math.round(Number(v)).toLocaleString('en-US'):'–';
const gexWhen=iso=>iso?new Date(iso).toLocaleString('en-US',{weekday:'short',hour:'numeric',minute:'2-digit',timeZone:'America/New_York'})+' ET':'';
const gexDay=d=>new Date(d+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
function gexLadder(L,spot,basis){
  const pts=[['Call wall',L.callWall,'gc'],['Gamma flip',L.flip,'gf'],['Put wall',L.putWall,'gp'],['Price',spot,'gs']].filter(x=>x[1]);
  const ext=[...pts.map(x=>x[1]),...L.calls.slice(1,4),...L.puts.slice(1,4)].filter(Boolean),lo=Math.min(...ext),hi=Math.max(...ext),pad=Math.max(20,(hi-lo)*.12),a=lo-pad,b=hi+pad,y=v=>((b-v)/(b-a))*100;
  const minor=[...L.calls.slice(1,4).map(v=>[v,'gc']),...L.puts.slice(1,4).map(v=>[v,'gp'])];
  let marks=pts.map(([n,v,k])=>[n,v,k,y(v)]).sort((p,q)=>p[3]-q[3]);
  for(let i=1;i<marks.length;i++)if(marks[i][3]-marks[i-1][3]<10)marks[i][3]=marks[i-1][3]+10;
  return`<div class="gx-lad" role="img" aria-label="Price ladder of today's levels"><div class="gx-line"></div>${minor.map(([v,k])=>`<i class="gx-min ${k}" style="top:${y(v)}%" title="${gexN(v)}"></i>`).join('')}
  ${marks.map(([n,v,k,t])=>`<div class="gx-mk ${k}" style="top:${t}%"><span>${n}</span><b>${gexN(v)}</b>${basis&&k!=='gs'?`<em>NQ ≈ ${gexN(v+basis)}</em>`:''}</div>`).join('')}</div>`}
function gexCaption(L,spot){
  if(!L.flip)return'';const d=Math.round(Math.abs(spot-L.flip)),above=spot>=L.flip;
  return`Price is ${d} point${d===1?'':'s'} ${above?'above':'below'} the gamma flip: ${above?'positive gamma, where hedging tends to lean against moves':'negative gamma, where hedging can add to moves'}. A backdrop for your read, not a signal.`}
function paintGex(){
  const el=$('#gexBody');if(!el)return;
  if(!GX){el.innerHTML='<p class="muted">Loading today\'s levels…</p>';return}
  const cur=GX.current;
  if(GX.error||!cur){el.innerHTML=`<div class="card" style="padding:22px"><h3 class="h">${GX.error?'Levels are not available right now':'No levels yet'}</h3><p class="muted" style="margin-top:6px">${GX.error?'Please try again in a minute.':'FLOWHUB works out the levels at 8:30 AM New York time every weekday. The first set appears on the next trading morning.'}</p></div>`;return}
  const lv=cur.levels,L=GEX_MODE==='zero'?lv.zero:lv.all,spot=lv.spot,basis=GX.basis,stale=cur.day!==GX.today,line=(GEX_MODE==='zero'&&lv.exportZero)?lv.exportZero:lv.export;
  const tile=(n,v,k)=>`<div class="card gx-t ${k}"><span class="hud">${n}</span><b class="num">${gexN(v)}</b>${basis&&v?`<small>NQ ≈ ${gexN(v+basis)}</small>`:''}</div>`;
  el.innerHTML=`
  <div class="gx-top"><div class="gx-meta"><span class="chip ${L.regime==='negative'?'bad':'ok'}">${L.regime==='negative'?'Negative gamma':'Positive gamma'}</span>
    <span class="chip ${stale?'bad':''}">${stale?'Not updated today · levels from '+gexDay(cur.day):'Levels for '+gexDay(cur.day)}</span>
    ${cur.feedAt||cur.feedLabel?`<span class="chip">Feed ${cur.feedAt?gexWhen(cur.feedAt):esc(cur.feedLabel)}</span>`:''}</div>
    <div class="seg" role="group" aria-label="Which expiries"><button class="${GEX_MODE==='all'?'on':''}" data-gm="all">All expiries</button><button class="${GEX_MODE==='zero'?'on':''}" data-gm="zero">0DTE${lv.expiry0?' · '+gexDay(lv.expiry0):''}</button></div></div>
  <div class="gx-tiles">${tile('Call wall',L.callWall,'gc')}${tile('Gamma flip',L.flip,'gf')}${tile('Put wall',L.putWall,'gp')}${tile('NDX price',spot,'gs')}</div>
  <p class="gx-cap">${gexCaption(L,spot)}</p>
  <div class="card gx-get"><div><span class="hud">The indicator</span><h3 class="h" style="margin-top:2px">Get FLOWGEX for TradingView</h3><p class="muted" style="font-size:13.5px;margin-top:4px">FLOWGEX draws these levels on your NQ chart. Add it to your chart from TradingView, then copy the levels below and paste them into its settings.</p></div><a class="btn primary" href="${FLOWGEX_URL}" target="_blank" rel="noopener noreferrer">Get FLOWGEX on TradingView ↗</a></div>
  <div class="gx-two"><div class="card gx-card"><h3 class="h">Where they sit</h3>${gexLadder(L,spot,basis)}<p class="muted" style="font-size:12.5px;margin-top:8px">Small ticks are the next strongest strikes. NQ values are an estimate; the indicator measures the real gap on your chart.</p></div>
  <div class="card gx-card"><h3 class="h">Copy for the indicator</h3><p class="muted" style="font-size:13.5px;margin:4px 0 10px">1. Add FLOWGEX to your chart. 2. Copy the line. 3. Paste it into FLOWGEX's GEX Data box and set Symbol Mode to NDX / NQ. It is the ${GEX_MODE==='zero'?'0DTE':'all-expiries'} line.</p>
   <code class="gx-code" id="gexLine">${esc(line)}</code><div class="gx-act"><button class="btn primary" id="gexCopy">Copy levels</button><button class="btn ghost sm" id="gexLeg">What each number is</button></div>
   <table class="tblx gx-leg" id="gexLegT" hidden><tr><th>#</th><th>Value</th></tr>${GX.legend.map((n,i)=>`<tr><td>${i+1}</td><td>${esc(n)}</td></tr>`).join('')}<tr><td>22</td><td>Symbol (NDX)</td></tr></table>
   <p class="muted" style="font-size:12.5px;margin-top:10px">A 0 hides that level in the indicator (used when fewer than ten strikes exist).</p></div></div>
  ${GX.history&&GX.history.length?`<div class="card gx-card" style="margin-top:14px"><h3 class="h">Recent days</h3><div class="gx-hist"><table class="tblx"><tr><th>Day</th><th>Call wall</th><th>Flip</th><th>Put wall</th><th>NDX</th><th>Regime</th></tr>${GX.history.map(h=>`<tr><td>${gexDay(h.day)}</td><td>${gexN(h.callWall)}</td><td>${gexN(h.flip)}</td><td>${gexN(h.putWall)}</td><td>${gexN(h.spot)}</td><td>${h.regime==='negative'?'Negative':'Positive'}</td></tr>`).join('')}</table></div></div>`:''}
  <p class="muted gx-foot">These levels are worked out from delayed Nasdaq-100 options data and a model of dealer hedging. They are context for your read, not a trade signal, and they are for education only.<br><a href="#/m50">Learn how to read them: Understanding GEX Levels →</a></p>`;
  $$('[data-gm]',el).forEach(b=>b.onclick=()=>{GEX_MODE=b.dataset.gm;paintGex()});
  const lg=$('#gexLeg',el);if(lg)lg.onclick=()=>{const t=$('#gexLegT');t.hidden=!t.hidden};
  const cp=$('#gexCopy',el);if(cp)cp.onclick=async()=>{const t=line;let ok=false;try{await navigator.clipboard.writeText(t);ok=true}catch(e){const r=document.createRange();r.selectNodeContents($('#gexLine'));const s=getSelection();s.removeAllRanges();s.addRange(r)}toast(ok?'Levels copied. Paste them into the indicator.':'Select the line and copy it.')};
}
if(!gexOn()){const n=$('#gexNav');if(n)n.remove()}
