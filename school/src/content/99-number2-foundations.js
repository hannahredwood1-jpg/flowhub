/* ---------- TRADING FOUNDATIONS: the beginner essentials only ----------
   The school page now teaches ten short modules. Everything else (liquidity, structure, gaps, rejection blocks, CISD, SMT, time theory, daily bias,
   trade management, the day plan and the GEX lesson) moved out: Orderflow's primer and the strategy courses teach what they need.
   The practice page keeps every lesson for its drills, so this only runs on the school page. */
(()=>{if(window.PRACTICE)return;
  const by=id=>MODS.find(m=>m.id===id);
  /* short lessons folded into the module they belong with (all idea-only modules) */
  const fold=(a,b)=>{a.ls=(a.ls||[]).concat(b.ls||[]);a.learn=a.learn.concat(b.learn);a.bank=(a.bank||[]).concat(b.bank||[]);a.drills=(a.drills||[]).concat(b.drills||[]);
    if(b.out)a.out=a.out.replace(/\.$/,'')+', and '+b.out.charAt(0).toLowerCase()+b.out.slice(1);
    if(b.task)a.task=(a.task||'')+' Then: '+b.task.charAt(0).toLowerCase()+b.task.slice(1)};
  fold(by('m19'),by('m38'));fold(by('m14'),by('m24'));fold(by('m01'),by('m15'));fold(by('m01'),by('m42'));
  /* wording that pointed at lessons that are no longer in the Foundations */
  const fix=(id,pairs)=>by(id).learn.forEach(l=>{pairs.forEach(([a,b])=>{l.h=l.h.split(a).join(b)})});
  fix('m37',[[', from liquidity to gaps,','']]);
  fix('m02',[['everything that follows: liquidity, structure and imbalance are all defined from them','everything that follows']]);
  fix('m19',[['a fair value gap, an order block','any price area you want to mark']]);
  fix('m01',[['Module 1:','the start of this module:'],['Module 11:','the start of this module:'],['liquidity, structure, gaps and timing','price, risk and timing']]);
  by('m19').recall.from='Chart Reading Basics';by('m14').recall.from='Funded Accounts & Prop Firms';by('m12').recall.from='Your Demo Account';
  const ORD=[['m37','m02','m19','m20'],['m21','m39','m41'],['m12','m14','m01']],keep=ORD.flat();
  for(let i=MODS.length-1;i>=0;i--)if(!keep.includes(MODS[i].id))MODS.splice(i,1);
  ORD.forEach((ids,ph)=>ids.forEach(id=>{by(id).ph=ph}));
  MODS.sort((a,b)=>keep.indexOf(a.id)-keep.indexOf(b.id));MODS.forEach((m,i)=>{m.n=i+1});
  PH.splice(0,PH.length,
    {n:'Beginner Basics',open:true,d:'Open from the start, in any order: what a market is, how to read a chart, your platform, and what futures and NQ are.'},
    {n:'Your First Trades',d:'Orders, your demo account, and when the market is busy. Unlocks one module at a time.'},
    {n:'Risk and Habits',d:'Sizing every trade, how funded accounts work, and the habits that keep you in the game.'});
})();
