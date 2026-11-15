/* ============================================================
   ORDERFLOW VISUALS: small animated pictures for the Orderflow lessons, drawn in SVG and plain HTML (no images, no libraries).
   Everything here is a teaching sketch with made-up numbers. Motion is CSS only and falls back to a still picture (reduced motion).
============================================================ */
const OFC={win:'#26a69a',loss:'#ef5350',ice:'#5b9cf6',sig:'#ff6a00',gold:'#f2c14e',ink:'#d1d4dc',ink2:'#868993',ink3:'#5d606b',line:'#2a2e39'};
let OFN=0;
const ofFig=(inner,cap)=>`<figure class="ofv"><div class="ofv-bar"><span>Illustration · made-up numbers</span><button type="button" class="of-replay" aria-label="Replay the animation">↻ Replay</button></div><div class="ofv-body">${inner}</div>${cap?`<figcaption>${cap}</figcaption>`:''}</figure>`;
const ofDefs=id=>`<defs><linearGradient id="gw${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26a69a"/><stop offset="1" stop-color="#26a69a"/></linearGradient><linearGradient id="gl${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ef5350"/><stop offset="1" stop-color="#ef5350"/></linearGradient><filter id="gf${id}" filterUnits="userSpaceOnUse" x="-50" y="-50" width="700" height="700"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><marker id="ah${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker></defs>`;
const ofT=(x,y,t,o={})=>`<text x="${x}" y="${y}" fill="${o.col||OFC.ink2}" font-size="${(o.s||11)*.8}" font-family="Inter,sans-serif" text-anchor="${o.a||'start'}" ${o.b?'font-weight="700"':''} class="${o.cls||''}" ${o.d!=null?`style="animation-delay:${o.d}s"`:''}>${t}</text>`;
const ofWrap=(x,y,t,n,o={})=>{const lines=[];let cur='';t.split(' ').forEach(w=>{if((cur+' '+w).trim().length>n){lines.push(cur);cur=w}else cur=(cur+' '+w).trim()});if(cur)lines.push(cur);return lines.map((l,i)=>ofT(x,y+i*(o.lh||10.5),l,o)).join('')};
const ofArrow=(x1,y1,x2,y2,col,d=0,o={})=>`<path d="M${x1} ${y1}L${x2} ${y2}" pathLength="100" stroke="${col}" stroke-width="${o.w||2.2}" fill="none" ${o.dash?'stroke-dasharray="4 4"':''} marker-end="url(#ah${OFN})" filter="url(#gf${OFN})" class="${o.dash?'of-in':'of-draw'}" style="animation-delay:${d}s"/>`;
/* a candle chart. cs = [{o,h,l,c,d?,col?}] in price units. o.lines [{p,label,col,dash}], o.boxes [{i0,i1,lo,hi,col,label}], o.notes [{i,p,t,col,a,dx,dy,d}], o.arrows [{i1,p1,i2,p2,col,d}] */
function ofChart(cs,o={}){
  const W=o.w||380,H=o.h||200,P=14,gap=(W-2*P)/cs.length,cw=Math.min(15,gap*.55),id=++OFN;
  const ps=[...cs.flatMap(c=>[c.h,c.l]),...(o.lines||[]).map(l=>l.p),...(o.boxes||[]).flatMap(b=>[b.lo,b.hi])],lo=Math.min(...ps),hi=Math.max(...ps),pad=(hi-lo)*.14||1;
  const Y=p=>H-P-(p-(lo-pad))/((hi+pad)-(lo-pad))*(H-2*P),X=i=>P+gap*(i+.5);
  let s=`<svg viewBox="0 0 ${W} ${o.vbH||H}" role="img" aria-label="${o.alt||'Sketch of a price chart'}">${ofDefs(id)}`;
  for(let k=1;k<4;k++)s+=`<line x1="${P}" x2="${W-P}" y1="${P+(H-2*P)*k/4}" y2="${P+(H-2*P)*k/4}" stroke="#1e222d"/>`;
  (o.boxes||[]).forEach(b=>{s+=`<rect x="${P+gap*b.i0}" y="${Y(b.hi)}" width="${gap*(b.i1-b.i0+1)}" height="${Y(b.lo)-Y(b.hi)}" fill="${b.col||OFC.ice}" fill-opacity=".13" stroke="${b.col||OFC.ice}" stroke-opacity=".5" stroke-dasharray="3 3" class="of-in"/>`+(b.label?ofT(P+gap*b.i0+2,Y(b.hi)-5,b.label,{col:b.col||OFC.ice}):'')});
  (o.lines||[]).forEach(l=>{s+=`<line x1="${P}" x2="${W-P}" y1="${Y(l.p)}" y2="${Y(l.p)}" stroke="${l.col||OFC.gold}" stroke-width="1.4" ${l.dash===false?'':'stroke-dasharray="5 4"'} class="of-in"/>`+ofT(l.a==='start'?P+2:W-P,Y(l.p)+(l.dy??-4),l.label||'',{col:l.col||OFC.gold,a:l.a||'end'})});
  cs.forEach((c,i)=>{const up=c.c>=c.o,col=c.col||(up?OFC.win:OFC.loss),fill=c.col||`url(#g${up?'w':'l'}${id})`,top=Y(Math.max(c.o,c.c)),bot=Y(Math.min(c.o,c.c));
    s+=`<g class="of-grow" style="animation-delay:${c.d??i*.16}s"><line x1="${X(i)}" x2="${X(i)}" y1="${Y(c.h)}" y2="${Y(c.l)}" stroke="${col}" stroke-width="1.6"/><rect x="${X(i)-cw/2}" y="${top}" width="${cw}" height="${Math.max(2,bot-top)}" rx="2" fill="${fill}"/></g>`});
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
/* a volume profile as SVG bars. rows [[price,volume]] highest price first. o: poc, va:[low,high], labels, w, h, delay (seconds before the first bar) */
function ofProf(rows,o={}){
  const W=o.w||380,rh=o.rh||22,H=(o.h||rows.length*rh+28),mx=Math.max(...rows.map(r=>r[1])),id=++OFN,x0=70,bw=W-x0-(o.labels?110:20);
  let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.alt||'Volume profile'}">${ofDefs(id)}`;
  if(o.va){const hi=rows.findIndex(r=>r[0]<=o.va[1]),lo=rows.length-1-[...rows].reverse().findIndex(r=>r[0]>=o.va[0]);
    s+=`<rect x="${x0-6}" y="${10+hi*rh-2}" width="${W-x0-6}" height="${(lo-hi+1)*rh+4}" rx="4" fill="${OFC.ice}" fill-opacity=".1" stroke="${OFC.ice}" stroke-opacity=".45" stroke-dasharray="4 3" class="of-in" style="animation-delay:${(o.delay||0)+1.4}s"/>`}
  rows.forEach((r,i)=>{const y=10+i*rh,w=Math.max(3,r[1]/mx*bw),poc=o.poc===r[0];
    s+=`<text x="${x0-10}" y="${y+rh*.62}" fill="${OFC.ink3}" font-size="8" font-family="monospace" text-anchor="end">${fm(r[0],0)}</text><rect class="of-bar" x="${x0}" y="${y+2}" width="${w}" height="${rh-4}" rx="3" fill="${poc?OFC.sig:OFC.ice}" fill-opacity="${poc?1:.6}" style="animation-delay:${(o.delay||0)+i*.12}s" ${poc?`filter="url(#gf${id})"`:''}/>`;
    if(o.labels){const t=poc?'POC: most volume':(o.va&&r[0]===o.va[1]?'VAH (value area high)':o.va&&r[0]===o.va[0]?'VAL (value area low)':'');if(t)s+=ofT(x0+w+8,y+rh*.62,t,{col:poc?OFC.sig:OFC.ice,b:1,cls:'of-in',d:(o.delay||0)+1.6})}});
  return s+'</svg>'}

/* ============================================================
   FOOTPRINT RENDERER (DeepCharts-style): each candle is a column of price rows showing "bid x ask", imbalance cells lit green (buyers) or red (sellers),
   the busiest row outlined, a delta bar and a cumulative delta (CVD) line underneath, and a volume profile on the right. Teaching sketches with made-up numbers.
   Reading scenes: small stories (exhaustion, absorption, still being fed...) used in the lessons, the practice tasks and the exams.
============================================================ */
const FPR=7;
/* spec: [{w:[7 weights top->bottom], b:bias -1..1 (+ = buyers aggressive), s:scale, up:true/false}] -> candles with rows [[bid,ask]...] */
function fpMake(spec,r){return spec.map(c=>({up:c.up,rows:c.w.map(w=>{if(!w)return[0,0];const v=Math.max(3,Math.round(w*(c.s||120)*(.88+.24*r())));const sh=Math.min(.92,Math.max(.08,.5+.4*c.b+(r()-.5)*.06)),ask=Math.round(v*sh);return[v-ask,ask]})}))}
function fpStats(cs){let cvd=0;return cs.map(c=>{const bid=c.rows.reduce((a,x)=>a+x[0],0),ask=c.rows.reduce((a,x)=>a+x[1],0),vol=bid+ask,tot=c.rows.map(x=>x[0]+x[1]),poc=tot.indexOf(Math.max(...tot));cvd+=ask-bid;
  const buy=c.rows.map((x,i)=>i<FPR-1&&c.rows[i+1][0]>0&&x[1]>=3*c.rows[i+1][0]&&x[1]>=8),sell=c.rows.map((x,i)=>i>0&&c.rows[i-1][1]>0&&x[0]>=3*c.rows[i-1][1]&&x[0]>=8);
  return{bid,ask,vol,delta:ask-bid,cvd,poc,buy,sell}})}
function ofFp(cs,o={}){
  const R=FPR,n=cs.length,id=++OFN,W=o.w||400,left=40,profW=o.profile===false?0:64,cw=(W-left-profW-8)/n,rh=17,top=12,gy=top+R*rh,H=gy+(o.panels===false?8:96),st=fpStats(cs),base=o.base||21470,
    mx=Math.max(...cs.flatMap(c=>c.rows.map(x=>x[0]+x[1])));
  let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.alt||'A footprint chart'}">${ofDefs(id)}`;
  for(let i=0;i<R;i++)s+=ofT(left-6,top+i*rh+rh*.68,fm(base-i,0),{a:'end',col:OFC.ink3,s:8.5});
  cs.forEach((c,k)=>{const x0=left+k*cw,d=k*.5;
    s+=`<g class="of-in" style="animation-delay:${d}s">`;
    c.rows.forEach((x,i)=>{const y=top+i*rh,v=x[0]+x[1];if(!v){s+=`<rect x="${x0+2}" y="${y+1}" width="${cw-4}" height="${rh-2}" rx="2" fill="#0a0d12"/>`;return}
      const bi=st[k].buy[i],si=st[k].sell[i],a=.1+.5*v/mx;
      s+=`<rect x="${x0+2}" y="${y+1}" width="${cw-4}" height="${rh-2}" rx="2" fill="${bi?OFC.win:si?OFC.loss:'#5d86b8'}" fill-opacity="${bi||si?.28:a*.55}" ${i===st[k].poc?`stroke="${OFC.gold}" stroke-width="1.4"`:''}/>`+
        `<text x="${x0+cw/2-3}" y="${y+rh*.7}" text-anchor="end" font-size="7.2" font-family="monospace" fill="${si?OFC.loss:OFC.ink2}" ${si?'font-weight="700"':''}>${x[0]}</text><text x="${x0+cw/2}" y="${y+rh*.7}" text-anchor="middle" font-size="6.5" font-family="monospace" fill="${OFC.ink3}">×</text><text x="${x0+cw/2+3}" y="${y+rh*.7}" font-size="7.2" font-family="monospace" fill="${bi?OFC.win:OFC.ink2}" ${bi?'font-weight="700"':''}>${x[1]}</text>`});
    const rowsT=c.rows.map((x,i)=>x[0]+x[1]?i:-1).filter(i=>i>=0),r0=rowsT[0],r1=rowsT[rowsT.length-1];
    s+=`<rect x="${x0}" y="${top+r0*rh+1}" width="2.4" height="${(r1-r0+1)*rh-2}" rx="1" fill="${c.up?OFC.win:OFC.loss}"/></g>`});
  if(profW){const tot=Array(R).fill(0);cs.forEach(c=>c.rows.forEach((x,i)=>{tot[i]+=x[0]+x[1]}));const pm=Math.max(...tot),pi=tot.indexOf(pm),px=W-profW-2;
    tot.forEach((v,i)=>{s+=`<rect class="of-bar" x="${px}" y="${top+i*rh+3}" width="${Math.max(2,v/pm*(profW-4))}" height="${rh-6}" rx="2" fill="${i===pi?OFC.sig:OFC.ice}" fill-opacity="${i===pi?.95:.45}" style="animation-delay:${n*.5}s"/>`});
    s+=ofT(px+profW/2,gy+11,'profile',{a:'middle',col:OFC.ink3,s:8})}
  if(o.panels!==false){const dz=gy+44,maxd=Math.max(1,...st.map(x=>Math.abs(x.delta))),cv=st.map(x=>x.cvd),cmax=Math.max(1,...cv.map(Math.abs));
    s+=ofT(2,gy+13,'Delta',{col:OFC.ink3,s:8.5})+`<line x1="${left}" x2="${W-profW-6}" y1="${dz}" y2="${dz}" stroke="${OFC.line}"/>`;
    st.forEach((q,k)=>{const x0=left+k*cw+cw/2,h=Math.abs(q.delta)/maxd*22;s+=`<g class="of-in" style="animation-delay:${k*.5+.3}s"><rect x="${x0-10}" y="${q.delta>=0?dz-h:dz}" width="20" height="${Math.max(1.5,h)}" rx="2" fill="${q.delta>=0?OFC.win:OFC.loss}" fill-opacity=".85"/>${ofT(x0,q.delta>=0?dz-h-3:dz+h+9,(q.delta>0?'+':'')+q.delta,{a:'middle',col:q.delta>=0?OFC.win:OFC.loss,s:8.5,b:1})}</g>`});
    const cz=gy+84,pts=cv.map((v,k)=>[left+k*cw+cw/2,cz-v/cmax*16]);
    s+=ofT(2,gy+68,'CVD',{col:OFC.ink3,s:8.5})+`<line x1="${left}" x2="${W-profW-6}" y1="${cz}" y2="${cz}" stroke="${OFC.line}"/><polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${OFC.gold}" stroke-width="2" pathLength="100" class="of-draw" style="animation-delay:${n*.5}s;animation-duration:1.2s"/>`+pts.map((p,k)=>`<circle class="of-in" style="animation-delay:${n*.5+k*.2}s" cx="${p[0]}" cy="${p[1]}" r="3" fill="${OFC.gold}"/>`).join('')}
  (o.notes||[]).forEach(nt=>{s+=ofT(left+nt.c*cw+cw/2,top+nt.row*rh+rh*.7,nt.t,{a:'middle',col:nt.col||OFC.sig,b:1,s:9,cls:'of-in',d:nt.d??1.6})});
  return s+'</svg>'}
/* the reading scenes. col: green (all clear), yellow (half size), red (skip). say: the one-line reading. */
const OFS={
 n_exhaust:{col:'green',say:'Exhaustion: huge volume at the very top, then price trades back inside with the opposite delta. The last aggressive buyers got trapped.',cs:[{w:[.35,.55,.75,.85,.95,.75,.45],b:.8,s:110,up:true},{w:[1,.9,.5,.2,0,0,0],b:.55,s:150,up:true},{w:[0,.35,.7,.6,.3,0,0],b:-.75,s:90,up:false}]},
 n_absorb:{col:'green',say:'Absorption: big volume at the top but price stops advancing. Large resting orders are soaking up the aggressive buying.',cs:[{w:[.35,.55,.75,.85,.95,.75,.45],b:.8,s:110,up:true},{w:[.9,1,.35,.1,0,0,0],b:.7,s:150,up:true},{w:[.1,.7,.8,.4,.1,0,0],b:-.25,s:70,up:false}]},
 n_diverge:{col:'green',say:'Divergence: price made the last high but delta did not confirm it. Buyers are fading, so the cumulative delta makes a lower high.',cs:[{w:[.2,.4,.7,.9,.95,.6,.3],b:.8,s:120,up:true},{w:[.6,.9,.6,.3,0,0,0],b:.1,s:60,up:true},{w:[.9,.6,.2,0,0,0,0],b:-.35,s:55,up:true}]},
 n_fed:{col:'red',say:'Still being fed: stacked imbalances keep printing in the spike direction, delta keeps extending and the pullbacks are shallow on little volume. Fading this is fighting live pressure.',cs:[{w:[.35,.55,.75,.85,.95,.75,.45],b:.8,s:110,up:true},{w:[.3,.7,.95,.8,.5,.2,0],b:.88,s:130,up:true},{w:[.7,.95,.8,.4,.1,0,0],b:.88,s:120,up:true}]},
 n_slow:{col:'yellow',say:'Mixed: the push still has some fuel but it is slowing: delta is shrinking while price still creeps higher. Take half size.',cs:[{w:[.35,.55,.75,.85,.95,.75,.45],b:.8,s:110,up:true},{w:[.3,.7,.9,.7,.4,.1,0],b:.5,s:100,up:true},{w:[.6,.8,.6,.2,0,0,0],b:.25,s:70,up:true}]},
 z_absorb:{col:'green',say:'Absorption at the zone: heavy selling pushes into the demand zone but cannot make progress, then delta swings back up.',cs:[{w:[0,0,.3,.6,.9,.7,.5],b:-.8,s:110,up:false},{w:[0,0,0,.2,.5,1,.9],b:-.65,s:150,up:false},{w:[0,0,.4,.8,.6,.3,0],b:.55,s:90,up:true}]},
 z_slice:{col:'red',say:'Sliced through: stacked sell imbalances, one-sided delta, and the next candle opens beyond the far edge of the zone. The zone is failing.',cs:[{w:[0,0,.3,.6,.9,.7,.5],b:-.8,s:110,up:false},{w:[0,0,0,.3,.7,.95,.6],b:-.88,s:130,up:false},{w:[0,0,0,0,.4,.9,.85],b:-.88,s:120,up:false}]},
 b_good:{col:'green',say:'Clean break: the delta agrees with the break candle, volume is clearly higher than before, and imbalances pile up in the break direction.',cs:[{w:[0,0,.3,.5,.4,.2,0],b:.05,s:55,up:true},{w:[0,.2,.5,.4,.2,0,0],b:-.05,s:50,up:false},{w:[.2,.6,.95,.9,.6,.3,0],b:.78,s:160,up:true},{w:[.5,.9,.7,.4,.1,0,0],b:.65,s:110,up:true}]},
 b_weak:{col:'red',say:'Weak delta: the break candle closed up, but sellers were the aggressors (negative delta). The close and the aggression disagree.',cs:[{w:[0,0,.3,.5,.4,.2,0],b:.05,s:55,up:true},{w:[0,.2,.5,.4,.2,0,0],b:-.05,s:50,up:false},{w:[.2,.6,.95,.9,.6,.3,0],b:-.4,s:160,up:true},{w:[.5,.8,.6,.3,0,0,0],b:-.1,s:70,up:true}]},
 b_absorbed:{col:'red',say:'Absorption on the wrong side: volume jumped, but price barely followed. Someone is soaking up the break.',cs:[{w:[0,0,.3,.5,.4,.2,0],b:.05,s:55,up:true},{w:[0,.2,.5,.4,.2,0,0],b:-.05,s:50,up:false},{w:[.3,1,.95,.25,0,0,0],b:.55,s:170,up:true},{w:[.3,.8,.5,.2,0,0,0],b:-.3,s:90,up:false}]},
 a_fed:{col:'green',say:'Being fed: the cumulative delta keeps rising as price advances, and the pullback came on thin volume.',cs:[{w:[.2,.6,.9,.8,.4,.1,0],b:.6,s:110,up:true},{w:[.4,.6,.4,.1,0,0,0],b:-.2,s:40,up:false},{w:[.7,.95,.7,.3,0,0,0],b:.7,s:120,up:true}]},
 a_div:{col:'yellow',say:'Fading: price made a new high but the cumulative delta made a lower high. Buyers are fading. It is a warning, not a reason to touch your stop.',cs:[{w:[.2,.6,.9,.8,.4,.1,0],b:.7,s:130,up:true},{w:[.5,.8,.5,.2,0,0,0],b:.3,s:90,up:true},{w:[.8,.5,.2,0,0,0,0],b:-.15,s:70,up:true}]},
 a_opp:{col:'red',say:'Pressure at your stop side: heavy opposite volume is stacking up where your stop sits, with delta running against the trade.',cs:[{w:[.2,.6,.9,.8,.4,.1,0],b:.6,s:110,up:true},{w:[0,.1,.4,.8,.9,.5,.2],b:-.7,s:140,up:false},{w:[0,0,.2,.6,.95,.9,.6],b:-.85,s:150,up:false}]},
 e_failed:{col:'green',say:'Failed auction: heavy aggressive buying into the level, then the delta flipped and price came back inside the range. The buyers got trapped.',cs:[{w:[.2,.6,.9,.8,.4,.1,0],b:.7,s:110,up:true},{w:[.9,1,.6,.3,.1,0,0],b:.65,s:150,up:true},{w:[.1,.6,.8,.5,.2,0,0],b:-.7,s:110,up:false}]},
 e_absorb:{col:'green',say:'Absorption: large volume at the extreme of the wick but price made no progress. The level is being defended.',cs:[{w:[.2,.6,.9,.8,.4,.1,0],b:.7,s:110,up:true},{w:[.85,1,.3,.1,0,0,0],b:.6,s:160,up:true},{w:[.2,.7,.6,.2,0,0,0],b:-.3,s:80,up:false}]},
 e_notrej:{col:'red',say:'Not rejected yet: the delta keeps pushing in the sweep direction, stacked imbalances continue, and the next candles hold beyond the wick.',cs:[{w:[.2,.6,.9,.8,.4,.1,0],b:.7,s:110,up:true},{w:[.9,1,.6,.3,.1,0,0],b:.85,s:150,up:true},{w:[.9,.8,.4,.1,0,0,0],b:.85,s:130,up:true}]},
 e_div:{col:'green',say:'Divergence at the sweep extreme: price made a new high but the cumulative delta did not. Fewer aggressive buyers pushed it.',cs:[{w:[.2,.6,.9,.8,.4,.1,0],b:.8,s:130,up:true},{w:[.7,.9,.5,.2,0,0,0],b:.45,s:80,up:true},{w:[.95,.6,.2,0,0,0,0],b:.1,s:55,up:true}]},
 l_slow:{col:'green',say:'Slow and fading: price drifts back to your limit on thin volume, with the delta fading against your trade. Leave the limit in.',cs:[{w:[0,.4,.6,.3,0,0,0],b:-.1,s:40,up:false},{w:[0,0,.5,.6,.2,0,0],b:-.15,s:32,up:false},{w:[0,0,0,.5,.5,.2,0],b:-.1,s:30,up:false}]},
 l_surge:{col:'red',say:'Fast, heavy and one-sided: price rushes to your limit with large delta and stacked imbalances toward your stop. The level may fail. Cancel the limit.',cs:[{w:[0,.3,.5,.3,0,0,0],b:.1,s:50,up:true},{w:[0,.3,.7,.95,.5,0,0],b:.85,s:150,up:true},{w:[0,0,.4,.9,1,.7,0],b:.9,s:175,up:true}]},
 o_tap:{col:'green',say:'A healthy tap: buyers push up into the 0.705 on slowing volume, the delta fades, and there is absorption at the level.',cs:[{w:[0,.2,.5,.8,.7,.3,0],b:.7,s:110,up:true},{w:[0,.5,.8,.5,.2,0,0],b:.3,s:75,up:true},{w:[.4,.8,.4,.1,0,0,0],b:.05,s:55,up:true}]},
 o_through:{col:'red',say:'The idea fails: the tap comes with stacked buy imbalances and price shoots through the top of the large range.',cs:[{w:[0,.2,.5,.8,.7,.3,0],b:.7,s:110,up:true},{w:[.2,.6,.9,.8,.4,.1,0],b:.85,s:140,up:true},{w:[.7,1,.8,.3,0,0,0],b:.9,s:160,up:true}]},
 o_inv:{col:'green',say:'A strong inversion: the closing candle has strong delta in the new direction on clear volume, and the inversion high holds.',cs:[{w:[0,.3,.6,.4,.2,0,0],b:.2,s:50,up:true},{w:[.2,.8,.9,.7,.3,0,0],b:-.78,s:150,up:false},{w:[0,.2,.5,.6,.3,0,0],b:-.55,s:90,up:false}]},
 o_invweak:{col:'red',say:'A weak inversion: the closing candle has weak or opposite delta, and price is pushed straight back above the inversion high.',cs:[{w:[0,.3,.6,.4,.2,0,0],b:.2,s:50,up:true},{w:[.2,.8,.9,.7,.3,0,0],b:.3,s:110,up:false},{w:[.9,1,.7,.3,0,0,0],b:.8,s:150,up:true}]}
};
const OFCOL={green:'#3ee0a1',yellow:'#ffc861',red:'#ff5d73'};
function ofScene(id,r,o={}){const sc=OFS[id],cs=fpMake(sc.cs,r||Math.random);return ofFp(cs,{alt:o.alt||'A footprint reading scene',...o})}


/* an exam / practice question built from a reading scene. mode: 'trade' (take / half size / skip), 'limit' (leave / cancel), 'read' (what does it show) */
const ofSceneQ=(topic,ids,stem,mode='trade')=>r=>{const id=pick(r,ids),sc=OFS[id],svg=`<span class="ofv-q">${ofScene(id,r)}</span>`;
  const A={trade:{green:'Green: take it at your planned size',yellow:'Yellow: take half size, or wait one candle',red:'Red: skip it'},limit:{green:'Leave the limit in',yellow:'Leave it, but watch closely',red:'Cancel the limit'}};
  if(mode==='read'){const others=shuf(Object.keys(OFS).filter(k=>k!==id&&OFS[k].say!==sc.say),r).slice(0,3).map(k=>OFS[k].say);return mcq(topic,`${stem}${svg}`,[sc.say,...others],sc.say)}
  const a=A[mode],right=a[sc.col]||a.green,wrong=Object.entries(a).filter(([k])=>k!==sc.col).map(([,v])=>v);
  wrong.push(mode==='trade'?'Take a bigger size because the flow looks strong':'Move your stop closer to the market');
  return mcq(topic,`${stem}${svg}`,[right,...wrong.slice(0,3)],sc.say+(mode==='trade'?' Order flow can make you skip or size down. It never makes you size up.':''))};
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
delta(){const d=[120,-60,90,-200,140],W=380,H=250,x0=40,bw=36,gap=64,z1=62,k=.2,z2=188,k2=.34;let cum=0;const id=++OFN,pts=d.map((v,i)=>{cum+=v;return[x0+i*gap+bw/2,z2-cum*k2,cum]});
  let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Delta per candle and cumulative delta">${ofDefs(id)}`+ofT(14,12,'Delta of each candle',{col:OFC.ink3})+`<line x1="14" x2="366" y1="${z1}" y2="${z1}" stroke="${OFC.line}"/>`;
  d.forEach((v,i)=>{const h=Math.abs(v)*k;s+=`<g style="animation-delay:${i*.3}s" class="of-in"><rect class="of-grow ${v>0?'':'dn'}" style="animation-delay:${i*.3}s" x="${x0+i*gap}" y="${v>0?z1-h:z1}" width="${bw}" height="${h}" rx="2" fill="${v>0?'url(#gw'+id+')':'url(#gl'+id+')'}"/>${ofT(x0+i*gap+bw/2,v>0?z1-h-4:z1+h+11,(v>0?'+':'')+v,{a:'middle',col:OFC.ink})}</g>`});
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
  return ofFig(ofChart(cs,{lines:[{p:61,label:'big resting sell orders',col:OFC.loss,dy:-5}],notes:[{i:0,p:55,t:'buyers keep',col:OFC.win,d:1.2,a:'start',dx:-8},{i:0,p:51.5,t:'hitting the ask',col:OFC.win,d:1.3,a:'start',dx:-8},{i:5,p:44,t:'price goes nowhere',col:OFC.ink,d:1.8}],arrows:[{i1:2,p1:57,i2:4,p2:61.2,col:OFC.win,d:1},{i1:3,p1:58,i2:5,p2:61.2,col:OFC.win,d:1.2}],alt:'Absorption: buyers hit the ask at a level and price stalls'}),'Absorption: lots of aggressive buying at a level, but price cannot get through. A big passive seller is soaking it all up.')},
/* f06: exhaustion */
exhaustion(){const W=380;
  const cs=[{o:22,h:30,l:20,c:28},{o:28,h:42,l:26,c:40},{o:40,h:44,l:34,c:37},{o:37,h:56,l:36,c:54},{o:54,h:58,l:48,c:51},{o:51,h:66,l:50,c:64},{o:64,h:68,l:60,c:62}];
  return ofFig(ofChart(cs,{w:W,h:150,vbH:225,notes:[{i:1,p:42,t:'1st push',col:OFC.ink2,d:.9,dy:-8},{i:3,p:56,t:'2nd',col:OFC.ink2,d:1.1,dy:-8},{i:5,p:66,t:'3rd',col:OFC.ink2,d:1.3,dy:-8}],alt:'Exhaustion: each push up has less delta',
    extra:(Y,X)=>{let e=`<line x1="14" x2="366" y1="205" y2="205" stroke="${OFC.line}"/>`+ofT(14,158,'Delta of each push',{col:OFC.ink3});
      [[1,260],[3,150],[5,60]].forEach(([i,v],k)=>{const h=v*.1;e+=`<g class="of-in" style="animation-delay:${1.5+k*.35}s"><rect x="${X(i)-10}" y="${205-h}" width="20" height="${h}" rx="2" fill="${OFC.win}" fill-opacity=".8"/>${ofT(X(i),205-h-4,'+'+v,{a:'middle',col:OFC.ink})}</g>`});
      return e+ofT(366,220,'each push has less fuel',{a:'end',col:OFC.loss,b:1,cls:'of-in',d:2.7})}}),'Exhaustion: price keeps making new highs, but each push comes with less delta. The buyers are not being absorbed, they are simply running out.')},
/* f06: trapped traders */
trapped(){const cs=[{o:40,h:46,l:38,c:44},{o:44,h:50,l:42,c:48},{o:48,h:56,l:47,c:54},{o:54,h:60,l:52,c:58},{o:58,h:59,l:50,c:51,col:OFC.loss},{o:51,h:52,l:42,c:43,col:OFC.loss},{o:43,h:44,l:34,c:35,col:OFC.loss}];
  return ofFig(ofChart(cs,{lines:[{p:55,label:'the level',col:OFC.gold,a:'start',dy:-5}],boxes:[{i0:3,i1:6,lo:51,hi:60,col:OFC.loss,label:''}],notes:[{i:3,p:62.5,t:'buyers pile in on the break',col:OFC.win,d:1,a:'start',dx:-30},{i:5,p:31,t:'trapped: now losing',col:OFC.loss,d:1.9}],arrows:[{i1:3,p1:61,i2:6,p2:38,col:OFC.loss,d:2.3}],alt:'Trapped traders: a break fails and price falls back through the level'}),'Trapped traders: buyers who bought the break are now underwater when price falls back under the level. Their stops (market orders) add to the move down.')},
/* f07: the volume profile with POC and value area */
profile(){const rows=[[21456,25],[21455,45],[21454,80],[21453,120],[21452,150],[21451,110],[21450,70],[21449,40],[21448,20]];
  return ofFig(ofProf(rows,{poc:21452,va:[21450,21454],labels:true,alt:'A volume profile with the point of control and the value area'}),'A volume profile: contracts traded at each price. The longest bar is the point of control (POC). The shaded rows are the value area: about 70% of the day\'s volume, with its high (VAH) and low (VAL).')},
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
  return ofFig(ofChart(cs,{h:190,lines:[{p:52,label:'stops resting above the high',col:OFC.gold,a:'start',dy:-5},{p:46,label:'CISD line',col:OFC.ice,a:'end',dy:12}],notes:[{i:4,p:64,t:'1',col:OFC.win,d:1.1,dy:0},{i:5,p:53.5,t:'2',col:OFC.sig,d:1.9,dx:12},{i:6,p:38,t:'3',col:OFC.loss,d:2.5,dx:14}],arrows:[{i1:4,p1:50,i2:4,p2:60.5,col:OFC.win,d:1,dash:false}],alt:'A sweep of a high that is rejected'})+`<ol class="ofv-steps"><li><b style="color:${OFC.win}">1</b> Stops fire and aggressive buying floods in above the high.</li><li><b style="color:${OFC.sig}">2</b> The buying makes no progress: it is absorbed.</li><li><b style="color:${OFC.loss}">3</b> Price closes back inside. Only now does the strategy look for its own confirmation.</li></ol>`,'The orderflow story of a sweep, in three steps.')},
/* f08 (module 9): FVG and rejection block, the same story in orderflow terms */
fvgRb(){const cs=[{o:40,h:46,l:38,c:44},{o:44,h:66,l:43,c:64},{o:64,h:70,l:62,c:68},{o:68,h:69,l:60,c:61},{o:61,h:66,l:50,c:64}];
  return ofFig(ofChart(cs,{h:215,boxes:[{i0:1,i1:4,lo:46,hi:62,col:OFC.sig,label:'FVG'}],lines:[{p:55.5,label:'wick CE',col:OFC.ice,a:'start',dy:12}],
    notes:[{i:1,p:70,t:'A',col:OFC.sig,d:1},{i:4,p:47,t:'B',col:OFC.win,d:1.8,dy:6}],alt:'A fair value gap and a rejection block inside it'})+
    `<ol class="ofv-steps"><li><b style="color:${OFC.sig}">A</b> <b style="width:auto;color:${OFC.ink}">FVG = aggression ran through.</b> One side was so aggressive that price skipped these prices. In a footprint: stacked imbalances, thin rows, little traded inside the gap.</li><li><b style="color:${OFC.win}">B</b> <b style="width:auto;color:${OFC.ink}">Rejection block = aggression was absorbed.</b> Price comes back, wicks into the gap and cannot stay. In a footprint: heavy trading in the wick with little progress, then delta flipping. The wick CE is the middle of that refused range.</li></ol>`,'One picture, two languages. The gap is where aggression won. The rejection block is where it was refused.')},
/* f07: watching a profile build as price moves */
build(){const R=11,N=12,W=400,H=250,P=12,rowH=(H-2*P)/R,Yp=p=>H-P-p*rowH,cx0=14,cx1=236,gap=(cx1-cx0)/N,id=++OFN;
  const cs=[[5,6,4.5,5.5],[5.5,6.5,5,6],[6,7,5.5,5.8],[5.8,6.3,4.8,5],[5,5.8,4.2,5.4],[5.4,6.2,5,5.9],[5.9,6.4,5.2,5.5],[5.5,6,4.9,5.6],[5.6,7.6,5.5,7.4],[7.4,8.6,7,8.2],[8.2,9,7.6,7.8],[7.8,8.4,7.2,8]];
  const vol=Array(R).fill(0),first=Array(R).fill(99),last=Array(R).fill(-1);
  cs.forEach((c,i)=>{const mid=(c[0]+c[3])/2;for(let r=Math.max(0,Math.floor(c[2]));r<=Math.min(R-1,Math.floor(c[1]));r++){vol[r]+=10/(1+Math.abs(r+.5-mid));first[r]=Math.min(first[r],i);last[r]=Math.max(last[r],i)}});
  const mx=Math.max(...vol),poc=vol.indexOf(mx),tot=vol.reduce((a,b)=>a+b,0);let lo=poc,hi=poc,acc=vol[poc];while(acc<tot*.7){const dn=lo>0?vol[lo-1]:-1,up=hi<R-1?vol[hi+1]:-1;if(dn>=up){lo--;acc+=vol[lo]}else{hi++;acc+=vol[hi]}}
  let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="A volume profile building up as price moves">${ofDefs(id)}`;
  for(let r=0;r<R;r++)s+=`<line x1="${cx0}" x2="${W-P}" y1="${Yp(r)}" y2="${Yp(r)}" stroke="#1e222d"/>`;
  const T=.38;
  s+=`<rect x="248" y="${Yp(hi+1)}" width="${W-P-248}" height="${(hi-lo+1)*rowH}" fill="${OFC.ice}" fill-opacity=".1" stroke="${OFC.ice}" stroke-opacity=".4" stroke-dasharray="4 3" class="of-in" style="animation-delay:${N*T+.6}s"/>`;
  for(let r=0;r<R;r++){if(!vol[r])continue;const w=vol[r]/mx*(W-P-262),t0=first[r]*T,dur=(last[r]-first[r]+1)*T+.5;
    s+=`<rect class="of-bar" x="252" y="${Yp(r+1)+2}" width="${w}" height="${rowH-4}" rx="3" fill="${r===poc?OFC.sig:OFC.ice}" fill-opacity="${r===poc?1:.6}" style="animation-delay:${t0}s;animation-duration:${dur}s"/>`}
  cs.forEach((c,i)=>{const up=c[3]>=c[0],x=cx0+gap*(i+.5),col=up?OFC.win:OFC.loss;
    s+=`<g class="of-grow" style="animation-delay:${i*T}s"><line x1="${x}" x2="${x}" y1="${Yp(c[1])}" y2="${Yp(c[2])}" stroke="${col}" stroke-width="1.5"/><rect x="${x-5}" y="${Yp(Math.max(c[0],c[3]))}" width="10" height="${Math.max(2,Math.abs(c[3]-c[0])*rowH)}" rx="1.5" fill="url(#g${up?'w':'l'}${id})"/></g>`});
  s+=ofT(14,H-1,'price, candle by candle',{col:OFC.ink3})+ofT(252,H-1,'volume at each price',{col:OFC.ink3})+ofT(W-P-4,Yp(poc+.5)-rowH/2-2,'POC',{a:'end',col:OFC.sig,b:1,cls:'of-in',d:N*T+.5})+ofT(W-P-4,Yp(hi+1)-3,'value area',{a:'end',col:OFC.ice,b:1,cls:'of-in',d:N*T+.7});
  return ofFig(s+'</svg>','Watch the profile build: each time price trades at a level, that level\'s bar grows. Price lingered in the middle, so that is where the longest bar (the POC) forms. The shaded band holds about 70% of the volume.')},
/* f07: the four profile shapes */
shapes(){const shapes=[['D shape','a balanced day','Price rotated around one fair price. Both sides agreed.',[10,25,50,80,100,80,50,25,10],OFC.ice],['P shape','buyers pushed up, then it was accepted','Often a short-covering or buying push that then settled high.',[100,92,78,50,26,12,7,4,2],OFC.win],['b shape','sellers pushed down, then it was accepted','Often a sell-off or long liquidation that then settled low.',[2,4,7,12,26,50,78,92,100],OFC.loss],['Thin and long','fast trend, little accepted','Price moved quickly and spent little time at any level.',[18,20,22,21,23,22,20,21,19],OFC.gold]];
  const id=++OFN;let s=`<svg viewBox="0 0 400 238" role="img" aria-label="Four volume profile shapes">${ofDefs(id)}`;
  shapes.forEach((sh,k)=>{const col=k%2,row=Math.floor(k/2),ox=14+col*196,oy=10+row*118,mx=100,d=k*.45;
    s+=`<g class="of-in" style="animation-delay:${d}s"><rect x="${ox}" y="${oy}" width="184" height="108" rx="8" fill="#080b10" stroke="${OFC.line}"/></g>`;
    sh[3].forEach((v,i)=>{s+=`<rect class="of-bar" x="${ox+10}" y="${oy+10+i*9.4}" width="${Math.max(2,v/mx*70)}" height="7" rx="2" fill="${sh[4]}" fill-opacity=".85" style="animation-delay:${d+i*.07}s"/>`});
    s+=ofT(ox+92,oy+20,sh[0],{col:sh[4],b:1,s:12,cls:'of-in',d:d+.4})+ofWrap(ox+92,oy+33,sh[1],23,{col:OFC.ink,cls:'of-in',d:d+.5,s:9})+ofWrap(ox+92,oy+60,sh[2],25,{col:OFC.ink2,cls:'of-in',d:d+.6,s:8.5,lh:10})});
  return ofFig(s+'</svg>','Four common profile shapes and what they often say about the day. They describe what happened, they do not predict the next candle.')},
/* f07: high and low volume nodes */
nodes(){const rows=[[21464,20],[21463,55],[21462,90],[21461,105],[21460,70],[21459,26],[21458,12],[21457,8],[21456,30],[21455,70],[21454,98],[21453,82],[21452,40],[21451,15]];
  const id=++OFN,rh=18,x0=62,mx=105,bw=200;let s=`<svg viewBox="0 0 400 ${rows.length*rh+22}" role="img" aria-label="A volume profile with two high volume nodes and a low volume node">${ofDefs(id)}`;
  s+=`<rect x="${x0-6}" y="${10+5*rh}" width="${bw+18}" height="${3*rh}" rx="4" fill="${OFC.sig}" fill-opacity=".12" stroke="${OFC.sig}" stroke-opacity=".5" stroke-dasharray="4 3" class="of-in" style="animation-delay:1.5s"/>`;
  rows.forEach((r,i)=>{const y=10+i*rh,w=Math.max(3,r[1]/mx*bw),hv=r[1]>=90,lv=i>=5&&i<=7;
    s+=`<text x="${x0-10}" y="${y+rh*.66}" fill="${OFC.ink3}" font-size="7.5" font-family="monospace" text-anchor="end">${fm(r[0],0)}</text><rect class="of-bar" x="${x0}" y="${y+2}" width="${w}" height="${rh-4}" rx="3" fill="${lv?OFC.sig:OFC.ice}" fill-opacity="${hv?.95:lv?.9:.45}" style="animation-delay:${i*.09}s"/>`});
  const lx=290;
  s+=ofT(lx,10+2.5*rh,'HIGH volume node',{col:OFC.ice,b:1,cls:'of-in',d:1.3,s:10})+ofWrap(lx,10+2.5*rh+11,'accepted price: price slows or rotates',20,{col:OFC.ink2,cls:'of-in',d:1.4,s:8.5});
  s+=ofT(lx,10+5.8*rh,'LOW volume node',{col:OFC.sig,b:1,cls:'of-in',d:1.7,s:10})+ofWrap(lx,10+5.8*rh+11,'price ran through fast',20,{col:OFC.ink2,cls:'of-in',d:1.8,s:8.5});
  s+=ofT(lx,10+10.3*rh,'HIGH volume node',{col:OFC.ice,b:1,cls:'of-in',d:1.5,s:10});
  s+=ofArrow(378,10+11*rh,378,10+1.5*rh,OFC.win,1.9,{w:3});
  return ofFig(s+'</svg>','High volume nodes are prices the market accepted. A low volume node is a price range that traded quickly and little: the profile version of a fair value gap. Price often moves fast through one, and may come back to test it. The green arrow shows a fast move through the low volume node.')},
/* f07: where the day opens against yesterday's value */
openVs(){const sc=[['Opens INSIDE value','Likely rotation toward the POC. Balance.',OFC.ice],['Opens ABOVE value','Does it hold (initiative buyers) or fall back in (responsive sellers)?',OFC.win],['Opens BELOW value','Does it hold (initiative sellers) or climb back in (responsive buyers)?',OFC.loss]];
  const id=++OFN;let s=`<svg viewBox="0 0 420 215" role="img" aria-label="Three ways the day can open against yesterday's value">${ofDefs(id)}`;
  sc.forEach((c,k)=>{const ox=8+k*138,d=k*.5,cx=ox+65;
    s+=`<g class="of-in" style="animation-delay:${d}s"><rect x="${ox}" y="6" width="130" height="203" rx="8" fill="#080b10" stroke="${OFC.line}"/><rect x="${ox+12}" y="58" width="106" height="52" fill="${OFC.ice}" fill-opacity=".13" stroke="${OFC.ice}" stroke-opacity=".5" stroke-dasharray="3 3"/></g>`+ofT(cx,72,'yesterday\'s value',{a:'middle',col:OFC.ice,cls:'of-in',d:d,s:8.5});
    if(k===0){s+=`<circle cx="${cx-22}" cy="94" r="4.5" fill="${c[2]}" class="of-pulse"/>`+ofArrow(cx-14,94,cx+16,94,OFC.gold,d+.8,{w:2.4})+ofT(cx+20,97,'POC',{col:OFC.gold,cls:'of-in',d:d+1.2,s:8.5})}
    if(k===1){s+=`<circle cx="${cx}" cy="34" r="4.5" fill="${c[2]}" class="of-pulse"/>`+ofArrow(cx-14,32,cx-14,14,c[2],d+.8,{w:2.4})+ofArrow(cx+14,34,cx+14,56,OFC.gold,d+1.3,{w:2.4,dash:true})}
    if(k===2){s+=`<circle cx="${cx}" cy="134" r="4.5" fill="${c[2]}" class="of-pulse"/>`+ofArrow(cx-14,136,cx-14,156,c[2],d+.8,{w:2.4})+ofArrow(cx+14,134,cx+14,114,OFC.gold,d+1.3,{w:2.4,dash:true})}
    s+=ofT(cx,172,c[0],{a:'middle',col:c[2],b:1,s:11,cls:'of-in',d:d+.5})+ofWrap(cx,185,c[1],27,{a:'middle',col:OFC.ink2,cls:'of-in',d:d+.7,s:8.5,lh:10})});
  return ofFig(s+'</svg>','The open against yesterday\'s value sets the first question of the day. Solid arrow: one possibility. Dashed arrow: the other. Which one happens tells you who is winning.')},
/* f07: the point of control migrates on a trend day */
migrate(){const cs=[{o:30,h:36,l:28,c:35},{o:35,h:40,l:33,c:38},{o:38,h:46,l:36,c:44},{o:44,h:48,l:41,c:46},{o:46,h:55,l:44,c:53},{o:53,h:58,l:50,c:56},{o:56,h:66,l:54,c:64},{o:64,h:69,l:61,c:67}];
  const poc=[[0,32],[1,36],[3,45],[5,54],[7,65]];
  return ofFig(ofChart(cs,{h:220,alt:'The point of control moving up through a trend day',extra:(Y,X)=>{let e='';poc.forEach(([i,p],k)=>{e+=`<g class="of-in" style="animation-delay:${1.4+k*.4}s"><rect x="${X(i)+10}" y="${Y(p)-4}" width="9" height="9" rx="2" fill="${OFC.sig}"/></g>`+(k?`<line x1="${X(poc[k-1][0])+14}" y1="${Y(poc[k-1][1])}" x2="${X(i)+14}" y2="${Y(p)}" stroke="${OFC.sig}" stroke-width="1.5" stroke-dasharray="3 3" class="of-in" style="animation-delay:${1.5+k*.4}s"/>`:'')});
    return e+ofT(366,Y(30)+14,'orange squares = the POC as the day develops',{a:'end',col:OFC.sig,b:1,cls:'of-in',d:3.2,s:9.5})}}),'On a trend day the point of control keeps moving in the direction of the trend: value is migrating. On a balance day it stays put. A POC that moves is a sign one side is in control.')},
/* f00: where the orders hide, in plain words */
liquidity(){const cs=[{o:30,h:36,l:28,c:35},{o:35,h:44,l:33,c:42},{o:42,h:50,l:40,c:46},{o:46,h:48,l:41,c:44},{o:44,h:50,l:42,c:49},{o:49,h:56,l:47,c:48,col:OFC.loss},{o:48,h:49,l:40,c:41,col:OFC.loss}];
  return ofFig(ofChart(cs,{h:190,lines:[{p:51,label:'equal highs',col:OFC.gold,a:'start',dy:12}],
    extra:(Y,X)=>{let e='';[2,4].forEach((i,k)=>{e+=`<g class="of-in" style="animation-delay:${1+k*.2}s"><rect x="${X(i)-5}" y="${Y(53)-5}" width="10" height="10" rx="2" fill="${OFC.loss}"/></g>`});return e+ofT(X(3),Y(55)-6,'stop orders rest here',{a:'middle',col:OFC.loss,b:1,cls:'of-in',d:1.4})+ofT(X(5),Y(58)-4,'1',{a:'middle',col:OFC.win,b:1,s:12,cls:'of-in',d:2})+ofT(X(6),Y(38),'2',{a:'middle',col:OFC.loss,b:1,s:12,cls:'of-in',d:2.6})},alt:'Price runs up through equal highs, takes the stop orders resting above them, then turns back'})+`<ol class="ofv-steps"><li><b style="color:${OFC.win}">1</b> Price runs up through the highs and takes the stop orders waiting above them. This is a <b>sweep</b>.</li><li><b style="color:${OFC.loss}">2</b> With those orders used up, price turns back.</li></ol>`,'Traders place stop orders just above highs and just below lows. That crowd of orders is called liquidity. Price is often drawn to it.')},
/* f00: a rejection, in plain words */
rejection(){const cs=[{o:52,h:55,l:50,c:54},{o:54,h:56,l:51,c:52},{o:52,h:53,l:48,c:49},{o:49,h:50,l:43,c:44.5,col:OFC.loss},{o:44.5,h:58,l:42,c:56}];
  return ofFig(ofChart(cs,{h:190,boxes:[{i0:0,i1:4,lo:41,hi:46,col:OFC.ice,label:'a level where buyers might step in'}],notes:[{i:4,p:41,t:'1',col:OFC.sig,b:1,d:1.6,dy:-2},{i:4,p:59.5,t:'2',col:OFC.win,d:2.2}],alt:'A candle pokes into a level and closes back out'})+`<ol class="ofv-steps"><li><b style="color:${OFC.sig}">1</b> Price pokes into the level. The long wick is price being pushed back.</li><li><b style="color:${OFC.win}">2</b> It closes back out. The level <b>rejected</b> price.</li></ol>`,'A rejection: price visits a level, cannot stay, and closes back where it came from.')},
/* strategy intros: the three trades as small animated pictures */
newsFade(){const cs=[{o:100,h:103,l:98,c:101},{o:101,h:104,l:99,c:100},{o:100,h:102,l:98,c:99.5},{o:99.5,h:128,l:99,c:124},{o:124,h:126,l:112,c:114,col:OFC.loss},{o:114,h:116,l:104,c:106,col:OFC.loss},{o:106,h:108,l:98,c:99,col:OFC.loss}];
  return ofFig(ofChart(cs,{h:215,lines:[{p:124,label:'stop: one candle range above the entry',col:OFC.loss,a:'start',dy:-5},{p:100,label:'target: 2 × the stop',col:OFC.win,a:'start',dy:12}],
    notes:[{i:3,p:131,t:'NEWS CANDLE (8:30)',col:OFC.sig,d:.9},{i:4,p:119,t:'SELL at the next open',col:OFC.loss,d:1.6,dx:34}],arrows:[{i1:4,p1:122,i2:6,p2:101,col:OFC.loss,d:2.2}],alt:'A news spike up, then a fade with a stop above and a target below'}),'The news fade: the 8:30 candle is a spike (about six times a normal candle), so INVERTIX looks to trade the other way at the next open. The stop is one candle range from the entry and the target is twice the stop.')},
lumenFlow(){const cs=[{o:50,h:54,l:47,c:52},{o:52,h:53,l:44,c:45,col:OFC.loss},{o:45,h:46,l:41,c:44},{o:44,h:48,l:42,c:47},{o:47,h:54,l:46,c:53},{o:53,h:63,l:52,c:61},{o:61,h:70,l:60,c:68},{o:68,h:80,l:67,c:78}];
  return ofFig(ofChart(cs,{h:215,boxes:[{i0:1,i1:3,lo:40,hi:47,col:OFC.sig,label:'zone: ARMED after the tap'}],lines:[{p:54,label:'last 8 candles\' high',col:OFC.gold,a:'start',dy:-5}],
    notes:[{i:2,p:38,t:'1 TAP',col:OFC.sig,d:1},{i:5,p:66,t:'2 BREAK',col:OFC.win,d:1.8},{i:6,p:48,t:'3 opens agree → ENTER',col:OFC.ice,d:2.6,a:'start',dx:-30}],alt:'A zone is tapped, price breaks away from it, and the opens agree'}),'LUMEN in three steps: a zone gets tapped, price breaks away from it, and the bigger picture (at least 3 of the 4 key opens) agrees. Only then is there an entry.')},
echoOrbit(){const cs=[{o:60,h:63,l:58,c:62},{o:62,h:66,l:61,c:65},{o:65,h:76,l:64,c:66,col:OFC.loss},{o:66,h:67,l:60,c:61,col:OFC.loss},{o:61,h:64,l:58,c:59,col:OFC.loss},{o:59,h:61,l:52,c:53,col:OFC.loss}];
  return ofFig(ofChart(cs,{h:215,lines:[{p:71,label:'limit at the wick\'s midpoint',col:OFC.ice,a:'start',dy:-5},{p:77,label:'stop just beyond the poke',col:OFC.loss,a:'start',dy:-5},{p:52,label:'target: the next draw',col:OFC.win,a:'start',dy:12}],
    notes:[{i:2,p:79.5,t:'rejection wick',col:OFC.sig,d:1}],alt:'A rejection wick above a high, a limit at its midpoint, a stop just beyond and a target below'}),'Echo in one picture: price pokes past an obvious high, fails to stay there and leaves a wick. The limit sits at the middle of the wick, the stop just beyond it. Orbit gives you a limit the same way, from a different pattern.')},
/* a reading scene as a lesson figure */
scene(id,cap){const sc=OFS[id];return ofFig(ofScene(id,mulberry(id.length*977+id.charCodeAt(0)*31)),`<b style="color:${OFCOL[sc.col]}">${sc.col.toUpperCase()}.</b> ${cap||sc.say}`)},
/* f03: a footprint chart the way a platform draws it */
fpDemo(){return ofFig(ofScene('a_fed',mulberry(4242),{alt:'A footprint chart with three candles, a delta bar and a cumulative delta line under it'}),'A footprint chart as a platform draws it: each candle is a column of prices with sellers × buyers at each one. Bright green cells are buy imbalances, bright red cells are sell imbalances, the gold outline is the busiest price in the candle, and the profile sits on the right. Under the candles: the delta of each candle and the running cumulative delta (CVD).')},
/* f10: the strategies side by side */
strategies(){const rows=[['INVERTIX · news','The 8:30 news candle is a spike, and the fade is on','Is the rush out of fuel, or still being fed?'],['LUMEN','A zone is tapped, price breaks away, and the opens agree','Absorption at the tap? Does the break candle\'s delta agree? Is the move being fed?'],['ECHO x ORBIT','A rejection wick (Echo) or a tap and inversion (Orbit), then a limit order','Is the rejection real? Does price come back to your limit slowly or in a rush?']];
  return ofFig(`<div class="ofs">${rows.map((r,i)=>`<div class="ofs-c" style="--d:${i*.25}s"><b>${r[0]}</b><div class="ofs-t"><span>TRIGGER (the strategy)</span>${r[1]}</div><div class="ofs-f"><span>SECOND OPINION (flow)</span>${r[2]}</div></div>`).join('')}</div>`,'Same pattern in all three: the strategy gives the trigger, flow gives a second opinion. Flow can add confidence or tell you to skip. It never replaces the strategy\'s rules.')}
};

/* motion starts when a picture scrolls into view, and the Replay button restarts it */
(()=>{if(typeof document==='undefined')return;
  const io='IntersectionObserver' in window?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('on')}),{threshold:.3}):null;
  const watch=()=>document.querySelectorAll('.ofv:not([data-w])').forEach(f=>{f.dataset.w=1;io?io.observe(f):f.classList.add('on')});
  new MutationObserver(watch).observe(document.documentElement,{childList:true,subtree:true});watch();
  document.addEventListener('click',e=>{const b=e.target.closest('.of-replay');if(!b)return;const f=b.closest('.ofv'),c=f.querySelector('.ofv-body'),h=c.innerHTML;c.innerHTML='';f.classList.add('on');requestAnimationFrame(()=>{c.innerHTML=h})})})();

/* ============================================================
   INTERACTIVE EXPLORERS: charts you can play, scrub, switch layers on and off, and hover.
   Dark panels styled after TradingView (candles, crosshair, price axis), DeepCharts / ATAS (footprint cells, imbalances, delta table)
   and Bookmap (resting-order heatmap with trade bubbles). Teaching data only: every number is made up, nothing here is a signal.
============================================================ */
const EXC={bg:'#131722',grid:'#1e222d',axis:'#868993',txt:'#d1d4dc',dim:'#5d606b',up:'#26a69a',dn:'#ef5350',blue:'#5b9cf6',gold:'#f2c14e',sig:'#ff6a00',line:'#2a2e39'};
const exRng=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const exN=(n,d=0)=>Number(n).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const exQ=p=>Math.round(p*4)/4;
const exMono='font-family="JetBrains Mono, ui-monospace, monospace"';
const exT=(x,y,t,o={})=>`<text x="${x}" y="${y}" fill="${o.c||EXC.axis}" font-size="${o.s||11}" ${exMono} text-anchor="${o.a||'start'}"${o.w?` font-weight="${o.w}"`:''}${o.cls?` class="${o.cls}"`:''}>${t}</text>`;
const exTime=i=>{const m=9*60+30+i;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')};
/* the whole figure: toolbar (layers, play, scrub), a TradingView-style legend line, the chart, one plain sentence about what you are looking at, a caption */
const exFig=(kind,layers,n,cap,attrs='')=>`<figure class="ofv ex" data-ex="${kind}" data-n="${n}" ${attrs}><div class="ex-tb"><div class="ex-tg" role="group" aria-label="Layers">${layers.map(l=>`<button type="button" class="${l[2]===0?'':'on'}" data-ly="${l[0]}" aria-pressed="${l[2]===0?'false':'true'}">${l[1]}</button>`).join('')}</div>
  <div class="ex-pl"><button type="button" class="ex-play" data-act="play">▶ Play</button><input type="range" class="ex-sc" min="1" max="${n}" value="${n}" aria-label="Move through time"><button type="button" class="ex-rs" data-act="reset" aria-label="Back to the start">↺</button></div></div>
  <div class="ex-leg" aria-live="polite"></div><div class="ex-svg"></div><div class="ex-take"></div><figcaption>${cap}</figcaption></figure>`;

/* ---------- 1. volume + profile on a candle chart ---------- */
function exVolData(){const r=exRng(7),cs=[];let p=21440;
  for(let i=0;i<48;i++){let dr,vb;
    if(i<6){dr=1.4;vb=760}else if(i<22){dr=Math.sin(i*.9)*.9;vb=330}else if(i<26){dr=2.6;vb=i===23?1550:860}else if(i<36){dr=.3;vb=i>=31&&i<=34?980:440}else{dr=-.7;vb=300-(i-36)*11}
    const o=p,c=o+dr+(r()-.5)*2.2,h=Math.max(o,c)+r()*1.8,l=Math.min(o,c)-r()*1.8;cs.push({o:exQ(o),h:exQ(h),l:exQ(l),c:exQ(c),v:Math.round(vb*(.82+r()*.36))});p=c}
  return cs}
/* contracts at each whole price up to candle `step` */
function exBins(cs,step){const m={};for(let i=0;i<step;i++){const c=cs[i],lo=Math.floor(c.l),hi=Math.ceil(c.h),mid=(c.o+c.c)/2,sd=Math.max(1.1,(c.h-c.l)/2.6),ws=[];let tw=0;
    for(let b=lo;b<=hi;b++){const w=Math.exp(-.5*((b-mid)/sd)**2);ws.push([b,w]);tw+=w}
    ws.forEach(([b,w])=>{m[b]=(m[b]||0)+c.v*w/tw})}return m}
function exVA(m){const ks=Object.keys(m).map(Number).sort((a,b)=>a-b);if(!ks.length)return null;let poc=ks[0];ks.forEach(k=>{if(m[k]>m[poc])poc=k});
  const tot=ks.reduce((a,k)=>a+m[k],0);let lo=poc,hi=poc,acc=m[poc];
  while(acc<.7*tot&&(m[lo-1]!=null||m[hi+1]!=null)){const dn=m[lo-1]||0,up=m[hi+1]||0;if(up>=dn){hi++;acc+=up}else{lo--;acc+=dn}}
  return{poc,lo,hi,ks}}
function exVolSay(i){return i<6?'The open: lots of volume and price jumps around. Everyone is arriving at once.':i<22?'Quiet balance: small volume, price drifts sideways. This is where the profile\'s biggest bar (the POC) forms.':i<26?'Breakout on heavy volume, about twice the average. Many traders agree with the move, so it is supported.':i<36?'Volume stays high but price barely rises. Buyers are being met by sellers: watch for the move to stall.':'Volume dries up as price slides. Nobody is eager to trade here.'}
function exVolDraw(fig,step,hover){
  const cs=fig._d,n=cs.length,W=800,H=450,L=16,R=744,dx=(R-L)/n,pt=26,pb=304,vt=322,vb=414,off=fig._off,
    lo=Math.min(...cs.map(c=>c.l))-2,hi=Math.max(...cs.map(c=>c.h))+2,Y=p=>pb-(p-lo)/(hi-lo)*(pb-pt),vm=Math.max(...cs.map(c=>c.v))*1.08,VY=v=>vb-v/vm*(vb-vt),X=i=>L+dx*(i+.5),
    bins=exBins(cs,step),va=exVA(bins),pmax=va?Math.max(...va.ks.map(k=>bins[k])):1;
  let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Candles with volume bars and a volume profile">`;
  s+=`<rect width="${W}" height="${H}" fill="${EXC.bg}"/>`;
  for(let p=Math.ceil(lo/10)*10;p<hi;p+=10)s+=`<line x1="${L}" x2="${R}" y1="${Y(p)}" y2="${Y(p)}" stroke="${EXC.grid}"/>`+exT(R+8,Y(p)+4,exN(p),{});
  for(let i=0;i<n;i+=8)s+=`<line x1="${X(i)}" x2="${X(i)}" y1="${pt}" y2="${vb}" stroke="${EXC.grid}"/>`+exT(X(i),H-10,exTime(i),{a:'middle',s:10});
  s+=`<line x1="${L}" x2="${R}" y1="${vt-8}" y2="${vt-8}" stroke="${EXC.line}"/>`;
  if(va){
    if(!off.val)s+=`<rect x="${L}" y="${Y(va.hi+.5)}" width="${R-L}" height="${Y(va.lo-.5)-Y(va.hi+.5)}" fill="${EXC.blue}" fill-opacity=".09"/><line x1="${L}" x2="${R}" y1="${Y(va.hi+.5)}" y2="${Y(va.hi+.5)}" stroke="${EXC.blue}" stroke-opacity=".5" stroke-dasharray="4 4"/><line x1="${L}" x2="${R}" y1="${Y(va.lo-.5)}" y2="${Y(va.lo-.5)}" stroke="${EXC.blue}" stroke-opacity=".5" stroke-dasharray="4 4"/>`+`<rect x="${L+2}" y="${Y(va.hi+.5)-17}" width="100" height="14" rx="3" fill="${EXC.bg}" fill-opacity=".85"/><rect x="${L+2}" y="${Y(va.lo-.5)+2}" width="96" height="14" rx="3" fill="${EXC.bg}" fill-opacity=".85"/>`+exT(L+6,Y(va.hi+.5)-6,'Value area high',{c:EXC.blue,s:10})+exT(L+6,Y(va.lo-.5)+13,'Value area low',{c:EXC.blue,s:10});
    if(!off.prof){va.ks.forEach(k=>{const w=bins[k]/pmax*150,poc=k===va.poc;s+=`<rect x="${R-w}" y="${Y(k+.5)+1}" width="${w}" height="${Math.max(2,Y(k-.5)-Y(k+.5)-2)}" fill="${poc?EXC.sig:EXC.blue}" fill-opacity="${poc?.85:.32}"/>`});
      s+=`<line x1="${L}" x2="${R}" y1="${Y(va.poc)}" y2="${Y(va.poc)}" stroke="${EXC.sig}" stroke-opacity=".7" stroke-dasharray="2 5"/>`+`<rect x="${R-262}" y="${Y(va.poc)-19}" width="110" height="15" rx="3" fill="${EXC.bg}" fill-opacity=".85"/>`+exT(R-154,Y(va.poc)-8,'POC: most volume',{c:EXC.sig,s:10,a:'end',w:600})}
    if(!off.nodes&&step>=34){const ks=va.ks,pk=[],vl=[];ks.forEach((k,j)=>{const v=bins[k];if(j>0&&j<ks.length-1&&v>bins[ks[j-1]]&&v>=bins[ks[j+1]]&&v>.55*pmax&&k!==va.poc)pk.push(k);if(j>1&&j<ks.length-2&&v<bins[ks[j-1]]&&v<=bins[ks[j+1]]&&v<.5*pmax)vl.push(k)});
      pk.slice(0,2).forEach(k=>{s+=`<rect x="${R-200}" y="${Y(k)-8}" width="40" height="16" rx="3" fill="${EXC.blue}" fill-opacity=".25"/>`+exT(R-180,Y(k)+4,'HVN',{c:EXC.txt,s:10,a:'middle',w:600})});
      vl.slice(0,2).forEach(k=>{s+=`<rect x="${R-200}" y="${Y(k)-8}" width="40" height="16" rx="3" fill="${EXC.gold}" fill-opacity=".22"/>`+exT(R-180,Y(k)+4,'LVN',{c:EXC.gold,s:10,a:'middle',w:600})})}}
  for(let i=0;i<step;i++){const c=cs[i],up=c.c>=c.o,col=up?EXC.up:EXC.dn,x=X(i),y1=Y(Math.max(c.o,c.c)),y2=Y(Math.min(c.o,c.c));
    s+=`<line x1="${x}" x2="${x}" y1="${Y(c.h)}" y2="${Y(c.l)}" stroke="${col}"/><rect x="${x-dx*.32}" y="${y1}" width="${dx*.64}" height="${Math.max(1.5,y2-y1)}" fill="${col}"/>`;
    if(!off.vol){const av=fig._avg[i],rv=av?c.v/av:0,hot=rv>=1.6,tag=rv>=2;s+=`<rect x="${x-dx*.32}" y="${VY(c.v)}" width="${dx*.64}" height="${vb-VY(c.v)}" fill="${col}" fill-opacity="${hot?.95:.5}"/>`;
      if(tag&&!off.rv)s+=exT(x,VY(c.v)-4,exN(rv,1)+'×',{c:EXC.gold,s:10,a:'middle',w:600})}}
  if(!off.vol&&!off.avg&&step>1){s+=`<polyline fill="none" stroke="${EXC.gold}" stroke-width="1.3" stroke-dasharray="3 3" points="${fig._avg.slice(0,step).map((a,i)=>a?`${X(i)},${VY(a)}`:'').filter(Boolean).join(' ')}"/>`+exT(L+4,vt+4,'Volume',{c:EXC.dim,s:10})+exT(L+58,vt+4,'- - average of the last 20 candles',{c:EXC.gold,s:10})}
  else if(!off.vol)s+=exT(L+4,vt+4,'Volume',{c:EXC.dim,s:10});
  const last=cs[step-1],lc=last.c>=last.o?EXC.up:EXC.dn;
  s+=`<line x1="${L}" x2="${R}" y1="${Y(last.c)}" y2="${Y(last.c)}" stroke="${lc}" stroke-opacity=".55" stroke-dasharray="1 3"/><rect x="${R+2}" y="${Y(last.c)-9}" width="52" height="18" rx="2" fill="${lc}"/>`+exT(R+28,Y(last.c)+4,exN(last.c,2),{c:'#fff',a:'middle',s:10,w:600});
  s+='<g class="ex-xh" pointer-events="none"></g><rect class="ex-hit" x="0" y="0" width="'+W+'" height="'+H+'" fill="transparent"/></svg>';
  fig.querySelector('.ex-svg').innerHTML=s;
  exVolLeg(fig,hover!=null&&hover<step?hover:step-1);
  fig.querySelector('.ex-take').textContent=exVolSay(step-1)}
function exVolLeg(fig,i){const c=fig._d[i],av=fig._avg[i],rv=av?c.v/av:0,up=c.c>=c.o,k=up?EXC.up:EXC.dn;
  fig.querySelector('.ex-leg').innerHTML=`<b>NQ</b> · 1m · ${exTime(i)} &nbsp;<span style="color:${k}">O <i>${exN(c.o,2)}</i> H <i>${exN(c.h,2)}</i> L <i>${exN(c.l,2)}</i> C <i>${exN(c.c,2)}</i></span> &nbsp;Vol <i>${exN(c.v)}</i>${av?` &nbsp;<span style="color:${rv>=1.6?EXC.gold:'inherit'}">${exN(rv,1)}× the recent average</span>`:''}`}

/* ---------- 2. footprint: cells, imbalances, delta table, CVD, profile ---------- */
function exFpData(){const r=exRng(11),R=9,spec=[
  {a:3,b:7,bias:.15,s:70},{a:1,b:6,bias:.55,s:95},{a:0,b:4,bias:.25,s:150,hot:0},{a:1,b:5,bias:-.5,s:105},{a:3,b:8,bias:-.55,s:120},{a:4,b:8,bias:.1,s:60}];
  const cs=spec.map(sp=>{const rows=[];for(let i=0;i<R;i++){if(i<sp.a||i>sp.b){rows.push([0,0]);continue}
      const mid=(sp.a+sp.b)/2,bell=1-Math.abs(i-mid)/((sp.b-sp.a)/2+1)*.6,v=Math.max(6,Math.round(sp.s*bell*(.7+r()*.6)*(sp.hot===i?2.2:1))),sh=Math.min(.9,Math.max(.1,.5+.55*sp.bias+(r()-.5)*.1)),ask=Math.round(v*sh);rows.push([v-ask,ask])}
    return{up:sp.bias>0,rows}});
  return cs}
function exFpStats(cs){const R=cs[0].rows.length;let cvd=0;return cs.map(c=>{const bid=c.rows.reduce((a,x)=>a+x[0],0),ask=c.rows.reduce((a,x)=>a+x[1],0),tot=c.rows.map(x=>x[0]+x[1]);cvd+=ask-bid;
  const buy=c.rows.map((x,i)=>i<R-1&&c.rows[i+1][0]>0&&x[1]>=3*c.rows[i+1][0]&&x[1]>=12),sell=c.rows.map((x,i)=>i>0&&c.rows[i-1][1]>0&&x[0]>=3*c.rows[i-1][1]&&x[0]>=12);
  return{bid,ask,vol:bid+ask,delta:ask-bid,cvd,poc:tot.indexOf(Math.max(...tot)),buy,sell}})}
const exFpSay=(i,basic)=>(basic?['Candle 1: each cell shows sellers on the left and buyers on the right, at that price.','Candle 2: buyers outnumber sellers at most prices, so the candle moves up.','Candle 3: a lot of business at the top. The outlined cell is the busiest price in the candle.','Candle 4: now sellers outnumber buyers at most prices, and price moves down.','Candle 5: the sellers stay in control.','Candle 6: a small candle with little business.']:['Candle 1: a gentle push. Both sides trade, nothing stands out yet.','Candle 2: buyers are aggressive. Green cells stacked on top of each other are a stacked buy imbalance.','Candle 3: huge volume at the high, but price barely moves higher. Something is holding it back. The Absorption lesson explains what.','Candle 4: now sellers take over. Red imbalances appear and delta turns negative.','Candle 5: the selling continues and the cumulative delta line keeps falling. The move is driven by real selling.','Candle 6: a small bounce on little volume. Buyers are not convinced.'])[i];
function exFpDraw(fig,step,hover){
  const cs=fig._d,st=fig._st,n=cs.length,R=9,W=800,off=fig._off,Lx=74,profW=off.prof?0:140,cw=(W-Lx-profW-70)/n,rh=29,top=34,gy=top+R*rh,base=21470,H=gy+(off.delta?10:62)+(off.cvd?0:90)+16;
  let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="A footprint chart with six candles">`+`<rect width="${W}" height="${H}" fill="${EXC.bg}"/>`;
  for(let i=0;i<R;i++)s+=`<line x1="${Lx}" x2="${Lx+n*cw}" y1="${top+i*rh}" y2="${top+i*rh}" stroke="${EXC.grid}"/>`+exT(Lx-8,top+i*rh+rh*.65,exN(base-i),{a:'end',s:11});
  const mx=Math.max(...cs.flatMap(c=>c.rows.map(x=>x[0]+x[1])));
  for(let k=0;k<step;k++){const c=cs[k],x0=Lx+k*cw,q=st[k],nz=c.rows.map((x,i)=>x[0]+x[1]?i:-1).filter(i=>i>=0),r0=nz[0],r1=nz[nz.length-1];
    s+=`<line x1="${x0+cw*.5}" x2="${x0+cw*.5}" y1="${top-8}" y2="${top-2}" stroke="${c.up?EXC.up:EXC.dn}"/><rect x="${x0+3}" y="${top+r0*rh+1}" width="3" height="${(r1-r0+1)*rh-2}" fill="${c.up?EXC.up:EXC.dn}"/>`;
    c.rows.forEach((x,i)=>{const v=x[0]+x[1];if(!v)return;const y=top+i*rh,bi=q.buy[i]&&!off.imb,si=q.sell[i]&&!off.imb;
      s+=`<g data-k="${k}" data-r="${i}"><rect x="${x0+9}" y="${y+1.5}" width="${cw-14}" height="${rh-3}" rx="2" fill="${bi?EXC.up:si?EXC.dn:EXC.blue}" fill-opacity="${bi||si?.42:.06+.34*v/mx}"${!off.poc&&i===q.poc?` stroke="${EXC.gold}" stroke-width="1.6"`:''}/>`+
        exT(x0+cw/2+2,y+rh*.66,`<tspan fill="${si?'#ff8a85':EXC.txt}"${si?' font-weight="700"':''}>${x[0]}</tspan><tspan fill="${EXC.dim}"> × </tspan><tspan fill="${bi?'#6ee0cf':EXC.txt}"${bi?' font-weight="700"':''}>${x[1]}</tspan>`,{a:'middle',s:11.5})+`</g>`})}
  if(!off.delta){const ty=gy+14;s+=exT(Lx-8,ty+14,'Volume',{a:'end',s:10,c:EXC.dim})+exT(Lx-8,ty+36,'Delta',{a:'end',s:10,c:EXC.dim})+`<line x1="${Lx}" x2="${Lx+n*cw}" y1="${ty}" y2="${ty}" stroke="${EXC.line}"/>`;
    for(let k=0;k<step;k++){const q=st[k],x=Lx+k*cw+cw/2;s+=exT(x,ty+14,exN(q.vol),{a:'middle',s:11.5,c:EXC.txt})+`<rect x="${x-cw*.36}" y="${ty+23}" width="${cw*.72}" height="18" rx="2" fill="${q.delta>=0?EXC.up:EXC.dn}" fill-opacity=".85"/>`+exT(x,ty+36,(q.delta>0?'+':'')+q.delta,{a:'middle',s:11.5,c:'#fff',w:600})}}
  if(!off.cvd){const cy0=gy+(off.delta?20:78),ch=64,cv=st.map(q=>q.cvd),mxa=Math.max(1,...cv.map(Math.abs)),CY=v=>cy0+ch/2-v/mxa*(ch/2-6);
    s+=exT(Lx-8,cy0+ch/2+4,'CVD',{a:'end',s:10,c:EXC.dim})+`<line x1="${Lx}" x2="${Lx+n*cw}" y1="${CY(0)}" y2="${CY(0)}" stroke="${EXC.line}" stroke-dasharray="3 3"/>`;
    if(step>1)s+=`<polyline fill="none" stroke="${EXC.gold}" stroke-width="2" points="${cv.slice(0,step).map((v,k)=>`${Lx+k*cw+cw/2},${CY(v)}`).join(' ')}"/>`;
    cv.slice(0,step).forEach((v,k)=>{s+=`<circle cx="${Lx+k*cw+cw/2}" cy="${CY(v)}" r="3.5" fill="${EXC.gold}"/>`})}
  if(!off.prof){const tot=Array(R).fill(0);for(let k=0;k<step;k++)cs[k].rows.forEach((x,i)=>{tot[i]+=x[0]+x[1]});const pm=Math.max(1,...tot),pi=tot.indexOf(pm),px=Lx+n*cw+12;
    s+=exT(px,top-12,'Profile (all candles)',{s:10,c:EXC.dim});tot.forEach((v,i)=>{s+=`<rect x="${px}" y="${top+i*rh+4}" width="${Math.max(1,v/pm*(profW-14))}" height="${rh-8}" fill="${i===pi?EXC.sig:EXC.blue}" fill-opacity="${i===pi?.9:.4}"/>`})}
  s+=`<rect class="ex-hit" x="0" y="0" width="${W}" height="${H}" fill="transparent"/></svg>`;
  fig.querySelector('.ex-svg').innerHTML=s;fig._geo={Lx,cw,top,rh,n,R};
  const k=Math.min(hover&&hover.k!=null&&hover.k<step?hover.k:step-1,step-1);exFpLeg(fig,hover&&hover.k<step?hover:{k,r:null});
  fig.querySelector('.ex-take').textContent=exFpSay(step-1,fig.dataset.mode==='basic')}
function exFpLeg(fig,h){const k=h.k,q=fig._st[k],c=fig._d[k];
  if(h.r!=null&&c.rows[h.r][0]+c.rows[h.r][1]){const x=c.rows[h.r],R=c.rows.length,below=h.r<R-1?c.rows[h.r+1][0]:0,above=h.r>0?c.rows[h.r-1][1]:0,im=fig.dataset.mode==='basic'?'':q.buy[h.r]?`Buy imbalance: buyers here (${x[1]}) are at least 3× the sellers one row below (${below}).`:q.sell[h.r]?`Sell imbalance: sellers here (${x[0]}) are at least 3× the buyers one row above (${above}).`:'No imbalance at this price.';
    fig.querySelector('.ex-leg').innerHTML=`<b>NQ</b> · candle ${k+1} · <i>${exN(21470-h.r)}</i> &nbsp;Sellers <i style="color:${EXC.dn}">${x[0]}</i> · Buyers <i style="color:${EXC.up}">${x[1]}</i> · Total <i>${x[0]+x[1]}</i> &nbsp;— ${im}`}
  else if(fig.dataset.mode==='basic')fig.querySelector('.ex-leg').innerHTML=`<b>NQ</b> · candle ${k+1} &nbsp;Volume <i>${exN(q.vol)}</i> &nbsp;<span style="color:${EXC.dim}">(hover a cell for its numbers)</span>`;
  else fig.querySelector('.ex-leg').innerHTML=`<b>NQ</b> · candle ${k+1} &nbsp;Volume <i>${exN(q.vol)}</i> · Delta <i style="color:${q.delta>=0?EXC.up:EXC.dn}">${q.delta>0?'+':''}${q.delta}</i> · Cumulative delta <i style="color:${q.cvd>=0?EXC.up:EXC.dn}">${q.cvd>0?'+':''}${q.cvd}</i> &nbsp;<span style="color:${EXC.dim}">(hover a cell for its numbers)</span>`}

/* ---------- 3. liquidity heatmap with trade bubbles (Bookmap style) ---------- */
function exHeatData(){const r=exRng(5),T=84,R=32,L=[],path=[],bub=[];
  const key=[[0,14],[14,17],[30,23],[40,25],[50,25],[56,22],[70,13],[84,9]];
  for(let t=0;t<T;t++){let j=0;while(j<key.length-2&&t>key[j+1][0])j++;const a=key[j],b=key[j+1],f=(t-a[0])/(b[0]-a[0]||1);path.push(a[1]+(b[1]-a[1])*Math.min(1,Math.max(0,f))+(r()-.5)*.9)}
  for(let t=0;t<T;t++)L.push(Array(R).fill(0));
  for(let rr=0;rr<R;rr++){let t=Math.floor(r()*14);while(t<T){const len=6+Math.floor(r()*26),s=.07+r()*.3;if(r()<.55)for(let u=t;u<Math.min(T,t+len);u++)L[u][rr]=Math.max(L[u][rr],s*(.85+r()*.3));t+=len+Math.floor(r()*14)}}
  for(let t=3;t<68;t++){const flick=t>=38&&t<50?(t%3===0?.8:.95):1;[[26,.97],[25,.55],[27,.5]].forEach(([rr,v])=>{L[t][rr]=Math.max(L[t][rr],v*flick*(.96+r()*.06))})}
  for(let t=0;t<60;t++)[[6,.9],[5,.5],[7,.48]].forEach(([rr,v])=>{L[t][rr]=Math.max(L[t][rr],v*(.96+r()*.06))});
  for(let t=0;t<T;t+=1){if(t%2===0||(t>34&&t<52)){const p=path[t],prev=path[Math.max(0,t-2)],sell=p>prev+.1||(t>34&&t<50&&r()<.7),big=t>34&&t<52?1:0;
    bub.push({t,row:p,size:big?.55+r()*.4:.15+r()*.3,sell:sell&&!(t>=50&&p<prev)})}}
  for(let t=50;t<84;t+=1)if(t%2===0)bub[bub.findIndex(b=>b.t===t)]&&(bub[bub.findIndex(b=>b.t===t)].sell=false);
  return{L,path,bub,T,R}}
const exHeatCol=v=>{const st=[[0,[11,18,32]],[.18,[18,58,143]],[.38,[31,168,201]],[.6,[107,211,106]],[.8,[242,213,68]],[1,[255,90,54]]];if(v<=.04)return null;let i=0;while(i<st.length-2&&v>st[i+1][0])i++;const a=st[i],b=st[i+1],f=Math.min(1,Math.max(0,(v-a[0])/(b[0]-a[0])));return`rgb(${[0,1,2].map(k=>Math.round(a[1][k]+(b[1][k]-a[1][k])*f)).join(',')})`};
const exHeatSay=t=>t<14?'Resting orders (the colours) wait above and below price. A hot band is a big order sitting in the book.':t<34?'Price drifts down toward a hot band below. Sellers are hitting the bid, and the bubbles are their trades.':t<52?'Price reaches the big buy order and stops. Large red bubbles trade into it, yet the band holds: that is absorption.':t<64?'The sellers are exhausted. Price turns up and buyers (green bubbles) take over.':'Look at the sell wall above: it vanishes before price arrives. Orders can be pulled at any moment, so a wall is not a promise.';
function exHeatDraw(fig,step,hover){
  const d=fig._d,{L,path,bub,T,R}=d,W=800,H=450,x0=64,x1=736,pt=22,pb=326,cw=(x1-x0)/T,rh=(pb-pt)/R,off=fig._off,Y=r=>pt+r*rh+rh/2,X=t=>x0+t*cw,vt=342,vb=420;
  let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="A liquidity heatmap with trade bubbles">`+`<rect width="${W}" height="${H}" fill="#0b1220"/><defs><clipPath id="exc${fig._id}"><rect x="${x0}" y="0" width="${Math.max(0,X(step)-x0)}" height="${H}"/></clipPath></defs>`;
  if(!off.heat){s+=`<g clip-path="url(#exc${fig._id})">`;for(let t=0;t<T;t++)for(let rr=0;rr<R;rr++){const c=exHeatCol(L[t][rr]);if(c)s+=`<rect x="${X(t)}" y="${pt+rr*rh}" width="${cw+.4}" height="${rh+.4}" fill="${c}"/>`}s+='</g>'}
  for(let rr=0;rr<R;rr+=4)s+=exT(x0-8,Y(rr)+4,exN(21470-rr),{a:'end',s:10});
  for(let t=0;t<T;t+=14)s+=exT(X(t),H-10,exTime(t),{a:'middle',s:10});
  if(!off.price&&step>1)s+=`<g clip-path="url(#exc${fig._id})"><polyline fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="round" points="${path.map((p,t)=>`${X(t+.5)},${Y(p)}`).join(' ')}"/></g>`;
  if(!off.bub){s+=`<g clip-path="url(#exc${fig._id})">`;bub.forEach(b=>{s+=`<circle cx="${X(b.t+.5)}" cy="${Y(b.row)}" r="${2.5+b.size*10}" fill="${b.sell?EXC.dn:EXC.up}" fill-opacity=".55" stroke="${b.sell?'#ff9a96':'#7ee6d9'}" stroke-opacity=".8" stroke-width=".8"/>`});s+='</g>'}
  if(!off.vol){s+=`<line x1="${x0}" x2="${x1}" y1="${vb}" y2="${vb}" stroke="${EXC.line}"/>`+exT(x0-8,vt+10,'Volume',{a:'end',s:10,c:EXC.dim});const vs=Array(T).fill(0).map(()=>[0,0]);bub.forEach(b=>{vs[b.t][b.sell?0:1]+=b.size});const vm=Math.max(...vs.map(v=>v[0]+v[1]));
    for(let t=0;t<Math.min(step,T);t++){const[a,b]=vs[t],h1=a/vm*(vb-vt),h2=b/vm*(vb-vt);s+=`<rect x="${X(t)+.5}" y="${vb-h1}" width="${cw-1}" height="${h1}" fill="${EXC.dn}" fill-opacity=".8"/><rect x="${X(t)+.5}" y="${vb-h1-h2}" width="${cw-1}" height="${h2}" fill="${EXC.up}" fill-opacity=".8"/>`}}
  s+=`<g transform="translate(${x1-188},${pt+6})"><rect width="184" height="22" rx="3" fill="#0b1220" fill-opacity=".8"/>`+[0.15,.35,.55,.75,.95].map((v,i)=>`<rect x="${8+i*14}" y="6" width="14" height="10" fill="${exHeatCol(v)}"/>`).join('')+exT(84,15,'small → big order',{s:9.5,c:EXC.axis})+`</g>`;
  s+=`<rect class="ex-hit" x="0" y="0" width="${W}" height="${H}" fill="transparent"/></svg>`;
  fig.querySelector('.ex-svg').innerHTML=s;fig._geo={x0,cw,pt,rh,T,R};
  exHeatLeg(fig,hover&&hover.t<step?hover:{t:step-1,r:null});fig.querySelector('.ex-take').textContent=exHeatSay(step-1)}
function exHeatLeg(fig,h){const d=fig._d,t=h.t;let tx=`<b>NQ</b> · ${exTime(t)}`;
  if(h.r!=null){const v=d.L[t][h.r];tx+=` · ${exN(21470-h.r)} &nbsp;Resting orders: <i style="color:${v>.04?EXC.gold:EXC.dim}">${v>.04?exN(Math.round(v*2400))+' contracts':'almost nothing'}</i>`}
  else tx+=` &nbsp;Price <i>${exN(21470-d.path[t],2)}</i> <span style="color:${EXC.dim}">(hover the map to read the resting orders)</span>`;
  fig.querySelector('.ex-leg').innerHTML=tx}

/* ---------- runtime: mount, toggles, play, scrub, hover ---------- */
const EXK={vol:{n:48,draw:exVolDraw,init(f){f._d=exVolData();f._avg=f._d.map((c,i)=>i<5?0:f._d.slice(Math.max(0,i-20),i).reduce((a,x)=>a+x.v,0)/Math.min(20,i))},leg:(f,i)=>exVolLeg(f,i),pick:(f,x,y,g)=>Math.floor((x-16)/((744-16)/48))},
  fp:{n:6,draw:exFpDraw,init(f){f._d=exFpData();f._st=exFpStats(f._d)}},
  heat:{n:84,draw:exHeatDraw,init(f){f._d=exHeatData()}}};
(()=>{if(typeof document==='undefined')return;let uid=0;
  const mount=f=>{f.dataset.m=1;const k=EXK[f.dataset.ex];f._k=k;f._id=++uid;f._off={};f._step=k.n;f._tm=null;k.init(f);f.querySelectorAll('.ex-tg button:not(.on)').forEach(b=>{f._off[b.dataset.ly]=1});(f.dataset.off||'').split(',').filter(Boolean).forEach(k=>{f._off[k]=1});f.classList.add('on');k.draw(f,f._step)};
  const stop=f=>{clearInterval(f._tm);f._tm=null;const b=f.querySelector('.ex-play');if(b)b.textContent='▶ Play'};
  const setStep=(f,n,h)=>{f._step=Math.max(1,Math.min(f._k.n,n));f.querySelector('.ex-sc').value=f._step;f._k.draw(f,f._step,h)};
  const play=f=>{if(f._tm)return stop(f);if(f._step>=f._k.n)setStep(f,1);f.querySelector('.ex-play').textContent='❚❚ Pause';const ms=f.dataset.ex==='fp'?1300:f.dataset.ex==='heat'?110:260;f._tm=setInterval(()=>{if(f._step>=f._k.n)return stop(f);setStep(f,f._step+1)},ms)};
  const scan=()=>document.querySelectorAll('.ex:not([data-m])').forEach(mount);
  new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});scan();
  document.addEventListener('click',e=>{const f=e.target.closest('.ex');if(!f)return;const ly=e.target.closest('[data-ly]'),ac=e.target.closest('[data-act]');
    if(ly){const o=ly.classList.toggle('on');ly.setAttribute('aria-pressed',o);if(o)delete f._off[ly.dataset.ly];else f._off[ly.dataset.ly]=1;f._k.draw(f,f._step)}
    else if(ac){if(ac.dataset.act==='play')play(f);else{stop(f);setStep(f,1)}}});
  document.addEventListener('input',e=>{const f=e.target.closest&&e.target.closest('.ex');if(f&&e.target.classList.contains('ex-sc')){stop(f);setStep(f,+e.target.value)}});
  const move=e=>{const h=e.target.closest&&e.target.closest('.ex-hit');if(!h)return;const f=h.closest('.ex'),sv=h.ownerSVGElement,r=sv.getBoundingClientRect(),vb=sv.viewBox.baseVal,x=(e.clientX-r.left)/r.width*vb.width,y=(e.clientY-r.top)/r.height*vb.height,kind=f.dataset.ex;
    if(kind==='vol'){const n=48,i=Math.floor((x-16)/((744-16)/n));if(i<0||i>=f._step)return;exVolLeg(f,i);const g=sv.querySelector('.ex-xh'),X=16+(744-16)/n*(i+.5);g.innerHTML=`<line x1="${X}" x2="${X}" y1="26" y2="414" stroke="#9598a1" stroke-dasharray="3 3"/><line x1="16" x2="744" y1="${Math.min(414,Math.max(26,y))}" y2="${Math.min(414,Math.max(26,y))}" stroke="#9598a1" stroke-dasharray="3 3" stroke-opacity=".6"/>`}
    else if(kind==='fp'){const g=f._geo,k=Math.floor((x-g.Lx)/g.cw),rr=Math.floor((y-g.top)/g.rh);if(k<0||k>=f._step||k>=g.n)return;exFpLeg(f,{k,r:rr>=0&&rr<g.R?rr:null})}
    else{const g=f._geo,t=Math.floor((x-g.x0)/g.cw),rr=Math.floor((y-g.pt)/g.rh);if(t<0||t>=Math.min(f._step,g.T))return;exHeatLeg(f,{t,r:rr>=0&&rr<g.R?rr:null})}};
  document.addEventListener('pointermove',move);
  document.addEventListener('pointerleave',()=>{},true)})();
/* the three explorers, as lesson figures */
OFV.volX=()=>exFig('vol',[['vol','Volume bars'],['avg','Average line'],['rv','Busy tags'],['prof','Profile'],['val','Value area'],['nodes','HVN / LVN']],48,'Press Play to watch the session unfold, or drag the slider. Switch layers on and off. Hover the chart to read any candle. Made-up data for learning.');
OFV.fpX=(mode)=>mode==='basic'?exFig('fp',[['poc','Biggest cell'],['prof','Profile']],6,'Each cell is sellers × buyers at one price. Press Play to build it candle by candle, and hover any cell. Made-up data for learning.','data-mode="basic" data-off="imb,delta,cvd"'):exFig('fp',[['imb','Imbalances'],['poc','Biggest cell'],['delta','Delta table'],['cvd','Cumulative delta'],['prof','Profile']],6,'Each cell is sellers × buyers at one price. Press Play to build it candle by candle, switch layers on and off, and hover any cell. Made-up data for learning.');
OFV.heatX=()=>exFig('heat',[['heat','Resting orders'],['price','Price line'],['bub','Trade bubbles'],['vol','Volume']],84,'Press Play and watch price meet a big resting order. Colours show how many orders are waiting at each price. Hover the map to read them. Made-up data for learning.');
