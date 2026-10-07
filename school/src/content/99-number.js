MODS.sort((a,b)=>a.id<b.id?-1:1);MODS.forEach((m,i)=>{m.n=i+1;if(m.recall&&!m.recall.order)m.recall.order=shuf(m.recall.o.map((_,k)=>k))});
