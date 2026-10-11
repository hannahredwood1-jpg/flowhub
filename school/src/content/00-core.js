/* ============================================================
   curriculum core: phases, helpers shared by every module
   Source: Beginner Trading Curriculum A to Z (m01–m16) + the ESC VLCTY guide (m31–m36) + the Classic school lessons and ECHO X ORBIT (m19–m30)
============================================================ */
const PH=[
 {n:'Foundations',d:'Optional, and open from the start in any order: mindset, your platform, futures, the chart and your first order. The modules after it unlock one at a time.'},
 {n:'Liquidity',d:'Where orders rest, and why price is drawn to them.'},
 {n:'Structure & imbalance',d:'Confirming a sweep, and spotting where price will keep going.'},
 {n:'Context & timing',d:'Cross-checking with a second index, and knowing when to look.'},
 {n:'Bias, risk & discipline',d:'Funded accounts, daily bias, extended levels, trade management, risk, and the behaviour that keeps you trading.'},
 {n:'Putting it together',d:'Everything above combined into one repeatable read of the market, run on real trades.'},
 {n:'ESC VLCTY',d:'Another trading model: one indicator, New York and Asia, measured from the previous 16:00 close.'},
 {n:'ECHO X ORBIT',d:'The FLOWMTD model: two engines, one set of rules.'}];
const MODS=[];
const COL={ice:'#8cc4ff',sig:'#ff6a00',bad:'#ff5d73',ok:'#3ee0a1',lag:'#b69cff',gold:'#ffc861'};
const def=h=>`<div class="callout def"><span class="hud">Definition</span>${h}</div>`;
const key=(h,t='Key idea')=>`<div class="callout key"><span class="hud">${t}</span>${h}</div>`;
const warn=(h,t='Common mistake')=>`<div class="callout warn"><span class="hud">${t}</span>${h}</div>`;
const tblx=(head,rows)=>`<table class="tblx"><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
const stageModel=(me)=>`<div class="model">${['Potential<br><small>where could orders be filled?</small>','Confirmation<br><small>were they filled?</small>','Continuation<br><small>will the new trend hold?</small>','Exit<br><small>where do filled orders get liquidated?</small>'].map((t,i)=>`<span class="${i===me?'me':''}">${t}</span>`).join('')}</div>`;
const rc=(from,q,o,why)=>({from,q,o,why,order:shuf(o.map((_,i)=>i))});
const numTags=(C,col)=>C.map((c,i)=>({t:'tag',i,p:c.l,text:String(i+1),pos:'below',col:col||COL.ice}));
const tagAt=(i,p,text,pos,col)=>({t:'tag',i,p,text,pos,col:col||COL.ice});
const boxOf=(C,i0,i1,col,pad=1)=>({t:'box',i0,i1,lo:Math.min(...C.slice(i0,i1+1).map(c=>c.l))-pad,hi:Math.max(...C.slice(i0,i1+1).map(c=>c.h))+pad,col:col||COL.ice});
const hlAt=(p,text,col,i0,x={})=>({t:'hl',p,i0,col:col||COL.ice,text,...x});
const rectAt=(i0,i1,lo,hi,text,col,x={})=>({t:'rect',i0,i1,lo,hi,text,col:col||COL.sig,...x});
const pickN=(r,a,n)=>shuf(a,r).slice(0,n);
const rr=seed=>mulberry(seed);
/* a candle drawn as a diagram */
const candleSvg=`<svg class="diag" viewBox="0 0 360 200" role="img" aria-label="An up candle and a down candle with open, high, low and close marked">
 <g stroke="#e3e9f2" fill="#e3e9f2" stroke-width="1.5"><path d="M110 28V170"/><rect x="92" y="62" width="36" height="76"/></g>
 <g stroke="#3d7bff" fill="#3d7bff" stroke-width="1.5"><path d="M250 28V170"/><rect x="232" y="62" width="36" height="76"/></g>
 <g font-family="Inter,sans-serif" font-size="11" fill="#929fb2"><text x="110" y="16" text-anchor="middle">UP candle</text><text x="250" y="16" text-anchor="middle">DOWN candle</text></g>
 <g font-family="JetBrains Mono,monospace" font-size="11" fill="#8cc4ff">
  <text x="78" y="32" text-anchor="end">high</text><text x="78" y="170" text-anchor="end">low</text><text x="78" y="68" text-anchor="end">close</text><text x="78" y="138" text-anchor="end">open</text>
  <text x="284" y="32">high</text><text x="284" y="170">low</text><text x="284" y="68">open</text><text x="284" y="138">close</text></g></svg>`;
