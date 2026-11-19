/* LUMEN track order: five modules, numbered 1 to 5. */
const byId=id=>MODS.find(m=>m.id===id);
const ORDER=['l01','l02','l03','l04','l05','bl3','bl4','bl1','bl5','bl2'];   /* bl1 and bl2 are the Basic Path lessons */
ORDER.forEach((id,i)=>{const m=byId(id);if(!m)throw new Error('missing module '+id);m.ph=0;m.n=i+1});
MODS.forEach(m=>{if(!ORDER.includes(m.id))throw new Error('module not in the LUMEN order: '+m.id)});
MODS.sort((a,b)=>ORDER.indexOf(a.id)-ORDER.indexOf(b.id));
MODS.forEach(m=>{if(m.recall&&!m.recall.order)m.recall.order=shuf(m.recall.o.map((_,k)=>k))});
