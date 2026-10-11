/* ============================================================
   TradingView-style chart (canvas): crosshair, OHLC legend, price axis, drawing tools,
   candle tapping, pan / zoom, session bands and markers
============================================================ */
const ICON={
 cursor:'<svg viewBox="0 0 24 24"><path d="M6 3l12 8-5.5 1.6L10 18z"/></svg>',
 tap:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg>',
 rect:'<svg viewBox="0 0 24 24"><rect x="4" y="7" width="16" height="10" rx="1"/><circle cx="4" cy="7" r="1.2"/><circle cx="20" cy="17" r="1.2"/></svg>',
 hline:'<svg viewBox="0 0 24 24"><path d="M3 12h18"/><circle cx="12" cy="12" r="2.2"/></svg>',
 erase:'<svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V4.5h6V7M7 7l1 13h8l1-13"/></svg>'};
const TOOLTIP={cursor:'Cursor (drag to pan)',tap:'Select a candle',rect:'Rectangle: mark a zone',hline:'Horizontal line: mark a price',erase:'Remove a drawing (click it)'};
const dayLabel=i=>['Mon','Tue','Wed','Thu','Fri'][i%5]+' '+(1+Math.floor(i/5)*7+i%5);
class Chart{
  constructor(host,o={}){
    this.host=host;this.o=o;host.classList.add('tvc');host.innerHTML='<canvas></canvas><div class="tv-leg"></div>';
    this.cv=$('canvas',host);this.cx=this.cv.getContext('2d');this.leg=$('.tv-leg',host);
    Object.assign(this,{C:[],base:[],k:1,ov:[],marks:[],taps:new Set(),tool:'cursor',from:0,count:40,hover:null,drag:null,neutral:true,
      onmarks:null,ontaps:null,sym:o.sym||'NQ1!',noLegend:!!o.noLegend,t0:510,stepMin:5,labelFn:null});
    this.ro=new ResizeObserver(()=>this.size());this.ro.observe(host);
    const c=this.cv;
    c.addEventListener('pointerdown',e=>this.pd(e));c.addEventListener('pointermove',e=>this.pm(e));
    this._up=e=>this.pu(e);window.addEventListener('pointerup',this._up);
    c.addEventListener('pointerleave',()=>{if(!this.drag){this.hover=null;this.draw()}});
    if(!o.fixed){c.addEventListener('wheel',e=>this.wh(e),{passive:false});c.addEventListener('dblclick',()=>this.fit())}
    this.size();
  }
  destroy(){this.ro.disconnect();window.removeEventListener('pointerup',this._up)}
  size(){const r=this.host.getBoundingClientRect(),d=window.devicePixelRatio||1;this.W=Math.max(200,r.width);this.H=Math.max(140,r.height);
    this.cv.width=this.W*d;this.cv.height=this.H*d;this.cv.style.width=this.W+'px';this.cv.style.height=this.H+'px';this.cx.setTransform(d,0,0,d,0,0);this.draw()}
  /* opts: k (time-frame factor), fit, t0 (minutes of the first candle), stepMin, labels ('day'|fn), sym */
  setData(C,{k=1,fit=true,t0,stepMin,labels,sym,tf}={}){this.tfName=tf||null;
    this.base=C;this.k=k;this.C=k===1?C:agg(C,k);
    if(t0!=null)this.t0=t0;if(stepMin!=null)this.stepMin=stepMin;
    this.labelFn=labels==='day'?dayLabel:(typeof labels==='function'?labels:null);if(sym)this.sym=sym;
    if(fit)this.fit();else this.draw()}
  fit(){const n=this.C.length;if(this.o.view){this.from=this.o.view[0];this.count=this.o.view[1]}else{this.count=Math.max(12,Math.min(n+3,this.o.maxCount||46));this.from=-1}this.draw()}
  focus(i){const j=i/this.k;this.from=j-this.count/2+1.5;this.draw()}
  label(i){return this.labelFn?this.labelFn(i):hhmm(this.t0+i*this.stepMin*this.k)}
  G(){const PR=68,PB=24,PT=10,pw=this.W-PR,ph=this.H-PB-PT,bw=pw/this.count,n=this.C.length;
    const i0=Math.max(0,Math.floor(this.from)),i1=Math.min(n-1,Math.ceil(this.from+this.count));let mn=1e9,mx=-1e9;
    for(let i=i0;i<=i1;i++){mn=Math.min(mn,this.C[i].l);mx=Math.max(mx,this.C[i].h)}
    for(const o of this.ov)if(o.scale&&o.p!=null){mn=Math.min(mn,o.p);mx=Math.max(mx,o.p)}
    if(mn>mx){mn=0;mx=1}const pad=(mx-mn)*.14||1;mn-=pad;mx+=pad;return{PR,PB,PT,pw,ph,bw,mn,mx}}
  X(i,g){return(i-this.from+.5)*g.bw}
  Y(p,g){return g.PT+(g.mx-p)/(g.mx-g.mn)*g.ph}
  idxAt(px,g){return Math.round(px/g.bw+this.from-.5)}
  priceAt(py,g){return g.mx-(py-g.PT)/g.ph*(g.mx-g.mn)}
  pos(e){const r=this.cv.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
  cur(){this.cv.style.cursor=this.o.fixed?'default':this.tool==='erase'?'not-allowed':this.tool==='tap'?'pointer':'crosshair'}
  pd(e){if(this.o.fixed||!this.C.length)return;const g=this.G(),{x,y}=this.pos(e);if(x>g.pw)return;const t=this.tool;
    if(t==='cursor'){this.drag={type:'pan',x:e.clientX,from:this.from};this.cv.style.cursor='grabbing'}
    else if(t==='tap'){if(this.k!==1)return toast('Switch to the 5m chart to select candles.');const i=this.idxAt(x,g);if(i<0||i>=this.C.length)return;
      if(this.taps.has(i))this.taps.delete(i);else{if(this.o.single)this.taps.clear();this.taps.add(i)}this.ontaps&&this.ontaps(this.taps);this.draw()}
    else if(t==='rect'){if(this.k!==1)return toast('Switch back to 5m to draw. Marks belong to the 5m candles.');const i=this.idxAt(x,g);this.drag={type:'rect',i,p:this.priceAt(y,g),ci:i,cp:this.priceAt(y,g)}}
    else if(t==='hline'){if(this.k!==1)return;this.marks.push({t:'hline',p:q4(this.priceAt(y,g))});this.changed()}
    else if(t==='erase'){const hit=this.hitMark(x,y,g);if(hit>=0){this.marks.splice(hit,1);this.changed()}}
  }
  hitMark(x,y,g){for(let k=this.marks.length-1;k>=0;k--){const m=this.marks[k];
    if(m.t==='hline'&&Math.abs(this.Y(m.p,g)-y)<7)return k;
    if(m.t==='rect'){const x0=this.X(m.i0,g)-g.bw/2,x1=this.X(m.i1,g)+g.bw/2,y0=this.Y(m.hi,g),y1=this.Y(m.lo,g);if(x>=x0&&x<=x1&&y>=y0&&y<=y1)return k}}return-1}
  pm(e){if(!this.C.length)return;const g=this.G(),{x,y}=this.pos(e);
    this.hover=x<=g.pw&&y<=g.PT+g.ph+1?{x,y,i:this.idxAt(x,g),p:this.priceAt(y,g)}:null;
    if(this.drag){if(this.drag.type==='pan'){this.from=this.drag.from-(e.clientX-this.drag.x)/g.bw;const n=this.C.length;this.from=Math.max(-this.count*.6,Math.min(n-this.count*.4,this.from))}
      else if(this.drag.type==='rect'){this.drag.ci=this.idxAt(x,g);this.drag.cp=this.priceAt(y,g)}}
    else this.cur();
    this.draw()}
  pu(){const d=this.drag;if(!d)return;this.drag=null;if(this.tool==='cursor')this.cur();
    if(d.type==='rect'){const i0=Math.min(d.i,d.ci),i1=Math.max(d.i,d.ci),lo=Math.min(d.p,d.cp),hi=Math.max(d.p,d.cp),g=this.G();
      if(i1-i0>=1&&(hi-lo)/(g.mx-g.mn)>.012){this.marks.push({t:'rect',i0:Math.max(0,i0),i1:Math.min(this.C.length-1,i1),lo:q4(lo),hi:q4(hi)});this.changed();return}}
    this.draw()}
  changed(){this.draw();this.onmarks&&this.onmarks(this.marks)}
  wh(e){e.preventDefault();const g=this.G(),{x}=this.pos(e),a=this.from+x/g.bw-.5,f=e.deltaY>0?1.12:.89;
    this.count=Math.max(8,Math.min(160,this.count*f));const g2=this.G();this.from=a-x/g2.bw+.5;this.draw()}
  draw(){
    const cx=this.cx,W=this.W,H=this.H,css=getComputedStyle(document.documentElement),col=n=>css.getPropertyValue(n).trim();
    cx.clearRect(0,0,W,H);cx.fillStyle=col('--chart');cx.fillRect(0,0,W,H);
    if(!this.C.length)return;
    const g=this.G(),{PR,PB,PT,pw,ph,bw,mn,mx}=g,X=i=>this.X(i,g),Y=p=>this.Y(p,g),k=this.k;
    const line=col('--line'),ink3=col('--ink3'),ink=col('--ink');
    const UP=this.neutral?'#e3e9f2':'#26a69a',DN=this.neutral?'#3d7bff':'#ef5350';
    cx.font='11px "JetBrains Mono",monospace';cx.textBaseline='middle';
    const raw=(mx-mn)/6,mag=Math.pow(10,Math.floor(Math.log10(raw))),st=[1,2,2.5,5,10].map(m=>m*mag).find(s=>s>=raw)||raw;
    cx.strokeStyle=line;cx.lineWidth=1;cx.fillStyle=ink3;cx.textAlign='left';
    const lastY=Y(this.C[this.C.length-1].c);
    for(let p=Math.ceil(mn/st)*st;p<=mx;p+=st){const y=Math.round(Y(p))+.5;cx.beginPath();cx.moveTo(0,y);cx.lineTo(pw,y);cx.stroke();if(Math.abs(y-lastY)>11)cx.fillText(fm(p),pw+8,y)}
    const every=Math.max(1,Math.ceil(78/bw));cx.textAlign='center';
    for(let i=Math.ceil(this.from);i<this.from+this.count;i++){if(i<0||i>=this.C.length||i%every)continue;const x=Math.round(X(i))+.5;
      cx.strokeStyle=line;cx.beginPath();cx.moveTo(x,PT);cx.lineTo(x,PT+ph);cx.stroke();cx.fillStyle=ink3;cx.fillText(this.label(i),x,H-PB/2+2)}
    cx.strokeStyle=col('--line2');cx.beginPath();cx.moveTo(pw+.5,0);cx.lineTo(pw+.5,PT+ph);cx.moveTo(0,PT+ph+.5);cx.lineTo(W,PT+ph+.5);cx.stroke();
    cx.save();cx.beginPath();cx.rect(0,0,pw,PT+ph);cx.clip();
    const ci=i=>Math.floor(i/k);
    for(const o of this.ov){
      if(o.t==='band'){const x0=X(ci(o.i0))-bw/2,x1=X(ci(o.i1))+bw/2;cx.fillStyle=rgba(o.col,o.a||.07);cx.fillRect(x0,PT,x1-x0,ph);
        if(o.text){cx.font='600 11px "Inter",sans-serif';cx.fillStyle=rgba(o.col,.95);cx.textAlign='left';cx.fillText(o.text,x0+6,PT+10);cx.font='11px "JetBrains Mono",monospace'}}
      if(o.t==='vline'){const x=Math.round(X(ci(o.i))-bw/2)+.5;cx.strokeStyle=o.col;cx.lineWidth=1.2;cx.setLineDash([5,4]);cx.beginPath();cx.moveTo(x,PT);cx.lineTo(x,PT+ph);cx.stroke();cx.setLineDash([]);
        if(o.text){cx.font='600 11px "Inter",sans-serif';cx.fillStyle=o.col;cx.textAlign='left';cx.fillText(o.text,x+5,PT+ph-9);cx.font='11px "JetBrains Mono",monospace'}}
      if(o.t==='rect'||o.t==='box'){
        const x0=X(ci(o.i0))-bw/2,x1=o.ext?pw:X(ci(o.i1))+bw/2,y0=Y(o.hi),y1=Y(o.lo);
        if(o.t==='rect'&&o.pine){if(o.pfill){cx.fillStyle='rgba(120,123,134,.12)';cx.fillRect(x0,y0,x1-x0,y1-y0)}cx.strokeStyle=o.pcol||'#e6e9f0';cx.lineWidth=1;cx.setLineDash([]);cx.strokeRect(x0+.5,y0+.5,x1-x0,y1-y0);if(o.mid){const ym=Math.round((y0+y1)/2)+.5;cx.setLineDash([5,4]);cx.beginPath();cx.moveTo(x0,ym);cx.lineTo(x1,ym);cx.stroke();cx.setLineDash([])}}
        else if(o.t==='rect'){cx.fillStyle=rgba(o.col,.17);cx.fillRect(x0,y0,x1-x0,y1-y0);cx.strokeStyle=rgba(o.col,.85);cx.lineWidth=1;cx.setLineDash(o.dash?[5,4]:[]);cx.strokeRect(x0+.5,y0+.5,x1-x0,y1-y0);cx.setLineDash([])}
        else{cx.strokeStyle=rgba(o.col,.8);cx.lineWidth=1.2;cx.setLineDash([3,3]);cx.strokeRect(x0+.5,y0+.5,x1-x0,y1-y0);cx.setLineDash([])}}}
    const cw=Math.max(1,Math.min(bw*.66,22));
    for(let i=Math.max(0,Math.floor(this.from)-1);i<=Math.min(this.C.length-1,Math.ceil(this.from+this.count));i++){
      const c=this.C[i],x=X(i),up=c.c>=c.o,colr=up?UP:DN;cx.strokeStyle=colr;cx.fillStyle=colr;cx.lineWidth=1;
      cx.beginPath();cx.moveTo(Math.round(x)+.5,Y(c.h));cx.lineTo(Math.round(x)+.5,Y(c.l));cx.stroke();
      const y0=Y(Math.max(c.o,c.c)),y1=Y(Math.min(c.o,c.c));cx.fillRect(x-cw/2,y0,cw,Math.max(1,y1-y0))}
    cx.textBaseline='middle';
    for(const o of this.ov){
      if(o.t==='hl'){const y=Math.round(Y(o.p))+.5,x0=o.i0==null?0:X(ci(o.i0))-bw/2,x1=o.i1==null?pw:X(ci(o.i1))+bw/2;cx.strokeStyle=o.pine?(o.pcol||'#e6e9f0'):o.col;cx.lineWidth=o.pine?(o.pw||1):1.2;cx.setLineDash(o.pine?(o.pdot?[2,3]:o.pdash?[6,4]:[]):o.dash===false?[]:[6,4]);cx.beginPath();cx.moveTo(x0,y);cx.lineTo(x1,y);cx.stroke();cx.setLineDash([]);
        if(o.text&&o.pine){cx.font='11px "Inter",sans-serif';cx.fillStyle=o.pcol||'#fff';cx.textAlign=o.pleft?'left':'right';cx.fillText(o.text,o.pleft?Math.max(8,x0+6):pw-8,y-8);cx.font='11px "JetBrains Mono",monospace'}
        else if(o.text)this.tag(cx,o.text,o.tagLeft?Math.max(8,x0+6):pw-8,y-11,o.col,o.tagLeft?'left':'right')}
      if(o.t==='tag'&&o.pine){const tx=X(ci(o.i)),ty=Y(o.p)+(o.pos==='above'?-13:13);cx.font=(o.tiny?'10px':'11px')+' "Inter",sans-serif';const w=cx.measureText(o.text).width+12;cx.fillStyle=o.bg;cx.beginPath();cx.roundRect(tx-w/2,ty-9,w,18,3);cx.fill();cx.fillStyle=o.tc||'#fff';cx.textAlign='center';cx.fillText(o.text,tx,ty+.5);cx.font='11px "JetBrains Mono",monospace'}
      else if(o.t==='tag')this.tag(cx,o.text,X(ci(o.i)),Y(o.p)+(o.pos==='above'?-12:12),o.col||ink,'center');
      if(o.t==='lab'){const ls=o.lines,x=X(ci(o.i)),y=Y(o.p);cx.font=(o.tiny?'10px':'11px')+' "Inter",sans-serif';const w=Math.max(...ls.map(t=>cx.measureText(t).width))+14,h=ls.length*15+6,x0=o.al==='left'?x-w-6:x+6;cx.fillStyle=o.bg;cx.beginPath();cx.roundRect(x0,y-h/2,w,h,3);cx.fill();cx.fillStyle=o.tc||'#fff';cx.textAlign='left';ls.forEach((t,k)=>cx.fillText(t,x0+7,y-h/2+3+7.5+k*15));cx.font='11px "JetBrains Mono",monospace'}
      if(o.t==='rect'&&o.text&&o.pine&&o.tab){const x1=X(ci(o.i1))+bw/2,ty=(Y(o.hi)+Y(o.lo))/2;cx.font='11px "Inter",sans-serif';const w=cx.measureText(o.text).width+12;cx.fillStyle=o.tab;cx.beginPath();cx.roundRect(x1+4,ty-9,w,18,3);cx.fill();cx.fillStyle='#fff';cx.textAlign='left';cx.fillText(o.text,x1+10,ty+.5);cx.font='11px "JetBrains Mono",monospace'}
      else if(o.t==='rect'&&o.text&&o.pine){const x1=X(ci(o.i1))+bw/2,up=o.up!==false,ty=up?Y(o.hi)-10:Y(o.lo)+10;cx.font='11px "Inter",sans-serif';const w=cx.measureText(o.text).width+12;cx.fillStyle='rgba(255,255,255,.16)';cx.beginPath();cx.roundRect(x1-w,ty-9,w,18,3);cx.fill();cx.fillStyle=o.col;cx.textAlign='left';cx.fillText(o.text,x1-w+6,ty+.5);cx.font='11px "JetBrains Mono",monospace'}
      else if(o.t==='rect'&&o.text)this.tag(cx,o.text,Math.max(70,X(ci(o.i0))+bw*1.5),Y(o.hi)-12,o.col,'left')}
    // tapped candles
    for(const i of this.taps){if(i<0||i>=this.C.length)continue;const c=this.C[i],x=X(i),y=Y(c.h)-10;cx.strokeStyle='#8cc4ff';cx.fillStyle='rgba(140,196,255,.18)';cx.lineWidth=1.5;cx.beginPath();cx.arc(x,y,6,0,7);cx.fill();cx.stroke();
      cx.strokeStyle='rgba(140,196,255,.8)';cx.setLineDash([2,3]);cx.beginPath();cx.moveTo(x,Y(c.h)-3);cx.lineTo(x,Y(c.l)+3);cx.stroke();cx.setLineDash([])}
    for(const m of this.marks){
      if(m.t==='rect'){const x0=X(m.i0)-bw/2,x1=X(m.i1)+bw/2,y0=Y(m.hi),y1=Y(m.lo);cx.fillStyle=rgba('#8cc4ff',.16);cx.fillRect(x0,y0,x1-x0,y1-y0);cx.strokeStyle='#8cc4ff';cx.lineWidth=1.2;cx.strokeRect(x0+.5,y0+.5,x1-x0,y1-y0)}
      else{const y=Math.round(Y(m.p))+.5;cx.strokeStyle='#8cc4ff';cx.lineWidth=1.4;cx.beginPath();cx.moveTo(0,y);cx.lineTo(pw,y);cx.stroke();this.tag(cx,fm(m.p),8,y-11,'#8cc4ff','left')}}
    if(this.drag&&this.drag.type==='rect'){const d=this.drag,x0=X(Math.min(d.i,d.ci))-bw/2,x1=X(Math.max(d.i,d.ci))+bw/2,y0=Y(Math.max(d.p,d.cp)),y1=Y(Math.min(d.p,d.cp));
      cx.fillStyle=rgba('#8cc4ff',.12);cx.fillRect(x0,y0,x1-x0,y1-y0);cx.strokeStyle='#8cc4ff';cx.setLineDash([4,3]);cx.strokeRect(x0+.5,y0+.5,x1-x0,y1-y0);cx.setLineDash([])}
    cx.restore();
    const lc=this.C[this.C.length-1],ly=Y(lc.c);
    if(ly>PT&&ly<PT+ph){cx.setLineDash([2,3]);cx.strokeStyle=lc.c>=lc.o?UP:DN;cx.beginPath();cx.moveTo(0,Math.round(ly)+.5);cx.lineTo(pw,Math.round(ly)+.5);cx.stroke();cx.setLineDash([]);
      cx.fillStyle=lc.c>=lc.o?UP:DN;cx.fillRect(pw,ly-9,PR,18);cx.fillStyle='#0a0d12';cx.textAlign='left';cx.fillText(fm(lc.c),pw+6,ly+.5)}
    const h=this.hover;
    if(h&&!this.o.fixed){cx.setLineDash([4,4]);cx.strokeStyle=ink3;cx.lineWidth=1;cx.beginPath();cx.moveTo(h.x+.5,PT);cx.lineTo(h.x+.5,PT+ph);cx.moveTo(0,h.y+.5);cx.lineTo(pw,h.y+.5);cx.stroke();cx.setLineDash([]);
      cx.fillStyle=col('--line2');cx.fillRect(pw,h.y-9,PR,18);cx.fillStyle=ink;cx.textAlign='left';cx.fillText(fm(h.p),pw+6,h.y+.5);
      if(h.i>=0&&h.i<this.C.length){const tx=X(h.i),lb=this.label(h.i),w=Math.max(44,lb.length*7+10);cx.fillStyle=col('--line2');cx.fillRect(tx-w/2,H-PB+3,w,17);cx.fillStyle=ink;cx.textAlign='center';cx.fillText(lb,tx,H-PB/2+2)}}
    this.legend(h&&h.i>=0&&h.i<this.C.length?h.i:this.C.length-1)
  }
  tag(cx,text,x,y,colr,al){cx.font='600 11px "JetBrains Mono",monospace';const w=cx.measureText(text).width+12;let x0=al==='right'?x-w:al==='center'?x-w/2:x;
    cx.fillStyle='rgba(3,4,5,.88)';cx.strokeStyle=colr;cx.lineWidth=1;cx.beginPath();cx.roundRect(x0,y-9,w,18,4);cx.fill();cx.stroke();cx.fillStyle=colr;cx.textAlign='left';cx.fillText(text,x0+6,y+.5);cx.font='11px "JetBrains Mono",monospace'}
  legend(i){if(this.noLegend){this.leg.innerHTML='';return}const c=this.C[i];if(!c)return;const up=c.c>=c.o,cl=up?'up':'';
    const tf=this.tfName||(this.labelFn?'D':(this.stepMin*this.k>=60?(this.stepMin*this.k/60)+'H':this.stepMin*this.k));
    this.leg.innerHTML=`<b>${this.sym}</b><i>${tf}</i><i>CME</i><span class="${cl}">O ${fm(c.o)}</span><span class="${cl}">H ${fm(c.h)}</span><span class="${cl}">L ${fm(c.l)}</span><span class="${cl}">C ${fm(c.c)}</span>`}
}
function toolbar(chart,tools,cls){
  const d=el(`<div class="tools ${cls||''}">${tools.map(t=>`<button type="button" data-tool="${t}" title="${TOOLTIP[t]}" aria-label="${TOOLTIP[t]}">${ICON[t]}</button>`).join('')}</div>`);
  const set=t=>{chart.tool=t;$$('button',d).forEach(b=>b.classList.toggle('on',b.dataset.tool===t));chart.cur()};
  d.addEventListener('click',e=>{const b=e.target.closest('button');if(b)set(b.dataset.tool)});set(tools[0]);d.set=set;return d}
