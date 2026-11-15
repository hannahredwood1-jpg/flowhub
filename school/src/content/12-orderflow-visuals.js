/* ============================================================
   ORDERFLOW VISUALS: small animated pictures for the Orderflow lessons, drawn in SVG and plain HTML (no images, no libraries).
   Everything here is a teaching sketch with made-up numbers. Motion is CSS only and falls back to a still picture (reduced motion).
============================================================ */
const OFC={win:'#3ee0a1',loss:'#ff5d73',ice:'#8cc4ff',sig:'#ff6a00',gold:'#ffc861',ink:'#e6ebf2',ink2:'#929fb2',ink3:'#66717f',line:'#28313e'};
let OFN=0;
const ofFig=(inner,cap)=>`<figure class="ofv">${inner}${cap?`<figcaption>${cap}</figcaption>`:''}</figure>`;
const ofDefs=id=>`<defs><marker id="ah${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker></defs>`;
const ofT=(x,y,t,o={})=>`<text x="${x}" y="${y}" fill="${o.col||OFC.ink2}" font-size="${(o.s||11)*.8}" font-family="Inter,sans-serif" text-anchor="${o.a||'start'}" ${o.b?'font-weight="700"':''} class="${o.cls||''}" ${o.d!=null?`style="animation-delay:${o.d}s"`:''}>${t}</text>`;
const ofArrow=(x1,y1,x2,y2,col,d=0,o={})=>`<path d="M${x1} ${y1}L${x2} ${y2}" pathLength="100" stroke="${col}" stroke-width="${o.w||2.2}" fill="none" ${o.dash?'stroke-dasharray="4 4"':''} marker-end="url(#ah${OFN})" class="${o.dash?'of-in':'of-draw'}" style="animation-delay:${d}s"/>`;
/* a candle chart. cs = [{o,h,l,c,d?,col?}] in price units. o.lines [{p,label,col,dash}], o.boxes [{i0,i1,lo,hi,col,label}], o.notes [{i,p,t,col,a,dx,dy,d}], o.arrows [{i1,p1,i2,p2,col,d}] */
function ofChart(cs,o={}){
  const W=o.w||380,H=o.h||200,P=14,gap=(W-2*P)/cs.length,cw=Math.min(15,gap*.55),id=++OFN;
  const ps=[...cs.flatMap(c=>[c.h,c.l]),...(o.lines||[]).map(l=>l.p),...(o.boxes||[]).flatMap(b=>[b.lo,b.hi])],lo=Math.min(...ps),hi=Math.max(...ps),pad=(hi-lo)*.14||1;
  const Y=p=>H-P-(p-(lo-pad))/((hi+pad)-(lo-pad))*(H-2*P),X=i=>P+gap*(i+.5);
  let s=`<svg viewBox="0 0 ${W} ${o.vbH||H}" role="img" aria-label="${o.alt||'Sketch of a price chart'}">${ofDefs(id)}`;
  (o.boxes||[]).forEach(b=>{s+=`<rect x="${P+gap*b.i0}" y="${Y(b.hi)}" width="${gap*(b.i1-b.i0+1)}" height="${Y(b.lo)-Y(b.hi)}" fill="${b.col||OFC.ice}" fill-opacity=".13" stroke="${b.col||OFC.ice}" stroke-opacity=".5" stroke-dasharray="3 3" class="of-in"/>`+(b.label?ofT(P+gap*b.i0+2,Y(b.hi)-5,b.label,{col:b.col||OFC.ice}):'')});
  (o.lines||[]).forEach(l=>{s+=`<line x1="${P}" x2="${W-P}" y1="${Y(l.p)}" y2="${Y(l.p)}" stroke="${l.col||OFC.gold}" stroke-width="1.4" ${l.dash===false?'':'stroke-dasharray="5 4"'} class="of-in"/>`+ofT(l.a==='start'?P+2:W-P,Y(l.p)+(l.dy??-4),l.label||'',{col:l.col||OFC.gold,a:l.a||'end'})});
  cs.forEach((c,i)=>{const col=c.col||(c.c>=c.o?OFC.win:OFC.loss),top=Y(Math.max(c.o,c.c)),bot=Y(Math.min(c.o,c.c));
    s+=`<g class="of-in" style="animation-delay:${c.d??i*.14}s"><line x1="${X(i)}" x2="${X(i)}" y1="${Y(c.h)}" y2="${Y(c.l)}" stroke="${col}" stroke-width="1.6"/><rect x="${X(i)-cw/2}" y="${top}" width="${cw}" height="${Math.max(2,bot-top)}" rx="1.5" fill="${col}"/></g>`});
  (o.notes||[]).forEach(n=>{s+=ofT(X(n.i)+(n.dx||0),Y(n.p)+(n.dy||0),n.t,{col:n.col||OFC.ink,a:n.a||'middle',b:1,cls:'of-in',d:n.d??.9})});
  (o.arrows||[]).forEach(a=>{s+=ofArrow(X(a.i1),Y(a.p1),X(a.i2),Y(a.p2),a.col||OFC.sig,a.d??.8,{dash:a.dash})});
  if(o.extra)s+=o.extra(Y,X,gap);
  return s+'</svg>'}
/* the footprint ladder as bars: rows [price, sellers (bid), buyers (ask)], highest price first. o.imb = [[rowIndex,'a'|'b'],...] */
function ofLadder(rows,o={}){
  const mx=Math.max(...rows.flatMap(r=>[r[1],r[2]])),imb=o.imb||[];
  return `<div class="ofl">${rows.map((r,i)=>`<div class="ofl-r" style="--d:${i*.09}s"><span class="ofl-p">${fm(r[0],0)}</span>
    <span class="ofl-b"><i class="${imb.some(x=>x[0]===i&&x[1]==='b')?'hot':''}" style="width:${r[1]/mx*100}%"></i><em>${r[1]}</em></span>
    <span class="ofl-a"><i class="${imb.some(x=>x[0]===i&&x[1]==='a')?'hot':''}" style="width:${r[2]/mx*100}%"></i><em>${r[2]}</em></span></div>`).join('')}
    <div class="ofl-k"><span></span><span>Sellers (hit the bid)</span><span>Buyers (lift the ask)</span></div></div>`}
const OFV={
/* f01: one candle, opened up into its footprint */
candleVsFp(){const id=++OFN,rows=[[21452,31,58],[21451,44,62],[21450,52,41],[21449,67,23]],mx=67;
  let s=`<svg viewBox="0 0 380 190" role="img" aria-label="A candle next to its footprint">${ofDefs(id)}`;
  s+=`<g class="of-in"><line x1="48" x2="48" y1="22" y2="162" stroke="${OFC.win}" stroke-width="2"/><rect x="34" y="50" width="28" height="84" rx="2" fill="${OFC.win}"/></g>`+ofT(48,182,'A candle: where price went',{a:'middle'});
  s+=ofArrow(74,95,98,95,OFC.sig,.6);
  rows.forEach((r,i)=>{const y=30+i*34,bw=r[1]/mx*66,aw=r[2]/mx*66;
    s+=`<g class="of-in" style="animation-delay:${1+i*.25}s"><text x="108" y="${y+16}" fill="${OFC.ink3}" font-size="8" font-family="monospace">${r[0]}</text><rect x="${262-bw}" y="${y}" width="${bw}" height="24" rx="2" fill="${OFC.loss}" fill-opacity=".75"/><text x="${258-bw}" y="${y+16}" fill="${OFC.ink}" font-size="8.5" text-anchor="end" font-family="monospace">${r[1]}</text><rect x="266" y="${y}" width="${aw}" height="24" rx="2" fill="${OFC.win}" fill-opacity=".75"/><text x="${270+aw}" y="${y+16}" fill="${OFC.ink}" font-size="8.5" font-family="monospace">${r[2]}</text></g>`});
  s+=ofT(262,18,'sellers',{a:'end',col:OFC.loss,b:1})+ofT(266,18,'buyers',{col:OFC.win,b:1})+ofT(230,182,'The footprint: who traded at each price',{a:'middle'});
  return ofFig(s+'</svg>','Same candle twice. On the left, only where price went. On the right, how many contracts sellers (red) and buyers (green) traded at each price.')},
/* f01: aggressive meets passive */
aggrPassive(){const id=++OFN;
  let s=`<svg viewBox="0 0 400 215" role="img" aria-label="A market buy order hitting resting sell orders">${ofDefs(id)}`;
  s+=ofT(240,14,'Resting sell orders (passive)',{a:'middle',col:OFC.loss,b:1});
  [['21,453.00',130,24],['21,452.75',100,54],['21,452.50',70,84]].forEach((r,i)=>{s+=`<g class="of-in" style="animation-delay:${i*.2}s"><rect x="170" y="${r[2]}" width="${r[1]}" height="24" rx="2" fill="${OFC.loss}" fill-opacity="${i===2?'.95':'.45'}"/><text x="396" y="${r[2]+16}" fill="${OFC.ink3}" font-size="8" text-anchor="end" font-family="monospace">${r[0]}</text></g>`});
  s+=`<line x1="14" x2="386" y1="118" y2="118" stroke="${OFC.line}" stroke-dasharray="4 4"/>`+ofT(14,132,'the spread',{col:OFC.ink3});
  [['21,452.25',70,126],['21,452.00',100,156]].forEach((r,i)=>{s+=`<g class="of-in" style="animation-delay:${.6+i*.2}s"><rect x="170" y="${r[2]}" width="${r[1]}" height="24" rx="2" fill="${OFC.win}" fill-opacity=".45"/><text x="396" y="${r[2]+16}" fill="${OFC.ink3}" font-size="8" text-anchor="end" font-family="monospace">${r[0]}</text></g>`});
  s+=ofT(240,203,'Resting buy orders (passive)',{a:'middle',col:OFC.win,b:1});
  s+=`<g class="of-in" style="animation-delay:1s"><rect x="14" y="82" width="90" height="28" rx="3" fill="${OFC.sig}"/><text x="59" y="100" fill="#111" font-size="9" font-weight="700" text-anchor="middle" font-family="Inter,sans-serif">Market BUY</text></g>`+ofArrow(108,96,164,96,OFC.sig,1.3,{w:2.6});
  s+=ofT(59,74,'aggressive',{a:'middle',col:OFC.sig,b:1,cls:'of-in',d:1.1});
  return ofFig(s+'</svg>','A market buy (aggressive) takes the lowest resting sell. The resting orders (passive) wait to be hit. The trade prints at the ask.')},
/* f02: the tape */
tape(){const rows=[['10:02:11','21,452.50',3,'a'],['10:02:11','21,452.50',12,'a'],['10:02:12','21,452.25',5,'b'],['10:02:12','21,452.50',2,'a'],['10:02:13','21,452.25',44,'b'],['10:02:13','21,452.25',9,'b'],['10:02:14','21,452.50',6,'a']];
  return ofFig(`<div class="oft"><div class="oft-h"><span>Time</span><span>Price</span><span>Size</span><span>Side</span></div>${rows.map((r,i)=>`<div class="oft-r ${r[3]}" style="--d:${i*.35}s"><span>${r[0]}</span><span>${r[1]}</span><b>${r[2]}</b><span>${r[3]==='a'?'bought at the ask':'sold at the bid'}</span></div>`).join('')}</div>`,'The tape: every trade as it happens. Green = a buyer lifted the ask (aggressive buy). Red = a seller hit the bid (aggressive sell). The 44 is a large print for this moment: context, not a signal.')},
/* f02: the DOM, with a market buy eating the best ask */
dom(){const asks=[[21453.25,40,40],[21453.00,55,55],[21452.75,70,70],[21452.50,60,15]],bids=[[21452.25,50],[21452.00,65],[21451.75,45],[21451.50,80]],mx=80;
  return ofFig(`<div class="ofd"><div class="ofd-k"><span>Price</span><span>Resting orders</span></div>${asks.map((a,i)=>`<div class="ofd-r s"><span>${fm(a[0],2)}</span><span class="ofd-bar"><i style="--w0:${a[1]/mx*100}%;--w1:${a[2]/mx*100}%;${a[1]!==a[2]?'animation:ofEat 2.2s ease-in-out .5s infinite alternate':''}"></i><em>${a[1]}</em></span></div>`).join('')}
    <div class="ofd-sp">spread</div>${bids.map(b=>`<div class="ofd-r b"><span>${fm(b[0],2)}</span><span class="ofd-bar"><i style="--w0:${b[1]/mx*100}%;--w1:${b[1]/mx*100}%"></i><em>${b[1]}</em></span></div>`).join('')}</div>`,'The DOM (ladder): resting orders waiting at each price. Watch the lowest ask: a market buy eats into it. Resting orders can also be pulled before price arrives, so this is a clue, not a promise.')},
/* f03: footprint ladder with totals */
ladder(){const rows=[[21452,31,58],[21451,44,62],[21450,52,41],[21449,67,23]];
  return ofFig(ofLadder(rows)+`<div class="oft-tot"><span>Sellers <b>194</b></span><span>Buyers <b>184</b></span><span>Volume <b>378</b></span><span>Delta <b style="color:${OFC.loss}">−10</b></span></div>`,'One footprint candle as bars. Top rows: buyers were stronger. Bottom rows: sellers were. Add each side up for the totals; delta is buyers minus sellers.')},
/* f04: delta bars and cumulative delta */
delta(){const d=[120,-60,90,-200,140],W=380,H=250,x0=40,bw=36,gap=64,z1=62,k=.2,z2=188,k2=.34;let cum=0;const pts=d.map((v,i)=>{cum+=v;return[x0+i*gap+bw/2,z2-cum*k2,cum]});
  let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Delta per candle and cumulative delta">`+ofT(14,12,'Delta of each candle',{col:OFC.ink3})+`<line x1="14" x2="366" y1="${z1}" y2="${z1}" stroke="${OFC.line}"/>`;
  d.forEach((v,i)=>{const h=Math.abs(v)*k;s+=`<g class="of-in" style="animation-delay:${i*.3}s"><rect x="${x0+i*gap}" y="${v>0?z1-h:z1}" width="${bw}" height="${h}" rx="2" fill="${v>0?OFC.win:OFC.loss}" fill-opacity=".8"/>${ofT(x0+i*gap+bw/2,v>0?z1-h-4:z1+h+11,(v>0?'+':'')+v,{a:'middle',col:OFC.ink})}</g>`});
  s+=ofT(14,108,'Cumulative delta (running total)',{col:OFC.gold})+`<line x1="14" x2="366" y1="${z2}" y2="${z2}" stroke="${OFC.line}"/>`;
  s+=`<polyline points="${pts.map(p=>p[0]+','+p[1]).join(' ')}" fill="none" stroke="${OFC.gold}" stroke-width="2.4" pathLength="100" class="of-draw" style="animation-delay:1.6s;animation-duration:1.6s"/>`;
  pts.forEach((p,i)=>{s+=`<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="${OFC.gold}" class="of-in" style="animation-delay:${1.7+i*.25}s"/>`+ofT(p[0],p[1]+(p[2]>=0?-8:14),(p[2]>0?'+':'')+p[2],{a:'middle',col:OFC.gold,cls:'of-in',d:1.7+i*.25})});
  return ofFig(s+'</svg>','Top: each candle\'s delta. Bottom: the running total, adding one candle at a time. Starting from zero: +120, +60, +150, −50, +90.')},
/* f04: divergence */
divergence(){const cs=[{o:22,h:28,l:20,c:26},{o:26,h:34,l:24,c:32},{o:32,h:40,l:30,c:36},{o:36,h:48,l:34,c:46},{o:46,h:50,l:40,c:42},{o:42,h:56,l:40,c:54}];
  const cd=[0,30,60,95,70,50];
  return ofFig(ofChart(cs,{w:380,h:130,vbH:250,alt:'Price makes a higher high while cumulative delta makes a lower high',
    extra:(Y,X)=>{let e=`<line x1="${X(3)}" y1="${Y(48)-6}" x2="${X(5)}" y2="${Y(56)-6}" stroke="${OFC.win}" stroke-width="2" stroke-dasharray="5 4" class="of-in" style="animation-delay:1.1s"/>`+ofT(X(5),Y(56)-12,'higher high',{a:'end',col:OFC.win,b:1,cls:'of-in',d:1.2});
      e+=ofT(14,150,'Cumulative delta',{col:OFC.gold})+`<line x1="14" x2="366" y1="232" y2="232" stroke="${OFC.line}"/>`;
      const pts=cd.map((v,i)=>[X(i),230-v*.8]);
      e+=`<polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${OFC.gold}" stroke-width="2.4" pathLength="100" class="of-draw" style="animation-delay:1.3s;animation-duration:1.6s"/>`;
      e+=`<line x1="${pts[3][0]}" y1="${pts[3][1]-6}" x2="${pts[5][0]}" y2="${pts[5][1]-6}" stroke="${OFC.loss}" stroke-width="2" stroke-dasharray="5 4" class="of-in" style="animation-delay:2.9s"/>`+ofT(pts[5][0],pts[5][1]+16,'lower high',{a:'middle',col:OFC.loss,b:1,cls:'of-in',d:3});
      return e}}),'Price made a higher high, but the cumulative delta made a lower high: the new high had less aggression behind it. That is a condition to watch, never a trade by itself.')},
/* f05: the diagonal test */
imbalance(){const id=++OFN;
  let s=`<svg viewBox="0 0 380 190" role="img" aria-label="The diagonal imbalance test">${ofDefs(id)}`;
  s+=ofT(34,18,'price',{col:OFC.ink3})+ofT(150,18,'sellers (bid)',{a:'middle',col:OFC.loss,b:1})+ofT(262,18,'buyers (ask)',{a:'middle',col:OFC.win,b:1});
  s+=`<g class="of-in"><text x="34" y="58" fill="${OFC.ink}" font-size="12" font-family="monospace">21,453</text><rect x="95" y="38" width="110" height="30" rx="3" fill="${OFC.loss}" fill-opacity=".35"/><text x="150" y="58" fill="${OFC.ink}" font-size="12" text-anchor="middle" font-family="monospace">18</text><rect x="207" y="38" width="110" height="30" rx="3" fill="${OFC.win}" fill-opacity=".9" class="of-pulse"/><text x="262" y="58" fill="#04110b" font-size="13" font-weight="700" text-anchor="middle" font-family="monospace">66</text></g>`;
  s+=`<g class="of-in" style="animation-delay:.4s"><text x="34" y="108" fill="${OFC.ink}" font-size="12" font-family="monospace">21,452</text><rect x="95" y="88" width="110" height="30" rx="3" fill="${OFC.loss}" fill-opacity=".9" class="of-pulse"/><text x="150" y="108" fill="#fff" font-size="13" font-weight="700" text-anchor="middle" font-family="monospace">22</text><rect x="207" y="88" width="110" height="30" rx="3" fill="${OFC.win}" fill-opacity=".35"/><text x="262" y="108" fill="${OFC.ink}" font-size="12" text-anchor="middle" font-family="monospace">31</text></g>`;
  s+=ofArrow(262,72,168,86,OFC.gold,1,{w:2.4});
  s+=ofT(190,150,'66 is at least 3 × 22 (=66)',{a:'middle',col:OFC.gold,b:1,s:12.5,cls:'of-in',d:1.6})+ofT(190,170,'so 21,453 shows a BUY imbalance',{a:'middle',col:OFC.win,b:1,s:12.5,cls:'of-in',d:1.8});
  return ofFig(s+'</svg>','The diagonal test: compare the ask at one price (66) with the bid one row below it (22). Buyers beat sellers by 3 to 1 or more, so that cell is a buy imbalance.')},
/* f05: a stack */
stack(){const rows=[[21456,22,30],[21455,20,58],[21454,24,72],[21453,26,66],[21452,30,34],[21451,28,31]];
  return ofFig(ofLadder(rows,{imb:[[1,'a'],[2,'a'],[3,'a']]})+`<div class="oft-tot"><span style="color:${OFC.win}"><b>3 buy imbalances in a row</b> = a stack</span></div>`,'Three or more imbalances at neighbouring prices in the same direction make a stacked imbalance: buyers were aggressive across a whole range of prices. It often shows continuation.')},
/* f06: absorption */
absorption(){const cs=[{o:30,h:38,l:28,c:36},{o:36,h:44,l:34,c:42},{o:42,h:52,l:40,c:50},{o:50,h:60,l:49,c:55},{o:55,h:61,l:52,c:56},{o:56,h:61,l:53,c:55},{o:55,h:61,l:52,c:54}];
  return ofFig(ofChart(cs,{lines:[{p:61,label:'big resting sell orders',col:OFC.loss,dy:-5}],notes:[{i:0,p:49,t:'buyers keep hitting the ask',col:OFC.win,d:1.2,a:'start',dx:-8},{i:5,p:44,t:'price goes nowhere',col:OFC.ink,d:1.8}],arrows:[{i1:2,p1:57,i2:4,p2:61.2,col:OFC.win,d:1},{i1:3,p1:58,i2:5,p2:61.2,col:OFC.win,d:1.2}],alt:'Absorption: buyers hit the ask at a level and price stalls'}),'Absorption: lots of aggressive buying at a level, but price cannot get through. A big passive seller is soaking it all up.')},
/* f06: exhaustion */
exhaustion(){const W=380;
  const cs=[{o:22,h:30,l:20,c:28},{o:28,h:42,l:26,c:40},{o:40,h:44,l:34,c:37},{o:37,h:56,l:36,c:54},{o:54,h:58,l:48,c:51},{o:51,h:66,l:50,c:64},{o:64,h:68,l:60,c:62}];
  return ofFig(ofChart(cs,{w:W,h:150,vbH:225,notes:[{i:1,p:42,t:'1st push',col:OFC.ink2,d:.9,dy:-8},{i:3,p:56,t:'2nd',col:OFC.ink2,d:1.1,dy:-8},{i:5,p:66,t:'3rd',col:OFC.ink2,d:1.3,dy:-8}],alt:'Exhaustion: each push up has less delta',
    extra:(Y,X)=>{let e=`<line x1="14" x2="366" y1="205" y2="205" stroke="${OFC.line}"/>`+ofT(14,160,'Delta of each push',{col:OFC.ink3});
      [[1,260],[3,150],[5,60]].forEach(([i,v],k)=>{const h=v*.12;e+=`<g class="of-in" style="animation-delay:${1.5+k*.35}s"><rect x="${X(i)-10}" y="${205-h}" width="20" height="${h}" rx="2" fill="${OFC.win}" fill-opacity=".8"/>${ofT(X(i),205-h-4,'+'+v,{a:'middle',col:OFC.ink})}</g>`});
      return e+ofT(366,220,'each push has less fuel',{a:'end',col:OFC.loss,b:1,cls:'of-in',d:2.7})}}),'Exhaustion: price keeps making new highs, but each push comes with less delta. The buyers are not being absorbed, they are simply running out.')},
/* f06: trapped traders */
trapped(){const cs=[{o:40,h:46,l:38,c:44},{o:44,h:50,l:42,c:48},{o:48,h:56,l:47,c:54},{o:54,h:60,l:52,c:58},{o:58,h:59,l:50,c:51,col:OFC.loss},{o:51,h:52,l:42,c:43,col:OFC.loss},{o:43,h:44,l:34,c:35,col:OFC.loss}];
  return ofFig(ofChart(cs,{lines:[{p:55,label:'the level',col:OFC.gold,a:'start',dy:-5}],boxes:[{i0:3,i1:6,lo:51,hi:60,col:OFC.loss,label:''}],notes:[{i:3,p:62.5,t:'buyers pile in on the break',col:OFC.win,d:1,a:'start',dx:-30},{i:5,p:31,t:'trapped: now losing',col:OFC.loss,d:1.9}],arrows:[{i1:3,p1:61,i2:6,p2:38,col:OFC.loss,d:2.3}],alt:'Trapped traders: a break fails and price falls back through the level'}),'Trapped traders: buyers who bought the break are now underwater when price falls back under the level. Their stops (market orders) add to the move down.')},
/* f07: the volume profile with POC and value area */
profile(){const rows=[[21456,25],[21455,45],[21454,80],[21453,120],[21452,150],[21451,110],[21450,70],[21449,40],[21448,20]],mx=150;
  return ofFig(`<div class="ofp">${rows.map((r,i)=>{const va=r[0]>=21450&&r[0]<=21454,poc=r[1]===mx;return `<div class="ofp-r ${va?'va':''} ${poc?'poc':''}" style="--d:${i*.08}s"><span>${fm(r[0],0)}</span><span class="ofp-b"><i style="width:${r[1]/mx*100}%"></i><em>${r[1]}</em></span><span class="ofp-t">${poc?'point of control':r[0]===21454?'value area high':r[0]===21450?'value area low':''}</span></div>`}).join('')}</div>`,'A volume profile: contracts traded at each price. The longest bar is the point of control. The shaded rows are the value area: about 70% of the day\'s volume.')},
/* f07: balance then imbalance */
balance(){const cs=[{o:30,h:36,l:26,c:33},{o:33,h:37,l:28,c:29},{o:29,h:35,l:27,c:34},{o:34,h:36,l:28,c:30},{o:30,h:35,l:27,c:33},{o:33,h:44,l:32,c:43},{o:43,h:54,l:42,c:52},{o:52,h:62,l:50,c:60}];
  return ofFig(ofChart(cs,{boxes:[{i0:0,i1:4,lo:26,hi:37,col:OFC.ice,label:'value area'}],notes:[{i:2,p:22,t:'BALANCE: both sides agree',col:OFC.ice,d:1.4},{i:6,p:40,t:'IMBALANCE',col:OFC.win,d:2.2,dx:18}],arrows:[{i1:4,p1:37,i2:7,p2:62,col:OFC.win,d:2,dash:false}],alt:'Price rotates in value, then breaks away'}),'Balance: price rotates around fair value. Imbalance: one side takes over, price leaves the value area and looks for a new one.')},
/* f07: initiative vs responsive */
initResp(){const id=++OFN;
  let s=`<svg viewBox="0 0 380 200" role="img" aria-label="Initiative and responsive activity">${ofDefs(id)}`;
  s+=`<rect x="20" y="78" width="340" height="50" fill="${OFC.ice}" fill-opacity=".12" stroke="${OFC.ice}" stroke-opacity=".5" stroke-dasharray="3 3" class="of-in"/>`+ofT(28,98,'yesterday\'s value area',{col:OFC.ice});
  s+=ofArrow(60,74,60,28,OFC.win,.6,{w:3})+ofT(72,26,'INITIATIVE',{col:OFC.win,b:1,cls:'of-in',d:1.2,s:12})+ofT(72,42,'moves away from value,',{col:OFC.ink2,cls:'of-in',d:1.3})+ofT(72,55,'looks for a new value',{col:OFC.ink2,cls:'of-in',d:1.3});
  s+=ofArrow(250,182,250,134,OFC.gold,1.4,{w:3})+ofT(262,160,'RESPONSIVE',{col:OFC.gold,b:1,cls:'of-in',d:2,s:12})+ofT(262,173,'pushes price back',{col:OFC.ink2,cls:'of-in',d:2.1})+ofT(262,186,'toward value',{col:OFC.ink2,cls:'of-in',d:2.1});
  return ofFig(s+'</svg>','Outside yesterday\'s value, activity that holds is initiative. Activity that returns price toward value is responsive.')},
/* f09 (module 8): a fair value gap */
fvg(){const cs=[{o:40,h:46,l:38,c:44},{o:44,h:66,l:43,c:64},{o:64,h:70,l:54,c:68},{o:68,h:70,l:62,c:63},{o:63,h:64,l:52,c:54},{o:54,h:56,l:46,c:48}];
  return ofFig(ofChart(cs,{h:190,boxes:[{i0:1,i1:5,lo:46,hi:54,col:OFC.sig,label:''}],notes:[{i:3,p:41,t:'the gap: price skipped it, little traded',col:OFC.sig,d:1.3},{i:0,p:71,t:'fast move up',col:OFC.win,d:.9,a:'start',dx:-8}],alt:'A fair value gap and price returning to it'}),'A fair value gap: price moved so fast through a range that little trading happened (the shaded box). Unfinished business is left behind, and price is often drawn back to it.')},
/* f09 (module 8): defended vs run over */
defended(){const a=[{o:30,h:38,l:28,c:36},{o:36,h:46,l:34,c:44},{o:44,h:58,l:42,c:46},{o:46,h:59,l:43,c:45},{o:45,h:58,l:40,c:42},{o:42,h:48,l:34,c:36}];
  const b=[{o:30,h:38,l:28,c:36},{o:36,h:46,l:34,c:44},{o:44,h:56,l:42,c:54},{o:54,h:66,l:52,c:64},{o:64,h:76,l:62,c:74},{o:74,h:80,l:70,c:78}];
  return ofFig(`<div class="of2"><div><div class="of2-h" style="color:${OFC.win}">Level DEFENDED</div>${ofChart(a,{w:240,h:170,lines:[{p:58,label:'key level',col:OFC.gold,a:'start',dy:-5}],notes:[{i:3,p:30,t:'heavy trading, no progress',col:OFC.win,d:1.2}],alt:'A defended level'})}</div><div><div class="of2-h" style="color:${OFC.loss}">Level RUN OVER</div>${ofChart(b,{w:240,h:170,lines:[{p:58,label:'key level',col:OFC.gold,a:'end',dy:12}],notes:[{i:2,p:84,t:'one-sided delta keeps going',col:OFC.loss,d:1.2,a:'start',dx:-30}],alt:'A level run over'})}</div></div>`,'At a key level, flow tells you what is happening. Left: aggression is absorbed and price turns. Right: aggression keeps winning and price runs through. The strategy still gives the signal.')},
/* f08 (module 9): a stop run and rejection */
sweep(){const cs=[{o:30,h:36,l:28,c:35},{o:35,h:42,l:33,c:41},{o:41,h:48,l:39,c:47},{o:47,h:51,l:44,c:45},{o:45,h:60,l:44,c:48},{o:48,h:49,l:40,c:41,col:OFC.loss},{o:41,h:42,l:33,c:34,col:OFC.loss}];
  const dot=(i,p,n,col,d)=>({i,p,t:n,col,d,dy:0});
  return ofFig(ofChart(cs,{h:215,lines:[{p:52,label:'stops resting above the high',col:OFC.gold,a:'start',dy:-5},{p:46,label:'CISD line',col:OFC.ice,a:'end',dy:12}],notes:[{i:4,p:64,t:'1',col:OFC.win,d:1.1,dy:0},{i:5,p:53.5,t:'2',col:OFC.sig,d:1.9,dx:12},{i:6,p:38,t:'3',col:OFC.loss,d:2.5,dx:14}],arrows:[{i1:4,p1:50,i2:4,p2:60.5,col:OFC.win,d:1,dash:false}],alt:'A sweep of a high that is rejected'})+`<ol class="ofv-steps"><li><b style="color:${OFC.win}">1</b> Stops fire and aggressive buying floods in above the high.</li><li><b style="color:${OFC.sig}">2</b> The buying makes no progress: it is absorbed.</li><li><b style="color:${OFC.loss}">3</b> Price closes back inside. Only now does the strategy look for its own confirmation.</li></ol>`,'The orderflow story of a sweep, in three steps.')},
/* f08 (module 9): FVG and rejection block, the same story in orderflow terms */
fvgRb(){const cs=[{o:40,h:46,l:38,c:44},{o:44,h:66,l:43,c:64},{o:64,h:70,l:62,c:68},{o:68,h:69,l:60,c:61},{o:61,h:66,l:50,c:64}];
  return ofFig(ofChart(cs,{h:215,boxes:[{i0:1,i1:4,lo:46,hi:62,col:OFC.sig,label:'FVG'}],lines:[{p:55.5,label:'wick CE',col:OFC.ice,a:'end',dy:12}],
    notes:[{i:1,p:70,t:'A',col:OFC.sig,d:1},{i:4,p:47,t:'B',col:OFC.win,d:1.8,dy:6}],alt:'A fair value gap and a rejection block inside it'})+
    `<ol class="ofv-steps"><li><b style="color:${OFC.sig}">A</b> <b style="width:auto;color:${OFC.ink}">FVG = aggression ran through.</b> One side was so aggressive that price skipped these prices. In a footprint: stacked imbalances, thin rows, little traded inside the gap.</li><li><b style="color:${OFC.win}">B</b> <b style="width:auto;color:${OFC.ink}">Rejection block = aggression was absorbed.</b> Price comes back, wicks into the gap and cannot stay. In a footprint: heavy trading in the wick with little progress, then delta flipping. The wick CE is the middle of that refused range.</li></ol>`,'One picture, two languages. The gap is where aggression won. The rejection block is where it was refused.')},
/* f10: the strategies side by side */
strategies(){const rows=[['ECHO','A sweep is rejected and the CISD closes back','Did the aggression stall at the sweep, then flip?'],['ORBIT','A pullback into the 3-minute zone, then the 5-minute inversion','Was the pullback light and the move away strong?'],['INVERTIX','A key level, then the flip','Did the leg run out of aggression? Is the flip strong?']];
  return ofFig(`<div class="ofs">${rows.map((r,i)=>`<div class="ofs-c" style="--d:${i*.25}s"><b>${r[0]}</b><div class="ofs-t"><span>TRIGGER (the strategy)</span>${r[1]}</div><div class="ofs-f"><span>SECOND OPINION (flow)</span>${r[2]}</div></div>`).join('')}</div>`,'Same pattern in all three: the strategy gives the trigger, flow gives a second opinion. Flow can add confidence or tell you to skip. It never replaces the strategy\'s rules.')}
};
