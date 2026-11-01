/* order and numbering for the vault: ECHO modules 1 to 14, ORBIT modules 1 to 5, then the sealed Orderflow room */
MODS.sort((a,b)=>a.o-b.o);
const strat=m=>PH[m.ph].s,cnt={};
MODS.forEach(m=>{const s=strat(m);cnt[s]=(cnt[s]||0)+1;m.n=cnt[s];if(m.recall&&!m.recall.order)m.recall.order=shuf(m.recall.o.map((_,k)=>k))});
