/* ============================================================
   Orderflow (sealed). The map only knows the titles. The lessons live in orderflow-pack.js, which the server sends only to a member
   Hannah has approved for this room. Nobody is approved yet: more is coming.
============================================================ */
window.OFLIB={tblx,key,warn,def,mcq,BANKS,rc,drillBank,pick,shuf};
[['o01','What Orderflow Is and Why It Backs a Rejection',['Price shows where, flow shows how','Aggressive and passive orders','Bid, ask and the footprint','Why flow backs up a rejection']],
 ['o02','Reading the Tape Around a Rejection',['The stop run','Absorption','Exhaustion and trapped traders','Initiative and responsive flow']],
 ['o03','Delta, Volume and Imbalance',['Delta','Cumulative delta and divergence','Imbalances and stacks','Volume at price']],
 ['o04','Orderflow and the ECHO X ORBIT Checklist',['An extra look, not a new rule','What supports the setup','What makes you skip','What orderflow never overrides']],
 ['o05','Gamma Levels as Orderflow Context',['Positioning and flow are two views','Reading a reaction at a wall','Regime and what the flow looks like','Where the levels fail','Where it sits in the checklist']]].forEach(([id,t,ls],i)=>MODS.push({id,o:20+i,ph:5,sealed:true,chart:false,t,out:'Sealed: this room is opened by Hannah.',ls,task:'This room is sealed.',learn:[],steps:[],see:()=>[],drills:[],bank:[],exam:{bank:0,gen:[]},examDesc:''}));
