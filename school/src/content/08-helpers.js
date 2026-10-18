/* shared by the school and the vault: question banks and the quick module builder */
const BANKS=(topic,rows)=>rows.map(([q,o,why])=>mcq(topic,q,o,why));
const drillBank=bank=>r=>{const b=pick(r,bank);return{...b,o:[...b.o]}};
const numGen=(topic,f)=>r=>({kind:'num',topic,...f(r)});
const quick=(c)=>MODS.push({chart:false,examDesc:c.examDesc,...c,
  see:()=>c.steps.map(([cap,html])=>({cap,html:html||''})),
  drills:[...c.gens,drillBank(c.bank),drillBank(c.bank)],
  exam:{bank:c.eb||Math.min(6,c.bank.length-3),gen:[...c.gens.map((_,i)=>[i,c.gens.length>2?1:2]),[c.gens.length,2]]}});

