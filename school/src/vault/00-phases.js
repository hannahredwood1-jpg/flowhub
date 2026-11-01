/* The vault's phases. Two strategies live here, ECHO and ORBIT, each with its own course. Nothing is open by default: the first module of a
   strategy opens its door and the rest unlock one at a time. The Orderflow room is sealed. `s` is the strategy a phase belongs to. */
const PH=[
 {s:'echo',n:'ECHO · The Method',d:'The idea in plain words, the instruments and sessions, and the narrative you build before any entry.'},
 {s:'echo',n:'ECHO · The Building Blocks',d:'Rejection blocks, the CISD, gaps by timeframe, order blocks, SMT and key opens.'},
 {s:'echo',n:'ECHO · The Three Models',d:'The external rejection block, the CISD rejection block and the 1-minute continuation.'},
 {s:'echo',n:'ECHO · Risk and Discipline',d:'Grading, stops and targets, why trades lose, the daily rules and the pre-trade checklist.'},
 {s:'echo',n:'ECHO · Your Plan and the Call',d:'Your trade plan, the candle rule, when a setup ends, and taking or skipping setups on fresh charts.'},
 {s:'orbit',n:'ORBIT · The Method',d:'The idea, the words, the move, and the big OTE with its tap.'},
 {s:'orbit',n:'ORBIT · The Entry',d:'The 5-minute inversion, the internal OTE, and the limit, stop and target.'},
 {s:'orbit',n:'ORBIT · Rules and Routine',d:'When a setup is dead, what stays your call, the rules of thumb and your daily routine.'},
 {s:'of',n:'Orderflow',d:'What the tape and the footprint add to the same rejections. Sealed: opened only with Hannah\'s approval.'}];
