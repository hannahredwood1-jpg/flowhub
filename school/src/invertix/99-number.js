/* INVERTIX track order: three modules, numbered 1 to 3. */
const byId=id=>MODS.find(m=>m.id===id);
const ORDER=['n01','n02','n03','bn3','bn1','bn4','bn5','bn2'];   /* bn1 and bn2 are the Basic Path lessons */
ORDER.forEach((id,i)=>{const m=byId(id);if(!m)throw new Error('missing module '+id);m.ph=0;m.n=i+1});
MODS.forEach(m=>{if(!ORDER.includes(m.id))throw new Error('module not in the INVERTIX order: '+m.id)});
MODS.sort((a,b)=>ORDER.indexOf(a.id)-ORDER.indexOf(b.id));
MODS.forEach(m=>{if(m.recall&&!m.recall.order)m.recall.order=shuf(m.recall.o.map((_,k)=>k))});
