/* ECHO x ORBIT track order: five modules, numbered 1 to 5. */
const byId=id=>MODS.find(m=>m.id===id);
const ORDER=['e01','e02','e03','e04','e05','be4','be5','be1','be6','be7','be2','be8','bo1','bo2','be3','bo3'];   /* be1 to be3 are the Basic Path lessons */
ORDER.forEach((id,i)=>{const m=byId(id);if(!m)throw new Error('missing module '+id);m.ph=0;m.n=i+1});
MODS.forEach(m=>{if(!ORDER.includes(m.id))throw new Error('module not in the ECHO x ORBIT order: '+m.id)});
MODS.sort((a,b)=>ORDER.indexOf(a.id)-ORDER.indexOf(b.id));
MODS.forEach(m=>{if(m.recall&&!m.recall.order)m.recall.order=shuf(m.recall.o.map((_,k)=>k))});
