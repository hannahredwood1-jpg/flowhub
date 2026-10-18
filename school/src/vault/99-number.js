/* order and numbering for the vault */
MODS.sort((a,b)=>a.o-b.o);
MODS.forEach((m,i)=>{m.n=i+1;if(m.recall&&!m.recall.order)m.recall.order=shuf(m.recall.o.map((_,k)=>k))});
