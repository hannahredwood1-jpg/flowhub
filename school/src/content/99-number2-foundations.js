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
  /* every Foundations lesson opens with one plain-words card, so a complete beginner knows what the lesson is for before the detail starts */
  const PW={m37:'A market is where buyers and sellers meet. The price is just the latest deal between them. Every trade has a cost, and trading is a skill, not a shortcut to money.',
    m02:'A candle is a small picture of what price did in one stretch of time. Learn to read one candle and you can read any chart.',
    m19:'TradingView is the free website where you look at charts and practise. This lesson sets it up the way the whole course uses it.',
    m20:'A futures contract is what you trade here. NQ and MNQ move in small steps called ticks, and every step is worth a set amount of money.',
    m21:'An order is an instruction to buy or sell. Before you click, every order gets a stop (the most you will lose) and a target (where you take profit).',
    m39:'A demo account is practice with pretend money on real prices. It is where you make your first mistakes cheaply.',
    m41:'The market is not equally busy all day, and big news makes price jump. You plan for both before they happen.',
    m12:'A prop firm lets you trade its money after you pass a test. Read the rules first: the rules decide whether you keep the account.',
    m14:'Risk management means sizing every trade small enough that a bad streak cannot end you. You can lose often and still do well if your losses stay small.',
    m01:'Good trading is mostly discipline: follow your plan, risk a little, take one good trade a session, and learn from every result.'};
  Object.entries(PW).forEach(([id,t])=>{const m=by(id);if(m&&!m.learn.some(x=>x.t==='In plain words'))m.learn.unshift({t:'In plain words',h:key('<p>'+t+'</p>','In plain words')})});
})();
