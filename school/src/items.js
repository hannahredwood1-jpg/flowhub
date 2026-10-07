/* ============================================================
   task items: one data shape, used by practice (instant feedback) and exams (graded at the end)
   kinds: mcq · tap · rect · level · num · sort · order · time
============================================================ */
const fin=(it,r=Math.random)=>{['q','why'].forEach(f=>{if(typeof it[f]==='string')it[f]=refx(it[f])});if(it.o)it.o=it.o.map(refx);if(it.steps)it.steps=it.steps.map(refx);if(it.items)it.items=it.items.map(x=>({...x,t:refx(x.t)}));if(it.o)it.order=shuf(it.o.map((_,i)=>i),r);if(it.kind==='order')it.perm=shuf(it.steps.map((_,i)=>i),r);
  if(it.kind==='order'&&it.perm.every((v,i)=>v===i))it.perm.reverse();return it};
const mcq=(topic,q,o,why,x={})=>({kind:'mcq',topic,q,o,why,...x});
const tlabel=(it,i)=>it.labels==='day'?dayLabel(i):hhmm((it.t0??510)+i*(it.step??5));
const chartsOf=it=>it.charts||(it.C?[it]:[]);
function loadChart(ch,it,k=0){const src=chartsOf(it)[k];ch.setData(src.C,{t0:src.t0??it.t0,stepMin:src.step??it.step,labels:src.labels??it.labels,sym:src.sym,tf:src.tf??it.tf,k:1});
  ch.ov=src.ov||(k===0?it.ov:null)||[];ch.marks=[];ch.taps=new Set()}

const K={};
K.mcq={chart:false,
  html(it,st,o={}){return `<div class="opts">${it.order.map(k=>{let c='opt';if(o.res){c+=k===0?' right':(st.a===k?' wrong':'')}else if(st.a===k)c+=' sel';return `<button type="button" class="${c}" data-k="${k}" ${o.res?'disabled':''}>${it.o[k]}</button>`}).join('')}</div>`},
  bind(root,it,st,chg){root.addEventListener('click',e=>{const b=e.target.closest('.opt');if(!b||b.disabled)return;st.a=+b.dataset.k;$$('.opt',root).forEach(x=>x.classList.toggle('sel',x===b));chg()})},
  has:(it,st)=>st.a!=null,
  grade:(it,st)=>({ok:st.a===0}),
  correct:it=>it.o[0],
  fb(it,st,g){return g.ok?'':`<p>The right answer: <b>${it.o[0]}</b></p>`}};
K.tap={chart:true,tool:'tap',
  html(it,st){const n=(st.a||[]).length;return `<div class="kv"><span class="chip" data-count>${n} selected</span>${it.many?'<span class="chip">select every one</span>':'<span class="chip">select one candle</span>'}<button type="button" class="btn sm" data-clr>Clear</button></div><p class="dim" style="font-size:13px">Use the select tool (target icon) and click a candle. Click again to unselect.</p>`},
  attach(ch,it,st,chg){ch.o.single=!it.many;ch.taps=new Set(st.a||[]);ch.ontaps=s=>{st.a=[...s].sort((x,y)=>x-y);const c=$('[data-count]');if(c)c.textContent=st.a.length+' selected';chg()}},
  bind(root,it,st,chg,ch){const b=$('[data-clr]',root);if(b)b.onclick=()=>{ch.taps.clear();ch.ontaps(ch.taps);ch.draw()}},
  has:(it,st)=>(st.a||[]).length>0,
  grade:(it,st)=>{const a=st.a||[],w=it.want;return{ok:setEq([...a].sort((x,y)=>x-y),[...w].sort((x,y)=>x-y)),extra:a.filter(i=>!w.includes(i)),missed:w.filter(i=>!a.includes(i))}},
  correct:it=>it.want.map(i=>tlabel(it,i)).join(', '),
  fb(it,st,g){if(g.ok)return '';return `<ul>${g.missed.map(i=>`<li>Missed the candle at ${tlabel(it,i)}.</li>`).join('')}${g.extra.map(i=>`<li>The candle at ${tlabel(it,i)} isn't one of them.</li>`).join('')}</ul>`},
  reveal(ch,it){ch.ov=[...(ch.ov||[]),...it.want.map(i=>({t:'tag',i,p:ch.C[i].h,text:'✓',pos:'above',col:'#3ee0a1'}))];ch.draw()}};
K.rect={chart:true,tool:'rect',
  html(it,st){const n=(st.a||[]).filter(m=>m.t==='rect').length;return `<div class="kv"><span class="chip" data-count>${n} marked</span>${it.truth.length>1?`<span class="chip">${it.truth.length} to find</span>`:'<span class="chip">1 to find</span>'}<button type="button" class="btn sm" data-clr>Clear</button></div>`},
  attach(ch,it,st,chg){st.a=st.a||[];ch.marks=st.a;ch.onmarks=()=>{const c=$('[data-count]');if(c)c.textContent=st.a.filter(m=>m.t==='rect').length+' marked';chg()}},
  bind(root,it,st,chg,ch){const b=$('[data-clr]',root);if(b)b.onclick=()=>{st.a.length=0;ch.marks=st.a;ch.onmarks();ch.draw()}},
  has:(it,st)=>(st.a||[]).some(m=>m.t==='rect'),
  grade:(it,st)=>{const g=gradeMarks(st.a||[],it.truth,it.minIoU||.5);return{ok:g.ok,...g}},
  correct:it=>it.truth.map(z=>`${fm(z.lo)}–${fm(z.hi)}`).join(' · '),
  fb(it,st,g){if(g.ok)return '';return `<ul>${g.missed.map(z=>`<li>Missed the zone from ${fm(z.lo)} to ${fm(z.hi)}.</li>`).join('')}${g.extra.map(()=>`<li>One of your boxes doesn't match the zone asked for. Check the candles it spans and the two price edges.</li>`).join('')}</ul>`},
  reveal(ch,it){ch.ov=[...(ch.ov||[]),...it.truth.map(z=>({t:'rect',i0:z.i0,i1:z.i1,lo:z.lo,hi:z.hi,col:'#3ee0a1',dash:true,text:z.label||'answer'}))];ch.draw()}};
K.level={chart:true,tool:'hline',
  html(it,st){const n=(st.a||[]).filter(m=>m.t==='hline').length;return `<div class="kv"><span class="chip" data-count>${n} line${n===1?'':'s'}</span><span class="chip">${it.truth.length} to place</span><button type="button" class="btn sm" data-clr>Clear</button></div><p class="dim" style="font-size:13px">Use the horizontal line tool and click at the price. Use the trash tool to remove a line.</p>`},
  attach(ch,it,st,chg){st.a=st.a||[];ch.marks=st.a;ch.onmarks=()=>{const c=$('[data-count]');if(c){const n=st.a.filter(m=>m.t==='hline').length;c.textContent=n+' line'+(n===1?'':'s')}chg()}},
  bind(root,it,st,chg,ch){const b=$('[data-clr]',root);if(b)b.onclick=()=>{st.a.length=0;ch.marks=st.a;ch.onmarks();ch.draw()}},
  has:(it,st)=>(st.a||[]).some(m=>m.t==='hline'),
  grade:(it,st)=>{const g=gradeLevels(st.a||[],it.truth);return{ok:g.ok,...g}},
  correct:it=>it.truth.map(z=>`${z.label?z.label+' ':''}${fm(z.p)}`).join(' · '),
  fb(it,st,g){if(g.ok)return '';return `<ul>${g.missed.map(z=>`<li>${z.label?z.label+': ':''}expected near ${fm(z.p)}.</li>`).join('')}${g.extra.map(m=>`<li>A line at ${fm(m.p)} isn't one of the levels asked for.</li>`).join('')}</ul>`},
  reveal(ch,it){ch.ov=[...(ch.ov||[]),...it.truth.map(z=>({t:'hl',p:z.p,col:'#3ee0a1',text:z.label||'answer',tagLeft:true}))];ch.draw()}};
K.num={chart:false,
  html(it,st,o={}){return `${it.table?`<table class="dw">${it.table}</table>`:''}<div class="row" style="align-items:center"><input class="in" id="numIn" type="number" step="any" inputmode="decimal" placeholder="${esc(it.ph||'Your answer')}" style="max-width:200px" value="${st.a??''}" ${o.res?'disabled':''}><span class="muted">${esc(it.unit||'')}</span></div>`},
  bind(root,it,st,chg){const i=$('#numIn',root);if(i)i.addEventListener('input',()=>{st.a=i.value;chg()})},
  has:(it,st)=>st.a!==undefined&&st.a!=='',
  grade:(it,st)=>{const v=parseFloat(st.a);return{ok:Number.isFinite(v)&&Math.abs(v-it.ans)<=(it.tol??.011)}},
  correct:it=>(it.fmt?it.fmt(it.ans):String(it.ans))+(it.unit?' '+it.unit:''),
  fb(it,st,g){return g.ok?'':`<p>The answer: <b>${K.num.correct(it)}</b></p>`}};
K.sort={chart:false,
  html(it,st,o={}){st.a=st.a||it.items.map(()=>null);return `<div class="sorts">${it.items.map((x,i)=>{let c='sortrow';if(o.res)c+=st.a[i]===x.b?' right':' wrong';return `<div class="${c}" data-i="${i}"><span>${x.t}</span><span class="bk">${it.buckets.map((b,k)=>`<button type="button" data-k="${k}" class="${st.a[i]===k?'on':''}" ${o.res?'disabled':''}>${b}</button>`).join('')}</span></div>`}).join('')}</div>`},
  bind(root,it,st,chg){root.addEventListener('click',e=>{const b=e.target.closest('.bk button');if(!b||b.disabled)return;const row=b.closest('.sortrow'),i=+row.dataset.i;st.a[i]=+b.dataset.k;$$('button',row).forEach(x=>x.classList.toggle('on',x===b));chg()})},
  has:(it,st)=>(st.a||[]).every(v=>v!=null),
  grade:(it,st)=>({ok:it.items.every((x,i)=>st.a[i]===x.b),wrong:it.items.map((x,i)=>st.a[i]===x.b?-1:i).filter(i=>i>=0)}),
  correct:it=>it.items.map(x=>`${x.t.replace(/<[^>]+>/g,'')} → ${it.buckets[x.b]}`).join('; '),
  fb(it,st,g){return g.ok?'':`<ul>${g.wrong.map(i=>`<li>${it.items[i].t}: belongs under <b>${it.buckets[it.items[i].b]}</b>.</li>`).join('')}</ul>`}};
K.order={chart:false,
  html(it,st,o={}){st.a=st.a||[...it.perm];return `<ol class="ordl">${st.a.map((v,p)=>{let c='';if(o.res)c=v===p?'right':'wrong';return `<li class="${c}" data-p="${p}"><i>${p+1}</i><span>${it.steps[v]}</span><span>${o.res?'':`<button type="button" data-d="-1" ${p===0?'disabled':''}>↑</button> <button type="button" data-d="1" ${p===st.a.length-1?'disabled':''}>↓</button>`}</span></li>`}).join('')}</ol>`},
  bind(root,it,st,chg,ch,redraw){root.addEventListener('click',e=>{const b=e.target.closest('button[data-d]');if(!b)return;const p=+b.closest('li').dataset.p,d=+b.dataset.d,q=p+d;if(q<0||q>=st.a.length)return;[st.a[p],st.a[q]]=[st.a[q],st.a[p]];redraw();chg()})},
  has:()=>true,
  grade:(it,st)=>({ok:st.a.every((v,p)=>v===p)}),
  correct:it=>it.steps.map((s,i)=>`${i+1}. ${s}`).join(' → '),
  fb(it,st,g){return g.ok?'':`<p>The order: <b>${K.order.correct(it)}</b></p>`}};
K.time={chart:false,
  html(it,st,o={}){const [a,b]=it.range,span=b-a,ticks=[];for(let m=Math.ceil(a/it.tick)*it.tick;m<=b;m+=it.tick)ticks.push(m);
    const sel=st.a;return `<div class="tlw"><div class="tl" id="tl" data-a="${a}" data-b="${b}">${ticks.map(m=>`<div class="tk" style="left:${(m-a)/span*100}%">${(m-a)/span<.92?`<span>${it.tfmt?it.tfmt(m):ampm(m)}</span>`:''}</div>`).join('')}
      ${o.res?`<div class="tru" style="left:${(it.truth.a-a)/span*100}%;width:${(it.truth.b-it.truth.a)/span*100}%"></div>`:''}
      ${sel?`<div class="sel" style="left:${(sel.a-a)/span*100}%;width:${(sel.b-sel.a)/span*100}%"></div>`:''}</div>
      <div class="tlr"><span data-tr>${sel?`${ampm(sel.a)} → ${ampm(sel.b)}`:'Drag across the bar to select a window'}</span>${o.res?`<span style="color:var(--win)">answer: ${ampm(it.truth.a)} → ${ampm(it.truth.b)}</span>`:''}</div></div>`},
  bind(root,it,st,chg){const tl=$('#tl',root);if(!tl)return;const [a,b]=it.range,span=b-a;let d=null;
    const m=e=>{const r=tl.getBoundingClientRect();return Math.round((a+Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*span)/ (it.snap||5))*(it.snap||5)};
    const paint=()=>{let s=$('.sel',tl);if(!s){s=document.createElement('div');s.className='sel';tl.append(s)}const lo=Math.min(d.a,d.b),hi=Math.max(d.a,d.b);s.style.left=(lo-a)/span*100+'%';s.style.width=(hi-lo)/span*100+'%';$('[data-tr]',root).textContent=`${ampm(lo)} → ${ampm(hi)}`};
    tl.addEventListener('pointerdown',e=>{tl.setPointerCapture(e.pointerId);d={a:m(e),b:m(e)};paint()});
    tl.addEventListener('pointermove',e=>{if(!d)return;d.b=m(e);paint()});
    tl.addEventListener('pointerup',e=>{if(!d)return;d.b=m(e);const lo=Math.min(d.a,d.b),hi=Math.max(d.a,d.b);d=null;if(hi-lo>=(it.snap||5)){st.a={a:lo,b:hi};chg()}else{st.a=null;$('.sel',tl)&&$('.sel',tl).remove();$('[data-tr]',root).textContent='Drag across the bar to select a window';chg()}})},
  has:(it,st)=>!!st.a,
  grade:(it,st)=>{const t=it.truth,s=st.a;return{ok:!!s&&Math.abs(s.a-t.a)<=(it.tol??10)&&Math.abs(s.b-t.b)<=(it.tol??10)}},
  correct:it=>`${ampm(it.truth.a)} to ${ampm(it.truth.b)}`,
  fb(it,st,g){return g.ok?'':`<p>The window: <b>${K.time.correct(it)}</b></p>`}};

/* ---- find it on screen: a mock TradingView layout, click the right part ---- */
const TV_REG={
 symbol:{x:44,y:6,w:84,h:26,t:'MNQ1!',n:'the symbol search'},tf:{x:134,y:6,w:44,h:26,t:'5m',n:'the timeframe menu'},type:{x:184,y:6,w:34,h:26,t:'▮▯',n:'the chart type'},
 ind:{x:224,y:6,w:96,h:26,t:'ƒx Indicators',n:'Indicators'},alert:{x:326,y:6,w:62,h:26,t:'Alert',n:'Alerts'},replay:{x:394,y:6,w:68,h:26,t:'Replay',n:'Bar Replay'},save:{x:552,y:6,w:84,h:26,t:'Save',n:'Save layout'},
 draw:{x:4,y:40,w:34,h:236,t:'',n:'the drawing tools (left toolbar)'},watch:{x:468,y:40,w:92,h:236,t:'Watchlist',n:'the watchlist'},scale:{x:566,y:40,w:70,h:236,t:'Price',n:'the price scale'},
 panel:{x:44,y:284,w:416,h:42,t:'Trading Panel',n:'the Trading Panel'},tz:{x:496,y:332,w:140,h:24,t:'12:30:00 (UTC-4)',n:'the clock (timezone)'}};
const tvMockSvg=(sel,want,res)=>{
  const g=Object.entries(TV_REG).map(([k,r])=>{let c='sp';if(res){if(k===want)c+=' right';else if(k===sel)c+=' wrong'}else if(k===sel)c+=' sel';
    const lab=r.t?`<text x="${r.x+r.w/2}" y="${r.y+r.h/2+4}" text-anchor="middle">${r.t}</text>`:'';
    const ic=k==='draw'?[0,1,2,3,4,5,6].map(i=>`<rect x="${r.x+9}" y="${r.y+12+i*30}" width="16" height="3" rx="1.5"/>`).join(''):'';
    return `<g class="${c}" data-spot="${k}"><rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="5"/>${lab}${ic}</g>`}).join('');
  const bars=Array.from({length:30},(_,i)=>{const x=56+i*13.4,h=14+((i*37)%46),y=130+Math.sin(i*.6)*50-h/2;return `<path d="M${x+4} ${y-8}V${y+h+8}" /><rect x="${x}" y="${y}" width="8" height="${h}"/>`}).join('');
  return `<svg class="tvmock" viewBox="0 0 640 360" role="img" aria-label="A TradingView screen">${g}<g class="ch">${bars}</g></svg>`};
K.spot={chart:false,
  html(it,st,o={}){return `<div class="spot">${tvMockSvg(st.a,it.want,o.res)}</div><p class="dim" style="font-size:13px">Click the part of the screen you would use.</p>`},
  bind(root,it,st,chg){root.addEventListener('click',e=>{const g=e.target.closest('[data-spot]');if(!g||root.querySelector('.sp.right,.sp.wrong'))return;st.a=g.dataset.spot;$$('[data-spot]',root).forEach(x=>x.classList.toggle('sel',x===g));chg()})},
  has:(it,st)=>!!st.a,
  grade:(it,st)=>({ok:st.a===it.want}),
  correct:it=>TV_REG[it.want].n,
  fb(it,st,g){return g.ok?'':`<p>You chose ${TV_REG[st.a]?TV_REG[st.a].n:'nothing'}. It is <b>${TV_REG[it.want].n}</b>.</p>`}};

/* ---- place the order: side, type, entry, stop and target, graded against the setup ---- */
K.ticket={chart:false,
  html(it,st,o={}){const a=st.a||(st.a={side:null,type:null,entry:'',stop:'',target:'',qty:''}),dis=o.res?'disabled':'';
    const seg=(k,opts)=>`<div class="seg">${opts.map(([v,t])=>`<button type="button" data-${k}="${v}" class="${a[k]===v?'on':''}" ${dis}>${t}</button>`).join('')}</div>`;
    const inp=(k,l,ph)=>`<label class="tkr"><span>${l}</span><input class="in" type="number" step="0.25" inputmode="decimal" data-f="${k}" placeholder="${ph}" value="${a[k]??''}" ${dis}></label>`;
    return `<div class="tk"><div class="tkq"><span class="hud">Last price</span> <b class="num">${fm(it.mkt)}</b> <span class="dim">· MNQ: $2 a point, 4 ticks a point</span></div>
      <div class="tkr"><span>Side</span>${seg('side',[['buy','Buy (long)'],['sell','Sell (short)']])}</div>
      <div class="tkr"><span>Order type</span>${seg('type',[['market','Market'],['limit','Limit'],['stop','Stop']])}</div>
      ${inp('entry','Entry price',a.type==='market'?'fills at the last price':'price')}${inp('stop','Stop loss','price')}${inp('target','Take profit','price')}${inp('qty','Contracts','number')}
      <div class="tkx" data-calc></div></div>`},
  bind(root,it,st,chg,ch){const a=st.a||(st.a={side:null,type:null,entry:'',stop:'',target:'',qty:''});
    const calc=()=>{const e=a.type==='market'?it.mkt:parseFloat(a.entry),s=parseFloat(a.stop),t=parseFloat(a.target),q=parseFloat(a.qty)||1,box=$('[data-calc]',root);if(!box)return;
      const parts=[];if(Number.isFinite(e)&&Number.isFinite(s)){const d=Math.abs(e-s);parts.push(`stop ${fm(d)} pts = ${Math.round(d*4)} ticks · risk ${usd(d*2*q)}`)}
      if(Number.isFinite(e)&&Number.isFinite(t)){const d=Math.abs(t-e);parts.push(`target ${fm(d)} pts = ${Math.round(d*4)} ticks · reward ${usd(d*2*q)}`)}box.textContent=parts.join('   |   ')};
    const prev=()=>{if(!ch)return;const ov=[...(it.ov||[])];const e=a.type==='market'?it.mkt:parseFloat(a.entry);
      if(Number.isFinite(e)&&a.type)ov.push({t:'hl',p:e,i0:Math.max(0,ch.C.length-1),col:'#8cc4ff',text:'entry',scale:true});
      const s=parseFloat(a.stop),t=parseFloat(a.target);if(Number.isFinite(s))ov.push({t:'hl',p:s,i0:Math.max(0,ch.C.length-1),col:'#ff5d73',text:'stop',scale:true});if(Number.isFinite(t))ov.push({t:'hl',p:t,i0:Math.max(0,ch.C.length-1),col:'#3ee0a1',text:'target',scale:true});
      ch.ov=ov;ch.draw()};
    root.addEventListener('click',e=>{const b=e.target.closest('button[data-side],button[data-type]');if(!b||b.disabled)return;if(b.dataset.side)a.side=b.dataset.side;if(b.dataset.type)a.type=b.dataset.type;
      $$('button[data-side]',root).forEach(x=>x.classList.toggle('on',x.dataset.side===a.side));$$('button[data-type]',root).forEach(x=>x.classList.toggle('on',x.dataset.type===a.type));
      const ei=$('[data-f=entry]',root);if(ei)ei.placeholder=a.type==='market'?'fills at the last price':'price';calc();prev();chg()});
    root.addEventListener('input',e=>{const f=e.target.dataset&&e.target.dataset.f;if(!f)return;a[f]=e.target.value;calc();prev();chg()});calc();prev()},
  has:(it,st)=>{const a=st.a;return !!(a&&a.side&&a.type&&a.stop!==''&&a.target!==''&&a.qty!==''&&(a.type==='market'||a.entry!==''))},
  check(it,st){const a=st.a||{},sp=it.spec,errs=[],near=(x,y,t=.26)=>Number.isFinite(x)&&Math.abs(x-y)<=t;
    if(a.side!==sp.side)errs.push(`The idea is a ${sp.side==='buy'?'long, so Buy':'short, so Sell'}.`);
    if(a.type!==sp.type)errs.push(`${sp.type==='market'?'The setup is live now: use a Market order':sp.type==='limit'?'You want to be filled at a better price than now: use a Limit order':'You want price to break through the level first: use a Stop order'}.`);
    if(sp.type!=='market'&&!near(parseFloat(a.entry),sp.entry))errs.push(`Entry should be ${fm(sp.entry)}.`);
    if(!near(parseFloat(a.stop),sp.stop))errs.push(`Stop should be ${fm(sp.stop)}${sp.why?` (${sp.why})`:''}.`);
    if(!near(parseFloat(a.target),sp.target))errs.push(`Target should be ${fm(sp.target)}.`);
    if(sp.qty&&parseFloat(a.qty||0)!==sp.qty)errs.push(`Size is ${sp.qty} contract${sp.qty>1?'s':''}.`);
    return errs},
  grade:(it,st)=>{const e=K.ticket.check(it,st);return{ok:e.length===0,errs:e}},
  correct:it=>{const s=it.spec;return `${s.side==='buy'?'Buy':'Sell'} ${s.type}${s.type==='market'?'':' at '+fm(s.entry)} · stop ${fm(s.stop)} · target ${fm(s.target)}${s.qty?' · '+s.qty+' contract'+(s.qty>1?'s':''):''}`},
  fb(it,st,g){return g.ok?'':`<ul>${(g.errs||[]).map(x=>`<li>${x}</li>`).join('')}</ul>`},
  reveal(ch,it){const s=it.spec,i0=Math.max(0,ch.C.length-1);ch.ov=[...(it.ov||[]),{t:'hl',p:s.type==='market'?it.mkt:s.entry,i0,col:'#3ee0a1',text:'entry'},{t:'hl',p:s.stop,i0,col:'#3ee0a1',text:'stop'},{t:'hl',p:s.target,i0,col:'#3ee0a1',text:'target',scale:true}];ch.draw()}};

const gradeItem=(it,st)=>{try{return K[it.kind].grade(it,st)}catch(e){return{ok:false}}};
const itemHasAnswer=(it,st)=>K[it.kind].has(it,st);
const TYPE_LABEL={mcq:'Concept',tap:'Chart task',rect:'Chart task',level:'Chart task',num:'Calculation',sort:'Classify',order:'Put in order',time:'Time window',spot:'Find it on screen',ticket:'Place the order'};

/* ---- shared question builders reused by several modules ---- */
const dataTable=cs=>`<tr><th>Candle</th><th>Open</th><th>High</th><th>Low</th><th>Close</th></tr>${cs.map((c,i)=>`<tr><td>${i+1}</td><td>${fm(c.o)}</td><td>${fm(c.h)}</td><td>${fm(c.l)}</td><td>${fm(c.c)}</td></tr>`).join('')}`;
