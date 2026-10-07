const ordKey=m=>m.o!=null?m.o:parseInt(m.id.slice(1),10);
MODS.sort((a,b)=>ordKey(a)-ordKey(b));
MODS.forEach((m,i)=>{m.n=i+1;if(m.recall&&!m.recall.order)m.recall.order=shuf(m.recall.o.map((_,k)=>k))});
/* older text says "Module 6" meaning the original numbering: translate it, once, for the fixed text of every module */
REFMAP={};MODS.forEach(m=>{const k=parseInt(m.id.slice(1),10);if(k<=18)REFMAP[k]=m.n});
MODS.forEach(m=>{if(parseInt(m.id.slice(1),10)>18)return;['out','ls','task','examDesc','learn','explain'].forEach(f=>{if(m[f]!=null)m[f]=refDeep(m[f])});if(m.recall){['q','o','why','from'].forEach(f=>{m.recall[f]=refDeep(m.recall[f])})}});
