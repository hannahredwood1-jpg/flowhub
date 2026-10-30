/* ---------- merge two chart modules into one (FVG + inverse FVG, advanced imbalance + equilibrium) ---------- */
const byId=id=>MODS.find(m=>m.id===id);
function mergeInto(a,b,{t,out,prefix,ls}){
  const nA=a.drills.length,bank=a.bank.length;
  const bsee=b.see,bex=b.ex;
  a.t=t;a.out=out;
  a.ls=a.ls.concat(ls||b.ls);
  a.task=a.task+' Then: '+b.task.charAt(0).toLowerCase()+b.task.slice(1);
  a.learn=a.learn.concat(b.learn.map(s=>({...s,t:prefix+s.t})));
  const asee=a.see;
  a.see=sc=>{const B=sc._b||(sc._b=bex());return asee(sc).concat(bsee(B).map(s=>({...s,sc:s.sc||B})))};
  a.drills=a.drills.concat(b.drills);
  a.bank=a.bank.concat(b.bank);
  a.exam={bank:a.exam.bank+b.exam.bank,gen:a.exam.gen.concat(b.exam.gen.map(([i,n])=>[i+nA,n]))};
  a.examDesc=a.examDesc.replace(/\.$/,'')+'; '+b.examDesc.charAt(0).toLowerCase()+b.examDesc.slice(1);
  delete a.explain;
}
(()=>{
  const m06=byId('m06'),m08=byId('m08'),m07=byId('m07'),m09=byId('m09');
  mergeInto(m06,m08,{t:'Fair Value Gaps & Inverse Fair Value Gaps',out:'Spot, mark and judge an imbalance, and use a disrespected gap as an early confirmation.',prefix:'Inverse FVG · '});
  mergeInto(m07,m09,{t:'Advanced Imbalance & Equilibrium',out:'Use opening gaps and balanced price ranges as targets and entries, and tell cheap from expensive inside a swing.',prefix:'Equilibrium · '});
  /* the old text still says "Module 8" for the inverse gap lesson: it is now part of the same module */
  m06.learn.forEach(s=>{s.h=s.h.replace(/ It is the setup for Module 8 \(inverse fair value gaps\)\./,' It is the setup for the inverse fair value gap, covered later in this module.')});
  MODS.splice(MODS.findIndex(m=>m.id==='m08'),1);MODS.splice(MODS.findIndex(m=>m.id==='m09'),1);
  /* support and resistance now lives inside Building Daily Bias */
  MODS.splice(MODS.findIndex(m=>m.id==='m40'),1);
})();
/* ---------- the course order: phase by phase ---------- */
const ORDER=[
 [0,['m37','m02','m38','m19','m20']],
 [1,['m39','m21','m41','m13']],
 [2,['m42','m01','m15','m25']],
 [3,['m03','m04']],
 [4,['m05','m06','m48','m49','m07']],
 [5,['m10','m11']],
 [6,['m12','m14','m23','m24']],
 [7,['m50']]];
/* The INVERTIX modules live on their own page. Only the practice page loads them (its drills use them), after the fundamentals. */
if(byId('m43'))ORDER.push([8,['m43','m44','m45','m46','m47']]);
const ORD={};ORDER.forEach(([ph,ids])=>ids.forEach(id=>{const m=byId(id);if(!m)throw new Error('missing module '+id);m.ph=ph;ORD[id]=ORDER.slice(0,ph).reduce((n,[,x])=>n+x.length,0)+ids.indexOf(id)}));
MODS.forEach(m=>{if(ORD[m.id]==null)throw new Error('module not in the course order: '+m.id)});
MODS.sort((a,b)=>ORD[a.id]-ORD[b.id]);
MODS.forEach((m,i)=>{m.n=i+1;if(m.recall&&!m.recall.order)m.recall.order=shuf(m.recall.o.map((_,k)=>k))});
/* older text says "Module 6" meaning the original numbering: translate it, once, for the fixed text of every module */
REFMAP={};MODS.forEach(m=>{const k=parseInt(m.id.slice(1),10);if(k<=18)REFMAP[k]=m.n});
REFMAP[8]=byId('m06').n;REFMAP[9]=byId('m07').n;
MODS.forEach(m=>{if(parseInt(m.id.slice(1),10)>18)return;['out','ls','task','examDesc','learn','explain'].forEach(f=>{if(m[f]!=null)m[f]=refDeep(m[f])});if(m.recall){['q','o','why','from'].forEach(f=>{m.recall[f]=refDeep(m.recall[f])})}});
